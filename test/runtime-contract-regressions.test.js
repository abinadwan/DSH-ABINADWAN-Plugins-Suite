// Regressions for the three v0.6.1 failures found in real Windows Desktop
// testing. Every test runs against test-support/client.js, which models the
// Harness v0.2.2-rc.3 contracts (separate `remote.pluginManager` Cordis
// service, RemoteResult envelopes, list-entry abdication on render crash).
import test from 'node:test'
import assert from 'node:assert/strict'
import { clientHarness, base, tick, ok, refused, withProfile, activeRows } from '../test-support/client.js'

const profilePanel = base + '/personal-profile-page'
const pkgRef = (version = '0.6.2', rows = activeRows()) => ({
  name: base, version, installed: true, availability: 'profile', official: false, enabled: true,
  rows: rows.map(row => ({ rowId: row.entryId, moduleName: row.moduleName, enabled: row.enabled })),
})
const quiet = { warn() {}, error() {}, log() {} }
const notFound = async () => ({ ok: false, status: 404, json: async () => ({}) })

test('P1: the root plugin injects the Remote namespace it calls, as Cordis 4 requires', async t => {
  const app = await clientHarness({ fetch: notFound })
  t.after(() => app.dispose())
  assert.ok(app.plugin.inject.includes('remote.pluginManager'),
    'reading ctx.remote.pluginManager without this inject throws "cannot get property without inject"')
})

test('P1: Versions section renders for the suite bundle subject without crashing or abdicating', async t => {
  const app = await clientHarness({ fetch: notFound })
  t.after(() => app.dispose())
  const rendered = app.slots.renderList('plugins.detail.section',
    { subject: { kind: 'bundle', pkg: pkgRef() }, useRemoteAccess: () => true })
  assert.deepEqual(rendered.filter(item => item.error).map(item => String(item.error)), [])
  const versions = rendered.find(item => item.key === 'environment-sidebar-versions')
  assert.ok(versions?.node, 'the suite page shows a Versions section')
  // A second page open still renders: nothing was abdicated.
  const again = app.slots.renderList('plugins.detail.section', { subject: { kind: 'bundle', pkg: pkgRef() } })
  assert.ok(again.find(item => item.key === 'environment-sidebar-versions')?.node)
})

test('P1: Versions section renders nothing for other bundles, rows or official items', async t => {
  const app = await clientHarness({ fetch: notFound })
  t.after(() => app.dispose())
  for (const subject of [
    { kind: 'bundle', pkg: { ...pkgRef(), name: '@other/bundle' } },
    { kind: 'row', pkg: pkgRef(), row: { rowId: 'x', moduleName: base + '/humanizer', enabled: true } },
    { kind: 'item', id: 'settings' },
    undefined,
  ]) {
    const rendered = app.slots.renderList('plugins.detail.section', { subject })
    const versions = rendered.find(item => item.key === 'environment-sidebar-versions')
    assert.equal(versions.error, undefined)
    assert.equal(versions.node, null)
  }
})

test('P2: a RemoteResult inventory starts Environment & Context and registers its tab once', async t => {
  const app = await clientHarness({ fetch: notFound })
  t.after(() => app.dispose())
  assert.equal(app.tabs.records.size, 1, 'Environment tab type registered')
  const definition = app.tabs.records.get('environment-dashboard')
  assert.equal(definition.id, base + '/environment-context')
  assert.equal(app.entries('sidebar.right.pane.tab').length, 1)
  assert.equal(app.entries('conversation.session.header.utilities').length, 1)
})

test('P2: a refused or malformed Host inventory keeps components paused, then recovers', async t => {
  const warnings = []
  const app = await clientHarness({ fetch: notFound, console: { ...quiet, warn: (...a) => warnings.push(a.join(' ')) } })
  t.after(() => app.dispose())
  app.inventory(() => refused('access/denied', 'not allowed'))
  await app.changed()
  assert.equal(app.tabs.records.size, 0)
  assert.ok(warnings.some(text => /inventory unavailable/i.test(text)))
  app.inventory(() => ok({ not: 'an array' }))
  await app.changed()
  assert.equal(app.tabs.records.size, 0)
  app.inventory(() => app.rows())
  await app.changed()
  assert.equal(app.tabs.records.size, 1)
})

