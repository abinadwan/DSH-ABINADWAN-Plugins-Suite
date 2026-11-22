// Live aggregate counts and bounded request correlation. The snapshot includes no prompt, response,
// session identity or credentials.

import { performance } from 'node:perf_hooks'

export const SOURCES = ['override', 'adaptive', 'manual', 'saved', 'default']
export const MAX_KEYS = 64
const MAX_UNTIMED = 32
export const bucket = () => ({ requests: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, totalReported: 0,
  reasoningTokens: 0, reasoningReported: 0, durationMs: 0, timed: 0 })

export class ReasoningStats {
  constructor(now = () => Date.now()) {
    this.now = now
    this.committed = new WeakMap()
    this.reset()
  }

  reset() {
    this.since = this.now()
    this.clearCounters()
    this.pendingMessages = new WeakMap()
    this.starts = new Map()
    this.untimed = new Map()
  }

  clearCounters() {
    this.messages = 0
    this.sources = Object.fromEntries(SOURCES.map(source => [source, 0]))
    this.routes = new Map()
    // Provider-chosen ids become keys, so the tables have no prototype.
    this.requests = { session: Object.create(null), subagent: Object.create(null) }
  }

  takeCounters() {
    const counters = this.snapshot()
    this.clearCounters()
    return counters
  }

  event(session, event) {
    if (event.type === 'user/message' && session.header.origin !== 'subagent') {
      const kind = event.data.source.kind
      if (kind === 'user') {
        this.pendingMessages.set(session, (this.pendingMessages.get(session) ?? 0) + 1)
      }
    }
    if (event.type === 'step/end') this.pendingMessages.delete(session)
    if (event.type !== 'assistant/message') return

    if (event.seq <= (this.committed.get(session) ?? -1)) return
    this.committed.set(session, event.seq)
    const header = session.requestHeader()
    const row = {
      scope: session.header.origin === 'subagent' ? 'subagent' : 'session',
      effort: header?.config.reasoningEffort ?? 'default',
      usage: event.data.usage,
      route: header?.config,
    }
    this.untimed.set(this.requestKey(session, event.seq), row)
    // Count a commit without timing even if its stream end is unavailable.
    if (this.untimed.size > MAX_UNTIMED) {
      const [oldest, value] = this.untimed.entries().next().value
      this.untimed.delete(oldest)
      this.request(value.scope, value.effort, value.usage, undefined, value.route)
    }
  }

  stream(session, frame) {
    if (frame.type === 'start') {
      this.starts.set(frame.attemptId, performance.now())
      if (this.starts.size > MAX_UNTIMED) this.starts.delete(this.starts.keys().next().value)
      // The header was logged before this stream opened. A shared step may
      // carry multiple user messages, and a retry does not admit them again.
      const messages = this.pendingMessages.get(session)
      if (messages) {
        this.pendingMessages.delete(session)
        const header = session.requestHeader()
        const explicit = header?.config.reasoningEffort !== undefined && header.adapterDefaults?.reasoningEffort !== true
        this.messages += messages
        this.sources[explicit ? 'manual' : 'default'] += messages
      }
      return
    }
    if (frame.type !== 'end') return

    const start = this.starts.get(frame.attemptId)
    this.starts.delete(frame.attemptId)
    if (frame.outcome.kind !== 'committed' || frame.outcome.eventType !== 'assistant/message') return
    const key = this.requestKey(session, frame.outcome.seq)
    const row = this.untimed.get(key)
    if (!row) return
    this.untimed.delete(key)
    this.request(row.scope, row.effort, row.usage, start === undefined ? undefined : performance.now() - start, row.route)
  }

  requestKey(session, seq) {
    return session.id + '\u0000' + seq
  }

  /**
   * One completed model request, as the native loop committed it.
   * @param {'session' | 'subagent'} scope - root session or in-process subagent.
   * @param {string} effort - the effort in the request's logged header, or `default`.
   * @param {object | undefined} usage - the adapter's normalized TokenUsage, when it reported one.
   * @param {number | undefined} durationMs - Host-measured stream duration, when its start was observed.
   */
  request(scope, effort, usage, durationMs, route) {
    if (scope !== 'session' && scope !== 'subagent') return
    const table = this.requests[scope]
    const key = Object.hasOwn(table, effort) || Object.keys(table).length < MAX_KEYS ? effort : 'other'
    addUsage(table[key] ??= bucket(), usage, durationMs)
    const { provider, model } = route ?? {}
    if (![provider, model, effort].every(value => typeof value === 'string' && value.length > 0 && value.length <= 256)) return
    const routeKey = JSON.stringify([scope, provider, model, effort])
    if (!this.routes.has(routeKey) && this.routes.size < MAX_KEYS) {
      this.routes.set(routeKey, { scope, provider, model, effort, ...bucket() })
    }
    const row = this.routes.get(routeKey)
    if (row) addUsage(row, usage, durationMs)
  }

  snapshot() {
    return structuredClone({
      since: new Date(this.since).toISOString(),
      persistent: false,
      messages: this.messages,
      sources: this.sources,
      // Retain the stats response fields expected by already mounted clients.
      tiers: { simple: 0, standard: 0, complex: 0, advanced: 0 },
      overrides: { applied: 0, notApplied: {} },
      subagents: { applied: 0, notApplied: {} },
      requests: this.requests,
      routes: [...this.routes.values()],
      classifier: { runs: 0, totalMs: 0, maxMs: 0 },
    })
  }
}

const measured = value => Number.isSafeInteger(value) && value >= 0

function addUsage(row, usage, durationMs) {
  row.requests++
  if (usage && measured(usage.inputTokens)) row.inputTokens += usage.inputTokens + (measured(usage.cacheReadTokens) ? usage.cacheReadTokens : 0) + (measured(usage.cacheWriteTokens) ? usage.cacheWriteTokens : 0)
  if (usage && measured(usage.outputTokens)) row.outputTokens += usage.outputTokens
  if (usage && measured(usage.totalTokens)) { row.totalTokens += usage.totalTokens; row.totalReported++ }
  // Only an adapter-reported count is used; a missing count is never estimated.
  if (usage && measured(usage.reasoningTokens)) { row.reasoningTokens += usage.reasoningTokens; row.reasoningReported++ }
  if (Number.isFinite(durationMs) && durationMs >= 0) { row.durationMs += durationMs; row.timed++ }
}
