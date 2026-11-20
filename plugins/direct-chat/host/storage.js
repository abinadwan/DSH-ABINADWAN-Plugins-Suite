// Direct Chat storage on the Host. Production mutations run under the Windows storage lease
// with the companion stopped. Settings and grant records live in a separate Host-owned folder.
import { createHash, randomUUID } from 'node:crypto'
import { constants, createReadStream, lstatSync, mkdirSync, readFileSync, realpathSync, renameSync, writeFileSync } from 'node:fs'
import { copyFile, lstat, mkdir, open, readFile, readdir, rename, rmdir, unlink, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, parse, relative, resolve } from 'node:path'
import { assertGrantable } from '../companion/grants.js'
import { folderIdentity, LEASE_FILE, samePath, StorageRefused } from '../companion/storage-lease.js'

export { StorageRefused }

export const MARKER = '.abinadwan-direct-chat-storage'
const MARKER_STAGE = MARKER + '.pending'
export const RETENTION_DAYS = [7, 30, 90, 180, 365]
const SESSION_ID = /^session-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const SETTINGS = 'settings.json'
const MAX_JOURNAL_BYTES = 4 * 1024 * 1024
const LEGACY_MARKER = 'Direct Chat storage. Managed by the ABINADWAN Plugins Suite.\n'
export const QUARANTINE = '.abinadwan-direct-chat-transaction'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const RESERVED = new Set([MARKER, MARKER_STAGE, LEASE_FILE, QUARANTINE])
const MANAGED = /^(sessions|metadata|attachments|search\.sqlite(?:-wal|-shm|-journal)?)$/
const SCAN_LIMIT = 512 * 1024 * 1024

export const inside = (child, parent) => {
  const path = relative(parent.toLowerCase(), child.toLowerCase())
  return path === '' || (path !== '..' && !path.startsWith('../') && !path.startsWith('..\\') && !parse(path).root)
}

/** The plugin's folders under the Harness home: Host state, runtime copies and the default storage root. */
export function dataPaths(env = process.env) {
  const dshHome = resolve(env.DSH_HOME?.trim() || join(homedir(), '.dsh'))
  const root = join(dshHome, 'abinadwan-direct-chat')
  return { dshHome, root, state: join(root, 'host'), runtime: join(root, 'runtime'), defaultStorage: join(root, 'storage') }
}

/** Create the plugin folders and refuse any that resolve somewhere else (a junction or symbolic link). */
export function ensureDataFolders(paths) {
  for (const folder of [paths.root, paths.state, paths.runtime, paths.defaultStorage]) {
    mkdirSync(folder, { recursive: true })
    if (!lstatSync(folder).isDirectory() || !samePath(realpathSync.native(folder), folder)) {
      throw new StorageRefused(`Direct Chat folder is redirected: ${folder}`)
    }
  }
}

function plainEntry(path, info, io) {
  io?.check(path)
  if (info.isSymbolicLink() || !info.isDirectory() && (!info.isFile() || info.nlink !== 1)) {
    throw new StorageRefused('Direct Chat storage contains a link or an unexpected entry.')
  }
}

function readMarker(storage, io, name = MARKER) {
  const file = join(storage, name)
  let info
  try { info = lstatSync(file) } catch (error) { if (error.code === 'ENOENT') return; throw error }
  plainEntry(file, info, io)
  if (!info.isFile() || info.size > 4096) throw new StorageRefused('Invalid Direct Chat storage marker.')
  const source = readFileSync(file, 'utf8')
  if (name === MARKER && source === LEGACY_MARKER) return { legacy: true }
  let marker
  try { marker = JSON.parse(source) } catch { throw new StorageRefused('Invalid Direct Chat storage marker.') }
  if (marker?.version !== 2 || typeof marker.id !== 'string' || !UUID.test(marker.id) || marker.key !== folderIdentity(storage)
    || typeof marker.path !== 'string' || !samePath(marker.path, storage)) {
    throw new StorageRefused('Direct Chat storage identity cannot be verified.')
  }
  return marker
}

