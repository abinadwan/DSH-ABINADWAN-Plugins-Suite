import { performance } from 'node:perf_hooks'
import { classify, effortForTier, readContent } from './classify.js'
import { isSubagent, readObject, sameRoute, text, uuid } from './http.js'

const UNADMITTED_MS = 120_000
const MAX_PENDING = 64
const MAX_OUTCOMES = 256
const MAX_ROUTES = 64
const MAX_UNTIMED = 32
const RESOLVE_MS = 2_000
const routeKey = selection => `${selection.provider}\u0000${selection.model}`

/**
 * Message-bound effort for root sessions and policy-bound effort for in-process
 * subagents. The native loop emits `agent/inbox/claimed` for each admitted
 * message before it captures the step's model selection, so selecting there
 * reaches exactly that message's turn, including its tool steps and retries.
 * Precedence for a root message: its one-time override; the session's own
 * effort in Manual mode or the local classification in Adaptive mode; the
 * route's saved preference for a session still on the native default; and
 * last the native default. Every effort chosen here lasts one message:
 * the session's effort returns at the next user message or idle, unless
 * someone changed the selection since.
 */
export class MessageEfforts {
  pending = new Map()
  outcomes = new Map()
  active = new Map()
  batches = new Map()
  previous = new Map()
  routes = new Map()
  resolving = new Map()
  starts = new Map()
  untimed = new Map()

  constructor(agents, llm, record, stats) {
    this.agents = agents
    this.llm = llm
    this.record = record
    this.stats = stats
  }

  async bind(request) {
    const input = await readObject(request, ['sessionId', 'requestId', 'provider', 'model', 'reasoningEffort'])
    if (!input || !uuid.test(input.requestId)) return Response.json({ error: 'invalid-selection' }, { status: 400 })
    const { sessionId, requestId, provider, model, reasoningEffort } = input
    this.prune()
    const known = () => this.pending.has(requestId) || this.outcomes.has(requestId)
    if (known()) return Response.json({ error: 'request-known' }, { status: 409 })
    if (this.pending.size >= MAX_PENDING) return Response.json({ error: 'too-many-pending' }, { status: 429 })
    // A resident Agent is checked now; one that resumes for this prompt is checked when the message is claimed.
    const resident = this.agents.get(sessionId)
    if (resident && (isSubagent(resident) || !sameRoute(resident.model.current(), input))) {
      return Response.json({ error: 'route-changed' }, { status: 409 })
    }
    try {
      await this.llm.resolveCallConfig({ provider, model, reasoningEffort }, request.signal)
      request.signal.throwIfAborted()
      await this.capabilityOf(input)
    } catch {
      return Response.json({ error: 'selection-unavailable' }, { status: 422 })
    }
    if (this.disposed || known()) return Response.json({ error: 'request-known' }, { status: 409 })
    this.pending.set(requestId, { sessionId, provider, model, effort: reasoningEffort, admitted: false, until: Date.now() + UNADMITTED_MS })
    this.outcome(requestId, { sessionId, status: 'pending', effort: reasoningEffort })
    return Response.json({ bound: { sessionId, requestId, provider, model, reasoningEffort } })
  }

  async status(request) {
    const input = await readObject(request, ['sessionId', 'requestId'])
    if (!input) return Response.json({ error: 'invalid-request' }, { status: 400 })
    this.prune()
    const outcome = this.outcomes.get(input.requestId)
    if (!outcome || outcome.sessionId !== input.sessionId) return Response.json({ status: 'unknown' })
    const { sessionId: _sessionId, ...visible } = outcome
    return Response.json(visible)
  }

  /** Withdraw a binding whose message has not been claimed, as after a refused send or a cancelled queued message. */
  async withdraw(request) {
    const input = await readObject(request, ['sessionId', 'requestId'])
    if (!input) return Response.json({ error: 'invalid-request' }, { status: 400 })
    const binding = this.pending.get(input.requestId)
    if (!binding || binding.sessionId !== input.sessionId) return Response.json({ error: 'not-withdrawable' }, { status: 409 })
    this.settle(input.requestId, 'withdrawn')
    return Response.json({ withdrawn: true })
  }

  /** Resolve the route's declared efforts before the Agent admits input; creation awaits this listener. */
  async created(agent) {
    try {
      const current = agent.model.current()
      if (current) await this.capabilityOf(current, AbortSignal.timeout(RESOLVE_MS))
    } catch {}
  }

  inserted(agent, message) {
    this.prune()
    const binding = this.bindingFor(agent, message)
    if (binding) binding.admitted = true
  }

  claimed(agent, message, turn) {
    try {
      if (isSubagent(agent)) this.subagentClaimed(agent, message)
      else this.rootClaimed(agent, message, turn)
    } catch {
      // A failed listener must never fail the user's turn; the native selection stands.
    }
  }

  rootClaimed(agent, message, turn) {
    // Tool contexts and other non-user input continue the turn that owns them.
    const kind = message.source?.kind
    if (kind !== 'user' && kind !== 'retry') return
    this.prune()
    const requestId = message.source.rpcId
    const binding = this.bindingFor(agent, message)
    if (binding) this.pending.delete(requestId)
    let batch = this.batches.get(agent)
    if (batch?.turn === turn) {
      this.sharedStep(agent, message, batch, binding ? { requestId, binding } : undefined)
      return
    }
    batch = { turn, tier: undefined }
    this.batches.set(agent, batch)
    // One claim emits all of its events synchronously, so the batch closes before any later boundary.
    queueMicrotask(() => { if (this.batches.get(agent) === batch) this.batches.delete(agent) })
    this.restore(agent, 'finished')
    const saved = agent.model.current()
    if (!saved) return
    let decision
    if (binding) {
      const reason = this.refusal(saved, binding)
      if (reason) {
        this.outcome(requestId, { sessionId: agent.id, status: 'not-applied', reason, effort: binding.effort })
        this.stats.override(false, reason)
      } else {
        decision = { source: 'override', effort: binding.effort, requestId }
      }
    }
    if (!decision && this.record().mode === 'adaptive') decision = this.adaptive(agent, message, saved, batch)
    if (!decision && saved.reasoningEffort === undefined) {
      // A session still on the native default takes its route's saved preference for this message.
      const preferred = this.preferred(saved)
      if (preferred) decision = { source: 'saved', effort: preferred }
    }
    if (!decision) {
      this.stats.message(this.sourceOf(saved))
      return
    }
    this.stats.message(decision.source)
    const selected = decision.effort !== saved.reasoningEffort
    if (selected) agent.model.select({ ...saved, reasoningEffort: decision.effort })
    this.active.set(agent, { ...decision, saved, applied: decision.effort, selected, batch })
    if (decision.requestId) this.outcome(decision.requestId, { sessionId: agent.id, status: 'active', effort: decision.effort })
  }

  /** Another user message shares this step, so no single message owns its request. */
  sharedStep(agent, message, batch, bound) {
    const active = this.active.get(agent)
    if (active?.batch === batch && active.source === 'override') this.restore(agent, 'not-applied', 'shared-step')
    if (bound) {
      this.outcome(bound.requestId, { sessionId: agent.id, status: 'not-applied', reason: 'shared-step', effort: bound.binding.effort })
      this.stats.override(false, 'shared-step')
    }
    this.stats.message(this.record().mode === 'adaptive' ? 'adaptive' : this.sourceOf(agent.model.current()))
    if (this.record().mode !== 'adaptive') return
    // Adaptive serves the step's most demanding message.
    const current = this.active.get(agent)
    const saved = current?.batch === batch ? current.saved : agent.model.current()
    if (!saved) return
    const decision = this.adaptive(agent, message, saved, batch)
    if (!decision) return
    const live = agent.model.current()
    if (live?.reasoningEffort !== decision.effort) agent.model.select({ ...saved, reasoningEffort: decision.effort })
    this.active.set(agent, { ...decision, saved, applied: decision.effort, selected: decision.effort !== saved.reasoningEffort, batch })
  }

