// Phase 8 disclosure checks on the real Harness Agent Loop (offline adapters, no
// network or credentials, synthetic values only). Run against an exact runtime:
//   ABINADWAN_TEST_RUNTIME=<rc dir> node --import ./qa/runtime-resolve.mjs --test qa/phase8-disclosure-check.mjs
//
// The real default Host never admits structured details. An isolated fixture
// represents an earlier build so we can check stale retry, history replay,
// provider switches and branching without a production admission bypass.
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
import { DISCLOSURE_SECTION_NAME, profileDisclosure } from '../plugins/personal-profile/preferences.js'

const NAME='SYNTHETIC_P8_NAME', NATIONALITY='SYNTHETIC_P8_NATIONALITY'
const VALUES=new RegExp(`${NAME}|${NATIONALITY}|Gender: `)

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

/** Synthetic record: every field Allow, both switches On. */
function sharing() {
  const r=profile.emptyRecord()
  r.locale='en'
  r.information={preferredName:NAME,nationality:NATIONALITY,gender:'male'}
  r.policies={preferredName:'allow',nationality:'allow',gender:'allow'}
  r.allowPersonalInformation=r.allowCloud=true
  r.preferences.style='technical'
  r.preferences.custom='Synthetic permitted guidance'
  r.preferences.sendCustom=true
  return r
}

async function installHistoricalFixture(ctx){
  const fiber=ctx.plugin({
    name:'synthetic-earlier-profile',
    apply(ctx){
      ctx.inject(['systemPrompt'],child=>{
        child.systemPrompt.section({name:DISCLOSURE_SECTION_NAME,order:51,interpolate:false,
          text:()=>profileDisclosure(sharing())})
      })
    },
  })
  await fiber.await()
  return fiber
}

async function installProfile(ctx,record=sharing()){
  const fiber=ctx.plugin(profile,{record})
  await fiber.await()
  return fiber
}

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



test('default Host: no structured details reach either native route, even with Allow and both switches On',async t=>{
  const {ctx,adapters}=await harness(t,{plain:{},history:{inHistory:true}})
  const fiber=await installProfile(ctx)
  for(const version of [2,3]){
    await fiber.update({record:{...sharing(),version}})
    for(const provider of ['plain','history']){
      const a=await agentOn(ctx,`p8-held-${version}-${provider}`,provider)
      await send(a,'hello')
      const sent=systemOf(adapters[provider].requests.at(-1))
      assert.doesNotMatch(sent,VALUES,provider)
      assert.match(sent,/Use precise technical terminology/)
      assert.match(sent,/Synthetic permitted guidance/)
      assertNoApproval([a])
    }
  }
})

test('retry carrying a previously admitted Profile block is refused before the adapter',async t=>{
  const {ctx,adapters,failures}=await harness(t,{plain:{fail:1}})
  const a=await agentOn(ctx,'p8-retry','plain')
  const earlier=await installHistoricalFixture(ctx)
  let retried=false
  ctx.on('agent/request-error',async(_payload,next)=>{
    if(retried)return next()
    retried=true
    await earlier.dispose()
    await installProfile(ctx)
    return {kind:'retry'}
  },{prepend:true})
  await send(a,'first')
  assert.equal(adapters.plain.requests.length,1,'only the synthetic earlier attempt was sent')
  assert.match(systemOf(adapters.plain.requests[0]),new RegExp(NAME))
  assert.ok(failures.includes('INVALID_REQUEST'),'the retry ended in a terminal refusal')
  await send(a,'next step')
  assert.equal(adapters.plain.requests.length,2,'a replace route continues on the next step')
  assert.doesNotMatch(systemOf(adapters.plain.requests.at(-1)),VALUES)
  assertNoApproval([a])
})

test('in-history replay is refused on the same route and after a switch; a replace route continues',async t=>{
  const {ctx,adapters,failures}=await harness(t,{historyA:{inHistory:true},historyB:{inHistory:true},plain:{}})
  const earlier=await installHistoricalFixture(ctx)
  const stay=await agentOn(ctx,'p8-stay','historyA'), toB=await agentOn(ctx,'p8-to-b','historyA'), toPlain=await agentOn(ctx,'p8-to-plain','historyA')
  for(const a of [stay,toB,toPlain])await send(a,'shared on A')
  assert.equal(adapters.historyA.requests.length,3)
  await earlier.dispose()
  // Even a matching current record does not authorize replay on a label alone.
  await installProfile(ctx)
  toB.model.select({provider:'historyB',model:'test'})
  toPlain.model.select({provider:'plain',model:'test'})
  await send(stay,'replay on A');await send(toB,'replay on B');await send(toPlain,'continue on plain')
  assert.equal(adapters.historyA.requests.length,3,'A receives no replay')
  assert.equal(adapters.historyB.requests.length,0,'the earlier prompt is not resent to B')
  assert.equal(failures.filter(c=>c==='INVALID_REQUEST').length,2)
  assert.equal(adapters.plain.requests.length,1)
  assert.doesNotMatch(JSON.stringify(adapters.plain.requests[0]),VALUES)
  assert.match(JSON.stringify(stay.session.snapshotEvents()),new RegExp(NAME),'the former disclosure remains in native history')
  assertNoApproval([stay,toB,toPlain])
})

test('branched or restored history carrying an earlier Profile block is refused',async t=>{
  const {ctx,adapters,failures}=await harness(t,{history:{inHistory:true}})
  const earlier=await installHistoricalFixture(ctx)
  const a=await agentOn(ctx,'p8-fork-parent','history')
  await send(a,'shared')
  await earlier.dispose()
  await installProfile(ctx,{...sharing(),version:2})
  const events=a.session.snapshotEvents()
  const boundary=events.at(-1).seq
  const seed=buildForkSeed(events,boundary)
  assert.match(JSON.stringify(seed),new RegExp(NAME),'a branch inherits the earlier prompt')
  const handle=await ctx.agents.create({sessionId:SessionId('p8-fork-child'),seed,inheritedEventCount:boundary+1,
    meta:{isSeeded:true},agentOptions:{provider:'history',model:'test'}})
  const child=handle.agent??handle
  installModelSelection(child.ctx)
  const count=adapters.history.requests.length
  await send(child,'continue the branch')
  assert.equal(adapters.history.requests.length,count,'the branch does not resend the old block')
  assert.ok(failures.includes('INVALID_REQUEST'))
  assertNoApproval([a,child])
})
