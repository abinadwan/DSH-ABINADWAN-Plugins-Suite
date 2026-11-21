// Regression coverage for the native-settings Personal Profile page.
// 0.7.2: unified profile (record v2), v0.7.1 migration, complete backup and
// two-strategy restore. Coverage changes are audited in
// docs/PERSONAL_PROFILE_V072_CHANGE_RECORD.md (section 13). Fictional data only.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { isVolatile } from '@deepseek-ai/cosmokit'
import { ok, refused } from '../test-support/client.js'
import { mountProfile, mockSettings, deferred, namespace, copy } from '../test-support/personal-profile.js'
import { Config, emptyRecord, emptyLegacyRecord, emptyPreferences } from '../plugins/personal-profile/index.js'

const SAVED = /تم تأكيد الحفظ/, FAILED = /تعذر تأكيد الحفظ/, CONFLICT = /نافذة أخرى/
const UNAVAILABLE = /غير متاحة/, INVALID = /غير صالحة/, MIGRATION = /بانتظار الترحيل/
const REVIEW = 'مراجعة النسخة'
const policies = (v = 'private') => ({ preferredName: v, nationality: v, gender: v })
const fictional = () => {
  // Historical regression tests deliberately exercise Arabic RTL; the actual
  // product default is now English and is covered by the dedicated test below.
  const record = { ...emptyRecord(), locale: 'ar' }
  record.information = { preferredName: 'Fictional Tester', nationality: 'Testland', gender: 'unspecified' }
  return record
}
const recordWith = mutate => { const r = fictional(); mutate?.(r); return r }
const legacyWith = mutate => {
  const r = emptyLegacyRecord()
  r.information = { preferredName: 'Legacy Tester', nationality: 'Oldland', gender: 'female' }
  r.locale = 'en'
  r.global = { ...emptyPreferences(), style: 'candid', responseLanguage: 'fr', presets: ['evidence'], custom: 'Legacy global instruction' }
  mutate?.(r)
  return r
}
const resolved = config => { const v = Config(config).record; return JSON.parse(JSON.stringify(isVolatile(v) ? v.get() : v)) }

test('new My Profile defaults to English and saved Arabic selection survives Reload', async t => {
  const fresh = emptyRecord()
  assert.equal(fresh.locale, 'en', 'new Host records default to English')
  assert.equal(resolved({}).locale, 'en', 'Host schema uses the same default')
  const transport = mockSettings(fresh)
  const view = await mountProfile(t, { transport })
  const panel = view.d.querySelector('[data-personal-profile-panel]')
  assert.equal(view.byId('language').value, 'en')
  assert.equal(panel.getAttribute('lang'), 'en')
  assert.equal(panel.getAttribute('dir'), 'ltr')
  assert.match(panel.textContent, /Interface language/)
  await view.select('language', 'ar')
  assert.equal(panel.getAttribute('lang'), 'ar')
  assert.equal(panel.getAttribute('dir'), 'rtl')
  assert.equal(view.byId('language').value, 'ar')
  assert.equal(transport.calls.length, 0, 'changing language alone does not silently save')
  await view.click('save')
  assert.equal(transport.record.locale, 'ar', 'explicit Save preserves chosen Arabic locale')
  await view.click('reload')
  assert.equal(view.byId('language').value, 'ar', 'Reload retains the saved language')
  assert.equal(panel.getAttribute('lang'), 'ar')
  assert.equal(panel.getAttribute('dir'), 'rtl')
})

// ---------- Native settings read contract ----------

test('describe failures, missing namespace and malformed views fail closed without writing', async t => {
  const view = record => ({ ns: namespace, value: { record }, revision: 0 })
  const cases = [
    ['remote refusal', async () => refused('access/denied', 'no')],
    ['rejected promise', async () => { throw new Error('transport down') }],
    ['bare value instead of RemoteResult', async () => ({ writable: true, namespaces: [view(emptyRecord())] })],
    ['missing namespace', async () => ok({ writable: true, namespaces: [{ ...view(emptyRecord()), ns: 'other' }] })],
    ['no namespaces array', async () => ok({ writable: true })],
    ['read-only provider', async () => ok({ writable: false, namespaces: [view(emptyRecord())] })],
    ['negative revision', async () => ok({ writable: true, namespaces: [{ ...view(emptyRecord()), revision: -1 }] })],
    ['fractional revision', async () => ok({ writable: true, namespaces: [{ ...view(emptyRecord()), revision: 1.5 }] })],
    ['unknown record field', async () => ok({ writable: true, namespaces: [view({ ...emptyRecord(), fullName: 'x' })] })],
    ['unsupported version', async () => ok({ writable: true, namespaces: [view({ ...emptyRecord(), version: 5 })] })],
    ['v2 record carrying Workspace rows', async () => ok({ writable: true, namespaces: [view({ ...emptyRecord(), workspaces: [] })] })],
    ['invalid policy value', async () => ok({ writable: true, namespaces: [view({ ...emptyRecord(), policies: { ...policies(), preferredName: 'always' } })] })],
    ['unknown preferences key', async () => ok({ writable: true, namespaces: [view({ ...emptyRecord(), preferences: { ...emptyPreferences(), secret: 1 } })] })],
    ['malformed legacy Workspace row', async () => ok({ writable: true, namespaces: [view({ ...emptyLegacyRecord(),
      workspaces: [{ id: 'w1', override: false, preferences: emptyPreferences(), policies: policies(), secret: 1 }] })] })],
    ['legacy invalid policy value', async () => ok({ writable: true, namespaces: [view({ ...emptyLegacyRecord(),
      workspaces: [{ id: 'w1', override: false, preferences: emptyPreferences(), policies: { ...policies(), gender: 'always' } }] })] })],
  ]
  for (const [label, describe] of cases) {
    await t.test(label, async t => {
      const calls = []
      const transport = { describe, replace: async (...args) => { calls.push(args); return refused('x', 'x') } }
      const view = await mountProfile(t, { transport })
      assert.match(view.status(), UNAVAILABLE, label)
      assert.equal(view.byId('save').disabled, true)
      assert.ok(view.d.querySelector('fieldset:disabled'))
      await view.click('save')
      assert.equal(calls.length, 0, 'never writes after a failed read')
    })
  }
})

