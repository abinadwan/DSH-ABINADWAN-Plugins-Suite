import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, symlink, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { folderIdentity } from '../plugins/direct-chat/companion/storage-lease.js'
import { cleanupRecorded, profileNameFor, readManifest, writeManifest } from '../plugins/direct-chat/companion/grants.js'
import { removedWhileHostRuns } from '../plugins/direct-chat/index.js'
import { packageClosure, provisionRuntime, ROOT_PACKAGES } from '../plugins/direct-chat/host/runtime.js'
import {
  MARKER, QUARANTINE, StorageRefused, dataPaths, deleteAll, deleteChats, ensureDataFolders, inventory, migrateStorage,
  openStorage, prepareEmptyRoot, readSettings, retentionCandidates, writeSettings,
} from '../plugins/direct-chat/host/storage.js'

async function scratch(t) {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'direct-chat-host-')))
  t.after(() => rm(root, { recursive: true, force: true }))
  return root
}

const id = () => `session-${randomUUID()}`
async function chat(storage, sessionId, text, ageDays = 0) {
  const folder = join(storage, 'sessions', '--synthetic-root--', sessionId)
  await mkdir(folder, { recursive: true })
  const file = join(folder, 'session.v4.jsonl')
  await writeFile(file, `${JSON.stringify({ type: 'session', version: 4, id: sessionId })}\n${JSON.stringify({
    type: 'agent/inbox/spliced', data: { inserted: [{ content: [{ type: 'text', text }] }] } })}\n`)
  if (ageDays) {
    const when = new Date(Date.now() - ageDays * 86_400_000)
    await utimes(file, when, when)
    await utimes(folder, when, when)
  }
  return folder
}

test('plugin folders live under the Harness home and settings round-trip atomically', async t => {
  const root = await scratch(t)
  const paths = dataPaths({ DSH_HOME: join(root, 'home') })
  assert.equal(paths.root, join(root, 'home', 'abinadwan-direct-chat'))
  ensureDataFolders(paths)
  assert.equal((await openStorage(paths.defaultStorage, paths)).kind, 'empty')
  prepareEmptyRoot(paths.defaultStorage)
  assert.ok(existsSync(join(paths.defaultStorage, MARKER)))
  assert.deepEqual(readSettings(paths.state), { storage: null, retentionDays: null, previousStorage: null })
  writeSettings(paths.state, { storage: join(root, 'custom'), retentionDays: 30, previousStorage: null })
  assert.equal(readSettings(paths.state).retentionDays, 30)
  writeSettings(paths.state, { storage: 'relative/path', retentionDays: 12, previousStorage: null })
  assert.throws(() => readSettings(paths.state), StorageRefused)
})

test('a custom storage folder must be empty or Direct Chat storage, outside Harness and system folders', async t => {
  const root = await scratch(t)
  const env = { ...process.env, DSH_HOME: join(root, 'home'), DSH_AGENTS_HOME: join(root, 'agents') }
  const paths = dataPaths(env)
  ensureDataFolders(paths)
  const fresh = await openStorage(join(root, 'fresh'), paths, { env, create: true })
  assert.equal(fresh.kind, 'empty')
  assert.equal(fresh.path, join(root, 'fresh'))
  prepareEmptyRoot(paths.defaultStorage)
  await mkdir(join(root, 'busy'))
  await writeFile(join(root, 'busy', 'notes.txt'), 'unrelated user file')
  await assert.rejects(openStorage(join(root, 'busy'), paths, { env, create: true }), /empty folder or an existing Direct Chat/)
  await assert.rejects(openStorage(join(root, 'home', 'sessions'), paths, { env, create: true }), /outside the Harness home/)
  await mkdir(join(root, 'agents'))
  await assert.rejects(openStorage(join(root, 'agents', 'x'), paths, { env, create: true }), /outside the Harness home and agent/)
  await assert.rejects(openStorage(join(paths.state, 'inner'), paths, { env, create: true }), StorageRefused)
  await assert.rejects(openStorage('relative', paths, { env, create: true }), /absolute/)
  assert.equal((await openStorage(paths.defaultStorage, paths, { env, create: true })).kind, 'direct-chat')
  await assert.rejects(openStorage(join(root, 'missing', 'leaf'), paths, { env, create: true }), /parent folder/)
})

