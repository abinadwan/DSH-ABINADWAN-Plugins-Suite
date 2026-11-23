import { realpath } from 'node:fs/promises'
import { join } from 'node:path'
import { checkedDirectory, directoryName, workspaceName } from './workspace-path.js'

const CREATION_LIMIT = 100

async function existingDirectory(path) {
  try {
    return await checkedDirectory(path)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    return null
  }
}

// Only identity discovery. The native registry still owns membership and the
// tool guard still owns tool admission. Sorting requests native header metadata, never message bodies.
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
  for (let index = 0; index < ids.length; index += 4) {
    signal.throwIfAborted()
    const batch = await Promise.allSettled(ids.slice(index, index + 4).map(async id => {
      const snapshot = await persistence.stat(id, { signal })
      const value = snapshot?.header
      return value?.id === id && Number.isSafeInteger(value.createdAt) && value.createdAt > 0 ? [id, value.createdAt] : null
    }))
    signal.throwIfAborted()
    if (batch.some(outcome => outcome.status === 'rejected' || outcome.value === null)) return null
    entries.push(...batch.map(outcome => outcome.value))
  }
  return Object.fromEntries(entries)
}

export function registerCatalog(ctx, profileDir) {
  ctx.inject(['workspaceRegistry', 'sessionPersistence'], child => {
    const lifetime = new AbortController()
    child.effect(() => () => lifetime.abort())
    let sorting = false
    child.effect(() => child.connection.fetch.register({
      // The DSH HTTP bridge uses the buffered branch to construct a bodyless GET.
      path: '/api/abinadwan-direct-chat/catalog', methods: ['GET'], requestBody: 'buffered',
      async fetch(request) {
        const headers = { 'cache-control': 'no-store' }
        try {
          request.signal.throwIfAborted()
          const list = () => child.workspaceRegistry.list()
          const workspace = await registeredWorkspace(profileDir, list)
          let createdAt
          if (workspace && new URL(request.url).searchParams.get('order') === 'creation') {
            if (sorting) return Response.json({ code: 'DIRECT_CHAT_CATALOG_BUSY' }, { status: 409, headers })
            sorting = true
            const signal = AbortSignal.any([request.signal, lifetime.signal, AbortSignal.timeout(2000)])
            try {
              createdAt = await creationMetadata(workspace, child.sessionPersistence, signal)
            } catch (error) {
              if (signal.reason?.name !== 'TimeoutError') throw error
              createdAt = null
            } finally {
              sorting = false
            }
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
    }), 'direct-chat: discover the registered native Workspace')
  })
}
