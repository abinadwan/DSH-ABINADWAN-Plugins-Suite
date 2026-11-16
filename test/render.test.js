import test from 'node:test'
import assert from 'node:assert/strict'
import * as React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { clientHarness, base } from '../test-support/client.js'

test('real React renders the Environment and read-only Profile draft', async t => {
  const app = await clientHarness({ React })
  t.after(() => app.dispose())
  const body = app.slot('sidebar.right.pane.tab')
  const sidebar = renderToStaticMarkup(React.createElement(body, {
    sessionId: 's1',
  }))
  assert.match(sidebar, /aria-valuenow="38"/)
  assert.match(sidebar, /HomeBook/)
  assert.match(sidebar, /1.2k/)
  app.setRows(app.rows().map(row => ({ ...row, enabled: true, fiberPhase: 'active' })))
  await app.changed()
  const draft = app.slots.records.get('abinadwan-profile-draft').component
  const html = renderToStaticMarkup(React.createElement(draft, {
    subject: { kind: 'bundle', pkg: { name: base } },
  }))
  assert.match(html, /Personal Profile — design draft/)
  assert.match(html, /Off by default/)
  assert.doesNotMatch(html, /<(?:form|input|textarea|select)\b/)
})
