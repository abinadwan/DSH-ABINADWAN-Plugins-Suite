// Unregistered Studio feasibility helper. Native provider/interceptor policy still applies.
// Cancellation at this boundary cannot retract text already dispatched or force an
// uncooperative adapter to settle. Do not expose this as a remote endpoint yet.
function checkAbort(signal) {
  if (signal?.aborted) throw new DOMException('Studio request cancelled', 'AbortError')
}

export async function* streamStudioRequest(llm, request) {
  const signal = request?.signal
  if (!signal || typeof signal.aborted !== 'boolean') throw new TypeError('Studio request requires an AbortSignal')
  checkAbort(signal)
  const iterator = llm.stream(request)[Symbol.asyncIterator]()
  let done = false
  try {
    while (true) {
      checkAbort(signal)
      const next = await iterator.next()
      checkAbort(signal)
      if (next.done) { done = true; return }
      yield next.value
    }
  } finally {
    if (!done && typeof iterator.return === 'function') await iterator.return()
  }
}
