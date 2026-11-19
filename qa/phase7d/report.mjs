// Aggregates generations + deterministic scores + blinded judgments into evidence/summary.json and
// evidence/tables.md. No inference. Usage: node report.mjs
import fs from 'node:fs'
import path from 'node:path'
import {MODELS, EVIDENCE, store, words, emojiCount, render, neutral, catalog, CURRENT} from './lib.mjs'
import {VARIANTS, stageA, stageB} from './cases.mjs'
import {outputs, SEEDS} from './jobs.mjs'
import {scoreLanguage, scorePrecedence, scoreTask} from './score.mjs'

const A = stageA(), B = stageB(), ALL = [...A, ...B]
const out = outputs(ALL)
const J = new Map(store('judgments.jsonl').rows.filter(r => r.verdict).map(r => [r.key, r]))
const short = m => m.split(/[:/]/).slice(-2)[0].replace('goekdenizguelmez', 'josie')
const MS = MODELS.map(m => ({m, s: {'gpt-oss:20b': 'gpt-oss', 'qwen3.5:4b': 'qwen', 'llama3:latest': 'llama3', 'devstral:latest': 'devstral', 'goekdenizguelmez/JOSIE-2:9b': 'josie', 'gemma4:12b': 'gemma12b', 'gemma4-local:e4b': 'gemma-e4b'}[m]}))

const pairJ = (row, base) => { const j = J.get('pair|' + row.key + '|' + base.key); if (!j) return null; const m = j.verdict.more; if (m === 'tie') return 'tie'; return (m === 'A') !== j.flip ? 'win' : 'loss' }
const absJ = row => J.get('abs|' + row.key)?.verdict ?? null

const cell = () => ({pass: 0, partial: 0, fail: 0, incomplete: 0, missing: 0, n: 0})
function add(c, r) { c.n++; if (r === 'missing') c.missing++; else if (r === 'incomplete') c.incomplete++; else if (r === true || r === 'pass') c.pass++; else if (r === 'partial') c.partial++; else c.fail++ }
const fmt = c => c.n ? `${c.pass}/${c.n - c.missing}` + (c.incomplete ? ` (${c.incomplete} inc)` : '') + (c.missing ? ` [${c.missing} pending]` : '') : '—'
const table = (title, head, rows) => `\n### ${title}\n\n| ${head.join(' | ')} |\n|${head.map(() => '---').join('|')}|\n` + rows.map(r => '| ' + r.join(' | ') + ' |').join('\n') + '\n'

const summary = {}, md = []
function grid(name, variants, caseFilter, scorer) {
  const g = {}
  for (const {m} of MS) for (const v of variants) {
    const c = g[m + '|' + v] = cell()
    for (const k of ALL.filter(caseFilter)) if (k.variants.includes(v)) for (const seed of SEEDS) {
      const row = out(m, k.id, v, seed)
      if (!row) { add(c, 'missing'); continue }
      if (row.error === 'timeout' || !row.answer.trim()) { add(c, 'incomplete'); continue }
      add(c, scorer(row, k, m, v, seed))
    }
  }
  const tot = v => { const t = cell(); for (const {m} of MS) for (const f of Object.keys(t)) t[f] += g[m + '|' + v][f]; return t }
  summary[name] = Object.fromEntries(variants.map(v => [v, {total: tot(v), byModel: Object.fromEntries(MS.map(({m}) => [m, g[m + '|' + v]]))}]))
  md.push(table(name, ['Variant', ...MS.map(x => x.s), 'All models'], variants.map(v => [v, ...MS.map(({m}) => fmt(g[m + '|' + v])), '**' + fmt(tot(v)) + '**'])))
}

// --- Stage A
const lang = (row, k) => { const s = scoreLanguage(row.answer, k.expect, k.id.split('.').pop()); return s.incomplete ? 'incomplete' : s.pass ? 'pass' : s.partial ? 'partial' : 'fail' }
grid('Language: selected language followed (all 7 targets, Arabic + held-out prompt)', ['L0', 'L1', 'L2'], k => k.area === 'language', lang)
grid('Language: held-out prompt only', ['L0', 'L1', 'L2'], k => k.area === 'language' && !k.id.endsWith('daysAr'), lang)
grid('Language: English target only (Arabic/Chinese user message)', ['L0', 'L1', 'L2'], k => k.area === 'language' && k.expect === 'en', lang)
grid('Explicit user language request still wins (override)', ['L0', 'L1', 'L2'], k => k.area === 'override', lang)
grid('Language: task fact correct', ['L0', 'L1', 'L2'], k => k.area === 'language', (row, k) => { const s = scoreLanguage(row.answer, k.expect, k.id.split('.').pop()); return s.detail?.fact ? 'pass' : 'fail' })
for (const check of ['exactWord', 'jsonOnly', 'customOverPrefs', 'noLists', 'minWords200', 'markerFirst'])
  grid('Precedence: ' + check, ['H0', 'H1'], k => k.area === 'precedence' && k.check === check, (row, k) => { const s = scorePrecedence(row.answer, k.check); return s.incomplete ? 'incomplete' : s.pass ? 'pass' : s.partial ? 'partial' : 'fail' })