test('deleting one chat removes only its folder after a byte scan of the rest of the root', async t => {
  const storage = await scratch(t)
  prepareEmptyRoot(storage)
  const keep = id()
  const drop = id()
  await chat(storage, keep, 'Keep this synthetic chat')
  const folder = await chat(storage, drop, 'Delete this synthetic chat')
  await mkdir(join(storage, 'metadata'))
  await writeFile(join(storage, 'metadata', 'workspace.json'), '{"global":{"archivedSessionIds":[]}}')
  assert.equal((await inventory(storage)).length, 2)
  const result = await deleteChats(storage, [drop, `session-${randomUUID()}`])
  assert.deepEqual(result.deleted, [drop])
  assert.equal(result.missing.length, 1)
  assert.equal(existsSync(folder), false)
  assert.deepEqual((await inventory(storage)).map(entry => entry.id), [keep])
  assert.equal((await readdir(storage)).some(name => name.startsWith('.deleting-')), false)
  await assert.rejects(deleteChats(storage, ['../escape']), /Invalid chat selection/)
})

test('a chat identifier found anywhere else in the root blocks deletion and restores the chat', async t => {
  const storage = await scratch(t)
  prepareEmptyRoot(storage)
  const target = id()
  const folder = await chat(storage, target, 'Synthetic chat with a residue elsewhere')
  await chat(storage, id(), 'Other chat')
  await mkdir(join(storage, 'metadata'))
  await writeFile(join(storage, 'metadata', 'index.bin'), Buffer.concat([Buffer.from([0, 1, 2]),
    Buffer.from(target, 'utf16le'), Buffer.from([3])]))
  await assert.rejects(deleteChats(storage, [target]), /Chat data remains in metadata/)
  assert.ok(existsSync(join(folder, 'session.v4.jsonl')))
  assert.equal((await readdir(storage)).some(name => name.startsWith('.deleting-')), false)
})

test('Delete All empties the exclusive root but keeps the folder and its marker', async t => {
  const storage = await scratch(t)
  prepareEmptyRoot(storage)
  await chat(storage, id(), 'one')
  await chat(storage, id(), 'two')
  await writeFile(join(storage, 'search.sqlite'), 'synthetic index')
  const result = await deleteAll(storage)
  assert.ok(result.bytes > 0)
  assert.deepEqual(await readdir(storage), [MARKER])
})

test('migration copies and verifies every file, leaves the source untouched, and needs an empty target', async t => {
  const root = await scratch(t)
  const source = join(root, 'source')
  const target = join(root, 'target')
  await mkdir(target, { recursive: true })
  const sessionId = id()
  await chat(source, sessionId, 'Migrated synthetic chat')
  const result = await migrateStorage(source, target)
  assert.equal(result.files, 1)
  assert.deepEqual((await inventory(target)).map(entry => entry.id), [sessionId])
  assert.ok(existsSync(join(target, MARKER)))
  assert.deepEqual((await inventory(source)).map(entry => entry.id), [sessionId])
  await assert.rejects(migrateStorage(source, target), /empty target/)
})

test('retention previews only chats older than the policy and ignores unsupported periods', async t => {
  const storage = await scratch(t)
  const old = id()
  await chat(storage, old, 'Old synthetic chat', 45)
  await chat(storage, id(), 'Recent synthetic chat', 2)
  assert.deepEqual((await retentionCandidates(storage, 30)).map(entry => entry.id), [old])
  assert.deepEqual(await retentionCandidates(storage, 12), [])
  assert.equal((await inventory(storage)).find(entry => entry.id === old).preview, 'Old synthetic chat')
})

