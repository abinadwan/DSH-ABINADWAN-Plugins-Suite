// Acceptance aggregation: current wording (C) vs combined winners (W) on held-out tasks, 5 new seeds.
// Stage C (direct, 7 models) and the 75-tool realistic context (6 tool-capable models).
// Writes evidence/acceptance.md and evidence/acceptance.json. No inference. Usage: node accreport.mjs
import fs from 'node:fs'
import path from 'node:path'
import {MODELS, EVIDENCE, store, words, render, neutral, catalog, CURRENT} from './lib.mjs'
import {VARIANTS, WINNERS} from './cases.mjs'
import {judgeInputs, stageC, contextCases, FINAL_SEED, ORDER, SEEDS_USED} from './accept.mjs'
import {ACCEPT_SEEDS} from './cases.mjs'
import {outputs} from './jobs.mjs'
import {scoreLanguage, scorePrecedence, scoreTask} from './score.mjs'
import {JUDGE, judgmentsFile} from './judge.mjs'

const J = new Map(store(judgmentsFile()).rows.filter(r => r.verdict).map(r => [r.key, r]))
const S = {'gpt-oss:20b': 'gpt-oss', 'qwen3.5:4b': 'qwen', 'llama3:latest': 'llama3', 'devstral:latest': 'devstral', 'goekdenizguelmez/JOSIE-2:9b': 'josie', 'gemma4:12b': 'gemma12b', 'gemma4-local:e4b': 'gemma-e4b'}
const pairJ = (row, base) => { const j = J.get('pair|' + row.key + '|' + base.key); if (!j) return null; const m = j.verdict.more; return m === 'tie' ? 'tie' : (m === 'A') !== j.flip ? 'win' : 'loss' }
const absJ = row => J.get('abs|' + row.key)?.verdict ?? null
// skipped = outside the reduced workload (never run); missing = planned but not yet generated/judged.
const cell = () => ({pass: 0, partial: 0, fail: 0, incomplete: 0, missing: 0, skipped: 0, n: 0})
const add = (c, r) => { c.n++; c[r === true ? 'pass' : r]++ }
const fmt = c => c.n === c.skipped ? (c.n ? 'not run' : '—') : c.n ? `${c.pass}/${c.n - c.missing - c.skipped}` + (c.incomplete ? ` (${c.incomplete} inc)` : '') + (c.missing ? ` [${c.missing} pending]` : '') : '—'
const md = [], summary = {}

function grid(stage, I, name, filter, scorer) {
  const ms = I.models, g = {}
  for (const m of ms) for (const v of ['C', 'W']) {
    const c = g[m + '|' + v] = cell()
    for (const k of I.cases.filter(filter)) if (k.variants.includes(v)) for (const seed of I.seeds) {
      const row = I.out(m, k.id, v, seed)
      if (!row) { add(c, I.planned && !I.planned(m, k, seed) ? 'skipped' : 'missing'); continue }
      if (row.error === 'timeout' || !row.answer?.trim()) { add(c, 'incomplete'); continue }
      add(c, scorer(row, k, m, v, seed, I))
    }
  }
  const tot = v => { const t = cell(); for (const m of ms) for (const f in t) t[f] += g[m + '|' + v][f]; return t }
  summary[stage + ': ' + name] = Object.fromEntries(['C', 'W'].map(v => [v, {total: tot(v), byModel: Object.fromEntries(ms.map(m => [m, g[m + '|' + v]]))}]))
  md.push(`\n### ${stage}: ${name}\n\n| Variant | ${ms.map(m => S[m]).join(' | ')} | All |\n|${'---|'.repeat(ms.length + 2)}\n` +
    ['C', 'W'].map(v => `| ${v} | ${ms.map(m => fmt(g[m + '|' + v])).join(' | ')} | **${fmt(tot(v))}** |`).join('\n') + '\n')
}

