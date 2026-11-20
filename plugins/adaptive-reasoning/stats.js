// Process-local aggregate counts. The snapshot includes no prompt, response,
// session identity or credentials.

import { performance } from 'node:perf_hooks'

const SOURCES = ['override', 'adaptive', 'manual', 'saved', 'default']
const MAX_KEYS = 64
const MAX_UNTIMED = 32
const bucket = () => ({ requests: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, totalReported: 0,
  reasoningTokens: 0, reasoningReported: 0, durationMs: 0, timed: 0 })

export class ReasoningStats {
  constructor(now = () => Date.now()) {
    this.now = now
    this.reset()
  }

  reset() {
    this.since = this.now()
    this.messages = 0
    this.sources = Object.fromEntries(SOURCES.map(source => [source, 0]))
    this.pendingMessages = new WeakMap()
    this.starts = new Map()
    this.untimed = new Map()
    // Provider-chosen ids become keys, so the tables have no prototype.
    this.requests = { session: Object.create(null), subagent: Object.create(null) }
  }

  event(session, event) {
    if (event.type === 'user/message' && session.header.origin !== 'subagent') {
      const kind = event.data.source.kind
      if (kind === 'user' || kind === 'retry') {
        this.pendingMessages.set(session, (this.pendingMessages.get(session) ?? 0) + 1)
      }
    }
    if (event.type === 'step/end') this.pendingMessages.delete(session)
    if (event.type !== 'assistant/message') return

    const header = session.requestHeader()
    const row = {
      scope: session.header.origin === 'subagent' ? 'subagent' : 'session',
      effort: header?.config.reasoningEffort ?? 'default',
      usage: event.data.usage,
    }
    this.untimed.set(this.requestKey(session, event.seq), row)
    // Count a commit without timing even if its stream end is unavailable.
    if (this.untimed.size > MAX_UNTIMED) {
      const [oldest, value] = this.untimed.entries().next().value
      this.untimed.delete(oldest)
      this.request(value.scope, value.effort, value.usage)
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
    this.request(row.scope, row.effort, row.usage, start === undefined ? undefined : performance.now() - start)
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
  request(scope, effort, usage, durationMs) {
    if (scope !== 'session' && scope !== 'subagent') return
    const table = this.requests[scope]
    const key = Object.hasOwn(table, effort) || Object.keys(table).length < MAX_KEYS ? effort : 'other'
    const row = table[key] ??= bucket()
    row.requests++
    if (usage && Number.isFinite(usage.inputTokens)) row.inputTokens += usage.inputTokens + (usage.cacheReadTokens ?? 0) + (usage.cacheWriteTokens ?? 0)
    if (usage && Number.isFinite(usage.outputTokens)) row.outputTokens += usage.outputTokens
    if (usage && Number.isFinite(usage.totalTokens)) { row.totalTokens += usage.totalTokens; row.totalReported++ }
    // Only an adapter-reported count is used; a missing count is never estimated.
    if (usage && Number.isFinite(usage.reasoningTokens)) { row.reasoningTokens += usage.reasoningTokens; row.reasoningReported++ }
    if (Number.isFinite(durationMs) && durationMs >= 0) { row.durationMs += durationMs; row.timed++ }
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
      classifier: { runs: 0, totalMs: 0, maxMs: 0 },
    })
  }
}
