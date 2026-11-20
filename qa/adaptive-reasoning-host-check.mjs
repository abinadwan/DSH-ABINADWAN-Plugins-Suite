// Native Adaptive Reasoning contract check against an extracted Harness runtime.
// It mounts the real Host plugin on the real Agent loop with a scripted offline
// adapter, so every effort assertion reads the request the loop actually built.
// All state is in memory; no provider, profile or network is touched.
//
// Run: ABINADWAN_TEST_RUNTIME=<extracted runtime> node --test qa/adaptive-reasoning-host-check.mjs
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import test from 'node:test'
import { pathToFileURL } from 'node:url'
import * as Reasoning from '../plugins/adaptive-reasoning/index.js'

const runtimeDirectory = process.env.ABINADWAN_TEST_RUNTIME
if (!runtimeDirectory) throw new Error('Set ABINADWAN_TEST_RUNTIME to the extractor output directory')
const require = createRequire(resolve(runtimeDirectory, 'package.json'))
const load = name => import(pathToFileURL(require.resolve(`@deepseek-ai/${name}`)).href)
const [
  { Context }, { default: Llm, LlmAdapter, LlmError, createUserMessage }, { default: Sessions, SessionId },
  { default: Projections }, { default: SystemPrompt }, { default: Tools, defineTool }, Executor,
  { default: Agents }, { default: Loop }, { HostConnectionService },
] = await Promise.all([
  load('cordis'), load('dsh-llm'), load('dsh-session'), load('dsh-session-projection'),
  load('dsh-system-prompt'), load('dsh-tools'), load('dsh-tool-executor-native'),
  load('dsh-agent'), load('dsh-agent-loop'), load('dsh-client-connection'),
])

const route = { provider: 'offline', model: 'synthetic-tiers' }
const EFFORTS = ['fast-v2', 'balanced-v2', 'deliberate-v2']
const ids = Array.from({ length: 40 }, (_, i) => `10000000-0000-4000-8000-${String(i).padStart(12, '0')}`)

/** Offline adapter that plays one scripted step per request and records each request the loop built. */
class ScriptAdapter extends LlmAdapter {
  requests = []
  script = []

  async resolveModel(provider, id) {
    return { provider, id, name: id, reasoning: { efforts: EFFORTS.map(effort => ({ id: effort, name: effort })), defaultEffort: 'fast-v2' } }
  }

  async *stream(request) {
    this.requests.push(request.reasoningEffort)
    const step = this.script.shift() ?? {}
    await step.before?.()
    if (step.fail) throw LlmError.fromFailure({ message: 'synthetic outage', code: 'SERVICE_UNAVAILABLE' })
    if (step.tool) {
      const block = { type: 'tool-call', id: `call-${this.requests.length}`, name: 'fixture_echo', arguments: '{}' }
      yield { type: 'block-start', index: 0, blockType: 'tool-call' }
      yield { type: 'tool-call-delta', index: 0, id: block.id, name: block.name, argumentsDelta: '{}' }
      yield { type: 'block-end', index: 0, block }
      yield { type: 'usage', usage: { inputTokens: 10, outputTokens: 3 } }
      yield { type: 'finish', reason: { kind: 'tool-calls' } }
      return
    }
    yield { type: 'block-start', index: 0, blockType: 'text' }
    yield { type: 'text-delta', index: 0, text: 'Synthetic response' }
    yield { type: 'block-end', index: 0, block: { type: 'text', text: 'Synthetic response' } }
    yield { type: 'usage', usage: { inputTokens: 10, outputTokens: 2 } }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
}

async function host(t, record = {}) {
  const ctx = new Context()
  t.after(() => ctx.fiber.dispose())
  for (const plugin of [Llm, Sessions, Projections, SystemPrompt, Tools, Executor, Agents]) await ctx.plugin(plugin).await()
  await ctx.plugin(Loop, { agents: [] }).await()
  const adapter = new ScriptAdapter()
  ctx.llm.registerAdapter(['offline'], adapter)
  ctx.tools.register(defineTool({
    name: 'fixture_echo', description: 'Fictional tool that returns a constant', parameters: {},
    output: { schema: { type: 'string' }, render: (_, value) => [{ type: 'text', text: value }] },
    async execute() { return 'synthetic tool result' },
  }))
  ctx.on('agent/request-error', async () => ({ kind: 'retry' }))
  await ctx.plugin({ name: 'fixture-connection', apply(child) { new HostConnectionService(child, [], {}) } }).await()
  const feature = ctx.plugin(Reasoning, { record: { preferences: [], mode: 'manual', subagents: 'inherit', ...record } })
  await feature.await()
  const transport = ctx.connection.createSharedFetchHandler('/api')
  const call = async (path, body, peer = ctx.connection.browserPeer) => {
    const response = await transport.fetch(new Request(`http://localhost/api/abinadwan-reasoning/${path}`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    }), peer)
    return { status: response.status, body: response.headers.get('content-type')?.includes('json') ? await response.json() : undefined }
  }
  const bind = (agent, requestId, reasoningEffort, extra = {}) =>
    call('next', { sessionId: agent.id, requestId, ...route, reasoningEffort, ...extra })
  const status = (agent, requestId) => call('next/status', { sessionId: agent.id, requestId }).then(r => r.body)
  const create = async (name, effort = 'fast-v2') => {
    const agent = await ctx.agentLoop.create(SessionId(name), route)
    if (effort) agent.model.select({ ...route, reasoningEffort: effort })
    return agent
  }
  return { ctx, adapter, feature, call, bind, status, create }
}

