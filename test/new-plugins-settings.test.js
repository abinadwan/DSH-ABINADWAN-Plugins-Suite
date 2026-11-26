import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { parse } from 'yaml'
import { readPluginMeta } from '@deepseek-ai/dsh-app-boot'
import '../test-support/dom-global.js'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { base, clientHarness, observable, ok, refused } from '../test-support/client.js'

const names = {
  'direct-chat': 'Direct Chat',
  'conversation-lifecycle': 'Archive Manager',
  'adaptive-reasoning': 'Adaptive Reasoning',
}

test('My Profile package metadata uses the compact title without changing its internal module', () => {
  const root = new URL('../package.json', import.meta.url)
  const meta = readPluginMeta(`${base}/personal-profile`, root.href)
  assert.equal(meta.error, undefined)
  assert.equal(meta.title.en, 'My Profile')
  assert.equal(meta.title.ar, 'My Profile')
})

test('independent Host rows default off and resolve English product metadata and original icons', () => {
  const root = new URL('../package.json', import.meta.url)
  const [{ insert }] = parse(readFileSync(new URL('../cordis.patch.yml', import.meta.url), 'utf8'))
  for (const [id, title] of Object.entries(names)) {
    const row = insert.find(entry => entry.id === `abinadwan-${id}`)
    assert.equal(row?.name, `${base}/${id}`)
    assert.equal(row.disabled, true)
    const meta = readPluginMeta(row.name, root.href)
    assert.equal(meta.error, undefined)
    assert.match(meta.icon, /^data:image\/png;base64,/)
    assert.deepEqual(meta.title, { en: title })
    assert.deepEqual(Object.keys(meta.description), ['en'])
    assert.match(meta.description.en, /Part of the ABINADWAN Plugins Suite\./)
  }
})

test('Direct Chat action and Archive Manager global panel stay independent without a Settings entry', async () => {
  const fixture = await clientHarness({ modelDirectories: {} })
  try {
    const rows = [...fixture.rows(), ...Object.keys(names).map(id => ({
      moduleName: `${base}/${id}`, enabled: true, fiberPhase: 'active',
    }))]
    fixture.setRows(rows)
    await fixture.changed()
    assert.ok(fixture.entries('sidebar.session.action').some(row => row.options.id === 'abinadwan-direct-chat'))
    assert.deepEqual(fixture.entries('settings.section').map(row => row.options.id), [])
    assert.ok(fixture.entries('main').some(row => row.options.key === 'abinadwan-chat-control-archive'))
    assert.equal(fixture.entries('conversation.input.right').length, 1)
    fixture.setRows(rows.map(row => row.moduleName === `${base}/direct-chat` ? { ...row, enabled: false } : row))
    await fixture.changed()
    assert.equal(fixture.entries('sidebar.session.action').length, 0)
    assert.deepEqual(fixture.entries('settings.section').map(row => row.options.id), [])
    assert.ok(fixture.entries('sidebar.panellist').some(row => row.options.id === 'abinadwan-chat-control-archive'))
  } finally { await fixture.dispose() }
})

test('My Profile is a Settings section with its own icon and no global sidebar action', async () => {
  const fixture = await clientHarness()
  const id = `${base}/personal-profile-page`
  try {
    const enabled = [...fixture.rows(), { moduleName: `${base}/personal-profile`, enabled: true, fiberPhase: 'active' }]
    fixture.setRows(enabled)
    await fixture.changed()
    const profile = fixture.entries('settings.section').find(row => row.options.id === id)
    assert.ok(profile, 'My Profile must be visible in Settings')
    assert.equal(profile.options.label, 'My Profile')
    assert.ok(fixture.entries('settings.section.icon').some(row => row.options.id === id))
    assert.ok(!fixture.entries('sidebar.panellist').some(row => row.options.id === id))
    assert.ok(!fixture.entries('main').some(row => row.options.key === id))
    fixture.setRows(enabled.map(row => row.moduleName === `${base}/personal-profile` ? { ...row, enabled: false } : row))
    await fixture.changed()
    assert.ok(!fixture.entries('settings.section').some(row => row.options.id === id), 'disabling removes Settings entry')
    assert.ok(!fixture.entries('settings.section.icon').some(row => row.options.id === id))
  } finally { await fixture.dispose() }
})

async function mount(t, options, active, slot) {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const window = document.defaultView
  const div = document.createElement('main')
  document.body.append(div)
  const previousLanguage = document.documentElement.lang
  document.documentElement.lang = options.language ?? previousLanguage
  const fixture = await clientHarness({ React, document, hostLocale: options.hostLocale ?? 'en', ...options })
  fixture.setRows([...fixture.rows(), { moduleName: `${base}/${active}`, enabled: true, fiberPhase: 'active' }])
  await fixture.changed()
  const entry = fixture.entries(slot)[0]
  assert.ok(entry)
  const root = createRoot(div)
  t.after(async () => {
    await act(async () => root.unmount())
    div.remove()
    document.documentElement.lang = previousLanguage
    await fixture.dispose()
    delete globalThis.IS_REACT_ACT_ENVIRONMENT
  })
  const injected = entry.options.inject?.('test-session') ?? {}
  await act(async () => root.render(React.createElement(entry.component,
    { ...injected, useRemoteAccess: options.useRemoteAccess ?? (() => true), useAccess: () => true })))
  return { div, window, fixture }
}

function settingsFixture(id, initial) {
  let view = { ns: `abinadwan-${id}`, value: { record: initial }, revision: 1 }
  const writes = []
  return { writes, service: {
    async describe() { return ok({ namespaces: [view], writable: true }) },
    async replace(ns, value, revision) {
      writes.push({ ns, value, revision })
      if (ns !== view.ns || revision !== view.revision) return refused('settings/conflict', 'stale')
      view = { ns, value, revision: revision + 1 }
      return ok(view)
    },
  } }
}

const archiveRecord = { retention: 'forever', overrides: [], protectedIds: [], protectedWorkspaces: [] }
const archiveButton = (root, label) => [...root.querySelectorAll('button')].find(item => item.textContent === label)
const archiveSelect = async (root, label, value) => act(async () => {
  const input = [...root.querySelectorAll('select, input')].find(item => item.labels?.[0]?.firstChild.textContent === label)
  assert.ok(input, label)
  if (input.tagName === 'SELECT') input.value = value
  else Object.getOwnPropertyDescriptor(document.defaultView.HTMLInputElement.prototype, 'value').set.call(input, value)
  input.dispatchEvent(new document.defaultView.Event(input.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }))
})

async function mountArchive(t, options = {}) {
  const ids = ['s1', 's2', 'active', 'ambiguous', 'pinned', 'protected']
  const titles = ['Zulu report', 'Alpha memo', 'Active work', 'Ambiguous title', 'Pinned draft', 'Protected draft']
  const settings = settingsFixture('conversation-lifecycle', { ...archiveRecord, protectedIds: ['protected'] })
  const result = await mount(t, {
    settings: settings.service,
    archivedSessionIds: ['s1', 's2', 'missing', 'ambiguous', 'pinned', 'protected'], pinnedSessionIds: ['pinned'],
    workspaceItems: [
      { workspaceId: 'w1', title: 'North Workspace', sessionIds: ['s1', 'active', 'ambiguous', 'pinned', 'protected', 'missing'] },
      { workspaceId: 'w2', title: 'South Workspace', sessionIds: ['s2', 'ambiguous'] },
    ],
    sessions: { phase: 'ready', ids, byId: Object.fromEntries(ids.map((id, i) => [id, {
      id, title: titles[i], displayTitle: titles[i], blank: false, running: id === 'active', updatedAt: new Date(2026, 3, 20 - i).getTime(),
    }])) },
    ...options,
  }, 'conversation-lifecycle', 'main')
  assert.ok(!result.fixture.entries('settings.section').some(row => row.options.id === 'abinadwan-conversation-lifecycle'))
  assert.ok(!result.fixture.entries('settings.section.icon').some(row => row.options.id === 'abinadwan-conversation-lifecycle'))
  const panel = result.fixture.entries('main').find(row => row.options.key === 'abinadwan-chat-control-archive')
  const sidebar = result.fixture.entries('sidebar.panellist').find(row => row.options.id === panel?.options.key)
  assert.ok(panel && sidebar, 'Archive is a native global panel with a matching sidebar entry')
  assert.equal(result.div.querySelector('[role=dialog]'), null, 'Archive must not be a modal')
  return { ...result, hub: () => result.div.querySelector('[data-chat-control-archive]'), settings }
}

