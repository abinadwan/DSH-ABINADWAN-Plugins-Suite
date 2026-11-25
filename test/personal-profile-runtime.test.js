import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {Context,Service} from '@deepseek-ai/cordis'
import * as profile from '../plugins/personal-profile/index.js'
import {responsePreferences,eligibleAssembly,SECTION_NAME,CONTEXT_NAME,REMINDER_NAME,profileDisclosure,profileContext,responseReminder} from '../plugins/personal-profile/preferences.js'
function selection(){
  const agent={session:{header:{}},options:{}}
  return {agent,scope:agent,signal:new AbortController().signal,modelSelection:{provider:'test',model:'test'}}
}
function record(){
  const r=profile.emptyRecord()
  r.information={preferredName:'SYNTHETIC_NAME',nationality:'SYNTHETIC_COUNTRY',gender:'female'}
  r.preferences.custom='Synthetic instruction {{literal}}'
  return r
}
test('response renderer matches entire browser catalog and renderer',()=>{
  const client=readFileSync(new URL('../client.js',import.meta.url),'utf8').replace(/\r\n/g,'\n')
  const helper=readFileSync(new URL('../plugins/personal-profile/preferences.js',import.meta.url),'utf8').replace(/\r\n/g,'\n')
  const browser=client.slice(client.indexOf('    const PROFILE_STYLES'),client.indexOf('    const PROFILE_NS'))
    .split('\n').map(l=>l.startsWith('    ')?l.slice(4):l).join('\n')
  assert.equal(browser,helper.slice(helper.indexOf('const PROFILE_STYLES'),helper.indexOf('export const RECORD_VERSION')).replaceAll('export function ','function ').trimEnd()+'\n')
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
        assert.equal(responsePreferences(r),preview(r.preferences))
      }
    }
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

test('v5 emits every populated field and saved custom instruction without switches',()=>{
  const r=record()
  assert.equal(r.version,5)
  assert.equal(r.policies,undefined)
  assert.equal(r.preferences.sendCustom,undefined)
  assert.match(profileDisclosure(r),/SYNTHETIC_NAME/)
  assert.match(profileDisclosure(r),/SYNTHETIC_COUNTRY/)
  assert.match(profileDisclosure(r),/female/)
  assert.match(responsePreferences(r),/Synthetic instruction/)
  assert.doesNotMatch(responsePreferences(r),/SYNTHETIC_NAME|SYNTHETIC_COUNTRY/)
  assert.match(profileContext(r),/Current My Profile settings/)
  assert.match(profileContext(profile.emptyRecord()),/No active personal details/)
})
test('legacy records retain their old scope until explicitly migrated',()=>{
  const v5=record()
  for(const version of [2,3,4]){
    const r={...v5,version,policies:{preferredName:'allow',nationality:'private',gender:'private'},preferences:{...v5.preferences,sendCustom:false}}
    if(version<4)Object.assign(r,{locale:'en',allowPersonalInformation:true,allowCloud:true})
    assert.doesNotMatch(responsePreferences(r),/Synthetic instruction/)
    assert.doesNotMatch(profileDisclosure(r),/SYNTHETIC_COUNTRY|female/)
    assert.equal(profileDisclosure(r).includes('SYNTHETIC_NAME'),version===4)
    r.preferences.sendCustom=true
    assert.match(responsePreferences(r),/Synthetic instruction/)
  }
})
test('empty and unspecified fields omitted; structured fields stay single-line and quoted',()=>{
  const r=record()
  r.information={preferredName:'A\nB\u202eC\u2028D',nationality:' ',gender:'unspecified'}
  const text=profileDisclosure(r)
  assert.match(text,/Preferred name: "A B C D"/)
  assert.doesNotMatch(text,/Nationality:|Gender:/)
  assert.equal(text.split('\n').length,2)
  assert.equal(profileDisclosure({...r,information:{...r.information,preferredName:'x'.repeat(129)}}),'')
  assert.equal(profileDisclosure({...r,information:{}}),'')
  for(const p of [{custom:'x'.repeat(8193)},{presets:['unknown']},{style:'unknown'},{traits:{}},{unknown:1},{sendCustom:true}]){
    assert.equal(responsePreferences({...r,preferences:{...r.preferences,...p}}),'')
  }
})
class Registry extends Service{
  sections=new Map()
  contexts=new Map()
  constructor(ctx){super(ctx,'systemPrompt')}
  context(s){assert.ok(!this.contexts.has(s.name));this.contexts.set(s.name,s);return this.ctx.effect(()=>()=>this.contexts.delete(s.name))}
  section(s){this.sections.set(s.name,s);return this.ctx.effect(()=>()=>this.sections.delete(s.name))}
}
test('hybrid context and instructions are lifecycle-scoped, refreshed and separated',async()=>{
  const ctx=new Context()
  try{
    await ctx.plugin(Registry).await()
    const f=ctx.plugin(profile,{record:record()});await f.await()
    const current=()=>ctx.systemPrompt.contexts.get(CONTEXT_NAME)
    const instructions=()=>ctx.systemPrompt.sections.get(SECTION_NAME)
    const reminder=()=>ctx.systemPrompt.contexts.get(REMINDER_NAME)
    const turn=selection()
    assert.equal(ctx.systemPrompt.sections.size,1)
    assert.equal(instructions().interpolate,false)
    assert.match(instructions().text(selection()),/Synthetic instruction/)
    assert.doesNotMatch(instructions().text(selection()),/SYNTHETIC_NAME/)
    assert.doesNotMatch(current().text(selection()),/Synthetic instruction/)
    assert.equal(instructions().text({}),'')
    assert.equal(ctx.systemPrompt.contexts.size,2)
    assert.equal(current().interpolate,false)
    assert.equal(reminder().interpolate,false)
    assert.ok(reminder().order>current().order)
    assert.equal(reminder().text({}),'')
    const first=reminder().text(turn)
    assert.match(first,/current saved user response instructions/)
    assert.match(first,/Apply the current saved custom instructions/)
    assert.doesNotMatch(first,/Synthetic instruction|SYNTHETIC_NAME|SYNTHETIC_COUNTRY/)
    assert.equal(reminder().text(turn),first,'same turn retains its revision')
    assert.notEqual(reminder().text(selection()),first,'new turn renews its revision')
    assert.match(current().text(selection()),/SYNTHETIC_NAME/)
    assert.equal(current().text({}),'')
    const updated=record();updated.preferences.responseLanguage='ja'
    await f.update({record:updated})
    assert.match(instructions().text(selection()),/saved default response language is Japanese/)
    assert.match(reminder().text(turn),/Write your entire response in Japanese \(日本語\)\./)
    assert.doesNotMatch(current().text(selection()),/saved default response language|Write your entire response in Japanese/)
    await f.update({record:profile.emptyRecord()})
    assert.equal(instructions().text(selection()),'')
    assert.match(reminder().text(turn),/No active saved response preferences/)
    assert.doesNotMatch(reminder().text(turn),/Japanese|Synthetic instruction|Current reminder revision/)
    assert.equal(reminder().text(turn),reminder().text(selection()),'neutral reminders do not renew every turn')
    assert.match(current().text(selection()),/No active personal details/)
    assert.doesNotMatch(current().text(selection()),/SYNTHETIC_NAME/)
    await f.dispose()
    assert.equal(ctx.systemPrompt.contexts.size,0)
    assert.equal(ctx.systemPrompt.sections.size,0)
    await ctx.plugin(profile,{record:record()}).await()
    assert.equal(ctx.systemPrompt.contexts.size,2)
  }finally{await ctx.fiber.dispose()}
})
const P7D={
  creative:'Go beyond the obvious: include at least one fresh, unconventional idea suited to the task.',
  warmthLess:'Keep the tone neutral and reserved, without reassurance or pep talk.',
  grill:'Before recommending a decision or plan, ask the user 2-3 specific questions about missing requirements and name the key risks.',
}
const P7D_HEADER='Response preferences (follow the current request and higher-priority host/safety/tool requirements; custom guidance takes precedence over other style preferences where compatible).'
const languageLine=name=>"The user's saved default response language is "+name+', even for questions written in another language. Explicit requests for a different output language take priority over the saved default.'
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
  assert.doesNotMatch(responsePreferences(r),/saved default response language|Prefer \w+ for responses/)
})

