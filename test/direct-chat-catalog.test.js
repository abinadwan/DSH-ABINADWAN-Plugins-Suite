import assert from 'node:assert/strict'
import { lstat, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { findWorkspace } from '../plugins/direct-chat/catalog.js'

test('Direct Chat catalog uses the canonical registration, never names or creates a directory', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-direct-catalog-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const data = join(root, 'abinadwan-direct-chat-data')
  const path = join(data, 'Direct Chat')
  const decoy = { id: 'project', title: 'Direct Chat', path: join(root, 'elsewhere') }
  assert.equal(await findWorkspace(root, () => [decoy]), null)
  await assert.rejects(lstat(data), { code: 'ENOENT' })
  await mkdir(path, { recursive: true, mode: 0o700 })
  // Workspace Registry canonicalizes this exact directory with fs.realpath.
  const matching = { id: 'authorized', title: 'Renamed', path: await realpath(path) }
  assert.equal(await findWorkspace(root, () => [decoy, matching]), matching.id)
  await assert.rejects(findWorkspace(root, () => [matching, { ...matching, id: 'ambiguous' }]))
})

test('a redirected Direct Chat directory is refused on POSIX and Windows', async t => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-direct-redirect-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const outside = join(root, 'unrelated-project')
  const data = join(root, 'abinadwan-direct-chat-data')
  await mkdir(join(outside, 'Direct Chat'), { recursive: true })
  await symlink(outside, data, process.platform === 'win32' ? 'junction' : 'dir')
  await assert.rejects(findWorkspace(root, () => [{ id: 'project', path: join(outside, 'Direct Chat') }]))
})


test('separate synthetic Session IDs sharing one cwd can read the same file', async t => {
  const root = await mkdtemp(join(tmpdir(), 'suite-shared-cwd-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const first = { id: 'fictional-one', cwd: root }
  const second = { id: 'fictional-two', cwd: root }
  await writeFile(join(first.cwd, 'fixture.txt'), 'fictional shared file')
  assert.notEqual(first.id, second.id)
  assert.equal(await readFile(join(second.cwd, 'fixture.txt'), 'utf8'), 'fictional shared file')
})
