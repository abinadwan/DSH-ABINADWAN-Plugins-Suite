import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { clientHarness, base } from '../test-support/client.js'

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
const source = JSON.parse(read('locale/dsh-ui-ar.json'))

function fakeLocale() {
  const languages = new Map([['en', { id: 'en', label: 'English' }]])
  const dictionaries = new Map()
  let active = 'en'
  let selections = 0
  return {
    languages, dictionaries,
    get active() { return active },
    get selections() { return selections },
    addLanguage(config) {
      if (languages.has(config.id)) throw Error('language already occupied')
      languages.set(config.id, config)
      return () => languages.delete(config.id)
    },
    register(namespace, lang, values) {
      if (!languages.has(lang)) throw Error('unknown locale: ' + lang)
      const key = lang + ':' + namespace
      if (dictionaries.has(key)) throw Error('dictionary already occupied')
      dictionaries.set(key, values)
      return () => dictionaries.delete(key)
    },
    setLocale(id) {
      selections++
      if (!languages.has(id)) throw Error('locale is not available')
      active = id
    },
  }
}

test('Arabic UI is bundled at root independently of all suite Component toggles', async () => {
  const locale = fakeLocale()
  const app = await clientHarness({ locale })
  try {
    assert.equal(app.loaded.id, base)
    assert.equal(locale.languages.get('ar')?.label, 'العربية')
    assert.equal(locale.languages.get('ar')?.fallback, 'en')
    assert.equal(locale.active, 'en', 'installation must not change current language')
    assert.equal(locale.selections, 0, 'must not call setLocale')
    assert.equal(locale.dictionaries.size, Object.keys(source).length)
    for (const [namespace, values] of Object.entries(source)) {
      assert.deepEqual(JSON.parse(JSON.stringify(locale.dictionaries.get('ar:' + namespace))), values, namespace)
    }
    app.setRows([])
    await app.changed()
    assert.equal(locale.languages.has('ar'), true, 'component disable must not remove suite-root Arabic')
    assert.equal(locale.dictionaries.size, Object.keys(source).length)
    locale.setLocale('ar')
    assert.equal(locale.active, 'ar', 'user must be able to select Arabic')
  } finally {
    await app.dispose()
  }
  assert.equal(locale.languages.has('ar'), false, 'suite unload removes only registrations it owns')
  assert.equal(locale.dictionaries.size, 0)
})

test('a separately installed Arabic pack keeps its original registrations', async () => {
  const locale = fakeLocale()
  locale.languages.set('ar', { id: 'ar', label: 'العربية', fallback: 'en' })
  const existing = { title: 'original dictionary owned by another plugin' }
  locale.dictionaries.set('ar:settings', existing)
  const app = await clientHarness({ locale })
  try {
    assert.equal(locale.languages.get('ar').label, 'العربية')
    assert.equal(locale.dictionaries.get('ar:settings'), existing)
    assert.equal(locale.dictionaries.size, Object.keys(source).length)
    assert.equal(locale.selections, 0)
  } finally {
    await app.dispose()
  }
  assert.equal(locale.languages.has('ar'), true, 'do not unregister another plugin language')
  assert.equal(locale.dictionaries.get('ar:settings'), existing)
  assert.equal(locale.dictionaries.size, 1, 'do not unregister an occupied dictionary')
})

test('Arabic translations and MIT attribution are included in packed artifact', () => {
  const manifest = JSON.parse(read('package.json'))
  assert.ok(manifest.dsh.client.inject.includes('@deepseek-ai/dsh-client-locale'))
  assert.ok(manifest.files.includes('THIRD_PARTY_NOTICES.md'))
  assert.ok(manifest.files.includes('locale/*.json'))
  assert.match(read('THIRD_PARTY_NOTICES.md'), /Copyright \(c\) 2026 SMSMy/)
  assert.match(read('THIRD_PARTY_NOTICES.md'), /MIT License/)
  assert.ok(Object.keys(source).length >= 59)
  assert.equal(Object.values(source).reduce((sum, values) => sum + Object.keys(values).length, 0), 3307)
  assert.equal(source['settings.locale']['language.title'], 'اللغة')
  assert.match(read('client.js'), /suite: bundled Arabic locale/)
})
