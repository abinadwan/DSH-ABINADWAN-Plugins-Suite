import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
const code = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const EXPECTED_URL = 'https://raw.githubusercontent.com/abinadwan/deepseek-harness-environment-sidebar/main/package.json'
test('checks GitHub only after a click, with no credentials and fixed endpoint', async () => {
  let loaded
  let fetchCount = 0
  let fetchUrl, fetchOptions
  const transitions = []
  const fetchStub = async (url, opts) => {
    fetchCount++
    fetchUrl = url
    fetchOptions = opts
    return { ok: true, json: async () => ({name: pkg.name, version: '9.2.0'}) }
  }
  const React = {
    createElement: (type, props, ...children) => ({type, props:props ?? {}, children}),
    useState: init => [init, state => { transitions.push(state) }],
    useSyncExternalStore: (_, get) => get(),
  }
  runInNewContext(code, {
    window: { __ModuleLoader__: { load: entry => { loaded = entry } } },
    fetch: fetchStub,
    setTimeout: () => 1, clearTimeout: () => {},
    console, AbortSignal: { timeout: () => 'test-signal' },
  })
  assert.equal(fetchCount, 0)
  const plugin = loaded.factory(k => {assert.equal(k,'react'); return React})
  let rail
  const ctx = {
    sessions:{list:{subscribe:()=>()=>{},getSnapshot:()=>({byId:{s1:{running:true}}})}},
    workspaces:{list:{subscribe:()=>()=>{},getSnapshot:()=>({items:[]})}},
    sidebarRightTabs:{register:()=>()=>{}},
    sidebarRight:{mounted:{getSnapshot:()=>null,subscribe:()=>()=>{}},openTab:()=>{}},
    effect: f=>f(),
    slots:{inject:(_,cb)=>cb(),register:(options,Comp)=>{if(options.name==='sidebar.right.pane.tab')rail=Comp;return()=>{}}},
  }
  plugin.apply(ctx)
  const parent = rail({sessionId:'s1',useProjection:()=>({})})
  const tree = parent.type(parent.props)
  const findUpdate = node => {
    if (!node || typeof node !== 'object') return null
    if (typeof node.type === 'function' && node.type.name === 'VersionUpdates') return node
    for (const child of node.children ?? []) {
      if (Array.isArray(child)) { for (const x of child) {const found=findUpdate(x); if(found)return found} }
      else {const found=findUpdate(child);if(found)return found}
    }
    return null
  }
  const updateNode = findUpdate(tree)
  assert.ok(updateNode, 'VersionUpdates should exist in right sidebar')
  const updateUI = updateNode.type(updateNode.props)
  const checkButton = updateUI.children.find(x=>x?.props?.['data-check-updates'] === '')
  assert.ok(checkButton, 'manual Check for updates action')
  assert.equal(fetchCount, 0, 'no automatic network requests')
  await checkButton.props.onClick()
  assert.equal(fetchCount, 1)
  assert.equal(fetchUrl, EXPECTED_URL)
  assert.equal(fetchOptions.credentials, 'omit')
  assert.equal(fetchOptions.referrerPolicy, 'no-referrer')
  assert.equal(fetchOptions.method, 'GET')
  assert.equal(transitions[0].phase,'checking')
  assert.equal(transitions.at(-1).phase,'available')
  assert.equal(transitions.at(-1).latest,'9.2.0')
  assert.match(code, new RegExp("const INSTALLED_VERSION = '"+pkg.version.replace(/\./g,'\\.')+"'"))
})
