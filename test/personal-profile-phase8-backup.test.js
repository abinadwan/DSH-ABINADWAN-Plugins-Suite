// Phase 8 backup regressions. The fixture is a SYNTHETIC equivalent of a real
// owner backup: a plaintext record-version-2 backup with personal information,
// legacy field-level Allow policies and both sharing switches Off. No real
// personal information is used, stored or read here.
//
// Owner decision (2026-11-20, simplified Phase 8): backups stay plain JSON (no
// password, no encryption), version 2 stays importable, Review & Merge is the
// default, Replace All needs its own confirmation, and a restore never turns
// sharing on.
import test from 'node:test'
import assert from 'node:assert/strict'
import { isVolatile } from '@deepseek-ai/cosmokit'
import { mountProfile, mockSettings, copy } from '../test-support/personal-profile.js'
import { Config, emptyRecord, emptyPreferences } from '../plugins/personal-profile/index.js'
import { responsePreferences, profileDisclosure } from '../plugins/personal-profile/preferences.js'

const NAME = 'SYNTHETIC_P8_NAME', NATIONALITY = 'SYNTHETIC_P8_NATIONALITY', GENDER = 'male'
const FIELD = new RegExp(`${NAME}|${NATIONALITY}|\\b${GENDER}\\b`)
const REVIEW = 'مراجعة النسخة', INVALID = /غير صالحة/
const privatePolicies = { preferredName: 'private', nationality: 'private', gender: 'private' }

/** Synthetic stand-in for the owner's legacy v2 backup. */
function legacyAllowBackup({ sendCustom = false, switches = false } = {}) {
  const r = emptyRecord()
  r.locale = 'en'
  r.information = { preferredName: NAME, nationality: NATIONALITY, gender: GENDER }
  r.preferences = { ...emptyPreferences(), style: 'technical', responseLanguage: 'ar', presets: ['evidence', 'steps'],
    traits: { ...emptyPreferences().traits, emoji: 0, detail: 2, structure: 2 }, custom: 'Synthetic standing instruction' }
  if (sendCustom) r.preferences.sendCustom = true
  r.policies = { preferredName: 'allow', nationality: 'allow', gender: 'allow' }
  r.allowPersonalInformation = switches
  r.allowCloud = switches
  return r
}
const nonSensitive = record => {
  const { sendCustom, ...preferences } = record.preferences
  return { locale: record.locale, preferences }
}
const hostRecord = record => { const v = Config({ record }).record; return copy(isVolatile(v) ? v.get() : v) }

async function restore(view, backup, { permissions = false, strategy } = {}) {
  await view.click('tab-backup')
  if (strategy) await view.click('strategy-' + strategy)
  await view.type('restore-json', JSON.stringify(backup))
  await view.button(REVIEW)
  await view.click('restore-confirm')
  if (permissions) { await view.click('restore-permissions'); await view.click('restore-permissions-ack'); await view.click('restore-confirm') }
  if (strategy === 'replace') await view.click('restore-replace-ack')
  await view.click('restore-apply')
  await view.click('save')
}

test('P8 legacy backup: the Host reads the v2 record unchanged; with both switches Off it shares no field', () => {
  for (const sendCustom of [false, true]) {
    const backup = legacyAllowBackup({ sendCustom })
    const stored = hostRecord(backup)
    assert.deepEqual(stored, backup, 'v2 is read as-is; nothing is migrated or promoted on load')
    assert.equal(profileDisclosure(stored), '', 'legacy Allow with both switches Off shares nothing')
    const text = responsePreferences(stored)
    assert.doesNotMatch(text, FIELD)
    assert.match(text, /Arabic/, 'non-sensitive preferences still apply')
  }
})

test('P8 legacy backup: default restore (merge) keeps preferences, resets permissions to Private and drops custom consent', async t => {
  const transport = mockSettings(emptyRecord())
  const view = await mountProfile(t, { transport })
  const backup = legacyAllowBackup({ sendCustom: true })
  await restore(view, backup)
  const saved = transport.record
  assert.deepEqual(saved.policies, privatePolicies, 'legacy Allow is not restored by default')
  assert.equal(saved.allowPersonalInformation, false)
  assert.equal(saved.allowCloud, false)
  assert.equal(Object.hasOwn(saved.preferences, 'sendCustom'), false, 'restored custom consent is never active')
  assert.deepEqual(nonSensitive(saved), nonSensitive(backup), 'style, language, traits, presets and text preserved exactly')
  assert.deepEqual(saved.information, backup.information, 'personal information restored')
  assert.equal(profileDisclosure(saved), '')
  assert.doesNotMatch(responsePreferences(saved), /Synthetic standing instruction/, 'custom text needs fresh consent')
})

