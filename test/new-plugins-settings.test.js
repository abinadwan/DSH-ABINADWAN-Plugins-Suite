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
  'conversation-lifecycle': 'Conversation Lifecycle',
  'adaptive-reasoning': 'Adaptive Reasoning',
}

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

test('only Conversation Lifecycle owns a native Settings section and disposes it independently', async () => {
  const fixture = await clientHarness({ modelDirectories: {} })
  try {
    assert.equal(fixture.entries('settings.section').length, 0)
    const rows = [...fixture.rows(), ...Object.keys(names).map(id => ({
      moduleName: `${base}/${id}`, enabled: true, fiberPhase: 'active',
    }))]
    fixture.setRows(rows)
    await fixture.changed()
    const [section] = fixture.entries('settings.section')
    assert.deepEqual(fixture.entries('settings.section').map(entry => entry.options.id), ['abinadwan-conversation-lifecycle'])
    assert.deepEqual(fixture.entries('settings.section.icon').map(entry => entry.options.id), [section.options.id])
    assert.equal(fixture.entries('conversation.input.right').length, 1)
    assert.equal(fixture.entries('conversation.composer.dock').length, 0)
    fixture.setRows(rows.map(row => row.moduleName === `${base}/conversation-lifecycle` ? { ...row, enabled: false } : row))
    await fixture.changed()
    assert.equal(fixture.entries('settings.section').length, 0)
    assert.equal(fixture.entries('settings.section.icon').length, 0)
    assert.equal(fixture.entries('conversation.input.right').length, 1)
    fixture.setRows(rows.map(row => ({ ...row, enabled: false })))
    await fixture.changed()
    assert.equal(fixture.entries('conversation.input.right').length, 0)
  } finally { await fixture.dispose() }
})

async function mount(t, options, active, slot) {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const window = document.defaultView
  const div = document.createElement('main')
  document.body.append(div)
  const previousLanguage = document.documentElement.lang
  document.documentElement.lang = options.language ?? previousLanguage
  const fixture = await clientHarness({ React, document, ...options })
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
    sessions: { phase: 'ready', byId: Object.fromEntries(rows.map(([id, displayTitle, running]) => [id,
      { id, displayTitle, running, createdAt: old - 1000, updatedAt: old }])),
    projectionsBySession: { direct: { values: { agentPreset: 'abinadwan-direct-chat' } } } },
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
    ['Manual', 'Adaptive', 'Balanced', 'Wide'])
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

// Records built inside the client sandbox carry its realm's prototypes.
const plain = value => JSON.parse(JSON.stringify(value))

function reasoningFixture(t, { record = { preferences: [], mode: 'manual', subagents: 'inherit' }, handlers = {}, prompt } = {}) {
  const route = { provider: 'provider', model: 'model', reasoningEffort: 'balanced-v2' }
  const groups = [{ id: 'provider', models: [{ id: 'model', reasoning: {
    efforts: [{ id: 'balanced-v2', name: 'Balanced' }, { id: 'wide-v2', name: 'Wide' }], defaultEffort: 'balanced-v2',
  } }] }]
  const directory = { store: observable({ current: route, groups, status: 'ready', routable: true }), async load() {} }
  const settings = settingsFixture('adaptive-reasoning', record)
  const calls = []
  const listeners = new Set()
  let snapshot = { running: false }
  class Face {
    prompts = []
    async prompt(content, mode, signal, requestId) {
      this.prompts.push({ content, mode, requestId })
      return prompt ? prompt(requestId) : { ok: true, value: { accepted: true } }
    }
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) }
    getSnapshot() { return snapshot }
  }
  const face = new Face()
  return { route, directory, settings, calls, face, setRunning(running) {
    snapshot = { running }
    for (const listener of [...listeners]) listener()
  }, options: { language: 'en', modelDirectories: { directoryFor: () => directory }, settings: settings.service,
    sessions: { phase: 'ready', byId: { 'test-session': { running: false } } },
    sessionBinding: id => id === 'test-session' ? { session: face } : undefined,
    async fetch(url, options) {
      assert.equal(options.credentials, 'same-origin')
      const path = url.pathname.replace('/api/abinadwan-reasoning/', '')
      const body = JSON.parse(options.body)
      calls.push({ path, body })
      const handler = handlers[path]
      return handler ? handler(body) : Response.json({ error: 'unexpected' }, { status: 500 })
    } } }
}

