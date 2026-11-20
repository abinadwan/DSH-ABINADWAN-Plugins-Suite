// Starts one confined Direct Chat companion and mirrors its exit code. It never writes to stdout or
// reads stdin: those pipes belong to the confined child. Any failure exits with code 86 and no child.
import { existsSync } from 'node:fs'
import { bind, ensureProfile, grant, launch, revoke, wait } from './appcontainer.js'
import { assertGrantTree, readManifest, sameGrant, writeManifest } from './grants.js'
import { bindStorage } from './storage-lease.js'

const CONFINEMENT_FAILED = 86
let api
let ownership
const local = []
let sid
try {
  const config = JSON.parse(Buffer.from(process.argv[2] ?? '', 'base64url').toString('utf8'))
  if (!/^abinadwan\.direct-chat\.[0-9a-f]{32}$/.test(config.profile ?? '') || typeof config.state !== 'string') {
    throw new Error('A per-storage profile and Host state folder are required')
  }
  const io = bindStorage(config.runtime)
  if (config.ownership) ownership = io.receive(config.ownership)
  else {
    // Isolated native checks can run the launcher directly.
    local.push(io.claim(config.state))
    local.push(io.claim(config.cwd))
    ownership = io.receive(io.transfer(local))
  }
  api = bind(config.runtime)
  const targets = [...config.read.map(path => [path, 'RX']), ...config.write.map(path => [path, 'M'])]
    .map(([path, rights]) => ({ path, rights, key: assertGrantTree(path, io), profile: config.profile }))
  const manifest = readManifest(config.state)
  if (!manifest.profiles.includes(config.profile)) {
    manifest.profiles.push(config.profile)
    // A failure during profile creation or SID conversion still leaves a cleanup record.
    writeManifest(config.state, manifest, io)
  }
  const profile = ensureProfile(api, config.profile)
  sid = profile.pointer
  const wanted = targets.map(target => ({ ...target, sid: profile.sid }))
  for (const entry of manifest.grants) {
    if (entry.profile === config.profile && !wanted.some(grantee => sameGrant(grantee, entry)) && existsSync(entry.path)) {
      if (entry.key && assertGrantTree(entry.path, io) !== entry.key) throw new Error('A previous grant target has changed.')
      revoke(entry.path, entry.sid)
    }
  }
  const kept = manifest.grants.filter(entry => entry.profile !== config.profile)
  writeManifest(config.state, { profiles: manifest.profiles, grants: [...kept, ...wanted] }, io)
  for (const { path, rights } of wanted) grant(path, profile.sid, rights)
  const child = launch(api, { ...config, appContainerSid: profile.pointer, packageSid: profile.sid,
    ownershipHandles: ownership.inherited })
  process.stderr.write(`[Direct Chat confinement] pid=${child.pid} sid=${profile.sid} lpac=${config.lpac} desktop=${child.desktopName}\n`)
  const code = await wait(api, child.process)
  api.CloseHandle(child.process)
  api.CloseHandle(child.job)
  api.CloseDesktop(child.desktop)
  process.exitCode = code
} catch (error) {
  process.stderr.write(`[Direct Chat confinement] ${error?.message ?? error}\n`)
  process.exitCode = CONFINEMENT_FAILED
} finally {
  if (sid) api.FreeSid(sid)
  ownership?.close()
  for (const lease of local.reverse()) lease.close()
}
