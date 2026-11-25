// Windows Desktop contract characterization. All state belongs to this synthetic fixture.
import assert from 'node:assert/strict'
import { lstat, mkdir, mkdtemp, readFile, realpath, rm, symlink, unlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { performance } from 'node:perf_hooks'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'
import * as Reasoning from '../plugins/adaptive-reasoning/index.js'
import * as Lifecycle from '../plugins/conversation-lifecycle/index.js'

const runtimeDirectory = process.env.ABINADWAN_TEST_RUNTIME
if (!runtimeDirectory) throw new Error('Set ABINADWAN_TEST_RUNTIME to the extractor output directory')
const require = createRequire(resolve(runtimeDirectory, 'package.json'))
const load = name => import(pathToFileURL(require.resolve(`@deepseek-ai/${name}`)).href)
const dependencies = await Promise.all([
  load('cordis'), load('dsh-llm'), load('dsh-session'), load('dsh-session-projection'),
  load('dsh-system-prompt'), load('dsh-tools'), load('dsh-tool-executor-native'),
  load('dsh-agent'), load('dsh-agent-loop'), load('dsh-session-persistence-jsonl'),
  load('dsh-storage'), load('dsh-storage-json'), load('dsh-storage-domain'), load('dsh-workspace'),
  load('dsh-session-query-sqlite'),
  load('dsh-client-connection'),
  load('dsh-agent-preset-registry'), load('cordis-plugin-loader'),
  load('dsh-settings'), load('dsh-app-boot'), load('dsh-config-editor'),
])
const [
  { Context }, { default: Llm, LlmAdapter, createUserMessage }, { default: Sessions, SessionId, SESSION_FORMAT_VERSION },
  { default: Projections }, { default: SystemPrompt }, { default: Tools, defineTool }, Executor,
  { default: Agents }, { default: Loop }, Jsonl, { default: Storage }, Json, Domain,
  { default: Workspace }, { default: SessionQuery },
  { HostConnectionService },
  { default: AgentPresets }, { default: Loader },
  { default: Settings }, Boot, { default: ConfigEditor },
] = dependencies
const { z } = require('zod')
const repository = fileURLToPath(new URL('../', import.meta.url))

async function scratch(t) {
  const parent = join(await realpath(repository), 'node_modules')
  const stat = await lstat(parent)
  assert.ok(stat.isDirectory() && !stat.isSymbolicLink())
  assert.equal(await realpath(parent), parent)
  const directory = await mkdtemp(join(parent, '.new-plugins-synthetic-'))
  const name = relative(parent, directory)
  assert.match(name, /^\.new-plugins-synthetic-[A-Za-z0-9]+$/)
  t.after(async () => {
    const target = await realpath(directory)
    assert.equal(dirname(target), parent)
    assert.equal(relative(parent, target), name)
    await rm(target, { recursive: true, force: true })
  })
  return directory
}

function checkFixtureLogPath(root, target) {
  const local = relative(root, target)
  assert.ok(!isAbsolute(local) && local !== '..' && !local.startsWith(`..${sep}`),
    'the canonical log must be strictly inside the synthetic sessions root')
  assert.match(local, /^[^\\/]+[\\/]synthetic-offline-log[\\/]session\.v4\.jsonl$/)
}

async function mount(ctx, plugin, config) {
  await ctx.plugin(plugin, config).await()
}

class OfflineAdapter extends LlmAdapter {
  requests = []

  async resolveModel(provider, id) {
    const reasoning = id === 'synthetic-reasoning' ? {
      efforts: [{ id: 'fast-v2', name: 'Fast' }, { id: 'deliberate-v2', name: 'Deliberate' }],
      defaultEffort: 'fast-v2',
    } : undefined
    return { provider, id, name: id, reasoning }
  }

  async *stream(request) {
    this.requests.push(request)
    yield { type: 'block-start', index: 0, blockType: 'text' }
    yield { type: 'text-delta', index: 0, text: 'Synthetic response' }
    yield { type: 'block-end', index: 0, block: { type: 'text', text: 'Synthetic response' } }
    yield { type: 'usage', usage: { inputTokens: 10, outputTokens: 2 } }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
}

async function loopHost(persistenceRoot) {
  const ctx = new Context()
  try {
    for (const plugin of [Llm, Sessions, Projections, SystemPrompt, Tools, Executor, Agents]) {
      await mount(ctx, plugin)
    }
    if (persistenceRoot) await mount(ctx, Jsonl, { root: persistenceRoot, compression: 'none' })
    await mount(ctx, Loop, { agents: [] })
    const adapter = new OfflineAdapter()
    ctx.llm.registerAdapter(['offline'], adapter)
    return { ctx, adapter }
  } catch (error) {
    await ctx.fiber.dispose()
    throw error
  }
}

async function send(agent) {
  const start = performance.now()
  agent.followup(createUserMessage({ content: [{ type: 'text', text: 'Fictional fixture prompt' }], source: { kind: 'user' } }))
  await agent.whenIdle()
  return Number((performance.now() - start).toFixed(2))
}

const route = { provider: 'offline', model: 'synthetic-reasoning' }

test('native selections reach the offline adapter and stay local to each session', async t => {
  const root = join(await scratch(t), 'reasoning-sessions')
  const { ctx, adapter } = await loopHost(root)
  const firstId = SessionId('synthetic-reasoning-a')
  const secondId = SessionId('synthetic-reasoning-b')
  try {
    const a = await ctx.agentLoop.create(firstId, route)
    const b = await ctx.agentLoop.create(secondId, route)
    const capability = await ctx.llm.resolveModelInfo(route.provider, route.model)
    assert.deepEqual(capability.reasoning.efforts.map(effort => effort.id), ['fast-v2', 'deliberate-v2'])
    await mount(ctx, { name: 'fixture-connection', apply(child) { new HostConnectionService(child, [], {}) } })
    const feature = ctx.plugin(Reasoning, { record: { preferences: [{ ...route, effort: 'deliberate-v2' }] } })
    await feature.await()
    const connection = ctx.connection
    const endpoint = 'http://localhost/api/abinadwan-reasoning/effort'
    const request = (reasoningEffort = 'deliberate-v2', model = route.model) => new Request(endpoint, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId: a.id, ...route, model, reasoningEffort }),
    })
    const manual = (reasoningEffort = 'deliberate-v2', model = route.model) => new Request(endpoint, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId: b.id, ...route, model, reasoningEffort, mode: 'manual' }),
    })
    const transport = connection.createSharedFetchHandler('/api')
    assert.equal((await transport.fetch(request(), { principal: { kind: 'viewer' } })).status, 403)
    assert.equal((await transport.fetch(request('invented'), connection.browserPeer)).status, 422)
    assert.equal((await transport.fetch(request('deliberate-v2', 'different-model'), connection.browserPeer)).status, 409)
    const applied = await transport.fetch(request(), connection.browserPeer)
    assert.equal(applied.status, 200)
    assert.deepEqual((await applied.json()).selected, { ...route, reasoningEffort: 'deliberate-v2' })
    const selectionSequence = a.session.seq
    a.model.select({ ...route, reasoningEffort: 'deliberate-v2' })
    assert.equal(a.session.seq, selectionSequence, 'reselecting the same tuple leaves no new user-intent record')
    const selectedMs = await send(a)
    // Session b stays on the native default until the owner explicitly applies a preference.
    const defaultMs = await send(b)
    assert.deepEqual(adapter.requests.map(request => request.reasoningEffort), ['deliberate-v2', 'fast-v2'])
    assert.equal(b.model.current().reasoningEffort, undefined)
    assert.equal(a.session.requestHeader().config.reasoningEffort, 'deliberate-v2')
    await assert.rejects(ctx.llm.resolveCallConfig({ ...route, reasoningEffort: 'guessed-high' }),
      { code: 'UNSUPPORTED_REASONING_EFFORT' })
    await assert.rejects(ctx.llm.resolveCallConfig({ ...route, model: 'synthetic-plain', reasoningEffort: 'deliberate-v2' }),
      { code: 'UNSUPPORTED_REASONING_EFFORT' })
    assert.equal(adapter.requests.length, 2)
    await feature.update({ record: { preferences: [] } })
    assert.equal((await transport.fetch(request(), connection.browserPeer)).status, 409,
      'a stale composer cannot apply a removed preference')
    assert.equal((await transport.fetch(manual(), { principal: { kind: 'viewer' } })).status, 403)
    assert.equal((await transport.fetch(manual('invented'), connection.browserPeer)).status, 422)
    assert.equal((await transport.fetch(manual('deliberate-v2', 'different-model'), connection.browserPeer)).status, 409)
    assert.equal((await transport.fetch(manual(), connection.browserPeer)).status, 200,
      'manual choice does not require a saved preference')
    await send(b)
    assert.equal(adapter.requests.at(-1).reasoningEffort, 'deliberate-v2')
    assert.equal((await transport.fetch(manual('fast-v2'), connection.browserPeer)).status, 200)
    await feature.dispose()
    assert.equal((await transport.fetch(request(), connection.browserPeer)).status, 404)
    await ctx.sessions.flush(a.session)
    await ctx.sessions.flush(b.session)
    t.diagnostic(`Offline smoke timings in ms: explicit ${selectedMs}, provider default ${defaultMs}. No provider timing inference.`)
  } finally {
    await ctx.fiber.dispose()
  }

  const restarted = await loopHost(root)
  try {
    for (const resumeSessionId of [firstId, secondId]) {
      const { agent } = await restarted.ctx.agents.resume({ resumeSessionId, agentOptions: route })
      await send(agent)
    }
    assert.deepEqual(restarted.adapter.requests.map(request => request.reasoningEffort), ['deliberate-v2', 'fast-v2'])
  } finally {
    await restarted.ctx.fiber.dispose()
  }
})

