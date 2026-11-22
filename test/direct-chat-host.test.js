import assert from 'node:assert/strict'
import { lstat, mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import test from 'node:test'
import * as plugin from '../plugins/direct-chat/index.js'

function fixture(profile) {
  let handler, guard, preExecute
  const ctx = {
    profileContext: { dir: profile },
    on(name, fn) { if (name === 'tools/pre-execute') preExecute = fn },
    effect(fn) { fn() },
    tools: { guard(fn) { guard = fn; return () => {} } },
    connection: { fetch: { register(value) { handler = value; return () => {} } } },
    logger: { warn() {} },
  }
  plugin.apply(ctx)
  return { handler, guard: () => guard, preExecute: () => preExecute }
}
const request = (body = '{}') => new Request('http://localhost/api/abinadwan-direct-chat/prepare', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body,
})

test('every prepare returns the SAME permanent Direct Chat Workspace path', async t => {
  const root = await mkdtemp(join(tmpdir(), 'suite-direct-chat-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const profile = join(root, 'profile')
  await mkdir(profile)
  const fx = fixture(profile)
  assert.equal(plugin.name, 'abinadwan-direct-chat')
  assert.equal(fx.handler.path, '/api/abinadwan-direct-chat/prepare')
  assert.equal((await fx.handler.fetch(request('{"cwd":"other"}'))).status, 400)
  const a = await fx.handler.fetch(request())
  const b = await fx.handler.fetch(request())
  assert.equal(a.status, 200)
  assert.equal(b.status, 200)
  const pathA = (await a.json()).path
  const pathB = (await b.json()).path
  assert.equal(pathA, pathB)
  assert.equal(pathA, join(await realpath(profile), 'abinadwan-direct-chat-data', 'Direct Chat'))
  assert.equal((await lstat(pathA)).isDirectory(), true)
})

test('tool guard denies the new shared Directory AND previous experimental per-chat directories', async t => {
  const root = await mkdtemp(join(tmpdir(), 'suite-direct-chat-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const profile = join(root, 'profile')
  await mkdir(profile)
  const fx = fixture(profile)
  const direct = join(profile, 'abinadwan-direct-chat-data')
  for (const cwd of [direct, join(direct, 'Direct Chat'), join(direct, 'session-legacy')]) {
    assert.equal(fx.guard()({ agent: { session: { header: { cwd } } } }).info.code, 'DIRECT_CHAT_TOOL_DENIED')
  }
  assert.equal(fx.guard()({ agent: { session: { header: { cwd: join(root, 'user-project') } } } }), undefined)
  assert.equal(fx.guard()({ agent: { session: { header: { cwd: direct + '-other' } } } }), undefined)
  let called = false
  const res = await fx.preExecute()({ agent: { session: { header: { cwd: join(direct, 'Direct Chat') } } } }, () => {
    called = true; return Promise.resolve({ kind: 'allow' })
  })
  assert.equal(res.kind, 'deny')
  assert.equal(called, false)
})

test('symlink aliases into Direct Chat cannot bypass either tool-denial hook', async t => {
  const root = await mkdtemp(join(tmpdir(), 'suite-direct-chat-alias-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const profile = join(root, 'profile')
  const directRoot = join(profile, 'abinadwan-direct-chat-data')
  await mkdir(join(directRoot, 'Direct Chat'), { recursive: true })
  const alias = join(root, 'unrelated-workspace-alias')
  try {
    await symlink(directRoot, alias, process.platform === 'win32' ? 'junction' : 'dir')
  } catch (error) {
    if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error?.code)) {
      t.skip('This filesystem does not allow directory aliases')
      return
    }
    throw error
  }
  const fx = fixture(profile)
  const aliasedCwd = join(alias, 'Direct Chat')
  const execution = { agent: { session: { header: { cwd: aliasedCwd } } } }
  assert.equal(fx.guard()(execution)?.info.code, 'DIRECT_CHAT_TOOL_DENIED')
  let executed = false
  const response = await fx.preExecute()(execution, () => {
    executed = true
    return Promise.resolve({ kind: 'allow' })
  })
  assert.equal(response.kind, 'deny')
  assert.equal(executed, false)
})

test('a file cannot replace the data root or permanent Workspace directory', async t => {
  const root = await mkdtemp(join(tmpdir(), 'suite-direct-chat-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const profile = join(root, 'profile')
  await mkdir(profile)
  await writeFile(join(profile, 'abinadwan-direct-chat-data'), 'occupied')
  assert.equal((await fixture(profile).handler.fetch(request())).status, 500)
  await rm(join(profile, 'abinadwan-direct-chat-data'))
  await mkdir(join(profile, 'abinadwan-direct-chat-data'))
  await writeFile(join(profile, 'abinadwan-direct-chat-data', 'Direct Chat'), 'occupied')
  assert.equal((await fixture(profile).handler.fetch(request())).status, 500)
})