test('Archive global panel and sidebar share the component lifecycle and localized navigation label', async () => {
  const fixture = await clientHarness({ hostLocale: 'en' })
  const id = 'abinadwan-chat-control-archive'
  const rows = [...fixture.rows(), { moduleName: `${base}/conversation-lifecycle`, enabled: true, fiberPhase: 'active' }]
  try {
    fixture.setRows(rows)
    await fixture.changed()
    const sidebar = fixture.entries('sidebar.panellist').find(row => row.options.id === id)
    assert.ok(sidebar)
    assert.equal(sidebar.options.label(), 'Archives')
    fixture.hostLocale.set({ active: 'ar', revision: 1 })
    assert.equal(sidebar.options.label(), 'الأرشيف')
    fixture.hostLocale.set({ active: 'en', revision: 2 })
    assert.equal(sidebar.options.label(), 'Archives')
    assert.ok(fixture.entries('main').some(row => row.options.key === id))
    fixture.setRows(rows.map(row => row.moduleName === `${base}/conversation-lifecycle` ? { ...row, enabled: false } : row))
    await fixture.changed()
    assert.ok(!fixture.entries('sidebar.panellist').some(row => row.options.id === id))
    assert.ok(!fixture.entries('main').some(row => row.options.key === id))
    fixture.setRows(rows)
    await fixture.changed()
    assert.ok(fixture.entries('sidebar.panellist').some(row => row.options.id === id))
    assert.ok(fixture.entries('main').some(row => row.options.key === id))
  } finally { await fixture.dispose() }
})

test('Archive Hub joins authorized rows, searches titles and workspaces, and sorts and filters metadata', async t => {
  const { hub } = await mountArchive(t)
  const titles = () => [...hub().querySelectorAll('li strong')].map(node => node.textContent)
  assert.deepEqual(titles(), ['Zulu report', 'Alpha memo', 'Pinned draft', 'Protected draft'])
  assert.match(hub().textContent, /4 archived conversations/)
  assert.doesNotMatch(hub().textContent, /missing|Ambiguous title|Active work/)
  await archiveSelect(hub(), 'Sort by', 'name')
  assert.deepEqual(titles(), ['Alpha memo', 'Pinned draft', 'Protected draft', 'Zulu report'])
  await archiveSelect(hub(), 'Sort by', 'oldest')
  assert.deepEqual(titles(), ['Protected draft', 'Pinned draft', 'Alpha memo', 'Zulu report'])
  await archiveSelect(hub(), 'Sort by', 'workspace')
  assert.deepEqual(titles(), ['Pinned draft', 'Protected draft', 'Zulu report', 'Alpha memo'])
  await archiveSelect(hub(), 'Search archived conversations', 'South')
  assert.deepEqual(titles(), ['Alpha memo'])
  await archiveSelect(hub(), 'Workspace', 'w1')
  assert.match(hub().textContent, /No matching archived conversations/)
  await archiveSelect(hub(), 'Search archived conversations', '')
  await archiveSelect(hub(), 'Protection', 'yes')
  assert.deepEqual(titles(), ['Protected draft'])
  await archiveSelect(hub(), 'Protection', 'all')
  await archiveSelect(hub(), 'Pinned', 'yes')
  assert.deepEqual(titles(), ['Pinned draft'])
  await archiveSelect(hub(), 'Pinned', 'all')
  await archiveSelect(hub(), 'Updated on or after', '2026-04-19')
  assert.deepEqual(titles(), ['Zulu report'])
})

test('Archive restore asks for confirmation, applies live native state, and never opens a session', async t => {
  const calls = []
  const { fixture, hub } = await mountArchive(t, {
    onOpenSession: () => assert.fail('Archive access must never open a Session'),
    onUnarchive: async id => {
      calls.push(id)
      const state = fixture.workspaces.getSnapshot()
      fixture.workspaces.set({ ...state, archivedSessionIds: state.archivedSessionIds.filter(value => value !== id) })
    },
  })
  const restore = title => archiveButton([...hub().querySelectorAll('li')].find(row => row.textContent.includes(title)), 'Restore')
  assert.equal(restore('Protected draft').disabled, true)
  assert.equal(restore('Pinned draft').disabled, true)
  await act(async () => restore('Zulu report').click())
  assert.deepEqual(calls, [])
  await act(async () => archiveButton(hub(), 'Cancel').click())
  assert.deepEqual(calls, [])
  await act(async () => restore('Zulu report').click())
  await act(async () => archiveButton(hub(), 'Confirm restore').click())
  assert.deepEqual(calls, ['s1'])
  assert.match(hub().textContent, /Conversation restored/)
  assert.match(hub().textContent, /3 archived conversations/)
  assert.doesNotMatch(hub().textContent, /Zulu report/)
})

test('Archive Hub withholds rows without settings access and localizes controls and direction', async t => {
  const { hub } = await mountArchive(t, { hostLocale: 'ar', useRemoteAccess: () => false })
  assert.equal(hub().querySelector('[dir]').dir, 'rtl')
  assert.match(hub().textContent, /ما عندك صلاحية عرض المحادثات المؤرشفة/)
  assert.doesNotMatch(hub().textContent, /Zulu report/)
})

test('Restore confirmation and metadata cannot survive a lost or changed Host', async t => {
  const calls = []
  let changed = false
  const { fixture, hub } = await mountArchive(t, { onUnarchive: async id => calls.push(id),
    readArchiveSessions: async () => changed ? ok({ items: [] }) : undefined })
  await act(async () => archiveButton(hub(), 'Restore').click())
  assert.ok(archiveButton(hub(), 'Confirm restore'))
  await act(async () => fixture.host.set(undefined))
  assert.match(hub().textContent, /Host disconnected/)
  assert.doesNotMatch(hub().textContent, /Zulu report|Confirm restore/)
  changed = true
  await act(async () => fixture.host.set({ id: 2, host: { home: 'C:/OtherFixture' } }))
  assert.doesNotMatch(hub().textContent, /Zulu report/)
  assert.deepEqual(calls, [])
  const nextWorkspace = { ...fixture.workspaces.getSnapshot(), items: [{ workspaceId: 'other', title: 'Other profile', sessionIds: ['s1'] }],
    archivedSessionIds: [], pinnedSessionIds: [] }
  await act(async () => {
    fixture.workspaces.set(nextWorkspace)
    fixture.sessions.set({ phase: 'ready', ids: ['s1'], byId: { s1: { id: 's1', displayTitle: 'Other title' } } })
  })
  assert.match(hub().textContent, /No archived conversations/)
  assert.doesNotMatch(hub().textContent, /Zulu report/)
})

