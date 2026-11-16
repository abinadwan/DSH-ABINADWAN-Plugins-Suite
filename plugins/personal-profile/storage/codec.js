import { createMasterProfile } from '../core/model.js'

export function failure() { throw new Error('Profile storage operation failed') }
export function guarded(fn) { try { return fn() } catch { failure() } }
// Persist the existing Master Profile constructor input, never sessions or policies.
export function normalize(input) {
  return guarded(() => {
    const p = createMasterProfile(input)
    return {
      customFields: [...p.customFields.values()], fields: Object.fromEntries(p.values),
      instructions: {global: p.instructions.global, environments: Object.fromEntries(p.instructions.environments)},
      allowAgentUseApprovedProfileInformation: p.allowAgentUseApprovedProfileInformation,
    }
  })
}
export function imported(input) {
  const p = normalize(input)
  p.allowAgentUseApprovedProfileInformation = false
  return p
}
export function exact(value, keys) {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype ||
      Object.keys(value).sort().join(',') !== [...keys].sort().join(',')) failure()
}
export function identity(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(value)) failure()
  return value
}
