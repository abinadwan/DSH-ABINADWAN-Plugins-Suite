import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { parse } from 'yaml'

test('Direct Chat remains opt-in and uses native Session persistence instead of a companion', () => {
  const [{ insert }] = parse(readFileSync(new URL('../cordis.patch.yml', import.meta.url), 'utf8'))
  const row = insert.find(item => item.id === 'abinadwan-direct-chat')
  assert.equal(row.name, '@abinadwan/dsh-plugins-suite/direct-chat')
  assert.equal(row.disabled, true)
  const source = readFileSync(new URL('../plugins/direct-chat/index.js', import.meta.url), 'utf8')
  assert.match(source, /sessionController\.create\(\{ cwd \}\)/)
  assert.match(source, /sessionPersistence\.flush\(\)/)
  assert.doesNotMatch(source, /child_process|startCompanion/)
})
