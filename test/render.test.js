import test from 'node:test'
import assert from 'node:assert/strict'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { clientHarness, base } from '../test-support/client.js'

test('real React renders the Environment and the native-settings Personal Profile summary', async t => {
  const app = await clientHarness({ React })
  t.after(() => app.dispose())
  const body = app.slot('sidebar.right.pane.tab')
  const sidebar = renderToStaticMarkup(React.createElement(body, {
    sessionId: 's1',
  }))
  assert.match(sidebar, /aria-valuenow="38"/)
  assert.match(sidebar, /HomeBook/)
  assert.match(sidebar, /1.2k/)
  // Gating: the Profile detail section exists only while its Host row is enabled and active.
  assert.equal(app.slots.records.has('abinadwan-profile-draft'), false)
  app.setRows(app.rows().map(row => ({ ...row, enabled: true, fiberPhase: 'active' })))
  await app.changed()
  const draft = app.slots.records.get('abinadwan-profile-draft').component
  const render = subject => renderToStaticMarkup(React.createElement(draft, { subject }))
  const html = render({ kind: 'bundle', pkg: { name: base } })
  assert.match(html, /Personal Profile — local settings/)
  // Native local persistence, described accurately.
  assert.match(html, /Saved in the active Harness Profile/)
  // No misleading encryption claim: only the explicit disclaimer is allowed.
  assert.match(html, /without plugin-level encryption/)
  assert.doesNotMatch(html.replace('without plugin-level encryption', ''), /encrypt|DPAPI|Argon|protected|secure storage/i)
  // Default-private access policies.
  assert.match(html, /All access is Private by default/)
  // No active agent injection or cloud disclosure.
  assert.match(html, /Agent and cloud disclosure are not implemented/)
  assert.doesNotMatch(html, /design draft|preview only|synthetic/i)
  assert.doesNotMatch(html, /<(?:form|input|textarea|select)\b/)
  // The summary follows the Host row state and never renders for unrelated subjects.
  const row = enabled => ({ kind: 'row', row: { moduleName: `${base}/personal-profile`, enabled } })
  assert.match(render(row(true)), /local settings/)
  assert.equal(render(row(false)), '')
  assert.equal(render({ kind: 'bundle', pkg: { name: base, rows: [{ moduleName: `${base}/personal-profile`, enabled: false }] } }), '')
  assert.equal(render({ kind: 'bundle', pkg: { name: '@someone/else' } }), '')
  assert.equal(render({ kind: 'row', row: { moduleName: `${base}/humanizer`, enabled: true } }), '')
})
