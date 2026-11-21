import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { parse } from 'yaml'

test('Direct Chat remains opt-in and its Session lifecycle uses native Workspace APIs', () => {
  const [{ insert }] = parse(readFileSync(new URL('../cordis.patch.yml', import.meta.url), 'utf8'))
  const row = insert.find(item => item.id === 'abinadwan-direct-chat')
  assert.equal(row.name, '@abinadwan/dsh-plugins-suite/direct-chat')
  assert.equal(row.disabled, true)
  const host = readFileSync(new URL('../plugins/direct-chat/index.js', import.meta.url), 'utf8')
  const client = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
  assert.match(host, /\/api\/abinadwan-direct-chat\/prepare/)
  assert.match(host, /mkdtemp\(join\(root, 'session-'\)\)/)
  assert.match(client, /ctx\.workspaces\.create\(\{ path: result\.path \}\)/)
  assert.match(client, /ctx\.uiWorkspace\.connectWorkspace\(workspaceId\)/)
  assert.match(client, /ctx\.workspaces\.delete\(workspaceId\)/)
  assert.doesNotMatch(host, /sessionController\.create|sessionPersistence\.flush|child_process|startCompanion/)
})
