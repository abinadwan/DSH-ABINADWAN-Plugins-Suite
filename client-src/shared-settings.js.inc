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
        const resetAtStart = connection.getResetGeneration()
        busy.current = true
        setState({ ...state, status: 'saving' })
        try {
          const result = await settings.replace(ns, { record }, state.view.revision)
          if (connection.getResetGeneration() !== resetAtStart || !access.current.mayRead) return false
          const view = result?.ok && suiteSettingsView(result.value)
          const confirmed = view && view.ns === ns
          // A document update can precede the write reply. Acknowledge the
          // reply without replacing a view already being refreshed.
          if (generation === epoch.current && connection.getSnapshot() === generationAtRender) {
            setState(confirmed ? { ...state, status: 'saved', view }
              : { ...state, status: result?.error?.code === 'settings/conflict' ? 'conflict' : 'failed' })
          }
          return Boolean(confirmed)
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

    function suiteConnection(ctx, host) {
      let generation = 0
      let resetGeneration = 0
      const listeners = new Set()
      const invalidate = () => { generation++; for (const notify of listeners) notify() }
      const reset = () => { resetGeneration++; invalidate() }
      ctx.on('connection/reset', reset)
      if (host) ctx.effect(() => host.subscribe(reset))
      ctx.effect(() => ctx.remote.$on('settings/document-updated', invalidate))
      return { getSnapshot: () => generation, getResetGeneration: () => resetGeneration,
        subscribe: notify => { listeners.add(notify); return () => listeners.delete(notify) } }
    }

    function SuiteRecordStatus({ settings, language = 'en' }) {
      const labels = {
        loading: 'Loading settings…', unavailable: 'Settings unavailable.',
        saving: 'Saving…', saved: 'Saved.', failed: 'Save failed.',
        conflict: 'Settings changed in another window. Reload before saving again.',
      }
      const label = uiCopy(labels[settings.status], language)
      return label ? h('div', { role: 'status', style: lifecycleMuted }, label, ' ',
        ['conflict', 'unavailable'].includes(settings.status) ? h(Button, { size: 'sm',
          onClick: settings.reload }, uiCopy('Reload settings', language)) : null) : null
    }

    const uiArabicLabels = {
        "Environment & Context": "البيئة والسياق",
        "Current context and workspace details": "السياق الحالي وتفاصيل مساحة العمل",
        "Open Environment sidebar": "فتح لوحة البيئة",
        "Environment": "البيئة",
        "Browser": "المتصفح",
        "Workspaces": "مساحات العمل",
        "Context": "السياق",
        "Loading context usage for this Session…": "جارٍ تحميل استخدام السياق لهذه الجلسة…",
        "Context usage is unavailable for this Session.": "استخدام السياق غير متاح لهذه الجلسة.",
        "Context use is available after the model reports usage.": "يظهر استخدام السياق بعد أن يبلّغ الموديل عن الاستخدام.",
        "{percent}% used": "المستخدَم {percent}٪",
        "Context occupancy": "نسبة استخدام السياق",
        "Messages (estimated)": "الرسائل (تقديري)",
        "Tool schemas (estimated)": "تعريفات الأدوات (تقديري)",
        "System prompt (estimated)": "موجّه النظام (تقديري)",
        "Free space": "المساحة المتبقية",
        "Session": "الجلسة",
        "Status": "الحالة",
        "Running": "قيد التشغيل",
        "Idle": "خاملة",
        "Outputs": "المخرجات",
        "Output tokens": "رموز الإخراج",
        "Last activity": "آخر نشاط",
        "Output file lists require a separate, permission-checked files service.": "يتطلّب عرض ملفات الإخراج خدمة ملفات منفصلة تتحقق من الصلاحيات.",
        "Connectors": "الموصلات",
        "Connector inventory is not available via the documented Client APIs used here.": "قائمة الموصلات غير متاحة عبر واجهات العميل الموثّقة المستخدمة هنا.",
        "Changes": "التغييرات",
        "Git changes require the Workspace changes integration.": "يتطلّب عرض تغييرات Git تكامل تغييرات مساحة العمل.",
        "Read-only · No external requests from this Session panel.": "للقراءة فقط · لا ترسل لوحة الجلسة طلبات خارجية.",
        "Chat Control": "إدارة المحادثات",
        "Overview": "نظرة عامة",
        "Protected Conversations": "المحادثات المحمية",
        "Workspace": "مساحة العمل",
        "All Workspaces": "جميع مساحات العمل",
        "Archived": "مؤرشفة",
        "Unavailable": "غير متاح",
        "Cancel": "إلغاء",
        "Protect this Workspace": "حماية مساحة العمل هذه",
        "Protect ": "حماية ",
        "Show more": "عرض المزيد",
        "Protected conversation": "محادثة محمية",
        "Protected Workspace": "مساحة عمل محمية",
        "Pinned conversation": "محادثة مثبتة",
        "Loading settings…": "جارٍ تحميل الإعدادات…",
        "Settings unavailable.": "الإعدادات غير متاحة.",
        "Saving…": "جارٍ الحفظ…",
        "Saved.": "تم الحفظ.",
        "Save failed.": "فشل الحفظ.",
        "Settings changed in another window. Reload before saving again.": "تغيرت الإعدادات في نافذة أخرى. أعد التحميل قبل الحفظ.",
        "Reload settings": "إعادة تحميل الإعدادات",
        "Current session": "الجلسة الحالية",
        "Save current effort": "حفظ مستوى الاستدلال الحالي",
        "Apply saved effort": "تطبيق مستوى الاستدلال المحفوظ",
        "Remove saved preference": "حذف التفضيل المحفوظ",
        "Reasoning statistics…": "إحصائيات الاستدلال…",
        "Reasoning statistics": "إحصائيات الاستدلال",
        "Close": "إغلاق",
        "Done": "تم",
        "Loading statistics…": "جارٍ تحميل الإحصائيات…",
        "Statistics are unavailable.": "الإحصائيات غير متاحة.",
        "Statistics reset could not be confirmed.": "تعذر تأكيد إعادة ضبط الإحصائيات.",
        "Reload statistics": "إعادة تحميل الإحصائيات",
        "Messages": "الرسائل",
        "Total": "الإجمالي",
        "Session effort": "مستوى استدلال الجلسة",
        "Requests by effort": "الطلبات حسب مستوى الاستدلال",
        "Effort": "المستوى",
        "Requests": "الطلبات",
        "Input tokens": "رموز الإدخال",
        "Reasoning tokens": "رموز الاستدلال",
        "Average time": "متوسط الوقت",
        " (subagents)": " (الوكلاء الفرعيون)",
        " ({reported} of {total})": " ({reported} من {total})",
        "Not reported": "لم يبلّغ المزوّد",
        "{time} s": "{time} ث",
        "No requests yet.": "لا توجد طلبات بعد.",
        "Requests by provider and model": "الطلبات حسب المزوّد والموديل",
        "Times run on this computer from stream start to the saved reply. Reasoning tokens appear only when the provider reports them. No savings are estimated.": "يُقاس الوقت على هذا الجهاز من بدء البث حتى حفظ الرد. تظهر رموز الاستدلال فقط عندما يبلّغ عنها المزوّد. لا تُقدَّر أي وفورات.",
        "Aggregate counts saved in this Profile since {date}. Nothing is sent anywhere.": "تُحفظ الأعداد الإجمالية في هذا الملف الشخصي منذ {date}. لا تُرسل الإحصائيات إلى أي جهة.",
        "Aggregate counts kept in memory until Harness restarts since {date}. Nothing is sent anywhere.": "تبقى الأعداد الإجمالية المسجّلة منذ {date} في الذاكرة حتى إعادة تشغيل Harness. لا تُرسل الإحصائيات إلى أي جهة.",
        "Reset statistics": "إعادة ضبط الإحصائيات",
        "Effort recommendation…": "توصية مستوى الاستدلال…",
        "Effort recommendation": "توصية مستوى الاستدلال",
        "Recommendations use a local classifier on the Harness Host. The conversation’s reasoning effort stays as selected.": "تُحتسب التوصيات بواسطة مصنّف محلي على مضيف Harness. يبقى مستوى الاستدلال المحدد للمحادثة كما هو.",
        "Mode": "الوضع",
        "Manual": "يدوي",
        "Automatic recommendation preview": "معاينة التوصية التلقائية",
        "Text to analyze": "النص المراد تحليله",
        "Analyze": "تحليل",
        "Analyzing…": "جارٍ التحليل…",
        "No recommendation is available for this Session and model.": "لا تتوفر توصية لهذه الجلسة وهذا الموديل.",
        "Selected effort": "المستوى المحدد",
        "Suggested effort": "المستوى المقترح",
        "simple": "بسيط",
        "standard": "عادي",
        "complex": "معقّد",
        "advanced": "متقدم",
        "Retry or empty input": "إعادة محاولة أو إدخال فارغ",
        "Continuation": "متابعة",
        "Greeting": "تحية",
        "Request length": "طول الطلب",
        "Advanced topic": "موضوع متقدم",
        "Complex topic": "موضوع معقّد",
        "Standard topic": "موضوع عادي",
        "Code block": "كتلة شيفرة",
        "Error trace": "تتبّع الخطأ",
        "Multiple steps": "خطوات متعددة",
        "Math": "رياضيات",
        "Attachment": "مرفق",
        "Request for deeper analysis": "طلب تحليل أعمق",
        "Request for a shorter answer": "طلب إجابة أقصر",
        "Reload preferences": "إعادة تحميل التفضيلات",
        "Provider default": "المستوى الافتراضي للمزوّد",
        "No saved preference": "لا يوجد تفضيل محفوظ",
        "Saved preferences unavailable": "التفضيلات المحفوظة غير متاحة",
        "Preference saved.": "تم حفظ التفضيل.",
        "Preference removed.": "تم حذف التفضيل.",
        "Preference could not be updated.": "تعذر تحديث التفضيل.",
        "Harness could not change the effort.": "تعذر تغيير مستوى الاستدلال.",
        "Effort changed.": "تم تغيير مستوى الاستدلال.",
        "Effort applied.": "تم تطبيق مستوى الاستدلال.",
        "Start or resume this chat before changing its effort.": "ابدأ المحادثة أو استأنفها قبل تغيير مستوى الاستدلال.",
        "Start or resume this chat before applying the saved effort.": "ابدأ المحادثة أو استأنفها قبل تطبيق المستوى المحفوظ."
    }
    const uiCopy = (value, language) => language === 'ar' ? uiArabicLabels[value] ?? value : value
    // Only migrated components use the seven-language resolver until their catalogs are complete.
    const suiteNativeUiLanguage = snapshot => {
      const current = snapshot?.active ?? globalThis.document?.documentElement.lang
      const id = typeof current === 'string' ? current.toLowerCase().split('-')[0] : 'en'
      return ['en','ar','zh','es','fr','de','ja'].includes(id) ? id : 'en'
    }
    const useSuiteNativeUiLanguage = source => suiteNativeUiLanguage(React.useSyncExternalStore(
      notify => source?.subscribe?.(notify) ?? (() => {}),
      () => source?.getSnapshot?.(), () => source?.getSnapshot?.()))
    const uiLanguage = snapshot => {
      const current = snapshot?.active ?? globalThis.document?.documentElement.lang
      return typeof current === 'string' && current.toLowerCase().startsWith('ar') ? 'ar' : 'en'
    }
    const useUiLanguage = source => uiLanguage(React.useSyncExternalStore(
      notify => source?.subscribe?.(notify) ?? (() => {}),
      () => source?.getSnapshot?.(), () => source?.getSnapshot?.()))

    const lifecycleMuted = { color: 'var(--dsw-alias-label-secondary, inherit)', fontSize: 12, lineHeight: 1.45 }
    const lifecycleRule = '1px solid var(--dsw-alias-border-l3, CanvasText)'
    const lifecycleLabel = { display: 'grid', gap: 6, fontSize: 13, fontWeight: 500, minWidth: 0 }
    const lifecycleSelect = {
      display: 'block', width: '100%', minWidth: 0, height: 32, paddingInline: 8,
      borderRadius: 8, border: lifecycleRule, color: 'inherit', font: 'inherit',
      background: 'var(--dsw-alias-settings-card-fill, Canvas)',
    }
    const lifecycleActions = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }

