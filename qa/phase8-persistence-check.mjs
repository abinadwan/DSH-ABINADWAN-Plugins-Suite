// Phase 8 persistence checks with the runtime's own profile-patch tooling (synthetic
// values, temporary directory only). Run against an exact runtime:
//   ABINADWAN_TEST_RUNTIME=<rc dir> node --import ./qa/runtime-resolve.mjs --test qa/phase8-persistence-check.mjs
//
// The Harness Settings writer (dsh-config-editor) owns the file: it serializes the
// record with `yaml`, writes with dsh-atomic-write under a file lock, rolls back on a
// failed reconcile, and the Loader reads it back with js-yaml + entryListSchema. This
// check reproduces that write/read path, a Host restart and corrupted input.
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseDocument } from 'yaml'
import yaml from 'js-yaml'
import { entryListSchema } from '@deepseek-ai/cordis-plugin-include'
import { withFileLock, writeFileAtomic } from '@deepseek-ai/dsh-atomic-write'
import { Context, Service } from '@deepseek-ai/cordis'
import { isVolatile } from '@deepseek-ai/cosmokit'
import * as profile from '../plugins/personal-profile/index.js'
import { SECTION_NAME } from '../plugins/personal-profile/preferences.js'

const ID = 'abinadwan-personal-profile-qa'
/** Synthetic record whose strings stress YAML quoting and scalars. */
function tricky() {
  const r = profile.emptyRecord()
  r.locale = 'en'
  r.information = { preferredName: 'SYNTHETIC: "Name" # not a comment', nationality: 'yes', gender: 'female' }
  r.preferences.style = 'technical'
  r.preferences.custom = 'null\n  indented: line\n\n- not a list\n{{literal}} 0x10 ~ اختبار'
  return r
}
async function save(path, record) {
  await withFileLock(path, async () => {
    let before = '[]'
    try { before = await readFile(path, 'utf8') } catch {}
    const document = parseDocument(before)
    document.contents.flow = false
    document.add(document.createNode({ id: ID, name: '@abinadwan/dsh-plugins-suite/personal-profile', config: { record } }))
    await writeFileAtomic(path, String(document), { mode: 384 })
  })
}
async function load(path) {
  const rows = yaml.load(await readFile(path, 'utf8'), { schema: entryListSchema })
  const config = rows.findLast(row => row.id === ID).config
  const value = profile.Config(config).record
  return JSON.parse(JSON.stringify(isVolatile(value) ? value.get() : value))
}
class Registry extends Service {
  sections = new Map()
  constructor(ctx) { super(ctx, 'systemPrompt') }
  section(s) { this.sections.set(s.name, s); return this.ctx.effect(() => () => this.sections.delete(s.name)) }
}
const eligible = () => {
  const agent = { session: { header: {} }, options: {} }
  return { agent, scope: agent, signal: new AbortController().signal, modelSelection: { provider: 'p', model: 'm' } }
}

test('the record survives the native atomic write, a reload and a Host restart unchanged', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'p8-persist-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  const path = join(dir, 'profile.yml')
  const record = tricky()
  await save(path, record)
  const reloaded = await load(path)
  assert.deepEqual(reloaded, record, 'every value, permission and switch round-trips exactly')
  // Restart: a new Host context mounts the plugin from the reloaded configuration.
  for (let restart = 0; restart < 2; restart++) {
    const stored=restart===0 ? { ...record, version: 2, policies:profile.emptyPolicies(),preferences:{...record.preferences,sendCustom:true},allowPersonalInformation:true,allowCloud:true } : record
    await save(path, stored)
    assert.deepEqual(await load(path), stored)
    const ctx = new Context()
    try {
      await ctx.plugin(Registry).await()
      await ctx.plugin(profile, { record: await load(path) }).await()
      assert.match(ctx.systemPrompt.sections.get(SECTION_NAME).text(eligible()), /\{\{literal\}\} 0x10/)
      const text=ctx.systemPrompt.sections.get(SECTION_NAME).text(eligible())
      if(restart===0)assert.doesNotMatch(text,/SYNTHETIC/)
      else assert.match(text,/SYNTHETIC/)
      assert.doesNotMatch(ctx.systemPrompt.sections.get(SECTION_NAME).text(eligible()), /SYNTHETIC/)
    } finally { await ctx.fiber.dispose() }
  }
  // A later save of a revoked record wins on reload.
  await save(path, profile.emptyRecord())
  assert.deepEqual(await load(path),profile.emptyRecord())
})

test('corrupted or tampered stored data is rejected and shares nothing', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'p8-corrupt-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  const path = join(dir, 'profile.yml')
  await save(path, tricky())
  const good = await readFile(path, 'utf8')
  // Truncated file: the loader cannot parse it, so no record is produced.
  await writeFile(path, good.slice(0, Math.floor(good.length / 2)) + '\n  - "unterminated')
  await assert.rejects(load(path))
  // Well-formed YAML with invalid values: the Host schema refuses the record.
  for (const bad of [{ ...tricky(), version: 2, allowPersonalInformation:true, allowCloud: 'yes' }, { ...tricky(), information: {...tricky().information,gender:'always'} },
    { ...tricky(), information: { ...tricky().information, preferredName: 'x'.repeat(129) } }]) {
    await writeFile(path, good)
    await save(path, bad)
    assert.throws(() => profile.Config({ record: bad }))
  }
  // A plugin mounted with an unreadable record contributes nothing (fail closed).
  const ctx = new Context()
  try {
    await ctx.plugin(Registry).await()
    const fiber = ctx.plugin(profile, { record: { ...tricky(), version: 2, allowPersonalInformation:true, allowCloud: 'yes' } })
    await fiber.await().catch(() => {})
    for (const section of ctx.systemPrompt.sections.values()) assert.doesNotMatch(section.text(eligible()), /SYNTHETIC/)
  } finally { await ctx.fiber.dispose() }
})
