import assert from 'node:assert/strict'
import test from 'node:test'
import { base, clientHarness } from '../test-support/client.js'

function active(app) {
  app.setRows([...app.rows(), { moduleName: base + '/direct-chat', enabled: true, fiberPhase: 'active' }])
}
function button(app) {
  const entry = app.entries('sidebar.footer.action').find(row => row.options.id === 'abinadwan-direct-chat')
  assert.ok(entry)
  const node = entry.component({ ...entry.options.inject(), wide: true, useRemoteAccess: () => true })
  assert.equal(node.children[0].type, 'button')
  return node.children[0]
}

test('Direct Chat reuses one Workspace but distinct completed conversations have separate Session IDs', async t => {
  const registered = [], connected = [], opened = [], deleted = [], requests = []
  let firstChatSubmitted = false
  const app = await clientHarness({
    onWorkspaceCreate: async input => { registered.push(input.path); return {
      workspaceId: 'direct-chat-workspace', title: 'Direct Chat', path: input.path,
    } },
    onConnectWorkspace: async id => {
      connected.push(id)
      return firstChatSubmitted ? 'chat-session-2' : 'chat-session-1'
    },
    onOpenSession: id => opened.push(id),
    onWorkspaceDelete: async id => { deleted.push(id) },
    fetch: async (url, init) => {
      requests.push({ url, init })
      return Response.json({ path: '/profile/abinadwan-direct-chat-data/Direct Chat' })
    },
  })
  t.after(() => app.dispose())
  active(app)
  await app.changed()
  await button(app).props.onClick()
  await button(app).props.onClick()
  assert.deepEqual(opened, ['chat-session-1', 'chat-session-1'], 'blank draft is reused')
  firstChatSubmitted = true
  await button(app).props.onClick()
  assert.deepEqual(opened, ['chat-session-1', 'chat-session-1', 'chat-session-2'], 'new chat has a new Session ID')
  assert.equal(new Set(registered).size, 1, 'same Workspace directory per chat')
  assert.equal(registered[0], '/profile/abinadwan-direct-chat-data/Direct Chat')
  assert.deepEqual(connected, Array(3).fill('direct-chat-workspace'))
  assert.deepEqual(deleted, [], 'Workspace is permanent')
  assert.equal(requests.filter(x => x.url === '/api/abinadwan-direct-chat/prepare').length, 3)
  assert.ok(requests.filter(x => x.url === '/api/abinadwan-direct-chat/prepare').every(x => x.init.method === 'POST'))
  app.setRows(app.rows().map(row => row.moduleName === base + '/direct-chat'
    ? { ...row, enabled: false, fiberPhase: null } : row))
  await app.changed()
  assert.equal(app.entries('sidebar.footer.action').length, 0)
})

test('an already-registered Workspace is renamed only when its title differs', async t => {
  const renamed = []
  const app = await clientHarness({
    onWorkspaceCreate: async input => ({ workspaceId: 'existing-chat', title: 'Old name', path: input.path }),
    onWorkspaceRename: async (id, title) => { renamed.push([id, title]) },
    fetch: async () => Response.json({ path: '/profile/abinadwan-direct-chat-data/Direct Chat' }),
  })
  t.after(() => app.dispose())
  active(app)
  await app.changed()
  await button(app).props.onClick()
  assert.equal(renamed.length, 1)
  assert.equal(renamed[0][0], 'existing-chat')
  assert.equal(renamed[0][1], 'Direct Chat')
})

test('registration failure cannot delete user Workspaces or existing chat histories', async t => {
  const deleted = [], warnings = []
  const app = await clientHarness({
    console: { warn: (...args) => warnings.push(args) },
    onWorkspaceCreate: async () => { throw new Error('Workspace registration refused') },
    onWorkspaceDelete: async id => { deleted.push(id) },
    fetch: async () => Response.json({ path: '/profile/abinadwan-direct-chat-data/Direct Chat' }),
  })
  t.after(() => app.dispose())
  active(app)
  await app.changed()
  await button(app).props.onClick()
  assert.equal(warnings.length, 1)
  assert.deepEqual(deleted, [])
})
