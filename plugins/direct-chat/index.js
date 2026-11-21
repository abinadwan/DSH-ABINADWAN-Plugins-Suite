// Direct Chat: host adapter from the Codex Global Chat proof of concept.
// Sessions and history remain native DSH records. No separate chat database.
// This is experimental; an internal Workspace registration and desktop composer
// gate still require acceptance testing before the component can ship enabled.
import { lstat, mkdir, realpath } from 'node:fs/promises'
import { isAbsolute, join, normalize } from 'node:path'

export const name = 'abinadwan-direct-chat'
export const inject = ['profileContext', 'connection', 'sessionController', 'sessionPersistence', 'tools']

const route = '/api/abinadwan-direct-chat/create'
const directoryName = 'abinadwan-direct-chat-data'

function pathKey(path) {
  if (typeof path !== 'string' || !isAbsolute(path)) return undefined
  const normalized = normalize(path)
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized
}

function directChatDenial(cwd) {
  const key = pathKey(cwd)
  return ({ agent }) => key !== undefined && pathKey(agent?.session?.header.cwd) === key
    ? { reason: 'Direct chats do not run tools.', info: { name: 'DirectChatPolicy', code: 'DIRECT_CHAT_TOOL_DENIED' } }
    : undefined
}

async function ensureChatDirectory(profileDir, cwd) {
  // Refuse a symlink/junction substituting the dedicated profile directory.
  const parent = await realpath(profileDir)
  await mkdir(cwd, { recursive: true })
  const entry = await lstat(cwd)
  const canonical = await realpath(cwd)
  if (!entry.isDirectory() || entry.isSymbolicLink() || pathKey(canonical) !== pathKey(join(parent, directoryName))) {
    throw new Error('The Direct Chat data directory is not a dedicated profile directory.')
  }
}

export function apply(ctx) {
  const profileDir = ctx.profileContext.dir
  if (!profileDir || !isAbsolute(profileDir)) throw new Error('Direct Chat requires a persistent DSH profile.')
  const cwd = join(profileDir, directoryName)
  const deny = directChatDenial(cwd)

  // Reject before approval and again at actual tool dispatch.
  ctx.on('tools/pre-execute', (exec, next) => {
    const denial = deny(exec)
    return denial === undefined ? next() : Promise.resolve({ kind: 'deny', ...denial })
  }, { prepend: true })
  ctx.effect(() => ctx.tools.guard(deny), 'direct-chat: deny tools in native chat sessions')

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
        await ensureChatDirectory(profileDir, cwd)
        request.signal.throwIfAborted()
        const { sessionId } = await ctx.sessionController.create({ cwd })
        // Persist blank sessions before informing the browser.
        await ctx.sessionPersistence.flush()
        return Response.json({ sessionId }, { headers: { 'cache-control': 'no-store' } })
      } catch (error) {
        ctx.logger.warn('Direct Chat: native session creation or durability check failed: %s', String(error))
        return Response.json({ code: 'DIRECT_CHAT_CREATE_UNCERTAIN' }, { status: 500 })
      }
    },
  }), 'direct-chat: create native chat session')
}
