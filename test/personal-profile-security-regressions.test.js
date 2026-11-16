import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {mkdtempSync, rmSync, readdirSync, readFileSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {assembleStorage} from '../plugins/personal-profile/storage/lifecycle.js'
import {assembleGate} from '../plugins/personal-profile/integration/gate.js'
import {seal} from '../plugins/personal-profile/storage/envelope.js'

const input={fields:{preferredName:'SYNTHETIC_REGRESSION'},allowAgentUseApprovedProfileInformation:false}
const windows=process.platform==='win32'
function setup(t, options={}) {
  const root=mkdtempSync(join(tmpdir(),'profile-regressions-'))
  const s=assembleStorage(root,{acquire:()=>Buffer.alloc(32,11),release(){}},options)
  s.unlock();s.save('master',input)
  t.after(()=>{s.lock();rmSync(root,{recursive:true,force:true})})
  return {s,root}
}
const snapshot=root=>Object.fromEntries(readdirSync(root).sort().map(name=>[name,readFileSync(join(root,name)).toString('hex')]))

for (const [name,change] of Object.entries({
  optIn:{allowAgentUseApprovedProfileInformation:true},
  permissions:{permissionState:{version:1,profiles:{profileA:{preferredName:'allow'}}}},
})) test(`P1 ordinary save cannot persist forged ${name} authority`,t=>{
  const {s,root}=setup(t), before=snapshot(root)
  assert.throws(()=>s.save('master',{...s.load('master'),...change}))
  assert.deepEqual(snapshot(root),before)
})
test('P2 invalid permission edits leave disk bytes and authorization fence untouched', t=>{
  const {s,root}=setup(t)
  for(const args of [
    ['master','profileA','unknown','allow'],['master','profileA','preferredName','bogus'],
    ['../bad','profileA','preferredName','allow'],['master','../bad','preferredName','private'],
    ['master','profileA',null,'allow'],['missing','profileA','preferredName','allow'],
  ]) {
    const before=snapshot(root)
    assert.throws(()=>s.setPermission(...args))
    assert.deepEqual(snapshot(root),before)
  }
  assert.equal(s.setPermission('master','profileA','preferredName','private').committed,true)
})

const mutations={
  null:()=>null, missingProfile:f=>({...f,profile:undefined}),invalidProfile:f=>({...f,profile:'../bad'}),
  missingEnvironment:f=>({...f,environment:undefined}),invalidEnvironment:f=>({...f,environment:'../bad'}),
  changedProfile:f=>({...f,profile:'profileB'}),changedEnvironment:f=>({...f,environment:'syntheticB'}),
  role:f=>({...f,role:'management'}),missingRole:f=>({...f,role:undefined}),
  caller:f=>({...f,caller:{}}),session:f=>({...f,session:{}}),missingCaller:f=>({...f,caller:null}),
  missingSession:f=>({...f,session:null}),throw:()=>{throw Error('synthetic resolver fault')},
  getter:f=>({...f,get profile(){throw Error('synthetic getter fault')}}),
  getterValue:f=>({...f,get profile(){return f.profile}}),inherited:f=>Object.create(f),
}
for(const [name,mutate] of Object.entries(mutations)) for(const mode of ['pending','session-grant']) {
  test(`P1 resolver ${name} is terminal for ${mode} after identity restoration`,
    {skip:windows?'Windows directory durability is uncertain: positive consent path intentionally unavailable':false},t=>{
      const {s,root}=setup(t)
      // Synthetic preexisting authenticated state, independent of save's defect.
      const file=join(root,createHash('sha256').update('master').digest('hex')+'.record')
      writeFileSync(file,seal({...input,allowAgentUseApprovedProfileInformation:true},Buffer.alloc(32,11),{domain:'local',identity:'master'}),{mode:0o600})
      s.setPermission('master','profileA','preferredName','ask_first')
      const agent={},manager={}, facts={role:'agent',profile:'profileA',environment:'syntheticA',caller:{},session:{}}
      let current=facts, broken=false
      const gate=assembleGate(s,'master',token=>token===manager?{...facts,role:'management'}:token===agent?(broken?mutate(facts):current):null)
      t.after(()=>gate.dispose())
      const pending=gate.reader.request(agent,'preferredName')
      assert.equal(pending.status,'approval_required')
      if(mode==='session-grant') {
        assert.equal(gate.management.decide(manager,pending.approval,'allow_session'),true)
        assert.equal(gate.reader.consume(agent,pending.approval).status,'allowed')
        assert.equal(gate.reader.request(agent,'preferredName').status,'allowed')
      }
      broken=true
      assert.equal(gate.reader.request(agent,'preferredName').status,'denied')
      broken=false;current=facts
      assert.equal(gate.management.decide(manager,pending.approval,'allow_session'),false)
      assert.equal(gate.reader.consume(agent,pending.approval).status,'denied')
      assert.equal(gate.reader.request(agent,'preferredName').status,'denied')
    })
}


test('persisted authority requires a new management transaction after lock or for another record',
  {skip:windows?'Windows positive authorization is intentionally unavailable':false},t=>{
    const {s}=setup(t)
    s.setAuthorization('master',{optIn:true,permissions:{profileA:{preferredName:'allow'}}})
    const issue=()=>({})
    const facts={role:'agent',profile:'profileA',environment:'syntheticA',caller:{},session:{}}
    const gate=()=>assembleGate(s,'master',()=>({...facts,session:issue()}))
    s.lock();s.unlock()
    assert.equal(gate().reader.request(issue(),'preferredName').status,'denied')
    s.save('other',input)
    s.setAuthorization('other',{optIn:true})
    assert.equal(gate().reader.request(issue(),'preferredName').status,'denied')
  })

test('ordinary edits preserve authority but reject stale snapshots and new-record opt-in', t=>{
  const {s,root}=setup(t)
  const original=s.load('master')
  assert.throws(()=>s.save('new',{...input,allowAgentUseApprovedProfileInformation:true}))
  s.setAuthorization('master',{optIn:true,permissions:{profileA:{preferredName:'allow'}}})
  const approved=s.load('master')
  const unchanged=s.save('master',{fields:{preferredName:'SYNTHETIC_EDIT'}})
  assert.equal(unchanged.committed,true)
  assert.deepEqual(s.load('master').permissionState,approved.permissionState)
  assert.equal(s.load('master').allowAgentUseApprovedProfileInformation,true)
  assert.equal(s.authorizationReady,false)
  const before=snapshot(root)
  assert.throws(()=>s.save('master',original))
  assert.deepEqual(snapshot(root),before)
  if(windows) {
    assert.ok(readdirSync(root).includes('.authorization-blocked'))
    assert.throws(()=>s.setAuthorization('master',{optIn:true}))
  } else {
    s.setAuthorization('master',{optIn:false,permissions:{profileA:{preferredName:'private'}}})
    assert.throws(()=>s.save('master',approved))
    s.save('master',s.load('master')) // unchanged snapshot is data-only
    assert.equal(s.authorizationReady,false)
  }
})
test('invalid opt-in/combined patches do not write, fence, or revoke a valid lease', t=>{
  const {s,root}=setup(t)
  const lease=s.access('master')
  for(const patch of [{optIn:'yes'},{optIn:true,permissions:{profileA:{unknown:'allow'}}},{permissions:{'../bad':{preferredName:'private'}}},{pending:[]},{}]) {
    const before=snapshot(root)
    assert.throws(()=>s.setAuthorization('master',patch))
    assert.deepEqual(snapshot(root),before)
    assert.doesNotThrow(()=>lease.host.registerCaller())
  }
  const before=snapshot(root)
  assert.throws(()=>s.setOptIn('master',undefined))
  assert.deepEqual(snapshot(root),before)
  const result=s.setAuthorization('master',{optIn:true,permissions:{profileA:{preferredName:'private'}}})
  assert.equal(result.committed,true)
  assert.throws(()=>lease.host.registerCaller())
})
test('failed valid management writes retain fence through ordinary save, retry and restart',t=>{
  let fail=false
  const {s,root}=setup(t,{beforeRename(){if(fail) throw Error('synthetic I/O')}})
  fail=true
  const lease=s.access('master')
  assert.throws(()=>s.setAuthorization('master',{optIn:true,permissions:{profileA:{preferredName:'allow'}}}))
  assert.throws(()=>lease.host.registerCaller())
  assert.ok(readdirSync(root).includes('.authorization-blocked'))
  fail=false
  s.save('master',{fields:{preferredName:'SYNTHETIC_LATER_EDIT'}})
  assert.ok(readdirSync(root).includes('.authorization-blocked'))
  s.lock();s.unlock()
  assert.equal(s.authorizationReady,false)
  assert.throws(()=>s.setAuthorization('master',{optIn:true}))
  assert.equal(s.load('master').allowAgentUseApprovedProfileInformation,false)
})

test('post-rename authorization durability uncertainty keeps the fence and denies later authorization',
  {skip:windows?'Windows already reports every directory commit as uncertain':false},async t=>{
    const fs=(await import('node:fs')).default
    const {syncBuiltinESMExports}=await import('node:module')
    const {s,root}=setup(t), original=fs.fsyncSync
    let directories=0
    fs.fsyncSync=fd=>{if(fs.fstatSync(fd).isDirectory() && ++directories===2) throw Error('synthetic directory fsync');return original(fd)}
    syncBuiltinESMExports()
    let result
    try {result=s.setAuthorization('master',{optIn:true})}
    finally {fs.fsyncSync=original;syncBuiltinESMExports()}
    assert.equal(result.committed,true)
    assert.equal(result.durable,false)
    assert.equal(s.authorizationReady,false)
    assert.ok(readdirSync(root).includes('.authorization-blocked'))
    s.lock();s.unlock()
    assert.throws(()=>s.setOptIn('master',true))
  })
test('authorization writer cleanup failure retains a cross-instance blocking artifact', async t=>{
  const fs=(await import('node:fs')).default
  const {syncBuiltinESMExports}=await import('node:module')
  const {s,root}=setup(t), original=fs.unlinkSync
  fs.unlinkSync=file=>{if(file===join(root,'.writer-lock')) throw Error('synthetic cleanup');return original(file)}
  syncBuiltinESMExports()
  let result
  try {result=s.setAuthorization('master',{optIn:true})}
  finally {fs.unlinkSync=original;syncBuiltinESMExports()}
  assert.equal(result.committed,true)
  assert.equal(result.cleanupComplete,false)
  assert.equal(s.authorizationReady,false)
  assert.ok(readdirSync(root).includes('.writer-lock'))
  const other=assembleStorage(root,{acquire:()=>Buffer.alloc(32,11),release(){}})
  other.unlock();t.after(()=>other.lock())
  assert.equal(other.authorizationReadyFor('master'),false)
  assert.throws(()=>other.setOptIn('master',true))
})
test('partial replacement keeps its fence and revokes prior authority across restart',t=>{
  let replacing=false, writes=0
  const {s,root}=setup(t,{beforeRename(){if(replacing && ++writes===2) throw Error('synthetic second write')}})
  // Direct synthetic legacy state avoids introducing a Windows fence in setup.
  const file=join(root,createHash('sha256').update('master').digest('hex')+'.record')
  writeFileSync(file,seal({...input,allowAgentUseApprovedProfileInformation:true},Buffer.alloc(32,11),{domain:'local',identity:'master'}),{mode:0o600})
  const review=s.review('master',{fields:{preferredName:'SYNTHETIC_REPLACEMENT'}},'replace')
  const lease=s.access('master')
  replacing=true
  assert.throws(()=>s.apply(review,{confirmReplace:true}))
  assert.throws(()=>lease.host.registerCaller())
  assert.equal(s.load('master').fields.preferredName,input.fields.preferredName)
  assert.ok(readdirSync(root).includes('.authorization-blocked'))
  assert.ok(readdirSync(root).some(name=>name.endsWith('.recovery')))
  s.lock();s.unlock()
  assert.equal(s.authorizationReadyFor('master'),false)
  assert.throws(()=>s.setOptIn('master',true))
})
test('managed opt-out invalidates a session grant and re-opt-in cannot restore it',
  {skip:windows?'Windows positive session grants intentionally unavailable':false},t=>{
    const {s}=setup(t)
    s.setAuthorization('master',{optIn:true,permissions:{profileA:{preferredName:'ask_first'}}})
    const agent={},manager={},facts={profile:'profileA',environment:'syntheticA',caller:{},session:{}}
    const gate=assembleGate(s,'master',token=>({...facts,role:token===manager?'management':'agent'}))
    t.after(()=>gate.dispose())
    const pending=gate.reader.request(agent,'preferredName')
    assert.equal(pending.status,'approval_required')
    assert.equal(gate.management.decide(manager,pending.approval,'allow_session'),true)
    assert.equal(gate.reader.consume(agent,pending.approval).status,'allowed')
    assert.equal(gate.reader.request(agent,'preferredName').status,'allowed')
    gate.management.setOptIn(manager,false)
    assert.equal(s.load('master').allowAgentUseApprovedProfileInformation,false)
    assert.equal(gate.reader.request(agent,'preferredName').status,'denied')
    gate.management.setOptIn(manager,true)
    assert.equal(gate.reader.request(agent,'preferredName').status,'denied')
    assert.equal(gate.reader.consume(agent,pending.approval).status,'denied')
    assert.equal(gate.reader.request({},'preferredName').status,'approval_required')
  })

test('schema removal cannot orphan a stored policy; reviewed replacement resets it explicitly',t=>{
  const {s,root}=setup(t)
  const profile={customFields:[{id:'nickname',label:'Synthetic',type:'string'}],fields:{nickname:'SYNTHETIC_CUSTOM'},
    permissionState:{version:1,profiles:{profileA:{nickname:'private'}}}}
  const file=join(root,createHash('sha256').update('master').digest('hex')+'.record')
  writeFileSync(file,seal(profile,Buffer.alloc(32,11),{domain:'local',identity:'master'}),{mode:0o600})
  const before=snapshot(root)
  assert.throws(()=>s.save('master',{customFields:[],fields:{}}))
  assert.deepEqual(snapshot(root),before)
  s.apply(s.review('master',{customFields:[],fields:{}},'replace'),{confirmReplace:true})
  assert.deepEqual(s.load('master').permissionState,{version:1,profiles:{}})
  s.save('master',{customFields:profile.customFields,fields:profile.fields})
  assert.deepEqual(s.load('master').permissionState,{version:1,profiles:{}})
  assert.equal(s.load('master').allowAgentUseApprovedProfileInformation,false)
})

// Cross-session isolation: invalidating session A must not revoke an unrelated
// authenticated session B (different caller, session, Profile and environment).
const positive={skip:windows?'Windows positive authorization is intentionally unavailable':false}
function twoSessions(t){
  const {s}=setup(t)
  s.save('master',{fields:{preferredName:'SYNTHETIC_REGRESSION',fullName:'SYNTHETIC_B_PENDING'}})
  s.setAuthorization('master',{optIn:true,permissions:{
    profileA:{preferredName:'ask_first'},profileB:{preferredName:'allow',fullName:'ask_first'}}})
  const ids=new Map(), faults=new Map(), resolved=[]
  const issue=facts=>{const token=Object.freeze({});ids.set(token,facts);return token}
  const factsA={role:'agent',profile:'profileA',environment:'syntheticA',caller:{},session:{}}
  const factsB={role:'agent',profile:'profileB',environment:'syntheticB',caller:{},session:{}}
  const A=issue(factsA), B=issue(factsB)
  const MA=issue({...factsA,role:'management',caller:{},session:{}})
  const MB=issue({...factsB,role:'management',caller:{},session:{}})
  const gate=assembleGate(s,'master',token=>{
    resolved.push(token)
    return faults.has(token)?faults.get(token)(ids.get(token)):ids.get(token)
  })
  t.after(()=>gate.dispose())
  assert.equal(gate.reader.request(B,'preferredName').status,'allowed')
  const pendingB=gate.reader.request(B,'fullName')
  assert.equal(pendingB.status,'approval_required')
  const pendingA=gate.reader.request(A,'preferredName')
  assert.equal(pendingA.status,'approval_required')
  // B remains fully usable: reads continue and its pending approval completes.
  const assertBIntact=()=>{
    assert.equal(gate.reader.request(B,'preferredName').status,'allowed')
    assert.equal(gate.management.decide(MB,pendingB.approval,'allow_once'),true)
    assert.equal(gate.reader.consume(B,pendingB.approval).status,'allowed')
    assert.equal(gate.reader.request(B,'preferredName').status,'allowed')
  }
  // A is terminal: restored claims revive neither token nor pending approval.
  const assertATerminal=token=>{
    assert.equal(gate.reader.request(token,'preferredName').status,'denied')
    assert.equal(gate.management.decide(MA,pendingA.approval,'allow_once'),false)
    assert.equal(gate.reader.consume(A,pendingA.approval).status,'denied')
    assert.equal(gate.reader.request(A,'preferredName').status,'denied')
  }
  return {s,gate,ids,faults,issue,resolved,factsA,factsB,A,B,MA,MB,pendingA,pendingB,assertBIntact,assertATerminal}
}
for(const [name,mutate] of Object.entries(mutations)) test(`P1 resolver ${name} for session A does not invalidate unrelated session B`,positive,t=>{
  const {gate,faults,A,assertBIntact,assertATerminal}=twoSessions(t)
  faults.set(A,mutate)
  assert.equal(gate.reader.request(A,'preferredName').status,'denied')
  faults.delete(A) // identity restoration
  assertATerminal(A)
  assertBIntact()
})
test('P1 Host-revoked session A does not invalidate unrelated session B',positive,t=>{
  const {gate,ids,factsA,A,assertBIntact,assertATerminal}=twoSessions(t)
  ids.delete(A)
  assert.equal(gate.reader.request(A,'preferredName').status,'denied')
  ids.set(A,factsA)
  assertATerminal(A)
  assertBIntact()
})
test('P1 role misuse by a bound token is terminal for that token only',positive,t=>{
  const {gate,A,MA,assertBIntact,assertATerminal}=twoSessions(t)
  // Agent token on every management entry point.
  assert.throws(()=>gate.management.setAuthorization(A,{optIn:false}))
  assert.throws(()=>gate.management.setOptIn(A,false))
  assert.throws(()=>gate.management.setPermission(A,'preferredName','allow'))
  assert.equal(gate.management.decide(A,'synthetic','allow_once'),false)
  assertATerminal(A)
  // Bound management token on the reader is terminal for that management token.
  assert.equal(gate.management.decide(MA,'synthetic','allow_once'),false)
  assert.equal(gate.reader.request(MA,'preferredName').status,'denied')
  assert.equal(gate.reader.cancel(MA,'synthetic'),false)
  assert.equal(gate.management.decide(MA,'synthetic','allow_once'),false)
  assert.throws(()=>gate.management.setOptIn(MA,false))
  assertBIntact()
})
test('P1 repeated invalidation attempts neither re-resolve terminal tokens nor exhaust budgets',positive,t=>{
  const {gate,ids,issue,resolved,factsA,A,assertBIntact}=twoSessions(t)
  ids.set(A,{...factsA,session:{}})
  for(let i=0;i<5;i++) assert.equal(gate.reader.request(A,'preferredName').status,'denied')
  assert.equal(resolved.filter(token=>token===A).length,2) // bind + one terminal failure
  // More cycles than the 64-binding and 16-lease budgets: each revocation frees its slot.
  for(let i=0;i<80;i++) {
    const facts={...factsA,caller:{},session:{}}, token=issue(facts)
    assert.equal(gate.reader.request(token,'preferredName').status,'approval_required')
    ids.set(token,{...facts,profile:'../bad'})
    assert.equal(gate.reader.request(token,'preferredName').status,'denied')
    ids.set(token,facts)
    assert.equal(gate.reader.request(token,'preferredName').status,'denied')
  }
  assertBIntact()
})
test('policy changes still invalidate every session (intentional global clear)',positive,t=>{
  const {s,gate,issue,factsB,B,MB,pendingB}=twoSessions(t)
  gate.management.setPermission(MB,'fullName','ask_first')
  assert.equal(gate.reader.request(B,'preferredName').status,'denied')
  assert.equal(gate.management.decide(MB,pendingB.approval,'allow_once'),false)
  assert.equal(gate.reader.request(issue({...factsB,caller:{},session:{}}),'preferredName').status,'allowed')
  assert.equal(s.load('master').permissionState.profiles.profileB.fullName,'ask_first')
})
