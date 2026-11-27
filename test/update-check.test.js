// Update checker on the suite's Plugins detail page, rendered with real React
// hooks in jsdom against the Harness v0.2.2-rc.3 RemoteResult contract.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { JSDOM } from 'jsdom'
import { clientHarness, base, tick, refused } from '../test-support/client.js'

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const code = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
const [major, minor, patch] = pkg.version.split('-')[0].split('.').map(Number)
const newerVersion = [major, minor, patch + 1].join('.')
const newerTag = 'v' + newerVersion
const RELEASE = 'https://api.github.com/repos/abinadwan/DSH-ABINADWAN-Plugins-Suite/releases/latest'
const COMMIT = 'https://api.github.com/repos/abinadwan/DSH-ABINADWAN-Plugins-Suite/commits/' + newerTag
const SHA = 'a'.repeat(40)
const OLD = 'b'.repeat(40)
const RAW = 'https://raw.githubusercontent.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/' + SHA + '/package.json'
const PINNED_SOURCE = 'github:abinadwan/DSH-ABINADWAN-Plugins-Suite#' + OLD
const UNPINNED_SOURCE = 'github:abinadwan/DSH-ABINADWAN-Plugins-Suite'
const quiet = { warn() {}, error() {}, log() {} }

const reply = (value, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => value })
const releaseFetch = (overrides = {}) => async (url, options) => {
  overrides.seen?.push({ url, options })
  if (url === RELEASE) return reply(overrides.release ?? { tag_name: newerTag, draft: false, prerelease: false })
  if (url === COMMIT) return reply(overrides.commit ?? { sha: SHA })
  if (url === RAW) return reply(overrides.manifest ?? { name: pkg.name, version: newerVersion })
  throw new Error('unexpected remote path: ' + url)
}
const bundle = (source, extra = {}) => ({
  name: pkg.name, installed: true, availability: 'profile', official: false, enabled: true,
  version: pkg.version, source, update: source === PINNED_SOURCE ? 'git' : undefined, rows: [], ...extra,
})
const subject = (version = pkg.version) => ({
  kind: 'bundle', pkg: { name: base, version, installed: true, availability: 'profile', official: false, enabled: true, rows: [] },
})

async function mount(t, options = {}, props = {}) {
  const app = await clientHarness({ React, console: quiet, ...options })
  const before = { document: globalThis.document, window: globalThis.window, act: globalThis.IS_REACT_ACT_ENVIRONMENT }
  const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/' })
  globalThis.document = dom.window.document
  globalThis.window = dom.window
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const root = createRoot(dom.window.document.getElementById('root'))
  const record = app.slots.records.get('environment-sidebar-versions')
  assert.ok(record, 'Versions entry registered')
  const access = props.access ?? (() => true)
  const view = {
    app, dom, record,
    async render(next = {}) {
      await act(async () => root.render(React.createElement(record.component,
        { subject: next.subject ?? props.subject ?? subject(), useRemoteAccess: access })))
      await act(async () => { await tick() })
    },
    text: () => dom.window.document.body.textContent,
    q: selector => dom.window.document.querySelector(selector),
    async click(selector) {
      const node = view.q(selector)
      assert.ok(node, 'missing control ' + selector)
      await act(async () => { node.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true })) })
      for (let i = 0; i < 5; i++) await act(async () => { await tick() })
    },
    async unmount() { await act(async () => root.unmount()) },
  }
  t.after(async () => {
    try { await view.unmount() } catch {}
    globalThis.document = before.document
    globalThis.window = before.window
    globalThis.IS_REACT_ACT_ENVIRONMENT = before.act
    dom.window.close()
    await app.dispose()
  })
  await tick()
  await view.render()
  return view
}

