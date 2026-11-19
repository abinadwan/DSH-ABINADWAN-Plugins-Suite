// Controlled context-size comparison for Qwen (2026-11-19). Same request bodies, same binary/models,
// one server loaded at a time. A = isolated instance at OLLAMA_CONTEXT_LENGTH=65536 (port 11435),
// B = installed Ollama app at its current setting (262144, port 11434). Writes evidence/context-perf.json.
import fs from 'node:fs'
import path from 'node:path'
import {EVIDENCE, chat, runtime, systemPrompt, store, sha} from './lib.mjs'
import {bodyKey} from './jobs.mjs'

const MODEL = 'qwen3.5:4b'
const A = 'http://127.0.0.1:11435', B = 'http://127.0.0.1:11434'
const rows = store('generations.jsonl').rows
const RESTART = 614 // rows before this index were generated before the 23:42:41 setting change (65536)
const pick = (list, n) => [...list].sort((x, y) => sha(x.key).localeCompare(sha(y.key))).slice(0, n)
const late = pick(rows.slice(RESTART).filter(r => r.model === MODEL && !r.error), 5)
const early = pick(rows.slice(0, RESTART).filter(r => r.model === MODEL && !r.error), 3)
const items = [...late.map(r => ({r, period: '262144'})), ...early.map(r => ({r, period: '65536'}))]
for (const {r} of items) if (bodyKey(MODEL, r.seed, systemPrompt(MODEL, r.section), r.user) !== r.key) throw Error('body rebuild mismatch')

const unload = base => fetch(base + '/api/generate', {method: 'POST', body: JSON.stringify({model: MODEL, keep_alive: 0})}).then(r => r.text()).catch(() => null)
async function load(base) {
  const t0 = Date.now()
  await (await fetch(base + '/api/generate', {method: 'POST', body: JSON.stringify({model: MODEL})})).text()
  return {loadMs: Date.now() - t0, runtime: await runtime(MODEL, base)}
}
const out = {date: new Date().toISOString(), model: MODEL, items: items.map(i => ({key: i.r.key, period: i.period, storedMs: i.r.ms})), runs: {}}
for (const [label, base, other] of [['65536', A, B], ['262144', B, A]]) {
  await unload(other); await unload(base)
  const l = await load(base)
  const res = []
  for (const {r, period} of items) {
    const g = await chat({base, model: MODEL, system: systemPrompt(MODEL, r.section), user: r.user, seed: r.seed})
    const tok = g.usage?.completion_tokens ?? null
    res.push({key: r.key, period, ms: g.ms, completionTokens: tok, tokPerS: tok ? +(tok / (g.ms / 1000)).toFixed(1) : null, error: g.error, finish: g.finish,
      identicalToStored: g.answer === r.answer, runtime: g.runtime})
    console.log(JSON.stringify({label, ...res.at(-1)}))
  }
  out.runs[label] = {...l, results: res}
  await unload(base)
}
fs.writeFileSync(path.join(EVIDENCE, 'context-perf.json'), JSON.stringify(out, null, 1))
console.log('PERF_DONE')
