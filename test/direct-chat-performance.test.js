import assert from 'node:assert/strict'
import test from 'node:test'
import { performance } from 'node:perf_hooks'
import { browserSource as source, browserSection, catalogReady, conversationInventory } from '../test-support/client-source.js'

// Exercise the delivered browser carrier, not a second implementation of its predicates.
const sorter = browserSection('    function filterAndSortDirectChat(', '    function DirectChatHistory(', 'filterAndSortDirectChat')

function build(count) {
  const ids = Array.from({ length: count }, (_, i) => 'direct-' + String(i).padStart(5, '0'))
  const workspace = { workspaceId: 'authorized', title: 'Direct Chat', sessionIds: ids }
  const workspaces = { phase: 'ready', state: 'ready', items: [
    workspace, { workspaceId: 'unrelated', title: 'Unrelated project', sessionIds: ['secret-project'] }],
    pinnedSessionIds: [], archivedSessionIds: [] }
  const rows = Object.fromEntries(ids.map((id, i) => [id, {
    id, displayTitle: i % 29 === 0 ? 'Match synthetic needle ' + i : 'Synthetic chat ' + i,
    running: false, updatedAt: count - i, createdAt: i
  }]))
  rows['secret-project'] = { id: 'secret-project', displayTitle: 'Synthetic secret workspace' }
  const sessions = { phase: 'ready', ids: [...ids, 'secret-project'],
    byId: rows, projectionsBySession: {} }
  return { workspace, workspaces, sessions }
}

test('phase 03: 100/1000/10000 authorized metadata-only browsing stays bounded', t => {
  assert.equal(typeof sorter, 'function', 'source must expose a testable bounded sorting helper')
  for (const count of [100, 1000, 10000]) {
    const { workspace, workspaces, sessions } = build(count)
    const begin = performance.now()
    assert.equal(catalogReady(workspaces, sessions), true)
    const inventory = conversationInventory(workspaces, sessions, workspace)
    assert.equal(inventory.unknown, 0)
    assert.equal(inventory.rows.length, count)
    const recent = sorter(inventory.rows, '', 'recent', false, null)
    const matches = sorter(inventory.rows, 'needle', 'recent', false, null)
    const missing = sorter(inventory.rows, 'secret workspace', 'recent', false, null)
    const elapsedMs = performance.now() - begin
    assert.equal(recent.length, count)
    assert.equal(matches.length, Math.ceil(count / 29))
    assert.equal(missing.length, 0, 'unauthorized Workspace titles never leak into results')
    assert.equal(recent[0].id, 'direct-00000')
    assert.equal(recent.at(-1).id, 'direct-' + String(count - 1).padStart(5, '0'))
    assert.ok(elapsedMs < 3500, `${count} metadata records took ${elapsedMs.toFixed(2)}ms`)
    t.diagnostic(`synthetic metadata inventory/search ${count} sessions: ${elapsedMs.toFixed(2)} ms; no transcript I/O`)
  }
})

test('phase 03: creation ordering never implies complete order when metadata is missing', () => {
  assert.equal(typeof sorter, 'function')
  const { workspace, workspaces, sessions } = build(100)
  const inventory = conversationInventory(workspaces, sessions, workspace).rows
  const creationTimes = Object.fromEntries(inventory.map(({ id }, i) => [id, i + 1]))
  const creation = sorter(inventory, '', 'creation', true, creationTimes)
  assert.equal(creation[0].id, 'direct-00099')
  const fallback = sorter(inventory, '', 'creation', false, null)
  assert.equal(fallback[0].id, 'direct-00000', 'missing creation data falls back to recent consistently')
  assert.match(source, /Showing last activity order/, 'UI must explicitly disclose fallback instead of silently suggesting creation sort')
  // No content bodies, transient IDs, or provider calls are consulted.
  assert.equal(source.includes('function filterAndSortDirectChat('), true)
})


test('phase 03: metadata search is Unicode-normalized, case-insensitive, stable and non-mutating', () => {
  const records = [
    { id: 'x-2', row: { displayTitle: 'Cafe\u0301 draft', updatedAt: 21 } },
    { id: 'x-1', row: { title: 'CAFÉ notes', updatedAt: 21 } },
    { id: 'x-3', row: { title: 'Unrelated', updatedAt: 19 } },
  ]
  const before = records.map(x => x.id).join(',')
  const found = sorter(records, ' café ', 'recent', false, null)
  assert.deepEqual(found.map(x => x.id).join(','), 'x-1,x-2')
  assert.equal(records.map(x => x.id).join(','), before, 'sorting must not mutate catalog inventory')
  const byId = sorter(records, 'X-2', 'recent', false, null)
  assert.deepEqual(byId.map(x => x.id).join(','), 'x-2')
  const untouched = sorter(records, '', 'recent', false, null)
  assert.equal(untouched.length, records.length)
})


test('Direct Chat searches titles from authorized summary projections without opening logs', () => {
  const { workspace, workspaces, sessions } = build(100)
  const recovered = 'direct-00099'
  const missing = 'direct-00098'
  const current = 'direct-00097'
  sessions.byId[recovered] = { id: recovered, displayTitle: 'Direct Chat', running: false, updatedAt: 3 }
  sessions.byId[missing] = { id: missing, displayTitle: 'Direct Chat', running: false, updatedAt: 2 }
  sessions.byId[current] = {
    id: current, title: 'Newest approved title', displayTitle: 'Newest approved title',
    projectionValues: { title: 'Stale projected title' }, running: false, updatedAt: 4,
  }
  sessions.projectionsBySession[recovered] = { values: { title: 'Cold résumé مثال عربي' } }
  sessions.projectionsBySession['secret-project'] = { values: { title: 'Foreign hidden needle' } }
  const inventory = conversationInventory(workspaces, sessions, workspace).rows
  const byId = Object.fromEntries(inventory.map(item => [item.id, item]))
  assert.equal(byId[recovered].searchTitle, 'Cold résumé مثال عربي')
  assert.equal(byId[missing].searchTitle, undefined, 'Host title omission stays explicit')
  assert.equal(byId[current].searchTitle, 'Newest approved title',
    'an authoritative row title wins over an older projection')
  assert.equal(sorter(inventory, 'RÉSUMÉ مثال', 'recent', false, null).length, 1)
  assert.equal(sorter(inventory, 'RÉSUMÉ مثال', 'recent', false, null)[0].id, recovered)
  assert.equal(sorter(inventory, missing, 'recent', false, null)[0].id, missing,
    'full ID search must still work without a title')
  assert.equal(sorter(inventory, 'Foreign hidden needle', 'recent', false, null).length, 0,
    'title projections from unrelated Workspaces are not searchable')
  assert.equal(sorter(inventory, 'Stale projected title', 'recent', false, null).length, 0,
    'a stale projection cannot displace a current row title')
})
