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
  'conversation-lifecycle': 'Chat Control',
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

test('Direct Chat replaces the old settings UI with a top New Session action while Lifecycle stays isolated', async () => {
  const fixture = await clientHarness({ modelDirectories: {} })
  try {
    const rows = [...fixture.rows(), ...Object.keys(names).map(id => ({
      moduleName: `${base}/${id}`, enabled: true, fiberPhase: 'active',
    }))]
    fixture.setRows(rows)
    await fixture.changed()
    assert.ok(fixture.entries('sidebar.session.action').some(row => row.options.id === 'abinadwan-direct-chat'))
    assert.deepEqual(fixture.entries('settings.section').map(row => row.options.id), ['abinadwan-conversation-lifecycle'])
    assert.equal(fixture.entries('settings.section')[0].options.label, 'Chat Control')
    assert.equal(fixture.entries('conversation.input.right').length, 1)
    fixture.setRows(rows.map(row => row.moduleName === `${base}/direct-chat` ? { ...row, enabled: false } : row))
    await fixture.changed()
    assert.equal(fixture.entries('sidebar.session.action').length, 0)
    assert.deepEqual(fixture.entries('settings.section').map(row => row.options.id), ['abinadwan-conversation-lifecycle'])
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
    { ...injected, useRemoteAccess: () => true, useAccess: () => true })))
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

test('retention previews archived Workspace chats, excludes active and Direct chats, and waits for confirmation', async t => {
  const settings = settingsFixture('conversation-lifecycle', { retention: 'forever', overrides: [], protectedIds: [] })
  const old = Date.now() - 40 * 86400000
  const rows = [ ['cold', 'A cold chat', false], ['busy', 'A running chat', true], ['direct', 'A Direct chat', false] ]
  const { div, window } = await mount(t, {
    settings: settings.service, archivedSessionIds: ['cold'], language: 'ar',
    workspaceItems: [{ workspaceId: 'workspace-a', title: 'Fictional Workspace', sessionIds: rows.map(([id]) => id) }],
    sessions: { phase: 'ready', ids: rows.map(([id]) => id), byId: Object.fromEntries(rows.map(([id, displayTitle, running]) => [id,
      { id, displayTitle, running, createdAt: old - 1000, updatedAt: old }])),
    projectionsBySession: { cold: { values: { sessionListMetadata: { lastPromptAt: old } } },
      direct: { values: { agentPreset: 'abinadwan-direct-chat' } } } },
  }, 'conversation-lifecycle', 'settings.section')
  assert.equal(div.querySelector('section').lang, 'en')
  assert.equal(div.querySelector('section').dir, 'ltr')
  assert.deepEqual([...div.querySelectorAll('h2')].map(heading => heading.textContent),
    ['Overview', 'Retention Policy', 'Protected Conversations', 'Cleanup Management'])
  assert.deepEqual([...div.querySelectorAll('dd')].map(value => value.textContent), ['2', '1', 'Unavailable'])
  assert.doesNotMatch(div.textContent, /\p{Script=Arabic}/u)
  assert.doesNotMatch(div.textContent, /A Direct chat/)
  const retention = div.querySelectorAll('select')[1]
  await act(async () => {
    retention.value = '30'
    retention.dispatchEvent(new window.Event('change', { bubbles: true }))
  })
  assert.ok([...div.querySelectorAll('[role=status]')].some(status => status.textContent === '1 estimated candidate'))
  assert.deepEqual(settings.writes, [])
  await act(async () => [...div.querySelectorAll('button')].find(button => button.textContent === 'Confirm and save').click())
  assert.equal(settings.writes[0].revision, 1)
  assert.equal(settings.writes[0].value.record.retention, '30')
  await act(async () => div.querySelector('input[type=checkbox]').click())
  assert.deepEqual(Array.from(settings.writes[1].value.record.protectedIds), ['cold'])
  assert.equal(settings.writes[1].revision, 2)
})

test('retention confirmation expires when the underlying settings revision is reloaded', async t => {
  const settings = settingsFixture('conversation-lifecycle', { retention: 'forever', overrides: [], protectedIds: [] })
  const { div, window, fixture } = await mount(t, { settings: settings.service }, 'conversation-lifecycle', 'settings.section')
  const confirm = () => [...div.querySelectorAll('button')].find(button => button.textContent === 'Confirm and save')
  await act(async () => {
    const retention = div.querySelectorAll('select')[1]
    retention.value = '30'
    retention.dispatchEvent(new window.Event('change', { bubbles: true }))
  })
  assert.ok(confirm())
  await settings.service.replace('abinadwan-conversation-lifecycle', {
    record: { retention: 'forever', overrides: [], protectedIds: ['s1'] },
  }, 1)
  await act(async () => { fixture.ctx.emit('connection/reset') })
  assert.equal(Boolean(confirm()), false, 'a preview cannot overwrite protection saved by another window')
  assert.equal(div.querySelector('input[type=checkbox]').checked, true)
  assert.equal(settings.writes.length, 1)
})