test('startup check with no published release: labelled section, Check again, never installs', async t => {
  const urls = [], updates = []
  const view = await mount(t, {
    fetch: async url => { urls.push(url); return reply({ message: 'Not Found' }, 404) },
    listBundles: () => [bundle(PINNED_SOURCE)],
    updateBundle: (...args) => { updates.push(args); throw new Error('must not install') },
  })
  assert.deepEqual(urls, [RELEASE])
  assert.equal(view.app.intervals.size, 1)
  assert.equal([...view.app.intervals.values()][0].ms, 24 * 60 * 60 * 1000)
  assert.ok(view.q('[data-environment-update-section]'))
  assert.match(view.text(), /Suite updates \(GitHub Releases\)/)
  assert.match(view.text(), /No published stable release yet/)
  assert.ok(view.text().includes('Installed (Host)v' + pkg.version))
  assert.ok(view.text().includes('Browser modulev' + pkg.version))
  assert.match(view.text(), /Last checked\d/)
  assert.match(view.text(), /Git, pinned to bbbbbbbbbbbb/)
  assert.equal(view.q('[data-update-now]'), null)
  await view.click('[data-check-updates]')
  assert.deepEqual(urls, [RELEASE, RELEASE])
  assert.equal(updates.length, 0)
  assert.match(code, new RegExp("const INSTALLED_VERSION = '" + pkg.version.replace(/\./g, '\\.') + "'"))
})

test('pinned Git install: Update now verifies, asks for confirmation, then delegates to Host updateBundle', async t => {
  const seen = [], installed = []
  const view = await mount(t, {
    fetch: releaseFetch({ seen }),
    listBundles: () => [bundle(PINNED_SOURCE)],
    updateBundle: (...args) => {
      installed.push(args)
      return { from: pkg.version, to: newerVersion, step: 'install',
        result: { changed: true, application: 'restart-required', stage: 'install', target: pkg.name } }
    },
  })
  assert.equal(seen.length, 1, 'startup only reads the latest release')
  assert.ok(view.text().includes('Update available: ' + newerTag))
  await view.click('[data-update-now]')
  assert.equal(installed.length, 0, 'preparation never installs')
  assert.deepEqual(seen.map(x => x.url), [RELEASE, COMMIT, RAW])
  for (const item of seen) {
    assert.equal(item.options.credentials, 'omit')
    assert.equal(item.options.referrerPolicy, 'no-referrer')
    assert.equal(item.options.redirect, 'error')
    assert.equal(item.options.method, 'GET')
  }
  assert.ok(view.q('[role="dialog"][aria-label="Confirm suite update"]'))
  assert.match(view.text(), new RegExp('#' + SHA))
  await view.click('[data-cancel-update]')
  assert.equal(view.q('[data-confirm-update]'), null)
  assert.equal(installed.length, 0, 'cancel installs nothing')
  await view.click('[data-update-now]')
  await view.click('[data-confirm-update]')
  assert.deepEqual(JSON.parse(JSON.stringify(installed)),
    [[pkg.name, newerVersion, { spec: 'github:abinadwan/DSH-ABINADWAN-Plugins-Suite#' + SHA }]])
  assert.ok(view.text().includes('Host applied the update to ' + newerTag + '; restart Harness to finish.'))
})

test('unpinned Git install (the real Windows case) shows an actionable migration and never updates', async t => {
  const updates = []
  const view = await mount(t, {
    fetch: releaseFetch(),
    listBundles: () => [bundle(UNPINNED_SOURCE)],
    updateBundle: (...args) => { updates.push(args); return {} },
  })
  assert.match(view.text(), /Git, not pinned to a commit \(in-app update unavailable\)/)
  await view.click('[data-update-now]')
  assert.ok(view.q('[data-update-migration]'))
  assert.match(view.text(), /Nothing was changed/)
  assert.match(view.text(), /Uninstall this bundle from this page, then use Add plugin/)
  assert.equal(view.q('[data-pinned-spec]').textContent, 'github:abinadwan/DSH-ABINADWAN-Plugins-Suite#' + SHA)
  assert.equal(view.q('[data-confirm-update]'), null)
  assert.deepEqual(updates, [])
})

test('Host update failures, refusals and rollbacks are reported, never shown as success', async t => {
  for (const [label, answer, expected] of [
    ['remote refusal', refused('access/denied', 'not permitted'), /Host update failed: not permitted/],
    ['failed install with restore', { from: pkg.version, to: newerVersion, step: 'install',
      result: { application: 'failed', error: { code: 'operation-error' } }, restore: { application: 'applied' } },
    /did not install \(operation-error\); the Host reinstalled the previous version/],
    ['failed restore', { from: pkg.version, to: newerVersion, step: 'install',
      result: { application: 'failed' }, restore: { application: 'failed' } }, /could not reinstall the previous version/],
    ['refused check', { from: pkg.version, to: newerVersion, step: 'check',
      result: { application: 'failed', error: { code: 'invalid-spec' } } }, /Host reported failed \(invalid-spec\) at the check step/],
    ['unknown outcome', { step: 'install', result: {} }, /Update outcome not confirmed/],
  ]) {
    await t.test(label, async t => {
      const view = await mount(t, {
        fetch: releaseFetch(), listBundles: () => [bundle(PINNED_SOURCE)], updateBundle: () => answer,
      })
      await view.click('[data-update-now]')
      await view.click('[data-confirm-update]')
      assert.match(view.q('[role="alert"]').textContent, expected)
      assert.doesNotMatch(view.text(), /Host applied the update/)
    })
  }
})

