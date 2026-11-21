// One permanent DSH Workspace; every non-blank chat is a distinct native Session.
// Session history isolation does not constitute process or filesystem isolation.
import { lstat, mkdir, realpath } from 'node:fs/promises'
import { isAbsolute, join, normalize, sep } from 'node:path'

export const name = 'abinadwan-direct-chat'
export const inject = ['profileContext', 'connection', 'tools']

const route = '/api/abinadwan-direct-chat/prepare'
const directoryName = 'abinadwan-direct-chat-data'
const workspaceName = 'Direct Chat'

function pathKey(path) {
  if (typeof path !== 'string' || !isAbsolute(path)) return undefined
  const normalized = normalize(path)
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized
}
function isDirectChatCwd(cwd, roots) {
  const key = pathKey(cwd)
  if (key === undefined) return false
  return [...roots].some(root => root !== undefined && (key === root || key.startsWith(root + sep)))
}
function denyTools(roots) {
  return ({ agent }) => isDirectChatCwd(agent?.session?.header.cwd, roots)
    ? { reason: 'Direct chats do not run tools.', info: { name: 'DirectChatPolicy', code: 'DIRECT_CHAT_TOOL_DENIED' } }
    : undefined
}
async function checkedDirectory(path) {
  await mkdir(path, { recursive: true })
  const [stat, canonical] = await Promise.all([lstat(path), realpath(path)])
  if (!stat.isDirectory() || stat.isSymbolicLink() || pathKey(canonical) !== pathKey(path)) {
    throw new Error('The Direct Chat directory is not a dedicated profile-owned directory.')
  }
  return canonical
}
async function prepareWorkspace(profileDir, roots) {
  const profile = await realpath(profileDir)
  const dataRoot = await checkedDirectory(join(profile, directoryName))
  // Guard both existing legacy session-* paths and the new permanent Workspace.
  roots.add(pathKey(dataRoot))
  return checkedDirectory(join(dataRoot, workspaceName))
}
export function apply(ctx) {
  const profileDir = ctx.profileContext.dir
  if (!profileDir || !isAbsolute(profileDir)) throw new Error('Direct Chat requires a persistent DSH profile.')
  const roots = new Set([pathKey(join(profileDir, directoryName))])
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
        return Response.json({ code: 'DIRECT_CHAT_BAD_REQUEST' }, { status: 400 })
      }
      try {
        request.signal.throwIfAborted()
        const path = await prepareWorkspace(profileDir, roots)
        return Response.json({ path }, { headers: { 'cache-control': 'no-store' } })
      } catch (error) {
        ctx.logger.warn('Direct Chat: permanent Workspace preparation failed: %s', String(error))
        return Response.json({ code: 'DIRECT_CHAT_PREPARE_FAILED' }, { status: 500 })
      }
    },
  }), 'direct-chat: prepare one permanent native Workspace')
}
