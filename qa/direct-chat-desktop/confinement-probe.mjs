// Runs inside the AppContainer. Attempts each operation and reports the outcome on stdout as one JSON line.
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { connect } from 'node:net'
import { linkSync, symlinkSync } from 'node:fs'
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
// Links planted in its own storage could redirect a parent that later touches that storage.
await attempt('deniedJunction', async () => symlinkSync(plan.deniedDirs[0], join(plan.home, 'planted-junction'), 'junction'))
await attempt('deniedHardlink', async () => linkSync(plan.deniedReads[0], join(plan.home, 'planted-hardlink')))
await attempt('deniedSymlink', async () => symlinkSync(plan.deniedReads[0], join(plan.home, 'planted-symlink'), 'file'))
// The private desktop hides the user's screen and windows. Only counts are reported, never pixels or titles.
await attempt('deniedScreen', async () => {
  const koffi = createRequire(join(plan.runtime, 'package.json'))('koffi')
  const user32 = koffi.load('user32.dll'), gdi32 = koffi.load('gdi32.dll')
  const dc = user32.func('void * __stdcall GetDC(void *)')(null)
  if (!dc) throw new Error('no screen')
  const GetPixel = gdi32.func('uint32 __stdcall GetPixel(void *, int, int)')
  let readable = 0
  for (let index = 0; index < 16; index++) if (GetPixel(dc, 40 + index * 60, 300) !== 0xffffffff) readable++
  user32.func('int __stdcall ReleaseDC(void *, void *)')(null, dc)
  if (readable === 0) throw new Error('no pixels')
  return readable
})
await attempt('deniedWindows', async () => {
  const koffi = createRequire(join(plan.runtime, 'package.json'))('koffi')
  const user32 = koffi.load('user32.dll')
  const Proc = koffi.proto('bool __stdcall DirectChatEnumProc(void *, intptr_t)')
  const EnumWindows = user32.func('bool __stdcall EnumWindows(DirectChatEnumProc *, intptr_t)')
  let count = 0
  const callback = koffi.register(() => { count++; return true }, koffi.pointer(Proc))
  try { if (!EnumWindows(callback, 0) || count === 0) throw new Error('no windows') } finally { koffi.unregister(callback) }
  return count
})
await attempt('deniedClipboard', async () => {
  const koffi = createRequire(join(plan.runtime, 'package.json'))('koffi')
  const user32 = koffi.load('user32.dll')
  if (!user32.func('bool __stdcall OpenClipboard(void *)')(null)) throw new Error('clipboard closed')
  try {
    const data = user32.func('void * __stdcall GetClipboardData(uint32)')
    if (!data(13) && !data(1)) throw new Error('no clipboard data')
    return 'data handle'
  } finally { user32.func('bool __stdcall CloseClipboard()')() }
})
await attempt('env', async () => Object.keys(process.env).sort())
process.stdout.write(JSON.stringify(results) + '\n')
