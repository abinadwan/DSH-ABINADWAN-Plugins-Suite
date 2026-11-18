// Phase 6E regression: Personal Profile rendered a blank content area on
// Windows Desktop (Harness v0.2.2-rc.3). Verified cause: `ctx.workspaces.list`
// is a `ClientWorkspaceModel` class instance whose `subscribe`/`getSnapshot`
// read `this`; passing them unbound to useSyncExternalStore threw during
// render, and the Host Slot boundary retired the `main` entry, leaving an empty
// `<div data-slot-error="main">`. 0.7.2 removed the Workspace dependency
// entirely; these tests keep the Host-style Slot boundary and prove the page
// renders whatever the Workspace store does. Fictional data only.
import test from 'node:test'
import assert from 'node:assert/strict'
import '../test-support/dom-global.js'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { JSDOM } from 'jsdom'
import { clientHarness, withProfile, tick, refused, HostWorkspaceModel } from '../test-support/client.js'
import { mockSettings, panelId, workspaceItems } from '../test-support/personal-profile.js'

/** Mirrors rc.3 ui-renderer SlotErrorBoundary: a crash leaves an empty anchor. */
class HostSlotBoundary extends React.Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error) { this.props.onCrash(error) }
  render() {
    return this.state.failed ? React.createElement('div', { 'data-slot-error': 'main' }) : this.props.children
  }
}

async function mountInHostSlot(t, { transport = mockSettings(), access = () => true, workspaces, settingsOverride } = {}) {
  const app = await clientHarness({ React, settings: transport, workspaceItems })
  if (workspaces) app.ctx.workspaces.list = workspaces
  app.setRows(withProfile(app.rows(), true))
  await app.changed(); await app.changed()
  const entry = app.slots.records.get(panelId)
  assert.ok(entry, 'main slot entry registered')
  const dom = new JSDOM('<!doctype html><html><body><main id="root"></main></body></html>', { url: 'http://localhost/' })
  const previous = { document: globalThis.document, window: globalThis.window, act: globalThis.IS_REACT_ACT_ENVIRONMENT }
  globalThis.document = dom.window.document; globalThis.window = dom.window; globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const crashes = []
  const quiet = console.error
  console.error = () => {}
  const root = createRoot(dom.window.document.getElementById('root'))
  t.after(async () => {
    await act(async () => root.unmount())
    console.error = quiet
    globalThis.document = previous.document; globalThis.window = previous.window; globalThis.IS_REACT_ACT_ENVIRONMENT = previous.act
    dom.window.close(); await app.dispose()
  })
  const props = access === null ? {} : { useRemoteAccess: access }
  await act(async () => root.render(React.createElement(HostSlotBoundary, { onCrash: e => crashes.push(e) },
    React.createElement(entry.component, props))))
  await act(async () => { await tick(); await tick() })
  return { app, d: dom.window.document, crashes, settingsOverride }
}

test('the Host workspace list is a class instance whose methods need their receiver', () => {
  const model = new HostWorkspaceModel({ items: [] })
  const { getSnapshot, subscribe } = model
  assert.throws(() => getSnapshot(), TypeError, 'unbound getSnapshot throws like the rc.3 ClientWorkspaceModel')
  assert.throws(() => subscribe(() => {}), TypeError)
})

test('Personal Profile renders inside a Host-style main Slot with the real Host Workspace class present', async t => {
  const { d, crashes } = await mountInHostSlot(t)
  assert.deepEqual(crashes.map(String), [], 'no Slot entry crash')
  assert.equal(d.querySelector('[data-slot-error]'), null, 'content area is not blank')
  assert.ok(d.querySelector('[data-personal-profile-panel]'))
  assert.match(d.querySelector('h1').textContent, /الملف الشخصي/)
  assert.equal(d.getElementById('pp-profile'), null, 'no Workspace selector (unified profile)')
  assert.match(d.getElementById('pp-save-status').textContent, /الإعدادات محمّلة/)
})

test('Workspace store updates neither crash nor change the page', async t => {
  const { app, d, crashes } = await mountInHostSlot(t)
  const before = d.querySelector('[data-personal-profile-panel]').innerHTML
  await act(async () => {
    app.workspaces.set({ items: [{ workspaceId: 'w9', title: 'Workspace Z' }], archivedSessionIds: [], pinnedSessionIds: [], state: 'idle', phase: 'ready', error: null })
    await tick(); await tick()
  })
  assert.equal(crashes.length, 0)
  assert.equal(d.querySelector('[data-personal-profile-panel]').innerHTML, before)
})

test('missing access hook, denied access or an unavailable settings service show a visible message', async t => {
  const cases = [
    ['no useRemoteAccess prop', { access: null }],
    ['access denied', { access: () => false }],
    ['settings describe refused', { transport: { describe: async () => refused('access/denied', 'no'), replace: async () => refused('x', 'x') } }],
    ['settings describe rejects', { transport: { describe: async () => { throw new Error('down') }, replace: async () => refused('x', 'x') } }],
  ]
  for (const [label, options] of cases) {
    await t.test(label, async t => {
      const { d, crashes } = await mountInHostSlot(t, options)
      assert.equal(crashes.length, 0, label)
      assert.equal(d.querySelector('[data-slot-error]'), null, 'not blank')
      assert.match(d.getElementById('pp-save-status').textContent, /غير متاحة/, label)
      assert.equal(d.getElementById('pp-save').disabled, true)
    })
  }
})

test('a broken Workspace store cannot affect the page (no Workspace dependency)', async t => {
  const broken = { subscribe() { throw new Error('workspace store unavailable') }, getSnapshot() { throw new Error('workspace store unavailable') } }
  const { d, crashes } = await mountInHostSlot(t, { workspaces: broken })
  assert.equal(crashes.length, 0)
  assert.equal(d.querySelector('[data-personal-profile-error]'), null)
  assert.match(d.getElementById('pp-save-status').textContent, /الإعدادات محمّلة/)
})

test('a render failure inside the page shows a visible error instead of a blank page', async t => {
  const { d, crashes } = await mountInHostSlot(t, { access: () => { throw new Error('access hook failed') } })
  assert.equal(crashes.length, 0, 'the page contains its own failure')
  assert.equal(d.querySelector('[data-slot-error]'), null)
  const alert = d.querySelector('[data-personal-profile-error]')
  assert.ok(alert, 'visible error panel')
  assert.equal(alert.getAttribute('role'), 'alert')
  assert.match(alert.textContent, /Personal Profile/)
  assert.match(alert.textContent, /No settings were saved or changed/)
})
