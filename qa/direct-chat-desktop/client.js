window.__ModuleLoader__.load({
  id: '@abinadwan/direct-chat-desktop-fixture',
  factory(require) {
    const React = require('react')
    const { Context } = require('@deepseek-ai/cordis')
    const { Button } = require('@deepseek-ai/dsh-client-ui-primitives')
    const Registry = require('@deepseek-ai/dsh-typert-registry')
    const { installConnection } = require('@deepseek-ai/dsh-client-connection')
    const Gateway = require('@deepseek-ai/dsh-api-gateway/client')
    const Remotes = require('@deepseek-ai/dsh-api-remotes')
    const Sessions = require('@deepseek-ai/dsh-api-session-controller')
    const { LocaleRuntime } = require('@deepseek-ai/dsh-client-locale')
    const Renderer = require('@deepseek-ai/dsh-client-ui-renderer')
    const UiSession = require('@deepseek-ai/dsh-client-ui-session')
    const Conversation = require('@deepseek-ai/dsh-client-ui-conversation')
    const Chat = require('@deepseek-ai/dsh-client-ui-chat')
    const Models = require('@deepseek-ai/dsh-client-ui-model-selection')
    const h = React.createElement
    const panelId = 'abinadwan-direct-chat-desktop-fixture'
    const prefix = '/api/abinadwan-direct-chat-fixture/'
    const deny = () => { throw new Error('This action is unavailable in Direct Chat') }
    const idle = { subscribe: () => () => {}, getSnapshot: () => false }
    const form = { ...idle, getSnapshot: () => ({ value: undefined }), set: async () => {} }
    const workspaceSnapshot = Object.freeze({ items: [], phase: 'ready' })
    const visible = new Set(['session/prompt', 'session/follow', 'session/events', 'session/selectModel'])

    class RenderBoundary extends React.Component {
      state = { error: null }
      static getDerivedStateFromError(error) { return { error } }
      render() {
        return this.state.error ? h('p', { role: 'alert', style: { padding: 20 } },
          `Direct Chat view unavailable. ${this.state.error.message}`) : this.props.children
      }
    }

    function post(path, body, signal) {
      return fetch(prefix + path, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body), signal, redirect: 'error', cache: 'no-store',
      })
    }

    async function* stream(peer, endpoint, payload, signal, reconnect) {
      const response = await post('stream', { peer, endpoint, payload }, signal)
      if (response.status === 410) reconnect()
      if (!response.ok || !response.body) throw new Error('Direct Chat stream unavailable')
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
      let pending = ''
      try {
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          pending += value
          let newline
          while ((newline = pending.indexOf('\n')) !== -1) {
            const item = JSON.parse(pending.slice(0, newline))
            pending = pending.slice(newline + 1)
            if (item.error) throw new Error('Direct Chat stream ended')
            yield item.value
          }
        }
        if (pending) throw new Error('Incomplete Direct Chat frame')
      } finally {
        await reader.cancel().catch(() => {})
        reader.releaseLock()
      }
    }

    function Workspace({ root, SessionProvider, renderSlot, selection }) {
      const summary = React.useSyncExternalStore(root.sessions.list.subscribe, root.sessions.list.getSnapshot)
      const [reference, setReference] = React.useState(null)
      const [error, setError] = React.useState('')
      const [busy, setBusy] = React.useState(false)
      const retained = React.useRef(new Set())
      const mounted = React.useRef(false)
      React.useEffect(() => {
        mounted.current = true
        if (summary.ids.includes(selection.current)) void perform(() => select(selection.current))
        return () => {
          mounted.current = false
          for (const owned of retained.current) owned.release()
        }
      }, [])
      React.useEffect(() => () => {
        if (reference && retained.current.delete(reference)) reference.release()
      }, [reference])

      async function select(id) {
        if (!mounted.current) return
        const owned = root.sessions.retain(id, { source: 'mainView' })
        retained.current.add(owned)
        selection.current = id
        setReference(owned)
        await owned.ready
      }

      async function perform(action) {
        setBusy(true)
        setError('')
        try { await action() }
        catch (cause) { if (mounted.current) setError(String(cause?.message ?? cause)) }
        finally { if (mounted.current) setBusy(false) }
      }

      return h('div', { style: { display: 'flex', width: '100%', height: '100%', minHeight: 0 } },
        h('aside', { style: { display: 'flex', flexDirection: 'column', gap: 8, padding: 16, width: 216,
          overflow: 'auto', borderInlineEnd: '1px solid var(--border-default, #aaa4)' } },
        h('h2', { style: { fontSize: '1rem', margin: '8px 0' } }, 'Direct Chat'),
        h(Button, { disabled: busy, onClick: () => perform(async () => select(await root.sessions.create({}))) }, 'New Chat'),
        ...summary.ids.map((id, index) => h(Button, { key: id, disabled: busy,
          'aria-current': reference?.sessionId === id ? 'true' : undefined,
          onClick: () => perform(() => select(id)) }, summary.byId[id]?.title || `Chat ${index + 1}`)),
        error && h('p', { role: 'alert' }, error)),
        h('div', { style: { flex: 1, minWidth: 0, minHeight: 0 } }, reference
          ? h(SessionProvider, { session: reference }, renderSlot('direct-chat.content', {}))
          : h('p', { style: { margin: 28 } }, 'Choose a chat or start a new one.')))
    }

    async function boot(root, peer, selection, reconnect, lifetime) {
      async function load(plugin) { await root.plugin(plugin.default ?? plugin).await() }
      const scoped = signal => signal ? AbortSignal.any([signal, lifetime]) : lifetime
      installConnection(root, { interactions: 'answer', transport: {
        async fetch(path, init) {
          const endpoint = String(path).replace(/^api\//, '')
          const response = await post('rpc', { peer, endpoint, payload: JSON.parse(init.body) }, scoped(init.signal))
          if (response.status === 410) reconnect()
          return response
        },
        openStream: (endpoint, payload, signal) => stream(peer, endpoint, payload, scoped(signal), reconnect),
        // Without a factory, Connection sockets resolve against the Desktop document's Workspace Host.
        createWebSocket: deny,
      } })
      await load(Registry)
      await load(Gateway)
      await load(Remotes)
      await load(Renderer)
      await load({ inject: ['slots'], apply(ctx) {
        const locale = new LocaleRuntime(ctx, undefined, { languages: ['en'], preference: 'en' })
        ctx.provide('locale', locale)
        ctx.slots.installLocale(locale)
        ctx.provide('configForms', { get: () => form, developerTools: { enabled: idle } })
        ctx.provide('uiWorkspace', { openWorkspace: deny, openSession: deny })
        ctx.provide('sidebarRight', { openResource: deny, openTab: deny })
        ctx.provide('fileDrag', { actions: { start: deny } })
        ctx.provide('fileUpload', { upload: deny, uploadImage: deny })
        ctx.provide('commandUi', { register: () => () => {}, popupFor: () => undefined })
        ctx.provide('remoteAccess', { source: (kind, _id, action) => ({ ...idle,
          getSnapshot: () => kind === 'session' && visible.has(action) }) })
        ctx.slots.provideRoot({
          hooks: { workspaces: { ...idle, getSnapshot: () => workspaceSnapshot } },
          keyedHooks: { remoteAccess: () => idle },
          props: { useContextMenu: () => ({ getTriggerProps: () => ({}) }) },
        })
        ctx.slots.register({ name: 'root', children: {
          main: { kind: 'keyed', scope: 'root' },
          'direct-chat.content': { kind: 'single', scope: 'session' },
        } }, props => h(RenderBoundary, null, h(Workspace, { ...props, root, selection })))
        ctx.slots.register({ name: 'direct-chat.content' }, ({ renderFactorySlot }) => renderFactorySlot(
          'conversation.content', { variant: 'embedded', phase: 'active', hero: false },
          { slots: { views: ({ renderSlot }) => renderSlot('conversation.session', { view: 'chat' }) } },
        ))
      } })
      for (const plugin of [Sessions, UiSession, Conversation, Chat, Models]) await load(plugin)
      // The stock assistant Markdown renderer resolves media using the Desktop document's Host.
      root.effect(() => root.slots.register({ name: 'conversation.chat.node', key: 'assistant-step', priority: -1 },
        ({ node, groupPart }) => groupPart === 'reasoning' ? null : h('div', {
          style: { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' },
        }, node.data.blocks.filter(block => block.kind === 'text').map(block => block.text).join('\n'))))
      // Compaction summaries use the same Host-resolving Markdown delegate. The companion has no compaction service.
      for (const key of ['compaction', 'manual-compaction']) {
        root.effect(() => root.slots.register({ name: 'conversation.chat.node', key, priority: -1 }, () => null))
      }
      await root.sessions.refresh()
    }

    async function verifyCarrier(root, workspaceId, signal) {
      const check = (condition, label) => { if (!condition) throw new Error(`Carrier check failed: ${label}`) }
      const reply = await post('open', {}, signal)
      check(reply.ok, 'authenticated open')
      const { peer } = await reply.json()
      async function call(endpoint, request = {}) {
        const payload = { type: 'client-request', rpcId: crypto.randomUUID(), method: endpoint,
          payload: { args: { request } } }
        return post('rpc', { peer, endpoint, payload }, signal)
      }
      try {
        const ids = root.sessions.list.getSnapshot().ids
        check(ids.length > 0 && !ids.includes(workspaceId), 'isolated catalog with existing history')
        const content = [{ type: 'text', text: 'Synthetic carrier admission check' }]
        const prompt = { sessionId: workspaceId, requestId: crypto.randomUUID(), mode: 'queue', content }
        async function denied(request) {
          const response = await call('session/prompt', request)
          return response.ok && (await response.json()).result?.error?.code === 'remote-access/denied'
        }
        check(await denied(prompt), 'Workspace session prompt refused')
        check(await denied({ ...prompt, sessionId: ids[0], content: [] }), 'empty prompt refused')
        check(await denied({ ...prompt, sessionId: ids[0], content: [{ type: 'file', receiptId: 'fixture' }] }),
          'non-text prompt refused')
        for (const endpoint of ['terminal/open', 'session/openWorkspacePath', 'session/selectPreset']) {
          check((await call(endpoint)).status === 409, `${endpoint} refused`)
        }
        check((await call('session/create', { cwd: 'fixture-outside-root' })).status === 409, 'caller directory refused')
      } finally { check((await post('close', { peer }, signal)).status === 204, 'scope closed') }
      check((await post('renew', { peer }, signal)).status === 410, 'revoked capability refused')
      console.info('Direct Chat authenticated carrier checks passed')
    }

    function Panel() {
      const ref = React.useRef(null)
      const selection = React.useRef(null)
      const [generation, setGeneration] = React.useState(0)
      const [failed, setFailed] = React.useState(false)
      const [status, setStatus] = React.useState('Connecting to Direct Chat…')
      React.useEffect(() => {
        setFailed(false)
        setStatus('Connecting to Direct Chat…')
        const root = new Context()
        const lifetime = new AbortController()
        let peer
        let unmount
        let reconnecting = false
        function revoke() {
          if (!peer) return
          const closedPeer = peer
          peer = undefined
          void post('close', { peer: closedPeer }).catch(() => {})
        }
        function reconnect() {
          if (reconnecting || lifetime.signal.aborted) return
          reconnecting = true
          setGeneration(value => value + 1)
        }
        const ready = (async () => {
          const response = await post('open', {}, lifetime.signal)
          if (!response.ok) throw new Error('Direct Chat companion is unavailable')
          const opened = await response.json()
          peer = opened.peer
          lifetime.signal.throwIfAborted()
          await boot(root, peer, selection, reconnect, lifetime.signal)
          if (opened.testWorkspaceSession) await verifyCarrier(root, opened.testWorkspaceSession, lifetime.signal)
          lifetime.signal.throwIfAborted()
          unmount = root.uiRenderer.mount(ref.current)
          setStatus('')
        })().catch(error => {
          revoke()
          if (!lifetime.signal.aborted) {
            setFailed(true)
            setStatus(`Direct Chat could not open. ${error.message}`)
          }
        })
        const heartbeat = setInterval(async () => {
          if (!peer) return
          try {
            const response = await post('renew', { peer }, lifetime.signal)
            if (response.status === 410) reconnect()
          } catch { /* A broken transport never falls back to the Workspace Host. */ }
        }, 20_000)
        return () => {
          clearInterval(heartbeat)
          lifetime.abort()
          revoke()
          unmount?.()
          void ready.then(async () => {
            revoke()
            await root.fiber.dispose()
          }).catch(() => {})
        }
      }, [generation])
      return h('section', { style: { display: 'flex', flexDirection: 'column', width: '100%', height: '100%' } },
        status && h('p', { role: 'status', style: { padding: 20 } }, status),
        failed && h(Button, { onClick: () => setGeneration(value => value + 1) }, 'Retry connection'),
        h('div', { ref, style: { flex: 1, minHeight: 0 } }))
    }

    const inject = ['slots']
    function apply(ctx) {
      ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: panelId }, Panel))
      ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
        name: 'sidebar.panellist', id: panelId, label: 'Direct Chat', order: 5,
      }, ({ size }) => h('svg', { width: size ?? 18, height: size ?? 18, viewBox: '0 0 24 24',
        fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
        'aria-hidden': true },
      h('path', { d: 'M7.5 6.5h9a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-6l-5 3v-10a2 2 0 0 1 2-2Z' }),
      h('path', { d: 'M9 10h6m-6 2.75h3.5' }))))
    }
    return { inject, apply }
  },
})
