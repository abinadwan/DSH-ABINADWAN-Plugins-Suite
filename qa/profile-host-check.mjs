// Integration-only fixture: real rc.3 services, no network or credentials.
// Source contract: deepseek-harness@38a6a5c, agent-loop/tests/system-prompt-admission.spec.ts.
import test from 'node:test'
import assert from 'node:assert/strict'
import { Context } from '@deepseek-ai/cordis'
import LlmRuntime,{LlmAdapter,createUserMessage} from '@deepseek-ai/dsh-llm'
import SessionStore,{SessionId} from '@deepseek-ai/dsh-session'
import SessionProjectionRegistry from '@deepseek-ai/dsh-session-projection'
import SystemPrompt,{renderPrompt} from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import * as NativeToolExecutor from '@deepseek-ai/dsh-tool-executor-native'
import AgentRegistry,{installModelSelection} from '@deepseek-ai/dsh-agent'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import * as profile from '../plugins/personal-profile/index.js'

class Capture extends LlmAdapter {
  requests=[]
  constructor(inHistory=false){super();this.inHistory=inHistory}
  async resolveModel(provider,model){
    return {provider,id:model,name:model,...(this.inHistory?{systemPromptUpdate:'in-history'}:{})}
  }
  async *stream(request){
    this.requests.push(request)
    yield {type:'block-start',index:0,blockType:'text'}
    yield {type:'text-delta',index:0,text:'ok'}
    yield {type:'block-end',index:0,block:{type:'text',text:'ok'}}
    yield {type:'usage',usage:{inputTokens:10,outputTokens:2}}
    yield {type:'finish',reason:{kind:'stop'}}
  }
}
const systemTexts=request=>request.messages.filter(m=>m.role==='system').map(m=>m.content.map(b=>b.text??'').join(''))
const latest=adapter=>systemTexts(adapter.requests.at(-1)).at(-1)??''
const marker='FICTIONAL_PRIVATE_FIELD_7C'
const nationalityMarker='FICTIONAL_NATIONALITY_7C'
const custom='FICTIONAL_CUSTOM {{literal}}'
async function send(agent,adapter,label){
  const count=adapter.requests.length
  agent.followup(createUserMessage({content:[{type:'text',text:label}],source:{kind:'user'}}))
  await agent.whenIdle()
  assert.equal(adapter.requests.length,count+1,'one adapter attempt expected')
  const payload=JSON.stringify(adapter.requests.at(-1))
  assert.doesNotMatch(payload,new RegExp(marker+'|'+nationalityMarker+'|female'))
}
test('rc.3 real loop: committed config, new and existing sessions, disable and complete prompts',async()=>{
  const ctx=new Context()
  try{
    await ctx.plugin(LlmRuntime)
    await ctx.plugin(SessionStore)
    await ctx.plugin(SessionProjectionRegistry)
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(NativeToolExecutor)
    await ctx.plugin(AgentRegistry)
    await ctx.plugin(AgentLoop,{agents:[]})
    const plain=new Capture(), history=new Capture(true)
    ctx.llm.registerAdapter(['plain'],plain)
    ctx.llm.registerAdapter(['history'],history)
    const a=await ctx.agentLoop.create(SessionId('profile-a'),{provider:'plain',model:'test'})
    installModelSelection(a.ctx)
    const r=profile.emptyRecord()
    r.information={preferredName:marker,nationality:nationalityMarker,gender:'female'}
    // This fixture exercises preferences with all personal fields private.
    r.preferences.style='friendly'
    r.preferences.custom=custom
    await send(a,plain,'before enabling')
    assert.doesNotMatch(latest(plain),/Response preferences/)
    let fiber=ctx.plugin(profile,{record:r});await fiber.await()
    assert.doesNotMatch(renderPrompt(await ctx.systemPrompt.assemble()),/Response preferences/)
    await send(a,plain,'after enabling')
    assert.match(latest(plain),/friendly/)
    assert.doesNotMatch(latest(plain),/FICTIONAL_CUSTOM/)
    assert.equal(latest(plain).split('Response preferences').length,2)
    const next=structuredClone(r)
    next.preferences.style='technical';next.preferences.responseLanguage='ja';next.preferences.sendCustom=true
    await fiber.update({record:next})
    await send(a,plain,'after committed update')
    assert.match(latest(plain),/Japanese/)
    assert.match(latest(plain),/FICTIONAL_CUSTOM \{\{literal\}\}/)
    assert.doesNotMatch(latest(plain),/friendly/)
    const b=await ctx.agentLoop.create(SessionId('profile-b'),{provider:'history',model:'test'})
    installModelSelection(b.ctx)
    await send(b,history,'new session')
    assert.match(latest(history),/Japanese/)
    delete next.preferences.sendCustom
    next.preferences.style='candid'
    await fiber.update({record:next})
    await send(b,history,'in history update')
    assert.match(latest(history),/candid/)
    assert.doesNotMatch(latest(history),/FICTIONAL_CUSTOM/)
    // In-history mode may retain old authorized text: assert the documented limit.
    assert.ok(systemTexts(history.requests.at(-1)).some(t=>t.includes(custom)))
    await fiber.dispose()
    await send(a,plain,'disabled')
    assert.doesNotMatch(latest(plain),/Response preferences/)
    fiber=ctx.plugin(profile,{record:next});await fiber.await()
    await send(a,plain,'re-enabled')
    assert.match(latest(plain),/candid/)
    assert.equal(latest(plain).split('Response preferences').length,2)
    const remove=ctx.systemPrompt.section({name:'qa:complete',order:100,complete:true,text:'Complete test prompt.'})
    await send(a,plain,'complete preset')
    assert.equal(latest(plain),'Complete test prompt.')
    await remove()
    // Old versions must not promote previously inactive sharing choices.
    for(const version of [2,3]){
      const record={...structuredClone(next),version,locale:'en',allowPersonalInformation:true,allowCloud:true,
        policies:{preferredName:'allow',nationality:'allow',gender:'allow'}}
      await fiber.update({record})
      a.model.select({provider:'history',model:'test'})
      await send(a,history,'legacy permission history')
      a.model.select({provider:'plain',model:'test'})
      await send(a,plain,'legacy permission plain')
    }
    assert.doesNotMatch(JSON.stringify(a.session.snapshotEvents()),new RegExp(marker+'|'+nationalityMarker+'|female'))
    // Exercise the positive path with explicit v4 choices in fresh native sessions.
    let checkedHistoryAgent = null
    const checked={...structuredClone(next),policies:{preferredName:'allow',nationality:'private',gender:'private'}}
    await fiber.update({record:checked})
    for(const [provider,adapter] of [['plain',plain],['history',history]]){
      const fresh=await ctx.agentLoop.create(SessionId('profile-checked-'+provider),{provider,model:'test'})
      installModelSelection(fresh.ctx)
      const count=adapter.requests.length
      fresh.followup(createUserMessage({content:[{type:'text',text:'Who am I?'}],source:{kind:'user'}}))
      await fresh.whenIdle()
      assert.equal(adapter.requests.length,count+1)
      const payload=JSON.stringify(adapter.requests.at(-1))
      assert.match(payload,new RegExp(marker))
      assert.doesNotMatch(payload,new RegExp(nationalityMarker+'|female'))
      if(provider==='history')checkedHistoryAgent=fresh
    }
    await fiber.update({record:{...checked,policies:profile.emptyPolicies()}})
    // Phase 01: a real in-history session previously allowed this fictional
    // field. A follow-up after revocation must not reach any adapter with it.
    const historyBeforeRevokedFollowup=history.requests.length
    checkedHistoryAgent.followup(createUserMessage({content:[{type:'text',text:'Continue after revocation'}],source:{kind:'user'}}))
    await checkedHistoryAgent.whenIdle()
    for(const request of history.requests.slice(historyBeforeRevokedFollowup)){
      assert.doesNotMatch(JSON.stringify(request),new RegExp(marker),
        'revoked profile detail must not reach an adapter after in-history replay')
    }
    for(const [provider,adapter] of [['plain',plain],['history',history]]){
      const clean=await ctx.agentLoop.create(SessionId('profile-private-'+provider),{provider,model:'test'})
      installModelSelection(clean.ctx)
      await send(clean,adapter,'Who am I?')
    }
    await fiber.dispose()
    await send(a,plain,'disabled after policy changes')
  }finally{await ctx.fiber.dispose()}
})