const prompt = (rpcId, text = 'Fictional fixture prompt') =>
  createUserMessage({ content: [{ type: 'text', text }], source: { kind: 'user', ...rpcId ? { rpcId } : {} } })

test('routes admit only the owner and validate the exact requestId binding', async t => {
  const h = await host(t)
  const a = await h.create('ar-routes')
  assert.equal(a.id, a.session.id, 'the Agent id is the session id the composer knows')
  assert.equal((await h.call('next', { sessionId: a.id, requestId: ids[0], ...route, reasoningEffort: 'deliberate-v2' },
    { principal: { kind: 'viewer' } })).status, 403)
  assert.equal((await h.bind(a, 'not-a-uuid', 'deliberate-v2')).status, 400)
  assert.equal((await h.bind(a, ids[0], 'guessed-high')).status, 422)
  assert.equal((await h.bind(a, ids[0], 'deliberate-v2', { model: 'other' })).status, 409)
  assert.equal((await h.bind(a, ids[0], 'deliberate-v2')).status, 200)
  assert.equal((await h.bind(a, ids[0], 'deliberate-v2')).status, 409)
  assert.deepEqual(await h.status(a, ids[0]), { status: 'pending', effort: 'deliberate-v2' })
  assert.equal((await h.call('stats', {})).status, 200)
  assert.equal((await h.call('stats', { extra: 'x' })).status, 400)
  await h.feature.dispose()
  assert.equal((await h.bind(a, ids[1], 'deliberate-v2')).status, 404, 'disabling the plugin removes its routes')
  assert.equal(a.model.current().reasoningEffort, 'fast-v2')
})

test('a bound override reaches only its own queued message, across tool steps and retries', async t => {
  const h = await host(t)
  const a = await h.create('ar-queue')
  await h.bind(a, ids[1], 'deliberate-v2')
  // Another window's prompt is queued first; the bound one runs a tool step and survives a request retry.
  h.adapter.script.push({}, { tool: true }, { fail: true }, {}, {})
  a.followup(prompt(ids[0]))
  a.followup(prompt(ids[1]))
  a.followup(prompt(ids[2]))
  await a.whenIdle()
  assert.deepEqual(h.adapter.requests, ['fast-v2', 'deliberate-v2', 'deliberate-v2', 'deliberate-v2', 'fast-v2'])
  assert.deepEqual(await h.status(a, ids[1]), { status: 'finished', effort: 'deliberate-v2', restored: true })
  assert.equal(a.model.current().reasoningEffort, 'fast-v2')
  // A regeneration carries its own requestId and binds afresh; a stale id cannot be reused.
  assert.equal((await h.bind(a, ids[1], 'balanced-v2')).status, 409)
  await h.bind(a, ids[3], 'balanced-v2')
  a.followup(createUserMessage({ content: [], source: { kind: 'retry', rpcId: ids[3] } }))
  await a.whenIdle()
  assert.equal(h.adapter.requests.at(-1), 'balanced-v2')
  assert.equal(a.model.current().reasoningEffort, 'fast-v2')
})

