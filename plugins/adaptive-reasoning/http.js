// Strict request bodies for the owner-only Adaptive Reasoning routes.

export const text = value => typeof value === 'string' && value.length > 0 && value.length <= 256
export const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Read one small JSON object whose keys are exactly `keys`, plus each present `optional` key with its fixed value. */
export async function readObject(request, keys, optional = {}, limits = {}) {
  if (request.headers.get('content-type')?.split(';', 1)[0] !== 'application/json' || !request.body) return null
  const reader = request.body.getReader()
  const decoder = new TextDecoder('utf-8', { fatal: true })
  let total = 0
  let input = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > (limits.bytes ?? 4096)) { await reader.cancel(); return null }
      input += decoder.decode(value, { stream: true })
    }
    const data = JSON.parse(input + decoder.decode())
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null
    const expected = [...keys, ...Object.keys(optional).filter(key => Object.hasOwn(data, key))]
    if (Object.keys(data).length !== expected.length) return null
    for (const key of expected) {
      if (!Object.hasOwn(data, key) || !(Object.hasOwn(limits.fields ?? {}, key) ? typeof data[key] === 'string' && data[key].length > 0 && data[key].length <= limits.fields[key] : text(data[key]))) return null
      if (Object.hasOwn(optional, key) && data[key] !== optional[key]) return null
    }
    return data
  } catch { return null }
  finally { reader.releaseLock() }
}


export const sameRoute = (current, selection) => current?.provider === selection.provider && current?.model === selection.model
export const isSubagent = agent => agent.session.header.origin === 'subagent'
