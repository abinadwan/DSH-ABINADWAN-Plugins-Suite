import assert from 'node:assert/strict'
import test from 'node:test'
import { base, clientHarness } from '../test-support/client.js'

function enabled(app) {
  return app.setRows([...app.rows(), { moduleName: base + '/direct-chat', enabled: true, fiberPhase: 'active' }])
}
function action(app) {
  const entry = app.entries('sidebar.footer.action').find(item => item.options.id === 'abinadwan-direct-chat')
  assert.ok(entry, 'sidebar slot registered')
  const node = entry.component({ ...entry.options.inject(), wide: true, useRemoteAccess: () => true })
  const button = node.children[0]
  assert.equal(button.type, 'button')
  assert.equal(button.props['aria-label'], 'Direct Chat')
  return button
}

test('Direct Chat registers a temporary Workspace, connects a native Session, and releases registration after first prompt', async t => {
  const opened = [], requests = [], created = [], connected = [], deleted = []
  const app = await clientHarness({
    onOpenSession: id => opened.push(id),
    onWorkspaceCreate: input => { created.push(input); return Promise.resolve({ workspaceId: 'direct-w1', path: input.path }) },
    onConnectWorkspace: id => { connected.push(id); return Promise.resolve('direct-s1') },
    onWorkspaceDelete: id => { deleted.push(id); return Promise.resolve() },
    fetch: async (url, init) => {
      requests.push({ url, init })
      return Response.json({ path: '/profile/abinadwan-direct-chat-data/session-123' })
    },
  })
  t.after(() => app.dispose())
  enabled(app)
  await app.changed()
  await action(app).props.onClick()
  const preparations = requests.filter(request => request.url === '/api/abinadwan-direct-chat/prepare')
  assert.equal(preparations.length, 1)
  assert.equal(preparations[0].init.method, 'POST')
  assert.equal(created.length, 1)
  assert.equal(created[0].path, '/profile/abinadwan-direct-chat-data/session-123')
  assert.deepEqual(connected, ['direct-w1'])
  assert.deepEqual(opened, ['direct-s1'])
  assert.deepEqual(deleted, [], 'do not remove Workspace before first prompt')
  app.sessions.set({ ...app.sessions.getSnapshot(), byId: {
    ...app.sessions.getSnapshot().byId, 'direct-s1': { id: 'direct-s1', blank: true },
  } })
  assert.deepEqual(deleted, [], 'blank Session must keep Workspace')
  app.sessions.set({ ...app.sessions.getSnapshot(), byId: {
    ...app.sessions.getSnapshot().byId, 'direct-s1': { id: 'direct-s1', blank: false },
  } })
  assert.deepEqual(deleted, ['direct-w1'], 'first persisted prompt removes only the Workspace registration')
  app.setRows(app.rows().map(row => row.moduleName === base + '/direct-chat'
    ? { ...row, enabled: false, fiberPhase: null } : row))
  await app.changed()
  assert.equal(app.entries('sidebar.footer.action').length, 0)
})

test('failed connect rolls back the temporary Workspace registration', async t => {
  const deleted = [], warnings = []
  const app = await clientHarness({
    console: { warn: (...args) => warnings.push(args) },
    onWorkspaceCreate: async input => ({ workspaceId:'direct-failed', path:input.path }),
    onConnectWorkspace: async () => { throw new Error('connection denied') },
    onWorkspaceDelete: async id => { deleted.push(id) },
    fetch: async () => Response.json({ path: '/profile/abinadwan-direct-chat-data/session-failed' }),
  })
  t.after(() => app.dispose())
  enabled(app)
  await app.changed()
  await action(app).props.onClick()
  assert.deepEqual(deleted, ['direct-failed'])
  assert.equal(warnings.length, 1)
})

test('reopens an existing blank Direct Chat without creating another temporary Workspace', async t => {
  const opened = [], requests = [], deleted = []
  const sessionId = 'previous-blank'
  const workspaceId = 'previous-temporary-workspace'
  const app = await clientHarness({
    workspaceItems: [{
      workspaceId,
      title: 'session-previous',
      path: 'C:\\profile\\abinadwan-direct-chat-data\\session-previous',
      sessionIds: [sessionId],
    }],
    sessions: { ids: [sessionId], phase: 'ready', byId: {
      [sessionId]: { id: sessionId, blank: true },
    } },
    onOpenSession: id => opened.push(id),
    onWorkspaceDelete: id => { deleted.push(id); return Promise.resolve() },
    fetch: async (url) => { requests.push(url); throw new Error('must not provision another directory') },
  })
  t.after(() => app.dispose())
  enabled(app)
  await app.changed()
  await action(app).props.onClick()
  assert.deepEqual(opened, [sessionId])
  assert.equal(requests.some(url => url === '/api/abinadwan-direct-chat/prepare'), false)
  assert.deepEqual(deleted, [])
  app.sessions.set({ ...app.sessions.getSnapshot(), byId: {
    [sessionId]: { id: sessionId, blank: false },
  } })
  assert.deepEqual(deleted, [workspaceId], 'after the first message only the Workspace registration is removed')
})

test('reconciles completed Direct Chat Workspace registrations on plugin startup without deleting history', async t => {
  const deleted = []
  const app = await clientHarness({
    workspaceItems: [{
      workspaceId: 'old-temporary-workspace',
      title: 'session-old',
      path: '/profile/abinadwan-direct-chat-data/session-old',
      sessionIds: ['old-message'],
    }, {
      workspaceId: 'ordinary-workspace',
      title: 'My Project',
      path: '/profile/my-project',
      sessionIds: ['regular-message'],
    }],
    sessions: { ids: ['old-message', 'regular-message'], phase: 'ready', byId: {
      'old-message': { id: 'old-message', blank: false },
      'regular-message': { id: 'regular-message', blank: false },
    } },
    onWorkspaceDelete: id => { deleted.push(id); return Promise.resolve() },
  })
  t.after(() => app.dispose())
  enabled(app)
  await app.changed()
  assert.deepEqual(deleted, ['old-temporary-workspace'])
})