test('P3: My Profile is absent from Settings and the main sidebar while its component is Off', async t => {
  const app = await clientHarness({ fetch: notFound })
  t.after(() => app.dispose())
  assert.equal(app.rows().find(row => row.moduleName === base + '/personal-profile').enabled, false)
  assert.equal(app.slots.records.has('sidebar.panellist:' + profilePanel), false)
  assert.equal(app.slots.records.has(profilePanel), false)
  assert.equal(app.slots.records.has('abinadwan-profile-draft'), false)
})

test('P3: toggling My Profile adds and removes its Settings entry, icon, and draft without duplicates', async t => {
  const app = await clientHarness({ fetch: notFound })
  t.after(() => app.dispose())
  for (let round = 0; round < 3; round++) {
    app.setRows(withProfile(app.rows(), true))
    await app.changed()
    await app.changed()
    assert.equal(app.entries('settings.section').filter(x => x.options.id === profilePanel).length, 1)
    assert.equal(app.entries('settings.section.icon').filter(x => x.options.id === profilePanel).length, 1)
    assert.equal(app.entries('sidebar.panellist').filter(x => x.options.id === profilePanel).length, 0)
    assert.equal(app.entries('main').filter(x => x.options.key === profilePanel).length, 0)
    assert.equal(app.slots.records.get(profilePanel).options.label, 'My Profile')
    assert.ok(app.slots.records.has('abinadwan-profile-draft'))
    assert.equal(app.tabs.records.size, 1, 'Environment unaffected')
    app.setRows(withProfile(app.rows(), false))
    await app.changed()
    assert.equal(app.slots.records.has('sidebar.panellist:' + profilePanel), false)
    assert.equal(app.slots.records.has('settings.section.icon:' + profilePanel), false)
    assert.equal(app.slots.records.has(profilePanel), false)
    assert.equal(app.slots.records.has('abinadwan-profile-draft'), false)
    assert.equal(app.tabs.records.size, 1, 'Environment unaffected')
  }
})

test('P3: a stale draft render for a disabled Personal Profile row shows nothing', async t => {
  const app = await clientHarness({ fetch: notFound })
  t.after(() => app.dispose())
  app.setRows(withProfile(app.rows(), true))
  await app.changed()
  const draft = app.slots.records.get('abinadwan-profile-draft').component
  const disabledRows = withProfile(activeRows(), false)
  assert.equal(draft({ subject: { kind: 'bundle', pkg: pkgRef('0.6.2', disabledRows) } }), null)
  assert.equal(draft({ subject: { kind: 'row', pkg: pkgRef('0.6.2', disabledRows),
    row: { rowId: 'component-2', moduleName: base + '/personal-profile', enabled: false } } }), null)
  assert.ok(draft({ subject: { kind: 'bundle', pkg: pkgRef('0.6.2', withProfile(activeRows(), true)) } }))
})

test('suite disposal releases every registration, listener and timer', async () => {
  const app = await clientHarness({ fetch: notFound })
  app.setRows(withProfile(app.rows(), true))
  await app.changed()
  assert.ok(app.slots.records.size > 0)
  await app.dispose()
  await tick()
  assert.equal(app.slots.records.size, 0)
  assert.equal(app.tabs.records.size, 0)
  assert.equal(app.events.size, 0)
  assert.equal(app.intervals.size, 0)
  assert.equal(app.timers.size, 0)
  assert.equal(app.mountedListeners.size, 0)
  assert.equal(app.sessions.listeners.size, 0)
})


test('inventory failure logs omit sensitive Host exception content', async t => {
  const warnings = []
  const app = await clientHarness({ fetch: notFound,
    console: { ...quiet, warn: (...parts) => warnings.push(parts.map(String).join(' ')) } })
  t.after(() => app.dispose())
  const canary = 'SYNTHETIC_SECRET_ERROR_PATH_AND_TOKEN'
  app.inventory(() => { throw new Error('Private Host failure: ' + canary) })
  await app.changed()
  assert.ok(warnings.some(line => line.includes('Component inventory unavailable')),
    'the user can still diagnose an unavailable inventory')
  assert.ok(!warnings.join('\n').includes(canary), 'raw Host exception text must not reach browser logs')
})
