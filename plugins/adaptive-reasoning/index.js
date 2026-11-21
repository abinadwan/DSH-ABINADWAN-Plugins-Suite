import Schema from '@deepseek-ai/schemastery'
import { isSubagent, readObject, sameRoute, uuid } from './http.js'
import { ReasoningStats } from './stats.js'

export const name = 'abinadwan-adaptive-reasoning'
const identifier = Schema.string().min(1).max(256).required()
export const Config = Schema.object({
  record: Schema.object({
    preferences: Schema.array(Schema.object({ provider: identifier, model: identifier, effort: identifier })).max(200).default([]),
    // Keep legacy policy fields readable. This runtime only applies explicit session changes.
    mode: Schema.union(['manual', 'adaptive']).default('manual'),
    subagents: Schema.union(['inherit', 'default', 'adaptive', 'effort']).default('inherit'),
    subagentEffort: Schema.string().min(1).max(256),
  }).default({ preferences: [], mode: 'manual', subagents: 'inherit' }).volatile(),
})

export function apply(ctx, config) {
  ctx.inject(['settings'], child => child.effect(() => child.settings.configure({ auto: false }, ctx.fiber)))
  ctx.inject(['connection', 'agents', 'llm'], child => {
    const record = () => config.record.get()
    // Connection authenticates exact Fetch routes and only admits owner Peers.
    const route = (path, handle) => child.effect(() => child.connection.fetch.register({
      path, methods: ['POST'], requestBody: 'streaming', fetch: handle,
    }))
    const stats = new ReasoningStats()
    const revisions = { active: true, adapters: 0, selections: new WeakMap() }
    route('/api/abinadwan-reasoning/effort',
      request => applySessionEffort(request, child.agents, child.llm, () => record().preferences, revisions))
    const identity = ['sessionId', 'requestId']
    route('/api/abinadwan-reasoning/next',
      request => unavailable(request, [...identity, 'provider', 'model', 'reasoningEffort']))
    route('/api/abinadwan-reasoning/next/status', request => unavailable(request, identity))
    route('/api/abinadwan-reasoning/next/withdraw', request => unavailable(request, identity))
    route('/api/abinadwan-reasoning/stats', async request => await readObject(request, [])
      ? Response.json(stats.snapshot()) : Response.json({ error: 'invalid-request' }, { status: 400 }))
    route('/api/abinadwan-reasoning/stats/reset', async request => {
      if (!await readObject(request, [])) return Response.json({ error: 'invalid-request' }, { status: 400 })
      stats.reset()
      return Response.json(stats.snapshot())
    })
    child.on('llm/adapters-updated', () => { revisions.adapters++ })
    child.on('agent/assistant-stream', ({ agent, frame }) => stats.stream(agent.session, frame))
    child.on('session/event', (session, event) => {
      if (event.type === 'model/selection') {
        revisions.selections.set(session, (revisions.selections.get(session) ?? 0) + 1)
      }
      stats.event(session, event)
    })
    child.effect(() => () => { revisions.active = false })
  })
}

// The rc.3 and rc.5 Agent loops only accept durable model selection. Reject
// message-bound effort requests before storing any state or touching a session.
async function unavailable(request, keys) {
  const input = await readObject(request, keys)
  if (!input || !uuid.test(input.requestId)) return Response.json({ error: 'invalid-request' }, { status: 400 })
  return Response.json({ error: 'request-local-effort-unavailable' }, { status: 501 })
}

/** Apply to a resident root Agent without changing the native default for other sessions. */
async function applySessionEffort(request, agents, llm, readPreferences, revisions) {
  const input = await readObject(request, ['sessionId', 'provider', 'model', 'reasoningEffort'], { mode: 'manual' })
  if (!input) return Response.json({ error: 'invalid-selection' }, { status: 400 })
  const { sessionId, mode, ...selection } = input
  const agent = agents.get(sessionId)
  if (!agent || isSubagent(agent)) return Response.json({ error: 'session-unavailable' }, { status: 409 })
  const current = agent.model.current()
  if (!sameRoute(current, selection)) return Response.json({ error: 'route-changed' }, { status: 409 })
  const adapterRevision = revisions.adapters
  const selectionRevision = revisions.selections.get(agent.session)
  try {
    await llm.resolveCallConfig(selection, request.signal)
    request.signal.throwIfAborted()
    if (!revisions.active) return Response.json({ error: 'session-unavailable' }, { status: 409 })
    if (revisions.adapters !== adapterRevision) return Response.json({ error: 'capability-changed' }, { status: 409 })
    const latest = agent.model.current()
    if (agents.get(sessionId) !== agent || revisions.selections.get(agent.session) !== selectionRevision ||
        !sameRoute(latest, selection) || latest.reasoningEffort !== current.reasoningEffort) {
      return Response.json({ error: 'route-changed' }, { status: 409 })
    }
    if (mode !== 'manual') {
      const saved = readPreferences().filter(row => sameRoute(row, selection))
      if (saved.length !== 1 || saved[0].effort !== selection.reasoningEffort) {
        return Response.json({ error: 'preference-changed' }, { status: 409 })
      }
    }
    agent.model.select(selection)
    return Response.json({ selected: selection })
  } catch {
    return Response.json({ error: 'selection-unavailable' }, { status: 422 })
  }
}
