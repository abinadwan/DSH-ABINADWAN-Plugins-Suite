import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {clientHarness, walk, base, tick} from '../test-support/client.js'

const pkg=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'))
const code=readFileSync(new URL('../client.js',import.meta.url),'utf8')
const RELEASE='https://api.github.com/repos/abinadwan/DSH-ABINADWAN-Plugins-Suite/releases/latest'
const COMMIT='https://api.github.com/repos/abinadwan/DSH-ABINADWAN-Plugins-Suite/commits/v0.7.0'
const SHA='a'.repeat(40)
const RAW='https://raw.githubusercontent.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/'+SHA+'/package.json'

function harnessReact() {
  const states=[]
  let index=0
  return {
    createElement:(type,props,...children)=>({type,props:props??{},children}),
    useState:(initial)=>{
      const i=index++
      if(!(i in states)) states[i]=initial
      return [states[i],next=>{states[i]=typeof next==='function'?next(states[i]):next}]
    },
    useSyncExternalStore:(_subscribe,get)=>get(),
    render(component){index=0;return component.type(component.props)},
  }
}
function detail(app) {
  const component=app.slots.records.get('environment-sidebar-versions')?.component
  assert.ok(component)
  return component({subject:{kind:'bundle',pkg:{name:base,version:pkg.version}}})
}
function byId(tree,id) {
  const found=walk(tree,node=>node.props?.[id]==='')
  assert.ok(found,'missing control '+id)
  return found
}
function reply(value,status=200) {
  return {ok:status>=200&&status<300,status,json:async()=>value}
}

test('auto-check on bundle startup sees no published releases, schedules once and never installs', async t=>{
  const urls=[],updates=[]
  const react=harnessReact()
  const app=await clientHarness({
    React:react,fetch:async url=>{
      urls.push(url)
      return reply({message:'Not Found'},404)
    },
    updateBundle:async(...args)=>{updates.push(args);throw Error('must not install')},
  })
  t.after(()=>app.dispose())
  await tick()
  assert.deepEqual(urls,[RELEASE])
  assert.equal(updates.length,0)
  assert.equal(app.intervals.size,1)
  assert.equal([...app.intervals.values()][0].ms,24*60*60*1000)
  const component=detail(app)
  let tree=react.render(component)
  assert.match(JSON.stringify(tree),/No published stable release yet/)
  assert.equal(walk(tree,node=>node.props?.['data-update-now']===''),null)
  await byId(tree,'data-check-updates').props.onClick()
  assert.deepEqual(urls,[RELEASE,RELEASE])
  tree=react.render(component)
  assert.match(JSON.stringify(tree),/No published stable release yet/)
  assert.match(code,new RegExp("const INSTALLED_VERSION = '"+pkg.version.replace(/\./g,'\\.')+"'"))
})

test('published stable release offers a deliberate two-click pinned Host update',async t=>{
  const urls=[],installed=[],react=harnessReact()
  const app=await clientHarness({
    React:react,
    fetch:async (url,options)=>{
      urls.push({url,options})
      if(url===RELEASE)return reply({tag_name:'v0.7.0',draft:false,prerelease:false})
      if(url===COMMIT)return reply({sha:SHA})
      if(url===RAW)return reply({name:pkg.name,version:'0.7.0'})
      throw Error('unexpected remote path: '+url)
    },
    listBundles:async()=>[{name:pkg.name,installed:true,update:'git',version:pkg.version}],
    updateBundle:async(...args)=>{installed.push(args);return {result:{application:'applied'}}},
  })
  t.after(()=>app.dispose())
  await tick()
  assert.equal(urls.length,1,'on startup, only fetch the latest release manifest')
  assert.equal(installed.length,0)
  const component=detail(app)
  let tree=react.render(component)
  assert.match(JSON.stringify(tree),/Approved update available/)
  await byId(tree,'data-update-now').props.onClick()
  assert.equal(installed.length,0,'preparation never installs a package')
  assert.deepEqual(urls.map(x=>x.url),[RELEASE,COMMIT,RAW])
  for(const item of urls) {
    assert.equal(item.options.credentials,'omit')
    assert.equal(item.options.referrerPolicy,'no-referrer')
    assert.equal(item.options.method,'GET')
  }
  tree=react.render(component)
  assert.match(JSON.stringify(tree),new RegExp(SHA))
  await byId(tree,'data-confirm-update').props.onClick()
  assert.deepEqual(JSON.parse(JSON.stringify(installed)),[[pkg.name,'0.7.0',{spec:'github:abinadwan/DSH-ABINADWAN-Plugins-Suite#'+SHA}]])
  tree=react.render(component)
  assert.match(JSON.stringify(tree),/Host accepted update/)
})

