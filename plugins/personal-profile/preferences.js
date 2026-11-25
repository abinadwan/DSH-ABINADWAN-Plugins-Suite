// Mirrored browser catalog/renderer. Parity test protects the lazy CJS client contract.
const PROFILE_STYLES = [
  ['default','الافتراضي','Default',''],
  ['professional','احترافي','Professional','Use polished, precise, professional language.'],
  ['friendly','ودود','Friendly','Use a friendly, approachable tone.'],
  ['candid','صريح ومباشر','Candid','Be direct, constructive, and candid.'],
  ['creative','إبداعي','Creative','Go beyond the obvious: include at least one fresh, unconventional idea suited to the task.'],
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
  ['warmth','الودّ','Warmth','Keep the tone neutral and reserved, without reassurance or pep talk.','Use a warmer, more approachable tone.'],
  ['enthusiasm','الحماس','Enthusiasm','Use a calm, restrained tone.','Use a more energetic tone when appropriate.'],
  ['structure','العناوين والقوائم','Headers and lists','Prefer cohesive prose over unnecessary headings or lists.','Use headings and lists when they improve readability.'],
  ['emoji','الرموز التعبيرية','Emoji','Avoid unnecessary emoji.','Use appropriate emoji sparingly when suitable for the task.'],
  ['detail','مستوى التفصيل','Detail','Prefer shorter answers when sufficient.','Provide more detail when useful.'],
  ['critical','التفكير النقدي','Critical thinking','Focus on the requested task without unnecessary critique.','Actively examine assumptions and identify meaningful risks.'],
]
const PROFILE_PRESETS = [
  ['critical','التفكير النقدي','Critical Thinking','اختبر الافتراضات ولا توافق تلقائيًا.','Challenge weak assumptions rather than agreeing automatically.'],
  ['no-fluff','دون حشو','No Fluff','تجنّب الحشو والمجاملات غير الضرورية.','Avoid filler and unnecessary compliments.'],
  ['grill-me','مراجعة المتطلبات','Grill-Me Mode','ناقش المتطلبات والمخاطر في القرارات المعقدة.','Before recommending a decision or plan, ask the user 2-3 specific questions about missing requirements and name the key risks.'],
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
const PREFERENCES_HEADER='Response preferences (follow the current request and higher-priority host/safety/tool requirements; custom guidance takes precedence over other style preferences where compatible).'
function languageInstruction(language) {
  const native=language[1].split(' — ')[0]
  return 'Write your response in '+language[3]+(native===language[3]?'':' ('+native+')')+' even when the user writes in another language, unless the user explicitly asks for a different language.'
}
export function previewProfilePreferences(pref) {
  const lines = []
  const style = PROFILE_STYLES.find(item=>item[0]===pref.style)
  const language = PROFILE_LANGUAGES.find(item=>item[0]===pref.responseLanguage)
  if(style?.[3]) lines.push(style[3])
  if(language?.[3]) lines.push(languageInstruction(language))
  for(const [key,,,less,more] of PROFILE_TRAITS) {
    if(pref.traits[key]===0) lines.push(less)
    if(pref.traits[key]===2) lines.push(more)
  }
  for(const [key,,,,instruction] of PROFILE_PRESETS) {
    if(pref.presets.includes(key)) lines.push(instruction)
  }
  if(pref.sendCustom===true && pref.custom.trim()) lines.push(pref.custom)
  return lines.length ? [PREFERENCES_HEADER,...new Set(lines)].join('\n') : ''
}
export const RECORD_VERSION=4

const PROMPT_LINE_BREAK=/\r\n?|\n|[\u0085\u2028\u2029]/
const normalizePromptText=text=>text.split(PROMPT_LINE_BREAK).join('\n')
const BUILT_IN_PREFERENCES=new Set([
  ...PROFILE_STYLES.map(item=>item[3]),
  ...PROFILE_LANGUAGES.filter(item=>item[3]).map(languageInstruction),
  ...PROFILE_TRAITS.flatMap(([, , , less, more])=>[less,more]),
  // A preset's rendered instruction is index 4, matching previewProfilePreferences.
  ...PROFILE_PRESETS.map(item=>item[4]),
].filter(Boolean))

// Structured fields are optional profile data, not instructions.
const PROFILE_DISCLOSURE_HEADER='Personal details the user chose to share (use them only when relevant to the request):'
const PROFILE_DISCLOSURE_FIELDS=[['preferredName','Preferred name'],['nationality','Nationality'],['gender','Gender']]
const profileDisclosureValue=value=>String(value).replace(/[\u0000-\u001f\u007f-\u009f\u061c\u200b\u200e\u200f\u2028\u2029\u202a-\u202e\u2060\u2066-\u206f\ufeff]/g,' ').replace(/\s+/g,' ').trim()
export function previewProfileDisclosure(record) {
  if(!record||record.version!==RECORD_VERSION) return ''
  const lines=[]
  for(const [key,label] of PROFILE_DISCLOSURE_FIELDS) {
    if(record.policies[key]!=='allow') continue
    const value=key==='gender' ? (['male','female'].includes(record.information.gender)?record.information.gender:'') : profileDisclosureValue(record.information[key])
    if(value) lines.push(label+': '+value)
  }
  return lines.length ? [PROFILE_DISCLOSURE_HEADER,...lines].join('\n') : ''
}

const keys=(value,expected)=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===expected.length&&expected.every(k=>Object.hasOwn(value,k))
export const SECTION_NAME='abinadwan:personal-profile-preferences'
export function responsePreferences(record) {
  if(!record||![2,3,RECORD_VERSION].includes(record.version))return ''
  const p=record.preferences
  const expected=['style','responseLanguage','traits','presets','custom']
  if(p && Object.hasOwn(p,'sendCustom'))expected.push('sendCustom')
  if(!keys(p,expected)||!PROFILE_STYLES.some(i=>i[0]===p.style)||!PROFILE_LANGUAGES.some(i=>i[0]===p.responseLanguage)||
    !keys(p.traits,PROFILE_TRAITS.map(i=>i[0]))||!Object.values(p.traits).every(n=>[0,1,2].includes(n))||
    !Array.isArray(p.presets)||p.presets.length>8||new Set(p.presets).size!==p.presets.length||
    !p.presets.every(id=>PROFILE_PRESETS.some(i=>i[0]===id))||typeof p.custom!=='string'||p.custom.length>8192||
    (Object.hasOwn(p,'sendCustom')&&typeof p.sendCustom!=='boolean'))return ''
  return previewProfilePreferences(p)
}
export const DISCLOSURE_SECTION_NAME='abinadwan:personal-profile-information'
const FIELD_KEYS=PROFILE_DISCLOSURE_FIELDS.map(([key])=>key)
/** Evaluate the explicit field policies. An older record or malformed input yields no block. */
export function profileDisclosure(record) {
  if(!record||record.version!==RECORD_VERSION)return ''
  const {information:i,policies:p}=record
  if(!keys(i,FIELD_KEYS)||!keys(p,FIELD_KEYS)||
    !FIELD_KEYS.every(k=>['private','allow'].includes(p[k]))||
    typeof i.preferredName!=='string'||i.preferredName.length>128||typeof i.nationality!=='string'||i.nationality.length>128||
    !['','male','female','unspecified'].includes(i.gender))return ''
  return previewProfileDisclosure(record)
}
const DISCLOSURE_LINE=new RegExp('^('+PROFILE_DISCLOSURE_FIELDS.map(([,label])=>label).join('|')+'): .')
function systemPromptTexts(request) {
  const texts=[]
  if(typeof request?.system==='string')texts.push(request.system)
  for(const message of Array.isArray(request?.messages)?request.messages:[]){
    if(message?.role!=='system'&&message?.role!=='developer')continue
    if(typeof message.content==='string')texts.push(message.content)
    else if(Array.isArray(message.content))for(const block of message.content)if(typeof block?.text==='string')texts.push(block.text)
  }
  return texts
}

/** Every shared-details block carried by system-level text of one model request. */
export function disclosureBlocks(request) {
  return systemPromptTexts(request).flatMap(detailsBlocksInText)
}
function detailsBlocksInText(text) {
  const blocks=[]
  const lines=text.split(PROMPT_LINE_BREAK)
  for(let i=0;i<lines.length;i++){
    if(lines[i]!==PROFILE_DISCLOSURE_HEADER)continue
    let end=i+1
    while(end<lines.length&&DISCLOSURE_LINE.test(lines[end]))end++
    blocks.push(lines.slice(i,end).join('\n'))
    i=end-1
  }
  return blocks
}
function staleCustomPreferences(text,allowedCustom) {
  if(!text.includes(PREFERENCES_HEADER))return false
  const prompt='\n'+normalizePromptText(text)
  const heading='\n'+PREFERENCES_HEADER+'\n'
  for(let start=prompt.indexOf(heading);start!==-1;start=prompt.indexOf(heading,start+heading.length-1)){
    const section=prompt.slice(start+heading.length)
    // Host joins sections with blank lines. Within the first paragraph,
    // the suite emits catalog lines first, followed by optional custom text.
    const firstParagraph=section.split('\n\n',1)[0]
    let offset=0
    for(const line of firstParagraph.split('\n')){
      const remaining=section.slice(offset)
      if(allowedCustom&&(remaining===allowedCustom||remaining.startsWith(allowedCustom+'\n\n'))){
        start+=offset+allowedCustom.length
        break
      }
      if(line&&!BUILT_IN_PREFERENCES.has(line))return true
      offset+=line.length+1
    }
  }
  return false
}

/** Send-time check for recognizable prior Profile sections against saved choices. */
export function staleDisclosure(request,record) {
  const texts=systemPromptTexts(request)
  const details=texts.flatMap(detailsBlocksInText)
  const allowedDetails=details.length ? profileDisclosure(record) : ''
  if(details.some(block=>block!==allowedDetails))return true

  const allowedCustom=record?.preferences?.sendCustom===true&&responsePreferences(record)
    ? normalizePromptText(record.preferences.custom) : ''
  return texts.some(text=>staleCustomPreferences(text,allowedCustom))
}
const REFUSAL={
  en:'Personal Profile stopped this request: the conversation contains Profile content that your current settings no longer share. Start a new chat to continue.',
  ar:'أوقف الملف الشخصي هذا الطلب: تحتوي المحادثة على محتوى من الملف الشخصي لم تعد إعداداتك الحالية تسمح بمشاركته. ابدأ محادثة جديدة للمتابعة.',
}
/** Terminal, non-retryable outcome in the native stream protocol. Never names a value. */
export async function* refuseStaleDisclosure(locale) {
  yield {type:'finish',reason:{kind:'error',failure:{code:'INVALID_REQUEST',message:REFUSAL[locale]??REFUSAL.en}}}
}
export function eligibleAssembly(context) {
  const a=context?.agent, selection=context?.modelSelection, header=a?.session?.header
  return !!(a&&context.scope===a&&context.signal&&!context.signal.aborted&&header&&a.options&&
    header.origin===undefined&&(header.delegationDepth===undefined||header.delegationDepth===0)&&
    (a.options.subagentDepth===undefined||a.options.subagentDepth===0)&&
    typeof selection?.provider==='string'&&selection.provider.length>0&&typeof selection.model==='string'&&selection.model.length>0)
}
