import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {Context,Service} from '@deepseek-ai/cordis'
import * as profile from '../plugins/personal-profile/index.js'
import {responsePreferences,eligibleAssembly,SECTION_NAME,DISCLOSURE_SECTION_NAME,profileDisclosure,previewProfileDisclosure,
  disclosureBlocks,staleDisclosure,refuseStaleDisclosure} from '../plugins/personal-profile/preferences.js'

const DISCLOSURE_HEADER='Personal details the user chose to share (use them only when relevant to the request):'
/** Synthetic record: every field explicitly checked. */
function disclosureRecord() {
  const r=profile.emptyRecord()
  r.information={preferredName:'SYNTHETIC_P8_NAME',nationality:'SYNTHETIC_P8_NATIONALITY',gender:'female'}
  r.policies={preferredName:'allow',nationality:'allow',gender:'allow'}

  return r
}
function selection() {
  const agent={session:{header:{}},options:{}}
  return {agent,scope:agent,signal:new AbortController().signal,modelSelection:{provider:'test',model:'test'}}
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
    assert.equal(ctx.systemPrompt.sections.size,2)
    assert.match(ctx.systemPrompt.sections.get(SECTION_NAME).text(selection()),/Japanese/)
    assert.doesNotMatch(ctx.systemPrompt.sections.get(SECTION_NAME).text(selection()),/friendly/)
    await fiber.dispose()
    assert.equal(ctx.systemPrompt.sections.size,0)
    await ctx.plugin(profile,{record:r}).await()
    assert.equal(ctx.systemPrompt.sections.size,2)
  }finally{await ctx.fiber.dispose()}
})

// ---------- Phase 8: shared details (synthetic values only) ----------
test('Each saved field is shared only when checked (all eight combinations)',()=>{
  const labels=['Preferred name: SYNTHETIC_P8_NAME','Nationality: SYNTHETIC_P8_NATIONALITY','Gender: female']
  for(const a of ['private','allow'])for(const b of ['private','allow'])for(const c of ['private','allow']){
    const r={...disclosureRecord(),policies:{preferredName:a,nationality:b,gender:c}}
    const lines=labels.filter((_,i)=>[a,b,c][i]==='allow')
    assert.equal(profileDisclosure(r),lines.length?[DISCLOSURE_HEADER,...lines].join('\n'):'')
    assert.doesNotMatch(responsePreferences(r),/SYNTHETIC_P8|female/)
  }
  for(const version of [2,3])assert.equal(profileDisclosure({...disclosureRecord(),version,allowPersonalInformation:true,allowCloud:true}),'')
})
test('P8 synthetic policy: empty or unspecified values are omitted; values are single-line; malformed records share nothing',()=>{
  const r=disclosureRecord()
  r.information={preferredName:'  A\nB C‮D\tE  ',nationality:'',gender:'unspecified'}
  assert.equal(profileDisclosure(r),DISCLOSURE_HEADER+'\nPreferred name: A B C D E','control, line and bidi characters cannot add lines')
  r.information.preferredName='  A\u061c\u200e\u200f\u206a\u206b\u206c\u206d\u206e\u206fB  '
  assert.equal(profileDisclosure(r),DISCLOSURE_HEADER+'\nPreferred name: A B',
    'remaining bidi control characters must not appear in a shared profile prompt')
  r.information={preferredName:'   ',nationality:'',gender:''}
  assert.equal(profileDisclosure(r),'','nothing to share')
  const ok=disclosureRecord()
  for(const bad of [null,{},{...ok,version:1},{...ok,version:3,allowCloud:true,allowPersonalInformation:true},{...ok,policies:{...ok.policies,gender:'always'}},
    {...ok,policies:{preferredName:'allow'}},{...ok,information:{...ok.information,gender:'other'}},
    {...ok,information:{...ok.information,preferredName:'x'.repeat(129)}},{...ok,information:{...ok.information,extra:''}}])
    assert.equal(profileDisclosure(bad),'')
  assert.equal(previewProfileDisclosure({...ok,version:3}),'')
})
const requestWith=(...system)=>({provider:'p',model:'m',messages:[
  ...system.map(text=>({role:'system',content:[{type:'text',text}]})),
  {role:'user',content:[{type:'text',text:DISCLOSURE_HEADER+'\nPreferred name: typed by the user'}]}]})