test('offline, unreachable, rate-limited and unreadable GitHub responses fail closed', async t => {
  for (const [label, options, expected] of [
    ['offline', { navigator: { onLine: false }, fetch: () => { throw new Error('must not fetch offline') } }, /appears to be offline/],
    ['unreachable', { fetch: async () => { throw new TypeError('Failed to fetch') } }, /GitHub could not be reached/],
    ['rate limited', { fetch: async () => reply({}, 403) }, /HTTP 403, possibly rate limited/],
    ['server error', { fetch: async () => reply({}, 500) }, /GitHub returned HTTP 500/],
    ['unreadable', { fetch: async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('x') } }) }, /unreadable response/],
  ]) {
    await t.test(label, async t => {
      const updates = []
      const view = await mount(t, { ...options, updateBundle: (...a) => updates.push(a) })
      assert.match(view.text(), /Could not check for updates/)
      assert.match(view.text(), expected)
      assert.equal(view.q('[data-update-now]'), null)
      assert.deepEqual(updates, [])
    })
  }
})

test('untrusted release metadata, commit or manifest never offers installation', async t => {
  for (const [label, overrides, expected, source = PINNED_SOURCE] of [
    ['draft', { release: { tag_name: newerTag, draft: true, prerelease: false } }, /Untrusted or unsupported release metadata/],
    ['prerelease', { release: { tag_name: newerTag, draft: false, prerelease: true } }, /Untrusted or unsupported release metadata/],
    ['malformed tag', { release: { tag_name: 'main', draft: false, prerelease: false } }, /Untrusted or unsupported release metadata/],
    ['invalid commit', { commit: { sha: 'not-a-sha' } }, /Invalid release commit/],
    ['version mismatch', { manifest: { name: pkg.name, version: pkg.version } }, /Release manifest does not match/],
    ['identity mismatch', { manifest: { name: '@evil/pkg', version: newerVersion } }, /Release manifest does not match/],
    ['foreign repository', {}, /installed from another repository/, 'github:someone/fork#' + OLD],
  ]) {
    await t.test(label, async t => {
      const updates = []
      const view = await mount(t, {
        fetch: releaseFetch(overrides), listBundles: () => [bundle(source, { update: 'git' })],
        updateBundle: (...a) => updates.push(a),
      })
      if (view.q('[data-update-now]')) await view.click('[data-update-now]')
      assert.match(view.text(), expected)
      assert.equal(view.q('[data-confirm-update]'), null)
      assert.deepEqual(updates, [])
    })
  }
})

test('without update access the flow stops before confirmation', async t => {
  const updates = []
  const view = await mount(t, {
    fetch: releaseFetch(), listBundles: () => [bundle(PINNED_SOURCE)], updateBundle: (...a) => updates.push(a),
  }, { access: action => action !== 'pluginManager/updateBundle' })
  await view.click('[data-update-now]')
  assert.match(view.text(), /may not update plugins/)
  assert.equal(view.q('[data-confirm-update]'), null)
  assert.deepEqual(updates, [])
})

test('a Host/browser version mismatch is explained instead of silently trusted', async t => {
  const view = await mount(t, { fetch: async () => reply({}, 404), listBundles: () => [bundle(PINNED_SOURCE)] },
    { subject: subject('0.6.1') })
  assert.ok(view.q('[data-version-mismatch]'))
  assert.ok(view.text().includes('Host reports v0.6.1 but this window runs browser module v' + pkg.version))
})

test('unmounting during an update and disposing the suite leave no timers or late updates', async t => {
  let finish
  const view = await mount(t, {
    fetch: releaseFetch(), listBundles: () => [bundle(PINNED_SOURCE)],
    updateBundle: () => new Promise(resolve => { finish = resolve }),
  })
  await view.click('[data-update-now]')
  await view.click('[data-confirm-update]')
  assert.match(view.text(), /Updating through Harness Plugin Manager/)
  await view.unmount()
  finish({ step: 'install', result: { application: 'applied' } })
  await tick()
  await view.app.dispose()
  assert.equal(view.app.intervals.size, 0)
})

