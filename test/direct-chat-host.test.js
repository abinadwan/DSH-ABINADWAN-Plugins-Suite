import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import test from 'node:test'
import * as plugin from '../plugins/direct-chat/index.js'

function fixture(profile) {
  let handler, guard, preExecute, created, flushed = 0
  const ctx = {
    profileContext: { dir: profile },
    on(name, fn) { if (name === 'tools/pre-execute') preExecute = fn },
    effect(fn) { fn() },
    tools: { guard(fn) { guard = fn; return () => {} } },
    connection: { fetch: { register(value) { handler = value; return () => {} } } },
    sessionController: { async create(payload) { created = payload; return { sessionId: 'session-poc-1' } } },
    sessionPersistence: { async flush() { flushed++ } },
    logger: { warn() {} },
  }
  plugin.apply(ctx)
  return {
    ctx, get handler() { return handler }, get created() { return created },
    get flushed() { return flushed }, guard: () => guard, preExecute: () => preExecute,
  }
}
const request = (body = '{}') => new Request('http://localhost/api/abinadwan-direct-chat/create', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body,
})

test('native session created under profile with durable flush and strict request contract', async t => {
  const root = await mkdtemp(join(tmpdir(), 'suite-direct-chat-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const profile = join(root, 'profile')
  await mkdir(profile)
  const fx = fixture(profile)
  assert.equal(plugin.name, 'abinadwan-direct-chat')
  assert.equal(fx.handler.path, '/api/abinadwan-direct-chat/create')
  assert.equal((await fx.handler.fetch(request('{"cwd":"other"}'))).status, 400)
  assert.equal((await fx.handler.fetch(request())).status, 200)
  assert.deepEqual(fx.created, { cwd: join(profile, 'abinadwan-direct-chat-data') })
  assert.equal(fx.flushed, 1)
})

test('tool execution is denied for Direct Chat but does not block normal Workspace sessions', async t => {
  const root = await mkdtemp(join(tmpdir(), 'suite-direct-chat-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const profile = join(root, 'profile')
  await mkdir(profile)
  const fx = fixture(profile)
  const path = join(profile, 'abinadwan-direct-chat-data')
  const denial = fx.guard()({agent: {session: {header: {cwd: path}}}})
  assert.equal(denial.info.code, 'DIRECT_CHAT_TOOL_DENIED')
  assert.equal(fx.guard()({agent: {session: {header: {cwd: join(root,'workspace')}}}}), undefined)
  let executed = false
  const result = await fx.preExecute()({agent: {session: {header: {cwd: path}}}}, () => {
    executed = true; return Promise.resolve({kind:'allow'})
  })
  assert.equal(result.kind, 'deny')
  assert.equal(executed, false)
})

test('dedicated path cannot be replaced with a file', async t => {
  const root = await mkdtemp(join(tmpdir(), 'suite-direct-chat-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const profile = join(root, 'profile')
  await mkdir(profile)
  await writeFile(join(profile, 'abinadwan-direct-chat-data'), 'occupied')
  const fx = fixture(profile)
  assert.equal((await fx.handler.fetch(request())).status, 500)
  assert.equal(fx.created, undefined)
})
