    function environmentSession(sessions, id) {
      if (typeof id !== 'string' || !id.trim() || sessions?.phase !== 'ready' || sessions.state === 'error' ||
          !Array.isArray(sessions.ids) || sessions.ids.filter(value => value === id).length !== 1 ||
          !sessions.byId || !Object.hasOwn(sessions.byId, id)) return undefined
      const session = sessions.byId[id]
      return session?.id === id && session.blank !== true && session.origin !== 'subagent' ? session : undefined
    }

    function environmentWorkspace(workspaces, id) {
      if (workspaces?.phase !== 'ready' || workspaces.state === 'error' || !Array.isArray(workspaces.items) ||
          !workspaces.items.every(item => item && typeof item.workspaceId === 'string' && item.workspaceId.trim() &&
            Array.isArray(item.sessionIds) && item.sessionIds.every(value => typeof value === 'string' && value.trim()))) return []
      const linked = workspaces.items.filter(item => item.sessionIds.includes(id))
      return linked.length === 1 && workspaces.items.filter(item => item.workspaceId === linked[0].workspaceId).length === 1
        ? linked : []
    }

    const environmentText = value => typeof value === 'string' ? value : undefined
    const environmentTokens = value => good(value) !== undefined && value <= Number.MAX_SAFE_INTEGER ? value : undefined

    function Details({ session, linked, projections, projectionState, language }) {
      const t = value => uiCopy(value, language)
      // Values come from the tab seat's Session-scoped `useProjection` hook when
      // the Host supplies it, else from this Session's list projection snapshot.
      const pressure = projections?.contextPressure
      const breakdown = projections?.contextBreakdown
      const tokenUsage = projections?.tokenUsage
      const used = environmentTokens(pressure?.projectedTokens ?? pressure?.pressureTokens)
      const max = environmentTokens(pressure?.contextWindow)
      const pct = max > 0 && used !== undefined ? Math.round(100 * Math.min(1, used / max)) : undefined
      const platform = typeof navigator === 'object' ?
        (navigator.userAgentData?.platform || navigator.platform) : undefined
      const environment = [
        line(t('Browser'), platform || t('Unavailable')),
        line(t('Workspaces'), linked.length),
        ...linked.map(w => line(h('bdi', null, '▣ ' + (environmentText(w.title) || t('Workspace'))), environmentText(w.path) || '')),
      ]
      const context = []
      if (pct === undefined) {
        context.push(h('p', { key: 'no-pressure', style: muted, 'data-context-fallback': projectionState || 'empty' },
          projectionState === 'loading' ? t('Loading context usage for this Session…')
            : projectionState === 'error' || projectionState === 'migration-required'
              ? t('Context usage is unavailable for this Session.')
              : t('Context use is available after the model reports usage.')))
      } else {
        context.push(line(t('{percent}% used').replace('{percent}', pct), '~' + compact(used) + ' / ' + compact(max)))
        context.push(h('div', { role: 'progressbar', 'aria-label': t('Context occupancy'),
          'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100,
          style: { background: 'rgba(127,127,127,.25)', borderRadius: 8,
            height: 6, overflow: 'hidden', margin: '7px 0' } },
          h('div', { style: { width: pct + '%', height: '100%', background: '#378fdb' } })))
        context.push(line(t('Messages (estimated)'), compact(environmentTokens(breakdown?.messageTokens))))
        context.push(line(t('Tool schemas (estimated)'), compact(environmentTokens(breakdown?.toolsTokens))))
        context.push(line(t('System prompt (estimated)'), compact(environmentTokens(breakdown?.systemTokens))))
        context.push(line(t('Free space'), compact(Math.max(0, max - used))))
      }
      context.push(line(t('Session'), environmentText(session?.displayTitle) || t('Unavailable')))
      context.push(line(t('Status'), t(session?.running === true ? 'Running' : session?.running === false ? 'Idle' : 'Unavailable')))
      const outputs = [
        line(t('Output tokens'), compact(environmentTokens(tokenUsage?.outputTokens))),
        line(t('Last activity'), good(session?.updatedAt) === undefined || session.updatedAt > 8640000000000000 ?
          t('Unavailable') : new Date(session.updatedAt).toLocaleString(language)),
        h('p', { key: 'output-note', style: muted },
          t('Output file lists require a separate, permission-checked files service.')),
      ]
      const cards = [
        section(t('Environment'), environment),
        section(t('Context'), context),
        section(t('Connectors'), [h('p', { key: 'conn', style: muted },
          t('Connector inventory is not available via the documented Client APIs used here.'))]),
        section(t('Outputs'), outputs),
        section(t('Changes'), [h('p', { key: 'diff', style: muted },
          t('Git changes require the Workspace changes integration.'))]),
      ]
      return h('aside', { 'data-environment-right-sidebar': '', lang: language, dir: language === 'ar' ? 'rtl' : 'ltr',
        style: { height: '100%', overflowY: 'auto', boxSizing: 'border-box',
          padding: '6px 16px 22px', color: 'inherit', fontSize: 12, lineHeight: 1.6 } },
        ...cards,
        h('p', { style: muted }, t('Read-only · No external requests from this Session panel.')))
    }
    function HeaderButton({ openInspector, localeSource }) {
      const language = useUiLanguage(localeSource)
      return h('button', { type: 'button', onClick: openInspector,
        'aria-label': uiCopy('Open Environment sidebar', language), title: uiCopy('Environment', language),
        'data-environment-header-action': '',
        style: { background: 'transparent', border: 0, color: 'inherit',
          display: 'inline-flex', justifyContent: 'center', alignItems: 'center',
          width: 30, height: 30, cursor: 'pointer' } },
        h(Icon, { size: 17 }))
    }
    const environmentPlugin = {
      inject: ['slots', 'sidebarRight', 'sidebarRightTabs', 'sessions', 'workspaces', 'connection'],
      apply(ctx) {
        const s = ctx.sessions.list
        const w = ctx.workspaces.list
        const localeSource = ctx.get?.('locale')
        const translate = value => () => uiCopy(value, uiLanguage(localeSource?.getSnapshot?.()))
        const subS = l => s.subscribe(l)
        const subW = l => w.subscribe(l)
        const getS = () => s.getSnapshot()
        const getW = () => w.getSnapshot()
        const host = ctx.connection.generation
        const listeners = new Set()
        let scope = { active: true, host: host.getSnapshot(), revision: 0 }
        const invalidate = () => {
          scope = { active: true, host: host.getSnapshot(), revision: scope.revision + 1,
            previousSessions: getS(), previousWorkspaces: getW() }
          for (const notify of [...listeners]) notify()
        }
        ctx.effect(() => {
          const unsubscribe = host.subscribe(invalidate)
          const off = ctx.on('connection/reset', invalidate)
          return () => {
            unsubscribe()
            off()
            scope = { ...scope, active: false }
            for (const notify of [...listeners]) notify()
            listeners.clear()
          }
        }, 'environment-sidebar: connection scope')
        const connectionScope = {
          subscribe(notify) { listeners.add(notify); return () => listeners.delete(notify) },
          getSnapshot: () => scope,
        }
        const open = () => { if (scope.active && host.getSnapshot()) ctx.sidebarRight.openTab(KIND) }
        // `sidebar.right.pane.tab` is a strict Session-scope seat: the Harness
        // standard kit passes `sessionId` and the Session-bound `useProjection`
        // hook (ui-session SessionStandardProps). The hook re-renders this body
        // as projection frames arrive after each model response. Whether the
        // hook exists is fixed for a registration, so the hook order is stable.
        function useLiveProjections(useProjection) {
          if (typeof useProjection !== 'function') return undefined
          return {
            contextPressure: useProjection('contextPressure'),
            contextBreakdown: useProjection('contextBreakdown'),
            tokenUsage: useProjection('tokenUsage'),
          }
        }
        function Body(props) {
          const language = useUiLanguage(localeSource)
          const sessions = React.useSyncExternalStore(subS, getS, getS)
          const workspaces = React.useSyncExternalStore(subW, getW, getW)
          const current = suiteWatch(connectionScope)
          const seatRevision = React.useRef(current.revision)
          const live = useLiveProjections(props.useProjection)
          const sessionId = props.sessionId
          const connected = current.active && Boolean(current.host) && host.getSnapshot() === current.host
          // Native external-store snapshots are stable until invalidation.
          // Revalidate on snapshot, Session or connection revision changes, not
          // on unrelated live token/projection updates within the same seat.
          const session = React.useMemo(() => connected && sessions !== current.previousSessions
            ? environmentSession(sessions, sessionId) : undefined,
          [sessions, sessionId, connected, current.revision, current.previousSessions])
          const linked = React.useMemo(() => session && workspaces !== current.previousWorkspaces
            ? environmentWorkspace(workspaces, sessionId) : [],
          [workspaces, session, sessionId, current.revision, current.previousWorkspaces])
          const listed = session && Object.hasOwn(sessions.projectionsBySession ?? {}, sessionId)
            ? sessions.projectionsBySession[sessionId] : undefined
          const failed = ['error', 'migration-required'].includes(listed?.state)
          const fallback = listed ? (listed.state === 'ready' ? listed.values : undefined) : session?.projectionValues
          // An existing seat can retain its old binding after a connection reset.
          // Until that seat is remounted, use only the refreshed authorized list.
          const currentLive = session && !failed && seatRevision.current === current.revision && live &&
            (live.contextPressure || live.contextBreakdown || live.tokenUsage) ? live : undefined
          const projections = session && !failed ? currentLive ?? fallback : undefined
          return h(Details, { session, linked, projections,
            projectionState: !session ? 'error' : listed?.state, language })
        }
        ctx.effect(() => ctx.sidebarRightTabs.register({
          id: TYPE + '/environment-context', kind: KIND, title: translate('Environment & Context'),
          guide: [{ id: 'open', order: 12, title: translate('Environment & Context'),
            description: translate('Current context and workspace details') }],
        }), 'environment-sidebar: type')
        ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
          // The keyed seat dispatches by the tab TYPE id, not its package root.
          name: 'sidebar.right.pane.tab', key: TYPE + '/environment-context',
          inject: sessionId => ({ sessionId }),
        }, Body))
        // Already-open tabs keep their saved title unless the native title seat renders it.
        ctx.slots.inject('sidebar.right.pane.tab.title', () => ctx.slots.register({
          name: 'sidebar.right.pane.tab.title', key: TYPE + '/environment-context',
        }, function EnvironmentTitle() {
          const language = useUiLanguage(localeSource)
          return h('span', { lang: language }, uiCopy('Environment & Context', language))
        }))
        ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
          name: 'conversation.session.header.utilities',
          id: 'environment-sidebar-toggle', order: 35,
          inject: () => ({ openInspector: open, localeSource }),
        }, HeaderButton))
        ctx.effect(() => {
          const visited = new Set()
          let visitedRevision = scope.revision
          const timers = new Set()
          let done = false
          const onSession = () => {
            if (visitedRevision !== scope.revision) {
              visited.clear()
              visitedRevision = scope.revision
            }
            const id = ctx.sidebarRight.mounted.getSnapshot()
            if (!scope.active || !host.getSnapshot() || !id || visited.has(id)) return
            const revision = scope.revision
            visited.add(id)
            const timeout = setTimeout(() => {
              timers.delete(timeout)
              if (done || revision !== scope.revision || !scope.active || ctx.sidebarRight.mounted.getSnapshot() !== id) return
              try { open() } catch {
                visited.delete(id)
                // Host errors can include private Session IDs, paths or provider data.
                console.warn('[environment-sidebar] auto-open unavailable')
              }
            }, 0)
            timers.add(timeout)
          }
          const unsubscribe = ctx.sidebarRight.mounted.subscribe(onSession)
          onSession()
          return () => {
            done = true
            unsubscribe()
            for (const id of timers) clearTimeout(id)
          }
        }, 'environment-sidebar: initial view')
      },
    }

