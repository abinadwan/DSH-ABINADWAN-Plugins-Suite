import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { Context, Service } from '@deepseek-ai/cordis'

// A faithful double of the DeepSeek Harness v0.2.2-rc.3 browser contracts the
// suite depends on. The shapes below are taken from the upstream sources:
// - `remote.<namespace>` is its own Cordis service (api/gateway
//   `remoteServiceKey`), so reading `ctx.remote.pluginManager` without
//   injecting `remote.pluginManager` throws under the real Cordis 4 proxy.
// - every generated Remote method resolves to `RemoteResult<T>`
//   (`{ok:true,value}` | `{ok:false,error}`), never to the bare value.
// - list/keyed Slot entries that throw while rendering are abdicated by the
//   renderer for the rest of their registration (ui-renderer scoped-slots).
// - `whenAccess(action, ...)` follows one access answer per endpoint.

export const base = '@abinadwan/dsh-plugins-suite'
export const activeRows = () => ['environment-context', 'humanizer', 'personal-profile'].map((name, index) => ({
  entryId: `component-${index}`, moduleName: `${base}/${name}`,
  enabled: index !== 2, fiberPhase: index === 2 ? null : 'active',
}))
export const withProfile = (rows, enabled) => rows.map(row => row.moduleName === `${base}/personal-profile`
  ? { ...row, enabled, fiberPhase: enabled ? 'active' : null } : row)
export const tick = () => new Promise(resolve => setImmediate(resolve))
export const ok = value => ({ ok: true, value })
export const refused = (code, message) => ({ ok: false, error: { code, message } })
export const ReactStub = {
  createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
  useState: initial => [initial, () => {}],
  useEffect: () => {},
  useRef: initial => ({ current: initial }),
  useSyncExternalStore: (_, get) => get(),
}

class Slots extends Service {
  records = new Map()
  abdicated = new Set()
  registrations = []
  constructor(ctx) { super(ctx, 'slots') }
  inject(_name, callback) { return this.ctx.effect(callback) }
  register(options, component) {
    // Real Slots partition cells by slot name. Keep the historic lookup keys,
    // but refuse a duplicate cell exactly as SlotCore.register does.
    const key = ['sidebar.panellist', 'settings.section.icon'].includes(options.name)
      ? options.name + ':' + options.id : options.id || options.key || options.name
    if (options.name === 'sidebar.panellist' || options.name === 'plugins.detail.section') {
      if (options.id === undefined) throw new Error(`list slot "${options.name}" requires options.id`)
    }
    if (this.records.has(key)) throw new Error(`slot cell ${key} already has an entry`)
    return this.ctx.effect(() => {
      const record = { options, component }
      this.records.set(key, record)
      this.registrations.push(key)
      return () => { if (this.records.get(key) === record) this.records.delete(key) }
    })
  }
  /** Render a list entry the way the Harness outlet does: a crash abdicates it. */
  renderList(name, props) {
    const out = []
    for (const [key, record] of this.records) {
      if (record.options.name !== name || this.abdicated.has(record)) continue
      try {
        out.push({ key, node: record.component(props) })
      } catch (error) {
        this.abdicated.add(record)
        out.push({ key, error })
      }
    }
    return out
  }
}
class Tabs extends Service {
  records = new Map()
  constructor(ctx) { super(ctx, 'sidebarRightTabs') }
  register(def) {
    if ([...this.records.values()].some(item => item.id === def.id)) throw new Error(`tab type ${def.id} is taken`)
    return this.ctx.effect(() => {
      this.records.set(def.kind, def)
      return () => this.records.delete(def.kind)
    })
  }
}
class Access extends Service {
  static allowed = new Set(['pluginManager/listPlugins'])
  granted = true
  watchers = new Set()
  requested = []
  constructor(ctx) { super(ctx, 'remoteAccess') }
  whenAccess(action, callback) {
    this.requested.push(action)
    if (!Access.allowed.has(action)) throw new Error('unexpected access request ' + action)
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
class Remote extends Service {
  events = new Map()
  constructor(ctx) { super(ctx, 'remote') }
  $on(name, callback) {
    this.events.set(name, callback)
    return () => this.events.delete(name)
  }
}
class SettingsRemote extends Service {
  constructor(ctx, settings) { super(ctx,'remote.settings');this.settings=settings }
  describe(){return this.settings.describe()}
  replace(...args){return this.settings.replace(...args)}
}
class PluginManagerRemote extends Service {
  constructor(ctx, calls) {
    super(ctx, 'remote.pluginManager')
    this.calls = calls
  }
  listPlugins() { return this.calls.listPlugins() }
  listBundles() { return this.calls.listBundles() }
  updateBundle(...args) { return this.calls.updateBundle(...args) }
}

/** A mutable observable store, as `ctx.sessions.list` / `ctx.workspaces.list` are. */
export function observable(initial) {
  let value = initial
  const listeners = new Set()
  return {
    listeners,
    getSnapshot: () => value,
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) },
    set(next) { value = next; for (const listener of [...listeners]) listener() },
  }
}

