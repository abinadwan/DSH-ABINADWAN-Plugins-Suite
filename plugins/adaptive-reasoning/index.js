import Schema from '@deepseek-ai/schemastery'
import { isSubagent, readObject, sameRoute, uuid } from './http.js'
import { ReasoningStats } from './stats.js'
import { classify, effortForTier, TIERS } from './classify.js'
import { mergeCounters, openReasoningStats } from './storage.js'

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
    route('/api/abinadwan-reasoning/recommend',
      request => recommend(request, child.agents, child.llm, record, revisions))

    let timer
    let storage
    let carry
    let operations = Promise.resolve()
    const profile = child.get('profileContext')
    function disk() {
      return storage ??= openReasoningStats(profile.dir).catch(error => {
        storage = undefined
        throw error
      })
    }
    // Record the reset generation at activation and allow a later retry if
    // the file is temporarily unavailable.
    if (profile) void disk().catch(() => {})

    function snapshot(reset = false) {
      if (!profile) {
        if (reset) stats.reset()
        return Promise.resolve(stats.snapshot())
      }
      const operation = operations.then(async () => {
        const target = await disk()
        const counters = stats.takeCounters()
        if (carry) mergeCounters(counters, carry)
        if (reset) stats.reset()
        try {
          const result = await (reset ? target.reset() : target.save(counters))
          carry = null
          return result
        } catch (error) {
          // Preserve deltas on failures before the atomic replacement began.
          // An ambiguous write must never be replayed.
          carry = error.mayHaveWritten ? null : counters
          throw error
        }
      })
      operations = operation.catch(() => {})
      return operation
    }
    function schedule() {
      if (!profile || timer || !revisions.active) return
      timer = setTimeout(() => {
        timer = undefined
        void snapshot().catch(() => {})
      }, 5000)
      timer.unref()
    }
    async function statsResponse(request, reset) {
      if (!await readObject(request, [])) return Response.json({ error: 'invalid-request' }, { status: 400 })
      try {
        return Response.json(await snapshot(reset), { headers: { 'cache-control': 'no-store' } })
      } catch {
        return Response.json({ error: 'statistics-storage-unavailable' }, { status: 503 })
      }
    }
    route('/api/abinadwan-reasoning/stats', request => statsResponse(request, false))
    route('/api/abinadwan-reasoning/stats/reset', request => statsResponse(request, true))
    child.on('llm/adapters-updated', () => { revisions.adapters++ })
    child.on('agent/assistant-stream', ({ agent, frame }) => {
      stats.stream(agent.session, frame)
      if (frame.type === 'end') schedule()
    })
    child.on('session/event', (session, event) => {
      if (event.type === 'model/selection') {
        revisions.selections.set(session, (revisions.selections.get(session) ?? 0) + 1)
      }
      stats.event(session, event)
      if (event.type === 'assistant/message') schedule()
    })
    child.effect(() => async () => {
      revisions.active = false
      if (timer) {
        clearTimeout(timer)
        await snapshot().catch(() => {})
      } else {
        await operations
      }
    })
  })
}

async function recommend(request, agents, llm, record, revisions) {
  const input = await readObject(request, ['sessionId', 'provider', 'model', 'sample'], {},
    { bytes: 32768, fields: { sample: 4000 } })
  if (!input || !input.sample.trim()) return Response.json({ error: 'invalid-request' }, { status: 400 })
  if (record().mode !== 'adaptive') return Response.json({ error: 'recommendations-disabled' }, { status: 409 })
  const agent = agents.get(input.sessionId)
  const current = agent?.model.current()
  if (!agent || isSubagent(agent) || !sameRoute(current, input)) {
    return Response.json({ error: 'session-unavailable' }, { status: 409 })
  }
  const adapterRevision = revisions.adapters
  const selectionRevision = revisions.selections.get(agent.session)
  try {
    const model = await llm.resolveModelInfo(input.provider, input.model, request.signal)
    request.signal.throwIfAborted()
    const latest = agent.model.current()
    if (!revisions.active || agents.get(input.sessionId) !== agent || revisions.adapters !== adapterRevision ||
        revisions.selections.get(agent.session) !== selectionRevision || record().mode !== 'adaptive' ||
        !sameRoute(latest, current) || latest.reasoningEffort !== current.reasoningEffort) {
      return Response.json({ error: 'route-changed' }, { status: 409 })
    }
    const efforts = model?.reasoning?.efforts.map(row => row.id) ?? []
    if (!efforts.length || latest.reasoningEffort !== undefined && !efforts.includes(latest.reasoningEffort)) return Response.json({ error: 'unsupported-effort' }, { status: 422 })
    const { tier, signals } = classify(input.sample)
    return Response.json({
      tier: TIERS[tier], signals,
      recommendation: latest.reasoningEffort ?? effortForTier(tier, efforts),
      source: latest.reasoningEffort === undefined ? 'classifier' : 'manual',
    }, { headers: { 'cache-control': 'no-store' } })
  } catch {
    return Response.json({ error: 'selection-unavailable' }, { status: 422 })
  }
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
