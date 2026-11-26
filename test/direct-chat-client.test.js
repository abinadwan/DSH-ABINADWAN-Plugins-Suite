import assert from 'node:assert/strict'
import test from 'node:test'
import { base, clientHarness } from '../test-support/client.js'

function active(app) {
  app.setRows([...app.rows(), { moduleName: base + '/direct-chat', enabled: true, fiberPhase: 'active' }])
}
function button(app) {
  const entry = app.entries('sidebar.session.action').find(row => row.options.id === 'abinadwan-direct-chat')
  assert.ok(entry, 'Direct Chat must register beside the top New Session control')
  const preservedNewSession = { type: 'button', props: { 'aria-label': 'New Session' }, children: [] }
  const container = entry.component({ ...entry.options.inject(), wide: true,
    useRemoteAccess: () => true, children: preservedNewSession })
  assert.equal(container.props['data-abinadwan-direct-chat-top'], '')
  assert.equal(container.children[0], preservedNewSession, 'native New Session button must remain unchanged')
  const directChatElement = container.children[1]
  const node = directChatElement.type(directChatElement.props)
  assert.equal(node.children[0].type, 'button')
  assert.equal(node.children[0].props['aria-label'], 'Direct Chat')
  return node.children[0]
}

test('Direct Chat reuses one Workspace but distinct completed conversations have separate Session IDs', async t => {
  const registered = [], connected = [], opened = [], deleted = [], requests = []
  let firstChatSubmitted = false
  const app = await clientHarness({
    hostLocale: 'en',
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
  assert.equal(app.entries('sidebar.session.action').length, 0)
})

test('an already-registered Workspace is renamed only when its title differs', async t => {
  const renamed = []
  const app = await clientHarness({
    hostLocale: 'en',
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
    hostLocale: 'en',
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

test('Direct Chat top action is not duplicated in the bottom footer', async t => {
  const app = await clientHarness()
  t.after(() => app.dispose())
  active(app)
  await app.changed()
  assert.equal(app.entries('sidebar.footer.action').filter(row => row.options.id === 'abinadwan-direct-chat').length, 0)
  assert.equal(app.entries('sidebar.session.action').filter(row => row.options.id === 'abinadwan-direct-chat').length, 1)
})

test('Direct Chat creation button fails closed without the permission hook or grant', async t => {
  const app = await clientHarness()
  t.after(() => app.dispose())
  active(app)
  await app.changed()
  const entry = app.entries('sidebar.session.action').find(row => row.options.id === 'abinadwan-direct-chat')
  const native = { type: 'button', props: { 'aria-label': 'New Session' }, children: [] }
  for (const access of [undefined, () => false, () => undefined, permission => permission === 'session/create']) {
    const container = entry.component({ ...entry.options.inject(), wide: true, useRemoteAccess: access, children: native })
    assert.equal(container.children[0], native)
    const action = container.children[1]
    const result = action.type(action.props)
    assert.equal(Boolean(result), typeof access === 'function' && access('session/create') === true)
  }
})

test('Direct Chat rename rejects stale actions before reference acquisition and rechecks after readiness', async t => {
  const id = 'verified-chat'
  const direct = { workspaceId: 'direct', title: 'Direct Chat', sessionIds: [id] }
  const ordinary = { workspaceId: 'ordinary', title: 'Project', sessionIds: [] }
  const sessions = { phase: 'ready', ids: [id], byId: { [id]: { id, title: 'Original', blank: false } } }
  const acquired = [], renamed = []
  let duringAcquisition
  let protection = { protectedIds: [], protectedWorkspaces: [] }
  let revision = 1
  const app = await clientHarness({
    workspaceItems: [direct, ordinary], sessions,
    settings: { describe: async () => ({ ok: true, value: { namespaces: [{
      ns: 'abinadwan-conversation-lifecycle', revision, value: { record: protection },
    }] } }) },
    async onSessionUsing(sessionId, options, operation) {
      acquired.push(sessionId)
      assert.equal(options.source, 'workspaceOperation')
      assert.equal(options.signal.aborted, false)
      await duringAcquisition?.()
      return operation({ binding: { session: { async rename(title) {
        renamed.push([sessionId, title])
        return { ok: true }
      } } } })
    },
  })
  t.after(() => app.dispose())
  active(app)
  await app.changed()
  const entry = app.entries('sidebar.session.action').find(row => row.options.id === 'abinadwan-direct-chat')
  const { services } = entry.options.inject()
  const generation = () => services.connection.getSnapshot()
  const setMembership = items => app.workspaces.set({ ...app.workspaces.getSnapshot(), items })
  const rename = (gen = generation()) => services.rename('direct', id, 'Updated', gen)
  const denied = { message: 'Direct Chat membership changed' }

  const previousGeneration = generation()
  app.ctx.emit('connection/reset')
  assert.notEqual(generation(), previousGeneration)
  await assert.rejects(rename(previousGeneration), denied)
  setMembership([{ ...direct, sessionIds: [] }, { ...ordinary, sessionIds: [id] }])
  await assert.rejects(rename(), denied)
  setMembership([direct, { ...ordinary, sessionIds: [id] }])
  await assert.rejects(rename(), denied)
  setMembership([direct, ordinary])
  app.sessions.set({ phase: 'ready', ids: [], byId: {} })
  await assert.rejects(rename(), denied)
  app.sessions.set(sessions)
  assert.deepEqual(acquired, [], 'already-stale actions never request a Session reference')

  const protectedError = { message: 'Direct Chat protection policy unavailable or protected' }
  protection = { protectedIds: [id], protectedWorkspaces: [] }
  await assert.rejects(rename(), protectedError)
  protection = { protectedIds: [], protectedWorkspaces: ['direct'] }
  await assert.rejects(rename(), protectedError)
  protection = { protectedIds: null, protectedWorkspaces: [] }
  await assert.rejects(rename(), protectedError)
  protection = { protectedIds: [] }
  await assert.rejects(rename(), protectedError)
  assert.deepEqual(acquired, [], 'saved or unavailable protection prevents reference acquisition')
  protection = { protectedIds: [], protectedWorkspaces: [] }

  duringAcquisition = () => setMembership([{ ...direct, sessionIds: [] }, ordinary])
  await assert.rejects(rename(), denied)
  setMembership([direct, ordinary])
  duringAcquisition = () => app.ctx.emit('connection/reset')
  await assert.rejects(rename(), denied)
  assert.deepEqual(acquired, [id, id], 'only initially valid actions begin acquisition')
  assert.deepEqual(renamed, [], 'membership or generation changes during acquisition prevent mutation')

  duringAcquisition = () => {
    protection = { protectedIds: [id], protectedWorkspaces: [] }
    revision++
  }
  await assert.rejects(rename(), protectedError)
  protection = { protectedIds: [], protectedWorkspaces: [] }
  revision++
  duringAcquisition = () => { revision++ }
  await assert.rejects(rename(), { message: 'Direct Chat protection changed' })
  assert.deepEqual(renamed, [], 'fresh policy or revision changes prevent rename after acquisition')
  duringAcquisition = undefined
  await rename()
  assert.deepEqual(acquired, [id, id, id, id, id])
  assert.deepEqual(renamed, [[id, 'Updated']], 'authorized rename still works')
  app.setRows(app.rows().map(row => row.moduleName === base + '/direct-chat'
    ? { ...row, enabled: false, fiberPhase: null } : row))
  await app.changed()
  await assert.rejects(rename(), denied)
  assert.deepEqual(acquired, [id, id, id, id, id], 'disposed plugin never acquires a reference')
})
