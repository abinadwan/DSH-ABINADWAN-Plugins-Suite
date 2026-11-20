// Windows-only. Mounts the Direct Chat Desktop fixture's Host plugin with a synthetic context, replaces its
// companion with a hostile one that still runs confined, and checks that the parent broker refuses provider
// streams without an owner lease and beyond its concurrency cap. Needs ABINADWAN_TEST_RUNTIME (with koffi)
// and ABINADWAN_TEST_NODE. All files stay in a scratch folder under node_modules/.direct-chat-confined.
import assert from 'node:assert/strict'
import { cp, mkdir, mkdtemp, readFile, realpath, rm } from 'node:fs/promises'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

const runtime = process.env.ABINADWAN_TEST_RUNTIME
const node = process.env.ABINADWAN_TEST_NODE
if (process.platform !== 'win32' || !runtime || !node) throw new Error('Set ABINADWAN_TEST_RUNTIME and ABINADWAN_TEST_NODE on Windows')
const repository = fileURLToPath(new URL('../', import.meta.url))

test('the parent broker admits provider streams only under a live lease and at most two at once', async t => {
  const parent = join(repository, 'node_modules', '.direct-chat-confined')
  await mkdir(parent, { recursive: true })
  const root = await realpath(await mkdtemp(join(parent, 'broker-')))
  const app = join(root, 'app')
  await cp(join(repository, 'qa', 'direct-chat-desktop'), app, { recursive: true })
  await cp(join(repository, 'qa', 'direct-chat-broker', 'rogue-worker.js'), join(app, 'worker.js'))
  const profile = join(root, '.package-check-dsh', '.fixture-harness-home')
  await mkdir(profile, { recursive: true })
  const saved = { ...process.env }
  Object.assign(process.env, { DSH_HOME: profile, ABINADWAN_D2_FIXTURE: '1', ABINADWAN_D2_RUNTIME: runtime,
    ABINADWAN_D2_NODE: node, ABINADWAN_D2_FIXTURE_HOME: '.direct-chat-d2-broker' })

  const prepared = []
  const routes = new Map()
  const disposers = []
  // One ordered cleanup: stop the companion, restore the environment, then remove the scratch folder.
  t.after(async () => {
    for (const dispose of disposers.reverse()) await dispose()
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key]
    Object.assign(process.env, saved)
    await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
  })
  const hanging = () => ({ [Symbol.asyncIterator]() { return this }, next: () => new Promise(() => {}), async return() { return { done: true } } })
  const ctx = {
    effect(setup) { const dispose = setup(); if (dispose) disposers.push(dispose) },
    connection: { fetch: { register({ path, fetch }) { routes.set(path, fetch); return () => routes.delete(path) } } },
    agentDefaultModel: { currentSelection: () => ({ provider: 'fixture-provider', model: 'fixture-model' }) },
    llm: {
      async listModels() { return [{ id: 'fixture-model' }] },
      async resolveModelInfo(provider, id) { return { id, name: id, context: undefined, reasoning: undefined } },
      async prepareCall(config) {
        prepared.push(config.model)
        await new Promise(done => setImmediate(done))
        return { config, stream: hanging }
      },
    },
  }
  const fixture = await import(pathToFileURL(join(app, 'index.js')).href)
  await fixture.apply(ctx)
  const call = async (name, data) => {
    const response = await routes.get(`/api/abinadwan-direct-chat-fixture/${name}`)(new Request('http://localhost/', {
      method: 'POST', body: JSON.stringify(data) }))
    return { status: response.status, body: await response.text() }
  }

  const opened = await call('open', {})
  assert.equal(opened.status, 200, opened.body)
  const { peer } = JSON.parse(opened.body)
  const outcome = await call('rpc', { peer, endpoint: 'rogue', payload: {} })
  assert.equal(outcome.status, 200, outcome.body)
  const { beforeLease, concurrent } = JSON.parse(outcome.body)
  assert.equal(beforeLease, 'refused', 'no provider stream before an owner window holds a lease')
  assert.equal(concurrent.filter(value => value === 'admitted').length, 2)
  assert.equal(concurrent.filter(value => value === 'refused').length, 2)
  // The refused pre-lease request never reached the provider; admission is rechecked after preparation.
  assert.ok(prepared.length >= 2 && prepared.length <= 4, `prepared ${prepared.length}`)
  const metrics = await readFile(join(root, '.package-check-dsh', '.direct-chat-d2-broker', 'metrics.jsonl'), 'utf8')
  assert.match(metrics, /"kind":"startup"/)
  assert.equal((await call('close', { peer })).status, 204)
})