function writeMarker(storage, id, io, replace = false, temporary = join(storage, MARKER_STAGE)) {
  const marker = { version: 2, key: folderIdentity(storage), path: storage, id }
  const file = join(storage, MARKER)
  writeFileSync(temporary, JSON.stringify(marker) + '\n', { flag: 'wx', flush: true })
  if (io) io.move(temporary, file, replace)
  else renameSync(temporary, file)
  return marker
}

export function readSettings(state) {
  try {
    const file = join(state, SETTINGS)
    const info = lstatSync(file)
    if (!info.isFile() || info.nlink !== 1 || info.size > 4096) throw new Error('Invalid settings file')
    const data = JSON.parse(readFileSync(file, 'utf8'))
    if (![1, 2].includes(data?.version)
      || data.storage !== null && (typeof data.storage !== 'string' || !isAbsolute(data.storage))
      || data.retentionDays !== null && !RETENTION_DAYS.includes(data.retentionDays)
      || data.rootId !== undefined && (typeof data.rootId !== 'string' || !UUID.test(data.rootId))) throw new Error('Invalid settings')
    const { pendingMigration } = data
    if (pendingMigration !== undefined && (!pendingMigration || typeof pendingMigration.path !== 'string'
      || !isAbsolute(pendingMigration.path) || typeof pendingMigration.key !== 'string'
      || !/^[0-9a-f]+:[0-9a-f]+$/.test(pendingMigration.key)
      || typeof pendingMigration.id !== 'string' || !UUID.test(pendingMigration.id)
      || pendingMigration.sourceId !== data.rootId)) throw new Error('Invalid pending migration')
    return { storage: data.storage, retentionDays: data.retentionDays,
      previousStorage: typeof data.previousStorage === 'string' ? data.previousStorage : null,
      ...(data.rootId === undefined ? {} : { rootId: data.rootId }),
      ...(pendingMigration === undefined ? {} : { pendingMigration }) }
  } catch (error) {
    if (error.code === 'ENOENT') return { storage: null, retentionDays: null, previousStorage: null }
    throw new StorageRefused('Direct Chat settings are unreadable')
  }
}

export function writeSettings(state, settings, io) {
  const file = join(state, SETTINGS)
  const temporary = file + '.' + randomUUID() + '.tmp'
  writeFileSync(temporary, JSON.stringify({ version: 2, ...settings }, null, 1) + '\n', { flag: 'wx', flush: true })
  if (io) io.move(temporary, file, true)
  else renameSync(temporary, file)
}

export const storageRoot = (paths, settings) => settings.storage ?? paths.defaultStorage

/**
 * Check a folder the owner chose for Direct Chat storage. The companion gets modify access to all of it, so
 * it must be an empty folder or an existing Direct Chat storage root, outside the Harness home (other than
 * this plugin's own default), outside protected system and profile folders, and disjoint from Host state and
 * runtime copies. A missing leaf folder is created inside an existing canonical parent.
 */
function allowedStoragePath(path, paths, env) {
  if (typeof path !== 'string' || !isAbsolute(path) || path.length > 1024) throw new StorageRefused('Choose an absolute folder path')
  const target = resolve(path)
  if (process.platform === 'win32' && !/^[a-z]:[\\/]/i.test(path)) {
    throw new StorageRefused('Choose an absolute folder path on a local drive.')
  }
  if (dirname(target) === target) throw new StorageRefused('A drive root cannot hold Direct Chat storage')
  if (process.platform === 'win32' && target.slice(parse(target).root.length).split('\\').some(name => !safePart(name))) {
    throw new StorageRefused('Choose a folder without Windows device names or invalid path components.')
  }
  for (const owned of [paths.state, paths.runtime]) {
    if (inside(target, owned) || inside(owned, target)) throw new StorageRefused('Storage must be separate from Direct Chat system folders')
  }
  const agentsHome = resolve(env.DSH_AGENTS_HOME?.trim() || join(homedir(), '.agents'))
  if ((inside(target, paths.dshHome) && !samePath(target, paths.defaultStorage)) || inside(paths.dshHome, target)
    || inside(target, agentsHome) || inside(agentsHome, target)) {
    throw new StorageRefused('Storage must be outside the Harness home and agent folders')
  }
  return target
}

