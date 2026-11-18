import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {Context,Service} from '@deepseek-ai/cordis'
import * as profile from '../plugins/personal-profile/index.js'
import {responsePreferences,eligibleAssembly,SECTION_NAME} from '../plugins/personal-profile/preferences.js'

function selection() {
  const agent={session:{header:{}},options:{}}
  return {agent,scope:agent,signal:new AbortController().signal,modelSelection:{provider:'test',model:'test'}}
}
test('response renderer matches entire browser catalog and renderer',()=>{
  const client=readFileSync(new URL('../client.js',import.meta.url).replace(/\r\n/g,'\n'),'utf8')
  const helper=readFileSync(new URL('../plugins/personal-profile/preferences.js',import.meta.url).replace(/\r\n/g,'\n'),'utf8')
  const browser=client.slice(client.indexOf('    const PROFILE_STYLES'),client.indexOf('    const PROFILE_NS'))
    .split('\n').map(l=>l.startsWith('    ')?l.slice(4):l).join('\n')
  assert.equal(browser,helper.slice(helper.indexOf('const PROFILE_STYLES'),helper.indexOf('const keys=')).replace('export function previewProfilePreferences','function previewProfilePreferences').trimEnd()+'\n')
  const preview=runInNewContext(browser+'\npreviewProfilePreferences')
  const r=profile.emptyRecord()
  for(const style of ['default','professional','friendly','candid','creative','efficient','critical','technical']){
    r.preferences.style=style
    for(const lang of ['auto','ar','en','zh','es','fr','de','ja']){
      r.preferences.responseLanguage=lang
      for(const level of [0,1,2]){
        for(const k of Object.keys(r.preferences.traits))r.preferences.traits[k]=level
        r.preferences.presets=['critical','no-fluff','grill-me','evidence','steps','action','code','humanizer']
        r.preferences.custom='Fictional {{literal}}'
        for(const consent of [true,false]){
          r.preferences.sendCustom=consent
          assert.equal(responsePreferences(r),preview(r.preferences))
        }
      }
    }
  }
})
test('structured fields are excluded even when all permissions allow; custom text requires opt-in',()=>{
  const r=profile.emptyRecord()
  r.information={preferredName:'Fictional private name',nationality:'Fictional private nationality',gender:'female'}
  r.allowCloud=r.allowPersonalInformation=true
  r.policies={preferredName:'allow',nationality:'allow',gender:'allow'}
  r.preferences.custom='Fictional custom text'
  assert.equal(responsePreferences(r),'')
  r.preferences.style='friendly'
  assert.match(responsePreferences(r),/friendly/)
  assert.doesNotMatch(responsePreferences(r),/Fictional|female/)
  r.preferences.sendCustom=true
  assert.match(responsePreferences(r),/Fictional custom text/)
  assert.doesNotMatch(responsePreferences(r),/Fictional private|female/)
  assert.equal(responsePreferences({...r,version:1}),'')
  for(const bad of [{sendCustom:'true'},{custom:'x'.repeat(8193)},{presets:['unknown']},{style:'unknown'},{traits:{}},{unknown:1}]){
    assert.equal(responsePreferences({...r,preferences:{...r.preferences,...bad}}),'')
  }
})
test('excludes diagnostic, aborted and subagent scopes',()=>{
  const c=selection()
  assert.ok(eligibleAssembly(c))
  assert.equal(eligibleAssembly({}),false)
  assert.equal(eligibleAssembly({...c,scope:{}}),false)
  assert.equal(eligibleAssembly({...c,signal:AbortSignal.abort()}),false)
  c.agent.session.header.origin='subagent';assert.equal(eligibleAssembly(c),false)
  delete c.agent.session.header.origin
  c.agent.session.header.delegationDepth=1;assert.equal(eligibleAssembly(c),false)
  c.agent.session.header.delegationDepth=0;c.agent.options.subagentDepth=1;assert.equal(eligibleAssembly(c),false)
})
// Real Cordis lifetime, small registry contract double (not actual Agent Loop).
class Registry extends Service {
  sections=new Map()
  constructor(ctx){super(ctx,'systemPrompt')}
  section(s){
    assert.ok(!this.sections.has(s.name))
    this.sections.set(s.name,s)
    return this.ctx.effect(()=>()=>this.sections.delete(s.name))
  }
}
test('Cordis mount/update/dispose reads only volatile persisted config; optional services independent',async()=>{
  const ctx=new Context()
  try{
    await ctx.plugin(Registry).await()
    const r=profile.emptyRecord();r.preferences.style='friendly'
    const fiber=ctx.plugin(profile,{record:r});await fiber.await()
    const section=ctx.systemPrompt.sections.get(SECTION_NAME)
    assert.ok(section);assert.equal(section.interpolate,false)
    assert.match(section.text(selection()),/friendly/)
    assert.equal(section.text({}),'')
    const next=profile.emptyRecord();next.preferences.responseLanguage='ja'
    await fiber.update({record:next})
    assert.equal(ctx.systemPrompt.sections.size,1)
    assert.match(ctx.systemPrompt.sections.get(SECTION_NAME).text(selection()),/Japanese/)
    assert.doesNotMatch(ctx.systemPrompt.sections.get(SECTION_NAME).text(selection()),/friendly/)
    await fiber.dispose()
    assert.equal(ctx.systemPrompt.sections.size,0)
    await ctx.plugin(profile,{record:r}).await()
    assert.equal(ctx.systemPrompt.sections.size,1)
  }finally{await ctx.fiber.dispose()}
})
