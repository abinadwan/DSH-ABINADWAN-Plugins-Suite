// Phase 8 disclosure checks on the real Harness Agent Loop (offline adapters, no
// network or credentials, synthetic values only). Run against an exact runtime:
//   ABINADWAN_TEST_RUNTIME=<rc dir> node --import ./qa/runtime-resolve.mjs --test qa/phase8-disclosure-check.mjs
//
// Proves: assembly admission (Allow + both switches), send-time refusal of stale
// blocks (retry, in-history replay, provider switch, value edit, branch), the
// replace-route continuation, and that legacy Allow with switches Off shares nothing.
import test from 'node:test'
import assert from 'node:assert/strict'
import { Context } from '@deepseek-ai/cordis'
import LlmRuntime,{LlmAdapter,LlmError,createUserMessage} from '@deepseek-ai/dsh-llm'
import SessionStore,{SessionId,buildForkSeed} from '@deepseek-ai/dsh-session'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import * as NativeToolExecutor from '@deepseek-ai/dsh-tool-executor-native'
import AgentRegistry,{installModelSelection} from '@deepseek-ai/dsh-agent'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import * as profile from '../plugins/personal-profile/index.js'

const NAME='SYNTHETIC_P8_NAME', NATIONALITY='SYNTHETIC_P8_NATIONALITY', RENAMED='SYNTHETIC_P8_RENAMED'
const HEADER='Personal details the user chose to share (use them only when relevant to the request):'
const VALUES=new RegExp(`${NAME}|${NATIONALITY}|${RENAMED}|Gender: `)

class Capture extends LlmAdapter {
  requests=[]; failures=0
  constructor({inHistory=false,fail=0}={}){super();this.inHistory=inHistory;this.failures=fail}
  async resolveModel(provider,model){
    return {provider,id:model,name:model,...(this.inHistory?{systemPromptUpdate:'in-history'}:{})}
  }
  async *stream(request){
    this.requests.push(request)
    if(this.failures>0){this.failures--;throw LlmError.fromFailure({message:'synthetic busy',code:'RATE_LIMIT'})}
    yield {type:'block-start',index:0,blockType:'text'}
    yield {type:'text-delta',index:0,text:'ok'}
    yield {type:'block-end',index:0,block:{type:'text',text:'ok'}}
    yield {type:'usage',usage:{inputTokens:10,outputTokens:2}}
    yield {type:'finish',reason:{kind:'stop'}}
  }
}
const systemOf=request=>request.messages.filter(m=>m.role==='system').map(m=>m.content.map(b=>b.text??'').join('')).join('\n')
const blockOf=lines=>[HEADER,...lines].join('\n')

/** Synthetic record: every field Allow, both switches On. */
function sharing({name=NAME,gender='male'}={}) {
  const r=profile.emptyRecord()
  r.locale='en'
  r.information={preferredName:name,nationality:NATIONALITY,gender}
  r.policies={preferredName:'allow',nationality:'allow',gender:'allow'}
  r.allowPersonalInformation=r.allowCloud=true
  return r
}
const revoked=record=>({...structuredClone(record),allowCloud:false})

async function harness(t,routes) {
  const ctx=new Context()
  t.after(()=>ctx.fiber.dispose())
  for(const plugin of [LlmRuntime,SessionStore,SessionProjectionRegistry,SystemPrompt,ToolRuntime,NativeToolExecutor,AgentRegistry])await ctx.plugin(plugin)
  await ctx.plugin(AgentLoop,{agents:[]})
  const adapters={}
  for(const [name,options] of Object.entries(routes)){adapters[name]=new Capture(options);ctx.llm.registerAdapter([name],adapters[name])}
  // Record every terminal request failure so a refusal is observable.
  const failures=[]
  ctx.on('agent/request-error',payload=>{failures.push(payload?.failure?.code);return undefined})
  return {ctx,adapters,failures}
}
async function agentOn(ctx,id,provider) {
  const a=await ctx.agentLoop.create(SessionId(id),{provider,model:'test'})
  installModelSelection(a.ctx)
  return a
}
async function send(agent,text) {
  agent.followup(createUserMessage({content:[{type:'text',text}],source:{kind:'user'}}))
  await agent.whenIdle()
}
function assertNoApproval(agents) {
  for(const agent of agents)assert.doesNotMatch(JSON.stringify(agent.session.snapshotEvents()),/"approval\/asked"/,'no approval prompt is raised for profile data')
}

test('admission: Allow + both switches shares exactly the allowed fields on both routes; anything less shares nothing',async t=>{
  const {ctx,adapters}=await harness(t,{plain:{},history:{inHistory:true}})
  const fiber=ctx.plugin(profile,{record:sharing()});await fiber.await()
  const cases=[
    [sharing(),blockOf([`Preferred name: ${NAME}`,`Nationality: ${NATIONALITY}`,'Gender: male'])],
    [{...sharing(),policies:{preferredName:'allow',nationality:'ask_first',gender:'private'}},blockOf([`Preferred name: ${NAME}`])],
    [sharing({gender:'unspecified'}),blockOf([`Preferred name: ${NAME}`,`Nationality: ${NATIONALITY}`])],
    [{...sharing(),allowCloud:false},''],
    [{...sharing(),allowPersonalInformation:false},''],
    [{...sharing(),policies:{preferredName:'ask_first',nationality:'ask_first',gender:'private'}},''],
  ]
  let n=0
  for(const [record,expected] of cases){
    await fiber.update({record})
    for(const provider of ['plain','history']){
      // A fresh chat per case: earlier blocks never mix into later expectations.
      const a=await agentOn(ctx,`p8-admit-${n++}`,provider)
      await send(a,'hello')
      const sent=systemOf(adapters[provider].requests.at(-1))
      if(expected){assert.ok(sent.includes(expected),`${provider}: exact block`);assert.equal(sent.split(HEADER).length,2,'one block')}
      else assert.doesNotMatch(sent,VALUES,`${provider}: nothing shared`)
      assertNoApproval([a])
    }
  }
})

