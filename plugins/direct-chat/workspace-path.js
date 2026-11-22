import { lstat, realpath } from 'node:fs/promises'
import { isAbsolute, normalize, toNamespacedPath } from 'node:path'

export const directoryName = 'abinadwan-direct-chat-data'
export const workspaceName = 'Direct Chat'

export function pathKey(path) {
  if (typeof path !== 'string' || !isAbsolute(path)) return undefined
  const normalized = normalize(path)
  // Windows realpath can return extended-length paths (\\\\?\\...) while
  // DSH supplies ordinary drive/UNC paths. Compare in one namespaced form.
  return process.platform === 'win32' ? normalize(toNamespacedPath(normalized)).toLowerCase() : normalized
}

export async function checkedDirectory(path) {
  const stat = await lstat(path)
  const canonical = stat.isDirectory() && !stat.isSymbolicLink() ? await realpath(path) : undefined
  if (!canonical || pathKey(canonical) !== pathKey(path)) {
    throw new Error('The Direct Chat directory is not a dedicated profile-owned directory.')
  }
  return canonical
}
