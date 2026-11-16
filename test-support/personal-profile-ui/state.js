// Fixture presentation state only. Never import a Host factory or capability here.
import { LIMITS } from '../../plugins/personal-profile/core/limits.js'
import { validateValue, validateCustomDefinition } from '../../plugins/personal-profile/core/schema.js'
export { LIMITS }
export const builtins = ['preferredName', 'fullName', 'dateOfBirth', 'nationality', 'gender']
export function createFixture() {
  return { page: 'information', profile: 'Synthetic Studio', profiles: ['Synthetic Studio', 'Synthetic Lab'],
    values: {}, custom: [], global: '', overrides: {}, permissions: {}, optIn: false,
    locked: false, autoLock: '5', consent: '', sessions: true, backup: '', strategy: 'merge', confirmed: false }
}
export function setValue(state, id, type, value) {
  if (value === '') { delete state.values[id]; return }
  if (type === 'boolean' && !['true', 'false'].includes(value)) throw new TypeError('Invalid profile input')
  if (type === 'number' && !value.trim()) throw new TypeError('Invalid profile input')
  const parsed = type === 'number' ? Number(value) : type === 'boolean' ? value === 'true' : value
  validateValue(type, parsed)
  state.values[id] = parsed
}
export function addField(state, definition) {
  validateCustomDefinition(definition)
  if (state.custom.length >= LIMITS.customFields || state.custom.some(x => x.id === definition.id)) throw new TypeError('Invalid profile input')
  state.custom.push({ ...definition })
}
export function preview(state) {
  return Object.hasOwn(state.overrides, state.profile) ? state.overrides[state.profile] : state.global
}
