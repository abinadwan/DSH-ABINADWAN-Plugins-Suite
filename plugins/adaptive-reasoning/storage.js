import { randomUUID } from 'node:crypto'
import { lstat, open, realpath } from 'node:fs/promises'
import { isAbsolute, join } from 'node:path'
import { withFileLock, writeFileAtomic } from '@deepseek-ai/dsh-atomic-write'
import { bucket, MAX_KEYS, ReasoningStats, SOURCES } from './stats.js'

const FILE = 'abinadwan-reasoning-stats.json'
const MAX_BYTES = 1024 * 1024
const fields = Object.keys(bucket())
const scopes = ['session', 'subagent']
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const count = value => Number.isSafeInteger(value) && value >= 0
const label = value => typeof value === 'string' && value.length > 0 && value.length <= 256
const routeKey = ({ scope, provider, model, effort }) => JSON.stringify([scope, provider, model, effort])

function readBucket(value) {
  if (!object(value) || !fields.every(key => key === 'durationMs'
    ? Number.isFinite(value[key]) && value[key] >= 0 : count(value[key]))) throw new Error('invalid-stats')
  return Object.fromEntries(fields.map(key => [key, value[key]]))
}

function readCounters(value) {
  if (!object(value) || !count(value.messages) || !object(value.sources) || !object(value.requests) ||
      !SOURCES.every(key => count(value.sources[key])) || typeof value.since !== 'string' ||
      !Number.isFinite(Date.parse(value.since)) || !Array.isArray(value.routes) || value.routes.length > MAX_KEYS) {
    throw new Error('invalid-stats')
  }
  const requests = {}
  for (const scope of scopes) {
    const table = value.requests[scope]
    if (!object(table) || Object.keys(table).length > MAX_KEYS + 1) throw new Error('invalid-stats')
    requests[scope] = Object.fromEntries(Object.entries(table).map(([effort, row]) => {
      if (!label(effort)) throw new Error('invalid-stats')
      return [effort, readBucket(row)]
    }))
  }
  const routes = value.routes.map(row => {
    if (!object(row) || !scopes.includes(row.scope) || ![row.provider, row.model, row.effort].every(label)) throw new Error('invalid-stats')
    return { scope: row.scope, provider: row.provider, model: row.model, effort: row.effort, ...readBucket(row) }
  })
  if (new Set(routes.map(routeKey)).size !== routes.length) throw new Error('invalid-stats')
  return { since: value.since, messages: value.messages, sources: Object.fromEntries(SOURCES.map(key => [key, value.sources[key]])),
    requests, routes }
}

async function readState(filename) {
  const stat = await lstat(filename).catch(error => {
    if (error.code === 'ENOENT') return undefined
    throw error
  })
  if (!stat) return { version: 1, epoch: 'initial', counters: readCounters(new ReasoningStats().snapshot()) }
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 || stat.size > MAX_BYTES) throw new Error('invalid-stats')
  const file = await open(filename, 'r')
  try {
    const actual = await file.stat()
    if (stat.dev !== actual.dev || stat.ino !== actual.ino || actual.nlink !== 1 || actual.size !== stat.size) throw new Error('invalid-stats')
    const bytes = Buffer.alloc(stat.size + 1)
    const { bytesRead } = await file.read(bytes, 0, bytes.length, 0)
    if (bytesRead !== stat.size) throw new Error('invalid-stats')
    const document = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, bytesRead)))
    if (document?.version !== 1 || !label(document.epoch)) throw new Error('unsupported-stats')
    return { version: 1, epoch: document.epoch, counters: readCounters(document.counters) }
  } finally {
    await file.close()
  }
}

function add(target, source) {
  for (const key of fields) target[key] = Math.min(Number.MAX_SAFE_INTEGER, target[key] + source[key])
}

export function mergeCounters(target, delta) {
  target.messages = Math.min(Number.MAX_SAFE_INTEGER, target.messages + delta.messages)
  for (const key of SOURCES) target.sources[key] = Math.min(Number.MAX_SAFE_INTEGER, target.sources[key] + delta.sources[key])
  for (const scope of scopes) {
    const table = Object.assign(Object.create(null), target.requests[scope])
    for (const [effort, row] of Object.entries(delta.requests[scope])) {
      const key = Object.hasOwn(table, effort) || Object.keys(table).length < MAX_KEYS ? effort : 'other'
      add(table[key] ??= bucket(), row)
    }
    target.requests[scope] = table
  }
  const routes = new Map(target.routes.map(row => [routeKey(row), row]))
  for (const row of delta.routes) {
    const key = routeKey(row)
    if (routes.has(key)) add(routes.get(key), row)
    else if (routes.size < MAX_KEYS) routes.set(key, row)
  }
  target.routes = [...routes.values()]
}

export async function openReasoningStats(profileDir) {
  if (typeof profileDir !== 'string' || !isAbsolute(profileDir)) throw new Error('profile-unavailable')
  const root = await realpath(profileDir)
  const filename = join(root, FILE)
  async function locked(operation) {
    if (await realpath(profileDir) !== root) throw new Error('profile-changed')
    const lock = await lstat(filename + '.lock').catch(error => {
      if (error.code !== 'ENOENT') throw error
    })
    if (lock && (!lock.isFile() || lock.isSymbolicLink() || lock.nlink !== 1 || lock.size > 32)) throw new Error('invalid-stats-lock')
    return withFileLock(filename, operation, { waitMs: 2000 })
  }
  let { epoch } = await locked(() => readState(filename))
  let queue = Promise.resolve()
  function transact(delta, reset = false) {
    let writeStarted = false
    const operation = queue.then(() => locked(async () => {
      const state = await readState(filename)
      const hasData = delta && (delta.messages || scopes.some(scope => Object.keys(delta.requests[scope]).length))
      const append = hasData && state.epoch === epoch
      if (reset) {
        state.epoch = randomUUID()
        state.counters = readCounters(new ReasoningStats().snapshot())
      } else if (append) {
        mergeCounters(state.counters, readCounters(delta))
      }
      if (reset || append) {
        writeStarted = true
        await writeFileAtomic(filename, JSON.stringify(state), { mode: 0o600, dirMode: 0o700 })
      }
      epoch = state.epoch
      return { ...new ReasoningStats().snapshot(), ...state.counters, persistent: true }
    }))
    queue = operation.catch(() => {})
    return operation.catch(cause => {
      const error = new Error('statistics-transaction-failed', { cause })
      error.mayHaveWritten = writeStarted
      throw error
    })
  }
  return { save: delta => transact(delta), reset: () => transact(null, true) }
}
