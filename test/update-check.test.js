import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

const code = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const EXPECTED_URL = 'https://raw.githubusercontent.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/main/package.json'

function walk(node, predicate) {
  if (node == null || typeof node !== 'object') return null
  if (predicate(node)) return node
  for (const child of node.children ?? []) {
    if (Array.isArray(child)) {
      for (const element of child) {
        const found = walk(element, predicate)
        if (found) return found
      }
    } else {
      const found = walk(child, predicate)
      if (found) return found
    }
  }
  return null
}

test('update controls belong to this plugin detail page, never to the Session sidebar', async () => {
  let loaded, requests = 0, requestUrl, requestOptions
  const transitions = []
  const fetchStub = async (url, options) => {
    requests++
    requestUrl = url
    requestOptions = options
    return { ok: true, json: async () => ({
      name: pkg.name, version: '9.2.0',
    }) }
  }
  const React = {
    createElement: (type, props, ...children) => ({type, props: props ?? {}, children}),
    useState: initial => [initial, next => transitions.push(next)],
    useSyncExternalStore: (_, get) => get(),
  }
  runInNewContext(code, {
    window: { __ModuleLoader__: { load: mod => { loaded = mod } } },
    fetch: fetchStub, setTimeout: () => 1, clearTimeout: () => {},
    AbortSignal: { timeout: () => 'test signal' }, console,
  })
  assert.equal(requests, 0)
  const plugin = loaded.factory(name => {
    assert.equal(name, 'react')
    return React
  })
  const slots = new Map()
  const ctx = {
    sessions: { list: { subscribe: () => () => {}, getSnapshot: () => ({
      byId: { s1: { displayTitle: 'Demo' } },
    }) } },
    workspaces: { list: { subscribe: () => () => {}, getSnapshot: () => ({items: []}) } },
    sidebarRightTabs: {register: () => () => {}},
    sidebarRight: {mounted: { getSnapshot: () => null, subscribe: () => () => {} }, openTab: () => {}},
    effect: f => f(),
    slots: {
      inject: (_, f) => f(),
      register: (options, component) => {
        slots.set(options.name, component)
        return () => {}
      },
    },
  }
  plugin.apply(ctx)
  const inspector = slots.get('sidebar.right.pane.tab')
  assert.ok(inspector)
  const rightNode = inspector({sessionId: 's1', useProjection: () => ({})})
  const rightTree = rightNode.type(rightNode.props)
  assert.equal(rightTree.props['data-environment-right-sidebar'], '')
  assert.equal(walk(rightTree, n => n.type === 'button' && n.props?.['data-check-updates'] === ''), null)
  assert.doesNotMatch(JSON.stringify(rightTree), /Versions & updates/)

  const detailSlot = slots.get('plugins.detail.section')
  assert.ok(detailSlot)
  assert.equal(detailSlot({subject: {kind: 'bundle', pkg: {name: 'someone/other', version: '1.0.0'}}}), null)
  assert.equal(detailSlot({subject: {kind: 'row', pkg: {name: pkg.name}, row: {}}}), null)

  const pageNode = detailSlot({subject: {kind: 'bundle', pkg: {name: pkg.name, version: pkg.version}}})
  assert.equal(pageNode.type.name, 'VersionUpdates')
  const page = pageNode.type(pageNode.props)
  assert.equal(page.props['data-environment-update-section'], '')
  const button = walk(page, n => n.type === 'button' && n.props?.['data-check-updates'] === '')
  assert.ok(button)
  assert.equal(requests, 0, 'no automatic network requests before click')
  await button.props.onClick()
  assert.equal(requests, 1)
  assert.equal(requestUrl, EXPECTED_URL)
  assert.equal(requestOptions.credentials, 'omit')
  assert.equal(requestOptions.referrerPolicy, 'no-referrer')
  assert.equal(requestOptions.method, 'GET')
  assert.equal(transitions[0].phase, 'checking')
  assert.equal(transitions.at(-1).phase, 'available')
  assert.equal(transitions.at(-1).latest, '9.2.0')
  assert.match(code, new RegExp("const INSTALLED_VERSION = '" + pkg.version.replace(/\./g, '\\.') + "'"))
})
