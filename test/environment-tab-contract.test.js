import test from 'node:test'
import assert from 'node:assert/strict'
import * as React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {clientHarness, base} from '../test-support/client.js'

test('Environment tab body registration matches official keyed tab definition id', async t => {
  const app = await clientHarness({React})
  t.after(() => app.dispose())
  const definition = app.tabs.records.get('environment-dashboard')
  assert.ok(definition)
  assert.equal(definition.id, base + '/environment-context')
  const body = app.slots.records.get(definition.id)
  assert.ok(body, 'must register content under the type id, not the package id')
  assert.equal(body.options.name, 'sidebar.right.pane.tab')
  assert.equal(body.options.key, definition.id)
  assert.equal(typeof body.options.inject, 'function')
  assert.equal(body.options.inject('s1').sessionId, 's1')
})

test('Environment right tab renders actual session projections without conversation-only props', async t => {
  const app = await clientHarness({React})
  t.after(() => app.dispose())
  const entry = app.slots.records.get(base + '/environment-context')
  const sessionOne = renderToStaticMarkup(React.createElement(entry.component,
    entry.options.inject('s1')))
  assert.match(sessionOne, /data-environment-right-sidebar/)
  assert.match(sessionOne, /aria-valuenow="38"/)
  assert.match(sessionOne, /Output tokens/)
  assert.match(sessionOne, /1\.2k/)
  assert.match(sessionOne, /HomeBook/)
  const sessionTwo = renderToStaticMarkup(React.createElement(entry.component,
    entry.options.inject('s2')))
  assert.match(sessionTwo, /aria-valuenow="13"/)
  assert.match(sessionTwo, /Other Session/)
  assert.doesNotMatch(sessionTwo, /1\.2k/)
  assert.doesNotMatch(sessionTwo, /HomeBook/)
})

// --- v0.6.2 runtime contract: live projections through the tab seat ---
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { JSDOM } from 'jsdom'
import { observable, sessionSnapshot, tick } from '../test-support/client.js'

function projectionHook(stores) {
  // Mirrors the Session-bound `useProjection(key)` standard hook.
  return key => React.useSyncExternalStore(stores[key].subscribe, stores[key].getSnapshot, stores[key].getSnapshot)
}
async function dom(t) {
  const before = { document: globalThis.document, window: globalThis.window, act: globalThis.IS_REACT_ACT_ENVIRONMENT }
  const page = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' })
  globalThis.document = page.window.document
  globalThis.window = page.window
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const root = createRoot(page.window.document.getElementById('root'))
  t.after(async () => {
    try { await act(async () => root.unmount()) } catch {}
    globalThis.document = before.document
    globalThis.window = before.window
    globalThis.IS_REACT_ACT_ENVIRONMENT = before.act
    page.window.close()
  })
  return { root, text: () => page.window.document.body.textContent, q: s => page.window.document.querySelector(s) }
}

test('Environment tab follows live useProjection frames after a model response', async t => {
  const app = await clientHarness({ React })
  t.after(() => app.dispose())
  const view = await dom(t)
  const entry = app.slots.records.get(base + '/environment-context')
  const stores = {
    contextPressure: observable({ pressureTokens: 1000, projectedTokens: 2000, contextWindow: 10000 }),
    contextBreakdown: observable({ messageTokens: 1500, toolsTokens: 300, systemTokens: 200 }),
    tokenUsage: observable({ outputTokens: 40 }),
  }
  const props = { ...entry.options.inject('s1'), sessionId: 's1', useProjection: projectionHook(stores) }
  await act(async () => view.root.render(React.createElement(entry.component, props)))
  assert.equal(view.q('[role="progressbar"]').getAttribute('aria-valuenow'), '20')
  assert.match(view.text(), /Output tokens40/)
  assert.match(view.text(), /HomeBook/)
  await act(async () => {
    stores.contextPressure.set({ pressureTokens: 4000, projectedTokens: 5000, contextWindow: 10000 })
    stores.tokenUsage.set({ outputTokens: 2500 })
  })
  assert.equal(view.q('[role="progressbar"]').getAttribute('aria-valuenow'), '50')
  assert.match(view.text(), /Output tokens2\.5k/)
})

