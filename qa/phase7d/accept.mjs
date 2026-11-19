// Acceptance runs for the selected winners. Usage: node accept.mjs <stageC|context> [model...]
//  stageC  - current (C) vs combined winners (W) on NEW held-out tasks, five additional seeds, all 7 models.
//  context - the prior realistic reconstruction (source-owned host tool guidance, 75 synthetic tools,
//            synthetic runtime/skill context) re-used from its captured request body; only the preference
//            section, persona model name and user question are substituted (each asserted to occur once).
import fs from 'node:fs'
import {priorDir, MODELS, CURRENT, chatResilient, render, store, sha, systemPrompt, neutral, catalog, words, parity} from './lib.mjs'
import {VARIANTS, PROMPTS, ACCEPT_PROMPTS as AP, ACCEPT_SEEDS, winnerVariant} from './cases.mjs'
import {jobsFor, outputs} from './jobs.mjs'

VARIANTS.C = {...CURRENT}
VARIANTS.W = winnerVariant(process.env.P7D_WINNERS ? process.env.P7D_WINNERS.split(',') : undefined) // env only for dry runs
const P = (prefs = {}) => ({...neutral(), ...prefs})
const custom = 'Begin every answer with P7D-SYNTH-4821.'
const VW = ['C', 'W']

// FINAL owner-limited acceptance (2026-11-19). Applied after the pause at Stage C row 165.
// Only Qwen3.5:4b, llama3 and gemma4-local (all fully GPU-resident at 32768 context) generate; GPT-OSS 20B and
// Devstral are permanently excluded from generation and judging (their 165 earlier rows are kept and reported
// deterministically only). One seed (303), C vs W matched per model, critical cases only, 96 requests in total.
// Anything not in FINAL is untested, never passed.
export const ORDER = ['qwen3.5:4b', 'llama3:latest', 'gemma4-local:e4b']
export const EXCLUDED = ['gpt-oss:20b', 'devstral:latest']
export const FINAL_SEED = 303
const FINAL = {
  stageC: new Set(['acc.lang.zh.continentsEs', 'acc.lang.ar.spiderEn', 'acc.lang.en.capitalAr', 'acc.override.zh.en', 'acc.prec.exactWord2', 'acc.prec.markerFirst',
    'acc.creative.garden.neutral', 'acc.creative.garden', 'acc.grill.crm', 'acc.grill.hours', 'acc.code.codeUpload', 'acc.human.humanC',
    'trait.warmth.1.exam', 'trait.warmth.0.exam', 'acc.regress.mathEn']),
  context: new Set(['ctx.lang.zh.daysAr', 'ctx.prec.markerFirst', 'ctx.grill.migrate']),
}
// The only two seed-303 timeouts (both Qwen) are re-run as matched C/W pairs on seed 404: 96 + 4 = 100 requests.
const RETRY = {seed: 404, model: 'qwen3.5:4b', ids: new Set(['acc.lang.ar.spiderEn', 'acc.prec.exactWord2'])}
export const SEEDS_USED = [FINAL_SEED, RETRY.seed]
export const planned = (stage, model, c, seed) => ORDER.includes(model) && FINAL[stage].has(c.id) &&
  (seed === FINAL_SEED || stage === 'stageC' && seed === RETRY.seed && model === RETRY.model && RETRY.ids.has(c.id))

