import assert from 'node:assert/strict'
import { mkdtemp, realpath, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { Context } from '@deepseek-ai/cordis'
import { HostConnectionService } from '@deepseek-ai/dsh-client-connection'
import Llm, { LlmAdapter, createUserMessage } from '@deepseek-ai/dsh-llm'
import Sessions, { SessionId } from '@deepseek-ai/dsh-session'
import Projections from '@deepseek-ai/dsh-session-projection'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import Tools, { defineTool } from '@deepseek-ai/dsh-tools'
import * as NativeToolExecutor from '@deepseek-ai/dsh-tool-executor-native'
import Agents, { installModelSelection } from '@deepseek-ai/dsh-agent'
import Loop from '@deepseek-ai/dsh-agent-loop'
import * as directChat from '../plugins/direct-chat/index.js'
import { directoryName, workspaceName } from '../plugins/direct-chat/workspace-path.js'

test('native Host connection gates Direct Chat preparation, discovery and metadata to the owner', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-direct-native-'))
  const ctx = new Context()
  t.after(async () => {
    await ctx.fiber.dispose()
    await rm(dir, { recursive: true, force: true })
  })
  const path = join(await realpath(dir), 'abinadwan-direct-chat-data', 'Direct Chat')
  const workspace = { id: 'permanent', path, sessionIds: ['fictional-one'] }
  const reads = []
  ctx.provide('profileContext', { dir })
  ctx.provide('tools', { guard: () => () => {} })
  ctx.provide('workspaceRegistry', { list: () => [workspace, {
    id: 'project', path: join(dir, 'Project'), sessionIds: ['unrelated'],
  }] })
  ctx.provide('sessionPersistence', { async stat(id) {
    reads.push(id)
    return { header: { id, createdAt: 1000 } }
  } })
  await ctx.plugin({ name: 'fixture-connection', apply(child) { new HostConnectionService(child, [], {}) } }).await()
  const fiber = ctx.plugin(directChat)
  await fiber.await()
  const transport = ctx.connection.createSharedFetchHandler('/api')
  const base = 'http://localhost/api/abinadwan-direct-chat/catalog'
  assert.equal(transport.requestBodyMode({ method: 'GET', url: new URL(base) }), 'buffered')
  const fetch = (query = '', peer = ctx.connection.browserPeer) => transport.fetch(new Request(base + query), peer)
  const prepare = (peer = ctx.connection.browserPeer) => transport.fetch(new Request(
    'http://localhost/api/abinadwan-direct-chat/prepare', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
    }), peer)
  const viewer = { principal: { kind: 'viewer' } }
  assert.equal((await fetch('?order=creation', viewer)).status, 403)
  assert.equal((await prepare(viewer)).status, 403)
  assert.deepEqual(await (await fetch()).json(), { workspaceId: null })
  const prepared = await prepare()
  assert.equal(prepared.headers.get('cache-control'), 'no-store')
  assert.deepEqual(await prepared.json(), { path: await realpath(path) })
  workspace.path = await realpath(path)
  assert.deepEqual(await (await fetch()).json(), { workspaceId: 'permanent' })
  assert.deepEqual(reads, [])
  const result = await fetch('?order=creation')
  assert.equal(result.headers.get('cache-control'), 'no-store')
  assert.deepEqual(await result.json(), { workspaceId: 'permanent', createdAt: { 'fictional-one': 1000 } })
  assert.deepEqual(reads, ['fictional-one'])
  workspace.sessionIds = Array.from({ length: 101 }, (_, i) => 'synthetic-' + i)
  assert.deepEqual(await (await fetch('?order=creation')).json(), { workspaceId: 'permanent', createdAt: null })
  assert.deepEqual(reads, ['fictional-one'])
  await fiber.dispose()
  assert.equal((await fetch()).status, 404)
  assert.equal((await prepare()).status, 404)
})

test('Direct Chat denies a model tool call before an independent, retried empty completion', async t => {
  const parent = await realpath(fileURLToPath(new URL('../node_modules', import.meta.url)))
  const dir = await mkdtemp(join(parent, '.dsh-direct-retry-'))
  const ctx = new Context()
  t.after(async () => {
    await ctx.fiber.dispose()
    const target = await realpath(dir)
    assert.equal(dirname(target), parent)
    assert.equal(target, dir)
    await rm(target, {recursive: true, force: true})
  })
  for (const plugin of [Llm, Sessions, Projections, SystemPrompt, Tools, NativeToolExecutor, Agents]) {
    await ctx.plugin(plugin).await()
  }
  await ctx.plugin(Loop, {agents: []}).await()
  ctx.provide('profileContext', {dir})
  await ctx.plugin({name: 'fixture-connection', apply(child) { new HostConnectionService(child, [], {}) }}).await()
  await ctx.plugin(directChat).await()
  let executions = 0
  ctx.tools.register(defineTool({
    name: 'fixture_web_search', description: 'Synthetic tool with no network access', parameters: {},
    output: {schema: {type: 'string'}, render: (_, value) => [{type: 'text', text: value}]},
    async execute() { executions++; return 'synthetic result' },
  }))
  const requests = []
  class EmptyAfterTool extends LlmAdapter {
    async resolveModel(provider, id) { return {provider, id, name: id} }
    async *stream(request) {
      requests.push(request)
      yield {type: 'usage', usage: {inputTokens: 32, outputTokens: requests.length === 1 ? 4 : 0}}
      if (requests.length === 1) {
        const block = {type: 'tool-call', id: 'fixture-call', name: 'fixture_web_search', arguments: '{}'}
        yield {type: 'block-start', index: 0, blockType: 'tool-call'}
        yield {type: 'block-end', index: 0, block}
        yield {type: 'finish', reason: {kind: 'tool-calls'}}
      } else {
        yield {type: 'finish', reason: {kind: 'error', failure: {code: 'EMPTY_RESPONSE', message: 'Synthetic empty completion'}}}
      }
    }
  }
  ctx.llm.registerAdapter(['fixture'], new EmptyAfterTool())
  const agent = await ctx.agentLoop.create(SessionId('synthetic-direct-empty'), {provider: 'fixture', model: 'test'},
    {cwd: join(dir, directoryName, workspaceName)})
  installModelSelection(agent.ctx)
  const failures = []
  agent.ctx.on('agent/request-error', async event => {
    assert.equal(event.failure.code, 'EMPTY_RESPONSE')
    assert.equal(event.retryPolicy.maxRetries, 5)
    assert.ok(event.retryPolicy.retryableCodes.includes('EMPTY_RESPONSE'))
    failures.push(event.step)
    // Fixed two-retry fixture. No production provider, delay, or network is involved.
    return failures.length <= 2 ? {kind: 'retry'} : undefined
  })
  agent.followup(createUserMessage({source: {kind: 'user'}, content: [{type: 'text', text: 'Synthetic search request'}]}))
  await agent.whenIdle()
  assert.equal(executions, 0)
  assert.equal(requests.length, 4, 'one tool-call attempt, one empty attempt, and two empty retries')
  assert.ok(requests.every(request => (request.tools ?? []).length === 0),
    'inherited tool definitions must be absent from every Direct Chat request')
  assert.equal(new Set(failures).size, 1, 'empty responses were retries of the same step')
  assert.equal(failures.length, 3)
  const denied = requests[1].messages.find(message => message.role === 'tool')
  assert.ok(denied, 'a tool result is available to the next request')
  // A fabricated tool call must not execute even when a model ignores the empty tool list.
  assert.deepEqual(requests[1].messages, requests[2].messages)
  assert.deepEqual(requests[2].messages, requests[3].messages)
})