test('the confirm button never sends an unarchive after Session access is withdrawn', async t => {
  const { hub, fixture } = await mountArchive(t, { onUnarchive: () => assert.fail('Access was withdrawn') })
  await act(async () => archiveButton(hub(), 'Restore').click())
  assert.equal(document.activeElement, archiveButton(hub(), 'Confirm restore'))
  await act(async () => fixture.sessionAccess.set(false))
  assert.equal(archiveButton(hub(), 'Restore').disabled, true)
  await act(async () => archiveButton(hub(), 'Confirm restore').click())
  assert.match(hub().textContent, /conversation or your access changed/)
  assert.match(hub().textContent, /4 archived conversations/)
})

test('archive loading, unavailable catalog and Host error never show cached rows', async t => {
  let releaseWorkspace
  let response = () => new Promise(resolve => { releaseWorkspace = resolve })
  const { hub } = await mountArchive(t, { readArchiveWorkspaces: () => response() })
  assert.match(hub().textContent, /Loading archived conversations/)
  await act(async () => releaseWorkspace({ items: [], archivedSessionIds: {}, pinnedSessionIds: [] }))
  assert.match(hub().textContent, /Archive catalog unavailable/)
  response = async () => { throw new Error('Native fixture disconnected') }
  await act(async () => archiveButton(hub(), 'Refresh archive').click())
  assert.match(hub().textContent, /Could not load the archive catalog/)
  assert.doesNotMatch(hub().textContent, /Zulu report/)
})

test('a background catalog refresh keeps the search focus and verifies native updates', async t => {
  let complete
  let wait = false
  const { hub, fixture } = await mountArchive(t, { readArchiveSessions: () => wait
    ? new Promise(resolve => { complete = resolve }) : undefined })
  const search = hub().querySelector('input[type=search]')
  search.focus()
  wait = true
  await act(async () => fixture.sessions.set({ ...fixture.sessions.getSnapshot() }))
  assert.equal(document.activeElement, search)
  assert.match(hub().textContent, /Zulu report/)
  wait = false
  await act(async () => complete(ok({ items: [] })))
  assert.match(hub().textContent, /No archived conversations/)
})

test('an invalidated archive read cannot publish superseded results or enable mutations', async t => {
  let wait = false
  const pending = []
  const { hub, fixture, settings } = await mountArchive(t, {
    onUnarchive: () => assert.fail('A superseded archive cannot restore'),
    readArchiveSessions: () => wait ? new Promise(resolve => pending.push(resolve)) : undefined,
  })
  const checkbox = () => protectionCheckbox(hub(), 'Protect Zulu report')
  assert.ok(checkbox() && !checkbox().disabled)
  wait = true
  await act(async () => fixture.sessions.set({ ...fixture.sessions.getSnapshot() }))
  assert.equal(pending.length, 1)
  assert.equal(checkbox().disabled, true)
  await act(async () => fixture.sessions.set({ ...fixture.sessions.getSnapshot() }))
  await act(async () => pending.shift()(ok({ items: [{ sessionId: 's1', blank: false, running: false,
    projections: { values: { title: 'Superseded title' } } }] })))
  assert.equal(pending.length, 1)
  assert.doesNotMatch(hub().textContent, /Superseded title/)
  assert.equal(checkbox().disabled, true)
  assert.equal(archiveButton(hub(), 'Restore').disabled, true)
  assert.deepEqual(settings.writes, [])
  wait = false
  await act(async () => pending.shift()(ok({ items: [] })))
  assert.match(hub().textContent, /No archived conversations/)
  assert.doesNotMatch(hub().textContent, /Zulu report|Superseded title/)
})

test('malformed protection records do not expose archive controls or permit writes', async t => {
  const settings = settingsFixture('conversation-lifecycle', { ...archiveRecord, protectedIds: 's1' })
  const { hub } = await mountArchive(t, { settings: settings.service,
    onUnarchive: () => assert.fail('Malformed protection cannot restore') })
  assert.match(hub().textContent, /Archive catalog unavailable/)
  assert.equal(hub().querySelector('input[type=checkbox]'), null)
  assert.equal(archiveButton(hub(), 'Restore'), undefined)
  assert.deepEqual(settings.writes, [])
})

test('the archive reads the current native catalog even if the shared Session cache is still pending', async t => {
  const { hub } = await mountArchive(t, {
    sessions: { phase: 'pending', ids: [], byId: {} },
    readArchiveSessions: async () => ok({ items: [{ sessionId: 's1', blank: false, running: false,
      projections: { kind: 'cached', asOfSeq: 0, values: { title: 'Native archive row' } } }] }),
  })
  assert.match(hub().textContent, /Native archive row/)
})

test('a refreshed local projection cannot re-admit an overlapping Session from a prior Host', async t => {
  let freshHost = false
  const { hub, fixture } = await mountArchive(t, { readArchiveSessions: async () => freshHost ? ok({ items: [] }) : undefined })
  assert.match(hub().textContent, /Zulu report/)
  const previous = fixture.sessions.getSnapshot()
  freshHost = true
  await act(async () => fixture.host.set(undefined))
  await act(async () => {
    fixture.host.set({ id: 2, host: { home: 'C:/OtherFixture' } })
    fixture.workspaces.set({ ...fixture.workspaces.getSnapshot(), items: [{ workspaceId: 'other', title: 'New Profile', sessionIds: ['s1'] }],
      archivedSessionIds: ['s1'], pinnedSessionIds: [] })
    fixture.sessions.set({ ...previous, projectionsBySession: {} })
  })
  assert.match(hub().textContent, /No archived conversations/)
  assert.doesNotMatch(hub().textContent, /Zulu report/)
})

test('restore rereads protection saved during catalog verification even without a settings update event', async t => {
  const settings = settingsFixture('conversation-lifecycle', archiveRecord)
  const calls = []
  let verifying = false
  let releaseCatalog
  const { hub } = await mountArchive(t, { settings: settings.service, onUnarchive: async id => calls.push(id),
    readArchiveSessions: () => verifying ? new Promise(resolve => { releaseCatalog = resolve }) : undefined })
  await act(async () => archiveButton(hub(), 'Restore').click())
  verifying = true
  await act(async () => archiveButton(hub(), 'Confirm restore').click())
  assert.equal(typeof releaseCatalog, 'function')
  await settings.service.replace('abinadwan-conversation-lifecycle', { record: { ...archiveRecord, protectedIds: ['s1'] } }, 1)
  await act(async () => releaseCatalog())
  assert.deepEqual(calls, [])
  assert.match(hub().textContent, /conversation or your access changed/)
})

test('restore requires matching ready local membership and authorized Session inventory', async t => {
  const calls = []
  const { hub, fixture } = await mountArchive(t, {
    onUnarchive: async id => calls.push(id),
    readArchiveSessions: async () => ok({ items: [{ sessionId: 's1', blank: false, running: false,
      projections: { values: { title: 'Zulu report' } } }] }),
    sessions: { phase: 'pending', ids: [], byId: {} },
  })
  await act(async () => archiveButton(hub(), 'Restore').click())
  await act(async () => archiveButton(hub(), 'Confirm restore').click())
  assert.deepEqual(calls, [])
  assert.match(hub().textContent, /conversation or your access changed/)
  await act(async () => fixture.sessions.set({ phase: 'ready', ids: ['s1'],
    byId: { s1: { id: 's1', blank: false, running: false, title: 'Zulu report' } } }))
  await act(async () => archiveButton(hub(), 'Restore').click())
  await act(async () => archiveButton(hub(), 'Confirm restore').click())
  assert.deepEqual(calls, ['s1'])
})

