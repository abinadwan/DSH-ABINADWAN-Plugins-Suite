// Native Harness settings schema. No separate storage, cryptography or agent
// transport. The active Harness Profile owns the file.
//
// Record version 2 (0.7.2) is one unified profile: personal information, one
// preference set and one set of field policies. It does not depend on any
// Workspace and is designed to apply to every existing and future
// supported native agent step. Contributions: response preferences, and (Phase 8)
// the fields set to Allow while both sharing switches are On, rechecked at send time.
//
// Record version 1 (0.7.0/0.7.1, per-Workspace overrides and policies) is still
// accepted by the schema so a stored v1 record is never rejected or stripped
// by the Host. The browser page migrates it only after explicit review + Save.
import z from '@deepseek-ai/schemastery'
import { SECTION_NAME, DISCLOSURE_SECTION_NAME, responsePreferences, profileDisclosure, staleDisclosure,
  refuseStaleDisclosure, eligibleAssembly } from './preferences.js'

const choice = (values,initial) => z.union(values).default(initial)
const styles=['default','professional','friendly','candid','creative','efficient','critical','technical']
const languages=['auto','ar','en','zh','es','fr','de','ja']
const traits=['warmth','enthusiasm','structure','emoji','detail','critical']
const presets=['critical','no-fluff','grill-me','evidence','steps','action','code','humanizer']
const fields=['preferredName','nationality','gender']
export const RECORD_VERSION=2
export const emptyPreferences=()=>({style:'default',responseLanguage:'auto',traits:Object.fromEntries(traits.map(k=>[k,1])),presets:[],custom:''})
export const emptyPolicies=()=>Object.fromEntries(fields.map(k=>[k,'private']))
export const emptyInformation=()=>({preferredName:'',nationality:'',gender:''})
export const emptyRecord=()=>({version:RECORD_VERSION,locale:'ar',information:emptyInformation(),
  preferences:emptyPreferences(),policies:emptyPolicies(),allowPersonalInformation:false,allowCloud:false})
/** v0.7.0/0.7.1 record shape. Used only to read and migrate stored data. */
export const emptyLegacyRecord=()=>({version:1,locale:'ar',information:emptyInformation(),
  global:emptyPreferences(),workspaces:[],allowPersonalInformation:false,allowCloud:false})
const preferences=(unified=false)=>z.object({
  style:choice(styles,'default'),responseLanguage:choice(languages,'auto'),
  traits:z.object(Object.fromEntries(traits.map(k=>[k,choice([0,1,2],1)]))).default(emptyPreferences().traits),
  presets:z.array(z.union(presets)).max(8).default([]),custom:z.string().max(8192).default(''),
  ...(unified?{sendCustom:z.boolean()}:{}),
}).default(emptyPreferences())
const policies=()=>z.object(Object.fromEntries(fields.map(k=>[k,choice(['private','ask_first','allow'],'private')]))).default(emptyPolicies())
const information=()=>z.object({preferredName:z.string().max(128).default(''),nationality:z.string().max(128).default(''),
  gender:choice(['','male','female','unspecified'],'')}).default(emptyInformation())
const unified=z.object({
  version:z.const(RECORD_VERSION).required(),locale:choice(['ar','en'],'ar'),
  information:information(),preferences:preferences(true),policies:policies(),
  allowPersonalInformation:z.boolean().default(false),allowCloud:z.boolean().default(false),
})
const legacy=z.object({
  version:z.const(1).default(1),locale:choice(['ar','en'],'ar'),
  information:information(),global:preferences(),
  workspaces:z.array(z.object({id:z.string().min(1).max(256).required(),
    override:z.boolean().default(false),preferences:preferences(),policies:policies()})).default([]),
  allowPersonalInformation:z.boolean().default(false),allowCloud:z.boolean().default(false),
})
export const Config=z.object({
  // Version 2 first: a record without `version` resolves as legacy v1, the
  // only shape that ever omitted it.
  record:z.union([unified,legacy]).default(emptyRecord()).volatile(),
})
export const name='abinadwan-personal-profile'
// Use the official Settings Controller's auto-generated namespace. No
// custom RPC. Hide the redundant generic form; independently attach the native prompt registry.
export function apply(ctx,config) {
  ctx.inject(['settings'], child => {
    child.effect(()=>child.settings.configure({auto:false},ctx.fiber))
  })
  ctx.inject(['systemPrompt'], child => {
    // The registry registration itself is a lifecycle-owned Cordis effect.
    child.systemPrompt.section({name:SECTION_NAME,order:50,interpolate:false,text:context=>{
      if(!eligibleAssembly(context))return ''
      try { return responsePreferences(config.record.get()) } catch { return '' }
    }})
    // Phase 8 admission at assembly: evaluated for every new step.
    child.systemPrompt.section({name:DISCLOSURE_SECTION_NAME,order:51,interpolate:false,text:context=>{
      if(!eligibleAssembly(context))return ''
      try { return profileDisclosure(config.record.get()) } catch { return '' }
    }})
  })
  // Phase 8 send-time recheck, the last native point before the adapter. A frozen
  // request is never rewritten: one that carries a shared-details block the current
  // settings would not produce is refused (terminal, non-retryable) instead of sent.
  ctx.on('llm/stream',(request,next)=>{
    let record=null
    try { record=config.record.get() } catch { record=null }
    return staleDisclosure(request,record) ? refuseStaleDisclosure(record?.locale) : next()
  })
}