test('confirmation revalidates installed source and version before updating', async t => {
  for (const [label, changed] of [
    ['different commit at same version', bundle('github:abinadwan/DSH-ABINADWAN-Plugins-Suite#' + 'c'.repeat(40), { update: 'git' })],
    ['different version', bundle(PINNED_SOURCE, { version: newerVersion })],
    ['foreign source', bundle('github:someone/fork#' + OLD, { update: 'git' })],
    ['removed installation', null],
  ]) {
    await t.test(label, async t => {
      let installed = bundle(PINNED_SOURCE)
      const updates = []
      const view = await mount(t, {
        fetch: releaseFetch(), listBundles: () => installed ? [installed] : [],
        updateBundle: (...args) => updates.push(args),
      })
      await view.click('[data-update-now]')
      assert.ok(view.q('[data-confirm-update]'))
      installed = changed
      await view.click('[data-confirm-update]')
      assert.match(view.q('[role="alert"]').textContent, /Installed bundle changed/)
      assert.deepEqual(updates, [])
    })
  }
})

test('confirmation refuses a moved tag or withdrawn stable release', async t => {
  for (const [label, overrides, expected] of [
    ['tag moved', { commit: { sha: 'c'.repeat(40) } }, /Release commit changed/],
    ['release withdrawn', { release: { tag_name: newerTag, draft: true, prerelease: false } }, /Untrusted or unsupported release/],
    ['latest changed', { release: { tag_name: 'v99.0.0', draft: false, prerelease: false } }, /Published release changed/],
  ]) {
    await t.test(label, async t => {
      let fetcher = releaseFetch()
      const updates = []
      const view = await mount(t, {
        fetch: (...args) => fetcher(...args), listBundles: () => [bundle(PINNED_SOURCE)],
        updateBundle: (...args) => updates.push(args),
      })
      await view.click('[data-update-now]')
      fetcher = releaseFetch(overrides)
      await view.click('[data-confirm-update]')
      assert.match(view.q('[role="alert"]').textContent, expected)
      assert.deepEqual(updates, [])
    })
  }
})

test('Host reset invalidates confirmation even when the installation is identical', async t=>{
  const updates=[]
  const view=await mount(t,{fetch:releaseFetch(),listBundles:()=>[bundle(PINNED_SOURCE)],updateBundle:(...args)=>updates.push(args)})
  await view.click('[data-update-now]')
  assert.ok(view.q('[data-confirm-update]'))
  await act(async()=>view.app.ctx.emit('connection/reset'))
  assert.equal(view.q('[data-confirm-update]'),null)
  assert.deepEqual(updates,[])
})
test('Host reset during confirmation revalidation cannot dispatch an update on the new Host',async t=>{
  let resolve,delayed=false
  const fetcher=releaseFetch(),updates=[]
  const view=await mount(t,{fetch:(url,options)=>delayed&&url===COMMIT?new Promise(fn=>{resolve=fn}):fetcher(url,options),
    listBundles:()=>[bundle(PINNED_SOURCE)],updateBundle:(...args)=>updates.push(args)})
  await view.click('[data-update-now]')
  delayed=true
  await view.click('[data-confirm-update]')
  assert.equal(typeof resolve,'function')
  await act(async()=>view.app.ctx.emit('connection/reset'))
  await act(async()=>resolve(reply({sha:SHA})))
  assert.deepEqual(updates,[])
  assert.equal(view.q('[data-confirm-update]'),null)
})
test('duplicate installed bundle identities fail closed at confirmation',async t=>{
  let rows=[bundle(PINNED_SOURCE)]
  const updates=[]
  const view=await mount(t,{fetch:releaseFetch(),listBundles:()=>rows,updateBundle:(...args)=>updates.push(args)})
  await view.click('[data-update-now]')
  rows=[bundle(PINNED_SOURCE),bundle(PINNED_SOURCE)]
  await view.click('[data-confirm-update]')
  assert.match(view.q('[role="alert"]').textContent,/Installed bundle changed/)
  assert.deepEqual(updates,[])
})
