// Loopback DeepSeek Messages endpoint for the Adaptive Reasoning Desktop fixture.
// It records only the reasoning wire fields and a synthetic "AR <Word>" marker,
// never prompt text, and answers with a short synthetic stream.
//
// Run: node qa/adaptive-reasoning-desktop/loopback.mjs <wire-log.jsonl> [port]
import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { appendFileSync } from 'node:fs'
import { setTimeout } from 'node:timers/promises'

const output = process.argv[2]
const port = Number(process.argv[3] ?? 51809)
if (!output) throw new Error('A synthetic fixture wire log path is required')
const server = createServer(async (request, response) => {
  if (request.method !== 'POST' || !request.url?.endsWith('/messages')) {
    response.writeHead(404).end()
    return
  }
  if (request.headers['x-api-key'] !== 'fixture-local-credential'
    && request.headers.authorization !== 'Bearer fixture-local-credential') {
    response.writeHead(401).end()
    return
  }
  let input = ''
  for await (const chunk of request) {
    input += chunk
    if (input.length > 3_000_000) {
      response.writeHead(413).end()
      return
    }
  }
  let body
  try { body = JSON.parse(input) } catch { response.writeHead(400).end(); return }
  const submitted = (body.messages ?? []).filter(message => message.role === 'user').at(-1)
  const marker = JSON.stringify(submitted ?? {}).match(/AR [A-Z][a-z]+/)?.[0]
  appendFileSync(output, JSON.stringify({ at: new Date().toISOString(), model: body.model,
    thinking: body.thinking?.type, effort: body.output_config?.effort, marker }) + '\n')
  const text = `Synthetic reply${marker ? ` to ${marker}` : ''}.`
  const events = [
    { type: 'message_start', message: { id: randomUUID(), model: body.model, usage: { input_tokens: 40, output_tokens: 0 } } },
    { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
    { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } },
    { type: 'content_block_stop', index: 0 },
    { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 6 } },
    { type: 'message_stop' },
  ]
  response.writeHead(200, { 'content-type': 'text/event-stream' })
  for (const [index, event] of events.entries()) {
    // "AR Slow" holds the reply open so a running turn and a queued prompt can be observed.
    if (marker === 'AR Slow' && index === 2) await setTimeout(12_000)
    response.write('event: ' + event.type + '\ndata: ' + JSON.stringify(event) + '\n\n')
  }
  response.end()
})
server.listen(port, '127.0.0.1', () => console.log('AR fixture listening on 127.0.0.1:' + server.address().port))
