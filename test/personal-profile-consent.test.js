import test from 'node:test'
import assert from 'node:assert/strict'
import { createConsentProfile } from '../plugins/personal-profile/core/consent.js'

const secret = 'SYNTHETIC_VALUE_NEVER_IN_METADATA'
function fixture(optIn = true) {
  let now = 0
  const { host, reader } = createConsentProfile({ fields: { preferredName: secret, fullName: 'Synthetic Full' }, allowAgentUseApprovedProfileInformation: optIn }, { now: () => now })
  // These identities stand in for a future trusted Harness resolver, not user input.
  const a = host.registerProfile({ name: 'Synthetic Work', canonicalId: 'fixture-profile-a' })
  const b = host.registerProfile({ name: 'Synthetic Home', canonicalId: 'fixture-profile-b' })
  const caller = host.registerCaller()
  const session = host.startSession(caller, a)
  const other = host.startSession(caller, a)
  const elsewhere = host.startSession(caller, b)
  const scope = host.registerScope({ operation: 'read_field', purpose: 'synthetic_form' })
  host.setPermission(a, 'preferredName', 'ask_first')
  host.setPermission(b, 'preferredName', 'ask_first')
  const request = (s = session, field = 'preferredName', sc = scope) => reader.requestField(s, field, sc)
  return { host, reader, a, b, caller, session, other, elsewhere, scope, request, tick: n => { now = n } }
}
const denied = result => assert.deepEqual(result, { status: 'denied' })
const allowed = result => assert.deepEqual(result, { status: 'allowed', field: 'preferredName', value: secret })

test('Allow Once authorizes precisely one pending operation and consumption', () => {
  const f = fixture(), p = f.request(), q = f.request()
  assert.equal(p.status, 'approval_required')
  assert.equal(f.host.decide(p.approval, 'allow_once'), true)
  denied(f.reader.consumeApproval(f.other, p.approval))
  allowed(f.reader.consumeApproval(f.session, p.approval))
  denied(f.reader.consumeApproval(f.session, p.approval))
  assert.equal(f.host.decide(p.approval, 'allow_once'), false)
  denied(f.reader.consumeApproval(f.session, q.approval))
  assert.equal(f.request().status, 'approval_required')
})

test('session consent is bound to caller session Profile field and approved scope', () => {
  const f = fixture(), p = f.request()
  f.host.decide(p.approval, 'allow_session')
  allowed(f.reader.consumeApproval(f.session, p.approval))
  allowed(f.request())
  for (const s of [f.other, f.elsewhere, f.host.startSession(f.host.registerCaller(), f.a)]) assert.equal(f.request(s).status, 'approval_required')
  const scope = f.host.registerScope({ operation: 'read_field', purpose: 'synthetic_other' })
  assert.equal(f.request(f.session, 'preferredName', scope).status, 'approval_required')
  f.host.setPermission(f.a, 'fullName', 'ask_first')
  assert.equal(f.request(f.session, 'fullName').status, 'approval_required')
})

test('deny, invalid, cancelled and unavailable decisions disclose no value', () => {
  for (const decision of ['deny', 'cancelled', 'unavailable', 'allowed-once', { approved: true }, undefined]) {
    const f = fixture(), p = f.request()
    f.host.decide(p.approval, decision)
    denied(f.reader.consumeApproval(f.session, p.approval))
    assert.equal(f.host.decide(p.approval, 'allow_once'), false)
  }
})

test('private and disabled opt-in override all grants, including permanent allow', () => {
  for (const state of ['private', 'allow']) {
    const f = fixture(false)
    f.host.setPermission(f.a, 'preferredName', state)
    denied(f.request())
  }
  const f = fixture()
  f.host.setPermission(f.a, 'preferredName', 'private')
  denied(f.request())
})

test('pending approvals and decided results expire at the deadline', () => {
  for (const decided of [false, true]) {
    const f = fixture(), p = f.request()
    if (decided) f.host.decide(p.approval, 'allow_once')
    f.tick(60_000)
    assert.equal(f.host.decide(p.approval, 'allow_once'), false)
    denied(f.reader.consumeApproval(f.session, p.approval))
  }
})

