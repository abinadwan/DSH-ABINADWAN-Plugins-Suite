// Experimental Node Host adapter. Not wired into Personal Profile.
// PowerShell receives the key via a pipe, never a command-line argument.
import {spawn} from 'node:child_process'

const MAX_INPUT_BYTES = 4096
const MAX_OUTPUT_BYTES = 32768
const TIMEOUT_MS = 15000

export class DpapiUnavailableError extends Error {
  constructor(message = 'Windows DPAPI is unavailable') {
    super(message)
    this.name = 'DpapiUnavailableError'
  }
}

function psSource(operation) {
  // The operation is allowlisted; no caller-provided code is interpolated.
  return `
$ErrorActionPreference = 'Stop'
try {
  $encoded = [Console]::In.ReadLine()
  if ([string]::IsNullOrWhiteSpace($encoded)) { throw 'Missing input' }
  $data = [Convert]::FromBase64String($encoded)
  $scope = [System.Security.Cryptography.DataProtectionScope]::CurrentUser
  if ('${operation}' -eq 'protect') {
    $result = [System.Security.Cryptography.ProtectedData]::Protect($data, $null, $scope)
  } else {
    $result = [System.Security.Cryptography.ProtectedData]::Unprotect($data, $null, $scope)
  }
  [Console]::Out.WriteLine([Convert]::ToBase64String($result))
} catch {
  [Console]::Error.WriteLine('DPAPI operation failed')
  exit 1
}
`
}

function runDpapi(operation, bytes) {
  if (process.platform !== 'win32') throw new DpapiUnavailableError('Windows DPAPI requires Windows')
  if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > MAX_INPUT_BYTES) {
    throw new TypeError('Invalid DPAPI input')
  }
  if (operation !== 'protect' && operation !== 'unprotect') throw new TypeError('Invalid DPAPI operation')
  return new Promise((resolve, reject) => {
    const proc = spawn('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(psSource(operation), 'utf16le').toString('base64')], {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
    })
    let stdout = ''
    let outputBytes = 0
    let settled = false
    const settle = (error, value) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      if (error) reject(error)
      else resolve(value)
    }
    const timeout = setTimeout(() => {
      proc.kill()
      settle(new DpapiUnavailableError('DPAPI operation timed out'))
    }, TIMEOUT_MS)
    proc.on('error', () => settle(new DpapiUnavailableError()))
    proc.stdout.on('data', chunk => {
      outputBytes += chunk.length
      if (outputBytes > MAX_OUTPUT_BYTES) {
        proc.kill()
        settle(new DpapiUnavailableError('DPAPI response too large'))
      } else {
        stdout += chunk.toString('utf8')
      }
    })
    // Deliberately do not include stderr in thrown errors: it could contain secrets.
    proc.stderr.resume()
    proc.on('close', code => {
      if (settled) return
      if (code !== 0) return settle(new DpapiUnavailableError('DPAPI operation failed'))
      const encoded = stdout.trim()
      if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
        return settle(new DpapiUnavailableError('Invalid DPAPI response'))
      }
      const result = Buffer.from(encoded, 'base64')
      if (result.length === 0 || result.length > MAX_INPUT_BYTES) {
        return settle(new DpapiUnavailableError('Invalid DPAPI response length'))
      }
      settle(null, result)
    })
    proc.stdin.on('error', () => { /* close/error callback reports failure */ })
    proc.stdin.end(bytes.toString('base64') + '\n')
  })
}

export function protectCurrentUser(key) {
  return runDpapi('protect', key)
}

export function unprotectCurrentUser(blob) {
  return runDpapi('unprotect', blob)
}
