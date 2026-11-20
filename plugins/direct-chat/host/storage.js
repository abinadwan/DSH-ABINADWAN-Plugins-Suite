// Direct Chat storage management on the Host. The companion owns one exclusive storage root; everything in
// it belongs to Direct Chat. Every operation here runs only while no companion is running, so nothing in the
// root changes underneath it. Host-owned records (settings, grant manifest, logs) live in a separate state
// folder that the companion cannot reach.
import { createHash, randomUUID } from 'node:crypto'
import { createReadStream, lstatSync, mkdirSync, readFileSync, realpathSync, renameSync, writeFileSync } from 'node:fs'
import { lstat, mkdir, open, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, parse, relative, resolve } from 'node:path'
import { assertGrantable } from '../companion/grants.js'

export const MARKER = '.abinadwan-direct-chat-storage'
export const RETENTION_DAYS = [7, 30, 90, 180, 365]
const SESSION_ID = /^session-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const SETTINGS = 'settings.json'
const SCAN_LIMIT = 512 * 1024 * 1024

export class StorageRefused extends Error {}

export const inside = (child, parent) => {
  const path = relative(parent.toLowerCase(), child.toLowerCase())
  return path === '' || (!path.startsWith('..') && !parse(path).root)
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
    if (lstatSync(folder).isSymbolicLink() || realpathSync.native(folder) !== folder) {
      throw new StorageRefused(`Direct Chat folder is redirected: ${folder}`)
    }
  }
  writeMarker(paths.defaultStorage)
}

function writeMarker(storage) {
  try { writeFileSync(join(storage, MARKER), 'Direct Chat storage. Managed by the ABINADWAN Plugins Suite.\n', { flag: 'wx' }) }
  catch (error) { if (error.code !== 'EEXIST') throw error }
}

export function readSettings(state) {
  try {
    const data = JSON.parse(readFileSync(join(state, SETTINGS), 'utf8'))
    return {
      storage: typeof data.storage === 'string' && isAbsolute(data.storage) ? data.storage : null,
      retentionDays: RETENTION_DAYS.includes(data.retentionDays) ? data.retentionDays : null,
      previousStorage: typeof data.previousStorage === 'string' ? data.previousStorage : null,
    }
  } catch (error) {
    if (error.code === 'ENOENT') return { storage: null, retentionDays: null, previousStorage: null }
    throw new StorageRefused('Direct Chat settings are unreadable')
  }
}

export function writeSettings(state, settings) {
  const file = join(state, SETTINGS)
  const temporary = `${file}.${process.pid}.tmp`
  writeFileSync(temporary, `${JSON.stringify({ version: 1, ...settings }, null, 1)}\n`)
  renameSync(temporary, file)
}

export const storageRoot = (paths, settings) => settings.storage ?? paths.defaultStorage

/**
 * Check a folder the owner chose for Direct Chat storage. The companion gets modify access to all of it, so
 * it must be an empty folder or an existing Direct Chat storage root, outside the Harness home (other than
 * this plugin's own default), outside protected system and profile folders, and disjoint from Host state and
 * runtime copies. A missing leaf folder is created inside an existing canonical parent.
 */
