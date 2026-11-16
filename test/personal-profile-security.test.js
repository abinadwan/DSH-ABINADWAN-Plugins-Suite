import test from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {createDataKey, seal, open} from '../plugins/personal-profile/security/crypto-envelope.js'
import {protectCurrentUser, unprotectCurrentUser, DpapiUnavailableError} from '../plugins/personal-profile/security/windows-dpapi.js'

test('AES-GCM envelope round-trips binary data using random IVs', () => {
  const key = createDataKey()
  const input = Buffer.from('synthetic fixture only: مرحبا')
  const first = seal(input, key)
  const second = seal(input, key)
  assert.deepEqual(open(first, key), input)
  assert.notEqual(first.iv, second.iv)
  assert.notEqual(first.ciphertext, second.ciphertext)
})

test('AES-GCM rejects wrong keys, altered ciphertext, altered tags, and malformed envelopes', () => {
  const key = createDataKey()
  const envelope = seal(Buffer.from('test-only'), key)
  assert.throws(() => open(envelope, createDataKey()))
  assert.throws(() => open({...envelope, ciphertext: Buffer.from('tampered').toString('base64')}, key))
  assert.throws(() => open({...envelope, tag: randomBytes(16).toString('base64')}, key))
  assert.throws(() => open({...envelope, version: 99}, key))
  assert.throws(() => open({...envelope, iv: 'not-base64'}, key))
  assert.throws(() => seal('not a buffer', key))
})

test('Personal Profile is still the disabled-by-default no-data scaffold', () => {
  const host = readFileSync(new URL('../plugins/personal-profile/index.js', import.meta.url), 'utf8')
  const patch = readFileSync(new URL('../cordis.patch.yml', import.meta.url), 'utf8')
  assert.match(host, /export function apply\(\) \{\}/)
  assert.match(patch, /id: abinadwan-personal-profile[\s\S]*?disabled: true/)
})

test('Windows DPAPI CurrentUser round-trips a synthetic key and rejects corruption', {skip: process.platform !== 'win32'}, async () => {
  const key = createDataKey()
  const blob = await protectCurrentUser(key)
  assert.ok(blob.length > key.length)
  assert.notDeepEqual(blob, key)
  const restoredKey = await unprotectCurrentUser(blob)
  assert.deepEqual(restoredKey, key)
  const encrypted = seal(Buffer.from('synthetic personal-profile test value'), key)
  assert.equal(open(encrypted, restoredKey).toString('utf8'), 'synthetic personal-profile test value')
  const corrupted = Buffer.from(blob)
  corrupted[corrupted.length - 1] ^= 0xff
  await assert.rejects(unprotectCurrentUser(corrupted), DpapiUnavailableError)
})

test('Windows DPAPI adapter fails closed on other operating systems', {skip: process.platform === 'win32'}, async () => {
  assert.throws(() => protectCurrentUser(createDataKey()), DpapiUnavailableError)
})
