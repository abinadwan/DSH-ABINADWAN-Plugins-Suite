// Phase 8 P1: negative and characterization checks on the real Harness Agent Loop
// (offline adapters, no network or credentials, synthetic values only).
// Run against an exact runtime:
//   ABINADWAN_TEST_RUNTIME=<rc dir> node --import ./qa/runtime-resolve.mjs --test qa/phase8-negative-check.mjs
//
// Negative: structured fields never reach an adapter or the session log, in any
// scenario below, while disclosure is not implemented.
// Characterization: authorized consented custom text stands in for "content
// authorized earlier", to prove what the Harness keeps or replays after a
// permission change. These facts bound the Phase 8 prospective-only contract.
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

const NAME='SYNTHETIC_P8_NAME', NATIONALITY='SYNTHETIC_P8_NATIONALITY'
const FIELDS=new RegExp(`${NAME}|${NATIONALITY}|"male"|\\bmale\\b`)
const AUTHORIZED='SYNTHETIC_P8_AUTHORIZED_TEXT'

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
const systemTexts=request=>request.messages.filter(m=>m.role==='system').map(m=>m.content.map(b=>b.text??'').join(''))
const systemOf=request=>systemTexts(request).join('\n')

/** Synthetic owner-equivalent record with every switch and policy at its most permissive. */
function permissive({style='friendly',sendCustom=false}={}) {
  const r=profile.emptyRecord()
  r.information={preferredName:NAME,nationality:NATIONALITY,gender:'male'}
  r.policies={preferredName:'allow',nationality:'allow',gender:'allow'}
  r.allowPersonalInformation=r.allowCloud=true
  r.preferences.style=style
  r.preferences.custom=AUTHORIZED
  if(sendCustom)r.preferences.sendCustom=true
  return r
}
function revoked(record,style='candid') {
  const r=structuredClone(record)
  r.policies={preferredName:'private',nationality:'private',gender:'private'}
  r.allowPersonalInformation=r.allowCloud=false
  delete r.preferences.sendCustom
  r.preferences.style=style
  return r
}

