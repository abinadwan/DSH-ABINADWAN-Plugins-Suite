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
    const INSTALLED_VERSION = '0.6.2'
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
      'The suite stores no personal data, so uninstalling removes no profile information. If the pinned install fails, reinstall from the same spec or from the original source.',
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

    // Safe browser-only preview. Never imports Host storage or registers agent capabilities.
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
    // Original, neutral-by-default UI preference choices, not system instructions.
    // The preview composes only user-controlled style settings; it never sends them.
    const PERSONALITY_STYLES = [
      ['default','الافتراضي','Default',''],
      ['professional','احترافي','Professional','Use precise, professional wording and a polished structure.'],
      ['friendly','ودود','Friendly','Be approachable and conversational while remaining accurate.'],
      ['candid','صريح ومباشر','Candid','Be direct, constructive and candid without unnecessary praise.'],
      ['creative','إبداعي','Creative','Offer imaginative, relevant ideas without inventing facts.'],
      ['efficient','مختصر وعملي','Efficient','Prioritize the answer and practical next steps; avoid filler.'],
      ['critical','ناقد وتحليلي','Critical','Examine assumptions and tradeoffs without reflexively disagreeing.'],
      ['technical','تقني ومتخصص','Technical','Use precise technical terminology and explain important implementation details.'],
    ]
    const RESPONSE_LANGUAGES = [
      ['auto','تلقائي — حسب لغة المستخدم','Automatic — match the user',''],
      ['ar','العربية','العربية — Arabic','Arabic'],
      ['en','English','English','English'],
      ['zh','中文 — الصينية','中文 — Chinese','Chinese'],
      ['es','Español — الإسبانية','Español — Spanish','Spanish'],
      ['fr','Français — الفرنسية','Français — French','French'],
      ['de','Deutsch — الألمانية','Deutsch — German','German'],
      ['ja','日本語 — اليابانية','日本語 — Japanese','Japanese'],
    ]
    const PERSONALITY_TRAITS = [
      ['warmth','الودّ','Warmth','Use a restrained, courteous tone.','Use a warmer, approachable tone.'],
      ['enthusiasm','الحماس','Enthusiasm','Use calm, measured language.','Show more enthusiasm when appropriate.'],
      ['structure','العناوين والقوائم','Headers and lists','Prefer continuous prose unless structure is necessary.','Use headings and lists when they improve readability.'],
      ['emoji','الرموز التعبيرية','Emoji','Avoid emojis unless requested or genuinely useful.','Use appropriate emojis sparingly to support the tone.'],
      ['detail','مستوى التفصيل','Detail','Prefer brief answers while retaining essential information.','Provide additional explanation and useful detail.'],
      ['critique','التفكير النقدي','Critical thinking','Keep routine answers straightforward without unnecessary critique.','Test assumptions, identify uncertainties and explain tradeoffs.'],
    ]
    const BEHAVIOR_PRESETS = [
      ['critical-thinking','التفكير النقدي','Critical Thinking','Challenge weak assumptions and consider alternatives; do not agree merely to please.'],
      ['no-fluff','تجنب الحشو','No Fluff','Avoid filler, repetition and unnecessary compliments.'],
      ['grill-me','نقاش المتطلبات','Grill-Me Mode','For complex decisions, examine requirements, risks and missing facts; ask only material questions.'],
      ['evidence-first','الأدلة أولًا','Evidence First','Distinguish evidence from inference; cite available sources and disclose uncertainty.'],
      ['step-by-step','خطوة بخطوة','Step-by-Step','Break complex tasks into clear, actionable steps.'],
      ['action-oriented','التركيز على التنفيذ','Action Oriented','Focus on practical recommendations and next actions.'],
      ['code-review','مراجعة الكود','Code Reviewer','When reviewing code, check correctness, security, maintainability and performance.'],
      ['natural-writing','الكتابة الطبيعية','Natural Writing','When editing, improve clarity and natural phrasing while preserving facts, citations and meaning.'],
    ]
    const defaultPersonality = () => ({style:'default', language:'auto', traits:{}, presets:[]})
    function preferencePreview(settings, customText) {
      const lines = []
      const style = PERSONALITY_STYLES.find(item=>item[0]===settings.style)
      const language = RESPONSE_LANGUAGES.find(item=>item[0]===settings.language)
      if (style?.[3]) lines.push(style[3])
      if (language?.[3]) lines.push('Prefer '+language[3]+' for responses unless the task requests another language.')
      for (const [key,,,less,more] of PERSONALITY_TRAITS) {
        if (settings.traits[key]===0) lines.push(less)
        if (settings.traits[key]===2) lines.push(more)
      }
      for (const [key,,,instruction] of BEHAVIOR_PRESETS) {
        if (settings.presets.includes(key)) lines.push(instruction)
      }
      if (customText) lines.push(customText)
      return lines.join('\n\n')
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
      const [instructionScope, setInstructionScope] = React.useState('global')
      const [globalPreferences, setGlobalPreferences] = React.useState(defaultPersonality)
      const [environmentPreferences, setEnvironmentPreferences] = React.useState({})
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
        scope:'نطاق التعليمات', scopeGlobal:'عام — جميع البيئات', scopeEnvironment:'خاص بالبيئة المحددة',
        personality:'الشخصية', styleTone:'الأسلوب والنبرة', responseLanguage:'لغة الردود',
        characteristics:'خصائص الرد', behaviorPresets:'خيارات سلوكية جاهزة', customInstructions:'تعليمات مخصصة',
        less:'أقل', balanced:'متوازن', more:'أكثر', usingGlobal:'تستخدم البيئة التعليمات العامة.',
        usingOverride:'تستخدم البيئة إعداداتها المخصصة بدل العامة.',
        previewHint:'معاينة نص التعليمات فقط. لا تُحفظ ولا تصل إلى الوكيل. اللغة هنا للردود المفضلة، لا للواجهة.',
        customHint:'اختياري. اكتب تفضيلات إضافية، مثل لهجة أو أسلوب خاص، دون معلومات شخصية.',
        presetHint:'اختر ما يناسبك؛ لا يُفعّل أي خيار افتراضيًا. الكتابة الطبيعية لا تستدعي مهارة Humanizer.',
        scopeHint:'خصص إعدادات عامة، أو استبدلها بالكامل للبيئة الحالية. تغيير العامة لا يعدّل البيئات ذات التخصيص.',
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
        scope:'Instructions scope', scopeGlobal:'Global — all environments', scopeEnvironment:'Selected environment',
        personality:'Personality', styleTone:'Style and tone', responseLanguage:'Response language',
        characteristics:'Response characteristics', behaviorPresets:'Behavior presets', customInstructions:'Custom instructions',
        less:'Less', balanced:'Default', more:'More', usingGlobal:'This environment inherits global instructions.',
        usingOverride:'This environment replaces global instructions with its own settings.',
        previewHint:'Instruction text preview only. It is not saved or sent to the agent. Response language is independent of interface language.',
        customHint:'Optional. Add preferences, such as a dialect or individual style, without personal information.',
        presetHint:'Choose any relevant options; none are enabled by default. Natural Writing does not invoke the Humanizer skill.',
        scopeHint:'Edit global settings, or replace them entirely for the selected environment. Global changes never modify an explicit override.',
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
          // Harness sets root color-scheme for native chrome; pair system colors
          // on both the closed field and menu options so Windows never mixes
          // inherited light text with an unrelated white native menu.
          h('select', { id:'pp-'+key, style:{...control,background:'Canvas',color:'CanvasText',colorScheme:'inherit'},
            value, onChange:e=>onChange(e.target.value) },
            options.map(([v,txt])=>h('option',{key:v,value:v,
              style:{backgroundColor:'Canvas',color:'CanvasText'}},txt))))
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
        const settings = instructionScope==='global'
          ? globalPreferences : (environmentPreferences[profile] || defaultPersonality())
        const updateSettings = change => {
          if(instructionScope==='global') setGlobalPreferences(change)
          else setEnvironmentPreferences(old=>({...old,[profile]:change(old[profile]||defaultPersonality())}))
        }
        const effectiveSettings = override ? (environmentPreferences[profile] || defaultPersonality()) : globalPreferences
        const effective = preferencePreview(effectiveSettings,override?overrides[profile]:globalInstruction)
        const editingGlobal = instructionScope==='global'
        const canEdit = editingGlobal || override
        const activeText = editingGlobal ? globalInstruction : (overrides[profile]||'')
        const updateText = editingGlobal ? setGlobalInstruction : text=>setOverrides(old=>({...old,[profile]:text}))
        const localizedOptions = entries=>entries.map(entry=>[entry[0],entry[rtl?1:2]])
        const traitText = n=>t(n===0?'less':n===2?'more':'balanced')
        const hint = text=>h('p',{style:{fontSize:12,opacity:.75,margin:'0 0 14px'}},text)
        contents = h(React.Fragment,null,
          card(t('scope'),
            dropdown('instruction-scope',t('scope'),instructionScope,
              [['global',t('scopeGlobal')],['environment',t('scopeEnvironment')]],setInstructionScope),
            hint(t('scopeHint')),
            !editingGlobal?dropdown('mode',t('override'),override?'custom':'inherit',
              [['inherit',t('inherit')],['custom',t('customMode')]],v=>{
                if(v==='inherit') {
                  setOverrides(old=>{const copy={...old};delete copy[profile];return copy})
                  setEnvironmentPreferences(old=>{const copy={...old};delete copy[profile];return copy})
                } else if(!override) {
                  setOverrides(old=>({...old,[profile]:''}))
                  setEnvironmentPreferences(old=>({...old,[profile]:defaultPersonality()}))
                }
              }):null),
          canEdit?h(React.Fragment,null,
            card(t('personality'),
              dropdown('style-tone',t('styleTone'),settings.style,localizedOptions(PERSONALITY_STYLES),
                value=>updateSettings(old=>({...old,style:value}))),
              dropdown('response-language',t('responseLanguage'),settings.language,localizedOptions(RESPONSE_LANGUAGES),
                value=>updateSettings(old=>({...old,language:value})))),
            card(t('characteristics'),
              ...PERSONALITY_TRAITS.map(([key,arLabel,enLabel])=>{
                const value=settings.traits[key]??1
                return h('div',{key,style:{marginBottom:14}},
                  h('label',{htmlFor:'pp-trait-'+key,style:{...label,display:'flex',justifyContent:'space-between',gap:12}},
                    rtl?arLabel:enLabel,h('span',{style:{opacity:.75,fontWeight:400}},traitText(value))),
                  h('input',{id:'pp-trait-'+key,type:'range',min:0,max:2,step:1,value,
                    'aria-valuetext':traitText(value),style:{width:'100%',margin:0},
                    onChange:e=>updateSettings(old=>({...old,traits:{...old.traits,[key]:Number(e.target.value)}}))}),
                  h('div',{style:{display:'flex',justifyContent:'space-between',fontSize:11,opacity:.7}},
                    t('less'),t('balanced'),t('more')))
              })),
            card(t('behaviorPresets'),hint(t('presetHint')),
              ...BEHAVIOR_PRESETS.map(([key,arLabel,enLabel,prompt])=>h('label',
                {key,htmlFor:'pp-preset-'+key,style:{display:'flex',gap:10,alignItems:'start',marginBottom:12}},
                h('input',{id:'pp-preset-'+key,type:'checkbox',checked:settings.presets.includes(key),
                  onChange:e=>{const checked=e.target.checked;updateSettings(old=>({...old,
                    presets:checked?[...new Set([...old.presets,key])]:old.presets.filter(id=>id!==key)}))}}),
                h('span',null,h('span',{style:{display:'block',fontWeight:600}},rtl?arLabel:enLabel),
                  !rtl?h('span',{style:{fontSize:12,opacity:.75}},prompt):null)))),
            card(t('customInstructions'),hint(t('customHint')),
              h('label',{htmlFor:editingGlobal?'pp-global':'pp-override',style:label},t('customInstructions')),
              h('textarea',{id:editingGlobal?'pp-global':'pp-override',rows:5,maxLength:8192,style:control,
                value:activeText,onChange:e=>updateText(e.target.value),dir:'auto'}))
          ):null,
          card(t('effective'),hint(override?t('usingOverride'):t('usingGlobal')),
            h('output',{'data-profile-effective-preview':'',dir:'auto',style:{display:'block',whiteSpace:'pre-wrap',overflowWrap:'anywhere'}},
              effective || t('noInstruction')),
            h('p',{role:'note',style:{...muted,marginTop:12}},t('previewHint'))))
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
              setOverrides({});setGlobalPreferences(defaultPersonality());
              setEnvironmentPreferences({});setInstructionScope('global');
              setPolicies({});setOptIn(false);setApproval('');
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
        ['Agent preferences and custom instructions', 'Neutral by default. Personality, response language, characteristics and behavior presets are available in the browser-only preview.'],
        ['Allow the agent to use approved profile information', 'Off by default. Requires explicit opt-in after design approval.'],
      ]
      return h('section', { 'data-personal-profile-draft': '',
        style: { borderTop: border, padding: '20px 0', lineHeight: 1.65 } },
        h('h3', null, 'Personal Profile — design draft'),
        h('p', null, 'Read-only preliminary fields. Privacy, storage, access, export and deletion design awaits approval.'),
        h('dl', null, fields.map(([label, description]) => h('div', { key: label, style: { marginBottom: 12 } },
          h('dt', { style: { fontWeight: 650 } }, label),
          h('dd', { style: { margin: '4px 0 0', opacity: .8 } }, description)))),
        h('h4', null, 'Optional instruction preferences'),
        h('ul', null,
          h('li', null, 'Choose an optional personality and response language independently of the interface language.'),
          h('li', null, 'Adjust response characteristics and select optional behavior presets.'),
          h('li', null, 'Review the effective global or per-environment replacement instructions before future activation.')),
        h('p', null, 'Proposed behavior after approval: apply approved style instructions automatically. Access personal or sensitive information only when relevant and explicitly allowed.'),
        h('p', { role: 'note' }, 'This scaffold collects, saves and transmits zero profile information. Enabling it only shows this draft.'))
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
    // It never imports Host storage or registers agent capabilities.
    const profilePlugin = {
      inject: ['slots'],
      apply(ctx) {
        // Global left navigation and full-page synthetic preview are browser-only.
        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main', key: PROFILE_PANEL_ID,
        }, PersonalProfilePage))
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
