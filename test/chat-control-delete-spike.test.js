import assert from 'node:assert/strict'
import test from 'node:test'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import {
  FIXTURE_MARKER, SpikeRefusal, deleteDisposableFixture, recoverDisposableFixture,
} from '../test-support/chat-control-delete-transaction-spike.js'

const PROFILE = 'fixture-profile-only'
const SESSION = 'one'
const OTHER = 'two'
const expected = id => ({ sessionId: id, profileId: PROFILE, revision: 1, phrase: 'DELETE ' + id })

async function fixture(t, edit = () => {}) {
  const root = await mkdtemp(join(tmpdir(), 'chat-control-delete-fixture-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  for (const name of ['logs', 'quarantine', 'transactions']) await mkdir(join(root, name))
  await writeFile(join(root, 'fixture-only.marker'), FIXTURE_MARKER)
  await writeFile(join(root, 'shared-attachment.bin'), 'shared-content')
  const state = {
    profileId: PROFILE, revision: 1,
    workspaces: [
      { id: 'workspace-one', sessionIds: [SESSION] },
      { id: 'workspace-two', sessionIds: [OTHER] },
    ],
    archived: [SESSION, OTHER],
    active: [], protectedIds: [], pinned: [],
    sessions: {
      [SESSION]: { workspaceId: 'workspace-one', kind: 'ordinary', running: false },
      [OTHER]: { workspaceId: 'workspace-two', kind: 'ordinary', running: false },
    },
    searchIndex: { [SESSION]: ['one-index'], [OTHER]: ['two-index'] },
    tombstones: {},
  }
  edit(state)
  await writeFile(join(root, 'manifest.json'), JSON.stringify(state))
  await writeFile(join(root, 'logs', SESSION + '.jsonl'), 'fixture-record-one\n')
  await writeFile(join(root, 'logs', OTHER + '.jsonl'), 'fixture-record-two\n')
  return root
}
async function stateOf(root) { return JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8')) }
async function snapshot(root) {
  return {
    state: await stateOf(root),
    first: await readFile(join(root, 'logs', SESSION + '.jsonl'), 'utf8'),
    second: await readFile(join(root, 'logs', OTHER + '.jsonl'), 'utf8'),
    shared: await readFile(join(root, 'shared-attachment.bin'), 'utf8'),
  }
}
const deleteOne = (root, interruptAt) => deleteDisposableFixture(root, {
  sessionId: SESSION, confirmation: expected(SESSION), interruptAt,
})

test('Phase 05 fixture-only: one archived Session removes its fake log and index, never another Workspace', async t => {
  const root = await fixture(t)
  const before = await snapshot(root)
  assert.deepEqual(await deleteOne(root), { status: 'deleted-in-fixture', sessionId: SESSION })
  const state = await stateOf(root)
  assert.equal(state.revision, 2)
  assert.deepEqual(state.workspaces, [
    { id: 'workspace-one', sessionIds: [] }, { id: 'workspace-two', sessionIds: [OTHER] },
  ])
  assert.deepEqual(state.archived, [OTHER])
  assert.deepEqual(Object.keys(state.sessions), [OTHER])
  assert.deepEqual(state.searchIndex, { [OTHER]: ['two-index'] })
  assert.equal(typeof state.tombstones[SESSION], 'string')
  await assert.rejects(readFile(join(root, 'logs', SESSION + '.jsonl')), { code: 'ENOENT' })
  assert.equal(await readFile(join(root, 'logs', OTHER + '.jsonl'), 'utf8'), before.second)
  assert.equal(await readFile(join(root, 'shared-attachment.bin'), 'utf8'), before.shared)
  assert.deepEqual(await readdir(join(root, 'transactions')), [])
  assert.deepEqual(await readdir(join(root, 'quarantine')), [])
  assert.deepEqual(await recoverDisposableFixture(root), [])
})

for (const at of ['after-journal', 'after-quarantine']) {
  test('Phase 05 fixture-only: a simulated interruption ' + at + ' restores uncommitted history', async t => {
    const root = await fixture(t)
    const before = await snapshot(root)
    await assert.rejects(deleteOne(root, at), { code: 'simulated-interruption-' + at })
    assert.equal((await readdir(join(root, 'transactions'))).length, 1)
    assert.deepEqual(await recoverDisposableFixture(root), [
      { sessionId: SESSION, status: 'restored-fixture-log' },
    ])
    assert.deepEqual(await snapshot(root), before)
    assert.deepEqual(await readdir(join(root, 'quarantine')), [])
    assert.deepEqual(await readdir(join(root, 'transactions')), [])
    assert.deepEqual(await deleteOne(root), { status: 'deleted-in-fixture', sessionId: SESSION })
  })
}

test('Phase 05 fixture-only: post-commit interruption finalizes exactly once after restart', async t => {
  const root = await fixture(t)
  const before = await readFile(join(root, 'logs', OTHER + '.jsonl'), 'utf8')
  await assert.rejects(deleteOne(root, 'after-commit'), { code: 'simulated-interruption-after-commit' })
  assert.equal((await stateOf(root)).sessions[SESSION], undefined)
  assert.deepEqual(await recoverDisposableFixture(root), [
    { sessionId: SESSION, status: 'committed-fixture-delete' },
  ])
  assert.deepEqual(await recoverDisposableFixture(root), [])
  assert.deepEqual(await readdir(join(root, 'transactions')), [])
  assert.deepEqual(await readdir(join(root, 'quarantine')), [])
  await assert.rejects(readFile(join(root, 'logs', SESSION + '.jsonl')), { code: 'ENOENT' })
  assert.equal(await readFile(join(root, 'logs', OTHER + '.jsonl'), 'utf8'), before)
})

const refused = [
  ['unarchived', state => { state.archived = [OTHER] }, 'not-archived'],
  ['protected Session', state => { state.protectedIds = [SESSION] }, 'protected'],
  ['protected Workspace', state => { state.workspaces[0].protected = true }, 'protected'],
  ['pinned Session', state => { state.pinned = [SESSION] }, 'pinned'],
  ['active Session', state => { state.active = [SESSION] }, 'active'],
  ['running Session', state => { state.sessions[SESSION].running = true }, 'active'],
  ['subagent or other derived', state => { state.sessions[SESSION].kind = 'direct' }, 'dependent'],
  ['a child that shares a history', state => { state.sessions[OTHER].parentId = SESSION }, 'referenced'],
  ['another Session referencing this one', state => { state.sessions[OTHER].references = [SESSION] }, 'referenced'],
  ['ambiguous cross-Workspace membership', state => { state.workspaces[1].sessionIds.push(SESSION) }, 'ambiguous-membership'],
  ['missing search index', state => { delete state.searchIndex[SESSION] }, 'index-unverified'],
]
for (const [label, edit, code] of refused) {
  test('Phase 05 fixture-only: ' + label + ' fails closed without mutations', async t => {
    const root = await fixture(t, edit)
    const before = await snapshot(root)
    await assert.rejects(deleteOne(root), { code })
    assert.deepEqual(await snapshot(root), before)
    assert.deepEqual(await readdir(join(root, 'transactions')), [])
  })
}

test('Phase 05 fixture-only: missing or altered log metadata is refused without registry changes', async t => {
  const root = await fixture(t)
  const before = await stateOf(root)
  await rm(join(root, 'logs', SESSION + '.jsonl'))
  await assert.rejects(deleteOne(root), { code: 'log-unverified' })
  assert.deepEqual(await stateOf(root), before)
  assert.equal(await readFile(join(root, 'logs', OTHER + '.jsonl'), 'utf8'),
    'fixture-record-two\n')
  assert.deepEqual(await readdir(join(root, 'transactions')), [])
})

test('Phase 05 fixture-only: false confirmation, wrong Profile, stale revision and traversal cannot delete', async t => {
  const root = await fixture(t)
  const before = await snapshot(root)
  for (const confirmation of [
    { ...expected(SESSION), phrase: 'YES' },
    { ...expected(SESSION), profileId: 'different-profile' },
    { ...expected(SESSION), revision: 0 },
    { ...expected(SESSION), sessionId: OTHER },
  ]) {
    await assert.rejects(deleteDisposableFixture(root, { sessionId: SESSION, confirmation }),
      { code: 'stale-or-unconfirmed' })
  }
  await assert.rejects(deleteDisposableFixture(root, {
    sessionId: '../two', confirmation: { ...expected(SESSION), sessionId: '../two' },
  }), { code: 'stale-or-unconfirmed' })
  assert.deepEqual(await snapshot(root), before)
  const fakeNonFixture = await mkdtemp(join(tmpdir(), 'ordinary-profile-'))
  t.after(() => rm(fakeNonFixture, { force: true, recursive: true }))
  await assert.rejects(deleteDisposableFixture(fakeNonFixture, {
    sessionId: SESSION, confirmation: expected(SESSION),
  }), SpikeRefusal)
})

test('Phase 05 fixture-only: an incomplete transaction blocks new deletion until recovery', async t => {
  const root = await fixture(t)
  await assert.rejects(deleteOne(root, 'after-quarantine'), {
    code: 'simulated-interruption-after-quarantine',
  })
  await assert.rejects(deleteDisposableFixture(root, {
    sessionId: OTHER, confirmation: expected(OTHER),
  }), { code: 'recovery-required' })
  await recoverDisposableFixture(root)
  assert.deepEqual(await deleteDisposableFixture(root, {
    sessionId: OTHER, confirmation: expected(OTHER),
  }), { status: 'deleted-in-fixture', sessionId: OTHER })
})

test('Phase 05 fixture-only: stale confirmed revision cannot delete another Session', async t => {
  const root = await fixture(t)
  await deleteOne(root)
  await assert.rejects(deleteDisposableFixture(root, {
    sessionId: OTHER, confirmation: expected(OTHER),
  }), { code: 'stale-or-unconfirmed' })
  assert.equal(await readFile(join(root, 'logs', OTHER + '.jsonl'), 'utf8'),
    'fixture-record-two\n')
})

test('Phase 05 fixture-only: concurrent submissions cannot both commit the same deletion', async t => {
  const root = await fixture(t)
  const outcome = await Promise.allSettled([deleteOne(root), deleteOne(root)])
  assert.equal(outcome.filter(result => result.status === 'fulfilled').length, 1)
  assert.equal(outcome.filter(result => result.status === 'rejected').length, 1)
  assert.deepEqual(await recoverDisposableFixture(root), [])
  assert.deepEqual((await stateOf(root)).workspaces[1].sessionIds, [OTHER])
})

test('Phase 05 fixture-only: recovery refuses an altered Profile journal', async t => {
  const root = await fixture(t)
  await assert.rejects(deleteOne(root, 'after-quarantine'), {
    code: 'simulated-interruption-after-quarantine',
  })
  const [file] = await readdir(join(root, 'transactions'))
  const path = join(root, 'transactions', file)
  const journal = JSON.parse(await readFile(path, 'utf8'))
  journal.profileId = 'another-profile'
  await writeFile(path, JSON.stringify(journal))
  await assert.rejects(recoverDisposableFixture(root), { code: 'cross-profile-journal' })
  assert.equal((await readdir(join(root, 'transactions'))).length, 1,
    'uncertain foreign transaction must remain for manual investigation')
})
