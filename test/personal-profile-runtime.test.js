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
  const client=readFileSync(new URL('../client.js',import.meta.url),'utf8').replace(/\r\n/g,'\n')
  const helper=readFileSync(new URL('../plugins/personal-profile/preferences.js',import.meta.url),'utf8').replace(/\r\n/g,'\n')
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

test('7C: all structured permission combinations have no effect on outgoing preferences',()=>{
  const fields=['preferredName','nationality','gender'],policies=['private','ask_first','allow']
  const r=profile.emptyRecord()
  r.information={preferredName:'PII_CANARY_NAME_7C',nationality:'PII_CANARY_NATIONALITY_7C',gender:'female'}
  r.preferences.style='technical'
  const baseline=responsePreferences(r)
  let cases=0
  for(const master of [false,true])for(const cloud of [false,true])
    for(const a of policies)for(const b of policies)for(const c of policies){
      r.allowPersonalInformation=master;r.allowCloud=cloud
      r.policies=Object.fromEntries(fields.map((k,i)=>[k,[a,b,c][i]]))
      assert.equal(responsePreferences(r),baseline)
      cases++
    }
  assert.equal(cases,108)
})
// Phase 7D: wording adopted from the benchmark (L2, S2, G3, B1w). C2/U1 were not adopted.
const P7D={
  creative:'Go beyond the obvious: include at least one fresh, unconventional idea suited to the task.',
  warmthLess:'Keep the tone neutral and reserved, without reassurance or pep talk.',
  grill:'Before recommending a decision or plan, ask the user 2-3 specific questions about missing requirements and name the key risks.',
}
const P7D_HEADER='Response preferences (follow the current request and higher-priority host/safety/tool requirements; custom guidance takes precedence over other style preferences where compatible).'
const languageLine=name=>'Write your response in '+name+' even when the user writes in another language, unless the user explicitly asks for a different language.'
const count=(s,line)=>s.split('\n').filter(l=>l===line).length
test('7D: adopted lines render exactly once when selected and never otherwise',()=>{
  const r=profile.emptyRecord()
  r.preferences.style='creative'
  assert.equal(responsePreferences(r),P7D_HEADER+'\n'+P7D.creative)
  r.preferences.style='default';r.preferences.traits.warmth=0
  assert.equal(responsePreferences(r),P7D_HEADER+'\n'+P7D.warmthLess)
  r.preferences.traits.warmth=1;r.preferences.presets=['grill-me']
  assert.equal(responsePreferences(r),P7D_HEADER+'\n'+P7D.grill)
  r.preferences.presets=['critical','no-fluff','evidence','steps','action','code','humanizer']
  r.preferences.style='technical';r.preferences.traits.warmth=2
  const other=responsePreferences(r)
  for(const line of Object.values(P7D))assert.equal(count(other,line),0)
  r.preferences.style='creative';r.preferences.traits.warmth=0;r.preferences.presets.push('grill-me')
  const all=responsePreferences(r)
  for(const line of Object.values(P7D))assert.equal(count(all,line),1)
  // Not adopted: Code Reviewer and Humanizer keep their previous wording.
  assert.equal(count(all,'Assess code quality, security, performance, and test coverage when reviewing code.'),1)
  assert.equal(count(all,'Prefer natural writing and preserve facts, citations, and uncertainty when editing.'),1)
})
test('7D: explicit languages render the native name once; English and automatic are unchanged in shape',()=>{
  const expected={ar:'Arabic (\u0627\u0644\u0639\u0631\u0628\u064a\u0629)',en:'English',zh:'Chinese (\u4e2d\u6587)',es:'Spanish (Espa\u00f1ol)',
    fr:'French (Fran\u00e7ais)',de:'German (Deutsch)',ja:'Japanese (\u65e5\u672c\u8a9e)'}
  const r=profile.emptyRecord()
  for(const [lang,name] of Object.entries(expected)){
    r.preferences.responseLanguage=lang
    assert.equal(responsePreferences(r),P7D_HEADER+'\n'+languageLine(name))
  }
  r.preferences.responseLanguage='auto'
  assert.equal(responsePreferences(r),'')
  r.preferences.style='friendly'
  assert.doesNotMatch(responsePreferences(r),/Write your response in|Prefer \w+ for responses/)
})
test('7D: explicit request and custom-text consent are unchanged by the new wording',()=>{
  const r=profile.emptyRecord()
  Object.assign(r.preferences,{style:'creative',responseLanguage:'zh',presets:['grill-me'],custom:'Fictional 7D custom note'})
  r.preferences.traits.warmth=0
  const withheld=responsePreferences(r)
  assert.doesNotMatch(withheld,/Fictional 7D custom note/)
  assert.match(withheld,/unless the user explicitly asks for a different language\./)
  r.preferences.sendCustom=true
  const sent=responsePreferences(r).split('\n')
  assert.equal(sent.at(-1),'Fictional 7D custom note')
  assert.equal(sent[0],P7D_HEADER)
})
test('7D: worst-case section stays within the measured size budget',()=>{
  const r=profile.emptyRecord()
  Object.assign(r.preferences,{style:'creative',responseLanguage:'zh',traits:{warmth:0,enthusiasm:2,structure:2,emoji:2,detail:0,critical:2},
    presets:['critical','no-fluff','grill-me','evidence','steps','action','code','humanizer']})
  const s=responsePreferences(r)
  assert.equal(s.length,1330)
  assert.equal(s.split('\n').length,17)
})
