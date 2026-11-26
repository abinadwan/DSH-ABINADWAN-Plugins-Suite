import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp,rm,readdir,readFile,writeFile,symlink,stat} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {openStudioStorage,STUDIO_STORAGE_FILE,STUDIO_HISTORY_LIMIT} from '../plugins/humanizer/studio-storage.js'
const signal=()=>new AbortController().signal
const entry={service:'humanize',provider:'p',model:'m',inputLanguage:'auto',outputLanguage:'ar',sourceText:'PRIVATE 123',result:'نتيجة 123',editingBrief:''}
async function fixture(t){
  const dir=await mkdtemp(join(tmpdir(),'studio-storage-'))
  t.after(()=>rm(dir,{recursive:true,force:true}))
  return {dir,store:await openStudioStorage(dir),file:join(dir,STUDIO_STORAGE_FILE)}
}
test('storage is lazy, opt-in, profile-scoped, revisioned and persists only explicit snapshots',async t=>{
  const {dir,store,file}=await fixture(t)
  assert.deepEqual(await readdir(dir),[])
  const initial=await store.load(signal())
  assert.deepEqual(initial,{version:1,revision:'initial',draft:null,history:[]})
  assert.deepEqual(await readdir(dir),[])
  const draft=await store.change({action:'save-draft',revision:initial.revision,entry},signal())
  assert.deepEqual(draft.draft,entry)
  const other=await openStudioStorage(dir)
  assert.deepEqual(await other.load(signal()),draft)
  await assert.rejects(other.change({action:'clear-all',revision:initial.revision},signal()),/STUDIO_STORAGE_CONFLICT/)
  const history=await other.change({action:'save-history',revision:draft.revision,entry},signal())
  assert.equal(history.history.length,1)
  const clear=await store.change({action:'clear-all',revision:history.revision},signal())
  assert.equal(clear.draft,null);assert.deepEqual(clear.history,[])
  assert.ok(!(await readFile(file,'utf8')).includes(entry.sourceText))
  await assert.rejects(other.change({action:'save-draft',revision:history.revision,entry},signal()),/STUDIO_STORAGE_CONFLICT/)
  if(process.platform!=='win32')assert.equal((await stat(file)).mode&0o077,0)
  const foreign=await fixture(t)
  assert.deepEqual(await foreign.store.load(signal()),initial)
})
test('storage refuses malformed, excessive, stale and cancelled commands without overwriting',async t=>{
  const {store,dir}=await fixture(t)
  for(const command of [
    {action:'save-draft',revision:'initial',entry:{...entry,tools:[]}},
    {action:'save-draft',revision:'initial',entry:{...entry,sourceText:'x'.repeat(12001)}},
    {action:'save-history',revision:'initial',entry:{...entry,result:''}},
    {action:'clear-all',revision:'initial',path:'elsewhere'},
  ])await assert.rejects(store.change(command,signal()),/STUDIO_STORAGE_INVALID/)
  const c=new AbortController();c.abort()
  await assert.rejects(store.change({action:'save-draft',revision:'initial',entry},c.signal),{name:'AbortError'})
  assert.deepEqual(await readdir(dir),[])
  let state=await store.load(signal())
  for(let i=0;i<STUDIO_HISTORY_LIMIT;i++)state=await store.change({action:'save-history',revision:state.revision,entry},signal())
  await assert.rejects(store.change({action:'save-history',revision:state.revision,entry},signal()),/STUDIO_STORAGE_FULL/)
  const id=state.history[0].id
  const removed=await store.change({action:'delete-history',revision:state.revision,id},signal())
  assert.equal(removed.history.length,STUDIO_HISTORY_LIMIT-1)
  assert.ok(!removed.history.some(row=>row.id===id))
})
test('invalid storage and symlink are rejected rather than overwritten',async t=>{
  const {store,file,dir}=await fixture(t)
  await writeFile(file,'not json',{mode:0o600})
  await assert.rejects(store.load(signal()))
  await assert.rejects(store.change({action:'clear-all',revision:'initial'},signal()))
  assert.equal(await readFile(file,'utf8'),'not json')
  if(process.platform!=='win32'){
    await rm(file)
    const target=join(dir,'foreign.txt')
    await writeFile(target,'foreign',{mode:0o600})
    await symlink(target,file)
    await assert.rejects(store.load(signal()),/STUDIO_STORAGE_INVALID/)
    assert.equal(await readFile(target,'utf8'),'foreign')
  }
})
