import { constants, lstatSync, realpathSync, openSync, closeSync, fstatSync, readSync, writeFileSync, fsyncSync, renameSync, unlinkSync } from 'node:fs'
import { resolve, parse, join } from 'node:path'
import { createHash, randomBytes } from 'node:crypto'
import { MAX_RECORD } from './envelope.js'
import { failure, guarded, identity } from './codec.js'

// Root must be preprovisioned by the Host, with trusted, non-renamable parents.
// Node has no portable openat/dirfd API: hostile same-user directory races are
// outside this component's guarantees. Production remains unavailable.
export function files(root, beforeRename = () => {}) {
  function checkRoot() {
    if (typeof root !== 'string' || root !== resolve(root)) failure()
    let current = parse(root).root
    for (const part of root.slice(current.length).split(/[\\/]/).filter(Boolean)) {
      current = join(current, part)
      const st = lstatSync(current)
      if (!st.isDirectory() || st.isSymbolicLink()) failure()
    }
    if (realpathSync(root) !== root) failure()
    const st = lstatSync(root)
    if (process.platform !== 'win32' && ((st.mode & 0o077) || st.uid !== process.getuid())) failure()
  }
  function path(id, kind) {
    identity(id)
    if (!['record', 'recovery'].includes(kind)) failure()
    return join(root, createHash('sha256').update(id).digest('hex') + '.' + kind)
  }
  function checkTarget(file) {
    try {
      const st = lstatSync(file)
      if (!st.isFile() || st.isSymbolicLink() || st.nlink !== 1 || (process.platform !== 'win32' && ((st.mode & 0o077) || st.uid !== process.getuid()))) failure()
      return st
    } catch (e) { if (e.code === 'ENOENT') return null; throw e }
  }
  function read(id, kind = 'record') {
    return guarded(() => {
      checkRoot()
      const file = path(id, kind), previous = checkTarget(file)
      if (!previous) return null
      const fd = openSync(file, constants.O_RDONLY | (constants.O_NOFOLLOW || 0))
      try {
        const st = fstatSync(fd)
        if (!st.isFile() || st.nlink !== 1 || st.ino !== previous.ino || st.dev !== previous.dev || st.size > MAX_RECORD) failure()
        const bytes = Buffer.alloc(MAX_RECORD + 1)
        let offset = 0, n
        do { n = readSync(fd, bytes, offset, bytes.length - offset, null); offset += n } while (n && offset < bytes.length)
        if (offset > MAX_RECORD) failure()
        return bytes.subarray(0, offset)
      } finally { closeSync(fd) }
    })
  }
  function transaction(id, work, checkCommit = () => {}) {
    return guarded(() => {
      checkRoot()
      const lock = join(root, '.writer-lock')
      const fd = openSync(lock, 'wx', 0o600)
      let outcome
      try {
        outcome = work((bytes, kind = 'record') => write(id, bytes, kind, checkCommit))
        return outcome
      } finally {
        try { closeSync(fd); unlinkSync(lock) } catch {
          // A committed operation must never masquerade as a rolled-back failure.
          // A retained lock blocks future writers until trusted Host recovery.
          if (outcome) outcome.cleanupComplete = false
        }
      }
    })
  }
  function write(id, bytes, kind, checkCommit) {
    checkRoot()
    if (!Buffer.isBuffer(bytes) || bytes.length > MAX_RECORD) failure()
    const dest = path(id, kind)
    checkTarget(dest)
    const temp = join(root, randomBytes(24).toString('hex') + '.tmp')
    let fd, committed = false
    try {
      fd = openSync(temp, 'wx', 0o600)
      writeFileSync(fd, bytes); fsyncSync(fd); closeSync(fd); fd = undefined
      beforeRename()
      checkCommit(); checkRoot(); checkTarget(dest)
      renameSync(temp, dest); committed = true
      // Directory fsync is unsupported on Windows. A successful rename is the
      // commit point; power-loss durability depends on filesystem/platform.
      const outcome = {committed: true, durable: false, cleanupComplete: true}
      if (process.platform !== 'win32') {
        let dir
        try { dir = openSync(root, constants.O_RDONLY); fsyncSync(dir); outcome.durable = true }
        catch { /* commit succeeded; report durability uncertainty explicitly */ }
        finally { if (dir !== undefined) { try { closeSync(dir) } catch {} } }
      }
      return outcome
    } finally {
      if (fd !== undefined) closeSync(fd)
      if (!committed) { try { unlinkSync(temp) } catch { /* encrypted orphan only */ } }
    }
  }
  return {read, transaction, check: () => guarded(checkRoot)}
}