  adaptive(agent, message, saved, batch) {
    const capability = this.routes.get(routeKey(saved))
    if (!capability?.efforts.length) {
      if (!capability) void this.capabilityOf(saved).catch(() => {})
      return undefined
    }
    const start = performance.now()
    const { text: body, attachments } = readContent(message.content)
    const { tier: own } = classify(body, { attachments, previous: this.previous.get(agent) })
    this.stats.classified(own, performance.now() - start)
    const tier = Math.max(own, batch.tier ?? 0)
    batch.tier = tier
    this.previous.set(agent, own)
    return { source: 'adaptive', effort: effortForTier(tier, capability.efforts), tier }
  }

  /** Apply the configured policy to an in-process subagent's own selection; the parent is untouched. */
  subagentClaimed(agent, message) {
    const kind = message.source?.kind
    // A child's task arrives as `user`; later messages from its parent arrive as `agent-message`.
    if (kind !== 'user' && kind !== 'agent-message') return
    const { subagents: policy, subagentEffort } = this.record()
    if (policy === 'inherit' || policy === undefined) return
    const current = agent.model.current()
    if (!current) return
    const capability = this.routes.get(routeKey(current))
    if (!capability?.efforts.length) {
      if (!capability) void this.capabilityOf(current).catch(() => {})
      this.stats.subagent(false, capability ? 'no-reasoning' : 'capability-unknown')
      return
    }
    let effort
    if (policy === 'adaptive') {
      const start = performance.now()
      const { text: body, attachments } = readContent(message.content)
      const { tier } = classify(body, { attachments })
      this.stats.classified(tier, performance.now() - start)
      effort = effortForTier(tier, capability.efforts)
    } else if (policy === 'effort') {
      if (!capability.efforts.includes(subagentEffort)) { this.stats.subagent(false, 'unsupported'); return }
      effort = subagentEffort
    }
    if (current.reasoningEffort !== effort) {
      agent.model.select({ provider: current.provider, model: current.model, ...effort === undefined ? {} : { reasoningEffort: effort } })
    }
    this.stats.subagent(true)
  }

  discarded(agent, message) {
    if (this.bindingFor(agent, message)) this.settle(message.source.rpcId, 'discarded')
  }

  /** Return to the saved selection only when the message's effort is still the live choice. */
  restore(agent, status, reason) {
    const active = this.active.get(agent)
    if (!active) return
    this.active.delete(agent)
    const current = agent.model.current()
    const untouched = sameRoute(current, active.saved) && current.reasoningEffort === active.applied
    if (active.selected && untouched) agent.model.select(active.saved)
    if (active.source === 'override') this.stats.override(status !== 'not-applied', reason)
    if (active.requestId) {
      this.outcome(active.requestId, { sessionId: agent.id, status, ...reason ? { reason } : {},
        effort: active.applied, restored: !active.selected || untouched })
    }
  }

  ended(agent) {
    const active = this.active.get(agent)
    this.active.delete(agent)
    this.batches.delete(agent)
    this.previous.delete(agent)
    if (active?.requestId) {
      this.outcome(active.requestId, { sessionId: agent.id, status: 'finished', effort: active.applied, restored: false })
      this.stats.override(true)
    }
    for (const [requestId, binding] of this.pending) {
      if (binding.sessionId === agent.id) this.settle(requestId, 'session-ended')
    }
  }

  /** Time each committed request from its first stream frame; the Host's own clock, not the provider's. */
  stream(agent, frame) {
    if (frame.type === 'start') {
      this.starts.set(frame.attemptId, performance.now())
      while (this.starts.size > MAX_UNTIMED) this.starts.delete(this.starts.keys().next().value)
      return
    }
    if (frame.type !== 'end') return
    const start = this.starts.get(frame.attemptId)
    this.starts.delete(frame.attemptId)
    if (frame.outcome.kind !== 'committed' || frame.outcome.eventType !== 'assistant/message') return
    const key = this.untimedKey(agent.session, frame.outcome.seq)
    const row = this.untimed.get(key)
    if (!row) return
    this.untimed.delete(key)
    this.stats.request(row.scope, row.effort, row.usage, start === undefined ? undefined : performance.now() - start)
  }