test('a Workspace override leaves the global policy intact and can return to inheritance', async t => {
  const settings = settingsFixture('conversation-lifecycle', { retention: 'forever', overrides: [], protectedIds: [] })
  const { div, window } = await mount(t, { settings: settings.service }, 'conversation-lifecycle', 'settings.section')
  const change = async (field, value) => act(async () => {
    field.value = value
    field.dispatchEvent(new window.Event('change', { bubbles: true }))
  })
  const confirm = () => act(async () => [...div.querySelectorAll('button')]
    .find(button => button.textContent === 'Confirm and save').click())
  await change(div.querySelector('select'), 'w')
  const [, globalPolicy, override] = div.querySelectorAll('select')
  assert.equal(globalPolicy.value, 'forever')
  assert.equal(override.value, 'inherit')
  await change(override, '90')
  await confirm()
  assert.deepEqual(JSON.parse(JSON.stringify(settings.writes[0].value.record)),
    { retention: 'forever', overrides: [{ workspace: 'w', retention: '90' }], protectedIds: [] })
  await change(override, 'inherit')
  await confirm()
  assert.equal(settings.writes[1].value.record.overrides.length, 0)
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

test('retention previews enforce all UTC cutoffs and exclude unknown or protected records', async t => {
  const now = Date.now()
  const day = 86400000
  const durations = [365, 180, 90, 30, 7]
  const scoped = durations.map(days => ({
    workspaceId: 'w' + days, title: 'Workspace ' + days, sessionIds: ['edge' + days, 'recent' + days],
  }))
  scoped.push({ workspaceId: 'protected', title: 'Protected Workspace', sessionIds: ['protected-chat'] })
  scoped.push({ workspaceId: 'other', title: 'Other', sessionIds: ['unknown', 'ambiguous', 'uncatalogued', 'protected-session'] })
  scoped.push({ workspaceId: 'second', title: 'Second', sessionIds: ['ambiguous'] })
  const settings = settingsFixture('conversation-lifecycle', {
    retention: '7', overrides: durations.map(days => ({ workspace: 'w' + days, retention: String(days) })),
    protectedIds: ['protected-session'], protectedWorkspaces: ['protected'],
  })
  const ids = [...new Set(scoped.flatMap(workspace => workspace.sessionIds))].filter(id => id !== 'uncatalogued')
  const projectionsBySession = Object.fromEntries([...ids, 'uncatalogued'].filter(id => id !== 'unknown').map(id => {
    const days = Number(id.match(/\d+$/)?.[0]) || 365
    return [id, { values: { sessionListMetadata: { lastPromptAt: now - days * day + (id.startsWith('recent') ? 60000 : 0) } } }]
  }))
  const { div } = await mount(t, {
    settings: settings.service, workspaceItems: scoped,
    sessions: { phase: 'ready', ids, projectionsBySession,
      byId: Object.fromEntries([...ids, 'uncatalogued'].map(id => [id, { id, displayTitle: id, running: false }])) },
  }, 'conversation-lifecycle', 'settings.section')
  await act(async () => [...div.querySelectorAll('button')].find(button => button.textContent === 'Preview cleanup').click())
  assert.match(div.textContent, /5 estimated candidates/)
  assert.match(div.textContent, /Automatic cleanup is disabled/)
  assert.match(div.textContent, /Deletion is unavailable/)
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
        return { ok: true }
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
  assert.equal(button('Rename Chat 59'), undefined)
  await act(async () => button('Rename Chat 58').click())
  await act(async () => {
    const input = dialog().querySelector('form input')
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, 'Renamed test title')
    input.dispatchEvent(new window.Event('input', { bubbles: true }))
  })
  await act(async () => dialog().querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })))
  assert.deepEqual(renames, [['chat-58', 'Renamed test title']])
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


