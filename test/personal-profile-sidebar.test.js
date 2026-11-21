import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
import React,{act} from 'react'
import {createRoot} from 'react-dom/client'
import {JSDOM} from 'jsdom'
import {clientHarness,base,withProfile,tick,ok,refused} from '../test-support/client.js'
import {Config,emptyRecord} from '../plugins/personal-profile/index.js'

const namespace='abinadwan-personal-profile'
const panelId=base+'/personal-profile-page'
const copy=x=>JSON.parse(JSON.stringify(x))
function mockSettings(){
  let record=emptyRecord(), revision=0, calls=[], conflict=false
  const view=()=>({ns:namespace,value:{record:copy(record)},revision})
  return {calls,view,conflict:()=>{conflict=true;revision++},describe:async()=>ok({writable:true,namespaces:[view()]}),
    replace:async(ns,value,expected)=>{
      calls.push({ns,value:copy(value),expected})
      if(conflict||ns!==namespace||expected!==revision)return refused('settings/conflict','stale')
      record=copy(value.record);revision++;return ok(view())
    }}
}
async function mount(t,{transport=mockSettings(),access=()=>true}={}){
  const app=await clientHarness({React,settings:transport,workspaceItems:[
    {workspaceId:'w1',title:'Workspace A'}, {workspaceId:'w2',title:'Workspace B'}]})
  assert.equal(app.slots.records.has(panelId),false)
  app.setRows(withProfile(app.rows(),true))
  await app.changed();await app.changed()
  const panel=app.slots.records.get(panelId)
  assert.ok(panel)
  assert.equal(panel.options.name,'settings.section')
  assert.equal(panel.options.label,'My Profile')
  assert.ok(app.entries('settings.section.icon').some(row=>row.options.id===panelId))
  assert.equal(app.entries('sidebar.panellist').some(row=>row.options.id===panelId),false)
  const previous={document:globalThis.document,window:globalThis.window,act:globalThis.IS_REACT_ACT_ENVIRONMENT}
  const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'})
  globalThis.document=dom.window.document;globalThis.window=dom.window;globalThis.IS_REACT_ACT_ENVIRONMENT=true
  const root=createRoot(dom.window.document.getElementById('root'))
  const d=dom.window.document
  const render=async()=>{await act(async()=>root.render(React.createElement(panel.component,{useRemoteAccess:access})));await act(async()=>{await tick()})}
  const byId=id=>d.getElementById('pp-'+id)
  const click=async id=>act(async()=>{assert.ok(byId(id),id);byId(id).click();await tick()})
  const select=async(id,value)=>act(async()=>{const x=byId(id);assert.ok(x,id);x.value=value;x.dispatchEvent(new dom.window.Event('change',{bubbles:true}));await tick()})
  t.after(async()=>{await act(async()=>root.unmount());globalThis.document=previous.document;globalThis.window=previous.window;globalThis.IS_REACT_ACT_ENVIRONMENT=previous.act;dom.window.close();await app.dispose()})
  await render()
  return {app,d,root,render,byId,click,select,transport}
}

