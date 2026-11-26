    const reasoningComposerPlugin = {
      inject: ['slots', 'remote', 'remote.settings', 'sessions', 'modelDirectories'],
      apply(ctx) {
        const settingsService = ctx.remote.settings
        const connection = suiteConnection(ctx)
        const modelDirectories = ctx.modelDirectories
        const sessions = ctx.sessions
        ctx.slots.inject('conversation.input.right', () => ctx.slots.register({ name: 'conversation.input.right',
          id: 'abinadwan-reasoning-preference', order: 25, inject: sessionId => ({
            directory: sessionId && !sessions.subagentAddress(sessionId) ? modelDirectories.directoryFor(sessionId) : null,
            sessionId,
          }) }, props => props.directory ? h(ReasoningComposer, { ...props, settingsService, connection, localeSource: ctx.get?.('locale') }) : null))
      },
    }

    const archiveManagerPlugin = {
      inject: ['slots', 'remote', 'remote.settings', 'remote.workspace', 'remote.session', 'sessions', 'workspaces', 'connection', 'uiSession'],
      apply(ctx) {
        const workspaceService = ctx.workspaces
        const uiSession = ctx.uiSession
        const host = ctx.connection.generation
        const lifetime = new AbortController()
        ctx.effect(() => () => lifetime.abort())
        const services = { settings: ctx.remote.settings, sessions: ctx.sessions.list, workspaces: workspaceService.list,
          locale: ctx.get?.('locale'), connection: suiteConnection(ctx, host), host, lifetime: lifetime.signal,
          workspaceRemote: ctx.remote.workspace, sessionRemote: ctx.remote.session,
          unarchive: typeof workspaceService.unarchiveSession === 'function' ? id => workspaceService.unarchiveSession(id) : undefined,
          whenRestoreAccess: (id, callback) => uiSession.whenAccess(id, restoreEndpoint, callback) }
        const archivePanel = 'abinadwan-chat-control-archive'
        // The native layout owns selection, More pinning and fallback when a
        // main entry retires. These registrations share the component lifetime.
        ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: archivePanel },
          props => h(ArchivePage, { ...props, services })))
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({ name: 'sidebar.panellist',
          id: archivePanel, order: 100,
          label: () => archiveCopy[uiLanguage(services.locale?.getSnapshot?.())].navigation },
          ({ size }) => h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
            stroke: 'currentColor', strokeWidth: pluginGlyphStrokeWidth, strokeLinecap: 'round',
            strokeLinejoin: 'round', 'aria-hidden': true },
            h('rect', { x: 3, y: 4, width: 18, height: 5, rx: 1 }),
            h('path', { d: 'M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9M10 13h4' }))))
      },
    }