async function openReasoning(t, fixture) {
  const { div } = await mount(t, fixture.options, 'adaptive-reasoning', 'conversation.input.right')
  const trigger = () => div.querySelector('button[aria-haspopup=menu]')
  const items = label => [...div.querySelectorAll('[role=menuitem]')].filter(button => button.textContent === label)
  const item = label => items(label)[0]
  const choose = async (label, index = 0) => {
    await act(async () => trigger().click())
    assert.ok(items(label)[index], `menu item ${label}`)
    await act(async () => items(label)[index].click())
  }
  // The first "Wide" is the session effort; the one-time choice is the second, in the Next message submenu.
  const arm = () => choose('Wide', 1)
  return { div, trigger, item, choose, arm }
}

test('mode and subagent policy save into the record without dropping saved preferences', async t => {
  const preferences = [{ provider: 'provider', model: 'model', effort: 'wide-v2' }]
  const fixture = reasoningFixture(t, { record: { preferences, mode: 'manual', subagents: 'inherit' } })
  const view = await openReasoning(t, fixture)
  await view.choose('Adaptive')
  assert.deepEqual(plain(fixture.settings.writes[0].value.record), { preferences, mode: 'adaptive', subagents: 'inherit' })
  assert.match(view.div.textContent, /Adaptive mode on/)
  assert.match(view.trigger().textContent, /Auto · Balanced/)
  assert.match(view.trigger().getAttribute('aria-label'), /Adaptive mode/)
  await view.choose('Always Wide')
  assert.deepEqual(plain(fixture.settings.writes[1].value.record),
    { preferences, mode: 'adaptive', subagents: 'effort', subagentEffort: 'wide-v2' })
  await view.choose('Same as this chat')
  assert.deepEqual(plain(fixture.settings.writes[2].value.record), { preferences, mode: 'adaptive', subagents: 'inherit' })
  await act(async () => view.trigger().click())
  assert.equal(view.item('Adaptive').getAttribute('aria-checked'), 'true')
  assert.equal(view.item('Same as this chat').getAttribute('aria-checked'), 'true')
  assert.deepEqual(fixture.calls, [], 'record changes need no Host route')
})

test('a one-time effort binds to the next prompt requestId, shows while armed and reports its outcome', async t => {
  const statuses = ['active', 'finished']
  const fixture = reasoningFixture(t, { handlers: {
    next: body => Response.json({ bound: body }),
    'next/status': () => Response.json({ status: statuses.shift() ?? 'finished', effort: 'wide-v2' }),
  } })
  const view = await openReasoning(t, fixture)
  await view.arm()
  assert.equal(fixture.calls.length, 0, 'arming sends nothing until a prompt is sent')
  assert.equal(view.trigger().textContent, 'Next: Wide')
  assert.match(view.trigger().getAttribute('aria-label'), /next message Wide/)
  assert.ok(Object.hasOwn(fixture.face, 'prompt'), 'the armed window wraps only its own session face')
  const requestId = '20000000-0000-4000-8000-000000000001'
  await act(async () => { await fixture.face.prompt([{ type: 'text', text: 'Fictional prompt' }], 'queue', undefined, requestId) })
  assert.deepEqual(fixture.calls[0], { path: 'next', body: { sessionId: 'test-session', requestId,
    provider: 'provider', model: 'model', reasoningEffort: 'wide-v2' } })
  assert.equal(fixture.face.prompts[0].requestId, requestId, 'the prompt keeps the bound requestId')
  assert.equal(Object.hasOwn(fixture.face, 'prompt'), false, 'the wrapper is gone after one prompt')
  assert.equal(view.trigger().textContent, 'Balanced')
  assert.deepEqual(fixture.calls[1], { path: 'next/status', body: { sessionId: 'test-session', requestId } })
  assert.match(view.div.textContent, /One-time effort applied: Wide/)
  await act(async () => fixture.setRunning(true))
  await act(async () => fixture.setRunning(false))
  await act(async () => { await fixture.face.prompt([{ type: 'text', text: 'Another' }], 'queue', undefined, 'other') })
  assert.equal(fixture.calls.filter(call => call.path === 'next').length, 1, 'later prompts carry no override')
  // A retry without its own id gets a fresh one minted for the binding.
  await view.arm()
  await act(async () => { await fixture.face.prompt([], 'queue', undefined, undefined) })
  const minted = fixture.face.prompts.at(-1).requestId
  assert.match(minted, /^[0-9a-f-]{36}$/)
  assert.equal(fixture.calls.filter(call => call.path === 'next').at(-1).body.requestId, minted)
})