const lang = (row, k) => { const s = scoreLanguage(row.answer, k.expect, k.id.split('.').pop()); return s.incomplete ? 'incomplete' : s.pass ? 'pass' : s.partial ? 'partial' : 'fail' }
const fact = (row, k) => scoreLanguage(row.answer, k.expect, k.id.split('.').pop()).detail?.fact ? 'pass' : 'fail'
const prec = (row, k) => { const s = scorePrecedence(row.answer, k.check); return s.incomplete ? 'incomplete' : s.pass ? 'pass' : s.partial ? 'partial' : 'fail' }
const grill = row => { const v = absJ(row); return v === null ? 'missing' : v.asks && v.risk ? 'pass' : v.asks || v.risk ? 'partial' : 'fail' }
const simple = task => row => { const s = scoreTask(row.answer, task); return s.ok && !s.asksQuestion ? 'pass' : s.ok ? 'partial' : 'fail' }
const code = (row, k) => { const v = absJ(row); if (v === null) return 'missing'; return v.security && v.performance && v.tests && v.fix_safe && !v.false_claims ? 'pass' : v.security && v.fix_safe && !v.false_claims ? 'partial' : 'fail' }
const human = (row, k) => { const v = absJ(row); if (v === null) return 'missing'; const d = scoreTask(row.answer, k.task); return d.ok && !v.added_claims && !v.changed_certainty && v.natural ? 'pass' : d.ok ? 'partial' : 'fail' }
const neutralRow = (I, k, m, seed) => { const id = k.area === 'trait' ? `trait.${k.key}.1.${k.task}` : `acc.${k.area}.${k.task}.neutral`; return I.out(m, id, 'C', seed) }
const pairWin = (row, k, m, v, seed, I) => { const b = neutralRow(I, k, m, seed); if (!b?.answer?.trim()) return 'missing'; const r = pairJ(row, b); return r === null ? 'missing' : r === 'win' ? 'pass' : r === 'tie' ? 'partial' : 'fail' }
const noExcl = row => (row.answer.match(/!/g) || []).length === 0 ? 'pass' : 'fail'
const english = row => scoreLanguage(row.answer, 'en', 'x').pass ? 'pass' : 'fail'

const C = await judgeInputs('stageC')
grid('Stage C', C, 'language followed (7 targets, new prompts)', k => k.area === 'language', lang)
grid('Stage C', C, 'language: task fact correct', k => k.area === 'language', fact)
grid('Stage C', C, 'explicit language request wins (override)', k => k.area === 'override', lang)
for (const check of ['exactWord2', 'jsonOnly2', 'markerFirst']) grid('Stage C', C, 'precedence ' + check, k => k.area === 'precedence' && k.check === check, prec)
grid('Stage C', C, 'Creative judged more original than neutral (garden)', k => k.area === 'creative' && k.role !== 'neutral', pairWin)
grid('Stage C', C, 'Grill-Me asks + names risk (CRM decision)', k => k.area === 'grill' && k.task === 'crm' && k.role !== 'neutral', grill)
grid('Stage C', C, 'Grill-Me regression: simple question answered directly (hours)', k => k.area === 'grill' && k.task === 'hours', simple('hours'))
grid('Stage C', C, 'Code Reviewer full pass (SSRF upload handler)', k => k.area === 'code' && k.role !== 'neutral', code)
grid('Stage C', C, 'Code Reviewer deterministic coverage (SSRF, robustness, tests)', k => k.area === 'code' && k.role !== 'neutral', (row, k) => scoreTask(row.answer, k.task).ok ? 'pass' : 'fail')
grid('Stage C', C, 'Humanizer preserved + nothing added + natural (humanC)', k => k.area === 'humanizer' && k.role !== 'neutral', human)
grid('Stage C', C, 'Low warmth judged more reserved than neutral (exam)', k => k.area === 'trait' && k.role !== 'neutral', pairWin)
grid('Stage C', C, 'Low warmth: no exclamation marks (exam)', k => k.area === 'trait' && k.role !== 'neutral', noExcl)
grid('Stage C', C, 'Regression: task correct with all changed lines active', k => k.area === 'regression', (row, k) => { const s = scoreTask(row.answer, k.task); return s.ok ? 'pass' : 'fail' })
grid('Stage C', C, 'Regression: English kept with all changed lines active', k => k.area === 'regression', english)