for (const change of ['end', 'revoke', 'permission', 'optIn', 'lock']) {
  test(`${change} invalidates pending, decided and active consent even after restoration`, () => {
    const f = fixture(), p = f.request(), q = f.request()
    f.host.decide(p.approval, 'allow_session')
    allowed(f.reader.consumeApproval(f.session, p.approval))
    const r = f.request(f.session, 'preferredName', f.host.registerScope({ operation: 'read_field', purpose: 'pending' }))
    f.host.decide(q.approval, 'allow_once')
    if (change === 'end') f.host.endSession(f.session)
    if (change === 'revoke') f.host.revoke(f.a, 'preferredName')
    if (change === 'permission') { f.host.setPermission(f.a, 'preferredName', 'private'); f.host.setPermission(f.a, 'preferredName', 'ask_first') }
    if (change === 'optIn') { f.host.setOptIn(false); f.host.setOptIn(true) }
    if (change === 'lock') { f.host.setLocked(true); denied(f.request()); f.host.setLocked(false) }
    denied(f.reader.consumeApproval(f.session, q.approval))
    assert.equal(f.host.decide(r.approval, 'allow_once'), false)
    assert.notEqual(f.request().status, 'allowed')
  })
}

test('cancellation is terminal before or after a decision', () => {
  for (const decision of [undefined, 'allow_once', 'allow_session']) {
    const f = fixture(), p = f.request()
    if (decision) f.host.decide(p.approval, decision)
    assert.equal(f.reader.cancelApproval(f.session, p.approval), true)
    assert.equal(f.host.decide(p.approval, 'allow_session'), false)
    denied(f.reader.consumeApproval(f.session, p.approval))
    assert.equal(f.request().status, 'approval_required')
  }
})

test('concurrent pending operations remain isolated; duplicate consumes yield one value', async () => {
  const f = fixture(), p = f.request(), q = f.request()
  await Promise.all([Promise.resolve().then(() => f.host.decide(p.approval, 'allow_once')), Promise.resolve().then(() => f.reader.cancelApproval(f.session, q.approval))])
  const results = await Promise.all(Array.from({ length: 12 }, () => Promise.resolve().then(() => f.reader.consumeApproval(f.session, p.approval))))
  assert.equal(results.filter(r => r.status === 'allowed').length, 1)
  denied(f.reader.consumeApproval(f.session, q.approval))
})

test('unknown/forged handles, unknown fields and model-supplied approval flags fail closed', () => {
  const f = fixture()
  for (const session of [null, {}, 'Synthetic Work', { approved: true }]) denied(f.request(session))
  for (const field of ['unknown', '__proto__', 'bad-field', {}, null]) denied(f.request(f.session, field))
  denied(f.request(f.session, 'preferredName', {}))
  denied(f.reader.consumeApproval(f.session, { approved: true }))
  assert.throws(() => f.host.startSession({}, f.a), /Invalid profile input/)
  assert.throws(() => f.host.startSession(f.caller, 'Synthetic Work'), /Invalid profile input/)
  assert.equal(f.host.decide({}, 'allow_once'), false)
})

test('approval metadata and errors contain no values or custom labels; accessors are not read', () => {
  const f = fixture(), p = f.request()
  assert.equal(JSON.stringify(p).includes(secret), false)
  assert.deepEqual(Object.keys(p.metadata).sort(), ['field', 'operation', 'purpose'])
  assert.equal(JSON.stringify(p.approval), '{}')
  let reads = 0
  assert.throws(() => f.host.registerScope({ get purpose() { reads++; throw Error(secret) }, operation: 'read_field' }), { message: 'Invalid profile input' })
  assert.equal(reads, 0)
  assert.equal('decide' in f.reader, false)
  assert.equal('setPermission' in f.reader, false)
})

