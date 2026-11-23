// Owner-only, read-only inspection of archived Sessions.
// This module intentionally has no deletion capability or filesystem access.
// It is not an authorization token for future destructive operations.

import { isAbsolute, win32 } from 'node:path'
import { directoryName as directChatDirectory } from '../direct-chat/workspace-path.js'

const MAX_IDS = 20
const MAX_BODY_BYTES = 4096
const SESSION_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/
const HEADERS = { 'cache-control': 'no-store' }

export class InspectionUnavailable extends Error {
  constructor(code = 'inspection-unavailable') {
    super(code)
    this.code = code
  }
}

// A negative-only boundary: any registered/legacy Direct Chat root is excluded
// from general Chat Control inspection. This does NOT authorize other paths.
const absolutePath = value => typeof value === 'string' &&
  (isAbsolute(value) || win32.isAbsolute(value))
const directChatPath = value => absolutePath(value) &&
  value.split(/[\\/]+/).some(part => part.toLowerCase() === directChatDirectory.toLowerCase())

const textId = value => typeof value === 'string' && SESSION_ID.test(value)
const textArray = value => Array.isArray(value) && value.every(textId)
const protection = record => record && typeof record === 'object' &&
  textArray(record.protectedIds) && textArray(record.protectedWorkspaces ?? [])
const unique = ids => new Set(ids).size === ids.length

// The request is intentionally exact, small, streamed and abortable.
export async function readInspectRequest(request) {
  if (request.headers.get('content-type')?.split(';', 1)[0] !== 'application/json' || !request.body) return null
  const reader = request.body.getReader()
  const decoder = new TextDecoder('utf-8', { fatal: true })
  let bytes = 0
  let data = ''
  try {
    for (;;) {
      request.signal.throwIfAborted()
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > MAX_BODY_BYTES) { await reader.cancel(); return null }
      data += decoder.decode(value, { stream: true })
    }
    const parsed = JSON.parse(data + decoder.decode())
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) ||
        Object.keys(parsed).length !== 1 || !Object.hasOwn(parsed, 'sessionIds') ||
        !Array.isArray(parsed.sessionIds) || parsed.sessionIds.length < 1 ||
        parsed.sessionIds.length > MAX_IDS || !textArray(parsed.sessionIds) ||
        !unique(parsed.sessionIds)) return null
    return parsed.sessionIds
  } catch {
    return null
  } finally {
    reader.releaseLock()
  }
}

function catalog(registry, record) {
  if (!protection(record)) throw new InspectionUnavailable()
  const workspaces = registry.list()
  const archived = registry.archivedSessionIds
  const pinned = registry.pinnedSessionIds
  if (!Array.isArray(workspaces) || !textArray(archived) || !unique(archived) ||
      !textArray(pinned) || !unique(pinned)) throw new InspectionUnavailable()
  const registered = new Set()
  const owners = new Map()
  for (const workspace of workspaces) {
    if (!textId(workspace?.id) || registered.has(workspace.id) ||
        !textArray(workspace.sessionIds) || !unique(workspace.sessionIds)) {
      throw new InspectionUnavailable()
    }
    registered.add(workspace.id)
    for (const id of workspace.sessionIds) {
      owners.set(id, owners.has(id) ? null : workspace)
    }
  }
  return {
    owners,
    archived: new Set(archived), pinned: new Set(pinned),
    protectedIds: new Set(record.protectedIds),
    protectedWorkspaces: new Set(record.protectedWorkspaces ?? []),
    signature: JSON.stringify([
      workspaces.map(w => [w.id, w.path, [...w.sessionIds]]),
      [...archived], [...pinned], [...record.protectedIds],
      [...record.protectedWorkspaces ?? []],
    ]),
  }
}

function reasonFor(id, state) {
  const owner = state.owners.get(id)
  if (!owner) return 'membership-unavailable'
  if (!absolutePath(owner.path)) return 'workspace-path-unverified'
  if (directChatPath(owner.path)) return 'direct-chat-requires-separate-verification'
  if (!state.archived.has(id)) return 'not-archived'
  if (state.protectedIds.has(id)) return 'protected-session'
  if (state.protectedWorkspaces.has(owner.id)) return 'protected-workspace'
  if (state.pinned.has(id)) return 'pinned-session'
  return null
}

/**
 * Read-only server-side preflight. Results are NOT safe to turn into a deletion
 * action: there is no Host deletion transaction or activity-exclusion fence.
 */
export async function inspectArchivedCandidates({ ids, registry, persistence, record, signal, currentRecord }) {
  const state = catalog(registry, record)
  const rows = []
  for (const id of ids) {
    signal?.throwIfAborted()
    let reason = reasonFor(id, state)
    let storedBytes
    if (!reason) {
      const stored = await persistence.stat(id, { signal })
      signal?.throwIfAborted()
      if (!stored || stored.header?.id !== id) reason = 'storage-unavailable'
      else if (!absolutePath(stored.header.cwd)) reason = 'workspace-path-unverified'
      else if (directChatPath(stored.header.cwd)) reason = 'direct-chat-requires-separate-verification'
      else if (stored.header.origin === 'subagent' || stored.header.parentSession || stored.header.isSeeded === true) {
        reason = 'dependent-session'
      } else if (stored.formatStatus !== 'current') {
        reason = 'format-unverified'
      } else {
        if (Number.isSafeInteger(stored.sizeBytes) && stored.sizeBytes >= 0) storedBytes = stored.sizeBytes
        // Snapshot can only prove a *candidate*; ongoing activity/leases and
        // storage dependencies must be fenced by a future transaction.
        reason = 'requires-deletion-transaction'
      }
    }
    rows.push({ id, code: reason, ...(storedBytes === undefined ? {} : { storedBytes }),
      deletable: false })
  }
  const latest = catalog(registry, currentRecord())
  if (latest.signature !== state.signature) throw new InspectionUnavailable('catalog-changed')
  signal?.throwIfAborted()
  return { mode: 'read-only', executable: false, inspected: rows.length, rows }
}

export function registerInspection(ctx, config) {
  ctx.inject(['connection', 'workspaceRegistry', 'sessionPersistence'], child => {
    let active = true
    child.effect(() => () => { active = false })
    child.effect(() => child.connection.fetch.register({
      path: '/api/abinadwan-chat-control/inspect',
      methods: ['POST'],
      requestBody: 'streaming',
      async fetch(request) {
        const ids = await readInspectRequest(request)
        if (!ids) return Response.json({ code: 'invalid-request' }, { status: 400, headers: HEADERS })
        if (!active) return Response.json({ code: 'inspection-unavailable' }, { status: 503, headers: HEADERS })
        const signal = AbortSignal.any([request.signal, AbortSignal.timeout(3000)])
        try {
          const read = () => config.record.get()
          const result = await inspectArchivedCandidates({
            ids, registry: child.workspaceRegistry,
            persistence: child.sessionPersistence, record: read(),
            currentRecord: read, signal,
          })
          if (!active) throw new InspectionUnavailable()
          return Response.json(result, { headers: HEADERS })
        } catch (error) {
          const status = error?.code === 'catalog-changed' ? 409 : 503
          return Response.json({ code: status === 409 ? 'catalog-changed' : 'inspection-unavailable' },
            { status, headers: HEADERS })
        }
      },
    }), 'chat-control: owner-only read-only archive inspection')
  })
}