export async function openStorage(path, paths, { env = process.env, io, create = false, expected, expectedKey, pending } = {}) {
  const target = allowedStoragePath(path, paths, env)
  const parent = dirname(target)
  let parentHandles
  let lease
  try {
    if (create) {
      let canonical
      try { canonical = realpathSync.native(parent) } catch { throw new StorageRefused('The parent folder must exist.') }
      if (!samePath(canonical, parent)) throw new StorageRefused('The parent folder must be an existing canonical path.')
      parentHandles = io?.pin(parent)
      await refuseNested(parent, io)
      if (!pending) await mkdir(target).catch(error => { if (error.code !== 'EEXIST') throw error })
    }
    try { assertGrantable(target, env) } catch (error) { throw new StorageRefused(error.message) }
    lease = io?.claim(target)
    await refuseNested(parent, io)
    if (expectedKey !== undefined && expectedKey !== folderIdentity(target)) {
      throw new StorageRefused('The active Direct Chat storage changed. Refresh before trying again.')
    }
    let marker = readMarker(target, io)
    if (expected && marker?.id !== expected) throw new StorageRefused('The configured Direct Chat storage identity has changed.')
    if (pending && (!samePath(pending.path, target) || folderIdentity(target) !== pending.key
      || marker && marker.id !== pending.id)) {
      throw new StorageRefused('The pending Direct Chat migration folder has changed.')
    }
    await recoverStorage(target, io, marker, pending?.id)
    marker = readMarker(target, io)
    const entries = (await readdir(target)).filter(name => ![LEASE_FILE, MARKER, MARKER_STAGE].includes(name))
    if (!marker && entries.length) throw new StorageRefused('Choose an empty folder or an existing Direct Chat storage folder')
    const stage = join(target, MARKER_STAGE)
    const staged = await entry(stage, io)
    if (staged) {
      if (!staged.isFile() || staged.size > 4096) throw new StorageRefused('Invalid staged storage marker.')
      if (marker?.legacy || !marker && samePath(target, paths.defaultStorage)) await unlink(stage)
      else if (!marker) {
        marker = readMarker(target, io, MARKER_STAGE)
        await move(stage, join(target, MARKER), io)
      } else throw new StorageRefused('Unexpected staged storage marker. Data was preserved.')
    }
    if (marker?.legacy) {
      // Only recognizable legacy storage can gain a durable identity.
      if (entries.some(name => !MANAGED.test(name))) throw new StorageRefused('Unrecognized files in legacy Direct Chat storage.')
      await walk(target, async () => {}, reservedPaths(target), io)
      marker = writeMarker(target, randomUUID(), io, true)
    }
    return { path: target, kind: marker ? 'direct-chat' : 'empty', marker, lease }
  } catch (error) {
    lease?.close()
    throw error
  } finally {
    if (parentHandles) io.close(parentHandles)
  }
}

async function refuseNested(parent, io) {
  for (let ancestor = parent; dirname(ancestor) !== ancestor; ancestor = dirname(ancestor)) {
    if (await entry(join(ancestor, MARKER), io)) throw new StorageRefused('Direct Chat roots must be separate folders.')
  }
}

export async function readStorage(path, paths, io, expected, read) {
  const target = allowedStoragePath(path, paths, process.env)
  const pinned = io.pin(target)
  try {
    const marker = readMarker(target, io)
    if (expected && marker?.id !== expected) throw new StorageRefused('The configured Direct Chat storage identity has changed.')
    const entries = await readdir(target)
    if (entries.some(isQuarantine)) {
      throw new StorageRefused('Direct Chat storage is awaiting recovery.')
    }
    if (!marker && (!samePath(target, paths.defaultStorage) || entries.some(name => name !== LEASE_FILE))) {
      throw new StorageRefused('Direct Chat storage identity cannot be verified.')
    }
    return await read(target)
  } finally { io.close(pinned) }
}

