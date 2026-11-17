// Test-only: install a DOM before react-dom is evaluated, so React detects
// native `input` events as a browser would. Import this before react-dom.
import { JSDOM } from 'jsdom'
if (globalThis.document === undefined) {
  const dom = new JSDOM('<!doctype html>', { url: 'http://localhost/' })
  globalThis.window = dom.window
  globalThis.document = dom.window.document
}
