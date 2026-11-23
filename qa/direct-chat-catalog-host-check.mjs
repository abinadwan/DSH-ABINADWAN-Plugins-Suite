import assert from 'node:assert/strict'
import { mkdtemp, realpath, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { Context } from '@deepseek-ai/cordis'
import { HostConnectionService } from '@deepseek-ai/dsh-client-connection'
import * as directChat from '../plugins/direct-chat/index.js'

test('native Host connection gates Direct Chat preparation, discovery and metadata to the owner', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-direct-native-'))
  const ctx = new Context()
  t.after(async () => {
    await ctx.fiber.dispose()
    await rm(dir, { recursive: true, force: true })
  })
  const path = join(await realpath(dir), 'abinadwan-direct-chat-data', 'Direct Chat')
  const workspace = { id: 'permanent', path, sessionIds: ['fictional-one'] }
  const reads = []
  ctx.provide('profileContext', { dir })
  ctx.provide('tools', { guard: () => () => {} })
  ctx.provide('workspaceRegistry', { list: () => [workspace, {
    id: 'project', path: join(dir, 'Project'), sessionIds: ['unrelated'],
  }] })
  ctx.provide('sessionPersistence', { async stat(id) {
    reads.push(id)
    return { header: { id, createdAt: 1000 } }
  } })
  await ctx.plugin({ name: 'fixture-connection', apply(child) { new HostConnectionService(child, [], {}) } }).await()
  const fiber = ctx.plugin(directChat)
  await fiber.await()
  const transport = ctx.connection.createSharedFetchHandler('/api')
  const base = 'http://localhost/api/abinadwan-direct-chat/catalog'
  assert.equal(transport.requestBodyMode({ method: 'GET', url: new URL(base) }), 'buffered')
  const fetch = (query = '', peer = ctx.connection.browserPeer) => transport.fetch(new Request(base + query), peer)
  const prepare = (peer = ctx.connection.browserPeer) => transport.fetch(new Request(
    'http://localhost/api/abinadwan-direct-chat/prepare', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
    }), peer)
  const viewer = { principal: { kind: 'viewer' } }
  assert.equal((await fetch('?order=creation', viewer)).status, 403)
  assert.equal((await prepare(viewer)).status, 403)
  assert.deepEqual(await (await fetch()).json(), { workspaceId: null })
  const prepared = await prepare()
  assert.equal(prepared.headers.get('cache-control'), 'no-store')
  assert.deepEqual(await prepared.json(), { path: await realpath(path) })
  workspace.path = await realpath(path)
  assert.deepEqual(await (await fetch()).json(), { workspaceId: 'permanent' })
  assert.deepEqual(reads, [])
  const result = await fetch('?order=creation')
  assert.equal(result.headers.get('cache-control'), 'no-store')
  assert.deepEqual(await result.json(), { workspaceId: 'permanent', createdAt: { 'fictional-one': 1000 } })
  assert.deepEqual(reads, ['fictional-one'])
  workspace.sessionIds = Array.from({ length: 101 }, (_, i) => 'synthetic-' + i)
  assert.deepEqual(await (await fetch('?order=creation')).json(), { workspaceId: 'permanent', createdAt: null })
  assert.deepEqual(reads, ['fictional-one'])
  await fiber.dispose()
  assert.equal((await fetch()).status, 404)
  assert.equal((await prepare()).status, 404)
})