/** Walk a tree using lstat and, on Windows, reject every kind of reparse point. */
async function walk(folder, visit, skip = new Set(), io) {
  plainEntry(folder, await lstat(folder), io)
  for (const name of await readdir(folder)) {
    const path = join(folder, name)
    if (skip.has(path)) continue
    if (RESERVED.has(name)) {
      throw new StorageRefused('Unexpected nested Direct Chat storage.')
    }
    const info = await lstat(path)
    plainEntry(path, info, io)
    if (info.isDirectory()) await walk(path, visit, skip, io)
    else await visit(path, info)
  }
}

async function digest(path) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  return hash.digest('hex')
}

/** Every chat in a storage root, with its size, last activity and a short preview of its first message. */
export async function inventory(storage, io) {
  const chats = []
  const sessions = join(storage, 'sessions')
  let groups = []
  try {
    plainEntry(sessions, await lstat(sessions), io)
    groups = await readdir(sessions)
  } catch (error) { if (error.code !== 'ENOENT') throw error }
  for (const group of groups) {
    const groupPath = join(sessions, group)
    const groupInfo = await lstat(groupPath)
    plainEntry(groupPath, groupInfo, io)
    if (!groupInfo.isDirectory()) continue
    for (const id of await readdir(groupPath)) {
      if (!SESSION_ID.test(id)) continue
      const folder = join(groupPath, id)
      const info = await lstat(folder)
      plainEntry(folder, info, io)
      if (!info.isDirectory()) continue
      // Activity is the newest file write in the chat; the folder's own time only counts for an empty chat.
      let bytes = 0
      let lastActivity = 0
      await walk(folder, async (_path, file) => {
        bytes += file.size
        lastActivity = Math.max(lastActivity, file.mtimeMs)
      }, new Set(), io)
      chats.push({ id, bytes, lastActivity: lastActivity || info.mtimeMs, preview: await preview(folder, io) })
    }
  }
  return chats.sort((a, b) => b.lastActivity - a.lastActivity)
}

async function preview(folder, io) {
  const path = join(folder, 'session.v4.jsonl')
  let pins
  try {
    if (io?.pinFile) {
      pins = io.pin(folder)
      pins.push(io.pinFile(path))
    }
    const handle = await open(path)
    try {
      const { buffer, bytesRead } = await handle.read(Buffer.alloc(16 * 1024), 0, 16 * 1024, 0)
      for (const line of buffer.subarray(0, bytesRead).toString('utf8').split('\n')) {
        if (!line.includes('"user/message"') && !line.includes('"agent/inbox/spliced"')) continue
        try {
          const text = JSON.stringify(JSON.parse(line)).match(/"type":"text","text":"((?:[^"\\]|\\.)*)"/)
          if (text) return JSON.parse(`"${text[1]}"`).replace(/\s+/g, ' ').slice(0, 80)
        } catch { /* An incomplete trailing line. */ }
      }
    } finally { await handle.close() }
  } catch { /* The transcript may be missing or busy. */ }
  finally { if (pins) io.close(pins) }
  return ''
}

export async function usage(storage, io) {
  let bytes = 0
  let files = 0
  try { await walk(storage, async (_path, info) => { bytes += info.size; files++ }, reservedPaths(storage), io) } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  return { bytes, files }
}

function reservedPaths(storage) {
  return new Set([...RESERVED].map(name => join(storage, name)))
}

export function prepareEmptyRoot(target, io) { return writeMarker(target, randomUUID(), io) }

