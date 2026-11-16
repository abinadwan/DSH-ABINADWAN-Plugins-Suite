import { entries, invalid, text, validateEnvironmentName } from './schema.js'

export const handle = () => Object.freeze(Object.create(null))
const MAX_CONTEXTS = 256

// Only the trusted owner receives registration methods. Handles are same-process
// capabilities, never serialized caller IDs or claims of authentication.
export function createConsentContexts(core) {
  const profiles = new Map(), callers = new Set(), sessions = new Map(), scopes = new Map()
  const names = new Set(), canonicalIds = new Set()
  return {
    registerProfile(input) {
      const { name, canonicalId } = Object.fromEntries(entries(input, ['name', 'canonicalId']))
      validateEnvironmentName(name)
      if (!text(canonicalId, 1024) || names.has(name) || canonicalIds.has(canonicalId)) invalid()
      core.addEnvironment(name) // Validate/capacity check before reserving identity.
      const token = handle()
      profiles.set(token, name)
      names.add(name)
      canonicalIds.add(canonicalId)
      return token
    },
    environment(profile) {
      if (!profiles.has(profile)) invalid()
      return profiles.get(profile)
    },
    registerCaller() {
      if (callers.size >= MAX_CONTEXTS) invalid()
      const token = handle()
      callers.add(token)
      return token
    },
    startSession(caller, profile) {
      if (!callers.has(caller) || !profiles.has(profile) || sessions.size >= MAX_CONTEXTS) invalid()
      const token = handle()
      sessions.set(token, Object.freeze({ caller, profile, environment: profiles.get(profile) }))
      return token
    },
    endSession(session) { return sessions.delete(session) },
    session(session) { return sessions.get(session) },
    registerScope(input) {
      const scope = Object.fromEntries(entries(input, ['operation', 'purpose']))
      // Purpose is a trusted, fixed registry code, never free-form model text.
      if (scope.operation !== 'read_field' || typeof scope.purpose !== 'string' ||
          !/^[a-z][a-z0-9_]{0,63}$/.test(scope.purpose) || scopes.size >= MAX_CONTEXTS) invalid()
      const token = handle()
      scopes.set(token, Object.freeze(scope))
      return token
    },
    scope(scope) { return scopes.get(scope) },
  }
}
