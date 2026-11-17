import { execFileSync, spawnSync } from 'node:child_process'
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { validatePackageFiles } from '../test-support/package-policy.js'

// Keep extraction beneath this checkout so the packed code can use the locked
// test dependencies. All runtime files are loaded from the extracted package.
const temporary = mkdtempSync(join(process.cwd(), '.package-check-'))
try {
  const [packed] = JSON.parse(execFileSync(process.execPath, [
    process.env.npm_execpath, 'pack', '--json', '--ignore-scripts', '--pack-destination', temporary,
  ], { encoding: 'utf8' }))
  validatePackageFiles(packed.files)
  execFileSync('tar', ['-xzf', join(temporary, packed.filename), '-C', temporary])
  const directory = join(temporary, 'package')
  const manifest = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'))
  if (manifest.version !== packed.version) throw new Error('Packed version mismatch')
  for (const folder of ['test', 'test-support']) cpSync(folder, join(directory, folder), { recursive: true })
  // Archived prototype tests still run in the source suite. They cannot run
  // against a package that deliberately excludes the historical implementation.
  const archived = new Set([
    'personal-profile-boundaries.test.js','personal-profile-consent.test.js','personal-profile-core.test.js',
    'personal-profile-host-identity.test.js','personal-profile-instructions.test.js',
    'personal-profile-integration.test.js','personal-profile-permissions.test.js',
    'personal-profile-production-readiness.test.js','personal-profile-security-regressions.test.js',
    'personal-profile-storage.test.js','personal-profile-ui.test.js',
  ])
  console.log('Source-only historical prototype tests: '+[...archived].join(', '))
  const tests = readdirSync(join(directory, 'test'))
    .filter(file => file.endsWith('.test.js') && !archived.has(file)).map(file => join(directory, 'test', file))
  const result = spawnSync(process.execPath, ['--test', ...tests], { cwd: directory, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error('Packed-artifact tests failed')
  console.log(`Verified ${packed.filename} (${packed.files.length} published files).`)
} finally {
  rmSync(temporary, { recursive: true, force: true })
}
