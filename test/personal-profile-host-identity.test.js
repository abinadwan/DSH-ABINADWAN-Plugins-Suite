import test from 'node:test'
import assert from 'node:assert/strict'
import {types} from 'node:util'
import {readFileSync} from 'node:fs'
import {diagnoseSyntheticHostIdentity} from '../test-support/personal-profile-host-identity.js'
import {assembleGate} from '../plugins/personal-profile/integration/gate.js'

const fixture = () => ({
  mode: 'synthetic', version: '0.2.2-rc.3', provenance: 'synthetic-host-context',
  hostProcess: 'correlated', desktopBinding: 'matched', windowsOwnerBinding: 'matched',
  profileAccountBinding: 'matched', managementAuthorization: 'explicit', lifecycleBinding: 'current',
})
const result = status => ({status, liveHost: 'UNVERIFIED', profileAccess: 'DENIED'})
const check = (input, status) => {
  const output = diagnoseSyntheticHostIdentity(input)
  assert.deepEqual(output, result(status))
  assert.equal(Object.isFrozen(output), true)
  return output
}

test('complete synthetic facts never authenticate a live Host or authorize Profile access', () => {
  check(fixture(), 'SYNTHETIC_FACTS_COMPLETE')
  check({...fixture(), mode:'live'}, 'INVALID_INPUT')
})
for (const field of Object.keys(fixture())) {
  test(`missing synthetic fact ${field} denies`, () => {
    const input = fixture(); delete input[field]
    check(input, 'INVALID_INPUT')
  })
  test(`non-enumerated synthetic fact ${field} denies without coercion`, () => {
    let calls = 0
    const hostile = {toString(){calls++; throw Error('SYNTHETIC_SENSITIVE_SENTINEL')}}
    check({...fixture(), [field]:hostile}, 'INVALID_INPUT')
    check({...fixture(), [field]:'SYNTHETIC_SENSITIVE_SENTINEL'}, 'INVALID_INPUT')
    assert.equal(calls, 0)
  })
}
const failures = {
  version:['unsupported','UNSUPPORTED_VERSION'], provenance:['untrusted','UNTRUSTED_CONTEXT'],
  hostProcess:['terminal','HOST_PROCESS_UNVERIFIED'], desktopBinding:['mismatched','DESKTOP_BINDING_DENIED'],
  windowsOwnerBinding:['mismatched','WINDOWS_OWNER_DENIED'], profileAccountBinding:['mismatched','PROFILE_ACCOUNT_DENIED'],
  managementAuthorization:['owner-role-only','MANAGEMENT_DENIED'], lifecycleBinding:['stale','LIFECYCLE_DENIED'],
}
for (const [field,[value,status]] of Object.entries(failures)) {
  test(`independent binding ${field} cannot be substituted`, () => check({...fixture(),[field]:value},status))
}
for (const field of ['hostProcess','desktopBinding','windowsOwnerBinding','profileAccountBinding','managementAuthorization','lifecycleBinding']) {
  for (const value of ['missing','ambiguous','mismatched','untrusted','unsupported']) {
    test(`${field} rejects ${value} evidence`, () => {
      const output = diagnoseSyntheticHostIdentity({...fixture(), [field]:value})
      assert.equal(output.status, {hostProcess:'HOST_PROCESS_UNVERIFIED',desktopBinding:'DESKTOP_BINDING_DENIED',windowsOwnerBinding:'WINDOWS_OWNER_DENIED',profileAccountBinding:'PROFILE_ACCOUNT_DENIED',managementAuthorization:'MANAGEMENT_DENIED',lifecycleBinding:'LIFECYCLE_DENIED'}[field])
      assert.deepEqual(output, result(output.status))
    })
  }
}
test('terminal, BrowserAuth and owner role are not Host, Windows or Profile authority', () => {
  for (const hostProcess of ['terminal','powershell','browser-owner']) check({...fixture(),hostProcess},'HOST_PROCESS_UNVERIFIED')
  for (const managementAuthorization of ['browser-auth-only','owner-role-only']) check({...fixture(),managementAuthorization},'MANAGEMENT_DENIED')
  for (const lifecycleBinding of ['replayed','stale']) check({...fixture(),lifecycleBinding},'LIFECYCLE_DENIED')
})
test('hostile shapes, accessors, proxies and thrown values produce fixed codes only', () => {
  let calls = 0
  const input = fixture()
  Object.defineProperty(input,'hostProcess',{get(){calls++; throw 'SYNTHETIC_SENSITIVE_SENTINEL'}})
  const proxy = new Proxy(fixture(), {ownKeys(){calls++; throw 'SYNTHETIC_SENSITIVE_SENTINEL'},getPrototypeOf(){calls++; throw 'SYNTHETIC_SENSITIVE_SENTINEL'},getOwnPropertyDescriptor(){calls++; throw 'SYNTHETIC_SENSITIVE_SENTINEL'}})
  const revoked = Proxy.revocable(fixture(),{}); revoked.revoke()
  for (const bad of [null,undefined,0,true,Symbol(),()=>{},[],input,proxy,revoked.proxy,Object.create(fixture()),{...fixture(),extra:'SYNTHETIC_SENSITIVE_SENTINEL'},{...fixture(),[Symbol()]:'SYNTHETIC_SENSITIVE_SENTINEL'}]) check(bad,'INVALID_INPUT')
  assert.equal(types.isProxy(proxy),true)
  assert.equal(calls,0)
  const nullPrototype = Object.assign(Object.create(null),fixture())
  check(nullPrototype,'SYNTHETIC_FACTS_COMPLETE')
})
test('diagnostic is read only, bounded, repeatable and outputs cannot alter later results', () => {
  const input = Object.freeze(fixture())
  const first = check(input,'SYNTHETIC_FACTS_COMPLETE')
  assert.throws(()=>{first.liveHost='VERIFIED'},TypeError)
  check(input,'SYNTHETIC_FACTS_COMPLETE')
  check({...fixture(),extra:'x'.repeat(100000)},'INVALID_INPUT')
  assert.deepEqual(input,fixture())
})
test('existing gate cannot accept diagnostic output or complete fixture as resolver identity', () => {
  let accesses = 0
  const storage = {locked:false, access(){accesses++; throw Error('unexpected access')}}
  for (const claims of [fixture(),diagnoseSyntheticHostIdentity(fixture())]) {
    const gate = assembleGate(storage,'synthetic-record',()=>claims)
    assert.deepEqual(gate.reader.request(Object.freeze({}),'preferredName'),{status:'denied'})
    // Independent token: management must reject the claims themselves, not just
    // a token already invalidated by the reader. No storage mutation may occur.
    assert.throws(()=>gate.management.setPermission(Object.freeze({}),'preferredName','allow'),
      {name:'Error', message:'Profile storage operation failed'})
    gate.dispose()
  }
  assert.equal(accesses,0)
})
test('diagnostic stays outside runtime, exports, adapters and package payload', () => {
  for (const path of ['index.js','client.js','plugins/personal-profile/index.js','plugins/personal-profile/integration/gate.js','plugins/personal-profile/storage/lifecycle.js','package.json','cordis.patch.yml']) {
    assert.equal(readFileSync(new URL(`../${path}`,import.meta.url),'utf8').includes('personal-profile-host-identity'),false)
  }
})
