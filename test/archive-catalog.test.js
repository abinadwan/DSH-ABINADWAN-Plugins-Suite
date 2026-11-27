import assert from 'node:assert/strict'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import { browserSource, catalogReady, conversationInventory } from '../test-support/client-source.js'

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

test('incomplete or malformed authorized catalogs are not considered ready', () => {
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
      'malformed Workspace membership must fail closed, not crash or admit rows')
  }
  for (const invalid of [
    { ...sessions, byId: undefined },
    { ...sessions, byId: null },
    { ...sessions, byId: [] },
    { ...sessions, ids: null },
    { ...sessions, ids: ['eligible'], byId: { eligible: null } },
  ]) {
    assert.equal(catalogReady(workspaces, invalid), false,
      'incomplete Session metadata must not be admitted')
  }
})


test('authorized inventory excludes ambiguous ownership, unadmitted, blank and subagent records', () => {
  const { workspaces, sessions } = fixture()
  workspaces.items[0].sessionIds.push('ambiguous', 'unknown', 'blank', 'subagent', 'wrong-id', 'legacy')
  workspaces.items.push({ workspaceId: 'other', sessionIds: ['ambiguous', 'outside'] })
  sessions.ids.push('ambiguous', 'blank', 'subagent', 'wrong-id', 'legacy', 'outside')
  for (const id of sessions.ids) sessions.byId[id] = { id, running: false }
  sessions.byId.blank.blank = true
  sessions.byId.subagent.origin = 'subagent'
  sessions.byId['wrong-id'].id = 'not-admitted'
  sessions.byId.legacy.agentPreset = 'abinadwan-direct-chat'
  const inventory = conversationInventory(workspaces, sessions, null)
  assert.equal(inventory.unknown, 2)
  assert.deepEqual(Array.from(inventory.rows, row => row.id), ['eligible', 'legacy', 'outside'])
  assert.equal(inventory.rows.find(row => row.id === 'legacy').legacyDirectChat, true)
  assert.deepEqual(Array.from(conversationInventory(workspaces, sessions, workspaces.items[0]).rows,
    row => row.id), ['eligible', 'legacy'])
  assert.equal(inventory.rows[0].lastPrompt, AT - 40 * DAY)
})

test('retired retention evaluation and destructive cleanup are not present in the delivered browser carrier', () => {
  assert.doesNotMatch(browserSource, /function (?:retentionRows|CleanupPreview|WorkspaceLifecycle|RetentionField)\(/)
  assert.doesNotMatch(browserSource, /Past retention cutoff/)
  assert.match(browserSource, /function ArchivePage\(/)
})


test('Archive page builds both lists with one authorized catalog traversal', () => {
  let traversals = 0
  const section = (start, end) => {
    const a = browserSource.indexOf(start)
    const b = browserSource.indexOf(end, a + start.length)
    assert.ok(a >= 0 && b > a)
    return browserSource.slice(a, b)
  }
  const { archivePageInventory, archiveInventory } = runInNewContext(
    section('    function archiveInventory(', '    function filterArchive(') +
    section('    function archivePageInventory(', '    function ArchivePage(') +
    '\n({ archivePageInventory, archiveInventory })',
    { conversationInventory: (...args) => { traversals++; return conversationInventory(...args) },
      titleOrEmpty: value => typeof value === 'string' ? value : '' })
  const { workspaces, sessions } = fixture()
  for (let i = 0; i < 1000; i++) {
    const id = 'synthetic-' + i
    workspaces.items[0].sessionIds.push(id)
    sessions.ids.push(id)
    sessions.byId[id] = { id, running: false, displayTitle: id }
    if (i % 2 === 0) workspaces.archivedSessionIds.push(id)
  }
  workspaces.items.push({ workspaceId: 'foreign', title: 'Foreign', sessionIds: ['synthetic-0', 'unauthorized'] })
  workspaces.items.push({ workspaceId: 'dup', title: 'Duplicate', sessionIds: ['duplicate'] },
    { workspaceId: 'dup', title: 'Duplicate', sessionIds: [] })
  sessions.ids.push('duplicate')
  sessions.byId.duplicate = { id: 'duplicate', running: false }
  workspaces.archivedSessionIds.push('unauthorized', 'duplicate')
  const record = { protectedIds: ['synthetic-0', 'synthetic-1', 'synthetic-2', 'unauthorized', 'duplicate'],
    protectedWorkspaces: ['w', 'dup'] }
  const result = archivePageInventory(workspaces, sessions, record)
  assert.equal(traversals, 1)
  assert.equal(result.rows.length, 499)
  assert.deepEqual(Array.from(result.savedRows, row => row.id), ['synthetic-1'])
  assert.deepEqual(Array.from(result.protectionWorkspaces, row => row.workspaceId), ['w'])
  assert.equal(result.rows.find(row => row.id === 'synthetic-2').individuallyProtected, true)
  assert.equal(result.rows.every(row => row.workspaceProtected), true)
  const fresh = archiveInventory(workspaces, sessions, record)
  assert.equal(traversals, 2, 'action-time inventory still independently validates current membership')
  assert.deepEqual(Array.from(result.rows, row => row.id), Array.from(fresh, row => row.id))
})
