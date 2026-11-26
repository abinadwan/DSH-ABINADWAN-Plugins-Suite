import assert from 'node:assert/strict'
import { chmod, lstat, mkdir, mkdtemp, readdir, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import test from 'node:test'
import * as plugin from '../plugins/direct-chat/index.js'

function fixture(profile, catalogServices) {
  let guard, preExecute, agentCreated
  const routes = new Map()
  const warnings = []
  const ctx = {
    profileContext: { dir: profile },
    on(name, fn) {
      if (name === 'tools/pre-execute') preExecute = fn
      if (name === 'agent/created') agentCreated = fn
    },
    inject(_services, mount) { if (catalogServices) mount({ ...this, ...catalogServices }) },
    effect(fn) { fn() },
    tools: { guard(fn) { guard = fn; return () => {} } },
    connection: { fetch: { register(value) {
      assert.ok(!routes.has(value.path), 'one registration per route')
      routes.set(value.path, value)
      return () => routes.delete(value.path)
    } } },
    logger: { warn(...args) { warnings.push(args) } },
  }
  plugin.apply(ctx)
  return { handler: routes.get('/api/abinadwan-direct-chat/prepare'), routes, guard: () => guard, preExecute: () => preExecute, agentCreated: () => agentCreated, warnings }
}
const request = (body = '{}') => new Request('http://localhost/api/abinadwan-direct-chat/prepare', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body,
})

