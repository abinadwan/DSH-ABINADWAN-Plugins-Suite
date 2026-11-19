// Windows feasibility fixture. No renderer, production configuration, or provider credentials.
import assert from 'node:assert/strict'
import { fork, spawn } from 'node:child_process'
import { once, on } from 'node:events'
import { mkdtemp, readFile, readdir, realpath, rm } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { basename, dirname, join, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { compileFunction } from 'node:vm'

const isWorker = process.argv[2] === '--fixture-child'
if (isWorker) assert.ok(process.connected && process.send, 'Companion fixture requires an inherited IPC channel')
const runtime = process.env.ABINADWAN_TEST_RUNTIME
if (!runtime) throw new Error('Set ABINADWAN_TEST_RUNTIME to a native Harness runtime directory')
const require = createRequire(resolve(runtime, 'package.json'))
const load = name => import(pathToFileURL(require.resolve(`@deepseek-ai/${name}`)))
const [{ Context }, { default: Llm, LlmAdapter, createUserMessage }, { default: Sessions, SessionId },
  { default: Projections }, { default: Prompt }, { default: Tools }, Executor, { default: Agents },
  { default: Loop }, Persistence] = await Promise.all([
  'cordis', 'dsh-llm', 'dsh-session', 'dsh-session-projection', 'dsh-system-prompt', 'dsh-tools',
  'dsh-tool-executor-native', 'dsh-agent', 'dsh-agent-loop', 'dsh-session-persistence-jsonl',
].map(load))

const file = fileURLToPath(import.meta.url)
const parent = fileURLToPath(new URL('../node_modules', import.meta.url))
const id = SessionId('synthetic-companion-turns')
const route = { provider: 'fixture-provider', model: 'fixture-first' }
const nextModel = 'fixture-second'
const models = [route.model, nextModel]
const reply = 'Synthetic broker response'
const modelInfo = model => ({ provider: route.provider, id: model, name: model })

async function browserBundle(name, externals) {
  const id = `@deepseek-ai/${name}`
  const filename = require.resolve(`${id}/client`)
  let exports
  const run = compileFunction(await readFile(filename, 'utf8'), ['window'], { filename })
  run({ __ModuleLoader__: { load(definition) {
    assert.equal(definition.id, id)
    assert.equal(exports, undefined)
    exports = definition.factory(specifier => {
      assert.ok(Object.hasOwn(externals, specifier), `Unexpected browser external ${specifier}`)
      return externals[specifier]
    })
  } } })
  assert.ok(exports?.apply)
  return exports
}

async function* textReply() {
  yield { type: 'block-start', index: 0, blockType: 'text' }
  yield { type: 'text-delta', index: 0, text: reply }
  yield { type: 'block-end', index: 0, block: { type: 'text', text: reply } }
  yield { type: 'finish', reason: { kind: 'stop' } }
}

async function verifyScratch(directory) {
  assert.equal(await realpath(directory), directory)
  assert.equal(dirname(directory), parent)
  assert.match(basename(directory), /^\.direct-chat-companion-[a-z\d]+$/i)
}

class ChildAdapter extends LlmAdapter {
  async resolveModel(_provider, model) { return modelInfo(model) }

  async *stream({ model, messages, tools, signal }) {
    assert.equal(tools?.length ?? 0, 0)
    const frames = on(process, 'message', { signal })
    try {
      process.send({ type: 'model', model, history: messages.map(({ role, content }) => ({ role, content })) })
      for await (const [frame] of frames) {
        if (frame.type === 'chunk') yield frame.value
        if (frame.type === 'broker-done') return
      }
    } finally {
      await frames.return()
    }
  }
}

async function worker(directory, mode) {
  await verifyScratch(directory)
  assert.equal(process.env.ABINADWAN_SYNTHETIC_PROVIDER_KEY, undefined)
  assert.equal(process.env.DSH_HOME, directory)
  assert.ok(mode === 'create' || mode === 'resume')
  const deadline = AbortSignal.timeout(15_000)
  const control = on(process, 'message', { signal: deadline })
  const ctx = new Context()
  try {
    for (const plugin of [Llm, Sessions, Projections, Prompt, Tools, Executor, Agents]) {
      await ctx.plugin(plugin).await()
    }
    await ctx.plugin(Persistence, { root: join(directory, 'sessions'), compression: 'none' }).await()
    await ctx.plugin(Loop, { agents: [] }).await()
    ctx.llm.registerAdapter([route.provider], new ChildAdapter())
    for (const service of ['agentPresets', 'fs', 'subprocess', 'connection', 'credentials']) {
      assert.equal(ctx.get(service), undefined)
    }

    const agent = mode === 'create'
      ? await ctx.agentLoop.create(id, route, { cwd: directory })
      : (await ctx.agents.resume({ resumeSessionId: id, agentOptions: route })).agent
    const frames = []
    ctx.on('agent/assistant-stream', ({ agent: sender, frame }) => {
      if (sender === agent && frame.type === 'chunk' && frame.chunk.type === 'text-delta') frames.push(frame.chunk.text)
    }, { global: true })
    async function send() {
      agent.followup(createUserMessage({ content: [{ type: 'text', text: 'Synthetic prompt' }], source: { kind: 'user' } }))
      await agent.whenIdle()
    }
    await send()
    if (mode === 'create') {
      agent.model.select({ ...route, model: nextModel })
      await send()
    }
    await ctx.sessions.flush(agent.session)
    process.send({ type: 'settled', frames, sessionIds: (await ctx.sessionPersistence.list()).map(({ header }) => header.id) })
    for await (const [command] of control) if (command.type === 'shutdown') break
  } finally {
    await control.return()
    await ctx.fiber.dispose()
    if (process.connected) process.disconnect()
  }
}

function childOptions(directory) {
  const { SystemRoot, WINDIR } = process.env
  return { cwd: directory, windowsHide: true,
    env: { SystemRoot, WINDIR, DSH_HOME: directory, HOME: directory, USERPROFILE: directory,
      TEMP: directory, TMP: directory, ABINADWAN_TEST_RUNTIME: resolve(runtime) } }
}

async function exerciseChild(directory, mode, parentLlm) {
  const child = fork(file, ['--fixture-child', directory, mode], { ...childOptions(directory), execArgv: [] })
  const exited = once(child, 'exit')
  const deadline = AbortSignal.timeout(15_000)
  const channels = on(child, 'message', { close: ['disconnect'], signal: deadline })
  let settled
  try {
    for await (const [message] of channels) {
      if (message.type === 'settled') {
        settled = message
        child.send({ type: 'shutdown' })
        break
      }
      assert.equal(message.type, 'model')
      assert.ok(models.includes(message.model))
      const messages = message.history.map(({ role, content }) => {
        assert.ok(['system', 'user', 'assistant'].includes(role))
        assert.ok(content.every(block => block.type === 'text'))
        return role === 'assistant'
          ? { role, content, source: { kind: 'model', provider: route.provider, model: message.model } }
          : { role, content }
      })
      const prepared = await parentLlm.prepareCall({ ...route, model: message.model }, deadline)
      for await (const value of prepared.stream({ ...prepared.config, messages, signal: deadline })) {
        assert.ok(['block-start', 'text-delta', 'block-end', 'finish'].includes(value.type))
        await new Promise((resolveSend, reject) => child.send({ type: 'chunk', value }, error => {
          if (error) reject(error)
          else resolveSend()
        }))
      }
      child.send({ type: 'broker-done' })
    }
    assert.ok(settled, 'the authenticated child channel ended before the conversation settled')
    assert.deepEqual(await onceOrDeadline(exited, deadline), [0, null])
    return settled
  } finally {
    await channels.return()
    if (child.exitCode === null && child.signalCode === null) child.kill()
    await exited
  }
}

async function onceOrDeadline(promise, signal) {
  if (signal.aborted) signal.throwIfAborted()
  let rejectOnTimeout
  const timeout = new Promise((_, reject) => {
    rejectOnTimeout = () => reject(signal.reason)
    signal.addEventListener('abort', rejectOnTimeout, { once: true })
  })
  try { return await Promise.race([promise, timeout]) }
  finally { signal.removeEventListener('abort', rejectOnTimeout) }
}

if (isWorker) {
  await worker(process.argv[3], process.argv[4])
} else {
  test('native Direct Chat can restart a credential-free Windows companion over inherited IPC', async () => {
    const directory = await mkdtemp(join(parent, '.direct-chat-companion-'))
    await verifyScratch(directory)
    const ctx = new Context()
    const priorKey = process.env.ABINADWAN_SYNTHETIC_PROVIDER_KEY
    const key = 'synthetic-parent-credential'
    process.env.ABINADWAN_SYNTHETIC_PROVIDER_KEY = key
    const calls = []
    try {
      const unattached = spawn(process.execPath, [file, '--fixture-child', directory, 'create'], {
        ...childOptions(directory), stdio: ['ignore', 'ignore', 'pipe'], timeout: 15_000,
      })
      let errorText = ''
      unattached.stderr.on('data', chunk => { errorText = (errorText + chunk).slice(-4096) })
      assert.deepEqual(await once(unattached, 'close'), [1, null])
      assert.match(errorText, /requires an inherited IPC channel/)
      assert.deepEqual(await readdir(directory), [], 'startup without a carrier creates no native history')

      await ctx.plugin(Llm).await()
      ctx.llm.registerAdapter([route.provider], new class extends LlmAdapter {
        async resolveModel(_provider, model) { return modelInfo(model) }
        async *stream({ model, tools, messages }) {
          assert.equal(process.env.ABINADWAN_SYNTHETIC_PROVIDER_KEY, key)
          assert.equal(tools?.length ?? 0, 0)
          calls.push({ model, replies: messages.filter(({ role }) => role === 'assistant').length })
          yield* textReply()
        }
      }())
      const before = await exerciseChild(directory, 'create', ctx.llm)
      assert.deepEqual(before.frames, [reply, reply])
      assert.deepEqual(before.sessionIds, [id])
      const after = await exerciseChild(directory, 'resume', ctx.llm)
      assert.deepEqual(after.frames, [reply])
      assert.deepEqual(after.sessionIds, [id])
      assert.deepEqual(calls, [
        { model: route.model, replies: 0 }, { model: nextModel, replies: 1 }, { model: nextModel, replies: 2 },
      ])
    } finally {
      if (priorKey === undefined) delete process.env.ABINADWAN_SYNTHETIC_PROVIDER_KEY
      else process.env.ABINADWAN_SYNTHETIC_PROVIDER_KEY = priorKey
      await ctx.fiber.dispose()
      await verifyScratch(directory)
      await rm(directory, { recursive: true, force: true })
    }
  })

  test('native Session Gateway confines the companion Peer to its text session', async () => {
    const [Typert, Gate, Access, Store, Json, Domains, Workspaces, Query, DefaultModel,
      Attachments, Uploads, Commands, Controller, { HostConnectionService }, { installConnection }, ClientGate,
      SessionContribution, CommandsContribution, SubagentsContribution, Cordis] = await Promise.all([
      'dsh-typert-registry', 'dsh-api-gateway', 'dsh-api-remote-access', 'dsh-storage', 'dsh-storage-json',
      'dsh-storage-domain', 'dsh-workspace', 'dsh-session-query-sqlite', 'dsh-agent-default-model',
      'dsh-attachment-local', 'dsh-client-file-upload', 'dsh-commands', 'dsh-api-session-controller',
      'dsh-client-connection', 'dsh-client-connection/client', 'dsh-api-gateway/client',
      'dsh-api-session-controller/remote', 'dsh-commands/remote', 'dsh-subagent/remote', 'cordis',
    ].map(load))
    const storePath = process.env.ABINADWAN_TEST_CLIENT_STORE
    const ClientStore = storePath ? await import(pathToFileURL(resolve(storePath))) : await load('dsh-client-store')
    const externals = { '@deepseek-ai/cordis': Cordis, '@deepseek-ai/dsh-api-gateway/client': ClientGate,
      '@deepseek-ai/dsh-client-store': ClientStore }
    const [SessionsClient, UploadsClient] = await Promise.all([
      browserBundle('dsh-api-session-controller', externals), browserBundle('dsh-client-file-upload', externals),
    ])
    const directory = await mkdtemp(join(parent, '.direct-chat-companion-'))
    await verifyScratch(directory)
    const ctx = new Context()
    const client = new Context()
    async function mount(plugin, config) { await ctx.plugin(plugin.default ?? plugin, config).await() }
    try {
      for (const plugin of [Llm, Sessions, Projections, Prompt, Tools, Executor, Agents,
        Typert, Access, Gate, Store, Commands]) await mount(plugin)
      await mount({ apply(local) { new HostConnectionService(local, [], {}) } })
      await mount(Persistence, { root: join(directory, 'sessions'), compression: 'none' })
      await mount(Json, { root: join(directory, 'metadata') })
      await mount(Domains, { backend: 'json' })
      await mount(Workspaces)
      await mount(Query, { path: join(directory, 'search.sqlite'), openAt: 'first-search' })
      await mount(DefaultModel, route)
      await mount(Attachments, { dshHome: directory })
      await mount(Uploads)
      ctx.provide('fs', { processPathFromHostPath: () => undefined })
      await mount(Loop, { agents: [] })
      await mount(Controller, { nativeOpen: false })
      ctx.llm.registerAdapter([route.provider], new class extends LlmAdapter {
        async resolveModel(_provider, model) { return modelInfo(model) }
        async listModels() { return models.map(modelInfo) }
        stream({ tools }) {
          assert.equal(tools?.length ?? 0, 0)
          return textReply()
        }
      }())

      const peer = ctx.connection.createPeer({ principal: { kind: 'fixture-companion' }, interactions: 'answer' })
      const invoke = (method, request) => ctx.typertGateway.invoke({ peer, namespace: 'session', method, args: { request } })
      const denied = { code: 'remote-access/denied' }
      await assert.rejects(invoke('create', { cwd: directory }), denied)
      assert.deepEqual(await ctx.sessionPersistence.list(), [])
      let sessionId
      const revoke = ctx.remoteAccess.registerPolicy('fixture-companion', { bindings: () => [{
        role: { name: 'fixture-creation', resource: 'global', actions: ['session/create'] },
        resource: { kind: 'global' },
        condition: ({ args }) => args?.request?.cwd === directory && Object.keys(args.request).length === 1
          ? { kind: 'allow' }
          : { kind: 'deny', reason: 'fixture-directory-required' },
      }, {
        role: { name: 'fixture-catalog', resource: 'global', actions: ['session/list', 'session/control'] },
        resource: { kind: 'global' },
      }, ...(sessionId === undefined ? [] : [{
        role: { name: 'fixture-session', resource: 'session',
          actions: ['session/list', 'session/control', 'session/selectModel', 'session/events', 'session/follow'] },
        resource: { kind: 'session', id: sessionId },
      }, {
        role: { name: 'fixture-text', resource: 'session', actions: ['session/prompt'] },
        resource: { kind: 'session', id: sessionId },
        condition: ({ args }) => Array.isArray(args?.request?.content) && args.request.content.length > 0
          && args.request.content.every(block => block.type === 'text')
          ? { kind: 'allow' }
          : { kind: 'deny', reason: 'fixture-text-required' },
      }])] })
      await assert.rejects(invoke('create', { cwd: join(directory, 'outside-conversation') }), denied)
      const created = await invoke('create', { cwd: directory })
      sessionId = created.sessionId
      const content = [{ type: 'text', text: 'Synthetic native Remote prompt' }]
      const prompt = { sessionId, requestId: 'synthetic-prompt', mode: 'queue', content }
      await assert.rejects(invoke('prompt', { ...prompt, sessionId: 'synthetic-workspace-id' }), denied)
      await assert.rejects(invoke('prompt', { ...prompt, content: [] }), denied)
      await assert.rejects(invoke('prompt', { ...prompt,
        content: [{ type: 'file', receiptId: 'synthetic-file-receipt' }] }), denied)
      await assert.rejects(invoke('openWorkspacePath', { path: join(directory, 'unused.txt') }), denied)
      const address = { kind: 'session', sessionId }
      ctx.effect(() => ctx.typertGateway.registerRemoteEvents(async function* (signal) {
        if (!signal.aborted) await new Promise(resolveWait => signal.addEventListener('abort', resolveWait, { once: true }))
      }, { home: directory }))
      await client.plugin(Typert.default).await()
      const host = ctx.connection.createSharedFetchHandler('/api')
      installConnection(client, { interactions: 'answer', transport: {
        fetch: (path, init) => host.fetch(new Request(new URL(path, 'http://companion.test/'), init), peer),
        async *openStream(endpoint, payload, signal, uplink = []) {
          yield* await ctx.typertGateway.wireStream.open(endpoint, payload, uplink, peer, signal)
        },
      } })
      await client.plugin(ClientGate).await()
      for (const contribution of [SessionContribution, CommandsContribution, SubagentsContribution]) {
        await client.remote.$mount(contribution.default)
      }
      await client.plugin(UploadsClient).await()
      await client.plugin(SessionsClient).await()
      await client.sessions.refresh()
      assert.deepEqual(client.sessions.list.getSnapshot().ids, [sessionId])
      const selected = await client.remote.session.selectModel({ sessionId, ...route, model: nextModel })
      assert.equal(selected.ok, true)
      assert.equal(selected.value.selected.model, nextModel)
      const follow = client.remote.session.follow({ address, assistantStream: true }, AbortSignal.timeout(5000))
      const stream = follow[Symbol.asyncIterator]()
      try {
        assert.equal((await stream.next()).value.type, 'snapshot')
        await client.sessions.using(sessionId, { source: 'controllerOperation', signal: AbortSignal.timeout(5000) }, async reference => {
          assert.equal(reference.binding.sessionId, sessionId)
          assert.equal((await reference.binding.session.prompt(content, 'queue')).ok, true)
        })
        for (;;) {
          const { value, done } = await stream.next()
          assert.equal(done, false, 'native stream ended before the assistant text delta')
          if (value.type === 'assistant-stream' && value.frame.chunk?.type === 'text-delta') {
            assert.equal(value.frame.chunk.text, reply)
            break
          }
        }
      } finally {
        await stream.return()
      }
      const agent = ctx.agents.get(sessionId)
      await agent.whenIdle()
      const history = await invoke('events', { address })
      assert.match(JSON.stringify(history), /Synthetic broker response/)
      await revoke()
      await assert.rejects(invoke('events', { address }), denied)
      await client.fiber.dispose()
      await peer.dispose()
      await assert.rejects(invoke('create', { cwd: directory }), { code: 'gateway/peer-disposed' })
    } finally {
      await client.fiber.dispose()
      await ctx.fiber.dispose()
      await verifyScratch(directory)
      await rm(directory, { recursive: true, force: true })
    }
  })

  test('Windows JSONL writer dependency cannot load when Node disallows native addons',
    { skip: process.platform !== 'win32' }, async () => {
      const directory = await mkdtemp(join(parent, '.direct-chat-companion-'))
      await verifyScratch(directory)
      try {
        const addon = pathToFileURL(require.resolve('koffi')).href
        const child = spawn(process.execPath, ['--permission', `--allow-fs-read=${resolve(runtime)}`,
          '--input-type=module', '--eval', 'await import(process.argv[1])', addon], {
          ...childOptions(directory), stdio: ['ignore', 'ignore', 'pipe'], timeout: 5000,
        })
        let errorText = ''
        child.stderr.on('data', chunk => { errorText = (errorText + chunk).slice(-4096) })
        assert.deepEqual(await once(child, 'close'), [1, null])
        assert.match(errorText, /ERR_DLOPEN_DISABLED/)
        assert.match(errorText, /koffi-win32/)
        assert.deepEqual(await readdir(directory), [])
      } finally {
        await verifyScratch(directory)
        await rm(directory, { recursive: true, force: true })
      }
    })
}
