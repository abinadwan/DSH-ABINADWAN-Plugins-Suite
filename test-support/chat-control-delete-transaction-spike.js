// TEST-ONLY deletion transaction model for disposable, fictional fixture profiles.
// Not imported by the suite or registered with DSH; never point this at a real Profile.
// DSH currently has no public SessionPersistence.delete and no coordinated Host fence.
import { randomUUID } from 'node:crypto'
import { basename, join } from 'node:path'
import { lstat, open, readFile, readdir, realpath, rename, rm, unlink } from 'node:fs/promises'

export const FIXTURE_MARKER = 'ABINADWAN_DISPOSABLE_CHAT_CONTROL_DELETE_SPIKE_V1\n'
const ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/
const FOLDER_PREFIX = 'chat-control-delete-fixture-'

export class SpikeRefusal extends Error {
  constructor(code) {
    super(code)
    this.code = code
  }
}

const refuse = code => { throw new SpikeRefusal(code) }
const validId = value => typeof value === 'string' && ID.test(value)
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key)

async function regular(path) {
  try {
    const entry = await lstat(path)
    return entry.isFile() && !entry.isSymbolicLink()
  } catch (error) {
    if (error?.code === 'ENOENT') return false
    throw error
  }
}

async function fixturePaths(root) {
  if (typeof root !== 'string') refuse('not-a-disposable-fixture')
  let canonical
  try { canonical = await realpath(root) } catch { refuse('not-a-disposable-fixture') }
  if (!basename(canonical).startsWith(FOLDER_PREFIX)) refuse('not-a-disposable-fixture')
  const marker = join(canonical, 'fixture-only.marker')
  if (!await regular(marker) || await readFile(marker, 'utf8') !== FIXTURE_MARKER) {
    refuse('not-a-disposable-fixture')
  }
  for (const name of ['logs', 'quarantine', 'transactions']) {
    const entry = await lstat(join(canonical, name))
    if (!entry.isDirectory() || entry.isSymbolicLink()) refuse('unsafe-fixture-directory')
  }
  if (!await regular(join(canonical, 'manifest.json'))) refuse('unsafe-fixture-manifest')
  return { root: canonical, manifest: join(canonical, 'manifest.json'),
    logs: join(canonical, 'logs'), quarantine: join(canonical, 'quarantine'),
    transactions: join(canonical, 'transactions') }
}

async function lockFixture(paths, action) {
  const lock = join(paths.root, '.transaction.lock')
  let holder
  try { holder = await open(lock, 'wx', 0o600) }
  catch { refuse('fixture-locked') }
  try { return await action() }
  finally {
    await holder.close()
    await unlink(lock)
  }
}

async function atomicJson(path, value) {
  const temp = path + '.tmp-' + randomUUID()
  let handle
  try {
    handle = await open(temp, 'wx', 0o600)
    await handle.writeFile(JSON.stringify(value) + '\n')
    await handle.sync()
    await handle.close()
    handle = null
    await rename(temp, path)
  } finally {
    if (handle) await handle.close()
    await rm(temp, { force: true })
  }
}

async function manifestOf(paths) {
  const state = JSON.parse(await readFile(paths.manifest, 'utf8'))
  if (!state || typeof state !== 'object' || typeof state.profileId !== 'string' ||
      !Number.isSafeInteger(state.revision) || !Array.isArray(state.workspaces) ||
      !Array.isArray(state.archived) || !Array.isArray(state.active) ||
      !Array.isArray(state.protectedIds) || !Array.isArray(state.pinned) ||
      !state.sessions || typeof state.sessions !== 'object' ||
      !state.searchIndex || typeof state.searchIndex !== 'object' ||
      !state.tombstones || typeof state.tombstones !== 'object') refuse('invalid-fixture-state')
  return state
}

