import assert from 'node:assert/strict'
import { chmod, lstat, mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import test from 'node:test'
import * as plugin from '../plugins/direct-chat/index.js'

function fixture(profile, catalogServices) {
  let guard, preExecute
  const routes = new Map()
  const warnings = []
  const ctx = {
    profileContext: { dir: profile },
    on(name, fn) { if (name === 'tools/pre-execute') preExecute = fn },
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
  return { handler: routes.get('/api/abinadwan-direct-chat/prepare'), routes, guard: () => guard, preExecute: () => preExecute, warnings }
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
