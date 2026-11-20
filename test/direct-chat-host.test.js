import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, utimes, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { removedWhileHostRuns } from '../plugins/direct-chat/index.js'
import { packageClosure, provisionRuntime, ROOT_PACKAGES } from '../plugins/direct-chat/host/runtime.js'
import {
  MARKER, StorageRefused, dataPaths, deleteAll, deleteChats, ensureDataFolders, inventory, migrateStorage,
  readSettings, retentionCandidates, validateStorageRoot, writeSettings,
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
  assert.ok(existsSync(join(paths.defaultStorage, MARKER)))
  assert.deepEqual(readSettings(paths.state), { storage: null, retentionDays: null, previousStorage: null })
  writeSettings(paths.state, { storage: join(root, 'custom'), retentionDays: 30, previousStorage: null })
  assert.equal(readSettings(paths.state).retentionDays, 30)
  writeSettings(paths.state, { storage: 'relative/path', retentionDays: 12, previousStorage: null })
  assert.deepEqual(readSettings(paths.state), { storage: null, retentionDays: null, previousStorage: null })
})

test('a custom storage folder must be empty or Direct Chat storage, outside Harness and system folders', async t => {
  const root = await scratch(t)
  const env = { ...process.env, DSH_HOME: join(root, 'home'), DSH_AGENTS_HOME: join(root, 'agents') }
  const paths = dataPaths(env)
  ensureDataFolders(paths)
  assert.deepEqual(await validateStorageRoot(join(root, 'fresh'), paths, env), { path: join(root, 'fresh'), kind: 'empty' })
  await mkdir(join(root, 'busy'))
  await writeFile(join(root, 'busy', 'notes.txt'), 'unrelated user file')
  await assert.rejects(validateStorageRoot(join(root, 'busy'), paths, env), /empty folder or an existing Direct Chat/)
  await assert.rejects(validateStorageRoot(join(root, 'home', 'sessions'), paths, env), /outside the Harness home/)
  await mkdir(join(root, 'agents'))
  await assert.rejects(validateStorageRoot(join(root, 'agents', 'x'), paths, env), /outside the Harness home and agent/)
  await assert.rejects(validateStorageRoot(join(paths.state, 'inner'), paths, env), StorageRefused)
  await assert.rejects(validateStorageRoot('relative', paths, env), /absolute/)
  assert.equal((await validateStorageRoot(paths.defaultStorage, paths, env)).kind, 'direct-chat')
  await assert.rejects(validateStorageRoot(join(root, 'missing', 'leaf'), paths, env), /parent folder/)
})

test('deleting one chat removes only its folder after a byte scan of the rest of the root', async t => {
  const storage = await scratch(t)
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
  await writeFile(join(storage, MARKER), 'marker')
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
