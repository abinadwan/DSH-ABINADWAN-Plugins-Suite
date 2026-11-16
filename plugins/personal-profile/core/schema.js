import { LIMITS } from './limits.js'

// Internal validation only. Never include supplied identifiers or values in errors.
export function invalid() { throw new TypeError('Invalid profile input') }

const reserved = new Set([
  ...Object.getOwnPropertyNames(Object.prototype), 'prototype',
  'instructions', 'global', 'environments', 'fields', 'customFields',
  'allowAgentUseApprovedProfileInformation', 'permissions', 'values', 'definitions',
])
export function validateIdentifier(id) {
  if (typeof id !== 'string' || id.length > LIMITS.fieldIdentifier || !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(id) || reserved.has(id)) invalid()
  return id
}

// Harness resolveProfileDir accepts basename strings, including hyphens, spaces
// and Unicode. See the pinned official source in PERSONAL_PROFILE_PHASE1.md.
// Local safety/resource restrictions additionally reject controls/reserved names.
export function validateEnvironmentName(name) {
  if (typeof name !== 'string' || name.length === 0 || name.length > LIMITS.profileName ||
      name === '.' || name === '..' || name === 'node_modules' ||
      /[/\\\u0000-\u001f\u007f-\u009f]/.test(name) || reserved.has(name)) invalid()
  return name
}

// Inspect descriptors before reading: no inherited properties, symbols or getters.
export function entries(record, allowed, maximum = allowed?.length ?? LIMITS.recordEntries) {
  if (record === null || typeof record !== 'object' ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(record))) invalid()
  const keys = Reflect.ownKeys(record)
  if (keys.length > maximum) invalid()
  return keys.map(key => {
    const descriptor = Object.getOwnPropertyDescriptor(record, key)
    if (typeof key !== 'string' || key.length > LIMITS.profileName || !Object.hasOwn(descriptor, 'value') ||
        (allowed && !allowed.includes(key))) invalid()
    return [key, descriptor.value]
  })
}

export function text(value, maximum = LIMITS.personalText) {
  if (typeof value !== 'string' || value.length > maximum) invalid()
  return value
}
export function boolean(value) {
  if (typeof value !== 'boolean') invalid()
  return value
}
const builtinTypes = Object.freeze({
  preferredName: 'string', fullName: 'string', dateOfBirth: 'date',
  nationality: 'string', gender: 'gender',
})
export function builtinDefinitions() { return new Map(Object.entries(builtinTypes)) }

export function validateCustomDefinition(input) {
  const definition = Object.fromEntries(entries(input, ['id', 'label', 'type']))
  validateIdentifier(definition.id)
  if (Object.hasOwn(builtinTypes, definition.id) ||
      !['string', 'number', 'boolean', 'date'].includes(definition.type) ||
      !text(definition.label, LIMITS.customLabel).trim()) invalid()
  return Object.freeze(definition)
}

export function validateValue(type, value) {
  if (type === 'string') return text(value)
  if (type === 'boolean') return boolean(value)
  if (type === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) invalid()
    return value
  }
  if (type === 'date') {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) invalid()
    const date = new Date(`${value}T00:00:00.000Z`)
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) invalid()
    return value
  }
  if (type === 'gender') {
    const gender = Object.fromEntries(entries(value, ['kind', 'customValue']))
    if (!['male', 'female', 'custom', 'unspecified'].includes(gender.kind)) invalid()
    if (gender.kind === 'custom') {
      if (!text(gender.customValue).trim()) invalid()
    } else if (Object.hasOwn(gender, 'customValue')) invalid()
    return Object.freeze(gender)
  }
  invalid()
}
