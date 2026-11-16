import { entries, validateIdentifier } from './schema.js'

// Policy-only decision: never receives or returns a field value.
export function evaluatePermission(profile, policies, environment, field) {
  try {
    validateIdentifier(environment)
    validateIdentifier(field)
    // Reject inherited/accessor metadata before reading it.
    profile = Object.fromEntries(entries(profile))
    if (profile.allowAgentUseApprovedProfileInformation !== true ||
        !(profile.definitions instanceof Map) || !profile.definitions.has(field) ||
        !(policies instanceof Map)) return 'private'
    const policy = policies.get(environment)
    if (!(policy instanceof Map)) return 'private'
    const state = policy.get(field)
    return ['allow', 'ask_first', 'private'].includes(state) ? state : 'private'
  } catch {
    return 'private'
  }
}