test('every prepare returns the SAME permanent Direct Chat Workspace path', async t => {
  const root = await mkdtemp(join(tmpdir(), 'suite-direct-chat-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const profile = join(root, 'profile')
  await mkdir(profile)
  const fx = fixture(profile)
  assert.equal(plugin.name, 'abinadwan-direct-chat')
  assert.equal(fx.handler.path, '/api/abinadwan-direct-chat/prepare')
  assert.equal((await fx.handler.fetch(request('{"cwd":"other"}'))).status, 400)
  const a = await fx.handler.fetch(request())
  const b = await fx.handler.fetch(request())
  assert.equal(a.status, 200)
  assert.equal(b.status, 200)
  const pathA = (await a.json()).path
  const pathB = (await b.json()).path
  assert.equal(pathA, pathB)
  assert.equal(pathA, join(await realpath(profile), 'abinadwan-direct-chat-data', 'Direct Chat'))
  assert.equal((await lstat(pathA)).isDirectory(), true)
})

test('tool guard denies the new shared Directory AND previous experimental per-chat directories', async t => {
  const root = await mkdtemp(join(tmpdir(), 'suite-direct-chat-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const profile = join(root, 'profile')
  await mkdir(profile)
  const fx = fixture(profile)
  const direct = join(profile, 'abinadwan-direct-chat-data')
  for (const cwd of [direct, join(direct, 'Direct Chat'), join(direct, 'session-legacy')]) {
    assert.equal(fx.guard()({ agent: { session: { header: { cwd } } } }).info.code, 'DIRECT_CHAT_TOOL_DENIED')
  }
  assert.equal(fx.guard()({ agent: { session: { header: { cwd: join(root, 'user-project') } } } }), undefined)
  assert.equal(fx.guard()({ agent: { session: { header: { cwd: direct + '-other' } } } }), undefined)
  let called = false
  const res = await fx.preExecute()({ agent: { session: { header: { cwd: join(direct, 'Direct Chat') } } } }, () => {
    called = true; return Promise.resolve({ kind: 'allow' })
  })
  assert.equal(res.kind, 'deny')
  assert.equal(called, false)
})

test('symlink aliases into Direct Chat cannot bypass either tool-denial hook', async t => {
  const root = await mkdtemp(join(tmpdir(), 'suite-direct-chat-alias-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const profile = join(root, 'profile')
  const directRoot = join(profile, 'abinadwan-direct-chat-data')
  await mkdir(join(directRoot, 'Direct Chat'), { recursive: true })
  const alias = join(root, 'unrelated-workspace-alias')
  try {
    await symlink(directRoot, alias, process.platform === 'win32' ? 'junction' : 'dir')
  } catch (error) {
    if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error?.code)) {
      t.skip('This filesystem does not allow directory aliases')
      return
    }
    throw error
  }
  const fx = fixture(profile)
  const aliasedCwd = join(alias, 'Direct Chat')
  const execution = { agent: { session: { header: { cwd: aliasedCwd } } } }
  assert.equal(fx.guard()(execution)?.info.code, 'DIRECT_CHAT_TOOL_DENIED')
  // Even before a nested child directory exists, it still belongs to the
  // protected Workspace: non-filesystem tools could otherwise run there.
  const pendingChild = { agent: { session: { header: { cwd: join(aliasedCwd, 'not-created-yet') } } } }
  assert.equal(fx.guard()(pendingChild)?.info.code, 'DIRECT_CHAT_TOOL_DENIED')
  // Phase 01 regression: the pending tail may contain more than 32 components.
  // A depth cap must never convert an aliased protected Workspace into an allowed cwd.
  const deeplyPending = { agent: { session: { header: {
    cwd: join(aliasedCwd, ...Array(48).fill('d')),
  } } } }
  assert.equal(fx.guard()(deeplyPending)?.info.code, 'DIRECT_CHAT_TOOL_DENIED',
    'deep missing suffix under an aliased protected Workspace must remain denied')
  assert.equal((await fx.preExecute()(deeplyPending,
    () => assert.fail('pre-execute hook must not admit an aliased pending child'))).kind, 'deny')
  const unrelatedDeep = { agent: { session: { header: {
    cwd: join(root, 'unrelated-deep-workspace', ...Array(48).fill('d')),
  } } } }
  assert.equal(fx.guard()(unrelatedDeep), undefined,
    'unrelated deep directories must not be denied because of the traversal fix')
  let executed = false
  const response = await fx.preExecute()(execution, () => {
    executed = true
    return Promise.resolve({ kind: 'allow' })
  })
  assert.equal(response.kind, 'deny')
  assert.equal(executed, false)
})

test('the prepare endpoint rejects symlink/junction replacements for protected directories', async t => {
  const root = await mkdtemp(join(tmpdir(), 'suite-direct-chat-links-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const profile = join(root, 'profile')
  const foreign = join(root, 'foreign')
  await mkdir(profile)
  await mkdir(foreign)
  const linkType = process.platform === 'win32' ? 'junction' : 'dir'
  const dataRoot = join(profile, 'abinadwan-direct-chat-data')
  try {
    await symlink(foreign, dataRoot, linkType)
  } catch (error) {
    if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error?.code)) {
      t.skip('This filesystem does not allow directory aliases')
      return
    }
    throw error
  }
  assert.equal((await fixture(profile).handler.fetch(request())).status, 500)
  await rm(dataRoot)
  await mkdir(dataRoot)
  await symlink(foreign, join(dataRoot, 'Direct Chat'), linkType)
  assert.equal((await fixture(profile).handler.fetch(request())).status, 500)
})

test('a file cannot replace the data root or permanent Workspace directory', async t => {
  const root = await mkdtemp(join(tmpdir(), 'suite-direct-chat-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const profile = join(root, 'profile')
  await mkdir(profile)
  await writeFile(join(profile, 'abinadwan-direct-chat-data'), 'occupied')
  assert.equal((await fixture(profile).handler.fetch(request())).status, 500)
  await rm(join(profile, 'abinadwan-direct-chat-data'))
  await mkdir(join(profile, 'abinadwan-direct-chat-data'))
  await writeFile(join(profile, 'abinadwan-direct-chat-data', 'Direct Chat'), 'occupied')
  assert.equal((await fixture(profile).handler.fetch(request())).status, 500)
})

test('prepare failures never log the profile path or exception text', async t => {
  const root = await mkdtemp(join(tmpdir(), 'suite-direct-chat-private-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const profile = join(root, 'profile-SECRET-CANARY')
  await mkdir(profile)
  await writeFile(join(profile, 'abinadwan-direct-chat-data'), 'conflicting sensitive path')
  const fx = fixture(profile)
  const response = await fx.handler.fetch(request())
  assert.equal(response.status, 500)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal(fx.warnings.length, 1)
  const log = fx.warnings[0].map(String).join(' ')
  assert.doesNotMatch(log, /profile-SECRET-CANARY|conflicting sensitive path|suite-direct-chat-private-/)
  assert.match(log, /Direct Chat: permanent Workspace preparation failed/)
})

test('new Direct Chat directories use owner-only permissions on POSIX', async t => {
  if (process.platform === 'win32') return t.skip('Windows ACLs require real Desktop validation')
  const root = await mkdtemp(join(tmpdir(), 'suite-direct-chat-mode-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const profile = join(root, 'profile')
  await mkdir(profile)
  const fx = fixture(profile)
  const response = await fx.handler.fetch(request())
  assert.equal(response.status, 200)
  const direct = join(profile, 'abinadwan-direct-chat-data')
  const workspace = join(direct, 'Direct Chat')
  for (const dir of [direct, workspace]) {
    const stat = await lstat(dir)
    assert.equal(stat.mode & 0o077, 0,
      'newly created Direct Chat directories must not grant group/other permissions')
  }
})

test('malformed prepare requests return no cached location information', async t => {
  const root = await mkdtemp(join(tmpdir(), 'suite-direct-chat-bad-request-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const profile = join(root, 'profile')
  await mkdir(profile)
  const fx = fixture(profile)
  for (const req of [
    request('{"unexpected":true}'),
    new Request('http://localhost/api/abinadwan-direct-chat/prepare',
      {method:'POST',headers:{'content-type':'text/plain'},body:'{}'}),
  ]) {
    const response = await fx.handler.fetch(req)
    assert.equal(response.status, 400)
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.equal(JSON.stringify(await response.json()).includes(profile), false)
  }
})

test('one Host activation discovers the prepared native Workspace and still denies its tools', async t => {
  const profile = await mkdtemp(join(tmpdir(), 'suite-direct-chat-combined-'))
  t.after(() => rm(profile, { recursive: true, force: true }))
  const workspaces = []
  const reads = []
  const fx = fixture(profile, {
    workspaceRegistry: { list: () => workspaces },
    sessionPersistence: { async stat(id) {
      reads.push(id)
      return { header: { id, createdAt: 1000 } }
    } },
  })
  const path = '/api/abinadwan-direct-chat/catalog'
  const catalog = fx.routes.get(path)
  assert.ok(catalog, 'the Direct Chat Host must mount the catalog alongside prepare')
  assert.deepEqual(catalog.methods, ['GET'])
  const lookup = (query = '') => catalog.fetch(new Request('http://localhost' + path + query))

  assert.deepEqual(await (await lookup()).json(), { workspaceId: null })
  await assert.rejects(lstat(join(profile, 'abinadwan-direct-chat-data')), { code: 'ENOENT' })
  const prepared = await fx.handler.fetch(request())
  assert.equal(prepared.headers.get('cache-control'), 'no-store')
  const { path: cwd } = await prepared.json()
  workspaces.push(
    { id: 'native-direct-chat', path: cwd, sessionIds: ['historic-session'] },
    { id: 'native-project', path: join(profile, 'Projects'), sessionIds: ['project-session'] },
  )

  const response = await lookup('?order=creation')
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.deepEqual(await response.json(), { workspaceId: 'native-direct-chat', createdAt: { 'historic-session': 1000 } })
  assert.deepEqual(reads, ['historic-session'])
  const execution = { agent: { session: { header: { cwd } } } }
  assert.equal(fx.guard()(execution)?.info.code, 'DIRECT_CHAT_TOOL_DENIED')
  assert.equal((await fx.preExecute()(execution, () => assert.fail('tool execution was admitted'))).kind, 'deny')
  assert.equal(fx.guard()({ agent: { session: { header: { cwd: workspaces[1].path } } } }), undefined)
})

test('prepare and catalog refuse insecure existing POSIX directories without modifying permissions', async t => {
  if (process.platform === 'win32') return t.skip('Windows ACLs require separate validation')
  const profile = await mkdtemp(join(tmpdir(), 'suite-direct-chat-existing-'))
  t.after(() => rm(profile, { recursive: true, force: true }))
  const root = join(profile, 'abinadwan-direct-chat-data')
  const cwd = join(root, 'Direct Chat')
  await mkdir(cwd, { recursive: true, mode: 0o700 })
  const canonical = await realpath(cwd)
  const fx = fixture(profile, {
    workspaceRegistry: { list: () => [{ id: 'direct', path: canonical, sessionIds: [] }] },
    sessionPersistence: { async stat() { throw new Error('unexpected metadata read') } },
  })
  const catalog = () => fx.routes.get('/api/abinadwan-direct-chat/catalog').fetch(
    new Request('http://localhost/api/abinadwan-direct-chat/catalog'))
  for (const path of [root, cwd]) {
    await chmod(path, 0o755)
    assert.equal((await fx.handler.fetch(request())).status, 500)
    assert.equal((await catalog()).status, 503)
    assert.equal((await lstat(path)).mode & 0o777, 0o755)
    await chmod(path, 0o700)
    assert.equal((await fx.handler.fetch(request())).status, 200)
    assert.equal((await catalog()).status, 200)
  }
})

test('native Session membership denies tools even if the agent cwd is different; restrictions are agent scoped', async t => {
  const profile = await mkdtemp(join(tmpdir(), 'suite-direct-chat-identity-'))
  t.after(() => rm(profile, { recursive: true, force: true }))
  const direct = join(profile, 'abinadwan-direct-chat-data', 'Direct Chat')
  const other = join(profile, 'Project')
  const workspaces = [
    { id: 'direct', path: direct, sessionIds: ['direct-id'] },
    { id: 'ordinary', path: other, sessionIds: ['ordinary-id'] },
  ]
  const fx = fixture(profile, { workspaceRegistry: { list: () => workspaces } })
  const restrictions = []
  const agentFor = id => ({
    session: { header: { id, cwd: other } },
    ctx: { tools: { restrict(value) { restrictions.push([id, value]) } } },
  })
  const directAgent = agentFor('direct-id')
  const ordinary = agentFor('ordinary-id')
  fx.agentCreated()({ agent: directAgent })
  fx.agentCreated()({ agent: ordinary })
  assert.deepEqual(restrictions, [['direct-id', { allow: [] }]])
  assert.equal(fx.guard()({ agent: directAgent })?.info.code, 'DIRECT_CHAT_TOOL_DENIED')
  assert.equal((await fx.preExecute()({ agent: directAgent },
    () => assert.fail('identity-based denial bypassed'))).kind, 'deny')
  assert.equal(fx.guard()({ agent: ordinary }), undefined)
  workspaces[0].sessionIds = []
  assert.equal(fx.guard()({ agent: directAgent })?.info.code, 'DIRECT_CHAT_TOOL_DENIED',
    'a recognized live Direct Chat Agent stays denied after membership changes')
  workspaces[0].sessionIds = ['late-id']
  assert.equal(fx.guard()({ agent: agentFor('late-id') })?.info.code, 'DIRECT_CHAT_TOOL_DENIED')
})

test('verified Direct Chat identities survive registry loss and a fresh Host activation', async t => {
  const profile = await mkdtemp(join(tmpdir(), 'suite-direct-chat-cache-'))
  t.after(() => rm(profile, { recursive: true, force: true }))
  const cwd = join(profile, 'Project')
  const direct = join(profile, 'abinadwan-direct-chat-data', 'Direct Chat')
  const agent = id => ({ session: { header: { id, cwd } } })
  const execution = id => ({ agent: agent(id) })
  const known = 'synthetic-private-id'
  const service = { workspaceRegistry: { list: () => [{path: direct, sessionIds: [known]}] } }
  let fx = fixture(profile, service)
  assert.equal(fx.guard()(execution(known))?.info.code, 'DIRECT_CHAT_TOOL_DENIED')
  const directory = join(profile, 'abinadwan-direct-chat-identities')
  const files = await readdir(directory)
  assert.equal(files.length, 1)
  assert.match(files[0], /^[0-9a-f]{64}$/)
  assert.equal((await lstat(join(directory, files[0]))).size, 0)
  if (process.platform !== 'win32') {
    assert.equal((await lstat(directory)).mode & 0o077, 0)
    assert.equal((await lstat(join(directory, files[0]))).mode & 0o077, 0)
  }
  service.workspaceRegistry.list = () => { throw Error('synthetic registry outage') }
  assert.equal(fx.guard()(execution(known))?.info.code, 'DIRECT_CHAT_TOOL_DENIED')
  fx = fixture(profile, service)
  assert.equal(fx.guard()(execution(known))?.info.code, 'DIRECT_CHAT_TOOL_DENIED')
  assert.equal((await fx.preExecute()(execution(known),
    () => assert.fail('cached identity admitted a tool'))).kind, 'deny')
  assert.equal(fx.guard()(execution('unknown-ordinary')), undefined)
  assert.equal(await fx.preExecute()(execution('unknown-ordinary'), () => 'allowed'), 'allowed')
  const noRegistry = fixture(profile)
  assert.equal(noRegistry.guard()(execution(known))?.info.code, 'DIRECT_CHAT_TOOL_DENIED')
  const malformed = fixture(profile, {workspaceRegistry: {list: () => [{path: direct, sessionIds: null}]}})
  assert.equal(malformed.guard()(execution(known))?.info.code, 'DIRECT_CHAT_TOOL_DENIED')
  service.workspaceRegistry.list = () => [{path: cwd, sessionIds: [known]}]
  assert.equal(fx.guard()(execution(known)), undefined, 'authoritative ordinary membership wins for a fresh agent')
  assert.deepEqual(await readdir(directory), [])
  service.workspaceRegistry.list = () => { throw Error('synthetic registry outage') }
  assert.equal(fixture(profile, service).guard()(execution(known)), undefined, 'revoked cache is not restored on restart')
})

test('identity cache never learns from cwd alone or unknown registry failures', async t => {
  const profile = await mkdtemp(join(tmpdir(), 'suite-direct-chat-cache-'))
  t.after(() => rm(profile, { recursive: true, force: true }))
  const cwd = join(profile, 'abinadwan-direct-chat-data', 'Direct Chat')
  const fx = fixture(profile)
  assert.equal(fx.guard()({agent: {session: {header: {id: 'path-only', cwd}}}})?.info.code,
    'DIRECT_CHAT_TOOL_DENIED')
  assert.equal(fixture(profile).guard()({agent: {session: {header: {id: 'path-only', cwd: join(profile, 'Project')}}}}), undefined)
  await assert.rejects(lstat(join(profile, 'abinadwan-direct-chat-identities')), {code: 'ENOENT'})
})

test('identity storage failures preserve live policy without following a redirected cache directory', async t => {
  const profile = await mkdtemp(join(tmpdir(), 'suite-direct-chat-cache-'))
  t.after(() => rm(profile, { recursive: true, force: true }))
  const target = join(profile, 'unrelated')
  await mkdir(target)
  const cache = join(profile, 'abinadwan-direct-chat-identities')
  try { await symlink(target, cache, process.platform === 'win32' ? 'junction' : 'dir') }
  catch (error) {
    if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) return t.skip('directory alias unavailable')
    throw error
  }
  const direct = join(profile, 'abinadwan-direct-chat-data', 'Direct Chat')
  const cwd = join(profile, 'Project')
  const execution = id => ({agent: {session: {header: {id, cwd}}}})
  const service = {workspaceRegistry: {list: () => [{path: direct, sessionIds: ['known']}]}}
  const fx = fixture(profile, service)
  assert.equal(fx.guard()(execution('known'))?.info.code, 'DIRECT_CHAT_TOOL_DENIED')
  assert.deepEqual(await readdir(target), [], 'no marker written through alias')
  service.workspaceRegistry.list = () => { throw Error('synthetic outage') }
  assert.equal(fx.guard()(execution('known'))?.info.code, 'DIRECT_CHAT_TOOL_DENIED', 'memory fallback remains')
  assert.equal(fixture(profile, service).guard()(execution('known')), undefined, 'unsafe disk cache is ignored')
  assert.equal(fx.guard()(execution('ordinary')), undefined)
  assert.equal(fx.warnings.length, 1)
  assert.doesNotMatch(fx.warnings.flat().join(' '), /suite-direct-chat-cache-|known/)
})
