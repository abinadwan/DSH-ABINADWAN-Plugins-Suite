import { LIMITS } from './limits.js'
import { invalid, validateIdentifier, validateEnvironmentName } from './schema.js'

export function addEnvironment(policies, definitions, environment, instructionEnvironments = new Map()) {
  validateEnvironmentName(environment)
  if (policies.has(environment) ||
      new Set([...policies.keys(), ...instructionEnvironments.keys(), environment]).size > LIMITS.environments) invalid()
  policies.set(environment, new Map([...definitions.keys()].map(id => [id, 'private'])))
}

export function setPermission(policies, definitions, environment, field, state) {
  validateEnvironmentName(environment)
  validateIdentifier(field)
  if (!['allow', 'ask_first', 'private'].includes(state) ||
      !definitions.has(field) || !policies.has(environment)) invalid()
  const policy = policies.get(environment)
  if (!(policy instanceof Map)) invalid()
  policy.set(field, state)
}

export function addPrivateField(policies, field) {
  for (const policy of policies.values()) policy.set(field, 'private')
}