test('Environment tab falls back to the Session list projection and updates when it changes', async t => {
  const app = await clientHarness({ React })
  t.after(() => app.dispose())
  const view = await dom(t)
  const entry = app.slots.records.get(base + '/environment-context')
  await act(async () => view.root.render(React.createElement(entry.component, entry.options.inject('s1'))))
  assert.equal(view.q('[role="progressbar"]').getAttribute('aria-valuenow'), '38')
  const next = sessionSnapshot()
  next.projectionsBySession.s1.values.tokenUsage = { outputTokens: 9000 }
  next.projectionsBySession.s1.values.contextPressure = { projectedTokens: 6000, contextWindow: 8000 }
  await act(async () => app.sessions.set(next))
  assert.equal(view.q('[role="progressbar"]').getAttribute('aria-valuenow'), '75')
  assert.match(view.text(), /Output tokens9k/)
})

test('switching Sessions never mixes data, and missing projections show a fallback', async t => {
  const app = await clientHarness({ React })
  t.after(() => app.dispose())
  const view = await dom(t)
  const entry = app.slots.records.get(base + '/environment-context')
  const s1 = { tokenUsage: observable({ outputTokens: 111 }), contextPressure: observable(undefined), contextBreakdown: observable(undefined) }
  const s2 = { tokenUsage: observable({ outputTokens: 222 }), contextPressure: observable(undefined), contextBreakdown: observable(undefined) }
  await act(async () => view.root.render(React.createElement(entry.component,
    { sessionId: 's1', useProjection: projectionHook(s1), key: 's1' })))
  assert.match(view.text(), /Output tokens111/)
  assert.match(view.text(), /SessionDemo/)
  await act(async () => view.root.render(React.createElement(entry.component,
    { sessionId: 's2', useProjection: projectionHook(s2), key: 's2' })))
  assert.match(view.text(), /Output tokens222/)
  assert.match(view.text(), /SessionOther Session/)
  assert.doesNotMatch(view.text(), /111|HomeBook/)
  // Unknown Session, no projection data at all: fallback text, no crash.
  await act(async () => view.root.render(React.createElement(entry.component, { sessionId: 'missing', key: 'missing' })))
  assert.ok(view.q('[data-context-fallback]'))
  assert.match(view.text(), /SessionUnavailable/)
  const loading = sessionSnapshot()
  loading.projectionsBySession.s2 = { state: 'loading', error: null, values: {} }
  await act(async () => app.sessions.set(loading))
  await act(async () => view.root.render(React.createElement(entry.component, { sessionId: 's2', key: 's2b' })))
  assert.match(view.text(), /Loading context usage for this Session/)
})

test('disabling Environment removes its tab type, seats and Session subscriptions; re-enable restores once', async t => {
  const app = await clientHarness({ React })
  t.after(() => app.dispose())
  const view = await dom(t)
  const entry = app.slots.records.get(base + '/environment-context')
  await act(async () => view.root.render(React.createElement(entry.component, entry.options.inject('s1'))))
  assert.ok(app.sessions.listeners.size > 0)
  await act(async () => view.root.render(null))
  const off = app.rows().map(row => row.moduleName === base + '/environment-context' ? { ...row, enabled: false, fiberPhase: null } : row)
  app.setRows(off)
  await app.changed()
  assert.equal(app.tabs.records.size, 0)
  assert.equal(app.entries('sidebar.right.pane.tab').length, 0)
  assert.equal(app.entries('conversation.session.header.utilities').length, 0)
  assert.equal(app.mountedListeners.size, 0)
  assert.equal(app.sessions.listeners.size, 0)
  for (let i = 0; i < 3; i++) {
    app.setRows(off.map(row => ({ ...row, enabled: true, fiberPhase: 'active' })))
    await app.changed()
    await tick()
  }
  assert.equal(app.tabs.records.size, 1)
  assert.equal(app.entries('sidebar.right.pane.tab').length, 1)
  assert.equal(app.entries('conversation.session.header.utilities').length, 1)
  assert.equal(app.mountedListeners.size, 1)
})
