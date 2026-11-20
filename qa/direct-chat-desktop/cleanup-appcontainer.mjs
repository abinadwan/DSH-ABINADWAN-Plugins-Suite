// Remove Direct Chat AppContainer grants and profiles. Usage:
//   node cleanup-appcontainer.mjs <runtime-with-koffi> --state <host-state-folder> [...more state folders]
//     Revokes every grant the folder's manifest records, deletes those profiles, then the manifest.
//   node cleanup-appcontainer.mjs <runtime-with-koffi> --legacy <granted-path> [...more paths]
//     Removes the former shared QA profile (`abinadwan.direct-chat.qa`) and its grants on the given paths.
// Grants are removed first, while each profile SID can still be derived.
import { existsSync, rmSync } from 'node:fs'
import { bind, deleteProfile, ensureProfile, profileName, revoke } from './appcontainer.js'
import { manifestPath, readManifest } from './grants.js'

const [runtime, mode, ...targets] = process.argv.slice(2)
if (!runtime || !['--state', '--legacy'].includes(mode) || targets.length === 0) {
  throw new Error('Usage: cleanup-appcontainer.mjs <runtime> (--state <folder>... | --legacy <path>...)')
}
const api = bind(runtime)
if (mode === '--legacy') {
  const { sid, pointer } = ensureProfile(api, profileName)
  api.FreeSid(pointer)
  for (const path of targets.filter(existsSync)) {
    revoke(path, sid)
    console.log(`revoked ${sid} on ${path}`)
  }
  deleteProfile(api, profileName)
  console.log(`deleted AppContainer profile ${profileName}`)
} else {
  for (const state of targets) {
    const { grants } = readManifest(state)
    for (const entry of grants) {
      if (!existsSync(entry.path)) continue
      revoke(entry.path, entry.sid)
      console.log(`revoked ${entry.sid} on ${entry.path}`)
    }
    for (const profile of new Set(grants.map(entry => entry.profile))) {
      try { deleteProfile(api, profile); console.log(`deleted AppContainer profile ${profile}`) }
      catch (error) { console.log(`profile ${profile}: ${error.message}`) }
    }
    rmSync(manifestPath(state), { force: true })
  }
}