test('a pre-step effort change applies only after the loop has captured its current request', async () => {
  const { ctx, adapter } = await loopHost()
  try {
    const agent = await ctx.agentLoop.create(SessionId('synthetic-capture'), route)
    agent.ctx.on('agent/pre-step', async (_event, next) => {
      agent.model.select({ ...route, reasoningEffort: 'deliberate-v2' })
      return next()
    })
    await send(agent)
    await send(agent)
    assert.deepEqual(adapter.requests.map(request => request.reasoningEffort), ['fast-v2', 'deliberate-v2'])
  } finally {
    await ctx.fiber.dispose()
  }
})

test('a refused one-time effort leaves the native default in the durable log and after reload', async t => {
  const root = join(await scratch(t), 'blocked-reasoning-sessions')
  const sessionId = SessionId('synthetic-request-local-gate')
  const { ctx, adapter } = await loopHost(root)
  try {
    const agent = await ctx.agentLoop.create(sessionId, route)
    await mount(ctx, { name: 'fixture-connection', apply(child) { new HostConnectionService(child, [], {}) } })
    await mount(ctx, Reasoning, { record: { mode: 'adaptive', preferences: [{ ...route, effort: 'deliberate-v2' }] } })
    const transport = ctx.connection.createSharedFetchHandler('/api')
    const requestId = '10000000-0000-4000-8000-000000000001'
    const refused = await transport.fetch(new Request('http://localhost/api/abinadwan-reasoning/next', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId, requestId, ...route, reasoningEffort: 'deliberate-v2' }),
    }), ctx.connection.browserPeer)
    assert.equal(refused.status, 501)
    const selections = []
    ctx.on('session/event', (session, event) => {
      if (session === agent.session && event.type === 'model/selection') selections.push(event.data)
    })
    agent.followup(createUserMessage({ content: [{ type: 'text', text: 'Prove that this distributed protocol is correct.' }],
      source: { kind: 'user', rpcId: requestId } }))
    await agent.whenIdle()
    assert.deepEqual(adapter.requests.map(request => request.reasoningEffort), ['fast-v2'])
    assert.deepEqual(selections, [])
    assert.equal(agent.session.requestHeader().adapterDefaults.reasoningEffort, true)
    await ctx.sessions.flush(agent.session)
  } finally {
    await ctx.fiber.dispose()
  }

  const restarted = await loopHost(root)
  try {
    const { agent } = await restarted.ctx.agents.resume({ resumeSessionId: sessionId, agentOptions: route })
    assert.equal(agent.model.current().reasoningEffort, undefined)
    await send(agent)
    assert.deepEqual(restarted.adapter.requests.map(request => request.reasoningEffort), ['fast-v2'])
  } finally {
    await restarted.ctx.fiber.dispose()
  }
})
test('the native scoped allowlist excludes inherited shell tools without altering Workspace agents', async () => {
  const { ctx, adapter } = await loopHost()
  try {
    const executions = []
    const fakeTool = (name, label) => defineTool({
      name, description: 'Fictional no-op capability', parameters: {},
      output: { schema: { type: 'string' }, render: (_, value) => [{ type: 'text', text: value }] },
      async execute() { executions.push(label); return 'synthetic result' },
    })
    ctx.tools.register(fakeTool('synthetic_terminal', 'terminal'))
    const attachment = fakeTool('synthetic_attachment', 'approved attachment')
    ctx.tools.register(attachment)
    const { agent: direct } = await ctx.agents.create({
      sessionId: SessionId('synthetic-direct-tools'), agentOptions: route,
      setup(agentCtx) {
        const expected = agentCtx.tools.get('synthetic_attachment')
        assert.ok(expected)
        agentCtx.tools.restrict({ allow: ['synthetic_attachment'] })
        agentCtx.tools.guard(exec => agentCtx.tools.get(exec.name, exec.agent, exec.toolSet) === expected
          ? undefined : 'Synthetic Direct Chat tool identity denied')
      },
    })
    const workspace = await ctx.agentLoop.create(SessionId('synthetic-workspace-tools'), route)
    await send(direct)
    await send(workspace)
    assert.deepEqual(adapter.requests[0].tools.map(tool => tool.name), ['synthetic_attachment'])
    assert.deepEqual(new Set(adapter.requests[1].tools.map(tool => tool.name)),
      new Set(['synthetic_terminal', 'synthetic_attachment']))

    const dispatch = (agent, name) => ctx.tools.execute({ agent,
      calls: [{ id: 'synthetic-call', name, arguments: '{}' }], signal: new AbortController().signal })
    await dispatch(direct, 'synthetic_attachment')
    await dispatch(direct, 'synthetic_terminal')
    const shadow = direct.ctx.tools.register(fakeTool('synthetic_attachment', 'unexpected shadow'))
    await dispatch(direct, 'synthetic_attachment')
    await shadow()
    await dispatch(workspace, 'synthetic_terminal')
    assert.deepEqual(executions, ['approved attachment', 'terminal'])
  } finally {
    await ctx.fiber.dispose()
  }
})

