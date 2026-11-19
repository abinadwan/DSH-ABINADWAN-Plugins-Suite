const closed = () => new Error('Direct Chat channel closed')

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
