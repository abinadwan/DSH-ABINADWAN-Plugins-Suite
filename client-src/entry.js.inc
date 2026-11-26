    // Root-owned locale registration is independent of the Host Components.
    // Requiring only the official locale service keeps a missing service from
    // disabling Environment & Context or the other suite capabilities.
    const arabicLocalePlugin = {
      inject: ['locale'],
      apply(ctx) {
        ctx.effect(() => {
          const locale = ctx.locale
          if (typeof locale?.addLanguage !== 'function' || typeof locale?.register !== 'function') {
            console.warn('[abinadwan-suite] Arabic UI locale requires the official DSH locale catalog API')
            return
          }
          const disposers = []
          const occupied = error => /occupied|already/i.test(String(error?.message || error))
          try {
            // Do not call setLocale: this only makes Arabic an available option.
            try {
              const dispose = locale.addLanguage({ id: 'ar', label: 'العربية', fallback: 'en' })
              if (typeof dispose === 'function') disposers.push(dispose)
            } catch (error) {
              if (!occupied(error)) throw error
            }
            for (const [namespace, dictionary] of Object.entries(ARABIC_UI_DICTIONARIES)) {
              try {
                const dispose = locale.register(namespace, 'ar', dictionary)
                if (typeof dispose === 'function') disposers.push(dispose)
              } catch (error) {
                // Other installed Arabic packs may already own a namespace.
                if (!occupied(error)) throw error
              }
            }
          } catch (error) {
            for (const dispose of disposers.reverse()) {
              try { dispose() } catch { console.warn('[abinadwan-suite] Arabic locale cleanup failed') }
            }
            throw error
          }
          return () => {
            // Unregister dictionaries before the language itself on suite unload.
            for (const dispose of disposers.reverse()) {
              try { dispose() } catch { console.warn('[abinadwan-suite] Arabic locale cleanup failed') }
            }
          }
        }, 'suite: Arabic UI language registration')
      },
    }
    return {

      // `remote.pluginManager` is its own Cordis service (one per Remote
      // namespace). It must be injected here: Cordis 4 throws "cannot get
      // property without inject" when an un-injected namespace is read.
      inject: ['slots', 'remote', 'remote.pluginManager', 'remoteAccess'],
      apply(ctx) {
        // The Arabic option is registered at suite scope, independently of Components.
        // Registration only: the selected DSH interface language is unchanged.
        ctx.effect(() => {
          const fiber = ctx.plugin(arabicLocalePlugin)
          return () => fiber.dispose()
        }, 'suite: bundled Arabic locale')
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
            [TYPE + '/direct-chat', directChatPlugin],
            [TYPE + '/conversation-lifecycle', archiveManagerPlugin],
            [TYPE + '/adaptive-reasoning', reasoningComposerPlugin],
          ]
          async function refresh() {
            const request = ++generation
            let rows
            try {
              rows = remoteValue(await pluginManager.listPlugins(), 'Plugin inventory')
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
            }).catch(() => {
              console.warn('[abinadwan-suite] Component UI transition failed')
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