test('canonical Profile aliases and malformed trusted registration are rejected', () => {
  const f = fixture()
  for (const identity of [{ name: 'Synthetic WORK', canonicalId: 'fixture-profile-a' }, { name: 'Synthetic Work', canonicalId: 'different' }, { name: '../bad', canonicalId: 'x' }, { name: 'x', canonicalId: '' }]) assert.throws(() => f.host.registerProfile(identity), /Invalid profile input/)
})

test('default construction stays opted out and known allow still requires a live session', () => {
  const { host, reader } = createConsentProfile({ fields: { preferredName: secret } })
  const p = host.registerProfile({ name: 'Synthetic', canonicalId: 'fixture-default' })
  const s = host.startSession(host.registerCaller(), p)
  const scope = host.registerScope({ operation: 'read_field', purpose: 'synthetic' })
  host.setPermission(p, 'preferredName', 'allow')
  denied(reader.requestField(s, 'preferredName', scope))
  host.setOptIn(true)
  allowed(reader.requestField(s, 'preferredName', scope))
  host.endSession(s)
  denied(reader.requestField(s, 'preferredName', scope))
})

test('targeted revocation preserves unrelated environment grants', () => {
  const f = fixture(), p = f.request(), q = f.request(f.elsewhere)
  for (const approval of [p.approval, q.approval]) f.host.decide(approval, 'allow_session')
  allowed(f.reader.consumeApproval(f.session, p.approval))
  allowed(f.reader.consumeApproval(f.elsewhere, q.approval))
  f.host.revoke(f.a, 'preferredName')
  denied(f.request())
  allowed(f.request(f.elsewhere))
})

test('cross-instance tokens and mutation of returned requests convey no authority', () => {
  const f = fixture(), g = fixture(), p = f.request()
  p.metadata = { field: 'fullName', approved: true }
  assert.equal(g.host.decide(p.approval, 'allow_once'), false)
  denied(g.reader.consumeApproval(f.session, p.approval))
  denied(g.reader.requestField(f.session, 'preferredName', f.scope))
  f.host.decide(p.approval, 'allow_once')
  allowed(f.reader.consumeApproval(f.session, p.approval))
})

test('clock failure or rollback clears active grants and pending approvals', () => {
  for (const badTime of [NaN, -1]) {
    const f = fixture(), p = f.request(), q = f.request()
    f.host.decide(p.approval, 'allow_session')
    allowed(f.reader.consumeApproval(f.session, p.approval))
    f.tick(badTime)
    denied(f.request())
    f.tick(1)
    assert.equal(f.host.decide(q.approval, 'allow_once'), false)
    assert.equal(f.request().status, 'approval_required')
  }
})

test('pending budget fails closed, expiry reclaims capacity, and no consent path logs', () => {
  const f = fixture(), logs = []
  const original = new Map(['log', 'warn', 'error', 'info', 'debug'].map(k => [k, console[k]]))
  try {
    for (const k of original.keys()) console[k] = (...args) => logs.push(args)
    for (let i = 0; i < 256; i++) assert.equal(f.request().status, 'approval_required')
    denied(f.request())
    f.tick(60_000)
    const p = f.request()
    assert.equal(p.status, 'approval_required')
    f.host.decide(p.approval, 'deny')
    denied(f.reader.consumeApproval(f.session, p.approval))
  } finally { for (const [k, fn] of original) console[k] = fn }
  assert.deepEqual(logs, [])
})

test('a transient clock failure fails the whole read closed without a second sample', () => {
  let calls = 0
  const { host, reader } = createConsentProfile({ fields: { preferredName: secret }, allowAgentUseApprovedProfileInformation: true }, { now: () => { if (++calls === 1) throw Error('synthetic clock failure'); return 0 } })
  const profile = host.registerProfile({ name: 'Synthetic', canonicalId: 'fixture-clock' })
  const session = host.startSession(host.registerCaller(), profile)
  const scope = host.registerScope({ operation: 'read_field', purpose: 'synthetic' })
  host.setPermission(profile, 'preferredName', 'ask_first')
  denied(reader.requestField(session, 'preferredName', scope))
  assert.equal(calls, 1)
})
