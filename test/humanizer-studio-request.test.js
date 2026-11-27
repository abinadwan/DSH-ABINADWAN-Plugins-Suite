import test from 'node:test'
import assert from 'node:assert/strict'
import { streamStudioRequest } from '../plugins/humanizer/studio-request.js'

test('Studio rejects pre-cancelled and missing signals before calling native service', async () => {
  let calls = 0
  const llm = { async *stream() { calls++ } }
  const controller = new AbortController()
  controller.abort('private reason')
  await assert.rejects(streamStudioRequest(llm, { signal: controller.signal }).next(), { name: 'AbortError', message: 'Studio request cancelled' })
  await assert.rejects(streamStudioRequest(llm, {}).next(), TypeError)
  assert.equal(calls, 0)
})

test('Studio closes the iterator on cancellation before requesting another chunk', async () => {
  const controller = new AbortController()
  let pulls = 0, closed = 0
  const llm = { async *stream() {
    try { pulls++; yield 'first'; pulls++; yield 'second' }
    finally { closed++ }
  } }
  const stream = streamStudioRequest(llm, { signal: controller.signal })
  assert.deepEqual(await stream.next(), { done: false, value: 'first' })
  controller.abort()
  await assert.rejects(stream.next(), { name: 'AbortError' })
  assert.equal(pulls, 1)
  assert.equal(closed, 1)
})

test('Studio discards a chunk returned after cancellation during an in-flight pull', async () => {
  const controller = new AbortController()
  let release, closed = false
  const llm = { async *stream() {
    try { await new Promise(resolve => { release = resolve }); yield 'late' }
    finally { closed = true }
  } }
  const stream = streamStudioRequest(llm, { signal: controller.signal })
  const pending = stream.next()
  controller.abort()
  release()
  await assert.rejects(pending, { name: 'AbortError' })
  assert.equal(closed, true)
})