test('saved values load from the Host, and a failed reload leaves the stored configuration untouched', async t => {
  const transport = mockSettings(fictional())
  let fail = false
  const describe = transport.describe
  transport.describe = async () => fail ? refused('gateway/internal', 'down') : describe()
  const { byId, click, status } = await mountProfile(t, { transport })
  assert.equal(byId('preferredName').value, 'Fictional Tester')
  fail = true
  await click('reload')
  assert.match(status(), UNAVAILABLE)
  assert.equal(transport.calls.length, 0)
  assert.equal(transport.record.information.preferredName, 'Fictional Tester', 'load failure never writes')
})

// ---------- Native settings write contract ----------

test('every write carries the revision last read; sequential saves advance it', async t => {
  const { type, click, status, transport } = await mountProfile(t)
  await type('preferredName', 'Fictional A'); await click('save')
  await type('preferredName', 'Fictional B'); await click('save')
  assert.deepEqual(transport.calls.map(c => [c.ns, c.expected]), [[namespace, 0], [namespace, 1]])
  assert.deepEqual(Object.keys(transport.calls[0].value), ['record'])
  assert.equal(transport.calls[0].value.record.version, 4)
  assert.match(status(), SAVED)
  assert.equal(transport.record.information.preferredName, 'Fictional B')
})

test('refused, thrown and unconfirmed writes never claim success and keep the draft', async t => {
  const mismatch = async (_ns, value) => ok({ ns: namespace, revision: 1, value: { record: { ...copy(value.record), information: { preferredName: 'Other', nationality: '', gender: '' } } } })
  const legacyAnswer = async () => ok({ ns: namespace, revision: 1, value: { record: emptyLegacyRecord() } })
  for (const [label, replace, expected] of [
    ['settings/rejected', async () => refused('settings/rejected', 'schema'), FAILED],
    ['settings/conflict', async () => refused('settings/conflict', 'stale'), CONFLICT],
    ['thrown transport', async () => { throw new Error('socket closed') }, FAILED],
    ['bare success value', async () => ({ ns: namespace, revision: 1 }), FAILED],
    ['wrong namespace view', async (_ns, value) => ok({ ns: 'other', revision: 1, value }), FAILED],
    ['view not matching the write', mismatch, FAILED],
    ['view answering a legacy record', legacyAnswer, FAILED],
  ]) {
    await t.test(label, async t => {
      const transport = mockSettings()
      transport.replace = replace
      const view = await mountProfile(t, { transport })
      await view.type('preferredName', 'Fictional Draft')
      await view.click('save')
      assert.match(view.status(), expected)
      assert.doesNotMatch(view.status(), SAVED)
      assert.equal(view.byId('preferredName').value, 'Fictional Draft', 'draft preserved')
      assert.equal(view.byId('save').disabled, true, 'retry requires a reload to learn the real revision')
    })
  }
})

test('an invalid backup review cannot re-enable Save after a conflict', async t => {
  const { type, click, status, byId, button, transport } = await mountProfile(t)
  await type('preferredName', 'Fictional Draft'); transport.conflict(); await click('save')
  assert.match(status(), CONFLICT)
  await click('tab-backup'); await type('restore-json', '{not json'); await button(REVIEW)
  assert.match(status(), CONFLICT)
  assert.equal(byId('save').disabled, true)
})

test('a newer change from another window is never silently overwritten', async t => {
  const { type, click, status, byId, transport } = await mountProfile(t)
  const other = fictional(); other.information.preferredName = 'Other Window'
  transport.external(other)
  await type('preferredName', 'This Window'); await click('save')
  assert.match(status(), CONFLICT)
  assert.equal(transport.record.information.preferredName, 'Other Window')
  await click('reload'); await click('reload-confirm')
  assert.equal(byId('preferredName').value, 'Other Window')
  assert.equal(byId('save').disabled, true, 'nothing dirty after reload')
})

test('duplicate Save clicks issue exactly one write', async t => {
  const transport = mockSettings()
  const pending = deferred(), real = transport.replace
  transport.replace = (...args) => { transport.calls.push({ held: true }); return pending.promise.then(() => real(...args)) }
  const view = await mountProfile(t, { transport })
  await view.type('preferredName', 'Fictional')
  const save = view.byId('save')
  await view.settle()
  save.click(); save.click(); save.click()
  await view.settle()
  assert.equal(transport.calls.filter(c => c.held).length, 1)
  pending.resolve(); await view.settle()
  assert.match(view.status(), SAVED)
})

test('stale describe answers cannot overwrite newer state after reconnect or unmount', async t => {
  const answers = []
  const transport = { describe: () => { const d = deferred(); answers.push(d); return d.promise }, replace: async () => refused('x', 'x') }
  const view = await mountProfile(t, { transport })
  assert.equal(answers.length, 1)
  view.app.ctx.emit('connection/reset')
  await view.settle()
  assert.equal(answers.length, 2, 'reconnect re-reads')
  const newer = fictional(); newer.information.preferredName = 'Newer'
  const older = fictional(); older.information.preferredName = 'Older'
  answers[1].resolve(ok({ writable: true, namespaces: [{ ns: namespace, value: { record: newer }, revision: 3 }] }))
  await view.settle()
  answers[0].resolve(ok({ writable: true, namespaces: [{ ns: namespace, value: { record: older }, revision: 1 }] }))
  await view.settle()
  assert.equal(view.byId('preferredName').value, 'Newer')
  await view.click('reload')
  await view.unmount()
  answers[2].resolve(ok({ writable: true, namespaces: [{ ns: namespace, value: { record: older }, revision: 9 }] }))
  await view.settle()
})

test('a reconnect during a save ignores the late answer and re-reads', async t => {
  const transport = mockSettings()
  const pending = deferred(), real = transport.replace
  transport.replace = (...args) => pending.promise.then(() => real(...args))
  const view = await mountProfile(t, { transport })
  await view.type('preferredName', 'Fictional'); await view.click('save')
  view.app.ctx.emit('connection/reset'); await view.settle()
  pending.resolve(); await view.settle()
  assert.doesNotMatch(view.status(), SAVED, 'answer from the old connection is not trusted')
  assert.match(view.status(), /أُعيد الاتصال/)
  assert.equal(view.byId('preferredName').value, 'Fictional', 'reconnect never discards the draft')
  await view.click('reload'); await view.click('reload-confirm')
  assert.equal(view.byId('preferredName').value, 'Fictional', 'reload shows what the Host actually committed')
})

test('withdrawn write access disables Save without issuing a write', async t => {
  const transport = mockSettings()
  const view = await mountProfile(t, { transport, access: action => action === 'settings/describe' })
  assert.doesNotMatch(view.status(), UNAVAILABLE, 'read still allowed')
  assert.equal(view.byId('save').disabled, true)
  assert.ok(view.d.querySelector('fieldset:disabled'))
  assert.equal(transport.calls.length, 0)
})

