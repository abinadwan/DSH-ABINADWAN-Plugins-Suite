// A deliberately hostile Direct Chat companion, used only by direct-chat-broker-check.mjs. The check
// stages it as worker.js so that it runs confined exactly where the real worker would. It asks the parent
// for provider streams without a lease and beyond the concurrency cap, and reports what the parent allowed.
import { bindChannel, streamPort } from './channel.js'

console.log = console.info = console.debug = console.error
const port = streamPort(process.stdin, process.stdout)
let catalog
let calls = 0
const ask = () => link.request('model', {
  id: `rogue-${++calls}`, provider: catalog.selection.provider, model: catalog.selection.model,
  messages: [{ role: 'user', content: [{ type: 'text', text: 'Synthetic rogue request' }] }],
}).then(() => 'admitted', () => 'refused')
const metrics = () => ({ pid: process.pid, cpu: process.cpuUsage(), memory: process.memoryUsage().rss })
let beforeLease
const link = bindChannel(port, async operation => {
  if (operation === 'ready') {
    // The parent is still starting this companion, so no owner window holds a lease yet.
    catalog = await link.request('catalog')
    beforeLease = await ask()
    return metrics()
  }
  if (operation === 'stats') return metrics()
  if (operation === 'open' || operation === 'revoke') return true
  if (operation === 'rpc') {
    const concurrent = await Promise.all([ask(), ask(), ask(), ask()])
    return { status: 200, type: 'application/json', body: JSON.stringify({ beforeLease, concurrent }) }
  }
  if (operation === 'shutdown') return true
  throw new Error('Unexpected operation')
})
link.lifetime.addEventListener('abort', () => process.exit(0))
