// Direct Chat experimental native Workspace bridge.
// A fresh temporary Workspace keeps DSH's blank-session composer available.
// Its registration can be removed after the first accepted prompt; this is
// NOT a hidden Workspace API, process sandbox, or production-ready isolation.
import { lstat, mkdir, mkdtemp, realpath } from 'node:fs/promises'
import { isAbsolute, join, normalize, sep } from 'node:path'

export const name = 'abinadwan-direct-chat'
export const inject = ['profileContext', 'connection', 'tools']

const route = '/api/abinadwan-direct-chat/prepare'
const directoryName = 'abinadwan-direct-chat-data'

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

function directChatDenial(roots) {
  return ({ agent }) => isDirectChatCwd(agent?.session?.header.cwd, roots)
    ? { reason: 'Direct chats do not run tools.', info: { name: 'DirectChatPolicy', code: 'DIRECT_CHAT_TOOL_DENIED' } }
    : undefined
}

async function provisionSessionDirectory(profileDir, roots) {
  const canonicalProfile = await realpath(profileDir)
  const root = join(canonicalProfile, directoryName)
  await mkdir(root, { recursive: true })
  const stat = await lstat(root)
  const canonicalRoot = await realpath(root)
  if (!stat.isDirectory() || stat.isSymbolicLink() || pathKey(canonicalRoot) !== pathKey(root)) {
    throw new Error('The Direct Chat data root is not a dedicated profile directory.')
  }
  roots.add(pathKey(root))
  const path = await mkdtemp(join(root, 'session-'))
  const sessionStat = await lstat(path)
  if (!sessionStat.isDirectory() || sessionStat.isSymbolicLink() ||
      !isDirectChatCwd(await realpath(path), roots)) {
    throw new Error('The Direct Chat session directory is invalid.')
  }
  return path
}

export function apply(ctx) {
  const profileDir = ctx.profileContext.dir
  if (!profileDir || !isAbsolute(profileDir)) throw new Error('Direct Chat requires a persistent DSH profile.')
  // Include the lexical path to protect sessions created by the previous PoC.
  const roots = new Set([pathKey(join(profileDir, directoryName))])
  const deny = directChatDenial(roots)
  ctx.on('tools/pre-execute', (exec, next) => {
    const denial = deny(exec)
    return denial === undefined ? next() : Promise.resolve({ kind: 'deny', ...denial })
  }, { prepend: true })
  ctx.effect(() => ctx.tools.guard(deny), 'direct-chat: deny tools for native sessions')
  ctx.effect(() => ctx.connection.fetch.register({
    path: route,
    methods: ['POST'],
    requestBody: 'buffered',
    async fetch(request) {
      if (request.headers.get('content-type') !== 'application/json' || await request.text() !== '{}') {
        return Response.json({ code: 'DIRECT_CHAT_BAD_REQUEST' }, { status: 400 })
      }
      try {
        request.signal.throwIfAborted()
        const path = await provisionSessionDirectory(profileDir, roots)
        return Response.json({ path }, { headers: { 'cache-control': 'no-store' } })
      } catch (error) {
        ctx.logger.warn('Direct Chat: session directory preparation failed: %s', String(error))
        return Response.json({ code: 'DIRECT_CHAT_PREPARE_FAILED' }, { status: 500 })
      }
    },
  }), 'direct-chat: prepare workspace-backed native session')
}