test('the runtime copy holds the companion files, its package closure and Node, and replaces older copies', async t => {
  const root = await scratch(t)
  const modules = join(root, 'host', 'node_modules')
  const make = async (name, manifest) => {
    await mkdir(join(modules, name, 'lib'), { recursive: true })
    await writeFile(join(modules, name, 'package.json'), JSON.stringify({ name, version: '1.0.0', ...manifest }))
    await writeFile(join(modules, name, 'lib', 'index.js'), `export default '${name}'`)
  }
  for (const name of ROOT_PACKAGES) await make(name, name === 'koffi' ? {} : { dependencies: { 'shared-dependency': '1' } })
  await make('shared-dependency', { optionalDependencies: { 'other-platform-only': '1' } })
  await mkdir(join(modules, 'koffi', 'node_modules', 'nested'), { recursive: true })
  await writeFile(join(modules, 'koffi', 'node_modules', 'nested', 'package.json'), '{"name":"nested"}')
  const node = join(root, 'node.exe')
  await writeFile(node, 'synthetic node executable')
  const closure = packageClosure(modules)
  assert.equal(closure.length, ROOT_PACKAGES.length + 1)
  const target = join(root, 'runtime')
  await mkdir(join(target, 'stale-copy'), { recursive: true })
  const first = await provisionRuntime(target, { modules, node })
  assert.deepEqual(await readdir(target), [first.key])
  assert.equal(await readFile(first.node, 'utf8'), 'synthetic node executable')
  assert.ok(existsSync(join(first.app, 'worker.js')) && existsSync(join(first.app, 'launcher.mjs')))
  assert.ok(existsSync(join(first.runtime, 'node_modules', '@deepseek-ai', 'dsh-session', 'lib', 'index.js')))
  assert.equal(existsSync(join(first.runtime, 'node_modules', 'koffi', 'node_modules')), false)
  assert.equal(first.info.packages, closure.length)
  const again = await provisionRuntime(target, { modules, node })
  assert.equal(again.key, first.key)
  await rm(join(modules, '@deepseek-ai', 'dsh-session'), { recursive: true })
  await assert.rejects(provisionRuntime(target, { modules, node }), /Harness package is missing: @deepseek-ai\/dsh-session/)
})

test('access is withdrawn only when Direct Chat itself is removed while the Host keeps running', () => {
  const rootFiber = { uid: 0, state: 2 }
  const rootContext = { fiber: rootFiber }
  rootFiber.parent = rootContext
  const loader = { uid: 3, state: 2, parent: rootContext }
  const loaderContext = { fiber: loader }
  const plugin = (uid, parentState = 2) => {
    loader.state = parentState
    return { fiber: { uid, parent: loaderContext } }
  }
  assert.equal(removedWhileHostRuns(plugin(null)), true, 'turned off or uninstalled')
  assert.equal(removedWhileHostRuns(plugin(7)), false, 'a dependency reload keeps the fiber')
  assert.equal(removedWhileHostRuns(plugin(null, 5)), false, 'the Host or package is unloading')
})

