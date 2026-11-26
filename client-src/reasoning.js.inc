    const reasoningCell = { padding: '4px 8px', textAlign: 'end', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }
    const reasoningStatisticsStyle = `
      .abinadwan-reasoning-statistics[role="dialog"] { width: min(560px, 100%); }
      .abinadwan-reasoning-statistics-rtl[role="dialog"] { direction: rtl; text-align: start; }
    `

    /** Same-origin POST to an owner-only Adaptive Reasoning route. */
    async function reasoningPost(path, body, signal) {
      const endpoint = new URL(`api/abinadwan-reasoning/${path}`, document.baseURI)
      if (endpoint.origin !== document.location.origin) throw new Error('Cross-origin reasoning endpoint')
      const result = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', redirect: 'error', cache: 'no-store', signal,
        headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      return { ok: result.ok, status: result.status, body: await result.json().catch(() => null) }
    }

    function ReasoningStatistics({ open, onClose, nameOf, language, connection }) {
      const t = value => uiCopy(value, language)
      suiteWatch(connection)
      const generation = connection.getResetGeneration()
      const [result, setResult] = React.useState({ status: 'loading' })
      const pending = React.useRef(null)
      const state = result.generation === generation ? result : { status: 'loading' }
      function load(path) {
        if (connection.getResetGeneration() !== generation || (path === 'stats/reset' && pending.current)) return
        pending.current?.abort()
        const controller = new AbortController()
        pending.current = controller
        const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(12000)])
        const current = () => pending.current === controller && !controller.signal.aborted &&
          connection.getResetGeneration() === generation
        setResult({ status: 'loading', generation })
        const failure = { status: 'failed', reset: path === 'stats/reset', generation }
        reasoningPost(path, {}, signal).then(response => {
          if (current()) setResult(!signal.aborted && response.ok && response.body
            ? { status: 'ready', stats: response.body, generation } : failure)
        }).catch(() => { if (current()) setResult(failure) }).finally(() => {
          if (pending.current === controller) pending.current = null
        })
      }
      React.useEffect(() => {
        if (open) load('stats')
        return () => { pending.current?.abort(); pending.current = null }
      }, [open, generation])
      const stats = state.stats
      const formatLocale = language === 'ar' ? 'ar' : 'en-US'
      const count = value => Number(value || 0).toLocaleString(formatLocale)
      const effortLabel = (effort, scope) => (effort === 'default' ? t('Provider default') : nameOf(effort)) +
        (scope === 'subagent' ? t(' (subagents)') : '')
      const requestGroup = t('Requests by effort')
      const line = (label, value) => h('div', { key: label, style: { display: 'flex', justifyContent: 'space-between', gap: 16 } },
        h('span', null, label), h('span', { style: { fontVariantNumeric: 'tabular-nums' } }, value))
      const group = (title, children) => h('section', { key: title, style: { marginBottom: 14 } },
        h('h3', { style: { fontSize: 13, fontWeight: 650, margin: '0 0 6px' } }, title), children)
      const routeRows = stats?.routes ?? []
      const rows = stats ? ['session', 'subagent'].flatMap(scope => Object.entries(stats.requests?.[scope] || {})
        .map(([effort, row]) => ({ scope, effort, row }))) : []
      const body = state.status === 'loading' ? h('div', { role: 'status' }, t('Loading statistics…'))
        : state.status === 'failed' ? h('div', { role: 'status' },
          t(state.reset ? 'Statistics reset could not be confirmed.' : 'Statistics are unavailable.'))
        : h('div', { style: { fontSize: 13, lineHeight: 1.6 } },
          group(t('Messages'), [line(t('Total'), count(stats.messages)),
            line(t('Session effort'), count(stats.sources?.manual)),
            line(t('Provider default'), count(stats.sources?.default))]),
          group(requestGroup, rows.length ? h('div', { role: 'region', 'aria-label': requestGroup, tabIndex: 0,
            style: { maxWidth: '100%', overflowX: 'auto' } },
            h('table', { style: { borderCollapse: 'collapse', width: '100%' } },
              h('thead', null, h('tr', null, ...['Effort', 'Requests', 'Input tokens', 'Output tokens', 'Reasoning tokens', 'Average time']
                .map((label, index) => h('th', { key: label, scope: 'col', style: { ...reasoningCell,
                  whiteSpace: 'normal', textAlign: index ? 'end' : 'start', fontWeight: 600 } }, t(label))))),
              h('tbody', null, ...rows.map(({ scope, effort, row }) => h('tr', { key: `${scope}:${effort}` },
                h('th', { scope: 'row', style: { ...reasoningCell, textAlign: 'start', fontWeight: 400,
                  whiteSpace: 'normal', overflowWrap: 'anywhere' } }, h('bdi', null, effortLabel(effort, scope))),
                h('td', { style: reasoningCell }, count(row.requests)),
                h('td', { style: reasoningCell }, count(row.inputTokens)),
                h('td', { style: reasoningCell }, count(row.outputTokens)),
                h('td', { style: reasoningCell }, row.reasoningReported
                  ? count(row.reasoningTokens) + (row.reasoningReported < row.requests
                    ? t(' ({reported} of {total})').replace('{reported}', count(row.reasoningReported)).replace('{total}', count(row.requests))
                    : '')
                  : t('Not reported')),
                h('td', { style: reasoningCell }, row.timed ? t('{time} s').replace('{time}',
                  (row.durationMs / row.timed / 1000).toLocaleString(formatLocale,
                    { minimumFractionDigits: 1, maximumFractionDigits: 1 })) : '—')))))
          ) : h('div', { style: lifecycleMuted }, t('No requests yet.'))),
          routeRows.length ? group(t('Requests by provider and model'), h('ul', { style: { paddingInlineStart: 20 } },
            ...routeRows.map(({ scope, provider, model, effort, requests }) => h('li',
              { key: JSON.stringify([scope, provider, model, effort]) },
              h('bdi', { style: { overflowWrap: 'anywhere' } }, `${provider} / ${model}`),
              ' · ', h('bdi', { style: { overflowWrap: 'anywhere' } }, effortLabel(effort, scope)), ' · ', count(requests))))) : null,
          h('p', { style: { ...lifecycleMuted, margin: 0 } },
            t('Times run on this computer from stream start to the saved reply. Reasoning tokens appear only when the provider reports them. No savings are estimated.')))
      const description = stats ? t(stats.persistent
        ? 'Aggregate counts saved in this Profile since {date}. Nothing is sent anywhere.'
        : 'Aggregate counts kept in memory until Harness restarts since {date}. Nothing is sent anywhere.')
        .replace('{date}', new Date(stats.since).toLocaleString(formatLocale)) : undefined
      const dir = language === 'ar' ? 'rtl' : 'ltr'
      return h(Modal, { open, onClose, title: t('Reasoning statistics'), closeLabel: t('Close'), description,
        className: 'abinadwan-reasoning-statistics' + (dir === 'rtl' ? ' abinadwan-reasoning-statistics-rtl' : ''),
        footer: h('div', { style: lifecycleActions },
          h(Button, { size: 'sm', variant: 'outline', disabled: state.status !== 'ready', onClick: () => load('stats/reset') }, t('Reset statistics')),
          state.status === 'failed' ? h(Button, { size: 'sm', variant: 'outline',
            onClick: () => load('stats') }, t('Reload statistics')) : null,
          h(Button, { size: 'sm', onClick: onClose }, t('Done'))) },
      h('style', null, reasoningStatisticsStyle),
      h('div', { lang: language, dir, style: { minWidth: 0 } }, body))
    }

    const reasoningSignals = {
      retry: 'Retry or empty input', continuation: 'Continuation', greeting: 'Greeting',
      length: 'Request length', 'advanced-topic': 'Advanced topic', 'complex-topic': 'Complex topic',
      'standard-topic': 'Standard topic', code: 'Code block', trace: 'Error trace', 'multi-step': 'Multiple steps',
      math: 'Math', attachment: 'Attachment', 'asked-deeper': 'Request for deeper analysis',
      'asked-briefer': 'Request for a shorter answer',
    }

    function ReasoningRecommendation({ sessionId, selection, settings, onClose, nameOf, connection, language }) {
      const t = value => uiCopy(value, language)
      const [sample, setSample] = React.useState('')
      const [result, setResult] = React.useState(null)
      const pending = React.useRef(null)
      const adaptive = settings.record?.mode === 'adaptive'
      const generation = suiteWatch(connection)
      React.useEffect(() => {
        setResult(null)
        return () => pending.current?.abort()
      }, [generation, adaptive])

      async function analyze(event) {
        event.preventDefault()
        pending.current?.abort()
        const controller = new AbortController()
        pending.current = controller
        setResult({ loading: true })
        try {
          const { provider, model } = selection
          const response = await reasoningPost('recommend', { sessionId, provider, model, sample },
            AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]))
          if (!controller.signal.aborted) setResult(response.ok && typeof response.body?.recommendation === 'string'
            ? response.body : { error: true })
        } catch {
          if (!controller.signal.aborted) setResult({ error: true })
        }
      }

      return h(Modal, { open: true, onClose, title: t('Effort recommendation'), closeLabel: t('Close'),
        footer: h(Button, { size: 'sm', onClick: onClose }, t('Done')) },
      h('div', { lang: language, dir: language === 'ar' ? 'rtl' : 'ltr',
        style: { display: 'grid', gap: 8, minWidth: 0, overflowWrap: 'anywhere' } },
        h('p', { style: lifecycleMuted }, t('Recommendations use a local classifier on the Harness Host. The conversation’s reasoning effort stays as selected.')),
        h('label', { style: lifecycleLabel }, t('Mode'), h('select', { style: lifecycleSelect,
          disabled: !settings.writable, value: adaptive ? 'adaptive' : 'manual', onChange: event => {
            setResult(null)
            if (settings.record) void settings.save({ ...settings.record, mode: event.target.value })
          } }, h('option', { value: 'manual' }, t('Manual')),
          h('option', { value: 'adaptive' }, t('Automatic recommendation preview')))),
        h(SuiteRecordStatus, { settings, language }),
        adaptive ? h('form', { onSubmit: analyze }, h('label', { style: lifecycleLabel }, t('Text to analyze'),
          h('textarea', { rows: 4, maxLength: 4000, value: sample, dir: 'auto',
            onChange: event => { pending.current?.abort(); setSample(event.target.value); setResult(null) } })),
        h(Button, { type: 'submit', size: 'sm', disabled: !sample.trim() || result?.loading }, t('Analyze'))) : null,
        result && adaptive ? h('div', { role: result.error ? 'alert' : 'status' },
          result.loading ? t('Analyzing…') : result.error ? t('No recommendation is available for this Session and model.')
            : h(React.Fragment, null, t(result.source === 'manual' ? 'Selected effort' : 'Suggested effort'), ': ',
              h('bdi', null, nameOf(result.recommendation)), ' · ', t(result.tier),
              (result.signals?.length ? ' · ' + result.signals.map(signal => reasoningSignals[signal]).filter(Boolean).map(t).join(language === 'ar' ? '، ' : ', ') : ''))) : null))
    }

    function ReasoningComposer({ directory, sessionId, settingsService, connection, useRemoteAccess, useAccess, localeSource }) {
      const language = useUiLanguage(localeSource)
      const t = value => uiCopy(value, language)
      const settings = useSuiteRecord(settingsService, 'adaptive-reasoning', useRemoteAccess, connection)
      const directoryState = suiteWatch(directory.store)
      const canSelect = useAccess?.('session/selectModel') === true
      const canViewStats = useRemoteAccess?.('settings/describe') === true
      const [open, setOpen] = React.useState(false)
      const [working, setWorking] = React.useState(false)
      const [notice, setNotice] = React.useState(null)
      const [statsOpen, setStatsOpen] = React.useState(false)
      const [recommendOpen, setRecommendOpen] = React.useState(false)
      const busy = React.useRef(false)
      const noticeId = React.useRef(0)
      const mounted = React.useRef(false)
      const routeRevision = React.useRef(0)
      const selection = directoryState.current
      React.useEffect(() => {
        routeRevision.current++
        setNotice(null)
      }, [sessionId, selection?.provider, selection?.model, directoryState.routable])
      React.useEffect(() => { void directory.load().catch(() => {}) }, [directory])
      React.useEffect(() => {
        mounted.current = true
        return () => { mounted.current = false }
      }, [])

      function capability(snapshot) {
        const current = snapshot.current
        if (!current || snapshot.routable !== true) return null
        return snapshot.groups.find(group => group.id === current.provider)?.models
          .find(model => model.id === current.model)?.reasoning
      }

      function show(text, success = false) {
        if (mounted.current) setNotice({ id: ++noticeId.current, text, success })
      }

      const reasoning = capability(directoryState)
      const level = id => reasoning?.efforts?.find(row => row.id === id)
      const nameOf = id => level(id)?.name || id

      if (!canSelect || !selection || !reasoning?.efforts?.length) return null
      const effort = selection.reasoningEffort ?? reasoning.defaultEffort
      const record = settings.record
      const preferences = record?.preferences ?? []
      const isCurrentRoute = row => row.provider === selection.provider && row.model === selection.model
      const saved = preferences.find(isCurrentRoute)
      const currentLabel = level(effort)?.name || effort || t('Provider default')
      const savedLabel = saved
        ? language === 'ar' ? `التفضيل المحفوظ: ${nameOf(saved.effort)}${level(saved.effort) ? '' : ' (غير متاح)'}` : `Saved preference: ${nameOf(saved.effort)}${level(saved.effort) ? '' : ' (unavailable)'}`
        : record ? t('No saved preference') : t('Saved preferences unavailable')

      async function changeEffort(current, value, manual, stillCurrent) {
        const expected = { provider: current.provider, model: current.model, reasoningEffort: value }
        const result = await reasoningPost('effort', { sessionId, ...expected, ...(manual ? { mode: 'manual' } : {}) })
        if (!stillCurrent()) return
        if (result.status === 409 && result.body?.error === 'session-unavailable') {
          show(manual ? t('Start or resume this chat before changing its effort.') :
            t('Start or resume this chat before applying the saved effort.'))
          return
        }
        if (result.status === 409 && result.body?.error === 'preference-changed') settings.reload()
        const confirmed = result.body?.selected
        if (!result.ok || confirmed?.provider !== expected.provider || confirmed?.model !== expected.model ||
            confirmed?.reasoningEffort !== value) throw new Error('Effort selection was not accepted')
        show(manual ? t('Effort changed.') : t('Effort applied.'), true)
      }

      async function selectItem(id) {
        if (busy.current) return
        setOpen(false)
        if (id === 'reload') { settings.reload(); return }
        if (id === 'stats') { if (canViewStats) setStatsOpen(true); return }
        if (id === 'recommend') { setRecommendOpen(true); return }
        const latest = directory.store.getSnapshot()
        const current = latest.current
        const available = capability(latest)
        if (!current || !isCurrentRoute(current) || !available || latest.pending != null) return
        const offered = value => available.efforts.some(option => option.id === value)
        const currentEffort = current.reasoningEffort ?? available.defaultEffort
        const revision = routeRevision.current
        const reset = connection.getResetGeneration()
        const stillCurrent = () => {
          const snapshot = directory.store.getSnapshot()
          return mounted.current && routeRevision.current === revision &&
            connection.getResetGeneration() === reset && snapshot.routable === true &&
            snapshot.current && isCurrentRoute(snapshot.current)
        }
        busy.current = true
        setWorking(true)
        try {
          if (id === 'save' || id === 'remove') {
            if (!settings.writable || !record || (id === 'remove' && !saved) || (id === 'save' && !offered(currentEffort))) return
            const remaining = preferences.filter(row => !isCurrentRoute(row))
            const next = id === 'save' ? [...remaining, { provider: current.provider,
              model: current.model, effort: currentEffort }] : remaining
            const savedOk = await settings.save({ ...record, preferences: next })
            if (stillCurrent()) show(savedOk ? (id === 'save' ? t('Preference saved.') : t('Preference removed.')) :
              t('Preference could not be updated.'), savedOk)
          } else {
            const manual = id !== 'apply'
            const value = manual ? available.efforts.find(option => `effort:${option.id}` === id)?.id : saved?.effort
            if (value && value !== current.reasoningEffort && offered(value)) await changeEffort(current, value, manual, stillCurrent)
          }
        } catch {
          if (stillCurrent()) show(t('Harness could not change the effort.'))
        } finally {
          busy.current = false
          setWorking(false)
        }
      }

      const items = [
        { type: 'label', id: 'session-label', text: t('Current session') },
        ...reasoning.efforts.map(option => ({ id: 'effort:' + option.id, label: option.name || option.id })),
        { type: 'separator', id: 'preference-divider' },
        { type: 'label', id: 'preference-label', text: savedLabel },
        { id: 'save', label: t('Save current effort'), disabled: !settings.writable || !level(effort) || saved?.effort === effort },
        ...(saved ? [
          { id: 'apply', label: t('Apply saved effort'), disabled: !level(saved.effort) || saved.effort === selection.reasoningEffort },
          { id: 'remove', label: t('Remove saved preference'), disabled: !settings.writable },
        ] : []),
        ...(Modal ? [{ type: 'separator', id: 'more-divider' },
          ...(canViewStats ? [{ id: 'stats', label: t('Reasoning statistics…') }] : []),
          { id: 'recommend', label: t('Effort recommendation…') }] : []),
        ...(['conflict', 'unavailable'].includes(settings.status)
          ? [{ id: 'reload', label: t('Reload preferences') }] : []),
      ]
      const selectedIds = level(effort) ? ['effort:' + effort] : []
      const description = (language === 'ar' ? 'الاستدلال التكيفي: ' : 'Adaptive Reasoning: ') + currentLabel
      const trigger = h(Button, { variant: 'toolbar', size: 'sm', icon: suiteGlyph('adaptive-reasoning', 14),
        lang: language, dir: language === 'ar' ? 'rtl' : 'ltr', title: description, 'aria-label': description,
        'aria-haspopup': 'menu', 'aria-expanded': open, disabled: working || directoryState.pending != null,
        onClick: () => setOpen(value => !value) }, currentLabel)
      return h('span', { lang: language, dir: language === 'ar' ? 'rtl' : 'ltr' },
        h(Menu, { open, anchor: trigger, items, selectedIds,
          portal: true, side: 'top', align: 'end', compact: true, autoFocus: true,
          onClose: () => setOpen(false), onSelect: id => void selectItem(id) }),
        Modal && statsOpen && canViewStats ? h(ReasoningStatistics, { open: statsOpen, onClose: () => setStatsOpen(false), nameOf, language, connection }) : null,
        Modal && recommendOpen ? h(ReasoningRecommendation, { key: JSON.stringify([sessionId, selection.provider, selection.model,
          selection.reasoningEffort]), sessionId, selection, settings, connection, language, onClose: () => setRecommendOpen(false), nameOf }) : null,
        notice ? h(Toast, { key: notice.id, text: notice.text, tone: notice.success ? 'success' : undefined,
          holdMs: 2400, onDone: () => setNotice(null) }) : null)
    }

