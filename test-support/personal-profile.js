// Test-only helpers for the Personal Profile native-settings page. Fictional data only.
import assert from 'node:assert/strict'
import './dom-global.js'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { JSDOM } from 'jsdom'
import { clientHarness, base, withProfile, tick, ok, refused } from './client.js'
import { emptyRecord, emptyLegacyRecord } from '../plugins/personal-profile/index.js'
export { emptyRecord, emptyLegacyRecord }

export const namespace = 'abinadwan-personal-profile'
export const panelId = base + '/personal-profile-page'
export const copy = x => JSON.parse(JSON.stringify(x))

/**
 * A Settings Remote double that follows the rc.3 SettingsController contract:
 * RemoteResult envelopes, `replace(ns, section, expectedRevision)`, a
 * `settings/conflict` refusal for a stale revision, and the namespace view
 * (`{ns, value, revision}`) answered after a committed write.
 */
export function mockSettings(initial = { ...emptyRecord(), locale: 'ar' }) {
  // Historical UI regression fixtures exercise RTL Arabic explicitly.
  // New-profile English defaults use mockSettings(emptyRecord()) in dedicated tests.
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

export async function mountProfile(t, { transport = mockSettings(), access = () => true, items = workspaceItems, console: logger, fetch,
  download = true, clipboard = true } = {}) {
  const app = await clientHarness({ React, settings: transport, workspaceItems: items, console: logger, fetch })
  assert.equal(app.slots.records.has(panelId), false)
  app.setRows(withProfile(app.rows(), true))
  await app.changed(); await app.changed()
  const panel = app.slots.records.get(panelId)
  assert.ok(panel)
  assert.equal(panel.options.name,'settings.section','My Profile must mount in Settings, not the global sidebar')
  const previous = { document: globalThis.document, window: globalThis.window, act: globalThis.IS_REACT_ACT_ENVIRONMENT }
  const dom = new JSDOM('<!doctype html><html lang="en"><head><title>Personal Profile</title></head><body><main id="root"></main></body></html>',
    { url: 'http://localhost/', runScripts: 'outside-only' })
  globalThis.document = dom.window.document; globalThis.window = dom.window; globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const root = createRoot(dom.window.document.getElementById('root'))
  const d = dom.window.document
  // Browser-native export doubles: object URLs, <a download> clicks and the
  // async Clipboard API. Nothing touches the real filesystem or clipboard.
  const downloads = []
  if (download) {
    const blobs = new Map()
    dom.window.URL.createObjectURL = blob => { const url = 'blob:http://localhost/' + (blobs.size + 1); blobs.set(url, blob); return url }
    dom.window.URL.revokeObjectURL = () => {}
    d.addEventListener('click', event => {
      const a = event.target
      if (a?.tagName === 'A' && a.download) { event.preventDefault(); downloads.push({ name: a.download, blob: blobs.get(a.href) }) }
    }, true)
  }
  const copied = []
  if (clipboard) Object.defineProperty(dom.window.navigator, 'clipboard', { configurable: true,
    value: { writeText: async text => { copied.push(text) } } })
  const blobText = blob => new Promise((resolve, reject) => {
    const reader = new dom.window.FileReader()
    reader.onload = () => resolve(String(reader.result)); reader.onerror = reject
    reader.readAsText(blob)
  })
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
  const backupStatus = () => byId('backup-status')?.textContent || ''
  /** Choose a file in an <input type=file>; FileReader settles asynchronously. */
  const upload = async (id, text, { name = 'backup.json', size } = {}) => act(async () => {
    const input = byId(id); assert.ok(input, id)
    const file = new dom.window.File([text], name, { type: 'application/json' })
    if (size !== undefined) Object.defineProperty(file, 'size', { value: size })
    Object.defineProperty(input, 'files', { configurable: true, value: [file] })
    input.dispatchEvent(new dom.window.Event('change', { bubbles: true }))
    for (let i = 0; i < 20; i++) await new Promise(resolve => setTimeout(resolve, 1))
  })
  t.after(async () => {
    await act(async () => root.unmount())
    globalThis.document = previous.document; globalThis.window = previous.window; globalThis.IS_REACT_ACT_ENVIRONMENT = previous.act
    dom.window.close(); await app.dispose()
  })
  await render()
  return {
    app, dom, d, root, render, byId, click, button, select, type, settle, status, backupStatus, transport,
    upload, downloads, copied, blobText,
    unmount: () => act(async () => root.unmount()),
    setAccess(next) { access = next },
  }
}
