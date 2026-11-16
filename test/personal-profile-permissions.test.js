import test from 'node:test'
import assert from 'node:assert/strict'
import { createProfileCore } from '../plugins/personal-profile/core/retrieval.js'
import { evaluatePermission } from '../plugins/personal-profile/core/permissions.js'

const fixture = () => {
  const core = createProfileCore({ fields: { preferredName: 'Synthetic One', fullName: 'Synthetic Full' } })
  core.addEnvironment('alpha')
  core.addEnvironment('beta')
  return core
}
const denied = result => assert.deepEqual(result, { status: 'denied' })
const invalid = fn => assert.throws(fn, { message: 'Invalid profile input' })

test('new environments and all fields default private, including unknown environments', () => {
  const core = fixture()
  core.setOptIn(true)
  for (const environment of ['alpha', 'beta', 'unknown', '__proto__', null]) denied(core.requestField(environment, 'preferredName'))
  core.addCustomField({ id: 'note', label: 'Synthetic note', type: 'string' }, 'Synthetic secret')
  for (const environment of ['alpha', 'beta']) denied(core.requestField(environment, 'note'))
  core.addEnvironment('gamma')
  denied(core.requestField('gamma', 'note'))
  invalid(() => core.addEnvironment('alpha'))
  invalid(() => core.addCustomField({ id: 'note', label: 'Duplicate', type: 'string' }))
})

test('allow requires explicit opt-in and returns exactly one requested field', () => {
  const core = fixture()
  core.setPermission('alpha', 'preferredName', 'allow')
  denied(core.requestField('alpha', 'preferredName'))
  core.setOptIn(true)
  assert.deepEqual(core.requestField('alpha', 'preferredName'), { status: 'allowed', field: 'preferredName', value: 'Synthetic One' })
  denied(core.requestField('beta', 'preferredName'))
  core.setOptIn(false)
  denied(core.requestField('alpha', 'preferredName'))
})

test('ask_first never includes a value or accepts an approval bypass', () => {
  const core = fixture()
  core.setPermission('alpha', 'preferredName', 'ask_first')
  denied(core.requestField('alpha', 'preferredName'))
  core.setOptIn(true)
  assert.deepEqual(core.requestField('alpha', 'preferredName', { approved: true }), { status: 'approval_required', field: 'preferredName' })
  core.setPermission('alpha', 'preferredName', 'private')
  denied(core.requestField('alpha', 'preferredName'))
})

test('revocation immediately blocks subsequent checks without affecting another environment', () => {
  const core = fixture()
  core.setOptIn(true)
  for (const environment of ['alpha', 'beta']) core.setPermission(environment, 'preferredName', 'allow')
  assert.equal(core.requestField('alpha', 'preferredName').status, 'allowed')
  core.setPermission('alpha', 'preferredName', 'private')
  denied(core.requestField('alpha', 'preferredName'))
  assert.equal(core.requestField('beta', 'preferredName').status, 'allowed')
})

test('unknown fields, absent values, malformed requests and instructions deny safely', () => {
  const core = fixture()
  core.setOptIn(true)
  core.setPermission('alpha', 'nationality', 'allow')
  for (const field of ['nationality', 'unknown', 'instructions', '__proto__', 'constructor', null, ['preferredName'], { id: 'preferredName' }]) denied(core.requestField('alpha', field))
})

test('malformed policies are rejected and existing permissions remain unchanged', () => {
  const core = fixture()
  core.setOptIn(true)
  for (const policy of [undefined, null, true, 'ALLOW', 'approved', {}, ['allow']]) {
    invalid(() => core.setPermission('alpha', 'preferredName', policy))
    denied(core.requestField('alpha', 'preferredName'))
  }
  invalid(() => core.setPermission('unknown', 'preferredName', 'allow'))
  invalid(() => core.setPermission('alpha', 'unknown', 'allow'))
  invalid(() => core.setOptIn('true'))
  invalid(() => core.addEnvironment('__proto__'))
})

test('evaluation fails closed for missing, inherited or malformed policy maps and opt-in', () => {
  const definitions = new Map([['preferredName', 'string']])
  const values = new Map([['preferredName', 'Synthetic One']])
  const profile = { definitions, values, allowAgentUseApprovedProfileInformation: true }
  for (const policies of [undefined, null, {}, { alpha: { preferredName: 'allow' } }, new Map([['alpha', undefined]]), new Map([['alpha', { preferredName: 'allow' }]]), new Map([['alpha', new Map([['preferredName', 'invalid']])]])]) {
    assert.equal(evaluatePermission(profile, policies, 'alpha', 'preferredName'), 'private')
  }
  const policies = new Map([['alpha', new Map([['preferredName', 'allow']])]])
  assert.equal(evaluatePermission(profile, policies, 'alpha', 'preferredName'), 'allow')
  for (const optIn of [undefined, false, 'true', 1]) assert.equal(evaluatePermission({ ...profile, allowAgentUseApprovedProfileInformation: optIn }, policies, 'alpha', 'preferredName'), 'private')
})

test('mutating inputs and returned gender cannot alter internal state', () => {
  const gender = { kind: 'custom', customValue: 'Synthetic gender' }
  const fields = { gender }
  const core = createProfileCore({ fields })
  core.addEnvironment('alpha')
  core.setOptIn(true)
  core.setPermission('alpha', 'gender', 'allow')
  gender.customValue = 'Changed'
  fields.gender = { kind: 'unspecified' }
  const result = core.requestField('alpha', 'gender')
  assert.deepEqual(result.value, { kind: 'custom', customValue: 'Synthetic gender' })
  assert.throws(() => { result.value.kind = 'unspecified' })
  assert.equal(core.requestField('alpha', 'gender').value.kind, 'custom')
})

test('errors never echo supplied values and failed custom additions are atomic', () => {
  const core = fixture()
  const definition = { id: 'numberField', label: 'Synthetic', type: 'number' }
  invalid(() => core.addCustomField(definition, 'Synthetic prohibited value'))
  core.addCustomField(definition, 4)
  core.setOptIn(true)
  core.setPermission('alpha', 'numberField', 'allow')
  assert.equal(core.requestField('alpha', 'numberField').value, 4)
})

test('evaluator rejects inherited/accessor model metadata without invoking getters', () => {
  const definitions = new Map([['preferredName', 'string']])
  const policies = new Map([['alpha', new Map([['preferredName', 'allow']])]])
  let reads = 0
  for (const profile of [Object.create({ allowAgentUseApprovedProfileInformation: true, definitions }), { definitions, get allowAgentUseApprovedProfileInformation() { reads++; return true } }]) {
    assert.equal(evaluatePermission(profile, policies, 'alpha', 'preferredName'), 'private')
  }
  assert.equal(reads, 0)
})