  event(session, event) {
    if (event.type === 'model/selection') {
      void this.capabilityOf(event.data).catch(() => {})
      return
    }
    if (event.type !== 'assistant/message') return
    // The epoch header in force when the request was built names its actual effort.
    const config = session.requestHeader()?.config
    const row = { scope: session.header.origin === 'subagent' ? 'subagent' : 'session',
      effort: typeof config?.reasoningEffort === 'string' ? config.reasoningEffort : 'default', usage: event.data.usage }
    this.untimed.set(this.untimedKey(session, event.seq), row)
    // A commit whose stream end never arrives is still counted, without a duration.
    while (this.untimed.size > MAX_UNTIMED) {
      const [oldest, value] = this.untimed.entries().next().value
      this.untimed.delete(oldest)
      this.stats.request(value.scope, value.effort, value.usage, undefined)
    }
  }

  untimedKey(session, seq) {
    return `${session.id}\u0000${seq}`
  }

  dispose() {
    this.disposed = true
    for (const agent of [...this.active.keys()]) {
      try { this.restore(agent, 'finished') } catch { this.ended(agent) }
    }
    for (const requestId of [...this.pending.keys()]) this.settle(requestId, 'disabled')
  }

  /** Why a bound effort cannot serve this claim, judged against the route as it is now. */
  refusal(saved, binding) {
    if (!sameRoute(saved, binding)) return 'route-changed'
    const capability = this.routes.get(routeKey(saved))
    if (capability && !capability.efforts.includes(binding.effort)) return 'unsupported'
    return undefined
  }

  /** The one saved effort for exactly this route, when the route still declares it. */
  preferred(selection) {
    const rows = this.record().preferences.filter(row => sameRoute(row, selection))
    const capability = this.routes.get(routeKey(selection))
    return rows.length === 1 && capability?.efforts.includes(rows[0].effort) ? rows[0].effort : undefined
  }

  sourceOf(selection) {
    if (selection?.reasoningEffort === undefined) return 'default'
    const saved = this.record().preferences.find(row => sameRoute(row, selection))
    return saved?.effort === selection.reasoningEffort ? 'saved' : 'manual'
  }

  /** Cache each route's declared effort ids, so a synchronous claim can map them without a request. */
  capabilityOf(selection, signal) {
    if (!text(selection?.provider) || !text(selection?.model)) return Promise.resolve(undefined)
    const key = routeKey(selection)
    if (this.routes.has(key)) return Promise.resolve(this.routes.get(key))
    let task = this.resolving.get(key)
    if (!task) {
      task = this.llm.resolveModelInfo(selection.provider, selection.model, signal).then(info => {
        const efforts = Array.isArray(info?.reasoning?.efforts)
          ? info.reasoning.efforts.map(effort => effort?.id).filter(text) : []
        const capability = Object.freeze({ efforts: Object.freeze(efforts) })
        this.routes.set(key, capability)
        while (this.routes.size > MAX_ROUTES) this.routes.delete(this.routes.keys().next().value)
        return capability
      }).finally(() => this.resolving.delete(key))
      this.resolving.set(key, task)
    }
    return task
  }

  bindingFor(agent, message) {
    const kind = message.source?.kind
    if ((kind !== 'user' && kind !== 'retry') || typeof message.source.rpcId !== 'string') return undefined
    const binding = this.pending.get(message.source.rpcId)
    return binding?.sessionId === agent.id ? binding : undefined
  }

  settle(requestId, reason) {
    const binding = this.pending.get(requestId)
    if (!binding) return
    this.pending.delete(requestId)
    this.outcome(requestId, { sessionId: binding.sessionId, status: 'not-applied', reason, effort: binding.effort })
    this.stats.override(false, reason)
  }

  prune() {
    const now = Date.now()
    for (const [requestId, binding] of this.pending) {
      if (!binding.admitted && now > binding.until) this.settle(requestId, 'expired')
    }
  }

  outcome(requestId, outcome) {
    this.outcomes.delete(requestId)
    this.outcomes.set(requestId, outcome)
    while (this.outcomes.size > MAX_OUTCOMES) this.outcomes.delete(this.outcomes.keys().next().value)
  }
}
