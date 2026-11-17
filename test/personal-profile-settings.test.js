// Phase 6D regression coverage for the native-settings Personal Profile page.
// Replaces still-relevant coverage from the removed encrypted-storage suites
// (see docs/PERSONAL_PROFILE_LOCAL_SETTINGS.md, "Removed-test audit").
// Fictional data only.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { isVolatile } from '@deepseek-ai/cosmokit'
import { ok, refused } from '../test-support/client.js'
import { mountProfile, mockSettings, deferred, namespace, copy } from '../test-support/personal-profile.js'
import { Config, emptyRecord } from '../plugins/personal-profile/index.js'

const SAVED = /تم تأكيد الحفظ/, FAILED = /تعذر تأكيد الحفظ/, CONFLICT = /نافذة أخرى/
const UNAVAILABLE = /غير متاحة/, INVALID = /غير صالحة/
const fictional = () => {
  const record = emptyRecord()
  record.information = { preferredName: 'Fictional Tester', nationality: 'Testland', gender: 'unspecified' }
  return record
}

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
    ['unsupported version', async () => ok({ writable: true, namespaces: [view({ ...emptyRecord(), version: 2 })] })],
    ['unknown workspace key', async () => ok({ writable: true, namespaces: [view({ ...emptyRecord(),
      workspaces: [{ id: 'w1', override: false, preferences: emptyRecord().global, policies: { preferredName: 'private', nationality: 'private', gender: 'private' }, secret: 1 }] })] })],
    ['invalid policy value', async () => ok({ writable: true, namespaces: [view({ ...emptyRecord(),
      workspaces: [{ id: 'w1', override: false, preferences: emptyRecord().global, policies: { preferredName: 'always', nationality: 'private', gender: 'private' } }] })] })],
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
  assert.match(status(), SAVED)
  assert.equal(transport.record.information.preferredName, 'Fictional B')
})

