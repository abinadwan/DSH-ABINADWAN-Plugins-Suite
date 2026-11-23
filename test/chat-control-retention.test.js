import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import test from 'node:test'

// Exercise the exact production preview predicates without exporting private UI internals.
const client = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
const start = client.indexOf('    const catalogReady =')
const end = client.indexOf('    function CleanupPreview', start)
assert.ok(start > 0 && end > start, 'the Chat Control source contract must stay identifiable')
const { catalogReady, conversationInventory, retentionRows } = runInNewContext(
  "const lifecycleDurations = ['365', '180', '90', '30', '7'];\n" +
    client.slice(start, end) + '\n({ catalogReady, conversationInventory, retentionRows })',
)
const normalized = value => JSON.parse(JSON.stringify(value))
const DAY = 86400000
const AT = Date.UTC(2026, 10, 22, 12)

function fixture() {
  const owned = { workspaceId: 'w', title: 'Synthetic', sessionIds: ['eligible'] }
  const workspaces = { phase: 'ready', state: 'ready', items: [owned], pinnedSessionIds: [], archivedSessionIds: [] }
  const sessions = { phase: 'ready', ids: ['eligible'], byId: {
    eligible: { id: 'eligible', running: false },
  }, projectionsBySession: {
    eligible: { values: { sessionListMetadata: { lastPromptAt: AT - 40 * DAY } } },
  } }
  return { workspaces, sessions }
}

test('phase 02: incomplete or malformed authorized catalogs are not considered ready', () => {
  const { workspaces, sessions } = fixture()
  assert.equal(catalogReady(workspaces, sessions), true)
  for (const invalid of [
    { ...workspaces, items: undefined },
    { ...workspaces, items: null },
    { ...workspaces, items: [{}] },
    { ...workspaces, items: [{ workspaceId: 'w', sessionIds: null }] },
    { ...workspaces, items: [{ workspaceId: 'w', sessionIds: 'eligible' }] },
  ]) {
    assert.equal(catalogReady(invalid, sessions), false,
      'malformed Workspace membership must fail closed, not crash or create candidates')
  }
  for (const invalid of [
    { ...sessions, byId: undefined },
    { ...sessions, byId: null },
    { ...sessions, byId: [] },
    { ...sessions, ids: null },
    { ...sessions, ids: ['eligible'], byId: { eligible: null } },
  ]) {
    assert.equal(catalogReady(workspaces, invalid), false,
      'incomplete Session metadata must not be accepted for retention previews')
  }
})

test('phase 02: all policy boundaries use last-prompt timestamps and exclude future dates', () => {
  const { workspaces, sessions } = fixture()
  for (const days of [7, 30, 90, 180, 365]) {
    const cutoff = AT - days * DAY
    for (const [offset, candidate] of [[-1, true], [0, true], [1, false]]) {
      sessions.projectionsBySession.eligible.values.sessionListMetadata.lastPromptAt = cutoff + offset
      const inventory = conversationInventory(workspaces, sessions, null)
      const result = retentionRows(inventory.rows, workspaces, { retention: String(days) }, AT)
      assert.equal(result.length, 1)
      assert.equal(result[0].candidate, candidate, `${days} days; offset from UTC cutoff ${offset}`)
    }
  }
  sessions.projectionsBySession.eligible.values.sessionListMetadata.lastPromptAt = AT - 400 * DAY
  assert.equal(retentionRows(conversationInventory(workspaces, sessions, null).rows,
    workspaces, { retention: 'forever' }, AT)[0].candidate, false)
  for (const invalid of [undefined, -1, 0, AT + 1, NaN, Infinity, 1.5]) {
    sessions.projectionsBySession.eligible.values.sessionListMetadata.lastPromptAt = invalid
    const row = retentionRows(conversationInventory(workspaces, sessions, null).rows,
      workspaces, { retention: '7' }, AT)[0]
    assert.equal(row.candidate, false, 'unknown or future activity must never qualify')
  }
})

test('phase 02: duplicate ownership, unknown, protected, pinned and active Sessions are never candidates', () => {
  const { workspaces, sessions } = fixture()
  const yesterday = AT - 400 * DAY
  workspaces.items[0].sessionIds = ['eligible', 'ambiguous', 'unknown', 'protected', 'workspace-protected', 'pinned', 'running', 'retained', 'migrating', 'direct']
  workspaces.items.push({ workspaceId: 'other', sessionIds: ['ambiguous', 'workspace-protected'] })
  // For the protected-workspace case use a separate isolated Workspace, not ambiguous membership.
  workspaces.items[0].sessionIds = workspaces.items[0].sessionIds.filter(id => id !== 'workspace-protected')
  const ids = ['eligible', 'ambiguous', 'protected', 'workspace-protected', 'pinned', 'running', 'retained', 'migrating', 'direct']
  sessions.ids = ids
  for (const id of ids) {
    sessions.byId[id] = { id, running: false }
    sessions.projectionsBySession[id] = { values: { sessionListMetadata: { lastPromptAt: yesterday } } }
  }
  sessions.byId.running.running = true
  sessions.byId.retained.retainedBy = { owner: 1 }
  sessions.byId.migrating.formatStatus = 'migration-required'
  sessions.byId.direct.agentPreset = 'abinadwan-direct-chat'
  workspaces.pinnedSessionIds = ['pinned']
  workspaces.archivedSessionIds = ['eligible', 'protected']
  const record = { retention: '7', protectedIds: ['protected'], protectedWorkspaces: ['other'] }
  const result = conversationInventory(workspaces, sessions, null)
  assert.equal(result.unknown, 2, 'ambiguous and unauthorised membership must be excluded')
  const rows = retentionRows(result.rows.filter(row => !row.legacyDirectChat), workspaces, record, AT)
  assert.deepEqual(normalized(rows.filter(row => row.candidate).map(row => row.id)), ['eligible'])
  for (const row of rows.filter(row => !row.candidate)) assert.notEqual(row.reason, 'Past retention cutoff')
})

test('phase 02: per-Workspace policy overrides and duplicate conflicts never silently fall back', () => {
  const { workspaces, sessions } = fixture()
  const rows = conversationInventory(workspaces, sessions, null).rows
  assert.equal(retentionRows(rows, workspaces, { retention: 'forever', overrides: [{ workspace: 'w', retention: '30' }] }, AT)[0].candidate, true)
  assert.equal(retentionRows(rows, workspaces, { retention: '7', overrides: [{ workspace: 'w', retention: 'forever' }] }, AT)[0].candidate, false)
  const duplicate = { retention: '7', overrides: [
    { workspace: 'w', retention: '7' }, { workspace: 'w', retention: '365' },
  ] }
  assert.equal(retentionRows(rows, workspaces, duplicate, AT)[0].candidate, false)
})