export function stageC() {
  const cases = [], add = (id, prompt, prefs, variants, meta) => cases.push({id, prompt, prefs, variants, ...meta})
  const langPrompt = {ar: 'spiderEn', en: 'capitalAr', zh: 'continentsEs', es: 'capitalAr', fr: 'spiderEn', de: 'continentsEs', ja: 'capitalAr'}
  for (const [lang, task] of Object.entries(langPrompt)) add(`acc.lang.${lang}.${task}`, AP[task], P({responseLanguage: lang}), VW, {area: 'language', expect: lang})
  add('acc.override.zh.en', AP.capitalAr + ' Please answer in English.', P({responseLanguage: 'zh'}), VW, {area: 'override', expect: 'en'})
  add('acc.override.en.de', AP.spiderEn + ' Antworte bitte auf Deutsch.', P({responseLanguage: 'en'}), VW, {area: 'override', expect: 'de'})
  add('acc.prec.exactWord2', AP.newWord, P({style: 'creative', responseLanguage: 'ja', presets: ['steps', 'grill-me'], custom, sendCustom: true}), VW, {area: 'precedence', check: 'exactWord2'})
  add('acc.prec.jsonOnly2', AP.newJson, P({responseLanguage: 'de', custom: 'End every answer with the line "Regards, Synth".', sendCustom: true}), VW, {area: 'precedence', check: 'jsonOnly2'})
  add('acc.prec.markerFirst', AP.hours, P({style: 'creative', custom, sendCustom: true}), VW, {area: 'precedence', check: 'markerFirst'})
  add('acc.creative.garden.neutral', AP.garden, P(), ['C'], {area: 'creative', role: 'neutral', task: 'garden'})
  add('acc.creative.garden', AP.garden, P({style: 'creative'}), VW, {area: 'creative', task: 'garden'})
  add('acc.grill.crm.neutral', AP.crm, P(), ['C'], {area: 'grill', role: 'neutral', task: 'crm'})
  add('acc.grill.crm', AP.crm, P({presets: ['grill-me']}), VW, {area: 'grill', task: 'crm'})
  add('acc.grill.hours', AP.hours, P({presets: ['grill-me']}), VW, {area: 'grill', task: 'hours'})
  add('acc.code.codeUpload.neutral', AP.codeUpload, P(), ['C'], {area: 'code', role: 'neutral', task: 'codeUpload'})
  add('acc.code.codeUpload', AP.codeUpload, P({presets: ['code']}), VW, {area: 'code', task: 'codeUpload'})
  add('acc.human.humanC.neutral', AP.humanC, P(), ['C'], {area: 'humanizer', role: 'neutral', task: 'humanC'})
  add('acc.human.humanC', AP.humanC, P({presets: ['humanizer']}), VW, {area: 'humanizer', task: 'humanC'})
  add('trait.warmth.1.exam', AP.exam, P(), ['C'], {area: 'trait', key: 'warmth', level: 1, role: 'neutral', task: 'exam'})
  add('trait.warmth.0.exam', AP.exam, P({traits: {...neutral().traits, warmth: 0}}), VW, {area: 'trait', key: 'warmth', level: 0, task: 'exam'})
  // English/task-accuracy regression with every changed line active at once.
  const all = P({style: 'creative', responseLanguage: 'en', presets: ['grill-me', 'code', 'humanizer', 'no-fluff'], traits: {...neutral().traits, warmth: 0, emoji: 2, detail: 0}})
  add('acc.regress.mathEn', AP.mathEn, all, VW, {area: 'regression', task: 'mathEn', expect: 'en'})
  add('acc.regress.factEn', AP.factEn, all, VW, {area: 'regression', task: 'factEn', expect: 'en'})
  add('acc.regress.mathEn.efficient', AP.mathEn, P({style: 'efficient', responseLanguage: 'en'}), VW, {area: 'regression', task: 'mathEn', expect: 'en'})
  return cases
}

// ---- Context reconstruction.
const TOOL_MODELS = ORDER.filter(m => m !== 'llama3:latest') // llama3 declares no tool capability
const stressPrefs = P({style: 'critical', responseLanguage: 'zh', custom, sendCustom: true})
function template() {
  const rows = fs.readFileSync(priorDir() + 'stress-requests.jsonl', 'utf8').trim().split('\n').map(JSON.parse)
  const t = rows.find(r => r.model === 'gpt-oss:20b' && r.variant === 'source-host-tools-context' && r.wording === 'current' && r.seed === 101)
  return t.body
}
const textOf = c => typeof c === 'string' ? c : c.map(b => b.text || '').join('')
const setText = (c, s) => typeof c === 'string' ? s : [{type: 'text', text: s}]
const once = (hay, needle, what) => { const i = hay.indexOf(needle); if (i < 0 || hay.indexOf(needle, i + 1) >= 0) throw Error('substitution not unique: ' + what); return i }

