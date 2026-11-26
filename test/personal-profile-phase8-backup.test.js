// Phase 8 backup regressions. The fixture is a SYNTHETIC equivalent of a real
// owner backup: a plaintext record-version-2 backup with personal information,
// legacy field-level Allow policies and both sharing switches Off. No real
// personal information is used, stored or read here.
//
// Owner decision (2026-11-20, simplified Phase 8): backups stay plain JSON (no
// password, no encryption), version 2 stays importable, Review & Merge is the
// default, Replace All needs its own confirmation, and imported sharing choices need explicit review and Save.
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

test('legacy backup restores values after Save without old sharing fields',async t=>{
  const transport=mockSettings({...emptyRecord(),locale:'ar'}),view=await mountProfile(t,{transport}),backup=legacyAllowBackup({sendCustom:true})
  await restore(view,backup)
  assert.deepEqual(transport.record.information,backup.information);assert.deepEqual(nonSensitive(transport.record),nonSensitive(backup))
  assert.equal(transport.record.version,5);assert.equal(transport.record.policies,undefined);assert.equal(transport.record.preferences.sendCustom,undefined)
  assert.match(profileDisclosure(transport.record),new RegExp(NAME));assert.match(profileDisclosure(transport.record),new RegExp(NATIONALITY))
  assert.match(responsePreferences(transport.record),/Synthetic standing instruction/)
})

test('merge and replace ignore old permissions but preserve restored values',async t=>{
  for(const strategy of ['merge','replace'])await t.test(strategy,async t=>{
    const view=await mountProfile(t,{transport:mockSettings({...emptyRecord(),locale:'ar'})})
    const backup=legacyAllowBackup({switches:true});backup.policies.nationality='ask_first'
    await restore(view,backup,{strategy});assert.deepEqual(view.transport.record.information,backup.information)
    assert.equal(view.transport.record.policies,undefined);assert.equal(view.transport.record.allowCloud,undefined)
    assert.equal(view.byId('restore-permissions'),null)
  })
})

test('P8 Replace All needs its own confirmation; the default merge keeps the current custom instructions', async t => {
  const current = { ...emptyRecord(), locale: 'ar' }; current.preferences.custom = 'Synthetic current paragraph'
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
  const transport = mockSettings({ ...emptyRecord(), locale: 'ar' })
  const view = await mountProfile(t, { transport })
  await view.click('tab-backup')
  for (const bad of [
    { ...legacyAllowBackup(), disclosure: { acknowledged: 'phase8-v1', providers: ['synthetic-cloud'] } },
    { ...legacyAllowBackup(), version: 99 },
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

test('v5 JSON backup includes the complete draft without legacy consent switches',async t=>{
  const backup=legacyAllowBackup({sendCustom:true}),record={...emptyRecord(),...nonSensitive(backup),information:backup.information}
  const view=await mountProfile(t,{transport:mockSettings(record)})
  await view.click('tab-backup');await view.click('export-view');assert.match(view.d.body.textContent,/unencrypted/)
  assert.equal(view.d.querySelector('input[type="password"]'),null)
  assert.deepEqual(JSON.parse(view.byId('export-json').value),record);assert.deepEqual(view.transport.record,record)
})

test('v2-v4 retain old sharing scope until a reviewed Save upgrades the record',async t=>{
  for(const version of [2,3,4])await t.test(String(version),async t=>{
    const old={...legacyAllowBackup({sendCustom:false}),version}
    if(version===4){delete old.allowPersonalInformation;delete old.allowCloud;old.policies=privatePolicies}
    const transport=mockSettings(old),view=await mountProfile(t,{transport})
    assert.equal(view.byId('save').disabled,true);assert.equal(transport.calls.length,0);assert.equal(profileDisclosure(transport.record),'')
    await view.click('original-view');assert.deepEqual(JSON.parse(view.byId('original-json').value),old)
    await view.click('migration-ack');await view.click('save')
    assert.equal(transport.record.version,5);assert.deepEqual(transport.record.information,old.information);assert.equal(transport.record.policies,undefined)
    assert.match(profileDisclosure(transport.record),new RegExp(NAME));assert.match(responsePreferences(transport.record),/Synthetic standing instruction/)
  })
})

test('P8 integration: the default merge keeps omitted settings and applies explicit values', async t => {
  const {allowPersonalInformation: _master,allowCloud: _cloud,...old}=legacyAllowBackup({sendCustom:true})
  const current={...emptyRecord(),...nonSensitive(old),information:old.information}
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
  })
})

test('P8 integration: a new paste or file clears every confirmation and restores the default strategy', async t => {
  const view = await mountProfile(t, { transport: mockSettings({ ...emptyRecord(), locale: 'ar' }) })
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
    await view.click('restore-replace-ack')
    await view.click('restore-confirm')
    assert.equal(view.byId('restore-apply').disabled, false)
    await startSecondReview()
    assert.equal(view.byId('strategy-merge').checked, true)
    assert.equal(view.byId('restore-permissions'),null)
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


test('legacy sparse policy-only backup does not alter current values',async t=>{
  const current={...emptyRecord(),locale:'ar',information:{preferredName:NAME,nationality:NATIONALITY,gender:GENDER}},view=await mountProfile(t,{transport:mockSettings(current)})
  await restore(view,{version:4,policies:{gender:'private'}});assert.deepEqual(view.transport.record,current)
})

test('P8 integration: confirmed Replace All resets settings omitted from a sparse backup', async t => {
  const current = {...emptyRecord(),locale:'ar'}
  current.information = { preferredName: 'Previous name', nationality: 'Previous nationality', gender: 'male' }
  current.preferences.style = 'technical'
  const transport = mockSettings(current)
  const view = await mountProfile(t, { transport })
  await restore(view, { version: 4, information: { preferredName: 'Replacement name' } }, { strategy: 'replace' })
  assert.deepEqual(transport.record, {
    ...emptyRecord(),
    information: { preferredName: 'Replacement name', nationality: '', gender: '' },
  })
})
