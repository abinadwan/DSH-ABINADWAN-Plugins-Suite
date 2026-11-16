import test from 'node:test'
import assert from 'node:assert/strict'
import { createMasterProfile } from '../plugins/personal-profile/core/model.js'

const invalid = fn => assert.throws(fn, { message: 'Invalid profile input' })

test('empty master profile has optional fields, opt-in off and separate inert instructions', () => {
  const profile = createMasterProfile()
  assert.equal(profile.values.size, 0)
  assert.equal(profile.definitions.size, 5)
  assert.equal(profile.allowAgentUseApprovedProfileInformation, false)
  assert.equal(profile.instructions.global, '')
  assert.equal(profile.instructions.environments.size, 0)
})

test('built-in fields validate types, calendar dates and custom/unspecified gender', () => {
  for (const gender of [{ kind: 'unspecified' }, { kind: 'custom', customValue: 'Synthetic gender' }, { kind: 'female' }]) {
    const p = createMasterProfile({ fields: { preferredName: 'Synthetic Name', fullName: 'Synthetic Full', dateOfBirth: '2000-02-29', nationality: 'Synthetic Nation', gender } })
    assert.deepEqual(p.values.get('gender'), gender)
  }
  for (const fields of [{ fullName: 42 }, { nationality: null }, { preferredName: {} }, { dateOfBirth: '2001-02-29' }, { dateOfBirth: '2000-13-01' }, { dateOfBirth: '2000-01-01T00:00:00Z' }, { gender: 'custom' }, { gender: { kind: 'custom' } }, { gender: { kind: 'unspecified', customValue: 'Synthetic' } }, { unknown: 'Synthetic' }]) invalid(() => createMasterProfile({ fields }))
})

test('custom definitions validate identifiers, types, duplicates and scalar values', () => {
  const customFields = [{ id: 'synthetic_note', label: 'Synthetic note', type: 'string' }, { id: 'count', label: 'Count', type: 'number' }, { id: 'flag', label: 'Flag', type: 'boolean' }, { id: 'anniversary', label: 'Date', type: 'date' }]
  assert.equal(createMasterProfile({ customFields, fields: { count: 7, flag: false, anniversary: '2000-01-01' } }).values.size, 3)
  for (const definition of [{ id: 'bad-id', label: 'Synthetic', type: 'string' }, { id: 'preferredName', label: 'Synthetic', type: 'string' }, { id: 'x', label: '', type: 'string' }, { id: 'x', label: 'Synthetic', type: 'object' }, { id: 'x', label: 'Synthetic', type: 'string', surprise: true }]) invalid(() => createMasterProfile({ customFields: [definition] }))
  invalid(() => createMasterProfile({ customFields: [customFields[0], customFields[0]] }))
  for (const count of [NaN, Infinity, '7', {}]) invalid(() => createMasterProfile({ customFields, fields: { count } }))
})

test('reserved names, prototypes and accessors are rejected without reading values', () => {
  for (const id of ['__proto__', 'constructor', 'prototype', 'toString', 'instructions', 'global', 'environments', 'allowAgentUseApprovedProfileInformation']) {
    invalid(() => createMasterProfile({ customFields: [{ id, label: 'Synthetic', type: 'string' }] }))
    invalid(() => createMasterProfile({ fields: JSON.parse(`{"${id}":"Synthetic"}`) }))
  }
  invalid(() => createMasterProfile({ fields: Object.create({ preferredName: 'Synthetic' }) }))
  let reads = 0
  invalid(() => createMasterProfile({ fields: { get preferredName() { reads++; return 'Synthetic' } } }))
  invalid(() => createMasterProfile({ get fields() { reads++; return {} } }))
  assert.equal(reads, 0)
  invalid(() => createMasterProfile({ fields: { [Symbol('Synthetic')]: 'Synthetic' } }))
})

test('instructions are independent structure, copied and never treated as profile fields', () => {
  const instructions = { global: 'Synthetic global instruction', environments: { test: 'Synthetic local instruction' } }
  const p = createMasterProfile({ instructions })
  instructions.environments.test = 'Changed'
  assert.equal(p.instructions.environments.get('test'), 'Synthetic local instruction')
  assert.equal(p.values.size, 0)
  for (const input of [{ instructions: { global: 42 } }, { instructions: { environments: { test: false } } }, { allowAgentUseApprovedProfileInformation: 'true' }, { extra: true }, null]) invalid(() => createMasterProfile(input))
})

test('custom field arrays reject accessor elements and custom iterators without execution', () => {
  let reads = 0
  const accessor = []
  Object.defineProperty(accessor, '0', { get() { reads++; throw new Error('Synthetic secret') } })
  const iterable = []
  iterable[Symbol.iterator] = function* () { reads++; throw new Error('Synthetic secret') }
  invalid(() => createMasterProfile({ customFields: accessor }))
  invalid(() => createMasterProfile({ customFields: iterable }))
  assert.equal(reads, 0)
})