async function harness(t,routes) {
  const ctx=new Context()
  t.after(()=>ctx.fiber.dispose())
  for(const plugin of [LlmRuntime,SessionStore,SessionProjectionRegistry,SystemPrompt,ToolRuntime,NativeToolExecutor,AgentRegistry])await ctx.plugin(plugin)
  await ctx.plugin(AgentLoop,{agents:[]})
  const adapters={}
  for(const [name,options] of Object.entries(routes)){adapters[name]=new Capture(options);ctx.llm.registerAdapter([name],adapters[name])}
  return {ctx,adapters}
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
function assertNoFields(adapters,agents) {
  for(const adapter of Object.values(adapters))for(const request of adapter.requests)assert.doesNotMatch(JSON.stringify(request),FIELDS)
  for(const agent of agents){
    const log=JSON.stringify(agent.session.snapshotEvents())
    assert.doesNotMatch(log,FIELDS)
    assert.doesNotMatch(log,/"approval\/asked"/,'no approval prompt is ever raised for profile data')
  }
}

test('P8-03 retry after revocation: the retry reuses the step prompt; no field is ever sent',async t=>{
  const {ctx,adapters}=await harness(t,{plain:{fail:1}})
  const a=await agentOn(ctx,'p8-retry','plain')
  const fiber=ctx.plugin(profile,{record:permissive()});await fiber.await()
  let retries=0
  ctx.on('agent/request-error',async()=>{
    retries++
    await fiber.update({record:revoked(permissive())})
    return {kind:'retry'}
  })
  await send(a,'first')
  assert.equal(retries,1)
  const [failed,retry]=adapters.plain.requests
  assert.match(systemOf(failed),/friendly/)
  // Characterization: the revocation during backoff does not reach the retry.
  assert.match(systemOf(retry),/friendly/,'retry keeps the section accepted for the step')
  assert.doesNotMatch(systemOf(retry),/candid/)
  await send(a,'next step')
  const next=adapters.plain.requests.at(-1)
  assert.match(systemOf(next),/candid/,'the next step uses the revoked settings')
  assert.doesNotMatch(systemOf(next),/friendly/)
  assertNoFields(adapters,[a])
})

test('N-5 provider switch: authorized text replay depends on the target route; no field is ever sent',async t=>{
  const {ctx,adapters}=await harness(t,{historyA:{inHistory:true},historyB:{inHistory:true},plain:{}})
  const fiber=ctx.plugin(profile,{record:permissive({sendCustom:true})});await fiber.await()
  const toHistory=await agentOn(ctx,'p8-switch-history','historyA')
  const toPlain=await agentOn(ctx,'p8-switch-plain','historyA')
  await send(toHistory,'authorized on A');await send(toPlain,'authorized on A')
  assert.ok(adapters.historyA.requests.every(r=>systemOf(r).includes(AUTHORIZED)))
  await fiber.update({record:revoked(permissive({sendCustom:true}))})
  toHistory.model.select({provider:'historyB',model:'test'})
  toPlain.model.select({provider:'plain',model:'test'})
  await send(toHistory,'after revocation on B');await send(toPlain,'after revocation on plain')
  const onB=adapters.historyB.requests.at(-1), onPlain=adapters.plain.requests.at(-1)
  assert.match(systemTexts(onB).at(-1),/candid/);assert.match(systemTexts(onPlain).at(-1),/candid/)
  t.diagnostic(`in-history B resends earlier authorized text: ${systemOf(onB).includes(AUTHORIZED)}`)
  t.diagnostic(`plain route resends earlier authorized text: ${systemOf(onPlain).includes(AUTHORIZED)}`)
  assert.equal(systemOf(onPlain).includes(AUTHORIZED),false,'a replace route normalizes the system prompt')
  assert.equal(systemOf(onB).includes(AUTHORIZED),true,'N-5: an in-history route resends the earlier prompt to the new provider')
  // The on-disk log keeps the earlier prompt on every route.
  for(const agent of [toHistory,toPlain])assert.match(JSON.stringify(agent.session.snapshotEvents()),new RegExp(AUTHORIZED))
  assertNoFields(adapters,[toHistory,toPlain])
})

test('P8-01 branching: a fork seed copies the earlier authorized prompt; no field is ever copied',async t=>{
  const {ctx,adapters}=await harness(t,{plain:{}})
  const fiber=ctx.plugin(profile,{record:permissive({sendCustom:true})});await fiber.await()
  const a=await agentOn(ctx,'p8-fork','plain')
  await send(a,'authorized')
  await fiber.update({record:revoked(permissive({sendCustom:true}))})
  await send(a,'after revocation')
  const events=a.session.snapshotEvents()
  const seed=buildForkSeed(events,events.at(-1).seq)
  assert.match(JSON.stringify(seed),new RegExp(AUTHORIZED),'a branch inherits text authorized before the revocation')
  assert.doesNotMatch(JSON.stringify(seed),FIELDS)
  assertNoFields(adapters,[a])
})

test('P8-05 fail-closed: restored legacy Allow with both switches Off or On contributes no field on any route',async t=>{
  const {ctx,adapters}=await harness(t,{plain:{},history:{inHistory:true}})
  const a=await agentOn(ctx,'p8-legacy','plain')
  const legacy=permissive();legacy.allowPersonalInformation=legacy.allowCloud=false
  const fiber=ctx.plugin(profile,{record:legacy});await fiber.await()
  for(const on of [false,true]){
    await fiber.update({record:{...legacy,allowPersonalInformation:on,allowCloud:on}})
    for(const provider of ['plain','history']){a.model.select({provider,model:'test'});await send(a,`legacy ${provider} ${on}`)}
  }
  assert.ok(adapters.plain.requests.length>=2&&adapters.history.requests.length>=2)
  assertNoFields(adapters,[a])
})
