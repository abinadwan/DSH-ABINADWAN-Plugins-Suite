import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'

const root = new URL('../', import.meta.url)
const read = name => readFileSync(new URL(name, root), 'utf8')
const manifest = JSON.parse(read('package.json'))

test('bundle manifest and browser exports match package identity', () => {
  assert.equal(manifest.name, '@abinadwan/environment-sidebar')
  assert.equal(manifest.dsh.bundle.patch, './cordis.patch.yml')
  assert.equal(manifest.dsh.client.platform, 'web')
  assert.equal(manifest.exports['.'], './index.js')
  assert.equal(manifest.exports['./client'], './client.js')
  assert.match(read('cordis.patch.yml'), /name: '@abinadwan\/environment-sidebar'/)
  for (const file of ['index.js', 'client.js', 'cordis.patch.yml']) {
    assert.ok(read(file).length > 0)
  }
})

test('Host module loads without unbuilt dist entry', async () => {
  const host = await import(new URL('../index.js', import.meta.url))
  assert.equal(typeof host.apply, 'function')
  assert.equal(host.apply(), undefined)
})

test('client lazy factory registers main panel and left navigation entry', () => {
  let registration
  const createElement = (type, props, ...children) => ({ type, props: props || {}, children })
  const react = {
    createElement,
    useState: initial => [initial, () => {}],
    useSyncExternalStore: (_, readSnapshot) => readSnapshot(),
    useEffect: () => {},
  }
  const window = { __ModuleLoader__: { load(def) { registration = def } } }
  runInNewContext(read('client.js'), { window })
  assert.equal(registration.id, manifest.name)
  const plugin = registration.factory(name => {
    assert.equal(name, 'react')
    return react
  })
  assert.deepEqual(Array.from(plugin.inject), ['slots', 'sessions', 'workspaces'])
  const slots = []
  const ctx = {
    sessions: { list: { subscribe: () => () => {}, getSnapshot: () => ({
      ids: ['s1'], byId: { s1: { id: 's1', displayTitle: 'Demo', updatedAt: 1700000000000, running: false } },
      phase: 'ready',
    }) } },
    workspaces: { list: { subscribe: () => () => {}, getSnapshot: () => ({
      items: [{}], archivedSessionIds: [], pinnedSessionIds: [], phase: 'ready',
    }) } },
    slots: {
      inject(slot, callback) { assert.equal(typeof callback, 'function'); callback() },
      register(options, component) { slots.push({ options, component }); return () => {} },
    },
  }
  plugin.apply(ctx)
  assert.equal(slots.length, 2)
  assert.equal(slots.find(entry => entry.options.name === 'main').options.key, 'environment-sidebar')
  assert.equal(slots.find(entry => entry.options.name === 'sidebar.panellist').options.id, 'environment-sidebar')
  const page = slots.find(entry => entry.options.name === 'main').component()
  assert.equal(typeof page.type, 'function')
  const panel = page.type(page.props)
  assert.equal(panel.props['data-environment-sidebar'], '')
  assert.match(JSON.stringify(panel), /بيئة وسياق/)
  assert.doesNotMatch(JSON.stringify(panel), /token=private/)
})

test('static client does not contain unsafe external operations', () => {
  const code = read('client.js')
  assert.doesNotMatch(code, /\bfetch\s*\(|\bXMLHttpRequest\b|\bprocess\.env\b|\brequire\s*\(\s*['"](?:node:)?(?:fs|child_process)['"]\s*\)/)
})
