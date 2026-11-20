// Starts one confined Direct Chat companion and mirrors its exit code. It never writes to stdout or
// reads stdin: those pipes belong to the confined child. Any failure exits with code 86 and no child.
import { bind, ensureProfile, grant, launch, wait } from './appcontainer.js'

const CONFINEMENT_FAILED = 86
let api
try {
  const config = JSON.parse(Buffer.from(process.argv[2] ?? '', 'base64url').toString('utf8'))
  api = bind(config.runtime)
  const profile = ensureProfile(api)
  for (const path of config.read) grant(path, profile.sid, 'RX')
  for (const path of config.write) grant(path, profile.sid, 'M')
  const child = launch(api, { ...config, appContainerSid: profile.pointer, packageSid: profile.sid })
  api.FreeSid(profile.pointer)
  process.stderr.write(`[Direct Chat confinement] pid=${child.pid} sid=${profile.sid} lpac=${config.lpac}\n`)
  const code = await wait(api, child.process)
  api.CloseHandle(child.process)
  api.CloseHandle(child.job)
  api.CloseDesktop(child.desktop)
  process.exit(code)
} catch (error) {
  process.stderr.write(`[Direct Chat confinement] ${error?.message ?? error}\n`)
  process.exit(CONFINEMENT_FAILED)
}
