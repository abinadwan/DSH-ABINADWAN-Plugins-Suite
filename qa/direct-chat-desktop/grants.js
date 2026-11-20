// Identity and access-grant bookkeeping for the confined Direct Chat companion.
// Each storage root has its own AppContainer profile, so its grants never reach another root's companion.
// Every grant is recorded in a Host-owned manifest before it is applied, so cleanup can always find it.
import { createHash } from 'node:crypto'
import { lstatSync, mkdirSync, readFileSync, realpathSync, renameSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, parse, relative, resolve } from 'node:path'

const MANIFEST = 'appcontainer-grants.json'
const RIGHTS = new Set(['RX', 'M'])

/** A stable profile name per canonical storage root (AppContainer names are limited to 64 characters). */
export function profileNameFor(home) {
  const key = resolve(home).toLowerCase()
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
  if (!lstatSync(target).isDirectory() || realpathSync.native(target) !== target) {
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
  if (realpathSync.native(folder) !== folder) throw new Error('Direct Chat Host state folder is redirected')
  if (inside(folder, home) || inside(home, folder)) throw new Error('Direct Chat Host state must be outside its storage')
  return folder
}

export function readManifest(state) {
  try {
    const data = JSON.parse(readFileSync(join(state, MANIFEST), 'utf8'))
    if (!Array.isArray(data?.grants)) return { grants: [] }
    return { grants: data.grants.filter(entry => typeof entry?.path === 'string' && typeof entry.sid === 'string'
      && typeof entry.profile === 'string' && RIGHTS.has(entry.rights)) }
  } catch (error) {
    if (error.code === 'ENOENT') return { grants: [] }
    throw new Error('Direct Chat grant manifest is unreadable')
  }
}

export function writeManifest(state, manifest) {
  const file = join(state, MANIFEST)
  const temporary = `${file}.${process.pid}.tmp`
  writeFileSync(temporary, `${JSON.stringify({ version: 1, grants: manifest.grants }, null, 1)}\n`)
  renameSync(temporary, file)
}

export const manifestPath = state => join(state, MANIFEST)
export const sameGrant = (a, b) => a.sid === b.sid && a.rights === b.rights && a.path.toLowerCase() === b.path.toLowerCase()
