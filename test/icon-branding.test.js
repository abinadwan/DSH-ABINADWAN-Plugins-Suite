import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { PNG } from 'pngjs'

const iconPaths = [
  'plugins/environment-context/icon.png',
  'plugins/humanizer/icon.png',
  'plugins/personal-profile/icon.png',
  'plugins/direct-chat/assets/png/icon-256.png',
  'plugins/conversation-lifecycle/assets/png/icon-256.png',
  'plugins/adaptive-reasoning/assets/png/icon-256.png',
]

test('all six component badges have valid, distinct transparent 256-pixel PNG artwork', () => {
  const digests = new Set()
  for (const path of iconPaths) {
    const bytes = readFileSync(new URL('../' + path, import.meta.url))
    assert.ok(bytes.length < 256 * 1024, path + ' exceeds DSH icon size budget')
    assert.equal(bytes.toString('hex', 0, 8), '89504e470d0a1a0a', path + ' is not PNG')
    const decoded = PNG.sync.read(bytes)
    assert.equal(decoded.width, 256, path + ' width')
    assert.equal(decoded.height, 256, path + ' height')
    assert.equal(decoded.data[3], 0, path + ' top-left corner must be transparent')
    assert.ok(decoded.data[((128 * 256 + 128) * 4) + 3] >= 250, path + ' center must be visually opaque')
    let hasOpaque = false
    for (let i = 3; i < decoded.data.length; i += 4) {
      if (decoded.data[i] === 255) { hasOpaque = true; break }
    }
    assert.ok(hasOpaque, path + ' must retain fully opaque foreground pixels')
    digests.add(createHash('sha256').update(bytes).digest('hex'))
  }
  assert.equal(digests.size, iconPaths.length, 'every component must have distinct artwork')
})