test('linked layouts resolve each package once, survive cycles and nest conflicting versions', async t => {
  const root = await scratch(t)
  const modules = join(root, 'host', 'node_modules')
  const store = join(root, 'store')
  const write = async (folder, manifest) => {
    await mkdir(folder, { recursive: true })
    await writeFile(join(folder, 'package.json'), JSON.stringify(manifest))
  }
  const link = (target, path) => mkdir(dirname(path), { recursive: true }).then(() => symlink(target, path, 'junction'))
  // pnpm-style store: cycle-a <-> cycle-b are siblings of each other; conflict@1 is a sibling of cycle-b.
  await write(join(store, 'cycle-a@1', 'node_modules', 'cycle-a'), { name: 'cycle-a', version: '1.0.0', dependencies: { 'cycle-b': '1' } })
  await write(join(store, 'cycle-b@1', 'node_modules', 'cycle-b'), { name: 'cycle-b', version: '1.0.0', dependencies: { 'cycle-a': '1', conflict: '1' } })
  await write(join(store, 'conflict@1', 'node_modules', 'conflict'), { name: 'conflict', version: '1.0.0' })
  await write(join(store, 'conflict@2', 'node_modules', 'conflict'), { name: 'conflict', version: '2.0.0' })
  await link(join(store, 'cycle-b@1', 'node_modules', 'cycle-b'), join(store, 'cycle-a@1', 'node_modules', 'cycle-b'))
  await link(join(store, 'cycle-a@1', 'node_modules', 'cycle-a'), join(store, 'cycle-b@1', 'node_modules', 'cycle-a'))
  await link(join(store, 'conflict@1', 'node_modules', 'conflict'), join(store, 'cycle-b@1', 'node_modules', 'conflict'))
  for (const name of ROOT_PACKAGES) {
    await write(join(modules, name), { name, version: '1.0.0',
      dependencies: name === 'koffi' ? { conflict: '2' } : name === '@deepseek-ai/cordis' ? { 'cycle-a': '1' } : {} })
  }
  await link(join(store, 'cycle-a@1', 'node_modules', 'cycle-a'), join(modules, 'cycle-a'))
  await link(join(store, 'conflict@2', 'node_modules', 'conflict'), join(modules, 'conflict'))
  const closure = packageClosure(modules)
  const paths = Object.fromEntries(closure.map(entry => [entry.path, entry.version]))
  assert.equal(paths['node_modules/cycle-a'], '1.0.0')
  assert.equal(paths['node_modules/cycle-b'], '1.0.0')
  // cordis is placed first, so its transitive conflict@1 takes the top slot and koffi gets its own conflict@2.
  assert.equal(paths['node_modules/conflict'], '1.0.0')
  assert.equal(paths['node_modules/koffi/node_modules/conflict'], '2.0.0')
  assert.equal(paths['node_modules/cycle-b/node_modules/conflict'], undefined)
  assert.equal(closure.length, ROOT_PACKAGES.length + 4)
})

test('a storage marker copied into another directory does not authorize that directory', async t => {
  const root = await scratch(t)
  const env = { ...process.env, DSH_HOME: join(root, 'home') }
  const paths = dataPaths(env)
  ensureDataFolders(paths)
  prepareEmptyRoot(paths.defaultStorage)
  await mkdir(join(root, 'other'))
  const target = join(root, 'other')
  await writeFile(join(target, MARKER), await readFile(join(paths.defaultStorage, MARKER)))
  await writeFile(join(target, 'owner-notes.txt'), 'Preserve this synthetic file')
  await assert.rejects(openStorage(target, paths, { env, create: true }), StorageRefused)
  assert.equal(await readFile(join(target, 'owner-notes.txt'), 'utf8'), 'Preserve this synthetic file')
})

test('unrecognized quarantine data remains intact and prevents Delete All', async t => {
  const storage = await scratch(t)
  prepareEmptyRoot(storage)
  const quarantine = join(storage, '.deleting-interrupted')
  await mkdir(quarantine)
  const saved = join(quarantine, 'previous-chat.jsonl')
  await writeFile(saved, 'preserve this interrupted deletion')
  await assert.rejects(deleteAll(storage), StorageRefused)
  assert.equal(await readFile(saved, 'utf8'), 'preserve this interrupted deletion')
})

