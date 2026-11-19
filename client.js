/**
 * Browser half of @abinadwan/dsh-plugins-suite.
 * Uses DSH's documented lazy-CJS module registration and Slot API.
 * Native slots, scoped Cordis lifetimes, and an anonymous read-only stable-release check.
 */
window.__ModuleLoader__.load({
  id: '@abinadwan/dsh-plugins-suite',
  factory(require) {
    const React = require('react')
    const { Button, Checkbox, Menu } = require('@deepseek-ai/dsh-client-ui-primitives')
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
    const INSTALLED_VERSION = '0.8.0-rc.1'
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
      'Personal Profile settings are stored in this Harness Profile\'s configuration and uninstalling may remove them. If you use Personal Profile, first export a JSON backup from Personal Profile → Backup & Restore (it includes your saved access permissions and is not encrypted). If the pinned install fails, reinstall from the same spec or from the original source.',
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
    // Preference catalog and renderer mirrored in preferences.js; parity is tested.
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
      if(pref.sendCustom===true && pref.custom.trim()) lines.push(pref.custom)
      return lines.length ? ['Response preferences (follow the current request and higher-priority host/safety/tool requirements; custom guidance takes precedence over other style preferences where compatible).',...new Set(lines)].join('\n') : ''
    }
    const PROFILE_NS = 'abinadwan-personal-profile'
    const PERSONAL_FIELDS = ['preferredName','nationality','gender']
    const POLICY_VALUES = ['private','ask_first','allow']
    const GENDER_VALUES = ['','male','female','unspecified']
    // Record v2 (0.7.2): one unified profile in the active Harness Profile.
    // No Workspace dependency: the same information, preferences and policies
    // apply to eligible native agent steps. Structured personal fields remain local.
    const PROFILE_VERSION = 2
    const PROFILE_CUSTOM_MAX = 8192
    const privatePolicies = () => Object.fromEntries(PERSONAL_FIELDS.map(key=>[key,'private']))
    const emptyInformation = () => ({preferredName:'',nationality:'',gender:''})
    const emptyProfileRecord = () => ({version:PROFILE_VERSION,locale:'ar',information:emptyInformation(),
      preferences:neutralProfilePreferences(),policies:privatePolicies(),allowPersonalInformation:false,allowCloud:false})
    // Payload guard for the serialized record (UTF-16 units) and for restore
    // text/files. Large enough for any v1 record with many Workspace rows.
    const PROFILE_MAX_CHARS = 3_000_000
    const profileTooLarge = value => JSON.stringify(value).length > PROFILE_MAX_CHARS
    const sameJson = (a,b) => JSON.stringify(a)===JSON.stringify(b)
    const profileKeys = (value,keys) => value && typeof value==='object' && !Array.isArray(value) &&
      Object.keys(value).length===keys.length && keys.every(key=>Object.hasOwn(value,key))
    // Errors carry a reason code only; never user-supplied content.
    const profileError = code => Object.assign(new Error('Invalid Personal Profile settings'),{code})
    const profileCheck = (condition,code='invalidContent') => { if(!condition) throw profileError(code) }
    const validText = (v,n) => typeof v==='string' && v.length<=n
    // Decoders rebuild every object in canonical key order, so comparisons of
    // what was sent and what the Host committed never depend on key order.
    function decodePreferences(p) {
      const keys=['style','responseLanguage','traits','presets','custom']
      if(p&&Object.hasOwn(p,'sendCustom'))keys.push('sendCustom')
      profileCheck(profileKeys(p,keys)&&(!Object.hasOwn(p,'sendCustom')||typeof p.sendCustom==='boolean'))
      profileCheck(PROFILE_STYLES.some(i=>i[0]===p.style)&&PROFILE_LANGUAGES.some(i=>i[0]===p.responseLanguage))
      profileCheck(profileKeys(p.traits,PROFILE_TRAITS.map(i=>i[0])) &&
        Object.values(p.traits).every(n=>[0,1,2].includes(n)))
      profileCheck(Array.isArray(p.presets)&&p.presets.length<=8&&new Set(p.presets).size===p.presets.length&&
        p.presets.every(id=>PROFILE_PRESETS.some(i=>i[0]===id)))
      profileCheck(validText(p.custom,PROFILE_CUSTOM_MAX),typeof p.custom==='string'?'instructionsTooLong':'invalidContent')
      return {style:p.style,responseLanguage:p.responseLanguage,
        traits:Object.fromEntries(PROFILE_TRAITS.map(([key])=>[key,p.traits[key]])),presets:[...p.presets],custom:p.custom,...(p.sendCustom===true?{sendCustom:true}:{})}
    }
    function withoutCustomConsent(p) { const {sendCustom,...rest}=p; return rest }
    function decodeInformation(i) {
      profileCheck(profileKeys(i,PERSONAL_FIELDS)&&validText(i.preferredName,128)&&validText(i.nationality,128)&&GENDER_VALUES.includes(i.gender))
      return {preferredName:i.preferredName,nationality:i.nationality,gender:i.gender}
    }
    function decodePolicies(p) {
      profileCheck(profileKeys(p,PERSONAL_FIELDS),'invalidPolicy')
      profileCheck(PERSONAL_FIELDS.every(key=>POLICY_VALUES.includes(p[key])),'invalidPolicy')
      return Object.fromEntries(PERSONAL_FIELDS.map(key=>[key,p[key]]))
    }
    function profileRoot(value) {
      profileCheck(value!==null&&typeof value==='object'&&!Array.isArray(value))
      profileCheck(!profileTooLarge(value),'tooLarge')
    }
    /** Strict v2 decoder (wire and backup). Unknown fields are rejected. */
    function decodeProfile(value) {
      profileRoot(value)
      profileCheck(value.version===PROFILE_VERSION,'unsupportedVersion')
      profileCheck(profileKeys(value,['version','locale','information','preferences','policies','allowPersonalInformation','allowCloud']))
      profileCheck(['ar','en'].includes(value.locale)&&typeof value.allowPersonalInformation==='boolean'&&typeof value.allowCloud==='boolean')
      return {version:PROFILE_VERSION,locale:value.locale,information:decodeInformation(value.information),
        preferences:decodePreferences(value.preferences),policies:decodePolicies(value.policies),
        allowPersonalInformation:value.allowPersonalInformation,allowCloud:value.allowCloud}
    }
    /** Strict decoder of the 0.7.0/0.7.1 record (v1). Used to migrate, never to save. */
    function decodeLegacyProfile(value) {
      profileRoot(value)
      profileCheck(value.version===1,'unsupportedVersion')
      profileCheck(profileKeys(value,['version','locale','information','global','workspaces','allowPersonalInformation','allowCloud']))
      profileCheck(['ar','en'].includes(value.locale)&&typeof value.allowPersonalInformation==='boolean'&&typeof value.allowCloud==='boolean')
      profileCheck(Array.isArray(value.workspaces))
      const seen=new Set()
      const workspaces=value.workspaces.map(w=>{
        profileCheck(profileKeys(w,['id','override','preferences','policies'])&&validText(w.id,256)&&w.id.length>0&&
          !seen.has(w.id)&&typeof w.override==='boolean')
        seen.add(w.id)
        return {id:w.id,override:w.override,preferences:decodePreferences(w.preferences),policies:decodePolicies(w.policies)}
      })
      return {version:1,locale:value.locale,information:decodeInformation(value.information),global:decodePreferences(value.global),
        workspaces,allowPersonalInformation:value.allowPersonalInformation,allowCloud:value.allowCloud}
    }
    function decodeAnyProfile(value) {
      profileRoot(value)
      return value.version===1 ? {legacy:decodeLegacyProfile(value)} : {record:decodeProfile(value)}
    }
    // v1 -> v2. Keeps information, locale and global preferences (including
    // custom instructions). Workspace rows are never merged or promoted:
    // unified policies start Private and both switches Off, because consent
    // given under the per-Workspace model does not carry over.
    function migrateLegacyProfile(legacy) {
      return {version:PROFILE_VERSION,locale:legacy.locale,information:{...legacy.information},
        preferences:withoutCustomConsent(decodePreferences(legacy.global)),policies:privatePolicies(),allowPersonalInformation:false,allowCloud:false}
    }
    /** Workspace-specific data or permissions that a migration would discard. */
    const legacyDiscards = legacy => legacy.workspaces.length>0||legacy.allowPersonalInformation||legacy.allowCloud
    function profileView(view) {
      if(view?.ns!==PROFILE_NS || !Number.isSafeInteger(view.revision)||view.revision<0||!profileKeys(view.value,['record'])) throw new Error('Settings unavailable')
      const decoded=decodeAnyProfile(view.value.record)
      return {revision:view.revision,record:decoded.record||null,legacy:decoded.legacy||null}
    }
    // Appends imported custom instructions to the existing text. Paragraphs
    // (blocks separated by a blank line) whose trimmed text already exists are
    // skipped; line breaks and indentation inside blocks are kept. Never truncates.
    function mergeInstructions(existing,imported) {
      const a=String(existing).replace(/\r\n?/g,'\n'), b=String(imported).replace(/\r\n?/g,'\n')
      if(!b.trim()) return a
      if(!a.trim()) return b
      const split = text => text.split(/\n[ \t]*\n/)
      const known=new Set(split(a).map(x=>x.trim()).filter(Boolean))
      const added=[]
      for(const block of split(b)){
        const key=block.trim()
        if(!key||known.has(key))continue
        known.add(key);added.push(block.replace(/^\n+/,'').replace(/\s+$/,''))
      }
      return added.length ? a.replace(/\s+$/,'')+'\n\n'+added.join('\n\n') : a
    }
    const JSON_STYLE = {direction:'ltr',textAlign:'left',unicodeBidi:'isolate',whiteSpace:'pre',overflowWrap:'normal',
      fontFamily:'ui-monospace,"Cascadia Mono","Cascadia Code",Consolas,"Courier New",monospace',fontSize:12.5,lineHeight:1.5,tabSize:2}
    const backupFileName = legacy => legacy ? 'personal-profile-v0.7.1-settings.json' : 'personal-profile-backup.json'
    /** Browser-native download (Blob + object URL + <a download>). No filesystem service. */
    function downloadJson(event,text,fileName) {
      const doc=event?.currentTarget?.ownerDocument, win=doc?.defaultView
      if(!doc?.body||typeof win?.Blob!=='function'||typeof win.URL?.createObjectURL!=='function')return false
      const url=win.URL.createObjectURL(new win.Blob([text],{type:'application/json'}))
      const anchor=doc.createElement('a')
      anchor.href=url;anchor.download=fileName;anchor.rel='noopener';anchor.style.display='none'
      doc.body.appendChild(anchor);anchor.click();anchor.remove()
      win.setTimeout(()=>win.URL.revokeObjectURL?.(url),1000)
      return true
    }
    async function copyJson(event,text) {
      const clipboard=event?.currentTarget?.ownerDocument?.defaultView?.navigator?.clipboard
      if(typeof clipboard?.writeText!=='function')return false
      await clipboard.writeText(text)
      return true
    }
    function readFileText(file,win) {
      if(typeof file.text==='function')return file.text()
      if(typeof win?.FileReader!=='function')return Promise.reject(new Error('No reader'))
      return new Promise((resolve,reject)=>{
        const reader=new win.FileReader()
        reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Read failed'))
        reader.readAsText(file)
      })
    }
    function PersonalProfilePage({settings,connectionSource,useRemoteAccess}) {
      const canRead=typeof useRemoteAccess==='function' ? useRemoteAccess('settings/describe') : false
      const canWrite=typeof useRemoteAccess==='function' ? useRemoteAccess('settings/replace') : false
      const generation=React.useSyncExternalStore(connectionSource.subscribe,connectionSource.getSnapshot,connectionSource.getSnapshot)
      const [record,setRecord]=React.useState(emptyProfileRecord)
      const [saved,setSaved]=React.useState(null)
      const [legacy,setLegacy]=React.useState(null)
      const [migrationAck,setMigrationAck]=React.useState(false)
      const [legacyView,setLegacyView]=React.useState(false)
      const [revision,setRevision]=React.useState(null)
      const [status,setStatus]=React.useState('loading')
      const [page,setPage]=React.useState('information')
      const [exportView,setExportView]=React.useState(false)
      const [backupMessage,setBackupMessage]=React.useState('')
      const [restoreText,setRestoreText]=React.useState('')
      const [restoreStrategy,setRestoreStrategy]=React.useState('replace')
      const [restoreReview,setRestoreReview]=React.useState(null)
      const [restoreAck,setRestoreAck]=React.useState(false)
      const [restorePermissions,setRestorePermissions]=React.useState(false)
      const [permissionsAck,setPermissionsAck]=React.useState(false)
      const [mergedText,setMergedText]=React.useState('')
      const request=React.useRef(0)
      const inFlight=React.useRef(false)
      const access=React.useRef({canRead,canWrite,generation})
      access.current={canRead,canWrite,generation}
      const lifetimeValid = g=>connectionSource.getSnapshot()===g&&access.current.canRead
      const clearRestore=()=>{setRestoreReview(null);setRestoreAck(false);setRestorePermissions(false);setPermissionsAck(false);setMergedText('')}
      const load = async () => {
        const id=++request.current,g=connectionSource.getSnapshot()
        inFlight.current=true;setConfirmReload(false);setStatus('loading');setRevision(null);setSaved(null)
        setRecord(emptyProfileRecord());setLegacy(null);setMigrationAck(false);setLegacyView(false)
        setExportView(false);setBackupMessage('');setRestoreText('');clearRestore()
        if(!access.current.canRead){inFlight.current=false;setStatus('unavailable');return}
        try {
          const response=await settings.describe()
          if(id!==request.current||!lifetimeValid(g))return
          if(response?.ok!==true||!Array.isArray(response.value?.namespaces))throw new Error('Unavailable')
          const snapshot=profileView(response.value.namespaces.find(x=>x.ns===PROFILE_NS))
          if(response.value.writable!==true)throw new Error('Read only')
          if(snapshot.legacy){
            // Stored v1 stays untouched until the user reviews and Saves.
            setRecord(migrateLegacyProfile(snapshot.legacy));setSaved(snapshot.legacy);setLegacy(snapshot.legacy)
            setRevision(snapshot.revision);setStatus('migration')
          }else{setRecord(snapshot.record);setSaved(snapshot.record);setRevision(snapshot.revision);setStatus('ready')}
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
      const migrationBlocked=legacy!==null&&legacyDiscards(legacy)&&!migrationAck
      const save = async () => {
        if(inFlight.current||revision===null||!canRead||!canWrite||generation!==connectionSource.getSnapshot()||migrationBlocked)return
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
          if(!snapshot.record||!sameJson(snapshot.record,next))throw new Error('Unconfirmed write')
          setRecord(snapshot.record);setSaved(snapshot.record);setRevision(snapshot.revision)
          setLegacy(null);setMigrationAck(false);setLegacyView(false);setStatus('saved')
        }catch{if(id===request.current&&lifetimeValid(g))setStatus('failed')}
        finally{if(id===request.current)inFlight.current=false}
      }
      const language=record.locale,values=record.information,preferences=record.preferences
      const busy=status==='loading'||status==='saving'
      const editable=canRead&&canWrite&&revision!==null&&!busy&&generation===connectionSource.getSnapshot()
      const dirty=saved!==null&&!sameJson(record,saved)
      dirtyRef.current=dirty
      const unsavedWork=dirty||status==='failed'||status==='conflict'||status==='reconnected'
      const requestReload=()=>{if(unsavedWork)setConfirmReload(true);else void load()}
      const setLanguage=v=>setRecord(old=>({...old,locale:v}))
      const setPreferences=updater=>setRecord(old=>({...old,preferences:updater(old.preferences)}))
      const setField=(id,value)=>setRecord(old=>({...old,information:{...old.information,[id]:value}}))
      const ar = {
        information:'معلوماتي', instructions:'تعليمات الوكيل', access:'التحكم في الوصول', backup:'النسخ والاستعادة', privacy:'الخصوصية والأمان',title:'الملف الشخصي',
        subtitle:'ملف شخصي موحّد ضمن ملف Harness الحالي',warning:'يُحفظ هذا المحتوى محليًا دون تشفير خاص بالإضافة. لا تكتب كلمات مرور أو مفاتيح أو معلومات حساسة. تُرسل تفضيلات الرد المحفوظة إلى النموذج المختار وقد تبقى في سجل المحادثة. حقول المعلومات الشخصية لا تُرسل.',
        language:'لغة الواجهة',preferredName:'الاسم المفضل',nationality:'الجنسية',gender:'الجنس',male:'ذكر',female:'أنثى',unspecified:'أفضّل عدم الذكر',
        unified:'إعدادات موحّدة',unifiedHint:'تُطبّق التفضيلات المحفوظة عند تجهيز الخطوة التالية في المحادثات الأصلية المدعومة، دون اختيار مساحة عمل. قد تتجاوزها بعض إعدادات الوكيل الخاصة.',
        personality:'الشخصية',styleTone:'الأسلوب والنبرة',responseLanguage:'لغة الردود',characteristics:'خصائص الردود',presets:'خيارات سلوكية جاهزة',customInstructions:'تعليمات مخصصة',
        sendCustom:'أوافق على إرسال النص المخصص للنموذج المختار (بما فيه السحابي)',customConsentHint:'النص قد يبقى في سجل المحادثة ويعاد إرساله لاحقًا. لا تضع بيانات حساسة. تعديل النص أو استعادته يلغي الإذن؛ احفظ بعد المراجعة.',
        less:'أقل',neutral:'متوازن',more:'أكثر',characters:'حرف',
        preferenceHint:'كل الاختيارات اختيارية وتُطبّق بعد الحفظ.',languageHint:'لغة الردود مستقلة عن لغة الواجهة. اللهجة تُكتب ضمن التعليمات.',
        previewHint:'معاينة المسودة التي ستُرسل بعد الحفظ في المحادثات المدعومة؛ لا تُحذف التعليمات السابقة من السجل.',presetHint:'لا اختيار افتراضيًا.',resetPreferences:'إعادة ضبط التفضيلات',
        effective:'المعاينة النهائية',optIn:'السماح باستخدام المعلومات الشخصية (إعداد محفوظ، غير مفعّل في الوكيل)',
        fieldPolicies:'صلاحيات الحقول',policiesHint:'صلاحية واحدة لكل حقل تنطبق على الملف كله، لا على مساحة عمل بعينها.',private:'خاص',ask:'اسأل أولًا',allow:'سماح',on:'مفعّل',off:'متوقف',
        cloud:'السماح بإرسال المعلومات الشخصية إلى مزود سحابي (إعداد محفوظ، غير مفعّل)',accessHint:'لا يتم الوصول للمعلومات أو إرسالها حاليًا. صلاحيات المرحلة السابعة محفوظة فقط: الإفصاح محظور لأن Harness لا يضمن عزل السجل عند تغيير الصلاحية أو المزود. حتى «سماح» لا يرسل الحقول.',
        exportTitle:'تصدير نسخة احتياطية',exportHint:'ملف JSON غير مشفّر. يحتوي معلوماتك الشخصية وتعليماتك وصلاحيات الوصول المحفوظة كما هي. احفظه في مكان آمن ولا تشاركه.',
        download:'تنزيل ملف JSON',copy:'نسخ JSON',view:'عرض JSON',hideView:'إخفاء JSON',exportJson:'نسخة JSON',
        importTitle:'استيراد واستعادة',importHint:'اختر ملف JSON أو الصقه، ثم راجعه. لا يُحفظ شيء قبل الضغط على «حفظ التغييرات».',
        importFile:'استيراد ملف JSON',pasteJson:'لصق JSON يدويًا',import:'مراجعة النسخة',cancelRestore:'إلغاء الاستعادة',
        strategy:'طريقة الاستعادة',replaceAll:'استبدال الكل',replaceAllHint:'تحل الإعدادات المستوردة محل الحالية، ويُلغى إذن إرسال النص المخصص.',
        replaceMerge:'استبدال الكل مع دمج التعليمات المخصصة',replaceMergeHint:'يُلغى إذن إرسال النص المخصص عند الاستعادة. تُستبدل كل الإعدادات عدا التعليمات المخصصة: يبقى نصك الحالي وتُضاف إليه الفقرات المستوردة غير المكررة.',
        previewTitle:'معاينة الاستعادة',setting:'الإعداد',current:'المسودة الحالية',proposed:'بعد الاستعادة',interfaceLanguage:'لغة الواجهة',
        mergedLabel:'التعليمات بعد الدمج (قابلة للتعديل)',importedInstructions:'التعليمات المستوردة',none:'لا شيء',empty:'—',
        permissionsTitle:'الصلاحيات المحفوظة في النسخة',restorePermissions:'استعادة الصلاحيات المحفوظة في هذه النسخة',
        permissionsDefault:'افتراضيًا تُعاد كل الصلاحيات إلى «خاص» ويبقى المفتاحان متوقفين.',permissionsAck:'أفهم أن هذه الصلاحيات ستُحفظ كتفضيلات فقط، وأنها لا تُفعّل أي وصول للوكيل أو إرسال سحابي.',
        permissionsLegacy:'هذه النسخة من الإصدار 0.7.1 ولا تحوي صلاحيات موحّدة؛ تُستعاد كل الصلاحيات «خاص» والمفتاحان متوقفان.',
        legacyEntries:'إعدادات خاصة بمساحات العمل في هذه النسخة لن تُستعاد:',
        confirm:'راجعت هذه النسخة وأوافق على تطبيقها على المسودة.',applyRestore:'تطبيق الاستعادة على المسودة',
        reviewReady:'النسخة صالحة. راجع المعاينة ثم طبّقها.',restoreApplied:'طُبّقت الاستعادة على المسودة فقط. لم يُحفظ شيء بعد: اضغط «حفظ التغييرات».',
        invalidJson:'النص ليس JSON صالحًا.',unsupportedVersion:'إصدار النسخة غير مدعوم.',invalidPolicy:'النسخة تحتوي صلاحية غير صالحة أو غير مدعومة.',
        instructionsTooLong:'التعليمات المخصصة في النسخة أطول من 8192 حرفًا. لم يُقتطع شيء ولم تُطبّق النسخة.',invalidContent:'محتوى النسخة غير صالح أو يحتوي حقولًا غير معروفة.',
        mergeTooLong:'التعليمات بعد الدمج أطول من 8192 حرفًا. اختصرها قبل التطبيق؛ لن يُقتطع أي نص تلقائيًا.',
        fileTooLarge:'الملف أكبر من الحد المسموح (3,000,000 بايت).',fileReadFailed:'تعذرت قراءة الملف.',
        copied:'نُسخ JSON إلى الحافظة.',copyFailed:'تعذر النسخ إلى الحافظة. استخدم «عرض JSON» وانسخ النص يدويًا.',
        downloaded:'بدأ تنزيل الملف. تأكد من حفظه.',downloadFailed:'التنزيل غير متاح هنا. استخدم «نسخ JSON» أو «عرض JSON».',
        migrationTitle:'ترحيل الإعدادات من الإصدار 0.7.1',
        migrationHint:'وُجدت إعدادات محفوظة بالصيغة القديمة المرتبطة بمساحات العمل. يحتفظ الترحيل بمعلوماتك الشخصية ولغة الواجهة والتفضيلات العامة والتعليمات المخصصة. لا تتغير الإعدادات المخزنة قبل الضغط على «حفظ التغييرات».',
        migrationKept:'لا توجد إعدادات خاصة بمساحات العمل؛ لن يُحذف شيء.',
        migrationDiscard:'لن تُنقل الإعدادات التالية إلى الملف الموحّد، وستُحذف عند الحفظ. صدّرها أولًا إن أردت الاحتفاظ بها:',
        migrationMasters:'مفاتيح المشاركة العامة كانت مفعّلة وستُعاد إلى «متوقف»؛ يمكنك تفعيلها لاحقًا من «التحكم في الوصول».',
        workspaceId:'معرّف مساحة العمل',overrideCol:'تخصيص',policiesCol:'الصلاحيات',yes:'نعم',no:'لا',
        legacyJson:'إعدادات 0.7.1 الكاملة (JSON)',migrationAck:'راجعت وصدّرت ما أحتاجه، وأوافق على حذف الإعدادات الخاصة بمساحات العمل وإيقاف مفاتيح المشاركة عند الحفظ.',
        migration:'إعدادات من إصدار سابق بانتظار الترحيل. راجعها ثم احفظ.',
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
        subtitle:'One unified profile in the active Harness Profile',warning:'Stored locally without plugin-level encryption. Do not enter passwords, keys or sensitive information. Saved response preferences are sent to the selected model and may remain in conversation history. Structured personal fields are not sent.',
        language:'Interface language',preferredName:'Preferred name',nationality:'Nationality',gender:'Gender',male:'Male',female:'Female',unspecified:'Prefer not to say',
        unified:'Unified preferences',unifiedHint:'Saved preferences apply at the next assembled step in supported native conversations, independent of Workspace. Some agent presets may override them.',
        personality:'Personality',styleTone:'Style and tone',responseLanguage:'Response language',characteristics:'Response characteristics',presets:'Behavior presets',customInstructions:'Custom instructions',
        sendCustom:'Allow sending custom text to selected models (including cloud)',customConsentHint:'Text can remain in conversation history and be replayed. Do not include sensitive data. Editing or restoring text clears consent; review and Save.',
        less:'Less',neutral:'Balanced',more:'More',characters:'characters',
        preferenceHint:'Optional choices apply after Save.',languageHint:'Response language is separate from interface language. Put dialect preferences in custom instructions.',
        previewHint:'Draft preview of what is contributed after Save in supported conversations. Earlier instructions are not erased from history.',presetHint:'None selected by default.',resetPreferences:'Reset preferences',
        effective:'Effective preview',optIn:'Allow use of personal information (saved preference, not active in agent)',
        fieldPolicies:'Field policies',policiesHint:'One policy per field for the whole profile, not per Workspace.',private:'Private',ask:'Ask First',allow:'Allow',on:'On',off:'Off',
        cloud:'Allow personal information to be sent to a cloud provider (saved preference, not active)',accessHint:'No information is disclosed or sent today from structured personal fields. Policies are saved only: disclosure is blocked because Harness cannot guarantee history isolation after permission or provider changes. Even Allow does not send fields.',
        exportTitle:'Export backup',exportHint:'The JSON file is not encrypted. It contains your personal information, instructions and saved access permissions exactly as set. Keep it somewhere safe and do not share it.',
        download:'Download JSON file',copy:'Copy JSON',view:'View JSON',hideView:'Hide JSON',exportJson:'JSON backup',
        importTitle:'Import and restore',importHint:'Choose a JSON file or paste JSON, then review it. Nothing is saved until you press Save changes.',
        importFile:'Import JSON file',pasteJson:'Paste JSON manually',import:'Review backup',cancelRestore:'Cancel restore',
        strategy:'Restore strategy',replaceAll:'Replace All',replaceAllHint:'Imported settings replace current settings, including custom instructions; custom-text sending consent is cleared.',
        replaceMerge:'Replace All and Merge Custom Instructions',replaceMergeHint:'Custom-text sending consent is cleared on restore. Replaces everything except custom instructions: your current text is kept and imported paragraphs that are not duplicates are appended.',
        previewTitle:'Restore preview',setting:'Setting',current:'Current draft',proposed:'After restore',interfaceLanguage:'Interface language',
        mergedLabel:'Merged instructions (editable)',importedInstructions:'Imported instructions',none:'None',empty:'—',
        permissionsTitle:'Permissions saved in this backup',restorePermissions:'Restore the permissions saved in this backup',
        permissionsDefault:'By default every policy is restored as Private and both switches stay Off.',permissionsAck:'I understand these permissions are saved as preferences only and do not enable any agent access or cloud disclosure.',
        permissionsLegacy:'This backup is from 0.7.1 and has no unified permissions; every policy is restored as Private and both switches Off.',
        legacyEntries:'Workspace-specific settings in this backup that will not be restored:',
        confirm:'I reviewed this backup and want to apply it to the draft.',applyRestore:'Apply restore to draft',
        reviewReady:'Backup is valid. Review the preview, then apply it.',restoreApplied:'Restore applied to the draft only. Nothing is saved yet: press Save changes.',
        invalidJson:'The text is not valid JSON.',unsupportedVersion:'Unsupported backup version.',invalidPolicy:'The backup contains an invalid or unsupported policy.',
        instructionsTooLong:'Custom instructions in the backup exceed 8192 characters. Nothing was truncated and the backup was not applied.',invalidContent:'The backup content is invalid or contains unknown fields.',
        mergeTooLong:'Merged instructions exceed 8192 characters. Shorten them before applying; nothing is truncated automatically.',
        fileTooLarge:'The file is larger than the allowed limit (3,000,000 bytes).',fileReadFailed:'The file could not be read.',
        copied:'JSON copied to the clipboard.',copyFailed:'Could not copy to the clipboard. Use View JSON and copy the text manually.',
        downloaded:'Download started. Make sure the file is saved.',downloadFailed:'Download is not available here. Use Copy JSON or View JSON.',
        migrationTitle:'Migrate settings from 0.7.1',
        migrationHint:'Settings stored in the earlier Workspace-based format were found. Migration keeps your personal information, interface language, global preferences and custom instructions. Stored settings do not change until you press Save changes.',
        migrationKept:'There are no Workspace-specific settings; nothing will be removed.',
        migrationDiscard:'The following settings do not move into the unified profile and are removed when you Save. Export them first if you want to keep them:',
        migrationMasters:'The sharing switches were On and will be reset to Off; you can enable them again in Access Control.',
        workspaceId:'Workspace ID',overrideCol:'Override',policiesCol:'Policies',yes:'Yes',no:'No',
        legacyJson:'Complete 0.7.1 settings (JSON)',migrationAck:'I reviewed and exported what I need, and agree to remove the Workspace-specific settings and turn the sharing switches Off when saving.',
        migration:'Settings from an earlier version await migration. Review them, then Save.',
        reset:'Reset draft',missing:'Not set',noInstruction:'No instructions.',save:'Save changes',reload:'Reload (discard draft)',
        loading:'Reading settings…',unavailable:'Local settings unavailable or not writable. Nothing saved.',ready:'Settings loaded.',saving:'Saving…',saved:'Save confirmed by Harness.',
        failed:'Save not confirmed. Reload to verify before retrying.',conflict:'Settings changed in another window. Reload and reapply edits.',invalid:'Invalid settings or backup.',dirty:'Unsaved changes.',
        tooLarge:'Settings are too large to save. Nothing was saved; your edits remain in the draft.',
        reconnected:'Connection was reset. Your draft is kept on this page: you can Save (Harness checks the revision) or Reload.',
        discardWarning:'You have unsaved changes that Reload will discard. To keep them, first export a JSON backup from Backup & Restore.',
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
      const jsonControl = {...control,...JSON_STYLE}
      const btn = { border:'1px solid rgba(128,128,128,.35)', borderRadius:8,
        padding:'9px 13px', font:'inherit', background:'rgba(128,128,128,.08)',
        color:'inherit', cursor:'pointer' }
      const row = {display:'flex',gap:10,flexWrap:'wrap',alignItems:'center',margin:'12px 0'}
      const check = {display:'flex',gap:10,alignItems:'start',margin:'12px 0'}
      const cell = {padding:'6px 8px',borderBottom:'1px solid rgba(128,128,128,.25)',textAlign:'start',verticalAlign:'top',overflowWrap:'anywhere'}
      const sections = ['information','instructions','access','backup','privacy']
      const localLabel = item => item[rtl?1:2]
      const policyLabel = v => t({private:'private',ask_first:'ask',allow:'allow'}[v])
      const genderLabel = v => v ? t(v) : t('missing')
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
      function checkbox(id, checked, onChange, text, props = {}) {
        return h('div',{style:check},
          h('input',{id:'pp-'+id,type:'checkbox',checked,onChange:e=>onChange(e.target.checked),style:{marginTop:5},...props}),
          h('label',{htmlFor:'pp-'+id},text))
      }
      function jsonView(id, text, title) {
        return h('div',{style:{marginTop:12}},
          h('label',{htmlFor:'pp-'+id,style:label},title),
          h('textarea',{id:'pp-'+id,readOnly:true,rows:12,dir:'ltr',lang:'en',spellCheck:false,style:jsonControl,value:text}))
      }
      // Export/copy/view controls shared by the backup and the 0.7.1 migration review.
      function jsonActions(prefix, text, fileName, viewing, setViewing) {
        return h('div',{style:row},
          h('button',{id:'pp-'+prefix+'-download',type:'button',style:btn,onClick:e=>{
            let ok=false;try{ok=downloadJson(e,text(),fileName)}catch{ok=false}
            setBackupMessage(ok?'downloaded':'downloadFailed')}},t('download')),
          h('button',{id:'pp-'+prefix+'-copy',type:'button',style:btn,onClick:e=>{
            const pending=(async()=>copyJson(e,text()))()
            pending.then(ok=>setBackupMessage(ok?'copied':'copyFailed'),()=>setBackupMessage('copyFailed'))}},t('copy')),
          h('button',{id:'pp-'+prefix+'-view',type:'button',style:btn,'aria-expanded':viewing,
            'aria-controls':'pp-'+prefix+'-json',onClick:()=>setViewing(v=>!v)},viewing?t('hideView'):t('view')))
      }
      const notice = h('p', { role:'note', style:{padding:'12px 15px',
        border:'1px solid rgba(208,158,52,.7)', borderRadius:10,
        background:'rgba(208,158,52,.1)',fontSize:13,lineHeight:1.7} }, t('warning'))
      const backupStatus = backupMessage ? h('p',{id:'pp-backup-status',role:'status',style:{fontWeight:600}},t(backupMessage)) : null
      const exportText = () => JSON.stringify(decodeProfile(record),null,2)
      const legacyText = () => JSON.stringify(legacy,null,2)
      // ---- Restore preview helpers (read-only rendering) ----
      const summarize = r => {
        const p=r.preferences
        const traits=PROFILE_TRAITS.filter(([key])=>p.traits[key]!==1).map(item=>localLabel(item)+': '+t(['less','neutral','more'][p.traits[item[0]]]))
        const presets=PROFILE_PRESETS.filter(item=>p.presets.includes(item[0])).map(localLabel)
        return [
          ['preferredName',t('preferredName'),r.information.preferredName||t('empty')],
          ['nationality',t('nationality'),r.information.nationality||t('empty')],
          ['gender',t('gender'),genderLabel(r.information.gender)],
          ['locale',t('interfaceLanguage'),r.locale==='ar'?'العربية':'English'],
          ['style',t('styleTone'),localLabel(PROFILE_STYLES.find(i=>i[0]===p.style))],
          ['responseLanguage',t('responseLanguage'),localLabel(PROFILE_LANGUAGES.find(i=>i[0]===p.responseLanguage))],
          ['traits',t('characteristics'),traits.length?traits.join(rtl?'، ':', '):t('neutral')],
          ['presets',t('presets'),presets.length?presets.join(rtl?'، ':', '):t('none')],
          ['custom',t('customInstructions'),p.custom.length+' '+t('characters')],
          ['sendCustom',t('sendCustom'),p.sendCustom===true?t('on'):t('off')],
          ...PERSONAL_FIELDS.map(key=>['policy-'+key,t('fieldPolicies')+' — '+t(key),policyLabel(r.policies[key])]),
          ['allowPersonalInformation',t('optIn'),r.allowPersonalInformation?t('on'):t('off')],
          ['allowCloud',t('cloud'),r.allowCloud?t('on'):t('off')],
        ]
      }
      const proposeRestore = () => {
        if(!restoreReview)return null
        const incoming=restoreReview.incoming
        const permissions=restorePermissions&&restoreReview.permissions
          ? restoreReview.permissions : {policies:privatePolicies(),allowPersonalInformation:false,allowCloud:false}
        const proposal={...incoming,preferences:withoutCustomConsent(incoming.preferences),policies:{...permissions.policies},
          allowPersonalInformation:permissions.allowPersonalInformation,allowCloud:permissions.allowCloud}
        if(restoreStrategy==='replace-merge')proposal.preferences={...withoutCustomConsent(incoming.preferences),custom:mergedText}
        return proposal
      }
      const startReview = text => {
        clearRestore()
        try {
          if(!text)throw profileError('invalidContent')
          if(text.length>PROFILE_MAX_CHARS)throw profileError('tooLarge')
          let parsed
          try{parsed=JSON.parse(text)}catch{throw profileError('invalidJson')}
          const decoded=decodeAnyProfile(parsed)
          const review=decoded.legacy
            ? {source:'legacy',incoming:migrateLegacyProfile(decoded.legacy),permissions:null,
              legacyWorkspaces:decoded.legacy.workspaces.map(w=>w.id)}
            : {source:'current',incoming:decoded.record,legacyWorkspaces:[],
              permissions:{policies:decoded.record.policies,allowPersonalInformation:decoded.record.allowPersonalInformation,allowCloud:decoded.record.allowCloud}}
          setRestoreReview(review)
          setMergedText(mergeInstructions(record.preferences.custom,review.incoming.preferences.custom))
          setBackupMessage('reviewReady')
        // Never clear a conflict/failed state: those require a reload before Save.
        }catch(error){
          setBackupMessage(error?.code==='tooLarge'?'fileTooLarge':(error?.code||'invalidContent'))
          setStatus(s=>s==='conflict'||s==='failed'?s:'invalid')
        }
      }
      const importFile = async e => {
        const target=e.currentTarget, file=target.files?.[0], win=target.ownerDocument?.defaultView
        clearRestore()
        if(!file)return
        if(!(file.size<=PROFILE_MAX_CHARS)){target.value='';setBackupMessage('fileTooLarge');setStatus(s=>s==='conflict'||s==='failed'?s:'invalid');return}
        let text
        try{text=await readFileText(file,win)}catch{target.value='';setBackupMessage('fileReadFailed');return}
        target.value=''
        setRestoreText(text);startReview(text)
      }
      let contents
      if (page === 'information') {
        contents = card(t('information'),
          h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:'0 18px'}},
            ...PERSONAL_FIELDS.map(id=>id==='gender'
              ? dropdown(id,t(id),values.gender,GENDER_VALUES.map(v=>[v,genderLabel(v)]),v=>setField(id,v))
              : input(id,t(id),values[id],v=>setField(id,v)))))
      } else if (page === 'instructions') {
        const setPreference = (key,value) => setPreferences(old=>key==='custom'?{...withoutCustomConsent(old),custom:value}:({...old,[key]:value}))
        const activePreview = previewProfilePreferences(preferences)
        contents = h(React.Fragment,null,
          card(t('unified'),h('p',{style:muted},t('unifiedHint'))),
          card(t('personality'),
            dropdown('style',t('styleTone'),preferences.style,
              PROFILE_STYLES.map(item=>[item[0],localLabel(item)]),v=>setPreference('style',v)),
            h('p',{style:muted},t('preferenceHint'))),
          card(t('responseLanguage'),
            dropdown('response-language',t('responseLanguage'),preferences.responseLanguage,
              PROFILE_LANGUAGES.map(item=>[item[0],localLabel(item)]),v=>setPreference('responseLanguage',v)),
            h('p',{style:muted},t('languageHint'))),
          card(t('characteristics'),
            ...PROFILE_TRAITS.map(item=>{
              const [key]=item
              const level=preferences.traits[key]
              const levelText=t(['less','neutral','more'][level])
              const change=e=>{
                const value=Number(e.currentTarget.value)
                if([0,1,2].includes(value)) setPreferences(old=>({...old,traits:{...old.traits,[key]:value}}))
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
            })),
          card(t('presets'),
            h('p',{style:muted},t('presetHint')),
            ...PROFILE_PRESETS.map(item=>h('label',{key:item[0],htmlFor:'pp-preset-'+item[0],
              style:{display:'flex',alignItems:'start',gap:10,margin:'12px 0',cursor:'pointer'}},
              h('input',{id:'pp-preset-'+item[0],type:'checkbox',checked:preferences.presets.includes(item[0]),
                onChange:e=>{const checked=e.target.checked;setPreferences(old=>({...old,
                  presets:checked?[...new Set([...old.presets,item[0]])]:old.presets.filter(id=>id!==item[0])}))}}),
              h('span',null,h('strong',null,localLabel(item)),
                h('span',{style:{display:'block',fontSize:12,opacity:.76}},rtl?item[3]:item[4]))))),
          card(t('customInstructions'),
            h('label',{htmlFor:'pp-custom',style:label},t('customInstructions')),
            h('textarea',{id:'pp-custom',rows:6,maxLength:PROFILE_CUSTOM_MAX,style:control,'aria-describedby':'pp-custom-count',
              value:preferences.custom,onChange:e=>setPreference('custom',e.target.value),dir:'auto'}),
            h('p',{id:'pp-custom-count',style:{...muted,marginTop:6}},preferences.custom.length+' / '+PROFILE_CUSTOM_MAX+' '+t('characters')),
            checkbox('send-custom',preferences.sendCustom===true,v=>setPreferences(old=>v?{...old,sendCustom:true}:withoutCustomConsent(old)),t('sendCustom'),{disabled:!preferences.custom.trim()}),
            h('p',{style:muted},t('customConsentHint')),
            h('button',{type:'button',id:'pp-reset-preferences',style:{...btn,marginTop:12},
              onClick:()=>setPreferences(()=>neutralProfilePreferences())},t('resetPreferences'))),
          card(t('effective'),h('p',{style:muted},t('previewHint')),
            h('output',{id:'pp-effective-instructions',dir:'auto',
              style:{display:'block',whiteSpace:'pre-wrap',overflowWrap:'anywhere'}},activePreview||t('noInstruction'))))
      } else if (page === 'access') {
        contents = card(t('access'),h('p',null,t('accessHint')),
          checkbox('opt-in',record.allowPersonalInformation,v=>setRecord(old=>({...old,allowPersonalInformation:v})),t('optIn')),
          checkbox('cloud',record.allowCloud,v=>setRecord(old=>({...old,allowCloud:v})),t('cloud')),
          h('h3',{style:{fontSize:15}},t('fieldPolicies')),
          h('p',{style:muted},t('policiesHint')),
          ...PERSONAL_FIELDS.map(id=>dropdown('policy-'+id,t(id),record.policies[id],
            POLICY_VALUES.map(v=>[v,policyLabel(v)]),
            v=>setRecord(old=>({...old,policies:{...old.policies,[id]:v}})))))
      } else if(page==='backup') {
        const proposal=proposeRestore()
        const mergeTooLong=!!restoreReview&&restoreStrategy==='replace-merge'&&mergedText.length>PROFILE_CUSTOM_MAX
        let proposalValid=false
        try{proposalValid=!!proposal&&!mergeTooLong&&!!decodeProfile(proposal)}catch{proposalValid=false}
        const canApply=proposalValid&&restoreAck&&(!restorePermissions||permissionsAck)
        const strategyOption=(value,title,hint)=>h('div',{key:value,style:check},
          h('input',{id:'pp-strategy-'+value,type:'radio',name:'pp-strategy',value,checked:restoreStrategy===value,
            style:{marginTop:5},'aria-describedby':'pp-strategy-'+value+'-hint',
            onChange:()=>{setRestoreStrategy(value);setRestoreAck(false)}}),
          h('div',null,h('label',{htmlFor:'pp-strategy-'+value,style:{fontWeight:650}},title),
            h('p',{id:'pp-strategy-'+value+'-hint',style:{...muted,marginTop:2}},hint)))
        const currentRows=summarize(record)
        const reviewCard = restoreReview ? card(t('previewTitle'),
          h('table',{id:'pp-restore-preview',style:{width:'100%',borderCollapse:'collapse',fontSize:13}},
            h('caption',{style:{textAlign:'start',fontWeight:650,marginBottom:6}},t('previewTitle')),
            h('thead',null,h('tr',null,
              h('th',{scope:'col',style:cell},t('setting')),h('th',{scope:'col',style:cell},t('current')),h('th',{scope:'col',style:cell},t('proposed')))),
            h('tbody',null,...summarize(proposal).map(([key,title,value],index)=>h('tr',{key,'data-restore-row':key},
              h('th',{scope:'row',style:{...cell,fontWeight:600}},title),
              h('td',{style:cell,dir:'auto'},currentRows[index][2]),
              h('td',{style:{...cell,fontWeight:currentRows[index][2]===value?400:700},dir:'auto'},value))))),
          restoreReview.legacyWorkspaces.length ? h('div',{role:'note',style:{marginTop:12}},
            h('p',{style:{margin:'0 0 6px'}},t('legacyEntries')),
            h('ul',{id:'pp-restore-legacy',dir:'ltr',style:{margin:0}},...restoreReview.legacyWorkspaces.map(id=>h('li',{key:id},id)))) : null,
          restoreStrategy==='replace-merge' ? h('div',{style:{marginTop:14}},
            h('label',{htmlFor:'pp-restore-merged',style:label},t('mergedLabel')),
            h('textarea',{id:'pp-restore-merged',rows:8,dir:'auto',style:control,value:mergedText,'aria-describedby':'pp-restore-merged-count',
              'aria-invalid':mergeTooLong,onChange:e=>{setMergedText(e.target.value);setRestoreAck(false)}}),
            h('p',{id:'pp-restore-merged-count',role:mergeTooLong?'alert':undefined,style:{...muted,marginTop:6,fontWeight:mergeTooLong?700:400}},
              mergedText.length+' / '+PROFILE_CUSTOM_MAX+' '+t('characters')+(mergeTooLong?' — '+t('mergeTooLong'):''))) :
            h('div',{style:{marginTop:14}},
              h('label',{htmlFor:'pp-restore-imported',style:label},t('importedInstructions')),
              h('textarea',{id:'pp-restore-imported',readOnly:true,rows:5,dir:'auto',style:control,value:restoreReview.incoming.preferences.custom})),
          h('h3',{style:{fontSize:15,marginTop:18}},t('permissionsTitle')),
          restoreReview.permissions ? h(React.Fragment,null,
            h('p',{style:muted},t('permissionsDefault')),
            checkbox('restore-permissions',restorePermissions,v=>{setRestorePermissions(v);setPermissionsAck(false);setRestoreAck(false)},t('restorePermissions')),
            restorePermissions ? h('div',{style:{padding:'10px 14px',border:'1px solid rgba(208,58,52,.5)',borderRadius:10}},
              h('ul',{id:'pp-restore-permission-list',style:{margin:'0 0 8px'}},
                ...PERSONAL_FIELDS.map(key=>h('li',{key},t(key)+': '+policyLabel(restoreReview.permissions.policies[key]))),
                h('li',null,t('optIn')+': '+(restoreReview.permissions.allowPersonalInformation?t('on'):t('off'))),
                h('li',null,t('cloud')+': '+(restoreReview.permissions.allowCloud?t('on'):t('off')))),
              checkbox('restore-permissions-ack',permissionsAck,v=>{setPermissionsAck(v);setRestoreAck(false)},t('permissionsAck'))) : null)
            : h('p',{style:muted},t('permissionsLegacy')),
          checkbox('restore-confirm',restoreAck,setRestoreAck,t('confirm'),{disabled:!proposalValid}),
          h('div',{style:row},
            h('button',{id:'pp-restore-apply',type:'button',style:btn,disabled:!canApply,onClick:()=>{
              const next=proposeRestore()
              try{setRecord(decodeProfile(next))}catch{setBackupMessage('invalidContent');return}
              setRestoreText('');clearRestore();setExportView(false);setBackupMessage('restoreApplied')
            }},t('applyRestore')),
            h('button',{id:'pp-restore-cancel',type:'button',style:btn,onClick:()=>{clearRestore();setBackupMessage('')}},t('cancelRestore')))) : null
        contents=h(React.Fragment,null,
          card(t('exportTitle'),h('p',{role:'note'},t('exportHint')),
            jsonActions('export',exportText,backupFileName(false),exportView,setExportView),
            exportView?jsonView('export-json',exportText(),t('exportJson')):null),
          card(t('importTitle'),h('p',null,t('importHint')),
            h('label',{htmlFor:'pp-import-file',style:label},t('importFile')),
            h('input',{id:'pp-import-file',type:'file',accept:'application/json,.json',style:{...control,padding:'7px 9px'},onChange:e=>{void importFile(e)}}),
            h('label',{htmlFor:'pp-restore-json',style:{...label,marginTop:14}},t('pasteJson')),
            h('textarea',{id:'pp-restore-json',rows:6,maxLength:PROFILE_MAX_CHARS,dir:'ltr',lang:'en',spellCheck:false,style:jsonControl,value:restoreText,
              onChange:e=>{setRestoreText(e.target.value);clearRestore()}}),
            h('fieldset',{style:{border:0,padding:0,margin:'14px 0 0',minWidth:0}},
              h('legend',{style:{...label,padding:0}},t('strategy')),
              strategyOption('replace',t('replaceAll'),t('replaceAllHint')),
              strategyOption('replace-merge',t('replaceMerge'),t('replaceMergeHint'))),
            h('button',{id:'pp-restore-review',type:'button',style:btn,onClick:()=>startReview(restoreText)},t('import'))),
          reviewCard)
      }else {
        contents=card(t('privacy'),h('p',null,t('warning')),h('p',null,t('accessHint')),h('p',null,t('exportHint')))
      }
      const migrationCard = legacy ? h('section',{id:'pp-migration',style:{...surface,border:'1px solid rgba(208,158,52,.75)'},'aria-label':t('migrationTitle')},
        h('h2',{style:{fontSize:17,margin:'0 0 10px'}},t('migrationTitle')),
        h('p',null,t('migrationHint')),
        legacy.workspaces.length ? h(React.Fragment,null,
          h('p',null,t('migrationDiscard')),
          h('div',{style:{overflowX:'auto'}},h('table',{id:'pp-migration-workspaces',style:{width:'100%',borderCollapse:'collapse',fontSize:13}},
            h('caption',{style:{textAlign:'start',fontWeight:650,marginBottom:6}},t('migrationDiscard')),
            h('thead',null,h('tr',null,...[t('workspaceId'),t('overrideCol'),t('styleTone'),t('responseLanguage'),t('customInstructions'),t('policiesCol')]
              .map(x=>h('th',{key:x,scope:'col',style:cell},x)))),
            h('tbody',null,...legacy.workspaces.map(w=>h('tr',{key:w.id},
              h('th',{scope:'row',dir:'ltr',style:{...cell,fontWeight:600}},w.id),
              h('td',{style:cell},w.override?t('yes'):t('no')),
              h('td',{style:cell},localLabel(PROFILE_STYLES.find(i=>i[0]===w.preferences.style))),
              h('td',{style:cell},localLabel(PROFILE_LANGUAGES.find(i=>i[0]===w.preferences.responseLanguage))),
              h('td',{style:cell},w.preferences.custom.length+' '+t('characters')),
              h('td',{style:cell},PERSONAL_FIELDS.map(key=>t(key)+': '+policyLabel(w.policies[key])).join(rtl?'، ':', '))))))))
          : h('p',null,t('migrationKept')),
        legacy.allowPersonalInformation||legacy.allowCloud ? h('p',{role:'note',style:{fontWeight:600}},t('migrationMasters')) : null,
        h('p',{style:muted},t('exportHint')),
        jsonActions('legacy',legacyText,backupFileName(true),legacyView,setLegacyView),
        legacyView?jsonView('legacy-json',legacyText(),t('legacyJson')):null,
        legacyDiscards(legacy) ? checkbox('migration-ack',migrationAck,setMigrationAck,t('migrationAck'),{disabled:!editable}) : null,
        page!=='backup'?backupStatus:null) : null
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
            h('button',{id:'pp-save',type:'button',style:btn,disabled:!editable||!dirty||status==='conflict'||status==='failed'||migrationBlocked,onClick:save},t('save')),
            h('button',{id:'pp-reload',type:'button',style:btn,disabled:busy||!canRead,onClick:requestReload},t('reload')),
            h('button',{id:'pp-reset',type:'button',style:btn,disabled:!editable,onClick:()=>{setRecord({...emptyProfileRecord(),locale:language});setRestoreText('');clearRestore();setExportView(false)}},t('reset'))),
          h('p',{id:'pp-save-status',role:'status'},t(status)+(dirty&&status!=='migration'?' '+t('dirty'):'')),
          confirmReload?h('div',{id:'pp-reload-prompt',role:'alert',style:{padding:'12px 15px',marginBottom:12,
            border:'1px solid rgba(208,58,52,.6)',borderRadius:10,background:'rgba(208,58,52,.08)'}},
            h('p',{style:{margin:'0 0 10px'}},t('discardWarning')),
            h('div',{style:{display:'flex',gap:10,flexWrap:'wrap'}},
              h('button',{id:'pp-reload-confirm',type:'button',style:btn,disabled:busy||!canRead,onClick:()=>{void load()}},t('discardConfirm')),
              h('button',{id:'pp-reload-cancel',type:'button',style:btn,onClick:()=>setConfirmReload(false)},t('discardCancel')))):null,
          migrationCard,
          h('fieldset',{disabled:!editable,style:{border:0,margin:0,padding:0,minWidth:0}},
          h('nav',{role:'tablist','aria-label':t('title'),
            style:{display:'flex',gap:6,flexWrap:'wrap',marginBottom:20}},
            ...sections.map(id=>h('button',{key:id,type:'button',role:'tab',
              id:'pp-tab-'+id,'aria-selected':page===id,
              'aria-controls':'pp-content',onClick:()=>setPage(id),
              style:{...btn,background:page===id?'rgba(128,128,128,.22)':'transparent',
                fontWeight:page===id?700:500}},t(id)))),
          h('div',{role:'tabpanel',id:'pp-content','aria-labelledby':'pp-tab-'+page},
            page==='backup'?backupStatus:null,contents))))
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
        h('p',null,'One unified profile: Preferred name, Nationality, Gender, response preferences and optional Custom Instructions. All access is Private by default.'),
        h('p',null,'Saved in the active Harness Profile without plugin-level encryption. Open Personal Profile to edit. Saved response preferences are contributed to supported native agent steps; structured personal information disclosure is not implemented.'))
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
      // 0.7.2: no Workspace service. The profile is unified and never reads
      // Workspace membership, so `workspaces` is deliberately not injected.
      inject: ['slots','remote','remote.settings'],
      apply(ctx) {
        const listeners=new Set()
        let generation=0
        const connectionSource={getSnapshot:()=>generation,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn)}}
        ctx.on('connection/reset',()=>{generation++;for(const fn of [...listeners])fn()})
        const settings=ctx.remote.settings
        function ProfileSlot(props) {
          const page=h(PersonalProfilePage,{settings,connectionSource,useRemoteAccess:props?.useRemoteAccess})
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
    const lifecycleIcon = ['M10 13H6V7a1 1 0 0 1 1-1h8m-9 7-1 2m3.5-3.5v-2H15',
      'M18.25 11.25a4.5 4.5 0 1 1-6.5 1.25m3.75.75v2.25h2']
    const reasoningIcon = ['M6.5 15v3m5.5-6v6m5.5-9v9M6.5 11.5c3.6 0 5-4.5 8.8-4.5',
      'M19.5 7a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z']
    const suiteLanguage = () => globalThis.document?.documentElement?.lang?.toLowerCase().startsWith('ar') ? 'ar' : 'en'
    const suiteGlyph = (paths, size = 18) => h('svg', { width: size, height: size, viewBox: '0 0 24 24',
      fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
    ...paths.map(path => h('path', { key: path, d: path })))
    const suiteText = (en, ar) => suiteLanguage() === 'ar' ? ar : en
    const suiteButton = { color: 'inherit', background: 'transparent', border, borderRadius: 7, padding: '6px 10px', font: 'inherit' }
    const suiteWatch = source => React.useSyncExternalStore(
      notify => source.subscribe(notify), () => source.getSnapshot(), () => source.getSnapshot())
    const suiteSettingsView = view => view?.value && Number.isSafeInteger(view.revision) && view.revision >= 0 ? view : null

    function useSuiteRecord(settings, id, useRemoteAccess, connection) {
      const mayRead = useRemoteAccess?.('settings/describe') === true
      const mayWrite = useRemoteAccess?.('settings/replace') === true
      const [state, setState] = React.useState({ status: 'loading' })
      const [reload, setReload] = React.useState(0)
      const epoch = React.useRef(0)
      const busy = React.useRef(false)
      const access = React.useRef({ mayRead, mayWrite })
      const generationAtRender = suiteWatch(connection)
      access.current = { mayRead, mayWrite }
      const ns = `abinadwan-${id}`
      React.useEffect(() => {
        const generation = ++epoch.current
        const live = () => epoch.current === generation && connection.getSnapshot() === generationAtRender
        busy.current = false
        if (!mayRead) setState({ status: 'unavailable' })
        else {
          setState({ status: 'loading' })
          Promise.resolve().then(() => settings.describe()).then(result => {
            if (!live()) return
            const view = result?.ok && suiteSettingsView(result.value?.namespaces?.find(item => item.ns === ns))
            setState(view ? { status: 'ready', view, writable: result.value.writable === true,
              connectionGeneration: generationAtRender } : { status: 'unavailable' })
          }).catch(() => { if (live()) setState({ status: 'unavailable' }) })
        }
        return () => { epoch.current++ }
      }, [settings, ns, mayRead, reload, generationAtRender])

      const currentView = state.connectionGeneration === generationAtRender
      const writable = mayRead && mayWrite && currentView && state.writable === true &&
        ['ready', 'saved', 'failed'].includes(state.status)
      async function save(record) {
        if (!writable || busy.current || connection.getSnapshot() !== generationAtRender ||
            !access.current.mayRead || !access.current.mayWrite) return false
        const generation = epoch.current
        busy.current = true
        setState({ ...state, status: 'saving' })
        try {
          const result = await settings.replace(ns, { record }, state.view.revision)
          if (generation !== epoch.current || connection.getSnapshot() !== generationAtRender || !access.current.mayRead) return false
          const view = result?.ok && suiteSettingsView(result.value)
          if (view && view.ns === ns) {
            setState({ ...state, status: 'saved', view })
            return true
          }
          setState({ ...state, status: result?.error?.code === 'settings/conflict' ? 'conflict' : 'failed' })
        } catch {
          if (generation === epoch.current && connection.getSnapshot() === generationAtRender && access.current.mayRead) {
            setState({ ...state, status: 'failed' })
          }
        } finally { if (generation === epoch.current) busy.current = false }
        return false
      }
      const source = mayRead && currentView ? state.view : undefined
      return { record: source?.value.record, source, writable,
        status: mayRead && state.view && !currentView ? 'loading' : state.status, save,
        reload: () => { if (!busy.current) setReload(value => value + 1) } }
    }

    function suiteConnection(ctx) {
      let generation = 0
      const listeners = new Set()
      const invalidate = () => { generation++; for (const notify of listeners) notify() }
      ctx.on('connection/reset', invalidate)
      ctx.effect(() => ctx.remote.$on('settings/document-updated', invalidate))
      return { getSnapshot: () => generation,
        subscribe: notify => { listeners.add(notify); return () => listeners.delete(notify) } }
    }

    function SuiteRecordStatus({ settings }) {
      const labels = {
        loading: 'Loading settings…', unavailable: 'Settings unavailable.',
        saving: 'Saving…', saved: 'Saved.', failed: 'Save failed.',
        conflict: 'Settings changed in another window. Reload before saving again.',
      }
      const label = labels[settings.status]
      return label ? h('div', { role: 'status', style: lifecycleMuted }, label, ' ',
        ['conflict', 'unavailable'].includes(settings.status) ? h(Button, { size: 'sm',
          onClick: settings.reload }, 'Reload settings') : null) : null
    }

    const lifecycleDurations = ['365', '180', '90', '30', '7']
    const lifecycleMuted = { color: 'var(--dsw-alias-label-secondary, inherit)', fontSize: 12, lineHeight: 1.45 }
    const lifecycleRule = '1px solid var(--dsw-alias-border-l3, CanvasText)'
    const lifecycleLabel = { display: 'grid', gap: 6, fontSize: 13, fontWeight: 500, minWidth: 0 }
    const lifecycleSelect = {
      display: 'block', width: '100%', minWidth: 0, height: 32, paddingInline: 8,
      borderRadius: 8, border: lifecycleRule, color: 'inherit', font: 'inherit',
      background: 'var(--dsw-alias-settings-card-fill, Canvas)',
    }
    const lifecycleActions = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }

    function LifecycleGroup({ title, children }) {
      return h('section', { style: { display: 'grid', gap: 10, minWidth: 0, paddingBlockStart: 14,
        borderBlockStart: lifecycleRule } },
      h('h2', { style: { margin: 0, fontSize: 14, fontWeight: 600 } }, title), children)
    }

    function RetentionField({ label, value, inherit, disabled, onChange }) {
      return h('label', { style: lifecycleLabel }, label,
        h('select', { style: lifecycleSelect, value, disabled, onChange: event => onChange(event.target.value) },
          inherit ? h('option', { value: 'inherit' }, 'Use global policy') : null,
          h('option', { value: 'forever' }, 'Keep forever'),
          ...lifecycleDurations.map(days => h('option', { key: days, value: days }, `${days} days`))))
    }

    function WorkspaceLifecycle({ services, useRemoteAccess }) {
      const settings = useSuiteRecord(services.settings, 'conversation-lifecycle', useRemoteAccess, services.connection)
      const workspace = suiteWatch(services.workspaces)
      const sessions = suiteWatch(services.sessions)
      const [scope, setScope] = React.useState('')
      const [proposal, setChange] = React.useState(null)
      const [previewAt, setPreviewAt] = React.useState(null)
      const record = settings.record
      const ready = workspace?.phase === 'ready' && sessions?.phase === 'ready'
      const workspaces = ready ? workspace.items : []
      const chosen = workspaces.find(item => item.workspaceId === scope)
      const change = proposal && proposal.source === settings.source &&
        (!proposal.workspaceId || chosen?.workspaceId === proposal.workspaceId) ? proposal : null
      React.useEffect(() => {
        if (proposal && !change) { setChange(null); setPreviewAt(null) }
      }, [proposal, change])
      const override = record?.overrides?.find(item => item.workspace === chosen?.workspaceId)?.retention ?? 'inherit'
      const memberships = new Map()
      for (const item of workspaces) for (const id of item.sessionIds ?? []) {
        if (memberships.has(id)) memberships.set(id, null)
        else memberships.set(id, item.workspaceId)
      }
      const archived = new Set(workspace?.archivedSessionIds ?? [])
      const protectedIds = new Set(record?.protectedIds ?? [])
      const rows = []
      let unknown = 0
      const selectedIds = chosen ? new Set(chosen.sessionIds ?? []) : null
      for (const [id, member] of memberships) {
        if (selectedIds && !selectedIds.has(id)) continue
        if (member === null) { unknown++; continue }
        const row = sessions.byId?.[id]
        if (!row) { unknown++; continue }
        const projection = sessions.projectionsBySession?.[id]?.values
        if (projection?.agentPreset === 'abinadwan-direct-chat' || row.agentPreset === 'abinadwan-direct-chat') continue
        const isActive = row.running !== false || row.agentAvailable === true ||
          Object.values(row.retainedBy ?? {}).some(count => count > 0)
        const examined = change?.next ?? record
        const days = examined?.overrides?.find(item => item.workspace === member)?.retention ?? examined?.retention
        // The installed Session Controller reports max(createdAt, lastPromptAt).
        // Count only known prompt-derived dates, never an unstarted Session's creation date.
        const summaryPrompt = Number.isFinite(row.createdAt) && row.updatedAt > row.createdAt ? row.updatedAt : undefined
        const lastPrompt = projection?.sessionListMetadata?.lastPromptAt ?? summaryPrompt
        const isProtected = protectedIds.has(id)
        const candidate = previewAt !== null && !isActive && !isProtected && lifecycleDurations.includes(days) &&
          Number.isFinite(lastPrompt) && lastPrompt > 0 && lastPrompt <= previewAt - Number(days) * 86400000
        rows.push({ id, row, isActive, isProtected, candidate })
      }
      const update = next => {
        setChange(null)
        setPreviewAt(null)
        void settings.save(next)
      }
      function propose(value, workspaceId) {
        if (!record) return
        const next = workspaceId ? { ...record, overrides: [...record.overrides.filter(row => row.workspace !== workspaceId),
          ...(value === 'inherit' ? [] : [{ workspace: workspaceId, retention: value }])] } : { ...record, retention: value }
        setChange({ value, workspaceId, next, source: settings.source })
        setPreviewAt(Date.now())
      }

      const candidates = rows.filter(row => row.candidate)
      const stats = [
        ['Known conversations', ready ? rows.length : 'Unavailable'],
        ['Archived', ready ? rows.filter(row => archived.has(row.id)).length : 'Unavailable'],
        ['Storage usage', 'Unavailable'],
      ]
      return h('section', { lang: 'en', dir: 'ltr', style: { padding: '8px 16px 20px', display: 'grid', gap: 16, minWidth: 0 } },
        h('header', null, h('h1', { style: { margin: '0 0 4px', fontSize: 18, lineHeight: 1.3 } }, 'Conversation Lifecycle'),
          h('p', { style: { ...lifecycleMuted, margin: 0 } }, 'Part of the ABINADWAN Plugins Suite.')),
        h(SuiteRecordStatus, { settings }),
        h(LifecycleGroup, { title: 'Overview' },
          h('label', { style: lifecycleLabel }, 'Workspace',
            h('select', { style: lifecycleSelect, value: chosen ? scope : '', disabled: !ready, onChange: event => {
              setScope(event.target.value)
              setChange(null)
              setPreviewAt(null)
            } }, h('option', { value: '' }, 'All Workspaces'),
            ...workspaces.map(item => h('option', { value: item.workspaceId, key: item.workspaceId, dir: 'auto' }, item.title)))),
          h('dl', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(112px, 1fr))', gap: 8, margin: 0 } },
            ...stats.map(([label, value]) => h('div', { key: label, style: { border: lifecycleRule, borderRadius: 8,
              padding: '8px 10px', background: 'var(--dsw-alias-settings-card-fill, Canvas)' } },
            h('dt', { style: lifecycleMuted }, label),
            h('dd', { style: { margin: '3px 0 0', fontSize: 14, fontWeight: 600 } }, value)))),
          unknown > 0 ? h('small', { style: lifecycleMuted }, `${unknown} unavailable or ambiguous`) : null),
        h(LifecycleGroup, { title: 'Retention Policy' },
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 } },
            h(RetentionField, { label: 'Global retention', value: change && !change.workspaceId ? change.value : record?.retention ?? '',
              disabled: !settings.writable, onChange: value => propose(value) }),
            chosen ? h(RetentionField, { label: 'Workspace override', inherit: true,
              value: change?.workspaceId === chosen.workspaceId ? change.value : override,
              disabled: !settings.writable, onChange: value => propose(value, chosen.workspaceId) }) : null),
          !chosen ? h('small', { style: lifecycleMuted }, 'Select a Workspace to set its own retention policy.') : null,
          change ? h('div', { style: lifecycleActions },
            h('span', { style: lifecycleMuted }, 'Save this policy for previews?'),
            h(Button, { size: 'sm', variant: 'primary', disabled: !settings.writable, onClick: () => update(change.next) },
              'Confirm and save'),
            h(Button, { size: 'sm', onClick: () => { setChange(null); setPreviewAt(null) } }, 'Cancel')) : null),
        h(LifecycleGroup, { title: 'Protected Conversations' },
          ready && rows.length ? h('ul', { style: { listStyle: 'none', padding: 0, margin: 0,
            maxBlockSize: 185, overflow: 'auto', overflowWrap: 'anywhere' } },
          ...rows.map(({ id, row, isProtected }) => h('li', { key: id, style: { ...lifecycleActions, minHeight: 32 } },
            h(Checkbox, { label: h(React.Fragment, null, 'Protect ', h('bdi', null, row.displayTitle || id)),
              checked: isProtected, disabled: !settings.writable,
              onChange: checked => update({ ...record, protectedIds: checked ? [...protectedIds, id] : [...protectedIds].filter(value => value !== id) }) }),
            archived.has(id) ? h('small', { style: lifecycleMuted }, 'Archived') : null))) :
            h('p', { style: { ...lifecycleMuted, margin: 0 } }, ready ? 'No known conversations in this view.' : 'Workspace inventory is unavailable.')),
        h(LifecycleGroup, { title: 'Cleanup Management' },
          h('strong', { style: { fontSize: 13 } }, 'Preview only'),
          h('p', { style: { ...lifecycleMuted, margin: 0 } },
            'Estimates use known last prompt dates. Active, protected, Direct Chat, and unverified conversations are excluded.'),
          h('p', { style: { ...lifecycleMuted, margin: 0 } },
            'Permanent deletion and automatic cleanup are unavailable.'),
          h('div', { style: lifecycleActions },
            h(Button, { size: 'sm', variant: 'outline', disabled: !record || !ready, onClick: () => setPreviewAt(Date.now()) }, 'Preview cleanup'),
            previewAt !== null ? h('span', { role: 'status', style: { fontSize: 13 } },
              `${candidates.length} estimated candidate${candidates.length === 1 ? '' : 's'}`) : null),
          candidates.length ? h('ul', { style: { margin: 0, paddingInlineStart: 20, fontSize: 13 } },
            ...candidates.map(({ id, row }) => h('li', { key: id }, h('bdi', null, row.displayTitle || id)))) : null))
    }

    function ReasoningComposer({ directory, sessionId, settingsService, connection, useRemoteAccess, useAccess }) {
      const settings = useSuiteRecord(settingsService, 'adaptive-reasoning', useRemoteAccess, connection)
      const directoryState = suiteWatch(directory.store)
      const canSelect = useAccess?.('session/selectModel') === true
      const [outcome, setOutcome] = React.useState(null)
      const [applying, setApplying] = React.useState(false)
      const inFlight = React.useRef(false)
      const selection = directoryState.current
      React.useEffect(() => { void directory.load().catch(() => {}) }, [directory])
      const supported = current => {
        if (!current) return null
        const snapshot = directory.store.getSnapshot()
        if (snapshot.status !== 'ready' || snapshot.routable !== true) return null
        const model = snapshot.groups.find(group => group.id === current.provider)?.models.find(model => model.id === current.model)
        return model?.reasoning
      }
      const reasoning = supported(selection)
      if (!selection || !reasoning?.efforts?.length) return null
      const effort = selection.reasoningEffort ?? reasoning.defaultEffort
      const preferences = settings.record?.preferences ?? []
      const isCurrentRoute = row => row.provider === selection.provider && row.model === selection.model
      const saved = preferences.find(isCurrentRoute)
      const savedSupported = reasoning.efforts.some(level => level.id === saved?.effort)
      function savePreference() {
        const current = directory.store.getSnapshot().current
        if (!current || !isCurrentRoute(current) || !canSelect || !settings.writable) return
        const live = supported(current)
        const choice = current.reasoningEffort ?? live?.defaultEffort
        if (!live?.efforts?.some(level => level.id === choice)) return
        void settings.save({ preferences: [...preferences.filter(row => !isCurrentRoute(row)),
          { provider: current.provider, model: current.model, effort: choice }] })
      }
      async function applyPreference() {
        const current = directory.store.getSnapshot().current
        if (inFlight.current || !canSelect || !current || !isCurrentRoute(current) ||
            !supported(current)?.efforts?.some(choice => choice.id === saved?.effort)) return
        inFlight.current = true
        setApplying(true)
        setOutcome(null)
        try {
          const endpoint = new URL('api/abinadwan-reasoning/effort', document.baseURI)
          if (endpoint.origin !== document.location.origin) throw new Error('Cross-origin reasoning endpoint')
          const selection = { provider: current.provider, model: current.model, reasoningEffort: saved.effort }
          const result = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', redirect: 'error',
            headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sessionId, ...selection }) })
          const response = await result.json()
          if (result.status === 409 && response?.error === 'session-unavailable') {
            setOutcome('unavailable')
            return
          }
          if (result.status === 409) settings.reload()
          const confirmed = response?.selected
          const applied = result.ok && confirmed?.provider === selection.provider && confirmed?.model === selection.model &&
            confirmed?.reasoningEffort === selection.reasoningEffort
          setOutcome(applied ? 'applied' : 'failed')
        } catch { setOutcome('failed') }
        finally { inFlight.current = false; setApplying(false) }
      }
      if (!canSelect) return null
      return h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' } },
        h('button', { type: 'button', style: suiteButton, disabled: !settings.writable || applying ||
          !reasoning.efforts.some(level => level.id === effort) || effort === saved?.effort, onClick: savePreference },
        suiteGlyph(reasoningIcon, 14), ' ',
        suiteText('Save model effort', 'حفظ مستوى النموذج')),
        saved ? h('button', { type: 'button', style: suiteButton, disabled: applying || !savedSupported ||
          saved.effort === effort || directoryState.pending != null, onClick: () => void applyPreference(),
          title: suiteText('Applies to this live conversation only.', 'يُطبّق على هذه المحادثة النشطة فقط.') },
        suiteText('Apply saved effort', 'تطبيق المستوى المحفوظ')) : null,
        saved && !savedSupported ? h('span', { role: 'status' }, suiteText('Saved effort unavailable for this model.', 'المستوى المحفوظ غير متاح لهذا النموذج.')) : null,
        outcome === 'unavailable' ? h('span', { role: 'status' }, suiteText(
          'Start or resume this chat before applying the saved effort.', 'ابدأ هذه المحادثة أو استأنفها قبل تطبيق المستوى المحفوظ.')) : null,
        outcome === 'applied' ? h('span', { role: 'status' }, suiteText('Effort applied.', 'تم تطبيق المستوى.')) : null,
        outcome === 'failed' ? h('span', { role: 'status' }, suiteText('Harness could not apply the effort.', 'تعذر تطبيق مستوى الاستدلال.')) : null,
        h(SuiteRecordStatus, { settings }))
    }

    const reasoningComposerPlugin = {
      inject: ['slots', 'remote', 'remote.settings', 'sessions', 'modelDirectories'],
      apply(ctx) {
        const settingsService = ctx.remote.settings
        const connection = suiteConnection(ctx)
        const modelDirectories = ctx.modelDirectories
        const sessions = ctx.sessions
        ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({ name: 'conversation.composer.dock',
          id: 'abinadwan-reasoning-preference', order: 25, inject: sessionId => ({
            directory: sessionId && !sessions.subagentAddress(sessionId) ? modelDirectories.directoryFor(sessionId) : null,
            sessionId,
          }) }, props => props.directory ? h(ReasoningComposer, { ...props, settingsService, connection }) : null))
      },
    }

    const lifecycleSettingsPlugin = {
      inject: ['slots', 'remote', 'remote.settings', 'sessions', 'workspaces'],
      apply(ctx) {
        const services = { settings: ctx.remote.settings, sessions: ctx.sessions.list, workspaces: ctx.workspaces.list,
          connection: suiteConnection(ctx) }
        const id = 'abinadwan-conversation-lifecycle'
        ctx.slots.inject('settings.section', () => ctx.slots.register({ name: 'settings.section',
          id, label: 'Conversation Lifecycle', order: 45 }, props => h(WorkspaceLifecycle, { ...props, services })))
        ctx.slots.inject('settings.section.icon', () => ctx.slots.register({ name: 'settings.section.icon', id },
          ({ size }) => suiteGlyph(lifecycleIcon, size)))
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
            [TYPE + '/conversation-lifecycle', lifecycleSettingsPlugin],
            [TYPE + '/adaptive-reasoning', reasoningComposerPlugin],
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