test('retry after revocation: the stale retry is refused at send time and never reaches the adapter',async t=>{
  const {ctx,adapters,failures}=await harness(t,{plain:{fail:1}})
  const a=await agentOn(ctx,'p8-retry','plain')
  const fiber=ctx.plugin(profile,{record:sharing()});await fiber.await()
  let retried=false
  ctx.on('agent/request-error',async(payload,next)=>{
    if(retried)return next()
    retried=true
    await fiber.update({record:revoked(sharing())})
    return {kind:'retry'}
  },{prepend:true})
  await send(a,'first')
  assert.equal(adapters.plain.requests.length,1,'only the authorized first attempt was sent')
  assert.match(systemOf(adapters.plain.requests[0]),new RegExp(NAME),'previous authorized disclosure')
  assert.ok(failures.includes('INVALID_REQUEST'),'the retry ended in a terminal refusal')
  await send(a,'next step')
  const next=adapters.plain.requests.at(-1)
  assert.equal(adapters.plain.requests.length,2,'a replace route continues on the next step')
  assert.doesNotMatch(systemOf(next),VALUES)
  assertNoApproval([a])
})

test('in-history replay after revocation is refused on the same route and after a switch; a replace route continues without fields',async t=>{
  const {ctx,adapters,failures}=await harness(t,{historyA:{inHistory:true},historyB:{inHistory:true},plain:{}})
  const fiber=ctx.plugin(profile,{record:sharing()});await fiber.await()
  const stay=await agentOn(ctx,'p8-stay','historyA'), toB=await agentOn(ctx,'p8-to-b','historyA'), toPlain=await agentOn(ctx,'p8-to-plain','historyA')
  for(const a of [stay,toB,toPlain])await send(a,'shared on A')
  assert.equal(adapters.historyA.requests.length,3)
  await fiber.update({record:revoked(sharing())})
  toB.model.select({provider:'historyB',model:'test'})
  toPlain.model.select({provider:'plain',model:'test'})
  await send(stay,'after revocation on A');await send(toB,'after revocation on B');await send(toPlain,'after revocation on plain')
  assert.equal(adapters.historyA.requests.length,3,'A received nothing after revocation')
  assert.equal(adapters.historyB.requests.length,0,'N-5 closed: the earlier prompt is not resent to B')
  assert.equal(failures.filter(c=>c==='INVALID_REQUEST').length,2)
  assert.equal(adapters.plain.requests.length,1)
  assert.doesNotMatch(JSON.stringify(adapters.plain.requests[0]),VALUES,'a replace route normalizes the prompt and sends no field')
  // Previous authorized disclosure stays in the native log; it is never deleted.
  assert.match(JSON.stringify(stay.session.snapshotEvents()),new RegExp(NAME))
  assertNoApproval([stay,toB,toPlain])
})

test('editing a shared value: an in-history chat refuses the old block; a new chat shares the new value',async t=>{
  const {ctx,adapters,failures}=await harness(t,{history:{inHistory:true}})
  const fiber=ctx.plugin(profile,{record:sharing()});await fiber.await()
  const old=await agentOn(ctx,'p8-edit-old','history')
  await send(old,'shared')
  await fiber.update({record:sharing({name:RENAMED})})
  const count=adapters.history.requests.length
  await send(old,'after edit')
  assert.equal(adapters.history.requests.length,count,'the old value is not resent')
  assert.ok(failures.includes('INVALID_REQUEST'))
  const fresh=await agentOn(ctx,'p8-edit-new','history')
  await send(fresh,'new chat')
  const sent=systemOf(adapters.history.requests.at(-1))
  assert.match(sent,new RegExp(`Preferred name: ${RENAMED}`))
  assert.doesNotMatch(sent,new RegExp(NAME))
})

test('branched or restored history after revocation: an in-history continuation is refused; legacy Allow with switches Off shares nothing',async t=>{
  const {ctx,adapters,failures}=await harness(t,{history:{inHistory:true},plain:{}})
  const fiber=ctx.plugin(profile,{record:sharing()});await fiber.await()
  const a=await agentOn(ctx,'p8-fork-parent','history')
  await send(a,'shared')
  await fiber.update({record:revoked(sharing())})
  const events=a.session.snapshotEvents()
  const boundary=events.at(-1).seq
  const seed=buildForkSeed(events,boundary)
  assert.match(JSON.stringify(seed),new RegExp(NAME),'a branch inherits the earlier authorized prompt')
  const handle=await ctx.agents.create({sessionId:SessionId('p8-fork-child'),seed,inheritedEventCount:boundary+1,
    meta:{isSeeded:true},agentOptions:{provider:'history',model:'test'}})
  const child=handle.agent??handle
  installModelSelection(child.ctx)
  const count=adapters.history.requests.length
  await send(child,'continue the branch')
  assert.equal(adapters.history.requests.length,count,'the branch does not resend the revoked block')
  assert.ok(failures.includes('INVALID_REQUEST'))
  // Owner-equivalent legacy backup: field Allow, both switches Off.
  const legacy={...sharing(),allowPersonalInformation:false,allowCloud:false}
  await fiber.update({record:legacy})
  for(const provider of ['plain','history']){
    const b=await agentOn(ctx,`p8-legacy-${provider}`,provider)
    await send(b,'legacy')
    assert.doesNotMatch(JSON.stringify(adapters[provider].requests.at(-1)),VALUES)
  }
  assertNoApproval([a,child])
})