// ---------- Unified profile (no Workspace dependency) ----------

test('unified schema: version 4, one preference set and one policy set; no Workspace fields', () => {
  const value = resolved({})
  assert.deepEqual(value, emptyRecord())
  assert.equal(value.version, 4)
  assert.deepEqual(Object.keys(value), ['version', 'locale', 'information', 'preferences', 'policies'])
  assert.deepEqual(value.policies, policies())
  assert.equal(value.allowPersonalInformation, undefined)
  assert.equal(value.allowCloud, undefined)
  const schema = JSON.stringify(Config.toJSON())
  assert.doesNotMatch(schema, /fullName|dateOfBirth|customFields|password|apiKey/)
  assert.doesNotMatch(schema, /"max":64/, 'no Workspace count limit anywhere')
  assert.throws(() => Config({ record: { ...emptyRecord(), version: 5 } }), 'unsupported versions are rejected by the Host schema')
})

test('the Host schema keeps a stored v0.7.1 record intact (never stripped or rejected)', () => {
  const legacy = legacyWith(r => {
    r.workspaces = Array.from({ length: 150 }, (_, i) => ({ id: 'w' + i, override: true,
      preferences: { ...emptyPreferences(), style: 'technical' }, policies: policies(i % 2 ? 'allow' : 'ask_first') }))
    r.allowCloud = true
  })
  assert.deepEqual(resolved({ record: legacy }), legacy)
  assert.deepEqual(resolved({ record: emptyRecord() }), emptyRecord())
})

test('the page offers no Workspace selector, scope selector or override control', async t => {
  const { d, byId, click } = await mountProfile(t)
  for (const page of ['information', 'instructions', 'backup', 'privacy']) {
    await click('tab-' + page)
    for (const id of ['profile', 'instructions-scope', 'mode', 'override', 'global'])
      assert.equal(byId(id), null, `${page}: #pp-${id} removed`)
  }
  assert.doesNotMatch(d.body.textContent, /مساحة العمل الحالية|تخصيص مساحة العمل|نطاق التعليمات/)
  await click('tab-instructions')
  assert.match(d.body.textContent, /المحادثات الأصلية المدعومة/)
})

test('the page never reads the Workspace service; any Workspace list state leaves it unchanged', async t => {
  const view = await mountProfile(t, { transport: mockSettings(fictional()) })
  const before = view.d.querySelector('[data-personal-profile-panel]').innerHTML
  for (const snapshot of [{ items: [], phase: 'pending', state: 'loading' }, { items: [{ workspaceId: 'w9' }], phase: 'ready', state: 'error' },
    { items: Array.from({ length: 300 }, (_, i) => ({ workspaceId: 'x' + i })), phase: 'ready', state: 'idle' }]) {
    view.app.workspaces.set({ archivedSessionIds: [], pinnedSessionIds: [], error: null, ...snapshot })
    await view.settle()
    assert.equal(view.d.querySelector('[data-personal-profile-panel]').innerHTML, before)
  }
  const client = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
  const plugin = client.slice(client.indexOf('const profilePlugin'), client.indexOf('return {', client.indexOf('const profilePlugin')))
  assert.doesNotMatch(plugin, /'workspaces'|ctx\.workspaces/, 'Workspace service is not injected or read')
  const page = client.slice(client.indexOf('function PersonalProfilePage'), client.indexOf('// Contains a Personal Profile render'))
  assert.doesNotMatch(page, /workspaceSource|workspacesSnapshot|activeWorkspace/)
})

test('one set of preferences and policies is edited and saved for the whole profile', async t => {
  const { byId, click, select, type, transport } = await mountProfile(t)
  await click('tab-instructions')
  await select('style', 'technical'); await select('response-language', 'ja'); await click('preset-evidence')
  await type('custom', 'Fictional unified instruction')
  assert.match(byId('effective-instructions').textContent, /Japanese/)
  assert.doesNotMatch(byId('effective-instructions').textContent, /Fictional unified instruction/)
  await click('send-custom')
  assert.match(byId('effective-instructions').textContent, /Fictional unified instruction/)
  await type('custom', 'Fictional unified instruction changed')
  assert.equal(byId('send-custom').checked,false)
  assert.doesNotMatch(byId('effective-instructions').textContent, /Fictional unified instruction/)
  await type('custom', 'Fictional unified instruction')
  assert.match(byId('custom-count').textContent, /^29 \/ 8192/)
  await click('tab-information'); await click('policy-nationality'); await click('policy-gender')
  await click('save')
  const saved = transport.record
  assert.equal(saved.version, 4)
  assert.equal(saved.workspaces, undefined)
  assert.deepEqual([saved.preferences.style, saved.preferences.responseLanguage, saved.preferences.presets], ['technical', 'ja', ['evidence']])
  assert.deepEqual(saved.policies, { preferredName: 'private', nationality: 'allow', gender: 'allow' })
  await click('tab-instructions'); await click('reset-preferences')
  assert.equal(byId('style').value, 'default')
  assert.equal(byId('custom').value, '')
})

// ---------- Migration from v0.7.1 ----------

test('migration without Workspace data keeps information, locale, preferences and instructions; Save converts', async t => {
  const legacy = legacyWith()
  const transport = mockSettings(legacy)
  const view = await mountProfile(t, { transport })
  assert.ok(view.byId('migration'))
  assert.match(view.status(), /await migration/)
  assert.match(view.byId('migration').textContent, /nothing will be removed/)
  assert.equal(view.byId('migration-ack'), null, 'no discard confirmation when nothing is discarded')
  assert.equal(view.byId('preferredName').value, 'Legacy Tester')
  await view.click('tab-instructions')
  assert.equal(view.byId('style').value, 'candid'); assert.equal(view.byId('response-language').value, 'fr')
  assert.equal(view.byId('custom').value, 'Legacy global instruction')
  assert.equal(transport.calls.length, 0, 'loading never writes')
  assert.deepEqual(transport.record, legacy, 'stored record untouched until Save')
  assert.equal(view.byId('save').disabled, false)
  await view.click('save')
  assert.match(view.status(), /Save confirmed/)
  assert.deepEqual(transport.record, { version: 4, locale: 'en', information: legacy.information, preferences: legacy.global,
    policies: policies() })
  assert.equal(view.byId('migration'), null)
})

