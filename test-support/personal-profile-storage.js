// Explicit synthetic-only provider. Not packaged; no runtime environment selector.
import { randomBytes } from 'node:crypto'
import { assembleStorage } from '../plugins/personal-profile/storage/lifecycle.js'
export function syntheticStorage(root, options = {}) {
  const syntheticKey = randomBytes(32)
  return assembleStorage(root, {acquire: () => Buffer.from(syntheticKey), release() {}}, options)
}