export async function validateStorageRoot(path, paths, env = process.env) {
  if (typeof path !== 'string' || !isAbsolute(path) || path.length > 1024) throw new StorageRefused('Choose an absolute folder path')
  const target = resolve(path)
  const parent = dirname(target)
  if (parent === target) throw new StorageRefused('A drive root cannot hold Direct Chat storage')
  let canonicalParent
  try { canonicalParent = realpathSync.native(parent) } catch { canonicalParent = undefined }
  if (canonicalParent !== parent) throw new StorageRefused('The parent folder must be an existing canonical path')
  await mkdir(target).catch(error => { if (error.code !== 'EEXIST') throw error })
  try { assertGrantable(target, env) } catch (error) { throw new StorageRefused(error.message) }
  for (const owned of [paths.state, paths.runtime]) {
    if (inside(target, owned) || inside(owned, target)) throw new StorageRefused('Storage must be separate from Direct Chat system folders')
  }
  const agentsHome = resolve(env.DSH_AGENTS_HOME?.trim() || join(homedir(), '.agents'))
  if ((inside(target, paths.dshHome) && !inside(target, paths.defaultStorage)) || inside(paths.dshHome, target)
    || inside(target, agentsHome) || inside(agentsHome, target)) {
    throw new StorageRefused('Storage must be outside the Harness home and agent folders')
  }
  const entries = await readdir(target)
  const kind = entries.length === 0 ? 'empty' : entries.includes(MARKER) ? 'direct-chat' : undefined
  if (!kind) throw new StorageRefused('Choose an empty folder or an existing Direct Chat storage folder')
  return { path: target, kind }
}

/** Walk a tree without following links; refuse reparse points, which Direct Chat never creates. */
async function walk(folder, visit, skip = new Set()) {
  for (const name of await readdir(folder)) {
    const path = join(folder, name)
    if (skip.has(path)) continue
    const info = await lstat(path)
    if (info.isSymbolicLink()) throw new StorageRefused(`Unexpected link in Direct Chat storage: ${name}`)
    if (info.isDirectory()) await walk(path, visit, skip)
    else if (info.isFile()) await visit(path, info)
    else throw new StorageRefused(`Unexpected entry in Direct Chat storage: ${name}`)
  }
}

async function digest(path) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  return hash.digest('hex')
}

/** Every chat in a storage root, with its size, last activity and a short preview of its first message. */
export async function inventory(storage) {
  const chats = []
  const sessions = join(storage, 'sessions')
  let groups = []
  try { groups = await readdir(sessions) } catch (error) { if (error.code !== 'ENOENT') throw error }
  for (const group of groups) {
    const groupPath = join(sessions, group)
    if (!(await lstat(groupPath)).isDirectory()) continue
    for (const id of await readdir(groupPath)) {
      if (!SESSION_ID.test(id)) continue
      const folder = join(groupPath, id)
      const info = await lstat(folder)
      if (!info.isDirectory()) continue
      // Activity is the newest file write in the chat; the folder's own time only counts for an empty chat.
      let bytes = 0
      let lastActivity = 0
      await walk(folder, async (_path, file) => {
        bytes += file.size
        lastActivity = Math.max(lastActivity, file.mtimeMs)
      })
      chats.push({ id, bytes, lastActivity: lastActivity || info.mtimeMs, preview: await preview(folder) })
    }
  }
  return chats.sort((a, b) => b.lastActivity - a.lastActivity)
}

async function preview(folder) {
  try {
    const handle = await open(join(folder, 'session.v4.jsonl'))
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
  } catch { /* No transcript yet. */ }
  return ''
}

export async function usage(storage) {
  let bytes = 0
  let files = 0
  try { await walk(storage, async (_path, info) => { bytes += info.size; files++ }) } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
  return { bytes, files }
}

/**
 * Copy one storage root into an empty target, verify every file by size and SHA-256, and write the marker.
 * On any failure the copied files are removed again, leaving the empty target as it was. The source is not
 * modified, so switching back is always possible.
 */
export async function migrateStorage(source, target) {
  if ((await readdir(target)).length) throw new StorageRefused('Migration needs an empty target folder')
  const copied = []
  try {
    await walk(source, async path => {
      const destination = join(target, relative(source, path))
      await mkdir(dirname(destination), { recursive: true })
      await writeFile(destination, await readFile(path), { flag: 'wx' })
      copied.push(path)
    })
    for (const path of copied) {
      if (await digest(path) !== await digest(join(target, relative(source, path)))) {
        throw new StorageRefused(`Migrated file does not match: ${relative(source, path)}`)
      }
    }
    writeMarker(target)
    return { files: copied.length }
  } catch (error) {
    for (const name of await readdir(target)) await rm(join(target, name), { recursive: true, force: true })
    throw error
  }
}

