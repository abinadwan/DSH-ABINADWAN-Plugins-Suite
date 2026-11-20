import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { appendFileSync } from 'node:fs'
import { setTimeout } from 'node:timers/promises'

const output = process.argv[2]
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
  const marker = JSON.stringify(submitted ?? {}).match(/Direct Chat [A-Za-z]+/)?.[0]
  appendFileSync(output,
    JSON.stringify({ model: body.model, effort: body.output_config?.effort, marker,
      authenticated: true, tools: body.tools?.length ?? 0 }) + '\n')
  const events = [
    { type: 'message_start', message: { id: randomUUID(), model: body.model, usage: { input_tokens: 3, output_tokens: 0 } } },
    { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
    { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Synthetic Desktop response.' } },
    { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: marker === 'Direct Chat Streaming'
      ? '\n![fixture](C:/fixture-media-marker.png)\nStream complete.' : marker === 'Direct Chat Markdown'
        ? '\n\n## Rendered safely\n\nSome **bold**, *italic* and `inline code`.\n\n- first item\n- second item\n  - nested item\n\n'
          + '1. one\n2. two\n\n> A quoted line.\n\n```js\nconst answer = "<b>not html</b>"\n```\n\n| Column | Value |\n| --- | --- |\n| a | 1 |\n\n'
          + 'A [link](https://example.com), raw <b>html</b> and an image ![local](C:/fixture-media-marker.png).' : '' } },
    { type: 'content_block_stop', index: 0 },
    { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 1 } },
    { type: 'message_stop' },
  ]
  response.writeHead(200, { 'content-type': 'text/event-stream' })
  for (const [index, event] of events.entries()) {
    if (marker === 'Direct Chat Streaming' && index === 3) await setTimeout(15_000)
    response.write('event: ' + event.type + '\ndata: ' + JSON.stringify(event) + '\n\n')
  }
  response.end()
})
server.listen(51799, '127.0.0.1', () => console.log('Fixture listening on 127.0.0.1:' + server.address().port))