test('native restore failure leaves the row and count intact and disable releases its lifecycle', async t => {
  const { hub, fixture } = await mountArchive(t, { onUnarchive: async () => { throw new Error('Native fixture refusal') } })
  await act(async () => archiveButton(hub(), 'Restore').click())
  await act(async () => archiveButton(hub(), 'Confirm restore').click())
  assert.match(hub().querySelector('[role=alert]').textContent, /Could not restore/)
  assert.match(hub().textContent, /4 archived conversations/)
  const enabled = fixture.rows()
  fixture.setRows(enabled.map(row => row.moduleName === `${base}/conversation-lifecycle` ? { ...row, enabled: false } : row))
  await fixture.changed()
  assert.equal(fixture.entries('settings.section').filter(entry => entry.options.id === 'abinadwan-conversation-lifecycle').length, 0)
  fixture.setRows(enabled)
  await fixture.changed()
  assert.equal(fixture.entries('settings.section').filter(entry => entry.options.id === 'abinadwan-conversation-lifecycle').length, 0)
  assert.ok(fixture.entries('main').some(entry => entry.options.key === 'abinadwan-chat-control-archive'))
})

const protectionCheckbox = (root, label) => [...root.querySelectorAll('label')].find(item => item.textContent.trim() === label)?.querySelector('input[type=checkbox]')

test('archive protection toggles with revision checks and preserves historical fields', async t => {
  const original = { ...archiveRecord, retention: '7', hideArchived: false,
    overrides: [{ workspace: 'w1', retention: '90' }], protectedIds: ['protected', 'active'] }
  const settings = settingsFixture('conversation-lifecycle', original)
  const { hub } = await mountArchive(t, { settings: settings.service, onUnarchive: async () => {} })
  assert.doesNotMatch(hub().textContent, /Storage usage|Retention Policy|Preview deletion|Cleanup Management|Hide Archived Conversations/)
  assert.match(hub().textContent, /4 archived conversations/)
  assert.match(hub().textContent, /1 protected/)
  const checkbox = label => protectionCheckbox(hub(), label)
  assert.ok(checkbox('Protect Zulu report'))
  await act(async () => checkbox('Protect Zulu report').click())
  assert.deepEqual(JSON.parse(JSON.stringify(settings.writes[0].value.record)),
    { ...original, protectedIds: ['protected', 'active', 's1'] })
  assert.equal(settings.writes[0].revision, 1)
  assert.match(hub().textContent, /2 protected/)
  const restore = () => archiveButton([...hub().querySelectorAll('li')].find(row => row.textContent.includes('Zulu report')), 'Restore')
  assert.equal(restore().disabled, true)
  await act(async () => checkbox('Protect Zulu report').click())
  assert.equal(restore().disabled, false)
  assert.equal(settings.writes[1].revision, 2)
  assert.ok(checkbox('Protect Active work').checked, 'existing active protection is still manageable')
  await act(async () => checkbox('Protect Active work').click())
  assert.deepEqual(Array.from(settings.writes[2].value.record.protectedIds), ['protected'])
  assert.equal(settings.writes[2].value.record.retention, '7')
  assert.equal(settings.writes[2].value.record.hideArchived, false)
})

test('Workspace protection is inherited and reversible without changing individual flags', async t => {
  const settings = settingsFixture('conversation-lifecycle', { ...archiveRecord, protectedIds: ['protected'] })
  const { hub } = await mountArchive(t, { settings: settings.service, onUnarchive: async () => {} })
  const checkbox = () => protectionCheckbox(hub(), 'Protect Workspace: North Workspace')
  assert.ok(checkbox())
  await act(async () => checkbox().click())
  assert.deepEqual(Array.from(settings.writes[0].value.record.protectedWorkspaces), ['w1'])
  assert.deepEqual(Array.from(settings.writes[0].value.record.protectedIds), ['protected'])
  assert.match(hub().textContent, /Protected by Workspace/)
  assert.match(hub().textContent, /3 protected/)
  await act(async () => checkbox().click())
  assert.deepEqual(Array.from(settings.writes[1].value.record.protectedWorkspaces), [])
  assert.match(hub().textContent, /1 protected/)
})

test('one English composer menu selects, saves, applies and removes supported effort', async t => {
  const route = { provider: 'provider', model: 'model', reasoningEffort: 'balanced-v2' }
  const groups = [{ id: 'provider', models: [{ id: 'model', reasoning: {
    efforts: [{ id: 'balanced-v2', name: 'Balanced' }, { id: 'wide-v2', name: 'Wide' }], defaultEffort: 'balanced-v2',
  } }] }]
  const directory = { store: observable({ current: route, groups, status: 'ready', routable: true }), async load() {} }
  const requests = []
  const settings = settingsFixture('adaptive-reasoning', { preferences: [{ ...route, effort: 'wide-v2' }], mode: 'manual', subagents: 'inherit' })
  const { div } = await mount(t, { language: 'ar', modelDirectories: { directoryFor: () => directory }, settings: settings.service,
    sessions: { phase: 'ready', byId: { 'test-session': { running: false } } },
    async fetch(url, options) {
      assert.equal(url.pathname, '/api/abinadwan-reasoning/effort')
      assert.equal(options.credentials, 'same-origin')
      const selection = JSON.parse(options.body)
      requests.push(selection)
      if (requests.length === 1) return Response.json({ error: 'session-unavailable' }, { status: 409 })
      const { mode: _mode, sessionId: _sessionId, ...selected } = selection
      directory.store.set({ ...directory.store.getSnapshot(), current: selected })
      return Response.json({ selected })
    } },
    'adaptive-reasoning', 'conversation.input.right')
  const trigger = div.querySelector('button[aria-haspopup=menu]')
  const open = () => act(async () => trigger.click())
  const item = label => [...div.querySelectorAll('[role=menuitem]')].find(button => button.textContent === label)
  const choose = label => act(async () => item(label).click())
  assert.match(trigger.textContent, /Balanced/)
  assert.equal(div.querySelector('[role=menu]'), null)
  await open()
  assert.match(div.textContent, /Saved preference: Wide/)
  assert.deepEqual([...div.querySelectorAll('[role=menuitem]')].slice(0, 4).map(button => button.textContent),
    ['Balanced', 'Wide', 'Save current effort', 'Apply saved effort'])
  assert.doesNotMatch(div.textContent, /\p{Script=Arabic}/u)
  await choose('Apply saved effort')
  assert.match(div.textContent, /Start or resume this chat before applying the saved effort/)
  await open()
  await choose('Apply saved effort')
  assert.match(div.textContent, /Effort applied/)
  assert.equal(requests[0].sessionId, 'test-session')
  assert.equal(requests[0].provider, 'provider')
  assert.equal(requests[0].reasoningEffort, 'wide-v2')
  assert.deepEqual(requests[1], requests[0])
  await open()
  await choose('Balanced')
  assert.deepEqual(requests[2], { sessionId: 'test-session', ...route, mode: 'manual' })
  await open()
  await choose('Save current effort')
  assert.equal(settings.writes[0].value.record.preferences[0].effort, 'balanced-v2')
  assert.equal(settings.writes[0].value.record.mode, 'manual', 'saving a preference keeps the rest of the record')
  await open()
  assert.match(div.textContent, /Saved preference: Balanced/)
  await choose('Remove saved preference')
  assert.equal(settings.writes[1].value.record.preferences.length, 0)
  await open()
  assert.match(div.textContent, /No saved preference/)
  await act(async () => directory.store.set({ ...directory.store.getSnapshot(), groups: [{ id: 'provider', models: [{ id: 'model' }] }] }))
  assert.equal(div.querySelector('button[aria-haspopup=menu]'), null)
})