test('7D: worst-case section stays within the measured size budget',()=>{
  const r=profile.emptyRecord()
  Object.assign(r.preferences,{style:'creative',responseLanguage:'zh',traits:{warmth:0,enthusiasm:2,structure:2,emoji:2,detail:0,critical:2},
    presets:['critical','no-fluff','grill-me','evidence','steps','action','code','humanizer']})
  const s=responsePreferences(r)
  assert.ok(s.length<=1450,'compact preference section budget')
  assert.equal(s.split('\n').length,17)
})



test('custom text is active when saved, with explicit language override preserved',()=>{
  const r=record();r.preferences.responseLanguage='ja'
  assert.match(responsePreferences(r),/Explicit requests for a different output language take priority over the saved default/)
  assert.match(responsePreferences(r),/Synthetic instruction/)
})

test('legacy registry uses one section with both kinds of content',()=>{
  const sections=[]
  const ctx={inject(keys,callback){if(keys.includes('systemPrompt'))callback({systemPrompt:{section(value){sections.push(value)}}})}}
  profile.apply(ctx,{record:{get:()=>record()}})
  assert.equal(sections.length,1)
  assert.match(sections[0].text(selection()),/Synthetic instruction/)
  assert.match(sections[0].text(selection()),/SYNTHETIC_NAME/)
  assert.equal(sections[0].text({}),'')
})

test('reminder mirrors validated built-in preferences without copying personal or custom data',()=>{
  const r=record()
  Object.assign(r.preferences,{responseLanguage:'de',style:'technical',presets:['steps']})
  r.preferences.traits.emoji=0
  const text=responseReminder(r,'test-turn')
  assert.match(text,/Write your entire response in German \(Deutsch\)\./)
  assert.match(text,/Use precise technical terminology/)
  assert.match(text,/Avoid unnecessary emoji/)
  assert.match(text,/Break complex tasks into actionable steps/)
  assert.match(text,/Apply the current saved custom instructions/)
  assert.doesNotMatch(text,/SYNTHETIC_NAME|SYNTHETIC_COUNTRY|Synthetic instruction/)
  const legacy={...r,version:4,preferences:{...r.preferences,sendCustom:false}}
  assert.doesNotMatch(responseReminder(legacy,'test-turn'),/Apply the current saved custom instructions/)
  assert.doesNotMatch(responseReminder({...r,preferences:{...r.preferences,style:'unknown'}},'test-turn'),/Write your entire response in German|technical terminology|Current reminder revision/)
  assert.equal(responseReminder({version:1},'test-turn'),'')
})