export async function migrateStorage(source, target, io, id = randomUUID()) {
  const entries = (await readdir(target)).filter(name => name !== LEASE_FILE)
  if (entries.length) throw new StorageRefused('Migration needs an empty target folder')
  const names = (await readdir(source)).filter(name => !RESERVED.has(name))
  if (names.some(name => !MANAGED.test(name))) throw new StorageRefused('Unrecognized files in Direct Chat storage.')
  await walk(source, async () => {}, reservedPaths(source), io)
  const plan = { kind: 'migration', id, paths: names.map(name => [name]) }
  return transacting(target, plan, io, async (transaction, entries) => {
    let files = 0
    async function copy(from, to) {
      const info = await lstat(from)
      plainEntry(from, info, io)
      if (info.isDirectory()) {
        await mkdir(to)
        for (const name of await readdir(from)) await copy(join(from, name), join(to, name))
        return
      }
      await copyFile(from, to, constants.COPYFILE_EXCL)
      const handle = await open(to, 'r+')
      try { await handle.sync() } finally { await handle.close() }
      if (await digest(from) !== await digest(to)) throw new StorageRefused('A migrated file failed verification.')
      files++
    }
    for (const { index, parts } of entries) await copy(join(source, ...parts), join(transaction, index))
    return { files, id: plan.id }
  })
}

async function containsAny(path, needles) {
  let tail = Buffer.alloc(0)
  const overlap = Math.max(...needles.map(needle => needle.length))
  for await (const chunk of createReadStream(path, { highWaterMark: 1024 * 1024 })) {
    const window = Buffer.concat([tail, chunk])
    if (needles.some(needle => window.includes(needle))) return true
    tail = window.subarray(Math.max(0, window.length - overlap + 1))
  }
  return false
}

async function entry(path, io) {
  let info
  try { info = await lstat(path) } catch (error) { if (error.code === 'ENOENT') return; throw error }
  plainEntry(path, info, io)
  return info
}

async function move(from, to, io) {
  if (io) io.move(from, to)
  else {
    if (await entry(to)) throw new StorageRefused('Direct Chat recovery would overwrite data.')
    await rename(from, to)
  }
}

async function purge(path, io) {
  const info = await entry(path, io)
  if (!info) return
  if (!info.isDirectory()) { await unlink(path); return }
  for (const name of await readdir(path)) await purge(join(path, name), io)
  await rmdir(path)
}

// The prepared journal is flushed before the first move. Its atomic rename is the commit point.
// Recovery can repeat a partial rollback, purge or migration publication without replacing data.
async function transacting(storage, plan, io, update) {
  const transaction = join(storage, QUARANTINE)
  const journal = { version: 1, key: folderIdentity(storage), ...plan }
  checkPlan(journal, storage)
  const serialized = JSON.stringify(journal)
  if (Buffer.byteLength(serialized) > MAX_JOURNAL_BYTES) throw new StorageRefused('Direct Chat recovery plan is too large.')
  const migrationId = plan.kind === 'migration' ? plan.id : undefined
  await mkdir(transaction)
  const prepared = join(transaction, 'prepared.json')
  const initial = join(transaction, 'journal.tmp')
  await writeFile(initial, serialized, { flag: 'wx', flush: true })
  await move(initial, prepared, io)
  let result
  try {
    result = await update(transaction, plan.paths.map((parts, index) => ({ parts, index: String(index) })))
    await move(prepared, join(transaction, 'committed.json'), io)
  } catch (error) {
    try { await recoverStorage(storage, io, undefined, migrationId) } catch (recoveryError) {
      throw new StorageRefused('Direct Chat recovery is incomplete. Quarantined data was preserved.', { cause: recoveryError })
    }
    throw error
  }
  await recoverStorage(storage, io, undefined, migrationId)
  return result
}

