// Synthetic tests only. Never use the user's profile or Windows application directory.
import test from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {mkdtempSync, readdirSync, readFileSync, rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {assembleStorage, createProductionStorage} from '../plugins/personal-profile/storage/lifecycle.js'
import {assembleGate} from '../plugins/personal-profile/integration/gate.js'
import {exportBackup, importBackup} from '../plugins/personal-profile/storage/backup.js'

const windows=process.platform==='win32'
const fixture=()=>({
  fields:{preferredName:'SYNTHETIC_PERSONAL_CANARY'},
  instructions:{global:'SYNTHETIC_GLOBAL_CANARY مثال 日本語',environments:{
    syntheticA:'SYNTHETIC_OVERRIDE_CANARY Español',syntheticB:'',
  }},
})
function setup(t, options={}) {
  const root=mkdtempSync(join(tmpdir(),'profile-readiness-'))
  const key=randomBytes(32), instances=[]
  const create=(opts={})=>{
    const s=assembleStorage(root,{acquire:()=>Buffer.from(key), release(){}},opts)
    instances.push(s)
    s.unlock()
    return s
  }
  t.after(()=>{try{for(const s of instances)s.lock()}finally{key.fill(0);rmSync(root,{recursive:true,force:true})}})
  const first=create(options)
  first.save('master',fixture())
  return {root,first,create}
}
function makeGate(t,s) {
  const facts=new WeakMap()
  const gate=assembleGate(s,'master',token=>facts.get(token))
  t.after(()=>gate.dispose())
  const issue=(environment='syntheticA',profile='profileA',role='agent')=>{
    const token=Object.freeze({})
    facts.set(token,{environment,profile,role,caller:{},session:{}})
    return token
  }
  return {gate,issue}
}
const diskBytes=root=>readdirSync(root).filter(name=>name.endsWith('.record')||name.endsWith('.recovery'))
  .map(name=>readFileSync(join(root,name)))

test('encrypted ordinary save/reopen preserves Unicode and explicit empty override but grants no authority',t=>{
  const {root,first,create}=setup(t)
  const expected=first.load('master')
  const bytes=diskBytes(root)
  assert.equal(bytes.length,1)
  for(const canary of Object.values(expected.fields).concat(Object.values(expected.instructions.environments),[expected.instructions.global])) {
    if(canary) assert.equal(bytes[0].includes(Buffer.from(canary)),false)
  }
  first.lock()
  const reopened=create()
  assert.deepEqual(reopened.load('master'),expected)
  assert.equal(reopened.load('master').instructions.environments.syntheticB,'')
  assert.equal(Object.hasOwn(reopened.load('master').instructions.environments,'syntheticC'),false)
  assert.equal(reopened.authorizationReadyFor('master'),false)
  const {gate,issue}=makeGate(t,reopened)
  assert.deepEqual(gate.reader.request(issue(),'preferredName'),{status:'denied'})
  assert.deepEqual(gate.composeInstructions(issue()),{status:'disabled'})
})

test('password-encrypted backup roundtrip preserves instruction text without importing authority',async t=>{
  const {first}=setup(t)
  first.setAuthorization('master',{optIn:true,permissions:{profileA:{preferredName:'allow'}}})
  const source=first.load('master')
  const password='SYNTHETIC_BACKUP_PASSWORD_ONLY'
  const backup=await exportBackup(source,password)
  const reopened=await importBackup(backup,password)
  assert.deepEqual(reopened.instructions,source.instructions)
  assert.deepEqual(reopened.fields,source.fields)
  assert.equal(reopened.allowAgentUseApprovedProfileInformation,false)
  assert.deepEqual(reopened.permissionState,{version:1,profiles:{}})
  const {gate}=makeGate(t,first)
  assert.deepEqual(gate.composeInstructions(),{status:'disabled'})
})

test('Windows uncertain authorization commit retains fence and denies even a fresh synthetic session after reopen', {skip:!windows},t=>{
  const {root,first,create}=setup(t)
  const outcome=first.setAuthorization('master',{optIn:true,permissions:{profileA:{preferredName:'allow'}}})
  assert.equal(outcome.committed,true)
  assert.equal(outcome.durable,false)
  assert.ok(readdirSync(root).includes('.authorization-blocked'))
  first.lock()
  const reopened=create()
  assert.equal(reopened.authorizationReadyFor('master'),false)
  const {gate,issue}=makeGate(t,reopened)
  assert.deepEqual(gate.reader.request(issue(),'preferredName'),{status:'denied'})
  assert.throws(()=>reopened.setOptIn('master',true))
})

test('Linux explicit durable authorization is initially usable only for its bound Profile', {skip:windows},t=>{
  const {first}=setup(t)
  const outcome=first.setAuthorization('master',{optIn:true,permissions:{profileA:{preferredName:'allow'}}})
  assert.equal(outcome.durable,true)
  assert.equal(first.authorizationReadyFor('master'),true)
  const {gate,issue}=makeGate(t,first)
  assert.equal(gate.reader.request(issue(),'preferredName').status,'allowed')
  assert.deepEqual(gate.reader.request(issue('syntheticB','profileB'),'preferredName'),{status:'denied'})
  first.save('master',fixture())
  assert.equal(first.authorizationReadyFor('master'),false)
  assert.deepEqual(gate.reader.request(issue(),'preferredName'),{status:'denied'})
})

test('ordinary save failure before rename leaves prior encrypted instruction revision intact',t=>{
  let fault=false
  const {root,first,create}=setup(t,{beforeRename(){if(fault)throw Error('SYNTHETIC_FAULT')}})
  const before=first.load('master'), bytes=diskBytes(root)
  fault=true
  assert.throws(()=>first.save('master',{...fixture(),instructions:{global:'SYNTHETIC_UNCOMMITTED'}}),
    {message:'Profile storage operation failed'})
  assert.deepEqual(diskBytes(root),bytes)
  assert.equal(readdirSync(root).some(name=>name.endsWith('.tmp')),false)
  first.lock()
  assert.deepEqual(create().load('master'),before)
})

test('production provider and runtime Host remain unavailable during QA',async()=>{
  assert.throws(()=>createProductionStorage(),{message:'OS-protected key provider unavailable'})
  const {apply}=await import('../plugins/personal-profile/index.js')
  assert.equal(apply(new Proxy({}, {get(){throw Error('Host must be inert')}})),undefined)
})

// Regression originally reproduced by the TODO tests in the first QA commit.
test('another storage instance cannot retain stale authorization after data save', {skip:windows},t=>{
  const {first,create}=setup(t)
  first.setAuthorization('master',{optIn:true,permissions:{profileA:{preferredName:'allow'}}})
  const {gate,issue}=makeGate(t,first)
  const prior=issue()
  assert.equal(gate.reader.request(prior,'preferredName').status,'allowed')
  const other=create()
  other.save('master',{...fixture(),fields:{preferredName:'SYNTHETIC_NEW_REVISION'}})
  assert.equal(first.authorizationReadyFor('master'),false)
  assert.equal(other.authorizationReadyFor('master'),false)
  assert.deepEqual(gate.reader.request(prior,'preferredName'),{status:'denied'})
  assert.deepEqual(gate.reader.request(issue(),'preferredName'),{status:'denied'})
})

test('re-encrypting identical plaintext does not revive an old authorization revision', {skip:windows},t=>{
  const {first,create}=setup(t)
  first.setAuthorization('master',{optIn:true,permissions:{profileA:{preferredName:'allow'}}})
  const other=create(), original=other.readForEdit('master')
  other.save('master',original.input)
  assert.deepEqual(other.load('master'),original.input)
  assert.notEqual(other.readForEdit('master').revision,original.revision)
  assert.equal(first.authorizationReadyFor('master'),false)
  const {gate,issue}=makeGate(t,first)
  assert.deepEqual(gate.reader.request(issue(),'preferredName'),{status:'denied'})
})

test('cooperative external writer in progress revokes previously authorized session', {skip:windows},t=>{
  const {first,create}=setup(t)
  first.setAuthorization('master',{optIn:true,permissions:{profileA:{preferredName:'allow'}}})
  const {gate,issue}=makeGate(t,first)
  const token=issue()
  assert.equal(gate.reader.request(token,'preferredName').status,'allowed')
  const other=create({beforeRename(){
    assert.deepEqual(gate.reader.request(token,'preferredName'),{status:'denied'})
  }})
  other.save('master',fixture())
  assert.equal(first.authorizationReadyFor('master'),false)
  assert.deepEqual(gate.reader.request(issue(),'preferredName'),{status:'denied'})
})

test('pending approval cannot be consumed or approved after another instance replaces its revision',{skip:windows},t=>{
  const {first,create}=setup(t)
  first.setAuthorization('master',{optIn:true,permissions:{profileA:{preferredName:'ask_first'}}})
  const {gate,issue}=makeGate(t,first)
  const token=issue(),manager=issue('syntheticA','profileA','management')
  let p=gate.reader.request(token,'preferredName')
  assert.equal(p.status,'approval_required')
  assert.equal(gate.management.decide(manager,p.approval,'allow_once'),true)
  const other=create()
  other.save('master',fixture())
  assert.deepEqual(gate.reader.consume(token,p.approval),{status:'denied'})
  assert.equal(gate.management.decide(manager,p.approval,'allow_once'),false)
})

test('revision-checked saves reject stale management drafts without modifying newer data',t=>{
  const {first,create}=setup(t)
  const second=create(), stale=first.readForEdit('master')
  const latest=second.readForEdit('master')
  const edit={...latest.input,fields:{preferredName:'SYNTHETIC_NEWER_EDIT'}}
  assert.equal(second.saveIfRevision('master',latest.revision,edit).committed,true)
  const before=second.readForEdit('master')
  assert.throws(()=>first.saveIfRevision('master',stale.revision,{...stale.input,
    instructions:{...stale.input.instructions,global:'SYNTHETIC_STALE_DRAFT'}}))
  assert.deepEqual(second.readForEdit('master'),before)
  const fresh=first.readForEdit('master')
  assert.equal(first.saveIfRevision('master',fresh.revision,{...fresh.input,
    instructions:{...fresh.input.instructions,global:'SYNTHETIC_FRESH_DRAFT'}}).committed,true)
  assert.equal(second.load('master').fields.preferredName,'SYNTHETIC_NEWER_EDIT')
  assert.equal(second.load('master').instructions.global,'SYNTHETIC_FRESH_DRAFT')
  assert.throws(()=>first.saveIfRevision('master',fresh.revision,fresh.input))
})

test('revision-checked create is create-only; malformed or replayed revisions change no data',t=>{
  const {first,create,root}=setup(t)
  const absent=first.readForEdit('new')
  assert.deepEqual(absent,{revision:null,input:null})
  const other=create()
  assert.equal(other.saveIfRevision('new',null,fixture()).committed,true)
  const before=diskBytes(root)
  for(const revision of [null,undefined,{},'bogus','A'.repeat(64),'f'.repeat(64)]) {
    assert.throws(()=>first.saveIfRevision('new',revision,fixture()))
    assert.deepEqual(diskBytes(root),before)
  }
})

test('revision-checked writer lock excludes a second cooperative save at precommit',t=>{
  let trigger=false, second, stale
  const {first,create}=setup(t,{beforeRename(){
    if(trigger) assert.throws(()=>second.saveIfRevision('master',stale.revision,stale.input))
  }})
  second=create()
  stale=second.readForEdit('master')
  trigger=true
  assert.equal(first.saveIfRevision('master',stale.revision,{...stale.input,
    fields:{preferredName:'SYNTHETIC_COMMITTED'}}).committed,true)
  assert.equal(second.load('master').fields.preferredName,'SYNTHETIC_COMMITTED')
  assert.throws(()=>second.saveIfRevision('master',stale.revision,stale.input))
})
