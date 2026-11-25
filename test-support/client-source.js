import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

export const browserSource = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
export function browserSection(startMarker, endMarker, expression) {
  const start = browserSource.indexOf(startMarker)
  const end = browserSource.indexOf(endMarker, start + startMarker.length)
  assert.ok(start >= 0 && end > start, 'Missing browser section: ' + startMarker)
  return runInNewContext(browserSource.slice(start, end) + '\n' + expression)
}
export const { catalogReady, conversationInventory } = browserSection(
  '    const catalogReady =', '    const archiveCopy =', '({ catalogReady, conversationInventory })')
