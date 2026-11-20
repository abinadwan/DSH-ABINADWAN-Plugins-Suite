import assert from 'node:assert/strict'
import test from 'node:test'
import { TIERS, classify, effortForTier, readContent } from '../plugins/adaptive-reasoning/classify.js'
import { MessageEfforts } from '../plugins/adaptive-reasoning/efforts.js'
import { ReasoningStats } from '../plugins/adaptive-reasoning/stats.js'
import { run as benchmark } from '../qa/adaptive-reasoning-benchmark.mjs'

const DEEPSEEK = ['off', 'low', 'high', 'max'].map(id => ({ id }))
const route = { provider: 'deepseek', model: 'deepseek-v4' }
const ids = Array.from({ length: 80 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`)
const R1 = ids[0], R2 = ids[1], R3 = ids[2]

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

test('statistics keep aggregate counts only, never estimate reasoning tokens and reset', () => {
  let now = 1000
  const stats = new ReasoningStats(() => now)
  stats.message('override')
  stats.message('nonsense')
  stats.classified(2, 0.01)
  stats.override(false, 'shared-step')
  stats.request('session', 'high', { inputTokens: 10, outputTokens: 4, cacheReadTokens: 6 }, 120)
  stats.request('session', 'high', { inputTokens: 1, outputTokens: 1, reasoningTokens: 7, totalTokens: 9 }, undefined)
  stats.request('session', '__proto__', { inputTokens: 1, outputTokens: 1 }, 1)
  stats.request('elsewhere', 'high', { inputTokens: 1, outputTokens: 1 }, 1)
  const snapshot = stats.snapshot()
  assert.equal(snapshot.persistent, false)
  assert.equal(snapshot.messages, 2)
  assert.equal(snapshot.sources.override, 1)
  assert.equal(snapshot.tiers.complex, 1)
  assert.deepEqual({ ...snapshot.overrides.notApplied }, { 'shared-step': 1 })
  const high = snapshot.requests.session.high
  assert.deepEqual(high, { requests: 2, inputTokens: 17, outputTokens: 5, totalTokens: 9, totalReported: 1,
    reasoningTokens: 7, reasoningReported: 1, durationMs: 120, timed: 1 })
  assert.equal(Object.getPrototypeOf({}).requests, undefined, 'no prototype pollution')
  assert.equal(Object.keys(snapshot.requests.subagent).length, 0)
  assert.doesNotMatch(JSON.stringify(snapshot), /prompt|content|text|sessionId/i)
  now = 5000
  stats.reset()
  assert.equal(stats.snapshot().messages, 0)
  assert.equal(stats.snapshot().since, new Date(5000).toISOString())
})

function host({ mode = 'manual', subagents = 'inherit', subagentEffort, preferences = [], efforts = DEEPSEEK } = {}) {
  const agents = new Map()
  const config = { preferences, mode, subagents, subagentEffort }
  const llm = {
    resolved: 0,
    async resolveCallConfig(selection) {
      if (selection.provider !== route.provider) throw new Error('unknown provider')
      if (selection.reasoningEffort !== undefined && !efforts.some(e => e.id === selection.reasoningEffort)) throw new Error('unsupported')
      return {}
    },
    async resolveModelInfo() { llm.resolved++; return { reasoning: { efforts } } },
  }
  const stats = new ReasoningStats()
  const turns = new MessageEfforts({ get: id => agents.get(id) }, llm, () => config, stats)
  const agent = (id, effort, origin) => {
    let current = { ...route, ...effort === undefined ? {} : { reasoningEffort: effort } }
    const value = {
      id, selects: [],
      session: { id, header: origin ? { origin } : {} },
      model: { current: () => ({ ...current }), select(selection) { value.selects.push(selection); current = { ...selection } } },
      get effort() { return current.reasoningEffort },
    }
    agents.set(id, value)
    return value
  }
  const call = async (method, body) => {
    const response = await turns[method](new Request('http://host/api', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    }))
    return { status: response.status, body: await response.json() }
  }
  const bind = (sessionId, requestId, reasoningEffort, extra = {}) =>
    call('bind', { sessionId, requestId, ...route, reasoningEffort, ...extra })
  const status = (sessionId, requestId) => call('status', { sessionId, requestId }).then(r => r.body)
  let turnNo = 0
  const message = (rpcId, text = 'hello there', kind = 'user') => ({ source: { kind, ...rpcId ? { rpcId } : {} }, content: [{ type: 'text', text }] })
  /** Claim one or more messages as one native step. */
  const claim = async (target, ...messages) => {
    const turn = { n: ++turnNo }
    for (const item of messages) {
      turns.inserted(target, item)
      turns.claimed(target, item, turn)
    }
    await Promise.resolve()
  }
  const idle = target => turns.restore(target, 'finished')
  return { agents, config, llm, stats, turns, agent, call, bind, status, message, claim, idle }
}

test('a bound override reaches exactly its message, then the session effort returns', async () => {
  const h = host()
  const a = h.agent('s1', 'low')
  await h.turns.created(a)
  assert.equal((await h.bind('s1', R1, 'max')).status, 200)
  assert.equal((await h.status('s1', R1)).status, 'pending')
  // Another window's message on the same session does not consume it.
  await h.claim(a, h.message(R2))
  assert.equal(a.effort, 'low')
  h.idle(a)
  await h.claim(a, h.message(R1))
  assert.equal(a.effort, 'max')
  assert.equal((await h.status('s1', R1)).status, 'active')
  h.idle(a)
  assert.equal(a.effort, 'low')
  assert.deepEqual(await h.status('s1', R1), { status: 'finished', effort: 'max', restored: true })
  assert.equal(h.stats.snapshot().overrides.applied, 1)
  assert.equal(h.stats.snapshot().sources.manual, 1)
  // A finished id cannot be bound again; another session sees nothing.
  assert.equal((await h.bind('s1', R1, 'max')).status, 409)
  assert.deepEqual(await h.status('s2', R1), { status: 'unknown' })
})

test('the override lasts across the turn and its retries, and a regeneration can carry its own id', async () => {
  const h = host()
  const a = h.agent('s1', 'low')
  await h.turns.created(a)
  await h.bind('s1', R1, 'high')
  await h.claim(a, h.message(R1))
  // Tool steps and request retries do not claim user input, so the selection stands.
  h.turns.claimed(a, { source: { kind: 'tool' }, content: [] }, { n: 99 })
  assert.equal(a.effort, 'high')
  h.idle(a)
  await h.bind('s1', R2, 'max')
  await h.claim(a, h.message(R2, '', 'retry'))
  assert.equal(a.effort, 'max')
  h.idle(a)
  assert.equal(a.effort, 'low')
})

test('a manual change during the override wins and is not reverted', async () => {
  const h = host()
  const a = h.agent('s1', 'low')
  await h.turns.created(a)
  await h.bind('s1', R1, 'max')
  await h.claim(a, h.message(R1))
  a.model.select({ ...route, reasoningEffort: 'high' })
  h.idle(a)
  assert.equal(a.effort, 'high')
  assert.deepEqual(await h.status('s1', R1), { status: 'finished', effort: 'max', restored: false })
})

test('messages that share one step make the override not applied and restore at once', async () => {
  const h = host()
  const a = h.agent('s1', 'low')
  await h.turns.created(a)
  await h.bind('s1', R1, 'max')
  await h.bind('s1', R2, 'high')
  await h.claim(a, h.message(R1), h.message(R2))
  assert.equal(a.effort, 'low')
  assert.equal((await h.status('s1', R1)).reason, 'shared-step')
  assert.equal((await h.status('s1', R2)).reason, 'shared-step')
  assert.equal(h.stats.snapshot().overrides.notApplied['shared-step'], 2)
  assert.equal(h.stats.snapshot().overrides.applied, 0)
})

test('a route change, an unsupported effort, a discard, a withdrawal or an expiry is reported not applied', async (t) => {
  const h = host()
  const a = h.agent('s1', 'low')
  await h.turns.created(a)
  await h.bind('s1', R1, 'max')
  a.model.select({ provider: 'deepseek', model: 'other-model', reasoningEffort: 'low' })
  await h.claim(a, h.message(R1))
  assert.equal(a.effort, 'low')
  assert.equal((await h.status('s1', R1)).reason, 'route-changed')

  const b = h.agent('s2', 'low')
  await h.turns.created(b)
  await h.bind('s2', R2, 'max')
  h.turns.discarded(b, h.message(R2))
  assert.deepEqual(await h.status('s2', R2), { status: 'not-applied', reason: 'discarded', effort: 'max' })

  await h.bind('s2', R3, 'max')
  assert.equal((await h.call('withdraw', { sessionId: 's1', requestId: R3 })).status, 409)
  assert.equal((await h.call('withdraw', { sessionId: 's2', requestId: R3 })).status, 200)
  await h.claim(b, h.message(R3))
  assert.equal(b.effort, 'low')
  assert.equal((await h.status('s2', R3)).reason, 'withdrawn')

  t.mock.timers.enable({ apis: ['Date'], now: 0 })
  await h.bind('s2', ids[3], 'max')
  await h.bind('s2', ids[4], 'max')
  h.turns.inserted(b, h.message(ids[4]))
  t.mock.timers.tick(120_001)
  await h.claim(b, h.message(ids[3]))
  assert.equal(b.effort, 'low', 'an expired override never applies late')
  assert.equal((await h.status('s2', ids[3])).reason, 'expired')
  assert.equal((await h.status('s2', ids[4])).status, 'pending', 'an admitted, queued message keeps its override')
})

test('bind refuses malformed, stale, unsupported, duplicate and excess requests', async () => {
  const h = host()
  const a = h.agent('s1', 'low')
  h.agent('child', 'low', 'subagent')
  await h.turns.created(a)
  assert.equal((await h.bind('s1', 'not-a-uuid', 'max')).status, 400)
  assert.equal((await h.call('bind', { sessionId: 's1', requestId: R1, ...route })).status, 400)
  assert.equal((await h.bind('s1', R1, 'max', { extra: 'x' })).status, 400)
  assert.equal((await h.bind('child', R1, 'max')).status, 409)
  assert.equal((await h.bind('s1', R1, 'max', { model: 'other' })).status, 409)
  assert.equal((await h.bind('s1', R1, 'turbo')).status, 422)
  assert.equal((await h.bind('s1', R1, 'max')).status, 200)
  assert.equal((await h.bind('s1', R1, 'max')).status, 409)
  // A session that is not resident is checked again when its message is claimed.
  for (let i = 1; i < 64; i++) assert.equal((await h.bind('cold', ids[i + 4], 'high')).status, 200)
  assert.equal((await h.bind('cold', ids[79], 'high')).status, 429)
})

test('session end and plugin dispose settle every binding and restore the session effort', async () => {
  const h = host()
  const a = h.agent('s1', 'low')
  const b = h.agent('s2', 'low')
  await h.turns.created(a)
  await h.bind('s1', R1, 'max')
  await h.bind('s2', R2, 'max')
  await h.claim(a, h.message(R1))
  h.turns.ended(b)
  assert.equal((await h.status('s2', R2)).reason, 'session-ended')
  await h.bind('s1', R3, 'high')
  h.turns.dispose()
  assert.equal(a.effort, 'low')
  assert.equal((await h.status('s1', R1)).status, 'finished')
  assert.equal((await h.status('s1', R3)).reason, 'disabled')
  assert.equal((await h.bind('s1', ids[5], 'high')).status, 409)
})

test('a failing session read never fails the claim', () => {
  const h = host()
  const broken = { id: 'x', session: { header: {} }, model: { current() { throw new Error('boom') } } }
  assert.doesNotThrow(() => h.turns.claimed(broken, h.message(R1), {}))
})

test('Adaptive mode maps each message to a declared effort for that message only', async () => {
  const h = host({ mode: 'adaptive' })
  const a = h.agent('s1', 'low')
  await h.turns.created(a)
  await h.claim(a, h.message(undefined, 'Design a distributed lock service and discuss the trade-offs'))
  assert.equal(a.effort, 'max')
  h.idle(a)
  assert.equal(a.effort, 'low')
  await h.claim(a, h.message(undefined, 'thanks'))
  assert.equal(a.effort, 'off')
  h.idle(a)
  // A retry keeps the tier of the message it repeats.
  await h.claim(a, h.message(undefined, 'Debug why this test fails on CI'))
  h.idle(a)
  await h.claim(a, h.message(undefined, '', 'retry'))
  assert.equal(a.effort, 'high')
  h.idle(a)
  const snapshot = h.stats.snapshot()
  assert.equal(snapshot.sources.adaptive, 4)
  assert.equal(snapshot.classifier.runs, 4)
})

test('a one-time override outranks Adaptive mode, and Adaptive serves the most demanding shared message', async () => {
  const h = host({ mode: 'adaptive' })
  const a = h.agent('s1', 'low')
  await h.turns.created(a)
  await h.bind('s1', R1, 'off')
  await h.claim(a, h.message(R1, 'Design a distributed lock service and discuss the trade-offs'))
  assert.equal(a.effort, 'off')
  h.idle(a)
  await h.claim(a, h.message(undefined, 'thanks'), h.message(undefined, 'Prove that this algorithm terminates'))
  assert.equal(a.effort, 'max')
  h.idle(a)
  assert.equal(a.effort, 'low')
})

test('a saved preference fills a session on the native default, below a manual choice', async () => {
  const preferences = [{ ...route, effort: 'high' }]
  const h = host({ preferences })
  const fresh = h.agent('s1', undefined)
  const manual = h.agent('s2', 'low')
  await h.turns.created(fresh)
  await h.claim(fresh, h.message(undefined))
  assert.equal(fresh.effort, 'high')
  await h.claim(manual, h.message(undefined))
  assert.equal(manual.effort, 'low')
  // An unsupported or ambiguous preference leaves the native default.
  h.config.preferences = [{ ...route, effort: 'turbo' }]
  const other = h.agent('s3', undefined)
  await h.claim(other, h.message(undefined))
  assert.equal(other.effort, undefined)
  const sources = h.stats.snapshot().sources
  assert.deepEqual([sources.saved, sources.manual, sources.default], [1, 1, 1])
})

test('subagent policies change only the child selection, within declared efforts', async () => {
  for (const [policy, extra, expected] of [
    ['inherit', {}, 'low'],
    ['default', {}, undefined],
    ['effort', { subagentEffort: 'max' }, 'max'],
    ['effort', { subagentEffort: 'turbo' }, 'low'],
    ['adaptive', {}, 'off'],
  ]) {
    const h = host({ subagents: policy, ...extra })
    const parent = h.agent('p', 'high')
    const child = h.agent('c', 'low', 'subagent')
    await h.turns.created(parent)
    h.turns.claimed(child, h.message(undefined, 'ok', 'parent'), {})
    assert.equal(child.effort, expected, policy)
    assert.equal(parent.effort, 'high')
    assert.equal(parent.selects.length, 0)
  }
  const h = host({ subagents: 'effort', subagentEffort: 'max' })
  const child = h.agent('c', 'low', 'subagent')
  h.turns.claimed(child, h.message(undefined, 'ok', 'parent'), {})
  assert.equal(child.effort, 'low', 'an unresolved route is left alone')
  assert.equal(h.stats.snapshot().subagents.notApplied['capability-unknown'], 1)
})

test('each committed request is counted under the effort its header logged', async () => {
  const h = host()
  const session = { id: 's1', header: {}, requestHeader: () => ({ config: { reasoningEffort: 'high' } }) }
  const child = { id: 'c1', header: { origin: 'subagent' }, requestHeader: () => ({ config: {} }) }
  h.turns.stream({ session }, { type: 'start', attemptId: 'a1' })
  h.turns.event(session, { type: 'assistant/message', seq: 7, data: { usage: { inputTokens: 5, outputTokens: 2 } } })
  h.turns.stream({ session }, { type: 'end', attemptId: 'a1', outcome: { kind: 'committed', eventType: 'assistant/message', seq: 7 } })
  h.turns.event(child, { type: 'assistant/message', seq: 1, data: {} })
  for (let i = 0; i < 32; i++) h.turns.event(session, { type: 'assistant/message', seq: 100 + i, data: {} })
  const { requests } = h.stats.snapshot()
  assert.equal(requests.session.high.timed, 1)
  assert.equal(requests.session.high.inputTokens, 5)
  assert.equal(requests.subagent.default.requests, 1, 'a commit without a stream end is still counted')
})
