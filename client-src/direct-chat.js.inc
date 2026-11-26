    // ---------------------------------------------------------------- Direct Chat
    const DIRECT_CHAT_ID = 'abinadwan-direct-chat'
    function DirectChatButton({ wide, useRemoteAccess, startChat, language }) {
      const permitted = typeof useRemoteAccess === 'function' ? useRemoteAccess('session/create') : false
      const inflight = React.useRef(false)
      const [status, setStatus] = React.useState('idle')
      if (!permitted) return null
      const busy = status === 'pending'
      const copy = directChatCopy[language]
      const label = status === 'failed' ? copy.retryOpen : copy.open
      async function open() {
        if (inflight.current) return
        inflight.current = true
        setStatus('pending')
        try {
          await startChat()
          setStatus('idle')
        } catch {
          console.warn('[abinadwan-direct-chat] Could not open Direct Chat')
          setStatus('failed')
        } finally {
          inflight.current = false
        }
      }
      return h('div', { 'data-abinadwan-direct-chat': '', lang: language, dir: language === 'ar' ? 'rtl' : 'ltr',
        style: { padding: '2px 4px', overflowWrap: 'anywhere' } },
        h('button', { type: 'button', 'aria-disabled': busy, onClick: open,
          'aria-label': busy ? copy.opening : label, 'aria-busy': busy,
          title: label, style: { display: 'inline-flex', gap: 7, alignItems: 'center',
            cursor: busy ? 'wait' : 'pointer', border: 0, borderRadius: 8,
            padding: '8px 10px', color: 'inherit', background: 'transparent', font: 'inherit',
            width: '100%', justifyContent: 'center' } },
          suiteGlyph('direct-chat', 16),
          wide ? h('span', null, label) : null),
        status === 'failed' ? h('div', { role: 'alert', style: { fontSize: 12, padding: 8 } },
          copy.openFailed) : null)
    }
    const directChatCopy = {
      en: {
        open: 'Direct Chat', opening: 'Opening Direct Chat', retryOpen: 'Retry Direct Chat',
        openFailed: 'Unable to finish opening Direct Chat. Check your connection and retry.',
        history: 'Direct Chat history', search: 'Search Direct Chat', recent: 'Last activity', creation: 'Creation time',
        order: 'Sort by', loading: 'Loading conversations…', error: 'Direct Chat history is unavailable.',
        empty: 'No Direct Chat conversations yet.', noMatches: 'No conversations match your search.',
        previous: 'Previous', next: 'Next', close: 'Close', retry: 'Retry', archived: 'Archived', protected: 'Protected',
        creationUnavailable: 'Complete creation times are unavailable. Creation order supports up to 100 registered conversations. Showing last activity order.',
        rename: 'Rename', title: 'Conversation title', save: 'Save', cancel: 'Cancel',
        renameFailed: 'The name could not be saved.',
        incompleteTitles: 'Some conversations have no title metadata in the Host catalog. Title search may be incomplete; try a Session ID.',
      },
      ar: {
        open: 'الدردشة المباشرة', opening: 'جارٍ فتح الدردشة المباشرة', retryOpen: 'إعادة محاولة فتح الدردشة المباشرة',
        openFailed: 'تعذّر فتح الدردشة المباشرة. تحقّق من الاتصال وحاول مرة أخرى.',
        history: 'سجل الدردشة المباشرة', search: 'البحث في الدردشة المباشرة', recent: 'آخر نشاط', creation: 'وقت الإنشاء',
        order: 'الترتيب حسب', loading: 'جارٍ تحميل المحادثات…', error: 'سجل الدردشة المباشرة غير متاح.',
        empty: 'لا توجد محادثات مباشرة بعد.', noMatches: 'لا توجد محادثات مطابقة للبحث.',
        previous: 'السابق', next: 'التالي', close: 'إغلاق', retry: 'إعادة المحاولة', archived: 'مؤرشفة', protected: 'محمية',
        creationUnavailable: 'تواريخ الإنشاء الكاملة غير متاحة. يدعم هذا الترتيب حتى ١٠٠ محادثة مسجّلة. يُعرض ترتيب آخر نشاط بدلاً منه.',
        rename: 'إعادة التسمية', title: 'عنوان المحادثة', save: 'حفظ', cancel: 'إلغاء',
        renameFailed: 'تعذّر حفظ الاسم.',
        incompleteTitles: 'بعض المحادثات لا تتوفر عناوينها في فهرس المضيف. قد لا يشملها البحث بالعنوان؛ جرّب معرّف الجلسة.',
      },
    }

    // Sort only authorized Session metadata. Never load transcripts or fabricate
    // creation timestamps when the bounded Host catalog cannot provide them.
    function filterAndSortDirectChat(inventory, search, order, creationReady, createdAt) {
      const query = search.trim().normalize('NFC').toLowerCase()
      const matching = inventory.filter(({ id, row, searchTitle }) => !query || [id, searchTitle, row.title, row.displayTitle].some(value =>
        typeof value === 'string' && value.normalize('NFC').toLowerCase().includes(query)))
      const useCreation = order === 'creation' && creationReady
      const timestamp = ({ id, row }) => useCreation ? createdAt[id]
        : Number.isFinite(row.updatedAt) ? row.updatedAt : 0
      return matching.sort((a, b) => timestamp(b) - timestamp(a) ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    }

    function DirectChatHistory({ onClose, services, useRemoteAccess, copy, language }) {
      const workspace = suiteWatch(services.workspaces)
      const sessions = suiteWatch(services.sessions)
      const generation = suiteWatch(services.connection)
      const settings = useSuiteRecord(services.settings, 'conversation-lifecycle', useRemoteAccess, services.connection)
      const [search, setSearch] = React.useState('')
      const [order, setOrder] = React.useState('recent')
      const [page, setPage] = React.useState(0)
      const [attempt, setAttempt] = React.useState(0)
      const [result, setResult] = React.useState(null)
      const [edit, setEdit] = React.useState(null)
      const mounted = React.useRef(true)
      React.useEffect(() => {
        mounted.current = true
        return () => { mounted.current = false }
      }, [])
      React.useEffect(() => {
        const cancel = new AbortController()
        services.lookup(order, cancel.signal).then(value => {
          if (!cancel.signal.aborted) setResult({ value, generation, order, attempt })
        }).catch(() => {
          if (!cancel.signal.aborted) setResult({ error: true, generation, order, attempt })
        })
        return () => cancel.abort()
      }, [services, generation, order, attempt])
      const current = result?.generation === generation && result.order === order && result.attempt === attempt ? result : null
      const ready = catalogReady(workspace, sessions)
      const selected = ready && current?.value?.workspaceId ? workspace.items.find(row => row.workspaceId === current.value.workspaceId) : null
      const inventory = React.useMemo(() => selected ? conversationInventory(workspace, sessions, selected).rows : [],
        [selected, workspace, sessions])
      const createdAt = current?.value?.createdAt
      const creationReady = Boolean(createdAt) && inventory.every(({ id }) => Object.hasOwn(createdAt, id))
      const incompleteTitles = inventory.some(({ searchTitle }) => searchTitle === undefined)
      const rows = React.useMemo(() => filterAndSortDirectChat(inventory, search, order, creationReady, createdAt),
        [inventory, search, order, creationReady, createdAt])
      const limit = 25
      const activePage = Math.min(page, Math.max(0, Math.ceil(rows.length / limit) - 1))
      const record = settings.record
      const protectedIds = new Set(record?.protectedIds)
      const protectedWorkspace = record?.protectedWorkspaces?.includes(selected?.workspaceId)
      const archived = new Set(workspace?.archivedSessionIds)
      const error = current?.error || workspace?.state === 'error' || ready && current?.value?.workspaceId && !selected
      const loaded = ready && current?.value && !error
      const shown = rows.slice(activePage * limit, (activePage + 1) * limit)
      const editing = edit && edit.generation === generation && shown.some(item => item.id === edit.id) &&
        !protectedWorkspace && !protectedIds.has(edit.id) ? edit : null

      function changeOrder(event) {
        setPage(0)
        setEdit(null)
        setOrder(event.target.value)
      }

      async function rename(event) {
        event.preventDefault()
        if (!editing || editing.busy || !services.rename || !editing.title.trim()) return
        setEdit({ ...editing, busy: true, error: false })
        try {
          await services.rename(selected.workspaceId, editing.id, editing.title.trim(), generation)
          if (mounted.current) setEdit(null)
        } catch {
          if (mounted.current) setEdit({ ...editing, busy: false, error: true })
        }
      }

      return h(Modal, { open: true, onClose, title: copy.history, closeLabel: copy.close,
        footer: h(Button, { size: 'sm', onClick: onClose }, copy.close) },
      h('div', { lang: language, dir: language === 'ar' ? 'rtl' : 'ltr',
        style: { display: 'grid', gap: 8, overflowWrap: 'anywhere' } },
      h('label', { style: lifecycleLabel }, copy.search, h('input', { type: 'search', dir: 'auto', maxLength: 256,
        style: lifecycleSelect, value: search, onChange: event => { setSearch(event.target.value); setPage(0); setEdit(null) } })),
      h('label', { style: lifecycleLabel }, copy.order, h('select', { style: lifecycleSelect, value: order, onChange: changeOrder },
        h('option', { value: 'recent' }, copy.recent), h('option', { value: 'creation' }, copy.creation))),
      error ? h('div', { role: 'alert' }, copy.error, ' ', h(Button, { size: 'sm', onClick: () => setAttempt(attempt + 1) }, copy.retry))
        : !loaded ? h('p', { role: 'status' }, copy.loading)
        : h(React.Fragment, null,
          order === 'creation' && selected && !creationReady ? h('p', { role: 'status' }, copy.creationUnavailable) : null,
          search.trim() && incompleteTitles ? h('p', { role: 'status' }, copy.incompleteTitles) : null,
          rows.length ? h('ul', { style: { listStyle: 'none', padding: 0, margin: 0 } }, ...shown.map(({ id, row, searchTitle }) => {
            const guarded = protectedWorkspace || protectedIds.has(id)
            return h('li', { key: id, style: lifecycleActions },
              h(Button, { size: 'sm', disabled: archived.has(id), onClick: () => {
                if (services.open(selected.workspaceId, id, generation)) onClose()
              } }, h('bdi', null, searchTitle || row.displayTitle || id)),
              archived.has(id) ? h('small', null, copy.archived) : null,
              guarded ? h('small', null, copy.protected) : null,
              !guarded && record && services.rename ? h(Button, { size: 'sm', onClick: () => {
                setEdit({ id, title: row.title ?? searchTitle ?? '', generation })
              }, 'aria-label': copy.rename + ' ' + (searchTitle || row.displayTitle || id) }, copy.rename) : null)
          })) : h('p', { role: 'status' }, inventory.length ? copy.noMatches : copy.empty),
          rows.length > limit ? h('div', { style: lifecycleActions },
            h(Button, { size: 'sm', disabled: activePage === 0, onClick: () => setPage(activePage - 1) }, copy.previous),
            h('span', { 'aria-live': 'polite' }, `${activePage + 1} / ${Math.ceil(rows.length / limit)}`),
            h(Button, { size: 'sm', disabled: (activePage + 1) * limit >= rows.length, onClick: () => setPage(activePage + 1) }, copy.next)) : null,
          editing ? h('form', { onSubmit: rename },
            h('label', { style: lifecycleLabel }, copy.title, h('input', { style: lifecycleSelect, dir: 'auto', value: editing.title,
              maxLength: 200, disabled: editing.busy, onChange: event => setEdit({ ...editing, title: event.target.value }) })),
            h(Button, { size: 'sm', type: 'submit', disabled: editing.busy || !editing.title.trim() }, copy.save),
            h(Button, { size: 'sm', type: 'button', onClick: () => setEdit(null) }, copy.cancel),
            editing.error ? h('p', { role: 'alert' }, copy.renameFailed) : null) : null,
          null)))
    }

    function DirectChatHistoryAction({ wide, services, useRemoteAccess, language }) {
      const copy = directChatCopy[language]
      const [open, setOpen] = React.useState(false)
      return h(React.Fragment, null,
        h(Button, { size: 'sm', variant: 'toolbar', 'aria-label': copy.history, title: copy.history,
          'aria-haspopup': 'dialog', 'aria-expanded': open, onClick: () => setOpen(true),
          icon: suiteGlyph('conversation-lifecycle', 16) }, wide ? copy.history : null),
        open ? h(DirectChatHistory, { onClose: () => setOpen(false), services, useRemoteAccess, copy, language }) : null)
    }

    // Official DSH New Session HOC: mounts immediately beneath the native
    // New Session control, above global Plugins and Workspace/Projects rows.
    function DirectChatTopAction({ children, wide, useRemoteAccess, startChat, services }) {
      const language = useUiLanguage(services?.locale)
      return h('div', { 'data-abinadwan-direct-chat-top': '',
        style: { display: 'flex', flexDirection: 'column', gap: 4, width: '100%' } },
        children,
        h(DirectChatButton, { wide, useRemoteAccess, startChat, language }),
        Modal && services ? h(DirectChatHistoryAction, { wide, services, useRemoteAccess, language }) : null)
    }
    const directChatPlugin = {
      inject: ['slots', 'sessions', 'workspaces', 'uiWorkspace', 'layout', 'remote', 'locale'],
      apply(ctx) {
        const lifetime = new AbortController()
        const connection = suiteConnection(ctx)
        const services = { locale: ctx.locale, workspaces: ctx.workspaces.list, sessions: ctx.sessions.list, connection,
          settings: ctx.get('remote.settings') }
        const member = (workspaceId, id, generation) => {
          if (lifetime.signal.aborted || connection.getSnapshot() !== generation) return false
          const workspaces = services.workspaces.getSnapshot()
          const sessions = services.sessions.getSnapshot()
          if (!catalogReady(workspaces, sessions)) return false
          const claimed = workspaces.items.filter(row => row.sessionIds.includes(id))
          return claimed.length === 1 && claimed[0].workspaceId === workspaceId && sessions.ids.includes(id) &&
            Object.hasOwn(sessions.byId, id) && !sessions.byId[id].blank && sessions.byId[id].origin !== 'subagent'
        }
        services.lookup = async (order, signal) => {
          const endpoint = new URL('/api/abinadwan-direct-chat/catalog', document.baseURI)
          if (endpoint.origin !== document.location.origin) throw new Error('Cross-origin Direct Chat endpoint')
          if (order === 'creation') endpoint.searchParams.set('order', order)
          const response = await fetch(endpoint, { credentials: 'same-origin', redirect: 'error',
            signal: AbortSignal.any([signal, lifetime.signal, AbortSignal.timeout(10000)]) })
          if (!response.ok) throw new Error('Direct Chat catalog unavailable')
          const result = await response.json()
          if (result.workspaceId !== null && (typeof result.workspaceId !== 'string' || !result.workspaceId)) {
            throw new Error('Invalid Workspace identity')
          }
          return result
        }
        services.open = (workspaceId, id, generation) => {
          if (!member(workspaceId, id, generation) ||
              services.workspaces.getSnapshot().archivedSessionIds?.includes(id)) return false
          ctx.uiWorkspace.openSession(id)
          return true
        }
        if (typeof ctx.sessions.using === 'function') {
          services.rename = async (workspaceId, id, title, generation) => {
            // Reject stale actions before obtaining a native Session reference.
            if (!member(workspaceId, id, generation)) throw new Error('Direct Chat membership changed')
            return ctx.sessions.using(id, { source: 'workspaceOperation', signal: lifetime.signal }, async reference => {
              // Membership or connection generation may change while acquiring it.
              if (!member(workspaceId, id, generation)) throw new Error('Direct Chat membership changed')
              const result = await reference.binding.session.rename(title)
              if (!result.ok) throw new Error('Direct Chat rename refused')
            })
          }
        }
        ctx.effect(() => () => lifetime.abort(), 'direct-chat: abort pending navigation')
        async function startChat() {
          const navigation = AbortSignal.any([ctx.layout.beginNavigation(), lifetime.signal])
          const response = await fetch('/api/abinadwan-direct-chat/prepare', {
            method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
            signal: AbortSignal.any([navigation, AbortSignal.timeout(15000)]),
          })
          if (!response.ok) throw new Error('Direct Chat Workspace preparation returned HTTP ' + response.status)
          const result = await response.json()
          if (typeof result.path !== 'string' || !result.path) {
            throw new Error('Direct Chat Workspace preparation returned no path')
          }
          if (navigation.aborted) return
          // Workspace creation is idempotent for this one canonical path.
          // Conversation history and agent continuation are scoped by Session ID.
          const workspace = await ctx.workspaces.create({ path: result.path })
          if (typeof workspace?.workspaceId !== 'string' || !workspace.workspaceId) {
            throw new Error('DSH did not return a Workspace identity')
          }
          if (workspace.title !== 'Direct Chat') {
            await ctx.workspaces.rename(workspace.workspaceId, 'Direct Chat')
          }
          if (navigation.aborted) return
          // Native DSH reuses a still-empty draft, otherwise creates an
          // independent Session; no prior chat transcript is carried over.
          const sessionId = await ctx.uiWorkspace.connectWorkspace(workspace.workspaceId)
          if (typeof sessionId !== 'string' || !sessionId) {
            throw new Error('DSH did not return a native Session identity')
          }
          if (!navigation.aborted) ctx.uiWorkspace.openSession(sessionId)
        }
        ctx.slots.inject('sidebar.session.action', () => ctx.slots.register({
          name: 'sidebar.session.action', id: DIRECT_CHAT_ID,
          inject: () => ({ startChat, services }),
        }, DirectChatTopAction))
      },
    }

