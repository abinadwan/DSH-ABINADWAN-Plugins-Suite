/**
 * Browser half of @abinadwan/dsh-plugins-suite.
 * Uses DSH's documented lazy-CJS module registration and Slot API.
 * Native slots, scoped Cordis lifetimes, and an anonymous read-only stable-release check.
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

    // Only stable published GitHub Releases may trigger an in-app update offer.
    // This browser-side checker never installs anything without a separate click.
    const INSTALLED_VERSION = '0.7.1'
    const PACKAGE_NAME = '@abinadwan/dsh-plugins-suite'
    const RELEASE_SOURCE = 'https://api.github.com/repos/abinadwan/DSH-ABINADWAN-Plugins-Suite/releases/latest'
    const COMMIT_SOURCE = 'https://api.github.com/repos/abinadwan/DSH-ABINADWAN-Plugins-Suite/commits/'
    const RAW_MANIFEST = 'https://raw.githubusercontent.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/'
    const PINNED_SPEC_PREFIX = 'github:abinadwan/DSH-ABINADWAN-Plugins-Suite#'
    // Host-normalised repository location (plugin-manager `pinnedGitOrigin`), lower-cased for the identity check.
    const REPOSITORY_LOCATION = 'github.com/abinadwan/dsh-abinadwan-plugins-suite'
    const PROJECT_URL = 'https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite'
    const FULL_COMMIT = /^[0-9a-f]{40}$/
    const CHECK_INTERVAL = 24 * 60 * 60 * 1000
    let versionSnapshot = Object.freeze({phase:'idle'})
    const versionListeners = new Set()
    let nextAllowedCheck = 0
    let inflightCheck = null
    let versionDisposed = false
    let versionGeneration = 0
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
    /**
     * Every generated Harness Remote method resolves to `RemoteResult<T>`:
     * `{ ok: true, value }` or `{ ok: false, error }`. Never treat the envelope
     * itself as the value.
     */
    function remoteValue(answer, label) {
      if (answer && answer.ok === true) return answer.value
      const error = answer && answer.ok === false ? answer.error : undefined
      const reason = error && (error.message || error.code)
      throw new Error(label + ' failed: ' + (reason ? String(reason) : 'invalid Host response'))
    }
    function publishVersion(next, expectedGeneration = versionGeneration) {
      if (versionDisposed || expectedGeneration !== versionGeneration) return
      versionSnapshot = Object.freeze(next)
      for (const notify of [...versionListeners]) notify()
    }
    function subscribeVersion(notify) {
      versionListeners.add(notify)
      return () => versionListeners.delete(notify)
    }
    const getVersionSnapshot = () => versionSnapshot
    function getReleaseVersion(payload) {
      if (!payload || payload.draft !== false || payload.prerelease !== false ||
        typeof payload.tag_name !== 'string' || !/^v\d+\.\d+\.\d+$/.test(payload.tag_name)) {
        throw new Error('Untrusted or unsupported release metadata')
      }
      return payload.tag_name.slice(1)
    }
    const offline = () => typeof navigator === 'object' && navigator !== null && navigator.onLine === false
    async function githubJSON(url) {
      if (offline()) throw new Error('This device appears to be offline')
      const signal = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
        ? AbortSignal.timeout(10000) : undefined
      let response
      try {
        response = await fetch(url, {
          method:'GET', credentials:'omit', cache:'no-store', referrerPolicy:'no-referrer',
          headers:{Accept:'application/vnd.github+json'},
          ...signal ? {signal} : {},
        })
      } catch (error) {
        throw new Error('GitHub could not be reached (' + String(error?.message || error) + ')')
      }
      if (response.status === 404 && url === RELEASE_SOURCE) return null
      if (response.status === 403 || response.status === 429) {
        throw new Error('GitHub refused the request (HTTP ' + response.status + ', possibly rate limited). Try again later')
      }
      if (!response.ok) throw new Error('GitHub returned HTTP ' + response.status)
      try {
        return await response.json()
      } catch {
        throw new Error('GitHub returned an unreadable response')
      }
    }
    const stamp = () => new Date().toLocaleTimeString()
    function checkRelease(force = false) {
      if (versionDisposed) return Promise.resolve()
      if (inflightCheck) return inflightCheck
      const now = Date.now()
      if (!force && now < nextAllowedCheck) return Promise.resolve()
      nextAllowedCheck = now + CHECK_INTERVAL
      const generation = versionGeneration
      publishVersion({...versionSnapshot, phase:'checking'}, generation)
      const task = (async () => {
        try {
          const release = await githubJSON(RELEASE_SOURCE)
          if (!release) {
            publishVersion({phase:'unreleased', checked:stamp()}, generation)
            return
          }
          const latest = getReleaseVersion(release)
          if (isNewerVersion(latest, INSTALLED_VERSION) === null) throw new Error('Invalid release version')
          publishVersion({phase:'ready',latest,tag:release.tag_name,checked:stamp()}, generation)
        } catch (error) {
          publishVersion({phase:'error',message:String(error?.message || error),checked:stamp()}, generation)
        }
      })()
      const pending = task.finally(() => {if (inflightCheck === pending) inflightCheck = null})
      inflightCheck = pending
      return pending
    }
    /** The repository location of a Git spec, normalised as the Host's `pinnedGitOrigin` does. */
    function gitLocation(spec) {
      const hash = spec.indexOf('#')
      return (hash === -1 ? spec : spec.slice(0, hash))
        .replace(/^github:/i, 'github.com/').replace(/^git\+/i, '')
        .replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/^[^@/]+@/, '').replace(/^([^/:]+):(?!\d)/, '$1/')
        .replace(/\/+$/, '').replace(/\.git$/i, '').toLowerCase()
    }
    /**
     * Classify how the Host installed this bundle, from its `listBundles()` row.
     * Only a Git spec pinned to a full commit of this repository's root can be
     * updated in place by the Host (`BundleInfo.update === 'git'`).
     */
    function installMode(bundle) {
      if (!bundle || bundle.installed !== true) return { kind:'missing' }
      const source = typeof bundle.source === 'string' ? bundle.source : ''
      if (bundle.update === 'registry') return { kind:'registry', source }
      if (source && gitLocation(source) !== REPOSITORY_LOCATION) return { kind:'foreign', source }
      if (bundle.update !== 'git') return { kind:'unpinned', source }
      const hash = source.indexOf('#')
      const params = hash === -1 ? [] : source.slice(hash + 1).split('&')
      const paths = params.filter(part => part.startsWith('path:'))
      const commits = params.filter(part => !part.startsWith('path:'))
      const path = paths.length ? paths[0].slice(5).replace(/^\/+|\/+$/g, '') : ''
      if (paths.length > 1 || path !== '' || commits.length !== 1 || !FULL_COMMIT.test(commits[0].toLowerCase())) {
        return { kind:'unpinned', source }
      }
      return { kind:'pinned', source, commit:commits[0].toLowerCase(), location:source.slice(0, hash) }
    }
    const useAccess = (hook, action) => typeof hook === 'function' ? hook(action) === true : false
    function useMounted() {
      const mounted = React.useRef(true)
      React.useEffect(() => {
        mounted.current = true
        return () => { mounted.current = false }
      }, [])
      return mounted
    }
    const MIGRATION_STEPS = [
      'Harness can update a Git-installed bundle in place only when it was installed from a spec pinned to a full 40-character commit. Nothing was changed.',
      'One-time migration (manual, at your discretion): note which components are switched on, Uninstall this bundle from this page, then use Add plugin with the pinned spec shown below, and switch the components back on.',
      'Personal Profile settings are stored in this Harness Profile\'s configuration and uninstalling may remove them. If you use Personal Profile, first copy a JSON backup from Personal Profile → Backup & Restore (access permissions are not included). If the pinned install fails, reinstall from the same spec or from the original source.',
    ]
    // Installed-plugin detail page only; never run an installer in a React effect.
    function VersionUpdates({ installedVersion, pluginManager, useRemoteAccess }) {
      const update = React.useSyncExternalStore(subscribeVersion,getVersionSnapshot,getVersionSnapshot)
      const [action, setAction] = React.useState({phase:'idle'})
      const [mode, setMode] = React.useState({kind:'unknown'})
      const mounted = useMounted()
      const canList = useAccess(useRemoteAccess, 'pluginManager/listBundles')
      const canUpdate = useAccess(useRemoteAccess, 'pluginManager/updateBundle')
      const hostVersion = versionParts(installedVersion) ? installedVersion : undefined
      const currentVersion = hostVersion || INSTALLED_VERSION
      const newer = update.phase === 'ready' ? isNewerVersion(update.latest,currentVersion) : false
      const phase = update.phase === 'ready' ? (newer ? 'available' : 'current') : update.phase
      // A read-only Host lookup so the page states up front whether in-app
      // updates are possible for this installation. It never changes anything.
      React.useEffect(() => {
        if (!canList || !pluginManager) return undefined
        let live = true
        Promise.resolve().then(() => pluginManager.listBundles()).then(answer => {
          const bundles = remoteValue(answer, 'Plugin list')
          const bundle = Array.isArray(bundles) ? bundles.find(item => item?.name === PACKAGE_NAME) : undefined
          if (live) setMode(installMode(bundle))
        }).catch(error => { if (live) setMode({kind:'error',message:String(error?.message || error)}) })
        return () => { live = false }
      }, [canList, pluginManager, update.checked])
      async function prepare() {
        setAction({phase:'checking'})
        try {
          if (phase !== 'available' || typeof update.tag !== 'string') throw new Error('No approved newer release')
          // Resolve the release tag to an immutable commit, and verify the
          // package identity and exact version at that commit.
          const commit = await githubJSON(COMMIT_SOURCE + encodeURIComponent(update.tag))
          const sha = typeof commit?.sha === 'string' ? commit.sha.toLowerCase() : ''
          if (!FULL_COMMIT.test(sha)) throw new Error('Invalid release commit')
          const manifest = await githubJSON(RAW_MANIFEST + sha + '/package.json')
          if (manifest?.name !== PACKAGE_NAME || manifest?.version !== update.latest) {
            throw new Error('Release manifest does not match the expected package')
          }
          if (!canList || !pluginManager) throw new Error('Plugin management access is not available in this window')
          const bundles = remoteValue(await pluginManager.listBundles(), 'Plugin list')
          const bundle = Array.isArray(bundles) ? bundles.find(item => item?.name === PACKAGE_NAME) : undefined
          const current = installMode(bundle)
          if (mounted.current) setMode(current)
          if (current.kind === 'missing') throw new Error('This bundle is not listed as installed by the Host')
          if (current.kind === 'foreign') throw new Error('This bundle was installed from another repository; it will not be updated from here')
          if (current.kind === 'registry') throw new Error('This copy is managed from a registry; use the native Versions section')
          if (current.kind !== 'pinned') {
            if (mounted.current) setAction({phase:'manual',latest:update.latest,sha,spec:PINNED_SPEC_PREFIX + sha})
            return
          }
          if (bundle.version !== currentVersion) {
            throw new Error('Installed bundle version changed; reopen Plugins and check again')
          }
          if (current.commit === sha) throw new Error('The installed commit already matches this release')
          if (!canUpdate) throw new Error('This window may not update plugins; use the owner session')
          if (mounted.current) setAction({phase:'confirm',latest:update.latest,sha,spec:current.location + '#' + sha})
        } catch (error) {
          if (mounted.current) setAction({phase:'error',message:String(error?.message || error)})
        }
      }
      async function applyUpdate() {
        if (action.phase !== 'confirm' || !FULL_COMMIT.test(action.sha) ||
          typeof action.spec !== 'string' || !action.spec.endsWith('#' + action.sha) ||
          gitLocation(action.spec) !== REPOSITORY_LOCATION ||
          isNewerVersion(action.latest,currentVersion) !== true || !canUpdate) return
        const {latest,spec} = action
        setAction({phase:'installing',latest})
        try {
          // The Host owns package management, permissions, compatibility,
          // removal, reinstallation on failure and restart reporting.
          const result = remoteValue(await pluginManager.updateBundle(PACKAGE_NAME, latest, {spec}), 'Host update')
          const outcome = result?.result
          const state = outcome?.application
          if (result?.restore) {
            const restored = result.restore.application
            throw new Error('The new version did not install' +
              (outcome?.error?.code ? ' (' + outcome.error.code + ')' : '') + '; the Host ' +
              (restored === 'failed' || restored === 'cancelled'
                ? 'could not reinstall the previous version. Reinstall it from the Plugins page'
                : 'reinstalled the previous version'))
          }
          if (state === 'failed' || state === 'cancelled') {
            throw new Error('Host reported ' + state + (outcome?.error?.code ? ' (' + outcome.error.code + ')' : '') +
              ' at the ' + (result?.step || 'update') + ' step')
          }
          if (state !== 'applied' && state !== 'restart-required' && state !== 'overridden') {
            throw new Error('Update outcome not confirmed. Check the native Plugins page')
          }
          if (mounted.current) setAction({phase:'done',latest,restart:state === 'restart-required'})
        } catch (error) {
          if (mounted.current) setAction({phase:'error',message:String(error?.message || error)})
        }
      }
      const soft = 'rgba(127,127,127,.16)'
      const muted = {fontSize:12,opacity:.72,lineHeight:1.65,margin:0}
      const status = phase === 'checking' ? 'Checking GitHub Releases…'
        : phase === 'available' ? 'Update available: v' + update.latest
        : phase === 'current' ? 'Up to date'
        : phase === 'unreleased' ? 'No published stable release yet'
        : phase === 'error' ? 'Could not check for updates'
        : 'Not checked yet'
      const method = mode.kind === 'pinned' ? 'Git, pinned to ' + mode.commit.slice(0, 12)
        : mode.kind === 'unpinned' ? 'Git, not pinned to a commit (in-app update unavailable)'
        : mode.kind === 'registry' ? 'Registry'
        : mode.kind === 'foreign' ? 'Another repository'
        : mode.kind === 'missing' ? 'Not listed by the Host'
        : mode.kind === 'error' ? 'Unavailable (' + mode.message + ')'
        : 'Checking…'
      const buttonStyle = {border:'1px solid rgba(127,127,127,.35)',borderRadius:8,
        padding:'8px 12px',fontSize:12,color:'inherit',background:'transparent',cursor:'pointer'}
      const busy = action.phase === 'checking' || action.phase === 'installing'
      return h('section',{'data-environment-update-section':'','aria-label':'Suite updates',
        style:{borderTop:'1px solid ' + soft,padding:'20px 0',color:'inherit'}},
        h('header',{style:{display:'flex',alignItems:'center',gap:12,
          justifyContent:'space-between',marginBottom:14}},
          h('h3',{style:{fontSize:16,margin:0,fontWeight:650}},'Suite updates (GitHub Releases)'),
          h('button',{type:'button','data-check-updates':'',
            'aria-label':'Check for plugin updates',disabled:phase==='checking' || busy,
            onClick:()=>{void checkRelease(true)},style:buttonStyle},'↻ Check again')),
        h('div',{style:{border:'1px solid rgba(127,127,127,.29)',borderRadius:12,
          background:'rgba(127,127,127,.07)',padding:17}},
          h('div',{role:'status','aria-live':'polite',style:{fontWeight:650,fontSize:13}},status),
          h('div',{style:{marginTop:12,fontSize:12}},
            line('Installed (Host)', hostVersion ? 'v' + hostVersion : 'Unavailable'),
            line('Browser module', 'v' + INSTALLED_VERSION),
            line('Latest stable release', update.latest ? 'v' + update.latest : '—'),
            line('Last checked', update.checked || '—'),
            line('Update method', method)),
          hostVersion && hostVersion !== INSTALLED_VERSION
            ? h('p',{role:'note','data-version-mismatch':'',style:{...muted,marginTop:10}},
              'The Host reports v' + hostVersion + ' but this window runs browser module v' + INSTALLED_VERSION +
              '. Reload the window or restart Harness so both halves run the same version.') : null,
          phase==='error' ? h('p',{style:{...muted,marginTop:10}},update.message) : null,
          phase==='available' && action.phase !== 'confirm' && action.phase !== 'done' ? h('div',{style:{marginTop:12}},
            h('button',{type:'button','data-update-now':'',disabled:busy,
              style:buttonStyle,onClick:prepare},'Update now')) : null,
          action.phase==='checking'
            ? h('p',{role:'status',style:{...muted,marginTop:12}},'Verifying the release and this installation…') : null,
          action.phase==='error'
            ? h('p',{role:'alert',style:{...muted,marginTop:12}},action.message) : null,
          action.phase==='manual' ? h('div',{role:'alert','data-update-migration':'',style:{marginTop:12}},
            ...MIGRATION_STEPS.map((text,index)=>h('p',{key:index,style:{...muted,marginTop:index?8:0}},text)),
            h('p',{style:{...muted,marginTop:8}},'Pinned spec for v' + action.latest + ':'),
            h('code',{'data-pinned-spec':'',style:{display:'block',fontSize:12,overflowWrap:'anywhere',
              userSelect:'all',padding:'6px 8px',border:'1px solid ' + soft,borderRadius:6,marginTop:4}},action.spec)) : null,
          action.phase==='confirm' ? h('div',{role:'dialog','aria-label':'Confirm suite update',style:{marginTop:13}},
            h('p',{style:{fontSize:13,margin:'0 0 8px'}},'Install v'+action.latest+' over v'+currentVersion+' through the Harness Plugins Host?'),
            h('p',{style:muted},'The Host removes the installed version, installs the pinned commit, and reinstalls the '+
              'current version if that fails. A restart may be required.'),
            h('p',{style:{...muted,overflowWrap:'anywhere',marginTop:8}},'Pinned spec: '+action.spec),
            h('div',{style:{display:'flex',gap:8,marginTop:10}},
              h('button',{type:'button','data-confirm-update':'',style:buttonStyle,onClick:applyUpdate},
                'Confirm update'),
              h('button',{type:'button','data-cancel-update':'',style:buttonStyle,onClick:()=>setAction({phase:'idle'})},
                'Cancel'))) : null,
          action.phase==='installing'
            ? h('p',{role:'status',style:{...muted,marginTop:12}},'Updating through Harness Plugin Manager…') : null,
          action.phase==='done'
            ? h('p',{role:'status',style:{...muted,marginTop:12}},
              'Host applied the update to v'+action.latest+(action.restart ? '; restart Harness to finish.' : '.')) : null),
        h('p',{style:{...muted,marginTop:12}},
          'Checks stable GitHub Releases automatically on startup and every 24 hours. '+
          'Nothing is installed without your confirmation, and installation is always performed by Harness itself.'),
        h('a',{href:PROJECT_URL+'/releases',target:'_blank',rel:'noopener noreferrer',
          style:{display:'inline-block',fontSize:12,marginTop:8,color:'#69a9fc',
            textDecoration:'underline'}},'View published releases'))
    }

    function Details({ sessionId, projections, projectionState, sessions, workspaces }) {
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
        line('Browser', platform || 'Unavailable'),
        line('Workspaces', linked.length),
        ...linked.map(w => line('▣ ' + (w.title || 'Workspace'), w.path || '')),
      ]
      const context = []
      if (pct === undefined) {
        context.push(h('p', { key: 'no-pressure', style: muted, 'data-context-fallback': projectionState || 'empty' },
          projectionState === 'loading' ? 'Loading context usage for this Session…'
            : projectionState === 'error' || projectionState === 'migration-required'
              ? 'Context usage is unavailable for this Session.'
              : 'Context use is available after the model reports usage.'))
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
          const sessions = React.useSyncExternalStore(subS, getS, getS)
          const workspaces = React.useSyncExternalStore(subW, getW, getW)
          const live = useLiveProjections(props.useProjection)
          const sessionId = props.sessionId
          const listed = sessions?.projectionsBySession?.[sessionId]
          const fallback = listed?.values ?? sessions?.byId?.[sessionId]?.projectionValues
          const projections = live && (live.contextPressure || live.contextBreakdown || live.tokenUsage)
            ? live : fallback
          return h(Details, { sessionId, projections, projectionState: listed?.state, sessions, workspaces })
        }
        ctx.effect(() => ctx.sidebarRightTabs.register({
          id: TYPE + '/environment-context', kind: KIND, title: () => 'Environment & Context',
          guide: [{ id: 'open', order: 12, title: () => 'Environment & Context',
            description: () => 'Current context and workspace details' }],
        }), 'environment-sidebar: type')
        ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
          // The keyed seat dispatches by the tab TYPE id, not its package root.
          name: 'sidebar.right.pane.tab', key: TYPE + '/environment-context',
          inject: sessionId => ({ sessionId }),
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

    // Native settings editor. Only the official settings Remote writes values. No agent capabilities.
    // Registered only by `profilePlugin`, i.e. only while the Host Personal Profile row is On.
    const PROFILE_PANEL_ID = TYPE + '/personal-profile-page'
    function ProfilePanelIcon({ size = 20 }) {
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24',
        fill: 'none', stroke: 'currentColor', strokeWidth: 1.8,
        strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
      h('rect', { x: 3, y: 2.5, width: 18, height: 19, rx: 3 }),
      h('circle', { cx: 9, cy: 9, r: 2 }),
      h('path', { d: 'M5.5 16c.6-2.8 6.4-2.8 7 0M14 8h4M14 12h4M14 16h4' }))
    }
    // Original preference catalog; browser-only preview, not model instructions.
    // Neutral values generate no extra preference text.
    const PROFILE_STYLES = [
      ['default','الافتراضي','Default',''],
      ['professional','احترافي','Professional','Use polished, precise, professional language.'],
      ['friendly','ودود','Friendly','Use a friendly, approachable tone.'],
      ['candid','صريح ومباشر','Candid','Be direct, constructive, and candid.'],
      ['creative','إبداعي','Creative','Explore original ideas and imaginative approaches when relevant.'],
      ['efficient','مختصر وعملي','Efficient','Be concise, practical, and focused on the result.'],
      ['critical','ناقد وتحليلي','Critical','Evaluate assumptions, evidence, and tradeoffs critically.'],
      ['technical','تقني ومتخصص','Technical','Use precise technical terminology and explain relevant implementation details.'],
    ]
    const PROFILE_LANGUAGES = [
      ['auto','تلقائي — لغة المستخدم','Automatic — user language',''],
      ['ar','العربية — Arabic','العربية — Arabic','Arabic'],
      ['en','English','English','English'],
      ['zh','中文 — Chinese','中文 — Chinese','Chinese'],
      ['es','Español — Spanish','Español — Spanish','Spanish'],
      ['fr','Français — French','Français — French','French'],
      ['de','Deutsch — German','Deutsch — German','German'],
      ['ja','日本語 — Japanese','日本語 — Japanese','Japanese'],
    ]
    const PROFILE_TRAITS = [
      ['warmth','الودّ','Warmth','Keep the tone neutral and reserved.','Use a warmer, more approachable tone.'],
      ['enthusiasm','الحماس','Enthusiasm','Use a calm, restrained tone.','Use a more energetic tone when appropriate.'],
      ['structure','العناوين والقوائم','Headers and lists','Prefer cohesive prose over unnecessary headings or lists.','Use headings and lists when they improve readability.'],
      ['emoji','الرموز التعبيرية','Emoji','Avoid unnecessary emoji.','Use appropriate emoji sparingly when suitable for the task.'],
      ['detail','مستوى التفصيل','Detail','Prefer shorter answers when sufficient.','Provide more detail when useful.'],
      ['critical','التفكير النقدي','Critical thinking','Focus on the requested task without unnecessary critique.','Actively examine assumptions and identify meaningful risks.'],
    ]
    const PROFILE_PRESETS = [
      ['critical','التفكير النقدي','Critical Thinking','اختبر الافتراضات ولا توافق تلقائيًا.','Challenge weak assumptions rather than agreeing automatically.'],
      ['no-fluff','دون حشو','No Fluff','تجنّب الحشو والمجاملات غير الضرورية.','Avoid filler and unnecessary compliments.'],
      ['grill-me','مراجعة المتطلبات','Grill-Me Mode','ناقش المتطلبات والمخاطر في القرارات المعقدة.','For complex decisions, clarify material requirements and risks before proceeding.'],
      ['evidence','الأدلة أولًا','Evidence First','ميّز بين الأدلة والافتراضات وعدم اليقين.','Distinguish evidence, assumptions, and uncertainty; cite reliable sources when applicable.'],
      ['steps','خطوة بخطوة','Step-by-Step','اشرح المهام المعقدة بخطوات عملية.','Break complex tasks into actionable steps.'],
      ['action','التركيز على النتائج','Action Oriented','ركّز على الحلول والخطوات العملية.','Prioritize practical solutions and actionable next steps.'],
      ['code','مراجعة الكود','Code Reviewer','راجع الجودة والأمان والاختبارات.','Assess code quality, security, performance, and test coverage when reviewing code.'],
      ['humanizer','صياغة طبيعية','Humanizer','حسّن الصياغة دون تغيير الوقائع؛ لا يستدعي المهارة.','Prefer natural writing and preserve facts, citations, and uncertainty when editing.'],
    ]
    function neutralProfilePreferences() {
      return {style:'default', responseLanguage:'auto',
        traits:Object.fromEntries(PROFILE_TRAITS.map(([key])=>[key,1])),
        presets:[], custom:''}
    }
    function previewProfilePreferences(pref) {
      const lines = []
      const style = PROFILE_STYLES.find(item=>item[0]===pref.style)
      const language = PROFILE_LANGUAGES.find(item=>item[0]===pref.responseLanguage)
      if(style?.[3]) lines.push(style[3])
      if(language?.[3]) lines.push('Prefer '+language[3]+' for responses unless the current task requests another language.')
      for(const [key,,,less,more] of PROFILE_TRAITS) {
        if(pref.traits[key]===0) lines.push(less)
        if(pref.traits[key]===2) lines.push(more)
      }
      for(const [key,,,,instruction] of PROFILE_PRESETS) {
        if(pref.presets.includes(key)) lines.push(instruction)
      }
      if(pref.custom) lines.push(pref.custom)
      return [...new Set(lines)].join('\n')
    }
    const PROFILE_NS = 'abinadwan-personal-profile'
    const PERSONAL_FIELDS = ['preferredName','nationality','gender']
    const privatePolicies = () => Object.fromEntries(PERSONAL_FIELDS.map(key=>[key,'private']))
    const emptyProfileRecord = () => ({version:1,locale:'ar',
      information:{preferredName:'',nationality:'',gender:''},global:neutralProfilePreferences(),
      workspaces:[],allowPersonalInformation:false,allowCloud:false})
    const newWorkspaceRecord = id => ({id,override:false,preferences:neutralProfilePreferences(),policies:privatePolicies()})
    // Payload guard for the whole record (serialized UTF-16 units), not a
    // workspace count: Harness owns Workspaces. Matches the restore text limit.
    const PROFILE_MAX_CHARS = 3_000_000
    const profileTooLarge = value => JSON.stringify(value).length > PROFILE_MAX_CHARS
    const isDefaultWorkspace = w => JSON.stringify(w)===JSON.stringify(newWorkspaceRecord(w.id))
    const profileKeys = (value,keys) => value && typeof value==='object' && !Array.isArray(value) &&
      Object.keys(value).length===keys.length && keys.every(key=>Object.hasOwn(value,key))
    // Strict wire/backup decoder. Reject unknown fields and invalid versions;
    // never echo user-supplied content into errors. No implicit legacy migration.
    function decodeProfile(value) {
      const check = (condition) => { if(!condition) throw new Error('Invalid Personal Profile settings') }
      const validText = (v,n) => typeof v==='string' && v.length<=n
      const preference = p => {
        check(profileKeys(p,['style','responseLanguage','traits','presets','custom']))
        check(PROFILE_STYLES.some(i=>i[0]===p.style)&&PROFILE_LANGUAGES.some(i=>i[0]===p.responseLanguage))
        check(profileKeys(p.traits,PROFILE_TRAITS.map(i=>i[0])) &&
          Object.values(p.traits).every(n=>[0,1,2].includes(n)))
        check(Array.isArray(p.presets)&&p.presets.length<=8&&new Set(p.presets).size===p.presets.length&&
          p.presets.every(id=>PROFILE_PRESETS.some(i=>i[0]===id))&&validText(p.custom,8192))
        return {style:p.style,responseLanguage:p.responseLanguage,traits:{...p.traits},presets:[...p.presets],custom:p.custom}
      }
      check(profileKeys(value,['version','locale','information','global','workspaces','allowPersonalInformation','allowCloud']))
      check(!profileTooLarge(value))
      check(value.version===1&&['ar','en'].includes(value.locale)&&typeof value.allowPersonalInformation==='boolean'&&typeof value.allowCloud==='boolean')
      const i=value.information
      check(profileKeys(i,PERSONAL_FIELDS)&&validText(i.preferredName,128)&&validText(i.nationality,128)&&['','male','female','unspecified'].includes(i.gender))
      check(Array.isArray(value.workspaces))
      const seen=new Set()
      const workspaces=value.workspaces.map(w=>{
        check(profileKeys(w,['id','override','preferences','policies'])&&validText(w.id,256)&&w.id.length>0&&
          !seen.has(w.id)&&typeof w.override==='boolean')
        seen.add(w.id)
        check(profileKeys(w.policies,PERSONAL_FIELDS)&&Object.values(w.policies).every(v=>['private','ask_first','allow'].includes(v)))
        return {id:w.id,override:w.override,preferences:preference(w.preferences),policies:{...w.policies}}
      })
      return {version:1,locale:value.locale,information:{...i},global:preference(value.global),workspaces,
        allowPersonalInformation:value.allowPersonalInformation,allowCloud:value.allowCloud}
    }
    function profileView(view) {
      if(view?.ns!==PROFILE_NS || !Number.isSafeInteger(view.revision)||view.revision<0||!profileKeys(view.value,['record'])) throw new Error('Settings unavailable')
      return {revision:view.revision,record:decodeProfile(view.value.record)}
    }
    function withoutAuthority(record) {
      return {...record,allowPersonalInformation:false,allowCloud:false,
        workspaces:record.workspaces.map(w=>({...w,policies:privatePolicies()}))}
    }
    function mergeBackup(current,incoming) {
      const known=new Set(current.workspaces.map(w=>w.id))
      const workspaces=[...current.workspaces,...incoming.workspaces.filter(w=>!known.has(w.id))]
      return withoutAuthority({...current,information:Object.fromEntries(PERSONAL_FIELDS.map(k=>[k,current.information[k]||incoming.information[k]])),workspaces})
    }
    function PersonalProfilePage({settings,workspaceSource,connectionSource,useRemoteAccess}) {
      const canRead=typeof useRemoteAccess==='function' ? useRemoteAccess('settings/describe') : false
      const canWrite=typeof useRemoteAccess==='function' ? useRemoteAccess('settings/replace') : false
      const workspacesSnapshot=React.useSyncExternalStore(workspaceSource.subscribe,workspaceSource.getSnapshot,workspaceSource.getSnapshot)
      const generation=React.useSyncExternalStore(connectionSource.subscribe,connectionSource.getSnapshot,connectionSource.getSnapshot)
      const [record,setRecord]=React.useState(emptyProfileRecord)
      const [saved,setSaved]=React.useState(null)
      const [revision,setRevision]=React.useState(null)
      const [status,setStatus]=React.useState('loading')
      const [profile,setProfile]=React.useState('')
      const [page,setPage]=React.useState('information')
      const [instructionScope,setInstructionScope]=React.useState('global')
      const [backupText,setBackupText]=React.useState('')
      const [restoreText,setRestoreText]=React.useState('')
      const [backupStrategy,setBackupStrategy]=React.useState('merge')
      const [restoreReview,setRestoreReview]=React.useState(null)
      const [restoreAck,setRestoreAck]=React.useState(false)
      const request=React.useRef(0)
      const inFlight=React.useRef(false)
      const access=React.useRef({canRead,canWrite,generation})
      access.current={canRead,canWrite,generation}
      const lifetimeValid = g=>connectionSource.getSnapshot()===g&&access.current.canRead
      const load = async () => {
        const id=++request.current,g=connectionSource.getSnapshot()
        inFlight.current=true;setConfirmReload(false);setStatus('loading');setRevision(null);setSaved(null)
        setRecord(emptyProfileRecord());setBackupText('');setRestoreText('');setRestoreReview(null);setRestoreAck(false)
        if(!access.current.canRead){inFlight.current=false;setStatus('unavailable');return}
        try {
          const response=await settings.describe()
          if(id!==request.current||!lifetimeValid(g))return
          if(response?.ok!==true||!Array.isArray(response.value?.namespaces))throw new Error('Unavailable')
          const snapshot=profileView(response.value.namespaces.find(x=>x.ns===PROFILE_NS))
          if(response.value.writable!==true)throw new Error('Read only')
          setRecord(snapshot.record);setSaved(snapshot.record);setRevision(snapshot.revision);setStatus('ready')
        } catch {if(id===request.current&&lifetimeValid(g))setStatus('unavailable')}
        finally {if(id===request.current)inFlight.current=false}
      }
      const [confirmReload,setConfirmReload]=React.useState(false)
      const dirtyRef=React.useRef(false)
      React.useEffect(()=>{
        // A reconnect or access change re-reads only a clean page. A dirty draft
        // stays on screen: Save remains revision-checked, Reload asks first.
        if(dirtyRef.current){
          request.current++;inFlight.current=false
          setStatus(access.current.canRead?'reconnected':'unavailable')
        }else void load()
        return()=>{request.current++;inFlight.current=false}
      },[canRead,generation])
      const save = async () => {
        if(inFlight.current||revision===null||!canRead||!canWrite||generation!==connectionSource.getSnapshot())return
        let next
        try{if(profileTooLarge(record)){setStatus('tooLarge');return}next=decodeProfile(record)}catch{setStatus('invalid');return}
        const id=++request.current,g=generation
        inFlight.current=true;setStatus('saving')
        try{
          const response=await settings.replace(PROFILE_NS,{record:next},revision)
          if(id!==request.current||!lifetimeValid(g))return
          if(response?.ok!==true){
            setStatus(response?.error?.code==='settings/conflict'?'conflict':'failed');return
          }
          const snapshot=profileView(response.value)
          if(JSON.stringify(snapshot.record)!==JSON.stringify(next))throw new Error('Unconfirmed write')
          setRecord(snapshot.record);setSaved(snapshot.record);setRevision(snapshot.revision);setStatus('saved')
        }catch{if(id===request.current&&lifetimeValid(g))setStatus('failed')}
        finally{if(id===request.current)inFlight.current=false}
      }
      const language=record.locale,values=record.information,globalPreferences=record.global
      const busy=status==='loading'||status==='saving'
      const editable=canRead&&canWrite&&revision!==null&&!busy&&generation===connectionSource.getSnapshot()
      const dirty=saved!==null&&JSON.stringify(record)!==JSON.stringify(saved)
      dirtyRef.current=dirty
      const unsavedWork=dirty||status==='failed'||status==='conflict'||status==='reconnected'
      const requestReload=()=>{if(unsavedWork)setConfirmReload(true);else void load()}
      const profiles=workspacesSnapshot?.phase==='ready'&&workspacesSnapshot?.state!=='error'
        ?(workspacesSnapshot.items||[]).filter(w=>typeof w.workspaceId==='string'&&w.workspaceId.length>0&&w.workspaceId.length<=256)
        :[]
      const activeWorkspace=profiles.some(w=>w.workspaceId===profile)?profile:(profiles[0]?.workspaceId||'')
      const workspace=record.workspaces.find(w=>w.id===activeWorkspace)||newWorkspaceRecord(activeWorkspace)
      const writeWorkspace=updater=>{
        if(!activeWorkspace)return
        setRecord(old=>{
          const found=old.workspaces.find(w=>w.id===activeWorkspace)
          const next=updater(found||newWorkspaceRecord(activeWorkspace))
          // A row equal to the defaults (inherit, neutral, all Private) is not stored.
          const others=old.workspaces.filter(w=>w.id!==activeWorkspace)
          if(isDefaultWorkspace(next))return found?{...old,workspaces:others}:old
          return {...old,workspaces:found?old.workspaces.map(w=>w.id===activeWorkspace?next:w):[...old.workspaces,next]}
        })
      }
      const setLanguage=v=>setRecord(old=>({...old,locale:v}))
      const setGlobalPreferences=updater=>setRecord(old=>({...old,global:updater(old.global)}))
      const setField=(id,value)=>setRecord(old=>({...old,information:{...old.information,[id]:value}}))
      const ar = {
        information:'معلوماتي', instructions:'تعليمات الوكيل', access:'التحكم في الوصول', backup:'النسخ والاستعادة', privacy:'الخصوصية والأمان',title:'الملف الشخصي',
        subtitle:'إعدادات محلية ضمن ملف Harness الحالي',warning:'يُحفظ هذا المحتوى محليًا دون تشفير خاص بالإضافة. لا تكتب كلمات مرور أو مفاتيح أو معلومات حساسة. لا تُرسل هذه الإضافة أيًا من هذه الإعدادات إلى نموذج حاليًا.',
        profile:'مساحة العمل',language:'لغة الواجهة',preferredName:'الاسم المفضل',nationality:'الجنسية',gender:'الجنس',
        global:'الإعدادات العامة لهذا الملف',override:'تخصيص مساحة العمل',scope:'نطاق التعليمات',environment:'مساحة العمل',
        personality:'الشخصية',styleTone:'الأسلوب والنبرة',responseLanguage:'لغة الردود',characteristics:'خصائص الردود',presets:'خيارات سلوكية جاهزة',customInstructions:'تعليمات مخصصة',
        less:'أقل',neutral:'متوازن',more:'أكثر',inherited:'تستخدم مساحة العمل الإعدادات العامة.',overrideHint:'الإعدادات الخاصة تستبدل العامة بالكامل.',
        preferenceHint:'كل الاختيارات اختيارية. لا تُحقن التعليمات في الوكيل حاليًا.',languageHint:'لغة الردود مستقلة عن لغة الواجهة. اللهجة تُكتب ضمن التعليمات.',
        previewHint:'تُعرض التعليمات الناتجة هنا فقط؛ الربط بالوكيل غير متاح بعد.',presetHint:'لا اختيار افتراضيًا.',resetPreferences:'إعادة ضبط إعدادات هذا النطاق',
        inherit:'استخدام العامة',customMode:'تخصيص',effective:'المعاينة النهائية',optIn:'السماح باستخدام المعلومات الشخصية (إعداد محفوظ، غير مفعّل في الوكيل)',
        fieldPolicies:'صلاحيات مساحة العمل',private:'خاص',ask:'اسأل أولًا',allow:'سماح',
        cloud:'السماح بإرسال المعلومات الشخصية إلى مزود سحابي (إعداد محفوظ، غير مفعّل)',accessHint:'لا يتم الوصول للمعلومات أو إرسالها حاليًا. القيم التالية تفضيلات سياسات فقط إلى حين ربط الوكيل.',
        backupHint:'نسخ JSON محلي يدوي دون تشفير. استعادة الإعدادات تزيل جميع صلاحيات الوصول والإرسال.',
        export:'عرض نسخة JSON',import:'مراجعة النسخة',merge:'دمج دون استبدال موجود',replace:'استبدال الكل',confirm:'أوافق على الاستعادة وإعادة الصلاحيات إلى خاص وإيقاف الإرسال.',
        applyRestore:'تطبيق الاستعادة على المسودة',restoreReady:'النسخة صالحة للمراجعة. اضغط تطبيق ثم حفظ.',
        reset:'إعادة ضبط المسودة',missing:'غير محدد',noInstruction:'لا توجد تعليمات.',save:'حفظ التغييرات',reload:'إعادة التحميل (تجاهل المسودة)',
        loading:'جارٍ قراءة الإعدادات…',unavailable:'الإعدادات المحلية غير متاحة أو غير قابلة للكتابة. لم يتم حفظ شيء.',ready:'الإعدادات محمّلة.',saving:'جارٍ الحفظ…',saved:'تم تأكيد الحفظ من Harness.',
        failed:'تعذر تأكيد الحفظ. أعد التحميل للتحقق قبل المحاولة.',conflict:'تغيرت الإعدادات في نافذة أخرى. أعد التحميل ثم أعد تعديلها.',invalid:'الإعدادات أو النسخة غير صالحة.',dirty:'توجد تغييرات غير محفوظة.',
        tooLarge:'الإعدادات أكبر من الحد المسموح للحفظ. لم يُحفظ شيء، وبقيت تعديلاتك في المسودة.',
        reconnected:'أُعيد الاتصال. بقيت مسودتك في الصفحة: يمكنك الحفظ (يتحقق Harness من الإصدار) أو إعادة التحميل.',
        discardWarning:'لديك تغييرات غير محفوظة ستُفقد عند إعادة التحميل. للاحتفاظ بها انسخ نسخة JSON أولًا من «النسخ والاستعادة».',
        discardConfirm:'تجاهل التغييرات وإعادة التحميل',discardCancel:'متابعة التعديل',
      }
      const en = {
        information:'My Information',instructions:'Agent Instructions',access:'Access Control',backup:'Backup & Restore',privacy:'Privacy & Security',title:'Personal Profile',
        subtitle:'Local settings in the active Harness Profile',warning:'Stored locally without plugin-level encryption. Do not enter passwords, keys or sensitive information. This plugin does not currently send these settings to a model.',
        profile:'Workspace',language:'Interface language',preferredName:'Preferred name',nationality:'Nationality',gender:'Gender',
        global:'Global in this Profile',override:'Workspace override',scope:'Instruction scope',environment:'Workspace',
        personality:'Personality',styleTone:'Style and tone',responseLanguage:'Response language',characteristics:'Response characteristics',presets:'Behavior presets',customInstructions:'Custom instructions',
        less:'Less',neutral:'Balanced',more:'More',inherited:'This workspace inherits global preferences.',overrideHint:'Workspace preferences fully replace global preferences.',
        preferenceHint:'Optional choices. Nothing is injected into the agent yet.',languageHint:'Response language is separate from interface language. Put dialect preferences in custom instructions.',
        previewHint:'Effective text preview only; agent integration is not yet available.',presetHint:'None selected by default.',resetPreferences:'Reset this scope',
        inherit:'Inherit global',customMode:'Custom override',effective:'Effective preview',optIn:'Allow use of personal information (saved preference, not active in agent)',
        fieldPolicies:'Workspace policies',private:'Private',ask:'Ask First',allow:'Allow',
        cloud:'Allow personal information to be sent to a cloud provider (saved preference, not active)',accessHint:'No information is disclosed or sent today. These are saved policy preferences, not active enforcement.',
        backupHint:'Manual local JSON backup, not encrypted. Restoring resets all access and cloud permissions.',
        export:'Show JSON backup',import:'Review backup',merge:'Merge without replacing existing values',replace:'Replace all',confirm:'Confirm restore, reset all policies to Private, and disable sharing.',
        applyRestore:'Apply restore to draft',restoreReady:'Backup validated for review. Apply, then Save.',
        reset:'Reset draft',missing:'Unspecified',noInstruction:'No instructions.',save:'Save changes',reload:'Reload (discard draft)',
        loading:'Reading settings…',unavailable:'Local settings unavailable or not writable. Nothing saved.',ready:'Settings loaded.',saving:'Saving…',saved:'Save confirmed by Harness.',
        failed:'Save not confirmed. Reload to verify before retrying.',conflict:'Settings changed in another window. Reload and reapply edits.',invalid:'Invalid settings or backup.',dirty:'Unsaved changes.',
        tooLarge:'Settings are too large to save. Nothing was saved; your edits remain in the draft.',
        reconnected:'Connection was reset. Your draft is kept on this page: you can Save (Harness checks the revision) or Reload.',
        discardWarning:'You have unsaved changes that Reload will discard. To keep them, first copy a JSON backup from Backup & Restore.',
        discardConfirm:'Discard changes and reload',discardCancel:'Keep editing',
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
      const fields = PERSONAL_FIELDS
      const sections = ['information','instructions','access','backup','privacy']
      function card(title, ...children) {
        return h('section', { style:surface, 'aria-label':title },
          h('h2', { style:{fontSize:17,margin:'0 0 13px'} }, title), ...children)
      }
      function input(key, title, value, change, props = {}) {
        return h('div', { key, style:{marginBottom:14,minWidth:0} },
          h('label', { htmlFor:'pp-'+key, style:label }, title),
          h('input', { id:'pp-'+key, style:control, type:'text', maxLength:128,
            value:value || '', onChange:e=>change(e.target.value), autoComplete:'off',
            dir:'auto', ...props }))
      }
      function dropdown(key, title, value, options, onChange) {
        return h('div', { key, style:{marginBottom:14} },
          h('label', { htmlFor:'pp-'+key, style:label }, title),
          h('select', { id:'pp-'+key, style:{...control,backgroundColor:'Field',color:'FieldText',colorScheme:'inherit'},
            value, onChange:e=>onChange(e.target.value) },
            options.map(([v,txt])=>h('option',{key:v,value:v,style:{backgroundColor:'Field',color:'FieldText'}},txt))))
      }
      const notice = h('p', { role:'note', style:{padding:'12px 15px',
        border:'1px solid rgba(208,158,52,.7)', borderRadius:10,
        background:'rgba(208,158,52,.1)',fontSize:13,lineHeight:1.7} }, t('warning'))
      let contents
      if (page === 'information') {
        contents = card(t('information'),
          h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:'0 18px'}},
            ...fields.map(id=>id==='gender'
              ? dropdown(id,t(id),values.gender,[['',t('missing')],['male',rtl?'ذكر':'Male'],['female',rtl?'أنثى':'Female'],['unspecified',t('missing')]],v=>setField(id,v))
              : input(id,t(id),values[id],v=>setField(id,v)))))
      } else if (page === 'instructions') {
        const environmentScope = instructionScope === 'environment'
        const override = workspace.override
        const effective = environmentScope && override ? workspace.preferences : globalPreferences
        const scopeEditable = !environmentScope || (!!activeWorkspace&&override)
        const writePreferences = updater => {
          if (!environmentScope) setGlobalPreferences(updater)
          else if(override)writeWorkspace(w=>({...w,preferences:updater(w.preferences)}))
        }
        const setPreference = (key,value) => writePreferences(old=>({...old,[key]:value}))
        const localLabel = item => item[rtl?1:2]
        const activePreview = previewProfilePreferences(effective)
        contents = h(React.Fragment,null,
          card(t('scope'),
            dropdown('instructions-scope',t('scope'),instructionScope,
              [['global',t('global')],['environment',t('environment')]],setInstructionScope),
            environmentScope && activeWorkspace ? dropdown('mode',t('override'),override?'custom':'inherit',
              [['inherit',t('inherit')],['custom',t('customMode')]],v=>writeWorkspace(w=>({...w,
                override:v==='custom',preferences:neutralProfilePreferences()}))) : null,
            environmentScope ? h('p',{style:muted},override?t('overrideHint'):t('inherited')) : null),
          scopeEditable ? card(t('personality'),
            dropdown('style',t('styleTone'),effective.style,
              PROFILE_STYLES.map(item=>[item[0],localLabel(item)]),v=>setPreference('style',v)),
            h('p',{style:muted},t('preferenceHint'))) : null,
          scopeEditable ? card(t('responseLanguage'),
            dropdown('response-language',t('responseLanguage'),effective.responseLanguage,
              PROFILE_LANGUAGES.map(item=>[item[0],localLabel(item)]),v=>setPreference('responseLanguage',v)),
            h('p',{style:muted},t('languageHint'))) : null,
          scopeEditable ? card(t('characteristics'),
            ...PROFILE_TRAITS.map(item=>{
              const [key]=item
              const level=effective.traits[key]
              const levelText=t(['less','neutral','more'][level])
              const change=e=>{
                const value=Number(e.currentTarget.value)
                if([0,1,2].includes(value)) writePreferences(old=>({...old,traits:{...old.traits,[key]:value}}))
              }
              return h('div',{key,style:{marginBottom:17}},
                h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}},
                  h('label',{htmlFor:'pp-trait-'+key,style:label},localLabel(item)),
                  h('output',{'aria-live':'polite',htmlFor:'pp-trait-'+key},levelText)),
                h('input',{id:'pp-trait-'+key,type:'range',min:0,max:2,step:1,
                  value:level,'aria-valuetext':levelText,style:{width:'100%',accentColor:'auto'},
                  onInput:change,onChange:change}),
                h('div',{style:{display:'flex',justifyContent:'space-between',fontSize:11,opacity:.75}},
                  h('span',null,t('less')),h('span',null,t('neutral')),h('span',null,t('more'))))
            })) : null,
          scopeEditable ? card(t('presets'),
            h('p',{style:muted},t('presetHint')),
            ...PROFILE_PRESETS.map(item=>h('label',{key:item[0],htmlFor:'pp-preset-'+item[0],
              style:{display:'flex',alignItems:'start',gap:10,margin:'12px 0',cursor:'pointer'}},
              h('input',{id:'pp-preset-'+item[0],type:'checkbox',checked:effective.presets.includes(item[0]),
                onChange:e=>{const checked=e.target.checked;writePreferences(old=>({...old,
                  presets:checked?[...new Set([...old.presets,item[0]])]:old.presets.filter(id=>id!==item[0])}))}}),
              h('span',null,h('strong',null,localLabel(item)),
                h('span',{style:{display:'block',fontSize:12,opacity:.76}},rtl?item[3]:item[4]))))) : null,
          scopeEditable ? card(t('customInstructions'),
            h('label',{htmlFor:environmentScope?'pp-override':'pp-global',style:label},t('customInstructions')),
            h('textarea',{id:environmentScope?'pp-override':'pp-global',rows:6,maxLength:8192,style:control,
              value:effective.custom,onChange:e=>setPreference('custom',e.target.value),dir:'auto'}),
            h('button',{type:'button',style:{...btn,marginTop:12},
              onClick:()=>writePreferences(()=>neutralProfilePreferences())},t('resetPreferences'))) : null,
          card(t('effective'),h('p',{style:muted},t('previewHint')),
            h('output',{id:'pp-effective-instructions',dir:'auto',
              style:{display:'block',whiteSpace:'pre-wrap',overflowWrap:'anywhere'}},activePreview||t('noInstruction'))))
      } else if (page === 'access') {
        contents = card(t('access'),h('p',null,t('accessHint')),
          h('label',{style:{display:'flex',gap:10,alignItems:'center',marginBottom:15}},
            h('input',{id:'pp-opt-in',type:'checkbox',checked:record.allowPersonalInformation,
              onChange:e=>setRecord(old=>({...old,allowPersonalInformation:e.target.checked}))}),t('optIn')),
          h('label',{style:{display:'flex',gap:10,alignItems:'center',marginBottom:15}},
            h('input',{id:'pp-cloud',type:'checkbox',checked:record.allowCloud,
              onChange:e=>setRecord(old=>({...old,allowCloud:e.target.checked}))}),t('cloud')),
          h('h3',{style:{fontSize:15}},t('fieldPolicies')),
          ...activeWorkspace?fields.map(id=>dropdown('policy-'+id,t(id),workspace.policies[id],
            [['private',t('private')],['ask_first',t('ask')],['allow',t('allow')]],
            v=>writeWorkspace(w=>({...w,policies:{...w.policies,[id]:v}})))):[])
      } else if(page==='backup') {
        const review=()=>{
          try {
            if(!restoreText||restoreText.length>3_000_000)throw new Error('Invalid')
            const incoming=withoutAuthority(decodeProfile(JSON.parse(restoreText)))
            const candidate=backupStrategy==='merge'?mergeBackup(record,incoming):incoming
            setRestoreReview(decodeProfile(candidate));setRestoreAck(false)
          // Never clear a conflict/failed state: those require a reload before Save.
          }catch{setRestoreReview(null);setRestoreAck(false);setStatus(s=>s==='conflict'||s==='failed'?s:'invalid')}
        }
        contents=card(t('backup'),h('p',null,t('backupHint')),
          h('button',{type:'button',style:btn,onClick:()=>setBackupText(JSON.stringify(withoutAuthority(decodeProfile(record)),null,2))},t('export')),
          backupText?h('textarea',{id:'pp-export-json',readOnly:true,rows:8,style:control,value:backupText,'aria-label':t('export')}):null,
          h('textarea',{id:'pp-restore-json',rows:6,maxLength:3_000_000,style:{...control,marginTop:14},value:restoreText,'aria-label':t('import'),
            onChange:e=>{setRestoreText(e.target.value);setRestoreReview(null);setRestoreAck(false)}}),
          dropdown('backup-strategy',t('backup'),backupStrategy,[['merge',t('merge')],['replace',t('replace')]],
            v=>{setBackupStrategy(v);setRestoreReview(null);setRestoreAck(false)}),
          h('button',{type:'button',style:btn,onClick:review},t('import')),
          restoreReview?h('div',{style:{marginTop:12}},
            h('p',{role:'status'},t('restoreReady')),
            h('label',null,h('input',{id:'pp-restore-confirm',type:'checkbox',checked:restoreAck,onChange:e=>setRestoreAck(e.target.checked)}),t('confirm')),
            h('button',{id:'pp-restore-apply',type:'button',style:btn,disabled:!restoreAck,onClick:()=>{
              setRecord(restoreReview);setRestoreText('');setRestoreReview(null);setRestoreAck(false);setBackupText('')
            }},t('applyRestore'))):null)
      }else {
        contents=card(t('privacy'),h('p',null,t('warning')),h('p',null,t('accessHint')))
      }
      return h('div',{'data-personal-profile-panel':'native-settings',lang:language,
        dir:rtl?'rtl':'ltr',style:{height:'100%',overflowY:'auto',boxSizing:'border-box',
          padding:'max(var(--dsh-frame-top-clearance, 0px), 28px) clamp(18px,4vw,56px) 52px',
          color:'inherit',lineHeight:1.6}},
        h('div',{style:{maxWidth:1050,margin:'0 auto'}},
          h('header',{style:{display:'flex',flexWrap:'wrap',gap:12,
            alignItems:'center',justifyContent:'space-between'}},
            h('div',null,h('h1',{style:{margin:'0 0 4px',fontSize:'clamp(22px,3vw,32px)'}},t('title')),
              h('p',{style:{margin:'0 0 12px',opacity:.7}},t('subtitle'))),
            h('fieldset',{disabled:!editable,style:{width:145,border:0,padding:0,margin:0}},dropdown('language',t('language'),language,
              [['ar','العربية'],['en','English']],setLanguage))),
          notice,
          h('div',{style:{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center',marginBottom:12}},
            h('button',{id:'pp-save',type:'button',style:btn,disabled:!editable||!dirty||status==='conflict'||status==='failed',onClick:save},t('save')),
            h('button',{id:'pp-reload',type:'button',style:btn,disabled:busy||!canRead,onClick:requestReload},t('reload')),
            h('button',{type:'button',style:btn,disabled:!editable,onClick:()=>{setRecord({...emptyProfileRecord(),locale:language});setRestoreReview(null);setBackupText('');setRestoreText('')}},t('reset'))),
          h('p',{id:'pp-save-status',role:'status'},t(status)+(dirty?' '+t('dirty'):'')),
          confirmReload?h('div',{id:'pp-reload-prompt',role:'alert',style:{padding:'12px 15px',marginBottom:12,
            border:'1px solid rgba(208,58,52,.6)',borderRadius:10,background:'rgba(208,58,52,.08)'}},
            h('p',{style:{margin:'0 0 10px'}},t('discardWarning')),
            h('div',{style:{display:'flex',gap:10,flexWrap:'wrap'}},
              h('button',{id:'pp-reload-confirm',type:'button',style:btn,disabled:busy||!canRead,onClick:()=>{void load()}},t('discardConfirm')),
              h('button',{id:'pp-reload-cancel',type:'button',style:btn,onClick:()=>setConfirmReload(false)},t('discardCancel')))):null,
          h('fieldset',{disabled:!editable,style:{border:0,margin:0,padding:0,minWidth:0}},
            activeWorkspace?dropdown('profile',t('profile'),activeWorkspace,profiles.map(w=>[w.workspaceId,w.title||w.workspaceId]),v=>{setProfile(v);setRestoreReview(null);setRestoreAck(false)}):null,
          h('nav',{role:'tablist','aria-label':t('title'),
            style:{display:'flex',gap:6,flexWrap:'wrap',marginBottom:20}},
            ...sections.map(id=>h('button',{key:id,type:'button',role:'tab',
              id:'pp-tab-'+id,'aria-selected':page===id,
              'aria-controls':'pp-content',onClick:()=>setPage(id),
              style:{...btn,background:page===id?'rgba(128,128,128,.22)':'transparent',
                fontWeight:page===id?700:500}},t(id)))),
          h('div',{role:'tabpanel',id:'pp-content','aria-labelledby':'pp-tab-'+page},contents))))
    }

    // Contains a Personal Profile render failure inside the page. Without it the
    // Host Slot boundary retires the `main` entry and the content area is blank.
    const ProfileErrorBoundary=typeof React.Component==='function'?class extends React.Component{
      constructor(props){super(props);this.state={failed:false}}
      // No logging: profile code never writes to the console (privacy policy).
      static getDerivedStateFromError(){return {failed:true}}
      render(){
        if(!this.state.failed)return this.props.children
        return h('div',{'data-personal-profile-error':'',role:'alert',style:{padding:'max(var(--dsh-frame-top-clearance, 0px), 28px) clamp(18px,4vw,56px)',lineHeight:1.6}},
          h('h1',{style:{fontSize:22,margin:'0 0 8px'}},'Personal Profile — الملف الشخصي'),
          h('p',{dir:'rtl',lang:'ar'},'تعذر عرض صفحة الملف الشخصي. لم يتم حفظ أو تغيير أي إعداد.'),
          h('p',{lang:'en'},'Personal Profile could not be displayed. No settings were saved or changed.'),
          h('button',{type:'button',onClick:()=>this.setState({failed:false}),style:{border:'1px solid rgba(128,128,128,.35)',borderRadius:8,padding:'9px 13px',font:'inherit',background:'rgba(128,128,128,.08)',color:'inherit',cursor:'pointer'}},'Retry — إعادة المحاولة'))
      }
    }:null

    function ProfileDraft() {
      return h('section',{'data-personal-profile-draft':'',style:{borderTop:border,padding:'20px 0'}},
        h('h3',null,'Personal Profile — local settings'),
        h('p',null,'Preferred name, Nationality, Gender and optional Custom Instructions. All access is Private by default.'),
        h('p',null,'Saved in the active Harness Profile without plugin-level encryption. Open Personal Profile to edit. Agent and cloud disclosure are not implemented.'))
    }
    const PROFILE_MODULE = TYPE + '/personal-profile'
    /** The Host's own enablement of the Profile row on the subject page; false when it says Off. */
    function profileRowEnabled(subject) {
      if (subject?.kind === 'row') return subject.row?.moduleName === PROFILE_MODULE && subject.row.enabled === true
      const row = Array.isArray(subject?.pkg?.rows)
        ? subject.pkg.rows.find(item => item?.moduleName === PROFILE_MODULE) : undefined
      return row === undefined ? true : row.enabled === true
    }
    // Every Personal Profile surface lives in this child fiber, which the
    // suite starts only while the Host row is enabled and active, and disposes
    // (unregistering each Slot entry) as soon as the row is switched Off.
    // No agent capabilities; all writes go through the native settings service.
    const profilePlugin = {
      inject: ['slots','remote','remote.settings','workspaces'],
      apply(ctx) {
        // `ctx.workspaces.list` is the Host's ClientWorkspaceModel class
        // instance: its subscribe/getSnapshot read `this`. Bind them here, as
        // Environment & Context does, before handing them to useSyncExternalStore.
        const list=ctx.workspaces.list
        const workspaceSource={subscribe:listener=>list.subscribe(listener),getSnapshot:()=>list.getSnapshot()}
        const listeners=new Set()
        let generation=0
        const connectionSource={getSnapshot:()=>generation,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn)}}
        ctx.on('connection/reset',()=>{generation++;for(const fn of [...listeners])fn()})
        const settings=ctx.remote.settings
        function ProfileSlot(props) {
          const page=h(PersonalProfilePage,{settings,workspaceSource,connectionSource,useRemoteAccess:props?.useRemoteAccess})
          return ProfileErrorBoundary?h(ProfileErrorBoundary,null,page):page
        }
        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main', key: PROFILE_PANEL_ID,
        }, ProfileSlot))
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist', id: PROFILE_PANEL_ID, order: 40,
          label: () => 'Personal Profile',
        }, ProfilePanelIcon))
        ctx.slots.inject('plugins.detail.section', () => ctx.slots.register({
          name: 'plugins.detail.section', id: 'abinadwan-profile-draft', order: 40,
        }, ({ subject }) => ((subject?.kind === 'bundle' && subject.pkg?.name === TYPE) ||
          (subject?.kind === 'row' && subject.row?.moduleName === PROFILE_MODULE)) && profileRowEnabled(subject)
          ? h(ProfileDraft) : null))
      },
    }
    return {
      // `remote.pluginManager` is its own Cordis service (one per Remote
      // namespace). It must be injected here: Cordis 4 throws "cannot get
      // property without inject" when an un-injected namespace is read.
      inject: ['slots', 'remote', 'remote.pluginManager', 'remoteAccess'],
      apply(ctx) {
        const pluginManager = ctx.remote.pluginManager
        // The suite browser lifetime owns the opt-in-free read-only version
        // check. A timer cannot install, enable or modify any plugin.
        ctx.effect(() => {
          versionDisposed = false
          versionGeneration++
          nextAllowedCheck = 0
          inflightCheck = null
          void checkRelease()
          const timer = setInterval(() => { void checkRelease() }, CHECK_INTERVAL)
          return () => {
            clearInterval(timer)
            versionGeneration++
            versionDisposed = true
            inflightCheck = null
            versionListeners.clear()
          }
        }, 'suite: automatic stable-release check')
        // The official Plugins detail page owns update controls; never render them inside a Session tab.
        // `useRemoteAccess` is the root-scope standard hook every Slot entry receives.
        function VersionSlot({ subject, useRemoteAccess }) {
          if (subject?.kind !== 'bundle' || subject.pkg?.name !== TYPE) return null
          return h(VersionUpdates, { installedVersion: subject.pkg.version, pluginManager, useRemoteAccess })
        }
        ctx.slots.inject('plugins.detail.section', () => ctx.slots.register({
          name: 'plugins.detail.section',
          id: 'environment-sidebar-versions',
          order: 50,
        }, VersionSlot))

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
              rows = remoteValue(await pluginManager.listPlugins(), 'Plugin inventory')
              if (!Array.isArray(rows)) throw new Error('Invalid plugin inventory')
            } catch (error) {
              rows = []
              if (!stopped && request === generation) {
                console.warn('[abinadwan-suite] Component inventory unavailable. UI paused until the next inventory refresh.',
                  String(error?.message || error))
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