test('P8 restore never turns sharing on: a backup with both switches On restores them Off, also with permissions opted in', async t => {
  for (const strategy of ['replace-merge', 'replace']) {
    const transport = mockSettings(emptyRecord())
    const view = await mountProfile(t, { transport })
    const backup = legacyAllowBackup({ switches: true })
    await restore(view, backup, { permissions: true, strategy })
    const saved = transport.record
    assert.deepEqual(saved.policies, backup.policies, 'field-level privacy settings restored after both acknowledgments')
    assert.equal(saved.allowPersonalInformation, false, strategy)
    assert.equal(saved.allowCloud, false, strategy)
    assert.deepEqual(nonSensitive(saved), nonSensitive(backup))
    assert.equal(profileDisclosure(saved), '', 'nothing is shared until the user turns both switches on')
    await view.click('tab-access')
    assert.equal(view.byId('shared-preview').textContent, 'Nothing is shared.')
  }
})

test('P8 Replace All needs its own confirmation; the default merge keeps the current custom instructions', async t => {
  const current = emptyRecord(); current.preferences.custom = 'Synthetic current paragraph'
  const transport = mockSettings(current)
  const view = await mountProfile(t, { transport })
  await view.click('tab-backup')
  await view.type('restore-json', JSON.stringify(legacyAllowBackup()))
  await view.button(REVIEW)
  await view.click('restore-confirm')
  assert.equal(view.byId('restore-replace-ack'), null, 'merge needs no Replace All confirmation')
  await view.click('restore-apply'); await view.click('save')
  assert.equal(transport.record.preferences.custom, 'Synthetic current paragraph\n\nSynthetic standing instruction')
  // Replace All: the apply button stays disabled until its confirmation is ticked.
  // The restored backup switched the interface to English.
  await view.click('tab-backup'); await view.click('strategy-replace')
  await view.type('restore-json', JSON.stringify(legacyAllowBackup()))
  await view.button('Review backup')
  await view.click('restore-confirm')
  assert.equal(view.byId('restore-apply').disabled, true)
  await view.click('restore-replace-ack')
  assert.equal(view.byId('restore-apply').disabled, false)
  await view.click('restore-apply'); await view.click('save')
  assert.equal(transport.record.preferences.custom, 'Synthetic standing instruction')
})

test('P8 backup import: malformed, unsupported or forged records are rejected with no draft change', async t => {
  const transport = mockSettings(emptyRecord())
  const view = await mountProfile(t, { transport })
  await view.click('tab-backup')
  for (const bad of [
    { ...legacyAllowBackup(), disclosure: { acknowledged: 'phase8-v1', providers: ['synthetic-cloud'] } },
    { ...legacyAllowBackup(), version: 3 },
    { ...legacyAllowBackup(), policies: { ...legacyAllowBackup().policies, gender: 'always' } },
    { ...legacyAllowBackup(), allowCloud: 'yes' },
    { ...legacyAllowBackup(), information: { ...legacyAllowBackup().information, preferredName: 'x'.repeat(129) } },
  ]) {
    await view.type('restore-json', JSON.stringify(bad))
    await view.button(REVIEW)
    assert.equal(view.byId('restore-apply'), null)
    assert.match(view.status(), INVALID)
  }
  assert.equal(transport.calls.length, 0)
})

test('P8 backup export: plain JSON that says it is not encrypted, with the saved permissions exactly as set', async t => {
  const view = await mountProfile(t, { transport: mockSettings(legacyAllowBackup()) })
  await view.click('tab-backup')
  assert.match(view.d.body.textContent, /not encrypted/)
  assert.equal(view.d.querySelector('input[type="password"]'), null, 'no password is asked')
  assert.doesNotMatch(view.d.body.textContent, /Argon|AES|DPAPI|encrypted backup/i, 'no backup encryption is offered')
  await view.click('export-view')
  const exported = JSON.parse(view.byId('export-json').value)
  assert.deepEqual(exported, legacyAllowBackup(), 'complete version 2 record, importable by 0.7.2 and 0.8.0-rc.1')
})
