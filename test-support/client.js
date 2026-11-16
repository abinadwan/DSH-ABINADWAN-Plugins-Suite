import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { Context, Service } from '@deepseek-ai/cordis'

export const base = '@abinadwan/dsh-plugins-suite'
export const activeRows = () => ['environment-context', 'humanizer', 'personal-profile'].map((name, index) => ({
  entryId: `component-${index}`, moduleName: `${base}/${name}`,
  enabled: index !== 2, fiberPhase: index === 2 ? null : 'active',
}))
export const tick = () => new Promise(resolve => setImmediate(resolve))
export const ReactStub = {
  createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
  useState: initial => [initial, () => {}],
  useSyncExternalStore: (_, get) => get(),
}

class Slots extends Service {
  records = new Map()
  constructor(ctx) { super(ctx, 'slots') }
  inject(_name, callback) { return this.ctx.effect(callback) }
  register(options, component) {
    // A sidebar launcher and its matching main panel deliberately share an id.
    // Real Slots partition by slot name, so the harness must not overwrite one.
    const key = options.name === 'sidebar.panellist'
      ? 'sidebar.panellist:' + options.id : options.id || options.key || options.name
    return this.ctx.effect(() => {
      this.records.set(key, { options, component })
      return () => this.records.delete(key)
    })
  }
}
class Tabs extends Service {
  records = new Map()
  constructor(ctx) { super(ctx, 'sidebarRightTabs') }
  register(def) {
    return this.ctx.effect(() => {
      this.records.set(def.kind, def)
      return () => this.records.delete(def.kind)
    })
  }
}
class Access extends Service {
  granted = true
  watchers = new Set()
  constructor(ctx) { super(ctx, 'remoteAccess') }
  whenAccess(action, callback) {
    if (action !== 'pluginManager/listPlugins') throw new Error('unexpected access request')
    const watcher = { ctx: this.ctx, callback }
    return this.ctx.effect(() => {
      this.watchers.add(watcher)
      if (this.granted) watcher.dispose = watcher.ctx.effect(callback)
      return () => { watcher.dispose?.(); this.watchers.delete(watcher) }
    })
  }
  set(granted) {
    this.granted = granted
    for (const watcher of this.watchers) {
      watcher.dispose?.()
      watcher.dispose = granted ? watcher.ctx.effect(watcher.callback) : undefined
    }
  }
}

export async function clientHarness(options = {}) {
  const ctx = new Context()
  const slots = new Slots(ctx)
  const tabs = new Tabs(ctx)
  const access = new Access(ctx)
  const events = new Map()
  const timers = new Map()
  const intervals = new Map()
  const mountedListeners = new Set()
  let rows = activeRows(), timerId = 0, intervalId = 0, opened = 0, loaded
  let inventory = options.inventory || (() => Promise.resolve(rows))
  const remote = {
    pluginManager: { listPlugins: () => inventory(),
      listBundles: options.listBundles || (() => Promise.resolve([])),
      updateBundle: options.updateBundle || (() => { throw new Error('Unexpected update operation') }),
    },
    $on(name, callback) {
      events.set(name, callback)
      return () => events.delete(name)
    },
  }
  ctx.provide('remote', remote)
  ctx.provide('sessions', { list: { subscribe: () => () => {}, getSnapshot: () => ({
    byId: {
      s1: { displayTitle: 'Demo', running: true },
      s2: { displayTitle: 'Other Session', running: false },
    },
    projectionsBySession: {
      s1: { state: 'ready', values: {
        contextPressure: { projectedTokens: 3000, contextWindow: 8000 },
        contextBreakdown: { messageTokens: 2000, toolsTokens: 800, systemTokens: 200 },
        tokenUsage: { outputTokens: 1200 },
      } },
      s2: { state: 'ready', values: {
        contextPressure: { projectedTokens: 1000, contextWindow: 8000 },
        contextBreakdown: { messageTokens: 400, toolsTokens: 300, systemTokens: 300 },
        tokenUsage: { outputTokens: 17 },
      } },
    },
  }) } })
  ctx.provide('workspaces', { list: { subscribe: () => () => {}, getSnapshot: () => ({
    items: [{ workspaceId: 'w', title: 'HomeBook', sessionIds: ['s1'] }],
  }) } })
  ctx.provide('sidebarRight', {
    mounted: { getSnapshot: () => 's1', subscribe: listener => {
      mountedListeners.add(listener)
      return () => mountedListeners.delete(listener)
    } },
    openTab: kind => { if (kind !== 'environment-dashboard') throw new Error('wrong tab'); opened++ },
  })
  runInNewContext(readFileSync(new URL('../client.js', import.meta.url), 'utf8'), {
    window: { __ModuleLoader__: { load: mod => { loaded = mod } } },
    setTimeout: callback => { timers.set(++timerId, callback); return timerId },
    clearTimeout: id => timers.delete(id),
    setInterval: (callback, ms) => { intervals.set(++intervalId,{callback,ms}); return intervalId },
    clearInterval: id => intervals.delete(id), console,
    fetch: options.fetch || (() => { throw new Error('unexpected network request') }),
    AbortSignal,
  })
  const plugin = loaded.factory(name => {
    if (name !== 'react') throw new Error(`unexpected browser import ${name}`)
    return options.React || ReactStub
  })
  const fiber = ctx.plugin(plugin)
  await fiber.await()
  await tick()
  return {
    ctx, fiber, access, slots, tabs, events, timers, intervals, mountedListeners,
    loaded, get opened() { return opened },
    slot(name) { return [...slots.records.values()].find(record => record.options.name === name)?.component },
    rows: () => rows,
    setRows(next) { rows = next },
    inventory(next) { inventory = next },
    async changed() { events.get('plugin-manager/changed')?.(); await tick() },
    async dispose() { await ctx.fiber.dispose(); await tick() },
  }
}

export function walk(node, predicate) {
  if (node == null || typeof node !== 'object') return null
  if (predicate(node)) return node
  for (const child of node.children ?? []) {
    for (const item of Array.isArray(child) ? child : [child]) {
      const found = walk(item, predicate)
      if (found) return found
    }
  }
  return null
}
