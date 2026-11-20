// Direct Chat Host plugin. Chats run in a companion process confined in a per-storage-root LPAC AppContainer
// (Windows only). The Host brokers model calls through its own configured provider, so credentials never
// reach the companion. There is no unconfined fallback: if confinement cannot be established, Direct Chat is
// unavailable. Routes are owner-authenticated Host routes; chat traffic additionally needs an expiring lease.
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { appendFile, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { bindChannel, streamTable } from './companion/channel.js'
import { profileNameFor } from './companion/grants.js'
import { CONFINEMENT_FAILED, startCompanion } from './host/companion-process.js'
import { RuntimeUnavailable, currentRuntime, provisionRuntime } from './host/runtime.js'
import {
  RETENTION_DAYS, StorageRefused, dataPaths, deleteAll, deleteChats, ensureDataFolders, inventory, migrateStorage,
  prepareEmptyRoot, readSettings, retentionCandidates, storageRoot, usage, validateStorageRoot, writeSettings,
} from './host/storage.js'

export const name = 'abinadwan-direct-chat'
export const inject = ['connection', 'llm', 'agentDefaultModel']
const prefix = '/api/abinadwan-direct-chat/'
const peerLeaseMs = 90_000
const maxModelStreams = 2
export const DELETE_ALL_CONFIRMATION = 'DELETE ALL DIRECT CHATS'
const FIBER_UNLOADING = 5

// What Direct Chat offers, and why the rest stays switched off. Shown on its Settings page.
export const CAPABILITIES = [
  ['chat', 'available', 'Text chats with streaming replies, model selection and independent history.'],
  ['markdown', 'available', 'Replies render as Markdown without HTML, images or remote content.'],
  ['text-files', 'available', 'Text files up to 256 KB are added to the message as quoted text.'],
  ['images', 'gated', 'The configured provider does not accept image input through Direct Chat.'],
  ['web-search', 'gated', 'Web search would give the companion network reach. It needs a separate permission design.'],
  ['tools', 'gated', 'Direct Chat runs without tools, files or terminals by design.'],
].map(([id, status, detail]) => ({ id, status, detail }))

class UnknownPeer extends Error {}
class Unavailable extends Error {}

export async function apply(ctx) {
  const diagnostics = process.env.ABINADWAN_DIRECT_CHAT_DIAGNOSTICS === '1'
  const routes = {}
  const json = value => Response.json(value, { headers: { 'cache-control': 'no-store' } })
  const register = () => {
    for (const [route, handler] of Object.entries(routes)) {
      ctx.effect(() => ctx.connection.fetch.register({ path: prefix + route, methods: ['POST'], requestBody: 'buffered',
        async fetch(request) {
          try {
            const source = await request.text()
            if (source.length > 512 * 1024) return new Response(null, { status: 413 })
            const data = source ? JSON.parse(source) : {}
            if (!data || Array.isArray(data) || typeof data !== 'object') return new Response(null, { status: 400 })
            return await handler(data, request.signal)
          } catch (error) {
            if (diagnostics) console.error('[Direct Chat]', route, error)
            const message = error instanceof StorageRefused || error instanceof Unavailable || error instanceof RuntimeUnavailable
              ? error.message : 'Direct Chat is unavailable right now.'
            return Response.json({ error: 'direct-chat-unavailable', message },
              { status: error instanceof UnknownPeer ? 410 : 409, headers: { 'cache-control': 'no-store' } })
          }
        },
      }))
    }
  }

  if (process.platform !== 'win32') {
    routes.status = async () => json({ available: false, error: 'Direct Chat needs Windows process confinement.',
      capabilities: CAPABILITIES })
    register()
    return
  }

  const paths = dataPaths()
  ensureDataFolders(paths)
  let settings = readSettings(paths.state)
  const peers = new Map()
  let phase = 'idle'
  let lastError = ''
  let lastStartup
  let lastRetention
  let opening = 0
  let child
  let start
  let stop
  let idle
  let maintenance
  let disposed = false

  const record = (kind, data = {}) => {
    if (!diagnostics) return Promise.resolve()
    return appendFile(join(paths.state, 'metrics.jsonl'), `${JSON.stringify({ kind, at: Date.now(), ...data })}\n`).catch(() => {})
  }
  // A short, bounded lifecycle trail (enable, stop, removal) so cleanup decisions can be checked afterwards.
  async function trail(event) {
    const file = join(paths.state, 'lifecycle.log')
    const lines = (await readFile(file, 'utf8').catch(() => '')).split('\n').filter(Boolean).slice(-49)
    await writeFile(file, `${[...lines, `${new Date().toISOString()} ${event}`].join('\n')}\n`).catch(() => {})
  }
  const assertPeer = ({ peer }) => {
    if (!child || typeof peer !== 'string' || (peers.get(peer) ?? 0) <= Date.now()) throw new UnknownPeer()
    return child
  }

  async function launch() {
    if (stop) await stop
    if (disposed) throw new Unavailable('Direct Chat is turned off.')
    if (start) return start
    if (child) return child
    start = (async () => {
      const begun = performance.now()
      phase = 'preparing'
      lastError = ''
      const snapshot = await provisionRuntime(paths.runtime)
      await applyRetention()
      const home = storageRoot(paths, settings)
      phase = 'starting'
      // Always confined. A launch that cannot establish the AppContainer exits without a companion.
      const { proc, port, exited } = startCompanion({ node: snapshot.node, runtime: snapshot.runtime, app: snapshot.app,
        read: [snapshot.root], home, state: paths.state, diagnostics })
      const flows = streamTable()
      let modelCatalog
      const link = bindChannel(port, async (operation, data, signal) => {
        if (operation === 'catalog') {
          const selection = ctx.agentDefaultModel.currentSelection()
          const models = await Promise.all((await ctx.llm.listModels(selection.provider)).map(async ({ id }) => {
            const { name: label, context, reasoning } = await ctx.llm.resolveModelInfo(selection.provider, id, signal)
            return { id, name: label, provider: selection.provider, context, reasoning, inputModalities: ['text'] }
          }))
          if (!models.some(model => model.id === selection.model)) throw new Error('The default model is unavailable')
          modelCatalog = { models: { [selection.provider]: models }, selection }
          return modelCatalog
        }
        if (operation === 'model') {
          const { id, provider, model, reasoningEffort, messages } = data
          if (!Object.hasOwn(modelCatalog?.models ?? {}, provider)
            || !modelCatalog.models[provider].some(info => info.id === model) || !Array.isArray(messages)) {
            throw new Error('Unavailable Direct Chat model')
          }
          const history = messages.map(({ role, content }) => {
            if (!['assistant', 'system', 'user'].includes(role) || !Array.isArray(content)
              || content.some(block => block.type !== 'text' || typeof block.text !== 'string')) {
              throw new Error('Direct Chat request must contain text only')
            }
            const text = content.map(({ text }) => ({ type: 'text', text }))
            return { role, content: text, ...(role === 'assistant' ? { source: { kind: 'model', provider, model } } : {}) }
          })
          // Provider calls spend the owner's credentials: only while an owner window holds a live lease,
          // and never more than a turn's worth at once, whatever the companion asks for.
          const admitted = () => [...peers.values()].some(until => until > Date.now()) && flows.size < maxModelStreams
          if (!admitted()) throw new Error('Direct Chat model call not admitted')
          const controller = new AbortController()
          const prepared = await ctx.llm.prepareCall({ provider, model, reasoningEffort }, signal)
          if (!admitted()) throw new Error('Direct Chat model call not admitted')
          flows.open(id, prepared.stream({ ...prepared.config, messages: history,
            signal: AbortSignal.any([signal, controller.signal]) }), controller)
          void record('model-call', { provider, model, reasoningEffort })
          return true
        }
        if (operation === 'model-next') return flows.next(data.id)
        if (operation === 'model-close') { await flows.close(data.id); return true }
        throw new Error('Unknown Direct Chat worker operation')
      })
      const instance = { link, proc, port, exited, flows }
      void exited.then(([code, signal]) => {
        if (child === instance) { child = undefined; peers.clear(); phase = 'idle' }
        void flows.dispose()
        if (code === CONFINEMENT_FAILED) lastError = 'Direct Chat could not establish its process confinement.'
        void record('exit', { code, signal, requested: instance.requested === true, confinementFailed: code === CONFINEMENT_FAILED })
      })
      try {
        const metrics = await bounded(link.request('ready'), 20_000)
        lastStartup = { ...metrics, startupMs: Math.round(performance.now() - begun), at: Date.now() }
        void record('startup', lastStartup)
        child = instance
        phase = 'running'
        return instance
      } catch {
        proc.kill()
        const [code] = await exited
        throw new Unavailable(code === CONFINEMENT_FAILED
          ? 'Direct Chat could not establish its process confinement.' : 'The Direct Chat companion did not start.')
      }
    })()
    try { return await start }
    catch (error) {
      phase = 'failed'
      void trail(`launch failed: ${error?.name ?? 'Error'}: ${String(error?.message ?? error).slice(0, 300)}`)
      lastError = error instanceof Unavailable || error instanceof RuntimeUnavailable || error instanceof StorageRefused
        ? error.message : 'Direct Chat could not start.'
      throw error
    } finally { start = undefined }
  }

  async function shutdown() {
    if (stop) return stop
    const instance = child
    if (!instance) return
    instance.requested = true
    child = undefined
    peers.clear()
    stop = (async () => {
      try {
        await instance.flows.dispose()
        await bounded(instance.link.request('shutdown'), 5000)
        instance.port.disconnect()
        await bounded(instance.exited, 5000)
      } catch {
        instance.proc.kill()
        await instance.exited
      }
    })()
    try { await stop }
    finally { stop = undefined }
  }

  function scheduleIdle() {
    clearTimeout(idle)
    if (!peers.size && !opening && !disposed) idle = setTimeout(() => { void shutdown() }, 5000).unref()
  }

  async function revoke(peer) {
    peers.delete(peer)
    try { await child?.link.request('revoke', { peer }) }
    finally { scheduleIdle() }
  }

  /** Run a storage or access operation with every window disconnected and no companion running. */
  function maintain(task) {
    const run = (maintenance ?? Promise.resolve()).then(async () => {
      phase = 'maintenance'
      await start?.catch(() => {})
      peers.clear()
      await shutdown()
      try { return await task() }
      finally { phase = 'idle' }
    })
    const tracked = run.catch(() => {}).finally(() => { if (maintenance === tracked) maintenance = undefined })
    maintenance = tracked
    return run
  }

  async function applyRetention() {
    if (!settings.retentionDays) return
    const home = storageRoot(paths, settings)
    try {
      const candidates = await retentionCandidates(home, settings.retentionDays)
      const result = candidates.length ? await deleteChats(home, candidates.map(chat => chat.id)) : { deleted: [] }
      lastRetention = { at: Date.now(), deleted: result.deleted.length }
      if (result.deleted.length) void trail(`retention deleted ${result.deleted.length}`)
    } catch (error) {
      lastRetention = { at: Date.now(), deleted: 0, error: error instanceof StorageRefused ? error.message : 'Retention failed' }
    }
  }

  /** Revoke every recorded grant (optionally keeping one profile's) and delete those AppContainer profiles. */
  async function revokeAccess(keepProfile) {
    let snapshot = await currentRuntime(paths.runtime)
    if (!snapshot) {
      try { snapshot = await provisionRuntime(paths.runtime) }
      catch { return { ok: false, detail: 'Cleanup needs the Direct Chat runtime copy.' } }
    }
    const args = [join(snapshot.app, 'cleanup.mjs'), snapshot.runtime, '--state', paths.state,
      ...(keepProfile ? ['--keep-profile', keepProfile] : [])]
    const cleanup = spawn(snapshot.node, args, { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'],
      env: { SystemRoot: process.env.SystemRoot, WINDIR: process.env.WINDIR } })
    let stderr = ''
    cleanup.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-2000) })
    const [code] = await new Promise(done => cleanup.once('exit', (...result) => done(result)))
    return code === 0 ? { ok: true } : { ok: false, detail: stderr.trim() || `Cleanup exited with ${code}` }
  }

  /** Withdraw every grant, delete the profiles and the runtime copy. Chats stay in their storage folder. */
  async function removeSystemAccess() {
    const result = await revokeAccess()
    if (!result.ok) return result
    await rm(paths.runtime, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
    ensureDataFolders(paths)
    return { ok: true }
  }

  async function status() {
    const home = storageRoot(paths, settings)
    const runtime = await currentRuntime(paths.runtime)
    let chats = []
    let space = { bytes: 0, files: 0 }
    let storageError = ''
    try {
      chats = await inventory(home)
      space = await usage(home)
    } catch (error) { storageError = error instanceof StorageRefused ? error.message : 'The storage folder is unavailable.' }
    const candidates = settings.retentionDays ? await retentionCandidates(home, settings.retentionDays).catch(() => []) : []
    return {
      available: true, phase, error: lastError, windows: peers.size,
      storage: { path: home, isDefault: home === paths.defaultStorage, defaultPath: paths.defaultStorage,
        previous: settings.previousStorage, chats: chats.length, bytes: space.bytes, error: storageError },
      runtime: runtime ? { path: runtime.root, bytes: runtime.info.bytes, files: runtime.info.files } : null,
      startup: lastStartup ? { ms: lastStartup.startupMs, rss: lastStartup.rss } : null,
      retention: { days: settings.retentionDays, choices: RETENTION_DAYS, candidates: candidates.length, last: lastRetention ?? null },
      capabilities: CAPABILITIES,
    }
  }

  // Chat carrier: open a lease, renew it, close it, and relay the companion's native session calls.
  Object.assign(routes, {
    async open(_data, signal) {
      clearTimeout(idle)
      opening++
      try {
        if (maintenance) await bounded(maintenance, 120_000)
        const instance = await launch()
        signal.throwIfAborted()
        const peer = randomUUID()
        await instance.link.request('open', { peer })
        if (signal.aborted) { await instance.link.request('revoke', { peer }); signal.throwIfAborted() }
        if (child !== instance || disposed || maintenance) throw new UnknownPeer()
        peers.set(peer, Date.now() + peerLeaseMs)
        return json({ peer })
      } finally { opening--; scheduleIdle() }
    },
    async close(data) {
      assertPeer(data)
      await revoke(data.peer)
      return new Response(null, { status: 204 })
    },
    async renew(data) {
      assertPeer(data)
      peers.set(data.peer, Date.now() + peerLeaseMs)
      return new Response(null, { status: 204 })
    },
    async rpc(data) {
      const { status: code, type, body } = await assertPeer(data).link.request('rpc', data)
      return new Response(body, { status: code, headers: { 'content-type': type || 'application/json' } })
    },
    async stream(data, signal) {
      const { link } = assertPeer(data)
      const request = { ...data, id: randomUUID() }
      await link.request('stream', request)
      const encoder = new TextEncoder()
      let ended = false
      async function close() {
        if (ended) return
        ended = true
        signal.removeEventListener('abort', cancel)
        await link.request('drop', request).catch(() => {})
      }
      const cancel = () => { void close() }
      signal.addEventListener('abort', cancel, { once: true })
      if (signal.aborted) cancel()
      return new Response(new ReadableStream({
        async pull(controller) {
          try {
            if (ended) { controller.close(); return }
            const item = await link.request('next', request)
            if (item.done || ended) { await close(); controller.close(); return }
            controller.enqueue(encoder.encode(`${JSON.stringify({ value: item.value })}\n`))
          } catch {
            if (!ended) controller.enqueue(encoder.encode('{"error":true}\n'))
            await close()
            controller.close()
          }
        }, cancel: close,
      }), { headers: { 'content-type': 'application/x-ndjson', 'cache-control': 'no-store' } })
    },
  })

  // Settings, storage, deletion and access management.
  Object.assign(routes, {
    status: async () => json(await status()),
    chats: async () => json({ chats: await inventory(storageRoot(paths, settings)) }),
    delete: async data => json(await maintain(() => deleteChats(storageRoot(paths, settings), data.ids))),
    async 'delete-all'(data) {
      if (data.confirmation !== DELETE_ALL_CONFIRMATION) throw new StorageRefused('Type the confirmation exactly to delete all chats')
      return json(await maintain(async () => {
        const result = await deleteAll(storageRoot(paths, settings))
        void trail('deleted all chats')
        return result
      }))
    },
    async storage(data) {
      return json(await maintain(async () => {
        const current = storageRoot(paths, settings)
        let next
        if (data.mode === 'default') {
          next = paths.defaultStorage
          if (next === current) throw new StorageRefused('The default folder is already in use')
        } else {
          if (!['migrate', 'switch'].includes(data.mode)) throw new StorageRefused('Choose how to change the storage folder')
          const target = await validateStorageRoot(data.path, paths)
          if (target.path.toLowerCase() === current.toLowerCase()) throw new StorageRefused('This is already the storage folder')
          if (data.mode === 'migrate') {
            if (target.kind !== 'empty') throw new StorageRefused('Migration needs an empty folder')
            await migrateStorage(current, target.path)
          } else if (target.kind === 'empty') prepareEmptyRoot(target.path)
          next = target.path
        }
        settings = { ...settings, storage: next === paths.defaultStorage ? null : next, previousStorage: current }
        writeSettings(paths.state, settings)
        void trail(`storage ${data.mode}`)
        // The previous root's identity no longer needs any access. Its files stay where they are.
        const revoked = await revokeAccess(profileNameFor(next))
        return { path: next, previous: current, accessRevoked: revoked.ok }
      }))
    },
    async retention(data) {
      const days = data.days === null ? null : Number(data.days)
      if (days !== null && !RETENTION_DAYS.includes(days)) throw new StorageRefused('Unsupported retention period')
      settings = { ...settings, retentionDays: days }
      writeSettings(paths.state, settings)
      return json({ days })
    },
    async 'retention-preview'(data) {
      const days = Number(data.days)
      if (!RETENTION_DAYS.includes(days)) throw new StorageRefused('Unsupported retention period')
      return json({ candidates: await retentionCandidates(storageRoot(paths, settings), days) })
    },
    'retention-run': async () => json(await maintain(async () => { await applyRetention(); return lastRetention ?? {} })),
    'remove-access': async () => json(await maintain(async () => {
      const result = await removeSystemAccess()
      void trail(`system access removed ok=${result.ok}`)
      return result
    })),
  })
  register()

  ctx.effect(() => {
    void trail('enabled')
    const sweep = setInterval(() => {
      for (const [peer, expires] of peers) if (expires <= Date.now()) void revoke(peer).catch(() => {})
    }, 5000).unref()
    return async () => {
      disposed = true
      clearInterval(sweep)
      clearTimeout(idle)
      await start?.catch(() => {})
      await maintenance
      await shutdown()
      // Turned off or uninstalled while the Host keeps running: withdraw every grant and delete the
      // AppContainer profile and runtime copy. Chats stay in their storage folder. A Host shutdown or package
      // reload unloads an ancestor first and keeps access, so the next start stays fast.
      if (removedWhileHostRuns(ctx)) {
        const result = await removeSystemAccess().catch(() => ({ ok: false }))
        await trail(`disabled; system access removed ok=${result.ok}`)
      } else await trail('stopped with the Host')
    }
  })
}

/** True when only this plugin is being removed: its fiber is gone while every ancestor stays active. */
export function removedWhileHostRuns(ctx) {
  if (ctx.fiber.uid !== null) return false
  for (let context = ctx.fiber.parent; context; ) {
    const fiber = context.fiber
    if (!fiber || fiber.state === FIBER_UNLOADING || fiber.uid === null) return false
    if (fiber.uid === 0 || fiber.parent === context) break
    context = fiber.parent
  }
  return true
}

async function bounded(task, ms) {
  let timer
  try {
    return await Promise.race([task, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Direct Chat deadline expired')), ms).unref()
    })])
  } finally { clearTimeout(timer) }
}
