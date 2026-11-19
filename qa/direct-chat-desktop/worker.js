import { createRequire } from 'node:module'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { randomUUID } from 'node:crypto'
import { bindChannel, streamTable } from './channel.js'

if (!process.connected || !process.env.ABINADWAN_D2_RUNTIME || !process.env.DSH_HOME
  || Object.keys(process.env).some(name => /^(DEEPSEEK_|.*_(API_KEY|TOKEN|SECRET|PASSWORD)$)/i.test(name))) process.exit(1)
const home = process.env.DSH_HOME
const resolve = createRequire(join(process.env.ABINADWAN_D2_RUNTIME, 'package.json')).resolve
const names = ['cordis', 'dsh-llm', 'dsh-session', 'dsh-session-projection', 'dsh-system-prompt', 'dsh-tools',
  'dsh-tool-executor-native', 'dsh-agent', 'dsh-agent-loop', 'dsh-session-persistence-jsonl',
  'dsh-typert-registry', 'dsh-api-gateway', 'dsh-api-remote-access', 'dsh-storage', 'dsh-storage-json',
  'dsh-storage-domain', 'dsh-workspace', 'dsh-session-query-sqlite', 'dsh-agent-default-model',
  'dsh-attachment-local', 'dsh-client-file-upload', 'dsh-commands', 'dsh-api-session-controller', 'dsh-client-connection']

const [{ Context }, { default: Llm, LlmAdapter }, Sessions, Projections, Prompt, Tools, Executor, Agents, Loop,
  Persistence, Typert, Gate, Access, Store, Json, Domains, Workspaces, Query, DefaultModel,
  Attachments, Uploads, Commands, Controller, { HostConnectionService }] = await Promise.all(names.map(name =>
  import(pathToFileURL(resolve(`@deepseek-ai/${name}`)).href)))

const ctx = new Context()
const peers = new Map()
const sessionIds = new Set()
const globalCalls = ['session/list', 'session/control', 'session/modelCatalog']
const sessionCalls = ['session/list', 'session/control', 'session/prompt', 'session/selectModel',
  'session/state', 'session/projections', 'session/events', 'session/follow', 'session/cancel', 'session/observeState',
  'session/observeEvent', 'session/observeProjections']
const unary = new Set([...globalCalls, ...sessionCalls, 'session/create'])
const streamed = new Set(['$events', 'session/control', 'session/follow', 'session/observeEvent',
  'session/observeProjections', 'session/observeState'])
const channel = bindChannel(process, handle)
const ready = start()

function metrics() {
  return { pid: process.pid, rss: process.memoryUsage.rss(), cpu: process.cpuUsage(), uptime: process.uptime() }
}

