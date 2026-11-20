// Phase 8 backup regressions. The fixture is a SYNTHETIC equivalent of a real
// owner backup: a plaintext record-version-2 backup with personal information,
// legacy field-level Allow policies and both sharing switches Off. No real
// personal information is used, stored or read here.
//
// Executable tests pin today's fail-closed behaviour. `todo` tests are the
// approved Phase 8 requirements (fresh consent, encrypted export, secure import)
// that have no implementation yet; they become ordinary tests when built.
import test from 'node:test'
import assert from 'node:assert/strict'
import { isVolatile } from '@deepseek-ai/cosmokit'
import { mountProfile, mockSettings, copy } from '../test-support/personal-profile.js'
import { Config, emptyRecord, emptyPreferences } from '../plugins/personal-profile/index.js'
import { responsePreferences } from '../plugins/personal-profile/preferences.js'

const NAME = 'SYNTHETIC_P8_NAME', NATIONALITY = 'SYNTHETIC_P8_NATIONALITY', GENDER = 'male'
const FIELD = new RegExp(`${NAME}|${NATIONALITY}|\\b${GENDER}\\b`)
const REVIEW = 'مراجعة النسخة', INVALID = /غير صالحة/
const privatePolicies = { preferredName: 'private', nationality: 'private', gender: 'private' }

/** Synthetic stand-in for the owner's legacy v2 backup. */
function legacyAllowBackup({ sendCustom = false } = {}) {
  const r = emptyRecord()
  r.locale = 'en'
  r.information = { preferredName: NAME, nationality: NATIONALITY, gender: GENDER }
  r.preferences = { ...emptyPreferences(), style: 'technical', responseLanguage: 'ar', presets: ['evidence', 'steps'],
    traits: { ...emptyPreferences().traits, emoji: 0, detail: 2, structure: 2 }, custom: 'Synthetic standing instruction' }
  if (sendCustom) r.preferences.sendCustom = true
  r.policies = { preferredName: 'allow', nationality: 'allow', gender: 'allow' }
  r.allowPersonalInformation = false
  r.allowCloud = false
  return r
}
const nonSensitive = record => {
  const { sendCustom, ...preferences } = record.preferences
  return { locale: record.locale, preferences }
}
const hostRecord = record => { const v = Config({ record }).record; return copy(isVolatile(v) ? v.get() : v) }

async function restore(view, backup, { permissions = false } = {}) {
  await view.click('tab-backup')
  await view.type('restore-json', JSON.stringify(backup))
  await view.button(REVIEW)
  await view.click('restore-confirm')
  if (permissions) { await view.click('restore-permissions'); await view.click('restore-permissions-ack'); await view.click('restore-confirm') }
  await view.click('restore-apply')
  await view.click('save')
}

test('P8 legacy backup: the Host accepts the v2 record unchanged and contributes no structured field', () => {
  for (const sendCustom of [false, true]) {
    const backup = legacyAllowBackup({ sendCustom })
    const stored = hostRecord(backup)
    assert.deepEqual(stored, backup, 'v2 is read as-is; nothing is migrated or promoted on load')
    const text = responsePreferences(stored)
    assert.doesNotMatch(text, FIELD)
    assert.match(text, /Arabic/, 'non-sensitive preferences still apply')
    // Even with both switches On, legacy Allow never activates disclosure today.
    assert.doesNotMatch(responsePreferences({ ...stored, allowPersonalInformation: true, allowCloud: true }), FIELD)
  }
})

test('P8 legacy backup: default restore keeps preferences, resets permissions to Private and drops custom consent', async t => {
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
  assert.deepEqual(saved.information, backup.information, 'information restored as local data only')
  assert.doesNotMatch(responsePreferences(saved), FIELD)
  assert.doesNotMatch(responsePreferences(saved), /Synthetic standing instruction/, 'custom text needs fresh consent')
})

test('P8 legacy backup: opted-in permission restore brings back Allow as saved-only state and discloses nothing', async t => {
  const transport = mockSettings(emptyRecord())
  const view = await mountProfile(t, { transport })
  const backup = legacyAllowBackup()
  await restore(view, backup, { permissions: true })
  const saved = transport.record
  assert.deepEqual(saved.policies, backup.policies, 'exact policies, after both acknowledgments')
  assert.equal(saved.allowPersonalInformation, false, 'switches are restored as Off, never turned On')
  assert.equal(saved.allowCloud, false)
  assert.deepEqual(nonSensitive(saved), nonSensitive(backup))
  assert.doesNotMatch(responsePreferences(saved), FIELD)
  await view.click('tab-access')
  assert.match(view.d.body.textContent, /No information is disclosed or sent today/)
})

test('P8 backup import: a forged disclosure consent is rejected, not restored', async t => {
  const transport = mockSettings(emptyRecord())
  const view = await mountProfile(t, { transport })
  await view.click('tab-backup')
  for (const forged of [
    { ...legacyAllowBackup(), disclosure: { acknowledged: 'phase8-v1', providers: ['synthetic-cloud'] } },
    { ...legacyAllowBackup(), version: 3, disclosure: { acknowledged: 'phase8-v1', providers: ['synthetic-cloud'] } },
  ]) {
    await view.type('restore-json', JSON.stringify(forged))
    await view.button(REVIEW)
    assert.equal(view.byId('restore-apply'), null)
    assert.match(view.status(), INVALID)
  }
  assert.equal(transport.calls.length, 0)
})

test('P8 backup export: the current export is plaintext and says so', async t => {
  const view = await mountProfile(t, { transport: mockSettings(legacyAllowBackup()) })
  await view.click('tab-backup')
  assert.match(view.d.body.textContent, /not encrypted/)
  await view.click('export-view')
  assert.match(view.byId('export-json').value, new RegExp(NAME), 'documented limitation until encrypted export lands')
})

// ---------- Approved Phase 8 requirements without an implementation yet ----------

test('P8 migration to record v3 activates nothing: acknowledgment null, no providers, Allow kept as saved-only', { todo: 'record v3 (plan 8B)' }, () => {
  assert.fail('record v3 migration is not implemented')
})

test('P8 disclosure needs a fresh acknowledgment of the current contract; restored or legacy Allow never activates it', { todo: 'admission (plan 8B/8C)' }, () => {
  assert.fail('fresh disclosure consent is not implemented')
})

test('P8 encrypted export: the downloaded bytes contain no synthetic field or instruction text', { todo: 'encrypted backup (plan 8G)' }, async t => {
  const view = await mountProfile(t, { transport: mockSettings(legacyAllowBackup()) })
  await view.click('tab-backup')
  await view.click('export-download')
  const text = await view.blobText(view.downloads.at(-1).blob)
  assert.doesNotMatch(text, FIELD)
  assert.doesNotMatch(text, /Synthetic standing instruction/)
})

test('P8 secure import: authenticate before parsing; wrong secret or tampering fails generically with no draft change', { todo: 'encrypted backup (plan 8G)' }, () => {
  assert.fail('encrypted import is not implemented')
})

test('P8 secure import never restores disclosure consent; a legacy plaintext v2 backup still imports with a warning', { todo: 'encrypted backup (plan 8G)' }, () => {
  assert.fail('encrypted import is not implemented')
})