export function prepareEmptyRoot(target) { writeMarker(target) }

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

/**
 * Delete individual chats from an exclusive storage root. Each chat folder is first moved into a quarantine
 * folder inside the same root (an atomic rename). The rest of the root is then scanned byte by byte for the
 * chat's identifier in UTF-8 and UTF-16. Any match, link or unreadable file restores every moved folder and
 * refuses the deletion; only a clean scan removes the quarantine.
 */
export async function deleteChats(storage, ids) {
  if (!Array.isArray(ids) || !ids.length || ids.length > 1000 || ids.some(id => !SESSION_ID.test(id))) {
    throw new StorageRefused('Invalid chat selection')
  }
  const unique = [...new Set(ids)]
  const quarantine = join(storage, `.deleting-${randomUUID()}`)
  const moved = []
  const located = new Map()
  for (const chat of await inventory(storage)) located.set(chat.id, chat)
  const sessions = join(storage, 'sessions')
  const folders = []
  for (const group of await readdir(sessions).catch(() => [])) {
    for (const id of unique) {
      const folder = join(sessions, group, id)
      try { if ((await lstat(folder)).isDirectory()) folders.push([id, folder]) } catch { /* Not in this group. */ }
    }
  }
  const missing = unique.filter(id => !folders.some(([found]) => found === id))
  await mkdir(quarantine)
  try {
    for (const [id, folder] of folders) {
      const destination = join(quarantine, `${moved.length}-${id}`)
      await rename(folder, destination)
      moved.push([folder, destination])
    }
    const needles = folders.flatMap(([id]) => [Buffer.from(id, 'utf8'), Buffer.from(id, 'utf16le')])
    if (needles.length) {
      await walk(storage, async (path, info) => {
        if (info.size > SCAN_LIMIT) throw new StorageRefused(`File too large to verify: ${relative(storage, path)}`)
        if (await containsAny(path, needles)) throw new StorageRefused(`Chat data remains in ${relative(storage, path)}`)
      }, new Set([quarantine]))
    }
    await walk(quarantine, async () => {})
  } catch (error) {
    for (const [folder, destination] of moved.reverse()) await rename(destination, folder).catch(() => {})
    await rm(quarantine, { recursive: true, force: true }).catch(() => {})
    throw error
  }
  await rm(quarantine, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  return { deleted: folders.map(([id]) => id), missing, bytes: folders.reduce((sum, [id]) => sum + (located.get(id)?.bytes ?? 0), 0) }
}

/** Remove everything in an exclusive storage root except the root folder itself, then restore the marker. */
export async function deleteAll(storage) {
  const quarantine = join(storage, `.deleting-${randomUUID()}`)
  await mkdir(quarantine)
  const before = await usage(storage)
  const moved = []
  try {
    for (const name of await readdir(storage)) {
      const path = join(storage, name)
      if (path === quarantine || name === MARKER) continue
      await rename(path, join(quarantine, name))
      moved.push(name)
    }
    await walk(quarantine, async () => {})
  } catch (error) {
    for (const name of moved.reverse()) await rename(join(quarantine, name), join(storage, name)).catch(() => {})
    await rm(quarantine, { recursive: true, force: true }).catch(() => {})
    throw error
  }
  await rm(quarantine, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  writeMarker(storage)
  const left = (await readdir(storage)).filter(name => name !== MARKER)
  if (left.length) throw new StorageRefused('Direct Chat storage is not empty after deletion')
  return { bytes: before.bytes, files: before.files }
}

/** Chats whose last activity is older than the policy allows. Pure preview: nothing is changed. */
export async function retentionCandidates(storage, days, now = Date.now()) {
  if (!RETENTION_DAYS.includes(days)) return []
  const cutoff = now - days * 24 * 60 * 60 * 1000
  return (await inventory(storage)).filter(chat => chat.lastActivity < cutoff)
}
