import assert from 'node:assert/strict'
import test from 'node:test'
import { inspectArchivedCandidates, readInspectRequest, InspectionUnavailable } from '../plugins/conversation-lifecycle/inspect.js'

const ID1 = '10000000-0000-4000-8000-000000000001'
const ID2 = '10000000-0000-4000-8000-000000000002'
const ID3 = '10000000-0000-4000-8000-000000000003'
const policy = { protectedIds: [], protectedWorkspaces: [] }
const WORKSPACE_PATH = 'C:\\profile\\workspace-a'
const DIRECT_PATH = 'C:\\profile\\abinadwan-direct-chat-data\\Direct Chat'

function fixture() {
  const workspaces = [{ id: 'owned', path: WORKSPACE_PATH, sessionIds: [ID1, ID2, ID3] }]
  const archived = [ID1, ID2, ID3]
  const pinned = []
  const calls = []
  const registry = {
    list: () => workspaces,
    get archivedSessionIds() { return archived },
    get pinnedSessionIds() { return pinned },
  }
  const persistence = {
    async stat(id) {
      calls.push(id)
      return { header: { id, cwd: WORKSPACE_PATH, origin: 'user', isSeeded: false },
        formatStatus: 'current', sizeBytes: 2048, revision: Symbol('synthetic') }
    },
  }
  const inspect = (ids, record = policy, getRecord = () => record, signal) =>
    inspectArchivedCandidates({ ids, registry, persistence, record,
      currentRecord: getRecord, signal })
  return { workspaces, archived, pinned, calls, registry, persistence, inspect }
}

function request(value, headers = { 'content-type': 'application/json' }) {
  return new Request('http://local.test/api/abinadwan-chat-control/inspect',
    { method: 'POST', headers, body: JSON.stringify(value) })
}

test('Host request parser rejects missing, duplicate, malformed and oversized ids', async () => {
  assert.deepEqual(await readInspectRequest(request({ sessionIds: [ID1, ID2] })), [ID1, ID2])
  for (const input of [
    {}, { sessionIds: [] }, { sessionIds: [ID1, ID1] },
    { sessionIds: [ID1], confirm: true }, { sessionIds: ['../escape'] },
    { sessionIds: [''], other: 'x' },
    { sessionIds: Array.from({ length: 21 }, (_, i) => 's' + i) },
    { sessionIds: [ID1, 12] },
  ]) assert.equal(await readInspectRequest(request(input)), null)
  assert.equal(await readInspectRequest(request({ sessionIds: [ID1] }, { 'content-type': 'text/plain' })), null)
  assert.equal(await readInspectRequest(request({ sessionIds: [ID1], padding: 'x'.repeat(6000) })), null)
})

test('Host preflight reads only metadata and never permits deletion', async () => {
  const h = fixture()
  const result = await h.inspect([ID1])
  assert.equal(result.mode, 'read-only')
  assert.equal(result.executable, false)
  assert.equal(result.inspected, 1)
  assert.deepEqual(result.rows, [{
    id: ID1, code: 'requires-deletion-transaction', storedBytes: 2048, deletable: false,
  }])
  assert.deepEqual(h.calls, [ID1])
})

test('Host rejects protected, non-archived, pinned, ambiguous and missing Sessions without opening logs', async () => {
  const h = fixture()
  h.archived.splice(1, 1)
  h.pinned.push(ID3)
  const protectedRow = await h.inspect([ID1], { protectedIds: [ID1], protectedWorkspaces: [] })
  assert.equal(protectedRow.rows[0].code, 'protected-session')
  assert.deepEqual(h.calls, [])
  assert.deepEqual((await h.inspect([ID2, ID3])).rows.map(r => r.code),
    ['not-archived', 'pinned-session'])
  h.workspaces.push({ id: 'other', path: 'C:\\profile\\other', sessionIds: [ID1] })
  assert.equal((await h.inspect([ID1])).rows[0].code, 'membership-unavailable')
  assert.deepEqual(h.calls, [])
  assert.equal((await h.inspect(['nonexistent'])).rows[0].code, 'membership-unavailable')
  assert.equal((await h.inspect([ID2], { protectedIds: [], protectedWorkspaces: ['owned'] })).rows[0].code, 'not-archived')
  h.archived.push(ID2)
  assert.equal((await h.inspect([ID2], { protectedIds: [], protectedWorkspaces: ['owned'] })).rows[0].code,
    'protected-workspace')
})