test('P8 send-time guard: refuses a request whose block differs from what current settings produce',()=>{
  const r=disclosureRecord(), block=profileDisclosure(r)
  const sent=requestWith('Base prompt.\n\n'+block)
  assert.deepEqual(disclosureBlocks(sent),[block],'user messages are not scanned')
  assert.equal(staleDisclosure(sent,r),false,'current authorized block passes')
  assert.equal(staleDisclosure(requestWith('old\n\n'+block,'new\n\n'+block),r),false,'in-history replay of the same block passes')
  assert.equal(staleDisclosure(sent,{...r,policies:profile.emptyPolicies()}),true,'revoked')
  assert.equal(staleDisclosure(sent,{...r,policies:{...r.policies,gender:'private'}}),true,'narrowed')
  assert.equal(staleDisclosure(sent,{...r,information:{...r.information,preferredName:'SYNTHETIC_P8_RENAMED'}}),true,'edited value')
  assert.equal(staleDisclosure(sent,null),true,'unreadable settings fail closed')
  assert.equal(staleDisclosure(requestWith('Base prompt.'),null),false,'requests without a block are never touched')
  assert.equal(staleDisclosure({system:block,messages:[]},{...r,policies:profile.emptyPolicies()}),true,'one-shot system text is checked')
  const revoked={...r,policies:profile.emptyPolicies()}
  for(const separator of ['\r\n','\r']){
    assert.equal(staleDisclosure({system:block.replaceAll('\n',separator),messages:[]},revoked),true,
      'a historical disclosure with alternate line endings must be refused')
  }
  assert.equal(staleDisclosure({messages:[{role:'developer',content:block}]},{...r,policies:profile.emptyPolicies()}),true,'developer text is checked')
  assert.equal(staleDisclosure({messages:[{role:'system',content:[{type:'text',text:'x'+block}]}]},{...r,policies:profile.emptyPolicies()}),false,'only an exact header line counts')
})
test('P8 refusal is a terminal, non-retryable native outcome that names no value',async()=>{
  for(const locale of ['en','ar',undefined]){
    const chunks=[];for await(const c of refuseStaleDisclosure(locale))chunks.push(c)
    assert.equal(chunks.length,1)
    assert.equal(chunks[0].type,'finish');assert.equal(chunks[0].reason.kind,'error')
    assert.equal(chunks[0].reason.failure.code,'INVALID_REQUEST')
    assert.match(chunks[0].reason.failure.message,locale==='ar'?/ابدأ محادثة جديدة/:/Start a new chat/)
    assert.doesNotMatch(JSON.stringify(chunks),/SYNTHETIC/)
  }
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


test('Host shares only saved v4 checked fields, and never promotes legacy policy', async () => {
  const ctx = new Context()
  try {
    await ctx.plugin(Registry).await()
    const stored = disclosureRecord()
    const fiber = ctx.plugin(profile, { record: stored })
    await fiber.await()
    // A fiber update may replace the registry section and its config closure.
    // Always inspect the active registered section, as the native registry does.
    const section=()=>{
      const active=ctx.systemPrompt.sections.get(DISCLOSURE_SECTION_NAME)
      assert.ok(active,'disclosure section remains registered')
      assert.equal(ctx.systemPrompt.sections.size,2,'no duplicate or leaked sections')
      return active
    }
    assert.equal(section().text(selection()),profileDisclosure(stored))
    assert.equal(section().text({}),'')
    for (const version of [2,3]) {
      await fiber.update({record:{...stored,version,locale:'en',allowPersonalInformation:true,allowCloud:true}})
      assert.equal(section().text(selection()),'')
    }
    await fiber.update({record:{...stored,policies:{preferredName:'allow',nationality:'private',gender:'private'}}})
    assert.match(section().text(selection()),/SYNTHETIC_P8_NAME/)
    assert.doesNotMatch(section().text(selection()),/SYNTHETIC_P8_NATIONALITY|female/)
    await fiber.update({record:profile.emptyRecord()})
    assert.equal(section().text(selection()),'')
  } finally { await ctx.fiber.dispose() }
})
