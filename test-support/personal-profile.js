// Test-only helpers for the Personal Profile native-settings page. Fictional data only.
import assert from 'node:assert/strict'
import './dom-global.js'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { JSDOM } from 'jsdom'
import { clientHarness, base, withProfile, tick, ok, refused } from './client.js'
import { emptyRecord } from '../plugins/personal-profile/index.js'

export const namespace = 'abinadwan-personal-profile'
export const panelId = base + '/personal-profile-page'
export const copy = x => JSON.parse(JSON.stringify(x))

/**
 * A Settings Remote double that follows the rc.3 SettingsController contract:
 * RemoteResult envelopes, `replace(ns, section, expectedRevision)`, a
 * `settings/conflict` refusal for a stale revision, and the namespace view
 * (`{ns, value, revision}`) answered after a committed write.
 */
export function mockSettings(initial = emptyRecord()) {
  let record = copy(initial), revision = 0, conflict = false
  const calls = [], describes = []
  const view = () => ({ ns: namespace, value: { record: copy(record) }, revision })
  return {
    calls, describes, view,
    get record() { return record },
    conflict: () => { conflict = true; revision++ },
    /** Simulate another window committing a change. */
    external(next) { record = copy(next); revision++ },
    describe: async () => { describes.push(revision); return ok({ writable: true, namespaces: [view()] }) },
    replace: async (ns, value, expected) => {
      calls.push({ ns, value: copy(value), expected })
      if (conflict || ns !== namespace || expected !== revision) return refused('settings/conflict', 'stale')
      record = copy(value.record); revision++
      return ok(view())
    },
  }
}

/** A promise whose settlement the test controls. */
export function deferred() {
  let resolve, reject
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

export const workspaceItems = [{ workspaceId: 'w1', title: 'Workspace A' }, { workspaceId: 'w2', title: 'Workspace B' }]

export async function mountProfile(t, { transport = mockSettings(), access = () => true, items = workspaceItems, console: logger, fetch } = {}) {
  const app = await clientHarness({ React, settings: transport, workspaceItems: items, console: logger, fetch })
  assert.equal(app.slots.records.has(panelId), false)
  app.setRows(withProfile(app.rows(), true))
  await app.changed(); await app.changed()
  const panel = app.slots.records.get(panelId)
  assert.ok(panel)
  const previous = { document: globalThis.document, window: globalThis.window, act: globalThis.IS_REACT_ACT_ENVIRONMENT }
  const dom = new JSDOM('<!doctype html><html lang="en"><head><title>Personal Profile</title></head><body><main id="root"></main></body></html>',
    { url: 'http://localhost/', runScripts: 'outside-only' })
  globalThis.document = dom.window.document; globalThis.window = dom.window; globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const root = createRoot(dom.window.document.getElementById('root'))
  const d = dom.window.document
  let component = panel.component
  const render = async () => {
    await act(async () => root.render(React.createElement(component, { useRemoteAccess: access })))
    await act(async () => { await tick() })
  }
  const byId = id => d.getElementById('pp-' + id)
  const settle = async () => act(async () => { await tick(); await tick() })
  const click = async id => act(async () => { assert.ok(byId(id), id); byId(id).click(); await tick() })
  const button = async text => act(async () => {
    const found = [...d.querySelectorAll('button')].find(b => b.textContent === text)
    assert.ok(found, text); found.click(); await tick()
  })
  const select = async (id, value) => act(async () => {
    const x = byId(id); assert.ok(x, id); x.value = value
    x.dispatchEvent(new dom.window.Event('change', { bubbles: true })); await tick()
  })
  // React tracks the native value setter; use it so onChange fires as for real typing.
  const type = async (id, value) => act(async () => {
    const x = byId(id); assert.ok(x, id)
    const proto = x.tagName === 'TEXTAREA' ? dom.window.HTMLTextAreaElement.prototype : dom.window.HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(x, value)
    x.dispatchEvent(new dom.window.Event('input', { bubbles: true })); await tick()
  })
  const status = () => byId('save-status').textContent
  t.after(async () => {
    await act(async () => root.unmount())
    globalThis.document = previous.document; globalThis.window = previous.window; globalThis.IS_REACT_ACT_ENVIRONMENT = previous.act
    dom.window.close(); await app.dispose()
  })
  await render()
  return {
    app, dom, d, root, render, byId, click, button, select, type, settle, status, transport,
    unmount: () => act(async () => root.unmount()),
    setAccess(next) { access = next },
  }
}
