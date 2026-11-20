import { spawn } from 'node:child_process'
import { lstatSync, realpathSync } from 'node:fs'
import { appendFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { streamPort } from './channel.js'
import { assertStateFolder, profileNameFor } from './grants.js'

export const CONFINEMENT_FAILED = 86
const app = dirname(fileURLToPath(import.meta.url))

/**
 * Start the Direct Chat companion inside an AppContainer (LPAC with only `registryRead`) whose profile
 * belongs to this storage root alone. The child can read `node`, `runtime` and this fixture, can modify
 * only `home`, has no network capability, cannot start processes, and talks to the parent only over its
 * inherited stdio pipes. `state` is a Host-owned folder outside `home` that holds the grant manifest and
 * diagnostics, so the parent never writes into child-writable storage. There is no unconfined fallback:
 * if confinement fails the launcher exits with CONFINEMENT_FAILED.
 */
export function startCompanion({ node, runtime, home, state, diagnostics, lpac = true, jobMemoryLimit = 1024 * 1024 * 1024 }) {
  // The confined worker trusts that every ancestor of `home` is a real directory (see worker.js).
  if (!lstatSync(home).isDirectory() || realpathSync.native(home) !== resolve(home)) {
    throw new Error('Direct Chat storage must be an existing canonical directory without reparse points')
  }
  const hostState = assertStateFolder(state, resolve(home))
  const { SystemRoot, WINDIR } = process.env
  const config = {
    runtime, exe: node, cwd: home, lpac, capabilities: lpac ? ['registryRead'] : [], jobMemoryLimit,
    profile: profileNameFor(home), state: hostState,
    read: [dirname(node), runtime, app], write: [home],
    args: ['--preserve-symlinks', '--preserve-symlinks-main', join(app, 'worker.js')],
    env: {
      SystemRoot, WINDIR, LOCALAPPDATA: home, DSH_HOME: home, HOME: home, USERPROFILE: home, TMP: home, TEMP: home,
      ABINADWAN_D2_RUNTIME: runtime, ABINADWAN_D2_TRANSPORT: 'stdio',
      ...(diagnostics ? { ABINADWAN_D2_DIAGNOSTICS: '1' } : {}),
    },
  }
  // The unconfined launcher sees only the folders its grant guard protects.
  const guarded = ['USERPROFILE', 'ProgramFiles', 'ProgramFiles(x86)', 'ProgramData', 'LOCALAPPDATA', 'APPDATA']
  const proc = spawn(node, [join(app, 'launcher.mjs'), Buffer.from(JSON.stringify(config)).toString('base64url')], {
    cwd: home, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
    env: { SystemRoot, WINDIR, ...Object.fromEntries(guarded.filter(key => process.env[key]).map(key => [key, process.env[key]])) },
  })
  // stderr is shared by the launcher and the confined child. Always drain it so neither blocks.
  proc.stderr.on('data', chunk => {
    if (diagnostics) void appendFile(join(hostState, 'diagnostics.log'), chunk).catch(() => {})
  })
  const port = streamPort(proc.stdout, proc.stdin)
  const exited = new Promise(resolve => proc.once('exit', (code, signal) => resolve([code, signal])))
  return { proc, port, exited }
}
