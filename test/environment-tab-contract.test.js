import test from 'node:test'
import assert from 'node:assert/strict'
import * as React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {clientHarness, base} from '../test-support/client.js'

test('Environment tab body registration matches official keyed tab definition id', async t => {
  const app = await clientHarness({React, hostLocale: 'en'})
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
  const app = await clientHarness({React, hostLocale: 'en'})
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
  const app = await clientHarness({ React, hostLocale: 'en' })
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
  const app = await clientHarness({ React, hostLocale: 'en' })
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
  const app = await clientHarness({ React, hostLocale: 'en' })
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

test('Environment adapts its tab, guide, inspector and accessible controls when the Host switches to Arabic', async t => {
  const app = await clientHarness({ React, hostLocale: 'en' })
  t.after(() => app.dispose())
  const view = await dom(t)
  const tab = app.tabs.records.get('environment-dashboard')
  const body = app.slots.records.get(tab.id)
  const title = app.slots.records.get('sidebar.right.pane.tab.title:' + tab.id)
  assert.ok(title, 'Native open tabs use a separate title seat from the persisted seed')
  assert.equal(title.options.key, tab.id)
  const header = app.slots.records.get('environment-sidebar-toggle')
  await act(async () => view.root.render(React.createElement(React.Fragment, null,
    React.createElement(body.component, body.options.inject('s1')),
    React.createElement('div', { role: 'tab' }, React.createElement(title.component)),
    React.createElement(header.component, header.options.inject()))))
  assert.equal(tab.title(), 'Environment & Context')
  assert.equal(view.q('[role="progressbar"]').getAttribute('aria-label'), 'Context occupancy')
  await act(async () => app.hostLocale.set({ active: 'ar', revision: 1 }))
  assert.equal(tab.title(), 'البيئة والسياق')
  assert.equal(view.q('[role="tab"]').textContent, 'البيئة والسياق')
  assert.equal(tab.guide[0].title(), 'البيئة والسياق')
  assert.equal(tab.guide[0].description(), 'السياق الحالي وتفاصيل مساحة العمل')
  assert.equal(view.q('aside').lang, 'ar')
  assert.equal(view.q('aside').dir, 'rtl')
  assert.equal(view.q('[role="progressbar"]').getAttribute('aria-label'), 'نسبة استخدام السياق')
  assert.equal(view.q('[role="progressbar"]').getAttribute('aria-valuenow'), '38')
  assert.equal(view.q('[data-environment-header-action]').getAttribute('aria-label'), 'فتح لوحة البيئة')
  assert.match(view.text(), /رموز الإخراج/)
  assert.match(view.text(), /HomeBook/)
  assert.doesNotMatch(view.text(), /Output tokens|Last activity|Connector inventory/)
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
  assert.equal(app.entries('sidebar.right.pane.tab.title').length, 0)
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
  assert.equal(app.entries('sidebar.right.pane.tab.title').length, 1)
  assert.equal(app.entries('conversation.session.header.utilities').length, 1)
  assert.equal(app.mountedListeners.size, 1)
})


test('Environment hides retained-only Session rows, live projections and ambiguous Workspace metadata', async t => {
  const app = await clientHarness({ React, hostLocale: 'en' })
  t.after(() => app.dispose())
  const view = await dom(t)
  const entry = app.slots.records.get(base + '/environment-context')
  const stores = {
    tokenUsage: observable({ outputTokens: 9876 }),
    contextPressure: observable({ projectedTokens: 3000, contextWindow: 8000 }),
    contextBreakdown: observable(undefined),
  }
  await act(async () => view.root.render(React.createElement(entry.component,
    { sessionId: 's1', useProjection: projectionHook(stores) })))
  assert.match(view.text(), /HomeBook/)
  assert.match(view.text(), /Output tokens9\.9k/)
  const retained = sessionSnapshot()
  retained.ids = ['s2']
  await act(async () => app.sessions.set(retained))
  assert.equal(view.q('[role=progressbar]'), null)
  assert.doesNotMatch(view.text(), /HomeBook|Demo|9\.9k/)
  await act(async () => app.sessions.set(sessionSnapshot()))
  const workspace = app.workspaces.getSnapshot()
  await act(async () => app.workspaces.set({ ...workspace, items: [...workspace.items,
    { workspaceId: 'other', title: 'Ambiguous workspace', path: 'C:/Private', sessionIds: ['s1'] }] }))
  assert.doesNotMatch(view.text(), /HomeBook|Ambiguous workspace|C:\/Private/)
  assert.match(view.text(), /SessionDemo/)
  const denied = sessionSnapshot()
  denied.phase = 'pending'
  await act(async () => app.sessions.set(denied))
  assert.doesNotMatch(view.text(), /Demo|9\.9k/)
})

test('Environment waits for refreshed snapshots after connection change and ignores an old seat projection', async t => {
  const app = await clientHarness({ React, hostLocale: 'en' })
  t.after(() => app.dispose())
  const view = await dom(t)
  const entry = app.slots.records.get(base + '/environment-context')
  const stores = {
    tokenUsage: observable({ outputTokens: 8765 }),
    contextPressure: observable({ projectedTokens: 3000, contextWindow: 8000 }),
    contextBreakdown: observable(undefined),
  }
  await act(async () => view.root.render(React.createElement(entry.component,
    { sessionId: 's1', useProjection: projectionHook(stores) })))
  assert.match(view.text(), /Output tokens8\.8k/)
  await act(async () => app.host.set(undefined))
  assert.doesNotMatch(view.text(), /Demo|HomeBook|8\.8k/)
  await act(async () => app.host.set({ id: 2, host: { home: 'C:/Fixture2' } }))
  assert.doesNotMatch(view.text(), /Demo|HomeBook|8\.8k/)
  const fresh = sessionSnapshot()
  fresh.byId.s1 = { id: 's1', displayTitle: 'Current profile', running: false }
  fresh.projectionsBySession.s1.values.tokenUsage = { outputTokens: 321 }
  await act(async () => app.sessions.set(fresh))
  assert.match(view.text(), /Current profile/)
  assert.match(view.text(), /Output tokens321/)
  assert.doesNotMatch(view.text(), /HomeBook|8\.8k/)
  await act(async () => app.workspaces.set({ ...app.workspaces.getSnapshot(), items: [
    { workspaceId: 'current', title: 'Current workspace', path: 'C:/Current', sessionIds: ['s1'] }] }))
  assert.match(view.text(), /Current workspace/)
  assert.doesNotMatch(view.text(), /HomeBook|8\.8k/)
})

test('Environment rejects erroneous cached projections, invalid numbers and a zero context window', async t => {
  const app = await clientHarness({ React, hostLocale: 'en' })
  t.after(() => app.dispose())
  const entry = app.slots.records.get(base + '/environment-context')
  const render = () => renderToStaticMarkup(React.createElement(entry.component, entry.options.inject('s1')))
  const invalid = sessionSnapshot()
  invalid.projectionsBySession.s1.state = 'error'
  app.sessions.set(invalid)
  assert.doesNotMatch(render(), /aria-valuenow|1\.2k/)
  invalid.projectionsBySession.s1 = { state: 'ready', values: {
    contextPressure: { projectedTokens: 100, contextWindow: 0 },
    tokenUsage: { outputTokens: Number.MAX_VALUE },
  } }
  app.sessions.set(invalid)
  assert.doesNotMatch(render(), /aria-valuenow|Infinity|e\+30/)
})


test('Environment projection-only renders reuse membership checks; new snapshots and connection changes revalidate', async t => {
  const fixture = sessionSnapshot()
  let sessionScans = 0, workspaceScans = 0
  for (let i = 0; i < 1000; i++) {
    const id = 'synthetic-' + i
    fixture.ids.push(id)
    fixture.byId[id] = { id, running: false }
  }
  fixture.ids.filter = function (...args) {
    sessionScans++
    return Array.prototype.filter.apply(this, args)
  }
  const app = await clientHarness({ React, hostLocale: 'en', sessions: fixture })
  t.after(() => app.dispose())
  const view = await dom(t)
  const original = app.workspaces.getSnapshot()
  const items = [...original.items]
  items.every = function (...args) {
    workspaceScans++
    return Array.prototype.every.apply(this, args)
  }
  await act(async () => { app.workspaces.set({ ...original, items }); await tick() })
  const entry = app.slots.records.get(base + '/environment-context')
  const stores = {
    tokenUsage: observable({ outputTokens: 40 }),
    contextPressure: observable({ projectedTokens: 2000, contextWindow: 10000 }),
    contextBreakdown: observable(undefined),
  }
  await act(async () => view.root.render(React.createElement(entry.component,
    { sessionId: 's1', useProjection: projectionHook(stores) })))
  assert.match(view.text(), /HomeBook/)
  assert.ok(sessionScans > 0 && workspaceScans > 0)
  const before = [sessionScans, workspaceScans]
  for (let i = 1; i <= 5; i++) {
    await act(async () => stores.tokenUsage.set({ outputTokens: 40 + i }))
  }
  assert.match(view.text(), /Output tokens45/)
  assert.deepEqual([sessionScans, workspaceScans], before,
    'live projections do not rescan unchanged authorized catalog snapshots')
  await act(async () => app.workspaces.set({ ...original, items: [...items,
    { workspaceId: 'ambiguous', title: 'Private', sessionIds: ['s1'] }] }))
  assert.doesNotMatch(view.text(), /HomeBook|Private/)
  await act(async () => app.sessions.set({ ...fixture, ids: ['s2'] }))
  assert.doesNotMatch(view.text(), /Demo|Output tokens45/)
  await act(async () => app.host.set(undefined))
  await act(async () => app.host.set({ id: 2, host: { home: 'C:/Synthetic' } }))
  assert.doesNotMatch(view.text(), /Demo|HomeBook|Output tokens45/)
  const fresh = sessionSnapshot()
  fresh.byId.s1 = { id: 's1', displayTitle: 'New host', running: false }
  await act(async () => app.sessions.set(fresh))
  assert.match(view.text(), /New host/)
  assert.doesNotMatch(view.text(), /HomeBook|Output tokens45/)
})


test('Environment follows all seven known UI locales without remounting or changing Session data', async t => {
  const app = await clientHarness({ React, hostLocale: 'en' })
  t.after(() => app.dispose())
  const view = await dom(t)
  const tab = app.tabs.records.get('environment-dashboard')
  const body = app.slots.records.get(tab.id)
  const title = app.slots.records.get('sidebar.right.pane.tab.title:' + tab.id)
  const header = app.slots.records.get('environment-sidebar-toggle')
  await act(async () => view.root.render(React.createElement(React.Fragment, null,
    React.createElement(body.component, body.options.inject('s1')),
    React.createElement('div', { role: 'tab' }, React.createElement(title.component)),
    React.createElement(header.component, header.options.inject()))))
  const inspector = view.q('aside')
  const first = view.q('aside details')
  first.open = false
  const cases = [
    ['zh','环境与上下文','上下文占用率','输出令牌数','打开环境侧边栏'],
    ['es','Entorno y contexto','Ocupación del contexto','Tokens de salida','Abrir la barra lateral de entorno'],
    ['fr','Environnement et contexte','Occupation du contexte','Jetons de sortie','Ouvrir le panneau latéral Environnement'],
    ['de','Umgebung und Kontext','Kontextbelegung','Ausgabetokens','Seitenleiste Umgebung öffnen'],
    ['ja','環境とコンテキスト','コンテキスト占有率','出力トークン','環境サイドバーを開く'],
    ['ar','البيئة والسياق','نسبة استخدام السياق','رموز الإخراج','فتح لوحة البيئة'],
    ['en','Environment & Context','Context occupancy','Output tokens','Open Environment sidebar'],
  ]
  for (const [revision, [lang, name, occupancy, output, open]] of cases.entries()) {
    await act(async () => app.hostLocale.set({ active: lang, revision: revision + 1 }))
    assert.equal(tab.title(), name)
    assert.equal(tab.guide[0].title(), name)
    assert.equal(view.q('[role="tab"]').textContent, name)
    assert.equal(view.q('aside'), inspector)
    assert.equal(view.q('aside details'), first)
    assert.equal(first.open, false)
    assert.equal(inspector.lang, lang)
    assert.equal(inspector.dir, lang === 'ar' ? 'rtl' : 'ltr')
    assert.equal(view.q('[role="progressbar"]').getAttribute('aria-label'), occupancy)
    assert.equal(view.q('[role="progressbar"]').getAttribute('aria-valuenow'), '38')
    assert.equal(view.q('[data-environment-header-action]').getAttribute('aria-label'), open)
    assert.ok(view.text().includes(output))
    assert.match(view.text(), /HomeBook/)
    assert.match(view.text(), /Demo/)
    assert.ok(view.text().includes(lang === 'en' ? '1.2k' :
      new Intl.NumberFormat(lang, { notation: 'compact', maximumFractionDigits: 1 }).format(1200)))
    if (lang !== 'en') assert.doesNotMatch(view.text(), /Output tokens|Last activity|Connector inventory/)
  }
})