function assertCandidate(state, id, confirmation) {
  if (!validId(id) || !confirmation || confirmation.sessionId !== id ||
      confirmation.profileId !== state.profileId ||
      confirmation.revision !== state.revision ||
      confirmation.phrase !== 'DELETE ' + id) refuse('stale-or-unconfirmed')
  if (!own(state.sessions, id) || own(state.tombstones, id)) refuse('session-unavailable')
  const accounts = state.workspaces.filter(w => Array.isArray(w.sessionIds) && w.sessionIds.includes(id))
  if (accounts.length !== 1 || accounts[0].sessionIds.filter(key => key === id).length !== 1 ||
      state.sessions[id]?.workspaceId !== accounts[0].id) refuse('ambiguous-membership')
  if (!state.archived.includes(id)) refuse('not-archived')
  if (state.protectedIds.includes(id) || accounts[0].protected === true) refuse('protected')
  if (state.pinned.includes(id)) refuse('pinned')
  if (state.active.includes(id) || state.sessions[id].running === true) refuse('active')
  if (state.sessions[id].kind !== 'ordinary' || state.sessions[id].parentId) refuse('dependent')
  if (Object.values(state.sessions).some(row => row.parentId === id ||
      (Array.isArray(row.references) && row.references.includes(id)))) refuse('referenced')
  if (!own(state.searchIndex, id)) refuse('index-unverified')
}

function maybeCrash(at, expected) {
  if (at === expected) throw new SpikeRefusal('simulated-interruption-' + expected)
}

export async function deleteDisposableFixture(root, { sessionId, confirmation, interruptAt } = {}) {
  const paths = await fixturePaths(root)
  return lockFixture(paths, async () => {
    if ((await readdir(paths.transactions)).length) refuse('recovery-required')
    const state = await manifestOf(paths)
    assertCandidate(state, sessionId, confirmation)
    const original = join(paths.logs, sessionId + '.jsonl')
    if (!await regular(original)) refuse('log-unverified')
    const tx = randomUUID()
    const journal = join(paths.transactions, tx + '.json')
    const quarantined = join(paths.quarantine, tx + '.jsonl')
    const entry = { tx, id: sessionId, profileId: state.profileId,
      revision: state.revision, operation: 'fixture-delete' }
    await atomicJson(journal, entry)
    maybeCrash(interruptAt, 'after-journal')
    await rename(original, quarantined)
    maybeCrash(interruptAt, 'after-quarantine')

    // A single fixture manifest commits both membership and the fake index.
    // DSH does not expose such an atomic shared mutation in its public APIs.
    const next = structuredClone(state)
    next.revision += 1
    next.workspaces = next.workspaces.map(w => ({ ...w,
      sessionIds: w.sessionIds.filter(id => id !== sessionId) }))
    next.archived = next.archived.filter(id => id !== sessionId)
    delete next.sessions[sessionId]
    delete next.searchIndex[sessionId]
    next.tombstones[sessionId] = tx
    await atomicJson(paths.manifest, next)
    maybeCrash(interruptAt, 'after-commit')
    await unlink(quarantined)
    await unlink(journal)
    return { status: 'deleted-in-fixture', sessionId }
  })
}

export async function recoverDisposableFixture(root) {
  const paths = await fixturePaths(root)
  return lockFixture(paths, async () => {
    const outcomes = []
    for (const file of (await readdir(paths.transactions)).sort()) {
      if (!/^[0-9a-f-]{36}\.json$/.test(file)) refuse('unknown-fixture-transaction')
      const recordPath = join(paths.transactions, file)
      if (!await regular(recordPath)) refuse('unknown-fixture-transaction')
      const journal = JSON.parse(await readFile(recordPath, 'utf8'))
      if (journal?.operation !== 'fixture-delete' || !validId(journal.id) ||
          journal.tx + '.json' !== file) refuse('unknown-fixture-transaction')
      const state = await manifestOf(paths)
      if (journal.profileId !== state.profileId) refuse('cross-profile-journal')
      const original = join(paths.logs, journal.id + '.jsonl')
      const quarantined = join(paths.quarantine, journal.tx + '.jsonl')
      const [hasOriginal, hasQuarantine] = await Promise.all([
        regular(original), regular(quarantined),
      ])
      if (own(state.tombstones, journal.id) && state.tombstones[journal.id] === journal.tx) {
        if (hasOriginal || own(state.sessions, journal.id)) refuse('committed-state-conflict')
        if (hasQuarantine) await unlink(quarantined)
        await unlink(recordPath)
        outcomes.push({ sessionId: journal.id, status: 'committed-fixture-delete' })
      } else {
        if (state.revision !== journal.revision || !own(state.sessions, journal.id) ||
            hasOriginal === hasQuarantine) refuse('rollback-state-conflict')
        if (hasQuarantine) await rename(quarantined, original)
        await unlink(recordPath)
        outcomes.push({ sessionId: journal.id, status: 'restored-fixture-log' })
      }
    }
    return outcomes
  })
}
