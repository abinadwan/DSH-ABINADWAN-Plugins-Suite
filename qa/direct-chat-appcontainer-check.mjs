// Windows-only AppContainer (LPAC) confinement checks for the Direct Chat companion.
// Requires ABINADWAN_TEST_RUNTIME (extracted Harness runtime) and ABINADWAN_TEST_NODE (bundled node.exe).
// All writes stay inside a synthetic scratch folder under node_modules/.direct-chat-confined.
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { dirname, join, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

const runtime = process.env.ABINADWAN_TEST_RUNTIME
const node = process.env.ABINADWAN_TEST_NODE
if (process.platform !== 'win32' || !runtime || !node) throw new Error('Set ABINADWAN_TEST_RUNTIME and ABINADWAN_TEST_NODE on Windows')
const repository = fileURLToPath(new URL('../', import.meta.url))
const parent = join(repository, 'node_modules', '.direct-chat-confined')

async function scratch(t) {
  await mkdir(parent, { recursive: true })
  const root = await mkdtemp(join(parent, 'check-'))
  const app = join(root, 'app')
  await cp(join(repository, 'qa', 'direct-chat-desktop'), app, { recursive: true })
  const home = join(root, 'home')
  await mkdir(home)
  t.after(() => rm(root, { recursive: true, force: true, maxRetries: 5 }).catch(() => {}))
  const { startCompanion, CONFINEMENT_FAILED } = await import(pathToFileURL(join(app, 'companion-process.js')).href)
  const { bindChannel } = await import(pathToFileURL(join(app, 'channel.js')).href)
  return { root, app, home, startCompanion, CONFINEMENT_FAILED, bindChannel }
}

function alive(pid) {
  const result = spawnSync('tasklist', ['/FI', `PID eq ${pid}`, '/NH'], { encoding: 'utf8', windowsHide: true })
  return result.stdout.includes(` ${pid} `)
}

test('the LPAC companion reaches only its runtime and storage, with no network or processes', async t => {
  const { app, home, root } = await scratch(t)
  const denied = join(root, 'denied')
  await mkdir(denied)
  await writeFile(join(denied, 'canary.txt'), 'synthetic canary')
  const server = createServer(socket => socket.destroy()).listen(0, '127.0.0.1')
  await new Promise(done => server.once('listening', done))
  t.after(() => server.close())
  const plan = { runtime, home, loopbackPort: server.address().port,
    deniedReads: [join(denied, 'canary.txt'), join(repository, 'README.md'), join(repository, 'package.json')],
    deniedDirs: [denied, repository], deniedWrites: [denied, repository, dirname(home)] }
  const { SystemRoot, WINDIR } = process.env
  const config = { runtime, exe: node, cwd: home, lpac: true, capabilities: ['registryRead'], jobMemoryLimit: 512 * 1024 * 1024,
    read: [dirname(node), runtime, app], write: [home],
    args: ['--preserve-symlinks', '--preserve-symlinks-main', join(app, 'confinement-probe.mjs'),
      Buffer.from(JSON.stringify(plan)).toString('base64url')],
    env: { SystemRoot, WINDIR, LOCALAPPDATA: home, HOME: home, USERPROFILE: home, TEMP: home, TMP: home } }
  const result = spawnSync(node, [join(app, 'launcher.mjs'), Buffer.from(JSON.stringify(config)).toString('base64url')],
    { encoding: 'utf8', windowsHide: true, timeout: 60_000, env: { SystemRoot, WINDIR } })
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stderr, /lpac=true/)
  const outcome = JSON.parse(result.stdout)
  for (const name of ['readRuntime', 'writeHome', 'readHome', 'koffi']) assert.equal(outcome[name].ok, true, name)
  for (const name of ['deniedJunction', 'deniedHardlink', 'deniedSymlink', 'deniedScreen', 'deniedWindows', 'deniedClipboard']) {
    assert.ok(outcome[name], `${name} was probed`)
  }
  for (const [name, value] of Object.entries(outcome)) {
    if (/^denied/.test(name)) assert.equal(value.ok, false, `${name} must be refused`)
  }
  assert.equal(outcome.loopback.ok, false)
  assert.equal(outcome.internet.ok, false)
  assert.equal(outcome.spawn.ok, false)
  assert.deepEqual(outcome.env.value, ['HOME', 'LOCALAPPDATA', 'SystemRoot', 'TEMP', 'TMP', 'USERPROFILE', 'WINDIR'])
  assert.deepEqual(await readdir(denied), ['canary.txt'])
  assert.deepEqual((await readdir(home)).filter(name => name.startsWith('planted-')), [], 'no link reaches outside storage')
  for (const directory of [home, repository]) {
    assert.ok(!(await readdir(directory)).includes('escaped.txt'))
    assert.ok(!(await readdir(directory)).includes('direct-chat-escape.txt'))
  }
})