test('migration with Workspace overrides: review, export, explicit confirmation; no permission promotion', async t => {
  const legacy = legacyWith(r => {
    r.locale = 'ar'
    r.workspaces = [
      { id: 'ws-alpha', override: true, preferences: { ...emptyPreferences(), style: 'technical', custom: 'Alpha only' }, policies: policies('allow') },
      { id: 'ws-beta', override: false, preferences: emptyPreferences(), policies: { ...policies(), gender: 'ask_first' } },
    ]
    r.allowPersonalInformation = true; r.allowCloud = true
  })
  const transport = mockSettings(legacy)
  const view = await mountProfile(t, { transport })
  assert.match(view.status(), MIGRATION)
  const rows = [...view.byId('migration-workspaces').querySelectorAll('tbody tr')].map(r => r.textContent)
  assert.equal(rows.length, 2)
  assert.match(rows[0], /ws-alpha/); assert.match(rows[0], /سماح/)
  assert.match(rows[1], /ws-beta/); assert.match(rows[1], /اسأل أولًا/)
  assert.match(view.byId('migration').textContent, /مفاتيح المشاركة العامة كانت مفعّلة/)
  assert.equal(view.byId('save').disabled, true, 'Save waits for explicit discard confirmation')
  await view.click('save'); assert.equal(transport.calls.length, 0)
  // Export before migration: complete, unaltered v0.7.1 data (including Workspace policies).
  await view.click('legacy-download')
  assert.equal(view.downloads.length, 1)
  assert.equal(view.downloads[0].name, 'personal-profile-v0.7.1-settings.json')
  assert.deepEqual(JSON.parse(await view.blobText(view.downloads[0].blob)), legacy)
  await view.click('legacy-copy'); await view.settle()
  assert.deepEqual(JSON.parse(view.copied[0]), legacy)
  await view.click('legacy-view')
  assert.deepEqual(JSON.parse(view.byId('legacy-json').value), legacy)
  assert.equal(view.byId('legacy-json').getAttribute('dir'), 'ltr')
  // Reload before confirming re-reads the untouched v1 record.
  await view.click('reload'); await view.click('reload-confirm')
  assert.ok(view.byId('migration')); assert.deepEqual(transport.record, legacy)
  await view.click('migration-ack')
  assert.equal(view.byId('save').disabled, false)
  await view.click('save')
  assert.match(view.status(), SAVED)
  const saved = transport.record
  assert.deepEqual(saved.policies, policies(), 'Workspace Allow/Ask First never become unified permissions')
  assert.equal(saved.allowPersonalInformation, undefined); assert.equal(saved.allowCloud, undefined)
  assert.deepEqual(saved.preferences, legacy.global, 'global preferences kept, Workspace override not merged')
  assert.equal(saved.workspaces, undefined)
  assert.equal(view.byId('migration'), null)
})

test('a migration Save is revision-checked: a change from another window is not overwritten', async t => {
  const legacy = legacyWith()
  const transport = mockSettings(legacy)
  const view = await mountProfile(t, { transport })
  const other = fictional(); other.information.preferredName = 'Other Window'
  transport.external(other)
  await view.click('save')
  assert.match(view.status(), /changed in another window/)
  assert.equal(transport.record.information.preferredName, 'Other Window')
})

test('a v0.7.1 record with more than 64 Workspace rows loads and lists every row for review', async t => {
  const legacy = legacyWith(r => { r.workspaces = Array.from({ length: 90 }, (_, i) => ({ id: 'w' + i, override: true, preferences: emptyPreferences(), policies: policies() })) })
  const view = await mountProfile(t, { transport: mockSettings(legacy) })
  assert.equal(view.byId('migration-workspaces').querySelectorAll('tbody tr').length, 90)
})

test('Reload during migration with unsaved edits still asks first', async t => {
  const transport = mockSettings(legacyWith())
  const view = await mountProfile(t, { transport })
  await view.click('reload')
  assert.ok(view.byId('reload-prompt'), 'an unsaved migration counts as unsaved work')
  await view.click('reload-cancel')
  assert.ok(view.byId('migration'))
})

// ---------- Privacy boundaries ----------

test('My Information combines inputs and independent sharing checkboxes, all private by default', async t => {
  const { d, click, byId, transport } = await mountProfile(t, { transport: mockSettings(recordWith(r => { r.information.gender = 'female' })) })
  assert.equal(byId('tab-access'), null)
  for(const id of ['opt-in','cloud'])assert.equal(byId(id),null)
  for(const field of ['preferredName','nationality','gender']){
    assert.ok(byId(field))
    assert.equal(byId('policy-'+field).type,'checkbox')
    assert.equal(byId('policy-'+field).checked,false)
  }
  assert.equal(byId('shared-preview').textContent,'لا تتم مشاركة أي شيء.')
  await click('policy-gender')
  assert.match(byId('shared-preview').textContent,/الجنس/)
  assert.equal(transport.calls.length,0,'draft does not share until saved')
  await click('save')
  assert.equal(transport.record.policies.gender,'allow')
  await click('policy-gender');await click('save')
  assert.equal(transport.record.policies.gender,'private')
  assert.equal(transport.record.information.gender,'female')
  await click('tab-privacy')
  assert.match(d.body.textContent,/دون تشفير خاص بالإضافة/)
  assert.doesNotMatch(d.body.textContent,/مشفّر بالكامل|محمي بالتشفير|DPAPI|Argon/)
})

