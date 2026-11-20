// Windows-only. Mounts the production Direct Chat Host plugin with a synthetic context and a synthetic Harness
// home, so the real runtime provisioning, AppContainer launch, broker, storage routes and cleanup all run. The
// provider is a synthetic adapter: no credentials and no network. Needs ABINADWAN_TEST_RUNTIME (a Harness
// runtime folder with node_modules, including koffi) and ABINADWAN_TEST_NODE (a copy of the bundled node.exe).
// Every file stays in a scratch folder under node_modules/.direct-chat-confined; cleanup removes grants and profiles.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { copyFile, cp, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, rmdir, symlink, utimes, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

const runtime = process.env.ABINADWAN_TEST_RUNTIME
const node = process.env.ABINADWAN_TEST_NODE
if (process.platform !== 'win32' || !runtime || !node) throw new Error('Set ABINADWAN_TEST_RUNTIME and ABINADWAN_TEST_NODE on Windows')
const repository = fileURLToPath(new URL('../', import.meta.url))
const plugin = pathToFileURL(join(repository, 'plugins', 'direct-chat', 'index.js')).href

async function mounted(t, { rogue = false } = {}) {
  const parent = join(repository, 'node_modules', '.direct-chat-confined')
  await mkdir(parent, { recursive: true })
  const root = await realpath(await mkdtemp(join(parent, 'production-')))
  const home = join(root, 'home')
  const saved = { ...process.env }
  Object.assign(process.env, { DSH_HOME: home, DSH_AGENTS_HOME: join(root, 'agents'),
    ABINADWAN_DIRECT_CHAT_SOURCE_MODULES: join(runtime, 'node_modules'), ABINADWAN_DIRECT_CHAT_SOURCE_NODE: node })
  const { dataPaths } = await import(pathToFileURL(join(repository, 'plugins', 'direct-chat', 'host', 'storage.js')).href)
  const paths = dataPaths()
  if (rogue) {
    // Provision the copy first, then stage the hostile worker where the real one runs. The copy is reused.
    const { provisionRuntime } = await import(pathToFileURL(join(repository, 'plugins', 'direct-chat', 'host', 'runtime.js')).href)
    await mkdir(paths.runtime, { recursive: true })
    const snapshot = await provisionRuntime(paths.runtime)
    await copyFile(join(repository, 'qa', 'direct-chat-broker', 'rogue-worker.js'), join(snapshot.app, 'worker.js'))
  }
  const routes = new Map()
  const disposers = []
  const prepared = []
  const fiber = { uid: 9, state: 2, parent: { fiber: { uid: 0, state: 2 } } }
  let disposed = false
  async function dispose(asDisabled) {
    if (disposed) return
    disposed = true
    if (asDisabled) fiber.uid = null
    for (const disposeOne of disposers.reverse()) await disposeOne()
  }
  t.after(async () => {
    await dispose(false)
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key]
    Object.assign(process.env, saved)
    const snapshot = (await readdir(paths.runtime).catch(() => [])).find(name => !name.startsWith('.'))
    if (existsSync(join(paths.state, 'appcontainer-grants.json')) && snapshot) {
      const cleanup = spawnSync(node, [join(paths.runtime, snapshot, 'app', 'cleanup.mjs'), join(paths.runtime, snapshot), '--state', paths.state],
        { encoding: 'utf8', windowsHide: true, timeout: 120_000 })
      assert.equal(cleanup.status, 0, cleanup.stderr)
    }
    // ABINADWAN_CHECK_EVIDENCE=<folder> keeps the Host state (diagnostics, lifecycle trail) for inspection.
    if (process.env.ABINADWAN_CHECK_EVIDENCE) {
      await cp(paths.state, join(process.env.ABINADWAN_CHECK_EVIDENCE, `state-${Date.now()}`), { recursive: true }).catch(() => {})
    }
    await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
  })
  const reply = text => async function* () {
    yield { type: 'block-start', index: 0, blockType: 'text' }
    yield { type: 'text-delta', index: 0, text }
    yield { type: 'block-end', index: 0, block: { type: 'text', text } }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
  const hanging = () => ({ [Symbol.asyncIterator]() { return this }, next: () => new Promise(() => {}), async return() { return { done: true } } })
  const ctx = {
    fiber,
    effect(setup) { const disposeOne = setup(); if (disposeOne) disposers.push(disposeOne) },
    connection: { fetch: { register({ path, fetch }) { routes.set(path, fetch); return () => routes.delete(path) } } },
    agentDefaultModel: { currentSelection: () => ({ provider: 'synthetic-provider', model: 'synthetic-model' }) },
    llm: {
      async listModels() { return [{ id: 'synthetic-model' }, { id: 'synthetic-second' }] },
      async resolveModelInfo(_provider, id) { return { id, name: id, context: 64000, reasoning: undefined } },
      async prepareCall(config) {
        await new Promise(done => setImmediate(done))
        return { config, stream: options => {
          prepared.push({ config, messages: options.messages })
          if (rogue) return hanging()
          const last = options.messages.at(-1)?.content?.map(block => block.text).join('') ?? ''
          return reply(`Synthetic reply to: ${last}`)()
        } }
      },
    },
  }
  const { apply } = await import(`${plugin}?mount=${randomUUID()}`)
  await apply(ctx)
  async function call(route, data = {}) {
    const response = await routes.get(`/api/abinadwan-direct-chat/${route}`)(new Request('http://localhost/', {
      method: 'POST', body: JSON.stringify(data) }))
    const text = await response.text()
    return { status: response.status, body: text, json: () => JSON.parse(text) }
  }
  async function rpc(peer, endpoint, request = {}) {
    const args = request === null ? {} : { request }
    const payload = { type: 'client-request', rpcId: randomUUID(), method: endpoint, payload: { args } }
    return call('rpc', { peer, endpoint, payload })
  }
  return { root, home, paths, call, rpc, prepared, dispose }
}