test('unpinned Git installation has no update capability and cannot trigger native install',async t=>{
  const updates=[],react=harnessReact()
  const app=await clientHarness({
    React:react,
    fetch:async url=>{
      if(url===RELEASE)return reply({tag_name:'v0.7.0',draft:false,prerelease:false})
      if(url===COMMIT)return reply({sha:SHA})
      if(url===RAW)return reply({name:pkg.name,version:'0.7.0'})
      throw Error('unexpected request')
    },
    listBundles:async()=>[{name:pkg.name,installed:true,version:pkg.version,update:undefined}],
    updateBundle:async(...args)=>updates.push(args),
  })
  t.after(()=>app.dispose())
  await tick()
  const component=detail(app)
  await byId(react.render(component),'data-update-now').props.onClick()
  const tree=react.render(component)
  assert.match(JSON.stringify(tree),/One-time migration needed/)
  assert.equal(walk(tree,n=>n.props?.['data-confirm-update']===''),null)
  assert.deepEqual(updates,[])
})

test('mismatched release manifest and prerelease metadata never offer install',async t=>{
  for(const [label,release,manifest,expected] of [
    ['draft',{tag_name:'v0.7.0',draft:true,prerelease:false},undefined,/Could not check for updates/],
    ['prerelease',{tag_name:'v0.7.0',draft:false,prerelease:true},undefined,/Could not check for updates/],
    ['malformed tag',{tag_name:'main',draft:false,prerelease:false},undefined,/Could not check for updates/],
    ['version mismatch',{tag_name:'v0.7.0',draft:false,prerelease:false},{name:pkg.name,version:'9.9.9'},/Release manifest does not match/],
  ]){
    await t.test(label,async()=>{
      const updates=[],react=harnessReact()
      const app=await clientHarness({
        React:react,fetch:async url=>{
          if(url===RELEASE)return reply(release)
          if(url===COMMIT)return reply({sha:SHA})
          if(url===RAW)return reply(manifest)
          throw Error('unexpected request')
        },
        listBundles:async()=>[{name:pkg.name,update:'git',installed:true}],
        updateBundle:async(...a)=>updates.push(a),
      })
      try {
        await tick()
        const component=detail(app)
        let tree=react.render(component)
        assert.match(JSON.stringify(tree),expected.test('Could not check for updates')?expected:/Approved update available/)
        if(manifest){
          await byId(tree,'data-update-now').props.onClick()
          tree=react.render(component)
          assert.match(JSON.stringify(tree),expected)
        } else {
          assert.equal(walk(tree,n=>n.props?.['data-update-now']===''),null)
        }
        assert.equal(updates.length,0)
      } finally {await app.dispose()}
    })
  }
})

test('suite disposal clears update interval and cancels later scheduled checks',async()=>{
  let requests=0
  const app=await clientHarness({fetch:async()=>{
    requests++
    return reply({message:'Not found'},404)
  }})
  await tick()
  assert.equal(app.intervals.size,1)
  await app.dispose()
  assert.equal(app.intervals.size,0)
  assert.equal(requests,1)
})