function safePart(name) {
  return typeof name === 'string' && name.length > 0 && name.length <= 255 && name !== '.' && name !== '..'
    && !/[\\/:*?"<>|\u0000-\u001f]|[. ]$/.test(name) && !/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name)
}

function checkPlan(plan, storage) {
  if (plan?.version !== 1 || !['delete', 'migration'].includes(plan.kind)
    || typeof plan.id !== 'string' || !UUID.test(plan.id) || plan.key !== folderIdentity(storage) || !Array.isArray(plan.paths)) {
    throw new StorageRefused('Direct Chat recovery identity could not be established.')
  }
  const paths = new Set()
  const stages = new Set()
  for (const [index, parts] of plan.paths.entries()) {
    if (!Array.isArray(parts) || !parts.every(safePart)
      || !(parts.length === 1 && MANAGED.test(parts[0])
        || plan.kind === 'delete' && parts.length === 3 && parts[0] === 'sessions' && SESSION_ID.test(parts[2]))) {
      throw new StorageRefused('Invalid path in Direct Chat recovery journal.')
    }
    const key = parts.join('/').toLowerCase()
    if (paths.has(key)) throw new StorageRefused('Conflicting paths in Direct Chat recovery journal.')
    paths.add(key)
    stages.add(String(index))
  }
  if (paths.has('sessions') && [...paths].some(path => path.startsWith('sessions/'))) {
    throw new StorageRefused('Conflicting paths in Direct Chat recovery journal.')
  }
  return stages
}

const isQuarantine = name => samePath(name, QUARANTINE) || /^\\.deleting-/i.test(name)

async function recoverStorage(storage, io, marker = readMarker(storage, io), migrationId) {
  const entries = await readdir(storage)
  if (entries.some(name => /^\.deleting-/i.test(name))) {
    throw new StorageRefused('Direct Chat found a legacy quarantine. Its data was preserved for manual recovery.')
  }
  const transaction = join(storage, QUARANTINE)
  const folder = await entry(transaction, io)
  if (!folder) return
  if (!marker?.id && !migrationId) throw new StorageRefused('Unregistered Direct Chat recovery data was preserved.')
  if (!folder.isDirectory()) throw new StorageRefused('Invalid Direct Chat recovery folder.')
  const contents = await readdir(transaction)
  // A process stopped before publishing the prepared journal could not move any customer data.
  if (!contents.length || contents.length === 1 && contents[0] === 'journal.tmp') {
    if (contents.length) {
      const initial = join(transaction, contents[0])
      if (!(await entry(initial, io))?.isFile()) throw new StorageRefused('Invalid Direct Chat recovery file.')
      await unlink(initial)
    }
    await rmdir(transaction)
    return
  }
  const journals = contents.filter(name => name === 'prepared.json' || name === 'committed.json')
  if (journals.length !== 1) throw new StorageRefused('Unrecognized Direct Chat recovery state. Data was preserved.')
  const journal = join(transaction, journals[0])
  const info = await entry(journal, io)
  if (!info?.isFile() || info.size > MAX_JOURNAL_BYTES) throw new StorageRefused('Invalid Direct Chat recovery journal.')
  let plan
  try { plan = JSON.parse(await readFile(journal, 'utf8')) } catch {
    throw new StorageRefused('Invalid Direct Chat recovery journal. Data was preserved.')
  }
  const stages = checkPlan(plan, storage)
  stages.add(journals[0])
  const committed = journals[0] === 'committed.json'
  const deleting = plan.kind === 'delete'
  if (deleting ? marker?.id !== plan.id : migrationId !== plan.id || marker && (!committed || marker.id !== plan.id)) {
    throw new StorageRefused('Direct Chat recovery marker does not match the storage root.')
  }
  const pendingMarker = join(transaction, 'marker.tmp')
  if (!deleting && committed) stages.add('marker.tmp')
  if (contents.some(name => !stages.has(name))) {
    throw new StorageRefused('Unexpected data in Direct Chat quarantine. It was preserved.')
  }

  for (let index = plan.paths.length - 1; index >= 0; index--) {
    const parts = plan.paths[index]
    const live = join(storage, ...parts)
    const staged = join(transaction, String(index))
    const saved = await entry(staged, io)
    if (!deleting && !committed) { await purge(staged, io); continue }
    let parent = storage
    for (const part of parts.slice(0, -1)) {
      parent = join(parent, part)
      if (!(await entry(parent, io))?.isDirectory()) throw new StorageRefused('A Direct Chat recovery parent is missing.')
    }
    const original = await entry(live, io)
    if (saved && original || deleting && committed && original || !saved && !original && !(deleting && committed)) {
      throw new StorageRefused('Conflicting Direct Chat recovery data. It was preserved.')
    }
    if (!saved) continue
    if (deleting && committed) await purge(staged, io)
    else await move(staged, live, io)
  }
  if (!deleting && committed) {
    const pending = await entry(pendingMarker, io)
    if (pending) {
      if (!pending.isFile() || pending.size > 4096) throw new StorageRefused('Invalid pending Direct Chat marker.')
      await unlink(pendingMarker)
    }
    if (!marker) writeMarker(storage, plan.id, io, false, pendingMarker)
  }
  await unlink(journal)
  await rmdir(transaction)
}

function requireMarker(storage, io) {
  const marker = readMarker(storage, io)
  if (!marker?.id) throw new StorageRefused('Direct Chat storage identity cannot be verified.')
  return marker
}

export async function deleteChats(storage, ids, io) {
  if (!Array.isArray(ids) || !ids.length || ids.length > 1000 || ids.some(id => !SESSION_ID.test(id))) {
    throw new StorageRefused('Invalid chat selection')
  }
  const marker = requireMarker(storage, io)
  await recoverStorage(storage, io, marker)
  const unique = new Set(ids)
  const located = await inventory(storage, io)
  const paths = []
  const sessions = join(storage, 'sessions')
  if (await entry(sessions, io)) {
    for (const group of await readdir(sessions)) {
      if (!(await entry(join(sessions, group), io))?.isDirectory()) continue
      for (const id of unique) {
        if ((await entry(join(sessions, group, id), io))?.isDirectory()) paths.push(['sessions', group, id])
      }
    }
  }
  const deleted = paths.map(parts => parts[2])
  const missing = [...unique].filter(id => !deleted.includes(id))
  if (!paths.length) return { deleted, missing, bytes: 0 }

  return transacting(storage, { kind: 'delete', id: marker.id, paths }, io, async (transaction, entries) => {
    for (const { parts, index } of entries) await move(join(storage, ...parts), join(transaction, index), io)
    const needles = deleted.flatMap(id => [Buffer.from(id, 'utf8'), Buffer.from(id, 'utf16le')])
    await walk(storage, async (path, info) => {
      if (info.size > SCAN_LIMIT) throw new StorageRefused('File too large to verify: ' + relative(storage, path))
      if (await containsAny(path, needles)) throw new StorageRefused('Chat data remains in ' + relative(storage, path))
    }, reservedPaths(storage), io)
    await walk(transaction, async () => {}, new Set(), io)
    return { deleted, missing, bytes: located.filter(chat => deleted.includes(chat.id)).reduce((sum, chat) => sum + chat.bytes, 0) }
  })
}

/** Delete the current root's managed artifacts, keeping its identity and ownership file. */
export async function deleteAll(storage, io) {
  const marker = requireMarker(storage, io)
  await recoverStorage(storage, io, marker)
  const names = (await readdir(storage)).filter(name => !RESERVED.has(name))
  if (names.some(name => !MANAGED.test(name))) throw new StorageRefused('Unrecognized files in Direct Chat storage.')
  const before = await usage(storage, io)
  if (!names.length) return before
  return transacting(storage, { kind: 'delete', id: marker.id, paths: names.map(name => [name]) }, io,
    async (transaction, entries) => {
      for (const { parts, index } of entries) await move(join(storage, ...parts), join(transaction, index), io)
      await walk(transaction, async () => {}, new Set(), io)
      return before
    })
}

/** Chats whose last activity is older than the policy allows. Pure preview. */
export async function retentionCandidates(storage, days, now = Date.now(), io) {
  if (!RETENTION_DAYS.includes(days)) return []
  const cutoff = now - days * 24 * 60 * 60 * 1000
  return (await inventory(storage, io)).filter(chat => chat.lastActivity < cutoff)
}
