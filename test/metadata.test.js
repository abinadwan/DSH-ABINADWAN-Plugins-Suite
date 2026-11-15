import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8')
const p = JSON.parse(read('package.json'))
const locale = JSON.parse(read('locale/en.json'))
test('English metadata is exported for Plugin Manager', () => {
  assert.equal(p.icon, './icon.svg')
  assert.equal(p.exports['./package.json'], './package.json')
  assert.equal(p.exports['./icon'], './icon.svg')
  assert.equal(p.exports['./locale/*.json'], './locale/*.json')
  assert.match(locale.meta.title, /Environment/)
  assert.equal(locale.meta.detail, 'docs/DETAIL.md')
  for (const f of ['icon.svg', 'locale/en.json', 'docs/DETAIL.md']) assert.ok(read(f).length > 0)
})
test('packaged artwork stays self-contained and within size limits', () => {
  const icon = read('icon.svg')
  assert.ok(Buffer.byteLength(icon, 'utf8') < 256 * 1024)
  assert.match(icon, /<svg[^>]*viewBox="0 0 256 256"/)
  assert.doesNotMatch(icon, /<script|<image|<foreignObject|xlink:href|https?:\/\//i)
  assert.ok(p.files.includes('icon.svg'))
  assert.ok(p.files.includes('locale/*.json'))
})
