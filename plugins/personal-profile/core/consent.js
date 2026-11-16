import { performance } from 'node:perf_hooks'
import { createProfileAccess } from './retrieval.js'
import { createConsentContexts } from './consent-context.js'
import { createConsentLedger } from './consent-ledger.js'
import { boolean, invalid, validateIdentifier } from './schema.js'

// Internal construction boundary for a future trusted Host. Never register host
// methods, context issuance, or the factory as agent tools. No actual auth here.
export function createConsentProfile(input, { now = () => performance.now() } = {}) {
  if (typeof now !== 'function') invalid()
  const { core, readApprovedField } = createProfileAccess(input)
  const contexts = createConsentContexts(core)
  const ledger = createConsentLedger(now)
  let locked = false
  const deny = () => ({ status: 'denied' })
  function current(binding) {
    return !locked && contexts.session(binding.session)?.environment === binding.environment &&
      core.requestField(binding.environment, binding.field).status === 'approval_required'
  }
  function fieldEnvironment(profile, field) {
    const environment = contexts.environment(profile)
    validateIdentifier(field)
    return environment
  }
  const host = Object.freeze({
    registerProfile: contexts.registerProfile,
    registerCaller: contexts.registerCaller,
    startSession: contexts.startSession,
    registerScope: contexts.registerScope,
    endSession(session) {
      contexts.endSession(session)
      ledger.invalidate(p => p.session === session)
    },
    setPermission(profile, field, state) {
      const environment = fieldEnvironment(profile, field)
      core.setPermission(environment, field, state)
      ledger.invalidate(p => p.environment === environment && p.field === field)
    },
    revoke(profile, field) {
      const environment = fieldEnvironment(profile, field)
      core.setPermission(environment, field, 'private')
      ledger.invalidate(p => p.environment === environment && p.field === field)
    },
    setOptIn(enabled) {
      core.setOptIn(enabled)
      if (!enabled) ledger.invalidate(() => true)
    },
    setLocked(value) {
      locked = boolean(value)
      if (locked) ledger.invalidate(() => true)
    },
    decide(approval, outcome) { return ledger.decide(approval, outcome) },
  })
  const reader = Object.freeze({
    requestField(session, field, scope) {
      try {
        validateIdentifier(field)
        const context = contexts.session(session), metadata = contexts.scope(scope)
        if (locked || !context || !metadata) return deny()
        const result = core.requestField(context.environment, field)
        if (result.status !== 'approval_required') return result
        const binding = { session, environment: context.environment, field, scope }
        const consent = ledger.request(binding, { field, operation: metadata.operation, purpose: metadata.purpose })
        return consent.status === 'consented' ? readApprovedField(context.environment, field) : consent
      } catch { return deny() }
    },
    consumeApproval(session, approval) {
      return ledger.consume(session, approval, current, p => readApprovedField(p.environment, p.field))
    },
    cancelApproval(session, approval) { return ledger.cancel(session, approval) },
  })
  return Object.freeze({ host, reader })
}
