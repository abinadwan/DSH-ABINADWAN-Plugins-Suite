// INTERNAL architecture under test. Not a Harness API, Remote, browser bridge,
// model tool or production factory. resolve must be owned by authenticated Host.
import {performance} from 'node:perf_hooks'
import {createHash} from 'node:crypto'
import {identity, failure} from '../storage/codec.js'
import {entries, validateEnvironmentName} from '../core/schema.js'
import {profileNameKey} from '../core/profile-identity.js'

const revision = input => createHash('sha256').update(JSON.stringify(input)).digest('hex')
const denied = () => ({status:'denied'})
export function assembleGate(storage, recordId, resolve, {now = () => performance.now()} = {}) {
  identity(recordId)
  const bindings = new Map(), approvals = new Map(), invalid = new WeakSet()
  let disposed = false, lastTime = -Infinity
  const deadlines = new Map()
  function clear() {
    for (const [token,b] of bindings) {
      try { b.engine?.host.setLocked(true) } catch { /* storage already revoked */ }
      try { b.lease?.dispose() } catch { /* already invalidated by storage */ }
      if (b.role === 'agent') invalid.add(token)
    }
    bindings.clear(); approvals.clear(); deadlines.clear()
  }
  function remove(approval) { approvals.delete(approval); deadlines.delete(approval) }
  // Terminal revocation of ONE binding: its approvals, session grants (engine)
  // and lease. Other authenticated sessions are re-resolved on every request
  // and keep their own bindings; global invalidation is reserved for policy,
  // lock and clock events (clear()).
  function revoke(token, b) {
    for (const [approval, owner] of approvals) if (owner === b) {
      try { b.engine?.reader.cancelApproval(b.handle, approval) } catch { /* engine already revoked */ }
      remove(approval)
    }
    try { b.engine?.host.setLocked(true) } catch { /* storage already revoked */ }
    try { b.lease?.dispose() } catch { /* already invalidated by storage */ }
    bindings.delete(token)
  }
  function sweep() {
    const time = now()
    if (!Number.isFinite(time) || time < lastTime) { clear(); failure() }
    lastTime = time
    for (const [approval, expires] of deadlines) if (time >= expires) {
      const b = approvals.get(approval)
      try { b?.engine.reader.cancelApproval(b.handle, approval) } catch {}
      remove(approval)
    }
    return time
  }
  function auth(token, role) {
    try { sweep() } catch { clear(); failure() }
    if (disposed || storage.locked || !token || typeof token !== 'object' || invalid.has(token)) failure()
    const prior = bindings.get(token)
    let resolved
    try {
      // Snapshot own data descriptors: no getter/prototype identity claims.
      resolved = Object.fromEntries(entries(resolve(token), ['role','profile','environment','caller','session']))
      if (!['agent','management'].includes(resolved.role) || resolved.role !== role ||
          !resolved.caller || !resolved.session || typeof resolved.caller !== 'object' ||
          typeof resolved.session !== 'object') failure()
      identity(resolved.profile); validateEnvironmentName(resolved.environment)
      if (prior && ['role','profile','environment','caller','session'].some(k => prior[k] !== resolved[k])) failure()
    } catch {
      // Every resolver/validation failure is terminal, including failures before
      // a canonical id was validated. Remove this binding's approvals and revoke
      // its engine; an unrelated session's binding is not collateral.
      if (prior) revoke(token, prior)
      invalid.add(token)
      failure()
    }
    if (prior) return prior
    if (bindings.size >= 64) failure()
    // A name is never authority; reject conflicting canonical/name associations.
    for (const b of bindings.values()) {
      if (role === 'agent' && b.role === 'agent' && b.session === resolved.session) failure()
      if ((b.profile === resolved.profile) !== (profileNameKey(b.environment) === profileNameKey(resolved.environment))) failure()
    }
    const b = {...resolved, engine:null}
    bindings.set(token,b)
    return b
  }
  function active(token) {
    const b = auth(token,'agent')
    // Lease validates generation on EVERY operation; load checks lock/inactivity.
    if (!storage.authorizationReadyFor(recordId)) failure()
    const input = storage.load(recordId)
    if (!input) failure()
    if (b.engine) {
      if (b.revision !== revision(input)) { clear(); failure() }
      // A retained storage lease is only a generation witness.
      try { b.lease.host.setLocked(false) } catch { clear(); failure() }
      return b
    }
    b.revision = revision(input)
    b.lease = storage.access(recordId)
    b.engine = b.lease
    const h = b.engine.host
    const profile = h.registerProfile({name:b.environment,canonicalId:b.profile})
    const policies = input.permissionState.profiles
    if (Object.hasOwn(policies,b.profile)) for (const [field,state] of Object.entries(policies[b.profile])) h.setPermission(profile,field,state)
    b.handle = h.startSession(h.registerCaller(),profile)
    b.scope = h.registerScope({operation:'read_field',purpose:'synthetic_integration_qa'})
    return b
  }
  function read(fn) { try { return fn() } catch { return denied() } }
  return Object.freeze({
    reader:Object.freeze({
      request(token,field) { return read(()=> {
        const b=active(token), result=b.engine.reader.requestField(b.handle,field,b.scope)
        if(result.approval) {
          if(approvals.size>=256) { b.engine.reader.cancelApproval(b.handle,result.approval); return denied() }
          approvals.set(result.approval,b)
          deadlines.set(result.approval, sweep() + 60_000)
        }
        return result
      }) },
      consume(token,approval) { return read(()=> { const b=active(token); if(approvals.get(approval)!==b) return denied(); remove(approval); return b.engine.reader.consumeApproval(b.handle,approval) }) },
      cancel(token,approval) { try { const b=active(token); if(approvals.get(approval)!==b) return false; remove(approval); return b.engine.reader.cancelApproval(b.handle,approval) } catch {return false} },
    }),
    management:Object.freeze({
      setAuthorization(token, input) {
        const b=auth(token,'management')
        const patch=Object.fromEntries(entries(input,['optIn','fields']))
        const update={}
        if (Object.hasOwn(patch,'optIn')) update.optIn=patch.optIn
        if (Object.hasOwn(patch,'fields')) update.permissions={[b.profile]:patch.fields}
        const result=storage.setAuthorization(recordId,update)
        clear()
        return result
      },
      setOptIn(token, enabled) {
        auth(token,'management')
        const result=storage.setOptIn(recordId,enabled)
        clear()
        return result
      },
      setPermission(token,field,state) {
        const b=auth(token,'management')
        // Read role/profile before invalidation; changes invalidate every session.
        const profile=b.profile
        const result=storage.setPermission(recordId,profile,field,state)
        clear()
        return result
      },
      decide(token,approval,outcome) {
        try {
          const manager=auth(token,'management'), b=approvals.get(approval)
          if(!b || b.profile!==manager.profile || !storage.authorizationReadyFor(recordId)) return false
          b.lease.host.setLocked(false)
          return b.engine.host.decide(approval,outcome)
        } catch {return false}
      },
    }),
    composeInstructions() { return Object.freeze({status:'disabled'}) },
    dispose() {clear(); disposed=true},
  })
}
