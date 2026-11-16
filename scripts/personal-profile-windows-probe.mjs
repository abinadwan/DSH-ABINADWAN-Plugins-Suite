// Opt-in Windows-only security probe. Never reads or stores actual user profile data.
// Invoke "prepare" once and "verify" in a separate process after restarting Desktop.
// A synthetic random key is DPAPI-wrapped; only a public canary is encrypted.
import {createDataKey, seal, open} from '../plugins/personal-profile/security/crypto-envelope.js'
import {protectCurrentUser, unprotectCurrentUser} from '../plugins/personal-profile/security/windows-dpapi.js'
import {readFile, writeFile, mkdir, lstat, unlink} from 'node:fs/promises'
import {join, dirname} from 'node:path'
import {homedir} from 'node:os'

const MARKER = 'ABINADWAN_PROFILE_SECURITY_SYNTHETIC_CANARY_V1'
const FILE = 'personal-profile-security-probe-v1.json'
const MAX_FILE_BYTES = 16 * 1024

function probePath() {
  // The environment override is intended for isolated CI tests only.
  // The ordinary Windows location is the signed-in user's LocalAppData.
  const root = process.env.ABINADWAN_PROFILE_PROBE_TEST_DIR ||
    process.env.LOCALAPPDATA ||
    join(homedir(), 'AppData', 'Local')
  return join(root, 'ABINADWAN', FILE)
}

async function prepare(file) {
  const key = createDataKey()
  try {
    const protectedKey = await protectCurrentUser(key)
    const envelope = seal(Buffer.from(MARKER, 'utf8'), key)
    const document = JSON.stringify({
      purpose: 'synthetic-windows-dpapi-verification-only',
      version: 1,
      protectedKey: protectedKey.toString('base64'),
      envelope,
    })
    await mkdir(dirname(file), {recursive: true})
    await writeFile(file, document, {flag: 'wx', encoding: 'utf8', mode: 0o600})
    process.stdout.write('PASS: synthetic key protected with Windows CurrentUser DPAPI.\n')
    process.stdout.write('NEXT: restart DeepSeek Harness Desktop, then run the verify command from the same Windows user account.\n')
  } finally {
    key.fill(0)
  }
}

async function verify(file) {
  const stats = await lstat(file)
  if (!stats.isFile() || stats.size > MAX_FILE_BYTES) throw new Error('Probe file is invalid or too large')
  const document = JSON.parse(await readFile(file, 'utf8'))
  if (document?.version !== 1 ||
      document?.purpose !== 'synthetic-windows-dpapi-verification-only' ||
      typeof document.protectedKey !== 'string' ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(document.protectedKey)) {
    throw new Error('Unexpected probe format')
  }
  const key = await unprotectCurrentUser(Buffer.from(document.protectedKey, 'base64'))
  try {
    if (open(document.envelope, key).toString('utf8') !== MARKER) {
      throw new Error('Synthetic canary mismatch')
    }
    await unlink(file)
    process.stdout.write('PASS: same-user DPAPI key restored in a separate process.\n')
    process.stdout.write('PASS: AES-GCM canary authenticated and decrypted.\n')
    process.stdout.write('PASS: synthetic probe file removed.\n')
    process.stdout.write('NOTE: This proves a Windows process test, not integration inside the DSH Desktop Host.\n')
  } finally {
    key.fill(0)
  }
}

async function cleanup(file) {
  try {
    await unlink(file)
    process.stdout.write('PASS: synthetic probe file removed.\n')
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
    process.stdout.write('PASS: no probe file remains.\n')
  }
}

const action = process.argv[2]
if (process.platform !== 'win32') {
  process.stderr.write('FAIL: Windows CurrentUser DPAPI test requires Windows.\n')
  process.exitCode = 1
} else if (!['prepare', 'verify', 'cleanup'].includes(action) || process.argv.length !== 3) {
  process.stderr.write('Usage: node scripts/personal-profile-windows-probe.mjs prepare|verify|cleanup\n')
  process.exitCode = 1
} else {
  const path = probePath()
  try {
    if (action === 'prepare') await prepare(path)
    if (action === 'verify') await verify(path)
    if (action === 'cleanup') await cleanup(path)
  } catch (error) {
    // Return only non-sensitive errors. Never echo DPAPI blob, keys, file contents or names.
    const code = error?.code === 'EEXIST' ? 'existing synthetic probe (verify or cleanup first)' :
      error?.code === 'ENOENT' ? 'synthetic probe missing (prepare first)' :
      error?.name === 'DpapiUnavailableError' ? 'DPAPI failed under this Windows account' :
      'probe failed'
    process.stderr.write('FAIL: ' + code + '. No plaintext fallback.\n')
    process.exitCode = 1
  }
}
