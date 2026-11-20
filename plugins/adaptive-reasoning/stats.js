// Process-local aggregate counters. They hold no prompt, response, session or
// credential data, are never written to disk and never leave the Host.

import { TIERS } from './classify.js'

const SOURCES = ['override', 'adaptive', 'manual', 'saved', 'default']
const MAX_KEYS = 64
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
    this.tiers = Object.fromEntries(TIERS.map(tier => [tier, 0]))
    // Provider-chosen ids become keys, so the tables have no prototype.
    this.overrides = { applied: 0, notApplied: Object.create(null) }
    this.subagents = { applied: 0, notApplied: Object.create(null) }
    this.requests = { session: Object.create(null), subagent: Object.create(null) }
    this.classifier = { runs: 0, totalMs: 0, maxMs: 0 }
  }

  /** One user message admitted to a root session, with the source that decided its effort. */
  message(source) {
    this.messages++
    if (Object.hasOwn(this.sources, source)) this.sources[source]++
  }

  classified(tier, elapsedMs) {
    const name = TIERS[tier]
    if (name) this.tiers[name]++
    this.classifier.runs++
    this.classifier.totalMs += elapsedMs
    if (elapsedMs > this.classifier.maxMs) this.classifier.maxMs = elapsedMs
  }

  override(applied, reason) {
    if (applied) this.overrides.applied++
    else count(this.overrides.notApplied, reason)
  }

  subagent(applied, reason) {
    if (applied) this.subagents.applied++
    else count(this.subagents.notApplied, reason)
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
    const round = value => Math.round(value * 1000) / 1000
    return structuredClone({
      since: new Date(this.since).toISOString(),
      persistent: false,
      messages: this.messages,
      sources: this.sources,
      tiers: this.tiers,
      overrides: this.overrides,
      subagents: this.subagents,
      requests: this.requests,
      classifier: { runs: this.classifier.runs, totalMs: round(this.classifier.totalMs), maxMs: round(this.classifier.maxMs) },
    })
  }
}

function count(table, reason) {
  const key = typeof reason === 'string' && reason.length <= 64 ? reason : 'other'
  if (!Object.hasOwn(table, key) && Object.keys(table).length >= MAX_KEYS) table.other = (table.other ?? 0) + 1
  else table[key] = (table[key] ?? 0) + 1
}
