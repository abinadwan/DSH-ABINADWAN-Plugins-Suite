import test from 'node:test'
import assert from 'node:assert/strict'
import { createConsentProfile } from '../plugins/personal-profile/core/consent.js'
import { LIMITS } from '../plugins/personal-profile/core/limits.js'

function fixture(input = {}) {
  const { host, reader } = createConsentProfile(input)
  const a = host.registerProfile({ name: 'Synthetic Work', canonicalId: 'fixture-a' })
  const b = host.registerProfile({ name: 'Synthetic Home', canonicalId: 'fixture-b' })
  return { host, reader, a, b, instructions: host.instructions }
}

test('empty defaults, inheritance, override precedence and explicitly empty override', () => {
  const { instructions: i, a, b } = fixture()
  assert.deepEqual(i.preview(a), { global: '', override: null, source: 'global', effective: '' })
  i.setGlobal('Use concise prose.')
  assert.equal(i.preview(a).effective, 'Use concise prose.')
  i.setOverride(a, 'Use detailed prose here.')
  assert.deepEqual(i.preview(a), { global: 'Use concise prose.', override: 'Use detailed prose here.', source: 'environment', effective: 'Use detailed prose here.' })
  assert.equal(i.preview(b).effective, 'Use concise prose.')
  i.setOverride(a, '')
  assert.equal(i.preview(a).effective, '')
  assert.equal(i.preview(a).source, 'environment')
  i.deleteOverride(a)
  assert.equal(i.preview(a).override, null)
  assert.equal(i.preview(a).effective, 'Use concise prose.')
  i.reset()
  assert.equal(i.preview(b).effective, '')
})

test('initial Master Profile instructions are managed in place and previews are detached', () => {
  const { instructions: i, a, b } = fixture({ instructions: { global: 'Synthetic global', environments: { 'Synthetic Work': '' } } })
  assert.equal(i.preview(a).source, 'environment')
  assert.equal(i.preview(b).effective, 'Synthetic global')
  const preview = i.preview(b)
  try { preview.effective = 'changed' } catch {}
  assert.equal(i.preview(b).effective, 'Synthetic global')
  i.reset()
  assert.equal(i.preview(a).override, null)
})

test('updates validate atomically, enforce existing UTF-16 budgets and never echo text', () => {
  const { instructions: i, a } = fixture()
  i.setGlobal('g')
  i.setOverride(a, 'e')
  const before = i.preview(a)
  for (const bad of [null, undefined, {}, 42, 'x'.repeat(LIMITS.instructions + 1)]) {
    for (const update of [() => i.setGlobal(bad), () => i.setOverride(a, bad)]) {
      assert.throws(update, { message: 'Invalid profile input' })
      assert.deepEqual(i.preview(a), before)
    }
  }
  i.setGlobal('x'.repeat(LIMITS.instructions))
  i.setOverride(a, '😀'.repeat(LIMITS.instructions / 2))
  assert.equal(i.preview(a).effective.length, LIMITS.instructions)
})

test('only registered same-instance Profile handles may manage or preview overrides', () => {
  const f = fixture(), g = fixture()
  for (const forged of [null, {}, 'Synthetic Work', g.a, { name: 'Synthetic Work', canonicalId: 'fixture-a' }]) {
    for (const call of [() => f.instructions.preview(forged), () => f.instructions.setOverride(forged, ''), () => f.instructions.deleteOverride(forged)]) assert.throws(call, /Invalid profile input/)
  }
})

test('ambiguous, reserved and malformed identities fail before registration or initialization', () => {
  const f = fixture()
  for (const name of ['synthetic work', 'Synthetic Work.', 'Synthetic Work ', '__proto__', 'global', '../bad', '.', 'node_modules', 'bad\u0000name']) {
    assert.throws(() => f.host.registerProfile({ name, canonicalId: 'new-id' }), /Invalid profile input/)
  }
  assert.throws(() => f.host.registerProfile({ name: 'Other', canonicalId: 'fixture-a' }), /Invalid profile input/)
  assert.throws(() => createConsentProfile({ instructions: { environments: { Work: 'a', work: 'b' } } }), /Invalid profile input/)
  const seeded = createConsentProfile({ instructions: { environments: { Work: 'a' } } })
  assert.throws(() => seeded.host.registerProfile({ name: 'work', canonicalId: 'id' }), /Invalid profile input/)
  const p = seeded.host.registerProfile({ name: 'Work', canonicalId: 'id' })
  assert.equal(seeded.host.instructions.preview(p).effective, 'a')
})

