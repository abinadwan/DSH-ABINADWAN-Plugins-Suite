import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
// npm pack intentionally omits package-lock and historical docs. Exercise their
// integrity in the source checkout; the packed-artifact pass checks shipped UI.
const sourceCheckout = existsSync(join(root, 'package-lock.json'))
const read = path => readFileSync(join(root, path), 'utf8')
const packageJson = JSON.parse(read('package.json'))
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
  assert.match(packageJson.version, /^\d+\.\d+\.\d+(?:-rc\.\d+)?$/)
  if (sourceCheckout) {
    const lock = JSON.parse(read('package-lock.json'))
    assert.equal(lock.version, packageJson.version)
    assert.equal(lock.packages[''].version, packageJson.version)
  }
  assert.equal(client.match(/const INSTALLED_VERSION = '([^']+)'/)?.[1], packageJson.version)
  for (const document of ['README.md', 'docs/DETAIL.md']) {
    assert.match(read(document), /releases\/tag\/v1\.1\.0/)
  }
  assert.match(read('docs/DETAIL.md'), /GitHub Release/i)
})

test('installation instructions and package identity reflect the six-component develop integration workflow', () => {
  const readme = read('README.md')
  assert.match(readme, /git switch -c feature\/your-change origin\/develop/)
  assert.match(readme, /`develop` is the integration branch/)
  for (const name of ['Environment & Context', 'Humanizer', 'My Profile',
    'Direct Chat', 'Archive Manager', 'Adaptive Reasoning']) {
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
    ...Array.from(text.matchAll(/\b(?:src|href)=["']([^"']+)["']/g), match => match[1]),
  ].filter(href => href && !/^(?:https?:|mailto:|#|data:)/i.test(href))
}

function assertLocalLinksResolve(document, markdown) {
  for (const href of localLinkSource(markdown)) {
    const pathPart = href.split('#', 1)[0].split('?', 1)[0]
    if (!pathPart || /\s/.test(pathPart) || pathPart.includes('$')) continue
    const link = decodeURIComponent(pathPart)
    const target = resolve(dirname(document), link)
    assert.ok(target === root || target.startsWith(root.endsWith(sep) ? root : root + sep), 'link escapes checkout: ' + href)
    assert.ok(existsSync(target), 'broken local link from ' + document + ': ' + href)
  }
}

test('active docs reject unresolved local links and offline evidence', () => {
  for (const href of ['missing.md', 'evidence/native-wire.jsonl', 'source/docs/missing.md', '../../../../missing.md']) {
    assert.throws(() => assertLocalLinksResolve(join(root, 'docs', 'DETAIL.md'), `[Broken](${href})`), /broken local link|link escapes checkout/)
  }
})

test('all repository docs Markdown links and embedded local image paths resolve', t => {
  if (!sourceCheckout) return t.skip('source-only documentation tree is not part of the packed plugin')
  const docs = docsUnder(join(root, 'docs'))
  for (const path of ['docs/README.md', 'docs/DETAIL.md', 'docs/BRANDING.md', 'docs/PERSONAL_PROFILE_LOCAL_SETTINGS.md']) assert.ok(existsSync(join(root, path)), path)
  assert.ok(!existsSync(join(root, 'docs', 'archive')), 'historical archives must not be active docs')
  for (const document of [...docsUnder(join(root, 'plugins')), ...docs, ...readdirSync(root).filter(name => name.endsWith('.md')).map(name => join(root, name))]) {
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
  assert.match(readme, /shields\.io\/badge\/release-v1\.1\.0/)
  assert.doesNotMatch(readme, /shields\.io\/badge\/release-v1\.0\.1/)
})
