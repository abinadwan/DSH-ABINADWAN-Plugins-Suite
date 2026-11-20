// Identity and access-grant bookkeeping for the confined Direct Chat companion.
// Each storage root has its own AppContainer profile, so its grants never reach another root's companion.
// Every grant is recorded in a Host-owned manifest before it is applied, so cleanup can always find it.
import { createHash, randomUUID } from 'node:crypto'
import { lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { basename, isAbsolute, join, parse, relative, resolve } from 'node:path'
import { folderIdentity, samePath } from './storage-lease.js'

const MANIFEST = 'appcontainer-grants.json'
const RIGHTS = new Set(['RX', 'M'])
const PROFILE = /^abinadwan\.direct-chat\.[0-9a-f]{32}$/
const SID = /^S-1-15-2(?:-\d+){7}$/

/** A profile is scoped to a canonical root and its Host state, so another Host cannot retire its grants. */
export function profileNameFor(home, state) {
  const key = (state ? resolve(state) + '\0' + resolve(home) : resolve(home)).toLowerCase()
  return `abinadwan.direct-chat.${createHash('sha256').update(key).digest('hex').slice(0, 32)}`
}

const inside = (child, parent) => {
  const path = relative(parent.toLowerCase(), child.toLowerCase())
  return path === '' || (!path.startsWith('..') && !parse(path).root)
}

/**
 * Refuse a grant that would reach outside plugin-owned folders: the drive root, any ancestor of the user
 * profile or of a system folder, Windows and program folders, and per-user application installs (where
 * Desktop lives). Grants also require an existing canonical directory without reparse points.
 */
export function assertGrantable(path, env = process.env) {
  const target = resolve(path)
  if (!lstatSync(target).isDirectory() || !samePath(realpathSync.native(target), target)) {
    throw new Error(`Grant target must be an existing canonical directory: ${target}`)
  }
  if (parse(target).root.toLowerCase() === target.toLowerCase()) {
    throw new Error(`Grant target is a drive root: ${target}`)
  }
  const protectedRoots = [homedir(), env.SystemRoot, env.ProgramFiles, env['ProgramFiles(x86)'], env.ProgramData,
    env.LOCALAPPDATA, env.APPDATA].filter(Boolean).map(value => resolve(value))
  for (const root of protectedRoots) {
    if (inside(root, target)) throw new Error(`Grant target contains a protected folder: ${target}`)
  }
  const forbiddenTrees = [env.SystemRoot, env.ProgramFiles, env['ProgramFiles(x86)'], env.ProgramData,
    env.LOCALAPPDATA && join(env.LOCALAPPDATA, 'Programs')].filter(Boolean).map(value => resolve(value))
  for (const root of forbiddenTrees) {
    if (inside(target, root)) throw new Error(`Grant target is inside a system or application folder: ${target}`)
  }
  return target
}

/** The Host-owned state folder must exist, be canonical, and be disjoint from the child-writable storage. */
export function assertStateFolder(state, home) {
  const folder = resolve(state)
  mkdirSync(folder, { recursive: true })
  if (!samePath(realpathSync.native(folder), folder)) throw new Error('Direct Chat Host state folder is redirected')
  if (inside(folder, home) || inside(home, folder)) throw new Error('Direct Chat Host state must be outside its storage')
  return folder
}

export function assertGrantTree(path, io, env) {
  const target = assertGrantable(path, env)
  function check(entry) {
    if (entry !== target && /^\\.abinadwan-direct-chat-(?:lease|storage|transaction)$/i.test(basename(entry))
      && !samePath(join(target, basename(entry)), entry)) throw new Error('Access changes refuse nested Direct Chat roots.')
    io.check(entry)
    const info = lstatSync(entry)
    if (info.isSymbolicLink() || !info.isDirectory() && (!info.isFile() || info.nlink !== 1)) {
      throw new Error('Access changes require a tree without links or special files.')
    }
    if (info.isDirectory()) for (const name of readdirSync(entry)) check(join(entry, name))
  }
  check(target)
  return folderIdentity(target)
}

export function readManifest(state) {
  let data
  try {
    const file = manifestPath(state)
    const info = lstatSync(file)
    if (!info.isFile() || info.nlink !== 1) throw new Error('Invalid manifest file')
    data = JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return { profiles: [], grants: [] }
    throw new Error('Direct Chat grant manifest is unreadable', { cause: error })
  }
  if (![1, 2].includes(data?.version) || !Array.isArray(data.grants) || data.grants.some(entry =>
    !entry || typeof entry.path !== 'string' || !isAbsolute(entry.path) || !SID.test(entry.sid)
    || !PROFILE.test(entry.profile) || !RIGHTS.has(entry.rights)
    || entry.key !== undefined && !/^[0-9a-f]+:[0-9a-f]+$/.test(entry.key))) {
    throw new Error('Invalid Direct Chat grant manifest')
  }
  const profiles = data.version === 1 ? [...new Set(data.grants.map(entry => entry.profile))] : data.profiles
  if (!Array.isArray(profiles) || profiles.some(profile => !PROFILE.test(profile))
    || new Set(profiles).size !== profiles.length || data.grants.some(entry => !profiles.includes(entry.profile))) {
    throw new Error('Invalid Direct Chat profile records')
  }
  return { profiles, grants: data.grants }
}

export function writeManifest(state, { profiles, grants }, io) {
  const file = manifestPath(state)
  const temporary = file + '.' + randomUUID() + '.tmp'
  writeFileSync(temporary, JSON.stringify({ version: 2, profiles, grants }, null, 1) + '\n', { flag: 'wx', flush: true })
  if (io) io.move(temporary, file, true)
  else renameSync(temporary, file)
}

export function cleanupRecorded(state, { revoke, remove, keep, io }) {
  const manifest = readManifest(state)
  const profiles = []
  const grants = []
  const errors = []
  for (const profile of manifest.profiles) {
    const recorded = manifest.grants.filter(entry => entry.profile === profile)
    if (profile === keep) {
      profiles.push(profile)
      grants.push(...recorded)
      continue
    }
    const failed = []
    for (const entry of recorded) {
      try { revoke(entry) } catch (error) { failed.push(entry); errors.push(error) }
    }
    if (!failed.length) {
      try { remove(profile); continue } catch (error) { errors.push(error) }
    }
    profiles.push(profile)
    grants.push(...failed)
  }
  if (profiles.length) writeManifest(state, { profiles, grants }, io)
  else {
    try { unlinkSync(manifestPath(state)) } catch (error) { if (error.code !== 'ENOENT') throw error }
  }
  return errors
}

export const manifestPath = state => join(state, MANIFEST)
export const sameGrant = (a, b) => a.sid === b.sid && a.rights === b.rights && samePath(a.path, b.path)