async function waitFor(check, label, ms = 30_000) {
  const until = Date.now() + ms
  for (;;) {
    const value = await check()
    if (value) return value
    if (Date.now() > until) throw new Error(`Timed out waiting for ${label}`)
    await new Promise(done => setTimeout(done, 200))
  }
}

async function transcripts(storage) {
  const out = []
  const sessions = join(storage, 'sessions')
  for (const group of await readdir(sessions).catch(() => [])) {
    for (const id of await readdir(join(sessions, group))) {
      const file = join(sessions, group, id, 'session.v4.jsonl')
      // The writer creates the session directory before publishing its transcript.
      const info = await lstat(file).catch(error => {
        if (error.code !== 'ENOENT') throw error
      })
      if (info?.isFile()) out.push({ id, file })
    }
  }
  return out
}

test('the production broker admits provider streams only under a live lease and at most two at once', async t => {
  const { call, prepared } = await mounted(t, { rogue: true })
  const opened = await call('open')
  assert.equal(opened.status, 200, opened.body)
  const { peer } = opened.json()
  const outcome = await call('rpc', { peer, endpoint: 'rogue', payload: {} })
  assert.equal(outcome.status, 200, outcome.body)
  const { beforeLease, concurrent } = outcome.json()
  assert.equal(beforeLease, 'refused', 'no provider stream before an owner window holds a lease')
  assert.equal(concurrent.filter(value => value === 'admitted').length, 2)
  assert.equal(concurrent.filter(value => value === 'refused').length, 2)
  assert.ok(prepared.length <= 2, `streams opened: ${prepared.length}`)
  assert.equal((await call('close', { peer })).status, 204)
})