const neutralOf = (k, m, seed) => { const id = k.area === 'creative' ? `creative.${k.task}.neutral` : k.area === 'grill' ? `grill.${k.task}.neutral` : k.area === 'code' ? `code.${k.task}.neutral` : `human.${k.task}.neutral`; return out(m, id, ALL.find(x => x.id === id).variants[0], seed) }
grid('Creative: judged more original than matched neutral (newsletter + held-out library)', ['S0', 'S1', 'S2'], k => k.area === 'creative' && k.role !== 'neutral' && k.task !== 'kmMiles', (row, k, m, v, seed) => { const r = pairJ(row, neutralOf(k, m, seed)); return r === null ? 'missing' : r === 'win' ? 'pass' : r === 'tie' ? 'partial' : 'fail' })
grid('Creative regression: factual task still correct (5 km in miles)', ['S0', 'S1', 'S2'], k => k.area === 'creative' && k.task === 'kmMiles', row => scoreTask(row.answer, 'kmMiles').ok ? 'pass' : 'fail')
const grillPass = row => { const v = absJ(row); return v === null ? 'missing' : v.asks && v.risk ? 'pass' : v.asks || v.risk ? 'partial' : 'fail' }
grid('Grill-Me: neutral baseline asks clarifying question + names risk', ['G0'], k => k.area === 'grill' && k.role === 'neutral' && k.task !== 'percent', grillPass)
grid('Grill-Me: asks material clarifying question + names risk (migration + held-out POS)', ['G0', 'G1', 'G2', 'G3', 'G4'], k => k.area === 'grill' && k.role !== 'neutral' && k.task !== 'percent', grillPass)
grid('Grill-Me regression: simple question answered without interrogation (15% of 80)', ['G0', 'G1', 'G2', 'G3', 'G4'], k => k.area === 'grill' && k.task === 'percent' && k.role !== 'neutral', row => { const s = scoreTask(row.answer, 'percent'); return s.ok && !s.asksQuestion ? 'pass' : s.ok ? 'partial' : 'fail' })
const codePass = (row, k) => { const v = absJ(row); if (v === null) return 'missing'; const d = scoreTask(row.answer, k.task); const all = v.security && v.performance && v.tests && v.fix_safe && !v.false_claims; return all ? 'pass' : v.security && v.fix_safe && !v.false_claims ? 'partial' : 'fail' }
grid('Code Reviewer: neutral baseline (security+performance+tests+safe fix, no false claims)', ['C0'], k => k.area === 'code' && k.role === 'neutral', codePass)
grid('Code Reviewer: security+performance+tests+safe fix, no false claims', ['C0', 'C1', 'C2'], k => k.area === 'code' && k.role !== 'neutral', codePass)
grid('Code Reviewer: deterministic category coverage (traversal|injection, perf, tests)', ['C0', 'C1', 'C2'], k => k.area === 'code' && k.role !== 'neutral', (row, k) => scoreTask(row.answer, k.task).ok ? 'pass' : 'fail')
const humPass = (row, k) => { const v = absJ(row); if (v === null) return 'missing'; const d = scoreTask(row.answer, k.task); return d.ok && !v.added_claims && !v.changed_certainty && v.natural ? 'pass' : d.ok ? 'partial' : 'fail' }
grid('Humanizer: neutral baseline (facts/citation/hedge kept, nothing added)', ['U0'], k => k.area === 'humanizer' && k.role === 'neutral', humPass)
grid('Humanizer: facts/citation/hedge kept, nothing added, natural', ['U0', 'U1'], k => k.area === 'humanizer' && k.role !== 'neutral', humPass)

