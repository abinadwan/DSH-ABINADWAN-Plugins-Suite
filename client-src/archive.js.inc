    const archiveCopy = {
      en: {
        title: 'Archived Conversations', navigation: 'Archives',
        protect: 'Protect', protectWorkspace: 'Protect Workspace', manageProtection: 'Manage saved protection',
        protectionScope: 'Protection applies to Archive Manager restore and supported Direct Chat rename actions only, not native DSH actions.',
        inherited: 'Protected by Workspace', protectedCount: n => `${n} protected`,
        sidebar: 'For the DSH sidebar, use View options → Hide archived.',
        history: 'Restore a conversation before opening it in DSH.',
        count: n => `${n} archived conversation${n === 1 ? '' : 's'}`,
        loading: 'Loading archived conversations…', empty: 'No archived conversations.',
        noResults: 'No matching archived conversations.', unauthorized: 'You do not have access to archived conversations.',
        disconnected: 'Host disconnected.', unavailable: 'Archive catalog unavailable.', error: 'Could not load the archive catalog.',
        search: 'Search archived conversations', workspace: 'Workspace', workspaces: 'All Workspaces', sort: 'Sort by',
        newest: 'Newest', oldest: 'Oldest', name: 'Name', protection: 'Protection', pinned: 'Pinned',
        any: 'Any', yes: 'Yes', no: 'No', after: 'Updated on or after', updated: 'Last updated',
        protected: 'Protected', untitled: 'Untitled conversation', close: 'Close', more: 'Show more', refresh: 'Refresh archive',
        restore: 'Restore', confirm: 'Confirm restore', cancel: 'Cancel',
        prompt: 'Restore this conversation to the DSH conversation list?', working: 'Restoring conversation…',
        restored: 'Conversation restored.', failed: 'Could not restore the conversation.',
        changed: 'The conversation or your access changed. Review the list and try again.',
      },
      ar: {
        title: 'المحادثات المؤرشفة', navigation: 'الأرشيف',
        protect: 'حماية', protectWorkspace: 'حماية مساحة العمل', manageProtection: 'إدارة الحماية المحفوظة',
        protectionScope: 'تطبق الحماية على الاستعادة في إدارة الأرشيف وإعادة التسمية المدعومة في الدردشة المباشرة فقط، وليس إجراءات DSH الأصلية.',
        inherited: 'محمية بواسطة مساحة العمل', protectedCount: n => `المحمية: ${n.toLocaleString('ar')}`,
        sidebar: 'للشريط الجانبي في DSH، اختر خيارات العرض ← إخفاء المؤرشفة.',
        history: 'استعد المحادثة قبل فتحها في DSH.', count: n => `المحادثات المؤرشفة: ${n.toLocaleString('ar')}`,
        loading: 'جارٍ تحميل المحادثات المؤرشفة…', empty: 'ما فيه محادثات مؤرشفة.',
        noResults: 'ما فيه محادثات مؤرشفة تطابق البحث.', unauthorized: 'ما عندك صلاحية عرض المحادثات المؤرشفة.',
        disconnected: 'انقطع الاتصال بالمضيف.', unavailable: 'فهرس المحادثات المؤرشفة غير متاح.', error: 'تعذّر تحميل فهرس الأرشيف.',
        search: 'البحث في المحادثات المؤرشفة', workspace: 'مساحة العمل', workspaces: 'كل مساحات العمل', sort: 'الترتيب حسب',
        newest: 'الأحدث', oldest: 'الأقدم', name: 'الاسم', protection: 'الحماية', pinned: 'التثبيت',
        any: 'الكل', yes: 'نعم', no: 'لا', after: 'آخر تحديث من تاريخ', updated: 'آخر تحديث',
        protected: 'محمية', untitled: 'محادثة بلا عنوان', close: 'إغلاق', more: 'عرض المزيد', refresh: 'تحديث الأرشيف',
        restore: 'استعادة', confirm: 'تأكيد الاستعادة', cancel: 'إلغاء',
        prompt: 'تبي تستعيد هالمحادثة لقائمة المحادثات في DSH؟', working: 'جارٍ استعادة المحادثة…',
        restored: 'تمت استعادة المحادثة.', failed: 'تعذّرت استعادة المحادثة.',
        changed: 'تغيّرت المحادثة أو صلاحيتك. راجع القائمة وحاول مرة ثانية.',
      },
      zh: {
        title: "已归档的会话",
        navigation: "归档",
        protect: "保护",
        protectWorkspace: "保护工作区",
        manageProtection: "管理已保存的保护设置",
        protectionScope: "保护仅适用于归档管理器的恢复和直接聊天支持的重命名操作，不适用于 DSH 原生操作。",
        inherited: "由工作区保护",
        protectedCount: n => "受保护：{n}".replace('{n}', n.toLocaleString('zh')),
        sidebar: "在 DSH 侧边栏中，使用显示选项 → 隐藏已归档。",
        history: "请先恢复会话，再在 DSH 中打开。",
        count: n => "已归档会话：{n}".replace('{n}', n.toLocaleString('zh')),
        loading: "正在加载已归档会话…",
        empty: "没有已归档的会话。",
        noResults: "没有匹配的已归档会话。",
        unauthorized: "您无权访问已归档会话。",
        disconnected: "主机已断开连接。",
        unavailable: "归档目录不可用。",
        error: "无法加载归档目录。",
        search: "搜索已归档会话",
        workspace: "工作区",
        workspaces: "所有工作区",
        sort: "排序依据",
        newest: "最新",
        oldest: "最早",
        name: "名称",
        protection: "保护",
        pinned: "置顶",
        any: "不限",
        yes: "是",
        no: "否",
        after: "更新日期不早于",
        updated: "最后更新",
        protected: "受保护",
        untitled: "无标题会话",
        close: "关闭",
        more: "显示更多",
        refresh: "刷新归档",
        restore: "恢复",
        confirm: "确认恢复",
        cancel: "取消",
        prompt: "将此会话恢复到 DSH 会话列表？",
        working: "正在恢复会话…",
        restored: "会话已恢复。",
        failed: "无法恢复会话。",
        changed: "会话或访问权限已变更。请检查列表后重试。",
      },
      es: {
        title: "Conversaciones archivadas",
        navigation: "Archivo",
        protect: "Proteger",
        protectWorkspace: "Proteger espacio de trabajo",
        manageProtection: "Gestionar protección guardada",
        protectionScope: "La protección solo se aplica a la restauración del gestor de archivos y al cambio de nombre compatible del chat directo, no a las acciones nativas de DSH.",
        inherited: "Protegida por el espacio de trabajo",
        protectedCount: n => "Protegidas: {n}".replace('{n}', n.toLocaleString('es')),
        sidebar: "En la barra lateral de DSH, usa Opciones de vista → Ocultar archivadas.",
        history: "Restaura la conversación antes de abrirla en DSH.",
        count: n => "Conversaciones archivadas: {n}".replace('{n}', n.toLocaleString('es')),
        loading: "Cargando conversaciones archivadas…",
        empty: "No hay conversaciones archivadas.",
        noResults: "No hay conversaciones archivadas que coincidan.",
        unauthorized: "No tienes acceso a las conversaciones archivadas.",
        disconnected: "Host desconectado.",
        unavailable: "El catálogo de archivos no está disponible.",
        error: "No se pudo cargar el catálogo de archivos.",
        search: "Buscar conversaciones archivadas",
        workspace: "Espacio de trabajo",
        workspaces: "Todos los espacios de trabajo",
        sort: "Ordenar por",
        newest: "Más recientes",
        oldest: "Más antiguas",
        name: "Nombre",
        protection: "Protección",
        pinned: "Fijadas",
        any: "Cualquiera",
        yes: "Sí",
        no: "No",
        after: "Actualizadas desde",
        updated: "Última actualización",
        protected: "Protegida",
        untitled: "Conversación sin título",
        close: "Cerrar",
        more: "Mostrar más",
        refresh: "Actualizar archivo",
        restore: "Restaurar",
        confirm: "Confirmar restauración",
        cancel: "Cancelar",
        prompt: "¿Restaurar esta conversación a la lista de conversaciones de DSH?",
        working: "Restaurando conversación…",
        restored: "Conversación restaurada.",
        failed: "No se pudo restaurar la conversación.",
        changed: "La conversación o tu acceso han cambiado. Revisa la lista y vuelve a intentarlo.",
      },
      fr: {
        title: "Conversations archivées",
        navigation: "Archives",
        protect: "Protéger",
        protectWorkspace: "Protéger l’espace de travail",
        manageProtection: "Gérer la protection enregistrée",
        protectionScope: "La protection concerne uniquement la restauration dans le gestionnaire d’archives et le renommage pris en charge dans le chat direct, pas les actions natives de DSH.",
        inherited: "Protégée par l’espace de travail",
        protectedCount: n => "Protégées : {n}".replace('{n}', n.toLocaleString('fr')),
        sidebar: "Dans la barre latérale de DSH, utilisez Options d’affichage → Masquer les archives.",
        history: "Restaurez la conversation avant de l’ouvrir dans DSH.",
        count: n => "Conversations archivées : {n}".replace('{n}', n.toLocaleString('fr')),
        loading: "Chargement des conversations archivées…",
        empty: "Aucune conversation archivée.",
        noResults: "Aucune conversation archivée correspondante.",
        unauthorized: "Vous n’avez pas accès aux conversations archivées.",
        disconnected: "Hôte déconnecté.",
        unavailable: "Catalogue des archives indisponible.",
        error: "Impossible de charger le catalogue des archives.",
        search: "Rechercher les conversations archivées",
        workspace: "Espace de travail",
        workspaces: "Tous les espaces de travail",
        sort: "Trier par",
        newest: "Plus récentes",
        oldest: "Plus anciennes",
        name: "Nom",
        protection: "Protection",
        pinned: "Épinglées",
        any: "Tous",
        yes: "Oui",
        no: "Non",
        after: "Mises à jour depuis",
        updated: "Dernière mise à jour",
        protected: "Protégée",
        untitled: "Conversation sans titre",
        close: "Fermer",
        more: "Afficher plus",
        refresh: "Actualiser les archives",
        restore: "Restaurer",
        confirm: "Confirmer la restauration",
        cancel: "Annuler",
        prompt: "Restaurer cette conversation dans la liste des conversations DSH ?",
        working: "Restauration de la conversation…",
        restored: "Conversation restaurée.",
        failed: "Impossible de restaurer la conversation.",
        changed: "La conversation ou vos droits d’accès ont changé. Vérifiez la liste et réessayez.",
      },
      de: {
        title: "Archivierte Unterhaltungen",
        navigation: "Archiv",
        protect: "Schützen",
        protectWorkspace: "Arbeitsbereich schützen",
        manageProtection: "Gespeicherten Schutz verwalten",
        protectionScope: "Der Schutz gilt nur für Wiederherstellungen im Archivmanager und unterstützte Umbenennungen im Direktchat, nicht für native DSH-Aktionen.",
        inherited: "Durch Arbeitsbereich geschützt",
        protectedCount: n => "Geschützt: {n}".replace('{n}', n.toLocaleString('de')),
        sidebar: "In der DSH-Seitenleiste: Ansichtsoptionen → Archivierte ausblenden.",
        history: "Stellen Sie die Unterhaltung vor dem Öffnen in DSH wieder her.",
        count: n => "Archivierte Unterhaltungen: {n}".replace('{n}', n.toLocaleString('de')),
        loading: "Archivierte Unterhaltungen werden geladen…",
        empty: "Keine archivierten Unterhaltungen.",
        noResults: "Keine passenden archivierten Unterhaltungen.",
        unauthorized: "Sie haben keinen Zugriff auf archivierte Unterhaltungen.",
        disconnected: "Host getrennt.",
        unavailable: "Archivkatalog nicht verfügbar.",
        error: "Archivkatalog konnte nicht geladen werden.",
        search: "Archivierte Unterhaltungen durchsuchen",
        workspace: "Arbeitsbereich",
        workspaces: "Alle Arbeitsbereiche",
        sort: "Sortieren nach",
        newest: "Neueste",
        oldest: "Älteste",
        name: "Name",
        protection: "Schutz",
        pinned: "Angeheftet",
        any: "Beliebig",
        yes: "Ja",
        no: "Nein",
        after: "Aktualisiert ab",
        updated: "Zuletzt aktualisiert",
        protected: "Geschützt",
        untitled: "Unterhaltung ohne Titel",
        close: "Schließen",
        more: "Mehr anzeigen",
        refresh: "Archiv aktualisieren",
        restore: "Wiederherstellen",
        confirm: "Wiederherstellung bestätigen",
        cancel: "Abbrechen",
        prompt: "Diese Unterhaltung in der DSH-Unterhaltungsliste wiederherstellen?",
        working: "Unterhaltung wird wiederhergestellt…",
        restored: "Unterhaltung wiederhergestellt.",
        failed: "Unterhaltung konnte nicht wiederhergestellt werden.",
        changed: "Die Unterhaltung oder Ihre Zugriffsrechte haben sich geändert. Prüfen Sie die Liste und versuchen Sie es erneut.",
      },
      ja: {
        title: "アーカイブ済みの会話",
        navigation: "アーカイブ",
        protect: "保護",
        protectWorkspace: "ワークスペースを保護",
        manageProtection: "保存済みの保護設定を管理",
        protectionScope: "保護はアーカイブ管理の復元とダイレクトチャットで対応する名前変更のみに適用され、DSH の標準操作には適用されません。",
        inherited: "ワークスペースによって保護済み",
        protectedCount: n => "保護済み：{n}".replace('{n}', n.toLocaleString('ja')),
        sidebar: "DSH のサイドバーでは表示オプション → アーカイブ済みを非表示にしてください。",
        history: "DSH で開く前に会話を復元してください。",
        count: n => "アーカイブ済みの会話：{n}".replace('{n}', n.toLocaleString('ja')),
        loading: "アーカイブ済みの会話を読み込み中…",
        empty: "アーカイブ済みの会話はありません。",
        noResults: "一致するアーカイブ済みの会話がありません。",
        unauthorized: "アーカイブ済みの会話へのアクセス権がありません。",
        disconnected: "ホストとの接続が切れました。",
        unavailable: "アーカイブカタログは利用できません。",
        error: "アーカイブカタログを読み込めませんでした。",
        search: "アーカイブ済みの会話を検索",
        workspace: "ワークスペース",
        workspaces: "すべてのワークスペース",
        sort: "並べ替え",
        newest: "新しい順",
        oldest: "古い順",
        name: "名前",
        protection: "保護",
        pinned: "ピン留め",
        any: "すべて",
        yes: "はい",
        no: "いいえ",
        after: "指定日以降に更新",
        updated: "最終更新",
        protected: "保護済み",
        untitled: "無題の会話",
        close: "閉じる",
        more: "さらに表示",
        refresh: "アーカイブを更新",
        restore: "復元",
        confirm: "復元を確認",
        cancel: "キャンセル",
        prompt: "この会話を DSH の会話一覧に復元しますか？",
        working: "会話を復元中…",
        restored: "会話を復元しました。",
        failed: "会話を復元できませんでした。",
        changed: "会話またはアクセス権が変更されました。一覧を確認して再試行してください。",
      },
    }

    const restoreEndpoint = 'workspace/unarchiveSession'
    const archivePageSize = 25
    const validArchiveId = id => typeof id === 'string' && id.trim().length > 0
    const validArchiveSet = ids => Array.isArray(ids) && ids.every(validArchiveId)
    const validArchiveProtectionRecord = record => Boolean(record && typeof record === 'object' &&
      !Array.isArray(record) && validArchiveSet(record.protectedIds) && record.protectedIds.length <= 10000 &&
      validArchiveSet(record.protectedWorkspaces) && record.protectedWorkspaces.length <= 1000 &&
      [...record.protectedIds, ...record.protectedWorkspaces].every(id => id.length <= 256))
    function archivePolicyView(response) {
      if (!response?.ok || !Array.isArray(response.value?.namespaces)) return null
      const matches = response.value.namespaces.filter(view => view?.ns === 'abinadwan-conversation-lifecycle')
      const view = matches.length === 1 ? suiteSettingsView(matches[0]) : null
      return validArchiveProtectionRecord(view?.value?.record) ? view : null
    }
    const titleOrEmpty = value => typeof value === 'string' ? value : ''

    async function readArchiveWorkspaceBaseline(workspaceRemote, signal) {
      for await (const frame of workspaceRemote.follow(signal)) {
        // Returning from the first frame releases the native stream handle.
        return frame.type === 'baseline' ? frame.value : undefined
      }
      return undefined
    }

    async function readArchiveCatalog(services, localSessions, signal) {
      const [workspaces, response] = await Promise.all([
        readArchiveWorkspaceBaseline(services.workspaceRemote, signal), services.sessionRemote.list({}, signal),
      ])
      signal.throwIfAborted()
      if (!response?.ok) return { status: response?.error?.code === 'remote-access/denied' ? 'unauthorized' : 'error' }
      const items = response.value?.items
      if (!workspaces || !Array.isArray(items)) return { status: 'unavailable' }
      const workspace = { ...workspaces, phase: 'ready', state: 'idle' }
      const byId = Object.create(null)
      const duplicates = new Set()
      for (const item of items) {
        const id = item?.sessionId
        if (!validArchiveId(id)) continue
        if (Object.hasOwn(byId, id)) { duplicates.add(id); continue }
        const projectionValues = item.projections?.values
        // Only the fresh Host response supplies identities, titles and dates.
        // Retention leases from the local model can only exclude a mutation.
        const retainedBy = Object.hasOwn(localSessions?.byId ?? {}, id) ? localSessions.byId[id]?.retainedBy : undefined
        byId[id] = { id, displayTitle: titleOrEmpty(projectionValues?.title).trim(), projectionValues,
          updatedAt: item.updatedAt, running: item.running, origin: item.origin, blank: item.blank,
          formatStatus: item.formatStatus, agentPreset: projectionValues?.agentPreset, retainedBy }
      }
      for (const id of duplicates) delete byId[id]
      const sessions = { phase: 'ready', ids: Object.keys(byId), byId }
      if (!catalogReady(workspace, sessions) || !validArchiveSet(workspace.archivedSessionIds) ||
          !validArchiveSet(workspace.pinnedSessionIds)) return { status: 'unavailable' }
      return { status: 'ready', workspace, sessions }
    }

    function useArchiveCatalog(services, generation, authorized) {
      const [result, setResult] = React.useState(null)
      const [attempt, setAttempt] = React.useState(0)
      const revision = React.useRef(0)
      React.useEffect(() => {
        if (!generation || !authorized) { setResult(null); return }
        const request = new AbortController()
        const active = AbortSignal.any([request.signal, services.lifetime])
        let dirty = false
        let reading = false
        async function refresh() {
          if (active.aborted || services.host.getSnapshot() !== generation) return
          dirty = true
          revision.current++
          // Preserve the last authorized view and search focus during refresh,
          // but invalidate every action based on its now superseded snapshot.
          setResult(previous => previous ? { ...previous } : previous)
          if (reading) return
          reading = true
          while (dirty && !active.aborted && services.host.getSnapshot() === generation) {
            dirty = false
            const readVersion = revision.current
            const read = new AbortController()
            const deadline = AbortSignal.any([active, read.signal, AbortSignal.timeout(12000)])
            let catalog
            try {
              catalog = await readArchiveCatalog(services, services.sessions.getSnapshot(), deadline)
            } catch (error) {
              catalog = { status: error?.code === 'remote-access/denied' ? 'unauthorized' : 'error' }
            } finally { read.abort() }
            if (!dirty && revision.current === readVersion && !active.aborted &&
                services.host.getSnapshot() === generation) setResult({ generation, attempt, catalog, revision: readVersion })
          }
          reading = false
        }
        // The native lists signal changes. A fresh same-generation read owns
        // metadata, so unrelated increments never clear the current controls.
        const unsubscribeWorkspaces = services.workspaces.subscribe(() => { void refresh() })
        const unsubscribeSessions = services.sessions.subscribe(() => { void refresh() })
        void refresh()
        return () => { revision.current++; request.abort(); unsubscribeWorkspaces(); unsubscribeSessions() }
      }, [services, generation, authorized, attempt])
      const current = authorized && result && result.generation === generation && result.attempt === attempt
      const isCurrent = () => Boolean(current && result.catalog.status === 'ready' &&
        result.revision === revision.current && !services.lifetime.aborted && services.host.getSnapshot() === generation)
      return { ...(current ? result.catalog : { status: 'loading' }), isCurrent,
        reload: () => { revision.current++; setAttempt(value => value + 1) } }
    }

    function archiveInventory(workspaces, sessions, record, admittedRows = conversationInventory(workspaces, sessions, null).rows) {
      const archived = new Set(workspaces.archivedSessionIds)
      const pinned = new Set(workspaces.pinnedSessionIds)
      const protectedIds = new Set(record.protectedIds)
      const protectedWorkspaces = new Set(record.protectedWorkspaces)
      const duplicateWorkspaces = new Set()
      const keys = new Set()
      for (const { workspaceId } of workspaces.items) {
        if (keys.has(workspaceId)) duplicateWorkspaces.add(workspaceId)
        keys.add(workspaceId)
      }
      return admittedRows
        .filter(({ id, owner, legacyDirectChat }) => archived.has(id) && !legacyDirectChat && !duplicateWorkspaces.has(owner.workspaceId))
        .map(item => {
          const { id, row, owner, searchTitle } = item
          const updatedAt = Number.isSafeInteger(row.updatedAt) && row.updatedAt > 0 && row.updatedAt <= 8640000000000000
            ? row.updatedAt : undefined
          return { ...item, title: searchTitle || titleOrEmpty(row.displayTitle), workspaceTitle: titleOrEmpty(owner.title),
            updatedAt, pinned: pinned.has(id), individuallyProtected: protectedIds.has(id),
            workspaceProtected: protectedWorkspaces.has(owner.workspaceId), protected: protectedIds.has(id) || protectedWorkspaces.has(owner.workspaceId) }
        })
    }

    function filterArchive(rows, filters, language) {
      const normalize = text => text.normalize('NFC').toLocaleLowerCase(language)
      const query = normalize(filters.search.trim())
      const cutoff = filters.after ? new Date(`${filters.after}T00:00:00`).getTime() : null
      const matching = rows.filter(row => (!filters.workspace || filters.workspace === row.owner.workspaceId) &&
        (filters.protection === 'all' || row.protected === (filters.protection === 'yes')) &&
        (filters.pin === 'all' || row.pinned === (filters.pin === 'yes')) &&
        (cutoff === null || row.updatedAt >= cutoff) &&
        (!query || [row.title, row.workspaceTitle].some(text => normalize(text).includes(query))))
      const collator = new Intl.Collator(language, { numeric: true, sensitivity: 'base' })
      const names = (a, b) => collator.compare(a.title, b.title)
      const dates = (a, b) => {
        if (a.updatedAt == null || b.updatedAt == null) return Number(a.updatedAt == null) - Number(b.updatedAt == null)
        return filters.sort === 'oldest' ? a.updatedAt - b.updatedAt : b.updatedAt - a.updatedAt
      }
      return matching.sort((a, b) => (filters.sort === 'workspace' ? collator.compare(a.workspaceTitle, b.workspaceTitle) || names(a, b)
        : filters.sort === 'name' ? names(a, b) : dates(a, b)) || names(a, b) || a.id.localeCompare(b.id))
    }

    function ArchiveSelect({ label, value, onChange, options }) {
      return h('label', { style: lifecycleLabel }, label,
        h('select', { value, style: lifecycleSelect, onChange: event => onChange(event.target.value) },
          ...options.map(([id, text]) => h('option', { key: id, value: id, dir: 'auto' }, text))))
    }

    const archiveRestorable = row => row && !row.protected && !row.pinned && row.row.running === false &&
      !Object.values(row.row.retainedBy ?? {}).some(count => count > 0) && row.row.formatStatus !== 'migration-required'

    function ArchiveRow({ row, copy, date, services, busy, onRestore, canProtect, onProtect }) {
      const [allowed, setAllowed] = React.useState(false)
      const eligible = archiveRestorable(row) && Boolean(services.unarchive)
      React.useEffect(() => {
        if (!services.unarchive || !services.whenRestoreAccess) return
        let active = true
        const dispose = services.whenRestoreAccess(row.id, () => {
          setAllowed(true)
          return () => { if (active) setAllowed(false) }
        })
        return () => { active = false; dispose?.() }
      }, [services, row.id])
      return h('li', { style: { ...lifecycleActions, justifyContent: 'space-between', paddingBlock: 8, borderBlockEnd: lifecycleRule } },
        h('div', { style: { display: 'grid', gap: 2, minWidth: 0 } },
          h('strong', null, h('bdi', null, row.title || copy.untitled)),
          h('bdi', { style: lifecycleMuted }, row.workspaceTitle),
          row.updatedAt ? h('small', { style: lifecycleMuted }, `${copy.updated}: `,
            h('time', { dateTime: new Date(row.updatedAt).toISOString() }, date.format(row.updatedAt))) : null,
          row.protected || row.pinned ? h('small', { style: lifecycleMuted },
            [row.protected && copy.protected, row.pinned && copy.pinned].filter(Boolean).join(' · ')) : null),
        h('div', { style: lifecycleActions },
          h(Checkbox, { label: `${copy.protect} ${row.title || copy.untitled}`, checked: row.individuallyProtected,
            disabled: !canProtect, onChange: checked => onProtect(row.id, checked) }),
          row.workspaceProtected ? h('small', { style: lifecycleMuted }, copy.inherited) : null,
          services.unarchive ? h(Button, { size: 'sm', disabled: !eligible || !allowed || busy,
            'aria-label': `${copy.restore} ${row.title || copy.untitled}`, onClick: event => onRestore(row, event.currentTarget) }, copy.restore) : null))
    }

    function ArchiveHub({ services, catalog, settings, generation, authorized, language }) {
      const copy = archiveCopy[language]
      const [filters, setFilters] = React.useState({ search: '', workspace: '', protection: 'all', pin: 'all', after: '', sort: 'newest' })
      const [limit, setLimit] = React.useState(archivePageSize)
      const [proposal, setProposal] = React.useState(null)
      const [status, setStatus] = React.useState(null)
      const confirmation = React.useRef(null)
      const summary = React.useRef(null)
      const pending = React.useRef(null)
      const mounted = React.useRef(false)
      const latest = React.useRef(null)
      const settingsEpoch = services.connection.getSnapshot()
      const policyCurrent = ['ready', 'saved'].includes(settings.status)
      const resultState = !authorized ? 'unauthorized' : !generation ? 'disconnected'
        : catalog.status !== 'ready' ? catalog.status : settings.status === 'loading' ? 'loading'
        : !validArchiveProtectionRecord(settings.record) ? 'unavailable' : 'ready'
      latest.current = { authorized, generation, source: settings.source }
      const actionCurrent = () => mounted.current && !services.lifetime.aborted &&
        latest.current.authorized && latest.current.generation === generation &&
        latest.current.source === settings.source && catalog.isCurrent() &&
        services.host.getSnapshot() === generation && services.connection.getSnapshot() === settingsEpoch
      const visible = resultState === 'ready' ? catalog.rows : []
      const matching = filterArchive(visible, filters, language)
      const workspaces = [...new Map(visible.map(row => [row.owner.workspaceId, row.workspaceTitle])).entries()]
        .sort((a, b) => a[1].localeCompare(b[1], language))
      const confirming = resultState === 'ready' && catalog.isCurrent() && policyCurrent && proposal?.generation === generation && proposal.source === settings.source &&
        matching.some(row => row.id === proposal.id && row.owner.workspaceId === proposal.workspaceId && archiveRestorable(row)) ? proposal : null
      const busy = status?.generation === generation && status?.value === 'working'
      const message = resultState === 'ready' && status?.generation === generation ? status?.value : null
      const date = new Intl.DateTimeFormat(language, { dateStyle: 'medium' })
      const picks = [['all', copy.any], ['yes', copy.yes], ['no', copy.no]]

      React.useEffect(() => {
        mounted.current = true
        return () => { mounted.current = false; pending.current?.abort() }
      }, [])
      React.useEffect(() => {
        if (confirming) confirmation.current?.focus()
        else if (proposal) setProposal(null)
      }, [confirming, proposal])

      const canProtect = resultState === 'ready' && catalog.isCurrent() && Boolean(settings.writable) && !busy
      function changeProtection(field, id, checked) {
        if (!canProtect || pending.current || !actionCurrent()) return
        const admitted = field === 'protectedIds'
          ? visible.some(row => row.id === id) || catalog.savedRows.some(row => row.id === id)
          : field === 'protectedWorkspaces' && catalog.protectionWorkspaces.some(row => row.workspaceId === id)
        if (!admitted) return
        const next = new Set(settings.record[field] ?? [])
        if (checked) next.add(id)
        else next.delete(id)
        setProposal(null)
        // Keep every retired compatibility field and all other protection flags.
        const record = { ...settings.record, [field]: [...next] }
        if (validArchiveProtectionRecord(record)) void settings.save(record)
      }

      function updateFilter(key, value) {
        setFilters(previous => ({ ...previous, [key]: value }))
        setLimit(archivePageSize)
      }

      async function restore() {
        if (!actionCurrent() || !confirming || pending.current || !services.unarchive || !services.whenRestoreAccess) return
        const currentGeneration = () => services.host.getSnapshot() === generation
        const request = new AbortController()
        pending.current = request
        setProposal(null)
        summary.current?.focus()
        setStatus({ generation, value: 'working' })
        let outcome = 'changed'
        try {
          if (!actionCurrent()) return
          const signal = AbortSignal.any([request.signal, services.lifetime, AbortSignal.timeout(12000)])
          signal.throwIfAborted()
          const aborted = new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }))
          const catalog = await Promise.race([readArchiveCatalog(services, services.sessions.getSnapshot(), signal), aborted])
          if (signal.aborted || !actionCurrent() || catalog.status !== 'ready') return
          // A protection update can land during the catalog read before its
          // document notification arrives. Read the policy after that lookup.
          const policy = await Promise.race([services.settings.describe(), aborted])
          if (signal.aborted || !actionCurrent()) return
          const view = archivePolicyView(policy)
          if (!view || view.revision !== confirming.source.revision) { settings.reload(); return }
          const target = row => row.id === confirming.id && row.owner.workspaceId === confirming.workspaceId
          const candidate = archiveInventory(catalog.workspace, catalog.sessions, view.value.record).find(target)
          const currentSessions = services.sessions.getSnapshot()
          const currentWorkspace = services.workspaces.getSnapshot()
          if (!catalogReady(currentWorkspace, currentSessions) || !validArchiveSet(currentWorkspace.archivedSessionIds) ||
              !validArchiveSet(currentWorkspace.pinnedSessionIds)) return
          const currentCandidate = archiveInventory(currentWorkspace, currentSessions, view.value.record).find(target)
          if (!archiveRestorable(candidate) || !archiveRestorable(currentCandidate)) return
          let allowed = false
          const dispose = services.whenRestoreAccess(confirming.id, () => { allowed = true; return [] })
          dispose()
          if (!allowed || signal.aborted || !actionCurrent()) return
          await services.unarchive(confirming.id)
          outcome = 'restored'
        } catch {
          outcome = 'failed'
        } finally {
          request.abort()
          if (pending.current === request) pending.current = null
          if (mounted.current && currentGeneration()) setStatus({ generation, value: outcome })
        }
      }

      return h('section', { 'data-chat-control-archive': '', 'aria-label': copy.title,
        style: { height: '100%', minHeight: 0, minWidth: 0, overflow: 'auto', boxSizing: 'border-box',
          padding: 'max(24px, var(--dsh-frame-top-clearance, 0px)) 24px 32px' } },
      h('div', { lang: language, dir: language === 'ar' ? 'rtl' : 'ltr',
        style: { display: 'grid', gap: 16, minWidth: 0, maxWidth: 1120, marginInline: 'auto', overflowWrap: 'anywhere' } },
        h('h1', { style: { margin: 0, fontSize: 24, fontWeight: 600 } }, copy.title),
        resultState !== 'ready' ? h(React.Fragment, null,
          h('p', { role: resultState === 'error' ? 'alert' : 'status' }, copy[resultState]),
          ['error', 'unavailable'].includes(resultState) ? h(Button, { size: 'sm', onClick: () => {
            settings.reload()
            catalog.reload()
          } }, copy.refresh) : null) :
          h(React.Fragment, null,
            h('div', { ref: summary, tabIndex: -1, style: lifecycleActions },
              h('span', { role: 'status' }, copy.count(visible.length)), ' · ',
              h('span', null, copy.protectedCount(visible.filter(row => row.protected).length))),
            h('p', { style: { ...lifecycleMuted, margin: 0 } }, copy.sidebar),
            h('p', { style: { ...lifecycleMuted, margin: 0 } }, copy.protectionScope),
            h(SuiteRecordStatus, { settings, language }),
            visible.length ? h(React.Fragment, null,
              h('p', { style: { ...lifecycleMuted, margin: 0 } }, copy.history),
              h('label', { style: lifecycleLabel }, copy.search, h('input', { type: 'search', maxLength: 256,
                dir: 'auto', value: filters.search, style: lifecycleSelect, onChange: event => updateFilter('search', event.target.value) })),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 130px), 1fr))', gap: 8 } },
                h(ArchiveSelect, { label: copy.workspace, value: filters.workspace, onChange: v => updateFilter('workspace', v),
                  options: [['', copy.workspaces], ...workspaces] }),
                h(ArchiveSelect, { label: copy.sort, value: filters.sort, onChange: v => updateFilter('sort', v),
                  options: [['newest', copy.newest], ['oldest', copy.oldest], ['name', copy.name], ['workspace', copy.workspace]] }),
                h(ArchiveSelect, { label: copy.protection, value: filters.protection, onChange: v => updateFilter('protection', v), options: picks }),
                h(ArchiveSelect, { label: copy.pinned, value: filters.pin, onChange: v => updateFilter('pin', v), options: picks }),
                visible.some(row => row.updatedAt) ? h('label', { style: lifecycleLabel }, copy.after,
                  h('input', { type: 'date', style: lifecycleSelect, value: filters.after,
                    onChange: event => updateFilter('after', event.target.value) })) : null),
              matching.length ? h('ul', { style: { margin: 0, padding: 0, listStyle: 'none' } },
                ...matching.slice(0, limit).map(row => h(ArchiveRow, { key: row.id, row, copy, date, services, busy: busy || !policyCurrent || !catalog.isCurrent(),
                  canProtect, onProtect: (id, checked) => changeProtection('protectedIds', id, checked),
                  onRestore: (item, trigger) => {
                    if (!actionCurrent()) return
                    setStatus(null)
                    setProposal({ generation, source: settings.source, id: item.id, workspaceId: item.owner.workspaceId, trigger })
                  } }))) : h('p', { role: 'status' }, copy.noResults),
              matching.length > limit ? h(Button, { size: 'sm', onClick: () => setLimit(limit + archivePageSize) }, copy.more) : null)
              : h('p', { role: 'status' }, copy.empty),
            catalog.savedRows.length || catalog.protectionWorkspaces.length ? h('details', { style: { borderBlockStart: lifecycleRule, paddingBlockStart: 12 } },
              h('summary', { style: { cursor: 'pointer', fontWeight: 500 } }, copy.manageProtection),
              h('div', { style: { display: 'grid', gap: 8, marginBlockStart: 10 } },
                ...catalog.protectionWorkspaces.map(row => h(Checkbox, { key: 'workspace:' + row.workspaceId,
                  label: `${copy.protectWorkspace}: ${row.title}`, checked: settings.record.protectedWorkspaces?.includes(row.workspaceId) ?? false,
                  disabled: !canProtect, onChange: checked => changeProtection('protectedWorkspaces', row.workspaceId, checked) })),
                ...catalog.savedRows.map(row => h(Checkbox, { key: 'session:' + row.id,
                  label: `${copy.protect} ${row.searchTitle || row.row.displayTitle || copy.untitled}`, checked: true,
                  disabled: !canProtect, onChange: checked => changeProtection('protectedIds', row.id, checked) })))) : null,
            confirming ? h('div', { style: lifecycleActions }, h('span', null, copy.prompt, ' ',
              h('bdi', null, visible.find(row => row.id === confirming.id)?.title || copy.untitled)),
              h('button', { type: 'button', ref: confirmation, onClick: restore }, copy.confirm),
              h(Button, { size: 'sm', onClick: () => { setProposal(null); confirming.trigger?.focus() } }, copy.cancel)) : null,
            message ? h('p', { role: message === 'failed' ? 'alert' : 'status' }, copy[message]) : null)))
    }

    // Both lists derive from one authorized inventory snapshot; action-time validation stays independent.
    function archivePageInventory(workspace, sessions, record) {
      const admittedRows = conversationInventory(workspace, sessions, null).rows
      const rows = archiveInventory(workspace, sessions, record, admittedRows)
      const archivedIds = new Set(rows.map(row => row.id))
      const flags = new Set(record.protectedIds)
      const workspaceFlags = new Set(record.protectedWorkspaces)
      const archivedWorkspaces = new Set(rows.map(row => row.owner.workspaceId))
      const multiplicity = new Map()
      for (const item of workspace.items) multiplicity.set(item.workspaceId, (multiplicity.get(item.workspaceId) ?? 0) + 1)
      const unique = workspace.items.filter(item => multiplicity.get(item.workspaceId) === 1)
      const uniqueIds = new Set(unique.map(item => item.workspaceId))
      // Keep previous protection flags manageable even for non-archived
      // sessions, but only with current authorized unique catalog membership.
      const savedRows = admittedRows.filter(row =>
        flags.has(row.id) && !archivedIds.has(row.id) && uniqueIds.has(row.owner.workspaceId))
      const protectionWorkspaces = unique.filter(item => workspaceFlags.has(item.workspaceId) || archivedWorkspaces.has(item.workspaceId))
      return { rows, savedRows, protectionWorkspaces }
    }

    function ArchivePage({ services, useRemoteAccess }) {
      const language = useSuiteNativeUiLanguage(services.locale)
      const settings = useSuiteRecord(services.settings, 'conversation-lifecycle', useRemoteAccess, services.connection)
      const generation = suiteWatch(services.host)
      const authorized = useRemoteAccess?.('settings/describe') === true
      const catalog = useArchiveCatalog(services, generation, authorized)
      const { workspace, sessions } = catalog
      const ready = authorized && Boolean(settings.source) && Boolean(generation) && catalog.status === 'ready'
      const inventory = React.useMemo(() => {
        if (!ready || !validArchiveProtectionRecord(settings.record)) return { rows: [], savedRows: [], protectionWorkspaces: [] }
        return archivePageInventory(workspace, sessions, settings.record)
      }, [ready, workspace, sessions, settings.record])
      return h(ArchiveHub, { key: generation?.id ?? 'disconnected', services, generation, authorized, settings,
        catalog: { status: catalog.status, ...inventory, isCurrent: catalog.isCurrent, reload: catalog.reload }, language })
    }

