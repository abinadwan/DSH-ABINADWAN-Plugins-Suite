import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { normalize, failure, guarded, exact, identity } from './codec.js'

export const MAX_RECORD = 2 * 1024 * 1024
const MAX_PLAIN = 1024 * 1024
export function decode(value, length) {
  if (typeof value !== 'string' || value.length > MAX_RECORD || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) failure()
  const b = Buffer.from(value, 'base64')
  if (b.toString('base64') !== value || (length !== undefined && b.length !== length)) failure()
  return b
}
export function parse(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length > MAX_RECORD || !bytes.length) failure()
  return guarded(() => JSON.parse(bytes.toString('utf8')))
}
function keyCheck(key) { if (!Buffer.isBuffer(key) || key.length !== 32) failure() }
function metadata(context) {
  if (!['local', 'recovery'].includes(context.domain)) failure()
  return {version: 1, algorithm: 'AES-256-GCM', domain: `abinadwan.personal-profile.${context.domain}.v1`, identity: identity(context.identity)}
}
export function encrypt(plaintext, key, header) {
  keyCheck(key)
  const nonce = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, nonce, {authTagLength: 16})
  cipher.setAAD(Buffer.from(JSON.stringify(header)))
  return { ...header, nonce: nonce.toString('base64'), ciphertext: Buffer.concat([cipher.update(plaintext), cipher.final()]).toString('base64'), tag: cipher.getAuthTag().toString('base64') }
}
export function decrypt(e, key, header) {
  keyCheck(key)
  const ciphertext = decode(e.ciphertext)
  if (ciphertext.length > MAX_PLAIN) failure()
  const decipher = createDecipheriv('aes-256-gcm', key, decode(e.nonce, 12), {authTagLength: 16})
  decipher.setAAD(Buffer.from(JSON.stringify(header))); decipher.setAuthTag(decode(e.tag, 16))
  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}
export function encodeProfile(input) {
  const b = Buffer.from(JSON.stringify(normalize(input)))
  if (b.length > MAX_PLAIN) { b.fill(0); failure() }
  return b
}
export function seal(input, key, context) {
  return guarded(() => {
    const b = encodeProfile(input)
    try { return Buffer.from(JSON.stringify(encrypt(b, key, metadata(context)))) } finally { b.fill(0) }
  })
}
export function open(bytes, key, context) {
  return guarded(() => {
    const e = parse(bytes), header = metadata(context)
    exact(e, [...Object.keys(header), 'nonce', 'ciphertext', 'tag'])
    for (const k of Object.keys(header)) if (e[k] !== header[k]) failure()
    const b = decrypt(e, key, header)
    try { return normalize(JSON.parse(b.toString('utf8'))) } finally { b.fill(0) }
  })
}
