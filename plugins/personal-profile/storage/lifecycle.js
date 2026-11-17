import { createHash } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import { createConsentProfile } from '../core/consent.js'
import { files } from './files.js'
import { seal, open } from './envelope.js'
import { imported, guarded, failure, identity, profileInput } from './codec.js'
import {ordinaryProfile, managementProfile} from './authorization.js'
import {validateIdentifier} from '../core/schema.js'
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
  let authorizationReady = false, authorizedRecord = null, authorizedRevision = null
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
  function dropAuthorization() {
    authorizationReady = false; authorizedRecord = null; authorizedRevision = null
  }
  function lock() {
    dropAuthorization()
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
  const hashBytes = bytes => bytes ? createHash('sha256').update(bytes).digest('hex') : null
  // Trusted internal editing only: revision and input come from the SAME read.
  // This is not an authentication token or a public browser/model endpoint.
  function readForEdit(id) {
    check(); identity(id)
    const bytes = disk.read(id)
    return Object.freeze({revision:hashBytes(bytes), input:bytes ? open(bytes,key,context(id)) : null})
  }
  function saveRecord(id, input, expectedRevision) {
    check(); identity(id)
    const checkRevision = actual => {
      if (expectedRevision !== undefined && actual !== expectedRevision) failure()
    }
    // Reject stale drafts and authority changes before invalidating a lease.
    const snapshot = readForEdit(id)
    checkRevision(snapshot.revision)
    ordinaryProfile(input, snapshot.input)
    invalidate(); dropAuthorization()
    const epoch = generation
    return disk.transaction(id, write => {
      const current = readForEdit(id)
      // Repeat while holding the cooperative exclusive writer lock.
      checkRevision(current.revision)
      const next = ordinaryProfile(input, current.input)
      return write(seal(next, key, context(id)))
    }, () => { check(); if (generation !== epoch) failure()
      if (expectedRevision !== undefined) checkRevision(fingerprint(id))
    })
  }
  // Legacy internal full replacement; never expose to an editor transport.
  function save(id,input) { return saveRecord(id,input,undefined) }
  function saveIfRevision(id,expectedRevision,input) {
    if (expectedRevision !== null &&
        (typeof expectedRevision !== 'string' || !/^[0-9a-f]{64}$/.test(expectedRevision))) failure()
    return saveRecord(id,input,expectedRevision)
  }
  function authorizationTransaction(id, work, verify = () => {}, enable = false) {
    invalidate(); dropAuthorization()
    const epoch = generation
    try {
      let completed = false, started = false, writtenRevision = null
      const outcome = disk.transaction(id, write => {
        const commit = (input, kind = 'record') => {
          // Validation and encryption finish BEFORE a persistent fence exists.
          const bytes = seal(input, key, context(id, kind === 'recovery' ? 'recovery' : 'local'))
          if (!started) { disk.beginAuthorizationChange(); started = true }
          const result = write(bytes, kind)
          if (kind === 'record' && result.committed) writtenRevision = hashBytes(bytes)
          return result
        }
        const result = work(commit)
        completed = disk.completeAuthorizationChange(result)
        return result
      }, () => { check(); if (generation !== epoch) failure(); verify() })
      authorizationReady = enable && completed && outcome.cleanupComplete && writtenRevision !== null
      authorizedRecord = authorizationReady ? id : null
      authorizedRevision = authorizationReady ? writtenRevision : null
      return outcome
    } catch { dropAuthorization(); failure() }
  }
  function setAuthorization(id, patch) {
    return guarded(() => {
      check(); identity(id)
      // Complete preflight before writer-lock creation. Repeat under the lock
      // against the actual revision so concurrent data edits cannot be lost.
      managementProfile(load(id), patch)
      return authorizationTransaction(id, commit => commit(managementProfile(load(id), patch)), undefined, true)
    })
  }
  function fingerprint(id) { return hashBytes(disk.read(id)) }
  // Bind readiness to the exact committed ciphertext, not to decoded text or
  // whichever record happens to be current AFTER releasing the writer lock.
  // This detects cooperative revision changes, not hostile filesystem replay.
  function authorizedBytes(id) {
    identity(id)
    if (!key || !authorizationReady || authorizedRecord !== id) return null
    try {
      if (!disk.authorizationBlocked()) {
        const bytes = disk.read(id)
        if (bytes && hashBytes(bytes) === authorizedRevision && !disk.authorizationBlocked()) return bytes
      }
    } catch { /* fail closed without sensitive error content */ }
    dropAuthorization(); invalidate()
    return null
  }
  function loadAuthorized(id) {
    check()
    const bytes = authorizedBytes(id)
    if (!bytes) return null
    try { return open(bytes,key,context(id)) }
    catch { dropAuthorization(); invalidate(); failure() }
  }
  function checkLease(cell, epoch) {
    if (!cell.engine || generation !== epoch) failure()
    check()
    if (cell.authorizedId !== null && !authorizedBytes(cell.authorizedId)) failure()
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
    return () => {
      // Disposal may reclaim a stale authorized lease without granting access.
      if (!cell.engine || generation !== epoch) failure()
      check(); releaseLease(cell)
    }
  }
  function accessRecord(id, authorized) {
    check()
    if (leases.size >= STORAGE_LIMITS.accessLeases) failure()
    const input = authorized ? loadAuthorized(id) : load(id)
    if (authorized && !input) failure()
    const cell = {engine:createConsentProfile(profileInput(input || {})), authorizedId:authorized?id:null}
    const wrapped = wrapShape(cell.engine,cell,generation)
    leases.add(cell)
    return Object.freeze({...wrapped,dispose:disposer(cell,generation)})
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
    load, save, readForEdit, saveIfRevision, loadAuthorized,
    get authorizationReady() { return authorizedRecord !== null && authorizedBytes(authorizedRecord) !== null },
    authorizationReadyFor(id) { return authorizedBytes(id) !== null },
    setAuthorization,
    setOptIn(id, enabled) { return setAuthorization(id, {optIn: enabled}) },
    setPermission(id, canonicalId, field, state) {
      return guarded(() => {
        identity(id); identity(canonicalId); validateIdentifier(field)
        if (!['private', 'ask_first', 'allow'].includes(state)) failure()
        return setAuthorization(id, {permissions: {[canonicalId]: {[field]: state}}})
      })
    },
    access(id) { return accessRecord(id,false) },
    accessAuthorized(id) { return accessRecord(id,true) },
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
      dropAuthorization()
      const r = reviews.get(handle)
      if (!r) failure()
      if (r.generation !== generation || r.hash !== fingerprint(r.id)) {
        removeReview(handle); failure()
      }
      if ((r.mode === 'replace' && confirmReplace !== true) ||
          (r.mode === 'merge' && handle.conflicts.length && keepExisting !== true)) failure()
      const next = imported(r.input)
      // The reviewed result resets authority. Fence recovery and final writes
      // together; a partial replacement retains the fence across restarts.
      return authorizationTransaction(r.id, commit => {
        if (r.hash !== fingerprint(r.id)) failure()
        if (r.mode === 'replace') commit(load(r.id) || {}, 'recovery')
        return commit(next)
      }, () => { if (clock() >= r.expiresAt) failure() })
    },
    recover(id) {
      check()
      const bytes = disk.read(id, 'recovery')
      if (!bytes) failure()
      // Recovery also resets consent/permissions and never activates instructions.
      const next = imported(open(bytes, key, context(id, 'recovery')))
      return authorizationTransaction(id, commit => commit(next))
    },
  })
}
