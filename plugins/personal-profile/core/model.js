import { assertDistinctProfileName } from './profile-identity.js'
import { LIMITS } from './limits.js'
import { entries, invalid, text, boolean, builtinDefinitions, validateCustomDefinition, validateIdentifier, validateEnvironmentName, validateValue } from './schema.js'

// Internal model constructor; not a disclosure API or a persisted record.
export function createMasterProfile(input = {}) {
  const options = Object.fromEntries(entries(input, ['fields', 'customFields', 'instructions', 'allowAgentUseApprovedProfileInformation']))
  const definitions = builtinDefinitions()
  const customFields = new Map()
  if (Object.hasOwn(options, 'customFields')) {
    const list = options.customFields
    if (!Array.isArray(list) || list.length > LIMITS.customFields || Object.getPrototypeOf(list) !== Array.prototype) invalid()
    const items = []
    for (const key of Reflect.ownKeys(list)) {
      if (key === 'length') continue
      const descriptor = Object.getOwnPropertyDescriptor(list, key)
      if (typeof key !== 'string' || !/^(0|[1-9][0-9]*)$/.test(key) ||
          !Object.hasOwn(descriptor, 'value')) invalid()
      items.push(descriptor.value)
    }
    if (items.length !== list.length) invalid()
    for (const input of items) {
      const definition = validateCustomDefinition(input)
      if (definitions.has(definition.id)) invalid()
      customFields.set(definition.id, definition)
      definitions.set(definition.id, definition.type)
    }
  }
  const values = new Map()
  if (Object.hasOwn(options, 'fields')) {
    for (const [id, value] of entries(options.fields)) {
      validateIdentifier(id)
      if (!definitions.has(id)) invalid()
      values.set(id, validateValue(definitions.get(id), value))
    }
  }
  const instructions = { global: '', environments: new Map() }
  if (Object.hasOwn(options, 'instructions')) {
    for (const [key, value] of entries(options.instructions, ['global', 'environments'])) {
      if (key === 'global') instructions.global = text(value, LIMITS.instructions)
      else for (const [environment, instruction] of entries(value, undefined, LIMITS.environments)) {
        assertDistinctProfileName(instructions.environments.keys(), environment)
        instructions.environments.set(validateEnvironmentName(environment), text(instruction, LIMITS.instructions))
      }
    }
  }
  return {
    definitions, customFields, values, instructions,
    allowAgentUseApprovedProfileInformation: Object.hasOwn(options, 'allowAgentUseApprovedProfileInformation')
      ? boolean(options.allowAgentUseApprovedProfileInformation) : false,
  }
}
