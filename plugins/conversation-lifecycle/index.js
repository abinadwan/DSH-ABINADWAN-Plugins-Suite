import Schema from '@deepseek-ai/schemastery'
import { registerInspection } from './inspect.js'

export const name = 'abinadwan-conversation-lifecycle'
const duration = Schema.union(['forever', '365', '180', '90', '30', '7'])
const identity = Schema.string().min(1).max(256).required()
export const Config = Schema.object({
  record: Schema.object({
    retention: duration.default('forever'),
    overrides: Schema.array(Schema.object({ workspace: identity, retention: duration.required() })).max(1000).default([]),
    protectedWorkspaces: Schema.array(identity).max(1000).default([]),
    protectedIds: Schema.array(identity).max(10000).default([]),
  }).default({ retention: 'forever', overrides: [], protectedIds: [], protectedWorkspaces: [] }).volatile(),
})

export function apply(ctx, config) {
  ctx.inject(['settings'], child => child.effect(() => child.settings.configure({ auto: false }, ctx.fiber)))
  registerInspection(ctx, config)
}
