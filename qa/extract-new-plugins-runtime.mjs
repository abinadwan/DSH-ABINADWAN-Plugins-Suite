// Prepare isolated QA dependencies from a local Desktop archive. Never launch Desktop.
import { closeSync, copyFileSync, lstatSync, mkdirSync, mkdtempSync, openSync, readFileSync, readSync, realpathSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const archive = resolve(process.argv[2] ?? '')
if (basename(archive) !== 'app.asar') throw new Error('Supply the installed Desktop app.asar path')

const fd = openSync(archive, 'r')
function read(length, position) {
  const bytes = Buffer.alloc(length)
  if (readSync(fd, bytes, 0, length, position) !== length) throw new Error('Truncated Desktop archive')
  return bytes
}

try {
  const prefix = read(16, 0)
  const headerSize = prefix.readUInt32LE(12)
  if (headerSize === 0 || headerSize > 32 * 1024 * 1024) throw new Error('Unexpected ASAR header size')
  const tree = JSON.parse(read(headerSize, 16))
  const payload = 8 + prefix.readUInt32LE(4)
  const packed = entry => read(entry.size, payload + Number(entry.offset))
  const desktop = JSON.parse(packed(tree.files['package.json']))
  if (desktop.name !== '@deepseek-ai/dsh-desktop' || !/^[a-f0-9]{40}$/.test(desktop.dshBuildCommit)) {
    throw new Error('Expected a DeepSeek Harness Desktop build with a commit identity')
  }

  const root = tree.files.dsh.files.node_modules.files
  const repository = realpathSync(fileURLToPath(new URL('../', import.meta.url)))
  const cache = join(repository, 'node_modules')
  const parent = join(cache, '.new-plugins-qa')
  for (const directory of [cache, parent]) {
    try {
      mkdirSync(directory)
    } catch (error) {
      if (error.code !== 'EEXIST') throw error
    }
    const stat = lstatSync(directory)
    if (!stat.isDirectory() || stat.isSymbolicLink() || realpathSync(directory) !== directory) {
      throw new Error(`Unsafe QA directory: ${directory}`)
    }
  }
  const scratch = mkdtempSync(join(parent, `${desktop.dshBuildCommit}-`))
  const roots = [
    'sharp', 'zod', '@deepseek-ai/cordis', '@deepseek-ai/dsh-agent-loop',
    '@deepseek-ai/dsh-api-session-controller', '@deepseek-ai/dsh-session-persistence-jsonl',
    '@deepseek-ai/dsh-storage-json', '@deepseek-ai/dsh-storage-domain',
    '@deepseek-ai/dsh-tool-executor-native', '@deepseek-ai/dsh-session-query-sqlite',
    '@deepseek-ai/dsh-client-connection', '@deepseek-ai/dsh-agent-preset-registry', '@deepseek-ai/cordis-plugin-loader',
    '@deepseek-ai/dsh-settings',
  ]
  const seen = new Set()

  function extract(treeEntry, parts) {
    if (parts.some(part => !part || part === '.' || part === '..' || /[\\/:]/.test(part)) || treeEntry.link) {
      throw new Error('Unsafe archive entry')
    }
    const target = join(scratch, 'node_modules', ...parts)
    if (treeEntry.files) {
      for (const [key, value] of Object.entries(treeEntry.files)) extract(value, [...parts, key])
      return
    }
    mkdirSync(dirname(target), { recursive: true })
    if (treeEntry.unpacked) copyFileSync(join(archive + '.unpacked', 'dsh', 'node_modules', ...parts), target)
    else writeFileSync(target, packed(treeEntry))
  }

  function include(name, required) {
    if (seen.has(name)) return
    const parts = name.split('/')
    const entry = parts.reduce((current, part) => current?.[part]?.files, root)
    if (!entry) {
      if (required) throw new Error(`Desktop package is absent: ${name}`)
      return
    }
    seen.add(name)
    const manifestEntry = entry['package.json']
    const manifest = JSON.parse(manifestEntry.unpacked
      ? readFileSync(join(archive + '.unpacked', 'dsh', 'node_modules', ...parts, 'package.json'))
      : packed(manifestEntry))
    extract({ files: entry }, parts)
    for (const dependency of Object.keys(manifest.dependencies ?? {})) {
      const nested = dependency.split('/').reduce((current, part) => current?.[part]?.files, entry.node_modules?.files)
      if (!nested) include(dependency, true)
    }
    for (const dependency of Object.keys(manifest.optionalDependencies ?? {})) include(dependency, false)
    for (const dependency of Object.keys(manifest.peerDependencies ?? {})) include(dependency, false)
  }

  for (const name of roots) include(name, true)
  writeFileSync(join(scratch, 'package.json'), '{"private":true,"type":"module"}\n')
  console.log(JSON.stringify({ scratch, desktop: desktop.version, build: desktop.dshBuildCommit, packages: seen.size }))
} finally {
  closeSync(fd)
}