const provider = 'fixture-provider'
const model = 'fixture-model'
const reply = 'Synthetic confined response'
const catalog = { models: { [provider]: [{ id: model, name: model, provider, inputModalities: ['text'] }] },
  selection: { provider, model } }

function broker() {
  const streams = new Map()
  const calls = []
  let completed
  const turnDone = new Promise(done => { completed = done })
  return { calls, turnDone, async dispatch(operation, data) {
    if (operation === 'catalog') return catalog
    if (operation === 'model') {
      assert.ok(data.messages.every(message => message.content.every(block => block.type === 'text')))
      calls.push({ model: data.model, effort: data.reasoningEffort })
      streams.set(data.id, [
        { type: 'block-start', index: 0, blockType: 'text' },
        { type: 'text-delta', index: 0, text: reply },
        { type: 'block-end', index: 0, block: { type: 'text', text: reply } },
        { type: 'finish', reason: { kind: 'stop' } },
      ])
      return true
    }
    if (operation === 'model-next') {
      const items = streams.get(data.id)
      return items?.length ? { done: false, value: items.shift() } : { done: true }
    }
    if (operation === 'model-close') { streams.delete(data.id); completed(); return true }
    throw new Error(`Unexpected ${operation}`)
  } }
}

async function companion(context, home) {
  const fake = broker()
  const started = context.startCompanion({ node, runtime, home, diagnostics: true })
  const link = context.bindChannel(started.port, fake.dispatch)
  const metrics = await link.request('ready')
  const peer = crypto.randomUUID()
  await link.request('open', { peer })
  async function rpc(endpoint, request) {
    const args = request === undefined ? {} : { request }
    const payload = { type: 'client-request', rpcId: crypto.randomUUID(), method: endpoint, payload: { args } }
    return link.request('rpc', { peer, endpoint, payload })
  }
  async function stop() {
    await link.request('shutdown')
    started.port.disconnect()
    return started.exited
  }
  return { ...started, link, metrics, rpc, stop, fake }
}

async function transcript(home) {
  const files = []
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) await walk(path)
      else if (entry.name.endsWith('.jsonl')) files.push(path)
    }
  }
  await walk(join(home, 'sessions'))
  return (await Promise.all(files.map(file => readFile(file, 'utf8')))).join('\n')
}

test('the confined companion streams, persists native JSONL, restarts, and stays text only', async t => {
  const context = await scratch(t)
  const first = await companion(context, context.home)
  t.after(() => first.proc.kill())
  assert.notEqual(first.metrics.pid, process.pid)
  const created = await first.rpc('session/create', {})
  const sessionId = created.body.match(/"sessionId":"([^"]+)"/)?.[1]
  assert.ok(sessionId, created.body)

  await assert.rejects(first.rpc('session/create', { cwd: context.root }))
  await assert.rejects(first.rpc('terminal/open', {}))
  const prompt = content => first.rpc('session/prompt',
    { sessionId, requestId: crypto.randomUUID(), mode: 'queue', content })
  assert.match((await prompt([{ type: 'file', receiptId: 'synthetic' }])).body, /remote-access\/denied/)
  assert.match((await first.rpc('session/prompt', { sessionId: 'session-not-owned', requestId: crypto.randomUUID(),
    mode: 'queue', content: [{ type: 'text', text: 'x' }] })).body, /remote-access\/denied/)

  assert.doesNotMatch((await prompt([{ type: 'text', text: 'Confined synthetic prompt' }])).body, /error/)
  await first.fake.turnDone
  const deadline = Date.now() + 10_000
  while (!(await transcript(context.home).catch(() => '')).includes(reply)) {
    assert.ok(Date.now() < deadline, 'the native JSONL transcript records the reply')
    await new Promise(done => setTimeout(done, 100))
  }
  assert.deepEqual(first.fake.calls, [{ model, effort: undefined }])
  assert.deepEqual(await first.stop(), [0, null])
  assert.equal(alive(first.metrics.pid), false)

  const second = await companion(context, context.home)
  t.after(() => second.proc.kill())
  assert.match((await second.rpc('session/list')).body, new RegExp(sessionId))
  const persisted = await transcript(context.home)
  assert.ok(persisted.includes('Confined synthetic prompt') && persisted.includes(reply))
  // Killing the unconfined launcher closes the job, which terminates the confined child.
  second.proc.kill()
  await second.exited
  const until = Date.now() + 5000
  while (alive(second.metrics.pid) && Date.now() < until) await new Promise(done => setTimeout(done, 100))
  assert.equal(alive(second.metrics.pid), false)
})

test('confinement failure never starts an unconfined companion', async t => {
  const context = await scratch(t)
  const started = context.startCompanion({ node, runtime: resolve(context.root, 'missing-runtime'), home: context.home })
  const link = context.bindChannel(started.port, () => { throw new Error('unexpected') })
  await assert.rejects(link.request('ready'))
  assert.deepEqual(await started.exited, [context.CONFINEMENT_FAILED, null])
})
