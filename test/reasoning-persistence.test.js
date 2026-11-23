import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { ReasoningStats } from '../plugins/adaptive-reasoning/stats.js'
import { openReasoningStats } from '../plugins/adaptive-reasoning/storage.js'

async function profile(t) {
  const dir = await mkdtemp(join(tmpdir(), 'suite-stats-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  return dir
}

test('aggregate writes from concurrent Hosts survive reopening and keep route distinctions', async t => {
  const dir = await profile(t)
  const a = await openReasoningStats(dir)
  const b = await openReasoningStats(dir)
  const first = new ReasoningStats()
  const second = new ReasoningStats()
  first.request('session', 'high', { inputTokens: 2 }, undefined, { provider: 'p1', model: 'm' })
  second.request('session', 'high', { outputTokens: 3 }, undefined, { provider: 'p2', model: 'm' })
  await Promise.all([a.save(first.takeCounters()), b.save(second.takeCounters())])
  const reopened = await openReasoningStats(dir)
  const result = await reopened.save(first.takeCounters())
  assert.equal(result.persistent, true)
  assert.equal(result.requests.session.high.requests, 2)
  assert.deepEqual(result.routes.map(row => row.provider).sort(), ['p1', 'p2'])
  assert.equal(result.requests.session.high.totalReported, 0)
  const foreign = await openReasoningStats(await profile(t))
  assert.deepEqual((await foreign.save(second.takeCounters())).routes, [])
})

test('reset fences a concurrent old aggregate and corrupt or newer state stays intact', async t => {
  const dir = await profile(t)
  const a = await openReasoningStats(dir)
  const b = await openReasoningStats(dir)
  const stats = new ReasoningStats()
  stats.request('session', 'high', {})
  await a.reset()
  assert.deepEqual((await b.save(stats.takeCounters())).requests.session, {})
  stats.request('session', 'high', {})
  assert.equal((await b.save(stats.takeCounters())).requests.session.high.requests, 1)
  const path = join(dir, 'abinadwan-reasoning-stats.json')
  for (const content of ['{corrupt', '{"version":999}']) {
    await writeFile(path, content)
    await assert.rejects(openReasoningStats(dir))
    assert.equal(await readFile(path, 'utf8'), content)
  }
})

test('a transient invalid read does not poison later transactions', async t => {
  const dir = await profile(t)
  const store = await openReasoningStats(dir)
  const stats = new ReasoningStats()
  stats.request('session', 'high', {})
  const delta = stats.takeCounters()
  const path = join(dir, 'abinadwan-reasoning-stats.json')
  await writeFile(path, '{bad')
  await assert.rejects(store.save(delta), error => error.mayHaveWritten === false)
  await rm(path)
  assert.equal((await store.save(delta)).requests.session.high.requests, 1)
})


test('large or invalid persisted aggregates fail closed without truncating the original file', async t => {
  const dir = await profile(t)
  const path = join(dir, 'abinadwan-reasoning-stats.json')
  const oversized = 'x'.repeat(1024 * 1024 + 1)
  await writeFile(path, oversized)
  await assert.rejects(openReasoningStats(dir), /invalid-stats/)
  assert.equal((await readFile(path, 'utf8')).length, oversized.length)
  await writeFile(path, '{"version":2,"epoch":"newer","counters":{}}')
  await assert.rejects(openReasoningStats(dir), /unsupported-stats/)
  assert.match(await readFile(path, 'utf8'), /"version":2/)
})
