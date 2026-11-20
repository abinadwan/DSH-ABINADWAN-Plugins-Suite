// Classification benchmark for Adaptive Reasoning. It runs the deterministic
// local classifier over a fixed, hand-labelled corpus of synthetic prompts and
// reports accuracy, the confusion matrix, off-by-two errors and per-call
// latency. No provider request is made and no prompt is written anywhere.
//
// Run: node qa/adaptive-reasoning-benchmark.mjs [--json]

import { performance } from 'node:perf_hooks'
import { TIERS, classify } from '../plugins/adaptive-reasoning/classify.js'

const S = 0, D = 1, C = 2, A = 3
const longSpec = [
  'We are replacing our nightly batch export with an event-driven pipeline.',
  'Today a cron job queries Postgres, writes CSV files to object storage and a downstream team imports them.',
  'The new design must keep exactly-once delivery to three consumers, survive a regional outage, and let us replay seven days.',
  'Budget is fixed, the team knows Go and TypeScript, and the compliance team requires an audit trail per record.',
].join(' ')

/** @type {[string, number, { attachments?: number, previous?: number }?][]} */
export const corpus = [
  // simple: greetings, one-fact lookups, trivial rewrites
  ['hi', S], ['thanks!', S], ['good morning', S], ['ok thanks, that worked', S],
  ['What is the capital of Australia?', S], ['How many days are in a leap year?', S],
  ['Translate "good night" into French.', S], ['What time zone is Tokyo in?', S],
  ['Spell "necessary".', S], ['Quick: is 17 prime?', S],
  ['Who wrote Pride and Prejudice?', S], ['Convert 5 km to miles', S],
  ['What does HTTP stand for?', S], ['Give me a synonym for happy', S],
  ['yes', S, { previous: S }],

  // standard: explanations, short code, summaries, ordinary writing
  ['Explain the difference between let and const in JavaScript, with a short example of each.', D],
  ['Write a Python function that returns the n-th Fibonacci number using iteration.', D],
  ['How do I undo the last git commit but keep the changes in my working tree?', D],
  ['Summarize the main ideas of stoic philosophy in a few paragraphs for a beginner.', D],
  ['Write a polite email to my landlord asking when the broken heater will be repaired.', D],
  ['What is the difference between a process and a thread? Keep it practical.', D],
  ['Rewrite this paragraph so it sounds more formal: "hey, we kinda missed the deadline, sorry, will fix soon."', D],
  ['Convert this JSON to YAML:\n```json\n{"name": "app", "port": 8080, "debug": true}\n```', D],
  ['Give me a weekly vegetarian meal plan with a shopping list.', D],
  ['How does HTTPS keep my password private when I log in to a website?', D],
  ['Explain what a closure is in JavaScript and when I would use one.', D],
  ['Write a bash one-liner that counts lines in every .js file under src.', D],
  ['continue', D, { previous: D }],
  ['', D, { previous: D }],
  ['Describe this screenshot and tell me what the error dialog says.', D, { attachments: 1 }],

  // complex: debugging, implementation, analysis, multi-step work
  ['My React component re-renders on every keystroke and the input loses focus. Here is the code:\n```jsx\nfunction Form() {\n  const Field = () => <input onChange={e => setV(e.target.value)} />\n  const [v, setV] = useState("")\n  return <Field />\n}\n```\nWhy, and how do I fix it?', C],
  ['This test fails only on CI:\n```\nTypeError: Cannot read properties of undefined (reading \'map\')\n    at render (src/list.js:14:22)\n    at run (node_modules/runner/index.js:88:5)\n```\nThe data comes from a fetch mock. What could differ between CI and local?', C],
  ['Implement an LRU cache in TypeScript with O(1) get and put, plus unit tests.', C],
  ['Optimize this SQL query; it takes 40 seconds on 10 million rows:\n```sql\nSELECT * FROM orders o WHERE o.customer_id IN (SELECT id FROM customers WHERE country = \'DE\') ORDER BY created_at DESC LIMIT 50;\n```', C],
  ['Write a regex that validates ISO 8601 dates with optional time and timezone, and explain each part.', C],
  ['Compare PostgreSQL and MongoDB for an inventory system with frequent stock updates and reporting.', C],
  ['Plan the steps to move our Express app from callbacks to async/await:\n1. inventory callback APIs\n2. wrap them\n3. migrate routes\n4. update tests', C],
  ['Calculate the probability of getting at least two heads in five fair coin flips, and show the working.', C],
  ['Refactor this 200-line function into smaller pieces and explain the new structure.', C],
  ['Analyze this CSV of monthly sales and tell me which regions are declining and why that might be.', C, { attachments: 1 }],
  ['Debug why my Docker container exits immediately with code 137 after starting the Java service.', C],
  ['Find the derivative of x^3 * sin(x) and evaluate it at x = pi.', C],
  ['Think step by step: how should I split this Node monolith into modules?', C],
  ['Benchmark Array.prototype.includes against a Set lookup for 1e6 items and explain the results.', C],
  ['Write an algorithm that merges overlapping intervals and give its time complexity.', C],

  // advanced: architecture, security, proofs, root-cause investigations, long specs
  ['Design a distributed rate limiter for a multi-region API gateway. Discuss consistency trade-offs, failure modes and how clients should back off.', A],
  ['Do a security review of this login flow: we store the session token in localStorage, refresh it via an unauthenticated endpoint and log the token on errors.', A],
  ['Prove that every comparison-based sorting algorithm needs Ω(n log n) comparisons in the worst case.', A],
  ['We see intermittent deadlocks between two services that both write to the same Postgres tables under load. Investigate possible root causes and propose a fix and a way to verify it.', A],
  ['Propose a migration plan from a single MySQL instance to a sharded cluster with zero downtime, including rollback.', A],
  ['Build a threat model for a browser extension that reads page content and calls a remote LLM API.', A],
  [longSpec + ' Propose an architecture, the main trade-offs, and a phased rollout.', A],
  ['Explain the race conditions in this Go worker pool and redesign it so shutdown never drops jobs:\n```go\nfor _, j := range jobs { go func() { results <- work(j) }() }\nclose(results)\n```', A],
  ['Thoroughly evaluate whether we should adopt event sourcing for our billing system, considering auditability, schema evolution and operational cost.', A],
  ['Design the system architecture for a collaborative document editor with offline support and conflict resolution.', A],
  ['Research and compare consensus algorithms (Raft, Paxos, EPaxos) for a geo-replicated configuration store.', A],
  ['Formally verify that this mutex implementation guarantees mutual exclusion and freedom from starvation.', A],
]