test('production Direct Chat: carrier refusals, chats, deletion, migration, retention, Delete All and access removal', async t => {
  const { root, paths, call, rpc, prepared, dispose } = await mounted(t)
  assert.equal((await call('status')).json().phase, 'idle')
  const open = async () => {
    const opened = await call('open')
    assert.equal(opened.status, 200, opened.body)
    return opened.json().peer
  }
  const create = async peer => {
    const created = await rpc(peer, 'session/create')
    assert.equal(created.status, 200, created.body)
    const value = created.json().result?.value
    return typeof value === 'string' ? value : value?.sessionId ?? value?.id
  }
  const prompt = (peer, sessionId, text) => rpc(peer, 'session/prompt', { sessionId, requestId: randomUUID(), mode: 'queue',
    content: [{ type: 'text', text }] })
  const denied = async (peer, request) => {
    const response = await rpc(peer, 'session/prompt', request)
    return response.status === 200 && response.json().result?.error?.code === 'remote-access/denied'
  }

  let peer = await open()
  const status = (await call('status')).json()
  assert.equal(status.phase, 'running')
  assert.ok(status.runtime.files > 1000, 'plugin-owned runtime copy exists')
  assert.match(status.runtime.path, /abinadwan-direct-chat\\runtime\\/)
  const alpha = await create(peer)
  const bravo = await create(peer)
  assert.match(alpha, /^session-/)
  assert.equal((await prompt(peer, alpha, 'alpha synthetic canary')).status, 200)
  assert.equal((await prompt(peer, bravo, 'bravo synthetic message')).status, 200)
  const storage = paths.defaultStorage
  await waitFor(async () => {
    const files = await transcripts(storage)
    const texts = await Promise.all(files.map(entry => readFile(entry.file, 'utf8').catch(() => '')))
    // Model turns run while a window follows the chat (verified in Desktop). Here the accepted prompts are
    // persisted in the companion's own storage, which is what deletion, migration and retention act on.
    return texts.some(text => text.includes('alpha synthetic canary')) && texts.some(text => text.includes('bravo synthetic message'))
  }, 'both prompts in companion storage')
  assert.ok(prepared.every(entry => entry.messages.every(message => message.content.every(block => block.type === 'text'))))

  // The carrier refuses foreign sessions, empty and non-text prompts, and every non-chat endpoint.
  const foreign = `session-${randomUUID()}`
  const content = [{ type: 'text', text: 'Synthetic refusal check' }]
  assert.ok(await denied(peer, { sessionId: foreign, requestId: randomUUID(), mode: 'queue', content }), 'foreign session')
  assert.ok(await denied(peer, { sessionId: alpha, requestId: randomUUID(), mode: 'queue', content: [] }), 'empty prompt')
  assert.ok(await denied(peer, { sessionId: alpha, requestId: randomUUID(), mode: 'queue',
    content: [{ type: 'file', receiptId: 'synthetic' }] }), 'non-text prompt')
  for (const endpoint of ['terminal/open', 'session/openWorkspacePath', 'session/selectPreset']) {
    assert.equal((await rpc(peer, endpoint)).status, 409, endpoint)
  }
  assert.equal((await rpc(peer, 'session/create', { cwd: root })).status, 409, 'caller-chosen directory')
  assert.equal((await call('renew', { peer: randomUUID() })).status, 410)

  // Deleting one chat stops the companion, leaves the other chat, and leaves no trace of the deleted one.
  const removed = await call('delete', { ids: [alpha] })
  assert.equal(removed.status, 200, removed.body)
  assert.deepEqual(removed.json().deleted, [alpha])
  assert.equal((await call('renew', { peer })).status, 410, 'windows reconnect after maintenance')
  const left = await transcripts(storage)
  assert.deepEqual(left.map(entry => entry.id), [bravo])
  const scan = spawnSync('findstr', ['/s', '/m', '/c:alpha synthetic canary', '*'], { cwd: storage, encoding: 'utf8', windowsHide: true })
  assert.equal(scan.stdout.trim(), '', 'deleted chat text remains in storage')
  peer = await open()
  const listed = await rpc(peer, 'session/list', null)
  assert.equal(listed.status, 200, listed.body)
  assert.doesNotMatch(listed.body, new RegExp(alpha))
  assert.match(listed.body, new RegExp(bravo))

  // Migration copies to an empty folder outside the Harness home; the moved chat resumes there.
  const moved = join(root, 'moved-storage')
  const changed = await call('storage', { mode: 'migrate', path: moved })
  assert.equal(changed.status, 200, changed.body)
  assert.equal(changed.json().path, moved)
  assert.equal(changed.json().accessRevoked, true)
  assert.equal((await call('status')).json().storage.path, moved)
  const stale = await call('delete-all', { confirmation: 'DELETE ALL DIRECT CHATS', storageKey: status.storage.key })
  assert.equal(stale.status, 409, stale.body)
  assert.match(stale.json().message, /storage changed/)
  peer = await open()
  assert.equal((await prompt(peer, bravo, 'bravo after migration')).status, 200)
  await waitFor(async () => (await readFile((await transcripts(moved))[0].file, 'utf8')).includes('bravo after migration'),
    'the moved chat accepting a prompt in the new root')
  assert.doesNotMatch(await readFile(left[0].file, 'utf8'), /bravo after migration/, 'the previous root is left unchanged')
  // A distinct Host process with a distinct Harness home still cannot operate on the active root.
  const otherCode = [
    'import { apply } from ' + JSON.stringify(plugin),
    'import { dataPaths, ensureDataFolders, writeSettings } from ' + JSON.stringify(new URL('../plugins/direct-chat/host/storage.js', import.meta.url).href),
    'const routes = new Map(), disposers = []',
    'const paths = dataPaths()',
    'ensureDataFolders(paths)',
    'writeSettings(paths.state, { storage: process.argv[1], previousStorage: null, retentionDays: 7 })',
    'await apply({ fiber: { uid: 1 }, effect(fn) { disposers.push(fn()) }, connection: { fetch: { register({ path, fetch }) { routes.set(path, fetch) } } } })',
    'const responses = {}',
    'for (const [route, data] of Object.entries({ open: {}, "delete-all": { confirmation: "DELETE ALL DIRECT CHATS" },',
    '  "retention-run": {}, storage: { mode: "migrate", path: process.argv[2] } })) {',
    '  const response = await routes.get("/api/abinadwan-direct-chat/" + route)(new Request("http://localhost",',
    '    { method: "POST", body: JSON.stringify(data) }))',
    '  responses[route] = { status: response.status, message: (await response.json()).message }',
    '}',
    'console.log(JSON.stringify(responses))',
    'for (const dispose of disposers.reverse()) await dispose?.()',
  ].join('\n')
  const other = spawnSync(node, ['--input-type=module', '--eval', otherCode, moved, join(root, 'occupied-migration')],
    { encoding: 'utf8', windowsHide: true, timeout: 30_000,
      env: { ...process.env, DSH_HOME: join(root, 'independent-host'), ABINADWAN_DIRECT_CHAT_DIAGNOSTICS: '0' } })
  assert.equal(other.status, 0, other.stderr)
  const refused = JSON.parse(other.stdout)
  assert.deepEqual(Object.keys(refused), ['open', 'delete-all', 'retention-run', 'storage'])
  for (const response of Object.values(refused)) {
    assert.equal(response.status, 409)
    assert.match(response.message, /in use by another process/)
  }
  assert.equal(existsSync(join(root, 'occupied-migration')), false)
  assert.match(await readFile((await transcripts(moved))[0].file, 'utf8'), /bravo after migration/)
  const manifest = JSON.parse(await readFile(join(paths.state, 'appcontainer-grants.json'), 'utf8'))
  assert.equal(new Set(manifest.grants.map(entry => entry.profile)).size, 1, 'only the current root identity holds grants')
  assert.ok(manifest.grants.some(entry => entry.path === moved && entry.rights === 'M'))
  assert.equal(manifest.grants.some(entry => entry.path === storage), false)
  assert.equal((await call('storage', { mode: 'migrate', path: join(root, 'home', 'inside') })).status, 409)

  // Retention deletes chats past the policy only when asked or at the next start.
  assert.equal((await call('retention', { days: 7 })).status, 200)
  const [movedChat] = await transcripts(moved)
  const old = new Date(Date.now() - 10 * 86_400_000)
  await call('close', { peer })
  await utimes(movedChat.file, old, old)
  assert.equal((await call('retention-preview', { days: 7 })).json().candidates.length, 1)
  const retained = await call('retention-run')
  assert.equal(retained.status, 200, retained.body)
  assert.equal(retained.json().deleted, 1)
  assert.deepEqual(await transcripts(moved), [])

  // Delete All needs the exact confirmation and empties the root but keeps its marker.
  peer = await open()
  const startupId = await create(peer)
  assert.equal((await prompt(peer, startupId, 'synthetic startup retention candidate')).status, 200)
  let startup
  await waitFor(async () => {
    startup = (await transcripts(moved)).find(file => file.id === startupId)
    return startup && (await readFile(startup.file, 'utf8')).includes('synthetic startup retention candidate')
  }, 'the startup-retention transcript')
  await call('close', { peer })
  await waitFor(async () => (await call('status')).json().phase === 'idle', 'the companion shutting down')
  await utimes(startup.file, old, old)
  peer = await open()
  assert.deepEqual(await transcripts(moved), [], 'startup retention applied after exclusive admission')

  const outside = join(root, 'outside')
  await mkdir(outside)
  await writeFile(join(outside, 'untouched.txt'), 'synthetic outside canary')
  const redirected = join(root, 'redirected')
  await symlink(outside, redirected, 'junction')
  assert.equal((await call('storage', { mode: 'migrate', path: redirected })).status, 409)
  assert.equal(await readFile(join(outside, 'untouched.txt'), 'utf8'), 'synthetic outside canary')
  const nested = await call('storage', { mode: 'switch', path: join(moved, 'nested') })
  assert.equal(nested.status, 409)
  assert.equal(existsSync(join(moved, 'nested')), false)
  peer = await open()
  for (const text of ['synthetic concurrent deletion A', 'synthetic concurrent deletion B']) {
    assert.equal((await prompt(peer, await create(peer), text)).status, 200)
  }
  await waitFor(async () => (await transcripts(moved)).length === 2, 'both chats before concurrent deletion')
  assert.equal((await call('delete-all', { confirmation: 'delete all' })).status, 409)
  const [wiped, secondWipe] = await Promise.all([
    call('delete-all', { confirmation: 'DELETE ALL DIRECT CHATS' }),
    call('delete-all', { confirmation: 'DELETE ALL DIRECT CHATS' }),
  ])
  assert.equal(wiped.status, 200, wiped.body)
  assert.equal(secondWipe.status, 200, secondWipe.body)
  assert.deepEqual(await readdir(moved), ['.abinadwan-direct-chat-lease', '.abinadwan-direct-chat-storage'])

  // Simulate an inaccessible grant target with a redirected root. Cleanup preserves the manifest and can retry.
  const parked = join(root, 'parked-storage')
  await rename(moved, parked)
  await symlink(outside, moved, 'junction')
  assert.equal((await call('open')).status, 409, 'startup retention refuses a redirected root')
  const incomplete = await call('remove-access')
  assert.equal(incomplete.status, 200, incomplete.body)
  assert.equal(incomplete.json().ok, false)
  const retainedGrant = JSON.parse(await readFile(join(paths.state, 'appcontainer-grants.json'), 'utf8'))
  assert.ok(retainedGrant.grants.some(grant => grant.path === moved && grant.rights === 'M'))
  assert.ok(retainedGrant.profiles.length)
  assert.equal(await readFile(join(outside, 'untouched.txt'), 'utf8'), 'synthetic outside canary')
  await rmdir(moved)
  await rename(parked, moved)

  // Removing system access withdraws every grant and the runtime copy; turning Direct Chat off does the same.
  const access = await call('remove-access')
  assert.equal(access.status, 200, access.body)
  assert.equal(access.json().ok, true, access.body)
  assert.equal(existsSync(join(paths.state, 'appcontainer-grants.json')), false)
  assert.deepEqual(await readdir(paths.runtime), [])
  peer = await open()
  assert.ok(existsSync(join(paths.state, 'appcontainer-grants.json')), 'a new open grants access again')
  await call('close', { peer })
  await dispose(true)
  assert.equal(existsSync(join(paths.state, 'appcontainer-grants.json')), false, 'disable withdraws every grant')
  assert.deepEqual(await readdir(paths.runtime), [])
  assert.match(await readFile(join(paths.state, 'lifecycle.log'), 'utf8'), /disabled; system access removed ok=true/)
})