function reasoningFixture({ record = { preferences: [] }, handlers = {} } = {}) {
  const route = { provider: 'provider', model: 'model', reasoningEffort: 'balanced-v2' }
  const groups = [{ id: 'provider', models: [{ id: 'model', reasoning: {
    efforts: [{ id: 'balanced-v2', name: 'Balanced' }, { id: 'wide-v2', name: 'Wide' }], defaultEffort: 'balanced-v2',
  } }] }]
  const directory = { store: observable({ current: route, groups, status: 'ready', routable: true }), async load() {} }
  const settings = settingsFixture('adaptive-reasoning', record)
  const calls = []
  const face = { async prompt() { return { ok: true } } }
  return { settings, calls, face, options: {
    language: 'en', modelDirectories: { directoryFor: () => directory }, settings: settings.service,
    sessions: { phase: 'ready', byId: { 'test-session': { running: false } } },
    sessionBinding: id => id === 'test-session' ? { session: face } : undefined,
    async fetch(url, options) {
      assert.equal(options.credentials, 'same-origin')
      const path = url.pathname.replace('/api/abinadwan-reasoning/', '')
      const body = JSON.parse(options.body)
      calls.push({ path, body })
      return handlers[path]?.(body) ?? Response.json({ error: 'unexpected' }, { status: 500 })
    },
  } }
}

async function openReasoning(t, fixture) {
  const { div } = await mount(t, fixture.options, 'adaptive-reasoning', 'conversation.input.right')
  const trigger = () => div.querySelector('button[aria-haspopup=menu]')
  const open = () => act(async () => trigger().click())
  const item = label => [...div.querySelectorAll('[role=menuitem]')].find(button => button.textContent === label)
  return { div, trigger, open, item }
}

test('legacy policy settings leave the composer on explicit session effort', async t => {
  const fixture = reasoningFixture({ record: { preferences: [], mode: 'adaptive', subagents: 'effort', subagentEffort: 'wide-v2' } })
  const originalPrompt = fixture.face.prompt
  const view = await openReasoning(t, fixture)
  await view.open()
  assert.equal(view.trigger().textContent, 'Balanced')
  assert.equal(view.item('Balanced').getAttribute('aria-checked'), 'true')
  assert.equal(view.item('Adaptive'), undefined)
  assert.equal(view.item('Next message only'), undefined)
  assert.equal(view.item('Subagents'), undefined)
  assert.equal(fixture.face.prompt, originalPrompt)
  await act(async () => view.item('Save current effort').click())
  assert.equal(fixture.settings.writes[0].value.record.mode, 'adaptive')
  assert.equal(fixture.settings.writes[0].value.record.subagentEffort, 'wide-v2')
  assert.deepEqual(fixture.calls, [])
})
test('statistics open in a native dialog with honest reasoning-token labels and a reset', async t => {
  const empty = { since: '2026-11-20T08:00:00.000Z', persistent: false, messages: 0,
    sources: { override: 0, adaptive: 0, manual: 0, saved: 0, default: 0 }, tiers: { simple: 0, standard: 0, complex: 0, advanced: 0 },
    overrides: { applied: 0, notApplied: {} }, subagents: { applied: 0, notApplied: {} }, requests: { session: {}, subagent: {} },
    classifier: { runs: 0, totalMs: 0, maxMs: 0 } }
  const filled = { ...empty, messages: 3, sources: { ...empty.sources, manual: 2, default: 1 },
    tiers: { ...empty.tiers, simple: 1, advanced: 1 }, classifier: { runs: 2, totalMs: 0.004, maxMs: 0.003 },
    overrides: { applied: 1, notApplied: { 'shared-step': 1 } },
    requests: { session: { 'wide-v2': { requests: 2, inputTokens: 1200, outputTokens: 300, totalTokens: 0, totalReported: 0,
      reasoningTokens: 0, reasoningReported: 0, durationMs: 3000, timed: 2 } }, subagent: {} } }
  const fixture = reasoningFixture({ handlers: {
    stats: () => Response.json(filled), 'stats/reset': () => Response.json(empty),
  } })
  const view = await openReasoning(t, fixture)
  await view.open()
  await act(async () => view.item('Reasoning statistics…').click())
  const dialog = view.div.querySelector('[role=dialog]')
  assert.equal(dialog.getAttribute('aria-label'), 'Reasoning statistics')
  assert.match(dialog.textContent, /Wide/)
  assert.match(dialog.textContent, /1,200/)
  assert.match(dialog.textContent, /Not reported/)
  assert.match(dialog.textContent, /1\.5 s/)
  assert.match(dialog.textContent, /Session effort/)
  assert.doesNotMatch(dialog.textContent, /One-time effort|Adaptive classification|Subagent policy/)
  assert.match(dialog.textContent, /No savings are estimated/)
  assert.match(dialog.textContent, /Nothing is sent anywhere/)
  assert.doesNotMatch(dialog.textContent, /\p{Script=Arabic}/u)
  const reset = [...dialog.querySelectorAll('button')].find(button => button.textContent === 'Reset statistics')
  await act(async () => reset.click())
  assert.deepEqual(fixture.calls.map(call => call.path), ['stats', 'stats/reset'])
  assert.match(view.div.querySelector('[role=dialog]').textContent, /No requests yet/)
})

test('Arabic statistics localizes the dialog, makes all columns keyboard-scrollable, and wraps long route names', async t => {
  const provider = 'fictional-provider-'.repeat(18)
  const model = 'fictional-model-'.repeat(18)
  const fixture = reasoningFixture({ handlers: {
    stats: () => Response.json({ since: '2026-11-20T08:00:00.000Z', persistent: true, messages: 2,
      requests: { subagent: { default: { requests: 2, inputTokens: 1200, outputTokens: 30,
        reasoningTokens: 100, reasoningReported: 1, durationMs: 3000, timed: 2 } } },
      routes: [{ scope: 'subagent', provider, model, effort: 'default', requests: 2 }] }),
    'stats/reset': () => Response.json({}, { status: 503 }),
  } })
  fixture.options.hostLocale = 'ar'
  const view = await openReasoning(t, fixture)
  await view.open()
  await act(async () => view.item('إحصائيات الاستدلال…').click())
  const dialog = view.div.querySelector('[role=dialog]')
  assert.equal(dialog.getAttribute('aria-label'), 'إحصائيات الاستدلال')
  assert.equal(document.defaultView.getComputedStyle(dialog).direction, 'rtl')
  assert.equal(dialog.querySelector('[lang=ar]').dir, 'rtl')
  const table = dialog.querySelector('table')
  assert.equal(table.parentElement.getAttribute('role'), 'region')
  assert.equal(table.parentElement.getAttribute('aria-label'), 'الطلبات حسب مستوى الاستدلال')
  assert.equal(table.parentElement.tabIndex, 0)
  assert.equal(table.parentElement.style.overflowX, 'auto')
  assert.deepEqual([...table.querySelectorAll('th[scope=col]')].map(cell => cell.textContent),
    ['المستوى', 'الطلبات', 'رموز الإدخال', 'رموز الإخراج', 'رموز الاستدلال', 'متوسط الوقت'])
  assert.match(table.textContent, /المستوى الافتراضي للمزوّد/)
  assert.match(table.textContent, /من/)
  const route = dialog.querySelector('li')
  assert.match(route.textContent, /المستوى الافتراضي للمزوّد/)
  assert.equal(route.querySelector('bdi').textContent, provider + ' / ' + model)
  assert.equal(route.querySelector('bdi').style.overflowWrap, 'anywhere')
  assert.doesNotMatch(dialog.textContent, /Aggregate counts|Nothing is sent|subagents|Provider default/)
  const reset = [...dialog.querySelectorAll('button')].find(button => button.textContent === 'إعادة ضبط الإحصائيات')
  await act(async () => reset.click())
  assert.match(dialog.querySelector('[role=status]').textContent, /تعذر تأكيد إعادة ضبط الإحصائيات/)
  const reload = [...dialog.querySelectorAll('button')].find(button => button.textContent === 'إعادة تحميل الإحصائيات')
  await act(async () => reload.click())
  assert.deepEqual(fixture.calls.map(call => call.path), ['stats', 'stats/reset', 'stats'])
})

