    // Candidate Studio page: native catalog and owner-only exact Fetch routes.
    const studioPanelId = 'abinadwan-humanizer-studio'
    const studioTools = [
      ['humanize','Humanize','تحسين طبيعية النص'],['rewrite','Rewrite','إعادة الصياغة'],
      ['polish','Polish','تحسين الأسلوب'],['professional','Professional','صياغة مهنية'],
      ['grammar','Grammar','تصحيح لغوي'],['shorten','Shorten','اختصار'],
      ['expand','Expand','توسعة'],['translate','Translate','ترجمة'],['custom','Custom','مخصص'],
    ]
    const studioEmpty = Object.freeze([])
    const studioTextStyle = { font:'inherit', color:'inherit', background:'transparent', border:'1px solid var(--dsw-alias-border, #8886)', borderRadius:8, padding:9, minWidth:0 }
    const studioSelectStyle = { ...studioTextStyle, colorScheme:'inherit', backgroundColor:'var(--dsw-alias-bg-layer-2, Canvas)', color:'var(--dsw-alias-label-primary, CanvasText)' }
    const studioOptionStyle = { backgroundColor:studioSelectStyle.backgroundColor, color:studioSelectStyle.color, colorScheme:'inherit' }
    function studioClock(){return performance.now()}
    // The native catalog resolves exact-route capabilities. No local tier mapping.
    function studioEfforts(reasoning){
      if(!Array.isArray(reasoning?.efforts)||!reasoning.efforts.length)return studioEmpty
      const seen=new Set()
      const options=[]
      for(const row of reasoning.efforts){
        if(typeof row?.id!=='string'||!row.id.trim()||row.id.length>256||/[\u0000-\u001f\u007f]/.test(row.id)||
          typeof row.name!=='string'||!row.name.trim()||row.name.length>256||seen.has(row.id))return studioEmpty
        seen.add(row.id);options.push({id:row.id,name:row.name})
      }
      if(reasoning.defaultEffort!==undefined&&!seen.has(reasoning.defaultEffort))return studioEmpty
      return options
    }
    const studioLabel = { display:'grid', gap:6, minWidth:0, fontSize:13 }
    const studioButton = { ...studioTextStyle, cursor:'pointer', textAlign:'start' }
    const studioLocaleId = /^[a-zA-Z]{2,8}(?:-[a-zA-Z0-9]{1,8})*$/
    function studioLocales(snapshot) {
      return Array.isArray(snapshot?.locales) ? snapshot.locales.filter(item =>
        typeof item?.id === 'string' && item.id.length <= 64 && studioLocaleId.test(item.id) &&
        typeof item.label === 'string' && item.label.length <= 256) : studioEmpty
    }
    function studioDirection(language) {
      if (language === 'auto' || language === 'preserve' || !language) return 'auto'
      try {
        const locale = new Intl.Locale(language)
        const info = locale.getTextInfo?.() ?? locale.textInfo
        if (info?.direction === 'rtl' || info?.direction === 'ltr') return info.direction
      } catch {}
      return /^(ar|fa|he|ur|ps|sd|ug|yi|dv|ckb)(-|$)/i.test(language) ? 'rtl' : 'ltr'
    }
    async function studioFetch(path, signal, input) {
      const url = new URL('api/abinadwan-humanizer-studio/' + path, document.baseURI)
      if (url.origin !== document.location.origin) throw Error('STUDIO_UNAVAILABLE')
      const reply = await fetch(url, { method:input === undefined ? 'GET':'POST',
        credentials:'same-origin', redirect:'error', cache:'no-store', referrerPolicy:'no-referrer', signal,
        ...(input === undefined ? {} : {headers:{'content-type':'application/json'},body:JSON.stringify(input)}) })
      const body = await reply.json()
      if (!reply.ok) throw Error(reply.status === 409 ? 'STUDIO_BUSY_OR_CANCELLED' : 'STUDIO_UNAVAILABLE')
      return body
    }
    function StudioPage({services}) {
      const generation = suiteWatch(services.generation)
      return h(StudioSeat,{key:generation,services,generation})
    }
    function StudioSeat({services,generation}) {
      const locale = suiteWatch(services.locale)
      const language = uiLanguage(locale)
      const tr = (en,ar) => language === 'ar' ? ar : en
      const locales = studioLocales(locale)
      const revision = suiteWatch(services.catalogRevision)
      const [refresh,setRefresh] = React.useState(0)
      const [catalog,setCatalog] = React.useState({phase:'loading',groups:[]})
      const [service,setService] = React.useState('humanize')
      const [source,setSource] = React.useState('')
      const [result,setResult] = React.useState('')
      const [brief,setBrief] = React.useState('')
      const [from,setFrom] = React.useState('auto')
      const [to,setTo] = React.useState('preserve')
      const [selection,setSelection] = React.useState('')
      const [effort,setEffort] = React.useState('')
      const [copyNotice,setCopyNotice] = React.useState('')
      const copyRevision=React.useRef(0)
      React.useEffect(()=>()=>{copyRevision.current++},[])
      const [busy,setBusy] = React.useState(false)
      const [notice,setNotice] = React.useState('')
      const pending = React.useRef(null)
      const [timing,setTiming] = React.useState(null)
      const timingRef = React.useRef(null)
      function finishTiming(phase){
        const run=timingRef.current
        if(!run)return
        timingRef.current=null
        setTiming({...run,phase,elapsed:Math.max(0,studioClock()-run.started)})
      }
      React.useEffect(()=>{
        if(!busy)return
        const run=timingRef.current
        if(!run)return
        const timer=setInterval(()=>{
          if(!current()||timingRef.current!==run)return
          setTiming({...run,phase:'waiting',elapsed:Math.max(0,studioClock()-run.started)})
        },250)
        return ()=>clearInterval(timer)
      },[busy,services,generation])
      const storagePending = React.useRef(null)
      const [saved,setSaved] = React.useState(null)
      const [storageBusy,setStorageBusy] = React.useState(false)
      const [storageNotice,setStorageNotice] = React.useState('')
      const [confirmClear,setConfirmClear] = React.useState(false)
      const current = () => !services.lifetime.aborted && services.generation.getSnapshot() === generation
      React.useEffect(()=>()=>{storagePending.current?.abort();storagePending.current=null},[services,generation])
      function closeStorage(){
        storagePending.current?.abort();storagePending.current=null
        setSaved(null);setStorageBusy(false);setStorageNotice('');setConfirmClear(false)
      }
      async function storageOperation(command){
        if(!current()||storagePending.current||pending.current||busy)return
        if(command&&(!saved||command.revision!==saved.revision))return
        const controller=new AbortController()
        storagePending.current=controller
        const signal=AbortSignal.any([controller.signal,services.lifetime,AbortSignal.timeout(12000)])
        const valid=()=>current()&&storagePending.current===controller
        setStorageBusy(true);setSaved(null);setStorageNotice('');setConfirmClear(false)
        try{
          const state=await studioFetch(command?'storage/change':'storage',signal,command)
          if(!valid())return
          if(signal.aborted)throw Error('STUDIO_STORAGE_UNAVAILABLE')
          if(state?.version!==1||typeof state.revision!=='string'||!Array.isArray(state.history)||state.history.length>10||
            (state.draft!==null&&typeof state.draft!=='object'))throw Error('STUDIO_STORAGE_UNAVAILABLE')
          setSaved(state)
          setStorageNotice(command?tr('Saved changes.','تم حفظ التغييرات.'):tr('Saved items loaded.','تم تحميل العناصر المحفوظة.'))
        }catch{
          // A write might have committed before a lost reply. Do not retry it.
          if(valid()){setSaved(null);setStorageNotice(tr('Storage unavailable or changed. Reopen saved items before another write.','التخزين غير متاح أو تغير. افتح العناصر المحفوظة مجددًا قبل أي تعديل.'))}
        }finally{if(valid()){storagePending.current=null;setStorageBusy(false)}}
      }
      function snapshot(){
        return {service,provider:chosen?.provider??'',model:chosen?.model??'',inputLanguage:from,outputLanguage:to,
          sourceText:source,result,editingBrief:service==='custom'?brief:''}
      }
      function restore(entry){
        if(!current()||pending.current||storagePending.current||busy||storageBusy||!entry)return
        if(!studioTools.some(row=>row[0]===entry.service)||typeof entry.sourceText!=='string'||entry.sourceText.length>12000||
          typeof entry.result!=='string'||entry.result.length>24000||typeof entry.editingBrief!=='string'||entry.editingBrief.length>2000)return
        setService(entry.service);setSource(entry.sourceText);setResult(entry.result);setBrief(entry.editingBrief)
        setFrom(entry.inputLanguage==='auto'||known(entry.inputLanguage)?entry.inputLanguage:'auto')
        setTo(entry.outputLanguage==='preserve'||known(entry.outputLanguage)?entry.outputLanguage:'preserve')
        const key=JSON.stringify([entry.provider,entry.model])
        setSelection(models.some(model=>model.key===key)?key:'');setEffort('');setCopyNotice('');copyRevision.current++
        setTiming(null)
        setNotice(tr('Saved text restored. Nothing was sent to a model.','تمت استعادة النص المحفوظ دون إرساله إلى موديل.'))
      }
      function stop() {
        pending.current?.abort()
        pending.current = null
        finishTiming('cancelled')
        setBusy(false)
      }
      React.useEffect(() => {
        const controller = new AbortController()
        const signal = AbortSignal.any([controller.signal,services.lifetime,AbortSignal.timeout(15000)])
        const valid = () => current() && !signal.aborted && services.catalogRevision.getSnapshot() === revision
        stop()
        setSelection('');setEffort('')
        setCatalog({phase:'loading',groups:[]})
        void (async () => {
          try {
            const status = await studioFetch('status',signal)
            if (!valid() || status?.available !== true || status?.protocol !== 1) throw Error('STUDIO_UNAVAILABLE')
            const response = remoteValue(await services.sessionRemote.modelCatalog(),'Studio catalog')
            if (!current() || controller.signal.aborted || services.catalogRevision.getSnapshot() !== revision) return
            if (signal.aborted) throw Error('STUDIO_UNAVAILABLE')
            if (!Array.isArray(response?.groups)) throw Error('STUDIO_UNAVAILABLE')
            const groups = response.groups.flatMap(group => {
              if (typeof group?.id !== 'string' || typeof group.name !== 'string' || !Array.isArray(group.models)) return []
              const models = group.models.filter(model => typeof model?.id === 'string' && typeof model.name === 'string')
              return models.length ? [{id:group.id,name:group.name,models}] : []
            })
            setCatalog({phase:'ready',groups})
          } catch { if (current() && !controller.signal.aborted && services.catalogRevision.getSnapshot() === revision) setCatalog({phase:'error',groups:[]}) }
        })()
        return () => { controller.abort(); pending.current?.abort(); pending.current = null }
      },[services,generation,revision,refresh])
      // The native catalog is replaced on refresh, revision change and remount.
      // Typing and elapsed-time ticks must not re-normalize every model capability.
      const models = React.useMemo(() => catalog.groups.flatMap(group=>group.models.map(model=>({provider:group.id,model:model.id,key:JSON.stringify([group.id,model.id]),efforts:studioEfforts(model.reasoning)}))), [catalog.groups])
      const chosen = models.find(model=>model.key === selection)
      const efforts=catalog.phase==='ready'&&services.catalogRevision.getSnapshot()===revision?(chosen?.efforts??studioEmpty):studioEmpty
      const requestedEffort=efforts.find(row=>row.id===effort)
      const effortValid=effort===''||!!requestedEffort
      function selectModel(value){setSelection(value);setEffort('')}
      async function copyText(value,id){
        if(!current()||busy||pending.current||storageBusy||!value.trim())return
        const attempt=++copyRevision.current
        const valid=()=>current()&&copyRevision.current===attempt
        setCopyNotice('')
        try{
          if(typeof navigator?.clipboard?.writeText!=='function')throw Error('clipboard unavailable')
          await navigator.clipboard.writeText(value)
          if(valid())setCopyNotice(id==='result'?tr('Result copied.','تم نسخ النتيجة.'):tr('Source copied.','تم نسخ النص الأصلي.'))
        }catch{
          if(valid())setCopyNotice(tr('Clipboard unavailable. Select the text and copy manually.','الحافظة غير متاحة. حدد النص وانسخه يدويًا.'))
        }
      }
      const known = id => locales.some(item=>item.id === id)
      const languageValid = (from==='auto'||known(from)) && (to==='preserve'||known(to)) && (service!=='translate'||to!=='preserve')
      const ready = catalog.phase==='ready' && !!chosen && effortValid && languageValid && source.trim().length>0 && source.length<=12000 &&
        (service!=='custom'||(brief.trim().length>0&&brief.length<=2000))
      async function processText() {
        if (!ready || busy || storagePending.current || pending.current || !current() || services.catalogRevision.getSnapshot() !== revision) return
        const controller = new AbortController()
        pending.current=controller
        const signal=AbortSignal.any([controller.signal,services.lifetime,AbortSignal.timeout(125000)])
        const valid=()=>current()&&pending.current===controller&&services.catalogRevision.getSnapshot()===revision
        const run={started:studioClock(),model:chosen.model,service,elapsed:0,phase:'waiting',effort:requestedEffort?.name??null,effortSupported:efforts.length>0}
        timingRef.current=run;setTiming(run)
        copyRevision.current++;setCopyNotice('');setBusy(true);setResult('');setNotice('')
        try {
          const reply=await studioFetch('edit',signal,{service,provider:chosen.provider,model:chosen.model,sourceText:source,
            inputLanguage:from,outputLanguage:to,...(requestedEffort?{reasoningEffort:requestedEffort.id}:{}),...(service==='custom'?{editingBrief:brief}:{})})
          if (!valid()) return
          if(signal.aborted)throw Error('STUDIO_UNAVAILABLE')
          if(typeof reply?.text!=='string'||!reply.text.trim()||reply.text.length>24000)throw Error('STUDIO_UNAVAILABLE')
          setResult(reply.text)
          finishTiming('completed')
          setNotice(tr('Completed. Review the result.','اكتملت المعالجة. راجع النتيجة.'))
        }catch{
          if(valid()){
            finishTiming(signal.aborted?'cancelled':'failed')
            if(!controller.signal.aborted)setNotice(tr('Processing failed or was cancelled. No automatic retry.','تعذرت المعالجة أو أُلغيت. لن تتم إعادة المحاولة تلقائيًا.'))
          }
        }finally{
          if(valid()){pending.current=null;setBusy(false)}
        }
      }
      function clear() {stop();setTiming(null);setSource('');setResult('');setBrief('');setNotice('');copyRevision.current++;setCopyNotice('')}
      const choice=(label,value,onChange,children,extra={})=>h('label',{style:studioLabel},label,
        h('select',{style:studioSelectStyle,value,onChange:event=>onChange(event.target.value),disabled:busy||storageBusy,...extra},children))
      const editor=(label,value,onChange,maxLength,dir,id)=>h('div',{style:{display:'grid',gap:6,minWidth:0}},
        h('label',{style:studioLabel},label,
          h('textarea',{'data-studio-editor':id,style:{...studioTextStyle,minHeight:250,resize:'vertical',lineHeight:1.65},
            value,maxLength,dir,readOnly:id==='result',disabled:id!=='result'&&(busy||storageBusy),spellCheck:false,autoComplete:'off',
            ...(onChange?{onChange:event=>{copyRevision.current++;setCopyNotice('');onChange(event.target.value)}}:{})})),
        h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:'wrap'}},
          h('span',{style:lifecycleMuted,dir:'ltr'},value.length+' / '+maxLength),
          h('button',{type:'button','data-studio-copy':id,disabled:busy||storageBusy||!value.trim(),style:studioButton,onClick:()=>copyText(value,id)},
            id==='result'?tr('Copy result','نسخ النتيجة'):tr('Copy source','نسخ النص الأصلي'))))
      return h('main',{'data-humanizer-studio':'',dir:language==='ar'?'rtl':'ltr',style:{padding:20,display:'grid',gap:14,overflow:'auto',alignContent:'start',height:'100%'}},
        h('h2',{style:{margin:0,fontSize:20}},tr('Humanizer Studio','استوديو Humanizer')),
        h('p',{style:{...lifecycleMuted,margin:0}},tr('Independent text editing. Results depend on the selected model. Review facts and citations.','تحرير نصوص مستقل. تعتمد جودة النتائج على الموديل المختار؛ راجع الحقائق والمصادر.')),
        h('p',{role:'note',style:{...lifecycleMuted,margin:0}},tr('Text is not saved automatically. Processing sends it through the selected provider and Host middleware, which may retain it. Avoid sensitive text.','لا تُحفظ النصوص تلقائيًا. تُرسل المعالجة عبر المزوّد المختار ووسائط Host التي قد تحتفظ بها. تجنب النصوص الحساسة.')),
        catalog.phase!=='ready'?h('div',{role:'status'},catalog.phase==='loading'?tr('Checking Studio availability…','جارٍ التحقق من توفر الاستوديو…'):tr('Processing unavailable or access denied. Saved items can be managed separately.','المعالجة غير متاحة أو الوصول مرفوض. يمكن إدارة المحفوظات بشكل مستقل.'),
          h('button',{type:'button',style:studioButton,onClick:()=>setRefresh(value=>value+1)},tr('Retry','إعادة المحاولة'))):null,
        h('div',{style:{display:'grid',gap:12}},
          h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,180px),1fr))',gap:10}},
            choice(tr('Model','الموديل'),selection,selectModel,[h('option',{style:studioOptionStyle,key:'none',value:''},tr('Select model','اختر الموديل')),
              ...catalog.groups.map(group=>h('optgroup',{style:studioOptionStyle,key:group.id,label:group.name},group.models.map(model=>h('option',{style:studioOptionStyle,key:model.id,value:JSON.stringify([group.id,model.id])},model.name))))],{'data-studio-model':''}),
            efforts.length?choice(tr('Reasoning effort','جهد التفكير'),effort,setEffort,[
              h('option',{style:studioOptionStyle,key:'default',value:''},tr('Model default','افتراضي الموديل')),
              ...efforts.map(row=>h('option',{style:studioOptionStyle,key:'effort:'+row.id,value:row.id},row.name))
            ],{'data-studio-effort':''}):null,
            choice(tr('Input language','لغة المصدر'),from,setFrom,[h('option',{style:studioOptionStyle,key:'auto',value:'auto'},tr('Auto detect','اكتشاف تلقائي')),...locales.map(item=>h('option',{style:studioOptionStyle,key:item.id,value:item.id},item.label))],{'data-studio-input-language':''}),
            choice(tr('Output language','لغة النتيجة'),to,setTo,[h('option',{style:studioOptionStyle,key:'preserve',value:'preserve'},tr('Preserve source','لغة المصدر')),...locales.map(item=>h('option',{style:studioOptionStyle,key:item.id,value:item.id},item.label))],{'data-studio-output-language':''})),
          h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,260px),1fr))',gap:12}},
            h('nav',{'aria-label':tr('Editing services','خدمات التحرير'),style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(112px,1fr))',gap:6,alignContent:'start'}},
              studioTools.map(([id,en,ar])=>h('button',{key:id,type:'button',disabled:busy||storageBusy,'aria-pressed':service===id,'data-studio-service':id,style:{...studioButton,background:service===id?'#8060c526':'transparent'},onClick:()=>setService(id)},tr(en,ar)))),
            h('div',{style:{display:'grid',gap:8}},
              service==='custom'?h('label',{style:studioLabel},tr('Editing brief','تعليمات التحرير'),h('textarea',{style:studioTextStyle,value:brief,maxLength:2000,disabled:busy||storageBusy,dir:'auto','data-studio-brief':'',onChange:event=>setBrief(event.target.value)})):null,
              editor(tr('Source text','النص الأصلي'),source,setSource,12000,studioDirection(from),'source')),
            editor(tr('Result','النتيجة'),result,null,24000,studioDirection(to==='preserve'?from:to),'result')),
          copyNotice?h('p',{role:'status','data-studio-copy-notice':'',style:lifecycleMuted},copyNotice):null,
          !languageValid?h('p',{role:'status',style:lifecycleMuted},tr('Choose a valid language; translation requires an output language.','اختر لغة صالحة؛ الترجمة تتطلب لغة للنتيجة.')):null,
          h('div',{style:{display:'flex',gap:8,flexWrap:'wrap'}},
            h('button',{type:'button','data-studio-process':'',disabled:!ready||busy||storageBusy,style:studioButton,onClick:processText},tr('Process text','معالجة النص')),
            busy?h('button',{type:'button','data-studio-cancel':'',style:studioButton,onClick:()=>{stop();setNotice(tr('Cancelled.','أُلغيت المعالجة.'))}},tr('Cancel','إلغاء')):null,
            h('button',{type:'button','data-studio-clear':'',style:studioButton,onClick:clear},tr('Clear text','مسح النصوص')),
            h('button',{type:'button',disabled:busy||storageBusy,style:studioButton,onClick:()=>setRefresh(value=>value+1)},tr('Refresh models','تحديث الموديلات'))),
          h('p',{role:'status','aria-live':'polite',style:lifecycleMuted},busy?tr('Waiting for Host response…','بانتظار استجابة المضيف…'):notice),
          timing?h('section',{'data-studio-timing':'','aria-label':tr('Last processing attempt','آخر محاولة معالجة'),style:{...studioTextStyle,display:'grid',gap:7}},
            h('div',{style:{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}},
              h('strong',null,tr('Model: ','الموديل: ')+timing.model),
              h('span',null,studioTools.find(row=>row[0]===timing.service)?.[language==='ar'?2:1]??timing.service),
              timing.effortSupported?h('span',{'data-studio-run-effort':''},tr('Requested effort: ','الجهد المطلوب: ')+(timing.effort??tr('Model default','افتراضي الموديل'))):null,
              h('span',{'data-studio-elapsed':'',dir:'ltr',style:{fontVariantNumeric:'tabular-nums'}},(timing.elapsed/1000).toFixed(2)+' s'),
              h('span',{'data-studio-timing-phase':timing.phase},timing.phase==='waiting'?tr('In progress','قيد المعالجة'):timing.phase==='completed'?tr('Completed','مكتملة'):timing.phase==='cancelled'?tr('Cancelled locally','أُلغيت محليًا'):tr('Failed','فشلت'))),
            timing.phase==='waiting'?h('progress',{'aria-label':tr('Processing in progress','المعالجة جارية'),style:{width:'100%',accentColor:'var(--dsw-alias-label-primary, CanvasText)'}}):null,
            h('span',{style:lifecycleMuted},tr('Elapsed time measured in this window, including Host and provider overhead. Not token speed or an estimated completion time.','المدة مقاسة في هذه النافذة وتشمل وقت المضيف والمزوّد؛ ليست سرعة التوكنات أو تقديرًا لوقت الانتهاء.'))):null),
        h('section',{'aria-label':tr('Optional local storage','التخزين المحلي الاختياري'),style:{...studioTextStyle,display:'grid',gap:9}},
          h('h3',{style:{margin:0,fontSize:15}},tr('Draft and history','المسودة والسجل')),
          h('p',{style:lifecycleMuted},tr('Optional, manual saving of the current editor snapshot in this Host Profile, not a verified record of model execution. Saved text is not encrypted. One draft, up to 10 history items; deleting here does not erase backups or provider copies.','حفظ يدوي اختياري لحالة المحرر الحالية داخل Profile لهذا المضيف، وليس سجلًا موثقًا لتنفيذ الموديل. النص المحفوظ غير مشفر. مسودة واحدة وحتى 10 عناصر بالسجل؛ الحذف هنا لا يمحو النسخ الاحتياطية أو نسخ المزوّد.')),
          h('div',{style:{display:'flex',flexWrap:'wrap',gap:8}},
            h('button',{type:'button','data-studio-storage-open':'',style:studioButton,disabled:busy||storageBusy,onClick:()=>storageOperation()},saved?tr('Reload saved items','تحديث المحفوظات'):tr('Open saved items (opt in)','فتح المحفوظات (اختياري)')),
            saved||storageBusy?h('button',{type:'button','data-studio-storage-close':'',style:studioButton,onClick:closeStorage},tr('Close saved items','إغلاق المحفوظات')):null),
          saved?h('div',{style:{display:'grid',gap:8}},
            h('div',{style:{display:'flex',flexWrap:'wrap',gap:8}},
              h('button',{type:'button','data-studio-save-draft':'',style:studioButton,disabled:busy||storageBusy||![source,result,service==='custom'?brief:''].some(value=>value.trim()),onClick:()=>storageOperation({action:'save-draft',revision:saved.revision,entry:snapshot()})},tr('Save / replace draft','حفظ / استبدال المسودة')),
              h('button',{type:'button','data-studio-save-history':'',style:studioButton,disabled:busy||storageBusy||!source.trim()||!result.trim()||saved.history.length>=10,onClick:()=>storageOperation({action:'save-history',revision:saved.revision,entry:snapshot()})},tr('Save to history','حفظ في السجل')),
              saved.draft?h('button',{type:'button','data-studio-restore-draft':'',style:studioButton,disabled:busy||storageBusy,onClick:()=>restore(saved.draft)},tr('Restore draft','استعادة المسودة')):null,
              saved.draft?h('button',{type:'button','data-studio-delete-draft':'',style:studioButton,disabled:busy||storageBusy,onClick:()=>storageOperation({action:'clear-draft',revision:saved.revision})},tr('Delete draft','حذف المسودة')):null),
            h('p',{style:lifecycleMuted},tr('Saved history: ','عناصر السجل: ')+saved.history.length+' / 10'),
            ...saved.history.map(row=>h('div',{key:row.id,style:{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}},
              h('span',{dir:'auto',style:{flex:1,overflowWrap:'anywhere'}},String(row.entry?.sourceText??'').slice(0,80)),
              h('button',{type:'button','data-studio-restore-history':row.id,style:studioButton,disabled:busy||storageBusy,onClick:()=>restore(row.entry)},tr('Restore','استعادة')),
              h('button',{type:'button','data-studio-delete-history':row.id,style:studioButton,disabled:busy||storageBusy,onClick:()=>storageOperation({action:'delete-history',revision:saved.revision,id:row.id})},tr('Delete','حذف')))),
            confirmClear?h('div',{role:'group','aria-label':tr('Confirm deletion','تأكيد الحذف')},
              h('p',null,tr('Delete the saved draft and all history from this Host?','حذف المسودة وكل السجل المحفوظ من هذا المضيف؟')),
              h('button',{type:'button','data-studio-confirm-clear':'',style:studioButton,disabled:busy||storageBusy,onClick:()=>storageOperation({action:'clear-all',revision:saved.revision})},tr('Confirm delete','تأكيد الحذف')),
              h('button',{type:'button',style:studioButton,onClick:()=>setConfirmClear(false)},tr('Cancel','إلغاء'))):
              h('button',{type:'button','data-studio-clear-saved':'',style:studioButton,disabled:busy||storageBusy||(!saved.draft&&!saved.history.length),onClick:()=>setConfirmClear(true)},tr('Delete all saved items','حذف كل المحفوظات'))):null,
          h('p',{role:'status','aria-live':'polite',style:lifecycleMuted},storageBusy?tr('Working…','جارٍ التنفيذ…'):storageNotice)))
    }
    const humanizerStudioPlugin = {
      inject:['slots','locale','remote','remote.session','connection'],
      apply(ctx) {
        const lifetime = new AbortController()
        const host = ctx.connection.generation
        let generation=0,revision=0
        const generationListeners=new Set(),catalogListeners=new Set()
        const changeHost=()=>{generation++;for(const notify of generationListeners)notify()}
        const changeCatalog=()=>{revision++;for(const notify of catalogListeners)notify()}
        ctx.effect(()=>()=>lifetime.abort())
        ctx.on('connection/reset',changeHost)
        ctx.effect(()=>host.subscribe(changeHost))
        ctx.effect(()=>ctx.remote.$on('llm/adapters-updated',changeCatalog))
        ctx.effect(()=>ctx.remote.$on('llm/models-updated',changeCatalog))
        ctx.effect(()=>ctx.remote.$on('settings/document-updated',changeCatalog))
        ctx.effect(()=>ctx.remote.$on('credentials/record-updated',changeCatalog))
        ctx.effect(()=>ctx.remote.$on('credentials/reference-updated',changeCatalog))
        const services={locale:ctx.locale,sessionRemote:ctx.remote.session,lifetime:lifetime.signal,
          generation:{getSnapshot:()=>generation,subscribe:notify=>{generationListeners.add(notify);return()=>generationListeners.delete(notify)}},
          catalogRevision:{getSnapshot:()=>revision,subscribe:notify=>{catalogListeners.add(notify);return()=>catalogListeners.delete(notify)}}}
        ctx.slots.inject('main',()=>ctx.slots.register({name:'main',key:studioPanelId},()=>h(StudioPage,{services})))
        ctx.slots.inject('sidebar.panellist',()=>ctx.slots.register({name:'sidebar.panellist',id:studioPanelId,order:11,
          label:()=>uiLanguage(services.locale.getSnapshot())==='ar'?'استوديو Humanizer':'Humanizer Studio'},
          ({size})=>h('svg',{width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true},
            h('path',{d:'M4 20h5l11-11-5-5L4 15v5zM13 6l5 5'}))))
      },
    }
