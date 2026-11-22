import { lstat, realpath } from 'node:fs/promises'
import { join } from 'node:path'

export const directoryName = 'abinadwan-direct-chat-data'
export const workspaceName = 'Direct Chat'
const CREATION_LIMIT = 100

async function existingDirectory(path) {
  const stat = await lstat(path).catch(error => {
    if (error.code === 'ENOENT') return undefined
    throw error
  })
  if (!stat) return null
  if (!stat.isDirectory() || stat.isSymbolicLink() || await realpath(path) !== path) {
    throw new Error('direct-chat-directory-unavailable')
  }
  return path
}

// Only identity discovery. The native registry still owns membership and the
// tool guard still owns tool admission. This route never reads session logs.
export async function findWorkspace(profileDir, list) {
  return (await registeredWorkspace(profileDir, list))?.id ?? null
}

async function registeredWorkspace(profileDir, list) {
  const profile = await realpath(profileDir)
  const root = await existingDirectory(join(profile, directoryName))
  if (!root) return null
  const path = await existingDirectory(join(root, workspaceName))
  if (!path) return null
  const matches = list().filter(workspace => workspace.path === path)
  if (matches.length > 1) throw new Error('direct-chat-registration-ambiguous')
  return matches[0] ?? null
}

async function creationMetadata(workspace, persistence, signal) {
  const ids = [...workspace.sessionIds]
  if (ids.length > CREATION_LIMIT || !persistence) return null
  const entries = []
  for (let index = 0; index < ids.length; index += 8) {
    signal.throwIfAborted()
    const batch = await Promise.all(ids.slice(index, index + 8).map(async id => {
      const snapshot = await persistence.stat(id)
      const value = snapshot?.header
      return value?.id === id && Number.isSafeInteger(value.createdAt) && value.createdAt > 0 ? [id, value.createdAt] : null
    }))
    if (batch.includes(null)) return null
    entries.push(...batch)
  }
  return Object.fromEntries(entries)
}

export function registerCatalog(ctx, profileDir) {
  ctx.inject(['workspaceRegistry', 'sessionPersistence'], child => child.effect(() => child.connection.fetch.register({
    path: '/api/abinadwan-direct-chat/catalog', methods: ['GET'],
    async fetch(request) {
      const headers = { 'cache-control': 'no-store' }
      try {
        request.signal.throwIfAborted()
        const list = () => child.workspaceRegistry.list()
        const workspace = await registeredWorkspace(profileDir, list)
        let createdAt
        if (workspace && new URL(request.url).searchParams.get('order') === 'creation') {
          createdAt = await creationMetadata(workspace, child.sessionPersistence, request.signal)
          const latest = await registeredWorkspace(profileDir, list)
          if (latest?.id !== workspace.id || createdAt && (latest.sessionIds.length !== Object.keys(createdAt).length ||
              latest.sessionIds.some(id => !Object.hasOwn(createdAt, id)))) {
            return Response.json({ code: 'DIRECT_CHAT_CATALOG_CHANGED' }, { status: 409, headers })
          }
        }
        request.signal.throwIfAborted()
        return Response.json({ workspaceId: workspace?.id ?? null, createdAt }, { headers })
      } catch {
        return Response.json({ code: 'DIRECT_CHAT_CATALOG_UNAVAILABLE' }, { status: 503, headers })
      }
    },
  }), 'direct-chat: discover the registered native Workspace'))
}