test('a manual change mid-turn wins, steering takes its own effort, and cancel restores', async t => {
  const h = await host(t)
  const a = await h.create('ar-manual')
  await h.bind(a, ids[4], 'deliberate-v2')
  h.adapter.script.push({ before: () => a.model.select({ ...route, reasoningEffort: 'balanced-v2' }) })
  a.followup(prompt(ids[4]))
  await a.whenIdle()
  assert.equal(a.model.current().reasoningEffort, 'balanced-v2')
  assert.deepEqual(await h.status(a, ids[4]), { status: 'finished', effort: 'deliberate-v2', restored: false })

  // Steering joins the running turn at its next step and brings its own binding.
  a.model.select({ ...route, reasoningEffort: 'fast-v2' })
  await h.bind(a, ids[5], 'deliberate-v2')
  h.adapter.script.push({ tool: true, before: () => a.steer(prompt(ids[5])) }, {})
  const before = h.adapter.requests.length
  a.followup(prompt())
  await a.whenIdle()
  assert.deepEqual(h.adapter.requests.slice(before), ['fast-v2', 'deliberate-v2'])
  assert.equal(a.model.current().reasoningEffort, 'fast-v2')

  // Cancelling discards the queued bound prompt, and the running override is restored.
  let release
  const gate = new Promise(resolve => { release = resolve })
  await h.bind(a, ids[6], 'deliberate-v2')
  await h.bind(a, ids[7], 'balanced-v2')
  h.adapter.script.push({ before: () => gate })
  a.followup(prompt(ids[6]))
  await new Promise(resolve => setImmediate(resolve))
  a.followup(prompt(ids[7]))
  assert.equal(a.model.current().reasoningEffort, 'deliberate-v2')
  a.cancel({ kind: 'user' })
  release()
  await a.whenIdle()
  assert.equal(a.model.current().reasoningEffort, 'fast-v2')
  assert.equal((await h.status(a, ids[6])).status, 'finished')
  assert.deepEqual(await h.status(a, ids[7]), { status: 'not-applied', reason: 'discarded', effort: 'balanced-v2' })

  // A withdrawn binding never applies, and a route change before the claim is reported.
  await h.bind(a, ids[8], 'deliberate-v2')
  assert.equal((await h.call('next/withdraw', { sessionId: a.id, requestId: ids[8] })).status, 200)
  await h.bind(a, ids[9], 'deliberate-v2')
  a.model.select({ provider: 'offline', model: 'synthetic-other', reasoningEffort: 'fast-v2' })
  a.followup(prompt(ids[8]))
  await a.whenIdle()
  a.followup(prompt(ids[9]))
  await a.whenIdle()
  assert.deepEqual(h.adapter.requests.slice(-2), ['fast-v2', 'fast-v2'])
  assert.equal((await h.status(a, ids[8])).reason, 'withdrawn')
  assert.equal((await h.status(a, ids[9])).reason, 'route-changed')
})

test('disabling the plugin mid-turn restores the session effort and reports pending overrides', async t => {
  const h = await host(t)
  const a = await h.create('ar-dispose')
  await h.bind(a, ids[10], 'deliberate-v2')
  h.adapter.script.push({ before: () => h.feature.dispose() })
  a.followup(prompt(ids[10]))
  await a.whenIdle()
  assert.deepEqual(h.adapter.requests, ['deliberate-v2'], 'the captured request keeps its effort')
  assert.equal(a.model.current().reasoningEffort, 'fast-v2')
  a.followup(prompt())
  await a.whenIdle()
  assert.equal(h.adapter.requests.at(-1), 'fast-v2')
})

