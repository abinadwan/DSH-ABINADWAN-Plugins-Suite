import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { once } from 'node:events'
import { test } from 'node:test'
import { bindChannel, streamTable } from '../plugins/direct-chat/companion/channel.js'

test('IPC replies stay correlated and disconnect aborts pending work', async () => {
  const left = new EventEmitter()
  const right = new EventEmitter()
  const started = new EventEmitter()
  for (const [port, peer] of [[left, right], [right, left]]) {
    port.connected = true
    port.send = (frame, callback) => queueMicrotask(() => {
      if (peer.connected) peer.emit('message', structuredClone(frame))
      callback(peer.connected ? null : new Error('Disconnected'))
    })
  }
  const client = bindChannel(left, () => { throw new Error('Unexpected callback') })
  const server = bindChannel(right, async (operation, data, signal) => {
    if (operation === 'fail') throw new Error('Internal detail')
    if (operation === 'hold') {
      const aborted = once(signal, 'abort')
      started.emit('dispatch')
      await aborted
      signal.throwIfAborted()
    }
    return data
  })
  assert.deepEqual(await Promise.all([client.request('echo', 1), client.request('echo', 2)]), [1, 2])
  await assert.rejects(client.request('fail'), { message: 'Direct Chat request unavailable' })
  const startedRequest = once(started, 'dispatch')
  const pending = assert.rejects(client.request('hold'), { message: 'Direct Chat request unavailable' })
  await startedRequest
  for (const port of [left, right]) {
    port.connected = false
    port.emit('disconnect')
  }
  await pending
  assert.equal(server.lifetime.aborted, true)
  await assert.rejects(client.request('echo', 3), { message: 'Direct Chat channel closed' })
})

test('revoking a stream aborts an in-flight pull and releases the iterator once', async () => {
  const streams = streamTable()
  const controller = new AbortController()
  let cleaned = 0
  async function* source() {
    try {
      yield 'first chunk'
      await once(controller.signal, 'abort')
    } finally { cleaned++ }
  }
  streams.open('stream', source(), controller)
  assert.deepEqual(await streams.next('stream'), { done: false, value: 'first chunk' })
  const waiting = streams.next('stream')
  await assert.rejects(streams.next('stream'), { message: 'Invalid stream pull' })
  await streams.dispose()
  assert.equal((await waiting).done, true)
  assert.equal(cleaned, 1)
  await assert.rejects(streams.next('stream'), { message: 'Invalid stream pull' })
})