async function persistenceHost(root) {
  const ctx = new Context()
  try {
    await mount(ctx, Sessions)
    await mount(ctx, Jsonl, { root, compression: 'none' })
    return ctx
  } catch (error) {
    await ctx.fiber.dispose()
    throw error
  }
}

test('native writer exclusion does not stop new readers across backend instances', async t => {
  const directory = await scratch(t)
  const root = join(directory, 'native-sessions')
  const first = await persistenceHost(root)
  let second
  try {
    const id = SessionId('synthetic-lease')
    const writer = await first.sessionPersistence.create({ id, createdAt: 1, version: SESSION_FORMAT_VERSION, isSeeded: false })
    await writer.flush()
    const original = await first.sessionPersistence.stat(id)
    assert.ok(isAbsolute(original.location.path))
    assert.equal(relative(root, original.location.path).startsWith(`..${sep}`), false)
    const originalBytes = await readFile(original.location.path)
    second = await persistenceHost(root)
    await assert.rejects(second.sessionPersistence.open(id, 'write'), { name: 'SessionAlreadyOwnedError' })
    const reader = await second.sessionPersistence.open(id, 'read')
    assert.equal(reader.header.id, id, 'read activation is permitted while the writer is exclusively owned')
    await reader.close()
    await writer.close()
    const laterWriter = await second.sessionPersistence.open(id, 'write')
    assert.equal(laterWriter.header.id, id, 'closing the writer does not establish a retirement fence')
    await laterWriter.close()
    assert.deepEqual(await readFile(original.location.path), originalBytes)
    await second.fiber.dispose()
    second = await persistenceHost(root)
    const reopened = await second.sessionPersistence.stat(id)
    assert.equal(reopened.header.id, id)
    assert.equal(reopened.location.path, original.location.path)
  } finally {
    await second?.fiber.dispose()
    await first.fiber.dispose()
  }
})

