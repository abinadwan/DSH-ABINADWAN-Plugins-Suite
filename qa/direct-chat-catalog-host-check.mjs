import assert from 'node:assert/strict'
import { mkdtemp, mkdir, realpath, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { Context } from '@deepseek-ai/cordis'
import { HostConnectionService } from '@deepseek-ai/dsh-client-connection'
import { registerCatalog } from '../plugins/direct-chat/catalog.js'

test('native Host connection gates Direct Chat discovery and bounded metadata to the owner', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-direct-native-'))
  const ctx = new Context()
  t.after(async () => {
    await ctx.fiber.dispose()
    await rm(dir, { recursive: true, force: true })
  })
  const path = join(await realpath(dir), 'abinadwan-direct-chat-data', 'Direct Chat')
  await mkdir(path, { recursive: true })
  const workspace = { id: 'permanent', path: await realpath(path), sessionIds: ['fictional-one'] }
  const reads = []
  ctx.provide('workspaceRegistry', { list: () => [workspace, {
    id: 'project', path: join(dir, 'Project'), sessionIds: ['unrelated'],
  }] })
  ctx.provide('sessionPersistence', { async stat(id) {
    reads.push(id)
    return { header: { id, createdAt: 1000 } }
  } })
  await ctx.plugin({ name: 'fixture-connection', apply(child) { new HostConnectionService(child, [], {}) } }).await()
  const fiber = ctx.plugin({ inject: ['connection'], apply(child) { registerCatalog(child, dir) } })
  await fiber.await()
  const transport = ctx.connection.createSharedFetchHandler('/api')
  const base = 'http://localhost/api/abinadwan-direct-chat/catalog'
  const fetch = (query = '', peer = ctx.connection.browserPeer) => transport.fetch(new Request(base + query), peer)
  assert.equal((await fetch('?order=creation', { principal: { kind: 'viewer' } })).status, 403)
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
})
