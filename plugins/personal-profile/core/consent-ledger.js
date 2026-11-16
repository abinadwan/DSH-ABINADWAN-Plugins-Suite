import { handle } from './consent-context.js'

const TTL = 60_000
const MAX_PENDING = 256
const MAX_GRANTS = 1024

// No values, labels, instructions or logs enter this ledger. All transitions are
// synchronous: check + delete + grant publication cannot interleave on one isolate.
export function createConsentLedger(now) {
  const pending = new Map(), grants = []
  let lastTime = -Infinity
  function sweep() {
    let time
    try { time = now() } catch { time = NaN }
    if (!Number.isFinite(time) || time < lastTime) {
      pending.clear()
      grants.length = 0
      return undefined
    }
    lastTime = time
    for (const [token, p] of pending) if (time >= p.expires) pending.delete(token)
    return time
  }
  const same = (a, b) => a.session === b.session && a.environment === b.environment && a.field === b.field && a.scope === b.scope
  const invalidate = predicate => {
    for (const [token, p] of pending) if (predicate(p)) pending.delete(token)
    for (let i = grants.length - 1; i >= 0; i--) if (predicate(grants[i])) grants.splice(i, 1)
  }
  return {
    invalidate,
    request(binding, metadata) {
      const time = sweep()
      if (time === undefined) return { status: 'denied' }
      if (grants.some(g => same(g, binding))) return { status: 'consented' }
      if (pending.size >= MAX_PENDING) return { status: 'denied' }
      const approval = handle()
      pending.set(approval, { ...binding, expires: time + TTL, decision: undefined })
      return { status: 'approval_required', approval, metadata: Object.freeze(metadata) }
    },
    decide(token, decision) {
      if (sweep() === undefined) return false
      const p = pending.get(token)
      if (!p || p.decision !== undefined) return false
      if (!['allow_once', 'allow_session'].includes(decision)) {
        pending.delete(token)
        return false
      }
      p.decision = decision
      return true
    },
    cancel(session, token) {
      const p = pending.get(token)
      return p?.session === session ? pending.delete(token) : false
    },
    consume(session, token, isCurrent, read) {
      if (sweep() === undefined) return { status: 'denied' }
      const p = pending.get(token)
      if (!p || p.session !== session) return { status: 'denied' }
      pending.delete(token) // Missing/undecided attempts are terminal too.
      if (!p.decision || !isCurrent(p)) return { status: 'denied' }
      if (p.decision === 'allow_session' && !grants.some(g => same(g, p))) {
        if (grants.length >= MAX_GRANTS) return { status: 'denied' }
        grants.push({ session: p.session, environment: p.environment, field: p.field, scope: p.scope })
      }
      return read(p)
    },
  }
}