export function run(cases = corpus) {
  const matrix = TIERS.map(() => TIERS.map(() => 0))
  const misses = []
  let correct = 0
  let offByTwo = 0
  for (const [text, label, context] of cases) {
    const { tier, signals } = classify(text, context)
    matrix[label][tier]++
    if (tier === label) correct++
    else misses.push({ label: TIERS[label], got: TIERS[tier], signals, sample: text.slice(0, 72).replace(/\s+/g, ' ') })
    if (Math.abs(tier - label) >= 2) offByTwo++
  }
  // Latency: repeat the corpus enough times for a stable per-call figure.
  const rounds = 2000
  for (let i = 0; i < 200; i++) for (const [text, , context] of cases) classify(text, context)
  const samples = []
  for (let r = 0; r < rounds; r++) {
    const start = performance.now()
    for (const [text, , context] of cases) classify(text, context)
    samples.push((performance.now() - start) / cases.length)
  }
  samples.sort((a, b) => a - b)
  const q = p => samples[Math.min(samples.length - 1, Math.floor(p * samples.length))]
  const worst = (() => {
    const text = 'x'.repeat(16000) + '\n```\ncode\n```\n'.repeat(50)
    const start = performance.now()
    for (let i = 0; i < 100; i++) classify(text)
    return (performance.now() - start) / 100
  })()
  return {
    cases: cases.length,
    accuracy: correct / cases.length,
    offByTwo,
    matrix,
    misses,
    latencyMicros: { p50: q(0.5) * 1000, p95: q(0.95) * 1000, p99: q(0.99) * 1000, longInput16k: worst * 1000 },
    node: process.version,
  }
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/').replace(/^\/?/, '/')}` || process.argv[1]?.endsWith('adaptive-reasoning-benchmark.mjs')) {
  const result = run()
  if (process.argv.includes('--json')) console.log(JSON.stringify(result, null, 2))
  else {
    console.log(`cases ${result.cases}  accuracy ${(result.accuracy * 100).toFixed(1)}%  off-by-two ${result.offByTwo}`)
    console.log('label \\ got  ' + TIERS.map(t => t.padStart(9)).join(''))
    result.matrix.forEach((row, i) => console.log(TIERS[i].padEnd(13) + row.map(n => String(n).padStart(9)).join('')))
    for (const miss of result.misses) console.log(`  ${miss.label} -> ${miss.got} [${miss.signals.join(',')}] ${miss.sample}`)
    const l = result.latencyMicros
    console.log(`latency per call: p50 ${l.p50.toFixed(2)}µs p95 ${l.p95.toFixed(2)}µs p99 ${l.p99.toFixed(2)}µs; 16k-char input ${l.longInput16k.toFixed(1)}µs (${result.node})`)
  }
}