const X = await judgeInputs('context')
grid('Context (75 tools)', X, 'language followed', k => k.area === 'language', lang)
for (const check of ['exactWord', 'markerFirst']) grid('Context (75 tools)', X, 'precedence ' + check, k => k.area === 'precedence' && k.check === check, prec)
grid('Context (75 tools)', X, 'Grill-Me asks + names risk (migration)', k => k.area === 'grill' && k.task === 'migrate', grill)
grid('Context (75 tools)', X, 'Grill-Me regression: 15% of 80 answered directly', k => k.area === 'grill' && k.task === 'percent', simple('percent'))
// Existing GPT-OSS Stage C rows (generated before the owner decision, 5 seeds). Reported with deterministic
// checks only: GPT-OSS is excluded from all further generation and judging.
const G = {cases: C.cases, out: outputs(C.cases), seeds: ACCEPT_SEEDS, models: ['gpt-oss:20b'], planned: () => false}
const GT = 'Prior GPT-OSS rows (deterministic only)'
grid(GT, G, 'language followed', k => k.area === 'language', lang)
grid(GT, G, 'language: task fact correct', k => k.area === 'language', fact)
grid(GT, G, 'explicit language request wins (override)', k => k.area === 'override', lang)
for (const check of ['exactWord2', 'jsonOnly2', 'markerFirst']) grid(GT, G, 'precedence ' + check, k => k.area === 'precedence' && k.check === check, prec)
grid(GT, G, 'Grill-Me regression: simple question answered directly (hours)', k => k.area === 'grill' && k.task === 'hours', simple('hours'))

// Privacy (no inference): the winner wording must not change what is sent.
const PRIV = /(?:\b[A-Z]:[\\/](?!Synthetic)|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|sk-[a-z0-9]{16})/i
const secret = 'P7D-PRIVATE-NOTE-0001'
const privacy = {
  customNotSentWhenSendCustomFalse: ['C', 'W'].every(v => !render({...neutral(), style: 'creative', presets: ['grill-me'], custom: secret, sendCustom: false}, VARIANTS[v]).includes(secret)),
  customSentOnlyWhenOptedIn: ['C', 'W'].every(v => render({...neutral(), custom: secret, sendCustom: true}, VARIANTS[v]).includes(secret)),
  automaticLanguageInjectsNothing: render({...neutral(), responseLanguage: 'auto'}, VARIANTS.W) === '',
  neutralProfileInjectsNothing: render(neutral(), VARIANTS.W) === '',
  winnerSectionsFreeOfPathsEmailsKeys: [...stageC(), ...contextCases()].every(k => !PRIV.test(render(k.prefs, VARIANTS.W))),
  acceptanceRequestsBlockedByPrivacyGate: [...store('generations.jsonl').rows, ...store('context.jsonl').rows].filter(r => /privacy/i.test(r.error ?? '')).length,
}
summary.privacy = privacy
md.push('\n### Privacy (deterministic, no inference)\n\n' + Object.entries(privacy).map(([k, v]) => '- ' + k + ': ' + v).join('\n') + '\n')

const ctxRows = store('context.jsonl').rows.filter(r => ORDER.includes(r.model) && r.seed === FINAL_SEED)
summary.contextToolCalls = Object.fromEntries(['C', 'W'].map(v => [v, ctxRows.filter(r => r.variant === v && r.toolCalls > 0).length + '/' + ctxRows.filter(r => r.variant === v).length]))

// Section length for the combined winners vs current (worst case: everything on, Chinese).
const full = {...neutral(), style: 'creative', responseLanguage: 'zh', traits: {warmth: 0, enthusiasm: 2, structure: 2, emoji: 2, detail: 0, critical: 2}, presets: catalog.presets.map(p => p[0])}
summary.length = {winners: WINNERS, current: render(full).length, winner: render(full, VARIANTS.W).length}
md.unshift(`Judge: ${JUDGE}. Final owner-limited acceptance: Qwen3.5:4b, llama3 and gemma4-local only, seed ${FINAL_SEED}, critical cases only (96 requests + 4 matched re-runs of the two timeouts = 100). GPT-OSS 20B and Devstral are excluded; their earlier rows are shown with deterministic checks only. Cells marked "not run" are untested, not passed.\n\nWinners: ${JSON.stringify(WINNERS)}. Seed ${FINAL_SEED} (Stage C timeouts re-run as matched pairs on seed ${SEEDS_USED[1]}). Worst-case section length: current ${summary.length.current} chars, winners ${summary.length.winner} chars (${summary.length.winner - summary.length.current >= 0 ? '+' : ''}${summary.length.winner - summary.length.current}). Context rows with tool calls: ${JSON.stringify(summary.contextToolCalls)}.\n`)
fs.writeFileSync(path.join(EVIDENCE, 'acceptance.json'), JSON.stringify(summary, null, 1))
fs.writeFileSync(path.join(EVIDENCE, 'acceptance.md'), md.join('\n'))
console.log(md.join('\n'))
