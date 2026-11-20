import { EventEmitter } from 'node:events'

const closed = () => new Error('Direct Chat channel closed')
const maxFrameChars = 8 * 1024 * 1024

/**
 * A process-channel-shaped port over an inherited byte-stream pair, one JSON frame per line.
 * The AppContainer companion uses it because libuv 1.52.1 cannot create IPC pipes there (nodejs/node#66374).
 */
export function streamPort(input, output) {
  const port = new EventEmitter()
  port.connected = true
  let buffered = ''
  const disconnect = () => {
    if (!port.connected) return
    port.connected = false
    port.emit('disconnect')
  }
  const fail = () => { disconnect(); input.destroy() }
  input.setEncoding('utf8')
  input.on('data', chunk => {
    buffered += chunk
    let newline
    while ((newline = buffered.indexOf('\n')) !== -1) {
      const line = buffered.slice(0, newline)
      buffered = buffered.slice(newline + 1)
      let frame
      try { frame = JSON.parse(line) } catch { fail(); return }
      port.emit('message', frame)
    }
    if (buffered.length > maxFrameChars) fail()
  })
  input.once('end', disconnect)
  input.once('close', disconnect)
  input.on('error', disconnect)
  output.on('error', disconnect)
  port.send = (frame, callback) => {
    output.write(`${JSON.stringify(frame)}\n`, error => callback?.(error ?? null))
  }
  port.disconnect = () => { disconnect(); output.end(); input.destroy() }
  return port
}

/** Request/reply carrier over an inherited process channel. Each stream pull is a separate request. */
export function bindChannel(port, dispatch) {
  const pending = new Map()
  const lifetime = new AbortController()
  let seq = 0
  function end() {
    lifetime.abort(closed())
    for (const reject of pending.values()) reject({ error: true })
    pending.clear()
  }
  port.once('disconnect', end)
  port.once('exit', end)
  port.on('error', end)
  function send(frame) {
    if (!port.connected) throw closed()
    port.send(frame, error => { if (error) end() })
  }
  port.on('message', async frame => {
    if (frame?.reply !== undefined) {
      const resolve = pending.get(frame.reply)
      pending.delete(frame.reply)
      resolve?.(frame)
      return
    }
    if (!Number.isSafeInteger(frame?.id) || typeof frame.operation !== 'string') return
    let reply
    try { reply = { reply: frame.id, value: await dispatch(frame.operation, frame.data, lifetime.signal) } }
    catch (error) {
      if (process.env.ABINADWAN_D2_DIAGNOSTICS === '1') console.error('[Direct Chat fixture]', frame.operation, error)
      reply = { reply: frame.id, error: true }
    }
    try { send(reply) }
    catch { end() }
  })
  return {
    lifetime: lifetime.signal,
    async request(operation, data) {
      lifetime.signal.throwIfAborted()
      const id = ++seq
      const response = await new Promise((resolve, reject) => {
        pending.set(id, resolve)
        try { send({ id, operation, data }) }
        catch (error) { pending.delete(id); reject(error) }
      })
      if (response.error) throw new Error('Direct Chat request unavailable')
      return response.value
    },
  }
}

export function streamTable() {
  const streams = new Map()
  return {
    get size() { return streams.size },
    open(id, source, controller) {
      if (streams.has(id)) throw new Error('Duplicate stream')
      streams.set(id, { iterator: source[Symbol.asyncIterator](), controller, pulling: false })
    },
    async next(id) {
      const record = streams.get(id)
      if (!record || record.pulling) throw new Error('Invalid stream pull')
      record.pulling = true
      try {
        const item = await record.iterator.next()
        if (item.done) streams.delete(id)
        return item
      } finally { record.pulling = false }
    },
    async close(id) {
      const record = streams.get(id)
      if (!record) return
      streams.delete(id)
      record.controller.abort()
      await record.iterator.return?.()
    },
    async dispose() { await Promise.allSettled([...streams.keys()].map(id => this.close(id))) },
  }
}