test('failed rollback preserves both the quarantined chat and the replacement until recovery can retry', async t => {
  const root = await scratch(t)
  const paths = dataPaths({ DSH_HOME: join(root, 'synthetic-home') })
  const storage = join(root, 'storage')
  await mkdir(storage)
  const marker = prepareEmptyRoot(storage)
  const target = id()
  const folder = await chat(storage, target, 'Original data to recover')
  await mkdir(join(storage, 'metadata'))
  await writeFile(join(storage, 'metadata', 'ref.txt'), target)
  const io = { check() {}, move(from, to) {
    renameSync(from, to)
    if (from === folder) {
      mkdirSync(folder)
      writeFileSync(join(folder, 'replacement.txt'), 'Keep the replacement too')
    }
  } }
  await assert.rejects(deleteChats(storage, [target], io), /Quarantined data was preserved/)
  const saved = join(storage, QUARANTINE, '0', 'session.v4.jsonl')
  assert.match(await readFile(saved, 'utf8'), /Original data to recover/)
  assert.equal(await readFile(join(folder, 'replacement.txt'), 'utf8'), 'Keep the replacement too')
  await assert.rejects(openStorage(storage, paths, { expected: marker.id }), /Conflicting Direct Chat recovery data/)
  const replacement = join(root, 'replacement')
  await rename(folder, replacement)
  await openStorage(storage, paths, { expected: marker.id })
  assert.match(await readFile(join(folder, 'session.v4.jsonl'), 'utf8'), /Original data to recover/)
  assert.equal(await readFile(join(replacement, 'replacement.txt'), 'utf8'), 'Keep the replacement too')
  assert.equal(existsSync(join(storage, QUARANTINE)), false)
})

test('a new Host rolls back quarantine left by a process killed during a deletion', { timeout: 15000 }, async t => {
  const root = await scratch(t)
  const paths = dataPaths({ DSH_HOME: join(root, 'synthetic-home') })
  const storage = join(root, 'storage')
  await mkdir(storage)
  const marker = prepareEmptyRoot(storage)
  const target = id()
  const folder = await chat(storage, target, 'Survives Host termination')
  const plugin = new URL('../plugins/direct-chat/host/storage.js', import.meta.url).href
  const childCode = [
    'import { renameSync, writeSync } from "node:fs"',
    'import { deleteChats } from ' + JSON.stringify(plugin),
    'const [root, target] = process.argv.slice(1)',
    'await deleteChats(root, [target], { check() {}, move(from, to) {',
    '  renameSync(from, to)',
    '  if (from.includes(target)) {',
    '    writeSync(1, "moved")',
    '    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0)',
    '  }',
    '} })',
  ].join('\n')
  const worker = spawn(process.execPath, ['--input-type=module', '--eval', childCode, storage, target],
    { windowsHide: true, stdio: ['ignore', 'pipe', 'inherit'] })
  const exited = once(worker, 'exit')
  try {
    const moved = once(worker.stdout, 'data').then(([chunk]) => chunk.toString())
    assert.equal(await Promise.race([moved, exited]), 'moved')
    assert.equal(existsSync(folder), false)
    assert.match(await readFile(join(storage, QUARANTINE, '0', 'session.v4.jsonl'), 'utf8'), /Survives Host/)
  } finally {
    worker.kill()
    await exited
  }
  await openStorage(storage, paths, { expected: marker.id })
  assert.match(await readFile(join(folder, 'session.v4.jsonl'), 'utf8'), /Survives Host termination/)
  assert.equal(existsSync(join(storage, QUARANTINE)), false)
})

test('restart finishes a committed purge without touching another directory', async t => {
  const root = await scratch(t)
  const paths = dataPaths({ DSH_HOME: join(root, 'synthetic-home') })
  const storage = join(root, 'storage')
  await mkdir(storage)
  const marker = prepareEmptyRoot(storage)
  const target = id()
  const folder = await chat(storage, target, 'Committed deletion')
  const keep = await chat(storage, id(), 'Unrelated chat')
  const q = join(storage, QUARANTINE)
  await mkdir(q)
  await writeFile(join(q, 'committed.json'), JSON.stringify({ version: 1, kind: 'delete', key: folderIdentity(storage),
    id: marker.id, paths: [['sessions', '--synthetic-root--', target]] }))
  await rename(folder, join(q, '0'))
  await openStorage(storage, paths, { expected: marker.id })
  assert.equal(existsSync(folder), false)
  assert.equal(existsSync(q), false)
  assert.match(await readFile(join(keep, 'session.v4.jsonl'), 'utf8'), /Unrelated chat/)
})

