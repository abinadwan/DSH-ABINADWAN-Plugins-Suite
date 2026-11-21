// Synthetic proof of the native Agent preset binding. This entry is not shipped.
export const name = 'abinadwan-direct-chat-restrictions'
export const inject = ['tools']

export function apply(ctx) {
  ctx.tools.restrict({ allow: [] })
  ctx.tools.guard(() => 'Tools are unavailable in this Direct Chat preset')
}