test('archive protection never exposes ambiguous or unadmitted saved flags', async t => {
  const settings = settingsFixture('conversation-lifecycle', { ...archiveRecord, protectedIds: ['ambiguous', 'missing', 'active'] })
  const { hub } = await mountArchive(t, { settings: settings.service })
  assert.ok(protectionCheckbox(hub(), 'Protect Active work'))
  assert.doesNotMatch(hub().textContent, /Ambiguous title|missing/)
  assert.equal(settings.writes.length, 0)
})

test('Direct Chat history filters authorized metadata, pages it, and keeps native Session identity', async t => {
  const ids = Array.from({ length: 60 }, (_, index) => 'chat-' + index)
  const entries = ids.map((id, index) => [id, { id, title: 'Chat ' + index, displayTitle: 'Chat ' + index,
    running: false, updatedAt: index + 1 }])
  const settings = settingsFixture('conversation-lifecycle', { retention: 'forever', overrides: [], protectedIds: ['chat-59'] })
  const opened = [], renames = []
  const { div, window } = await mount(t, {
    settings: settings.service, hostLocale: 'en',
    workspaceItems: [{ workspaceId: 'real', title: 'Renamed', sessionIds: [...ids, 'hidden'] },
      { workspaceId: 'decoy', title: 'Direct Chat', sessionIds: ['project'] }],
    sessions: { phase: 'ready', ids: [...ids, 'project'],
      byId: Object.fromEntries([...entries, ['hidden', { id: 'hidden', displayTitle: 'Hidden local reference' }],
        ['project', { id: 'project', displayTitle: 'Unrelated Project' }]]) },
    onOpenSession: id => opened.push(id),
    async onSessionUsing(id, options, operation) {
      assert.equal(options.source, 'workspaceOperation')
      return operation({ binding: { session: { async rename(title) {
        renames.push([id, title])
        return { ok: renames.length > 1 }
      } } } })
    },
    async fetch(url) {
      assert.equal(url.pathname, '/api/abinadwan-direct-chat/catalog')
      return Response.json({ workspaceId: 'real',
        createdAt: url.searchParams.get('order') === 'creation'
          ? Object.fromEntries(ids.map((id, index) => [id, 1000 - index])) : undefined })
    },
  }, 'direct-chat', 'sidebar.session.action')
  const button = label => [...div.querySelectorAll('button')].find(item => item.textContent === label || item.getAttribute('aria-label') === label)
  const dialog = () => div.querySelector('[role=dialog]')
  await act(async () => button('Direct Chat history').click())
  assert.equal(dialog().querySelectorAll('li').length, 25)
  assert.match(dialog().querySelector('li').textContent, /Chat 59.*Protected/)
  assert.doesNotMatch(dialog().textContent, /Retention preview|Automatic cleanup/)
  assert.equal(button('Rename Chat 59'), undefined)
  await act(async () => button('Rename Chat 58').click())
  await act(async () => {
    const input = dialog().querySelector('form input')
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, 'Renamed test title')
    input.dispatchEvent(new window.Event('input', { bubbles: true }))
  })
  await act(async () => dialog().querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })))
  assert.deepEqual(renames, [['chat-58', 'Renamed test title']])
  assert.match(dialog().querySelector('form [role=alert]').textContent, /The name could not be saved/)
  assert.equal(dialog().querySelector('form input').value, 'Renamed test title')
  assert.match(dialog().querySelectorAll('li')[1].textContent, /^Chat 58/)
  await act(async () => dialog().querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })))
  assert.deepEqual(renames, [['chat-58', 'Renamed test title'], ['chat-58', 'Renamed test title']])
  assert.equal(dialog().querySelector('form'), null)
  assert.doesNotMatch(dialog().textContent, /Hidden local reference|Unrelated Project/)
  await act(async () => button('Next').click())
  assert.match(dialog().querySelector('li').textContent, /Chat 34/)
  await act(async () => {
    const field = dialog().querySelector('select')
    field.value = 'creation'
    field.dispatchEvent(new window.Event('change', { bubbles: true }))
  })
  assert.match(dialog().querySelector('li').textContent, /^Chat 0/)
  await act(async () => {
    const search = dialog().querySelector('input[type=search]')
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(search, 'cHaT 41')
    search.dispatchEvent(new window.Event('input', { bubbles: true }))
  })
  assert.equal(dialog().querySelectorAll('li').length, 1)
  await act(async () => button('Chat 41').click())
  assert.deepEqual(opened, ['chat-41'])
  assert.equal(dialog(), null)
})

test('Direct Chat title search reacts when the Host supplies previously unavailable metadata', async t => {
  const id = 'fictional-tail-session'
  const summary = { id, displayTitle: 'Direct Chat', blank: false }
  const { div, window, fixture } = await mount(t, {
    workspaceItems: [{ workspaceId: 'direct', title: 'Direct Chat', sessionIds: [id] }],
    sessions: { phase: 'ready', ids: [id], byId: { [id]: summary } },
    fetch: async () => Response.json({ workspaceId: 'direct' }),
  }, 'direct-chat', 'sidebar.session.action')
  await act(async () => div.querySelector('button[aria-label="Direct Chat history"]').click())
  const dialog = div.querySelector('[role=dialog]')
  const search = dialog.querySelector('input[type=search]')
  async function type(query) {
    await act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(search, query)
      search.dispatchEvent(new window.Event('input', { bubbles: true }))
    })
  }
  await type(id)
  assert.equal(dialog.querySelector('li bdi').textContent, 'Direct Chat')
  const title = 'Recovered fictional title'
  await type(title)
  assert.match(dialog.textContent, /No conversations match your search/)
  assert.match(dialog.textContent, /Some conversations have no title metadata/,
    'missing Host metadata must not be presented as exhaustive title search')
  const snapshot = fixture.sessions.getSnapshot()
  await act(async () => fixture.sessions.set({ ...snapshot,
    byId: { [id]: { ...summary, title, displayTitle: title } } }))
  assert.equal(dialog.querySelector('li bdi').textContent, title)
  assert.doesNotMatch(dialog.textContent, /Some conversations have no title metadata/)
})

test('Direct Chat uses an authorized cached projection title without opening a Session', async t => {
  const id = 'fictional-cold-session'
  const other = 'foreign-project-session'
  const { div, window } = await mount(t, {
    workspaceItems: [
      { workspaceId: 'direct', title: 'Direct Chat', sessionIds: [id] },
      { workspaceId: 'foreign', title: 'Other Workspace', sessionIds: [other] },
    ],
    sessions: { phase: 'ready', ids: [id, other],
      byId: {
        [id]: { id, displayTitle: 'Direct Chat', blank: false },
        [other]: { id: other, displayTitle: 'Other Workspace', blank: false },
      },
      projectionsBySession: {
        [id]: { values: { title: 'Pre-open native projection title' } },
        [other]: { values: { title: 'Foreign unapproved secret' } },
      },
    },
    fetch: async () => Response.json({ workspaceId: 'direct' }),
  }, 'direct-chat', 'sidebar.session.action')
  await act(async () => div.querySelector('button[aria-label="Direct Chat history"]').click())
  const dialog = div.querySelector('[role=dialog]')
  const search = dialog.querySelector('input[type=search]')
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')
      .set.call(search, 'native projection')
    search.dispatchEvent(new window.Event('input', { bubbles: true }))
  })
  assert.equal(dialog.querySelector('li bdi')?.textContent, 'Pre-open native projection title')
  assert.doesNotMatch(dialog.textContent, /Some conversations have no title metadata/)
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')
      .set.call(search, 'Foreign unapproved secret')
    search.dispatchEvent(new window.Event('input', { bubbles: true }))
  })
  assert.equal(dialog.querySelectorAll('li').length, 0,
    'search must never include a foreign Workspace projection')
})