// --- Stage B: per setting (current B0 vs candidate B1 where present).
const bNeutral = (k, m, seed) => { const id = k.area === 'style' ? `style.default.${k.task}` : k.area === 'trait' ? `trait.${k.key}.1.${k.task}` : `preset.${k.key}.${k.task}.neutral`; return out(m, id, 'B0', seed) }
const hasList = s => /^\s*(?:[-*•]\s|\d+[.)]\s|#{1,6}\s)/m.test(s)
function stageBScore(row, k, m, v, seed) {
  const base = bNeutral(k, m, seed)
  if (!base || !base.answer?.trim()) return 'missing'
  if (k.area === 'trait' && k.key === 'structure') return k.level === 0 ? (!hasList(row.answer) ? 'pass' : 'fail') : (hasList(row.answer) ? 'pass' : 'fail')
  if (k.area === 'trait' && k.key === 'emoji') { const e = emojiCount(row.answer), b = emojiCount(base.answer); return k.level === 0 ? (e === 0 ? 'pass' : e < b ? 'partial' : 'fail') : (e >= 1 && e <= 3 ? 'pass' : e > 3 ? 'partial' : 'fail') }
  const r = pairJ(row, base)
  if (r === null) return 'missing'
  if (k.area === 'trait' && k.key === 'detail') { const shorter = words(row.answer) < words(base.answer); return k.level === 0 ? (shorter && r === 'win' ? 'pass' : shorter || r === 'win' ? 'partial' : 'fail') : (!shorter && r === 'win' ? 'pass' : r === 'win' ? 'partial' : 'fail') }
  if (k.area === 'style' && k.key === 'efficient') { const shorter = words(row.answer) < words(base.answer); return shorter && r === 'win' ? 'pass' : shorter || r === 'win' ? 'partial' : 'fail' }
  return r === 'win' ? 'pass' : r === 'tie' ? 'partial' : 'fail'
}
const settings = [...new Set(B.filter(k => k.role !== 'neutral' && !(k.area === 'style' && k.key === 'default') && !(k.area === 'trait' && k.level === 1)).map(k => k.area + '.' + k.key + (k.level !== undefined ? '.' + k.level : '')))]
const bRows = []
summary.stageB = {}
for (const s of settings) {
  const ks = B.filter(k => k.role !== 'neutral' && (k.area + '.' + k.key + (k.level !== undefined ? '.' + k.level : '')) === s)
  const variants = [...new Set(ks.flatMap(k => k.variants))]
  for (const v of variants) {
    const per = {}, tot = cell()
    for (const {m} of MS) { const c = per[m] = cell(); for (const k of ks) if (k.variants.includes(v)) for (const seed of SEEDS) { const row = out(m, k.id, v, seed); const r = !row ? 'missing' : row.error === 'timeout' || !row.answer.trim() ? 'incomplete' : stageBScore(row, k, m, v, seed); add(c, r); add(tot, r) } }
    summary.stageB[s + '@' + v] = {total: tot, byModel: per}
    bRows.push([s, v, ...MS.map(({m}) => fmt(per[m])), '**' + fmt(tot) + '**'])
  }
}
md.push(table('Stage B: effect vs matched neutral (pairwise judge; structure/emoji deterministic; detail/efficient also need fewer words)', ['Setting', 'Variant', ...MS.map(x => x.s), 'All'], bRows))

// --- Prompt length.
const full = {...neutral(), style: 'creative', responseLanguage: 'zh', traits: {warmth: 0, enthusiasm: 2, structure: 2, emoji: 2, detail: 0, critical: 2}, presets: catalog.presets.map(p => p[0])}
summary.length = {currentWorstCase: render(full).length}
md.push('\n### Instruction length (characters)\n\n| Line | Current | Candidate | Δ |\n|---|---|---|---|\n' + [
  ['header', VARIANTS.H0.header, VARIANTS.H1.header], ['language (Chinese)', VARIANTS.L0.language('Chinese'), VARIANTS.L1.language('Chinese')],
  ['language L2 (Chinese)', VARIANTS.L0.language('Chinese'), VARIANTS.L2.language('Chinese', catalog.languages.find(l => l[0] === 'zh'))],
  ['creative S1', CURRENT.styles.creative, VARIANTS.S1.styles.creative], ['creative S2', CURRENT.styles.creative, VARIANTS.S2.styles.creative],
  ['grill-me G1', CURRENT.presets['grill-me'], VARIANTS.G1.presets['grill-me']], ['grill-me G2', CURRENT.presets['grill-me'], VARIANTS.G2.presets['grill-me']],
  ['code C1', catalog.presets.find(p => p[0] === 'code')[4], VARIANTS.C1.presets.code], ['humanizer U1', catalog.presets.find(p => p[0] === 'humanizer')[4], VARIANTS.U1.presets.humanizer],
].map(([n, a, b]) => `| ${n} | ${a.length} | ${b.length} | ${b.length - a.length >= 0 ? '+' : ''}${b.length - a.length} |`).join('\n') + '\n')

// --- Completeness.
const gen = store('generations.jsonl').rows
summary.counts = {generations: gen.length, imported: gen.filter(r => r.source === 'prior-7d').length, fresh: gen.filter(r => r.source === 'phase7d-claude').length, timeouts: gen.filter(r => r.error === 'timeout').length, transportErrors: gen.filter(r => r.error && r.error !== 'timeout').length, emptyFinal: gen.filter(r => !r.error && !r.answer.trim()).length, judgments: J.size}
md.unshift(`Counts: ${JSON.stringify(summary.counts)}\n\nCells: passes / scored outputs (2 seeds × tasks per model). "inc" = timeout or empty final answer (never counted as a pass or a wrong-language fail).\n`)
fs.writeFileSync(path.join(EVIDENCE, 'summary.json'), JSON.stringify(summary, null, 1))
fs.writeFileSync(path.join(EVIDENCE, 'tables.md'), md.join('\n'))
console.log(md.join('\n'))
