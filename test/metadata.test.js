import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
const read = name => readFileSync(new URL('../' + name, import.meta.url), 'utf8')
const p = JSON.parse(read('package.json'))
const locale = JSON.parse(read('locale/en.json'))
test('English metadata is exported for Plugin Manager', () => {
  assert.equal(p.icon, './icon.png')
  assert.equal(p.exports['./package.json'], './package.json')
  assert.equal(p.exports['./icon'], './icon.png')
  assert.equal(p.exports['./locale/*.json'], './locale/*.json')
  assert.equal(locale.meta.title, 'ABINADWAN Plugins Suite')
  assert.equal(locale.meta.detail, 'docs/DETAIL.md')
  assert.match(locale.meta.description, /\bsix independently switchable components\b/i)
  assert.match(JSON.parse(read('locale/ar.json')).meta.description, /ستة مكوّنات/)
  for (const f of ['icon.svg', 'locale/en.json', 'docs/DETAIL.md']) assert.ok(read(f).length > 0)
  assert.equal(p.name, '@abinadwan/dsh-plugins-suite')
  assert.equal(p.repository.url, 'git+https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite.git')
})
test('packaged artwork stays self-contained and within size limits', () => {
  const icon = read('icon.svg')
  assert.ok(Buffer.byteLength(icon, 'utf8') < 256 * 1024)
  assert.match(icon, /<svg[^>]*viewBox="0 0 256 256"/)
  assert.doesNotMatch(icon, /<script|<image|<foreignObject|xlink:href|(?:href|src)=['"]https?:\/\//i)
  assert.ok(p.files.includes('icon.svg'))
  for (const path of ['locale/en.json','locale/ar.json','locale/dsh-ui-ar.json']) assert.ok(p.files.includes(path),path)
  assert.ok(p.files.includes('icon.png'))
  const png = readFileSync(new URL('../icon.png', import.meta.url))
  assert.equal(png.subarray(0,8).toString('hex'), '89504e470d0a1a0a')
  assert.ok(png.byteLength < 256 * 1024)
})

test('Humanizer metadata distinguishes the Skill and Studio without changing the component title', () => {
  for (const [language, skill, studio] of [['en', /Runtime writing skill/, /Humanizer Studio:.*local and cloud models/], ['ar', /مهارة لتحرير النصوص/, /استوديو Humanizer:.*الموديلات المحلية والسحابية/]]) {
    const {meta} = JSON.parse(read('plugins/humanizer/locale/' + language + '.json'))
    assert.equal(meta.title, 'Humanizer')
    const lines = meta.description.split('\\n')
    assert.equal(lines.length, 2)
    assert.match(lines[0], skill)
    assert.match(lines[1], studio)
  }
})
