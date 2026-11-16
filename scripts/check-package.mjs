import { execFileSync, spawnSync } from 'node:child_process'
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

// Keep extraction beneath this checkout so the packed code can use the locked
// test dependencies. All runtime files are loaded from the extracted package.
const temporary = mkdtempSync(join(process.cwd(), '.package-check-'))
try {
  const [packed] = JSON.parse(execFileSync(process.execPath, [
    process.env.npm_execpath, 'pack', '--json', '--ignore-scripts', '--pack-destination', temporary,
  ], { encoding: 'utf8' }))
  if (packed.files.some(file => /^(test-support|scripts)\//.test(file.path))) {
    throw new Error('Development preview or tooling leaked into production package')
  }
  execFileSync('tar', ['-xzf', join(temporary, packed.filename), '-C', temporary])
  const directory = join(temporary, 'package')
  const manifest = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'))
  if (manifest.version !== packed.version) throw new Error('Packed version mismatch')
  for (const folder of ['test', 'test-support']) cpSync(folder, join(directory, folder), { recursive: true })
  const tests = readdirSync(join(directory, 'test'))
    .filter(file => file.endsWith('.test.js')).map(file => join(directory, 'test', file))
  const result = spawnSync(process.execPath, ['--test', ...tests], { cwd: directory, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error('Packed-artifact tests failed')
  console.log(`Verified ${packed.filename} (${packed.files.length} published files).`)
} finally {
  rmSync(temporary, { recursive: true, force: true })
}
