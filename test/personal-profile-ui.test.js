import test from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { mountPrototype } from '../test-support/personal-profile-ui/app.js'

function setup(locale = 'en') {
  const dom = new JSDOM('<!doctype html><html><head><title>Prototype</title></head><body><div id="app"></div></body></html>', { runScripts: 'outside-only' })
  mountPrototype(dom.window.document.querySelector('#app'), locale)
  return dom.window.document
}
const click = (d, id) => d.getElementById(id).click()
const change = (d, id, value) => {
  const el = d.getElementById(id)
  el.value = value
  el.dispatchEvent(new d.defaultView.Event(el.matches('input,textarea') ? 'input' : 'change', { bubbles: true }))
}
test('navigation presents all five pages with a current page and focus target', () => {
  const d = setup()
  for (const page of ['information', 'instructions', 'access', 'backup', 'privacy']) {
    click(d, `nav-${page}`)
    assert.equal(d.querySelector('[aria-current="page"]').id, `nav-${page}`)
    assert.equal(d.activeElement.tagName, 'H1')
    assert.ok(d.querySelector('main'))
  }
})
test('optional information validates dates and length without storing invalid input', () => {
  const d = setup()
  change(d, 'preferredName', 'x'.repeat(1025))
  assert.ok(d.getElementById('preferredName').getAttribute('aria-invalid'))
  change(d, 'preferredName', '')
  assert.equal(d.getElementById('preferredName').getAttribute('aria-invalid'), null)
  change(d, 'dateOfBirth', '2025-02-30')
  assert.equal(d.getElementById('dateOfBirth').getAttribute('aria-invalid'), 'true')
})
test('instructions distinguish inherited, override and explicitly empty', () => {
  const d = setup()
  click(d, 'nav-instructions')
  change(d, 'global', 'Synthetic global')
  assert.match(d.getElementById('effective').textContent, /Synthetic global/)
  change(d, 'instruction-mode', 'override')
  assert.equal(d.getElementById('effective').textContent, 'Explicitly empty — global instructions suppressed.')
  change(d, 'override', 'Synthetic override')
  assert.equal(d.getElementById('effective').textContent, 'Synthetic override')
  change(d, 'instruction-mode', 'inherit')
  assert.equal(d.getElementById('effective').textContent, 'Synthetic global')
})
test('custom fields can be added, edited and removed and default private on every Profile', () => {
  const d = setup()
  change(d, 'custom-id', 'syntheticNote')
  change(d, 'custom-label', 'Synthetic note')
  click(d, 'add-field')
  change(d, 'value-syntheticNote', 'Synthetic value')
  change(d, 'label-syntheticNote', 'Synthetic edited label')
  click(d, 'nav-access')
  assert.equal(d.getElementById('permission-syntheticNote').value, 'private')
  change(d, 'permission-syntheticNote', 'allow')
  change(d, 'profile', 'Synthetic Lab')
  assert.equal(d.getElementById('permission-syntheticNote').value, 'private')
  click(d, 'nav-information')
  click(d, 'remove-syntheticNote')
  assert.equal(d.getElementById('value-syntheticNote'), null)
})

