    function Details({ sessionId, projections, projectionState, sessions, workspaces, language }) {
      const t = value => uiCopy(value, language)
      // Values come from the tab seat's Session-scoped `useProjection` hook when
      // the Host supplies it, else from this Session's list projection snapshot.
      const pressure = projections?.contextPressure
      const breakdown = projections?.contextBreakdown
      const tokenUsage = projections?.tokenUsage
      const session = sessions?.byId?.[sessionId]
      const folders = Array.isArray(workspaces?.items) ? workspaces.items : []
      const linked = folders.filter(w => Array.isArray(w.sessionIds) && w.sessionIds.includes(sessionId))
      const used = good(pressure?.projectedTokens ?? pressure?.pressureTokens)
      const max = good(pressure?.contextWindow)
      const pct = max && used !== undefined ? Math.min(100, Math.round(100 * used / max)) : undefined
      const platform = typeof navigator === 'object' ?
        (navigator.userAgentData?.platform || navigator.platform) : undefined
      const environment = [
        line(t('Browser'), platform || t('Unavailable')),
        line(t('Workspaces'), linked.length),
        ...linked.map(w => line(h('bdi', null, '▣ ' + (w.title || t('Workspace'))), w.path || '')),
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
        context.push(line(t('Messages (estimated)'), compact(breakdown?.messageTokens)))
        context.push(line(t('Tool schemas (estimated)'), compact(breakdown?.toolsTokens)))
        context.push(line(t('System prompt (estimated)'), compact(breakdown?.systemTokens)))
        context.push(line(t('Free space'), compact(Math.max(0, max - used))))
      }
      context.push(line(t('Session'), session?.displayTitle || t('Unavailable')))
      context.push(line(t('Status'), t(session ? (session.running ? 'Running' : 'Idle') : 'Unavailable')))
      const outputs = [
        line(t('Output tokens'), compact(tokenUsage?.outputTokens)),
        line(t('Last activity'), good(session?.updatedAt) === undefined ?
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
      inject: ['slots', 'sidebarRight', 'sidebarRightTabs', 'sessions', 'workspaces'],
      apply(ctx) {
        const s = ctx.sessions.list
        const w = ctx.workspaces.list
        const localeSource = ctx.get?.('locale')
        const translate = value => () => uiCopy(value, uiLanguage(localeSource?.getSnapshot?.()))
        const subS = l => s.subscribe(l)
        const subW = l => w.subscribe(l)
        const getS = () => s.getSnapshot()
        const getW = () => w.getSnapshot()
        const open = () => ctx.sidebarRight.openTab(KIND)
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
          const live = useLiveProjections(props.useProjection)
          const sessionId = props.sessionId
          const listed = sessions?.projectionsBySession?.[sessionId]
          const fallback = listed?.values ?? sessions?.byId?.[sessionId]?.projectionValues
          const projections = live && (live.contextPressure || live.contextBreakdown || live.tokenUsage)
            ? live : fallback
          return h(Details, { sessionId, projections, projectionState: listed?.state, sessions, workspaces, language })
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
          const timers = new Set()
          let done = false
          const onSession = () => {
            const id = ctx.sidebarRight.mounted.getSnapshot()
            if (!id || visited.has(id)) return
            visited.add(id)
            const timeout = setTimeout(() => {
              timers.delete(timeout)
              if (done || ctx.sidebarRight.mounted.getSnapshot() !== id) return
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