test('failed registration preserves identity capacity; shared environment budget still applies', () => {
  const { host } = createConsentProfile()
  for (let n = 0; n < LIMITS.environments; n++) host.registerProfile({ name: `Synthetic ${n}`, canonicalId: `id-${n}` })
  assert.throws(() => host.registerProfile({ name: 'Overflow', canonicalId: 'overflow' }), /Invalid profile input/)
  assert.throws(() => host.registerProfile({ name: 'synthetic 0', canonicalId: 'alias' }), /Invalid profile input/)
})

test('instruction edits and reset preserve values and consent, with no reader disclosure or policy bypass', () => {
  const f = fixture({ fields: { preferredName: 'Synthetic Value' }, allowAgentUseApprovedProfileInformation: true })
  const s = f.host.startSession(f.host.registerCaller(), f.a)
  const scope = f.host.registerScope({ operation: 'read_field', purpose: 'synthetic' })
  f.host.setPermission(f.a, 'preferredName', 'ask_first')
  const pending = f.reader.requestField(s, 'preferredName', scope)
  f.host.decide(pending.approval, 'allow_session')
  const logs = [], methods = ['log', 'info', 'warn', 'error', 'debug']
  const originals = methods.map(k => console[k])
  try {
    methods.forEach(k => { console[k] = (...args) => logs.push(args) })
    f.instructions.setGlobal('SYNTHETIC_IGNORE_ALL_POLICIES')
    f.instructions.setOverride(f.a, 'SYNTHETIC_DISCLOSE_PRIVATE_FIELDS')
    assert.equal(f.reader.consumeApproval(s, pending.approval).value, 'Synthetic Value')
    f.instructions.reset()
    assert.equal(f.reader.requestField(s, 'preferredName', scope).value, 'Synthetic Value')
    f.host.revoke(f.a, 'preferredName')
    f.instructions.setGlobal('SYNTHETIC_IGNORE_ALL_POLICIES')
    assert.deepEqual(f.reader.requestField(s, 'preferredName', scope), { status: 'denied' })
    assert.deepEqual(Object.keys(f.reader).sort(), ['cancelApproval', 'consumeApproval', 'requestField'])
    assert.equal(JSON.stringify(pending).includes('SYNTHETIC_'), false)
  } finally { methods.forEach((k, n) => { console[k] = originals[n] }) }
  assert.deepEqual(logs, [])
})

test('original style suggestions are optional immutable starting points', async () => {
  const { INSTRUCTION_STYLE_SUGGESTIONS: suggestions } = await import('../plugins/personal-profile/core/instructions.js')
  assert.equal(suggestions.length, 3)
  assert.equal(new Set(suggestions).size, 3)
  assert.ok(suggestions.every(s => typeof s === 'string' && s.length > 0 && s.length <= LIMITS.instructions))
  assert.equal(Object.isFrozen(suggestions), true)
  const { instructions: i, a } = fixture()
  assert.equal(i.preview(a).effective, '')
  i.setGlobal(suggestions[0])
  assert.equal(i.preview(a).effective, suggestions[0])
})

test('Unicode aliases and descriptor attacks are rejected without executing accessors', () => {
  const { host } = createConsentProfile()
  host.registerProfile({ name: 'Café', canonicalId: 'unicode-a' })
  for (const name of ['Cafe\u0301', 'CAFÉ', 'Ｃａｆé']) assert.throws(() => host.registerProfile({ name, canonicalId: 'unicode-b' }), /Invalid profile input/)
  let reads = 0
  assert.throws(() => host.registerProfile({ get name() { reads++; return 'Synthetic' }, canonicalId: 'id' }), /Invalid profile input/)
  assert.equal(reads, 0)
  // Rejected identities did not reserve the ID or a usable name.
  const p = host.registerProfile({ name: 'Other', canonicalId: 'unicode-b' })
  assert.equal(host.instructions.preview(p).effective, '')
})