test('Chat Control fails closed when Workspace membership is malformed', async t => {
  const settings = settingsFixture('conversation-lifecycle',
    { retention: '7', overrides: [], protectedIds: [], protectedWorkspaces: [] })
  const { div } = await mount(t, {
    settings: settings.service,
    workspaceItems: [{ workspaceId: 'broken', title: 'Malformed test fixture', sessionIds: null }],
  }, 'conversation-lifecycle', 'settings.section')
  const preview = [...div.querySelectorAll('button')].find(button => button.textContent === 'Preview cleanup')
  assert.ok(preview, 'the preview action stays visible')
  assert.equal(preview.disabled, true, 'never allow preview from unverified catalog membership')
  assert.match(div.textContent, /Workspace inventory is unavailable/)
  assert.deepEqual(settings.writes, [])
})

test('Chat Control refuses stale concurrent policy confirmation and preserves newer protection', async t => {
  const settings = settingsFixture('conversation-lifecycle',
    { retention: 'forever', overrides: [], protectedIds: [], protectedWorkspaces: [] })
  const { div, window, fixture } = await mount(t, { settings: settings.service },
    'conversation-lifecycle', 'settings.section')
  const confirmation = () => [...div.querySelectorAll('button')]
    .find(button => button.textContent === 'Confirm and save')
  await act(async () => {
    const retention = div.querySelectorAll('select')[1]
    retention.value = '7'
    retention.dispatchEvent(new window.Event('change', { bubbles: true }))
  })
  assert.ok(confirmation())
  const replacement = { record: { retention: 'forever', overrides: [],
    protectedIds: ['protected-in-another-window'], protectedWorkspaces: [] } }
  assert.equal((await settings.service.replace('abinadwan-conversation-lifecycle', replacement, 1)).ok, true)
  await act(async () => { confirmation().click() })
  assert.match(div.textContent, /Settings changed in another window/)
  assert.equal(settings.writes.length, 2, 'external write and one rejected stale attempt')
  assert.equal(settings.writes[1].revision, 1, 'the stale UI did not forge a newer revision')
  const stored = (await settings.service.describe()).value.namespaces[0]
  assert.equal(stored.revision, 2)
  assert.deepEqual(stored.value.record.protectedIds, ['protected-in-another-window'])
  assert.equal(stored.value.record.retention, 'forever', 'rejected draft did not override current policy')
  await act(async () => { fixture.ctx.emit('connection/reset') })
  assert.equal(confirmation(), undefined, 'stale confirmation disappears when the catalog is reloaded')
})


test('Chat Control respects read-only settings permission and never offers a destructive operation', async t => {
  const settings = settingsFixture('conversation-lifecycle',
    { retention: '7', overrides: [], protectedIds: [], protectedWorkspaces: [] })
  const originalDescribe = settings.service.describe
  settings.service.describe = async () => {
    const result = await originalDescribe()
    return { ...result, value: { ...result.value, writable: false } }
  }
  const { div } = await mount(t, { settings: settings.service },
    'conversation-lifecycle', 'settings.section')
  assert.equal(div.querySelectorAll('select')[1].disabled, true,
    'read-only users must not change retention policies')
  assert.equal(div.querySelector('input[type=checkbox]').disabled, true,
    'read-only users must not change protection flags')
  assert.match(div.textContent, /Deletion is unavailable\. Automatic cleanup is disabled\./)
  assert.deepEqual(settings.writes, [])
})


test('Chat Control follows active Arabic Host locale and renders RTL labels without changing stored IDs', async t => {
  const settings = settingsFixture('conversation-lifecycle', {
    retention: 'forever', overrides: [], protectedIds: [], protectedWorkspaces: [],
  })
  const { div, fixture } = await mount(t, { settings: settings.service, hostLocale: 'ar' },
    'conversation-lifecycle', 'settings.section')
  const section = div.querySelector('section')
  assert.equal(section.lang, 'ar')
  assert.equal(section.dir, 'rtl')
  assert.deepEqual([...div.querySelectorAll('h2')].map(node => node.textContent),
    ['نظرة عامة', 'سياسة الاحتفاظ', 'المحادثات المحمية', 'إدارة التنظيف'])
  assert.match(div.textContent, /الحذف غير متاح/)
  assert.equal(div.querySelectorAll('select')[1].querySelector('option[value=forever]').textContent,
    'احتفاظ دائم')
  await act(async () => fixture.hostLocale.set({ active: 'en', revision: 1 }))
  assert.equal(div.querySelector('section').lang, 'en')
  assert.equal(div.querySelector('section').dir, 'ltr')
  assert.match(div.textContent, /Retention Policy/)
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
