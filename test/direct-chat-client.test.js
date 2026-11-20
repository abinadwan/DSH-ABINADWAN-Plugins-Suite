import assert from 'node:assert/strict'
import test from 'node:test'
import '../test-support/dom-global.js'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { base, clientHarness } from '../test-support/client.js'

const status = {
  available: true, phase: 'idle', error: '', windows: 0,
  storage: { path: 'C:\\Users\\Example\\.dsh\\abinadwan-direct-chat\\storage', isDefault: true, defaultPath: 'x',
    previous: null, chats: 2, bytes: 4096, error: '' },
  runtime: { path: 'r', bytes: 150 * 1024 * 1024, files: 3200 }, startup: null,
  retention: { days: null, choices: [7, 30, 90, 180, 365], candidates: 0, last: null },
  capabilities: [{ id: 'chat', status: 'available', detail: 'Text chats.' }, { id: 'web-search', status: 'gated', detail: 'Needs a permission design.' }],
}
const chats = [
  { id: 'session-00000000-0000-4000-8000-000000000001', bytes: 2048, lastActivity: Date.UTC(2026, 10, 1), preview: 'First synthetic chat' },
  { id: 'session-00000000-0000-4000-8000-000000000002', bytes: 2048, lastActivity: Date.UTC(2026, 10, 2), preview: 'Second synthetic chat' },
]

async function settingsPage(t) {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const calls = []
  const fetch = async (url, init) => {
    const path = String(url).replace('/api/abinadwan-direct-chat/', '')
    const body = JSON.parse(init.body)
    calls.push({ path, body, method: init.method, redirect: init.redirect })
    const reply = { status, chats: { chats }, 'delete-all': { bytes: 4096, files: 2 }, delete: { deleted: body.ids } }[path]
    return new Response(JSON.stringify(reply ?? {}), { status: reply ? 200 : 409 })
  }
  const fixture = await clientHarness({ React, document, fetch })
  fixture.setRows([...fixture.rows(), { moduleName: `${base}/direct-chat`, enabled: true, fiberPhase: 'active' }])
  await fixture.changed()
  const entry = fixture.entries('settings.section').find(item => item.options.id === 'abinadwan-direct-chat')
  assert.ok(entry)
  const div = document.createElement('main')
  document.body.append(div)
  const root = createRoot(div)
  t.after(async () => {
    await act(async () => root.unmount())
    div.remove()
    await fixture.dispose()
    delete globalThis.IS_REACT_ACT_ENVIRONMENT
  })
  await act(async () => root.render(React.createElement(entry.component, {})))
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })
  return { div, calls, fixture }
}

const button = (div, label) => [...div.querySelectorAll('button')].find(item => item.textContent === label)

test('the Direct Chat Settings page shows the real storage folder, usage and capability status', async t => {
  const { div, calls } = await settingsPage(t)
  assert.match(div.textContent, /Direct Chat/)
  assert.match(div.textContent, /abinadwan-direct-chat\\storage/)
  assert.match(div.textContent, /Default folder/)
  assert.match(div.textContent, /4\.0 KB/)
  assert.match(div.textContent, /150 MB/)
  assert.match(div.textContent, /First synthetic chat/)
  assert.match(div.textContent, /Unavailable · Needs a permission design\./)
  assert.ok(calls.every(call => call.method === 'POST' && call.redirect === 'error'))
  assert.equal(div.querySelector('section').getAttribute('lang'), 'en')
})

test('Delete All needs the exact typed confirmation and a single chat needs a second click', async t => {
  const { div, calls } = await settingsPage(t)
  const deleteAll = button(div, 'Delete All Direct Chats')
  assert.equal(deleteAll.disabled, true)
  const input = [...div.querySelectorAll('input')].find(item => item.closest('label')?.textContent.includes('To delete every Direct Chat'))
  const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  await act(async () => { setValue.call(input, 'delete all direct chats'); input.dispatchEvent(new window.Event('input', { bubbles: true })) })
  assert.equal(button(div, 'Delete All Direct Chats').disabled, true)
  await act(async () => { setValue.call(input, 'DELETE ALL DIRECT CHATS'); input.dispatchEvent(new window.Event('input', { bubbles: true })) })
  assert.equal(button(div, 'Delete All Direct Chats').disabled, false)
  await act(async () => { button(div, 'Delete All Direct Chats').click() })
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })
  assert.deepEqual(calls.find(call => call.path === 'delete-all')?.body, { confirmation: 'DELETE ALL DIRECT CHATS' })

  assert.equal(calls.some(call => call.path === 'delete'), false)
  const first = [...div.querySelectorAll('button')].find(item => item.getAttribute('aria-label') === 'Delete First synthetic chat')
  await act(async () => { first.click() })
  assert.equal(calls.some(call => call.path === 'delete'), false)
  await act(async () => { button(div, 'Delete permanently').click() })
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)) })
  assert.deepEqual(calls.find(call => call.path === 'delete')?.body, { ids: [chats[0].id] })
})

