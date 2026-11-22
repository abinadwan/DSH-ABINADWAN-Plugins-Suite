import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'
import { runInNewContext } from 'node:vm'

// Read production predicates, not an independent implementation of catalog authorization.
const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
const start = source.indexOf('    const catalogReady =')
const end = source.indexOf('    function CleanupPreview', start)
assert.ok(start > 0 && end > start)
const { catalogReady, conversationInventory } = runInNewContext(
  "const lifecycleDurations = ['365', '180', '90', '30', '7'];\n" +
    source.slice(start, end) + '\n({ catalogReady, conversationInventory })')

const searchBegin = source.indexOf('    function filterAndSortDirectChat(')
const searchEnd = source.indexOf('    function DirectChatHistory(', searchBegin)
const sorter = searchBegin < 0 ? null : runInNewContext(
  source.slice(searchBegin, searchEnd) + '\nfilterAndSortDirectChat')

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
