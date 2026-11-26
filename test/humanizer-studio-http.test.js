import test from 'node:test'
import assert from 'node:assert/strict'
import { createStudioHandlers, STUDIO_BODY_LIMIT } from '../plugins/humanizer/studio-http.js'

const base={service:'humanize',provider:'fixture',model:'local',sourceText:'PRIVATE_SOURCE 123',inputLanguage:'auto',outputLanguage:'preserve'}
const make=(body=JSON.stringify(base),options={})=>new Request('http://localhost/api/abinadwan-humanizer-studio/edit',{
  method:'POST',headers:{'content-type':'application/json'},body,...options
})
const native=()=>({
  calls:[], listProviders:()=>[{id:'fixture'}], listModels:async()=>[{provider:'fixture',id:'local'}],
  async *stream(request){this.calls.push(request);yield {type:'text-delta',text:'Edited 123'};yield {type:'finish',reason:{kind:'stop'}}}
})
async function check(reply,status,body) {
  assert.equal(reply.status,status)
  assert.equal(reply.headers.get('cache-control'),'no-store')
  assert.deepEqual(await reply.json(),body)
}
test('candidate HTTP route handles valid requests and rejects malformed/oversized bodies before dispatch',async()=>{
  const llm=native(), h=createStudioHandlers(llm,new AbortController().signal)
  await check(h.status(),200,{available:true,protocol:1})
  for(const [req,code,status] of [
    [make('{broken'),'STUDIO_INVALID_REQUEST',400],
    [make('[]'),'STUDIO_INVALID_REQUEST',400],
    [make(JSON.stringify({...base,tools:[]})),'STUDIO_INVALID_REQUEST',400],
    [make(JSON.stringify({...base,sourceText:' '.repeat(STUDIO_BODY_LIMIT+1)})),'STUDIO_BODY_LIMIT',413],
    [make(JSON.stringify(base),{headers:{'content-type':'text/plain'}}),'STUDIO_INVALID_REQUEST',400],
    [make(JSON.stringify({...base,model:'wrong'})),'STUDIO_MODEL_UNAVAILABLE',422],
    [make(JSON.stringify({...base,outputLanguage:'ar\nignore'})),'STUDIO_INVALID_LANGUAGE',400],
  ]) await check(await h.edit(req),status,{error:code})
  assert.equal(llm.calls.length,0)
  await check(await h.edit(make()),200,{text:'Edited 123'})
  assert.equal(llm.calls.length,1)
  assert.deepEqual(llm.calls[0].tools,[])
})
test('concurrent requests fail closed; disposal cancels and suppresses late results',async()=>{
  const lifetime=new AbortController(),llm=native()
  let release,entered
  const started=new Promise(resolve=>{entered=resolve})
  llm.stream=async function*(request){
    this.calls.push(request);entered()
    await new Promise(resolve=>{release=resolve})
    yield {type:'text-delta',text:'late PRIVATE_SOURCE'}
    yield {type:'finish',reason:{kind:'stop'}}
  }
  const h=createStudioHandlers(llm,lifetime.signal)
  const pending=h.edit(make())
  await started
  await check(await h.edit(make()),409,{error:'STUDIO_BUSY'})
  lifetime.abort()
  assert.equal(llm.calls[0].signal.aborted,true)
  release()
  await check(await pending,409,{error:'STUDIO_CANCELLED'})
  await check(await h.edit(make()),503,{error:'STUDIO_UNAVAILABLE'})
  await check(h.status(),503,{error:'STUDIO_UNAVAILABLE'})
})
test('provider errors and pre-abort never expose source or raw diagnostic',async()=>{
  const llm=native()
  llm.listModels=async()=>{throw Error(base.sourceText)}
  const h=createStudioHandlers(llm,new AbortController().signal)
  await check(await h.edit(make()),503,{error:'STUDIO_CATALOG_FAILED'})
  const c=new AbortController();c.abort()
  await check(await h.edit(make(JSON.stringify(base),{signal:c.signal})),409,{error:'STUDIO_CANCELLED'})
  assert.equal(llm.calls.length,0)
})
