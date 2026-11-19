import { spawn } from 'node:child_process'
import { lstatSync, realpathSync } from 'node:fs'
import { appendFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { streamPort } from './channel.js'

export const CONFINEMENT_FAILED = 86
const app = dirname(fileURLToPath(import.meta.url))

/**
 * Start the Direct Chat companion inside the per-user AppContainer (LPAC with only `registryRead`).
 * The child can read `node`, `runtime` and this fixture, can modify only `home`, has no network
 * capability, cannot start processes, and talks to the parent only over its inherited stdio pipes.
 * There is no unconfined fallback: if confinement fails the launcher exits with CONFINEMENT_FAILED.
 */
export function startCompanion({ node, runtime, home, diagnostics, lpac = true, jobMemoryLimit = 1024 * 1024 * 1024 }) {
  // The confined worker trusts that every ancestor of `home` is a real directory (see worker.js).
  if (!lstatSync(home).isDirectory() || realpathSync.native(home) !== resolve(home)) {
    throw new Error('Direct Chat storage must be an existing canonical directory without reparse points')
  }
  const { SystemRoot, WINDIR } = process.env
  const config = {
    runtime, exe: node, cwd: home, lpac, capabilities: lpac ? ['registryRead'] : [], jobMemoryLimit,
    read: [dirname(node), runtime, app], write: [home],
    args: ['--preserve-symlinks', '--preserve-symlinks-main', join(app, 'worker.js')],
    env: {
      SystemRoot, WINDIR, LOCALAPPDATA: home, DSH_HOME: home, HOME: home, USERPROFILE: home, TMP: home, TEMP: home,
      ABINADWAN_D2_RUNTIME: runtime, ABINADWAN_D2_TRANSPORT: 'stdio',
      ...(diagnostics ? { ABINADWAN_D2_DIAGNOSTICS: '1' } : {}),
    },
  }
  const proc = spawn(node, [join(app, 'launcher.mjs'), Buffer.from(JSON.stringify(config)).toString('base64url')], {
    cwd: home, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], env: { SystemRoot, WINDIR },
  })
  // stderr is shared by the launcher and the confined child. Always drain it so neither blocks.
  proc.stderr.on('data', chunk => {
    if (diagnostics) void appendFile(join(home, 'diagnostics.log'), chunk).catch(() => {})
  })
  const port = streamPort(proc.stdout, proc.stdin)
  const exited = new Promise(resolve => proc.once('exit', (code, signal) => resolve([code, signal])))
  return { proc, port, exited }
}
