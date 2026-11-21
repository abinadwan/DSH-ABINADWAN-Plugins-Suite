import assert from 'node:assert/strict'
import { lstat, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join, sep } from 'node:path'
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

test('prepare endpoint creates distinct native session directories without creating unusable Sessions', async t => {
  const root = await mkdtemp(join(tmpdir(), 'suite-direct-chat-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const profile = join(root, 'profile')
  await mkdir(profile)
  const fx = fixture(profile)
  assert.equal(plugin.name, 'abinadwan-direct-chat')
  assert.equal(fx.handler.path, '/api/abinadwan-direct-chat/prepare')
  assert.equal((await fx.handler.fetch(request('{"cwd":"other"}'))).status, 400)
  const first = await fx.handler.fetch(request())
  const second = await fx.handler.fetch(request())
  assert.equal(first.status, 200)
  assert.equal(second.status, 200)
  const a = (await first.json()).path
  const b = (await second.json()).path
  assert.notEqual(a, b)
  assert.ok(a.startsWith(join(profile, 'abinadwan-direct-chat-data') + sep))
  assert.equal((await lstat(a)).isDirectory(), true)
  assert.equal((await lstat(b)).isDirectory(), true)
})

test('tools are denied inside Direct Chat paths (including legacy root) but not sibling Workspaces', async t => {
  const root = await mkdtemp(join(tmpdir(), 'suite-direct-chat-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const profile = join(root, 'profile')
  await mkdir(profile)
  const fx = fixture(profile)
  const direct = join(profile, 'abinadwan-direct-chat-data')
  const child = join(direct, 'session-example')
  for (const path of [direct, child]) {
    const denial = fx.guard()({ agent: { session: { header: { cwd: path } } } })
    assert.equal(denial.info.code, 'DIRECT_CHAT_TOOL_DENIED')
  }
  for (const path of [join(root,'workspace'), direct + '-other']) {
    assert.equal(fx.guard()({ agent: { session: { header: { cwd: path } } } }), undefined)
  }
  let executed = false
  const result = await fx.preExecute()({agent:{session:{header:{cwd:child}}}}, () => {
    executed = true; return Promise.resolve({kind:'allow'})
  })
  assert.equal(result.kind,'deny')
  assert.equal(executed,false)
})

test('a file or symlink cannot replace the managed profile data root', async t => {
  const root = await mkdtemp(join(tmpdir(), 'suite-direct-chat-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const profile = join(root, 'profile')
  await mkdir(profile)
  await writeFile(join(profile, 'abinadwan-direct-chat-data'), 'occupied')
  const fx = fixture(profile)
  assert.equal((await fx.handler.fetch(request())).status, 500)
})
