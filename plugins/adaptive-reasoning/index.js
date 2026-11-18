import Schema from '@deepseek-ai/schemastery'

export const name = 'abinadwan-adaptive-reasoning'
const identifier = Schema.string().min(1).max(256).required()
export const Config = Schema.object({
  record: Schema.object({
    preferences: Schema.array(Schema.object({ provider: identifier, model: identifier, effort: identifier })).max(200).default([]),
  }).default({ preferences: [] }).volatile(),
})

export function apply(ctx, config) {
  ctx.inject(['settings'], child => child.effect(() => child.settings.configure({ auto: false }, ctx.fiber)))
  ctx.inject(['connection', 'agents', 'llm'], child => {
    // Connection authenticates exact Fetch routes and only admits owner Peers.
    child.effect(() => child.connection.fetch.register({
      path: '/api/abinadwan-reasoning/effort', methods: ['POST'], requestBody: 'streaming',
      fetch: request => applySessionEffort(request, child.agents, child.llm, () => config.record.get().preferences),
    }))
  })
}

async function readSelection(request) {
  if (request.headers.get('content-type')?.split(';', 1)[0] !== 'application/json' || !request.body) return null
  const reader = request.body.getReader()
  const decoder = new TextDecoder('utf-8', { fatal: true })
  let total = 0
  let input = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > 4096) { await reader.cancel(); return null }
      input += decoder.decode(value, { stream: true })
    }
    const data = JSON.parse(input + decoder.decode())
    const keys = ['sessionId', 'provider', 'model', 'reasoningEffort']
    if (data && Object.keys(data).length === keys.length && keys.every(key =>
      Object.hasOwn(data, key) && typeof data[key] === 'string' && data[key].length > 0 && data[key].length <= 256)) return data
    return null
  } catch { return null }
  finally { reader.releaseLock() }
}

const sameRoute = (current, selection) => current?.provider === selection.provider && current?.model === selection.model

/** Apply to a resident root Agent without changing the native default for other sessions. */
async function applySessionEffort(request, agents, llm, readPreferences) {
  const input = await readSelection(request)
  if (!input) return Response.json({ error: 'invalid-selection' }, { status: 400 })
  const { sessionId, ...selection } = input
  const agent = agents.get(sessionId)
  if (!agent || agent.session.header.origin === 'subagent') return Response.json({ error: 'session-unavailable' }, { status: 409 })
  if (!sameRoute(agent.model.current(), selection)) return Response.json({ error: 'route-changed' }, { status: 409 })
  try {
    await llm.resolveCallConfig(selection, request.signal)
    request.signal.throwIfAborted()
    if (agents.get(sessionId) !== agent || !sameRoute(agent.model.current(), selection)) {
      return Response.json({ error: 'route-changed' }, { status: 409 })
    }
    const saved = readPreferences().filter(row => sameRoute(row, selection))
    if (saved.length !== 1 || saved[0].effort !== selection.reasoningEffort) {
      return Response.json({ error: 'preference-changed' }, { status: 409 })
    }
    agent.model.select(selection)
    return Response.json({ selected: selection })
  } catch {
    return Response.json({ error: 'selection-unavailable' }, { status: 422 })
  }
}
