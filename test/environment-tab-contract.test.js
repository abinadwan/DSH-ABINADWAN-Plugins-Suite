import test from 'node:test'
import assert from 'node:assert/strict'
import * as React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {clientHarness, base} from '../test-support/client.js'

test('Environment tab body registration matches official keyed tab definition id', async t => {
  const app = await clientHarness({React})
  t.after(() => app.dispose())
  const definition = app.tabs.records.get('environment-dashboard')
  assert.ok(definition)
  assert.equal(definition.id, base + '/environment-context')
  const body = app.slots.records.get(definition.id)
  assert.ok(body, 'must register content under the type id, not the package id')
  assert.equal(body.options.name, 'sidebar.right.pane.tab')
  assert.equal(body.options.key, definition.id)
  assert.equal(typeof body.options.inject, 'function')
  assert.equal(body.options.inject('s1').sessionId, 's1')
})

test('Environment right tab renders actual session projections without conversation-only props', async t => {
  const app = await clientHarness({React})
  t.after(() => app.dispose())
  const entry = app.slots.records.get(base + '/environment-context')
  const sessionOne = renderToStaticMarkup(React.createElement(entry.component,
    entry.options.inject('s1')))
  assert.match(sessionOne, /data-environment-right-sidebar/)
  assert.match(sessionOne, /aria-valuenow="38"/)
  assert.match(sessionOne, /Output tokens/)
  assert.match(sessionOne, /1\.2k/)
  assert.match(sessionOne, /HomeBook/)
  const sessionTwo = renderToStaticMarkup(React.createElement(entry.component,
    entry.options.inject('s2')))
  assert.match(sessionTwo, /aria-valuenow="13"/)
  assert.match(sessionTwo, /Other Session/)
  assert.doesNotMatch(sessionTwo, /1\.2k/)
  assert.doesNotMatch(sessionTwo, /HomeBook/)
})
