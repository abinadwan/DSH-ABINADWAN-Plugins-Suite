// Blinded manual audit of the local judge.
//   node spotcheck.mjs export <n> <stage...>  -> evidence/spotcheck-items.md (no condition labels, no judge verdicts)
//                                              evidence/spotcheck-key.json (hidden key: judge verdict per item)
//   node spotcheck.mjs score                 -> agreement between evidence/spotcheck-manual.json and the judge
// Manual file format: {"<item id>": "A"|"B"|"tie"} for pair items, {"<item id>": {...same fields as judge}} for abs items.
import fs from 'node:fs'
import path from 'node:path'
import {EVIDENCE, store, sha} from './lib.mjs'
import {judgeJobs} from './judge.mjs'

const mode = process.argv[2]
if (mode === 'export') {
  const n = Number(process.argv[3]), stages = process.argv.slice(4)
  const J = new Map(store('judgments.jsonl').rows.filter(r => r.verdict).map(r => [r.key, r]))
  const pool = []
  for (const st of stages) {
    const extra = ['stageC', 'context'].includes(st) ? await (await import('./accept.mjs')).judgeInputs(st) : {}
    for (const job of judgeJobs(st, extra)) if (J.has(job.key)) pool.push({...job, stage: st})
  }
  // Deterministic stratified sample: order by hash, take an equal share of abs-areas and pair items.
  const groups = {}
  for (const j of pool) (groups[j.kind === 'abs' ? 'abs:' + j.area : 'pair'] ??= []).push(j)
  for (const g of Object.values(groups)) g.sort((a, b) => sha(a.key).localeCompare(sha(b.key)))
  const keys = Object.keys(groups), pick = []
  for (let i = 0; pick.length < n && keys.some(k => groups[k].length); i++) { const g = groups[keys[i % keys.length]]; if (g.length) pick.push(g.shift()) }
  const items = pick.map((j, i) => ({id: 'S' + String(i + 1).padStart(3, '0'), ...j}))
  fs.writeFileSync(path.join(EVIDENCE, 'spotcheck-key.json'), JSON.stringify(Object.fromEntries(items.map(it => [it.id, {key: it.key, kind: it.kind, area: it.area, judge: J.get(it.key).verdict}])), null, 1))
  fs.writeFileSync(path.join(EVIDENCE, 'spotcheck-items.md'), items.map(it => `## ${it.id} (${it.kind}${it.area ? ':' + it.area : ''})\n\n${it.prompt}\n`).join('\n'))
  console.log(JSON.stringify({exported: items.length, groups: Object.fromEntries(keys.map(k => [k, pick.filter(p => (p.kind === 'abs' ? 'abs:' + p.area : 'pair') === k).length]))}))
} else if (mode === 'score') {
  const key = JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'spotcheck-key.json'), 'utf8'))
  const man = JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'spotcheck-manual.json'), 'utf8'))
  const pass = {grill: v => v.asks && v.risk, code: v => v.security && v.performance && v.tests && v.fix_safe && !v.false_claims, humanizer: v => !v.added_claims && !v.changed_certainty && v.natural}
  const res = {}, disagreements = []
  for (const [id, k] of Object.entries(key)) {
    if (!(id in man)) continue
    const g = k.kind === 'pair' ? 'pair' : k.area
    const agree = k.kind === 'pair' ? man[id] === k.judge.more : !!pass[k.area](man[id]) === !!pass[k.area](k.judge)
    res[g] ??= {n: 0, agree: 0}; res[g].n++; if (agree) res[g].agree++; else disagreements.push({id, area: g, manual: man[id], judge: k.judge})
  }
  fs.writeFileSync(path.join(EVIDENCE, 'spotcheck-agreement.json'), JSON.stringify({res, disagreements}, null, 1))
  console.log(JSON.stringify(res), disagreements.length + ' disagreements')
}
