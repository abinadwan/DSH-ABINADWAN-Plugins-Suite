// Remove the QA AppContainer profile and its access grants. Usage:
//   node cleanup-appcontainer.mjs <runtime-with-koffi> <granted-path> [...more granted paths]
// Grants are removed first, while the profile SID can still be derived.
import { bind, deleteProfile, ensureProfile, revoke } from './appcontainer.js'

const [runtime, ...paths] = process.argv.slice(2)
if (!runtime) throw new Error('Supply the runtime directory that provides koffi')
const api = bind(runtime)
const { sid, pointer } = ensureProfile(api)
api.FreeSid(pointer)
for (const path of paths) {
  revoke(path, sid)
  console.log(`revoked ${sid} on ${path}`)
}
deleteProfile(api)
console.log('deleted AppContainer profile')
