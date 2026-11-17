// Internal Host-owned candidate, plain JSON. No custom encryption or keys.
// Root MUST be privately provisioned by a trusted Host. Windows ACL ownership,
// reparse races and exclusive ownership need actual-device acceptance.
import {createHash,randomBytes} from 'node:crypto'
import {constants,lstatSync,realpathSync,openSync,closeSync,fstatSync,readSync,writeFileSync,fsyncSync,renameSync,unlinkSync} from 'node:fs'
import {resolve,parse,join} from 'node:path'
import {normalizeSettings,backupSettings,reviewRestore} from './model.js'
const MAX_BYTES=1024*1024
const fail=()=>{throw new Error('Profile preferences operation failed')}
const safe=fn=>{try{return fn()}catch{fail()}}
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
const encode=input=>{
  const bytes=Buffer.from(JSON.stringify(normalizeSettings(input))+'\n','utf8')
  if(bytes.length>MAX_BYTES)fail()
  return bytes
}
const decode=bytes=>normalizeSettings(JSON.parse(bytes.toString('utf8')))
export function createPreferencesStore(root){
  function checkRoot(){
    if(typeof root!=='string'||root!==resolve(root))fail()
    let current=parse(root).root
    for(const part of root.slice(current.length).split(/[\\/]/).filter(Boolean)){
      current=join(current,part)
      const st=lstatSync(current)
      if(!st.isDirectory()||st.isSymbolicLink())fail()
    }
    if(realpathSync(root)!==root)fail()
    const st=lstatSync(root)
    if(process.platform!=='win32'&&((st.mode&0o077)||st.uid!==process.getuid()))fail()
  }
  const file=typeof root==='string'?join(root,'preferences-v1.json'):''
  function target(){
    try{
      const st=lstatSync(file)
      if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.size>MAX_BYTES||
        (process.platform!=='win32'&&((st.mode&0o077)||st.uid!==process.getuid())))fail()
      return st
    }catch(error){if(error.code==='ENOENT')return null;throw error}
  }
  function read(){
    checkRoot()
    const prev=target()
    if(!prev)return {revision:null,settings:normalizeSettings()}
    const fd=openSync(file,constants.O_RDONLY|(constants.O_NOFOLLOW||0))
    try{
      const st=fstatSync(fd)
      if(!st.isFile()||st.nlink!==1||st.ino!==prev.ino||st.dev!==prev.dev||st.size>MAX_BYTES)fail()
      const bytes=Buffer.alloc(MAX_BYTES+1)
      let offset=0,n
      do{n=readSync(fd,bytes,offset,bytes.length-offset,null);offset+=n}while(n&&offset<bytes.length)
      if(offset>MAX_BYTES)fail()
      const data=bytes.subarray(0,offset)
      return {revision:hash(data),settings:decode(data)}
    }finally{closeSync(fd)}
  }
  function save(expectedRevision,settings){
    if(expectedRevision!==null&&(typeof expectedRevision!=='string'||!(/^[0-9a-f]{64}$/).test(expectedRevision)))fail()
    const bytes=encode(settings)
    checkRoot()
    const lock=join(root,'.preferences-writer'),lockFd=openSync(lock,'wx',0o600)
    let temp,fd,committed=false
    const outcome={revision:hash(bytes),committed:false,durable:false,cleanupComplete:true}
    try{
      if(read().revision!==expectedRevision)fail()
      temp=join(root,randomBytes(16).toString('hex')+'.tmp')
      fd=openSync(temp,'wx',0o600)
      writeFileSync(fd,bytes);fsyncSync(fd);closeSync(fd);fd=undefined
      checkRoot()
      if(read().revision!==expectedRevision)fail()
      renameSync(temp,file);committed=true;outcome.committed=true
      if(process.platform!=='win32'){
        let dir
        try{dir=openSync(root,constants.O_RDONLY);fsyncSync(dir);outcome.durable=true}catch{}
        finally{if(dir!==undefined)try{closeSync(dir)}catch{}}
      }
      return outcome
    }finally{
      if(fd!==undefined)try{closeSync(fd)}catch{outcome.cleanupComplete=false}
      if(temp&&!committed)try{unlinkSync(temp)}catch{outcome.cleanupComplete=false}
      try{closeSync(lockFd);unlinkSync(lock)}catch{outcome.cleanupComplete=false}
    }
  }
  checkRoot()
  return Object.freeze({
    load:()=>safe(read),save:(revision,settings)=>safe(()=>save(revision,settings)),
    exportBackup:()=>safe(()=>JSON.stringify(backupSettings(read().settings),null,2)+'\n'),
    reviewBackup:(text,mode='merge')=>safe(()=>{
      if(typeof text!=='string'||Buffer.byteLength(text)>MAX_BYTES)fail()
      const current=read()
      return {...reviewRestore(current.settings,JSON.parse(text),mode),revision:current.revision}
    }),
  })
}
