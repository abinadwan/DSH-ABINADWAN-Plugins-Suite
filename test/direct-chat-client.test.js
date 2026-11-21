import assert from 'node:assert/strict'
import test from 'node:test'
import { base, clientHarness } from '../test-support/client.js'

test('Direct Chat appears as an optional sidebar footer action and disposes on disable', async t => {
  const opened = [], requests = []
  const app = await clientHarness({
    onOpenSession: id => opened.push(id),
    fetch: async (url, init) => {
      requests.push({ url, init })
      return Response.json({ sessionId: 'session-direct-1' })
    },
  })
  t.after(() => app.dispose())
  app.setRows([...app.rows(), { moduleName: base + '/direct-chat', enabled: true, fiberPhase: 'active' }])
  await app.changed()
  const entry = app.entries('sidebar.footer.action').find(item => item.options.id === 'abinadwan-direct-chat')
  assert.ok(entry, 'sidebar slot registered')
  const node = entry.component({ ...entry.options.inject(), wide: true, useRemoteAccess: () => true })
  const button = node.children[0]
  assert.equal(button.type, 'button')
  assert.equal(button.props['aria-label'], 'Direct Chat')
  await button.props.onClick()
  const createRequests = requests.filter(
    request => request.url === '/api/abinadwan-direct-chat/create'
  )
  assert.equal(createRequests.length, 1)
  assert.equal(createRequests[0].init.method, 'POST')
  assert.deepEqual(opened, ['session-direct-1'])
  app.setRows(app.rows().map(row => row.moduleName === base + '/direct-chat'
    ? { ...row, enabled: false, fiberPhase: null } : row))
  await app.changed()
  assert.equal(app.entries('sidebar.footer.action').length, 0)
})
