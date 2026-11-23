// Pinned DSH Host route integration: synthetic metadata only, no file mutation.
import assert from 'node:assert/strict'
import test from 'node:test'
import { Context } from '@deepseek-ai/cordis'
import { HostConnectionService } from '@deepseek-ai/dsh-client-connection'
import * as Lifecycle from '../plugins/conversation-lifecycle/index.js'

const SESSION = '10000000-0000-4000-8000-000000000001'

test('native DSH connection authenticates read-only Chat Control inspection and disposes route', async t => {
  const ctx = new Context()
  t.after(() => ctx.fiber.dispose())
  const workspaces = [{ id: 'workspace-a', sessionIds: [SESSION] }]
  const archived = [SESSION]
  const stats = []
  const registry = {
    list: () => workspaces,
    get archivedSessionIds() { return archived },
    get pinnedSessionIds() { return [] },
  }
  ctx.provide('workspaceRegistry', registry)
  ctx.provide('sessionPersistence', {
    async stat(id) {
      stats.push(id)
      return { header: { id }, formatStatus: 'current', sizeBytes: 300 }
    },
  })
  await ctx.plugin({ name: 'fixture-connection', apply(child) { new HostConnectionService(child, [], {}) } }).await()
  const feature = ctx.plugin(Lifecycle, { record: {
    retention: 'forever', protectedIds: [], protectedWorkspaces: [], overrides: [],
  } })
  await feature.await()
  const transport = ctx.connection.createSharedFetchHandler('/api')
  const url = 'http://localhost/api/abinadwan-chat-control/inspect'
  const call = (body, peer = ctx.connection.browserPeer) => transport.fetch(new Request(url, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  }), peer)
  const denial = await call({ sessionIds: [SESSION] }, { principal: { kind: 'viewer' } })
  assert.equal(denial.status, 403)
  assert.deepEqual(stats, [])
  assert.equal((await call({ sessionIds: ['../escape'] })).status, 400)
  const result = await call({ sessionIds: [SESSION] })
  assert.equal(result.status, 200)
  assert.equal(result.headers.get('cache-control'), 'no-store')
  assert.deepEqual(await result.json(), {
    mode: 'read-only', executable: false, inspected: 1,
    rows: [{ id: SESSION, code: 'requires-deletion-transaction',
      storedBytes: 300, deletable: false }],
  })
  assert.deepEqual(stats, [SESSION])
  await feature.dispose()
  assert.equal((await call({ sessionIds: [SESSION] })).status, 404)
})
