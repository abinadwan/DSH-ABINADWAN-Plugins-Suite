/**
 * Browser half of @abinadwan/dsh-plugins-suite.
 * Uses DSH's documented lazy-CJS module registration and Slot API.
 * Native slots and scoped Cordis lifetimes. Only the manual version check contacts GitHub.
 */
window.__ModuleLoader__.load({
  id: '@abinadwan/dsh-plugins-suite',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const PANEL_ID = 'environment-sidebar'
    const border = '1px solid rgba(128,128,128,.27)'
    const cardStyle = {
      border, borderRadius: 14, background: 'rgba(128,128,128,.065)',
      padding: 18, marginBottom: 14,
    }
    const labelStyle = { fontSize: 12, opacity: .72, marginBottom: 6 }
    const valueStyle = {
      fontSize: 14, fontWeight: 600, direction: 'auto', overflowWrap: 'anywhere',
    }

    function Field(label, value) {
      return h('div', { style: { padding: '8px 0' }, key: label },
        h('div', { style: labelStyle }, label),
        h('div', { style: valueStyle }, value === null || value === undefined || value === ''
          ? 'غير متاح' : String(value)))
    }

    function Section(title, children, hint) {
      return h('section', { style: cardStyle, 'aria-label': title },
        h('h2', { style: { fontSize: 17, fontWeight: 650, margin: '0 0 8px' } }, title),
        hint ? h('p', { style: { margin: '0 0 10px', opacity: .7, fontSize: 12, lineHeight: 1.8 } }, hint) : null,
        children)
    }

    function Icon({ size = 18, active = false }) {
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24',
        fill: 'none', stroke: 'currentColor', strokeWidth: 1.8,
        strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
        style: { opacity: active ? 1 : .85, display: 'block' } },
        h('rect', { x: 3, y: 3, width: 18, height: 18, rx: 4 }),
        h('path', { d: 'M8 8h8M8 12h5M8 16h8' }),
        h('circle', { cx: 17.5, cy: 12, r: 1.3, fill: 'currentColor', stroke: 'none' }))
    }

    function formatDate(stamp) {
      if (typeof stamp !== 'number' || !Number.isFinite(stamp)) return 'غير متاح'
      const date = new Date(stamp)
      if (Number.isNaN(date.getTime())) return 'غير متاح'
      return date.toLocaleString('ar-SA')
    }

    function EnvironmentPanel({ sessions, workspaces, viewVersion }) {
      const [tab, setTab] = React.useState('environment')
      React.useEffect(() => {
        const rerender = () => setRefresh(value => value + 1)
        window.addEventListener('online', rerender)
        window.addEventListener('offline', rerender)
        return () => {
          window.removeEventListener('online', rerender)
          window.removeEventListener('offline', rerender)
        }
      }, [])
      // A refresh changes only local presentation; it does not request privileged Host data.
      const [refresh, setRefresh] = React.useState(0)
      const _refreshVersion = viewVersion + refresh
      void _refreshVersion

      const browser = typeof navigator === 'undefined' ? {} : navigator
      const browserPlatform = browser.userAgentData && browser.userAgentData.platform
        ? browser.userAgentData.platform : browser.platform
      const origin = typeof window !== 'undefined' && window.location ? window.location.origin : undefined
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const sessionIds = sessions && Array.isArray(sessions.ids) ? sessions.ids : []
      const byId = sessions && sessions.byId ? sessions.byId : {}
      const activeCount = sessionIds.reduce((total, id) => total + (byId[id] && byId[id].running ? 1 : 0), 0)
      const workspaceItems = workspaces && Array.isArray(workspaces.items) ? workspaces.items : []
      const archiveIds = workspaces && Array.isArray(workspaces.archivedSessionIds) ? workspaces.archivedSessionIds : []
      const pinnedIds = workspaces && Array.isArray(workspaces.pinnedSessionIds) ? workspaces.pinnedSessionIds : []
      const recent = sessionIds.map(id => byId[id]).filter(Boolean)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 5)

      const tabs = [
        { id: 'environment', title: 'بيئة التشغيل' },
        { id: 'context', title: 'السياق' },
        { id: 'outputs', title: 'المخرجات' },
      ]
      let body
      if (tab === 'environment') {
        body = Section('بيئة التشغيل', h('div', null,
          Field('المنصة (كما يعرضها المتصفح)', browserPlatform),
          Field('لغة المتصفح', browser.language),
          Field('المنطقة الزمنية', timezone),
          Field('عنوان واجهة التطبيق (Origin فقط)', origin),
          Field('اتصال المتصفح', browser.onLine === undefined ? 'غير متاح' : browser.onLine ? 'متصل' : 'غير متصل')),
        'هذه بيانات المتصفح والواجهة، وليست متغيرات بيئة Windows أو العمليات المحلية.')
      } else if (tab === 'context') {
        body = Section('سياق العمل', h('div', null,
          Field('عدد مساحات العمل', workspaceItems.length),
          Field('عدد الجلسات المسجلة', sessionIds.length),
          Field('جلسات قيد التشغيل', activeCount),
          Field('جلسات مؤرشفة', archiveIds.length),
          Field('جلسات مثبتة', pinnedIds.length),
          Field('حالة مزامنة الجلسات', sessions && sessions.phase === 'ready' ? 'جاهزة' : 'بانتظار المزامنة'),
          Field('حالة مزامنة المساحات', workspaces && workspaces.phase === 'ready' ? 'جاهزة' : 'بانتظار المزامنة')),
        'تُقرأ الأعداد من الفهارس الرسمية في Harness وتُحدَّث عند تغيّرها. لا تُعرض محتويات المحادثات.')
      } else {
        body = Section('المخرجات والنشاط', h('div', null,
          h('p', { style: { fontSize: 13, lineHeight: 1.8, margin: '4px 0 14px' } },
            'مخرجات الأدوات ونصوص ردود الوكيل غير متاحة عبر فهرس الجلسات المستخدم هنا. يعرض هذا القسم آخر نشاط موثق للجلسات فقط.'),
          h('h3', { style: { fontSize: 14, margin: '0 0 10px' } }, 'آخر نشاط للجلسات'),
          recent.length === 0
            ? h('p', { style: { opacity: .7, fontSize: 13 } }, 'لا توجد جلسات مسجلة.')
            : h('ol', { style: { paddingInlineStart: 24, margin: 0 } },
              recent.map(item => h('li', {
                key: item.id, style: { padding: '8px 0', borderBottom: border },
              },
              h('div', { style: { fontSize: 13, fontWeight: 600, overflowWrap: 'anywhere' } },
                item.displayTitle || 'جلسة بدون عنوان'),
              h('div', { style: { fontSize: 12, opacity: .7, marginTop: 4 } },
                formatDate(item.updatedAt) + (item.running ? ' · قيد التشغيل' : ' · غير نشطة')))))),
        'هذا القسم للقراءة فقط ولا يرسل أي سجلات إلى خدمة خارجية.')
      }

      return h('main', {
        'data-environment-sidebar': '',
        dir: 'rtl',
        style: {
          height: '100%', boxSizing: 'border-box', overflow: 'auto',
          padding: '28px clamp(16px, 4vw, 44px)', color: 'inherit',
          fontFamily: 'inherit', lineHeight: 1.6,
        },
      },
      h('div', { style: { maxWidth: 850, margin: '0 auto' } },
        h('header', { style: { display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 12, marginBottom: 20, flexWrap: 'wrap' } },
          h('div', null,
            h('h1', { style: { margin: 0, fontSize: 25, fontWeight: 700 } }, 'بيئة وسياق'),
            h('div', { style: { fontSize: 12, opacity: .65, marginTop: 4 } },
              'Environment · Context · Outputs')),
          h('button', {
            type: 'button', onClick: () => setRefresh(value => value + 1),
            style: { background: 'transparent', color: 'inherit', border,
              borderRadius: 10, padding: '8px 12px', cursor: 'pointer' },
            'aria-label': 'تحديث العرض',
          }, 'تحديث العرض')),
        h('nav', { role: 'tablist', 'aria-label': 'أقسام الإضافة',
          style: { display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' } },
          tabs.map(item => h('button', {
            key: item.id, type: 'button', role: 'tab', id: 'env-tab-' + item.id,
            'aria-selected': tab === item.id, 'aria-controls': 'env-panel-' + item.id,
            onClick: () => setTab(item.id),
            style: { border, borderRadius: 10, cursor: 'pointer', padding: '9px 14px',
              background: tab === item.id ? 'rgba(70,130,180,.18)' : 'transparent',
              fontWeight: tab === item.id ? 700 : 400, color: 'inherit' },
          }, item.title))),
        h('div', { role: 'tabpanel', id: 'env-panel-' + tab,
          'aria-labelledby': 'env-tab-' + tab }, body),
        h('p', { style: { opacity: .6, fontSize: 12, lineHeight: 1.8 } },
          'إضافة مستقلة — لا تقرأ متغيرات البيئة السرية، ولا تنفذ أوامر، ولا تتصل بخوادم خارجية.')))
    }


    const TYPE = '@abinadwan/dsh-plugins-suite'
    const KIND = 'environment-dashboard'
    const muted = { fontSize: 11, opacity: 0.7, lineHeight: 1.6 }
    function line(label, value) {
      return h('div', { style: { display: 'flex', justifyContent: 'space-between',
        gap: 10, padding: '4px 0', fontSize: 12 } },
        h('span', null, label),
        h('span', { style: { opacity: .75, textAlign: 'right' } }, value == null ? '—' : String(value)))
    }
    function section(name, rows) {
      return h('details', { open: true, key: name, style: {
        padding: '12px 0', borderBottom: '1px solid rgba(127,127,127,.24)' } },
        h('summary', { style: { cursor: 'pointer', fontWeight: 650, marginBottom: 9,
          fontSize: 12 } }, name),
        h('div', null, ...rows))
    }
    const good = x => typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : undefined
    const compact = x => {
      const n = good(x)
      if (n === undefined) return '—'
      if (n < 1000) return String(Math.round(n))
      return n < 1000000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
        : (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
    }

    // Manual update check. No network request occurs until the button is clicked.
    const INSTALLED_VERSION = '0.6.0'
    const VERSION_SOURCE = 'https://raw.githubusercontent.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/main/package.json'
    const PROJECT_URL = 'https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite'
    function versionParts(version) {
      if (typeof version !== 'string') return null
      const found = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(version)
      return found && [Number(found[1]), Number(found[2]), Number(found[3])].every(Number.isSafeInteger)
        ? { numbers: [Number(found[1]), Number(found[2]), Number(found[3])], pre: found[4] || '' } : null
    }
    function isNewerVersion(remote, installed) {
      const a = versionParts(remote), b = versionParts(installed)
      if (!a || !b) return null
      for (let i = 0; i < 3; i++) {
        if (a.numbers[i] !== b.numbers[i]) return a.numbers[i] > b.numbers[i]
      }
      if (!a.pre && b.pre) return true
      if (a.pre && !b.pre) return false
      if (a.pre && b.pre) {
        const aa = a.pre.split('.'), bb = b.pre.split('.')
        for (let i = 0; i < Math.max(aa.length, bb.length); i++) {
          if (aa[i] === undefined) return false
          if (bb[i] === undefined) return true
          if (aa[i] === bb[i]) continue
          const an = /^\d+$/.test(aa[i]), bn = /^\d+$/.test(bb[i])
          if (an && bn) return Number(aa[i]) > Number(bb[i])
          if (an !== bn) return !an
          return aa[i] > bb[i]
        }
      }
      return false
    }
    // Installed-plugin detail page only. The session inspector remains focused on runtime data.
    function VersionUpdates({ installedVersion = INSTALLED_VERSION }) {
      const [update, setUpdate] = React.useState({ phase: 'idle' })
      const currentVersion = versionParts(installedVersion) ? installedVersion : INSTALLED_VERSION
      async function check() {
        if (update.phase === 'checking') return
        setUpdate({ phase: 'checking' })
        try {
          const controllerSignal = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
            ? AbortSignal.timeout(10000) : undefined
          const response = await fetch(VERSION_SOURCE, {
            method: 'GET', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
            headers: { Accept: 'application/json' },
            ...controllerSignal ? { signal: controllerSignal } : {},
          })
          if (!response.ok) throw new Error('GitHub returned HTTP ' + response.status)
          const remote = await response.json()
          if (remote?.name !== '@abinadwan/dsh-plugins-suite') {
            throw new Error('Unexpected package identity in GitHub response')
          }
          const newer = isNewerVersion(remote.version, currentVersion)
          if (newer === null) throw new Error('Invalid repository version')
          setUpdate({ phase: newer ? 'available' : 'current', latest: remote.version,
            checked: new Date().toLocaleTimeString() })
        } catch (error) {
          setUpdate({ phase: 'error', message: String(error?.message || error) })
        }
      }
      const soft = 'rgba(127,127,127,.16)'
      const muted = { fontSize: 12, opacity: .72, lineHeight: 1.65, margin: 0 }
      const text = update.phase === 'checking' ? 'Checking GitHub…'
        : update.phase === 'available' ? 'Update available'
        : update.phase === 'current' ? 'Up to date'
        : update.phase === 'error' ? 'Could not check for updates'
        : 'Not checked yet'
      return h('section', { 'data-environment-update-section': '',
        style: { borderTop: '1px solid ' + soft, padding: '20px 0', color: 'inherit' } },
        h('header', { style: { display: 'flex', alignItems: 'center', gap: 12,
          justifyContent: 'space-between', marginBottom: 14 } },
          h('h3', { style: { fontSize: 16, margin: 0, fontWeight: 650 } }, 'Versions'),
          h('button', { type: 'button', 'data-check-updates': '',
            'aria-label': 'Check for plugin updates',
            disabled: update.phase === 'checking',
            onClick: check,
            style: { border: 0, borderRadius: 8, padding: '7px 10px',
              color: 'inherit', background: 'transparent', cursor: 'pointer',
              fontSize: 12, opacity: update.phase === 'checking' ? .6 : 1 } },
            '↻ ', update.phase === 'checking' ? 'Checking…' : update.checked ? 'Check again' : 'Check for updates')),
        h('div', { style: { border: '1px solid rgba(127,127,127,.29)',
          borderRadius: 12, background: 'rgba(127,127,127,.07)', padding: 17 } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
            h('span', { 'aria-hidden': true, style: { display: 'inline-flex',
              justifyContent: 'center', alignItems: 'center', width: 29,
              height: 29, borderRadius: 999, background: 'rgba(127,127,127,.14)',
              color: update.phase === 'current' ? '#46ae7d' :
                update.phase === 'available' ? '#dfaa50' : 'inherit' } },
              update.phase === 'current' ? '✓' : update.phase === 'available' ? '↑' : '↻'),
            h('div', null,
              h('div', { role: 'status', 'aria-live': 'polite',
                style: { fontWeight: 650, fontSize: 13 } }, text),
              h('div', { style: muted },
                update.checked ? 'Last checked at ' + update.checked : 'Latest version has not been checked'))),
          h('div', { style: { marginTop: 12, fontSize: 12 } },
            line('Installed', 'v' + currentVersion),
            update.latest ? line('Repository (main)', 'v' + update.latest) : null),
          update.phase === 'error' ? h('p', { style: { ...muted, marginTop: 10 } },
            update.message) : null,
          update.phase === 'available' ? h('p', { style: { ...muted, marginTop: 10 } },
            'A newer version was declared in the repository. Review the source and update through Plugins. No automatic installation occurs.') : null),
        h('p', { style: { ...muted, marginTop: 12 } },
          'Manual version check against the public GitHub main branch. No request occurs until you click.'),
        h('a', { href: PROJECT_URL, target: '_blank', rel: 'noopener noreferrer',
          style: { display: 'inline-block', fontSize: 12, marginTop: 8,
            color: '#69a9fc', textDecoration: 'underline' } }, 'View GitHub repository'))
    }

    function Details({ sessionId, useProjection, sessions, workspaces }) {
      const pressure = useProjection('contextPressure')
      const breakdown = useProjection('contextBreakdown')
      const tokenUsage = useProjection('tokenUsage')
      const session = sessions?.byId?.[sessionId]
      const folders = Array.isArray(workspaces?.items) ? workspaces.items : []
      const linked = folders.filter(w => Array.isArray(w.sessionIds) && w.sessionIds.includes(sessionId))
      const used = good(pressure?.projectedTokens ?? pressure?.pressureTokens)
      const max = good(pressure?.contextWindow)
      const pct = max && used !== undefined ? Math.min(100, Math.round(100 * used / max)) : undefined
      const platform = typeof navigator === 'object' ?
        (navigator.userAgentData?.platform || navigator.platform) : undefined
      const environment = [
        line('Browser', platform || 'Unavailable'),
        line('Workspaces', linked.length),
        ...linked.map(w => line('▣ ' + (w.title || 'Workspace'), w.path || '')),
      ]
      const context = []
      if (pct === undefined) {
        context.push(h('p', { key: 'no-pressure', style: muted },
          'Context use is available after the model reports usage.'))
      } else {
        context.push(line(pct + '% used', '~' + compact(used) + ' / ' + compact(max)))
        context.push(h('div', { role: 'progressbar', 'aria-label': 'Context occupancy',
          'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100,
          style: { background: 'rgba(127,127,127,.25)', borderRadius: 8,
            height: 6, overflow: 'hidden', margin: '7px 0' } },
          h('div', { style: { width: pct + '%', height: '100%', background: '#378fdb' } })))
        context.push(line('Messages (estimated)', compact(breakdown?.messageTokens)))
        context.push(line('Tool schemas (estimated)', compact(breakdown?.toolsTokens)))
        context.push(line('System prompt (estimated)', compact(breakdown?.systemTokens)))
        context.push(line('Free space', compact(Math.max(0, max - used))))
      }
      context.push(line('Session', session?.displayTitle || 'Unavailable'))
      context.push(line('Status', session ? (session.running ? 'Running' : 'Idle') : 'Unavailable'))
      const outputs = [
        line('Output tokens', compact(tokenUsage?.outputTokens)),
        line('Last activity', good(session?.updatedAt) === undefined ?
          'Unavailable' : new Date(session.updatedAt).toLocaleString()),
        h('p', { key: 'output-note', style: muted },
          'Output file lists require a separate, permission-checked files service.'),
      ]
      const cards = [
        section('Environment', environment),
        section('Context', context),
        section('Connectors', [h('p', { key: 'conn', style: muted },
          'Connector inventory is not available via the documented Client APIs used here.')]),
        section('Outputs', outputs),
        section('Changes', [h('p', { key: 'diff', style: muted },
          'Git changes need the workspace-changes/Forge integration; no changes are invented.')]),
      ]
      return h('aside', { 'data-environment-right-sidebar': '',
        style: { height: '100%', overflowY: 'auto', boxSizing: 'border-box',
          padding: '6px 16px 22px', color: 'inherit', fontSize: 12, lineHeight: 1.6 } },
        ...cards,
        h('p', { style: muted }, 'Read-only · No external requests from this Session panel.'))
    }
    function HeaderButton({ openInspector }) {
      return h('button', { type: 'button', onClick: openInspector,
        'aria-label': 'Open Environment sidebar', title: 'Environment',
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
        const subS = l => s.subscribe(l)
        const subW = l => w.subscribe(l)
        const getS = () => s.getSnapshot()
        const getW = () => w.getSnapshot()
        const open = () => ctx.sidebarRight.openTab(KIND)
        function Body(props) {
          const sessions = React.useSyncExternalStore(subS, getS, getS)
          const workspaces = React.useSyncExternalStore(subW, getW, getW)
          return h(Details, { sessionId: props.sessionId, useProjection: props.useProjection,
            sessions, workspaces })
        }
        ctx.effect(() => ctx.sidebarRightTabs.register({
          id: TYPE + '/environment-context', kind: KIND, title: () => 'Environment & Context',
          guide: [{ id: 'open', order: 12, title: () => 'Environment & Context',
            description: () => 'Current context and workspace details' }],
        }), 'environment-sidebar: type')
        ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
          name: 'sidebar.right.pane.tab', key: TYPE,
        }, Body))
        ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
          name: 'conversation.session.header.utilities',
          id: 'environment-sidebar-toggle', order: 35,
          inject: () => ({ openInspector: open }),
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
              try { open() } catch (e) {
                visited.delete(id)
                console.warn('[environment-sidebar] auto-open unavailable:', e)
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

    // Safe browser-only preview. Never imports Host storage or registers agent capabilities.
    // The root bundle owns this panel independently of the disabled Host subcomponent.
    const PROFILE_PANEL_ID = TYPE + '/personal-profile-page'
    function ProfilePanelIcon({ size = 20 }) {
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24',
        fill: 'none', stroke: 'currentColor', strokeWidth: 1.8,
        strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
      h('rect', { x: 3, y: 2.5, width: 18, height: 19, rx: 3 }),
      h('circle', { cx: 9, cy: 9, r: 2 }),
      h('path', { d: 'M5.5 16c.6-2.8 6.4-2.8 7 0M14 8h4M14 12h4M14 16h4' }))
    }
    function PersonalProfilePage() {
      const [language, setLanguage] = React.useState('ar')
      const [page, setPage] = React.useState('information')
      const [profile, setProfile] = React.useState('Synthetic Studio')
      const [values, setValues] = React.useState({})
      const [custom, setCustom] = React.useState([])
      const [newLabel, setNewLabel] = React.useState('')
      const [globalInstruction, setGlobalInstruction] = React.useState('')
      const [overrides, setOverrides] = React.useState({})
      const [policies, setPolicies] = React.useState({})
      const [optIn, setOptIn] = React.useState(false)
      const [approval, setApproval] = React.useState('')
      const [locked, setLocked] = React.useState(false)
      const [autoLock, setAutoLock] = React.useState('5')
      const [sessionVisible, setSessionVisible] = React.useState(true)
      const [backupReview, setBackupReview] = React.useState('')
      const [backupStrategy, setBackupStrategy] = React.useState('merge')
      const [backupAck, setBackupAck] = React.useState(false)
      const ar = {
        information:'معلوماتي', instructions:'تعليمات الوكيل', access:'التحكم في الوصول',
        backup:'النسخ والاستعادة', privacy:'الخصوصية والأمان', title:'الملف الشخصي',
        subtitle:'صفحة تجريبية داخل التطبيق، ببيانات اصطناعية فقط',
        warning:'معاينة فقط — لا تدخل بيانات حقيقية. لا يوجد حفظ أو تشفير أو اتصال بالوكيل. ستضيع التغييرات عند إعادة تحميل الواجهة.',
        profile:'الملف التجريبي', language:'اللغة', preferredName:'الاسم المفضل',
        fullName:'الاسم الكامل', dateOfBirth:'تاريخ الميلاد', nationality:'الجنسية',
        gender:'الجنس', custom:'حقول إضافية', add:'أضف حقلًا تجريبيًا', remove:'حذف',
        label:'اسم الحقل', global:'تعليمات عامة', override:'تعليمات خاصة بهذا الملف',
        inherit:'استخدام التعليمات العامة', customMode:'تعليمات مخصصة', effective:'المعاينة النهائية',
        optIn:'السماح باستخدام المعلومات المعتمدة (محاكاة)', fieldPolicies:'صلاحيات كل حقل',
        private:'خاص', ask:'اسأل أولًا', allow:'سماح', approval:'الموافقة المؤقتة (محاكاة)',
        once:'مرة واحدة', session:'لهذه الجلسة', deny:'رفض',
        backupHint:'مراجعة الإجراءات فقط. لا يتم استيراد أو تصدير أي ملفات.',
        export:'مراجعة التصدير', import:'مراجعة الاستعادة', merge:'دمج', replace:'استبدال الكل',
        confirm:'أفهم أن هذا مجرد استعراض ولن يُحفظ شيء.', unavailable:'التنفيذ غير متاح',
        lock:'محاكاة القفل', unlock:'إلغاء القفل التجريبي', lockText:'الحقول مخفية لمحاكاة القفل فقط، دون حماية فعلية.',
        autoLock:'القفل التلقائي (تصميم فقط)', never:'أبدًا', five:'5 دقائق', fifteen:'15 دقيقة',
        endSession:'إنهاء جلسة تجريبية', history:'سجل الموافقات', historyText:'لا يوجد سجل حقيقي. بيانات العرض اصطناعية.',
        privacyWarning:'هذا العرض ليس مخزنًا آمنًا. لا تستخدم بيانات شخصية أو كلمات مرور.',
        reset:'إعادة ضبط المعاينة', missing:'غير محدد', note:'كل تغيير هنا مؤقت ومحلي في ذاكرة الصفحة.',
        synthetic:'مثال اصطناعي فقط', yes:'نعم', no:'لا', noInstruction:'لا توجد تعليمات.',
      }
      const en = {
        information:'My Information', instructions:'Agent Instructions', access:'Access Control',
        backup:'Backup & Restore', privacy:'Privacy & Security', title:'Personal Profile',
        subtitle:'In-app preview with fictional data only',
        warning:'Preview only — do not enter real information. No saving, encryption or agent connection. Changes disappear on reload.',
        profile:'Synthetic profile', language:'Language', preferredName:'Preferred name',
        fullName:'Full name', dateOfBirth:'Date of birth', nationality:'Nationality',
        gender:'Gender', custom:'Custom fields', add:'Add synthetic field', remove:'Remove',
        label:'Field label', global:'Global instructions', override:'Profile instructions',
        inherit:'Inherit global', customMode:'Custom instructions', effective:'Effective preview',
        optIn:'Allow approved information (simulation)', fieldPolicies:'Per-field policies',
        private:'Private', ask:'Ask First', allow:'Allow', approval:'Temporary consent (simulation)',
        once:'Allow Once', session:'This Session', deny:'Deny',
        backupHint:'Review only. No file is imported or exported.',
        export:'Review export', import:'Review restore', merge:'Merge', replace:'Replace all',
        confirm:'I understand this is a demonstration; no changes will be saved.',
        unavailable:'Unavailable', lock:'Simulate lock', unlock:'Reset simulated lock',
        lockText:'Editors are hidden for demonstration only. No real protection.',
        autoLock:'Automatic lock (design only)', never:'Never', five:'5 minutes', fifteen:'15 minutes',
        endSession:'End synthetic session', history:'Consent history',
        historyText:'No real history is collected. All examples are fictional.',
        privacyWarning:'This preview is not secure storage. Never enter personal data or passwords.',
        reset:'Reset preview', missing:'Unspecified', note:'Changes exist only in this browser view.',
        synthetic:'Synthetic example only', yes:'Yes', no:'No', noInstruction:'No instructions.',
      }
      const t = key => (language === 'ar' ? ar : en)[key] || key
      const rtl = language === 'ar'
      const surface = { border:'1px solid rgba(128,128,128,.3)', borderRadius:13,
        padding:20, background:'rgba(128,128,128,.045)', marginBottom:16 }
      const label = { display:'block', fontWeight:650, marginBottom:6, fontSize:13 }
      const control = { display:'block', width:'100%', boxSizing:'border-box',
        padding:'9px 11px', border:'1px solid rgba(128,128,128,.45)', borderRadius:8,
        background:'var(--dsh-input-bg, transparent)', color:'inherit', font:'inherit' }
      const btn = { border:'1px solid rgba(128,128,128,.35)', borderRadius:8,
        padding:'9px 13px', font:'inherit', background:'rgba(128,128,128,.08)',
        color:'inherit', cursor:'pointer' }
      const fields = ['preferredName','fullName','dateOfBirth','nationality','gender']
      const profiles = ['Synthetic Studio','Synthetic Lab']
      const sections = ['information','instructions','access','backup','privacy']
      function card(title, ...children) {
        return h('section', { style:surface, 'aria-label':title },
          h('h2', { style:{fontSize:17,margin:'0 0 13px'} }, title), ...children)
      }
      function input(key, title, value, change, props = {}) {
        return h('div', { key, style:{marginBottom:14,minWidth:0} },
          h('label', { htmlFor:'pp-'+key, style:label }, title),
          h('input', { id:'pp-'+key, style:control, type:'text', maxLength:1024,
            value:value || '', onChange:e=>change(e.target.value), autoComplete:'off',
            dir:'auto', ...props }))
      }
      function dropdown(key, title, value, options, onChange) {
        return h('div', { key, style:{marginBottom:14} },
          h('label', { htmlFor:'pp-'+key, style:label }, title),
          h('select', { id:'pp-'+key, style:control, value, onChange:e=>onChange(e.target.value) },
            options.map(([v,txt])=>h('option',{key:v,value:v},txt))))
      }
      const notice = h('p', { role:'note', style:{padding:'12px 15px',
        border:'1px solid rgba(208,158,52,.7)', borderRadius:10,
        background:'rgba(208,158,52,.1)',fontSize:13,lineHeight:1.7} }, t('warning'))
      const setField = (id,value) => setValues(prev => ({...prev,[id]:value}))
      let contents
      if (locked) {
        contents = card(t('privacy'), h('p',{role:'status'},t('lockText')),
          h('button',{type:'button',style:btn,onClick:()=>setLocked(false)},t('unlock')))
      } else if (page === 'information') {
        contents = h(React.Fragment,null,
          card(t('information'),
            h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:'0 18px'}},
              ...fields.map(id=>id === 'gender'
                ? dropdown(id,t(id),values.gender || '',[['',t('missing')],['male',rtl?'ذكر':'Male'],['female',rtl?'أنثى':'Female'],['unspecified',t('missing')]],v=>setField(id,v))
                : input(id,t(id),values[id] || '',v=>setField(id,v),
                  id==='dateOfBirth'?{placeholder:'YYYY-MM-DD',maxLength:10}:{})))),
          card(t('custom'),
            ...custom.map(f=>h('div',{key:f.id,style:{display:'flex',gap:10,alignItems:'end',flexWrap:'wrap'}},
              h('div',{style:{flex:'1 1 220px'}},input(f.id,f.label,values[f.id] || '',v=>setField(f.id,v))),
              h('button',{type:'button',style:{...btn,marginBottom:14},
                onClick:()=>{setCustom(old=>old.filter(x=>x.id!==f.id));setField(f.id,'')}},t('remove')))),
            input('new-label',t('label'),newLabel,setNewLabel,{maxLength:80}),
            h('button',{type:'button',style:btn,disabled:!newLabel.trim()||custom.length>=8,
              onClick:()=>{const next='example'+(custom.length+1)+'-'+Date.now().toString(36);
                setCustom(old=>[...old,{id:next,label:newLabel.trim()}]);setNewLabel('')}},
              t('add'))))
      } else if (page === 'instructions') {
        const override = Object.hasOwn(overrides,profile)
        const effective = override ? overrides[profile] : globalInstruction
        contents = h(React.Fragment,null,
          card(t('global'),
            h('label',{htmlFor:'pp-global',style:label},t('global')),
            h('textarea',{id:'pp-global',rows:5,maxLength:8192,style:control,
              value:globalInstruction,onChange:e=>setGlobalInstruction(e.target.value),dir:'auto'})),
          card(t('override'),
            dropdown('mode',t('override'),override?'custom':'inherit',
              [['inherit',t('inherit')],['custom',t('customMode')]],v=>setOverrides(old=>{
                const copy={...old}
                if(v==='inherit')delete copy[profile]
                else copy[profile]=''
                return copy
              })),
            override?h('textarea',{id:'pp-override',rows:5,maxLength:8192,style:control,
              'aria-label':t('override'),value:overrides[profile],
              onChange:e=>setOverrides(old=>({...old,[profile]:e.target.value})),dir:'auto'}):null),
          card(t('effective'),h('output',{style:{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}},
            effective || t('noInstruction'))))
      } else if (page === 'access') {
        const policy = policies[profile] || {}
        contents = h(React.Fragment,null,
          card(t('access'),
            h('label',{style:{display:'flex',gap:10,alignItems:'center',marginBottom:15}},
              h('input',{type:'checkbox',checked:optIn,onChange:e=>setOptIn(e.target.checked),
                'aria-label':t('optIn')}),t('optIn')),
            h('p',{style:{fontSize:13,opacity:.78}},t('synthetic')),
            h('h3',{style:{fontSize:15}},t('fieldPolicies')),
            ...[...fields,...custom.map(x=>x.id)].map(id=>dropdown('policy-'+id,
              custom.find(x=>x.id===id)?.label||t(id),
              policy[id]||'private',[['private',t('private')],['ask_first',t('ask')],['allow',t('allow')]],
              v=>setPolicies(old=>({...old,[profile]:{...(old[profile]||{}),[id]:v}}))))),
          card(t('approval'),
            h('div',{style:{display:'flex',gap:8,flexWrap:'wrap'}},
              ...[['once',t('once')],['session',t('session')],['deny',t('deny')]].map(([k,l])=>
                h('button',{key:k,type:'button',style:btn,onClick:()=>setApproval(l)},l))),
            h('p',{role:'status',style:{marginTop:13}},approval?approval+' — '+t('synthetic'):t('synthetic'))))
      } else if (page === 'backup') {
        contents = card(t('backup'),h('p',null,t('backupHint')),
          h('div',{style:{display:'flex',flexWrap:'wrap',gap:8}},
            h('button',{style:btn,type:'button',onClick:()=>{setBackupReview('export');setBackupAck(false)}},t('export')),
            h('button',{style:btn,type:'button',onClick:()=>{setBackupReview('import');setBackupAck(false)}},t('import'))),
          backupReview?h('div',{style:{marginTop:20}},
            h('h3',{style:{fontSize:15}},backupReview==='export'?t('export'):t('import')),
            backupReview==='import'?dropdown('backup-strategy',t('backup'),backupStrategy,
              [['merge',t('merge')],['replace',t('replace')]],setBackupStrategy):null,
            h('label',{style:{display:'flex',gap:8,alignItems:'center',marginBottom:12}},
              h('input',{type:'checkbox',checked:backupAck,onChange:e=>setBackupAck(e.target.checked)}),
              t('confirm')),
            h('button',{style:{...btn,opacity:.6},disabled:true,type:'button'},t('unavailable'))):null)
      } else {
        contents = h(React.Fragment,null,
          card(t('privacy'),
            h('p',null,t('privacyWarning')),
            h('button',{type:'button',style:btn,onClick:()=>setLocked(true)},t('lock')),
            dropdown('auto-lock',t('autoLock'),autoLock,
              [['0',t('never')],['5',t('five')],['15',t('fifteen')]],setAutoLock)),
          card(t('session'),
            h('p',null,sessionVisible?t('synthetic'):t('missing')),
            h('button',{type:'button',style:btn,disabled:!sessionVisible,
              onClick:()=>setSessionVisible(false)},t('endSession'))),
          card(t('history'),h('p',null,t('historyText'))))
      }
      return h('div',{'data-personal-profile-panel':'preview-only',lang:language,
        dir:rtl?'rtl':'ltr',style:{height:'100%',overflowY:'auto',boxSizing:'border-box',
          padding:'max(var(--dsh-frame-top-clearance, 0px), 28px) clamp(18px,4vw,56px) 52px',
          color:'inherit',lineHeight:1.6}},
        h('div',{style:{maxWidth:1050,margin:'0 auto'}},
          h('header',{style:{display:'flex',flexWrap:'wrap',gap:12,
            alignItems:'center',justifyContent:'space-between'}},
            h('div',null,h('h1',{style:{margin:'0 0 4px',fontSize:'clamp(22px,3vw,32px)'}},t('title')),
              h('p',{style:{margin:'0 0 12px',opacity:.7}},t('subtitle'))),
            h('div',{style:{width:145}},dropdown('language',t('language'),language,
              [['ar','العربية'],['en','English']],setLanguage))),
          notice,
          h('div',{style:{display:'flex',gap:10,flexWrap:'wrap',justifyContent:'space-between',alignItems:'center'}},
            dropdown('profile',t('profile'),profile,profiles.map(x=>[x,x]),
              v=>{setProfile(v);setApproval('')}),
            h('button',{type:'button',style:btn,onClick:()=>{
              setValues({});setCustom([]);setNewLabel('');setGlobalInstruction('');
              setOverrides({});setPolicies({});setOptIn(false);setApproval('');
              setLocked(false);setAutoLock('5');setSessionVisible(true);
              setBackupReview('');setBackupStrategy('merge');setBackupAck(false);
              setPage('information');setProfile(profiles[0])
            }},t('reset'))),
          h('nav',{role:'tablist','aria-label':t('title'),
            style:{display:'flex',gap:6,flexWrap:'wrap',marginBottom:20}},
            ...sections.map(id=>h('button',{key:id,type:'button',role:'tab',
              id:'pp-tab-'+id,'aria-selected':page===id,
              'aria-controls':'pp-content',onClick:()=>setPage(id),
              style:{...btn,background:page===id?'rgba(128,128,128,.22)':'transparent',
                fontWeight:page===id?700:500}},t(id)))),
          h('div',{role:'tabpanel',id:'pp-content','aria-labelledby':'pp-tab-'+page},contents),
          h('p',{style:{fontSize:12,opacity:.65,marginTop:25}},t('note'))))
    }

    function ProfileDraft() {
      const fields = [
        ['Name', 'Preferred name. Full name is optional.'],
        ['Date of birth', 'Optional.'],
        ['Nationality', 'Optional.'],
        ['Gender', 'User-selected. May remain unspecified.'],
        ['Custom agent instructions', 'Empty by default. Optional templates below.'],
        ['Allow the agent to use approved profile information', 'Off by default. Requires explicit opt-in after design approval.'],
      ]
      return h('section', { 'data-personal-profile-draft': '',
        style: { borderTop: border, padding: '20px 0', lineHeight: 1.65 } },
        h('h3', null, 'Personal Profile — design draft'),
        h('p', null, 'Read-only preliminary fields. Privacy, storage, access, export and deletion design awaits approval.'),
        h('dl', null, fields.map(([label, description]) => h('div', { key: label, style: { marginBottom: 12 } },
          h('dt', { style: { fontWeight: 650 } }, label),
          h('dd', { style: { margin: '4px 0 0', opacity: .8 } }, description)))),
        h('h4', null, 'Optional instruction templates'),
        h('ul', null,
          h('li', null, 'Use concise, direct answers and explain technical terms when needed.'),
          h('li', null, 'Write in clear Arabic and use examples when they help.'),
          h('li', null, 'Use a professional tone and preserve source links.')),
        h('p', null, 'Proposed behavior after approval: apply approved style instructions automatically. Access personal or sensitive information only when relevant and explicitly allowed.'),
        h('p', { role: 'note' }, 'This scaffold collects, saves and transmits zero profile information. Enabling it only shows this draft.'))
    }
    const profilePlugin = {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('plugins.detail.section', () => ctx.slots.register({
          name: 'plugins.detail.section', id: 'abinadwan-profile-draft', order: 40,
        }, ({ subject }) => (subject?.kind === 'bundle' && subject.pkg?.name === TYPE) ||
          (subject?.kind === 'row' && subject.row?.moduleName === TYPE + '/personal-profile')
          ? h(ProfileDraft) : null))
      },
    }
    return {
      inject: ['slots', 'remote', 'remoteAccess'],
      apply(ctx) {
        // Global left navigation and full-page synthetic preview are browser-only.
        // This never turns on the disabled Host Personal Profile component.
        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main', key: PROFILE_PANEL_ID,
        }, PersonalProfilePage))
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist', id: PROFILE_PANEL_ID, order: 40,
          label: () => 'Personal Profile',
        }, ProfilePanelIcon))
        // The official Plugins detail page owns update controls; never render them inside a Session tab.
        ctx.slots.inject('plugins.detail.section', () => ctx.slots.register({
          name: 'plugins.detail.section',
          id: 'environment-sidebar-versions',
          order: 50,
        }, ({ subject }) => subject?.kind === 'bundle' &&
          subject.pkg?.name === TYPE
          ? h(VersionUpdates, { installedVersion: subject.pkg.version || INSTALLED_VERSION })
          : null))

        // DSH discovers browser bundles at package roots. Host subpath rows
        // govern these child fibers through the public, access-checked inventory.
        ctx.remoteAccess.whenAccess('pluginManager/listPlugins', () => {
          const fibers = new Map()
          let stopped = false
          let generation = 0
          let pending = Promise.resolve()
          const components = [
            [TYPE + '/environment-context', environmentPlugin],
            [TYPE + '/personal-profile', profilePlugin],
          ]
          async function refresh() {
            const request = ++generation
            let rows
            try {
              rows = await ctx.remote.pluginManager.listPlugins()
              if (!Array.isArray(rows)) throw new Error('Invalid plugin inventory')
            } catch {
              rows = []
              if (!stopped && request === generation) {
                console.warn('[abinadwan-suite] Component inventory unavailable. UI paused until the next inventory refresh.')
              }
            }
            pending = pending.then(async () => {
              if (stopped || request !== generation) return
              for (const [moduleName, plugin] of components) {
                const active = rows.some(row => row.moduleName === moduleName &&
                  row.enabled === true && row.fiberPhase === 'active')
                const fiber = fibers.get(moduleName)
                if (!active && fiber) {
                  fibers.delete(moduleName)
                  await fiber.dispose()
                }
                if (stopped || request !== generation) return
                if (active && !fiber) fibers.set(moduleName, ctx.plugin(plugin))
              }
            }).catch(error => {
              console.warn('[abinadwan-suite] Component UI transition failed:', error)
            })
            await pending
          }
          const unsubscribe = ctx.remote.$on('plugin-manager/changed', refresh)
          const disconnectReset = ctx.on('connection/reset', refresh)
          void refresh()
          return () => {
            stopped = true
            generation++
            unsubscribe()
            disconnectReset()
            const disposals = [...fibers.values()].map(fiber => fiber.dispose())
            fibers.clear()
            return Promise.all(disposals).then(() => {})
          }
        })
      },
    }
  },
})
