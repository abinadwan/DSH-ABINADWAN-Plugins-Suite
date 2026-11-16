import { LIMITS } from './limits.js'
import { text } from './schema.js'

// Trusted internal management only. This edits the existing Master Profile;
// no second store, prompt composition, text analysis or disclosure to readers.
export function createInstructionManagement(profile, environmentFor) {
  const state = profile.instructions
  return Object.freeze({
    setGlobal(value) { state.global = text(value, LIMITS.instructions) },
    setOverride(profileHandle, value) {
      const environment = environmentFor(profileHandle)
      const validated = text(value, LIMITS.instructions)
      state.environments.set(environment, validated)
    },
    deleteOverride(profileHandle) {
      state.environments.delete(environmentFor(profileHandle))
    },
    reset() {
      state.global = ''
      state.environments.clear()
    },
    preview(profileHandle) {
      const environment = environmentFor(profileHandle)
      const present = state.environments.has(environment)
      const override = present ? state.environments.get(environment) : null
      return Object.freeze({
        global: state.global, override,
        source: present ? 'environment' : 'global',
        effective: present ? override : state.global,
      })
    },
  })
}

// Original optional starting points. Never applied automatically or classified
// as safe model instructions. Copy/edit explicitly through trusted management.
export const INSTRUCTION_STYLE_SUGGESTIONS = Object.freeze([
  'Start with the result, then give the reasoning in a short paragraph.',
  'Explain unfamiliar terms when they first appear and use a concrete example.',
  'For comparisons, use a compact table and explain the main tradeoff.',
])
