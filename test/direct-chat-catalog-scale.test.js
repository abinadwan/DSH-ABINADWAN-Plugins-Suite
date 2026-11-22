import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, mkdir, realpath, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { registerCatalog } from '../plugins/direct-chat/catalog.js'

test('phase 03: 100/1000/10000 Session inventories bound native metadata reads', async t => {
  const profile = await mkdtemp(join(tmpdir(), 'dsh-phase-03-catalog-'))
  t.after(() => rm(profile, { recursive: true, force: true }))
  const path = join(profile, 'abinadwan-direct-chat-data', 'Direct Chat')
  await mkdir(path, { recursive: true })
  const canonical = await realpath(path)
  const workspaces = []
  const counters = { reads: 0 }
  let route
  const ctx = {
    inject(_requirements, mount) { mount({
      workspaceRegistry: { list: () => workspaces },
      sessionPersistence: { async stat(id) {
        counters.reads++
        return { header: { id, createdAt: 1000 } }
      } },
      effect(fn) { fn() },
      connection: { fetch: { register(handler) { route = handler; return () => {} } } },
    }) },
  }
  registerCatalog(ctx, profile)
  assert.deepEqual(route.methods, ['GET'])
  const get = (order = '') => route.fetch(new Request('http://localhost/api/abinadwan-direct-chat/catalog' +
    (order ? '?order=' + order : '')))
  for (const count of [100, 1000, 10000]) {
    workspaces.splice(0, workspaces.length, {
      id: 'direct-workspace', path: canonical,
      sessionIds: Array.from({ length: count }, (_, i) => 'synthetic-' + i),
    }, { id: 'unrelated', path: join(profile, 'Other'), sessionIds: ['hidden'] })
    counters.reads = 0
    const begin = performance.now()
    const discovered = await get()
    const normal = await discovered.json()
    assert.equal(discovered.headers.get('cache-control'), 'no-store')
    assert.deepEqual(normal, { workspaceId: 'direct-workspace' })
    assert.equal(counters.reads, 0, 'recent/search discovery must not scan persistence.stat')
    const sorted = await get('creation')
    const body = await sorted.json()
    assert.equal(sorted.status, 200)
    assert.equal(body.workspaceId, 'direct-workspace')
    assert.equal(counters.reads, count === 100 ? 100 : 0,
      'creation-sort metadata must be capped at exactly 100 registered Sessions')
    assert.equal(body.createdAt === null, count > 100)
    if(count === 100) assert.equal(Object.keys(body.createdAt).length, 100)
    assert.ok(!JSON.stringify(body).includes('hidden'),
      'no unauthorized Workspace IDs exposed to the Direct Chat catalog')
    const elapsed = performance.now() - begin
    assert.ok(elapsed < 3500, `${count} Sessions took ${elapsed.toFixed(2)}ms`)
    t.diagnostic(`Direct Chat Host discovery ${count}: ${elapsed.toFixed(2)} ms, metadata reads ${counters.reads}`)
  }
})
