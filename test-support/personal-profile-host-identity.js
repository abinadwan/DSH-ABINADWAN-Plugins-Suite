// Synthetic design diagnostic only. Not packaged, not a Host adapter or collector.
// No caller-provided identity, identifier, credential, path, callback or logger.
import {types} from 'node:util'

const rejectedEvidence = ['missing', 'ambiguous', 'mismatched', 'untrusted', 'unsupported']
const facts = Object.freeze([
  ['mode', 'synthetic', [], 'INVALID_INPUT'],
  ['version', '0.2.2-rc.3', ['unsupported'], 'UNSUPPORTED_VERSION'],
  ['provenance', 'synthetic-host-context', ['untrusted'], 'UNTRUSTED_CONTEXT'],
  ['hostProcess', 'correlated', [...rejectedEvidence, 'terminal', 'powershell', 'browser-owner'], 'HOST_PROCESS_UNVERIFIED'],
  ['desktopBinding', 'matched', rejectedEvidence, 'DESKTOP_BINDING_DENIED'],
  ['windowsOwnerBinding', 'matched', rejectedEvidence, 'WINDOWS_OWNER_DENIED'],
  ['profileAccountBinding', 'matched', rejectedEvidence, 'PROFILE_ACCOUNT_DENIED'],
  ['managementAuthorization', 'explicit', [...rejectedEvidence, 'owner-role-only', 'browser-auth-only'], 'MANAGEMENT_DENIED'],
  ['lifecycleBinding', 'current', [...rejectedEvidence, 'stale', 'replayed'], 'LIFECYCLE_DENIED'],
])
const output = status => Object.freeze({status, liveHost: 'UNVERIFIED', profileAccess: 'DENIED'})

export function diagnoseSyntheticHostIdentity(input) {
  try {
    // Reject proxies before reflection so user traps never run, even if revoked.
    // This relies on Node's native isProxy, not caller-supplied provenance claims.
    if (input === null || typeof input !== 'object' || types.isProxy(input)) return output('INVALID_INPUT')
    const prototype = Object.getPrototypeOf(input)
    if (prototype !== Object.prototype && prototype !== null) return output('INVALID_INPUT')
    const descriptors = Object.getOwnPropertyDescriptors(input)
    const keys = Reflect.ownKeys(descriptors)
    if (keys.length !== facts.length || keys.some(key => !facts.some(([name]) => name === key))) return output('INVALID_INPUT')
    const values = []
    for (const [name, expected, rejected] of facts) {
      const descriptor = descriptors[name]
      if (!descriptor || !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable ||
          typeof descriptor.value !== 'string' ||
          (descriptor.value !== expected && !rejected.includes(descriptor.value))) return output('INVALID_INPUT')
      values.push(descriptor.value)
    }
    for (let i = 0; i < facts.length; i++) {
      if (values[i] !== facts[i][1]) return output(facts[i][3])
    }
    return output('SYNTHETIC_FACTS_COMPLETE')
  } catch {
    // Never inspect, serialize, rethrow or log the input or caught value.
    return output('INVALID_INPUT')
  }
}