test('refused, thrown and unconfirmed writes never claim success and keep the draft', async t => {
  const mismatch = async (_ns, value) => ok({ ns: namespace, revision: 1, value: { record: { ...copy(value.record), information: { preferredName: 'Other', nationality: '', gender: '' } } } })
  for (const [label, replace, expected] of [
    ['settings/rejected', async () => refused('settings/rejected', 'schema'), FAILED],
    ['settings/conflict', async () => refused('settings/conflict', 'stale'), CONFLICT],
    ['thrown transport', async () => { throw new Error('socket closed') }, FAILED],
    ['bare success value', async () => ({ ns: namespace, revision: 1 }), FAILED],
    ['wrong namespace view', async (_ns, value) => ok({ ns: 'other', revision: 1, value }), FAILED],
    ['view not matching the write', mismatch, FAILED],
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
  await click('tab-backup'); await type('restore-json', '{not json'); await button('مراجعة النسخة')
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

// ---------- Workspace and Profile isolation ----------

test('only trusted Host workspace IDs are offered; malformed or pending lists offer none', async t => {
  const long = 'x'.repeat(257)
  const view = await mountProfile(t, { items: [{ workspaceId: 'w1', title: 'A' }, { workspaceId: '' }, { workspaceId: 7 }, { workspaceId: long }, { title: 'no id' }] })
  assert.deepEqual(Array.from(view.byId('profile').options, o => o.value), ['w1'])
  for (const snapshot of [{ items: [{ workspaceId: 'w1' }], phase: 'pending', state: 'loading' }, { items: [{ workspaceId: 'w1' }], phase: 'ready', state: 'error' }]) {
    view.app.workspaces.set({ archivedSessionIds: [], pinnedSessionIds: [], error: null, ...snapshot })
    await view.settle()
    assert.equal(view.byId('profile') === null, true, 'no fabricated workspace')
    await view.click('tab-access')
    assert.equal(view.byId('policy-gender') === null, true)
    await view.click('tab-information')
  }
})

test('workspace overrides replace global only when enabled; reset restores inheritance; other workspaces untouched', async t => {
  const { byId, click, select, type, transport } = await mountProfile(t)
  await click('tab-instructions')
  await select('style', 'friendly')
  await select('instructions-scope', 'environment')
  assert.equal(byId('mode').value, 'inherit')
  assert.equal(byId('style') === null, true, 'inherited scope is not editable')
  assert.match(byId('effective-instructions').textContent, /friendly/)
  await select('mode', 'custom'); await select('style', 'technical'); await type('override', 'Fictional override text')
  assert.match(byId('effective-instructions').textContent, /technical/)
  assert.doesNotMatch(byId('effective-instructions').textContent, /friendly/, 'override replaces, never merges')
  await select('profile', 'w2')
  assert.equal(byId('mode').value, 'inherit')
  assert.match(byId('effective-instructions').textContent, /friendly/)
  await select('profile', 'w1'); await click('save')
  let saved = transport.record
  assert.deepEqual(saved.workspaces.map(w => w.id), ['w1'], 'w2 never written')
  assert.equal(saved.workspaces[0].preferences.custom, 'Fictional override text')
  assert.equal(saved.global.style, 'friendly')
  await select('mode', 'inherit')
  assert.match(byId('effective-instructions').textContent, /friendly/)
  await click('save')
  assert.deepEqual(transport.record.workspaces, [], 'back to inherit + Private: nothing workspace-specific is stored')
})

test('records for workspaces the Host no longer lists are preserved but never shown', async t => {
  const stored = emptyRecord()
  stored.workspaces = [{ id: 'deleted', override: true, preferences: { ...emptyRecord().global, custom: 'old' }, policies: { preferredName: 'private', nationality: 'private', gender: 'private' } }]
  const transport = mockSettings(stored)
  const { byId, click, type } = await mountProfile(t, { transport })
  assert.deepEqual(Array.from(byId('profile').options, o => o.value), ['w1', 'w2'])
  await type('preferredName', 'Fictional'); await click('save')
  assert.deepEqual(transport.record.workspaces.map(w => w.id), ['deleted'])
})

// ---------- Privacy boundaries ----------

test('schema defaults: every field optional, every policy Private, both opt-ins Off', () => {
  const value = Config({}).record
  const resolved = JSON.parse(JSON.stringify(isVolatile(value) ? value.get() : value))
  assert.deepEqual(resolved, emptyRecord())
  assert.deepEqual(resolved.information, { preferredName: '', nationality: '', gender: '' })
  assert.equal(resolved.allowPersonalInformation, false)
  assert.equal(resolved.allowCloud, false)
  const schema = JSON.stringify(Config.toJSON())
  assert.doesNotMatch(schema, /fullName|dateOfBirth|customFields|password|apiKey/)
})

test('access settings are disclosed as saved, non-enforced preferences; no encryption is claimed', async t => {
  const { d, click } = await mountProfile(t)
  await click('tab-access')
  const text = d.body.textContent
  assert.match(text, /غير مفعّل/)
  assert.match(text, /لا يتم الوصول للمعلومات أو إرسالها حاليًا/)
  await click('tab-privacy')
  assert.match(d.body.textContent, /دون تشفير خاص بالإضافة/)
  assert.doesNotMatch(d.body.textContent, /مشفّر بالكامل|محمي بالتشفير|DPAPI|Argon/)
})

test('profile values never reach network, logs or the Host plugin APIs', async t => {
  const logs = []
  const logger = Object.fromEntries(['log', 'info', 'warn', 'error', 'debug'].map(k => [k, (...a) => logs.push(a.map(String).join(' '))]))
  const requests = []
  const view = await mountProfile(t, { console: logger, fetch: async url => { requests.push(String(url)); return { ok: false, status: 404, json: async () => ({}) } } })
  await view.type('preferredName', 'Fictional Secret Name')
  await view.click('tab-instructions'); await view.type('global', 'Fictional instruction marker')
  await view.click('save')
  await view.click('tab-backup'); await view.button('عرض نسخة JSON')
  const leaked = [...logs, ...requests].filter(x => /Fictional (Secret|instruction)/.test(x))
  assert.deepEqual(leaked, [])
  assert.ok(requests.every(url => url.startsWith('https://api.github.com/') || url.startsWith('https://raw.githubusercontent.com/')), 'only release checks')
  assert.ok(requests.every(url => !/Fictional/.test(url)))
  const client = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
  const section = client.slice(client.indexOf('// Native settings editor.'), client.indexOf('const profilePlugin'))
  assert.doesNotMatch(section, /\b(fetch|localStorage|sessionStorage|indexedDB|XMLHttpRequest|WebSocket|sendBeacon|console\.)\b/)
  assert.doesNotMatch(section, /\b(skills|composer|prompt|sessionController|session\/send|tool)\b\s*[.(]/, 'no agent, skill or tool path')
})

// ---------- Backup and restore ----------

const recordWith = mutate => { const r = fictional(); mutate?.(r); return r }
const policies = (v = 'private') => ({ preferredName: v, nationality: v, gender: v })

test('export is local JSON without grants; import stages a reviewed draft and needs explicit Save', async t => {
  const { byId, click, select, type, button, transport } = await mountProfile(t, { transport: mockSettings(fictional()) })
  await click('tab-access'); await click('opt-in'); await click('cloud'); await select('policy-gender', 'allow')
  await click('save')
  assert.equal(transport.record.allowCloud, true)
  await click('tab-backup'); await button('عرض نسخة JSON')
  const exported = JSON.parse(byId('export-json').value)
  assert.equal(exported.allowCloud, false); assert.equal(exported.allowPersonalInformation, false)
  assert.ok(exported.workspaces.every(w => Object.values(w.policies).every(p => p === 'private')))
  assert.equal(exported.information.preferredName, 'Fictional Tester')
  const writes = transport.calls.length
  const incoming = recordWith(r => {
    r.information.preferredName = 'Imported Name'; r.allowCloud = true; r.allowPersonalInformation = true
    r.workspaces = [{ id: 'w1', override: false, preferences: emptyRecord().global, policies: policies('allow') },
      { id: 'unknown-imported', override: true, preferences: emptyRecord().global, policies: policies('allow') }]
  })
  await select('backup-strategy', 'replace'); await type('restore-json', JSON.stringify(incoming)); await button('مراجعة النسخة')
  assert.ok(byId('restore-apply'))
  assert.equal(byId('restore-apply').disabled, true, 'explicit confirmation required')
  await click('restore-confirm'); await click('restore-apply')
  assert.equal(transport.calls.length, writes, 'restore never writes by itself')
  await click('save')
  const saved = transport.record
  assert.equal(saved.information.preferredName, 'Imported Name')
  assert.equal(saved.allowCloud, false); assert.equal(saved.allowPersonalInformation, false)
  assert.deepEqual(saved.workspaces.map(w => [w.id, w.policies]), [['w1', policies()], ['unknown-imported', policies()]],
    'imported unknown workspace IDs acquire no access')
})

test('merge keeps existing values, fills empty ones, appends absent workspaces and resets grants', async t => {
  const current = recordWith(r => {
    r.information = { preferredName: 'Kept', nationality: '', gender: '' }
    r.global.style = 'candid'
    r.workspaces = [{ id: 'w1', override: true, preferences: { ...emptyRecord().global, style: 'technical' }, policies: policies('allow') }]
  })
  const { click, type, button, transport } = await mountProfile(t, { transport: mockSettings(current) })
  const incoming = recordWith(r => {
    r.information = { preferredName: 'Ignored', nationality: 'Filled', gender: 'female' }
    r.global.style = 'creative'
    r.workspaces = [{ id: 'w1', override: false, preferences: emptyRecord().global, policies: policies('allow') },
      { id: 'w9', override: true, preferences: { ...emptyRecord().global, style: 'friendly' }, policies: policies('ask_first') }]
  })
  await click('tab-backup'); await type('restore-json', JSON.stringify(incoming)); await button('مراجعة النسخة')
  await click('restore-confirm'); await click('restore-apply'); await click('save')
  const saved = transport.record
  assert.deepEqual(saved.information, { preferredName: 'Kept', nationality: 'Filled', gender: 'female' })
  assert.equal(saved.global.style, 'candid')
  assert.deepEqual(saved.workspaces.map(w => [w.id, w.preferences.style, w.policies]), [['w1', 'technical', policies()], ['w9', 'friendly', policies()]])
})

test('invalid, unsupported, oversized and malformed backups are rejected without changing the draft', async t => {
  const base = fictional()
  const bad = [
    ['invalid JSON', '{"version":1,'],
    ['empty', ''],
    ['unsupported version', JSON.stringify({ ...base, version: 2 })],
    ['oversized', JSON.stringify({ ...base, information: { ...base.information, preferredName: 'x'.repeat(3_000_001) } })],
    ['unknown field', JSON.stringify({ ...base, dateOfBirth: '2000-01-01' })],
    ['too-long name', JSON.stringify({ ...base, information: { ...base.information, preferredName: 'x'.repeat(129) } })],
    ['duplicate workspace IDs', JSON.stringify({ ...base, workspaces: [1, 2].map(() => ({ id: 'w1', override: false, preferences: emptyRecord().global, policies: policies() })) })],
    ['malformed preferences', JSON.stringify({ ...base, global: { ...base.global, traits: { warmth: 5 } } })],
    ['unknown preset', JSON.stringify({ ...base, global: { ...base.global, presets: ['run-skill'] } })],
    ['empty workspace ID', JSON.stringify({ ...base, workspaces: [{ id: '', override: false, preferences: emptyRecord().global, policies: policies() }] })],
    ['overlong workspace ID', JSON.stringify({ ...base, workspaces: [{ id: 'w'.repeat(257), override: false, preferences: emptyRecord().global, policies: policies() }] })],
    ['record over the payload limit', JSON.stringify({ ...base, workspaces: Array.from({ length: 400 }, (_, i) => ({ id: 'w' + i, override: true, preferences: { ...emptyRecord().global, custom: 'x'.repeat(8000) }, policies: policies() })) })],
    ['array root', '[]'],
    ['prototype key', '{"__proto__":{"allowCloud":true}}'],
  ]
  const view = await mountProfile(t, { transport: mockSettings(base) })
  await view.click('tab-backup')
  for (const [label, text] of bad) {
    // The textarea limits typing to 3,000,000; set it programmatically to exercise the review guard.
    await view.type('restore-json', text)
    await view.button('مراجعة النسخة')
    assert.equal(view.byId('restore-apply') === null, true, label)
    assert.match(view.status(), INVALID, label)
  }
  await view.click('tab-information')
  assert.equal(view.byId('preferredName').value, 'Fictional Tester')
  assert.equal(view.transport.calls.length, 0)
})

test('cancelling a reviewed restore leaves the draft unchanged', async t => {
  const view = await mountProfile(t, { transport: mockSettings(fictional()) })
  await view.click('tab-backup')
  await view.type('restore-json', JSON.stringify(recordWith(r => { r.information.preferredName = 'Should Not Apply' })))
  await view.button('مراجعة النسخة')
  assert.ok(view.byId('restore-apply'))
  await view.type('restore-json', '')
  assert.equal(view.byId('restore-apply') === null, true, 'editing the text discards the review')
  await view.click('tab-information')
  assert.equal(view.byId('preferredName').value, 'Fictional Tester')
  assert.equal(view.byId('save').disabled, true, 'nothing dirty')
})

// ---------- Accessibility (restored from the removed prototype suite, now on the real page) ----------

test('Arabic and English pages: labels, unique IDs, direction and axe DOM checks on every section', async t => {
  const { default: axe } = await import('axe-core')
  const view = await mountProfile(t)
  view.dom.window.eval(axe.source)
  for (const locale of ['ar', 'en']) {
    await view.select('language', locale)
    const panel = view.d.querySelector('[data-personal-profile-panel]')
    assert.equal(panel.getAttribute('dir'), locale === 'ar' ? 'rtl' : 'ltr')
    assert.equal(panel.getAttribute('lang'), locale)
    for (const page of ['information', 'instructions', 'access', 'backup', 'privacy']) {
      await view.click('tab-' + page)
      if (page === 'instructions') { await view.select('instructions-scope', 'environment'); await view.select('mode', 'custom') }
      if (page === 'backup') await view.button(locale === 'ar' ? 'عرض نسخة JSON' : 'Show JSON backup')
      const ids = [...view.d.querySelectorAll('[id]')].map(x => x.id)
      assert.equal(new Set(ids).size, ids.length, `${locale}/${page} duplicate id`)
      for (const control of view.d.querySelectorAll('input,textarea,select')) {
        const labelled = view.d.querySelector(`label[for="${control.id}"]`) || control.closest('label') || control.getAttribute('aria-label')
        assert.ok(labelled, `${locale}/${page} unlabelled #${control.id}`)
      }
      const result = await view.dom.window.axe.run(view.d, { rules: { 'color-contrast': { enabled: false } } })
      assert.equal(result.violations.length, 0, `${locale}/${page}: ` + result.violations.map(x => `${x.id}: ${x.nodes.map(n => n.target).join(',')}`).join('\n'))
    }
  }
})

// ---------- Hardening: no artificial workspace count ----------

const wsRecord = (id, extra = {}) => ({ id, override: true, preferences: { ...emptyRecord().global, style: 'technical' }, policies: policies(), ...extra })
const manyItems = n => Array.from({ length: n }, (_, i) => ({ workspaceId: 'w' + i, title: 'Workspace ' + i }))

test('schema and decoder accept more than 64 workspace overrides', () => {
  const record = emptyRecord()
  record.workspaces = Array.from({ length: 150 }, (_, i) => wsRecord('w' + i))
  const value = Config({ record }).record
  assert.equal((isVolatile(value) ? value.get() : value).workspaces.length, 150)
  assert.doesNotMatch(JSON.stringify(Config.toJSON()), /"max":64/)
})

test('with 70 stored overrides, editing further Workspaces is saved, never silently dropped', async t => {
  const stored = emptyRecord()
  stored.workspaces = Array.from({ length: 70 }, (_, i) => wsRecord('w' + i))
  const transport = mockSettings(stored)
  const { byId, click, select, status } = await mountProfile(t, { transport, items: manyItems(80) })
  await click('tab-instructions'); await select('instructions-scope', 'environment')
  for (const id of ['w75', 'w76', 'w77']) {
    await select('profile', id)
    assert.equal(byId('mode').value, 'inherit', 'a new Workspace inherits global')
    await select('mode', 'custom'); await select('style', 'candid')
  }
  await click('tab-access'); await select('profile', 'w79'); await select('policy-gender', 'ask_first')
  await click('save')
  assert.match(status(), SAVED)
  const saved = transport.record.workspaces
  assert.equal(saved.length, 74)
  assert.deepEqual(['w75', 'w76', 'w77'].map(id => saved.find(w => w.id === id).preferences.style), ['candid', 'candid', 'candid'])
  const w79 = saved.find(w => w.id === 'w79')
  assert.deepEqual([w79.override, w79.policies], [false, { ...policies(), gender: 'ask_first' }], 'policy-only row; preferences still inherited')
  assert.ok(saved.slice(0, 70).every((w, i) => w.id === 'w' + i && w.preferences.style === 'technical'), 'existing rows untouched')
})

test('a backup with more than 64 workspaces restores completely with every grant reset', async t => {
  const transport = mockSettings(fictional())
  const { click, type, button, status } = await mountProfile(t, { transport })
  const incoming = fictional()
  incoming.allowCloud = true
  incoming.workspaces = Array.from({ length: 120 }, (_, i) => wsRecord('ws-' + i, { policies: policies('allow') }))
  await click('tab-backup'); await type('restore-json', JSON.stringify(incoming)); await button('مراجعة النسخة')
  await click('restore-confirm'); await click('restore-apply'); await click('save')
  assert.match(status(), SAVED)
  assert.equal(transport.record.workspaces.length, 120)
  assert.ok(transport.record.workspaces.every(w => JSON.stringify(w.policies) === JSON.stringify(policies())))
  assert.equal(transport.record.allowCloud, false)
})

test('a merge exceeding the payload guard is rejected and leaves the draft unchanged', async t => {
  const big = n => Array.from({ length: n }, (_, i) => wsRecord('big-' + n + '-' + i, { preferences: { ...emptyRecord().global, custom: 'x'.repeat(8000) } }))
  const stored = fictional(); stored.workspaces = big(200)
  const transport = mockSettings(stored)
  const view = await mountProfile(t, { transport })
  const incoming = fictional(); incoming.workspaces = big(190)
  await view.click('tab-backup'); await view.type('restore-json', JSON.stringify(incoming)); await view.button('مراجعة النسخة')
  assert.equal(view.byId('restore-apply') === null, true)
  assert.match(view.status(), INVALID)
  assert.equal(view.byId('save').disabled, true, 'draft unchanged, nothing dirty')
  assert.equal(transport.calls.length, 0)
})

test('returning a Workspace to inherit with Private policies stores no row; other rows stay', async t => {
  const stored = emptyRecord(); stored.workspaces = [wsRecord('w1'), wsRecord('w2')]
  const transport = mockSettings(stored)
  const { click, select } = await mountProfile(t, { transport })
  await click('tab-instructions'); await select('instructions-scope', 'environment'); await select('profile', 'w1')
  await select('mode', 'inherit'); await click('save')
  assert.deepEqual(transport.record.workspaces.map(w => w.id), ['w2'])
  await click('tab-access'); await select('profile', 'w1'); await select('policy-nationality', 'ask_first'); await click('save')
  assert.deepEqual(transport.record.workspaces.map(w => [w.id, w.override]), [['w2', true], ['w1', false]])
  await select('policy-nationality', 'private'); await click('save')
  assert.deepEqual(transport.record.workspaces.map(w => w.id), ['w2'])
})

// ---------- Hardening: protect unsaved changes ----------

async function dirtyDraft(view) {
  await view.type('preferredName', 'Unsaved Name')
  await view.click('tab-instructions'); await view.select('style', 'creative')
  await view.select('instructions-scope', 'environment'); await view.select('mode', 'custom'); await view.select('style', 'efficient')
  await view.click('tab-access'); await view.select('policy-gender', 'ask_first')
}
async function expectDraft(view) {
  await view.click('tab-information'); assert.equal(view.byId('preferredName').value, 'Unsaved Name')
  await view.click('tab-instructions'); await view.select('instructions-scope', 'global'); assert.equal(view.byId('style').value, 'creative')
  await view.select('instructions-scope', 'environment'); assert.equal(view.byId('mode').value, 'custom'); assert.equal(view.byId('style').value, 'efficient')
  await view.click('tab-access'); assert.equal(view.byId('policy-gender').value, 'ask_first')
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
  assert.equal(view.byId('reload-prompt') === null, true)
  await expectDraft(view)
  assert.match(view.status(), /غير محفوظة/)
  await view.click('reload'); await view.click('reload-confirm')
  assert.equal(transport.describes.length, reads + 1)
  assert.equal(view.byId('reload-prompt') === null, true)
  await view.click('tab-information'); assert.equal(view.byId('preferredName').value, 'Fictional Tester')
  assert.equal(transport.calls.length, 0, 'confirmation never writes')
})

test('Reload without changes needs no confirmation', async t => {
  const transport = mockSettings(fictional())
  const view = await mountProfile(t, { transport })
  const reads = transport.describes.length
  await view.click('reload')
  assert.equal(view.byId('reload-prompt') === null, true)
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
  assert.equal(view.byId('reload-prompt') === null, true)
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