test('ACL and profile removal failures each persist the information needed for retry', async t => {
  const state = await scratch(t)
  const profile = profileNameFor(state)
  const grant = { path: join(state, 'synthetic-storage'), sid: 'S-1-15-2-1-2-3-4-5-6-7', profile, rights: 'M' }
  writeManifest(state, { profiles: [profile], grants: [grant] })
  const denied = () => { throw new Error('simulated Windows denial') }
  assert.equal(cleanupRecorded(state, { revoke: denied, remove: () => assert.fail('grant not removed') }).length, 1)
  assert.deepEqual(readManifest(state), { profiles: [profile], grants: [grant] })
  assert.equal(cleanupRecorded(state, { revoke() {}, remove: denied }).length, 1)
  assert.deepEqual(readManifest(state), { profiles: [profile], grants: [] })
  assert.equal(cleanupRecorded(state, { revoke: () => assert.fail('grant already removed'), remove() {} }).length, 0)
  assert.deepEqual(readManifest(state), { profiles: [], grants: [] })
})

test('a profile registered before ACL provisioning is still cleaned after startup fails', async t => {
  const state = await scratch(t)
  const profile = profileNameFor(state)
  writeManifest(state, { profiles: [profile], grants: [] })
  const removed = []
  assert.deepEqual(cleanupRecorded(state, { revoke: () => assert.fail('no ACL was applied'), remove: name => removed.push(name) }), [])
  assert.deepEqual(removed, [profile])
  assert.deepEqual(readManifest(state), { profiles: [], grants: [] })
})

test('an unregistered migration journal in a selected folder cannot authorize recovery or delete files', async t => {
  const root = await scratch(t)
  const paths = dataPaths({ DSH_HOME: join(root, 'synthetic-home') })
  const storage = join(root, 'storage')
  const q = join(storage, QUARANTINE)
  await mkdir(q, { recursive: true })
  const id = randomUUID()
  await writeFile(join(q, 'prepared.json'), JSON.stringify({ version: 1, kind: 'migration', key: folderIdentity(storage),
    id, paths: [['metadata']] }))
  await writeFile(join(q, '0'), 'Synthetic owner data')
  await assert.rejects(openStorage(storage, paths, { create: true }), /Unregistered Direct Chat recovery/)
  assert.equal(await readFile(join(q, '0'), 'utf8'), 'Synthetic owner data')
  assert.equal(existsSync(join(storage, MARKER)), false)
})

test('a registered interrupted migration finishes publication and retains the source', async t => {
  const root = await scratch(t)
  const paths = dataPaths({ DSH_HOME: join(root, 'synthetic-home') })
  const source = join(root, 'previous')
  const target = join(root, 'storage')
  await mkdir(source)
  const sourceId = prepareEmptyRoot(source).id
  const oldChat = await chat(source, id(), 'Previous copy')
  const q = join(target, QUARANTINE)
  await mkdir(q, { recursive: true })
  const pending = { id: randomUUID(), sourceId, path: target, key: folderIdentity(target) }
  await writeFile(join(q, 'committed.json'), JSON.stringify({ version: 1, kind: 'migration', key: pending.key,
    id: pending.id, paths: [['metadata']] }))
  await mkdir(join(q, '0'))
  await writeFile(join(q, '0', 'synthetic.json'), 'Verified copy')
  await writeFile(join(q, 'marker.tmp'), 'Interrupted marker publication')
  assert.equal((await openStorage(target, paths, { create: true, pending })).marker.id, pending.id)
  assert.equal(await readFile(join(target, 'metadata', 'synthetic.json'), 'utf8'), 'Verified copy')
  assert.match(await readFile(join(oldChat, 'session.v4.jsonl'), 'utf8'), /Previous copy/)
  assert.equal(existsSync(q), false)
})