test('safe Markdown renders structure without HTML, images or navigable links', async () => {
  const fixture = await clientHarness({ React, document })
  try {
    const { markdownBlocks, SafeMarkdown } = fixture.plugin.directChat
    const source = [
      '# Title', '', 'Some **bold**, *italic*, `code` and snake_case_name.', '',
      '- one', '- two', '  - nested', '', '1. first', '2. second', '',
      '> quoted', '', '```js', 'const x = "<b>not html</b>"', '```', '',
      '| a | b |', '| --- | --- |', '| 1 | 2 |', '',
      '<script>alert(1)</script> [site](https://example.com) ![pic](https://example.com/p.png)',
    ].join('\n')
    assert.deepEqual(Array.from(markdownBlocks(source), block => block.type),
      ['heading', 'paragraph', 'list', 'list', 'quote', 'code', 'table', 'paragraph'])
    const html = renderToStaticMarkup(React.createElement(SafeMarkdown, { text: source }))
    assert.match(html, /<strong>bold<\/strong>/)
    assert.match(html, /<em>italic<\/em>/)
    assert.match(html, /snake_case_name/)
    assert.match(html, /<ul[^>]*><li>.*one.*<\/li>/)
    assert.match(html, /<ol[^>]*start="1"/)
    assert.match(html, /<blockquote/)
    assert.match(html, /<table/)
    assert.match(html, /&lt;b&gt;not html&lt;\/b&gt;/)
    assert.match(html, /&lt;script&gt;/)
    assert.match(html, /site<span[^>]*> \(https:\/\/example.com\)<\/span>/)
    assert.match(html, /\[Image: pic\]/)
    assert.doesNotMatch(html, /<(a|img|script|iframe)\b/)
  } finally { await fixture.dispose() }
})

test('text attachments become fenced quoted text and binary or oversized files are refused', async () => {
  const fixture = await clientHarness({ React, document })
  try {
    const { textFile } = fixture.plugin.directChat
    // Real File objects: `name` is a getter, so the helper must never assign to it.
    const file = (content, name) => new File([content], name)
    const quoted = await textFile(file('line one\n```inner fence```\n', 'notes.md'))
    assert.match(quoted, /^Attached file: notes\.md\n````\nline one\n```inner fence```\n\n````$/)
    assert.match(await textFile(file('x', 'original.txt'), 'renamed.txt'), /^Attached file: renamed\.txt\n/)
    await assert.rejects(textFile(file(new Uint8Array([0x66, 0x00, 0x67]), 'data.bin')), /Only text files/)
    await assert.rejects(textFile(file(new Uint8Array([0xff, 0xfe, 0xfd]), 'latin.txt')), /UTF-8/)
    await assert.rejects(textFile(file('x'.repeat(256 * 1024 + 1), 'big.txt')), /256 KB/)
  } finally { await fixture.dispose() }
})

test('waiting text files go in front of that chat\'s next prompt only, within the per-message limits', async () => {
  const fixture = await clientHarness({ React, document })
  try {
    const store = fixture.plugin.directChat.attachments()
    const prompt = (sessionId, text) => ({ type: 'client-request', rpcId: 'r', method: 'session/prompt',
      payload: { args: { request: { sessionId, requestId: 'q', mode: 'queue', content: [{ type: 'text', text }] } } } })
    store.add('session-a', { id: 'f1', name: 'a.txt', bytes: 3, text: 'Attached file: a.txt' })
    const outgoing = store.withStaged(prompt('session-a', 'question'))
    assert.deepEqual(JSON.parse(JSON.stringify(outgoing.payload.payload.args.request.content)),
      [{ type: 'text', text: 'Attached file: a.txt' }, { type: 'text', text: 'question' }])
    assert.deepEqual(Array.from(outgoing.ids), ['f1'])
    assert.equal(store.withStaged(prompt('session-b', 'other chat')).ids, undefined, 'another chat gets nothing')
    const list = { method: 'session/list', payload: { args: {} } }
    assert.equal(store.withStaged(list).payload, list)
    store.clear('session-a', outgoing.ids)
    assert.equal(store.list('session-a').length, 0)
    for (let index = 0; index < 5; index++) store.add('session-c', { id: `c${index}`, name: 'c', bytes: 1, text: 'x' })
    assert.throws(() => store.add('session-c', { id: 'c6', name: 'c', bytes: 1, text: 'x' }), /up to 5 text files/)
    assert.throws(() => store.add('session-d', { id: 'd', name: 'd', bytes: 1, text: 'x'.repeat(384 * 1024 + 1) }), /384 KB/)
  } finally { await fixture.dispose() }
})
