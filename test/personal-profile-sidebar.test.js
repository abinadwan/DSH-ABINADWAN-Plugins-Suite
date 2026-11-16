import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import React, {act} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {createRoot} from 'react-dom/client'
import {JSDOM} from 'jsdom'
import {clientHarness, base} from '../test-support/client.js'

const panelId = base + '/personal-profile-page'
const panel = app => app.slots.records.get(panelId)?.component

test('v0.6.0 browser registers a native left-sidebar launcher and matching full main page while Host is off', async t => {
  const app = await clientHarness({React})
  t.after(() => app.dispose())
  assert.equal(app.rows().find(row => row.moduleName === base + '/personal-profile').enabled, false)
  const menu = app.slots.records.get('sidebar.panellist:' + panelId)
  const main = app.slots.records.get(panelId)
  assert.equal(menu?.options.name, 'sidebar.panellist')
  assert.equal(menu?.options.id, panelId)
  assert.equal(menu?.options.label(), 'Personal Profile')
  assert.equal(main?.options.name, 'main')
  assert.equal(main?.options.key, panelId)
  const html = renderToStaticMarkup(React.createElement(main.component))
  assert.match(html, /data-personal-profile-panel="preview-only"/)
  for (const tab of ['information','instructions','access','backup','privacy']) {
    assert.match(html, new RegExp('id="pp-tab-' + tab + '"'))
  }
  assert.match(html, /لا تدخل بيانات حقيقية/)
  assert.doesNotMatch(html, /type="submit"/)
  assert.doesNotMatch(html, /autocomplete="on"/i)
  const icon = renderToStaticMarkup(React.createElement(menu.component, {size:20}))
  assert.match(icon, /<svg/)
})

test('preview navigation changes full-page sections without Host access or persistence', async t => {
  const app = await clientHarness({React})
  const documentBefore = globalThis.document
  const windowBefore = globalThis.window
  const envBefore = globalThis.IS_REACT_ACT_ENVIRONMENT
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url:'http://localhost/', pretendToBeVisual:true,
  })
  globalThis.document = dom.window.document
  globalThis.window = dom.window
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const root = createRoot(dom.window.document.getElementById('root'))
  t.after(async () => {
    await act(async () => root.unmount())
    globalThis.document = documentBefore
    globalThis.window = windowBefore
    globalThis.IS_REACT_ACT_ENVIRONMENT = envBefore
    dom.window.close()
    await app.dispose()
  })
  await act(async () => root.render(React.createElement(panel(app))))
  const d = dom.window.document
  for (const name of ['instructions','access','backup','privacy','information']) {
    await act(async () => d.getElementById('pp-tab-' + name).dispatchEvent(
      new dom.window.MouseEvent('click', {bubbles:true})))
    assert.equal(d.querySelector('[role="tab"][aria-selected="true"]').id, 'pp-tab-' + name)
    assert.equal(d.getElementById('pp-content').getAttribute('aria-labelledby'), 'pp-tab-' + name)
  }
  await act(async () => d.getElementById('pp-tab-backup').click())
  await act(async () => [...d.querySelectorAll('button')].find(b => b.textContent === 'مراجعة التصدير').click())
  assert.ok([...d.querySelectorAll('button')].some(b => b.disabled && b.textContent === 'التنفيذ غير متاح'))
  await act(async () => d.getElementById('pp-tab-privacy').click())
  await act(async () => [...d.querySelectorAll('button')].find(b => b.textContent === 'محاكاة القفل').click())
  assert.equal(d.getElementById('pp-preferredName'), null)
  assert.match(d.getElementById('pp-content').textContent, /دون حماية فعلية/)
  await act(async () => [...d.querySelectorAll('button')].find(b => b.textContent === 'إلغاء القفل التجريبي').click())
  await act(async () => d.getElementById('pp-tab-information').click())
  assert.ok(d.getElementById('pp-preferredName'))
})

test('demo is independent of privileged Host imports; suite version and lock agree', () => {
  const packageFile = JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'))
  const lock = JSON.parse(readFileSync(new URL('../package-lock.json',import.meta.url),'utf8'))
  assert.equal(packageFile.version, '0.6.0')
  assert.equal(lock.version, packageFile.version)
  assert.equal(lock.packages[''].version, packageFile.version)
  const client = readFileSync(new URL('../client.js', import.meta.url),'utf8')
  const start = client.indexOf('// Safe browser-only preview.')
  const end = client.indexOf('function ProfileDraft()',start)
  assert.ok(start > -1 && end > start)
  const preview = client.slice(start,end)
  assert.doesNotMatch(preview, /\b(fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|sendBeacon)\b/)
  assert.doesNotMatch(preview, /require\((?!'react')/)
  const host = readFileSync(new URL('../plugins/personal-profile/index.js',import.meta.url),'utf8')
  const patch = readFileSync(new URL('../cordis.patch.yml',import.meta.url),'utf8')
  assert.match(host, /export function apply\(\) \{\}/)
  assert.match(patch, /id: abinadwan-personal-profile[\s\S]*?disabled: true/)
})