test('native metadata domain requires one opener and retains committed ownership after restart', async t => {
  const directory = await scratch(t)
  const spec = Domain.defineDomain({ name: 'synthetic_direct_catalog', version: 1,
    tables: { owner: Domain.domainTable(z.object({ preset: z.string(), phase: z.enum(['pending', 'ready']) })) } })
  async function host() {
    const ctx = new Context()
    await mount(ctx, Storage)
    await mount(ctx, Json, { root: join(directory, 'metadata') })
    await mount(ctx, Domain, { backend: 'json' })
    return ctx
  }
  let ctx = await host()
  try {
    const domain = await ctx.storageDomain.open(spec)
    const owner = domain.table('owner')
    ctx.provide('fixtureOwnership', owner)
    let readThroughLifecycle
    const writer = ctx.plugin({ name: 'fixture-direct-consumer', inject: ['fixtureOwnership'],
      async apply(child) { await child.fixtureOwnership.put('fictional-session', { preset: 'fixture-direct', phase: 'pending' }) } })
    await writer.await()
    const reader = ctx.plugin({ name: 'fixture-lifecycle-consumer', inject: ['fixtureOwnership'],
      apply(child) { readThroughLifecycle = () => child.fixtureOwnership.get('fictional-session') } })
    await reader.await()
    await assert.rejects(ctx.storageDomain.open(spec), { code: 'already-open' })
    await writer.dispose()
    assert.equal(readThroughLifecycle().phase, 'pending', 'disabling the Direct consumer cannot drop shared ownership')
    await reader.dispose()
    await domain.close()
    await ctx.fiber.dispose()
    ctx = await host()
    const reopened = await ctx.storageDomain.open(spec)
    assert.deepEqual(reopened.table('owner').get('fictional-session'), { preset: 'fixture-direct', phase: 'pending' })
    await reopened.close()
  } finally {
    await ctx.fiber.dispose()
  }
})

