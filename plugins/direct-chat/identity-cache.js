import { createHash } from 'node:crypto'
import { closeSync, lstatSync, mkdirSync, openSync, realpathSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { pathKey } from './workspace-path.js'

// A profile-local, best-effort positive identity cache, not an authorization
// database. Empty marker files avoid retaining raw IDs or conversation content.
export const identityDirectory = 'abinadwan-direct-chat-identities'
const keyFor = id => typeof id === 'string' && id.length > 0 && id.length <= 256
  ? createHash('sha256').update(id).digest('hex') : undefined
const absent = path => {
  try { return lstatSync(path) } catch (error) {
    if (error.code === 'ENOENT') return undefined
    throw error
  }
}
const privateMode = stat => process.platform === 'win32' ||
  (stat.uid === process.geteuid() && (stat.mode & 0o077) === 0)

export function identityCache(profileDir, warn) {
  const observed = new Map()
  let profile
  let warned = false
  function unavailable() {
    if (!warned) {
      warned = true
      warn('Direct Chat: identity cache unavailable; using live membership and path policy.')
    }
  }
  try { profile = realpathSync.native(profileDir) } catch { unavailable() }
  function directory(create = false) {
    if (!profile || pathKey(realpathSync.native(profileDir)) !== pathKey(profile)) {
      throw new Error('profile-unavailable')
    }
    const dir = join(profile, identityDirectory)
    let stat = absent(dir)
    if (!stat && create) {
      try { mkdirSync(dir, { mode: 0o700 }) } catch (error) {
        if (error.code !== 'EEXIST') throw error
      }
      stat = absent(dir)
    }
    if (!stat && !create) return undefined
    if (!stat?.isDirectory() || stat.isSymbolicLink() || !privateMode(stat) ||
        pathKey(realpathSync.native(dir)) !== pathKey(dir)) throw new Error('invalid-identity-directory')
    return dir
  }
  function marker(dir, key) {
    const filename = join(dir, key)
    const stat = absent(filename)
    if (stat && (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 ||
        stat.size !== 0 || !privateMode(stat))) throw new Error('invalid-identity-marker')
    return { filename, exists: Boolean(stat) }
  }
  return {
    remember(id) {
      const key = keyFor(id)
      if (!key || observed.get(key) === true) return
      observed.set(key, true)
      try {
        const dir = directory(true)
        const { filename, exists } = marker(dir, key)
        if (!exists) {
          // Exclusive creation never follows or overwrites an existing marker.
          try { closeSync(openSync(filename, 'wx', 0o600)) } catch (error) {
            if (error.code !== 'EEXIST' || !marker(dir, key).exists) throw error
          }
        }
      } catch { unavailable() }
    },
    forget(id) {
      const key = keyFor(id)
      if (!key || observed.get(key) === false) return
      // A fresh authoritative negative result overrides any older disk marker.
      observed.set(key, false)
      try {
        const dir = directory()
        if (!dir) return
        const { filename, exists } = marker(dir, key)
        if (exists) unlinkSync(filename)
      } catch { unavailable() }
    },
    has(id) {
      const key = keyFor(id)
      if (!key) return false
      if (observed.has(key)) return observed.get(key)
      try {
        const dir = directory()
        return Boolean(dir && marker(dir, key).exists)
      } catch {
        unavailable()
        return false
      }
    },
  }
}
