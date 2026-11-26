    // Only stable published GitHub Releases may trigger an in-app update offer.
    // This browser-side checker never installs anything without a separate click.
    const INSTALLED_VERSION = '1.2.0'
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
      'My Profile settings are stored in this Harness Profile\'s configuration and uninstalling may remove them. If you use My Profile, first export a JSON backup from My Profile → Backup & Restore (it includes your saved access permissions and is not encrypted). If the pinned install fails, reinstall from the same spec or from the original source.',
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

