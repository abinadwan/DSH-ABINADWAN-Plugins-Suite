import test from 'node:test'
import assert from 'node:assert/strict'
import '../test-support/dom-global.js'
import React, {act} from 'react'
import {createRoot} from 'react-dom/client'
import {clientHarness,base,tick} from '../test-support/client.js'

const id='abinadwan-humanizer-studio'
const locale={active:'ar',revision:1,locales:[{id:'en',label:'English'},{id:'ar',label:'العربية'},{id:'fr',label:'Français'}]}
test('Studio native keyed main and sidebar registration follows Humanizer lifecycle',async t=>{
  const app=await clientHarness()
  t.after(()=>app.dispose())
  const sidebar=app.entries('sidebar.panellist').find(row=>row.options.id===id)
  assert.equal(sidebar.options.order,11)
  assert.ok(app.entries('main').some(row=>row.options.key===id))
  app.setRows(app.rows().map(row=>row.moduleName===base+'/humanizer'?{...row,enabled:false}:row))
  await app.changed()
  assert.ok(!app.entries('main').some(row=>row.options.key===id))
  assert.ok(!app.entries('sidebar.panellist').some(row=>row.options.id===id))
})
test('Studio uses live native catalog, sends only explicit text, supports RTL and clear',async t=>{
  const dom={window:globalThis.window}
  const oldAct=globalThis.IS_REACT_ACT_ENVIRONMENT
  globalThis.IS_REACT_ACT_ENVIRONMENT=true
  const container=dom.window.document.createElement('div')
  dom.window.document.body.append(container)
  const sent=[]
  const storageCalls=[]
  let delayedEdit=null, delayedLoad=null, catalogUnavailable=false
  let saved={version:1,revision:'initial',draft:null,history:[]}
  const app=await clientHarness({React,document:dom.window.document,modelCatalog:()=>catalogUnavailable?{ok:false,error:{code:'unavailable',message:'fixture'}}:({groups:[{id:'p',name:'Provider',models:[{id:'m',name:'Model'}]}]}),
    fetch:async(url,options)=>{
      const path=new URL(url).pathname
      if(path.endsWith('/status'))return {ok:true,json:async()=>({available:true,protocol:1})}
      if(path.endsWith('/edit')){sent.push(JSON.parse(options.body));if(delayedEdit)return delayedEdit.promise;return {ok:true,json:async()=>({text:'نتيجة 123'})}}
      if(path.endsWith('/storage')){storageCalls.push('load');if(delayedLoad)return delayedLoad.promise;return {ok:true,json:async()=>saved}}
      if(path.endsWith('/storage/change')){
        const command=JSON.parse(options.body);storageCalls.push(command)
        assert.equal(command.revision,saved.revision)
        if(command.action==='save-draft')saved={...saved,revision:'r1',draft:command.entry}
        if(command.action==='save-history')saved={...saved,revision:'r2',history:[{id:'h1',savedAt:1,entry:command.entry}]}
        if(command.action==='clear-all')saved={version:1,revision:'r3',draft:null,history:[]}
        return {ok:true,json:async()=>saved}
      }
      return {ok:false,status:404,json:async()=>({})}
    }})
  app.hostLocale.set(locale)
  const root=createRoot(container)
  t.after(async()=>{await act(async()=>root.unmount());await app.dispose();container.remove();globalThis.IS_REACT_ACT_ENVIRONMENT=oldAct})
  const q=selector=>dom.window.document.querySelector(selector)
  const panel=app.entries('main').find(row=>row.options.key===id)
  await act(async()=>root.render(React.createElement(panel.component)))
  for(let i=0;i<4;i++)await act(async()=>{await tick()})
  assert.equal(q('[data-humanizer-studio]').dir,'rtl')
  assert.equal(q('[data-studio-model]').options.length,2)
  assert.equal(q('[data-studio-output-language]').options.length,4)
  assert.equal(sent.length,0)
  const change=async(selector,value)=>{
    const node=q(selector)
    const proto=node.tagName==='SELECT'?dom.window.HTMLSelectElement.prototype:dom.window.HTMLTextAreaElement.prototype
    await act(async()=>{if(node.tagName==='SELECT')node.value=value;else Object.getOwnPropertyDescriptor(proto,'value').set.call(node,value);node.dispatchEvent(new dom.window.Event(node.tagName==='SELECT'?'change':'input',{bubbles:true}))})
  }
  await change('[data-studio-model]',JSON.stringify(['p','m']))
  await change('[data-studio-editor="source"]','نص 123')
  await change('[data-studio-output-language]','ar')
  assert.equal(q('[data-studio-process]').disabled,false)
  await act(async()=>q('[data-studio-process]').click())
  for(let i=0;i<3;i++)await act(async()=>{await tick()})
  assert.deepEqual(sent,[{service:'humanize',provider:'p',model:'m',sourceText:'نص 123',inputLanguage:'auto',outputLanguage:'ar'}])
  assert.equal(q('[data-studio-editor="result"]').value,'نتيجة 123')
  assert.equal(q('[data-studio-editor="result"]').dir,'rtl')
  assert.deepEqual(storageCalls,[],'processing must not touch persistent storage')
  await act(async()=>q('[data-studio-storage-open]').click())
  for(let i=0;i<3;i++)await act(async()=>{await tick()})
  await act(async()=>q('[data-studio-save-draft]').click())
  for(let i=0;i<3;i++)await act(async()=>{await tick()})
  assert.equal(saved.draft.sourceText,'نص 123')
  await act(async()=>q('[data-studio-save-history]').click())
  for(let i=0;i<3;i++)await act(async()=>{await tick()})
  assert.equal(saved.history.length,1)
  await act(async()=>q('[data-studio-clear]').click())
  assert.equal(saved.draft.sourceText,'نص 123','editor clear does not silently delete saved items')
  await act(async()=>q('[data-studio-restore-draft]').click())
  assert.equal(q('[data-studio-editor="source"]').value,'نص 123')
  await act(async()=>q('[data-studio-clear-saved]').click())
  assert.equal(saved.history.length,1,'confirmation is required')
  await act(async()=>q('[data-studio-confirm-clear]').click())
  for(let i=0;i<3;i++)await act(async()=>{await tick()})
  assert.equal(saved.draft,null)
  assert.equal(saved.history.length,0)
  await act(async()=>q('[data-studio-storage-close]').click())
  await act(async()=>q('[data-studio-clear]').click())
  assert.equal(q('[data-studio-editor="source"]').value,'')
  assert.equal(q('[data-studio-editor="result"]').value,'')
  assert.equal(sent.length,1)
  assert.equal(dom.window.localStorage.length,0)
  assert.equal(dom.window.sessionStorage.length,0)
  function defer(){let resolve;const promise=new Promise(fn=>{resolve=fn});return {promise,resolve}}
  // The old owner response must not reappear in a new Host generation,
  // including when a transport ignores the abort signal.
  await change('[data-studio-model]',JSON.stringify(['p','m']))
  await change('[data-studio-editor="source"]','OLD_HOST_SENTINEL')
  delayedEdit=defer()
  await act(async()=>q('[data-studio-process]').click())
  assert.ok(q('[data-studio-cancel]'))
  await act(async()=>app.ctx.emit('connection/reset'))
  for(let i=0;i<4;i++)await act(async()=>{await tick()})
  await act(async()=>delayedEdit.resolve({ok:true,json:async()=>({text:'OLD_HOST_RESULT'})}))
  assert.equal(q('[data-studio-editor="source"]').value,'')
  assert.equal(q('[data-studio-editor="result"]').value,'')
  delayedEdit=null
  delayedLoad=defer()
  await act(async()=>q('[data-studio-storage-open]').click())
  await act(async()=>app.ctx.emit('connection/reset'))
  for(let i=0;i<4;i++)await act(async()=>{await tick()})
  await act(async()=>delayedLoad.resolve({ok:true,json:async()=>({version:1,revision:'old',draft:null,history:[{id:'old',entry:{sourceText:'OLD_SAVED_SENTINEL'}}]})}))
  assert.ok(!container.textContent.includes('OLD_SAVED_SENTINEL'))
  assert.equal(q('[data-studio-save-draft]'),null)
  delayedLoad=null
  // An unavailable catalog cannot trap saved text or block explicit deletion.
  catalogUnavailable=true
  saved={version:1,revision:'r1',draft:{service:'humanize',provider:'p',model:'m',inputLanguage:'auto',outputLanguage:'ar',sourceText:'saved sentinel',result:'saved result',editingBrief:''},history:[]}
  await act(async()=>app.ctx.emit('connection/reset'))
  for(let i=0;i<4;i++)await act(async()=>{await tick()})
  assert.equal(q('[data-studio-process]').disabled,true)
  assert.equal(q('[data-studio-storage-open]').disabled,false)
  await act(async()=>q('[data-studio-storage-open]').click())
  for(let i=0;i<3;i++)await act(async()=>{await tick()})
  assert.ok(q('[data-studio-restore-draft]'))
  await act(async()=>q('[data-studio-clear-saved]').click())
  await act(async()=>q('[data-studio-confirm-clear]').click())
  for(let i=0;i<3;i++)await act(async()=>{await tick()})
  assert.equal(saved.draft,null)
})
