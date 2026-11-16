import { LIMITS } from './limits.js'
import { createMasterProfile } from './model.js'
import { boolean, invalid, validateCustomDefinition, validateValue } from './schema.js'
import { addEnvironment, addPrivateField, setPermission } from './policies.js'
import { evaluatePermission } from './permissions.js'

// Internal, trusted host-side management facade. No public export or Host wiring.
// Environment selection is supplied by trusted code; this is not authentication.
export function createProfileCore(input) {
  return createProfileAccess(input).core
}

// Internal capability for the consent owner only; never give this to a reader.
export function createProfileAccess(input) {
  const profile = createMasterProfile(input)
  const policies = new Map()
  const core = Object.freeze({
    addEnvironment(environment) { addEnvironment(policies, profile.definitions, environment, profile.instructions.environments) },
    setPermission(environment, field, state) { setPermission(policies, profile.definitions, environment, field, state) },
    setOptIn(enabled) { profile.allowAgentUseApprovedProfileInformation = boolean(enabled) },
    addCustomField(input, value) {
      const definition = validateCustomDefinition(input)
      if (profile.customFields.size >= LIMITS.customFields || profile.definitions.has(definition.id)) invalid()
      // Validate everything before changing any state; omitted values are optional.
      const validated = value === undefined ? undefined : validateValue(definition.type, value)
      profile.definitions.set(definition.id, definition.type)
      profile.customFields.set(definition.id, definition)
      if (validated !== undefined) profile.values.set(definition.id, validated)
      addPrivateField(policies, definition.id)
    },
    requestField(environment, field) {
      const decision = evaluatePermission(profile, policies, environment, field)
      if (decision === 'private' || !profile.values.has(field)) return { status: 'denied' }
      if (decision === 'ask_first') return { status: 'approval_required', field }
      return { status: 'allowed', field, value: profile.values.get(field) }
    },
  })
  return {
    core,
    readApprovedField(environment, field) {
      const decision = evaluatePermission(profile, policies, environment, field)
      if (decision === 'private' || !profile.values.has(field)) return { status: 'denied' }
      return { status: 'allowed', field, value: profile.values.get(field) }
    },
  }
}
