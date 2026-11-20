// Remove Direct Chat AppContainer grants and profiles. Usage:
//   node cleanup.mjs <runtime-with-koffi> --state <host-state-folder> [...more] [--keep-profile <name>]
//     Revokes every grant the folder's manifest records, except those of the kept profile, deletes those
//     profiles, and rewrites the manifest with what remains (removing it when nothing does).
//   node cleanup.mjs <runtime-with-koffi> --legacy <granted-path> [...more paths]
//     Removes the former shared QA profile (`abinadwan.direct-chat.qa`) and its grants on the given paths.
// Grants are removed first, while each profile SID can still be derived. Exits 0 only if everything was removed.
import { lstatSync } from 'node:fs'
import { bind, deleteProfile, profileName, profileSid, revoke } from './appcontainer.js'
import { assertGrantable, assertGrantTree, cleanupRecorded } from './grants.js'
import { bindStorage, samePath } from './storage-lease.js'

const [runtime, mode, ...rest] = process.argv.slice(2)
const keepIndex = rest.indexOf('--keep-profile')
const keep = keepIndex === -1 ? undefined : rest[keepIndex + 1]
const targets = keepIndex === -1 ? rest : rest.slice(0, keepIndex)
if (!runtime || !['--state', '--legacy'].includes(mode) || targets.length === 0 || (keepIndex !== -1 && !keep)) {
  throw new Error('Usage: cleanup.mjs <runtime> (--state <folder>... [--keep-profile <name>] | --legacy <path>...)')
}
const api = bind(runtime)
const io = bindStorage(runtime)
const encoded = process.env.ABINADWAN_DIRECT_CHAT_CLEANUP_OWNERSHIP
const owned = encoded ? JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) : null
const inherited = owned ? io.receive(owned.transfer) : null
let failed = false
if (mode === '--legacy') {
  const sid = profileSid(api, profileName)
  for (const path of targets.filter(present)) {
    const pinned = io.pin(path)
    try { assertGrantTree(path, io); revoke(path, sid) } finally { io.close(pinned) }
    console.log(`revoked ${sid} on ${path}`)
  }
  deleteProfile(api, profileName)
  console.log(`deleted AppContainer profile ${profileName}`)
} else {
  for (const state of targets) {
    let lease
    try {
      if (!owned) lease = io.claim(state)
      const errors = cleanupRecorded(state, { keep, io, remove(profile) {
        deleteProfile(api, profile)
        console.log('deleted AppContainer profile ' + profile)
      },
        revoke(entry) {
          if (!present(entry.path)) return
          assertGrantable(entry.path)
          const held = owned?.roots.some(path => samePath(path, entry.path))
          const root = entry.rights === 'M' && !held ? io.claim(entry.path) : null
          let pinned
          try {
            pinned = io.pin(entry.path)
            const key = assertGrantTree(entry.path, io)
            if (entry.key && key !== entry.key) {
              throw new Error('A recorded grant target changed. Cleanup was deferred.')
            }
            revoke(entry.path, entry.sid)
          } finally { if (pinned) io.close(pinned); root?.close() }
        },
      })
      for (const error of errors) console.error(error.message)
      failed ||= !!errors.length
    } catch (error) {
      console.error(error.message)
      failed = true
    } finally { lease?.close() }
  }
}
inherited?.close()
process.exitCode = failed ? 1 : 0

function present(path) {
  try { lstatSync(path); return true } catch (error) { if (error.code === 'ENOENT') return false; throw error }
}