test('backup stops at disabled actions for export, merge and destructive replacement', () => {
  const d = setup()
  click(d, 'nav-backup')
  assert.equal(d.getElementById('backup-password').disabled, true)
  for (const operation of ['export', 'import']) {
    click(d, `review-${operation}`)
    assert.equal(d.getElementById('backup-final'), null)
    if (operation === 'import') {
      change(d, 'import-strategy', 'replace')
      assert.match(d.querySelector('.review').textContent, /discard all current/)
    }
    click(d, 'backup-confirm')
    assert.equal(d.getElementById('backup-final').disabled, true)
    click(d, 'cancel-backup')
    assert.equal(d.querySelector('.review'), null)
  }
})
test('opt-in defaults off, approvals are labelled simulations, lock hides editors', () => {
  const d = setup()
  click(d, 'nav-access')
  assert.equal(d.getElementById('opt-in').checked, false)
  click(d, 'consent-once')
  assert.match(d.getElementById('consent-result').textContent, /Simulation selected/)
  click(d, 'nav-privacy')
  click(d, 'end-session')
  assert.equal(d.getElementById('end-session'), null)
  click(d, 'lock')
  click(d, 'nav-information')
  assert.equal(d.getElementById('preferredName'), null)
  assert.match(d.querySelector('main').textContent, /Lock simulation active/)
  click(d, 'reset-lock')
  assert.ok(d.getElementById('preferredName'))
})
test('all optional scalar types and custom gender preserve Phase 1 validation', async () => {
  const { createFixture, setValue, addField, LIMITS } = await import('../test-support/personal-profile-ui/state.js')
  const s = createFixture()
  setValue(s, 'number', 'number', '0'); assert.equal(s.values.number, 0)
  setValue(s, 'boolean', 'boolean', 'false'); assert.equal(s.values.boolean, false)
  setValue(s, 'boolean', 'boolean', ''); assert.equal(Object.hasOwn(s.values, 'boolean'), false)
  for (const [type, value] of [['number', 'Infinity'], ['date', '2025-02-30'], ['string', 'x'.repeat(1025)]]) assert.throws(() => setValue(s, 'bad', type, value))
  for (const id of ['preferredName', '__proto__', '1invalid']) assert.throws(() => addField(s, { id, label: 'Synthetic', type: 'string' }))
  for (let i = 0; i < LIMITS.customFields; i++) addField(s, { id: `field${i}`, label: 'Synthetic', type: 'string' })
  assert.throws(() => addField(s, { id: 'overflow', label: 'Synthetic', type: 'string' }))
  const d = setup()
  change(d, 'gender', 'custom')
  change(d, 'custom-gender', '')
  assert.equal(d.getElementById('custom-gender').getAttribute('aria-invalid'), 'true')
  change(d, 'custom-gender', 'Synthetic custom')
  assert.equal(d.getElementById('custom-gender').getAttribute('aria-invalid'), null)
})
test('instruction limits are atomic, Unicode is preserved and Profiles remain independent', () => {
  const d = setup()
  click(d, 'nav-instructions')
  change(d, 'global', '😀'.repeat(4096))
  change(d, 'global', 'x'.repeat(8193))
  assert.equal(d.getElementById('global').getAttribute('aria-invalid'), 'true')
  assert.equal(d.getElementById('global').value, '😀'.repeat(4096))
  change(d, 'instruction-mode', 'override')
  change(d, 'profile', 'Synthetic Lab')
  assert.equal(d.getElementById('instruction-mode').value, 'inherit')
  click(d, 'nav-access'); change(d, 'permission-fullName', 'allow'); click(d, 'add-profile')
  assert.equal(d.getElementById('permission-fullName').value, 'private')
})
test('English and Arabic pages expose labels, unique IDs and pass axe DOM checks', async () => {
  const { default: axe } = await import('axe-core')
  for (const locale of ['en', 'ar']) {
    const d = setup(locale)
    d.defaultView.eval(axe.source)
    for (const page of ['information', 'instructions', 'access', 'backup', 'privacy']) {
      click(d, `nav-${page}`)
      const ids = [...d.querySelectorAll('[id]')].map(x => x.id)
      assert.equal(new Set(ids).size, ids.length)
      for (const input of d.querySelectorAll('input,textarea,select')) assert.ok(d.querySelector(`label[for="${input.id}"]`))
      const result = await d.defaultView.axe.run(d, { rules: { 'color-contrast': { enabled: false } } })
      assert.equal(result.violations.length, 0, Array.from(result.violations, x => `${x.id}: ${x.description}`).join('\n'))
    }
    assert.equal(d.documentElement.dir, locale === 'ar' ? 'rtl' : 'ltr')
    d.defaultView.close()
  }
})
test('prototype never imports privileged engine or uses browser persistence/network', async () => {
  const { readFile } = await import('node:fs/promises')
  for (const file of ['app.js', 'state.js', 'messages.js', 'entry.js']) {
    const source = await readFile(new URL(`../test-support/personal-profile-ui/${file}`, import.meta.url), 'utf8')
    assert.doesNotMatch(source, /\b(fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|sendBeacon)\b/)
    assert.doesNotMatch(source, /core\/(consent|retrieval|model|instructions|policies|profile-identity)/)
  }
  const client = await readFile(new URL('../client.js', import.meta.url), 'utf8')
  assert.doesNotMatch(client, /personal-profile-ui|mountPrototype/)
  const { apply } = await import('../plugins/personal-profile/index.js')
  assert.equal(apply(new Proxy({}, { get() { throw new Error('Runtime must be inert') } })), undefined)
})


test('text edits preserve the caret and never replace destination controls on blur', () => {
  const d = setup()
  const input = d.getElementById('preferredName')
  input.focus()
  input.value = 'Synthetic'
  input.setSelectionRange(3, 3)
  input.dispatchEvent(new d.defaultView.Event('input', { bubbles: true }))
  assert.equal(d.activeElement.selectionStart, 3)
  const destination = d.getElementById('nav-instructions')
  d.getElementById('preferredName').dispatchEvent(new d.defaultView.Event('change', { bubbles: true }))
  assert.equal(d.getElementById('nav-instructions'), destination)
  destination.click()
  assert.equal(d.querySelector('[aria-current="page"]').id, 'nav-instructions')
})
