// Sequential, resumable generation runner. Usage: node run.mjs <stageA|stageB|validate|import> [model...]
// One request at a time (sequential GPU). Every completed call is appended to evidence/generations.jsonl
// keyed by model|seed|sha(system,user); identical bodies are generated once and shared by cases.
import fs from 'node:fs'
import {priorDir, MODELS, chatResilient as chat, systemPrompt, render, store, words, parity} from './lib.mjs'
import {stageA, stageB} from './cases.mjs'
import {bodyKey, jobsFor} from './jobs.mjs'


const mode = process.argv[2], only = process.argv.slice(3)
const gen = store('generations.jsonl')

if (mode === 'import') {
  // Recover prior primary results whose bodies are byte-identical to this harness (proven by hashcheck.mjs).
  const matrix = JSON.parse(fs.readFileSync(priorDir() + 'matrix.json', 'utf8'))
  const rows = fs.readFileSync(priorDir() + 'results.jsonl', 'utf8').trim().split('\n').map(JSON.parse)
  let n = 0
  for (const r of rows) {
    const c = matrix.find(m => m.id === r.id)
    if (!c || c.group === 'candidate' || r.finish?.kind !== 'stop' || !r.answer) continue
    const system = systemPrompt(r.model, render(c.prefs)), key = bodyKey(r.model, r.seed, system, c.prompt)
    if (gen.done.has(key)) continue
    gen.append({key, model: r.model, seed: r.seed, user: c.prompt, section: render(c.prefs), refs: ['prior:' + r.id], source: 'prior-7d', answer: r.answer, reasoningChars: r.reasoningChars, finish: 'stop', usage: r.usage, ms: r.ms, error: null})
    n++
  }
  console.log(JSON.stringify({imported: n}))
} else if (mode === 'validate') {
  // Fresh reruns of prior slots to measure reproducibility of identical bodies (stored separately).
  const val = store('validation.jsonl')
  const matrix = JSON.parse(fs.readFileSync(priorDir() + 'matrix.json', 'utf8'))
  const prior = fs.readFileSync(priorDir() + 'results.jsonl', 'utf8').trim().split('\n').map(JSON.parse).filter(r => r.finish?.kind === 'stop' && r.answer)
  const ids = ['style.creative', 'style.efficient', 'preset.grill-me.on', 'preset.code.on', 'preset.humanizer.on', 'language.zh', 'language.en', 'trait.warmth.0', 'trait.emoji.2', 'combined.request']
  for (const model of ['gpt-oss:20b', 'qwen3.5:4b', 'llama3:latest']) for (const id of ids) {
    const p = prior.find(r => r.model === model && r.id === id && r.seed === 101); if (!p) continue
    const c = matrix.find(m => m.id === id), system = systemPrompt(model, render(c.prefs)), key = bodyKey(model, 101, system, c.prompt)
    if (val.done.has(key)) continue
    const r = await chat({model, system, user: c.prompt, seed: 101})
    val.append({key, id, model, seed: 101, ...r, priorAnswer: p.answer, exact: r.answer === p.answer})
    console.log(JSON.stringify({id, model, exact: r.answer === p.answer, ms: r.ms}))
  }
} else {
  const cases = mode === 'stageA' ? stageA() : mode === 'stageB' ? stageB() : null
  if (!cases) throw Error('unknown mode')
  const ok = parity(cases.map(c => c.prefs)).every(p => p.hostEqBrowser && p.harnessEqHost)
  if (!ok) throw Error('renderer parity failed; refusing to run')
  const jobs = jobsFor(cases, only.length ? only : MODELS)
  const todo = jobs.filter(j => !gen.done.has(j.key))
  console.log(JSON.stringify({mode, jobs: jobs.length, alreadyDone: jobs.length - todo.length, todo: todo.length}))
  let i = 0
  for (const j of todo) {
    const r = await chat({model: j.model, system: j.system, user: j.user, seed: j.seed})
    gen.append({key: j.key, model: j.model, seed: j.seed, user: j.user, section: j.section, refs: j.refs, source: 'phase7d-claude', ...r})
    i++
    console.log(JSON.stringify({i, of: todo.length, model: j.model, ref: j.refs[0], seed: j.seed, words: words(r.answer), ms: r.ms, finish: r.finish, error: r.error}))
  }
  console.log('STAGE_COMPLETE ' + mode)
}