test('native Settings persists new feature preferences and rejects a stale numeric revision', async t => {
  const home = await scratch(t)
  const dir = join(home, 'profiles', 'synthetic-settings')
  const installAnchor = join(home, 'package.json')
  const patchPath = join(dir, 'cordis.patch.yml')
  const rootConfig = join(dir, 'cordis.yml')
  const bundleId = 'synthetic-settings-bundle'
  const bundleDir = join(dir, 'node_modules', bundleId)
  Boot.initProfile(dir, [bundleId])
  await mkdir(bundleDir, { recursive: true })
  await Promise.all([
    writeFile(installAnchor, JSON.stringify({ name: 'synthetic-settings-installation' })),
    writeFile(rootConfig, '[]\n'),
    writeFile(join(bundleDir, 'package.json'), JSON.stringify({
      name: bundleId, version: '1.0.0', dsh: { bundle: { patch: 'cordis.patch.yml' } },
    })),
    writeFile(join(bundleDir, 'cordis.patch.yml'), JSON.stringify([{ insert: [
      { id: 'config-editor', name: 'cordis:config-editor' },
      { id: 'settings', name: 'cordis:settings' },
      { id: 'abinadwan-conversation-lifecycle', name: 'cordis:lifecycle' },
      { id: 'abinadwan-adaptive-reasoning', name: 'cordis:reasoning' },
    ] }])),
  ])
  const profile = { name: 'synthetic-settings', home, cwd: home, dir, patchPath, installAnchor,
    startedBundles: [bundleId], overlays: [] }
  const start = () => Boot.boot('fixture', rootConfig, Boot.readProfilePatches('fixture', profile), root => {
    root.provide('profileContext', profile)
    Object.assign(root.loader.builtins, {
      'config-editor': ConfigEditor, settings: Settings, reasoning: Reasoning,
      lifecycle: Lifecycle,
    })
  })
  const describe = (ctx, id) => ctx.settings.describe().find(view => view.ns === id)
  const lifecycleId = 'abinadwan-conversation-lifecycle'
  const reasoningId = 'abinadwan-adaptive-reasoning'
  const retention = { retention: '30', overrides: [], protectedIds: ['fixture'] }
  const migratedRetention = { ...retention, protectedWorkspaces: [], hideArchived: true }
  const savedRetention = { ...migratedRetention, hideArchived: false }
  const preferences = [{ ...route, effort: 'deliberate-v2' }]
  let ctx = await start()
  try {
    const lifecycle = describe(ctx, lifecycleId)
    const reasoning = describe(ctx, reasoningId)
    assert.equal(lifecycle.autoGenerate, false)
    assert.equal(lifecycle.value.record.retention, 'forever')
    assert.equal(lifecycle.value.record.hideArchived, true)
    assert.equal(reasoning.autoGenerate, false)
    assert.deepEqual(reasoning.value.record.preferences, [])
    assert.ok(Number.isSafeInteger(lifecycle.revision))
    await ctx.settings.replace(lifecycle.ns, { record: retention }, lifecycle.revision)
    const changed = describe(ctx, lifecycleId)
    assert.deepEqual(changed.value.record, migratedRetention)
    assert.ok(changed.revision > lifecycle.revision)
    await assert.rejects(ctx.settings.replace(lifecycle.ns, { record: { retention: '7' } }, lifecycle.revision),
      { name: 'SettingsConflictError' })
    await ctx.settings.replace(lifecycle.ns, { record: savedRetention }, changed.revision)
    await ctx.settings.replace(reasoning.ns, { record: { preferences } }, describe(ctx, reasoningId).revision)
    const persisted = await readFile(patchPath, 'utf8')
    assert.match(persisted, /deliberate-v2/)
    assert.match(persisted, /protectedIds/)
    await ctx.fiber.dispose()

    ctx = await start()
    assert.deepEqual(describe(ctx, lifecycleId).value.record, savedRetention)
    assert.deepEqual(describe(ctx, reasoningId).value.record.preferences, preferences)
  } finally {
    await ctx.fiber.dispose()
  }
})

const directPreset = 'fixture-direct'
const standardPreset = 'fixture-standard'

test('a separate native chat composition streams and resumes with no tool or preset providers', async t => {
  const directory = await scratch(t)
  const chatRoot = join(directory, 'chat-sessions')
  const ordinaryRoot = join(directory, 'ordinary-sessions')
  const chatId = SessionId('synthetic-composition-chat')
  const ordinaryId = SessionId('synthetic-composition-ordinary')
  const ordinary = await loopHost(ordinaryRoot)
  let chat
  try {
    chat = await loopHost(chatRoot)
    const frames = []
    chat.ctx.on('agent/assistant-stream', ({ agent, frame }) => {
      if (agent.id === chatId) frames.push(frame)
    }, { global: true })
    await ordinary.ctx.agentLoop.create(ordinaryId, route, { cwd: directory })
    const agent = await chat.ctx.agentLoop.create(chatId, route, { cwd: directory })
    await send(agent)
    assert.deepEqual(frames.filter(frame => frame.type === 'chunk' && frame.chunk.type === 'text-delta')
      .map(frame => frame.chunk.text), ['Synthetic response'])
    assert.equal(frames.at(-1)?.outcome?.eventType, 'assistant/message')

    const otherModel = { ...route, model: 'synthetic-plain' }
    agent.model.select(otherModel)
    await send(agent)
    assert.deepEqual(chat.adapter.requests.map(({ model, tools }) => [model, tools?.length ?? 0]),
      [[route.model, 0], [otherModel.model, 0]])
    await chat.ctx.sessions.flush(agent.session)
    assert.deepEqual((await chat.ctx.sessionPersistence.list()).map(({ header }) => header.id), [chatId])
    assert.deepEqual((await ordinary.ctx.sessionPersistence.list()).map(({ header }) => header.id), [ordinaryId])
    await assert.rejects(ordinary.ctx.agents.resume({ resumeSessionId: chatId, agentOptions: route }),
      { name: 'SessionPersistenceNotFoundError' })

    await chat.ctx.fiber.dispose()
    chat = await loopHost(chatRoot)
    assert.equal(chat.ctx.get('agentPresets'), undefined)
    assert.equal(chat.ctx.get('fs'), undefined)
    assert.equal(chat.ctx.get('subprocess'), undefined)
    const { agent: resumed } = await chat.ctx.agents.resume({ resumeSessionId: chatId, agentOptions: route })
    await send(resumed)
    const [request] = chat.adapter.requests
    assert.equal(request.model, otherModel.model)
    assert.equal(request.tools?.length ?? 0, 0)
    const priorResponses = request.messages.filter(message => message.role === 'assistant')
    assert.equal(priorResponses.length, 2)
    assert.ok(priorResponses.every(message => message.content.some(block =>
      block.type === 'text' && block.text === 'Synthetic response')))
  } finally {
    await Promise.all([chat?.ctx.fiber.dispose(), ordinary.ctx.fiber.dispose()])
  }
})