test('Host refuses derived and unknown storage without guessing a deletable path', async () => {
  const h = fixture()
  h.persistence.stat = async id => ({ header: { id, cwd: WORKSPACE_PATH, origin: 'subagent' }, formatStatus: 'current' })
  assert.equal((await h.inspect([ID1])).rows[0].code, 'dependent-session')
  h.persistence.stat = async id => ({ header: { id, cwd: WORKSPACE_PATH, parentSession: ID2 }, formatStatus: 'current' })
  assert.equal((await h.inspect([ID1])).rows[0].code, 'dependent-session')
  h.persistence.stat = async id => ({ header: { id, cwd: WORKSPACE_PATH, isSeeded: true }, formatStatus: 'current' })
  assert.equal((await h.inspect([ID1])).rows[0].code, 'dependent-session')
  h.persistence.stat = async id => ({ header: { id, cwd: WORKSPACE_PATH }, formatStatus: 'migration-required' })
  assert.equal((await h.inspect([ID1])).rows[0].code, 'format-unverified')
  h.persistence.stat = async () => undefined
  assert.equal((await h.inspect([ID1])).rows[0].code, 'storage-unavailable')
  h.persistence.stat = async () => ({ header: { id: ID2 }, formatStatus: 'current' })
  assert.equal((await h.inspect([ID1])).rows[0].code, 'storage-unavailable')
})

test('Host inspection excludes registered and legacy Direct Chat without authorizing deletion', async () => {
  const h = fixture()
  h.workspaces[0].path = DIRECT_PATH
  const registered = await h.inspect([ID1])
  assert.equal(registered.rows[0].code, 'direct-chat-requires-separate-verification')
  assert.deepEqual(h.calls, [], 'registered Direct Chat must be rejected before stat')
  h.workspaces[0].path = WORKSPACE_PATH
  h.persistence.stat = async id => ({
    header: { id, cwd: 'C:\\profile\\abinadwan-direct-chat-data\\session-legacy' },
    formatStatus: 'current',
  })
  const legacy = await h.inspect([ID1])
  assert.equal(legacy.rows[0].code, 'direct-chat-requires-separate-verification')
  assert.equal(legacy.executable, false)
  assert.equal(legacy.rows[0].deletable, false)
  h.persistence.stat = async id => ({ header: { id }, formatStatus: 'current' })
  assert.equal((await h.inspect([ID1])).rows[0].code, 'workspace-path-unverified')
  h.workspaces[0].path = 'relative/path'
  assert.equal((await h.inspect([ID1])).rows[0].code, 'workspace-path-unverified')
})

test('Host detects catalog and policy changes while waiting on storage metadata', async () => {
  const h = fixture()
  let resume
  h.persistence.stat = async id => {
    await new Promise(resolve => { resume = resolve })
    return { header: { id, cwd: WORKSPACE_PATH }, formatStatus: 'current' }
  }
  const running = h.inspect([ID1])
  await Promise.resolve()
  h.archived.splice(0, 1)
  resume()
  await assert.rejects(running, { code: 'catalog-changed' })
  const original = { protectedIds: [], protectedWorkspaces: [] }
  const changed = { protectedIds: [ID1], protectedWorkspaces: [] }
  h.archived.push(ID1)
  h.persistence.stat = async id => ({ header: { id, cwd: WORKSPACE_PATH }, formatStatus: 'current' })
  await assert.rejects(h.inspect([ID1], original, () => changed), { code: 'catalog-changed' })
})

test('Host refuses malformed or duplicate registries and malformed protection policy', async () => {
  const h = fixture()
  h.archived.push(ID1)
  await assert.rejects(h.inspect([ID1]), InspectionUnavailable)
  h.archived.pop()
  h.workspaces[0].sessionIds.push(ID1)
  await assert.rejects(h.inspect([ID1]), InspectionUnavailable)
  h.workspaces[0].sessionIds.pop()
  await assert.rejects(h.inspect([ID1], { protectedIds: null }), InspectionUnavailable)
  await assert.rejects(h.inspect([ID1], { protectedIds: [], protectedWorkspaces: 'bad' }), InspectionUnavailable)
})
