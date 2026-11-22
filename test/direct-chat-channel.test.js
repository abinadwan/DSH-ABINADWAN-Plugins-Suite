import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { parse } from 'yaml'
import { workspaceName } from '../plugins/direct-chat/catalog.js'

test('Direct Chat remains opt-in with one permanent Workspace and separate native Session histories', () => {
  const [{ insert }] = parse(readFileSync(new URL('../cordis.patch.yml', import.meta.url), 'utf8'))
  const row = insert.find(item => item.id === 'abinadwan-direct-chat')
  assert.equal(row.name, '@abinadwan/dsh-plugins-suite/direct-chat')
  assert.equal(row.disabled, true)
  const host = readFileSync(new URL('../plugins/direct-chat/index.js', import.meta.url), 'utf8')
  const client = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
  assert.equal(workspaceName, 'Direct Chat')
  assert.match(host, /prepareWorkspace\(profileDir, roots\)/)
  assert.doesNotMatch(host, /mkdtemp|sessionController\.create|sessionPersistence\.flush|child_process|startCompanion/)
  assert.match(client, /ctx\.workspaces\.create\(\{ path: result\.path \}\)/)
  assert.match(client, /ctx\.uiWorkspace\.connectWorkspace\(workspace\.workspaceId\)/)
  assert.match(client, /ctx\.uiWorkspace\.openSession\(sessionId\)/)
  const directClient = client.slice(client.indexOf('const directChatPlugin'), client.indexOf('const reasoningComposerPlugin'))
  assert.doesNotMatch(directClient, /ctx\.workspaces\.delete|ctx\.sessions\.fork/)
})
