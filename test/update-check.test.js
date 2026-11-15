import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { clientHarness, walk, ReactStub } from '../test-support/client.js'

const code = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const EXPECTED_URL = 'https://raw.githubusercontent.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/main/package.json'

test('update controls belong to this plugin detail page, never to the Session sidebar', async t => {
  let requests = 0, requestUrl, requestOptions
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
  const app = await clientHarness({ React, fetch: fetchStub })
  t.after(() => app.dispose())
  assert.equal(requests, 0)
  const slots = { get: name => app.slot(name) }
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

test('manual update checks report request and metadata errors, and compare prereleases', async t => {
  for (const [label, fetch, expected] of [
    ['HTTP failure', async () => ({ ok: false, status: 503 }), 'error'],
    ['network failure', async () => { throw new Error('offline') }, 'error'],
    ['wrong identity', async () => ({ ok: true, json: async () => ({ name: 'other', version: '9.0.0' }) }), 'error'],
    ['invalid version', async () => ({ ok: true, json: async () => ({ name: pkg.name, version: 'invalid' }) }), 'error'],
    ['current version', async () => ({ ok: true, json: async () => ({ name: pkg.name, version: pkg.version }) }), 'current'],
    ['new prerelease', async () => ({ ok: true, json: async () => ({ name: pkg.name, version: '0.6.0-rc.1' }) }), 'available'],
  ]) {
    await t.test(label, async () => {
      const transitions = []
      const app = await clientHarness({ fetch, React: {
        ...ReactStub, useState: initial => [initial, value => transitions.push(value)],
      } })
      try {
        const node = app.slot('plugins.detail.section')({ subject: {
          kind: 'bundle', pkg: { name: pkg.name, version: pkg.version },
        } })
        const button = walk(node.type(node.props), item => item.props?.['data-check-updates'] === '')
        await button.props.onClick()
        assert.equal(transitions.at(-1).phase, expected)
      } finally {
        await app.dispose()
      }
    })
  }
})
