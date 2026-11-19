// Alternative-judge qualification on previously graded samples (no new generations).
//   Primary:   the 32 blinded manual spot-check items (evidence/spotcheck-items.md + spotcheck-manual.json),
//              judged from the identical prompts the incumbent (gpt-oss:20b) saw.
//   Secondary: 40 further Stage A/B items (10 per group) graded by the incumbent, for consistency only.
// Pre-registered acceptance rule (fixed before any candidate verdict existed):
//   manual agreement >= 27/32 (incumbent 28/32), every group >= 6/8, at most 1 unparseable verdict.
//   Among candidates that pass, the one with the lowest median judge latency is selected.
// Usage: node judgeeval.mjs run <judge...> | node judgeeval.mjs score
import fs from 'node:fs'
import path from 'node:path'
import {EVIDENCE, store, sha} from './lib.mjs'
import {judgeJobs, ask} from './judge.mjs'

// Owner decision 2026-11-19: only lightweight local models are candidates; GPT-OSS is never a fallback.
const CANDIDATES = ['gemma4-local:e4b', 'qwen3.5:4b']
const pass = {grill: v => v.asks && v.risk, code: v => v.security && v.performance && v.tests && v.fix_safe && !v.false_claims, humanizer: v => !v.added_claims && !v.changed_certainty && v.natural}
const group = it => it.kind === 'pair' ? 'pair' : it.area
const agree = (it, a, b) => it.kind === 'pair' ? (a?.more ?? a) === (b?.more ?? b) : !!pass[it.area](a) === !!pass[it.area](b)

function items() {
  const md = fs.readFileSync(path.join(EVIDENCE, 'spotcheck-items.md'), 'utf8')
  const key = JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'spotcheck-key.json'), 'utf8'))
  const manual = JSON.parse(fs.readFileSync(path.join(EVIDENCE, 'spotcheck-manual.json'), 'utf8'))
  const parts = md.split(/^## (S\d{3}) \((\w+)(?::(\w+))?\)\n\n/m).slice(1), out = []
  for (let i = 0; i < parts.length; i += 4) {
    const id = parts[i]
    out.push({id, set: 'manual', kind: parts[i + 1], area: parts[i + 2], prompt: parts[i + 3].replace(/\n+$/, ''), ref: manual[id], incumbent: key[id].judge, key: key[id].key})
  }
  const used = new Set(out.map(x => x.key))
  const J = new Map(store('judgments.jsonl').rows.filter(r => r.verdict).map(r => [r.key, r]))
  const groups = {}
  for (const st of ['stageA', 'stageB']) for (const job of judgeJobs(st)) if (J.has(job.key) && !used.has(job.key)) (groups[group(job)] ??= new Map()).set(job.key, job)
  for (const [g, m] of Object.entries(groups)) {
    const pick = [...m.values()].sort((a, b) => sha('eval2' + a.key).localeCompare(sha('eval2' + b.key))).slice(0, 10)
    pick.forEach((job, n) => out.push({id: 'X' + g[0].toUpperCase() + n, set: 'incumbent', kind: job.kind, area: job.area, prompt: job.prompt, ref: J.get(job.key).verdict, incumbent: J.get(job.key).verdict, key: job.key, incumbentMs: J.get(job.key).ms}))
  }
  return out
}

const mode = process.argv[2], st = store('judge-eval.jsonl')
if (mode === 'run') {
  const judges = process.argv.slice(3).length ? process.argv.slice(3) : CANDIDATES, all = items().filter(it => it.set === 'manual') // manual items only (time-boxed)
  if (judges.some(j => !CANDIDATES.includes(j))) throw Error('not a permitted judge candidate')
  for (const judge of judges) for (const it of all) {
    const key = judge + '|' + it.id
    if (st.done.has(key)) continue
    const {v, ms} = await ask(it.prompt, judge)
    st.append({key, judge, id: it.id, set: it.set, verdict: v, ms, error: v ? null : 'unparseable'})
    console.log(JSON.stringify({judge, id: it.id, v, ms}))
  }
  console.log('JUDGE_EVAL_COMPLETE')
} else if (mode === 'score') {
  const all = items(), J = new Map(store('judgments.jsonl').rows.map(r => [r.key, r]))
  const med = a => { const s = a.filter(Number.isFinite).sort((x, y) => x - y); return s.length ? s[s.length >> 1] : null }
  const result = {}
  const judges = ['gpt-oss:20b', ...new Set(st.rows.map(r => r.judge))]
  for (const judge of judges) {
    const r = {manual: {}, incumbent: {}, unparseable: 0, ms: []}
    for (const it of all) {
      const v = judge === 'gpt-oss:20b' ? it.incumbent : st.rows.find(x => x.key === judge + '|' + it.id)?.verdict
      const ms = judge === 'gpt-oss:20b' ? J.get(it.key)?.ms : st.rows.find(x => x.key === judge + '|' + it.id)?.ms
      if (judge !== 'gpt-oss:20b' && !st.rows.some(x => x.key === judge + '|' + it.id)) continue
      r.ms.push(ms)
      if (!v) { r.unparseable++; continue }
      for (const [set, ref] of [['manual', it.set === 'manual' && it.ref], ['incumbent', it.incumbent]]) {
        if (!ref || (set === 'incumbent' && judge === 'gpt-oss:20b')) continue
        const g = (r[set][group(it)] ??= {n: 0, agree: 0}); g.n++; if (agree(it, v, ref)) g.agree++
      }
    }
    const tot = o => Object.values(o).reduce((s, g) => ({n: s.n + g.n, agree: s.agree + g.agree}), {n: 0, agree: 0})
    const m = tot(r.manual)
    result[judge] = {manual: r.manual, manualTotal: m, incumbent: r.incumbent, incumbentTotal: tot(r.incumbent), unparseable: r.unparseable, medianMs: med(r.ms), n: r.ms.length,
      passes: m.n === 32 && m.agree >= 27 && Object.values(r.manual).every(g => g.agree >= 6) && r.unparseable <= 1}
  }
  const qualified = Object.entries(result).filter(([, v]) => v.passes).sort((a, b) => a[1].medianMs - b[1].medianMs)
  const out = {rule: 'manual >= 27/32, each group >= 6/8, <= 1 unparseable; fastest qualifying judge selected', result, selected: qualified[0]?.[0] ?? null}
  fs.writeFileSync(path.join(EVIDENCE, 'judge-eval.json'), JSON.stringify(out, null, 1))
  console.log(JSON.stringify(out, null, 1))
} else throw Error('mode')
