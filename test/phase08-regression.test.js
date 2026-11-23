import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const read = path => readFileSync(join(root, path), 'utf8')
const pkg = JSON.parse(read('package.json'))
const sourceCheckout = existsSync(join(root, 'package-lock.json'))
const components = [
  'environment-context', 'humanizer', 'personal-profile',
  'direct-chat', 'conversation-lifecycle', 'adaptive-reasoning',
]

test('phase 08: all six independent components remain exported and ship their icons', () => {
  const icons = [
    'plugins/environment-context/icon.png', 'plugins/humanizer/icon.png',
    'plugins/personal-profile/icon.png', 'plugins/direct-chat/assets/png/icon-256.png',
    'plugins/conversation-lifecycle/assets/png/icon-256.png',
    'plugins/adaptive-reasoning/assets/png/icon-256.png',
  ]
  assert.equal(components.length, 6)
  components.forEach((name, index) => {
    assert.ok(pkg.exports['./' + name], name + ' missing module export')
    assert.ok(pkg.exports['./' + name + '/icon'], name + ' missing icon export')
    assert.ok(existsSync(join(root, icons[index])), name + ' missing shipped icon')
  })
  assert.equal(pkg.dsh.client.platform, 'web')
  assert.ok(pkg.dsh.bundle.patch)
})

test('phase 08: release remains stable while source is a prerelease candidate', () => {
  assert.equal(pkg.version, '1.0.2-rc.2')
  assert.match(read('README.md'), /release-v1\.0\.0/)
  assert.doesNotMatch(read('README.md'), /release-v1\.0\.1/)
  if (sourceCheckout) {
    const lock = JSON.parse(read('package-lock.json'))
    assert.equal(lock.version, pkg.version)
    assert.equal(lock.packages[''].version, pkg.version)
  }
})

test('phase 08: no destructive cleanup or unsupported per-message effort is activated', () => {
  const control = read('plugins/conversation-lifecycle/index.js')
  const client = read('client.js')
  const reasoning = read('plugins/adaptive-reasoning/index.js')
  assert.match(client, /Deletion is unavailable\. Automatic cleanup is disabled\./)
  assert.doesNotMatch(control, /session\.delete\(|removeSession\(|setInterval\(|cron\(/)
  assert.match(reasoning, /request-local-effort-unavailable/)
  assert.match(reasoning, /withFileLock|openReasoningStats/)
})

test('phase 08: cross-phase safety regressions and explicit CI gate remain present', () => {
  const direct = read('plugins/direct-chat/index.js')
  const catalog = read('plugins/direct-chat/catalog.js')
  const classifier = read('plugins/adaptive-reasoning/classify.js')
  assert.match(direct, /DIRECT_CHAT_TOOL_DENIED/)
  assert.match(direct, /tools\/pre-execute/)
  assert.match(catalog, /CREATION_LIMIT = 100/)
  assert.match(classifier, /arAdvanced/)
  assert.ok(pkg.scripts['check:regression']?.includes('phase08-regression.test.js'),
    'source and CI require a named phase-eight regression command')
  if (sourceCheckout) {
    const workflow = read('.github/workflows/test.yml')
    assert.match(workflow, /os: \[ubuntu-latest, windows-latest\]/)
    assert.match(workflow, /node: \['22', '24'\]/)
    assert.match(workflow, /npm run check:package/)
    assert.match(workflow, /npm run check:regression/)
    assert.match(workflow, /profile-host-check\.mjs/)
    assert.match(workflow, /adaptive-reasoning-host-check\.mjs/)
    assert.match(workflow, /direct-chat-catalog-host-check\.mjs/)
    assert.match(workflow, /new-plugins-host-check\.mjs/)
  }
})