async function start() {
  const catalog = await channel.request('catalog')
  async function mount(plugin, config) { await ctx.plugin(plugin.default ?? plugin, config).await() }
  for (const plugin of [Llm, Sessions, Projections, Prompt, Tools, Executor, Agents, Typert, Access, Gate, Store, Commands]) {
    await mount(plugin)
  }
  await mount({ apply(local) { new HostConnectionService(local, [], {}) } })
  await mount(Persistence, { root: join(home, 'sessions'), compression: 'none' })
  await mount(Json, { root: join(home, 'metadata') })
  await mount(Domains, { backend: 'json' })
  await mount(Workspaces)
  await mount(Query, { path: join(home, 'search.sqlite'), openAt: 'first-search' })
  await mount(DefaultModel, catalog.selection)
  await mount(Attachments, { dshHome: home })
  await mount(Uploads)
  ctx.provide('fs', { processPathFromHostPath: () => undefined })
  await mount(Loop, { agents: [] })
  await mount(Controller, { nativeOpen: false })
  for (const { header } of await ctx.sessionPersistence.list()) sessionIds.add(header.id)
  ctx.on('session/created', session => sessionIds.add(session.id))

  class ModelBroker extends LlmAdapter {
    async listModels(provider) { return catalog.models[provider] ?? [] }
    async resolveModel(provider, model) { return catalog.models[provider]?.find(info => info.id === model) }
    async *stream({ provider, model, reasoningEffort, messages, tools, signal }) {
      if (tools?.length) throw new Error('Direct Chat is text only')
      const id = randomUUID()
      await channel.request('model', { id, provider, model, reasoningEffort,
        messages: messages.map(({ role, content }) => ({ role, content })) })
      const cancel = () => { void channel.request('model-close', { id }).catch(() => {}) }
      signal?.addEventListener('abort', cancel, { once: true })
      try {
        for (;;) {
          signal?.throwIfAborted()
          const item = await channel.request('model-next', { id })
          if (item.done) break
          yield item.value
        }
      } finally {
        signal?.removeEventListener('abort', cancel)
        await channel.request('model-close', { id }).catch(() => {})
      }
    }
  }
  ctx.llm.registerAdapter(Object.keys(catalog.models), new ModelBroker())
  const global = { kind: 'global' }
  const allow = { kind: 'allow' }
  const deny = { kind: 'deny', reason: 'direct-chat-text-only' }
  ctx.remoteAccess.registerPolicy('direct-chat-fixture', { bindings(principal) {
    if (!peers.has(principal.id)) return []
    return [{ role: { name: 'catalog', resource: 'global', actions: globalCalls }, resource: global }, {
      role: { name: 'create', resource: 'global', actions: ['session/create'] }, resource: global,
      condition: ({ args }) => args?.request?.cwd === home && Object.keys(args.request).length === 1 ? allow : deny,
    }, ...[...sessionIds].map(id => ({
      role: { name: 'chat', resource: 'session', actions: sessionCalls }, resource: { kind: 'session', id },
      condition: ({ action, args }) => action !== 'session/prompt'
        || (Array.isArray(args?.request?.content) && args.request.content.length > 0
          && args.request.content.every(block => block.type === 'text')) ? allow : deny,
    }))]
  } })
  ctx.effect(() => ctx.typertGateway.registerRemoteEvents(async function* (signal) {
    if (!signal.aborted) await new Promise(resolveWait => signal.addEventListener('abort', resolveWait, { once: true }))
  }, { home: '' }))
  return ctx.connection.createSharedFetchHandler('/api')
}

async function revoke(id) {
  const record = peers.get(id)
  if (!record) return
  peers.delete(id)
  await Promise.all([record.peer.dispose(), record.streams.dispose()])
}

let disposing
function dispose() {
  disposing ??= (async () => {
    await Promise.allSettled([...peers.keys()].map(revoke))
    await ctx.fiber.dispose()
  })()
  return disposing
}

// Native services keep handles open after disposal, so the dedicated companion exits once its parent disconnects.
channel.lifetime.addEventListener('abort', () => {
  void dispose().catch(() => { process.exitCode = 1 }).finally(() => process.exit())
}, { once: true })

async function handle(operation, data) {
  const handler = await ready
  if (operation === 'ready' || operation === 'stats') return metrics()
  if (operation === 'open') {
    if (peers.has(data.peer)) throw new Error('Duplicate Direct Chat peer')
    const peer = ctx.connection.createPeer({ principal: { kind: 'direct-chat-fixture', id: data.peer }, interactions: 'answer' })
    peers.set(data.peer, { peer, streams: streamTable() })
    return true
  }
  if (operation === 'shutdown') { await dispose(); return true }
  if (operation === 'revoke') { await revoke(data.peer); return true }
  const record = peers.get(data?.peer)
  if (!record) throw new Error('Unknown Direct Chat peer')
  if (operation === 'rpc') {
    const { endpoint, payload } = data
    if (!unary.has(endpoint) || payload?.method !== endpoint) throw new Error('Unavailable Direct Chat method')
    if (endpoint === 'session/create') {
      if (Object.keys(payload.payload?.args?.request ?? {}).length) throw new Error('Direct Chat chooses the directory')
      payload.payload.args.request = { cwd: home }
    }
    const response = await handler.fetch(new Request(`http://companion.test/api/${endpoint}`, { method: 'POST',
      headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }), record.peer)
    return { status: response.status, type: response.headers.get('content-type'), body: await response.text() }
  }
  if (operation === 'stream') {
    if (!streamed.has(data.endpoint)) throw new Error('Unavailable Direct Chat stream')
    const controller = new AbortController()
    try {
      const source = await ctx.typertGateway.wireStream.open(data.endpoint, data.payload, [], record.peer, controller.signal)
      if (peers.get(data.peer) !== record) throw new Error('Revoked Direct Chat peer')
      record.streams.open(data.id, source, controller)
    } catch (error) {
      controller.abort()
      throw error
    }
    return true
  }
  if (operation === 'next') return record.streams.next(data.id)
  if (operation === 'drop') { await record.streams.close(data.id); return true }
  throw new Error('Unknown Direct Chat operation')
}
