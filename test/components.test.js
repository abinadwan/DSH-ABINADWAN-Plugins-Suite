import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)))
const base = '@abinadwan/dsh-plugins-suite'

test('each component resolves its own Host entry, locale and artwork', async () => {
  for (const [path, title] of [
    ['environment-context', 'Environment & Context'],
    ['humanizer', 'Humanizer'],
    ['personal-profile', 'My Profile'],
  ]) {
    assert.ok(pkg.exports[`./${path}`], `missing ${path} Host export`)
    const host = await import(`${base}/${path}`)
    assert.equal(typeof host.apply, 'function')
    const locale = JSON.parse(readFileSync(require.resolve(`${base}/${path}/locale/en.json`)))
    assert.equal(locale.meta.title, title)
    assert.notEqual(require.resolve(`${base}/${path}/icon`), require.resolve(`${base}/icon`))
  }
})

test('Humanizer contributes the packaged skill and releases it on disable', async () => {
  assert.ok(pkg.exports['./humanizer'], 'missing runtime Humanizer')
  const humanizer = await import(`${base}/humanizer`)
  assert.deepEqual(humanizer.inject, ['skills'])
  const registered = []
  const effects = []
  const ctx = {
    skills: { register(skill) {
      registered.push(skill)
      return () => registered.splice(registered.indexOf(skill), 1)
    } },
    effect(start) { effects.push(start()) },
  }
  humanizer.apply(ctx)
  assert.equal(registered.length, 1)
  assert.equal(registered[0].name, 'abinadwan-humanizer')
  assert.equal(registered[0].source, 'runtime')
  assert.equal(registered[0].content,
    readFileSync(new URL('../plugins/humanizer/SKILL.md', import.meta.url), 'utf8'))
  assert.deepEqual(registered[0].invocation, { userInvocable: true, modelInvocable: true })
  effects.forEach(dispose => dispose())
  assert.equal(registered.length, 0)
  humanizer.apply(ctx)
  assert.equal(registered.length, 1)
})

test('Personal Profile Host attaches settings and prompt services independently', async () => {
  const profile=await import(`${base}/personal-profile`)
  assert.ok(profile.Config)
  assert.equal(profile.inject,undefined)
  const calls=[]
  const ctx={fiber:{},inject(keys,callback){calls.push(keys);callback({effect(fn){return fn()},settings:{configure(options,owner){calls.push([options,owner])}},systemPrompt:{context(options){calls.push(options.name)},section(options){calls.push(options.name)}}})},
    on(event,listener){calls.push(event);assert.equal(typeof listener,'function')}}
  profile.apply(ctx)
  // One system section and one runtime context; no llm/stream refusal hook.
  assert.deepEqual(calls,[['settings'],[{auto:false},ctx.fiber],['systemPrompt'],'abinadwan:personal-profile-preferences','abinadwan:personal-profile-context'])
})
