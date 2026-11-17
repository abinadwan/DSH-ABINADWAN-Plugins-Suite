// Reduced plaintext preferences; internal only, not a Host remote or agent tool.
export const FIELDS=Object.freeze(['preferredName','nationality','gender'])
const STYLES=['default','professional','friendly','candid','creative','efficient','critical','technical']
const LANGUAGES=['auto','ar','en','zh','es','fr','de','ja']
const TRAITS=['warmth','enthusiasm','structure','emoji','detail','critical']
const PRESETS=['critical','no-fluff','grill-me','evidence','steps','action','code','humanizer']
const POLICIES=['private','ask_first','allow']
const reserved=new Set([...Object.getOwnPropertyNames(Object.prototype),'prototype'])
const fail=()=>{throw new TypeError('Invalid profile preferences')}
function own(value,allowed,max=64){
  if(!value||typeof value!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(value)))fail()
  const keys=Reflect.ownKeys(value)
  if(keys.length>max)fail()
  return keys.map(key=>{
    const d=Object.getOwnPropertyDescriptor(value,key)
    if(typeof key!=='string'||reserved.has(key)||!Object.hasOwn(d,'value')||!d.enumerable||(allowed&&!allowed.includes(key)))fail()
    return [key,d.value]
  })
}
const record=(value,allowed,max)=>Object.fromEntries(own(value,allowed,max))
const bool=value=>{if(typeof value!=='boolean')fail();return value}
const choice=(value,allowed)=>{if(!allowed.includes(value))fail();return value}
const str=(value,max)=>{if(typeof value!=='string'||value.length>max)fail();return value}
export function environmentId(value){
  if(typeof value!=='string'||!(/^[A-Za-z0-9_-]{1,64}$/).test(value)||reserved.has(value))fail()
  return value
}
const envMap=(value,fn)=>Object.fromEntries(own(value,undefined,64).map(([k,v])=>[environmentId(k),fn(v)]))
export function neutralPreferences(){
  return {style:'default',responseLanguage:'auto',traits:Object.fromEntries(TRAITS.map(k=>[k,1])),presets:[],custom:''}
}
function pref(value){
  const obj=record(value,['style','responseLanguage','traits','presets','custom']),out=neutralPreferences()
  if(Object.hasOwn(obj,'style'))out.style=choice(obj.style,STYLES)
  if(Object.hasOwn(obj,'responseLanguage'))out.responseLanguage=choice(obj.responseLanguage,LANGUAGES)
  if(Object.hasOwn(obj,'traits'))for(const [key,v] of own(obj.traits,TRAITS))out.traits[key]=choice(v,[0,1,2])
  if(Object.hasOwn(obj,'presets')){
    if(!Array.isArray(obj.presets)||Object.getPrototypeOf(obj.presets)!==Array.prototype||obj.presets.length>PRESETS.length)fail()
    const items=[]
    for(const key of Reflect.ownKeys(obj.presets)){
      if(key==='length')continue
      const d=Object.getOwnPropertyDescriptor(obj.presets,key)
      if(typeof key!=='string'||!(/^(0|[1-9][0-9]*)$/).test(key)||!Object.hasOwn(d,'value'))fail()
      items.push(choice(d.value,PRESETS))
    }
    if(items.length!==obj.presets.length||new Set(items).size!==items.length)fail()
    out.presets=PRESETS.filter(x=>items.includes(x))
  }
  if(Object.hasOwn(obj,'custom'))out.custom=str(obj.custom,8192)
  return out
}
function policy(value){
  const v=record(value,['fields','allowExternal'])
  return {fields:Object.hasOwn(v,'fields')?Object.fromEntries(own(v.fields,FIELDS).map(([k,x])=>[k,choice(x,POLICIES)])):{},
    allowExternal:Object.hasOwn(v,'allowExternal')?bool(v.allowExternal):false}
}
export function normalizeSettings(input={version:1}){
  const obj=record(input,['version','interfaceLanguage','personal','global','environments','usePersonalInformation','access'])
  if(obj.version!==1)fail()
  const personal={}
  if(Object.hasOwn(obj,'personal'))for(const [k,v] of own(obj.personal,FIELDS)){
    if(k==='gender')personal[k]=choice(v,['male','female','unspecified'])
    else personal[k]=str(v,120)
  }
  return {version:1,interfaceLanguage:Object.hasOwn(obj,'interfaceLanguage')?choice(obj.interfaceLanguage,['ar','en']):'ar',
    personal,global:Object.hasOwn(obj,'global')?pref(obj.global):neutralPreferences(),
    environments:Object.hasOwn(obj,'environments')?envMap(obj.environments,pref):{},
    usePersonalInformation:Object.hasOwn(obj,'usePersonalInformation')?bool(obj.usePersonalInformation):false,
    access:Object.hasOwn(obj,'access')?envMap(obj.access,policy):{}}
}
export function effectivePreferences(settings,id){
  id=environmentId(id); const s=normalizeSettings(settings)
  return Object.hasOwn(s.environments,id)?s.environments[id]:s.global
}
// Pure decision helper only. The future trusted Host must authenticate identity
// and determine the provider destination itself, never from agent claims.
export function decidePersonalAccess(settings,id,field,destination){
  try{
    id=environmentId(id);choice(field,FIELDS);choice(destination,['local','external'])
    const s=normalizeSettings(settings),p=s.access[id]||{fields:{},allowExternal:false}
    if(!s.usePersonalInformation||!Object.hasOwn(s.personal,field)||!s.personal[field]||
       (destination==='external'&&!p.allowExternal))return {status:'denied'}
    const mode=p.fields[field]||'private'
    if(mode==='ask_first')return {status:'approval_required'}
    return mode==='allow'?{status:'allowed',value:s.personal[field]}:{status:'denied'}
  }catch{return {status:'denied'}}
}
export function backupSettings(input){
  const s=normalizeSettings(input)
  return normalizeSettings({...s,usePersonalInformation:false,access:{}})
}
// Plain JSON backup review only. Restore resets authority, existing values win
// for merge, absent overrides/fields are filled; report conflicts.
export function reviewRestore(current,incoming,mode='merge'){
  const a=backupSettings(current),b=backupSettings(incoming)
  choice(mode,['merge','replace'])
  if(mode==='replace')return {settings:b,conflicts:[],requiresConfirmation:true}
  const conflicts=[]
  const equal=(x,y)=>JSON.stringify(x)===JSON.stringify(y)
  const fill=(x,y,label)=>{
    const out={...x}
    for(const [k,v] of Object.entries(y)){
      if(!Object.hasOwn(out,k))out[k]=v
      else if(!equal(out[k],v))conflicts.push(label+':'+k)
    }
    return out
  }
  if(!equal(a.global,b.global))conflicts.push('global')
  if(a.interfaceLanguage!==b.interfaceLanguage)conflicts.push('interfaceLanguage')
  return {settings:normalizeSettings({...a,personal:fill(a.personal,b.personal,'personal'),
    environments:fill(a.environments,b.environments,'environment')}),conflicts,requiresConfirmation:conflicts.length>0}
}
