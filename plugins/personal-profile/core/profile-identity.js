import { invalid, validateEnvironmentName } from './schema.js'

// Conservative collision guard, NOT a filesystem identity resolver. Trusted Host
// canonical IDs must still account for symlinks, case rules and platform aliases.
export function profileNameKey(name) {
  validateEnvironmentName(name)
  const key = name.normalize('NFKC').toLowerCase().replace(/[ .]+$/u, '')
  validateEnvironmentName(key)
  return key
}

export function assertDistinctProfileName(names, candidate) {
  const key = profileNameKey(candidate)
  for (const name of names) {
    if (name !== candidate && profileNameKey(name) === key) invalid()
  }
}
