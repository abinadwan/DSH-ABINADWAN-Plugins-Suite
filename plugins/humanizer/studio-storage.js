// Explicit owner-requested, profile-local Studio storage. No automatic reads/writes.
import { randomUUID } from 'node:crypto'
import { lstat, open, realpath } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import { withFileLock, writeFileAtomic } from '@deepseek-ai/dsh-atomic-write'
import { STUDIO_SERVICES, STUDIO_LIMITS } from './studio-engine.js'

export const STUDIO_STORAGE_FILE = 'abinadwan-humanizer-studio.json'
export const STUDIO_HISTORY_LIMIT = 10
export const STUDIO_STORAGE_LIMIT = 1024 * 1024
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const locale = /^[a-zA-Z]{2,8}(?:-[a-zA-Z0-9]{1,8})*$/
const obj = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const exact = (value, keys) => obj(value) && Object.keys(value).length === keys.length && keys.every(key=>Object.hasOwn(value,key))
const text = (value,max) => typeof value==='string' && value.length<=max
const route = value => text(value,256) && !/[\u0000-\u001f\u007f]/.test(value)
const language = (value,sentinel) => value===sentinel || text(value,64)&&locale.test(value)
const revision = value => value==='initial'||typeof value==='string'&&uuid.test(value)
const privateFile = stat => typeof process.geteuid!=='function'||(stat.uid===process.geteuid()&&(stat.mode&0o077)===0)
const fail = code => {throw Error(code)}
const empty = () => ({version:1,revision:'initial',draft:null,history:[]})

export function normalizeStudioEntry(value) {
  if (!exact(value,['service','provider','model','inputLanguage','outputLanguage','sourceText','result','editingBrief']) ||
    !STUDIO_SERVICES.includes(value.service)||!route(value.provider)||!route(value.model)||
    !language(value.inputLanguage,'auto')||!language(value.outputLanguage,'preserve')||
    !text(value.sourceText,STUDIO_LIMITS.source)||!text(value.result,STUDIO_LIMITS.output)||
    !text(value.editingBrief,STUDIO_LIMITS.brief)||
    (value.service!=='custom'&&value.editingBrief!=='')||
    ![value.sourceText,value.result,value.editingBrief].some(part=>part.trim())) fail('STUDIO_STORAGE_INVALID')
  return {service:value.service,provider:value.provider,model:value.model,inputLanguage:value.inputLanguage,
    outputLanguage:value.outputLanguage,sourceText:value.sourceText,result:value.result,editingBrief:value.editingBrief}
}

function normalizeState(value) {
  if (!exact(value,['version','revision','draft','history'])||value.version!==1||!revision(value.revision)||
    !Array.isArray(value.history)||value.history.length>STUDIO_HISTORY_LIMIT) fail('STUDIO_STORAGE_INVALID')
  const history=value.history.map(row=>{
    if(!exact(row,['id','savedAt','entry'])||typeof row.id!=='string'||!uuid.test(row.id)||
      !Number.isSafeInteger(row.savedAt)||row.savedAt<0)fail('STUDIO_STORAGE_INVALID')
    const entry=normalizeStudioEntry(row.entry)
    if(!entry.sourceText.trim()||!entry.result.trim())fail('STUDIO_STORAGE_INVALID')
    return {id:row.id,savedAt:row.savedAt,entry}
  })
  if(new Set(history.map(row=>row.id)).size!==history.length)fail('STUDIO_STORAGE_INVALID')
  return {version:1,revision:value.revision,draft:value.draft===null?null:normalizeStudioEntry(value.draft),history}
}

async function readState(filename) {
  const stat=await lstat(filename).catch(e=>{if(e.code==='ENOENT')return null;throw e})
  if(!stat)return empty()
  if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||stat.size>STUDIO_STORAGE_LIMIT||!privateFile(stat))fail('STUDIO_STORAGE_INVALID')
  const file=await open(filename,'r')
  try{
    const actual=await file.stat()
    if(!actual.isFile()||actual.dev!==stat.dev||actual.ino!==stat.ino||actual.nlink!==1||actual.size!==stat.size||!privateFile(actual))fail('STUDIO_STORAGE_INVALID')
    const bytes=Buffer.alloc(stat.size+1)
    const {bytesRead}=await file.read(bytes,0,bytes.length,0)
    if(bytesRead!==stat.size)fail('STUDIO_STORAGE_INVALID')
    return normalizeState(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(0,bytesRead))))
  }finally{await file.close()}
}

export async function openStudioStorage(profileDir) {
  if(typeof profileDir!=='string'||!isAbsolute(profileDir))fail('STUDIO_STORAGE_UNAVAILABLE')
  const root=await realpath(profileDir)
  const filename=join(root,STUDIO_STORAGE_FILE)
  async function locked(operation,signal){
    signal.throwIfAborted()
    if(await realpath(profileDir)!==root)fail('STUDIO_STORAGE_UNAVAILABLE')
    const lock=await lstat(filename+'.lock').catch(e=>{if(e.code==='ENOENT')return null;throw e})
    if(lock&&(!lock.isFile()||lock.isSymbolicLink()||lock.nlink!==1||lock.size>32||
      (typeof process.geteuid==='function'&&lock.uid!==process.geteuid())))fail('STUDIO_STORAGE_INVALID')
    return withFileLock(filename,async()=>{
      signal.throwIfAborted()
      if(await realpath(profileDir)!==root)fail('STUDIO_STORAGE_UNAVAILABLE')
      return operation()
    },{waitMs:2000})
  }
  return {
    load:signal=>locked(async()=>{const state=await readState(filename);signal.throwIfAborted();return state},signal),
    change:(command,signal)=>locked(async()=>{
      if(!obj(command)||!revision(command.revision))fail('STUDIO_STORAGE_INVALID')
      const state=await readState(filename)
      if(state.revision!==command.revision)fail('STUDIO_STORAGE_CONFLICT')
      const {action}=command
      if(action==='save-draft'||action==='save-history'){
        if(!exact(command,['action','revision','entry']))fail('STUDIO_STORAGE_INVALID')
        const entry=normalizeStudioEntry(command.entry)
        if(action==='save-draft')state.draft=entry
        else{
          if(!entry.sourceText.trim()||!entry.result.trim())fail('STUDIO_STORAGE_INVALID')
          if(state.history.length>=STUDIO_HISTORY_LIMIT)fail('STUDIO_STORAGE_FULL')
          state.history.unshift({id:randomUUID(),savedAt:Date.now(),entry})
        }
      }else if(action==='delete-history'){
        if(!exact(command,['action','revision','id'])||!state.history.some(row=>row.id===command.id))fail('STUDIO_STORAGE_INVALID')
        state.history=state.history.filter(row=>row.id!==command.id)
      }else if(action==='clear-draft'||action==='clear-all'){
        if(!exact(command,['action','revision']))fail('STUDIO_STORAGE_INVALID')
        state.draft=null
        if(action==='clear-all')state.history=[]
      }else fail('STUDIO_STORAGE_INVALID')
      state.revision=randomUUID()
      const data=JSON.stringify(state)
      if(Buffer.byteLength(data)>STUDIO_STORAGE_LIMIT)fail('STUDIO_STORAGE_FULL')
      signal.throwIfAborted()
      // No replay after ambiguous writes. The empty revision tombstone prevents stale resurrection.
      await writeFileAtomic(filename,data,{mode:0o600,dirMode:0o700})
      signal.throwIfAborted()
      return state
    },signal),
  }
}
