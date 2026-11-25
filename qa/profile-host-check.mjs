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
const marker='FICTIONAL_PROFILE_NAME'
const replacement='FICTIONAL_UPDATED_NAME'
const country='FICTIONAL_COUNTRY'
const custom='FICTIONAL_CUSTOM {{literal}}'
const textOf=m=>m.content.map(b=>b.text??'').join('')
const latestContext=request=>request.messages.filter(m=>m.source?.kind==='runtime-context'&&textOf(m).includes('Current My Profile settings')).at(-1)
async function send(agent,adapter,label){
  const count=adapter.requests.length
  agent.followup(createUserMessage({content:[{type:'text',text:label}],source:{kind:'user'}}))
  await agent.whenIdle()
  assert.equal(adapter.requests.length,count+1,'one adapter attempt expected')
  return adapter.requests.at(-1)
}
test('native rc.3: hybrid profile context and system preferences reach both routes, including updates',async()=>{
  const ctx=new Context()
  try{
    for(const plugin of [LlmRuntime,SessionStore,SessionProjectionRegistry,SystemPrompt,ToolRuntime,NativeToolExecutor,AgentRegistry])await ctx.plugin(plugin)
    await ctx.plugin(AgentLoop,{agents:[]})
    const record=profile.emptyRecord()
    record.information={preferredName:marker,nationality:country,gender:'male'}
    record.preferences.custom=custom
    record.preferences.responseLanguage='ja'
    const fiber=ctx.plugin(profile,{record});await fiber.await()
    for(const [provider,inHistory] of [['plain',false],['history',true]]){
      await fiber.update({record})
      const adapter=new Capture(inHistory)
      ctx.llm.registerAdapter([provider],adapter)
      const agent=await ctx.agentLoop.create(SessionId('context-'+provider),{provider,model:'test'})
      installModelSelection(agent.ctx)
      const first=await send(agent,adapter,'Who am I?')
      const block=latestContext(first)
      assert.ok(block,'native runtime-context snapshot reaches adapter')
      assert.match(textOf(block),new RegExp(marker))
      assert.match(textOf(block),new RegExp(country))
      assert.doesNotMatch(textOf(block),/FICTIONAL_CUSTOM|Required response language/)
      const system=first.messages.filter(m=>m.role==='system').map(textOf).join('\n')
      assert.match(system,/FICTIONAL_CUSTOM \{\{literal\}\}/)
      assert.match(system,/Required response language: Japanese/)
      assert.ok(first.messages.indexOf(block)>first.messages.findIndex(m=>m.role==='system'))
      assert.doesNotMatch(first.messages.filter(m=>m.role==='system').map(textOf).join('\n'),new RegExp(marker))
      const same=await send(agent,adapter,'Continue unchanged')
      assert.equal(same.messages.filter(m=>m.source?.kind==='runtime-context'&&textOf(m).includes('Current My Profile settings')).length,1,'unchanged context is not duplicated')
      const next=structuredClone(record);next.information.preferredName=replacement;next.preferences.custom='';next.preferences.responseLanguage='en'
      await fiber.update({record:next})
      const updated=await send(agent,adapter,'Continue after edit')
      assert.match(textOf(latestContext(updated)),new RegExp(replacement))
      assert.doesNotMatch(textOf(latestContext(updated)),/FICTIONAL_CUSTOM|Required response language/)
      assert.match(updated.messages.map(textOf).join('\n'),/Required response language: English/)
      await fiber.update({record:profile.emptyRecord()})
      const cleared=await send(agent,adapter,'Continue after clearing')
      assert.match(textOf(latestContext(cleared)),/No active personal details/)
      assert.doesNotMatch(textOf(latestContext(cleared)),new RegExp(marker+'|'+replacement))
      // Durable DSH history can retain earlier snapshots; no refusal or deletion.
      assert.match(JSON.stringify(agent.session.snapshotEvents()),new RegExp(marker))
      await fiber.update({record})
    }
    await fiber.dispose()
  }finally{await ctx.fiber.dispose()}
})