test('native page removes sensitive fields and lock controls; saves structured settings by revision and reloads',async t=>{
  const {d,byId,click,select,transport}=await mount(t)
  assert.equal(d.querySelector('[data-personal-profile-panel]').getAttribute('data-personal-profile-panel'),'native-settings')
  assert.ok(byId('preferredName'));assert.ok(byId('nationality'));assert.ok(byId('gender'))
  for(const id of ['fullName','dateOfBirth','new-label','auto-lock'])assert.equal(byId(id),null)
  assert.equal(byId('save').disabled,true)
  await select('gender','female')
  await click('tab-instructions')
  assert.deepEqual(Array.from(byId('response-language').options,x=>x.value),['auto','ar','en','zh','es','fr','de','ja'])
  assert.equal(byId('style').value,'default')
  assert.equal(d.querySelectorAll('[id^="pp-preset-"]:checked').length,0)
  await select('style','technical');await select('response-language','ja');await click('preset-evidence')
  assert.match(byId('effective-instructions').textContent,/Japanese/)
  for(const id of ['instructions-scope','mode','profile'])assert.equal(byId(id),null,'no Workspace scope controls')
  await click('tab-information');await click('policy-gender')
  assert.equal(byId('opt-in'),null);assert.equal(byId('cloud'),null);assert.equal(byId('tab-access'),null)
  await click('save')
  assert.equal(transport.calls.length,1)
  assert.equal(transport.calls[0].expected,0)
  let record=transport.view().value.record
  assert.equal(record.version,4)
  assert.equal(record.information.gender,'female')
  assert.equal(record.preferences.responseLanguage,'ja')
  assert.equal(record.policies.gender,'allow')
  assert.equal(record.workspaces,undefined)
  assert.equal(record.allowCloud,undefined)
  assert.match(byId('save-status').textContent,/تم تأكيد الحفظ/)
  await click('reload');await click('tab-information')
  assert.equal(byId('gender').value,'female')
  await click('tab-privacy');assert.equal(byId('auto-lock'),null)
  assert.doesNotMatch(d.body.textContent,/محاكاة القفل/)
})
test('revision conflicts do not pretend to save; user must reload before retrying',async t=>{
  const {byId,click,select,transport}=await mount(t)
  await select('gender','male');transport.conflict();await click('save')
  assert.match(byId('save-status').textContent,/نافذة أخرى/)
  assert.equal(byId('save').disabled,true)
  assert.equal(transport.view().value.record.information.gender,'')
  await click('reload');await click('reload-confirm');assert.equal(byId('gender').value,'')
})
test('read or write access missing: no settings write',async t=>{
  const transport=mockSettings()
  const {byId,d}=await mount(t,{transport,access:()=>false})
  assert.equal(byId('save').disabled,true)
  assert.ok(d.querySelector('fieldset:disabled'))
  assert.equal(transport.calls.length,0)
})
// 0.7.2 owner decision: exports are complete and keep the saved permissions
// (the 0.7.0/0.7.1 export dropped them). Restoring them stays opt-in.
test('backup text includes the draft permissions as set and never writes by itself',async t=>{
  const {byId,click,select,transport}=await mount(t)
  await click('tab-information');await click('policy-gender')
  await click('tab-backup');await click('export-view')
  const data=JSON.parse(byId('export-json').value)
  assert.equal(data.allowCloud,false);assert.equal(data.allowPersonalInformation,false)
  assert.equal(data.policies.gender,'allow')
  assert.equal(data.workspaces,undefined)
  assert.equal(transport.calls.length,0)
})
test('Host schema declares only supported fields and version/lock agree',()=>{
  const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'))
  assert.equal(pkg.version,'0.8.0-rc.1')
  if(existsSync(new URL('../package-lock.json',import.meta.url))){
    const lock=JSON.parse(readFileSync(new URL('../package-lock.json',import.meta.url),'utf8'))
    assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].version,pkg.version)
  }
  const schema=JSON.stringify(Config.toJSON())
  for(const field of ['preferredName','nationality','gender','allowCloud','allowPersonalInformation'])assert.ok(schema.includes(field))
  for(const field of ['fullName','dateOfBirth','customFields'])assert.ok(!schema.includes(field))
  const client=readFileSync(new URL('../client.js',import.meta.url),'utf8')
  const section=client.slice(client.indexOf('// Native settings editor.'),client.indexOf('function ProfileDraft()'))
  assert.ok(section.length>0)
  assert.doesNotMatch(section,/\b(fetch|localStorage|sessionStorage|indexedDB|XMLHttpRequest|WebSocket|sendBeacon)\b/)
  assert.match(section,/settings\.replace\(PROFILE_NS,\{record:next\},revision\)/)
  assert.doesNotMatch(section,/ctx\.workspaces|workspaceSource/)
})
