import { imported, failure } from './codec.js'

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)
export function merge(existing, incoming) {
  const out = imported(existing), next = imported(incoming), conflicts = []
  const definitions = new Map(out.customFields.map(d => [d.id, d]))
  const incompatible = new Set()
  for (const d of next.customFields) {
    if (definitions.has(d.id)) {
      if (!same(definitions.get(d.id), d)) { conflicts.push(`definition:${d.id}`); incompatible.add(d.id) }
    } else { out.customFields.push(d); definitions.set(d.id, d) }
  }
  for (const [id, value] of Object.entries(next.fields)) {
    if (incompatible.has(id)) continue
    if (Object.hasOwn(out.fields, id)) { if (!same(out.fields[id], value)) conflicts.push(`field:${id}`) }
    else out.fields[id] = value
  }
  if (out.instructions.global !== next.instructions.global) {
    // Empty is still an existing explicit instruction value; never overwrite.
    conflicts.push('instructions:global')
  }
  for (const [id, value] of Object.entries(next.instructions.environments)) {
    if (Object.hasOwn(out.instructions.environments, id)) {
      if (out.instructions.environments[id] !== value) conflicts.push(`instructions:${id}`)
    } else out.instructions.environments[id] = value
  }
  return {input: imported(out), conflicts: Object.freeze(conflicts)}
}
export function strategy(value) { if (!['merge', 'replace'].includes(value)) failure(); return value }
