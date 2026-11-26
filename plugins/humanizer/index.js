import { readFileSync } from 'node:fs'
import { registerStudioRoutes } from './studio-http.js'

export const name = 'abinadwan-humanizer'
export const inject = ['skills']

export function apply(ctx) {
  const content = readFileSync(new URL('./SKILL.md', import.meta.url), 'utf8')
  ctx.effect(() => ctx.skills.register({
    name: 'abinadwan-humanizer',
    description: 'Edit or rewrite supplied prose for clarity, natural phrasing, and the requested tone or language. Preserve facts, citations, uncertainty, and the author’s voice. Use for explicit writing and editing requests.',
    source: 'runtime',
    invocation: { userInvocable: true, modelInvocable: true },
    content,
  }), 'abinadwan-humanizer: runtime skill')
  // The Skill remains usable in Hosts without Connection or LLM.
  ctx.inject(['connection', 'llm'], registerStudioRoutes)
}
