    const PROFILE_NS = 'abinadwan-personal-profile'
    const PERSONAL_FIELDS = ['preferredName','nationality','gender']
    const POLICY_VALUES = ['private','allow']
    const GENDER_VALUES = ['','male','female','unspecified']
    // v4 removes both sharing switches and Ask First. Legacy records are read-only.
    const PROFILE_VERSION = 4
    const LEGACY_POLICY_VALUES = ['private','ask_first','allow']
    const PROFILE_CUSTOM_MAX = 8192
    const privatePolicies = () => Object.fromEntries(PERSONAL_FIELDS.map(key=>[key,'private']))
    const emptyInformation = () => ({preferredName:'',nationality:'',gender:''})
    const emptyProfileRecord = () => ({version:PROFILE_VERSION,locale:'auto',information:emptyInformation(),
      preferences:neutralProfilePreferences(),policies:privatePolicies()})
    // Payload guard for the serialized record (UTF-16 units) and for restore
    // text/files. Large enough for any v1 record with many Workspace rows.
    const PROFILE_MAX_CHARS = 3_000_000
    const profileTooLarge = value => JSON.stringify(value).length > PROFILE_MAX_CHARS
    const sameJson = (a,b) => JSON.stringify(a)===JSON.stringify(b)
    const profileKeys = (value,keys) => value && typeof value==='object' && !Array.isArray(value) &&
      Object.keys(value).length===keys.length && keys.every(key=>Object.hasOwn(value,key))
    // Errors carry a reason code only; never user-supplied content.
    const profileError = code => Object.assign(new Error('Invalid My Profile settings'),{code})
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
    function decodePolicies(p,legacy=false) {
      profileCheck(profileKeys(p,PERSONAL_FIELDS),'invalidPolicy')
      profileCheck(PERSONAL_FIELDS.every(key=>(legacy?LEGACY_POLICY_VALUES:POLICY_VALUES).includes(p[key])),'invalidPolicy')
      return Object.fromEntries(PERSONAL_FIELDS.map(key=>[key,p[key]]))
    }
    function profileRoot(value) {
      profileCheck(value!==null&&typeof value==='object'&&!Array.isArray(value))
      profileCheck(!profileTooLarge(value),'tooLarge')
    }
    /** Saved unified records must be complete. Backups have a separate decoder. */
    function decodeProfile(value) {
      profileRoot(value)
      profileCheck([2,3,PROFILE_VERSION].includes(value.version),'unsupportedVersion')
      const legacy=value.version!==PROFILE_VERSION
      const keys=['version','locale','information','preferences','policies']
      if(legacy)keys.push('allowPersonalInformation','allowCloud')
      profileCheck(profileKeys(value,keys))
      profileCheck((value.version===PROFILE_VERSION?['auto','en','ar','zh','es','fr','de','ja']:['ar','en']).includes(value.locale)&&(!legacy||(typeof value.allowPersonalInformation==='boolean'&&typeof value.allowCloud==='boolean')))
      return {version:value.version,locale:value.locale,information:decodeInformation(value.information),
        preferences:decodePreferences(value.preferences),policies:decodePolicies(value.policies,legacy),
        ...(legacy?{allowPersonalInformation:value.allowPersonalInformation,allowCloud:value.allowCloud}:{})}
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
        return {id:w.id,override:w.override,preferences:decodePreferences(w.preferences),policies:decodePolicies(w.policies,true)}
      })
      return {version:1,locale:value.locale,information:decodeInformation(value.information),global:decodePreferences(value.global),
        workspaces,allowPersonalInformation:value.allowPersonalInformation,allowCloud:value.allowCloud}
    }
    function decodeAnyProfile(value) {
      profileRoot(value)
      return value.version===1 ? {legacy:decodeLegacyProfile(value)} : {record:decodeProfile(value)}
    }
    // Migrating v1 keeps information, locale and global preferences (including
    // custom instructions). Workspace rows are never merged or promoted:
    // unified policies start Private and both switches Off, because consent
    // given under the per-Workspace model does not carry over.
    function migrateLegacyProfile(legacy) {
      return {version:PROFILE_VERSION,locale:legacy.locale,information:{...legacy.information},
        preferences:withoutCustomConsent(decodePreferences(legacy.global)),policies:privatePolicies()}
    }
    /** Workspace-specific data or permissions that a migration would discard. */
    const legacyDiscards = legacy => legacy.workspaces.length>0||legacy.allowPersonalInformation||legacy.allowCloud
    function profileView(view) {
      if(view?.ns!==PROFILE_NS || !Number.isSafeInteger(view.revision)||view.revision<0||!profileKeys(view.value,['record'])) throw new Error('Settings unavailable')
      const decoded=decodeAnyProfile(view.value.record)
      return {revision:view.revision,record:decoded.record||null,legacy:decoded.legacy||null}
    }
    // Overlay only supplied leaves. Arrays and scalar values are replaced whole.
    function overlayProfile(base, patch) {
      return {...base,...patch,version:PROFILE_VERSION,
        information:{...base.information,...patch.information},
        preferences:{...base.preferences,...patch.preferences,traits:{...base.preferences.traits,...patch.preferences?.traits}},
      }
    }
    function decodeUnifiedBackup(value) {
      profileCheck([2,3,PROFILE_VERSION].includes(value.version),'unsupportedVersion')
      const objectField=(parent,key,code)=>{
        if(Object.hasOwn(parent,key)){
          const field=parent[key]
          profileCheck(field!==null&&typeof field==='object'&&!Array.isArray(field),code)
        }
      }
      for(const key of ['information','preferences','policies']) objectField(value,key,key==='policies'?'invalidPolicy':undefined)
      if(value.preferences)objectField(value.preferences,'traits')
      const base=emptyProfileRecord()
      const legacy=value.version!==PROFILE_VERSION
      const candidate={...overlayProfile(base,value),version:value.version,policies:{...base.policies,...value.policies}}
      // v1-v3 backups cannot express 'auto'; an omitted locale is a valid
      // sparse backup and must not inherit the current v4 default.
      if(legacy&&!Object.hasOwn(value,'locale'))candidate.locale='ar'
      if(legacy){
        for(const key of ['allowPersonalInformation','allowCloud'])if(!Object.hasOwn(value,key))candidate[key]=false
      }
      decodeProfile(candidate)
      const {allowPersonalInformation,allowCloud,...rest}=value
      return {...rest,version:PROFILE_VERSION,...(value.policies?{policies:Object.fromEntries(Object.entries(value.policies).map(([k,v])=>[k,v==='allow'?'allow':'private']))}:{})}
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
    function PersonalProfilePage({settings,connectionSource,localeSource,useRemoteAccess}) {
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
      const [restoreStrategy,setRestoreStrategy]=React.useState('merge')
      const [replaceAck,setReplaceAck]=React.useState(false)
      const [restoreReview,setRestoreReview]=React.useState(null)
      const [restoreAck,setRestoreAck]=React.useState(false)
      const [restorePermissions,setRestorePermissions]=React.useState(false)
      const [permissionsAck,setPermissionsAck]=React.useState(false)
      const [mergedText,setMergedText]=React.useState(null)
      const importGeneration=React.useRef(0)
      const request=React.useRef(0)
      const inFlight=React.useRef(false)
      const access=React.useRef({canRead,canWrite,generation})
      access.current={canRead,canWrite,generation}
      const lifetimeValid = g=>connectionSource.getSnapshot()===g&&access.current.canRead
      const clearRestore=()=>{
        importGeneration.current++
        setRestoreReview(null);setRestoreStrategy('merge');setRestoreAck(false);setReplaceAck(false)
        setRestorePermissions(false);setPermissionsAck(false);setMergedText(null)
      }
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
          }else{
            const stored=snapshot.record
            const upgrade=stored.version!==PROFILE_VERSION
            const {allowPersonalInformation,allowCloud,...rest}=stored
            setRecord(upgrade ? {...rest,version:PROFILE_VERSION,policies:privatePolicies()} : stored)
            setSaved(stored);setRevision(snapshot.revision);setStatus(upgrade?'sharingUpgrade':'ready')
          }
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
        return()=>{request.current++;importGeneration.current++;inFlight.current=false}
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
      const hostSnapshot=React.useSyncExternalStore(localeSource.subscribe,localeSource.getSnapshot,localeSource.getSnapshot)
      const hostLanguage=['en','ar','zh','es','fr','de','ja'].includes(hostSnapshot?.active)?hostSnapshot.active:'en'
      const language=record.locale==='auto'?hostLanguage:record.locale
      const values=record.information,preferences=record.preferences
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
        subtitle:'ملف شخصي موحّد ضمن ملف Harness الحالي',warning:'يُحفظ هذا المحتوى محليًا دون تشفير خاص بالإضافة. لا تكتب كلمات مرور أو مفاتيح أو معلومات حساسة. تُرسل تفضيلات الرد المحفوظة إلى النموذج المختار وقد تبقى في سجل المحادثة. تُرسل المعلومات التي تحدد إتاحتها وتحفظها فقط إلى النموذج المختار، بما فيه السحابي.',
        language:'لغة الواجهة',preferredName:'الاسم المفضل',nationality:'الجنسية',gender:'الجنس',male:'ذكر',female:'أنثى',unspecified:'أفضّل عدم الذكر',
        unified:'إعدادات موحّدة',unifiedHint:'تُطبّق التفضيلات المحفوظة عند تجهيز الخطوة التالية في المحادثات الأصلية المدعومة، دون اختيار مساحة عمل. قد تتجاوزها بعض إعدادات الوكيل الخاصة.',
        personality:'الشخصية',styleTone:'الأسلوب والنبرة',responseLanguage:'لغة الردود',characteristics:'خصائص الردود',presets:'خيارات سلوكية جاهزة',customInstructions:'تعليمات مخصصة',
        sendCustom:'أوافق على إرسال النص المخصص للنموذج المختار (بما فيه السحابي)',customConsentHint:'النص قد يبقى في سجل المحادثة ويعاد إرساله لاحقًا. لا تضع بيانات حساسة. تعديل النص أو استعادته يلغي الإذن؛ احفظ بعد المراجعة.',
        less:'أقل',neutral:'متوازن',more:'أكثر',characters:'حرف',
        preferenceHint:'كل الاختيارات اختيارية وتُطبّق بعد الحفظ.',languageHint:'لغة الردود مستقلة عن لغة الواجهة. اللهجة تُكتب ضمن التعليمات.',
        previewHint:'معاينة المسودة التي ستُرسل بعد الحفظ في المحادثات المدعومة؛ لا تُحذف التعليمات السابقة من السجل.',presetHint:'لا اختيار افتراضيًا.',resetPreferences:'إعادة ضبط التفضيلات',
        effective:'المعاينة النهائية',optIn:'السماح بمشاركة المعلومات الشخصية مع النموذج',
        fieldPolicies:'صلاحيات الحقول',policiesHint:'صلاحية واحدة لكل حقل تنطبق على الملف كله، لا على مساحة عمل بعينها.',private:'خاص',ask:'اسأل أولًا',allow:'سماح',on:'مفعّل',off:'متوقف',
        cloud:'السماح بمشاركة المعلومات الشخصية مع المزودين السحابيين',accessHint:'حدد المعلومات التي تريد إتاحتها للوكيل ثم احفظ. غير المحدد يبقى خاصًا. ينطبق اختيارك على جميع النماذج والمزودين.',
        available:'متاح للوكيل',sharedTitle:'المعلومات المتاحة بعد الحفظ',sharedNone:'لا تتم مشاركة أي شيء.',
        retention:'قد تبقى التفاصيل التي شاركتها سابقًا لدى المزود أو في سجل المحادثة أو سجلات Harness أو الملخصات أو الفروع. إذا احتوى طلب على تفاصيل أضافها الملف سابقًا ولم تعد متاحة، فقد يتوقف. ابدأ محادثة جديدة للمتابعة.',
        exportTitle:'تصدير نسخة احتياطية',exportHint:'نسخ JSON الاحتياطية غير مشفّرة، وتحتوي على المسودة الحالية، بما فيها التغييرات غير المحفوظة في المعلومات الشخصية والتعليمات وصلاحيات الحقول. عند اختيار الإنجليزية أو العربية يدويًا يُستخدم إصدار 2 للتوافق؛ أما «اتباع لغة DSH» واللغات الأخرى فتستخدم إصدار 4 للاحتفاظ بالاختيار. احفظ النسخة بأمان ولا تشاركها.',
        download:'تنزيل ملف JSON',copy:'نسخ JSON',view:'عرض JSON',hideView:'إخفاء JSON',exportJson:'نسخة JSON',
        importTitle:'استيراد واستعادة',importHint:'اختر ملف JSON أو الصقه، ثم راجعه. لا يُحفظ شيء قبل الضغط على «حفظ التغييرات».',
        importFile:'استيراد ملف JSON',pasteJson:'لصق JSON يدويًا',import:'مراجعة النسخة',cancelRestore:'إلغاء الاستعادة',
        strategy:'طريقة الاستعادة',replaceAll:'استبدال الكل',replaceAllHint:'تحل الإعدادات المستوردة محل الحالية، ويُلغى إذن إرسال النص المخصص.',
        reviewMerge:'المراجعة والدمج',reviewMergeHint:'تبقى الحقول غير الموجودة في النسخة كما هي. تُضاف فقرات التعليمات الجديدة دون تكرار، ويمكنك تعديل النص في المعاينة. القيمة النصية الفارغة تمسح التعليمات.',
        previewTitle:'معاينة الاستعادة',setting:'الإعداد',current:'المسودة الحالية',proposed:'بعد الاستعادة',interfaceLanguage:'لغة الواجهة',
        mergedLabel:'التعليمات بعد الدمج (قابلة للتعديل)',importedInstructions:'التعليمات المستوردة',none:'لا شيء',empty:'—',
        permissionsTitle:'الصلاحيات المحفوظة في النسخة',restorePermissions:'استعادة الصلاحيات المحفوظة في هذه النسخة',
        permissionsDefault:'يبقي الدمج إتاحة الحقول غير المتغيرة، وتصبح الحقول المستوردة المتغيرة خاصة افتراضيًا. استبدال الكل يبدأ بخيارات خاصة.',permissionsAck:'أوافق على إتاحة الحقول المحددة في هذه النسخة لجميع النماذج بعد الحفظ.',
        permissionsLegacy:'لا تحتوي هذه النسخة على خيارات إتاحة قابلة للاستعادة.',
        switchesOff:'متوقف بعد الاستعادة',replaceConfirm:'أوافق على استبدال مسودتي الحالية واستعادة القيم الافتراضية للحقول الغائبة عن النسخة.',
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
        migrationMasters:'مفاتيح المشاركة العامة كانت مفعّلة؛ لن تنتقل صلاحياتها إلى الإعدادات الجديدة.',
        workspaceId:'معرّف مساحة العمل',overrideCol:'تخصيص',policiesCol:'الصلاحيات',yes:'نعم',no:'لا',
        legacyJson:'إعدادات 0.7.1 الكاملة (JSON)',migrationAck:'راجعت وصدّرت ما أحتاجه، وأوافق على حذف الإعدادات الخاصة بمساحات العمل وإيقاف مفاتيح المشاركة عند الحفظ.',
        migration:'إعدادات من إصدار سابق بانتظار الترحيل. راجعها ثم احفظ.',
        sharingUpgrade:'حُمّلت معلوماتك السابقة دون إتاحتها تلقائيًا. حدد ما تريد إتاحته ثم احفظ.',
        upgradeTitle:'نسخة احتياطية قبل التحديث',
        upgradeRollback:'يحدّث الحفظ إعدادات Harness إلى الإصدار 4. للرجوع إلى إصدار أقدم، تحتاج إلى إعدادات Harness المؤرشفة أو نسخة JSON احتياطية بصيغة الإصدار 2. صدّر نسخة قبل الحفظ إذا كنت تخطط للرجوع.',
        reset:'إعادة ضبط المسودة',missing:'غير محدد',noInstruction:'لا توجد تعليمات.',save:'حفظ التغييرات',reload:'إعادة التحميل (تجاهل المسودة)',
        loading:'جارٍ قراءة الإعدادات…',unavailable:'الإعدادات المحلية غير متاحة أو غير قابلة للكتابة. لم يتم حفظ شيء.',ready:'الإعدادات محمّلة.',saving:'جارٍ الحفظ…',saved:'تم تأكيد الحفظ من Harness.',
        failed:'تعذر تأكيد الحفظ. أعد التحميل للتحقق قبل المحاولة.',conflict:'تغيرت الإعدادات في نافذة أخرى. أعد التحميل ثم أعد تعديلها.',invalid:'الإعدادات أو النسخة غير صالحة.',dirty:'توجد تغييرات غير محفوظة.',
        tooLarge:'الإعدادات أكبر من الحد المسموح للحفظ. لم يُحفظ شيء، وبقيت تعديلاتك في المسودة.',
        reconnected:'أُعيد الاتصال. بقيت مسودتك في الصفحة: يمكنك الحفظ (يتحقق Harness من الإصدار) أو إعادة التحميل.',
        discardWarning:'لديك تغييرات غير محفوظة ستُفقد عند إعادة التحميل. للاحتفاظ بها انسخ نسخة JSON أولًا من «النسخ والاستعادة».',
        discardConfirm:'تجاهل التغييرات وإعادة التحميل',discardCancel:'متابعة التعديل',followDsh:'اتباع لغة DSH',
      }
      const en = {
        information:'My Information',instructions:'Agent Instructions',access:'Access Control',backup:'Backup & Restore',privacy:'Privacy & Security',title:'My Profile',
        subtitle:'One unified profile in the active Harness Profile',warning:'Stored locally without plugin-level encryption. Do not enter passwords, keys or sensitive information. Saved response preferences are sent to the selected model and may remain in conversation history. Only saved, checked personal information is added to supported native model requests, including cloud models.',
        language:'Interface language',preferredName:'Preferred name',nationality:'Nationality',gender:'Gender',male:'Male',female:'Female',unspecified:'Prefer not to say',
        unified:'Unified preferences',unifiedHint:'Saved preferences apply at the next assembled step in supported native conversations, independent of Workspace. Some agent presets may override them.',
        personality:'Personality',styleTone:'Style and tone',responseLanguage:'Response language',characteristics:'Response characteristics',presets:'Behavior presets',customInstructions:'Custom instructions',
        sendCustom:'Allow sending custom text to selected models (including cloud)',customConsentHint:'Text can remain in conversation history and be replayed. Do not include sensitive data. Editing or restoring text clears consent; review and Save.',
        less:'Less',neutral:'Balanced',more:'More',characters:'characters',
        preferenceHint:'Optional choices apply after Save.',languageHint:'Response language is separate from interface language. Put dialect preferences in custom instructions.',
        previewHint:'Draft preview of what is contributed after Save in supported conversations. Earlier instructions are not erased from history.',presetHint:'None selected by default.',resetPreferences:'Reset preferences',
        effective:'Effective preview',optIn:'Allow sharing personal information with the model',
        fieldPolicies:'Field policies',policiesHint:'One policy per field for the whole profile, not per Workspace.',private:'Private',ask:'Ask First',allow:'Allow',on:'On',off:'Off',
        cloud:'Allow sharing personal information with cloud providers',accessHint:'Check the information you want to make available to the agent, then Save. Unchecked fields stay private. Your choices apply to all models and providers.',
        available:'Available to agent',sharedTitle:'Information available after Save',sharedNone:'Nothing is shared.',
        retention:'Earlier disclosures can remain with providers and in conversation history, Harness logs, summaries and branches. If a request carries a recognizable Profile details block no longer authorized, it is stopped. Start a new chat to continue.',
        exportTitle:'Export backup',exportHint:'JSON backups are not encrypted. They contain the current draft, including unsaved changes to personal information, instructions and access permissions. English/Arabic overrides export legacy version 2 for compatibility; Follow DSH and other languages export version 4 to preserve that choice. Store securely and do not share.',
        download:'Download JSON file',copy:'Copy JSON',view:'View JSON',hideView:'Hide JSON',exportJson:'JSON backup',
        importTitle:'Import and restore',importHint:'Choose a JSON file or paste JSON, then review it. Nothing is saved until you press Save changes.',
        importFile:'Import JSON file',pasteJson:'Paste JSON manually',import:'Review backup',cancelRestore:'Cancel restore',
        strategy:'Restore strategy',replaceAll:'Replace All',replaceAllHint:'Imported settings replace current settings, including custom instructions; custom-text sending consent is cleared.',
        reviewMerge:'Review & Merge',reviewMergeHint:'Keep settings the backup leaves out. Review the merged custom instructions and edit them if needed. An empty custom instruction value clears the text.',
        previewTitle:'Restore preview',setting:'Setting',current:'Current draft',proposed:'After restore',interfaceLanguage:'Interface language',
        mergedLabel:'Merged instructions (editable)',importedInstructions:'Imported instructions',none:'None',empty:'—',
        permissionsTitle:'Permissions saved in this backup',restorePermissions:'Restore the permissions saved in this backup',
        permissionsDefault:'Review & Merge keeps sharing choices for unchanged fields. Changed imported fields start Private. Replace All starts with all fields Private.',permissionsAck:'I want to apply these field choices to all models after Save.',
        permissionsLegacy:'This backup has no field sharing choices to restore.',
        switchesOff:'Off after restore',replaceConfirm:'I want to replace my current draft and reset settings omitted from the backup to their defaults.',
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
        migrationMasters:'The old sharing switches were On; their permissions will not carry forward.',
        workspaceId:'Workspace ID',overrideCol:'Override',policiesCol:'Policies',yes:'Yes',no:'No',
        legacyJson:'Complete 0.7.1 settings (JSON)',migrationAck:'I reviewed and exported what I need, and agree to remove the Workspace-specific settings and turn the sharing switches Off when saving.',
        migration:'Settings from an earlier version await migration. Review them, then Save.',
        sharingUpgrade:'Earlier settings were loaded with all fields Private. Check the fields you wish to share, then Save.',
        upgradeTitle:'Backup before upgrading',
        upgradeRollback:'Save upgrades your Harness settings to version 4. Older versions require an archived Harness configuration or a version 2 JSON backup. Export a backup before saving if you may downgrade.',
        reset:'Reset draft',missing:'Not set',noInstruction:'No instructions.',save:'Save changes',reload:'Reload (discard draft)',
        loading:'Reading settings…',unavailable:'Local settings unavailable or not writable. Nothing saved.',ready:'Settings loaded.',saving:'Saving…',saved:'Save confirmed by Harness.',
        failed:'Save not confirmed. Reload to verify before retrying.',conflict:'Settings changed in another window. Reload and reapply edits.',invalid:'Invalid settings or backup.',dirty:'Unsaved changes.',
        tooLarge:'Settings are too large to save. Nothing was saved; your edits remain in the draft.',
        reconnected:'Connection was reset. Your draft is kept on this page: you can Save (Harness checks the revision) or Reload.',
        discardWarning:'You have unsaved changes that Reload will discard. To keep them, first export a JSON backup from Backup & Restore.',
        discardConfirm:'Discard changes and reload',discardCancel:'Keep editing',followDsh:'Follow DSH',
      }
      const es = {
        "information": "Mis datos",
        "instructions": "Instrucciones del agente",
        "access": "Control de acceso",
        "backup": "Copia de seguridad y restauración",
        "privacy": "Privacidad y seguridad",
        "title": "Mi perfil",
        "subtitle": "Un perfil unificado en el perfil activo de Harness",
        "warning": "Los datos se guardan localmente sin cifrado propio del complemento. No introduzcas contraseñas, claves ni información sensible. Las preferencias de respuesta guardadas se envían al modelo seleccionado y pueden permanecer en el historial. Solo se añaden a las solicitudes admitidas los datos personales guardados que hayas autorizado, incluso con modelos en la nube.",
        "language": "Idioma de la interfaz",
        "preferredName": "Nombre preferido",
        "nationality": "Nacionalidad",
        "gender": "Género",
        "male": "Hombre",
        "female": "Mujer",
        "unspecified": "Prefiero no indicarlo",
        "unified": "Preferencias unificadas",
        "unifiedHint": "Las preferencias guardadas se aplican al siguiente paso de las conversaciones nativas admitidas, independientemente del espacio de trabajo. Algunas configuraciones del agente pueden prevalecer.",
        "personality": "Personalidad",
        "styleTone": "Estilo y tono",
        "responseLanguage": "Idioma de respuesta",
        "characteristics": "Características de respuesta",
        "presets": "Opciones de comportamiento",
        "customInstructions": "Instrucciones personalizadas",
        "sendCustom": "Permitir enviar texto personalizado a los modelos seleccionados (incluidos los de la nube)",
        "customConsentHint": "El texto puede permanecer en el historial y volver a enviarse. No incluyas datos sensibles. Editar o restaurar el texto revoca el consentimiento; revísalo y guarda de nuevo.",
        "less": "Menos",
        "neutral": "Equilibrado",
        "more": "Más",
        "characters": "caracteres",
        "preferenceHint": "Las opciones son voluntarias y se aplican al guardar.",
        "languageHint": "El idioma de respuesta es independiente del idioma de la interfaz. Indica las preferencias de dialecto en las instrucciones personalizadas.",
        "previewHint": "Vista previa del borrador que se enviará tras guardar en las conversaciones admitidas. Las instrucciones anteriores no se borran del historial.",
        "presetHint": "No hay opciones preseleccionadas.",
        "resetPreferences": "Restablecer preferencias",
        "effective": "Vista previa efectiva",
        "optIn": "Permitir compartir datos personales con el modelo",
        "fieldPolicies": "Permisos de los campos",
        "policiesHint": "Un permiso por campo para todo el perfil, no por espacio de trabajo.",
        "private": "Privado",
        "ask": "Preguntar primero",
        "allow": "Permitir",
        "on": "Activado",
        "off": "Desactivado",
        "cloud": "Permitir compartir datos personales con proveedores en la nube",
        "accessHint": "Marca los datos que quieres poner a disposición del agente y guarda. Los campos no marcados siguen siendo privados. Las elecciones se aplican a todos los modelos y proveedores.",
        "available": "Disponible para el agente",
        "sharedTitle": "Información disponible después de guardar",
        "sharedNone": "No se comparte nada.",
        "retention": "Los datos compartidos anteriormente pueden permanecer en el proveedor, el historial, los registros, los resúmenes o las ramas de Harness. Si una solicitud contiene datos del perfil previamente compartidos que ya no están autorizados, se detendrá. Inicia una conversación nueva para continuar.",
        "exportTitle": "Exportar copia de seguridad",
        "exportHint": "Las copias JSON no están cifradas. Contienen el borrador actual, incluidos los cambios sin guardar en los datos personales, las instrucciones y los permisos. La selección manual de inglés o árabe exporta la versión 2 por compatibilidad; Seguir DSH y otros idiomas usan la versión 4 para conservar la preferencia. Guárdala de forma segura y no la compartas.",
        "download": "Descargar JSON",
        "copy": "Copiar JSON",
        "view": "Ver JSON",
        "hideView": "Ocultar JSON",
        "exportJson": "Copia JSON",
        "importTitle": "Importar y restaurar",
        "importHint": "Selecciona un archivo JSON o pega su contenido y revísalo. Nada se guarda hasta pulsar Guardar cambios.",
        "importFile": "Importar archivo JSON",
        "pasteJson": "Pegar JSON manualmente",
        "import": "Revisar copia",
        "cancelRestore": "Cancelar restauración",
        "strategy": "Método de restauración",
        "replaceAll": "Sustituir todo",
        "replaceAllHint": "La configuración importada sustituye a la actual, incluidas las instrucciones personalizadas; se revoca el permiso de enviarlas.",
        "reviewMerge": "Revisar y combinar",
        "reviewMergeHint": "Se conservan los ajustes ausentes en la copia. Revisa y edita las instrucciones combinadas. Un valor vacío elimina el texto.",
        "previewTitle": "Vista previa de restauración",
        "setting": "Ajuste",
        "current": "Borrador actual",
        "proposed": "Después de restaurar",
        "interfaceLanguage": "Idioma de la interfaz",
        "mergedLabel": "Instrucciones combinadas (editables)",
        "importedInstructions": "Instrucciones importadas",
        "none": "Ninguno",
        "empty": "—",
        "permissionsTitle": "Permisos guardados en esta copia",
        "restorePermissions": "Restaurar los permisos de esta copia",
        "permissionsDefault": "Combinar conserva los permisos de los campos sin cambios. Los campos importados modificados empiezan como Privados. Sustituir todo deja todos los campos como Privados.",
        "permissionsAck": "Quiero aplicar estos permisos de campos a todos los modelos después de guardar.",
        "permissionsLegacy": "Esta copia no contiene permisos de campos que se puedan restaurar.",
        "switchesOff": "Desactivado tras restaurar",
        "replaceConfirm": "Acepto sustituir mi borrador y restablecer los campos ausentes a sus valores predeterminados.",
        "legacyEntries": "Ajustes por espacio de trabajo que no se restaurarán:",
        "confirm": "He revisado esta copia y quiero aplicarla al borrador.",
        "applyRestore": "Aplicar restauración al borrador",
        "reviewReady": "Copia válida. Revisa la vista previa antes de aplicarla.",
        "restoreApplied": "Restauración aplicada solo al borrador. Aún no se ha guardado nada: pulsa Guardar cambios.",
        "invalidJson": "El texto no es JSON válido.",
        "unsupportedVersion": "Versión de copia no admitida.",
        "invalidPolicy": "La copia contiene un permiso no válido o no admitido.",
        "instructionsTooLong": "Las instrucciones superan los 8192 caracteres. No se ha recortado ni aplicado nada.",
        "invalidContent": "El contenido de la copia no es válido o tiene campos desconocidos.",
        "mergeTooLong": "Las instrucciones combinadas superan los 8192 caracteres. Acórtalas antes de aplicarlas; nada se recorta automáticamente.",
        "fileTooLarge": "El archivo supera el límite de 3 000 000 bytes.",
        "fileReadFailed": "No se pudo leer el archivo.",
        "copied": "JSON copiado al portapapeles.",
        "copyFailed": "No se pudo copiar. Usa Ver JSON y copia el texto manualmente.",
        "downloaded": "Descarga iniciada. Comprueba que se haya guardado.",
        "downloadFailed": "La descarga no está disponible aquí. Usa Copiar JSON o Ver JSON.",
        "migrationTitle": "Migrar ajustes de la versión 0.7.1",
        "migrationHint": "Se encontraron ajustes anteriores por espacio de trabajo. La migración conserva tus datos, idioma de la interfaz, preferencias globales e instrucciones. Nada cambia hasta pulsar Guardar cambios.",
        "migrationKept": "No hay ajustes por espacio de trabajo; no se eliminará nada.",
        "migrationDiscard": "Los siguientes ajustes no pasan al perfil unificado y se eliminarán al guardar. Expórtalos antes si quieres conservarlos:",
        "migrationMasters": "Las opciones antiguas de uso compartido estaban activadas; sus permisos no se transferirán.",
        "workspaceId": "ID de espacio",
        "overrideCol": "Anulación",
        "policiesCol": "Permisos",
        "yes": "Sí",
        "no": "No",
        "legacyJson": "Ajustes completos de 0.7.1 (JSON)",
        "migrationAck": "He revisado y exportado lo necesario, y acepto eliminar los ajustes por espacio de trabajo y desactivar las opciones antiguas al guardar.",
        "migration": "Hay ajustes de una versión anterior pendientes de migración. Revísalos y guarda.",
        "sharingUpgrade": "Los datos anteriores se cargaron como privados. Marca los que quieras compartir y guarda.",
        "upgradeTitle": "Copia antes de actualizar",
        "upgradeRollback": "Guardar actualiza los ajustes de Harness a la versión 4. Para volver a una versión anterior necesitas una configuración archivada o una copia JSON de versión 2. Exporta una copia antes de guardar si podrías volver atrás.",
        "reset": "Restablecer borrador",
        "missing": "Sin especificar",
        "noInstruction": "Sin instrucciones.",
        "save": "Guardar cambios",
        "reload": "Recargar (descartar borrador)",
        "loading": "Leyendo ajustes…",
        "unavailable": "Los ajustes locales no están disponibles o no son editables. Nada guardado.",
        "ready": "Ajustes cargados.",
        "saving": "Guardando…",
        "saved": "Harness ha confirmado el guardado.",
        "failed": "No se confirmó el guardado. Recarga para verificar antes de reintentar.",
        "conflict": "Los ajustes cambiaron en otra ventana. Recarga y vuelve a aplicar los cambios.",
        "invalid": "Ajustes o copia no válidos.",
        "dirty": "Cambios sin guardar.",
        "tooLarge": "Los ajustes superan el límite. Nada guardado; se mantiene el borrador.",
        "reconnected": "Se restableció la conexión. Tu borrador permanece aquí; puedes guardar (Harness comprueba la revisión) o recargar.",
        "discardWarning": "Tienes cambios sin guardar que se perderán al recargar. Para conservarlos, exporta antes una copia JSON.",
        "discardConfirm": "Descartar cambios y recargar",
        "discardCancel": "Seguir editando",
        "followDsh": "Seguir el idioma de DSH"
      }
      const fr = {
        "information": "Mes informations",
        "instructions": "Instructions de l’agent",
        "access": "Contrôle d’accès",
        "backup": "Sauvegarde et restauration",
        "privacy": "Confidentialité et sécurité",
        "title": "Mon profil",
        "subtitle": "Un profil unifié dans le profil Harness actif",
        "warning": "Les données sont stockées localement sans chiffrement propre au module. Ne saisissez pas de mots de passe, de clés ou d’informations sensibles. Les préférences de réponse enregistrées sont transmises au modèle choisi et peuvent rester dans l’historique. Seules les informations personnelles enregistrées et explicitement autorisées sont ajoutées aux requêtes natives prises en charge, y compris vers les modèles cloud.",
        "language": "Langue de l’interface",
        "preferredName": "Prénom préféré",
        "nationality": "Nationalité",
        "gender": "Genre",
        "male": "Homme",
        "female": "Femme",
        "unspecified": "Préfère ne pas préciser",
        "unified": "Préférences unifiées",
        "unifiedHint": "Les préférences enregistrées s’appliquent à la prochaine étape des conversations natives prises en charge, quel que soit l’espace de travail. Certains préréglages de l’agent peuvent prévaloir.",
        "personality": "Personnalité",
        "styleTone": "Style et ton",
        "responseLanguage": "Langue des réponses",
        "characteristics": "Caractéristiques des réponses",
        "presets": "Préréglages de comportement",
        "customInstructions": "Instructions personnalisées",
        "sendCustom": "Autoriser l’envoi du texte personnalisé aux modèles choisis (cloud compris)",
        "customConsentHint": "Ce texte peut rester dans l’historique et être renvoyé. N’y mettez pas de données sensibles. Modifier ou restaurer le texte annule l’autorisation : vérifiez puis enregistrez à nouveau.",
        "less": "Moins",
        "neutral": "Équilibré",
        "more": "Plus",
        "characters": "caractères",
        "preferenceHint": "Les choix facultatifs prennent effet après l’enregistrement.",
        "languageHint": "La langue des réponses est indépendante de celle de l’interface. Précisez les variantes régionales dans les instructions personnalisées.",
        "previewHint": "Aperçu du brouillon envoyé après enregistrement dans les conversations prises en charge. Les anciennes instructions ne sont pas supprimées de l’historique.",
        "presetHint": "Aucun préréglage sélectionné par défaut.",
        "resetPreferences": "Réinitialiser les préférences",
        "effective": "Aperçu effectif",
        "optIn": "Autoriser le partage d’informations personnelles avec le modèle",
        "fieldPolicies": "Autorisations des champs",
        "policiesHint": "Une autorisation par champ pour tout le profil, pas par espace de travail.",
        "private": "Privé",
        "ask": "Demander d’abord",
        "allow": "Autoriser",
        "on": "Activé",
        "off": "Désactivé",
        "cloud": "Autoriser le partage avec des fournisseurs cloud",
        "accessHint": "Cochez les informations que l’agent peut utiliser, puis enregistrez. Les champs non cochés restent privés. Vos choix s’appliquent à tous les modèles et fournisseurs.",
        "available": "Accessible à l’agent",
        "sharedTitle": "Informations accessibles après enregistrement",
        "sharedNone": "Aucune information partagée.",
        "retention": "Les données communiquées auparavant peuvent rester chez les fournisseurs, dans l’historique, les journaux Harness, les résumés et les branches. Une requête contenant un ancien bloc d’informations désormais non autorisé peut être arrêtée. Ouvrez une nouvelle conversation pour poursuivre.",
        "exportTitle": "Exporter une sauvegarde",
        "exportHint": "Les sauvegardes JSON ne sont pas chiffrées. Elles contiennent le brouillon actuel, y compris les modifications non enregistrées des informations personnelles, des instructions et des autorisations. Un choix manuel d’anglais ou d’arabe exporte la version 2 compatible ; Suivre DSH et les autres langues utilisent la version 4 pour préserver ce choix. Conservez-les en lieu sûr.",
        "download": "Télécharger le JSON",
        "copy": "Copier le JSON",
        "view": "Afficher le JSON",
        "hideView": "Masquer le JSON",
        "exportJson": "Sauvegarde JSON",
        "importTitle": "Importer et restaurer",
        "importHint": "Choisissez un fichier JSON ou collez son contenu, puis vérifiez-le. Rien n’est enregistré avant de cliquer sur Enregistrer les modifications.",
        "importFile": "Importer un fichier JSON",
        "pasteJson": "Coller du JSON",
        "import": "Examiner la sauvegarde",
        "cancelRestore": "Annuler la restauration",
        "strategy": "Méthode de restauration",
        "replaceAll": "Tout remplacer",
        "replaceAllHint": "Les paramètres importés remplacent les paramètres actuels, y compris les instructions personnalisées ; l’autorisation d’envoi du texte est annulée.",
        "reviewMerge": "Examiner et fusionner",
        "reviewMergeHint": "Conservez les réglages absents de la sauvegarde. Vérifiez et modifiez les instructions fusionnées si besoin. Une valeur vide efface le texte.",
        "previewTitle": "Aperçu de la restauration",
        "setting": "Paramètre",
        "current": "Brouillon actuel",
        "proposed": "Après restauration",
        "interfaceLanguage": "Langue de l’interface",
        "mergedLabel": "Instructions fusionnées (modifiables)",
        "importedInstructions": "Instructions importées",
        "none": "Aucun",
        "empty": "—",
        "permissionsTitle": "Autorisations de cette sauvegarde",
        "restorePermissions": "Restaurer les autorisations de cette sauvegarde",
        "permissionsDefault": "La fusion conserve les autorisations des champs inchangés. Les champs importés modifiés sont privés par défaut. Tout remplacer remet tous les champs en privé.",
        "permissionsAck": "Je souhaite appliquer ces autorisations à tous les modèles après enregistrement.",
        "permissionsLegacy": "Cette sauvegarde ne contient aucune autorisation de champ restaurable.",
        "switchesOff": "Désactivé après restauration",
        "replaceConfirm": "J’accepte de remplacer mon brouillon et de réinitialiser les champs absents de la sauvegarde.",
        "legacyEntries": "Paramètres propres aux espaces de travail qui ne seront pas restaurés :",
        "confirm": "J’ai examiné cette sauvegarde et souhaite l’appliquer au brouillon.",
        "applyRestore": "Appliquer au brouillon",
        "reviewReady": "Sauvegarde valide. Vérifiez l’aperçu avant de l’appliquer.",
        "restoreApplied": "Restauration appliquée au brouillon uniquement. Rien n’est encore enregistré : cliquez sur Enregistrer les modifications.",
        "invalidJson": "Le texte n’est pas du JSON valide.",
        "unsupportedVersion": "Version de sauvegarde non prise en charge.",
        "invalidPolicy": "La sauvegarde contient une autorisation incorrecte ou non prise en charge.",
        "instructionsTooLong": "Les instructions dépassent 8 192 caractères. Aucun texte n’a été coupé ni appliqué.",
        "invalidContent": "Contenu de sauvegarde invalide ou champs inconnus.",
        "mergeTooLong": "Les instructions fusionnées dépassent 8 192 caractères. Raccourcissez-les : aucune troncature automatique.",
        "fileTooLarge": "Le fichier dépasse la limite de 3 000 000 octets.",
        "fileReadFailed": "Impossible de lire le fichier.",
        "copied": "JSON copié dans le presse-papiers.",
        "copyFailed": "Copie impossible. Affichez le JSON et copiez-le manuellement.",
        "downloaded": "Téléchargement lancé. Vérifiez que le fichier a bien été enregistré.",
        "downloadFailed": "Téléchargement indisponible ici. Utilisez Copier le JSON ou Afficher le JSON.",
        "migrationTitle": "Migrer les paramètres de la version 0.7.1",
        "migrationHint": "D’anciens paramètres par espace de travail ont été trouvés. La migration conserve vos informations, la langue de l’interface, les préférences globales et les instructions. Rien ne change avant Enregistrer les modifications.",
        "migrationKept": "Aucun paramètre spécifique aux espaces de travail ; rien ne sera supprimé.",
        "migrationDiscard": "Les paramètres suivants ne seront pas transférés au profil unifié et seront supprimés à l’enregistrement. Exportez-les d’abord pour les conserver.",
        "migrationMasters": "Les anciens commutateurs de partage étaient actifs ; leurs autorisations ne seront pas transférées.",
        "workspaceId": "ID d’espace de travail",
        "overrideCol": "Remplacement",
        "policiesCol": "Autorisations",
        "yes": "Oui",
        "no": "Non",
        "legacyJson": "Paramètres complets 0.7.1 (JSON)",
        "migrationAck": "J’ai examiné et exporté ce qui est nécessaire, et j’accepte la suppression des paramètres par espace de travail et la désactivation des anciens commutateurs à l’enregistrement.",
        "migration": "Des paramètres d’une ancienne version attendent une migration. Vérifiez-les puis enregistrez.",
        "sharingUpgrade": "Les anciennes informations ont été chargées en mode privé. Cochez celles à partager puis enregistrez.",
        "upgradeTitle": "Sauvegarder avant la mise à niveau",
        "upgradeRollback": "L’enregistrement met à niveau les paramètres Harness vers la version 4. Pour revenir en arrière, il faut une configuration archivée ou une sauvegarde JSON de version 2. Exportez une sauvegarde avant d’enregistrer si vous envisagez un retour.",
        "reset": "Réinitialiser le brouillon",
        "missing": "Non renseigné",
        "noInstruction": "Aucune instruction.",
        "save": "Enregistrer les modifications",
        "reload": "Recharger (ignorer le brouillon)",
        "loading": "Lecture des paramètres…",
        "unavailable": "Paramètres locaux indisponibles ou non modifiables. Rien d’enregistré.",
        "ready": "Paramètres chargés.",
        "saving": "Enregistrement…",
        "saved": "Enregistrement confirmé par Harness.",
        "failed": "Enregistrement non confirmé. Rechargez pour vérifier avant de réessayer.",
        "conflict": "Les paramètres ont changé dans une autre fenêtre. Rechargez et réappliquez les modifications.",
        "invalid": "Paramètres ou sauvegarde invalides.",
        "dirty": "Modifications non enregistrées.",
        "tooLarge": "Paramètres trop volumineux. Rien d’enregistré ; vos modifications restent dans le brouillon.",
        "reconnected": "La connexion a été rétablie. Votre brouillon est conservé ; vous pouvez enregistrer (Harness vérifie la révision) ou recharger.",
        "discardWarning": "Vous avez des modifications non enregistrées qui seront perdues au rechargement. Exportez d’abord une sauvegarde JSON pour les conserver.",
        "discardConfirm": "Ignorer les modifications et recharger",
        "discardCancel": "Continuer à modifier",
        "followDsh": "Suivre la langue de DSH"
      }
      const de = {
        "information": "Meine Angaben",
        "instructions": "Agentenanweisungen",
        "access": "Zugriffskontrolle",
        "backup": "Sicherung und Wiederherstellung",
        "privacy": "Datenschutz und Sicherheit",
        "title": "Mein Profil",
        "subtitle": "Ein einheitliches Profil im aktiven Harness-Profil",
        "warning": "Die Daten werden lokal ohne eigene Verschlüsselung des Plugins gespeichert. Gib keine Passwörter, Schlüssel oder sensiblen Informationen ein. Gespeicherte Antwortpräferenzen werden an das gewählte Modell gesendet und können im Chatverlauf verbleiben. Nur gespeicherte, ausdrücklich freigegebene persönliche Angaben werden in unterstützte native Modellanfragen aufgenommen, auch bei Cloudmodellen.",
        "language": "Sprache der Oberfläche",
        "preferredName": "Bevorzugter Name",
        "nationality": "Staatsangehörigkeit",
        "gender": "Geschlecht",
        "male": "Männlich",
        "female": "Weiblich",
        "unspecified": "Keine Angabe",
        "unified": "Einheitliche Einstellungen",
        "unifiedHint": "Gespeicherte Einstellungen gelten ab dem nächsten Schritt in unterstützten nativen Gesprächen, unabhängig vom Workspace. Manche Agentenvorgaben können Vorrang haben.",
        "personality": "Persönlichkeit",
        "styleTone": "Stil und Ton",
        "responseLanguage": "Antwortsprache",
        "characteristics": "Antworteigenschaften",
        "presets": "Verhaltensvorgaben",
        "customInstructions": "Eigene Anweisungen",
        "sendCustom": "Eigene Texte an ausgewählte Modelle senden (auch Cloudmodelle)",
        "customConsentHint": "Texte können im Chatverlauf verbleiben und erneut gesendet werden. Keine sensiblen Daten eingeben. Bearbeiten oder Wiederherstellen widerruft die Einwilligung; anschließend prüfen und speichern.",
        "less": "Weniger",
        "neutral": "Ausgewogen",
        "more": "Mehr",
        "characters": "Zeichen",
        "preferenceHint": "Optionale Einstellungen gelten erst nach dem Speichern.",
        "languageHint": "Die Antwortsprache ist unabhängig von der Oberflächensprache. Dialektwünsche gehören in die eigenen Anweisungen.",
        "previewHint": "Vorschau des Entwurfs, der nach dem Speichern in unterstützten Gesprächen verwendet wird. Frühere Anweisungen werden nicht aus dem Verlauf gelöscht.",
        "presetHint": "Standardmäßig ist nichts ausgewählt.",
        "resetPreferences": "Einstellungen zurücksetzen",
        "effective": "Wirksame Vorschau",
        "optIn": "Persönliche Daten für das Modell freigeben",
        "fieldPolicies": "Feldberechtigungen",
        "policiesHint": "Eine Berechtigung pro Feld für das gesamte Profil, nicht pro Workspace.",
        "private": "Privat",
        "ask": "Zuerst fragen",
        "allow": "Erlauben",
        "on": "Ein",
        "off": "Aus",
        "cloud": "Persönliche Daten für Cloudanbieter freigeben",
        "accessHint": "Wähle die Angaben, die der Agent verwenden darf, und speichere. Nicht markierte Felder bleiben privat. Deine Auswahl gilt für alle Modelle und Anbieter.",
        "available": "Für Agent verfügbar",
        "sharedTitle": "Nach dem Speichern verfügbare Angaben",
        "sharedNone": "Es wird nichts geteilt.",
        "retention": "Früher übermittelte Angaben können bei Anbietern, im Chatverlauf, in Harness-Protokollen, Zusammenfassungen und Zweigen verbleiben. Eine Anfrage mit nicht mehr freigegebenen früheren Profilangaben kann gestoppt werden. Beginne dann einen neuen Chat.",
        "exportTitle": "Sicherung exportieren",
        "exportHint": "JSON-Sicherungen sind nicht verschlüsselt. Sie enthalten den aktuellen Entwurf mit allen ungespeicherten Änderungen an persönlichen Angaben, Anweisungen und Feldberechtigungen. Bei manueller Wahl von Englisch oder Arabisch wird das kompatible Format Version 2 exportiert; DSH folgen und andere Sprachen verwenden Version 4, damit die Auswahl erhalten bleibt. Sicher aufbewahren und nicht weitergeben.",
        "download": "JSON herunterladen",
        "copy": "JSON kopieren",
        "view": "JSON anzeigen",
        "hideView": "JSON ausblenden",
        "exportJson": "JSON-Sicherung",
        "importTitle": "Importieren und wiederherstellen",
        "importHint": "Wähle eine JSON-Datei aus oder füge JSON ein und prüfe es. Erst durch Änderungen speichern wird etwas gespeichert.",
        "importFile": "JSON-Datei importieren",
        "pasteJson": "JSON manuell einfügen",
        "import": "Sicherung prüfen",
        "cancelRestore": "Wiederherstellung abbrechen",
        "strategy": "Wiederherstellungsart",
        "replaceAll": "Alles ersetzen",
        "replaceAllHint": "Importierte Einstellungen ersetzen die aktuellen, auch eigene Anweisungen; die Einwilligung zur Textübermittlung wird widerrufen.",
        "reviewMerge": "Prüfen und zusammenführen",
        "reviewMergeHint": "In der Sicherung fehlende Einstellungen bleiben erhalten. Prüfe und bearbeite die zusammengeführten Anweisungen. Ein leerer Text löscht die Anweisungen.",
        "previewTitle": "Vorschau der Wiederherstellung",
        "setting": "Einstellung",
        "current": "Aktueller Entwurf",
        "proposed": "Nach Wiederherstellung",
        "interfaceLanguage": "Sprache der Oberfläche",
        "mergedLabel": "Zusammengeführte Anweisungen (bearbeitbar)",
        "importedInstructions": "Importierte Anweisungen",
        "none": "Keine",
        "empty": "—",
        "permissionsTitle": "Berechtigungen in dieser Sicherung",
        "restorePermissions": "Gespeicherte Berechtigungen wiederherstellen",
        "permissionsDefault": "Beim Zusammenführen bleiben Berechtigungen unveränderter Felder erhalten. Geänderte importierte Felder sind zunächst privat. Alles ersetzen setzt alle Felder auf privat.",
        "permissionsAck": "Ich möchte diese Feldberechtigungen nach dem Speichern für alle Modelle anwenden.",
        "permissionsLegacy": "Diese Sicherung enthält keine wiederherstellbaren Feldberechtigungen.",
        "switchesOff": "Nach Wiederherstellung aus",
        "replaceConfirm": "Ich stimme zu, meinen Entwurf zu ersetzen und fehlende Einstellungen zurückzusetzen.",
        "legacyEntries": "Workspace-spezifische Einstellungen, die nicht wiederhergestellt werden:",
        "confirm": "Ich habe die Sicherung geprüft und möchte sie auf den Entwurf anwenden.",
        "applyRestore": "Auf Entwurf anwenden",
        "reviewReady": "Sicherung gültig. Prüfe die Vorschau und wende sie dann an.",
        "restoreApplied": "Nur auf den Entwurf angewendet. Noch nichts gespeichert: Klicke auf Änderungen speichern.",
        "invalidJson": "Der Text ist kein gültiges JSON.",
        "unsupportedVersion": "Nicht unterstützte Sicherungsversion.",
        "invalidPolicy": "Die Sicherung enthält eine ungültige oder nicht unterstützte Berechtigung.",
        "instructionsTooLong": "Eigene Anweisungen überschreiten 8.192 Zeichen. Nichts wurde gekürzt oder angewendet.",
        "invalidContent": "Ungültiger Sicherungsinhalt oder unbekannte Felder.",
        "mergeTooLong": "Zusammengeführte Anweisungen überschreiten 8.192 Zeichen. Vor dem Anwenden kürzen; es erfolgt keine automatische Kürzung.",
        "fileTooLarge": "Die Datei überschreitet 3.000.000 Byte.",
        "fileReadFailed": "Datei konnte nicht gelesen werden.",
        "copied": "JSON in die Zwischenablage kopiert.",
        "copyFailed": "Kopieren fehlgeschlagen. JSON anzeigen und manuell kopieren.",
        "downloaded": "Download gestartet. Prüfe, ob die Datei gespeichert wurde.",
        "downloadFailed": "Download hier nicht verfügbar. JSON kopieren oder anzeigen verwenden.",
        "migrationTitle": "Einstellungen von Version 0.7.1 migrieren",
        "migrationHint": "Ältere Workspace-Einstellungen wurden gefunden. Die Migration behält persönliche Angaben, Oberflächensprache, globale Präferenzen und Anweisungen. Gespeicherte Daten ändern sich erst nach Änderungen speichern.",
        "migrationKept": "Keine Workspace-spezifischen Einstellungen; nichts wird gelöscht.",
        "migrationDiscard": "Diese Einstellungen werden nicht ins einheitliche Profil übernommen und beim Speichern gelöscht. Exportiere sie vorher, wenn du sie behalten möchtest:",
        "migrationMasters": "Die alten Freigabeschalter waren aktiviert; ihre Berechtigungen werden nicht übernommen.",
        "workspaceId": "Workspace-ID",
        "overrideCol": "Überschreibung",
        "policiesCol": "Berechtigungen",
        "yes": "Ja",
        "no": "Nein",
        "legacyJson": "Vollständige 0.7.1-Einstellungen (JSON)",
        "migrationAck": "Ich habe alles Nötige geprüft und exportiert und stimme zu, Workspace-spezifische Einstellungen zu entfernen und alte Freigabeschalter beim Speichern auszuschalten.",
        "migration": "Einstellungen einer älteren Version warten auf Migration. Prüfen und speichern.",
        "sharingUpgrade": "Frühere Angaben wurden als privat geladen. Gewünschte Freigaben markieren und speichern.",
        "upgradeTitle": "Vor dem Upgrade sichern",
        "upgradeRollback": "Speichern aktualisiert Harness-Einstellungen auf Version 4. Für ein Downgrade brauchst du eine archivierte Harness-Konfiguration oder eine JSON-Sicherung im Format Version 2. Exportiere vor dem Speichern, wenn du möglicherweise zurückwechselst.",
        "reset": "Entwurf zurücksetzen",
        "missing": "Nicht angegeben",
        "noInstruction": "Keine Anweisungen.",
        "save": "Änderungen speichern",
        "reload": "Neu laden (Entwurf verwerfen)",
        "loading": "Einstellungen werden gelesen…",
        "unavailable": "Lokale Einstellungen sind nicht verfügbar oder nicht beschreibbar. Nichts gespeichert.",
        "ready": "Einstellungen geladen.",
        "saving": "Wird gespeichert…",
        "saved": "Speichern von Harness bestätigt.",
        "failed": "Speichern nicht bestätigt. Vor erneutem Versuch neu laden und prüfen.",
        "conflict": "Einstellungen wurden in einem anderen Fenster geändert. Neu laden und Änderungen erneut vornehmen.",
        "invalid": "Ungültige Einstellungen oder Sicherung.",
        "dirty": "Nicht gespeicherte Änderungen.",
        "tooLarge": "Einstellungen zu groß. Nichts gespeichert; Änderungen bleiben im Entwurf.",
        "reconnected": "Verbindung wiederhergestellt. Dein Entwurf bleibt erhalten; du kannst speichern (Harness prüft die Revision) oder neu laden.",
        "discardWarning": "Nicht gespeicherte Änderungen gehen beim Neuladen verloren. Exportiere vorher eine JSON-Sicherung, wenn du sie behalten möchtest.",
        "discardConfirm": "Änderungen verwerfen und neu laden",
        "discardCancel": "Weiter bearbeiten",
        "followDsh": "DSH-Sprache übernehmen"
      }
      const zh = {
        "information": "我的信息",
        "instructions": "智能体指令",
        "access": "访问控制",
        "backup": "备份与恢复",
        "privacy": "隐私与安全",
        "title": "我的资料",
        "subtitle": "当前 Harness 配置下的统一个人资料",
        "warning": "数据保存在本地，插件不提供独立加密。请勿输入密码、密钥或敏感信息。已保存的回复偏好会发送至所选模型，并可能留存在会话历史中。只有明确允许且已保存的个人信息才会加入受支持的原生模型请求，包括云端模型。",
        "language": "界面语言",
        "preferredName": "称呼",
        "nationality": "国籍",
        "gender": "性别",
        "male": "男",
        "female": "女",
        "unspecified": "不愿透露",
        "unified": "统一偏好",
        "unifiedHint": "已保存的偏好会在受支持的原生会话下一步骤生效，不受工作区限制。部分智能体预设可能覆盖这些偏好。",
        "personality": "个性",
        "styleTone": "风格与语气",
        "responseLanguage": "回复语言",
        "characteristics": "回复特点",
        "presets": "行为预设",
        "customInstructions": "自定义指令",
        "sendCustom": "允许向所选模型发送自定义文本（包括云端模型）",
        "customConsentHint": "文本可能保留在会话历史中并被再次发送。请勿包含敏感数据。修改或恢复文本会撤销授权；请复核并重新保存。",
        "less": "较少",
        "neutral": "均衡",
        "more": "较多",
        "characters": "字符",
        "preferenceHint": "所有选项均为可选，保存后生效。",
        "languageHint": "回复语言与界面语言相互独立。方言偏好请写入自定义指令。",
        "previewHint": "预览保存后在受支持会话中使用的指令草稿。历史指令不会被删除。",
        "presetHint": "默认不选择任何预设。",
        "resetPreferences": "重置偏好",
        "effective": "实际指令预览",
        "optIn": "允许与模型分享个人信息",
        "fieldPolicies": "字段权限",
        "policiesHint": "每个字段的权限适用于整个资料，而非单个工作区。",
        "private": "私密",
        "ask": "先询问",
        "allow": "允许",
        "on": "开启",
        "off": "关闭",
        "cloud": "允许与云服务商分享个人信息",
        "accessHint": "勾选希望智能体使用的信息后保存。未勾选的字段仍为私密。选择适用于所有模型和服务商。",
        "available": "提供给智能体",
        "sharedTitle": "保存后可用的信息",
        "sharedNone": "不会分享任何信息。",
        "retention": "此前披露的信息可能仍保留在服务商、会话历史、Harness 日志、摘要或分支中。如果请求包含以前添加但现已取消授权的资料块，该请求可能被阻止。请开启新会话继续。",
        "exportTitle": "导出备份",
        "exportHint": "JSON 备份未加密，包含当前草稿，其中包括对个人信息、指令和字段权限的未保存更改。手动选择英语或阿拉伯语时导出兼容的第 2 版；跟随 DSH 及其他语言使用第 4 版以保留选择。请安全保管，不要分享。",
        "download": "下载 JSON",
        "copy": "复制 JSON",
        "view": "查看 JSON",
        "hideView": "隐藏 JSON",
        "exportJson": "JSON 备份",
        "importTitle": "导入与恢复",
        "importHint": "选择 JSON 文件或粘贴 JSON，然后进行检查。只有点击“保存更改”后才会写入。",
        "importFile": "导入 JSON 文件",
        "pasteJson": "手动粘贴 JSON",
        "import": "检查备份",
        "cancelRestore": "取消恢复",
        "strategy": "恢复方式",
        "replaceAll": "全部替换",
        "replaceAllHint": "导入设置将替换当前设置，包括自定义指令；自定义文本的发送授权将被清除。",
        "reviewMerge": "检查并合并",
        "reviewMergeHint": "保留备份中未包含的设置。检查并按需编辑合并后的指令。空文本会清除指令。",
        "previewTitle": "恢复预览",
        "setting": "设置",
        "current": "当前草稿",
        "proposed": "恢复后",
        "interfaceLanguage": "界面语言",
        "mergedLabel": "合并后的指令（可编辑）",
        "importedInstructions": "导入的指令",
        "none": "无",
        "empty": "—",
        "permissionsTitle": "备份中保存的权限",
        "restorePermissions": "恢复该备份中的权限",
        "permissionsDefault": "合并时保留未更改字段的分享设置；已更改的导入字段默认为私密。全部替换则将所有字段设为私密。",
        "permissionsAck": "我同意在保存后将这些字段权限应用于所有模型。",
        "permissionsLegacy": "该备份中没有可恢复的字段分享权限。",
        "switchesOff": "恢复后关闭",
        "replaceConfirm": "我同意替换当前草稿，并将备份缺少的设置恢复为默认值。",
        "legacyEntries": "以下工作区专属设置不会被恢复：",
        "confirm": "我已检查该备份，并希望将其应用到草稿。",
        "applyRestore": "应用恢复到草稿",
        "reviewReady": "备份有效。请检查预览后应用。",
        "restoreApplied": "仅已应用到草稿，尚未保存。请点击“保存更改”。",
        "invalidJson": "文本不是有效的 JSON。",
        "unsupportedVersion": "不支持的备份版本。",
        "invalidPolicy": "备份包含无效或不受支持的权限。",
        "instructionsTooLong": "自定义指令超过 8192 个字符。未截断或应用任何内容。",
        "invalidContent": "备份内容无效或包含未知字段。",
        "mergeTooLong": "合并后的指令超过 8192 个字符。请先缩短；系统不会自动截断。",
        "fileTooLarge": "文件超过 3,000,000 字节的限制。",
        "fileReadFailed": "无法读取文件。",
        "copied": "已复制 JSON 到剪贴板。",
        "copyFailed": "复制失败。请使用“查看 JSON”手动复制。",
        "downloaded": "下载已开始。请确认文件已保存。",
        "downloadFailed": "此处无法下载。请使用“复制 JSON”或“查看 JSON”。",
        "migrationTitle": "迁移版本 0.7.1 的设置",
        "migrationHint": "检测到旧版工作区设置。迁移将保留个人信息、界面语言、全局偏好及自定义指令。在点击“保存更改”前，存储的设置不会改变。",
        "migrationKept": "没有工作区专属设置；不会删除任何内容。",
        "migrationDiscard": "以下设置不会转移到统一资料，并将在保存时删除。如需保留，请先导出：",
        "migrationMasters": "旧的全局分享开关已开启；其授权不会转移。",
        "workspaceId": "工作区 ID",
        "overrideCol": "覆盖",
        "policiesCol": "权限",
        "yes": "是",
        "no": "否",
        "legacyJson": "完整的 0.7.1 设置（JSON）",
        "migrationAck": "我已检查并导出所需内容，同意在保存时删除工作区专属设置并关闭旧分享开关。",
        "migration": "旧版设置等待迁移。请检查后保存。",
        "sharingUpgrade": "旧信息已以私密模式加载。勾选需要分享的字段并保存。",
        "upgradeTitle": "升级前备份",
        "upgradeRollback": "保存会将 Harness 设置升级至版本 4。若要降级，需要归档的 Harness 配置或第 2 版 JSON 备份。若可能降级，请先导出备份。",
        "reset": "重置草稿",
        "missing": "未设置",
        "noInstruction": "无指令。",
        "save": "保存更改",
        "reload": "重新加载（丢弃草稿）",
        "loading": "正在读取设置…",
        "unavailable": "本地设置不可用或不可写入。未保存任何内容。",
        "ready": "设置已加载。",
        "saving": "正在保存…",
        "saved": "Harness 已确认保存。",
        "failed": "无法确认保存。请重新加载并核实后重试。",
        "conflict": "其他窗口已更改设置。请重新加载并重新应用修改。",
        "invalid": "设置或备份无效。",
        "dirty": "有未保存的更改。",
        "tooLarge": "设置超过保存限制。未保存任何内容；修改仍保留在草稿中。",
        "reconnected": "连接已恢复。草稿仍保留；你可以保存（Harness 会检查版本）或重新加载。",
        "discardWarning": "重新加载将丢失未保存的修改。如需保留，请先导出 JSON 备份。",
        "discardConfirm": "丢弃更改并重新加载",
        "discardCancel": "继续编辑",
        "followDsh": "跟随 DSH 语言"
      }
      const ja = {
        "information": "マイ情報",
        "instructions": "エージェントへの指示",
        "access": "アクセス制御",
        "backup": "バックアップと復元",
        "privacy": "プライバシーとセキュリティ",
        "title": "マイプロフィール",
        "subtitle": "現在の Harness プロフィールに共通する設定",
        "warning": "このデータはプラグイン独自の暗号化なしでローカルに保存されます。パスワード、キー、機密情報は入力しないでください。保存した回答設定は選択したモデルに送信され、会話履歴に残る場合があります。保存済みで許可された個人情報のみが、クラウドモデルを含む対応するネイティブリクエストに追加されます。",
        "language": "表示言語",
        "preferredName": "希望する呼び名",
        "nationality": "国籍",
        "gender": "性別",
        "male": "男性",
        "female": "女性",
        "unspecified": "回答しない",
        "unified": "共通設定",
        "unifiedHint": "保存した設定は、ワークスペースに関係なく、対応するネイティブ会話の次の処理から適用されます。一部のエージェント設定が優先される場合があります。",
        "personality": "パーソナリティ",
        "styleTone": "文体とトーン",
        "responseLanguage": "回答言語",
        "characteristics": "回答の特徴",
        "presets": "動作プリセット",
        "customInstructions": "カスタム指示",
        "sendCustom": "選択したモデル（クラウドを含む）へのカスタムテキスト送信を許可",
        "customConsentHint": "テキストは会話履歴に残り、再送信される場合があります。機密情報を含めないでください。テキストの編集や復元により許可は取り消されます。再確認して保存してください。",
        "less": "少なめ",
        "neutral": "標準",
        "more": "多め",
        "characters": "文字",
        "preferenceHint": "すべて任意の設定で、保存後に適用されます。",
        "languageHint": "回答言語と表示言語は独立しています。方言の希望はカスタム指示に記入してください。",
        "previewHint": "保存後に対応する会話で送信される指示のプレビューです。履歴内の以前の指示は削除されません。",
        "presetHint": "既定では何も選択されていません。",
        "resetPreferences": "設定をリセット",
        "effective": "適用内容のプレビュー",
        "optIn": "モデルへの個人情報の共有を許可",
        "fieldPolicies": "項目の権限",
        "policiesHint": "権限はワークスペースごとではなく、プロフィール全体の各項目に適用されます。",
        "private": "非公開",
        "ask": "事前に確認",
        "allow": "許可",
        "on": "オン",
        "off": "オフ",
        "cloud": "クラウド事業者への個人情報共有を許可",
        "accessHint": "エージェントが利用してよい情報にチェックを入れて保存してください。未選択の項目は非公開です。設定はすべてのモデルと事業者に適用されます。",
        "available": "エージェントが利用可能",
        "sharedTitle": "保存後に利用できる情報",
        "sharedNone": "共有する情報はありません。",
        "retention": "以前共有した情報は、事業者、会話履歴、Harness のログ、要約、ブランチに残る場合があります。以前の情報が現在の権限に反して再利用されるリクエストは停止する場合があります。新しい会話を開始してください。",
        "exportTitle": "バックアップをエクスポート",
        "exportHint": "JSON バックアップは暗号化されず、現在の下書きが含まれます。個人情報、指示、項目権限の未保存の変更も含まれます。英語またはアラビア語を手動選択した場合は互換性のためバージョン 2、DSH に追従する場合やその他の言語では設定を維持できるバージョン 4 で書き出します。安全に保管し、共有しないでください。",
        "download": "JSON をダウンロード",
        "copy": "JSON をコピー",
        "view": "JSON を表示",
        "hideView": "JSON を隠す",
        "exportJson": "JSON バックアップ",
        "importTitle": "インポートと復元",
        "importHint": "JSON ファイルを選ぶか貼り付け、内容を確認してください。「変更を保存」を押すまで保存されません。",
        "importFile": "JSON ファイルを取り込む",
        "pasteJson": "JSON を貼り付ける",
        "import": "バックアップを確認",
        "cancelRestore": "復元を中止",
        "strategy": "復元方法",
        "replaceAll": "すべて置き換える",
        "replaceAllHint": "取り込んだ設定が現在の設定とカスタム指示を置き換えます。カスタムテキスト送信の許可は解除されます。",
        "reviewMerge": "確認して統合",
        "reviewMergeHint": "バックアップに含まれない設定は維持します。統合した指示を確認し、必要なら編集してください。空文字列は指示を削除します。",
        "previewTitle": "復元プレビュー",
        "setting": "設定",
        "current": "現在の下書き",
        "proposed": "復元後",
        "interfaceLanguage": "表示言語",
        "mergedLabel": "統合した指示（編集可能）",
        "importedInstructions": "取り込んだ指示",
        "none": "なし",
        "empty": "—",
        "permissionsTitle": "バックアップ内の権限",
        "restorePermissions": "バックアップの権限を復元",
        "permissionsDefault": "統合すると、変更のない項目の共有設定は維持されます。変更された取り込み項目は既定で非公開です。すべて置き換えると、全項目が非公開になります。",
        "permissionsAck": "保存後、これらの項目の権限をすべてのモデルに適用することに同意します。",
        "permissionsLegacy": "このバックアップに復元可能な項目権限はありません。",
        "switchesOff": "復元後はオフ",
        "replaceConfirm": "下書きを置き換え、バックアップにない設定を既定値に戻すことに同意します。",
        "legacyEntries": "復元されないワークスペース固有の設定：",
        "confirm": "バックアップを確認し、下書きに適用することに同意します。",
        "applyRestore": "下書きに復元を適用",
        "reviewReady": "有効なバックアップです。プレビューを確認してから適用してください。",
        "restoreApplied": "下書きにのみ復元しました。まだ保存されていません。「変更を保存」を押してください。",
        "invalidJson": "有効な JSON ではありません。",
        "unsupportedVersion": "対応していないバックアップのバージョンです。",
        "invalidPolicy": "バックアップに無効または非対応の権限があります。",
        "instructionsTooLong": "カスタム指示が 8192 文字を超えています。省略も適用も行いませんでした。",
        "invalidContent": "バックアップの内容が無効か、不明な項目を含んでいます。",
        "mergeTooLong": "統合した指示が 8192 文字を超えています。適用前に短くしてください。自動では省略しません。",
        "fileTooLarge": "ファイルが 3,000,000 バイトの制限を超えています。",
        "fileReadFailed": "ファイルを読み込めませんでした。",
        "copied": "JSON をクリップボードにコピーしました。",
        "copyFailed": "コピーできませんでした。「JSON を表示」で手動コピーしてください。",
        "downloaded": "ダウンロードを開始しました。保存されているか確認してください。",
        "downloadFailed": "ここではダウンロードできません。「JSON をコピー」か「JSON を表示」を使ってください。",
        "migrationTitle": "バージョン 0.7.1 の設定を移行",
        "migrationHint": "以前のワークスペース別設定が見つかりました。移行後も個人情報、表示言語、共通設定、カスタム指示は維持されます。「変更を保存」を押すまで保存済み設定は変わりません。",
        "migrationKept": "ワークスペース固有の設定はありません。削除されるものはありません。",
        "migrationDiscard": "次の設定は共通プロフィールへ移行されず、保存時に削除されます。必要なら先にエクスポートしてください：",
        "migrationMasters": "古い共有スイッチがオンでしたが、その権限は引き継がれません。",
        "workspaceId": "ワークスペース ID",
        "overrideCol": "上書き",
        "policiesCol": "権限",
        "yes": "はい",
        "no": "いいえ",
        "legacyJson": "0.7.1 の全設定（JSON）",
        "migrationAck": "必要な内容を確認・エクスポートし、保存時にワークスペース別設定を削除して古い共有スイッチをオフにすることに同意します。",
        "migration": "古いバージョンの設定は移行待ちです。確認して保存してください。",
        "sharingUpgrade": "以前の情報は非公開で読み込みました。共有する項目を選び、保存してください。",
        "upgradeTitle": "更新前にバックアップ",
        "upgradeRollback": "保存すると Harness 設定がバージョン 4 に更新されます。旧版に戻すにはアーカイブ済みの Harness 設定かバージョン 2 の JSON バックアップが必要です。戻す可能性がある場合は先にエクスポートしてください。",
        "reset": "下書きをリセット",
        "missing": "未設定",
        "noInstruction": "指示なし。",
        "save": "変更を保存",
        "reload": "再読み込み（下書きを破棄）",
        "loading": "設定を読み込んでいます…",
        "unavailable": "ローカル設定が利用できないか、書き込みできません。保存されていません。",
        "ready": "設定を読み込みました。",
        "saving": "保存中…",
        "saved": "Harness により保存が確認されました。",
        "failed": "保存を確認できませんでした。再試行前に再読み込みして確認してください。",
        "conflict": "別のウィンドウで設定が変更されました。再読み込みして編集し直してください。",
        "invalid": "設定またはバックアップが無効です。",
        "dirty": "未保存の変更があります。",
        "tooLarge": "設定がサイズ制限を超えています。保存されず、変更は下書きに残ります。",
        "reconnected": "接続が復旧しました。下書きは保持されています。保存（Harness がリビジョンを確認）または再読み込みできます。",
        "discardWarning": "再読み込みすると未保存の変更が失われます。残す場合は先に JSON バックアップをエクスポートしてください。",
        "discardConfirm": "変更を破棄して再読み込み",
        "discardCancel": "編集を続ける",
        "followDsh": "DSH の言語に合わせる"
      }
      const uiDictionaries={ar,en,es,fr,de,zh,ja}
      const t = key => (uiDictionaries[language]||en)[key] || en[key] || key
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
      const sections = ['information','instructions','backup','privacy']
      const localChoiceLabels = {
        "zh": {
          "styles": {
            "default": "默认",
            "professional": "专业",
            "friendly": "友好",
            "candid": "直率",
            "creative": "创意",
            "efficient": "高效",
            "critical": "批判分析",
            "technical": "技术"
          },
          "traits": {
            "warmth": "亲切度",
            "enthusiasm": "热情度",
            "structure": "标题与列表",
            "emoji": "表情符号",
            "detail": "详细程度",
            "critical": "批判性思维"
          },
          "presets": {
            "critical": "批判性思维",
            "no-fluff": "不说废话",
            "grill-me": "深入追问",
            "evidence": "证据优先",
            "steps": "分步说明",
            "action": "行动导向",
            "code": "代码审查",
            "humanizer": "自然表达"
          },
          "presetDescriptions": {
            "critical": "质疑薄弱假设，不盲目赞同。",
            "no-fluff": "避免赘述和不必要的恭维。",
            "grill-me": "在复杂决策中核实关键需求与风险。",
            "evidence": "区分证据、假设与不确定性，并在适当时引用可靠来源。",
            "steps": "将复杂任务分解为可执行步骤。",
            "action": "优先提供实用解决方案和下一步行动。",
            "code": "检查代码质量、安全性、性能和测试覆盖率。",
            "humanizer": "修改文字时保持事实、引文和不确定性，并使表达自然。"
          }
        },
        "es": {
          "styles": {
            "default": "Predeterminado",
            "professional": "Profesional",
            "friendly": "Amable",
            "candid": "Directo",
            "creative": "Creativo",
            "efficient": "Eficiente",
            "critical": "Analítico",
            "technical": "Técnico"
          },
          "traits": {
            "warmth": "Cercanía",
            "enthusiasm": "Entusiasmo",
            "structure": "Títulos y listas",
            "emoji": "Emojis",
            "detail": "Detalle",
            "critical": "Pensamiento crítico"
          },
          "presets": {
            "critical": "Pensamiento crítico",
            "no-fluff": "Sin relleno",
            "grill-me": "Preguntas clave",
            "evidence": "Primero la evidencia",
            "steps": "Paso a paso",
            "action": "Orientado a la acción",
            "code": "Revisión de código",
            "humanizer": "Redacción natural"
          },
          "presetDescriptions": {
            "critical": "Cuestiona los supuestos débiles en vez de aceptarlos automáticamente.",
            "no-fluff": "Evita el relleno y los halagos innecesarios.",
            "grill-me": "Aclara los requisitos y los riesgos importantes antes de decidir.",
            "evidence": "Distingue evidencia, supuestos e incertidumbre; cita fuentes fiables cuando corresponda.",
            "steps": "Divide tareas complejas en pasos prácticos.",
            "action": "Prioriza soluciones útiles y próximos pasos concretos.",
            "code": "Evalúa la calidad, seguridad, rendimiento y pruebas del código.",
            "humanizer": "Al editar, conserva los hechos, las citas y la incertidumbre con una redacción natural."
          }
        },
        "fr": {
          "styles": {
            "default": "Par défaut",
            "professional": "Professionnel",
            "friendly": "Amical",
            "candid": "Direct",
            "creative": "Créatif",
            "efficient": "Efficace",
            "critical": "Analytique",
            "technical": "Technique"
          },
          "traits": {
            "warmth": "Chaleur",
            "enthusiasm": "Enthousiasme",
            "structure": "Titres et listes",
            "emoji": "Émojis",
            "detail": "Détail",
            "critical": "Esprit critique"
          },
          "presets": {
            "critical": "Esprit critique",
            "no-fluff": "Sans remplissage",
            "grill-me": "Questions ciblées",
            "evidence": "Preuves d’abord",
            "steps": "Étape par étape",
            "action": "Orienté action",
            "code": "Revue de code",
            "humanizer": "Rédaction naturelle"
          },
          "presetDescriptions": {
            "critical": "Remet en question les hypothèses fragiles au lieu d’acquiescer automatiquement.",
            "no-fluff": "Évite le remplissage et les compliments inutiles.",
            "grill-me": "Clarifie les exigences et les risques importants avant une décision.",
            "evidence": "Distingue les faits, les hypothèses et l’incertitude ; cite des sources fiables si nécessaire.",
            "steps": "Décompose les tâches complexes en étapes concrètes.",
            "action": "Privilégie les solutions utiles et les prochaines actions.",
            "code": "Évalue la qualité, la sécurité, la performance et les tests du code.",
            "humanizer": "Préserve les faits, les citations et l’incertitude lors de la reformulation naturelle."
          }
        },
        "de": {
          "styles": {
            "default": "Standard",
            "professional": "Professionell",
            "friendly": "Freundlich",
            "candid": "Direkt",
            "creative": "Kreativ",
            "efficient": "Effizient",
            "critical": "Analytisch",
            "technical": "Technisch"
          },
          "traits": {
            "warmth": "Wärme",
            "enthusiasm": "Begeisterung",
            "structure": "Überschriften und Listen",
            "emoji": "Emojis",
            "detail": "Detailgrad",
            "critical": "Kritisches Denken"
          },
          "presets": {
            "critical": "Kritisches Denken",
            "no-fluff": "Ohne Füllwörter",
            "grill-me": "Gezielte Rückfragen",
            "evidence": "Belege zuerst",
            "steps": "Schritt für Schritt",
            "action": "Handlungsorientiert",
            "code": "Codeprüfung",
            "humanizer": "Natürlicher Stil"
          },
          "presetDescriptions": {
            "critical": "Schwache Annahmen prüfen statt automatisch zuzustimmen.",
            "no-fluff": "Überflüssige Füllwörter und Komplimente vermeiden.",
            "grill-me": "Vor Entscheidungen wichtige Anforderungen und Risiken klären.",
            "evidence": "Belege, Annahmen und Unsicherheit unterscheiden; gegebenenfalls zuverlässige Quellen nennen.",
            "steps": "Komplexe Aufgaben in praktische Schritte zerlegen.",
            "action": "Praktische Lösungen und nächste Schritte priorisieren.",
            "code": "Codequalität, Sicherheit, Leistung und Testabdeckung bewerten.",
            "humanizer": "Beim Überarbeiten Fakten, Zitate und Unsicherheit bewahren und natürlich formulieren."
          }
        },
        "ja": {
          "styles": {
            "default": "標準",
            "professional": "プロフェッショナル",
            "friendly": "親しみやすい",
            "candid": "率直",
            "creative": "創造的",
            "efficient": "効率重視",
            "critical": "批判的分析",
            "technical": "技術的"
          },
          "traits": {
            "warmth": "親しみやすさ",
            "enthusiasm": "熱意",
            "structure": "見出しと箇条書き",
            "emoji": "絵文字",
            "detail": "詳細さ",
            "critical": "批判的思考"
          },
          "presets": {
            "critical": "批判的思考",
            "no-fluff": "無駄を省く",
            "grill-me": "要件を深掘り",
            "evidence": "根拠を優先",
            "steps": "段階的に説明",
            "action": "実行重視",
            "code": "コードレビュー",
            "humanizer": "自然な文章"
          },
          "presetDescriptions": {
            "critical": "弱い前提を検討し、無条件には同意しません。",
            "no-fluff": "冗長な表現や不要な褒め言葉を避けます。",
            "grill-me": "複雑な判断の前に要件と主要なリスクを確認します。",
            "evidence": "根拠・仮定・不確実性を区別し、必要に応じて信頼できる出典を示します。",
            "steps": "複雑な作業を実行可能な手順に分けます。",
            "action": "実用的な解決策と次の行動を優先します。",
            "code": "コードの品質、安全性、性能、テスト範囲を確認します。",
            "humanizer": "文章の編集では事実、引用、不確実性を維持し自然な表現にします。"
          }
        }
      }
      const localLabel = item => {
        if(!item)return ''
        const group=PROFILE_STYLES.includes(item)?'styles':PROFILE_TRAITS.includes(item)?'traits':PROFILE_PRESETS.includes(item)?'presets':'languages'
        return localChoiceLabels[language]?.[group]?.[item[0]] || item[rtl?1:2]
      }
      const localPresetDescription = item => localChoiceLabels[language]?.presetDescriptions?.[item[0]] || item[rtl?3:4]
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
          h('input',{id:'pp-'+id,type:'checkbox',checked,onChange:onChange?e=>onChange(e.target.checked):undefined,style:{marginTop:5},...props}),
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
      const exportText = () => JSON.stringify(
        // Preserve existing v2 compatibility for en/ar overrides. Follow DSH
        // and additional UI locales require v4 to round-trip without data loss.
        record.locale==='ar'||record.locale==='en'
          ? decodeProfile({...record,version:2,allowPersonalInformation:false,allowCloud:false})
          : decodeProfile(record),null,2)
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
          ['locale',t('interfaceLanguage'),r.locale==='auto'?t('followDsh'):(r.locale==='ar'?'العربية':r.locale==='en'?'English':r.locale.toUpperCase())],
          ['style',t('styleTone'),localLabel(PROFILE_STYLES.find(i=>i[0]===p.style))],
          ['responseLanguage',t('responseLanguage'),localLabel(PROFILE_LANGUAGES.find(i=>i[0]===p.responseLanguage))],
          ['traits',t('characteristics'),traits.length?traits.join(rtl?'، ':', '):t('neutral')],
          ['presets',t('presets'),presets.length?presets.join(rtl?'، ':', '):t('none')],
          ['custom',t('customInstructions'),p.custom.length+' '+t('characters')],
          ['sendCustom',t('sendCustom'),p.sendCustom===true?t('on'):t('off')],
          ...PERSONAL_FIELDS.map(key=>['policy-'+key,t('fieldPolicies')+' — '+t(key),policyLabel(r.policies[key])]),

        ]
      }
      const importedCustom=restoreReview?.incoming.preferences?.custom
      const mergedCustom=mergedText??(importedCustom===undefined ? record.preferences.custom :
        importedCustom==='' ? '' : mergeInstructions(record.preferences.custom,importedCustom))
      const proposeRestore = () => {
        if(!restoreReview)return null
        const merge=restoreStrategy==='merge'
        const base=merge ? record : emptyProfileRecord()
        const proposal=overlayProfile(base,restoreReview.incoming)
        const preferences=withoutCustomConsent(proposal.preferences)
        if(merge)preferences.custom=mergedCustom
        const policies={...base.policies}
        // An imported value is not automatically authorized by an older choice.
        for(const key of PERSONAL_FIELDS)if(proposal.information[key]!==base.information[key])policies[key]='private'
        if(restorePermissions)Object.assign(policies,restoreReview.permissions)
        return {...proposal,preferences,policies}
      }
      const startReview = text => {
        clearRestore()
        try {
          if(!text)throw profileError('invalidContent')
          if(text.length>PROFILE_MAX_CHARS)throw profileError('tooLarge')
          let parsed
          try{parsed=JSON.parse(text)}catch{throw profileError('invalidJson')}
          profileRoot(parsed)
          if(parsed.version===1){
            const legacyBackup=decodeLegacyProfile(parsed)
            setRestoreReview({incoming:migrateLegacyProfile(legacyBackup),permissions:null,
              legacyWorkspaces:legacyBackup.workspaces.map(w=>w.id)})
          }else{
            const incoming=decodeUnifiedBackup(parsed)
            const permissions=Object.keys(incoming.policies??{}).length ? incoming.policies : null
            setRestoreReview({incoming,permissions,legacyWorkspaces:[]})
          }
          setBackupMessage('reviewReady')
        // Never clear a conflict/failed state: those require a reload before Save.
        }catch(error){
          setBackupMessage(error?.code==='tooLarge'?'fileTooLarge':(error?.code||'invalidContent'))
          setStatus(s=>s==='conflict'||s==='failed'?s:'invalid')
        }
      }
      const importFile = async e => {
        const target=e.currentTarget, file=target.files?.[0], win=target.ownerDocument?.defaultView
        if(!file)return
        clearRestore()
        const id=importGeneration.current
        target.value=''
        setRestoreText('');setBackupMessage('')
        if(!(file.size<=PROFILE_MAX_CHARS)){setBackupMessage('fileTooLarge');setStatus(s=>s==='conflict'||s==='failed'?s:'invalid');return}
        let text
        try{text=await readFileText(file,win)}catch{if(id===importGeneration.current)setBackupMessage('fileReadFailed');return}
        if(id!==importGeneration.current)return
        setRestoreText(text);startReview(text)
      }
      let contents
      if (page === 'information') {
        contents = card(t('information'),
          h('p',{style:muted},t('accessHint')),
          ...PERSONAL_FIELDS.map(id=>h('div',{key:id,style:{display:'flex',alignItems:'center',flexWrap:'wrap',columnGap:12,minWidth:0}},
            h('div',{style:{flex:'1 1 220px',minWidth:0}},id==='gender'
              ? dropdown(id,t(id),values.gender,GENDER_VALUES.map(v=>[v,genderLabel(v)]),v=>setField(id,v))
              : input(id,t(id),values[id],v=>setField(id,v))),
            checkbox('policy-'+id,record.policies[id]==='allow',
              v=>setRecord(old=>({...old,policies:{...old.policies,[id]:v?'allow':'private'}})),t('available')+' — '+t(id)))),
          h('p',{style:muted},t('sharedTitle')),
          h('output',{id:'pp-shared-preview',dir:'auto',style:{display:'block',whiteSpace:'pre-wrap',overflowWrap:'anywhere'}},
            PERSONAL_FIELDS.filter(k=>record.policies[k]==='allow'&&(k==='gender'?['male','female'].includes(values[k]):values[k].trim())).map(k=>t(k)).join(rtl?'، ':', ')||t('sharedNone')),
          h('p',{role:'note',style:muted},t('retention')))
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
                h('span',{style:{display:'block',fontSize:12,opacity:.76}},localPresetDescription(item)))))),
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
      } else if(page==='backup') {
        const proposal=proposeRestore()
        const mergeTooLong=!!restoreReview&&restoreStrategy==='merge'&&mergedCustom.length>PROFILE_CUSTOM_MAX
        let proposalValid=false
        try{proposalValid=!!proposal&&!mergeTooLong&&!!decodeProfile(proposal)}catch{proposalValid=false}
        const canApply=proposalValid&&restoreAck&&(!restorePermissions||permissionsAck)&&(restoreStrategy!=='replace'||replaceAck)
        const strategyOption=(value,title,hint)=>h('div',{key:value,style:check},
          h('input',{id:'pp-strategy-'+value,type:'radio',name:'pp-strategy',value,checked:restoreStrategy===value,
            style:{marginTop:5},'aria-describedby':'pp-strategy-'+value+'-hint',
            onChange:()=>{setRestoreStrategy(value);setRestoreAck(false);setReplaceAck(false);setPermissionsAck(false)}}),
          h('div',null,h('label',{htmlFor:'pp-strategy-'+value,style:{fontWeight:650}},title),
            h('p',{id:'pp-strategy-'+value+'-hint',style:{...muted,marginTop:2}},hint)))
        const currentRows=summarize(record)
        const reviewCard = restoreReview ? card(t('previewTitle'),
          h('fieldset',{style:{border:0,padding:0,margin:'0 0 14px',minWidth:0}},
            h('legend',{style:{...label,padding:0}},t('strategy')),
            strategyOption('merge',t('reviewMerge'),t('reviewMergeHint')),
            strategyOption('replace',t('replaceAll'),t('replaceAllHint'))),
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
          restoreStrategy==='merge' ? h('div',{style:{marginTop:14}},
            h('label',{htmlFor:'pp-restore-merged',style:label},t('mergedLabel')),
            h('textarea',{id:'pp-restore-merged',rows:8,dir:'auto',style:control,value:mergedCustom,'aria-describedby':'pp-restore-merged-count',
              'aria-invalid':mergeTooLong,onChange:e=>{setMergedText(e.target.value);setRestoreAck(false)}}),
            h('p',{id:'pp-restore-merged-count',role:mergeTooLong?'alert':undefined,style:{...muted,marginTop:6,fontWeight:mergeTooLong?700:400}},
              mergedCustom.length+' / '+PROFILE_CUSTOM_MAX+' '+t('characters')+(mergeTooLong?' — '+t('mergeTooLong'):''))) :
            h('div',{style:{marginTop:14}},
              h('label',{htmlFor:'pp-restore-imported',style:label},t('importedInstructions')),
              h('textarea',{id:'pp-restore-imported',readOnly:true,rows:5,dir:'auto',style:control,value:importedCustom??''})),
          h('h3',{style:{fontSize:15,marginTop:18}},t('permissionsTitle')),
          restoreReview.permissions ? h(React.Fragment,null,
            h('p',{style:muted},t('permissionsDefault')),
            checkbox('restore-permissions',restorePermissions,v=>{setRestorePermissions(v);setPermissionsAck(false);setRestoreAck(false)},t('restorePermissions')),
            restorePermissions ? h('div',{style:{padding:'10px 14px',border:'1px solid rgba(208,58,52,.5)',borderRadius:10}},
              h('ul',{id:'pp-restore-permission-list',style:{margin:'0 0 8px'}},
                ...PERSONAL_FIELDS.filter(key=>Object.hasOwn(restoreReview.permissions,key))
                  .map(key=>h('li',{key},t(key)+': '+policyLabel(restoreReview.permissions[key])))),
               checkbox('restore-permissions-ack',permissionsAck,v=>{setPermissionsAck(v);setRestoreAck(false)},t('permissionsAck'))) : null)
            : h('p',{style:muted},t('permissionsLegacy')),
          restoreStrategy==='replace' ? checkbox('restore-replace-ack',replaceAck,setReplaceAck,t('replaceConfirm'),{disabled:!proposalValid}) : null,
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
              onChange:e=>{setRestoreText(e.target.value);clearRestore();setBackupMessage('')}}),
            h('button',{id:'pp-restore-review',type:'button',style:btn,onClick:()=>startReview(restoreText)},t('import'))),
          reviewCard)
      }else {
        contents=card(t('privacy'),h('p',null,t('warning')),h('p',null,t('accessHint')),h('p',null,t('retention')),h('p',null,t('exportHint')))
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
      const upgradePending=saved?.version===2||saved?.version===3
      const upgradeCard=upgradePending ? card(t('upgradeTitle'),
        h('p',{id:'pp-upgrade-note',role:'note'},t('upgradeRollback')),
        page!=='backup' ? h(React.Fragment,null,
          h('p',{style:muted},t('exportHint')),
          jsonActions('rollback',exportText,backupFileName(false),exportView,setExportView),
          exportView?jsonView('rollback-json',exportText(),t('exportJson')):null,
          backupStatus) : null) : null
      return h('div',{'data-personal-profile-panel':'native-settings',lang:language,
        dir:rtl?'rtl':'ltr',style:{height:'100%',overflowY:'auto',boxSizing:'border-box',
          padding:'max(var(--dsh-frame-top-clearance, 0px), 28px) clamp(18px,4vw,56px) 52px',
          color:'inherit',lineHeight:1.6}},
        h('div',{style:{maxWidth:1050,margin:'0 auto'}},
          h('header',{style:{display:'flex',flexWrap:'wrap',gap:12,
            alignItems:'center',justifyContent:'space-between'}},
            h('div',null,h('h1',{style:{margin:'0 0 4px',fontSize:'clamp(22px,3vw,32px)'}},t('title')),
              h('p',{style:{margin:'0 0 12px',opacity:.7}},t('subtitle'))),
            h('fieldset',{disabled:!editable,style:{width:145,border:0,padding:0,margin:0}},dropdown('language',t('language'),record.locale,
              [['auto',t('followDsh')],['en','English'],['ar','العربية'],['zh','中文'],['es','Español'],['fr','Français'],['de','Deutsch'],['ja','日本語']],setLanguage))),
          notice,
          upgradeCard,
          h('div',{style:{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center',marginBottom:12}},
            h('button',{id:'pp-save',type:'button',style:btn,'aria-describedby':upgradePending?'pp-upgrade-note':undefined,disabled:!editable||!dirty||status==='conflict'||status==='failed'||migrationBlocked,onClick:save},t('save')),
            h('button',{id:'pp-reload',type:'button',style:btn,disabled:busy||!canRead,onClick:requestReload},t('reload')),
            h('button',{id:'pp-reset',type:'button',style:btn,disabled:!editable,onClick:()=>{setRecord({...emptyProfileRecord(),locale:record.locale});setRestoreText('');clearRestore();setExportView(false)}},t('reset'))),
          h('p',{id:'pp-save-status',role:'status'},t(status)+(dirty&&status!=='migration'?' '+t('dirty'):'')),
          confirmReload?h('div',{id:'pp-reload-prompt',role:'alert',style:{padding:'12px 15px',marginBottom:12,
            border:'1px solid rgba(208,58,52,.6)',borderRadius:10,background:'rgba(208,58,52,.08)'}},
            h('p',{style:{margin:'0 0 10px'}},t('discardWarning')),
            h('div',{style:{display:'flex',gap:10,flexWrap:'wrap'}},
              h('button',{id:'pp-reload-confirm',type:'button',style:btn,disabled:busy||!canRead,onClick:()=>{void load()}},t('discardConfirm')),
              h('button',{id:'pp-reload-cancel',type:'button',style:btn,onClick:()=>setConfirmReload(false)},t('discardCancel')))):null,
          migrationCard,
          h('nav',{role:'tablist','aria-label':t('title'),
            style:{display:'flex',gap:6,flexWrap:'wrap',marginBottom:20}},
            ...sections.map(id=>h('button',{key:id,type:'button',role:'tab',
              id:'pp-tab-'+id,'aria-selected':page===id,
              'aria-controls':'pp-content',tabIndex:page===id?0:-1,onClick:()=>setPage(id),
              onKeyDown:event=>{
                const index = sections.indexOf(id)
                let next
                switch (event.key) {
                  case 'ArrowLeft': next = index + (rtl ? 1 : -1); break
                  case 'ArrowRight': next = index + (rtl ? -1 : 1); break
                  case 'Home': next = 0; break
                  case 'End': next = sections.length - 1; break
                  default: return
                }
                event.preventDefault()
                next = (next + sections.length) % sections.length
                setPage(sections[next])
                event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[next]?.focus()
              },
              style:{...btn,background:page===id?'rgba(128,128,128,.22)':'transparent',
                fontWeight:page===id?700:500}},t(id)))),
          h('div',{role:'tabpanel',id:'pp-content','aria-labelledby':'pp-tab-'+page},
            page==='backup'?backupStatus:null,
            h('fieldset',{disabled:!editable,style:{border:0,margin:0,padding:0,minWidth:0}},contents))))
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
          h('h1',{style:{fontSize:22,margin:'0 0 8px'}},'My Profile — الملف الشخصي'),
          h('p',{dir:'rtl',lang:'ar'},'تعذر عرض صفحة الملف الشخصي. لم يتم حفظ أو تغيير أي إعداد.'),
          h('p',{lang:'en'},'My Profile could not be displayed. No settings were saved or changed.'),
          h('button',{type:'button',onClick:()=>this.setState({failed:false}),style:{border:'1px solid rgba(128,128,128,.35)',borderRadius:8,padding:'9px 13px',font:'inherit',background:'rgba(128,128,128,.08)',color:'inherit',cursor:'pointer'}},'Retry — إعادة المحاولة'))
      }
    }:null

    function ProfileDraft() {
      return h('section',{'data-personal-profile-draft':'',style:{borderTop:border,padding:'20px 0'}},
        h('h3',null,'My Profile — local settings'),
        h('p',null,'One unified profile: Preferred name, Nationality, Gender, response preferences and optional Custom Instructions. All access is Private by default.'),
        h('p',null,'Saved in the active Harness Profile without plugin-level encryption. Open My Profile to edit. Saved response preferences apply to supported native agent steps.'),
        h('p',null,'Only saved personal details you explicitly allow can be included in supported native agent requests, including requests to cloud providers. Revoking access does not erase information already sent.'))
    }
    const PROFILE_MODULE = TYPE + '/personal-profile'
    /** The Host's own enablement of the Profile row on the subject page; false when it says Off. */
    function profileRowEnabled(subject) {
      if (subject?.kind === 'row') return subject.row?.moduleName === PROFILE_MODULE && subject.row.enabled === true
      const row = Array.isArray(subject?.pkg?.rows)
        ? subject.pkg.rows.find(item => item?.moduleName === PROFILE_MODULE) : undefined
      return row === undefined ? true : row.enabled === true
    }
    // Every My Profile surface lives in this child fiber, which the
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
        // The optional public DSH Locale service drives the UI only while the
        // profile preference is 'auto'. Never write to DSH's locale preference.
        const hostLocale = typeof ctx.get === 'function' ? ctx.get('locale') : undefined
        const fallbackLocale = Object.freeze({active:'en',revision:0})
        const localeSource = hostLocale && typeof hostLocale.getSnapshot==='function' &&
          typeof hostLocale.subscribe==='function'
          ? {getSnapshot:()=>hostLocale.getSnapshot(),subscribe:fn=>hostLocale.subscribe(fn)}
          : {getSnapshot:()=>fallbackLocale,subscribe:()=>()=>{}}
        function ProfileSlot(props) {
          const page=h(PersonalProfilePage,{settings,connectionSource,localeSource,useRemoteAccess:props?.useRemoteAccess})
          return ProfileErrorBoundary?h(ProfileErrorBoundary,null,page):page
        }
        // Native Settings navigation replaces the global sidebar entry. Keep
        // the stable panel id and Host namespace for existing saved profiles.
        ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section', id: PROFILE_PANEL_ID, label: 'My Profile', order: 40,
        }, ProfileSlot))
        ctx.slots.inject('settings.section.icon', () => ctx.slots.register({
          name: 'settings.section.icon', id: PROFILE_PANEL_ID,
        }, ({ size }) => h(ProfilePanelIcon, { size })))
        ctx.slots.inject('plugins.detail.section', () => ctx.slots.register({
          name: 'plugins.detail.section', id: 'abinadwan-profile-draft', order: 40,
        }, ({ subject }) => ((subject?.kind === 'bundle' && subject.pkg?.name === TYPE) ||
          (subject?.kind === 'row' && subject.row?.moduleName === PROFILE_MODULE)) && profileRowEnabled(subject)
          ? h(ProfileDraft) : null))
      },
    }
