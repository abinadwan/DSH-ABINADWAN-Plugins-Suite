import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
// npm pack intentionally omits package-lock and historical docs. Exercise their
// integrity in the source checkout; the packed-artifact pass checks shipped UI.
const sourceCheckout = existsSync(join(root, 'package-lock.json'))
const read = path => readFileSync(join(root, path), 'utf8')
const packageJson = JSON.parse(read('package.json'))
const archivedAcceptanceReport = join(root, 'docs', 'DSH_DESKTOP_ACCEPTANCE_REPORT_V1.0.1.md')
const archivedSourceLinks = new Set([
  'source/docs/DSH_DESKTOP_FINAL_ACCEPTANCE_V1.0.1.md',
  'source/docs/DEVELOPMENT_PROGRESS_V1.0.1.md',
])

const icons = [
  'plugins/environment-context/icon.png',
  'plugins/humanizer/icon.png',
  'plugins/personal-profile/icon.png',
  'plugins/direct-chat/assets/png/icon-256.png',
  'plugins/conversation-lifecycle/assets/png/icon-256.png',
  'plugins/adaptive-reasoning/assets/png/icon-256.png',
]

test('development source metadata, lockfile, client version and documentation agree', () => {
  const client = read('client.js')
  assert.equal(packageJson.version, '1.0.2-rc.3')
  if (sourceCheckout) {
    const lock = JSON.parse(read('package-lock.json'))
    assert.equal(lock.version, packageJson.version)
    assert.equal(lock.packages[''].version, packageJson.version)
  }
  assert.equal(client.match(/const INSTALLED_VERSION = '([^']+)'/)?.[1], packageJson.version)
  assert.match(read('README.md'), /v1\.0\.0.*release|release.*v1\.0\.0/i)
  assert.match(read('docs/DETAIL.md'), /v1\.0\.0.*release/i)
  assert.match(read('docs/DETAIL.md'), /GitHub Release/i)
})

test('installation instructions and package identity reflect the six-component develop integration workflow', () => {
  const readme = read('README.md')
  assert.match(readme, /git switch -c feature\/your-change origin\/develop/)
  assert.match(readme, /`develop` is the integration branch/)
  for (const name of ['Environment & Context', 'Humanizer', 'My Profile',
    'Direct Chat', 'Chat Control', 'Adaptive Reasoning']) {
    assert.ok(packageJson.description.includes(name), 'package description missing ' + name)
  }
})

test('README and DETAIL render locally bundled icons for all six components', () => {
  const readme = read('README.md')
  const detail = read('docs/DETAIL.md')
  for (const file of icons) {
    assert.ok(existsSync(join(root, file)), 'missing shipped icon: ' + file)
    assert.ok(readme.includes('src="' + file + '"'), 'missing README icon: ' + file)
    assert.ok(detail.includes('src="../' + file + '"'), 'missing DETAIL icon: ' + file)
  }
})

function docsUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? docsUnder(path)
      : entry.isFile() && entry.name.endsWith('.md') ? [path] : []
  })
}

function localLinkSource(text) {
  return [
    ...Array.from(text.matchAll(/\]\(([^)]+)\)/g), match => match[1]),
    ...Array.from(text.matchAll(/\bsrc=["']([^"']+)["']/g), match => match[1]),
  ].filter(href => href && !/^(?:https?:|mailto:|#|data:)/i.test(href))
}

function assertLocalLinksResolve(document, markdown) {
  const isArchivedAcceptance = document === archivedAcceptanceReport
  for (const href of localLinkSource(markdown)) {
    const pathPart = href.split('#', 1)[0].split('?', 1)[0]
    if (!pathPart || /\s/.test(pathPart) || pathPart.includes('$')) continue
    const link = decodeURIComponent(pathPart)
    // The archived report retains paths from the offline acceptance bundle.
    if (isArchivedAcceptance && (link === 'desktop-wire-fixture.mjs' ||
      /^evidence\/(?:\d{2}-[\w-]+\.jpg|(?:native|fixture)-[\w-]+\.jsonl?|sanitized\/[\w-]+\.log)$/.test(link))) continue
    const target = isArchivedAcceptance && archivedSourceLinks.has(link)
      ? resolve(root, link.slice('source/'.length))
      : resolve(dirname(document), link)
    assert.ok(target.startsWith(root), 'link escapes checkout: ' + href)
    assert.ok(existsSync(target), 'broken local link from ' + document + ': ' + href)
  }
}

test('only the archived v1.0.1 acceptance report can reference offline evidence', () => {
  const screenshot = '[Desktop screenshot](evidence/02-candidate-native-details.jpg)'
  assert.doesNotThrow(() => assertLocalLinksResolve(archivedAcceptanceReport, [
    screenshot,
    '[Native trace](evidence/native-wire.jsonl)',
    '[Profile fixture](evidence/fixture-profile-allow.json)',
    '[Sanitized log](evidence/sanitized/npm-test.log)',
    '[Loopback fixture](desktop-wire-fixture.mjs)',
  ].join('\n')))
  if (sourceCheckout) {
    assert.doesNotThrow(() => assertLocalLinksResolve(archivedAcceptanceReport, [
      '[Acceptance checklist](source/docs/DSH_DESKTOP_FINAL_ACCEPTANCE_V1.0.1.md)',
      '[Development progress](source/docs/DEVELOPMENT_PROGRESS_V1.0.1.md)',
    ].join('\n')))
  }

  for (const document of [
    join(root, 'README.md'),
    join(root, 'docs', 'DETAIL.md'),
    join(root, 'docs', 'DSH_DESKTOP_REMEDIATION_V1.0.2.md'),
    join(root, 'docs', 'archive', 'DSH_DESKTOP_ACCEPTANCE_REPORT_V1.0.1.md'),
  ]) {
    assert.throws(() => assertLocalLinksResolve(document, screenshot), /broken local link/)
  }
  for (const href of ['missing.md', 'source/docs/missing.md', 'evidence/missing.jpg', 'evidence/../02-missing.jpg']) {
    assert.throws(() => assertLocalLinksResolve(archivedAcceptanceReport, `[Broken](${href})`), /broken local link/)
  }
})

test('all repository docs Markdown links and embedded local image paths resolve', t => {
  if (!sourceCheckout) return t.skip('source-only historical docs are not part of the packed plugin')
  const docs = docsUnder(join(root, 'docs'))
  assert.ok(docs.length >= 44, 'documentation index and audited records should exist')
  for (const document of [join(root, 'README.md'), join(root, 'HANDOVER.md'), join(root, 'CHANGELOG.md'), ...docs]) {
    assertLocalLinksResolve(document, readFileSync(document, 'utf8'))
  }
})


test('README technology badges match the source stack and distinguish published release from candidate', () => {
  const readme = read('README.md')
  for (const label of ['JavaScript ES modules', 'Node.js 22 and 24 — development and CI',
    'React 19', 'Cordis plugin framework', 'DeepSeek Harness DSH']) {
    assert.ok(readme.includes('alt="' + label + '"'), 'missing technology badge: ' + label)
  }
  assert.equal(packageJson.type, 'module')
  assert.match(packageJson.devDependencies.react, /^19\./)
  if (sourceCheckout) assert.match(read('.github/workflows/test.yml'), /node: \['22', '24'\]/)
  assert.match(readme, /shields\.io\/badge\/release-v1\.0\.0/)
  assert.doesNotMatch(readme, /shields\.io\/badge\/release-v1\.0\.1/)
})