test('Archive Manager fails closed when Workspace membership is malformed', async t => {
  const settings = settingsFixture('conversation-lifecycle', archiveRecord)
  const { hub } = await mountArchive(t, { settings: settings.service,
    workspaceItems: [{ workspaceId: 'broken', title: 'Malformed test fixture', sessionIds: null }] })
  assert.match(hub().textContent, /Archive catalog unavailable/)
  assert.equal(hub().querySelector('input[type=checkbox]'), null)
  assert.deepEqual(settings.writes, [])
})

test('Archive Manager refuses a stale protection write and preserves newer protection', async t => {
  const settings = settingsFixture('conversation-lifecycle', archiveRecord)
  const { hub, fixture } = await mountArchive(t, { settings: settings.service })
  const checkbox = () => protectionCheckbox(hub(), 'Protect Zulu report')
  await settings.service.replace('abinadwan-conversation-lifecycle', {
    record: { ...archiveRecord, protectedIds: ['protected-in-another-window'] },
  }, 1)
  await act(async () => checkbox().click())
  assert.match(hub().textContent, /Settings changed in another window/)
  assert.equal(settings.writes[1].revision, 1)
  assert.equal(settings.writes.length, 2)
  assert.deepEqual((await settings.service.describe()).value.namespaces[0].value.record.protectedIds, ['protected-in-another-window'])
  await act(async () => { fixture.ctx.emit('connection/reset') })
  assert.equal(checkbox().checked, false)
})

test('Archive Manager respects read-only protection and does not expose deletion or retention actions', async t => {
  const settings = settingsFixture('conversation-lifecycle', archiveRecord)
  const describe = settings.service.describe
  settings.service.describe = async () => {
    const result = await describe()
    return { ...result, value: { ...result.value, writable: false } }
  }
  const { hub } = await mountArchive(t, { settings: settings.service })
  assert.ok(hub().querySelectorAll('input[type=checkbox]').length > 0)
  assert.ok([...hub().querySelectorAll('input[type=checkbox]')].every(input => input.disabled))
  assert.doesNotMatch(hub().textContent, /Preview deletion|Retention Policy|Cleanup Management|Storage usage/)
  assert.deepEqual(settings.writes, [])
})

test('Archive Manager follows Arabic Host locale and changes language without changing stored IDs', async t => {
  const { hub, fixture } = await mountArchive(t, { hostLocale: 'ar' })
  assert.equal(hub().querySelector('[lang]').lang, 'ar')
  assert.equal(hub().querySelector('[dir]').dir, 'rtl')
  assert.match(hub().textContent, /المحادثات المؤرشفة/)
  assert.ok(protectionCheckbox(hub(), 'حماية Zulu report'))
  await act(async () => fixture.hostLocale.set({ active: 'en', revision: 1 }))
  assert.equal(hub().querySelector('[lang]').lang, 'en')
  assert.equal(hub().querySelector('[dir]').dir, 'ltr')
  assert.ok(protectionCheckbox(hub(), 'Protect Zulu report'))
})

test('Adaptive Reasoning composer localizes its accessible menu labels with Arabic Host locale', async t => {
  const fixture = reasoningFixture()
  fixture.options.hostLocale = 'ar'
  const view = await openReasoning(t, fixture)
  const trigger = view.trigger()
  assert.equal(trigger.getAttribute('lang'), 'ar')
  assert.equal(trigger.getAttribute('dir'), 'rtl')
  await view.open()
  assert.ok(view.item('حفظ مستوى الاستدلال الحالي'))
  assert.ok(view.item('إحصائيات الاستدلال…'))
  assert.ok(view.item('توصية مستوى الاستدلال…'))
  assert.doesNotMatch(view.div.textContent, /Save current effort/)
})


test('Direct Chat failed preparation offers an explicit retry and never reports a false open', async t => {
  let attempts = 0
  const opened = []
  const { div } = await mount(t, {
    onOpenSession: id => opened.push(id),
    onWorkspaceCreate: async input => ({
      workspaceId: 'synthetic-direct', title: 'Direct Chat', path: input.path,
    }),
    onConnectWorkspace: async () => 'synthetic-session',
    async fetch(url) {
      assert.equal(url, '/api/abinadwan-direct-chat/prepare')
      attempts++
      if (attempts === 1) return Response.json({ code: 'PREPARE_UNAVAILABLE' }, { status: 503 })
      return Response.json({ path: '/fictional-profile/abinadwan-direct-chat-data/Direct Chat' })
    },
    console: { warn() {} },
  }, 'direct-chat', 'sidebar.session.action')
  const first = div.querySelector('button[aria-label="Direct Chat"]')
  assert.ok(first)
  await act(async () => first.click())
  assert.deepEqual(opened, [], 'failed preparation cannot open a chat')
  assert.ok(div.querySelector('[role=alert]'), 'failure must be announced')
  const retry = div.querySelector('button[aria-label="Retry Direct Chat"]')
  assert.ok(retry, 'the retry control must be explicit and keyboard accessible')
  await act(async () => retry.click())
  assert.equal(attempts, 2)
  assert.deepEqual(opened, ['synthetic-session'])
  assert.equal(div.querySelector('[role=alert]'), null, 'successful retry removes stale error')
  assert.ok(div.querySelector('button[aria-label="Direct Chat"]'))
})


test('Direct Chat history retries a failed catalog without leaking nonadmitted Session metadata', async t => {
  let requests = 0
  const { div } = await mount(t, {
    hostLocale: 'en',
    workspaceItems: [{ workspaceId: 'authorized', title: 'Direct Chat',
      sessionIds: ['admitted', 'hidden'] }],
    sessions: { phase: 'ready', ids: ['admitted'],
      byId: { admitted: { id: 'admitted', displayTitle: 'Known fictional chat', running: false },
        hidden: { id: 'hidden', displayTitle: 'Hidden private canary', running: false } } },
    async fetch(url) {
      assert.equal(url.pathname, '/api/abinadwan-direct-chat/catalog')
      requests++
      return requests === 1
        ? Response.json({ code: 'DIRECT_CHAT_CATALOG_BUSY' }, { status: 409 })
        : Response.json({ workspaceId: 'authorized' })
    },
  }, 'direct-chat', 'sidebar.session.action')
  const history = div.querySelector('button[aria-label="Direct Chat history"]')
  assert.ok(history)
  await act(async () => history.click())
  assert.ok(div.querySelector('[role=alert]'), 'a server refusal must not look like an empty successful history')
  const retry = [...div.querySelectorAll('button')].find(button => button.textContent === 'Retry')
  assert.ok(retry, 'a recovery action must be visible')
  await act(async () => retry.click())
  assert.equal(requests, 2)
  assert.match(div.textContent, /Known fictional chat/)
  assert.doesNotMatch(div.textContent, /Hidden private canary/)
  assert.equal(div.querySelector('[role=alert]'), null)
})

