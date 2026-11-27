// Candidate owner-only routes. The native DSH Connection owns authentication.
// No storage, logging, Session or Agent APIs are used by this module.
import { runStudioEdit } from './studio-engine.js'

export const STUDIO_PATH = '/api/abinadwan-humanizer-studio'
export const STUDIO_BODY_LIMIT = 96 * 1024
const DEADLINE_MS = 120_000
const json = (body, status = 200) => Response.json(body, {
  status, headers: { 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' },
})
const error = (code, status) => json({ error: code }, status)

export async function readStudioBody(request, signal, byteLimit = STUDIO_BODY_LIMIT) {
  if (request.headers.get('content-type')?.split(';',1)[0].trim().toLowerCase() !== 'application/json' || !request.body)
    return { error: 'STUDIO_INVALID_REQUEST', status: 400 }
  if (signal.aborted) return { error:'STUDIO_CANCELLED', status:409 }
  const reader = request.body.getReader()
  const decoder = new TextDecoder('utf-8', { fatal:true })
  let size = 0, text = '', ended = false
  const cancel = () => { void reader.cancel().catch(() => {}) }
  signal.addEventListener('abort', cancel, { once:true })
  try {
    while (true) {
      if (signal.aborted) return { error:'STUDIO_CANCELLED', status:409 }
      const {done,value} = await reader.read()
      if (signal.aborted) return { error:'STUDIO_CANCELLED', status:409 }
      if (done) { ended = true; break }
      size += value.byteLength
      if (size > byteLimit) return { error:'STUDIO_BODY_LIMIT', status:413 }
      text += decoder.decode(value,{stream:true})
    }
    const data = JSON.parse(text + decoder.decode())
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { error:'STUDIO_INVALID_REQUEST', status:400 }
    return { data }
  } catch {
    return { error:signal.aborted?'STUDIO_CANCELLED':'STUDIO_INVALID_REQUEST',status:signal.aborted?409:400 }
  } finally {
    signal.removeEventListener('abort',cancel)
    if (!ended) cancel()
    reader.releaseLock()
  }
}
const validation = new Set(['STUDIO_INVALID_REQUEST','STUDIO_INVALID_SOURCE','STUDIO_INVALID_BRIEF',
  'STUDIO_INVALID_LANGUAGE','STUDIO_TRANSLATION_TARGET_REQUIRED','STUDIO_INVALID_SIGNAL','STUDIO_INVALID_EFFORT'])
export function createStudioHandlers(llm, lifetime, deadlineMs = DEADLINE_MS) {
  let busy = false
  return {
    status() {
      return lifetime.aborted ? error('STUDIO_UNAVAILABLE',503) : json({ available:true, protocol:1 })
    },
    async edit(request) {
      if (lifetime.aborted) return error('STUDIO_UNAVAILABLE',503)
      if (busy) return error('STUDIO_BUSY',409)
      busy = true
      const deadline = AbortSignal.timeout(deadlineMs)
      const signal = AbortSignal.any([request.signal,lifetime,deadline])
      try {
        const read = await readStudioBody(request,signal)
        if (read.error) return error(read.error,read.status)
        if (signal.aborted) return error('STUDIO_CANCELLED',409)
        const input = read.data
        // Locale membership is a Client UX contract, not Host authorization.
        // Host validates the exact selected IDs using the engine's syntax rules;
        // never accept browser-supplied labels, prompts or entire catalog objects.
        const locales = [input.inputLanguage,input.outputLanguage].filter(id=>typeof id==='string').map(id=>({id}))
        const text = await runStudioEdit(llm,input,locales,signal)
        if (signal.aborted) return error('STUDIO_CANCELLED',409)
        return json({text})
      } catch (failure) {
        if (signal.aborted) return error('STUDIO_CANCELLED',409)
        const code = failure?.message
        if (validation.has(code)) return error(code,400)
        if (code === 'STUDIO_MODEL_UNAVAILABLE' || code === 'STUDIO_UNSUPPORTED_EFFORT') return error(code,422)
        if (code === 'STUDIO_CATALOG_FAILED') return error(code,503)
        return error('STUDIO_PROCESSING_FAILED',502)
      } finally {
        // Do not open a new slot until the previous provider attempt settles.
        busy = false
      }
    },
  }
}

// Register only inside a fiber with explicit connection/llm injection.
// The fixture mounts this exact module; production wiring follows acceptance.
export function registerStudioRoutes(ctx) {
  const lifetime = new AbortController()
  const handlers = createStudioHandlers(ctx.llm,lifetime.signal)
  ctx.effect(() => () => lifetime.abort())
  ctx.effect(() => ctx.connection.fetch.register({
    path: STUDIO_PATH + '/status', methods:['GET'], requestBody:'buffered',
    fetch: () => handlers.status(),
  }))
  ctx.effect(() => ctx.connection.fetch.register({
    path: STUDIO_PATH + '/edit', methods:['POST'], requestBody:'streaming',
    fetch: request => handlers.edit(request),
  }))
}