async function directChatHost(directory) {
  const root = join(directory, 'direct-fixture-sessions')
  const spec = Domain.defineDomain({ name: 'synthetic_direct_ownership', version: 1,
    tables: { sessions: Domain.domainTable(z.object({ phase: z.enum(['pending', 'ready']), preset: z.string() })) } })
  const host = await loopHost(root)
  try {
    await mount(host.ctx, Loader, { baseUrl: new URL('../package.json', import.meta.url).href })
    await mount(host.ctx, AgentPresets, { default: standardPreset })
    await mount(host.ctx, Storage)
    await mount(host.ctx, Json, { root: join(directory, 'direct-fixture-metadata') })
    await mount(host.ctx, Domain, { backend: 'json' })
    const access = await host.ctx.storageDomain.open(spec)
    const executions = []
    function registerTerminal(ctx) {
      return ctx.tools.register(defineTool({
        name: 'fixture_terminal', description: 'Fictional terminal that executes no system commands', parameters: {},
        output: { schema: { type: 'string' }, render: (_, value) => [{ type: 'text', text: value }] },
        async execute(_args, execution) { executions.push(execution.agent.id); return 'synthetic result' },
      }))
    }
    registerTerminal(host.ctx)
    const registration = await host.ctx.agentPresets.register({ id: directPreset,
      plugins: [{ id: 'fixture-direct-restrictions', name: new URL('./direct-chat-restricted-preset.mjs', import.meta.url).href }] })
    host.ctx.effect(() => registration)
    const ordinary = await host.ctx.agentPresets.register({ id: standardPreset, plugins: [] })
    host.ctx.effect(() => ordinary)
    return { ...host, access, executions, registerTerminal,
      setup(preset) { return async agentCtx => { await host.ctx.agentPresets.mount(agentCtx, preset) } } }
  } catch (error) {
    await host.ctx.fiber.dispose()
    throw error
  }
}

test('a native Direct Chat candidate keeps explicit ownership and request restrictions through Host restart', async t => {
  const directory = await scratch(t)
  const id = SessionId('synthetic-direct-owned')
  const pendingId = SessionId('synthetic-direct-pending')
  const preset = directPreset
  let host = await directChatHost(directory)
  try {
    const ownership = host.access.table('sessions')
    await ownership.put(id, { phase: 'pending', preset })
    const { agent } = await host.ctx.agents.create({ sessionId: id, agentOptions: route, meta: { agentPreset: preset }, setup: host.setup(preset) })
    assert.equal(agent.session.header.id, id)
    assert.equal(agent.session.header.agentPreset, preset)
    await host.ctx.sessions.flush(agent.session)
    await ownership.put(id, { phase: 'ready', preset })
    await ownership.put(pendingId, { phase: 'pending', preset })
    await send(agent)
    assert.deepEqual(host.adapter.requests.map(request => request.tools ?? []), [[]])
    // A separate blank candidate exercises the stock preset switch. It is never exposed to a browser.
    const { agent: blank } = await host.ctx.agents.create({ sessionId: SessionId('synthetic-direct-switch'),
      agentOptions: route, meta: { agentPreset: preset }, setup: host.setup(preset) })
    await host.ctx.agentPresets.select(blank, standardPreset)
    await send(blank)
    assert.deepEqual(host.adapter.requests.at(-1).tools.map(tool => tool.name), ['fixture_terminal'],
      'blank native preset switching can restore inherited tools despite the original header')
    assert.equal(blank.session.header.agentPreset, preset)
    await host.access.close()
    await host.ctx.fiber.dispose()

    host = await directChatHost(directory)
    const ready = host.access.table('sessions').get(id)
    const pending = host.access.table('sessions').get(pendingId)
    assert.deepEqual(ready, { phase: 'ready', preset })
    assert.equal(pending.phase, 'pending')
    assert.equal(await host.ctx.sessionPersistence.stat(pendingId), undefined)
    const stored = await host.ctx.sessionPersistence.stat(id)
    assert.equal(stored.header.agentPreset, ready.preset)
    const resumed = await host.ctx.agents.resume({ resumeSessionId: id, agentOptions: route, setup: host.setup(preset) })
    await send(resumed.agent)
    assert.deepEqual(host.adapter.requests.map(request => request.tools ?? []), [[]])
    await host.access.close()
  } finally {
    await host.ctx.fiber.dispose()
  }
})

