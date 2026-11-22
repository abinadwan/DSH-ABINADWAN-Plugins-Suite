// One permanent DSH Workspace; every non-blank chat is a distinct native Session.
// Session history isolation does not constitute process or filesystem isolation.
import { realpathSync } from 'node:fs'
import { mkdir, realpath } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, sep } from 'node:path'
import { registerCatalog } from './catalog.js'
import { checkedDirectory, directoryName, pathKey, workspaceName } from './workspace-path.js'

export const name = 'abinadwan-direct-chat'
export const inject = ['profileContext', 'connection', 'tools']

const route = '/api/abinadwan-direct-chat/prepare'
const noStore = { 'cache-control': 'no-store' }
const responseError = (code, status) => Response.json({ code }, { status, headers: noStore })

function isDirectChatCwd(cwd, roots) {
  const key = pathKey(cwd)
  if (key === undefined) return false
  const underProtectedRoot = value => [...roots].some(root =>
    root !== undefined && (value === root || value.startsWith(root + sep)))
  if (underProtectedRoot(key)) return true
  // A Workspace cwd may alias the protected root through a symlink/junction.
  // Walk to its closest existing ancestor: the final cwd may be a not-yet-
  // created child, but tools unrelated to filesystem access must still be denied.
  const suffix = []
  let probe = cwd
  // Walk to the filesystem root instead of stopping after an arbitrary depth.
  // An aliased Workspace with a deep not-yet-created suffix must never bypass
  // the tool guard merely because the missing path has many components.
  for (;;) {
    try {
      const canonical = pathKey(join(realpathSync.native(probe), ...suffix))
      return canonical !== undefined && underProtectedRoot(canonical)
    } catch (error) {
      if (error?.code !== 'ENOENT') return false
      const parent = dirname(probe)
      if (parent === probe) return false
      suffix.unshift(basename(probe))
      probe = parent
    }
  }
  return false
}
function denyTools(roots) {
  return ({ agent }) => isDirectChatCwd(agent?.session?.header.cwd, roots)
    ? { reason: 'Direct chats do not run tools.', info: { name: 'DirectChatPolicy', code: 'DIRECT_CHAT_TOOL_DENIED' } }
    : undefined
}
async function ensureDirectory(path) {
  // Restrict newly created directories on POSIX; existing directories are not chmod'ed.
  await mkdir(path, { recursive: true, mode: 0o700 })
  return checkedDirectory(path)
}
async function prepareWorkspace(profileDir, roots) {
  const profile = await realpath(profileDir)
  const dataRoot = await ensureDirectory(join(profile, directoryName))
  // Guard both existing legacy session-* paths and the new permanent Workspace.
  roots.add(pathKey(dataRoot))
  return ensureDirectory(join(dataRoot, workspaceName))
}
export function apply(ctx) {
  const profileDir = ctx.profileContext.dir
  if (!profileDir || !isAbsolute(profileDir)) throw new Error('Direct Chat requires a persistent DSH profile.')
  const roots = new Set([pathKey(join(profileDir, directoryName))])
  // Windows may supply the Profile under an 8.3 short path (RUNNER~1),
  // whereas realpathSync.native(cwd) expands it (runneradmin). Protect both
  // spellings even before the first Workspace prepare call.
  try {
    roots.add(pathKey(join(realpathSync.native(profileDir), directoryName)))
  } catch {
    // The prepare route separately verifies the canonical Profile directory.
  }
  const deny = denyTools(roots)
  ctx.on('tools/pre-execute', (exec, next) => {
    const denial = deny(exec)
    return denial === undefined ? next() : Promise.resolve({ kind: 'deny', ...denial })
  }, { prepend: true })
  ctx.effect(() => ctx.tools.guard(deny), 'direct-chat: deny tools for all Direct Chat Sessions')
  ctx.effect(() => ctx.connection.fetch.register({
    path: route, methods: ['POST'], requestBody: 'buffered',
    async fetch(request) {
      if (request.headers.get('content-type') !== 'application/json' || await request.text() !== '{}') {
        return responseError('DIRECT_CHAT_BAD_REQUEST', 400)
      }
      try {
        request.signal.throwIfAborted()
        const path = await prepareWorkspace(profileDir, roots)
        return Response.json({ path }, { headers: noStore })
      } catch (error) {
        // Filesystem exception messages can reveal the user's absolute Profile path.
        // Log only a known error code, never the exception or its stack/message.
        const reason = ['EACCES', 'EPERM', 'EEXIST', 'ENOTDIR', 'ENOENT', 'ELOOP'].includes(error?.code)
          ? error.code : 'unknown'
        ctx.logger.warn('Direct Chat: permanent Workspace preparation failed (%s)', reason)
        return responseError('DIRECT_CHAT_PREPARE_FAILED', 500)
      }
    },
  }), 'direct-chat: prepare one permanent native Workspace')
  registerCatalog(ctx, profileDir)
}
