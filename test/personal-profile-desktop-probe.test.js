import test from 'node:test'
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {mkdtemp, readFile, writeFile, rm, stat} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'

const probe = fileURLToPath(new URL('../scripts/personal-profile-windows-probe.mjs', import.meta.url))
function invoke(action, dir) {
  return spawnSync(process.execPath, [probe, action], {
    env: {...process.env, ABINADWAN_PROFILE_PROBE_TEST_DIR: dir},
    encoding: 'utf8',
    timeout: 20000,
    windowsHide: true,
  })
}

test('two-process DPAPI canary and cleanup use no real profile data', {skip: process.platform !== 'win32'}, async t => {
  const dir = await mkdtemp(join(tmpdir(), 'abinadwan-profile-probe-'))
  t.after(() => rm(dir, {recursive: true, force: true}))
  const path = join(dir, 'ABINADWAN', 'personal-profile-security-probe-v1.json')
  let r = invoke('prepare', dir)
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /PASS: synthetic key protected/)
  const saved = await readFile(path, 'utf8')
  assert.doesNotMatch(saved, /ABINADWAN_PROFILE_SECURITY_SYNTHETIC_CANARY_V1/)
  assert.equal(JSON.parse(saved).purpose, 'synthetic-windows-dpapi-verification-only')
  r = invoke('prepare', dir)
  assert.notEqual(r.status, 0)
  assert.match(r.stderr, /existing synthetic probe/)
  assert.equal(await readFile(path, 'utf8'), saved)
  const corrupted = JSON.parse(saved)
  corrupted.envelope.tag = Buffer.alloc(16).toString('base64')
  await writeFile(path, JSON.stringify(corrupted))
  r = invoke('verify', dir)
  assert.notEqual(r.status, 0)
  await stat(path)
  await writeFile(path, saved)
  r = invoke('verify', dir)
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /same-user DPAPI key restored in a separate process/)
  assert.match(r.stdout, /probe file removed/)
  await assert.rejects(stat(path), {code: 'ENOENT'})
  r = invoke('cleanup', dir)
  assert.equal(r.status, 0)
  r = invoke('verify', dir)
  assert.notEqual(r.status, 0)
})

test('Windows-only probe explicitly fails on Linux', {skip: process.platform === 'win32'}, () => {
  const result = invoke('prepare', tmpdir())
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /requires Windows/)
})
