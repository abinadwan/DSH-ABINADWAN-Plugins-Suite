import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parse } from 'yaml'
import { PNG } from 'pngjs'
import { Context } from '@deepseek-ai/cordis'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import Loader, { Group } from '@deepseek-ai/cordis-plugin-loader'
import { readPluginMeta } from '@deepseek-ai/dsh-app-boot'

const root = new URL('../package.json', import.meta.url)
const read = path => readFileSync(new URL('../' + path, import.meta.url))
const base = '@abinadwan/dsh-plugins-suite'

test('DSH bundle has a Group carrier and top-level settings-owned Personal Profile', async () => {
  const [{ insert: [group, profile] }] = parse(read('cordis.patch.yml').toString())
  assert.equal(group.id, 'abinadwan-suite', 'keep existing suite override identity')
  assert.equal(group.name, base)
  assert.equal(group.group, true)
  assert.equal((await import('../index.js')).default, Group)
  assert.deepEqual(group.config.map(row => row.name), [
    `${base}/environment-context`, `${base}/humanizer`,
  ])
  assert.equal(profile.id,'abinadwan-personal-profile')
  assert.equal(profile.name,`${base}/personal-profile`)
  assert.equal(profile.disabled,true)
  assert.equal(new Set([...group.config,profile].map(row=>row.id)).size,3)
  assert.ok(group.config.every(row => !row.disabled))
})

test('actual DSH metadata reader gives each component its title and transparent PNG', () => {
  const names = ['', '/environment-context', '/humanizer', '/personal-profile']
  const titles = ['ABINADWAN Plugins Suite', 'Environment & Context', 'Humanizer', 'Personal Profile']
  const icons = new Set()
  names.forEach((path, index) => {
    const meta = readPluginMeta(base + path, root.href)
    assert.equal(meta?.error, undefined)
    const title = typeof meta.title === 'string' ? meta.title : meta.title.en
    assert.equal(title, titles[index])
    assert.ok(meta.icon?.startsWith('data:image/png;base64,'))
    icons.add(meta.icon)
    const bytes = Buffer.from(meta.icon.split(',')[1], 'base64')
    assert.ok(bytes.length <= 256 * 1024)
    const png = PNG.sync.read(bytes)
    const alpha = []
    for (let i = 3; i < png.data.length; i += 4) alpha.push(png.data[i])
    assert.ok(alpha.includes(0), 'artwork must retain transparent pixels')
    assert.ok(alpha.includes(255), 'artwork must retain opaque foreground')
    assert.equal(png.data[3], 0, 'transparent top-left corner')
  })
  assert.equal(icons.size, 4)
})

test('actual DSH skill registry discovers and loads Humanizer until its component is disposed', async () => {
  const pkg = JSON.parse(read('package.json'))
  assert.ok(pkg.exports['./humanizer'], 'missing Humanizer')
  const humanizer = await import(`${base}/humanizer`)
  const ctx = new Context()
  try {
    await ctx.plugin(SkillRegistry).await()
    const fiber = ctx.plugin(humanizer)
    await fiber.await()
    const summaries = await ctx.skills.list()
    assert.ok(summaries.some(skill => skill.name === 'abinadwan-humanizer'))
    const skill = await ctx.skills.get('abinadwan-humanizer')
    assert.equal(skill.content, read('plugins/humanizer/SKILL.md').toString())
    await fiber.dispose()
    assert.ok(!(await ctx.skills.list()).some(skill => skill.name === 'abinadwan-humanizer'))
    await ctx.plugin(humanizer).await()
    assert.ok((await ctx.skills.list()).some(skill => skill.name === 'abinadwan-humanizer'))
  } finally {
    await ctx.fiber.dispose()
  }
})

test('actual Loader mounts all three subpaths from the bundle and toggles them independently', async () => {
  const [{ insert }] = parse(read('cordis.patch.yml').toString())
  const ctx = new Context()
  try {
    await ctx.plugin(SkillRegistry).await()
    await ctx.plugin(Loader, { baseUrl: root.href }).await()
    await ctx.loader.root.update(insert)
    await ctx.loader.await()
    const environment = ctx.loader.resolve('abinadwan-environment-context')
    const humanizer = ctx.loader.resolve('abinadwan-humanizer')
    const profile = ctx.loader.resolve('abinadwan-personal-profile')
    assert.ok(environment.fiber)
    assert.ok(humanizer.fiber)
    assert.equal(profile.fiber, undefined)
    assert.ok(await ctx.skills.get('abinadwan-humanizer'))
    await ctx.loader.update('abinadwan-humanizer', { disabled: true })
    await ctx.loader.await()
    assert.equal(await ctx.skills.get('abinadwan-humanizer'), undefined)
    assert.ok(environment.fiber, 'Environment remains mounted')
    await ctx.loader.update('abinadwan-personal-profile', { disabled: false })
    await ctx.loader.await()
    assert.ok(profile.fiber, 'scaffold can be enabled independently')
    assert.equal(await ctx.skills.get('abinadwan-humanizer'), undefined)
    await ctx.loader.update('abinadwan-humanizer', { disabled: false })
    await ctx.loader.await()
    assert.ok(await ctx.skills.get('abinadwan-humanizer'))
    await ctx.loader.update('abinadwan-suite', { disabled: true })
    await ctx.loader.await()
    assert.equal(await ctx.skills.get('abinadwan-humanizer'), undefined)
    assert.equal(environment.disabled, true)
    assert.equal(profile.disabled, false, 'top-level Profile independent of group; bundle selection governs all rows')
    assert.equal(environment.fiber.uid, null, 'disabled group releases the Environment fiber')
    await ctx.loader.update('abinadwan-personal-profile',{disabled:true})
    await ctx.loader.await()
    assert.equal(profile.disabled,true)
    assert.equal(profile.fiber.uid,null)
  } finally {
    await ctx.fiber.dispose()
  }
})
