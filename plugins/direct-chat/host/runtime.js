// Plugin-owned runtime for the confined companion. The Host copies the bundled Node executable and the
// Harness packages the companion loads into a folder this plugin owns, and the AppContainer is granted read
// access to that copy only, never to the Desktop installation. Desktop keeps its packages inside app.asar,
// which only Electron can read, so the copy also makes them loadable by plain Node.
import { createHash, randomUUID } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { copyFile, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const FORMAT = 1
const companion = fileURLToPath(new URL('../companion/', import.meta.url))
export const COMPANION_FILES = ['worker.js', 'channel.js', 'launcher.mjs', 'appcontainer.js', 'grants.js', 'cleanup.mjs']
// The packages worker.js imports, plus koffi for the launcher's Win32 bindings.
export const ROOT_PACKAGES = ['cordis', 'dsh-llm', 'dsh-session', 'dsh-session-projection', 'dsh-system-prompt',
  'dsh-tools', 'dsh-tool-executor-native', 'dsh-agent', 'dsh-agent-loop', 'dsh-session-persistence-jsonl',
  'dsh-typert-registry', 'dsh-api-gateway', 'dsh-api-remote-access', 'dsh-storage', 'dsh-storage-json',
  'dsh-storage-domain', 'dsh-workspace', 'dsh-session-query-sqlite', 'dsh-agent-default-model',
  'dsh-attachment-local', 'dsh-client-file-upload', 'dsh-commands', 'dsh-api-session-controller',
  'dsh-client-connection'].map(name => `@deepseek-ai/${name}`).concat('koffi')

export class RuntimeUnavailable extends Error {}

/**
 * Locate the running Host's package folder and its bundled Node. The Host entry script lives in the runtime's
 * `node_modules`; Desktop exposes its dependency payload as DSH_PRIMARY_RUNTIME (Node under
 * `dependencies/node/bin`). A plain Node Host can use its own executable. The two overrides exist for checks.
 */
export function hostSources(env = process.env, argv = process.argv, execPath = process.execPath) {
  let modules = env.ABINADWAN_DIRECT_CHAT_SOURCE_MODULES
  for (let folder = argv[1] && dirname(resolve(argv[1])); !modules && folder && dirname(folder) !== folder; folder = dirname(folder)) {
    if (basename(folder) === 'node_modules') modules = folder
  }
  const node = env.ABINADWAN_DIRECT_CHAT_SOURCE_NODE
    || (env.DSH_PRIMARY_RUNTIME && join(env.DSH_PRIMARY_RUNTIME, 'dependencies', 'node', 'bin', 'node.exe'))
    || (basename(execPath).toLowerCase() === 'node.exe' ? execPath : undefined)
  if (!modules || !node || !existsSync(join(modules, '@deepseek-ai', 'dsh-session-persistence-jsonl', 'package.json'))
    || !existsSync(node)) {
    throw new RuntimeUnavailable('The Harness runtime or its bundled Node could not be located')
  }
  return { modules: resolve(modules), node: resolve(node) }
}

/** Resolve the package closure the companion needs, the way Node resolves bare specifiers. */
export function packageClosure(modules) {
  const top = dirname(modules)
  const packages = new Map()
  function locate(name, from) {
    for (let folder = from; ; folder = dirname(folder)) {
      const candidate = join(folder, 'node_modules', name)
      if (existsSync(join(candidate, 'package.json'))) return candidate
      if (folder === top || dirname(folder) === folder) return undefined
    }
  }
  function visit(name, from, required) {
    const folder = locate(name, from)
    if (!folder) {
      if (required) throw new RuntimeUnavailable(`Harness package is missing: ${name}`)
      return
    }
    const path = relative(modules, folder)
    if (packages.has(path)) return
    const manifest = JSON.parse(readFileSync(join(folder, 'package.json'), 'utf8'))
    packages.set(path, { name, version: String(manifest.version ?? ''), folder })
    for (const dependency of Object.keys(manifest.dependencies ?? {})) visit(dependency, folder, true)
    for (const dependency of Object.keys(manifest.optionalDependencies ?? {})) visit(dependency, folder, false)
    for (const dependency of Object.keys(manifest.peerDependencies ?? {})) visit(dependency, folder, false)
  }
  for (const name of ROOT_PACKAGES) visit(name, top, true)
  return [...packages].map(([path, entry]) => ({ path, ...entry })).sort((a, b) => a.path.localeCompare(b.path))
}

function runtimeKey(sources, packages) {
  const hash = createHash('sha256').update(`format ${FORMAT}\n`)
  const node = statSync(sources.node)
  hash.update(`node ${node.size} ${Math.trunc(node.mtimeMs)}\n`)
  for (const entry of packages) hash.update(`${entry.path}@${entry.version}\n`)
  for (const file of COMPANION_FILES) hash.update(readFileSync(join(companion, file)))
  return hash.digest('hex').slice(0, 24)
}

/** Copy one package without its nested node_modules; nested dependencies are copied as their own entries. */
async function copyPackage(from, to, totals) {
  await mkdir(to, { recursive: true })
  const pending = []
  for (const name of await readdir(from)) {
    const source = join(from, name)
    const info = await stat(source)
    if (info.isDirectory()) {
      if (name !== 'node_modules') pending.push(copyPackage(source, join(to, name), totals))
    } else if (info.isFile()) {
      pending.push(readFile(source).then(bytes => writeFile(join(to, name), bytes)).then(() => {
        totals.files++
        totals.bytes += info.size
      }))
    }
  }
  await Promise.all(pending)
}

/**
 * Return a complete runtime copy for the running Host, creating it if needed. The copy is assembled in a
 * temporary folder and renamed into place, so a partial copy is never used. Other copies are removed once a
 * current one exists; callers must not have a companion running from them.
 */
export async function provisionRuntime(root, sources = hostSources()) {
  const packages = packageClosure(sources.modules)
  const key = runtimeKey(sources, packages)
  const target = join(root, key)
  const layout = folder => ({ key, root: folder, node: join(folder, 'node', 'node.exe'), runtime: folder,
    app: join(folder, 'app') })
  let info
  try { info = JSON.parse(await readFile(join(target, 'runtime.json'), 'utf8')) } catch { info = undefined }
  if (!info) {
    const temporary = join(root, `.partial-${randomUUID()}`)
    const totals = { files: 0, bytes: 0 }
    const begun = Date.now()
    try {
      await mkdir(join(temporary, 'node'), { recursive: true })
      await copyFile(sources.node, join(temporary, 'node', 'node.exe'))
      totals.files++
      totals.bytes += statSync(sources.node).size
      await mkdir(join(temporary, 'app'))
      for (const file of COMPANION_FILES) {
        await copyFile(join(companion, file), join(temporary, 'app', file))
        totals.files++
      }
      for (let index = 0; index < packages.length; index += 8) {
        await Promise.all(packages.slice(index, index + 8).map(entry =>
          copyPackage(entry.folder, join(temporary, 'node_modules', entry.path), totals)))
      }
      await writeFile(join(temporary, 'package.json'), '{"private":true,"type":"module"}\n')
      info = { format: FORMAT, key, packages: packages.length, files: totals.files, bytes: totals.bytes,
        createdAt: Date.now(), copyMs: Date.now() - begun }
      await writeFile(join(temporary, 'runtime.json'), `${JSON.stringify(info)}\n`)
      await rename(temporary, target)
    } catch (error) {
      await rm(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }).catch(() => {})
      throw error
    }
  }
  for (const name of await readdir(root)) {
    if (name !== key) await rm(join(root, name), { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  }
  return { ...layout(target), info }
}

/** The current copy, if one is complete, without creating anything. */
export async function currentRuntime(root) {
  try {
    for (const name of await readdir(root)) {
      if (name.startsWith('.')) continue
      const info = JSON.parse(await readFile(join(root, name, 'runtime.json'), 'utf8'))
      return { key: name, root: join(root, name), node: join(root, name, 'node', 'node.exe'), runtime: join(root, name),
        app: join(root, name, 'app'), info }
    }
  } catch { /* No complete copy. */ }
  return undefined
}
