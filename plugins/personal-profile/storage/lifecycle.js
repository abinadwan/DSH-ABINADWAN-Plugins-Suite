import { createHash } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import { createConsentProfile } from '../core/consent.js'
import { files } from './files.js'
import { seal, open } from './envelope.js'
import { normalize, imported, guarded, failure, identity } from './codec.js'
import { merge, strategy } from './restore.js'

// No provider is approved in Phase 5. Caller-supplied objects, environment flags,
// test providers and the separate DPAPI spike cannot enable this entrypoint.
export function createProductionStorage() {
  throw new Error('OS-protected key provider unavailable')
}

// INTERNAL component assembly, never exported by package or called by runtime.
// provider.acquire() must authenticate via trusted Host/OS and return an owned
// 32-byte Buffer; provider.release() must dispose OS handles. Synthetic assembly
// lives exclusively in test-support, excluded from production packages.
export function assembleStorage(root, provider, {beforeRename, inactivityMs = null, now = () => performance.now()} = {}) {
  const disk = files(root, beforeRename)
  if (inactivityMs !== null && (!Number.isSafeInteger(inactivityMs) || inactivityMs < 1)) failure()
  let key = null, generation = 0, lastActivity = 0
  let reviews = new WeakMap()
  const engines = new Set()
  function lock() {
    for (const e of engines) e.host.setLocked(true)
    engines.clear(); reviews = new WeakMap(); generation++
    key?.fill(0); key = null
    guarded(() => provider.release())
  }
  function check() {
    if (!key) failure()
    const time = now()
    if (!Number.isFinite(time) || time < lastActivity || (inactivityMs !== null && time - lastActivity >= inactivityMs)) { lock(); failure() }
    lastActivity = time
  }
  function context(id, domain = 'local') { return {domain, identity: identity(id)} }
  function load(id) {
    check()
    const bytes = disk.read(id)
    return bytes ? open(bytes, key, context(id)) : null
  }
  function invalidate() {
    for (const e of engines) e.host.setLocked(true)
    engines.clear(); generation++; reviews = new WeakMap()
  }
  function save(id, input) {
    check()
    const bytes = seal(normalize(input), key, context(id))
    const epoch = generation
    const outcome = disk.transaction(id, write => write(bytes), () => { if (!key || generation !== epoch) failure() })
    invalidate()
    return outcome
  }
  function fingerprint(id) {
    const bytes = disk.read(id)
    return bytes ? createHash('sha256').update(bytes).digest('hex') : null
  }
  function wrap(object, epoch) {
    return Object.freeze(Object.fromEntries(Object.entries(object).map(([name, value]) => [name,
      typeof value === 'function' ? (...args) => {
        check(); if (generation !== epoch) failure()
        return value(...args)
      } : wrap(value, epoch),
    ])))
  }
  return Object.freeze({
    unlock() {
      if (key) failure()
      let acquired
      try {
        disk.check()
        acquired = provider.acquire()
        if (!Buffer.isBuffer(acquired) || acquired.length !== 32) failure()
        key = Buffer.from(acquired); acquired.fill(0)
        lastActivity = now()
        if (!Number.isFinite(lastActivity)) failure()
      } catch { acquired?.fill?.(0); lock(); failure() }
    },
    lock,
    get locked() { return key === null },
    checkInactivity() { check() },
    load, save,
    access(id) {
      const input = load(id)
      const engine = createConsentProfile(input || {})
      engines.add(engine)
      return wrap(engine, generation)
    },
    review(id, incoming, mode = 'merge') {
      check(); strategy(mode)
      const reviewedBytes = disk.read(id)
      const hash = reviewedBytes ? createHash('sha256').update(reviewedBytes).digest('hex') : null
      const current = reviewedBytes ? open(reviewedBytes, key, context(id)) : null
      const next = imported(incoming)
      const result = mode === 'merge' && current ? merge(current, next) : {input: next, conflicts: Object.freeze([])}
      const handle = Object.freeze({strategy: mode, conflicts: result.conflicts})
      reviews.set(handle, {id, input: result.input, mode, hash, generation})
      return handle
    },
    apply(handle, {keepExisting = false, confirmReplace = false} = {}) {
      check()
      const r = reviews.get(handle)
      if (!r || r.generation !== generation || r.hash !== fingerprint(r.id) ||
          (r.mode === 'replace' && confirmReplace !== true) ||
          (r.mode === 'merge' && handle.conflicts.length && keepExisting !== true)) failure()
      // Recheck revision inside the exclusive writer transaction.
      const outcome = disk.transaction(r.id, write => {
        if (r.hash !== fingerprint(r.id)) failure()
        if (r.mode === 'replace') {
          const previous = load(r.id) || {}
          write(seal(previous, key, context(r.id, 'recovery')), 'recovery')
        }
        return write(seal(imported(r.input), key, context(r.id)))
      }, () => { if (!key || generation !== r.generation) failure() })
      invalidate()
      return outcome
    },
    recover(id) {
      check()
      const bytes = disk.read(id, 'recovery')
      if (!bytes) failure()
      // Recovery also resets consent/permissions and never activates instructions.
      save(id, imported(open(bytes, key, context(id, 'recovery'))))
    },
  })
}