test('a refused binding still sends the prompt, a failed send withdraws, and cancel or a model change disarms', async t => {
  let bindStatus = 409
  let sendOk = true
  const fixture = reasoningFixture(t, {
    handlers: {
      next: body => bindStatus === 200 ? Response.json({ bound: body }) : Response.json({ error: 'route-changed' }, { status: bindStatus }),
      'next/withdraw': () => Response.json({ withdrawn: true }),
      'next/status': () => Response.json({ status: 'pending' }),
    },
    prompt: () => sendOk ? { ok: true, value: { accepted: true } } : { ok: false, error: { code: 'x', message: 'refused' } },
  })
  const view = await openReasoning(t, fixture)
  const send = id => act(async () => { await fixture.face.prompt([{ type: 'text', text: 'x' }], 'queue', undefined, id) })
  await view.arm()
  await send('30000000-0000-4000-8000-000000000001')
  assert.equal(fixture.face.prompts.length, 1, 'the message is never held back')
  assert.match(view.div.textContent, /One-time effort not applied: the model changed/)
  bindStatus = 200
  sendOk = false
  await view.arm()
  await send('30000000-0000-4000-8000-000000000002')
  assert.deepEqual(fixture.calls.at(-1), { path: 'next/withdraw',
    body: { sessionId: 'test-session', requestId: '30000000-0000-4000-8000-000000000002' } })
  assert.match(view.div.textContent, /not applied: the message was not sent/)
  await view.arm()
  await view.choose('Cancel one-time effort')
  assert.equal(Object.hasOwn(fixture.face, 'prompt'), false)
  assert.equal(view.trigger().textContent, 'Balanced')
  await view.arm()
  await act(async () => fixture.directory.store.set({ ...fixture.directory.store.getSnapshot(),
    current: { provider: 'provider', model: 'other', reasoningEffort: 'balanced-v2' },
    groups: [{ id: 'provider', models: [{ id: 'model', reasoning: { efforts: [{ id: 'wide-v2' }] } },
      { id: 'other', reasoning: { efforts: [{ id: 'balanced-v2', name: 'Balanced' }] } }] }] }))
  assert.match(view.div.textContent, /One-time effort cancelled because the model changed/)
  assert.equal(Object.hasOwn(fixture.face, 'prompt'), false)
})

test('statistics open in a native dialog with honest reasoning-token labels and a reset', async t => {
  const empty = { since: '2026-11-20T08:00:00.000Z', persistent: false, messages: 0,
    sources: { override: 0, adaptive: 0, manual: 0, saved: 0, default: 0 }, tiers: { simple: 0, standard: 0, complex: 0, advanced: 0 },
    overrides: { applied: 0, notApplied: {} }, subagents: { applied: 0, notApplied: {} }, requests: { session: {}, subagent: {} },
    classifier: { runs: 0, totalMs: 0, maxMs: 0 } }
  const filled = { ...empty, messages: 3, sources: { ...empty.sources, override: 1, adaptive: 2 },
    tiers: { ...empty.tiers, simple: 1, advanced: 1 }, classifier: { runs: 2, totalMs: 0.004, maxMs: 0.003 },
    overrides: { applied: 1, notApplied: { 'shared-step': 1 } },
    requests: { session: { 'wide-v2': { requests: 2, inputTokens: 1200, outputTokens: 300, totalTokens: 0, totalReported: 0,
      reasoningTokens: 0, reasoningReported: 0, durationMs: 3000, timed: 2 } }, subagent: {} } }
  const fixture = reasoningFixture(t, { handlers: {
    stats: () => Response.json(filled), 'stats/reset': () => Response.json(empty),
  } })
  const view = await openReasoning(t, fixture)
  await view.choose('Reasoning statistics…')
  const dialog = view.div.querySelector('[role=dialog]')
  assert.equal(dialog.getAttribute('aria-label'), 'Reasoning statistics')
  assert.match(dialog.textContent, /Wide/)
  assert.match(dialog.textContent, /1,200/)
  assert.match(dialog.textContent, /Not reported/)
  assert.match(dialog.textContent, /1\.5 s/)
  assert.match(dialog.textContent, /it was sent together with another message/)
  assert.match(dialog.textContent, /No savings are estimated/)
  assert.match(dialog.textContent, /Nothing is sent anywhere/)
  assert.doesNotMatch(dialog.textContent, /\p{Script=Arabic}/u)
  const reset = [...dialog.querySelectorAll('button')].find(button => button.textContent === 'Reset statistics')
  await act(async () => reset.click())
  assert.deepEqual(fixture.calls.map(call => call.path), ['stats', 'stats/reset'])
  assert.match(view.div.querySelector('[role=dialog]').textContent, /No requests yet/)
})
