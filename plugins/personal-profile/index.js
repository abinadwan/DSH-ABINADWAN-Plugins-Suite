// Native Harness settings schema. No separate storage, cryptography, agent
// capabilities or network transport. The active Harness Profile owns the file.
import z from '@deepseek-ai/schemastery'

const choice = (values,initial) => z.union(values).default(initial)
const styles=['default','professional','friendly','candid','creative','efficient','critical','technical']
const languages=['auto','ar','en','zh','es','fr','de','ja']
const traits=['warmth','enthusiasm','structure','emoji','detail','critical']
const presets=['critical','no-fluff','grill-me','evidence','steps','action','code','humanizer']
const fields=['preferredName','nationality','gender']
export const emptyPreferences=()=>({style:'default',responseLanguage:'auto',traits:Object.fromEntries(traits.map(k=>[k,1])),presets:[],custom:''})
export const emptyPolicies=()=>Object.fromEntries(fields.map(k=>[k,'private']))
export const emptyRecord=()=>({version:1,locale:'ar',information:{preferredName:'',nationality:'',gender:''},
  global:emptyPreferences(),workspaces:[],allowPersonalInformation:false,allowCloud:false})
const preferences=()=>z.object({
  style:choice(styles,'default'),responseLanguage:choice(languages,'auto'),
  traits:z.object(Object.fromEntries(traits.map(k=>[k,choice([0,1,2],1)]))).default(emptyPreferences().traits),
  presets:z.array(z.union(presets)).max(8).default([]),custom:z.string().max(8192).default(''),
}).default(emptyPreferences())
const policies=()=>z.object(Object.fromEntries(fields.map(k=>[k,choice(['private','ask_first','allow'],'private')]))).default(emptyPolicies())
export const Config=z.object({
  record:z.object({
    version:choice([1],1),locale:choice(['ar','en'],'ar'),
    information:z.object({preferredName:z.string().max(128).default(''),nationality:z.string().max(128).default(''),
      gender:choice(['','male','female','unspecified'],'')}).default(emptyRecord().information),
    global:preferences(),
    workspaces:z.array(z.object({id:z.string().min(1).max(256).required(),
      override:z.boolean().default(false),preferences:preferences(),policies:policies()})).max(64).default([]),
    allowPersonalInformation:z.boolean().default(false),allowCloud:z.boolean().default(false),
  }).default(emptyRecord()).volatile(),
})
export const name='abinadwan-personal-profile'
// Use the official Settings Controller's auto-generated namespace. No
// custom RPC or agent registration. Hide the redundant generic form.
export function apply(ctx) {
  ctx.inject(['settings'], child => {
    child.effect(()=>child.settings.configure({auto:false},ctx.fiber))
  })
}
