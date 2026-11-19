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
export function previewProfilePreferences(pref) {
  const lines = []
  const style = PROFILE_STYLES.find(item=>item[0]===pref.style)
  const language = PROFILE_LANGUAGES.find(item=>item[0]===pref.responseLanguage)
  if(style?.[3]) lines.push(style[3])
  if(language?.[3]) {
    const native=language[1].split(' — ')[0]
    lines.push('Write your response in '+language[3]+(native===language[3]?'':' ('+native+')')+' even when the user writes in another language, unless the user explicitly asks for a different language.')
  }
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

const keys=(value,expected)=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===expected.length&&expected.every(k=>Object.hasOwn(value,k))
export const SECTION_NAME='abinadwan:personal-profile-preferences'
export function responsePreferences(record) {
  if(!record||record.version!==2)return ''
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
export function eligibleAssembly(context) {
  const a=context?.agent, selection=context?.modelSelection, header=a?.session?.header
  return !!(a&&context.scope===a&&context.signal&&!context.signal.aborted&&header&&a.options&&
    header.origin===undefined&&(header.delegationDepth===undefined||header.delegationDepth===0)&&
    (a.options.subagentDepth===undefined||a.options.subagentDepth===0)&&
    typeof selection?.provider==='string'&&selection.provider.length>0&&typeof selection.model==='string'&&selection.model.length>0)
}