// Probe only. The Host does not treat a plugin listener as mandatory admission.
async function bindFixtureOwnership(host) {
  const owners = host.access.table('sessions')
  await mount(host.ctx, {
    name: 'synthetic-direct-ownership-policy',
    apply(ctx) {
      ctx.on('agent/created', ({ agent }) => {
        const original = agent.session.header.agentPreset
        if (original !== directPreset && owners.get(agent.id) === undefined) return
        agent.ctx.tools.restrict({ allow: [] })
        agent.ctx.tools.guard(() => 'Synthetic ownership denies tool dispatch')
        agent.ctx.on('agent/pre-step', (_event, next) => {
          const owner = owners.get(agent.id)
          return original === directPreset && owner?.preset === original && owner.phase === 'ready'
            ? next()
            : { kind: 'reject' }
        })
      })
    },
  })
}

test('an Agent-scoped ownership policy survives preset and model changes but depends on Host activation', async t => {
  const directory = await scratch(t)
  const id = SessionId('synthetic-direct-policy-ready')
  const metadata = { preset: directPreset }
  const create = (host, sessionId, preset = directPreset) => host.ctx.agents.create({
    sessionId, agentOptions: route, meta: { agentPreset: preset }, setup: host.setup(preset),
  })
  const resume = host => host.ctx.agents.resume({
    resumeSessionId: id, agentOptions: route, setup: host.setup(standardPreset),
  })
  const dispatch = (host, agent) => host.ctx.tools.execute({
    agent, calls: [{ id: 'synthetic-owner-call', name: 'fixture_terminal', arguments: '{}' }],
    signal: new AbortController().signal,
  })

  let host = await directChatHost(directory)
  try {
    await bindFixtureOwnership(host)
    const owners = host.access.table('sessions')
    await owners.put(id, { ...metadata, phase: 'pending' })
    const { agent } = await create(host, id)
    await host.ctx.sessions.flush(agent.session)
    await owners.put(id, { ...metadata, phase: 'ready' })
    assert.equal(await host.ctx.agentPresets.select(agent, standardPreset), standardPreset,
      'the stock API still accepts blank-session preset replacement')
    assert.equal(agent.session.header.agentPreset, directPreset)
    await send(agent)
    assert.deepEqual(host.adapter.requests.at(-1).tools ?? [], [])
    await dispatch(host, agent)
    const model = 'synthetic-plain'
    agent.model.select({ ...route, model })
    await send(agent)
    assert.equal(host.adapter.requests.at(-1).model, model)
    assert.deepEqual(host.adapter.requests.at(-1).tools ?? [], [])
    await dispatch(host, agent)
    const releaseTerminal = host.registerTerminal(agent.ctx)
    try {
      assert.ok(agent.ctx.tools.get('fixture_terminal', agent), 'the inherited-tool mask leaves scoped registrations visible')
      await dispatch(host, agent)
    } finally {
      await releaseTerminal()
    }
    assert.deepEqual(host.executions, [])
    await assert.rejects(host.ctx.agentPresets.select(agent, directPreset), { code: 'agent-preset/locked' })

    const pendingId = SessionId('synthetic-direct-policy-pending')
    const mismatchId = SessionId('synthetic-direct-policy-conflicting')
    await owners.put(pendingId, { ...metadata, phase: 'pending' })
    await owners.put(mismatchId, { ...metadata, phase: 'ready' })
    for (const [blockedId, preset] of [[pendingId, directPreset],
      [SessionId('synthetic-direct-policy-missing'), directPreset], [mismatchId, standardPreset]]) {
      const { agent: blocked } = await create(host, blockedId, preset)
      await send(blocked)
    }
    assert.equal(host.adapter.requests.length, 2, 'pending, missing and conflicting ownership do not reach the adapter')

    const { agent: workspace } = await create(host, SessionId('synthetic-workspace-policy-control'), standardPreset)
    await send(workspace)
    assert.deepEqual(host.adapter.requests.at(-1).tools.map(tool => tool.name), ['fixture_terminal'])
    await dispatch(host, workspace)
    assert.deepEqual(host.executions, [workspace.id])
    await host.access.close()
    await host.ctx.fiber.dispose()

    host = await directChatHost(directory)
    await bindFixtureOwnership(host)
    const { agent: restricted } = await resume(host)
    assert.equal(host.ctx.agentPresets.presetForSession(restricted.session), standardPreset)
    assert.equal(restricted.session.header.agentPreset, directPreset)
    await send(restricted)
    assert.deepEqual(host.adapter.requests.at(-1).tools ?? [], [])
    await dispatch(host, restricted)
    assert.deepEqual(host.executions, [])
    await host.access.close()
    await host.ctx.fiber.dispose()

    // A Host without the optional listener can still activate the same native Session.
    host = await directChatHost(directory)
    assert.deepEqual(host.access.table('sessions').get(id), { ...metadata, phase: 'ready' })
    const { agent: unbound } = await resume(host)
    await send(unbound)
    assert.deepEqual(host.adapter.requests.at(-1).tools.map(tool => tool.name), ['fixture_terminal'])
    await host.access.close()
  } finally {
    await host.ctx.fiber.dispose()
  }
})

