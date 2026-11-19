// Per-criterion breakdown of absolute judge verdicts (grill, code, humanizer) by variant, all models.
// Usage: node subscores.mjs [stageA|stageC|context]
import {store, MODELS} from './lib.mjs'
import {judgeJobs} from './judge.mjs'
import {stageA} from './cases.mjs'

const stage = process.argv[2] ?? 'stageA'
const extra = ['stageC', 'context'].includes(stage) ? await (await import('./accept.mjs')).judgeInputs(stage) : {}
const J = new Map(store('judgments.jsonl').rows.filter(r => r.verdict).map(r => [r.key, r.verdict]))
const cases = extra.cases ?? stageA()
const byKey = new Map(judgeJobs(stage, extra).filter(j => j.kind === 'abs').map(j => [j.key, j]))
// Rebuild (area, variant, model) for each abs job from its case id: the job key is abs|<row key>.
const out = extra.out ?? (await import('./jobs.mjs')).outputs(cases)
const agg = {}
for (const model of extra.models ?? MODELS) for (const c of cases) for (const v of c.variants) for (const seed of extra.seeds ?? [101, 202]) {
  if (!['grill', 'code', 'humanizer'].includes(c.area)) continue
  const row = out(model, c.id, v, seed); if (!row) continue
  const verdict = J.get('abs|' + row.key); if (!verdict || !byKey.has('abs|' + row.key)) continue
  const g = `${c.area} ${c.role === 'neutral' ? 'neutral' : v} ${c.task ?? ''}`
  const a = agg[g] ??= {n: 0}
  a.n++
  for (const [k, val] of Object.entries(verdict)) a[k] = (a[k] ?? 0) + (val ? 1 : 0)
}
for (const [g, a] of Object.entries(agg).sort()) console.log(g.padEnd(34), JSON.stringify(a))
