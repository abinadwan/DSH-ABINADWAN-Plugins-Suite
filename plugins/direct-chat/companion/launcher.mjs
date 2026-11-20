// Starts one confined Direct Chat companion and mirrors its exit code. It never writes to stdout or
// reads stdin: those pipes belong to the confined child. Any failure exits with code 86 and no child.
import { existsSync } from 'node:fs'
import { bind, ensureProfile, grant, launch, revoke, wait } from './appcontainer.js'
import { assertGrantable, readManifest, sameGrant, writeManifest } from './grants.js'

const CONFINEMENT_FAILED = 86
let api
try {
  const config = JSON.parse(Buffer.from(process.argv[2] ?? '', 'base64url').toString('utf8'))
  if (!/^abinadwan\.direct-chat\.[0-9a-f]{32}$/.test(config.profile ?? '') || typeof config.state !== 'string') {
    throw new Error('A per-storage profile and Host state folder are required')
  }
  api = bind(config.runtime)
  const profile = ensureProfile(api, config.profile)
  const wanted = [...config.read.map(path => [path, 'RX']), ...config.write.map(path => [path, 'M'])]
    .map(([path, rights]) => ({ path: assertGrantable(path), rights, sid: profile.sid, profile: config.profile }))
  // Record every grant before applying it, and withdraw this profile's grants that this launch no longer needs.
  const manifest = readManifest(config.state)
  for (const entry of manifest.grants) {
    if (entry.sid === profile.sid && !wanted.some(grantee => sameGrant(grantee, entry)) && existsSync(entry.path)) {
      revoke(entry.path, entry.sid)
    }
  }
  const kept = manifest.grants.filter(entry => entry.sid !== profile.sid && existsSync(entry.path))
  writeManifest(config.state, { grants: [...kept, ...wanted] })
  for (const { path, rights } of wanted) grant(path, profile.sid, rights)
  const child = launch(api, { ...config, appContainerSid: profile.pointer, packageSid: profile.sid })
  api.FreeSid(profile.pointer)
  process.stderr.write(`[Direct Chat confinement] pid=${child.pid} sid=${profile.sid} lpac=${config.lpac} desktop=${child.desktopName}\n`)
  const code = await wait(api, child.process)
  api.CloseHandle(child.process)
  api.CloseHandle(child.job)
  api.CloseDesktop(child.desktop)
  process.exit(code)
} catch (error) {
  process.stderr.write(`[Direct Chat confinement] ${error?.message ?? error}\n`)
  process.exit(CONFINEMENT_FAILED)
}
