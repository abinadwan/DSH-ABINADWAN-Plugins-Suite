import { createHash } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import { createConsentProfile } from '../core/consent.js'
import { files } from './files.js'
import { seal, open } from './envelope.js'
import { normalize, imported, guarded, failure, identity, profileInput } from './codec.js'
import { merge, strategy } from './restore.js'

export const STORAGE_LIMITS = Object.freeze({accessLeases: 16, reviews: 16, reviewTtlMs: 60_000})

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
  let key = null, generation = 0, lastActivity = 0, lastObserved = 0, reviewTimer = null
  let authorizationReady = false
  const reviews = new Map(), leases = new Set()
  function releaseLease(cell) {
    try { cell.engine?.host.setLocked(true) }
    finally { cell.engine = null; leases.delete(cell) }
  }
  function removeReview(handle) {
    const record = reviews.get(handle)
    if (record) record.input = null
    reviews.delete(handle)
  }
  function clearReviewTimer() {
    if (reviewTimer !== null) clearTimeout(reviewTimer)
    reviewTimer = null
  }
  function invalidate() {
    for (const cell of leases) releaseLease(cell)
    for (const handle of reviews.keys()) removeReview(handle)
    clearReviewTimer(); generation++
  }
  function lock() {
    invalidate()
    key?.fill(0); key = null
    guarded(() => provider.release())
  }
  function clock() {
    let time
    try { time = now() } catch { time = NaN }
    if (!Number.isFinite(time) || time < lastObserved) { lock(); failure() }
    lastObserved = time
    return time
  }
  function expireReviews(time) {
    for (const [handle, record] of reviews) if (time >= record.expiresAt) removeReview(handle)
    if (!reviews.size) clearReviewTimer()
  }
  function scheduleReviews(time) {
    clearReviewTimer()
    if (!reviews.size) return
    const earliest = Math.min(...[...reviews.values()].map(r => r.expiresAt))
    // One timer per storage instance. Callback captures no imported record.
    reviewTimer = setTimeout(() => {
      reviewTimer = null
      if (!key) return
      try {
        const observed = clock()
        expireReviews(observed); scheduleReviews(observed)
      } catch { /* clock() already locked and dropped all retained state */ }
    }, Math.max(1, Math.ceil(earliest - time)))
    reviewTimer.unref()
  }
  function check() {
    if (!key) failure()
    const time = clock()
    if (inactivityMs !== null && time - lastActivity >= inactivityMs) { lock(); failure() }
    lastActivity = time
    expireReviews(time)
    return time
  }
  function context(id, domain = 'local') { return {domain, identity: identity(id)} }
  function load(id) {
    check()
    const bytes = disk.read(id)
    return bytes ? open(bytes, key, context(id)) : null
  }
  function save(id, input) {
    check()
    authorizationReady = false
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
  function checkLease(cell, epoch) {
    if (!cell.engine || generation !== epoch) failure()
    check()
  }
  // Wrappers retain only a revocable cell and method path, NEVER raw engine
  // methods/objects. Nulling the cell releases the entire decrypted engine even
  // when a caller retains every wrapper and detached method indefinitely.
  function method(cell, epoch, path) {
    return (...args) => {
      checkLease(cell, epoch)
      let target = cell.engine
      for (const name of path) target = target[name]
      return target(...args)
    }
  }
  function wrapShape(object, cell, epoch, path = []) {
    return Object.freeze(Object.fromEntries(Object.entries(object).map(([name, value]) => [name,
      typeof value === 'function' ? method(cell, epoch, [...path, name]) : wrapShape(value, cell, epoch, [...path, name]),
    ])))
  }
  function disposer(cell, epoch) {
    return () => { checkLease(cell, epoch); releaseLease(cell) }
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
        lastActivity = now(); lastObserved = lastActivity
        if (!Number.isFinite(lastActivity)) failure()
      } catch { acquired?.fill?.(0); lock(); failure() }
    },
    lock,
    get locked() { return key === null },
    checkInactivity() { check() },
    load, save,
    get authorizationReady() { return authorizationReady && key !== null && !disk.authorizationBlocked() },
    setPermission(id, canonicalId, field, state) {
      check()
      // Revoke every retained lease before any validation, I/O, or later read.
      invalidate(); authorizationReady = false
      const epoch = generation
      try {
        identity(canonicalId)
        let completed = false
        const outcome = disk.transaction(id, write => {
          disk.beginAuthorizationChange()
          const current = load(id)
          if (!current) failure()
          const policies = current.permissionState.profiles
          const fields = Object.hasOwn(policies, canonicalId) ? policies[canonicalId] : {}
          current.permissionState.profiles = {...policies, [canonicalId]: {...fields, [field]: state}}
          const result = write(seal(normalize(current), key, context(id)))
          completed = disk.completeAuthorizationChange(result)
          return result
        }, () => { check(); if (generation !== epoch) failure() })
        authorizationReady = completed && outcome.cleanupComplete
        return outcome
      } catch { authorizationReady = false; failure() }
    },
    access(id) {
      check()
      if (leases.size >= STORAGE_LIMITS.accessLeases) failure()
      const input = load(id)
      const cell = {engine: createConsentProfile(profileInput(input || {}))}
      const wrapped = wrapShape(cell.engine, cell, generation)
      leases.add(cell)
      return Object.freeze({...wrapped, dispose: disposer(cell, generation)})
    },
    review(id, incoming, mode = 'merge') {
      const time = check()
      if (reviews.size >= STORAGE_LIMITS.reviews) failure()
      strategy(mode)
      const reviewedBytes = disk.read(id)
      const hash = reviewedBytes ? createHash('sha256').update(reviewedBytes).digest('hex') : null
      const current = reviewedBytes ? open(reviewedBytes, key, context(id)) : null
      const next = imported(incoming)
      const result = mode === 'merge' && current ? merge(current, next) : {input: next, conflicts: Object.freeze([])}
      const handle = Object.freeze({strategy: mode, conflicts: result.conflicts})
      reviews.set(handle, {id, input: result.input, mode, hash, generation, expiresAt: time + STORAGE_LIMITS.reviewTtlMs})
      scheduleReviews(time)
      return handle
    },
    cancelReview(handle) {
      const time = check()
      if (!reviews.has(handle)) failure()
      removeReview(handle); scheduleReviews(time)
    },
    apply(handle, {keepExisting = false, confirmReplace = false} = {}) {
      check()
      authorizationReady = false
      const r = reviews.get(handle)
      if (!r) failure()
      if (r.generation !== generation || r.hash !== fingerprint(r.id)) {
        removeReview(handle); failure()
      }
      if ((r.mode === 'replace' && confirmReplace !== true) ||
          (r.mode === 'merge' && handle.conflicts.length && keepExisting !== true)) failure()
      // Recheck revision inside the exclusive writer transaction.
      const outcome = disk.transaction(r.id, write => {
        if (r.hash !== fingerprint(r.id)) { removeReview(handle); failure() }
        if (r.mode === 'replace') {
          const previous = load(r.id) || {}
          write(seal(previous, key, context(r.id, 'recovery')), 'recovery')
        }
        return write(seal(imported(r.input), key, context(r.id)))
      }, () => {
        check()
        if (!key || generation !== r.generation || reviews.get(handle) !== r) failure()
      })
      invalidate()
      return outcome
    },
    recover(id) {
      check()
      const bytes = disk.read(id, 'recovery')
      if (!bytes) failure()
      // Recovery also resets consent/permissions and never activates instructions.
      return save(id, imported(open(bytes, key, context(id, 'recovery'))))
    },
  })
}
