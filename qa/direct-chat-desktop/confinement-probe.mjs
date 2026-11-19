// Runs inside the AppContainer. Attempts each operation and reports the outcome on stdout as one JSON line.
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { connect } from 'node:net'
import { readFile, writeFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const plan = JSON.parse(Buffer.from(process.argv[2], 'base64url').toString('utf8'))
const results = {}
async function attempt(name, action) {
  try { results[name] = { ok: true, value: await action() } }
  catch (error) { results[name] = { ok: false, code: error?.code ?? error?.message } }
}
function tcp(host, port) {
  return new Promise((resolve, reject) => {
    const socket = connect({ host, port, timeout: 3000 })
    socket.once('connect', () => { socket.destroy(); resolve('connected') })
    socket.once('timeout', () => { socket.destroy(); reject(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' })) })
    socket.once('error', reject)
  })
}

await attempt('readRuntime', async () => (await readFile(join(plan.runtime, 'package.json'), 'utf8')).length)
await attempt('writeHome', async () => { await writeFile(join(plan.home, 'probe.txt'), 'ok'); return 'written' })
await attempt('readHome', async () => readFile(join(plan.home, 'probe.txt'), 'utf8'))
for (const [index, path] of plan.deniedReads.entries()) await attempt(`deniedRead${index}`, async () => (await readFile(path)).length)
for (const [index, path] of plan.deniedDirs.entries()) await attempt(`deniedList${index}`, async () => (await readdir(path)).length)
for (const [index, path] of plan.deniedWrites.entries()) {
  await attempt(`deniedWrite${index}`, async () => { await writeFile(join(path, 'direct-chat-escape.txt'), 'x'); return 'written' })
}
await attempt('loopback', () => tcp('127.0.0.1', plan.loopbackPort))
await attempt('internet', () => tcp('1.1.1.1', 443))
// No stdio pipes: libuv 1.52.1 cannot create pipes inside an AppContainer and would spin (nodejs/node#66374).
await attempt('spawn', async () => {
  const result = spawnSync('cmd.exe', ['/c', 'type nul > escaped.txt'], { stdio: 'ignore', windowsHide: true })
  if (result.error) throw result.error
  return result.status
})
await attempt('koffi', async () => {
  const koffi = createRequire(join(plan.runtime, 'package.json'))('koffi')
  const kernel32 = koffi.load('kernel32.dll')
  return kernel32.func('uint32 __stdcall GetCurrentProcessId()')() === process.pid
})
await attempt('env', async () => Object.keys(process.env).sort())
process.stdout.write(JSON.stringify(results) + '\n')
