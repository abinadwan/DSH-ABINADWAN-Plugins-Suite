// Classification benchmark for Adaptive Reasoning. It runs the deterministic
// local classifier over a fixed, hand-labelled corpus of synthetic prompts and
// reports accuracy, the confusion matrix, off-by-two errors and per-call
// latency. No provider request is made and no prompt is written anywhere.
// The corpus was used to tune the rules, so its accuracy is in-sample.
//
// Run: node qa/adaptive-reasoning-benchmark.mjs [--json]

import { TIERS } from '../plugins/adaptive-reasoning/classify.js'
import { run } from '../test-support/reasoning-benchmark.js'

const result = run()
if (process.argv.includes('--json')) console.log(JSON.stringify(result, null, 2))
else {
  console.log(`cases ${result.cases}  accuracy ${(result.accuracy * 100).toFixed(1)}%  off-by-two ${result.offByTwo}`)
  console.log('label / got  ' +TIERS.map(t => t.padStart(9)).join(''))
  result.matrix.forEach((row, i) => console.log(TIERS[i].padEnd(13) + row.map(n => String(n).padStart(9)).join('')))
  for (const miss of result.misses) console.log(`  ${miss.label} -> ${miss.got} [${miss.signals.join(',')}] ${miss.sample}`)
  const l = result.latencyMicros
  console.log(`latency per call: p50 ${l.p50.toFixed(2)}µs p95 ${l.p95.toFixed(2)}µs p99 ${l.p99.toFixed(2)}µs; 16k-char input ${l.longInput16k.toFixed(1)}µs (${result.node})`)
}
