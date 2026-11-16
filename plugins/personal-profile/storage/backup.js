// Portable pure-JS Argon2id: no native addon, OS credential dependency or fallback.
import { argon2idAsync } from '@noble/hashes/argon2.js'
import { randomBytes } from 'node:crypto'
import { decode, parse, encrypt, decrypt, encodeProfile } from './envelope.js'
import { exact, failure, imported } from './codec.js'

export const KDF = Object.freeze({algorithm: 'Argon2id', version: 19, m: 65536, t: 3, p: 1, dkLen: 32})
let busy = false
function header(salt) { return {version: 1, algorithm: 'AES-256-GCM', domain: 'abinadwan.personal-profile.backup.v1', kdf: {...KDF}, salt} }
async function derive(password, salt, use) {
  if (busy || typeof password !== 'string' || !password.length || Buffer.byteLength(password) > 1024) failure()
  busy = true
  const bytes = Buffer.from(password)
  let key, derived
  try {
    derived = await argon2idAsync(bytes, salt, {...KDF, asyncTick: 10, maxmem: 72 * 1024 * 1024})
    key = Buffer.from(derived)
    return use(key)
  } catch { failure() } finally { bytes.fill(0); key?.fill(0); derived?.fill(0); busy = false }
}
export async function exportBackup(input, password) {
  const plain = encodeProfile(imported(input)), salt = randomBytes(16)
  try { return await derive(password, salt, key => Buffer.from(JSON.stringify(encrypt(plain, key, header(salt.toString('base64')))))) }
  finally { plain.fill(0) }
}
export async function importBackup(bytes, password) {
  try {
    const e = parse(bytes)
    exact(e, ['version', 'algorithm', 'domain', 'kdf', 'salt', 'nonce', 'ciphertext', 'tag'])
    exact(e.kdf, Object.keys(KDF))
    for (const k of Object.keys(KDF)) if (e.kdf[k] !== KDF[k]) failure()
    const h = header(e.salt)
    for (const k of ['version', 'algorithm', 'domain']) if (e[k] !== h[k]) failure()
    const salt = decode(e.salt, 16)
    decode(e.nonce, 12); decode(e.tag, 16)
    if (decode(e.ciphertext).length > 1024 * 1024) failure()
    return await derive(password, salt, key => {
      const plain = decrypt(e, key, h)
      try { return imported(JSON.parse(plain.toString('utf8'))) } finally { plain.fill(0) }
    })
  } catch { failure() }
}
