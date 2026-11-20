import Schema from '@deepseek-ai/schemastery'
import { MessageEfforts } from './efforts.js'
import { isSubagent, readObject, sameRoute } from './http.js'
import { ReasoningStats } from './stats.js'

export const name = 'abinadwan-adaptive-reasoning'
const identifier = Schema.string().min(1).max(256).required()
export const Config = Schema.object({
  record: Schema.object({
    preferences: Schema.array(Schema.object({ provider: identifier, model: identifier, effort: identifier })).max(200).default([]),
    // Adaptive is chosen explicitly by the user; Manual keeps the session's own effort.
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
    const turns = new MessageEfforts(child.agents, child.llm, record, stats)
    route('/api/abinadwan-reasoning/effort',
      request => applySessionEffort(request, child.agents, child.llm, () => record().preferences))
    route('/api/abinadwan-reasoning/next', request => turns.bind(request))
    route('/api/abinadwan-reasoning/next/status', request => turns.status(request))
    route('/api/abinadwan-reasoning/next/withdraw', request => turns.withdraw(request))
    route('/api/abinadwan-reasoning/stats', async request => await readObject(request, [])
      ? Response.json(stats.snapshot()) : Response.json({ error: 'invalid-request' }, { status: 400 }))
    route('/api/abinadwan-reasoning/stats/reset', async request => {
      if (!await readObject(request, [])) return Response.json({ error: 'invalid-request' }, { status: 400 })
      stats.reset()
      return Response.json(stats.snapshot())
    })
    child.on('agent/created', ({ agent }) => turns.created(agent))
    child.on('agent/inbox/inserted', ({ agent, message }) => turns.inserted(agent, message))
    child.on('agent/inbox/claimed', ({ agent, message, turn }) => turns.claimed(agent, message, turn))
    child.on('agent/inbox/discarded', ({ agent, message }) => turns.discarded(agent, message))
    child.on('agent/status', ({ agent, status }) => { if (status === 'idle') turns.restore(agent, 'finished') })
    child.on('agent/disposed', ({ agent }) => turns.ended(agent))
    child.on('agent/assistant-stream', ({ agent, frame }) => turns.stream(agent, frame))
    child.on('session/event', (session, event) => turns.event(session, event))
    child.effect(() => () => turns.dispose())
  })
}


/** Apply to a resident root Agent without changing the native default for other sessions. */
async function applySessionEffort(request, agents, llm, readPreferences) {
  const input = await readObject(request, ['sessionId', 'provider', 'model', 'reasoningEffort'], { mode: 'manual' })
  if (!input) return Response.json({ error: 'invalid-selection' }, { status: 400 })
  const { sessionId, mode, ...selection } = input
  const agent = agents.get(sessionId)
  if (!agent || isSubagent(agent)) return Response.json({ error: 'session-unavailable' }, { status: 409 })
  const current = agent.model.current()
  if (!sameRoute(current, selection)) return Response.json({ error: 'route-changed' }, { status: 409 })
  try {
    await llm.resolveCallConfig(selection, request.signal)
    request.signal.throwIfAborted()
    const latest = agent.model.current()
    if (agents.get(sessionId) !== agent || !sameRoute(latest, selection) || latest.reasoningEffort !== current.reasoningEffort) {
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
