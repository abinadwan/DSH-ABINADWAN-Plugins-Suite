// Optional, owner-only local storage. Never called by the edit route.
import { openStudioStorage } from './studio-storage.js'
import { STUDIO_PATH, readStudioBody } from './studio-http.js'
const reply=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}})
export function registerStudioStorage(ctx){
  const lifetime=new AbortController()
  const profileDir=ctx.profileContext.dir
  let busy=false
  ctx.effect(()=>()=>lifetime.abort())
  const handle=async(request,write)=>{
    if(lifetime.signal.aborted)return reply({error:'STUDIO_STORAGE_UNAVAILABLE'},503)
    if(busy)return reply({error:'STUDIO_STORAGE_BUSY'},409)
    busy=true
    const signal=AbortSignal.any([request.signal,lifetime.signal,AbortSignal.timeout(10000)])
    try{
      let command
      if(write){
        const read=await readStudioBody(request,signal,256*1024)
        if(read.error)return reply({error:read.error},read.status)
        command=read.data
      }
      signal.throwIfAborted()
      const storage=await openStudioStorage(profileDir)
      const state=write?await storage.change(command,signal):await storage.load(signal)
      signal.throwIfAborted()
      return reply(state)
    }catch(failure){
      if(signal.aborted)return reply({error:'STUDIO_STORAGE_CANCELLED'},409)
      const code=failure?.message
      if(code==='STUDIO_STORAGE_CONFLICT'||code==='STUDIO_STORAGE_FULL')return reply({error:code},409)
      if(code==='STUDIO_STORAGE_INVALID')return reply({error:code},400)
      return reply({error:'STUDIO_STORAGE_UNAVAILABLE'},503)
    }finally{busy=false}
  }
  ctx.effect(()=>ctx.connection.fetch.register({path:STUDIO_PATH+'/storage',methods:['GET'],requestBody:'buffered',fetch:request=>handle(request,false)}))
  ctx.effect(()=>ctx.connection.fetch.register({path:STUDIO_PATH+'/storage/change',methods:['POST'],requestBody:'streaming',fetch:request=>handle(request,true)}))
}
