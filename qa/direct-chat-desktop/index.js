import { randomUUID } from 'node:crypto'
import { appendFile, mkdir, realpath } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { bindChannel, streamTable } from './channel.js'
import { CONFINEMENT_FAILED, startCompanion } from './companion-process.js'

export const name = 'abinadwan-direct-chat-desktop-fixture'
export const inject = ['connection', 'llm', 'agentDefaultModel']
const prefix = '/api/abinadwan-direct-chat-fixture/'
const peerLeaseMs = 90_000

class UnknownPeer extends Error {}

export async function apply(ctx) {
  const fixtureHome = process.env.DSH_HOME
  const runtimePath = process.env.ABINADWAN_D2_RUNTIME
  if (process.platform !== 'win32' || !fixtureHome || !runtimePath || process.env.ABINADWAN_D2_FIXTURE !== '1'
    || basename(fixtureHome) !== '.fixture-harness-home' || basename(dirname(fixtureHome)) !== '.package-check-dsh') return
  const verifiedHome = await realpath(fixtureHome)
  if (verifiedHome !== fixtureHome) throw new Error('Direct Chat fixture root differs from its canonical path')
  const runtime = await realpath(runtimePath)
  if (!process.env.ABINADWAN_D2_NODE) throw new Error('Direct Chat needs ABINADWAN_D2_NODE for its confined runtime')
  const node = await realpath(process.env.ABINADWAN_D2_NODE)
  const fixtureRootName = process.env.ABINADWAN_D2_FIXTURE_HOME ?? '.direct-chat-d2-home'
  if (!/^\.direct-chat-d2-[a-z0-9-]+$/.test(fixtureRootName)) throw new Error('Invalid Direct Chat fixture root name')
  const home = join(dirname(verifiedHome), fixtureRootName)
  await mkdir(home, { recursive: true })
  if (await realpath(home) !== home) throw new Error('Direct Chat fixture home is redirected')

  const measure = (kind, metrics) => appendFile(join(home, 'metrics.jsonl'),
    `${JSON.stringify({ kind, at: Date.now(), ...metrics })}\n`)
  const peers = new Map()
  let opening = 0
  let child
  let start
  let stop
  let idle
  let disposed = false
  const assertPeer = ({ peer }) => {
    if (!child || (peers.get(peer) ?? 0) <= Date.now()) throw new UnknownPeer()
    return child
  }

  async function launch() {
    if (stop) await stop
    if (disposed) throw new Error('Direct Chat is unavailable')
    if (start) return start
    if (child) return child
    start = (async () => {
      const begun = performance.now()
      // Always confined. A launch that cannot establish the AppContainer exits without a companion.
      const { proc, port, exited } = startCompanion({ node, runtime, home,
        diagnostics: process.env.ABINADWAN_D2_DIAGNOSTICS === '1' })
      const flows = streamTable()
      const activeSamples = new Map()
      let modelCatalog
      const link = bindChannel(port, async (operation, data, signal) => {
        if (operation === 'catalog') {
          const selection = ctx.agentDefaultModel.currentSelection()
          const models = await Promise.all((await ctx.llm.listModels(selection.provider)).map(async ({ id }) => {
            const { name, context, reasoning } = await ctx.llm.resolveModelInfo(selection.provider, id, signal)
            return { id, name, provider: selection.provider, context, reasoning, inputModalities: ['text'] }
          }))
          if (!models.some(model => model.id === selection.model)) throw new Error('Fixture model is unavailable')
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
          const controller = new AbortController()
          const prepared = await ctx.llm.prepareCall({ provider, model, reasoningEffort }, signal)
          flows.open(id, prepared.stream({ ...prepared.config, messages: history,
            signal: AbortSignal.any([signal, controller.signal]) }), controller)
          activeSamples.set(id, sample('active-start', id))
          return true
        }
        if (operation === 'model-next') return flows.next(data.id)
        if (operation === 'model-close') {
          await flows.close(data.id)
          const first = activeSamples.get(data.id)
          activeSamples.delete(data.id)
          if (first) void first.then(() => sample('active-end', data.id))
          return true
        }
        throw new Error('Unknown Direct Chat worker operation')
      })
      function sample(kind, modelCall) {
        return link.request('stats').then(metrics => measure(kind, { ...metrics, modelCall })).catch(() => {})
      }
      const instance = { link, proc, port, exited, flows }
      void exited.then(([code, signal]) => {
        if (child === instance) { child = undefined; peers.clear() }
        void flows.dispose()
        void measure('exit', { launcherPid: proc.pid, code, signal, requested: instance.requested === true,
          confinementFailed: code === CONFINEMENT_FAILED }).catch(() => {})
      })
      try {
        const metrics = await bounded(link.request('ready'), 12_000)
        await measure('startup', { ...metrics, startupMs: performance.now() - begun })
        child = instance
        return instance
      } catch (error) {
        proc.kill()
        await exited
        throw error
      }
    })()
    try { return await start }
    finally { start = undefined }
  }

  async function shutdown() {
    if (stop) return stop
    const instance = child
    if (!instance) return
    instance.requested = true
    child = undefined
    peers.clear()
    stop = (async () => {
      const step = name => measure('shutdown-step', { step: name, pid: instance.proc.pid }).catch(() => {})
      try {
        await step('begin')
        await instance.flows.dispose()
        await step('flows-disposed')
        await bounded(instance.link.request('shutdown'), 5000)
        await step('worker-disposed')
        instance.port.disconnect()
        const result = await bounded(instance.exited, 5000)
        await measure('shutdown', { exitCode: result?.[0] })
      } catch (error) {
        await step(`failed: ${error?.message}`)
        instance.proc.kill()
        await instance.exited
        await measure('forced-shutdown', {})
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
    void measure('revoke', { peers: peers.size }).catch(() => {})
    try { await child?.link.request('revoke', { peer }) }
    finally { scheduleIdle() }
  }

  const routes = {
    async open(_data, signal) {
      clearTimeout(idle)
      opening++
      try {
        const instance = await launch()
        signal.throwIfAborted()
        const peer = randomUUID()
        await instance.link.request('open', { peer })
        if (signal.aborted) { await instance.link.request('revoke', { peer }); signal.throwIfAborted() }
        if (child !== instance || disposed) throw new UnknownPeer()
        peers.set(peer, Date.now() + peerLeaseMs)
        for (const delay of [1000, 3000]) {
          setTimeout(() => {
            if (child === instance) void instance.link.request('stats').then(metrics => measure('open-sample', metrics)).catch(() => {})
          }, delay).unref()
        }
        return Response.json({ peer, testWorkspaceSession: process.env.ABINADWAN_D2_TEST_WORKSPACE_SESSION },
          { headers: { 'cache-control': 'no-store' } })
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
      const { status, type, body } = await assertPeer(data).link.request('rpc', data)
      return new Response(body, { status, headers: { 'content-type': type || 'application/json' } })
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
  }
  for (const [name, route] of Object.entries(routes)) {
    ctx.effect(() => ctx.connection.fetch.register({ path: prefix + name, methods: ['POST'], requestBody: 'buffered',
      async fetch(request) {
        try {
          const source = await request.text()
          if (source.length > 256 * 1024) return new Response(null, { status: 413 })
          const data = JSON.parse(source)
          if (!data || Array.isArray(data) || typeof data !== 'object') return new Response(null, { status: 400 })
          return await route(data, request.signal)
        } catch (error) {
          if (process.env.ABINADWAN_D2_DIAGNOSTICS === '1') console.error('[Direct Chat fixture]', name, error)
          return Response.json({ error: 'direct-chat-unavailable' }, { status: error instanceof UnknownPeer ? 410 : 409 })
        }
      },
    }))
  }
  ctx.effect(() => {
    const sweep = setInterval(() => {
      for (const [peer, expires] of peers) if (expires <= Date.now()) void revoke(peer).catch(() => {})
    }, 5000).unref()
    return async () => {
      disposed = true
      clearInterval(sweep)
      clearTimeout(idle)
      await start?.catch(() => {})
      await shutdown()
    }
  })
}

async function bounded(task, ms) {
  let timer
  try {
    return await Promise.race([task, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Direct Chat deadline expired')), ms).unref()
    })])
  } finally { clearTimeout(timer) }
}
