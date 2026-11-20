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
import { act } from 'react'
import { isVolatile } from '@deepseek-ai/cosmokit'
import { mountProfile, mockSettings, copy, deferred } from '../test-support/personal-profile.js'
import { Config, emptyRecord, emptyPreferences } from '../plugins/personal-profile/index.js'
import { responsePreferences, profileDisclosure } from '../plugins/personal-profile/preferences.js'

const NAME = 'SYNTHETIC_P8_NAME', NATIONALITY = 'SYNTHETIC_P8_NATIONALITY', GENDER = 'male'
const FIELD = new RegExp(`${NAME}|${NATIONALITY}|\\b${GENDER}\\b`)
const REVIEW = 'مراجعة النسخة', INVALID = /غير صالحة/
const privatePolicies = { preferredName: 'private', nationality: 'private', gender: 'private' }

/** Synthetic stand-in for the owner's legacy v2 backup. */
function legacyAllowBackup({ sendCustom = false, switches = false } = {}) {
  const r = { ...emptyRecord(), version: 2 }
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
  await view.type('restore-json', JSON.stringify(backup))
  await view.button(REVIEW)
  if (strategy) await view.click('strategy-' + strategy)
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
  for (const strategy of ['merge', 'replace']) await t.test(strategy, async t => {
    const transport = mockSettings(emptyRecord())
    const view = await mountProfile(t, { transport })
    const backup = legacyAllowBackup({ switches: true })
    await restore(view, backup, { permissions: true, strategy })
    const saved = transport.record
    assert.deepEqual(saved.policies, backup.policies, 'field-level privacy settings restored after both acknowledgments')
    assert.equal(saved.allowPersonalInformation, false, strategy)
    assert.equal(saved.allowCloud, false, strategy)
    assert.deepEqual(nonSensitive(saved), nonSensitive(backup))
    assert.equal(profileDisclosure(saved), '', 'restored settings share nothing')
    await view.click('tab-access')
    assert.equal(view.byId('shared-preview').textContent, 'Nothing is shared.')
  })
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
  await view.click('tab-backup')
  await view.type('restore-json', JSON.stringify(legacyAllowBackup()))
  await view.button('Review backup')
  await view.click('strategy-replace')
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
    { ...legacyAllowBackup(), version: 4 },
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

test('P8 backup export: plain JSON uses the complete v2 shape and never carries active sharing switches', async t => {
  const record = { ...legacyAllowBackup({ sendCustom: true, switches: true }), version: 3 }
  const view = await mountProfile(t, { transport: mockSettings(record) })
  await view.click('tab-backup')
  assert.match(view.d.body.textContent, /not encrypted/)
  assert.equal(view.d.querySelector('input[type="password"]'), null, 'no password is asked')
  assert.doesNotMatch(view.d.body.textContent, /Argon|AES|DPAPI|encrypted backup/i, 'no backup encryption is offered')
  await view.click('export-view')
  const exported = JSON.parse(view.byId('export-json').value)
  assert.deepEqual(exported, { ...record, version: 2, allowPersonalInformation: false, allowCloud: false })
  assert.deepEqual(view.transport.record, record, 'export never rewrites the native record')
})


test('P8 integration: inert v2 switches load Off while existing instructions remain effective', async t => {
  const old = { ...legacyAllowBackup({ sendCustom: true, switches: true }), version: 2 }
  const stored = hostRecord(old)
  assert.deepEqual(stored, old, 'the Host reads the existing record without rewriting it')
  assert.equal(profileDisclosure(stored), '')
  assert.match(responsePreferences(stored), /Synthetic standing instruction/)
  const transport = mockSettings(old)
  const view = await mountProfile(t, { transport })
  await view.click('tab-access')
  assert.equal(view.byId('opt-in').checked, false)
  assert.equal(view.byId('cloud').checked, false)
  assert.equal(view.byId('opt-in').disabled, true)
  assert.equal(view.byId('cloud').disabled, true)
  assert.equal(view.byId('shared-preview').textContent, 'Nothing is shared.')
  assert.equal(transport.calls.length, 0, 'loading does not rewrite the old settings')
  assert.match(view.d.body.textContent, /Older versions require an archived Harness configuration or a version 2 JSON backup/)
  await view.click('rollback-view')
  const archived = { ...old, allowPersonalInformation: false, allowCloud: false }
  assert.deepEqual(JSON.parse(view.byId('rollback-json').value), archived)
  await view.click('rollback-copy')
  assert.deepEqual(JSON.parse(view.copied[0]), archived)
  await view.click('rollback-download')
  assert.deepEqual(JSON.parse(await view.blobText(view.downloads[0].blob)), archived)
  assert.deepEqual(transport.record, old, 'the pre-Save backup actions leave the native record intact')
  assert.equal(transport.calls.length, 0)
  await view.click('save')
  assert.deepEqual(transport.record, { ...archived, version: 3 })
  assert.equal(view.byId('rollback-download'), null)
})

test('P8 integration: the default merge keeps omitted settings and applies explicit values', async t => {
  const current = { ...legacyAllowBackup({ sendCustom: true, switches: true }), version: 3 }
  current.preferences.style = 'friendly'
  current.preferences.custom = 'Existing instruction'
  const transport = mockSettings(current)
  const view = await mountProfile(t, { transport })
  const backup = {
    version: 2, information: { preferredName: '' },
    preferences: { traits: { detail: 1 }, presets: [], sendCustom: true },
    policies: { gender: 'private' },
    allowPersonalInformation: true, allowCloud: true,
  }
  await view.click('tab-backup')
  await view.type('restore-json', JSON.stringify(backup))
  await view.button('Review backup')
  assert.equal(view.byId('strategy-merge').checked, true)
  await view.click('restore-confirm')
  await view.click('restore-apply')
  await view.click('save')
  const { sendCustom, ...previousPreferences } = current.preferences
  assert.deepEqual(transport.record, {
    ...current,
    information: { ...current.information, preferredName: '' },
    preferences: { ...previousPreferences, traits: { ...previousPreferences.traits, detail: 1 }, presets: [] },
    allowPersonalInformation: false,
    allowCloud: false,
  })
})

test('P8 integration: a new paste or file clears every confirmation and restores the default strategy', async t => {
  const view = await mountProfile(t, { transport: mockSettings(emptyRecord()) })
  const first = JSON.stringify(legacyAllowBackup())
  const second = JSON.stringify({ ...legacyAllowBackup(), information: { preferredName: 'Second backup' } })
  await view.click('tab-backup')
  await view.type('restore-json', first)
  await view.button(REVIEW)
  for (const startSecondReview of [
    async () => { await view.type('restore-json', second); await view.button(REVIEW) },
    async () => { await view.upload('import-file', second) },
    async () => { await view.button(REVIEW) },
  ]) {
    await view.click('strategy-replace')
    await view.click('restore-permissions')
    await view.click('restore-permissions-ack')
    await view.click('restore-replace-ack')
    await view.click('restore-confirm')
    assert.equal(view.byId('restore-apply').disabled, false)
    await startSecondReview()
    assert.equal(view.byId('strategy-merge').checked, true)
    assert.equal(view.byId('restore-permissions').checked, false)
    assert.equal(view.byId('restore-permissions-ack'), null)
    assert.equal(view.byId('restore-replace-ack'), null)
    assert.equal(view.byId('restore-confirm').checked, false)
    assert.equal(view.byId('restore-apply').disabled, true)
  }
})

test('P8 integration: an older file read cannot overwrite a newer pasted backup', async t => {
  const view = await mountProfile(t)
  await view.click('tab-backup')
  const slow = deferred()
  const older = legacyAllowBackup()
  const newer = { ...older, information: { ...older.information, preferredName: 'Newer pasted value' } }
  await act(async () => {
    const input = view.byId('import-file')
    Object.defineProperty(input, 'files', { value: [{ size: 100, text: () => slow.promise }] })
    input.dispatchEvent(new view.dom.window.Event('change', { bubbles: true }))
  })
  await view.type('restore-json', JSON.stringify(newer))
  await view.button(REVIEW)
  await view.click('restore-confirm')
  await act(async () => slow.resolve(JSON.stringify(older)))
  assert.equal(JSON.parse(view.byId('restore-json').value).information.preferredName, 'Newer pasted value')
  assert.equal(view.byId('restore-confirm').checked, true)
  await view.click('restore-apply')
  await view.click('save')
  assert.equal(view.transport.record.information.preferredName, 'Newer pasted value')
})


test('P8 integration: explicitly restoring sparse field policies preserves other policies on merge', async t => {
  const current = emptyRecord()
  current.policies = { preferredName: 'allow', nationality: 'ask_first', gender: 'allow' }
  const transport = mockSettings(current)
  const view = await mountProfile(t, { transport })
  await restore(view, { version: 3, policies: { gender: 'private' } }, { permissions: true })
  assert.deepEqual(transport.record.policies, { preferredName: 'allow', nationality: 'ask_first', gender: 'private' })
})

test('P8 integration: confirmed Replace All resets settings omitted from a sparse backup', async t => {
  const current = emptyRecord()
  current.information = { preferredName: 'Previous name', nationality: 'Previous nationality', gender: 'male' }
  current.preferences.style = 'technical'
  current.policies.gender = 'allow'
  const transport = mockSettings(current)
  const view = await mountProfile(t, { transport })
  await restore(view, { version: 3, information: { preferredName: 'Replacement name' } }, { strategy: 'replace' })
  assert.deepEqual(transport.record, {
    ...emptyRecord(),
    information: { preferredName: 'Replacement name', nationality: '', gender: '' },
  })
})
