import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveProfileDir } from '@deepseek-ai/dsh-app-boot'
import { createMasterProfile } from '../plugins/personal-profile/core/model.js'
import { createProfileCore } from '../plugins/personal-profile/core/retrieval.js'

const invalid = fn => assert.throws(fn, { name: 'TypeError', message: 'Invalid profile input' })
const definition = id => ({ id, label: 'Synthetic label', type: 'string' })
const customFields = count => Array.from({ length: count }, (_, i) => definition(`synthetic${i}`))
const environments = count => Object.fromEntries(Array.from({ length: count }, (_, i) => [`synthetic-${i}`, 'Synthetic instruction']))
const denied = result => assert.deepEqual(result, { status: 'denied' })

test('Profile names follow official Harness basename rules without changing field identifiers', () => {
  // resolveProfileDir only joins paths; supplying home avoids reading a real home.
  const names = ['sdk-minimal', 'work-profile', '1', '_synthetic', '-synthetic-', 'Synthetic Profile', 'synthetic.v2', 'بيئة-تجريبية', ' synthetic ', 'x'.repeat(255)]
  const core = createProfileCore({ fields: { preferredName: 'Synthetic' } })
  core.setOptIn(true)
  for (const name of names) {
    assert.equal(typeof resolveProfileDir(name, '/synthetic-harness-home'), 'string')
    core.addEnvironment(name)
    denied(core.requestField(name, 'preferredName'))
    core.setPermission(name, 'preferredName', 'allow')
    assert.equal(core.requestField(name, 'preferredName').value, 'Synthetic')
    assert.equal(createMasterProfile({ instructions: { environments: { [name]: 'Synthetic' } } }).instructions.environments.get(name), 'Synthetic')
  }
  core.addEnvironment('WORK-profile')
  denied(core.requestField('WORK-profile', 'preferredName'))
  denied(core.requestField('work-profile ', 'preferredName'))
  invalid(() => core.addCustomField(definition('work-profile')))
})

test('unsafe, malformed and overlong Profile names fail closed at every entry point', () => {
  const core = createProfileCore({ fields: { preferredName: 'Synthetic' } })
  core.setOptIn(true)
  for (const name of ['', '.', '..', 'node_modules', 'synthetic/child', 'synthetic\\child']) {
    assert.throws(() => resolveProfileDir(name, '/synthetic-harness-home'))
  }
  for (const name of ['', '.', '..', 'node_modules', '../synthetic', 'synthetic/child', 'synthetic\\child', '__proto__', 'constructor', 'prototype', 'toString', 'instructions', 'x\0y', 'x\ny', 'x\u007fy', 'x\u0085y', 'x'.repeat(256), null, 7, {}, []]) {
    invalid(() => core.addEnvironment(name))
    invalid(() => core.setPermission(name, 'preferredName', 'allow'))
    denied(core.requestField(name, 'preferredName'))
    if (typeof name === 'string') invalid(() => createMasterProfile({ instructions: { environments: Object.fromEntries([[name, 'Synthetic']]) } }))
  }
  assert.equal(Object.prototype.polluted, undefined)
})

test('all personal strings accept exactly 1024 units and reject one more without echoing values', () => {
  for (const field of ['preferredName', 'fullName', 'nationality']) {
    assert.equal(createMasterProfile({ fields: { [field]: 'x'.repeat(1024) } }).values.get(field).length, 1024)
    invalid(() => createMasterProfile({ fields: { [field]: 'x'.repeat(1025) } }))
  }
  assert.equal(createMasterProfile({ fields: { gender: { kind: 'custom', customValue: 'x'.repeat(1024) } } }).values.get('gender').customValue.length, 1024)
  invalid(() => createMasterProfile({ fields: { gender: { kind: 'custom', customValue: 'x'.repeat(1025) } } }))
  assert.equal(createMasterProfile({ customFields: [definition('note')], fields: { note: '😀'.repeat(512) } }).values.get('note').length, 1024)
  invalid(() => createMasterProfile({ customFields: [definition('note')], fields: { note: '😀'.repeat(513) } }))
})

test('custom labels and global/environment instructions enforce independent length boundaries', () => {
  const valid = { ...definition('note'), label: 'x'.repeat(128) }
  assert.equal(createMasterProfile({ customFields: [valid] }).customFields.get('note').label.length, 128)
  invalid(() => createMasterProfile({ customFields: [{ ...valid, label: 'x'.repeat(129) }] }))
  for (const instructions of [{ global: 'x'.repeat(8192) }, { environments: { 'sdk-minimal': 'x'.repeat(8192) } }]) assert.ok(createMasterProfile({ instructions }))
  for (const instructions of [{ global: 'x'.repeat(8193) }, { environments: { 'sdk-minimal': 'x'.repeat(8193) } }, { global: [] }, { environments: { 'sdk-minimal': null } }]) invalid(() => createMasterProfile({ instructions }))
})

