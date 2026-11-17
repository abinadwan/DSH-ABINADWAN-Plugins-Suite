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
  await act(async () => [...d.querySelectorAll('button')].find(b => b.textContent === 'محاكاة القفل').click())
  assert.equal(d.getElementById('pp-preferredName'), null)
  assert.match(d.getElementById('pp-content').textContent, /دون حماية فعلية/)
  await act(async () => [...d.querySelectorAll('button')].find(b => b.textContent === 'إلغاء القفل التجريبي').click())
  await act(async () => d.getElementById('pp-tab-information').click())
  assert.ok(d.getElementById('pp-preferredName'))
})

test('demo is independent of privileged Host imports; suite version and lock agree', () => {
  const packageFile = JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'))
  assert.equal(packageFile.version, '0.6.2')
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

test('Personal Profile dropdowns use paired native system colors and inherit the Harness color scheme', async t => {
  const app = await profileOn(await clientHarness({React}))
  t.after(()=>app.dispose())
  const markup = renderToStaticMarkup(React.createElement(panel(app)))
  const dom = new JSDOM(markup)
  t.after(()=>dom.window.close())
  const d = dom.window.document
  for(const select of d.querySelectorAll('select')) {
    assert.match(select.getAttribute('style'), /background:Canvas/i)
    assert.match(select.getAttribute('style'), /color:CanvasText/i)
    assert.match(select.getAttribute('style'), /color-scheme:inherit/i)
    for(const option of select.options) {
      assert.match(option.getAttribute('style'), /background-color:Canvas/i)
      assert.match(option.getAttribute('style'), /color:CanvasText/i)
    }
  }
})

test('Personality preview has seven languages, neutral defaults, optional presets and isolated full overrides', async t => {
  const app = await profileOn(await clientHarness({React}))
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url:'http://localhost/',pretendToBeVisual:true,
  })
  const before = [globalThis.document,globalThis.window,globalThis.IS_REACT_ACT_ENVIRONMENT]
  globalThis.document=dom.window.document
  globalThis.window=dom.window
  globalThis.IS_REACT_ACT_ENVIRONMENT=true
  const root=createRoot(dom.window.document.getElementById('root'))
  t.after(async ()=>{
    await act(async()=>root.unmount())
    ;[globalThis.document,globalThis.window,globalThis.IS_REACT_ACT_ENVIRONMENT]=before
    dom.window.close()
    await app.dispose()
  })
  await act(async()=>root.render(React.createElement(panel(app))))
  const d=dom.window.document
  const get=id=>d.getElementById('pp-'+id)
  const click=async id=>act(async()=>get(id).click())
  const select=async(id,value)=>act(async()=>{
    get(id).value=value
    get(id).dispatchEvent(new dom.window.Event('change',{bubbles:true}))
  })
  const preview=()=>d.querySelector('[data-profile-effective-preview]').textContent
  await click('tab-instructions')
  assert.deepEqual([...get('response-language').options].map(o=>o.value),
    ['auto','ar','en','zh','es','fr','de','ja'])
  assert.equal(get('response-language').value,'auto')
  assert.equal(get('style-tone').value,'default')
  assert.equal(d.querySelectorAll('input[type="range"]').length,6)
  assert.ok([...d.querySelectorAll('input[type="range"]')].every(x=>x.value==='1'))
  assert.equal(d.querySelectorAll('input[id^="pp-preset-"]:checked').length,0)
  assert.equal(d.querySelectorAll('input[id^="pp-preset-"]').length,8)
  assert.equal(get('global').value,'')
  assert.match(preview(),/لا توجد تعليمات/)
  await select('style-tone','technical')
  await select('response-language','fr')
  await click('preset-no-fluff')
  assert.match(preview(),/technical terminology/)
  assert.match(preview(),/Prefer French/)
  assert.match(preview(),/Avoid filler/)
  await select('instruction-scope','environment')
  assert.equal(get('response-language'),null,'inheriting scope has no separate editor')
  assert.match(preview(),/Prefer French/)
  await select('mode','custom')
  assert.equal(get('response-language').value,'auto')
  assert.equal(get('style-tone').value,'default')
  assert.doesNotMatch(preview(),/Prefer French|Avoid filler/)
  await select('response-language','ja')
  assert.match(preview(),/Prefer Japanese/)
  await select('profile','Synthetic Lab')
  assert.equal(get('mode').value,'inherit')
  assert.match(preview(),/Prefer French/)
  await select('profile','Synthetic Studio')
  assert.equal(get('mode').value,'custom')
  assert.match(preview(),/Prefer Japanese/)
  await select('instruction-scope','global')
  await select('response-language','en')
  assert.match(preview(),/Prefer Japanese/,'global changes do not alter active override')
  await select('instruction-scope','environment')
  await select('mode','inherit')
  assert.match(preview(),/Prefer English/)
  await select('language','en')
  assert.equal(d.querySelector('[data-personal-profile-panel]').dir,'ltr')
  assert.match(d.getElementById('pp-content').textContent,/not saved or sent to the agent/)
  assert.equal(get('mode').value,'inherit')
  assert.doesNotMatch(d.getElementById('pp-content').textContent,/Preferred dialect/)
  await act(async()=>[...d.querySelectorAll('button')].find(b=>b.textContent==='Reset preview').click())
  await click('tab-instructions')
  assert.equal(get('style-tone').value,'default')
  assert.equal(get('response-language').value,'auto')
  assert.equal(d.querySelectorAll('input[id^="pp-preset-"]:checked').length,0)
  assert.equal(preview(),'No instructions.')
})