test('after authoritative fixture shutdown, a proposed maintenance journal does not fence native restart', async t => {
  const directory = await scratch(t)
  const root = join(directory, 'restart-probe')
  const sessionId = SessionId('synthetic-maintenance-restart')
  let ctx = await persistenceHost(root)
  try {
    const writer = await ctx.sessionPersistence.create({ id: sessionId, createdAt: 1,
      version: SESSION_FORMAT_VERSION, isSeeded: false })
    await writer.flush()
    await writer.close()
    await ctx.fiber.dispose()
    await writeFile(join(root, 'synthetic-maintenance-journal.json'), JSON.stringify({ sessionId, phase: 'prepared' }), { flag: 'wx' })

    ctx = await persistenceHost(root)
    const resumed = await ctx.sessionPersistence.open(sessionId, 'write')
    assert.equal(resumed.header.id, sessionId)
    await resumed.close()
  } finally {
    await ctx.fiber.dispose()
  }
})

test('offline removal of one synthetic log reconciles search but leaves the native archive registration', async t => {
  const directory = await scratch(t)
  const root = join(directory, 'safe-fixture-sessions')
  const project = join(directory, 'synthetic-project')
  await mkdir(project)
  const projectFile = join(project, 'source.txt')
  await writeFile(projectFile, 'fictional project bytes')

  async function host() {
    const ctx = await persistenceHost(root)
    try {
      await mount(ctx, Storage)
      await mount(ctx, Json, { root: join(directory, 'metadata') })
      await mount(ctx, Domain, { backend: 'json' })
      await mount(ctx, Workspace)
      await mount(ctx, SessionQuery, { path: join(directory, 'search.sqlite'), openAt: 'first-search' })
      return ctx
    } catch (error) {
      await ctx.fiber.dispose()
      throw error
    }
  }

  const id = SessionId('synthetic-offline-log')
  const witnessId = SessionId('synthetic-unrelated-log')
  let ctx = await host()
  try {
    const workspace = await ctx.workspaceRegistry.create(project, 'Fictional Workspace')
    for (const candidate of [id, witnessId]) {
      const session = ctx.sessions.create(candidate, { meta: { cwd: project } })
      const writer = await ctx.sessionPersistence.create(session.header)
      try {
        const message = createUserMessage({ content: [{ type: 'text', text: 'fixturetrace' }], source: { kind: 'user' } })
        session.append('user/message', message, { surfaceOp: 'append' })
        await ctx.sessions.flush(session)
      } finally {
        await writer.close()
      }
    }
    await workspace.attachSession(id)
    await ctx.workspaceRegistry.archiveSession(id)
    assert.ok(ctx.workspaceRegistry.archivedSessionIds.includes(id))
    const searchBefore = await ctx.sessionQuery.searchSessions({ query: 'fixturetrace' })
    assert.equal(searchBefore.items.length, 2)
    const selected = await ctx.sessionPersistence.stat(id)
    const witness = await ctx.sessionPersistence.stat(witnessId)
    const witnessBytes = await readFile(witness.location.path)
    await ctx.fiber.dispose()

    // Negative control in a fixture with every owner stopped. This is not a deletion algorithm.
    const target = await realpath(selected.location.path)
    assert.equal(target, selected.location.path)
    const canonicalRoot = await realpath(root)
    assert.equal(canonicalRoot, root)
    assert.throws(() => checkFixtureLogPath(canonicalRoot,
      join(dirname(canonicalRoot), 'synthetic-offline-log', 'session.v4.jsonl')), /strictly inside/)
    checkFixtureLogPath(canonicalRoot, target)
    await unlink(target)

    ctx = await host()
    assert.equal(await ctx.sessionPersistence.stat(id), undefined)
    const searchAfter = await ctx.sessionQuery.searchSessions({ query: 'fixturetrace' })
    assert.equal(searchAfter.items.length, 1)
    assert.ok(ctx.workspaceRegistry.archivedSessionIds.includes(id), 'archive metadata did not reconcile with FTS')
    assert.deepEqual(await readFile(witness.location.path), witnessBytes)
    assert.equal(await readFile(projectFile, 'utf8'), 'fictional project bytes')
  } finally {
    await ctx.fiber.dispose()
  }
})

test('a synthetic Windows junction can pass lexical containment while resolving outside the transcript root', async t => {
  const directory = await scratch(t)
  const root = join(directory, 'sessions')
  const project = join(directory, 'project')
  await mkdir(root)
  await mkdir(project)
  await writeFile(join(project, 'marker.txt'), 'fictional project file')
  const redirected = join(root, 'misleading-session')
  try {
    await symlink(project, redirected, process.platform === 'win32' ? 'junction' : 'dir')
  } catch (error) {
    if (error.code !== 'EPERM' && error.code !== 'EACCES') throw error
    t.skip('Synthetic junction creation is denied by this execution environment')
    return
  }
  const candidate = join(redirected, 'marker.txt')
  assert.equal(relative(root, candidate), join('misleading-session', 'marker.txt'))
  assert.equal(await realpath(candidate), await realpath(join(project, 'marker.txt')))
  assert.match(relative(await realpath(root), await realpath(candidate)), /^\.\.[\\/]/)
})
