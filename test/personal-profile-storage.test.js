import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { mkdtempSync, readFileSync, readdirSync, writeFileSync, rmSync, symlinkSync, linkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { seal, open, MAX_RECORD } from '../plugins/personal-profile/storage/envelope.js'
import { exportBackup, importBackup, KDF } from '../plugins/personal-profile/storage/backup.js'
import { createProductionStorage } from '../plugins/personal-profile/storage/lifecycle.js'
import { syntheticStorage } from '../test-support/personal-profile-storage.js'

const fixture = { fields: { preferredName: 'SYNTHETIC_SECRET_49' }, instructions: { global: 'synthetic inert instruction' } }
function setup(t, options = {}) {
  const root = mkdtempSync(join(tmpdir(), 'profile-storage-'))
  t.after(() => rmSync(root, {recursive: true, force: true}))
  const s = syntheticStorage(root, options)
  s.unlock()
  return { s, root }
}
test('record roundtrip, 128 unique nonces, metadata and ciphertext authentication, key isolation', () => {
  const key = randomBytes(32), context = { domain: 'local', identity: 'syntheticA' }
  const nonces = new Set()
  for (let i = 0; i < 128; i++) {
    const record = seal(fixture, key, context)
    nonces.add(JSON.parse(record).nonce)
    assert.equal(open(record, key, context).fields.preferredName, fixture.fields.preferredName)
  }
  assert.equal(nonces.size, 128)
  const record = seal(fixture, key, context), e = JSON.parse(record)
  for (const change of [{tag: randomBytes(16).toString('base64')}, {ciphertext: 'AAAA'}, {identity: 'syntheticB'}, {version: 2}, {extra: true}]) {
    assert.throws(() => open(Buffer.from(JSON.stringify({...e, ...change})), key, context), /Profile storage operation failed/)
  }
  assert.throws(() => open(record, randomBytes(32), context))
  assert.throws(() => open(record, key, {...context, domain: 'recovery'}))
  assert.throws(() => open(Buffer.alloc(MAX_RECORD + 1), key, context))
  assert.throws(() => open(Buffer.from('{broken'), key, context))
  assert.throws(() => seal({fields: {unknown: 'secret'}}, key, context))
})
test('portable Argon2id backup, wrong password, random salts/nonces and bounded metadata', async () => {
  const a = await exportBackup(fixture, 'synthetic-password'), b = await exportBackup(fixture, 'synthetic-password')
  assert.notEqual(JSON.parse(a).salt, JSON.parse(b).salt)
  assert.notEqual(JSON.parse(a).nonce, JSON.parse(b).nonce)
  assert.equal((await importBackup(a, 'synthetic-password')).fields.preferredName, fixture.fields.preferredName)
  await assert.rejects(importBackup(a, 'wrong'), /Profile storage operation failed/)
  for (const change of [{version: 7}, {tag: 'AAAA'}, {kdf: {...KDF, m: 2 ** 30}}, {kdf: {...KDF, t: 0}}, {kdf: {...KDF, p: 8}}, {kdf: {...KDF, algorithm: 'scrypt'}}]) {
    await assert.rejects(importBackup(Buffer.from(JSON.stringify({...JSON.parse(a), ...change})), 'synthetic-password'))
  }
  await assert.rejects(importBackup(Buffer.alloc(MAX_RECORD + 1), 'x'))
  await assert.rejects(exportBackup(fixture, 'x'.repeat(1025)))
})
test('atomic encrypted persistence, reopen, no plaintext, cross-profile isolation and corrupt records', t => {
  const {s, root} = setup(t)
  s.save('syntheticA', fixture)
  assert.equal(s.load('syntheticA').fields.preferredName, fixture.fields.preferredName)
  assert.equal(s.load('syntheticB'), null)
  const file = readdirSync(root).find(f => f.endsWith('.record'))
  const saved = readFileSync(join(root, file))
  assert.ok(!saved.includes(Buffer.from(fixture.fields.preferredName)))
  writeFileSync(join(root, file), Buffer.alloc(MAX_RECORD + 1))
  assert.throws(() => s.load('syntheticA'))
  writeFileSync(join(root, file), saved)
  s.lock(); s.unlock()
  assert.equal(s.load('syntheticA').fields.preferredName, fixture.fields.preferredName)
  assert.throws(() => s.load('../escape'))
})
test('interrupted writes preserve previous state and never promote abandoned temporary files', t => {
  let fail = false
  const {s, root} = setup(t, {beforeRename() { if (fail) throw Error('synthetic sensitive fault') }})
  s.save('syntheticA', fixture); fail = true
  assert.throws(() => s.save('syntheticA', {fields: {preferredName: 'new synthetic'}}), /^Error: Profile storage operation failed$/)
  assert.equal(s.load('syntheticA').fields.preferredName, fixture.fields.preferredName)
  writeFileSync(join(root, 'abandoned.tmp'), 'encrypted-placeholder')
  assert.equal(s.load('syntheticA').fields.preferredName, fixture.fields.preferredName)
})
test('symlink root and record attacks fail closed', t => {
  const {s, root} = setup(t)
  s.save('syntheticA', fixture)
  const file = readdirSync(root).find(f => f.endsWith('.record'))
  const target = join(root, 'other'); writeFileSync(target, 'synthetic')
  rmSync(join(root, file))
  try { symlinkSync(target, join(root, file)) } catch (e) { if (e.code === 'EPERM') return t.skip('Windows symlink privilege required; manual test mandatory'); throw e }
  assert.throws(() => s.load('syntheticA'))
  assert.throws(() => s.save('syntheticA', fixture))
  const alias = join(root, 'alias'); symlinkSync(root, alias, 'junction')
  assert.throws(() => syntheticStorage(alias).unlock())
})
test('review merge never overwrites, stale reviews fail, replace requires confirmation and recovery', t => {
  const {s} = setup(t)
  s.save('syntheticA', fixture)
  const incoming = {fields: {preferredName: 'incoming synthetic', nationality: 'synthetic'}, allowAgentUseApprovedProfileInformation: true}
  const review = s.review('syntheticA', incoming)
  assert.ok(review.conflicts.length)
  assert.throws(() => s.apply(review))
  s.apply(review, {keepExisting: true})
  assert.equal(s.load('syntheticA').fields.preferredName, fixture.fields.preferredName)
  assert.equal(s.load('syntheticA').fields.nationality, 'synthetic')
  assert.equal(s.load('syntheticA').allowAgentUseApprovedProfileInformation, false)
  assert.throws(() => s.apply(review, {keepExisting: true}))
  const replacement = s.review('syntheticA', incoming, 'replace')
  assert.throws(() => s.apply(replacement))
  s.apply(replacement, {confirmReplace: true})
  assert.equal(s.load('syntheticA').fields.preferredName, 'incoming synthetic')
  s.recover('syntheticA')
  assert.equal(s.load('syntheticA').fields.preferredName, fixture.fields.preferredName)
})
test('failed replacement rolls back and keeps protected recovery', t => {
  let count = 0, fail = false
  const {s} = setup(t, {beforeRename() { if (fail && ++count === 2) throw Error('fault') }})
  s.save('syntheticA', fixture); fail = true
  const review = s.review('syntheticA', {fields: {preferredName: 'replacement'}}, 'replace')
  assert.throws(() => s.apply(review, {confirmReplace: true}))
  assert.equal(s.load('syntheticA').fields.preferredName, fixture.fields.preferredName)
})
test('lock revokes secret capabilities, pending approvals/session grants and keys; import starts private', t => {
  const {s} = setup(t)
  s.save('syntheticA', fixture)
  const engine = s.access('syntheticA'), h = engine.host
  const p = h.registerProfile({name: 'synthetic', canonicalId: 'synthetic'})
  const c = h.registerCaller(), session = h.startSession(c, p), scope = h.registerScope({operation: 'read_field', purpose: 'synthetic'})
  h.setOptIn(true); h.setPermission(p, 'preferredName', 'ask_first')
  const approval = engine.reader.requestField(session, 'preferredName', scope)
  assert.equal(h.decide(approval.approval, 'allow_session'), true)
  assert.equal(engine.reader.consumeApproval(session, approval.approval).status, 'allowed')
  assert.equal(engine.reader.requestField(session, 'preferredName', scope).status, 'allowed')
  s.lock()
  assert.throws(() => engine.reader.requestField(session, 'preferredName', scope))
  assert.throws(() => h.instructions.preview(p))
  assert.throws(() => s.load('syntheticA'))
  s.unlock()
  assert.throws(() => engine.reader.consumeApproval(session, approval.approval))
  const fresh = s.access('syntheticA'), p2 = fresh.host.registerProfile({name: 'synthetic', canonicalId: 'synthetic'})
  fresh.host.setOptIn(true)
  const c2 = fresh.host.registerCaller(), se2 = fresh.host.startSession(c2, p2), sc2 = fresh.host.registerScope({operation: 'read_field', purpose: 'synthetic'})
  assert.equal(fresh.reader.requestField(se2, 'preferredName', sc2).status, 'denied')
})
test('production has no fake unlock/provider fallback', () => {
  for (const options of [{}, {test: true}, {provider: {acquire: () => randomBytes(32)}}]) assert.throws(() => createProductionStorage(options), /OS-protected key provider unavailable/)
})

test('optional inactivity deadline revokes access and backward clock locks', t => {
  let time = 0
  const {s} = setup(t, {inactivityMs: 900000, now: () => time})
  s.save('syntheticA', fixture)
  const access = s.access('syntheticA')
  time = 900000
  assert.throws(() => access.host.setOptIn(true))
  assert.equal(s.locked, true)
  s.unlock(); time--
  assert.throws(() => s.load('syntheticA'))
  assert.equal(s.locked, true)
})
test('custom type and instruction conflicts preserve existing validated values', t => {
  const {s} = setup(t)
  s.save('syntheticA', {customFields: [{id: 'custom', label: 'Synthetic', type: 'number'}], fields: {custom: 42}, instructions: {global: 'old'}})
  const r = s.review('syntheticA', {customFields: [{id: 'custom', label: 'Synthetic', type: 'string'}], fields: {custom: 'incoming'}, instructions: {global: 'new'}})
  assert.ok(r.conflicts.includes('definition:custom'))
  assert.ok(r.conflicts.includes('instructions:global'))
  s.apply(r, {keepExisting: true})
  assert.equal(s.load('syntheticA').fields.custom, 42)
  assert.equal(s.load('syntheticA').instructions.global, 'old')
  assert.throws(() => s.review('syntheticA', {permissions: {synthetic: 'allow'}}))
  assert.throws(() => s.review('syntheticA', {sessions: ['synthetic']}))
})
test('locking during a precommit operation prevents its commit', t => {
  let action = () => {}
  const {s} = setup(t, {beforeRename: () => action()})
  s.save('syntheticA', fixture)
  action = () => s.lock()
  assert.throws(() => s.save('syntheticA', {fields: {preferredName: 'changed'}}))
  s.unlock()
  assert.equal(s.load('syntheticA').fields.preferredName, fixture.fields.preferredName)
})

test('postcommit durability failure reports committed state and revokes old capabilities', {skip: process.platform === 'win32'}, async t => {
  const fs = (await import('node:fs')).default
  const {syncBuiltinESMExports} = await import('node:module')
  const {s} = setup(t)
  s.save('syntheticA', fixture)
  const old = s.access('syntheticA')
  const original = fs.fsyncSync
  let calls = 0
  fs.fsyncSync = fd => { if (++calls === 2) throw Error('synthetic fsync failure'); return original(fd) }
  syncBuiltinESMExports()
  try {
    const result = s.save('syntheticA', {fields: {preferredName: 'postcommit'}})
    assert.equal(result.committed, true)
    assert.equal(result.durable, false)
    assert.throws(() => old.host.setOptIn(true))
    assert.equal(s.load('syntheticA').fields.preferredName, 'postcommit')
  } finally { fs.fsyncSync = original; syncBuiltinESMExports() }
})

test('review binds revision to the exact bytes reviewed under concurrent replacement', async t => {
  const fs = (await import('node:fs')).default
  const {syncBuiltinESMExports} = await import('node:module')
  const {s, root} = setup(t)
  s.save('syntheticA', {fields: {preferredName: 'NEWER'}})
  const path = join(root, readdirSync(root).find(f => f.endsWith('.record')))
  const newer = readFileSync(path)
  s.save('syntheticA', {fields: {preferredName: 'OLDER'}})
  const original = fs.readSync
  let replaced = false
  fs.readSync = (...args) => {
    const n = original(...args)
    if (!n && !replaced) { replaced = true; writeFileSync(path, newer) }
    return n
  }
  syncBuiltinESMExports()
  let review
  try { review = s.review('syntheticA', {fields: {nationality: 'synthetic'}}) }
  finally { fs.readSync = original; syncBuiltinESMExports() }
  assert.throws(() => s.apply(review))
  assert.equal(s.load('syntheticA').fields.preferredName, 'NEWER')
})

test('hardlink records and stale crash locks fail closed without overwriting data', t => {
  const {s, root} = setup(t)
  s.save('syntheticA', fixture)
  const path = join(root, readdirSync(root).find(f => f.endsWith('.record')))
  linkSync(path, join(root, 'hardlink'))
  assert.throws(() => s.load('syntheticA'))
  assert.throws(() => s.save('syntheticA', fixture))
  rmSync(join(root, 'hardlink'))
  writeFileSync(join(root, '.writer-lock'), '', {mode: 0o600})
  assert.throws(() => s.save('syntheticA', {fields: {preferredName: 'changed'}}))
  assert.equal(s.load('syntheticA').fields.preferredName, fixture.fields.preferredName)
})
test('unavailable or incorrect key providers fail without plaintext fallback or sensitive errors', async t => {
  const {assembleStorage} = await import('../plugins/personal-profile/storage/lifecycle.js')
  const {s, root} = setup(t)
  s.save('syntheticA', fixture)
  const unavailable = assembleStorage(root, {acquire() {throw Error('synthetic-password')}, release() {}})
  assert.throws(() => unavailable.unlock(), /^Error: Profile storage operation failed$/)
  assert.equal(unavailable.locked, true)
  const wrong = assembleStorage(root, {acquire: () => randomBytes(32), release() {}})
  wrong.unlock()
  assert.throws(() => wrong.load('syntheticA'), /^Error: Profile storage operation failed$/)
  wrong.lock()
})
test('no storage code logs, calls network or connects to the browser/Host entrypoint', () => {
  const dir = new URL('../plugins/personal-profile/storage/', import.meta.url)
  for (const file of readdirSync(dir)) {
    const code = readFileSync(new URL(file, dir), 'utf8')
    assert.doesNotMatch(code, /console\.|process\.(?:stdout|stderr)|fetch\(|node:(?:http|https|net)|child_process/)
  }
  for (const file of ['../client.js', '../plugins/personal-profile/index.js']) {
    assert.doesNotMatch(readFileSync(new URL(file, import.meta.url), 'utf8'), /storage\//)
  }
})

test('RFC 9106 Argon2id known-answer vector validates the pinned implementation', async () => {
  const {argon2idAsync} = await import('@noble/hashes/argon2.js')
  const key = await argon2idAsync(new Uint8Array(32).fill(1), new Uint8Array(16).fill(2), {
    m: 32, t: 3, p: 4, dkLen: 32, version: 19,
    key: new Uint8Array(8).fill(3), personalization: new Uint8Array(12).fill(4),
  })
  assert.equal(Buffer.from(key).toString('hex'), '0d640df58d78766c08c037a34a8b53c9d01ef0452d75b65eb52520e96b01e659')
  key.fill(0)
})
test('process death before rename leaves only encrypted orphan and recoverable prior record', async t => {
  const {spawnSync} = await import('node:child_process')
  const {s, root} = setup(t)
  s.save('syntheticA', fixture)
  const module = new URL('../plugins/personal-profile/storage/lifecycle.js', import.meta.url).href
  const script = `import {assembleStorage} from ${JSON.stringify(module)};
    const s=assembleStorage(process.argv[1],{acquire:()=>Buffer.alloc(32,9),release(){}},
      {beforeRename(){process.kill(process.pid,'SIGKILL')}});
    s.unlock();s.save('syntheticA',{fields:{preferredName:'SYNTHETIC_CRASH_SECRET'}});`
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script, root], {timeout: 15000})
  assert.notEqual(result.status, 0)
  assert.equal(s.load('syntheticA').fields.preferredName, fixture.fields.preferredName)
  assert.ok(readdirSync(root).includes('.writer-lock'))
  for (const f of readdirSync(root)) assert.ok(!readFileSync(join(root, f)).includes(Buffer.from('SYNTHETIC_CRASH_SECRET')))
  assert.throws(() => s.save('syntheticA', fixture))
  // Trusted synthetic Host now proved child termination and exclusive ownership.
  rmSync(join(root, '.writer-lock'))
  for (const f of readdirSync(root).filter(f => f.endsWith('.tmp'))) rmSync(join(root, f))
  assert.equal(s.save('syntheticA', fixture).committed, true)
})

test('locking invalidates pending approval handles and provider-owned key bytes are cleared', async t => {
  const {assembleStorage} = await import('../plugins/personal-profile/storage/lifecycle.js')
  const {root} = setup(t)
  const issued = randomBytes(32)
  let released = 0
  const s = assembleStorage(root, {acquire: () => issued, release() { released++ }})
  s.unlock()
  assert.ok(issued.every(byte => byte === 0))
  s.save('syntheticA', fixture)
  const {host, reader} = s.access('syntheticA')
  const p = host.registerProfile({name: 'synthetic', canonicalId: 'synthetic'})
  host.setOptIn(true); host.setPermission(p, 'preferredName', 'ask_first')
  const session = host.startSession(host.registerCaller(), p)
  const scope = host.registerScope({operation: 'read_field', purpose: 'synthetic'})
  const pending = reader.requestField(session, 'preferredName', scope)
  assert.equal(pending.status, 'approval_required')
  s.lock()
  assert.equal(released, 1)
  assert.throws(() => host.decide(pending.approval, 'allow_once'))
  assert.throws(() => reader.consumeApproval(session, pending.approval))
})
