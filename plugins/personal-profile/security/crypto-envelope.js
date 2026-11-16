// Security spike only: no persistence or agent integration. Node Host only.
import {createCipheriv, createDecipheriv, randomBytes} from 'node:crypto'

const AAD = Buffer.from('abinadwan.personal-profile.envelope.v1', 'utf8')
const ALGORITHM = 'aes-256-gcm'

function requireKey(key) {
  if (!Buffer.isBuffer(key) || key.length !== 32) {
    throw new TypeError('A 32-byte Buffer key is required')
  }
}

function decodeBase64(value, expectedLength) {
  if (typeof value !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new TypeError('Invalid encrypted envelope')
  }
  const decoded = Buffer.from(value, 'base64')
  if (expectedLength !== undefined && decoded.length !== expectedLength) {
    throw new TypeError('Invalid encrypted envelope')
  }
  return decoded
}

export function createDataKey() {
  return randomBytes(32)
}

export function seal(plaintext, key) {
  requireKey(key)
  if (!Buffer.isBuffer(plaintext)) throw new TypeError('Plaintext must be a Buffer')
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv, {authTagLength: 16})
  cipher.setAAD(AAD)
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
  return {
    version: 1,
    algorithm: 'AES-256-GCM',
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64'),
  }
}

export function open(envelope, key) {
  requireKey(key)
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope) ||
      envelope.version !== 1 || envelope.algorithm !== 'AES-256-GCM') {
    throw new TypeError('Unsupported encrypted envelope')
  }
  const iv = decodeBase64(envelope.iv, 12)
  const tag = decodeBase64(envelope.tag, 16)
  const ciphertext = decodeBase64(envelope.ciphertext)
  const decipher = createDecipheriv(ALGORITHM, key, iv, {authTagLength: 16})
  decipher.setAAD(AAD)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}
