import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import { clientHarness } from '../test-support/client.js'
import { Group } from '@deepseek-ai/cordis-plugin-loader'
const get=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8')
const pkg=JSON.parse(get('package.json'))
test('bundle and Host exports',async()=>{
  assert.equal(pkg.version,'0.6.2')
  assert.equal(pkg.name,'@abinadwan/dsh-plugins-suite')
  assert.equal(pkg.dsh.client.platform,'web')
  assert.equal(pkg.dsh.bundle.patch,'./cordis.patch.yml')
  assert.equal((await import('../index.js')).default,Group)
})
test('native right sidebar registers and auto-opens', async t => {
  const app = await clientHarness()
  t.after(() => app.dispose())
  assert.equal(app.loaded.id, pkg.name)
  assert.equal(app.tabs.records.get('environment-dashboard').title(), 'Environment & Context')
  assert.ok(app.slot('conversation.session.header.utilities'))
  assert.ok(app.slot('plugins.detail.section'))
  const body = app.slot('sidebar.right.pane.tab')
  const element = body({ sessionId: 's1' })
  assert.equal(element.type(element.props).props['data-environment-right-sidebar'], '')
  assert.equal(app.timers.size, 1)
  for (const callback of app.timers.values()) callback()
  assert.equal(app.opened, 1)
})

test('no privileged browser APIs',()=>{
  assert.doesNotMatch(get('client.js'),/\bXMLHttpRequest\b|\bprocess\.env\b|\bWebSocket\b|\brequire\s*\(\s*['\"](?:node:)?(?:fs|child_process)['\"]\s*\)/)
  assert.match(get('client.js'),/fetch\(url, \{/)
  assert.match(get('client.js'),/credentials:\s*'omit'/)
})
