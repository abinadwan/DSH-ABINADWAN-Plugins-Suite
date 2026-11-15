import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
const get=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8')
const pkg=JSON.parse(get('package.json'))
test('bundle and Host exports',async()=>{
  assert.equal(pkg.version,'0.2.1')
  assert.equal(pkg.dsh.client.platform,'web')
  assert.equal(pkg.dsh.bundle.patch,'./cordis.patch.yml')
  assert.equal((await import('../index.js')).apply(),undefined)
})
test('native right sidebar registers and auto-opens',()=>{
  let module
  const callbacks=[]
  runInNewContext(get('client.js'),{window:{__ModuleLoader__:{load:x=>module=x}},
    setTimeout:f=>{callbacks.push(f);return callbacks.length},clearTimeout:()=>{},console})
  assert.equal(module.id,pkg.name)
  const React={createElement:(type,props,...children)=>({type,props:props||{},children}),useState:x=>[x,()=>{}],useSyncExternalStore:(_,get)=>get()}
  const plugin=module.factory(n=>{assert.equal(n,'react');return React})
  const slots=[]
  let opened=0
  const ctx={
    sessions:{list:{subscribe:()=>()=>{},getSnapshot:()=>({byId:{s1:{displayTitle:'Demo',running:true}}})}},
    workspaces:{list:{subscribe:()=>()=>{},getSnapshot:()=>({items:[{workspaceId:'w',title:'HomeBook',sessionIds:['s1']}]})}},
    sidebarRightTabs:{register:def=>{slots.push({def});return()=>{}}},
    sidebarRight:{mounted:{getSnapshot:()=> 's1',subscribe:()=>()=>{}},openTab:kind=>{assert.equal(kind,'environment-dashboard');opened++}},
    slots:{inject:(_,fn)=>fn(),register:(options,component)=>{slots.push({options,component});return()=>{}}},
    effect:fn=>fn()
  }
  plugin.apply(ctx)
  assert.equal(slots.find(x=>x.def)?.def.kind,'environment-dashboard')
  assert.ok(slots.find(x=>x.options?.name==='conversation.session.header.utilities'))
  const body=slots.find(x=>x.options?.name==='sidebar.right.pane.tab')
  const element=body.component({sessionId:'s1',useProjection:key=>({
    contextPressure:{projectedTokens:3000,contextWindow:8000},
    contextBreakdown:{messageTokens:2000,toolsTokens:800,systemTokens:200},
    tokenUsage:{outputTokens:1200}
  })[key]})
  assert.equal(element.type(element.props).props['data-environment-right-sidebar'],'')
  assert.equal(callbacks.length,1)
  callbacks[0]()
  assert.equal(opened,1)
})
test('no privileged browser APIs',()=>{
  assert.doesNotMatch(get('client.js'),/\bfetch\s*\(|\bXMLHttpRequest\b|\bprocess\.env\b/)
})