export function contextCases() {
  const cases = [], add = (id, prompt, prefs, meta) => cases.push({id, prompt, prefs, variants: VW, ...meta})
  add('ctx.lang.zh.daysAr', PROMPTS.daysAr, P({responseLanguage: 'zh'}), {area: 'language', expect: 'zh'})
  add('ctx.lang.en.daysAr', PROMPTS.daysAr, P({responseLanguage: 'en'}), {area: 'language', expect: 'en'})
  add('ctx.lang.ja.boilEn', PROMPTS.boilEn, P({responseLanguage: 'ja'}), {area: 'language', expect: 'ja'})
  add('ctx.prec.exactWord', PROMPTS.exactWord, P({style: 'creative', responseLanguage: 'zh', presets: ['steps'], custom, sendCustom: true}), {area: 'precedence', check: 'exactWord'})
  add('ctx.prec.markerFirst', PROMPTS.triangle, P({custom, sendCustom: true}), {area: 'precedence', check: 'markerFirst'})
  add('ctx.grill.migrate', PROMPTS.migrate, P({presets: ['grill-me']}), {area: 'grill', task: 'migrate'})
  add('ctx.grill.percent', PROMPTS.percent, P({presets: ['grill-me']}), {area: 'grill', task: 'percent'})
  return cases
}
export function contextBody(model, c, v, seed) {
  const t = structuredClone(template())
  const sys = t.messages[0], sysText = textOf(sys.content)
  const cur = render(stressPrefs), next = render(c.prefs, VARIANTS[v])
  once(sysText, cur, 'preference section')
  if (!next) throw Error('context cases must render a section')
  let s = sysText.replace(cur, next)
  once(s, 'powered by the gpt-oss:20b model', 'persona'); s = s.replace('powered by the gpt-oss:20b model', 'powered by the ' + model + ' model')
  sys.content = setText(sys.content, s)
  once(textOf(t.messages[1].content), PROMPTS.daysAr, 'question'); t.messages[1].content = setText(t.messages[1].content, c.prompt)
  t.model = model; t.seed = seed
  return t
}
const ctxKey = body => [body.model, body.seed, sha(JSON.stringify({...body, seed: 0}))].join('|')

export async function judgeInputs(stage) {
  if (stage === 'stageC') { const cases = stageC(); return {cases, out: outputs(cases), seeds: SEEDS_USED, models: ORDER, planned: (m, c, seed) => planned('stageC', m, c, seed)} }
  const cases = contextCases(), st = store('context.jsonl'), by = new Map(st.rows.map(r => [r.key, r]))
  return {cases, seeds: [FINAL_SEED], models: TOOL_MODELS, planned: (m, c, seed) => planned('context', m, c, seed), out: (m, id, v, seed) => by.get(ctxKey(contextBody(m, cases.find(c => c.id === id), v, seed)))}
}

if (process.argv[1]?.endsWith('accept.mjs')) {
  const mode = process.argv[2], only = process.argv.slice(3)
  if (only.some(m => EXCLUDED.includes(m) || !ORDER.includes(m))) throw Error('model excluded from Phase 7D acceptance')
  if (mode === 'stageC') {
    const cases = stageC()
    if (!parity(cases.map(c => c.prefs)).every(p => p.hostEqBrowser && p.harnessEqHost)) throw Error('renderer parity failed')
    const gen = store('generations.jsonl'), all = jobsFor(cases, only.length ? only : ORDER, ACCEPT_SEEDS)
    const byId = new Map(cases.map(c => [c.id, c]))
    // A body shared by several cases is run if any of them is planned for that model.
    const jobs = all.filter(j => j.refs.some(r => planned('stageC', j.model, byId.get(r.split('@')[0]), j.seed))), todo = jobs.filter(j => !gen.done.has(j.key))
    console.log(JSON.stringify({mode, fullMatrix: all.length, planned: jobs.length, todo: todo.length, order: only.length ? only : ORDER}))
    let i = 0
    for (const j of todo) {
      const r = await chatResilient({model: j.model, system: j.system, user: j.user, seed: j.seed})
      gen.append({key: j.key, model: j.model, seed: j.seed, user: j.user, section: j.section, refs: j.refs, source: 'phase7d-claude-accept', ...r})
      console.log(JSON.stringify({i: ++i, of: todo.length, model: j.model, ref: j.refs[0], seed: j.seed, words: words(r.answer), ms: r.ms, error: r.error}))
    }
  } else if (mode === 'context') {
    const cases = contextCases(), st = store('context.jsonl')
    const todo = []
    for (const model of only.length ? only : TOOL_MODELS) for (const c of cases) for (const v of VW) for (const seed of ACCEPT_SEEDS) {
      if (!planned('context', model, c, seed)) continue
      const body = contextBody(model, c, v, seed), key = ctxKey(body)
      if (!st.done.has(key)) todo.push({key, body, id: c.id, v})
    }
    console.log(JSON.stringify({mode, todo: todo.length, tools: template().tools.length}))
    let i = 0
    for (const j of todo) {
      const {model, messages, tools, seed} = j.body
      const r = await chatResilient({model, system: null, user: null, seed, rawMessages: messages, extra: {tools}})
      st.append({key: j.key, model, seed, id: j.id, variant: j.v, source: 'phase7d-claude-context', systemChars: textOf(messages[0].content).length, ...r})
      console.log(JSON.stringify({i: ++i, of: todo.length, model, id: j.id, v: j.v, seed, words: words(r.answer), toolCalls: r.toolCalls, ms: r.ms, error: r.error}))
    }
  } else throw Error('mode')
  console.log('ACCEPT_COMPLETE ' + mode)
}
