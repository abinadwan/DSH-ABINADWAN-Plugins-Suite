import { invalid, validateIdentifier } from './schema.js'

export function addEnvironment(policies, definitions, environment) {
  validateIdentifier(environment)
  if (policies.has(environment)) invalid()
  policies.set(environment, new Map([...definitions.keys()].map(id => [id, 'private'])))
}

export function setPermission(policies, definitions, environment, field, state) {
  validateIdentifier(environment)
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
