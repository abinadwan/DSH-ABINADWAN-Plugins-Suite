// Remove Direct Chat AppContainer grants and profiles. Usage:
//   node cleanup.mjs <runtime-with-koffi> --state <host-state-folder> [...more] [--keep-profile <name>]
//     Revokes every grant the folder's manifest records, except those of the kept profile, deletes those
//     profiles, and rewrites the manifest with what remains (removing it when nothing does).
//   node cleanup.mjs <runtime-with-koffi> --legacy <granted-path> [...more paths]
//     Removes the former shared QA profile (`abinadwan.direct-chat.qa`) and its grants on the given paths.
// Grants are removed first, while each profile SID can still be derived. Exits 0 only if everything was removed.
import { existsSync, rmSync } from 'node:fs'
import { bind, deleteProfile, ensureProfile, profileName, revoke } from './appcontainer.js'
import { manifestPath, readManifest, writeManifest } from './grants.js'

const [runtime, mode, ...rest] = process.argv.slice(2)
const keepIndex = rest.indexOf('--keep-profile')
const keep = keepIndex === -1 ? undefined : rest[keepIndex + 1]
const targets = keepIndex === -1 ? rest : rest.slice(0, keepIndex)
if (!runtime || !['--state', '--legacy'].includes(mode) || targets.length === 0 || (keepIndex !== -1 && !keep)) {
  throw new Error('Usage: cleanup.mjs <runtime> (--state <folder>... [--keep-profile <name>] | --legacy <path>...)')
}
const api = bind(runtime)
let failed = false
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
    const remaining = grants.filter(entry => entry.profile === keep)
    for (const entry of grants.filter(item => item.profile !== keep)) {
      if (!existsSync(entry.path)) continue
      try {
        revoke(entry.path, entry.sid)
        console.log(`revoked ${entry.sid} on ${entry.path}`)
      } catch (error) {
        failed = true
        remaining.push(entry)
        console.error(error.message)
      }
    }
    for (const profile of new Set(grants.map(entry => entry.profile).filter(name => name !== keep))) {
      try { deleteProfile(api, profile); console.log(`deleted AppContainer profile ${profile}`) }
      catch (error) { console.log(`profile ${profile}: ${error.message}`) }
    }
    if (remaining.length) writeManifest(state, { grants: remaining })
    else rmSync(manifestPath(state), { force: true })
  }
}
process.exit(failed ? 1 : 0)
