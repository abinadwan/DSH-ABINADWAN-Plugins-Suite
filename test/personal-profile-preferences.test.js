import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync,readFileSync,writeFileSync,readdirSync,realpathSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {normalizeSettings,effectivePreferences,decidePersonalAccess,backupSettings,reviewRestore} from '../plugins/personal-profile/preferences/model.js'
import {createPreferencesStore} from '../plugins/personal-profile/preferences/store.js'
function setup(t){
  const root=realpathSync(mkdtempSync(join(tmpdir(),'plain-profile-preferences-')))
  t.after(()=>rmSync(root,{recursive:true,force:true}))
  return {root,store:createPreferencesStore(root)}
}
const fixture=()=>normalizeSettings({version:1,personal:{preferredName:'SYNTHETIC_NICK',nationality:'Synthetic',gender:'unspecified'},
  global:{style:'technical',responseLanguage:'ja',custom:'SYNTHETIC_INSTRUCTION مثال'},
  environments:{lab:{responseLanguage:'fr',custom:''}}})
test('reduced model accepts only approved fields and bounded structured preferences',()=>{
  const s=fixture()
  assert.deepEqual(Object.keys(s.personal),['preferredName','nationality','gender'])
  for(const field of ['fullName','dateOfBirth','customFields','password','apiKey']){
    assert.throws(()=>normalizeSettings({version:1,personal:{[field]:'SYNTHETIC'}}))
    assert.throws(()=>normalizeSettings({version:1,[field]:'SYNTHETIC'}))
  }
  for(const global of [{style:'unknown'},{responseLanguage:'bad'},{traits:{detail:3}},{custom:'x'.repeat(8193)},{presets:['code','code']}])
    assert.throws(()=>normalizeSettings({version:1,global}))
  assert.throws(()=>normalizeSettings({version:2}))
  assert.throws(()=>normalizeSettings({version:1,environments:{'../bad':{}}}))
  assert.throws(()=>normalizeSettings({version:1,personal:{get preferredName(){throw Error('getter accessed')}}}),{message:'Invalid profile preferences'})
  assert.equal(effectivePreferences(s,'lab').responseLanguage,'fr')
  assert.equal(effectivePreferences(s,'lab').custom,'')
  assert.equal(effectivePreferences(s,'other').custom,s.global.custom)
})
test('access starts denied; external sharing, global opt-in and field decisions are independent',()=>{
  const s=fixture()
  assert.deepEqual(decidePersonalAccess(s,'lab','preferredName','local'),{status:'denied'})
  s.access.lab={fields:{preferredName:'allow',nationality:'ask_first'},allowExternal:false}
  assert.deepEqual(decidePersonalAccess(s,'lab','preferredName','local'),{status:'denied'})
  s.usePersonalInformation=true
  assert.deepEqual(decidePersonalAccess(s,'lab','preferredName','local'),{status:'allowed',value:'SYNTHETIC_NICK'})
  assert.deepEqual(decidePersonalAccess(s,'lab','nationality','local'),{status:'approval_required'})
  assert.deepEqual(decidePersonalAccess(s,'lab','gender','local'),{status:'denied'})
  assert.deepEqual(decidePersonalAccess(s,'other','preferredName','local'),{status:'denied'})
  assert.deepEqual(decidePersonalAccess(s,'lab','preferredName','external'),{status:'denied'})
  s.access.lab.allowExternal=true
  assert.equal(decidePersonalAccess(s,'lab','preferredName','external').status,'allowed')
  assert.deepEqual(decidePersonalAccess(s,'lab','nationality','external'),{status:'approval_required'})
  assert.deepEqual(decidePersonalAccess(s,'lab','preferredName','unknown'),{status:'denied'})
  assert.deepEqual(decidePersonalAccess(s,'lab','fullName','local'),{status:'denied'})
})
test('plain local store reopens Unicode settings without encryption files',t=>{
  const {root,store}=setup(t),s=fixture()
  assert.equal(store.load().revision,null)
  const outcome=store.save(null,s)
  assert.equal(outcome.committed,true)
  assert.equal(outcome.cleanupComplete,true)
  assert.equal(outcome.durable,process.platform!=='win32')
  assert.deepEqual(createPreferencesStore(root).load(),{revision:outcome.revision,settings:s})
  assert.deepEqual(readdirSync(root),['preferences-v1.json'])
  assert.match(readFileSync(join(root,'preferences-v1.json'),'utf8'),/SYNTHETIC_NICK/)
})
test('stale drafts and invalid updates preserve bytes; corrupt records never silently reset',t=>{
  const {root,store}=setup(t)
  const initial=store.save(null,fixture())
  const other=createPreferencesStore(root)
  const newer=other.load().settings;newer.global.custom='SYNTHETIC_NEW'
  other.save(initial.revision,newer)
  const path=join(root,'preferences-v1.json'),bytes=readFileSync(path)
  assert.throws(()=>store.save(initial.revision,fixture()))
  assert.throws(()=>store.save(other.load().revision,{version:1,personal:{fullName:'SYNTHETIC'}}))
  assert.deepEqual(readFileSync(path),bytes)
  writeFileSync(path,'{broken')
  assert.throws(()=>store.load())
  assert.throws(()=>store.save(null,fixture()))
  assert.equal(readFileSync(path,'utf8'),'{broken')
})
test('backup and reviewed restore strip authority, preserve conflicts, require confirmation',t=>{
  const {store}=setup(t),s=fixture()
  s.usePersonalInformation=true;s.access.lab={fields:{preferredName:'allow'},allowExternal:true}
  const saved=store.save(null,s),backup=JSON.parse(store.exportBackup())
  assert.deepEqual(backup,backupSettings(s))
  assert.equal(backup.usePersonalInformation,false)
  assert.deepEqual(backup.access,{})
  const incoming=fixture();incoming.personal.preferredName='SYNTHETIC_OTHER';incoming.environments.other=normalizeSettings().global
  incoming.usePersonalInformation=true;incoming.access.other={fields:{preferredName:'allow'},allowExternal:true}
  const review=store.reviewBackup(JSON.stringify(incoming))
  assert.equal(review.revision,saved.revision)
  assert.equal(review.requiresConfirmation,true)
  assert.ok(review.conflicts.includes('personal:preferredName'))
  assert.equal(review.settings.personal.preferredName,'SYNTHETIC_NICK')
  assert.ok(Object.hasOwn(review.settings.environments,'other'))
  assert.deepEqual(review.settings.access,{})
  assert.equal(review.settings.usePersonalInformation,false)
  const replace=reviewRestore(s,incoming,'replace')
  assert.equal(replace.requiresConfirmation,true)
  assert.equal(replace.settings.personal.preferredName,'SYNTHETIC_OTHER')
  assert.deepEqual(store.load().settings,s)
  assert.throws(()=>store.reviewBackup(JSON.stringify({version:1,personal:{dateOfBirth:'2000-01-01'}})))
})
