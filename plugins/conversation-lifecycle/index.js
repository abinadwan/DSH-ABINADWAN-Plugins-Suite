import Schema from '@deepseek-ai/schemastery'

export const name = 'abinadwan-conversation-lifecycle'
const duration = Schema.union(['forever', '365', '180', '90', '30', '7'])
const identity = Schema.string().min(1).max(256).required()
export const Config = Schema.object({
  record: Schema.object({
    // Retired retention/visibility values remain schema-compatible only.
    // Protection updates preserve them; no cleanup or deletion is performed.
    retention: duration.default('forever'),
    hideArchived: Schema.boolean().default(true),
    overrides: Schema.array(Schema.object({ workspace: identity, retention: duration.required() })).max(1000).default([]),
    protectedWorkspaces: Schema.array(identity).max(1000).default([]),
    protectedIds: Schema.array(identity).max(10000).default([]),
  }).default({ retention: 'forever', hideArchived: true, overrides: [], protectedIds: [], protectedWorkspaces: [] }).volatile(),
})

export function apply(ctx) {
  ctx.inject(['settings'], child => child.effect(() => child.settings.configure({ auto: false }, ctx.fiber)))
}
