import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync, existsSync} from 'node:fs'
import React, {act} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {createRoot} from 'react-dom/client'
import {JSDOM} from 'jsdom'
import {clientHarness, base, withProfile} from '../test-support/client.js'

async function profileOn(app) {
  app.setRows(withProfile(app.rows(), true))
  await app.changed()
  await app.changed()
  return app
}

const panelId = base + '/personal-profile-page'
const panel = app => app.slots.records.get(panelId)?.component

test('Personal Profile On registers a native left-sidebar launcher and matching full main page', async t => {
  const app = await clientHarness({React})
  t.after(() => app.dispose())
  assert.equal(app.slots.records.has(panelId), false, 'nothing while the Host row is Off')
  assert.equal(app.slots.records.has('sidebar.panellist:' + panelId), false)
  await profileOn(app)
  assert.equal(app.rows().find(row => row.moduleName === base + '/personal-profile').enabled, true)
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
  const app = await profileOn(await clientHarness({React}))
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
  assert.equal(d.getElementById('pp-auto-lock'), null)
  assert.match(d.getElementById('pp-content').textContent, /نص عادي/)
  await act(async () => d.getElementById('pp-tab-information').click())
  assert.deepEqual([...d.querySelectorAll('#pp-content input, #pp-content select')].map(x=>x.id),
    ['pp-preferredName','pp-nationality','pp-gender'])
  await act(async () => d.getElementById('pp-tab-access').click())
  assert.deepEqual([...d.querySelectorAll('[id^="pp-policy-"]')].map(x=>x.id),
    ['pp-policy-preferredName','pp-policy-nationality','pp-policy-gender'])
  const cloud=d.getElementById('pp-cloud')
  assert.equal(cloud.checked,false)
  await act(async()=>cloud.click())
  assert.equal(cloud.checked,true)
  const profile=d.getElementById('pp-profile')
  await act(async()=>{profile.value='Synthetic Lab';profile.dispatchEvent(new dom.window.Event('change',{bubbles:true}))})
  assert.equal(d.getElementById('pp-cloud').checked,false)
  await act(async()=>{profile.value='Synthetic Studio';profile.dispatchEvent(new dom.window.Event('change',{bubbles:true}))})
  assert.equal(d.getElementById('pp-cloud').checked,true)
})

test('demo is independent of privileged Host imports; suite version and lock agree', () => {
  const packageFile = JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'))
  assert.equal(packageFile.version, '0.6.3')
  // npm pack deliberately omits the lockfile. Check its consistency when the
  // test runs from the source tree; packed tests still verify the manifest.
  const lockPath = new URL('../package-lock.json', import.meta.url)
  if (existsSync(lockPath)) {
    const lock = JSON.parse(readFileSync(lockPath,'utf8'))
    assert.equal(lock.version, packageFile.version)
    assert.equal(lock.packages[''].version, packageFile.version)
  }
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


test('personality preview is neutral by default and scoped without persistence or agent calls', async t => {
  const app = await profileOn(await clientHarness({ React }))
  const before = { document: globalThis.document, window: globalThis.window, act: globalThis.IS_REACT_ACT_ENVIRONMENT }
  const dom = new JSDOM('<!doctype html><div id="root"></div>', {url:'http://localhost/'})
  globalThis.document = dom.window.document
  globalThis.window = dom.window
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const root = createRoot(dom.window.document.getElementById('root'))
  t.after(async () => {
    await act(async () => root.unmount())
    globalThis.document = before.document
    globalThis.window = before.window
    globalThis.IS_REACT_ACT_ENVIRONMENT = before.act
    dom.window.close()
    await app.dispose()
  })
  const d = dom.window.document
  const byId = id => d.getElementById('pp-'+id)
  const choose = async (id,value) => {
    const control=byId(id)
    assert.ok(control)
    await act(async()=>{control.value=value;control.dispatchEvent(new dom.window.Event('change',{bubbles:true}))})
  }
  const click=async id=>act(async()=>byId(id).click())
  const preview=()=>byId('effective-instructions').textContent
  await act(async()=>root.render(React.createElement(panel(app))))
  await click('tab-instructions')
  assert.equal(byId('style').value,'default')
  assert.equal(byId('response-language').value,'auto')
  assert.deepEqual(Array.from(byId('response-language').options,o=>o.value),['auto','ar','en','zh','es','fr','de','ja'])
  assert.equal(d.querySelectorAll('[id^="pp-trait-"]').length,6)
  assert.equal(d.querySelectorAll('[id^="pp-preset-"]:checked').length,0)
  assert.equal(d.querySelectorAll('[id^="pp-preset-"]').length,8)
  assert.equal(preview(),'لا توجد تعليمات.')
  assert.equal(byId('dialect'),null)
  for(const select of d.querySelectorAll('select')) {
    assert.equal(select.style.backgroundColor.toLowerCase(),'field')
    assert.equal(select.style.color.toLowerCase(),'fieldtext')
    for(const option of select.options) {
      assert.equal(option.style.backgroundColor.toLowerCase(),'field')
      assert.equal(option.style.color.toLowerCase(),'fieldtext')
    }
  }
  await choose('style','technical')
  await choose('response-language','ja')
  await click('preset-evidence')
  await act(async()=>{const range=byId('trait-detail');range.value='2';range.dispatchEvent(new dom.window.Event('input',{bubbles:true}))})
  assert.match(preview(),/technical terminology/)
  assert.match(preview(),/Japanese/)
  assert.match(preview(),/Distinguish evidence/)
  assert.match(preview(),/Provide more detail/)
  const globalPreview=preview()
  await choose('instructions-scope','environment')
  assert.equal(byId('mode').value,'inherit')
  assert.equal(byId('style'),null)
  assert.equal(preview(),globalPreview)
  await choose('mode','custom')
  assert.equal(preview(),'لا توجد تعليمات.')
  await choose('response-language','fr')
  assert.match(preview(),/French/)
  assert.doesNotMatch(preview(),/Japanese/)
  await choose('profile','Synthetic Lab')
  assert.equal(byId('mode').value,'inherit')
  assert.equal(preview(),globalPreview)
  await choose('profile','Synthetic Studio')
  assert.match(preview(),/French/)
  await choose('mode','inherit')
  assert.equal(preview(),globalPreview)
  await choose('language','en')
  assert.equal(d.querySelector('[data-personal-profile-panel]').dir,'ltr')
  assert.equal(preview(),globalPreview)
  await choose('instructions-scope','global')
  assert.equal(byId('response-language').value,'ja')
  await act(async()=>Array.from(d.querySelectorAll('button')).find(b=>b.textContent==='Reset this scope').click())
  assert.equal(preview(),'No instructions.')
  assert.equal(byId('response-language').value,'auto')
  assert.equal(d.querySelectorAll('[id^="pp-preset-"]:checked').length,0)
})
