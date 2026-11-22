import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { PNG } from 'pngjs'

const pluginIds = [
  'environment-context', 'humanizer', 'personal-profile',
  'direct-chat', 'conversation-lifecycle', 'adaptive-reasoning',
]
const sizes = [32, 64, 128, 256, 512]
const read = path => readFileSync(new URL('../' + path, import.meta.url))
const { exports: packageExports } = JSON.parse(read('package.json'))

test('all six components ship distinct, transparent badges at the five supported sizes', () => {
  const digests = new Set()
  for (const id of pluginIds) {
    for (const size of sizes) {
      const path = 'plugins/' + id + '/assets/png/icon-' + size + '.png'
      const bytes = read(path)
      const { data, width, height } = PNG.sync.read(bytes)
      assert.equal(width, size, path + ' width')
      assert.equal(height, size, path + ' height')
      for (const pixel of [0, size - 1, size * (size - 1), size * size - 1]) {
        assert.equal(data[pixel * 4 + 3], 0, path + ' corners must be transparent')
      }
      assert.equal(data[((size / 2 * size + size / 2) * 4) + 3], 255, path + ' center must be opaque')
      if (size === 256) {
        assert.ok(bytes.length < 256 * 1024, path + ' exceeds DSH icon size budget')
        assert.deepEqual(read(packageExports['./' + id + '/icon']), bytes, id + ' export differs from 256 px badge')
        digests.add(createHash('sha256').update(bytes).digest('hex'))
      }
    }
  }
  assert.equal(digests.size, pluginIds.length, 'every component must have distinct artwork')
})