import { createMasterProfile } from '../core/model.js'
import { entries } from '../core/schema.js'

export function profileInput(input) {
  return Object.fromEntries(entries(input).filter(([key]) => key !== 'permissionState'))
}
function permissions(input, definitions) {
  if (input === undefined) return {version: 1, profiles: {}}
  input = Object.fromEntries(entries(input, ['version', 'profiles']))
  exact(input, ['version', 'profiles'])
  if (input.version !== 1) failure()
  const profiles = Object.fromEntries(entries(input.profiles).map(([id, fields]) => {
    identity(id)
    const values = Object.fromEntries(entries(fields).map(([field, state]) => {
      if (!definitions.has(field) || !['allow', 'ask_first', 'private'].includes(state)) failure()
      return [field, state]
    }))
    return [id, values]
  }))
  return {version: 1, profiles}
}

export function failure() { throw new Error('Profile storage operation failed') }
export function guarded(fn) { try { return fn() } catch { failure() } }
// Versioned permissions share the authenticated encrypted profile payload; no transient capabilities.
export function normalize(input) {
  return guarded(() => {
    const own = Object.fromEntries(entries(input))
    const p = createMasterProfile(profileInput(own))
    return {
      permissionState: permissions(own.permissionState, p.definitions),
      customFields: [...p.customFields.values()], fields: Object.fromEntries(p.values),
      instructions: {global: p.instructions.global, environments: Object.fromEntries(p.instructions.environments)},
      allowAgentUseApprovedProfileInformation: p.allowAgentUseApprovedProfileInformation,
    }
  })
}
export function imported(input) {
  const p = normalize(input)
  p.allowAgentUseApprovedProfileInformation = false
  p.permissionState = {version: 1, profiles: {}}
  return p
}
export function exact(value, keys) {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype ||
      Object.keys(value).sort().join(',') !== [...keys].sort().join(',')) failure()
}
export function identity(value) {
  if (['__proto__', 'constructor', 'prototype'].includes(value) || typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(value)) failure()
  return value
}
