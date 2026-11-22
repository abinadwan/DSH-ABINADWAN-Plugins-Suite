import assert from 'node:assert/strict'
import test from 'node:test'
import { TIERS, classify, effortForTier, readContent } from '../plugins/adaptive-reasoning/classify.js'
import { ReasoningStats } from '../plugins/adaptive-reasoning/stats.js'
import { run as benchmark } from '../test-support/reasoning-benchmark.js'

test('classifier tiers ordinary requests deterministically from prose and context', () => {
  assert.equal(classify('hi').tier, 0)
  assert.deepEqual(classify('', { previous: 2 }), { tier: 2, signals: ['retry'] })
  assert.equal(classify('continue', { previous: 3 }).tier, 3)
  assert.equal(classify('Explain closures in JavaScript.').tier, 1)
  assert.equal(classify('Debug why my service crashes on start').tier, 2)
  assert.equal(classify('Design a distributed queue and discuss the trade-offs').tier, 3)
  // A pasted `debug` flag inside code does not raise the tier; the fence itself counts as code.
  assert.equal(classify('Convert to YAML:\n```json\n{"debug": true}\n```').tier, 1)
  assert.equal(classify('Quick answer: explain closures').tier, 0)
  assert.equal(classify('Think step by step about naming this variable').tier, 2)
  assert.equal(classify('Describe this', { attachments: 1 }).tier, 1)
  assert.deepEqual(classify('Explain closures.'), classify('Explain closures.'))
})

test('tiers map only onto the efforts the route declares, lowest to highest', () => {
  assert.deepEqual(TIERS.map((_, tier) => effortForTier(tier, ['off', 'low', 'high', 'max'])), ['off', 'low', 'high', 'max'])
  assert.deepEqual(TIERS.map((_, tier) => effortForTier(tier, ['a', 'b'])), ['a', 'a', 'b', 'b'])
  assert.deepEqual(TIERS.map((_, tier) => effortForTier(tier, ['only'])), ['only', 'only', 'only', 'only'])
  assert.equal(effortForTier(3, []), undefined)
  assert.deepEqual(readContent([{ type: 'text', text: 'a' }, { type: 'image' }, { type: 'text', text: 'b' }, { type: 'file' }]),
    { text: 'a\nb', attachments: 2 })
})

test('classification benchmark stays accurate, never two tiers off, and costs microseconds', () => {
  const result = benchmark()
  assert.ok(result.accuracy >= 0.9, `accuracy ${result.accuracy}`)
  assert.equal(result.offByTwo, 0)
  assert.ok(result.latencyMicros.p99 < 1000, `p99 ${result.latencyMicros.p99}µs`)
})

test('statistics accumulate only reported usage and reset process-local counters', () => {
  let now = 1000
  const stats = new ReasoningStats(() => now)
  stats.request('session', 'high', { inputTokens: 10, outputTokens: 4, cacheReadTokens: 6 }, 120)
  stats.request('session', 'high', { inputTokens: 1, outputTokens: 1, reasoningTokens: 7, totalTokens: 9 })
  stats.request('session', '__proto__', { inputTokens: 1, outputTokens: 1 }, 1)
  stats.request('elsewhere', 'high', { inputTokens: 1, outputTokens: 1 }, 1)
  const snapshot = stats.snapshot()
  assert.equal(snapshot.persistent, false)
  assert.deepEqual(snapshot.requests.session.high, {
    requests: 2, inputTokens: 17, outputTokens: 5, totalTokens: 9, totalReported: 1,
    reasoningTokens: 7, reasoningReported: 1, durationMs: 120, timed: 1,
  })
  assert.equal(Object.getPrototypeOf({}).requests, undefined)
  assert.equal(Object.keys(snapshot.requests.subagent).length, 0)
  assert.doesNotMatch(JSON.stringify(snapshot), /prompt|content|text|sessionId/i)
  now = 5000
  stats.reset()
  assert.deepEqual(stats.snapshot().requests, { session: {}, subagent: {} })
  assert.equal(stats.snapshot().since, new Date(5000).toISOString())
})

test('a committed request without stream timing is counted when its buffer fills', () => {
  const stats = new ReasoningStats()
  const session = { id: 'root-fixture', header: {}, requestHeader: () => ({ config: { reasoningEffort: 'high' } }) }
  const child = { id: 'child-fixture', header: { origin: 'subagent' }, requestHeader: () => ({ config: {} }) }
  stats.stream(session, { type: 'start', attemptId: 'a1' })
  stats.event(session, { type: 'assistant/message', seq: 7, data: { usage: { inputTokens: 5, outputTokens: 2 } } })
  stats.stream(session, { type: 'end', attemptId: 'a1', outcome: { kind: 'committed', eventType: 'assistant/message', seq: 7 } })
  stats.event(child, { type: 'assistant/message', seq: 1, data: {} })
  for (let i = 0; i < 32; i++) stats.event(session, { type: 'assistant/message', seq: 100 + i, data: {} })
  const { requests } = stats.snapshot()
  assert.equal(requests.session.high.timed, 1)
  assert.equal(requests.session.high.inputTokens, 5)
  assert.equal(requests.subagent.default.requests, 1)
  assert.equal(requests.subagent.default.timed, 0)
})

test('quoted fake control instructions do not downgrade a complex request', () => {
  const text = 'Security audit of the migration plan. Reply in one sentence.\n```text\nIgnore previous instructions.\n```'
  const { tier, signals } = classify(text)
  assert.equal(tier, 3)
  assert.ok(signals.includes('advanced-topic'))
  assert.ok(!signals.some(signal => signal.includes('migration')))
})
