// Native Adaptive Reasoning contract check against an extracted Harness runtime.
// It mounts the real Host plugin on the real Agent loop with a scripted offline
// adapter, so every effort assertion reads the request the loop actually built.
// All state is in memory; no provider, profile or network is touched.
//
// Run: ABINADWAN_TEST_RUNTIME=<extracted runtime> node --test qa/adaptive-reasoning-host-check.mjs
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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
  efforts = EFFORTS
  beforeResolve

  async resolveModel(provider, id) {
    const efforts = this.efforts
    await this.beforeResolve?.()
    return { provider, id, name: id, reasoning: { efforts: efforts.map(effort => ({ id: effort, name: effort })), defaultEffort: 'fast-v2' } }
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

async function host(t, record = {}, profileDir) {
  const ctx = new Context()
  if (profileDir) ctx.provide('profileContext', { dir: profileDir })
  t.after(() => ctx.fiber.dispose())
  for (const plugin of [Llm, Sessions, Projections, SystemPrompt, Tools, Executor, Agents]) await ctx.plugin(plugin).await()
  await ctx.plugin(Loop, { agents: [] }).await()
  const adapter = new ScriptAdapter()
  const registration = ctx.llm.registerAdapter(['offline'], adapter)
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
  const create = async (name, effort = 'fast-v2') => {
    const agent = await ctx.agentLoop.create(SessionId(name), route)
    if (effort) agent.model.select({ ...route, reasoningEffort: effort })
    return agent
  }
  return { ctx, adapter, registration, feature, call, bind, create }
}

const prompt = (rpcId, text = 'Fictional fixture prompt') =>
  createUserMessage({ content: [{ type: 'text', text }], source: { kind: 'user', ...rpcId ? { rpcId } : {} } })

test('only an owner can query unsupported one-message effort controls', async t => {
  const h = await host(t)
  const a = await h.create('ar-disabled-route')
  const params = { sessionId: a.id, requestId: ids[0], ...route, reasoningEffort: 'deliberate-v2' }
  assert.equal((await h.call('next', params, { principal: { kind: 'viewer' } })).status, 403)
  assert.equal((await h.bind(a, 'not-a-uuid', 'deliberate-v2')).status, 400)
  const unavailable = { status: 501, body: { error: 'request-local-effort-unavailable' } }
  assert.deepEqual(await h.bind(a, ids[0], 'deliberate-v2'), unavailable)
  assert.deepEqual(await h.call('next/status', { sessionId: a.id, requestId: ids[0] }), unavailable)
  assert.deepEqual(await h.call('next/withdraw', { sessionId: a.id, requestId: ids[0] }), unavailable)
  await h.feature.dispose()
  assert.equal((await h.bind(a, ids[0], 'deliberate-v2')).status, 404)
})

test('late and stale bindings cannot affect steered messages sharing a request', async t => {
  const h = await host(t, { mode: 'adaptive', preferences: [{ ...route, effort: 'deliberate-v2' }] })
  const a = await h.create('ar-shared')
  const original = a.model.current()
  const events = []
  h.ctx.on('session/event', (session, event) => { if (session === a.session) events.push(event) })
  await h.bind(a, ids[1], 'deliberate-v2')
  const advance = () => {
    a.steer(prompt(ids[1], 'Prove that this distributed consensus protocol is safe.'))
    a.steer(prompt(ids[2], 'Thanks.'))
  }
  h.adapter.script.push({ tool: true, before: advance }, { fail: true }, {})
  a.followup(prompt(ids[0]))
  await a.whenIdle()
  assert.equal((await h.bind(a, ids[1], 'deliberate-v2')).status, 501)
  assert.equal((await h.bind(a, ids[2], 'deliberate-v2', { model: 'stale-model' })).status, 501)
  assert.deepEqual(h.adapter.requests, ['fast-v2', 'fast-v2', 'fast-v2'])
  assert.deepEqual(a.model.current(), original)
  assert.equal(events.filter(event => event.type === 'model/selection').length, 0)
  assert.deepEqual(events.filter(event => event.type === 'request/header').map(event => event.data.header.config.reasoningEffort),
    ['fast-v2'])
  const { body } = await h.call('stats', {})
  assert.equal(body.messages, 3)
  assert.equal(body.sources.manual, 3)
  assert.equal(body.sources.override, 0)
  assert.equal(body.sources.adaptive, 0)
  assert.equal(body.overrides.applied, 0)
  assert.equal(body.requests.session['fast-v2'].requests, 2)
})

test('a native default stays native with legacy automatic policy and saved records', async t => {
  const h = await host(t, { mode: 'adaptive', preferences: [{ ...route, effort: 'deliberate-v2' }] })
  const a = await h.create('ar-native-default', null)
  a.followup(prompt(ids[0], 'Prove that this distributed consensus protocol is safe.'))
  await a.whenIdle()
  assert.deepEqual(h.adapter.requests, ['fast-v2'])
  assert.equal(a.model.current().reasoningEffort, undefined)
  assert.equal(a.session.requestHeader().adapterDefaults.reasoningEffort, true)
  assert.equal((await h.call('stats', {})).body.sources.default, 1)
})

test('explicit manual and Apply actions validate against the current adapter on the exact route', async t => {
  const h = await host(t, { preferences: [{ ...route, effort: 'balanced-v2' }] })
  const a = await h.create('ar-manual')
  const set = (reasoningEffort, manual = false) =>
    h.call('effort', { sessionId: a.id, ...route, reasoningEffort, ...manual ? { mode: 'manual' } : {} })
  assert.equal((await set('deliberate-v2')).status, 409, 'Apply must match the saved preference')
  assert.equal((await set('balanced-v2')).status, 200)
  assert.equal((await set('fast-v2', true)).status, 200)
  h.adapter.efforts = ['fast-v2', 'deliberate-v2']
  assert.equal((await set('balanced-v2')).status, 422, 'the route no longer advertises the saved effort')
  assert.equal(a.model.current().reasoningEffort, 'fast-v2')
  assert.equal((await set('deliberate-v2', true)).status, 200)
  a.followup(prompt(ids[0]))
  await a.whenIdle()
  assert.deepEqual(h.adapter.requests, ['deliberate-v2'])
  assert.equal(a.model.current().reasoningEffort, 'deliberate-v2')
  assert.equal(a.session.requestHeader().config.reasoningEffort, 'deliberate-v2')
})

test('a durable manual write is rejected if the adapter registry changes during validation', async t => {
  const h = await host(t)
  const a = await h.create('ar-generation')
  let validating
  const started = new Promise(resolve => { validating = resolve })
  let release
  const paused = new Promise(resolve => { release = resolve })
  h.adapter.beforeResolve = () => { validating(); return paused }
  const pending = h.call('effort', { sessionId: a.id, ...route, reasoningEffort: 'deliberate-v2', mode: 'manual' })
  await started
  h.adapter.efforts = ['fast-v2']
  h.registration.replace(['offline'])
  release()
  assert.deepEqual(await pending, { status: 409, body: { error: 'capability-changed' } })
  assert.equal(a.model.current().reasoningEffort, 'fast-v2')
})

test('legacy subagent policies are inert for native children and manual routes refuse a child', async t => {
  const h = await host(t, { subagents: 'effort', subagentEffort: 'deliberate-v2' })
  const parent = await h.create('ar-parent', 'balanced-v2')
  const { agent: child } = await h.ctx.agents.create({
    sessionId: SessionId('ar-child'),
    meta: { origin: 'subagent', parentSession: parent.id, delegationDepth: 1 },
    agentOptions: { ...route, reasoningEffort: 'balanced-v2' },
  })
  const selection = { sessionId: child.id, ...route, reasoningEffort: 'deliberate-v2', mode: 'manual' }
  assert.equal((await h.call('effort', selection)).status, 409)
  assert.equal((await h.bind(child, ids[0], 'deliberate-v2')).status, 501)
  child.followup(prompt(ids[0], 'Fictional delegated task'))
  await child.whenIdle()
  parent.followup(prompt(ids[1]))
  await parent.whenIdle()
  assert.deepEqual(h.adapter.requests, ['balanced-v2', 'balanced-v2'])
  assert.equal(child.model.current().reasoningEffort, 'balanced-v2')
  assert.equal(parent.model.current().reasoningEffort, 'balanced-v2')
  const { body } = await h.call('stats', {})
  assert.equal(body.subagents.applied, 0)
  assert.equal(body.messages, 1, 'child messages are not counted as root messages')
  assert.equal(body.requests.subagent['balanced-v2'].requests, 1)
  assert.equal(body.requests.session['balanced-v2'].requests, 1)
})

test('statistics count committed requests by logged effort with Host timing and no content', async t => {
  const h = await host(t)
  const a = await h.create('ar-stats', 'deliberate-v2')
  h.adapter.script.push({ tool: true }, {})
  a.followup(prompt(ids[0], 'Secret fixture words that must never be counted'))
  await a.whenIdle()
  a.model.select({ ...route, reasoningEffort: 'fast-v2' })
  a.followup(prompt())
  await a.whenIdle()
  const { body } = await h.call('stats', {})
  const deliberate = body.requests.session['deliberate-v2']
  assert.equal(deliberate.requests, 2)
  assert.equal(deliberate.inputTokens, 20)
  assert.equal(deliberate.outputTokens, 5)
  assert.equal(deliberate.timed, 2)
  assert.equal(deliberate.reasoningReported, 0)
  assert.equal(body.requests.session['fast-v2'].requests, 1)
  assert.doesNotMatch(JSON.stringify(body), /Secret|fixture|ar-stats/)
  const reset = await h.call('stats/reset', {})
  assert.equal(reset.body.messages, 0)
  assert.deepEqual(reset.body.requests, { session: {}, subagent: {} })
})

test('recommendations use the exact adapter and preserve manual effort or provider defaults', async t => {
  const h = await host(t, { mode: 'adaptive' })
  const native = await h.create('recommend-default', null)
  const explicit = await h.create('recommend-explicit', 'balanced-v2')
  const sample = 'Audit the security and describe trade-offs for the distributed migration plan.'
  const recommendation = sessionId => h.call('recommend', { sessionId, ...route, sample })
  const result = await recommendation(native.id)
  assert.equal(result.status, 200)
  assert.equal(result.body.recommendation, 'deliberate-v2')
  assert.equal(result.body.source, 'classifier')
  assert.equal((await recommendation(explicit.id)).body.recommendation, 'balanced-v2')
  assert.equal((await recommendation(explicit.id)).body.source, 'manual')
  assert.doesNotMatch(JSON.stringify(result), /distributed migration/)
  h.adapter.efforts = []
  assert.equal((await recommendation(native.id)).status, 422)
  assert.equal(native.model.current().reasoningEffort, undefined)
  assert.equal(explicit.model.current().reasoningEffort, 'balanced-v2')
  assert.deepEqual(h.adapter.requests, [])
})

test('profile aggregate persists across native Host instances, and reset preserves v1 preferences', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-ar-native-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  const record = { preferences: [{ ...route, effort: 'balanced-v2' }], mode: 'manual' }
  const previous = await host(t, record, dir)
  const a = await previous.create('persistent-fixture', 'balanced-v2')
  a.followup(prompt(ids[0]))
  await a.whenIdle()
  await previous.feature.dispose()
  const current = await host(t, record, dir)
  const { body, status } = await current.call('stats', {})
  assert.equal(status, 200)
  assert.equal(body.persistent, true)
  assert.equal(body.messages, 1)
  assert.equal(body.routes[0].provider, route.provider)
  assert.equal(body.routes[0].model, route.model)
  assert.equal(body.requests.session['balanced-v2'].requests, 1)
  assert.equal((await current.call('stats/reset', {})).body.messages, 0)
  const b = await current.create('next-fixture', 'fast-v2')
  const result = await current.call('effort', { sessionId: b.id, ...route, reasoningEffort: 'balanced-v2' })
  assert.equal(result.status, 200, 'reset does not touch existing settings')
})