test('Adaptive mode maps local tiers onto declared efforts per message, below a one-time override', async t => {
  const h = await host(t, { mode: 'adaptive' })
  const a = await h.create('ar-adaptive')
  for (const text of ['thanks', 'Explain closures in JavaScript with an example.',
    'Design a distributed lock service and discuss the consistency trade-offs.']) {
    a.followup(prompt(undefined, text))
    await a.whenIdle()
    assert.equal(a.model.current().reasoningEffort, 'fast-v2', 'the session effort returns after each message')
  }
  assert.deepEqual(h.adapter.requests, ['fast-v2', 'balanced-v2', 'deliberate-v2'])
  await h.bind(a, ids[11], 'fast-v2')
  a.followup(prompt(ids[11], 'Prove that this distributed consensus protocol is safe.'))
  await a.whenIdle()
  assert.equal(h.adapter.requests.at(-1), 'fast-v2')
  const { body } = await h.call('stats', {})
  assert.equal(body.sources.adaptive, 3)
  assert.equal(body.sources.override, 1)
  assert.equal(body.classifier.runs, 3)
})

test('a saved preference fills a session on the native default; a manual effort outranks it', async t => {
  const h = await host(t, { preferences: [{ ...route, effort: 'balanced-v2' }] })
  const fresh = await h.create('ar-saved', null)
  await h.ctx.llm.resolveModelInfo(route.provider, route.model)
  fresh.followup(prompt())
  await fresh.whenIdle()
  const manual = await h.create('ar-manual-wins', 'deliberate-v2')
  manual.followup(prompt())
  await manual.whenIdle()
  assert.deepEqual(h.adapter.requests, ['balanced-v2', 'deliberate-v2'])
  assert.equal(fresh.model.current().reasoningEffort, undefined, 'the session record stays on the native default')
})

test('subagent policy changes only the in-process child request, never the parent', async t => {
  const h = await host(t, { subagents: 'effort', subagentEffort: 'deliberate-v2' })
  const parent = await h.create('ar-parent')
  const { agent: child } = await h.ctx.agents.create({
    sessionId: SessionId('ar-child'),
    meta: { origin: 'subagent', parentSession: parent.id, delegationDepth: 1 },
    agentOptions: { ...route, reasoningEffort: 'fast-v2' },
  })
  assert.equal((await h.bind(child, ids[12], 'balanced-v2')).status, 409, 'a subagent session cannot bind a root override')
  child.followup(prompt(undefined, 'Fictional delegated task'))
  await child.whenIdle()
  parent.followup(prompt())
  await parent.whenIdle()
  assert.deepEqual(h.adapter.requests, ['deliberate-v2', 'fast-v2'])
  assert.equal(parent.model.current().reasoningEffort, 'fast-v2')
  const { body } = await h.call('stats', {})
  assert.equal(body.subagents.applied, 1)
  assert.equal(body.requests.subagent['deliberate-v2'].requests, 1)
  assert.equal(body.requests.session['fast-v2'].requests, 1)
})

test('statistics count committed requests by logged effort with Host timing and no content', async t => {
  const h = await host(t)
  const a = await h.create('ar-stats')
  await h.bind(a, ids[13], 'deliberate-v2')
  h.adapter.script.push({ tool: true }, {})
  a.followup(prompt(ids[13], 'Secret fixture words that must never be counted'))
  await a.whenIdle()
  a.followup(prompt())
  await a.whenIdle()
  const { body } = await h.call('stats', {})
  const deliberate = body.requests.session['deliberate-v2']
  assert.equal(deliberate.requests, 2)
  assert.equal(deliberate.inputTokens, 20)
  assert.equal(deliberate.outputTokens, 5)
  assert.equal(deliberate.timed, 2, 'each committed request was timed from its stream start')
  assert.equal(deliberate.reasoningReported, 0, 'no reasoning count is invented when the adapter reports none')
  assert.equal(body.requests.session['fast-v2'].requests, 1)
  assert.equal(body.overrides.applied, 1)
  assert.doesNotMatch(JSON.stringify(body), /Secret|fixture|ar-stats/)
  const reset = await h.call('stats/reset', {})
  assert.equal(reset.body.messages, 0)
  assert.deepEqual(reset.body.requests, { session: {}, subagent: {} })
})