test('custom field count is bounded for initialization and sparse/malformed arrays', () => {
  assert.equal(createMasterProfile({ customFields: customFields(64) }).customFields.size, 64)
  invalid(() => createMasterProfile({ customFields: customFields(65) }))
  invalid(() => createMasterProfile({ customFields: new Array(65) }))
  let reads = 0
  const oversized = new Array(65)
  Object.defineProperty(oversized, '0', { get() { reads++; return definition('note') } })
  invalid(() => createMasterProfile({ customFields: oversized }))
  assert.equal(reads, 0)
  invalid(() => createMasterProfile({ fields: Object.fromEntries(Array.from({ length: 70 }, (_, i) => [`synthetic${i}`, 'Synthetic'])) }))
})

test('rejected custom additions are atomic and do not consume capacity or alter policies', () => {
  const core = createProfileCore({ customFields: customFields(63), fields: { preferredName: 'Synthetic' } })
  core.addEnvironment('sdk-minimal')
  core.setOptIn(true)
  core.setPermission('sdk-minimal', 'preferredName', 'allow')
  invalid(() => core.addCustomField({ ...definition('last'), label: 'x'.repeat(129) }, 'Synthetic'))
  invalid(() => core.addCustomField(definition('last'), 'x'.repeat(1025)))
  core.addCustomField(definition('last'), 'Synthetic final')
  denied(core.requestField('sdk-minimal', 'last'))
  core.setPermission('sdk-minimal', 'last', 'allow')
  assert.equal(core.requestField('sdk-minimal', 'last').value, 'Synthetic final')
  invalid(() => core.addCustomField(definition('overflow'), 'Synthetic'))
  invalid(() => core.setPermission('sdk-minimal', 'overflow', 'allow'))
  assert.equal(core.requestField('sdk-minimal', 'preferredName').value, 'Synthetic')
})

test('environment count includes instruction-only names and rejected additions are atomic', () => {
  assert.equal(createMasterProfile({ instructions: { environments: environments(64) } }).instructions.environments.size, 64)
  invalid(() => createMasterProfile({ instructions: { environments: environments(65) } }))
  const core = createProfileCore({ fields: { preferredName: 'Synthetic' }, instructions: { environments: environments(63) } })
  core.setOptIn(true)
  // Registering an instruction-only name consumes no additional distinct slot.
  core.addEnvironment('synthetic-0')
  invalid(() => core.addEnvironment('bad/name'))
  core.addEnvironment('last-profile')
  core.setPermission('last-profile', 'preferredName', 'allow')
  invalid(() => core.addEnvironment('overflow'))
  invalid(() => core.setPermission('overflow', 'preferredName', 'allow'))
  denied(core.requestField('overflow', 'preferredName'))
  // A rejected overflow/duplicate must not block remaining registrations.
  invalid(() => core.addEnvironment('last-profile'))
  for (let i = 1; i < 63; i++) core.addEnvironment(`synthetic-${i}`)
  denied(core.requestField('synthetic-62', 'preferredName'))
  assert.equal(core.requestField('last-profile', 'preferredName').value, 'Synthetic')
})

test('policy-only environments enforce the same 64-name limit', () => {
  const core = createProfileCore({ fields: { preferredName: 'Synthetic' } })
  for (let i = 0; i < 64; i++) core.addEnvironment(`synthetic-${i}`)
  invalid(() => core.addEnvironment('overflow'))
  core.setOptIn(true)
  core.setPermission('synthetic-63', 'preferredName', 'ask_first')
  assert.deepEqual(core.requestField('synthetic-63', 'preferredName'), { status: 'approval_required', field: 'preferredName' })
})


test('field identifiers retain their exact 64-unit ASCII boundary', () => {
  const core = createProfileCore()
  core.addCustomField(definition('x'.repeat(64)), 'Synthetic')
  invalid(() => core.addCustomField(definition('x'.repeat(65)), 'Synthetic'))
  for (const id of ['1synthetic', '_synthetic', 'synthetic-name', 'synthetic name', 'بيئة', 'synthetic\n']) invalid(() => core.addCustomField(definition(id)))
})

test('maximum-sized 69-field record is accepted and returned one field at a time', () => {
  const fields = { preferredName: 'Synthetic', fullName: 'Synthetic Full', dateOfBirth: '2000-01-01', nationality: 'Synthetic', gender: { kind: 'unspecified' }, ...Object.fromEntries(customFields(64).map(({ id }) => [id, 'Synthetic custom'])) }
  assert.equal(createMasterProfile({ fields, customFields: customFields(64) }).values.size, 69)
  const core = createProfileCore({ fields, customFields: customFields(64) })
  core.addEnvironment('sdk-minimal')
  core.setOptIn(true)
  denied(core.requestField('sdk-minimal', 'synthetic63'))
  core.setPermission('sdk-minimal', 'synthetic63', 'allow')
  assert.deepEqual(core.requestField('sdk-minimal', 'synthetic63'), { status: 'allowed', field: 'synthetic63', value: 'Synthetic custom' })
  core.setPermission('sdk-minimal', 'synthetic63', 'private')
  denied(core.requestField('sdk-minimal', 'synthetic63'))
})