test('failed protection save does not alter the flag and allows explicit revision-checked retry', async t => {
  const settings = settingsFixture('conversation-lifecycle', archiveRecord)
  const replace = settings.service.replace
  const revisions = []
  settings.service.replace = async (ns, value, revision) => {
    revisions.push(revision)
    if (revisions.length === 1) return refused('settings/unavailable', 'fixture write failure')
    return replace(ns, value, revision)
  }
  const { hub } = await mountArchive(t, { settings: settings.service })
  const checkbox = () => protectionCheckbox(hub(), 'Protect Zulu report')
  await act(async () => checkbox().click())
  assert.match(hub().textContent, /Save failed/)
  assert.equal(checkbox().checked, false)
  assert.deepEqual((await settings.service.describe()).value.namespaces[0].value.record.protectedIds, [])
  await act(async () => checkbox().click())
  assert.deepEqual(revisions, [1, 1])
  assert.deepEqual(Array.from((await settings.service.describe()).value.namespaces[0].value.record.protectedIds), ['s1'])
  assert.equal(checkbox().checked, true)
})

test('a failed statistics reset requires an authoritative reload before an explicit retry', async t => {
  const counts = { since: '2026-11-20T08:00:00.000Z', persistent: true, messages: 3,
    requests: { session: {}, subagent: {} } }
  let attempts = 0
  const fixture = reasoningFixture({ handlers: {
    stats: () => Response.json(counts),
    'stats/reset': () => ++attempts === 1 ? Response.json({}, { status: 503 })
      : Response.json({ ...counts, messages: 0 }),
  } })
  const view = await openReasoning(t, fixture)
  await view.open()
  await act(async () => view.item('Reasoning statistics…').click())
  const dialog = view.div.querySelector('[role=dialog]')
  const button = label => [...dialog.querySelectorAll('button')].find(node => node.textContent === label)
  await act(async () => button('Reset statistics').click())
  assert.match(dialog.textContent, /Statistics reset could not be confirmed/)
  assert.equal(button('Reset statistics').disabled, true)
  await act(async () => button('Reload statistics').click())
  assert.deepEqual(fixture.calls.map(call => call.path), ['stats', 'stats/reset', 'stats'])
  assert.match(dialog.textContent, /Total3/)
  await act(async () => button('Reset statistics').click())
  assert.deepEqual(fixture.calls.map(call => call.path), ['stats', 'stats/reset', 'stats', 'stats/reset'])
  assert.match(dialog.textContent, /Total0/)
})

test('effort save acknowledges its Host reply after a document notification without replacing refreshed state', async t => {
  const fixture = reasoningFixture()
  const replace = fixture.settings.service.replace
  const { div, fixture: browser } = await mount(t, fixture.options, 'adaptive-reasoning', 'conversation.input.right')
  fixture.settings.service.replace = async (ns, value, revision) => {
    const response = await replace(ns, value, revision)
    await replace(ns, { record: { preferences: [{ provider: 'provider', model: 'model', effort: 'wide-v2' }] } }, revision + 1)
    browser.events.get('settings/document-updated')()
    return response
  }
  const trigger = div.querySelector('button[aria-haspopup=menu]')
  await act(async () => trigger.click())
  await act(async () => [...div.querySelectorAll('[role=menuitem]')].find(row => row.textContent === 'Save current effort').click())
  assert.match(div.textContent, /Preference saved\./)
  await act(async () => trigger.click())
  assert.match(div.textContent, /Saved preference: Wide/)
})

test('effort save ignores a reply from before a connection reset', async t => {
  const fixture = reasoningFixture()
  const replace = fixture.settings.service.replace
  const { div, fixture: browser } = await mount(t, fixture.options, 'adaptive-reasoning', 'conversation.input.right')
  fixture.settings.service.replace = async (...args) => {
    const response = await replace(...args)
    browser.ctx.emit('connection/reset')
    return response
  }
  await act(async () => div.querySelector('button[aria-haspopup=menu]').click())
  await act(async () => [...div.querySelectorAll('[role=menuitem]')].find(row => row.textContent === 'Save current effort').click())
  assert.doesNotMatch(div.textContent, /Preference saved\./)
})

test('compact Arabic Direct Chat retains focus and localizes retry during a refused open', async t => {
  let finish, attempts = 0
  const { div } = await mount(t, { hostLocale: 'ar', fetch(url) {
    if (!String(url).includes('/api/abinadwan-direct-chat/prepare')) return Response.json({}, { status: 404 })
    attempts++
    return new Promise(resolve => { finish = resolve })
  } }, 'direct-chat', 'sidebar.session.action')
  const trigger = div.querySelector('[data-abinadwan-direct-chat] button')
  assert.equal(trigger.getAttribute('aria-label'), 'الدردشة المباشرة')
  trigger.focus()
  await act(async () => trigger.click())
  assert.equal(document.activeElement, trigger)
  assert.equal(trigger.disabled, false)
  assert.equal(trigger.getAttribute('aria-disabled'), 'true')
  await act(async () => trigger.click())
  assert.equal(attempts, 1)
  await act(async () => finish(Response.json({}, { status: 503 })))
  assert.equal(document.activeElement, trigger)
  assert.equal(trigger.getAttribute('aria-label'), 'إعادة محاولة فتح الدردشة المباشرة')
  assert.match(div.querySelector('[role=alert]').textContent, /تعذّر فتح/)
})

test('Arabic reasoning recommendation localizes dialog and status and isolates the effort label', async t => {
  const fixture = reasoningFixture({ record: { preferences: [], mode: 'adaptive' }, handlers: {
    recommend: () => Response.json({ recommendation: 'wide-v2', tier: 'complex', signals: ['math'] }),
  } })
  fixture.options.hostLocale = 'ar'
  const { div, open, item } = await openReasoning(t, fixture)
  await open()
  await act(async () => item('توصية مستوى الاستدلال…').click())
  const dialog = div.querySelector('[role=dialog]')
  assert.match(dialog.textContent, /توصية مستوى الاستدلال/)
  assert.ok(dialog.querySelector('[lang=ar][dir=rtl]'))
  const sample = dialog.querySelector('textarea')
  await act(async () => {
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(sample), 'value').set.call(sample, 'احسب هذا المثال')
    sample.dispatchEvent(new document.defaultView.Event('input', { bubbles: true }))
  })
  await act(async () => dialog.querySelector('form').dispatchEvent(
    new document.defaultView.Event('submit', { bubbles: true, cancelable: true })))
  const result = [...dialog.querySelectorAll('[role=status]')].at(-1)
  assert.match(result.textContent, /المستوى المقترح.*معقّد.*رياضيات/)
  assert.equal(result.querySelector('bdi').textContent, 'Wide')
  assert.deepEqual(fixture.calls.map(call => call.path), ['recommend'])
})

test('a delayed effort acknowledgement cannot appear on a different route', async t => {
  let acknowledge
  const fixture = reasoningFixture({ handlers: {
    effort: body => new Promise(resolve => {
      acknowledge = () => resolve(Response.json({ selected: {
        provider: body.provider, model: body.model, reasoningEffort: body.reasoningEffort,
      } }))
    }),
  } })
  const { div, open, item } = await openReasoning(t, fixture)
  await open()
  await act(async () => item('Wide').click())
  const { store } = fixture.options.modelDirectories.directoryFor()
  const snapshot = store.getSnapshot()
  const current = { ...snapshot.current, model: 'alternate' }
  const groups = [{ ...snapshot.groups[0], models: [
    ...snapshot.groups[0].models, { ...snapshot.groups[0].models[0], id: current.model },
  ] }]
  await act(async () => store.set({ ...snapshot, current, groups }))
  await act(async () => acknowledge())
  assert.equal(div.querySelector('button[aria-haspopup=menu]').textContent, 'Balanced')
  assert.doesNotMatch(div.textContent, /Effort changed\.|Harness could not change the effort/)
})