/**
 * A reduced double of the rc.3 `ClientWorkspaceModel` that
 * `ctx.workspaces.list` really is (dsh-api-workspace-controller 0.2.2-rc.3,
 * lib/client.js). Like the Host class, `subscribe` and `getSnapshot` are
 * prototype methods that read `this`, the snapshot is cached until
 * invalidated, and listeners are notified on a microtask. Passing
 * `list.getSnapshot` / `list.subscribe` unbound throws exactly as on Desktop.
 */
export class HostWorkspaceModel {
  listeners = new Set()
  snapshotDirty = false
  notificationScheduled = false
  constructor(initial) { this.value = initial; this.snapshotCache = this.buildSnapshot() }
  subscribe(listener) { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  getSnapshot() { this.refreshSnapshot(); return this.snapshotCache }
  buildSnapshot() { return { ...this.value } }
  refreshSnapshot() { if (!this.snapshotDirty) return; this.snapshotDirty = false; this.snapshotCache = this.buildSnapshot() }
  /** Test hook standing in for the Host's baseline/increment frames. */
  set(next) {
    this.value = next; this.snapshotDirty = true
    if (this.notificationScheduled) return
    this.notificationScheduled = true
    queueMicrotask(() => { this.notificationScheduled = false; this.refreshSnapshot(); for (const fn of [...this.listeners]) fn() })
  }
}

export function sessionSnapshot() {
  return {
    ids: ['s1', 's2'],
    phase: 'ready',
    byId: {
      s1: { id: 's1', displayTitle: 'Demo', running: true },
      s2: { id: 's2', displayTitle: 'Other Session', running: false },
    },
    projectionsBySession: {
      s1: { state: 'ready', error: null, values: {
        contextPressure: { projectedTokens: 3000, contextWindow: 8000 },
        contextBreakdown: { messageTokens: 2000, toolsTokens: 800, systemTokens: 200 },
        tokenUsage: { outputTokens: 1200 },
      } },
      s2: { state: 'ready', error: null, values: {
        contextPressure: { projectedTokens: 1000, contextWindow: 8000 },
        contextBreakdown: { messageTokens: 400, toolsTokens: 300, systemTokens: 300 },
        tokenUsage: { outputTokens: 17 },
      } },
    },
  }
}

export async function clientHarness(options = {}) {
  const ctx = new Context()
  const slots = new Slots(ctx)
  const tabs = new Tabs(ctx)
  const access = new Access(ctx)
  const remote = new Remote(ctx)
  // DSH's public Locale snapshot: the default test Host is Arabic so existing
  // RTL regressions remain realistic; tests can opt into English or switch live.
  const hostLocale = observable({active:options.hostLocale || 'ar',revision:0})
  ctx.provide('locale', options.locale || {
    getSnapshot: () => hostLocale.getSnapshot(),
    getLocale: () => hostLocale.getSnapshot(),
    subscribe: notify => hostLocale.subscribe(notify),
  })
  const timers = new Map()
  const intervals = new Map()
  const mountedListeners = new Set()
  let rows = activeRows(), timerId = 0, intervalId = 0, opened = 0, loaded
  // Inventory callbacks return the bare Host value; the double wraps it into a
  // RemoteResult exactly as the generated Remote face does. A callback may also
  // return a RemoteResult itself (`ok(...)` / `refused(...)`) to model failures.
  const wrap = async producer => {
    const value = await producer()
    return value && typeof value === 'object' && typeof value.ok === 'boolean' ? value : ok(value)
  }
  let inventory = options.inventory || (() => rows)
  const calls = {
    listPlugins: () => wrap(() => inventory()),
    listBundles: () => wrap(options.listBundles || (() => [])),
    updateBundle: (...args) => wrap(() => (options.updateBundle || (() => { throw new Error('Unexpected update operation') }))(...args)),
  }
  // The gateway mounts each namespace from its own plugin fiber
  // (api/gateway createNamespace: `ownerCtx.plugin({ name: 'remote.<ns>', apply })`).
  // A service provided that way is reachable only by consumers that inject it.
  await ctx.plugin({ name: 'remote.pluginManager', apply: child => { new PluginManagerRemote(child, calls) } })
  const settings=options.settings||{describe:()=>Promise.resolve(refused('access/denied','not available')),replace:()=>Promise.resolve(refused('access/denied','not available'))}
  await ctx.plugin({name:'remote.settings',apply:child=>{new SettingsRemote(child,settings)}})
  const sessions = observable(options.sessions || sessionSnapshot())
  const workspaces = new HostWorkspaceModel({
    items: options.workspaceItems || [{ workspaceId: 'w', title: 'HomeBook', path: 'C:/Work/HomeBook', sessionIds: ['s1'] }],
    archivedSessionIds: options.archivedSessionIds ?? [], pinnedSessionIds: [], state: 'idle', phase: 'ready', error: null,
  })
  ctx.provide('sessions', { list: sessions, refresh: options.refresh || (async () => {}), subagentAddress: () => undefined,
    binding: id => options.sessionBinding?.(id) })
  ctx.provide('workspaces', {
    list: workspaces,
    create: input => options.onWorkspaceCreate?.(input) ?? { workspaceId: 'direct-workspace', path: input.path, title: 'Direct Chat' },
    rename: (id, title) => options.onWorkspaceRename?.(id, title) ?? Promise.resolve({ workspaceId: id, title }),
    delete: id => options.onWorkspaceDelete?.(id) ?? Promise.resolve(),
  })
  ctx.provide('uiWorkspace', {
    openSession: id => options.onOpenSession?.(id),
    connectWorkspace: id => options.onConnectWorkspace?.(id) ?? Promise.resolve('session-direct-1'),
  })
  ctx.provide('layout', { beginNavigation: () => new AbortController().signal })
  if (options.modelDirectories) ctx.provide('modelDirectories', options.modelDirectories)
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
    clearInterval: id => intervals.delete(id), console: options.console || console,
    fetch: options.fetch || (() => { throw new Error('unexpected network request') }),
    navigator: options.navigator,
    document: options.document,
    AbortController, AbortSignal, URL, TextDecoder, Blob, crypto: globalThis.crypto,
  })
  const plugin = loaded.factory(name => {
    const react = options.React || ReactStub
    if (name === '@deepseek-ai/dsh-client-ui-primitives') {
      const h = react.createElement
      return {
        Button: ({ size, variant, icon, children, ...props }) => h('button', { type: 'button', ...props }, icon, children),
        Checkbox: ({ label, onChange, ...props }) => h('label', null,
          h('input', { type: 'checkbox', ...props, onChange: event => onChange(event.target.checked) }), label),
        Toast: ({ text }) => h('span', { role: 'alert' }, text),
        // Submenu rows render inline after their parent, which opens them without selecting.
        Menu: ({ open, anchor, items, onSelect, selectedId, selectedIds }) => {
          const rows = list => list.flatMap(item => item.type === 'label' ? [h('span', { key: item.id }, item.text)] :
            item.type === 'separator' ? [h('hr', { key: item.id })] : [h('button', { key: item.id, role: 'menuitem',
              disabled: item.disabled, 'aria-checked': item.id === selectedId || selectedIds?.includes(item.id) ? 'true' : undefined,
              onClick: () => { if (!item.submenu) onSelect(item.id) } }, item.label), ...item.submenu ? rows(item.submenu) : []])
          return h('span', null, anchor, open && h('div', { role: 'menu' }, ...rows(items)))
        },
        Modal: ({ open, title, description, children, footer }) => open ? h('div', { role: 'dialog', 'aria-label': title },
          h('h2', null, title), description ? h('p', null, description) : null, children, footer) : null,
      }
    }
    if (name !== 'react') throw new Error(`unexpected browser import ${name}`)
    return react
  })
  const fiber = ctx.plugin(plugin)
  await fiber.await()
  await tick()
  return {
    ctx, fiber, access, slots, tabs, events: remote.events, timers, intervals, mountedListeners, hostLocale,
    sessions, workspaces, loaded, plugin, get opened() { return opened },
    slot(name) { return [...slots.records.values()].find(record => record.options.name === name)?.component },
    entries(name) { return [...slots.records.values()].filter(record => record.options.name === name) },
    rows: () => rows,
    setRows(next) { rows = next },
    inventory(next) { inventory = next },
    async changed() { remote.events.get('plugin-manager/changed')?.({ reason: 'test' }); await tick(); await tick() },
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
