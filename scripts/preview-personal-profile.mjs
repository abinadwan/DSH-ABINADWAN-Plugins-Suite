// Development-only. Serves an exact allowlist on loopback, never a Host endpoint.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
const base = '/test-support/personal-profile-ui/'
const allowed = new Map(['index.html', 'entry.js', 'app.js', 'state.js', 'messages.js', 'style.css'].map(name => [base + name, 'test-support/personal-profile-ui/' + name]))
for (const name of ['limits', 'schema']) allowed.set(`/plugins/personal-profile/core/${name}.js`, `plugins/personal-profile/core/${name}.js`)
const types = { html: 'text/html', js: 'text/javascript', css: 'text/css' }
export function createPreviewServer() {
  return createServer(async (req, res) => {
    if (req.url === '/') { res.writeHead(302, { Location: base + 'index.html' }); res.end(); return }
    const path = req.url
    const file = allowed.get(path)
    res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; img-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'none'")
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    if (!file || req.method !== 'GET') { res.writeHead(404); res.end('Not found'); return }
    try { res.setHeader('Content-Type', types[file.split('.').pop()]); res.end(await readFile(new URL('../' + file, import.meta.url))) }
    catch { res.writeHead(404); res.end('Not found') }
  })
}
// Root redirects to the canonical module-relative entry path.
if (process.argv[1]?.endsWith('preview-personal-profile.mjs')) {
  const server = createPreviewServer()
  server.listen(4174, '127.0.0.1', () => console.log('Synthetic preview: http://127.0.0.1:4174/test-support/personal-profile-ui/index.html'))
}
