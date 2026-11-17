import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { validatePackageFiles } from '../test-support/package-policy.js'

const probe = 'scripts/personal-profile-windows-probe.mjs'
const entries = (...paths) => paths.map(path => ({ path }))
const rejected = path => assert.throws(() => validatePackageFiles(entries(path)),
  { message: 'Development preview or tooling leaked into production package' })

test('package policy rejects development preview scripts', () => {
  rejected('scripts/preview-personal-profile.mjs')
  rejected('scripts/check-package.mjs')
})
test('package policy rejects test-support and preview assets', () => {
  for (const path of ['test-support/client.js', 'test-support/package-policy.js',
    'test-support/personal-profile-ui/app.js', 'test-support/personal-profile-ui/index.html',
    'test-support/personal-profile-ui/style.css']) rejected(path)
})
test('package policy excludes the retired DPAPI probe and archived encrypted prototype', () => {
  assert.doesNotThrow(() => validatePackageFiles(entries('index.js', 'plugins/personal-profile/index.js', 'plugins/personal-profile/preferences/store.js')))
  rejected(probe)
  for (const path of ['plugins/personal-profile/storage/backup.js','plugins/personal-profile/core/schema.js','plugins/personal-profile/integration/gate.js']) rejected(path)
  for (const path of ['scripts/arbitrary.mjs', `${probe}.bak`, `${probe}/child.mjs`,
    'scripts/nested/personal-profile-windows-probe.mjs',
    'scripts/Personal-profile-windows-probe.mjs',
    'scripts/./personal-profile-windows-probe.mjs',
    'scripts/nested/../personal-profile-windows-probe.mjs']) rejected(path)
  // One allowed script must not exempt other files in the same package.
  assert.throws(() => validatePackageFiles(entries(probe, 'scripts/arbitrary.mjs')))
  assert.throws(() => validatePackageFiles(entries(probe, 'test-support/client.js')))
})
test('actual package passes policy and ships the probe only when explicitly configured', () => {
  const [packed] = JSON.parse(execFileSync(process.execPath, [process.env.npm_execpath,
    'pack', '--dry-run', '--json', '--ignore-scripts'], { encoding: 'utf8' }))
  assert.ok(packed.files.length > 0)
  validatePackageFiles(packed.files)
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  assert.equal(manifest.files.includes(probe),false)
  assert.equal(packed.files.some(file => file.path === probe),false)
  assert.ok(packed.files.some(file => file.path === 'plugins/personal-profile/preferences/store.js'))
  assert.ok(packed.files.some(file => file.path === 'plugins/personal-profile/preferences/model.js'))
  assert.equal(packed.files.some(file => file.path.startsWith('test-support/')), false)
  assert.equal(packed.files.some(file => file.path === 'scripts/preview-personal-profile.mjs'), false)
})