test('profile values never reach network, logs or the Host plugin APIs', async t => {
  const logs = []
  const logger = Object.fromEntries(['log', 'info', 'warn', 'error', 'debug'].map(k => [k, (...a) => logs.push(a.map(String).join(' '))]))
  const requests = []
  const view = await mountProfile(t, { console: logger, fetch: async url => { requests.push(String(url)); return { ok: false, status: 404, json: async () => ({}) } } })
  await view.type('preferredName', 'Fictional Secret Name')
  await view.click('tab-instructions'); await view.type('custom', 'Fictional instruction marker')
  await view.click('save')
  await view.click('tab-backup'); await view.click('export-view'); await view.click('export-download'); await view.click('export-copy')
  await view.settle()
  const leaked = [...logs, ...requests].filter(x => /Fictional (Secret|instruction)/.test(x))
  assert.deepEqual(leaked, [])
  assert.ok(requests.every(url => url.startsWith('https://api.github.com/') || url.startsWith('https://raw.githubusercontent.com/')), 'only release checks')
  assert.ok(requests.every(url => !/Fictional/.test(url)))
  const client = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
  const section = client.slice(client.indexOf('// Native settings editor.'), client.indexOf('const profilePlugin'))
  assert.doesNotMatch(section, /\b(fetch|localStorage|sessionStorage|indexedDB|XMLHttpRequest|WebSocket|sendBeacon|console\.)\b/)
  assert.doesNotMatch(section, /\b(skills|composer|prompt|sessionController|session\/send|tool)\b\s*[.(]/, 'no agent, skill or tool path')
  assert.doesNotMatch(section, /\b(require\(['"](fs|node:fs)|showSaveFilePicker|showOpenFilePicker|crypto\.subtle|dpapi)\b/i, 'no custom filesystem or encryption')
})

// ---------- Backup export ----------

const savedWithPermissions = () => recordWith(r => {
  r.locale = 'en'
  r.preferences = { ...emptyPreferences(), style: 'creative', responseLanguage: 'de', presets: ['steps', 'code'],
    traits: { ...emptyPreferences().traits, emoji: 0, detail: 2 }, custom: 'Line one\n  indented line\n\nSecond paragraph' }
  r.policies = { preferredName: 'allow', nationality: 'private', gender: 'private' }
})

test('export uses the same v2 settings and field policies via download, copy and view', async t => {
  const stored = savedWithPermissions()
  const archived = { ...stored, version: 2, allowPersonalInformation: false, allowCloud: false }
  const view = await mountProfile(t, { transport: mockSettings(stored) })
  await view.click('tab-backup')
  assert.match(view.d.body.textContent, /not encrypted/)
  assert.match(view.d.body.textContent, /saved access permissions/)
  await view.click('export-download')
  assert.equal(view.downloads.length, 1)
  assert.equal(view.downloads[0].name, 'personal-profile-backup.json')
  assert.equal(view.downloads[0].blob.type, 'application/json')
  const fileJson = JSON.parse(await view.blobText(view.downloads[0].blob))
  assert.deepEqual(fileJson, archived)
  assert.match(view.backupStatus(), /Download started/)
  await view.click('export-copy'); await view.settle()
  assert.deepEqual(JSON.parse(view.copied[0]), archived)
  assert.match(view.backupStatus(), /copied/)
  assert.equal(view.byId('export-json'), null)
  await view.click('export-view')
  const area = view.byId('export-json')
  assert.deepEqual(JSON.parse(area.value), archived)
  assert.equal(area.getAttribute('dir'), 'ltr', 'JSON is LTR in every interface language')
  assert.equal(area.readOnly, true)
  assert.match(area.style.fontFamily, /monospace/)
  assert.equal(view.byId('export-view').getAttribute('aria-expanded'), 'true')
  assert.equal(view.transport.calls.length, 0, 'export never writes')
})

test('export reports honestly when download or clipboard are unavailable', async t => {
  const view = await mountProfile(t, { download: false, clipboard: false })
  await view.select('language', 'en'); await view.click('tab-backup')
  await view.click('export-download')
  assert.match(view.backupStatus(), /Download is not available/)
  await view.click('export-copy'); await view.settle()
  assert.match(view.backupStatus(), /Could not copy/)
  await view.click('export-view')
  assert.ok(view.byId('export-json').value.includes('"version": 2'))
})

test('the JSON areas stay LTR and monospace in the Arabic RTL interface', async t => {
  const view = await mountProfile(t)
  await view.click('tab-backup'); await view.click('export-view')
  assert.equal(view.d.querySelector('[data-personal-profile-panel]').getAttribute('dir'), 'rtl')
  for (const id of ['export-json', 'restore-json']) {
    assert.equal(view.byId(id).getAttribute('dir'), 'ltr', id)
    assert.match(view.byId(id).style.fontFamily, /monospace/, id)
  }
})

// ---------- Backup import and restore ----------

async function review(view, backup, { strategy, file = false } = {}) {
  await view.click('tab-backup')
  if (file) await view.upload('import-file', typeof backup === 'string' ? backup : JSON.stringify(backup))
  else { await view.type('restore-json', typeof backup === 'string' ? backup : JSON.stringify(backup)); await view.button(REVIEW) }
  if (strategy) await view.click('strategy-' + strategy)
}

test('Replace All from a JSON file: preview, explicit confirmation, draft only, then explicit Save', async t => {
  const transport = mockSettings(fictional())
  const view = await mountProfile(t, { transport })
  const backup = savedWithPermissions()
  await review(view, backup, { file: true, strategy: 'replace' })
  assert.match(view.backupStatus(), /النسخة صالحة/)
  assert.equal(view.byId('restore-json').value, JSON.stringify(backup), 'file content shown for review')
  const preview = view.byId('restore-preview')
  const row = key => preview.querySelector(`[data-restore-row="${key}"]`).textContent
  assert.match(row('preferredName'), /Fictional Tester.*Fictional Tester/)
  assert.match(row('style'), /الافتراضي.*إبداعي/)
  assert.match(row('policy-preferredName'), /خاص.*خاص/, 'permissions default to Private in the preview')

  assert.equal(view.byId('restore-permissions').checked, false, 'permission restore is an unchecked option')
  assert.equal(view.byId('restore-apply').disabled, true, 'explicit confirmation required')
  await view.click('restore-confirm')
  assert.equal(view.byId('restore-apply').disabled, true, 'Replace All needs its own confirmation')
  await view.click('restore-replace-ack'); await view.click('restore-apply')
  assert.match(view.backupStatus(), /Nothing is saved yet/, 'the restored interface language (en) applies immediately')
  assert.equal(transport.calls.length, 0, 'restore never writes by itself')
  await view.click('save')
  assert.deepEqual(transport.record, { ...backup, policies: policies() })
})

test('optional permission restoration shows the exact permissions and needs its own acknowledgment', async t => {
  const transport = mockSettings(fictional())
  const view = await mountProfile(t, { transport })
  const backup = savedWithPermissions()
  await review(view, backup)
  await view.click('restore-confirm')
  await view.click('restore-permissions')
  const list = view.byId('restore-permission-list').textContent
  assert.match(list, /الاسم المفضل: سماح/); assert.match(list, /الجنسية: خاص/); assert.match(list, /الجنس: خاص/)

  assert.doesNotMatch(list, /مفعّل/)
  assert.equal(view.byId('restore-apply').disabled, true, 'permission acknowledgment required')
  assert.equal(view.byId('restore-confirm').checked, false, 'changing the permission choice resets the confirmation')
  await view.click('restore-permissions-ack'); await view.click('restore-confirm')
  assert.match(view.byId('restore-preview').querySelector('[data-restore-row="policy-preferredName"]').textContent, /سماح/)

  await view.click('restore-apply'); await view.click('save')
  assert.deepEqual(transport.record, backup, 'explicitly acknowledged sharing choices take effect after Save')
  await view.click('tab-information')
  assert.equal(view.byId('policy-preferredName').checked,true)
  assert.equal(view.byId('policy-nationality').checked,false)
  assert.equal(view.byId('opt-in'),null)
  assert.equal(view.byId('cloud'),null)
})

test('Review & Merge keeps existing text, appends new paragraphs, and skips duplicates', async t => {
  const current = recordWith(r => { r.preferences = { ...emptyPreferences(), style: 'candid', custom: 'Keep this.\n\n  - Shared rule\n  - second line' } })
  const transport = mockSettings(current)
  const view = await mountProfile(t, { transport })
  const backup = recordWith(r => {
    r.information.preferredName = 'Imported Name'
    r.preferences = { ...emptyPreferences(), style: 'technical', custom: '  - Shared rule\n  - second line\n\nImported paragraph\n    with indentation\r\n\r\nKeep this.' }
  })
  await review(view, backup, { strategy: 'merge' })
  const merged = view.byId('restore-merged')
  assert.equal(merged.value, 'Keep this.\n\n  - Shared rule\n  - second line\n\nImported paragraph\n    with indentation')
  await view.type('restore-merged', merged.value + '\n\nEdited during review')
  await view.click('restore-confirm'); await view.click('restore-apply'); await view.click('save')
  const saved = transport.record
  assert.equal(saved.information.preferredName, 'Imported Name')
  assert.equal(saved.preferences.style, 'technical', 'the supplied style replaces the existing style')
  assert.equal(saved.preferences.custom, 'Keep this.\n\n  - Shared rule\n  - second line\n\nImported paragraph\n    with indentation\n\nEdited during review')
})

test('merge handles empty and identical instructions without duplicating text', async t => {
  for (const [label, existing, imported, expected] of [
    ['identical', 'Same text', 'Same text', 'Same text'],
    ['imported empty explicitly clears', 'Existing', '', ''],
    ['existing empty', '', 'Imported only', 'Imported only'],
    ['whitespace-only difference', 'Para A\n\nPara B', '  Para B  \n\n\n\nPara A', 'Para A\n\nPara B'],
  ]) {
    await t.test(label, async t => {
      const view = await mountProfile(t, { transport: mockSettings(recordWith(r => { r.preferences.custom = existing })) })
      await review(view, recordWith(r => { r.preferences.custom = imported }), { strategy: 'merge' })
      assert.equal(view.byId('restore-merged').value, expected)
    })
  }
})

test('merged instructions over the limit are never truncated; Apply waits until they are shortened', async t => {
  const transport = mockSettings(recordWith(r => { r.preferences.custom = 'a'.repeat(5000) }))
  const view = await mountProfile(t, { transport })
  await review(view, recordWith(r => { r.preferences.custom = 'b'.repeat(5000) }), { strategy: 'merge' })
  const merged = view.byId('restore-merged')
  assert.equal(merged.value.length, 10002, 'full merged text, nothing cut')
  assert.equal(merged.getAttribute('aria-invalid'), 'true')
  assert.match(view.byId('restore-merged-count').textContent, /10002 \/ 8192.*لن يُقتطع/)
  assert.equal(view.byId('restore-confirm').disabled, true)
  assert.equal(view.byId('restore-apply').disabled, true)
  await view.type('restore-merged', 'a'.repeat(5000) + '\n\n' + 'b'.repeat(3000))
  await view.click('restore-confirm'); await view.click('restore-apply'); await view.click('save')
  assert.equal(transport.record.preferences.custom.length, 8002)
})

test('a v0.7.1 backup restores its global settings; Workspace entries are listed and not restored', async t => {
  const transport = mockSettings(fictional())
  const view = await mountProfile(t, { transport })
  const legacy = legacyWith(r => {
    r.workspaces = [{ id: 'old-ws', override: true, preferences: { ...emptyPreferences(), style: 'friendly' }, policies: policies('allow') }]
    r.allowCloud = true
  })
  await review(view, legacy)
  assert.deepEqual([...view.byId('restore-legacy').querySelectorAll('li')].map(li => li.textContent), ['old-ws'])
  assert.equal(view.byId('restore-permissions'), null, 'no unified permissions to restore from a v1 backup')
  assert.match(view.byId('restore-preview').textContent, /خاص/)
  await view.click('restore-confirm'); await view.click('restore-apply'); await view.click('save')
  assert.deepEqual(transport.record, { version: 4, locale: 'en', information: legacy.information, preferences: legacy.global,
    policies: policies() })
})

test('invalid, unsupported, oversized and malformed backups are rejected with a reason and no draft change', async t => {
  const base = fictional()
  const bad = [
    ['invalid JSON', '{"version":2,', /ليس JSON صالحًا/],
    ['empty', '', /غير صالح/],
    ['unsupported version', JSON.stringify({ ...base, version: 5 }), /إصدار النسخة غير مدعوم/],
    ['missing version', JSON.stringify({ ...base, version: undefined }), /إصدار النسخة غير مدعوم/],
    ['oversized', JSON.stringify({ ...base, information: { ...base.information, preferredName: 'x'.repeat(3_000_001) } }), /أكبر من الحد/],
    ['unknown field', JSON.stringify({ ...base, dateOfBirth: '2000-01-01' }), /حقولًا غير معروفة/],
    ['Workspace rows in a v2 backup', JSON.stringify({ ...base, workspaces: [] }), /حقولًا غير معروفة/],
    ['too-long name', JSON.stringify({ ...base, information: { ...base.information, preferredName: 'x'.repeat(129) } }), /غير صالح/],
    ['instructions over 8192', JSON.stringify({ ...base, preferences: { ...base.preferences, custom: 'x'.repeat(8193) } }), /لم يُقتطع شيء/],
    ['invalid policy', JSON.stringify({ ...base, policies: { ...base.policies, gender: 'always' } }), /صلاحية غير صالحة/],
    ['unknown policy field', JSON.stringify({ ...base, policies: { dateOfBirth: 'allow' } }), /صلاحية غير صالحة/],
    ['non-boolean switch', JSON.stringify({ ...base, version: 2, allowCloud: 'yes', allowPersonalInformation: false }), /غير صالح/],
    ['malformed preferences', JSON.stringify({ ...base, preferences: { ...base.preferences, traits: { warmth: 5 } } }), /غير صالح/],
    ['unknown preset', JSON.stringify({ ...base, preferences: { ...base.preferences, presets: ['run-skill'] } }), /غير صالح/],
    ['legacy duplicate workspace IDs', JSON.stringify({ ...emptyLegacyRecord(), workspaces: [1, 2].map(() => ({ id: 'w1', override: false, preferences: emptyPreferences(), policies: policies() })) }), /غير صالح/],
    ['legacy invalid policy', JSON.stringify({ ...emptyLegacyRecord(), workspaces: [{ id: 'w1', override: false, preferences: emptyPreferences(), policies: policies('always') }] }), /صلاحية غير صالحة/],
    ['array root', '[]', /غير صالح/],
    ['null root', 'null', /غير صالح/],
    ['prototype key', '{"__proto__":{"allowCloud":true}}', /غير مدعوم|غير صالح/],
  ]
  const view = await mountProfile(t, { transport: mockSettings(base) })
  await view.click('tab-backup')
  for (const [label, text, reason] of bad) {
    // The textarea limits typing to 3,000,000; set it programmatically to exercise the review guard.
    await view.type('restore-json', text)
    await view.button(REVIEW)
    assert.equal(view.byId('restore-apply'), null, label)
    assert.match(view.status(), INVALID, label)
    assert.match(view.backupStatus(), reason, label)
  }
  await view.click('tab-information')
  assert.equal(view.byId('preferredName').value, 'Fictional Tester')
  assert.equal(view.transport.calls.length, 0)
})

test('oversized or unreadable files are rejected before review', async t => {
  const view = await mountProfile(t, { transport: mockSettings(fictional()) })
  await view.click('tab-backup')
  await view.upload('import-file', '{}', { size: 3_000_001 })
  assert.match(view.backupStatus(), /أكبر من الحد/)
  assert.equal(view.byId('restore-apply'), null)
  await view.upload('import-file', 'not json at all')
  assert.match(view.backupStatus(), /ليس JSON صالحًا/)
  assert.equal(view.byId('restore-apply'), null)
  assert.equal(view.transport.calls.length, 0)
})

test('cancelling a reviewed restore, or editing its text, leaves the draft unchanged', async t => {
  const view = await mountProfile(t, { transport: mockSettings(fictional()) })
  const other = recordWith(r => { r.information.preferredName = 'Should Not Apply' })
  await review(view, other)
  assert.ok(view.byId('restore-apply'))
  await view.click('restore-cancel')
  assert.equal(view.byId('restore-apply'), null, 'Cancel discards the review')
  await view.button(REVIEW); assert.ok(view.byId('restore-apply'))
  await view.type('restore-json', '')
  assert.equal(view.byId('restore-apply'), null, 'editing the text discards the review')
  await view.button(REVIEW); await view.type('restore-json', JSON.stringify(other)); await view.button(REVIEW)
  await view.click('restore-confirm')
  await view.click('strategy-replace')
  assert.equal(view.byId('restore-confirm').checked, false, 'changing strategy needs a new confirmation')
  await view.click('tab-information')
  assert.equal(view.byId('preferredName').value, 'Fictional Tester')
  assert.equal(view.byId('save').disabled, true, 'nothing dirty')
})

test('restore starts with Review & Merge; Replace All is available after reviewing a backup', async t => {
  const view = await mountProfile(t)
  await view.click('tab-backup')
  assert.equal(view.byId('strategy-merge'), null)
  await review(view, fictional())
  const radios = [...view.d.querySelectorAll('input[name="pp-strategy"]')].map(x => x.value)
  assert.deepEqual(radios, ['merge', 'replace'])
  assert.equal(view.byId('strategy-merge').checked, true)
  assert.equal(view.byId('strategy-replace').checked, false)
  await view.select('language', 'en')
  assert.match(view.d.body.textContent, /Review & Merge/)
  assert.match(view.d.body.textContent, /including custom instructions/)
})

// ---------- Accessibility ----------

test('Arabic and English pages: labels, unique IDs, direction and axe DOM checks on every section', async t => {
  const { default: axe } = await import('axe-core')
  const legacy = legacyWith(r => { r.workspaces = [{ id: 'w1', override: true, preferences: emptyPreferences(), policies: policies('allow') }] })
  const view = await mountProfile(t, { transport: mockSettings(legacy) })
  view.dom.window.eval(axe.source)
  const audit = async label => {
    const ids = [...view.d.querySelectorAll('[id]')].map(x => x.id)
    assert.equal(new Set(ids).size, ids.length, `${label} duplicate id`)
    for (const control of view.d.querySelectorAll('input,textarea,select')) {
      const labelled = view.d.querySelector(`label[for="${control.id}"]`) || control.closest('label') || control.getAttribute('aria-label')
      assert.ok(labelled, `${label} unlabelled #${control.id}`)
    }
    const result = await view.dom.window.axe.run(view.d, { rules: { 'color-contrast': { enabled: false } } })
    assert.equal(result.violations.length, 0, `${label}: ` + result.violations.map(x => `${x.id}: ${x.nodes.map(n => n.target).join(',')}`).join('\n'))
  }
  for (const locale of ['ar', 'en']) {
    await view.select('language', locale)
    const panel = view.d.querySelector('[data-personal-profile-panel]')
    assert.equal(panel.getAttribute('dir'), locale === 'ar' ? 'rtl' : 'ltr')
    assert.equal(panel.getAttribute('lang'), locale)
    await view.click('legacy-view')
    for (const page of ['information', 'instructions', 'backup', 'privacy']) {
      await view.click('tab-' + page)
      if (page === 'backup') {
        await view.click('export-view')
        await view.type('restore-json', JSON.stringify(savedWithPermissions()))
        await view.button(locale === 'ar' ? REVIEW : 'Review backup')
        await view.click('strategy-replace')
        await view.click('restore-permissions')
        await audit(`${locale}/backup replace`)
        await view.click('strategy-merge')
      }
      await audit(`${locale}/${page}`)
      if (page === 'backup') { await view.click('restore-cancel'); await view.click('export-view') }
    }
    await view.click('legacy-view')
  }
})

// ---------- Protect unsaved changes ----------

async function dirtyDraft(view) {
  await view.type('preferredName', 'Unsaved Name')
  await view.click('tab-instructions'); await view.select('style', 'creative'); await view.type('custom', 'Unsaved instruction')
  await view.click('tab-information'); await view.click('policy-gender')
}
async function expectDraft(view) {
  await view.click('tab-information'); assert.equal(view.byId('preferredName').value, 'Unsaved Name')
  await view.click('tab-instructions'); assert.equal(view.byId('style').value, 'creative'); assert.equal(view.byId('custom').value, 'Unsaved instruction')
  await view.click('tab-information'); assert.equal(view.byId('policy-gender').checked,true)
}

test('Reload with unsaved changes asks first; cancel keeps the entire draft; confirm re-reads', async t => {
  const transport = mockSettings(fictional())
  const view = await mountProfile(t, { transport })
  await dirtyDraft(view)
  const reads = transport.describes.length
  await view.click('reload')
  assert.ok(view.byId('reload-prompt'))
  assert.match(view.byId('reload-prompt').textContent, /ستُفقد/)
  assert.equal(transport.describes.length, reads, 'nothing re-read before confirmation')
  await view.click('reload-cancel')
  assert.equal(view.byId('reload-prompt'), null)
  await expectDraft(view)
  assert.match(view.status(), /غير محفوظة/)
  await view.click('reload'); await view.click('reload-confirm')
  assert.equal(transport.describes.length, reads + 1)
  assert.equal(view.byId('reload-prompt'), null)
  await view.click('tab-information'); assert.equal(view.byId('preferredName').value, 'Fictional Tester')
  assert.equal(transport.calls.length, 0, 'confirmation never writes')
})

test('a restore applied to the draft is unsaved work protected by the Reload confirmation', async t => {
  const transport = mockSettings(fictional())
  const view = await mountProfile(t, { transport })
  await review(view, recordWith(r => { r.information.preferredName = 'Restored Draft' }))
  await view.click('restore-confirm'); await view.click('restore-apply')
  await view.click('reload')
  assert.ok(view.byId('reload-prompt'))
  await view.click('reload-cancel')
  await view.click('tab-information'); assert.equal(view.byId('preferredName').value, 'Restored Draft')
})

test('Reload without changes needs no confirmation', async t => {
  const transport = mockSettings(fictional())
  const view = await mountProfile(t, { transport })
  const reads = transport.describes.length
  await view.click('reload')
  assert.equal(view.byId('reload-prompt'), null)
  assert.equal(transport.describes.length, reads + 1)
})

test('failed and conflicting saves keep the draft and require confirmation to reload', async t => {
  for (const [label, answer, expected] of [
    ['failed', refused('settings/rejected', 'schema'), FAILED],
    ['conflict', refused('settings/conflict', 'stale'), CONFLICT],
  ]) {
    await t.test(label, async t => {
      const transport = mockSettings(fictional())
      transport.replace = async () => answer
      const view = await mountProfile(t, { transport })
      await dirtyDraft(view); await view.click('save')
      assert.match(view.status(), expected)
      await view.click('reload'); assert.ok(view.byId('reload-prompt'))
      await view.click('reload-cancel')
      await expectDraft(view)
      assert.match(view.status(), expected, 'cancel keeps the failure state')
      assert.equal(view.byId('save').disabled, true, 'still no retry without a fresh read')
    })
  }
})

test('a reconnect with unsaved changes keeps the draft; Save stays revision-checked', async t => {
  const transport = mockSettings(fictional())
  const view = await mountProfile(t, { transport })
  await dirtyDraft(view)
  const reads = transport.describes.length
  view.app.ctx.emit('connection/reset'); await view.settle()
  assert.equal(transport.describes.length, reads, 'no automatic re-read over a dirty draft')
  assert.match(view.status(), /أُعيد الاتصال/)
  await expectDraft(view)
  await view.click('save')
  assert.deepEqual(transport.calls.map(c => c.expected), [0])
  assert.match(view.status(), SAVED)
  const other = fictional(); other.information.preferredName = 'Other'
  await view.click('tab-information'); await view.type('preferredName', 'Again')
  transport.external(other)
  view.app.ctx.emit('connection/reset'); await view.settle()
  await view.click('save')
  assert.match(view.status(), CONFLICT, 'a stale draft after reconnect still cannot overwrite')
  assert.equal(transport.record.information.preferredName, 'Other')
})

test('a clean page re-reads automatically after reconnect', async t => {
  const transport = mockSettings(fictional())
  const view = await mountProfile(t, { transport })
  const reads = transport.describes.length
  view.app.ctx.emit('connection/reset'); await view.settle()
  assert.equal(transport.describes.length, reads + 1)
  assert.equal(view.byId('reload-prompt'), null)
})

test('the discard confirmation is localized in English', async t => {
  const view = await mountProfile(t)
  await view.select('language', 'en')
  await view.click('reload')
  assert.match(view.byId('reload-prompt').textContent, /unsaved changes that Reload will discard/)
  assert.equal(view.byId('reload-confirm').textContent, 'Discard changes and reload')
  assert.equal(view.byId('reload-cancel').textContent, 'Keep editing')
  await view.click('reload-cancel')
  assert.equal(view.byId('language').value, 'en', 'language change is part of the kept draft')
})

test('custom consent is saved explicitly, exported, and reset by both restore strategies', async t => {
  for (const strategy of ['replace','merge']) await t.test(strategy, async t => {
    const {byId,click,type,transport,...rest}=await mountProfile(t)
    const view={byId,click,type,transport,...rest}
    await click('tab-instructions')
    await type('custom','Fictional consent text')
    await click('send-custom')
    assert.equal(transport.calls.length,0)
    await click('save')
    assert.equal(transport.record.preferences.sendCustom,true)
    assert.equal(resolved({record:transport.record}).preferences.sendCustom,true)
    await click('reload')
    await click('tab-instructions')
    assert.equal(byId('send-custom').checked,true)
    await click('tab-backup'); await click('export-view')
    const backup=JSON.parse(byId('export-json').value)
    assert.equal(backup.preferences.sendCustom,true)
    backup.preferences.custom='Fictional imported replacement'
    await review(view,backup,{strategy})
    await click('restore-permissions'); await click('restore-permissions-ack')
    if(strategy==='replace')await click('restore-replace-ack')
    await click('restore-confirm'); await click('restore-apply')
    assert.equal(transport.record.preferences.sendCustom,true,'restore remains draft only')
    await click('tab-instructions')
    assert.equal(byId('send-custom').checked,false)
    assert.doesNotMatch(byId('effective-instructions').textContent,/Fictional/)
    await click('save')
    assert.notEqual(transport.record.preferences.sendCustom,true)
    assert.match(transport.record.preferences.custom,/Fictional imported replacement/)
  })
})
