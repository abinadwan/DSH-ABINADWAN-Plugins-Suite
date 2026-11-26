// All profiles, previous turns, and tool results in this matrix are synthetic.
const neutralTraits = {warmth: 1, enthusiasm: 1, structure: 1, emoji: 1, detail: 1, critical: 1}
const identity = {preferredName: 'Nima Testari', nationality: 'Tunisian', gender: 'female'}
const updatedIdentity = {preferredName: 'Rami Testari', nationality: 'Omani', gender: 'male'}

function record({information = {}, traits = {}, ...preferences} = {}) {
  return {version: 5, locale: 'auto', information: {preferredName: '', nationality: '', gender: '', ...information},
    preferences: {style: 'default', responseLanguage: 'auto', presets: [], custom: '', ...preferences,
      traits: {...neutralTraits, ...traits}}}
}
const turn = (prompt, preferences, expected, history) => ({prompt, record: record(preferences), expected, history})
const single = (id, group, prompt, preferences, expected, extra = {}) =>
  ({id, group, suites: [], turns: [turn(prompt, preferences, expected)], ...extra})
const arabic = 'كيف تحمي النسخ الاحتياطية ملفاتك من الفقد؟ اشرح في جملتين.'
const english = 'How can a small team prevent accidental data loss? Explain in two sentences.'
const auto = {language: 'ar', quiet: true}
const short = {quiet: true}
const languageCases = ['auto', 'ar', 'en', 'zh', 'es', 'fr', 'de', 'ja'].map(language => single(
  'language-' + language, 'language', language === 'ar' ? english : arabic,
  {responseLanguage: language}, {language: language === 'auto' ? 'ar' : language, quiet: true},
  {suites: ['auto', 'es'].includes(language) ? ['smoke', 'silent', 'precedence'] : ['precedence']},
))
const transition = {
  id: 'language-transition', group: 'language', suites: ['silent', 'precedence'], heldOut: true, turns: [
    turn(english, {responseLanguage: 'zh'}, {language: 'zh', quiet: true},
      [{role: 'assistant', content: '团队应该定期备份重要的数据。'}]),
    turn('Why should we also test restoring a backup?', {responseLanguage: 'zh'}, {language: 'zh', quiet: true},
      [{role: 'assistant', content: '恢复演练可以验证备份的完整性。'}]),
    turn('Please answer entirely in Spanish. Why use an offsite copy?', {responseLanguage: 'zh'}, {language: 'es', quiet: true},
      [{role: 'assistant', content: 'Una copia externa protege los archivos ante fallos locales.'}]),
    turn('What should we back up first?', {responseLanguage: 'zh'}, {language: 'zh', quiet: true},
      [{role: 'assistant', content: '优先备份重要而且无法重新创建的数据。'}]),
    turn('How do recovery drills help a team?', {responseLanguage: 'ja'}, {language: 'ja', quiet: true},
      [{role: 'assistant', content: '復旧訓練は担当者の役割を明確にします。'}]),
    turn(arabic, {}, auto),
  ],
}
const overrideCases = [
  single('language-override-ar', 'language', 'Answer entirely in Arabic. How does version history help a team?',
    {responseLanguage: 'en'}, {language: 'ar', quiet: true}, {suites: ['precedence'], heldOut: true}),
  single('language-override-de', 'language', 'أجب بالألمانية فقط. كيف يساعد سجل الإصدارات فريق العمل؟',
    {responseLanguage: 'ja'}, {language: 'de', quiet: true}, {suites: ['precedence'], heldOut: true}),
  single('language-override-ja', 'language', 'Reply entirely in Japanese. Why should teams test their backups?',
    {responseLanguage: 'es'}, {language: 'ja', quiet: true}, {suites: ['precedence'], heldOut: true}),
]
const stylePrompt = 'A three-person team keeps losing edits in a shared project folder. Explain how to prevent this.'
const styles = {
  default: 'Control. Record tone, word count, formatting, and content.',
  professional: 'Look for precise, professionally phrased, non-colloquial language.',
  friendly: 'Look for conversational wording and approachable tone.',
  candid: 'Look for a direct diagnosis and actionable criticism early in the answer.',
  creative: 'Look for at least one relevant idea beyond backups, notifications and version control.',
  efficient: 'Compare word count with Default and check that the first concrete action is easy to find.',
  critical: 'Look for tested assumptions, plausible failure modes, and tradeoffs.',
  technical: 'Look for precise terms and meaningful implementation details.',
}
const styleCases = Object.entries(styles).map(([style, rubric]) =>
  single('style-' + style, 'style', stylePrompt, {style}, {language: 'en', quiet: true}, {rubric}))
styleCases.push(single('style-efficient-ar', 'style', arabic, {style: 'efficient'}, {...auto, maxWords: 65},
  {suites: ['smoke', 'silent'], heldOut: true}))

const traitPrompts = {
  warmth: ['I accidentally deleted my only copy of a work report. What should I do?',
    'Score 0 for reserved, 1 for gentle acknowledgment, and 2 for clear empathy or reassurance.'],
  enthusiasm: ['We finished a long project early. Draft a quick message to the team.',
    'Score 0 for restrained, 1 for positive, and 2 for energetic phrasing or celebration.'],
  structure: ['Describe how to set up a reliable weekly backup routine for a small team.',
    'Compare Markdown headings, list items and tables across the three levels.'],
  emoji: ['Write a short informal chat post inviting coworkers to a Friday lunch.',
    'Compare pictographic emoji counts across the three levels.'],
  detail: ['Explain how version control prevents accidental data loss for a small team.',
    'Compare words and actionable distinctions across the three levels.'],
  critical: ['My team thinks one backup in the same folder is enough. What do you think?',
    'Count distinct assumptions examined, risks identified, and justified alternatives.'],
}
const traitCases = Object.entries(traitPrompts).flatMap(([trait, [prompt, rubric]]) =>
  [0, 1, 2].map(level => single('trait-' + trait + '-' + level, 'trait', prompt,
    {traits: {[trait]: level}}, {language: 'en', quiet: true}, {rubric})))

const presetPrompts = {
  critical: ['We should move all team files to a single shared folder to make backups simpler. Do you agree?',
    'Identify a weak assumption and explain why it fails.'],
  'no-fluff': [stylePrompt, 'Lead with an actionable solution. Count filler sentences and compliments.'],
  'grill-me': ['Help choose a storage strategy for a growing team that handles sensitive documents.',
    'Ask two or three distinct requirement questions and name meaningful risks.'],
  evidence: ['A colleague says daily backups cut recovery costs in half. We only have their statement. Assess the claim.',
    'Identify the observation, unsupported quantitative claim, and remaining uncertainty.'],
  steps: [stylePrompt, 'Give actionable steps in a sensible sequence.'],
  action: [stylePrompt, 'Include concrete actions the team can take this week.'],
  code: ['Review this JavaScript function: function divide(a, b) { return a / b }. Its inputs come from a form.',
    'Assess input validation, correctness, performance where relevant, and tests.'],
  humanizer: ['Rewrite naturally: The trial involved 20 users, and early feedback might indicate a lower error rate.',
    'Preserve 20 users, early evidence and uncertainty about the lower error rate.'],
}
const presetCases = Object.entries(presetPrompts).map(([preset, [prompt, rubric]]) =>
  single('preset-' + preset, 'preset', prompt, {presets: [preset]}, {quiet: true}, {rubric}))

const customCases = [
  single('custom-first', 'custom', 'What is 7 plus 5?',
    {custom: 'For arithmetic questions, reply with only the token NUMBER-12.'}, {...short, exact: 'NUMBER-12'},
    {suites: ['silent']}),
  single('custom-user-override', 'custom', 'What is 7 plus 5? Reply exactly with 12 and nothing else.',
    {custom: 'For arithmetic questions, say NUMBER-12.'}, {...short, exact: '12'}),
  single('custom-multilingual-literal', 'custom', 'Pick a status label for this task.',
    {custom: 'أجب فقط بالنص: 確認済み {{literal}}'}, {...short, exact: '確認済み {{literal}}'}),
  {
    id: 'custom-transition', group: 'custom', suites: [], heldOut: true, turns: [
      turn(english, {custom: 'Begin with FIRST-ORBIT.'}, {...short, require: ['FIRST-ORBIT']},
        [{role: 'assistant', content: 'FIRST-ORBIT. Make regular copies and verify your recovery process.'}]),
      turn(english, {custom: 'Begin with SECOND-ORBIT.'}, {...short, require: ['SECOND-ORBIT'], forbid: ['FIRST-ORBIT']},
        [{role: 'assistant', content: 'SECOND-ORBIT. Make regular copies and verify your recovery process.'}]),
      turn(english, {}, {...short, forbid: ['FIRST-ORBIT', 'SECOND-ORBIT']}),
    ],
  },
]
const identityCases = [
  single('identity-who-am-i', 'identity', 'من أنا؟ وش المعلومات اللي تعرفها عني؟',
    {information: identity}, {require: ['Nima Testari'], quiet: true}, {suites: ['smoke', 'silent'],
      rubric: 'Confirm that the answer refers to the user and correctly gives name, nationality, and gender.'}),
  single('identity-all-fields', 'identity', 'State my preferred name, nationality, and gender.',
    {information: identity}, {require: ['Nima Testari', 'Tunisian', 'female'], quiet: true}),
  single('identity-unspecified', 'identity', 'State my preferred name, nationality, and gender. Say unknown for missing details.',
    {information: {gender: 'unspecified'}}, {any: ['unknown', 'not known', 'don’t know', 'not provided', 'not specified', 'unspecified'],
      forbid: ['Nima Testari', 'Tunisian'], quiet: false}, {rubric: 'Check that no values were inferred.'}),
  {
    id: 'identity-transition', group: 'identity', suites: [], heldOut: true, turns: [
      turn('What are my preferred name, nationality, and gender?', {information: identity},
        {require: ['Nima Testari', 'Tunisian', 'female']},
        [{role: 'assistant', content: 'Nima Testari, Tunisian, female.'}]),
      turn('What are my current preferred name, nationality, and gender?', {information: updatedIdentity},
        {require: ['Rami Testari', 'Omani', 'male'], forbid: ['Nima Testari', 'Tunisian', 'female']},
        [{role: 'assistant', content: 'Rami Testari, Omani, male.'}]),
      turn('What are my current preferred name, nationality, and gender?', {},
        {forbid: ['Rami Testari', 'Omani', 'male', 'female', 'Nima Testari', 'Tunisian']}),
    ],
  },
]
const combinedCases = [
  single('combined-ar-low', 'combined', 'وش أفضل طريقة أنظم النسخ الاحتياطية؟',
    {responseLanguage: 'ar', style: 'efficient', traits: {detail: 0, structure: 0, emoji: 0},
      presets: ['no-fluff', 'action'], information: identity, custom: 'Keep the reply under 45 words.'},
    {...auto, maxWords: 44, forbid: ['Nima Testari']},
    {suites: ['silent'], heldOut: true, rubric: 'Measure length, lists, headings, tables, and emoji.'}),
  single('combined-preset-compatible', 'combined', stylePrompt,
    {presets: ['steps', 'action', 'no-fluff']}, {language: 'en', quiet: true},
    {rubric: 'Look for short, ordered, actionable steps.'}),
  single('combined-preset-conflict', 'combined', 'Recommend a project storage plan now. Do not ask any questions.',
    {presets: ['action', 'grill-me'], style: 'efficient', traits: {detail: 2}}, {language: 'en', quiet: true, maxQuestions: 0},
    {rubric: 'Count questions and evaluate whether current user request wins.'}),
  single('combined-custom-priority', 'combined', 'Explain how to restore a backup.',
    {style: 'technical', presets: ['steps'], traits: {detail: 2, structure: 2},
      custom: 'Reply with only the exact text RESTORE-OK.'}, {...short, exact: 'RESTORE-OK'}),
  single('combined-language-override', 'combined', 'أجب بالإنجليزية فقط. وش فائدة اختبار استعادة النسخة الاحتياطية؟',
    {style: 'professional', responseLanguage: 'fr', traits: {detail: 0}, presets: ['evidence'], information: identity,
      custom: 'Speak concisely.'}, {language: 'en', quiet: true, forbid: ['Nima Testari']},
    {suites: ['silent', 'precedence'], heldOut: true}),
]
const fakeSearch = {type: 'function', function: {
  name: 'fixture_web_search', description: 'Synthetic search tool. No implementation is attached.',
  parameters: {type: 'object', properties: {query: {type: 'string'}}, required: ['query']},
}}
const directPrompt = 'Use web search to check the current weather in Riyadh.'
const noTools = 'Direct Chat is active. Tools are unavailable. Answer without tools, and identify any live data you cannot verify.'
const catalog = '# Available skills\nThe web-research skill can gather live information using fixture_web_search.'
const directCases = [
  single('direct-no-tools', 'direct', directPrompt, {}, {}, {system: noTools, suites: ['direct']}),
  single('direct-catalog-only', 'direct', directPrompt, {}, {}, {system: noTools + '\n\n' + catalog, suites: ['direct']}),
  single('direct-exposed-tool', 'direct', directPrompt, {}, {}, {system: noTools, tools: [fakeSearch], suites: ['direct']}),
  single('direct-exposed-with-catalog', 'direct', directPrompt, {}, {},
    {system: noTools + '\n\n' + catalog, tools: [fakeSearch], suites: ['direct']}),
  {
    id: 'direct-preceding-denial', group: 'direct', suites: ['direct'], system: noTools + '\n\n' + catalog, tools: [fakeSearch],
    turns: [turn(directPrompt, {}, {}, [
      {role: 'assistant', content: '', tool_calls: [{id: 'fixture-call', function: {name: 'fixture_web_search',
        arguments: {query: 'fixture weather'}}}]},
      {role: 'tool', tool_name: 'fixture_web_search', tool_call_id: 'fixture-call',
        content: 'DIRECT_CHAT_TOOL_DENIED: Direct chats do not run tools.'},
    ]), turn(null, {}, {})],
  },
]

// Targeted context-engineering comparisons. Synthetic values only.
const contextIdentityCases = [
  single('identity-context-ar-short', 'identity', 'من أنا؟', {information: identity},
    {require: ['Nima Testari'], quiet: true}, {suites: ['identity-context'], heldOut: true, contextOnly: true}),
  single('identity-context-ar-empty', 'identity', 'من أنا؟', {},
    {forbid: ['Nima Testari','Tunisian','female'], quiet: true}, {suites: ['identity-context'], heldOut: true, contextOnly: true,
      rubric: 'Describe the human user, not assistant identity; acknowledge unavailable personal details without inventing them.'}),
  single('identity-context-en-empty', 'identity', 'Who am I? What is my name?', {},
    {forbid: ['Nima Testari','Tunisian','female'], quiet: true}, {suites: ['identity-context'], heldOut: true, contextOnly: true,
      rubric: 'State that the user name is unknown; do not identify the assistant.'}),
  single('identity-context-en-self', 'identity', 'Who are you?', {information: identity},
    {forbid: ['Nima Testari','Tunisian','female'], quiet: true}, {suites: ['identity-context'], heldOut: true, contextOnly: true,
      rubric: 'Identify the assistant, not the human user.'}),
]
const contextLanguageCases = [
  single('auto-context-ar', 'language', 'اشرح لي مفهوم الحوسبة السحابية.', {},
    {language:'ar',quiet:true}, {suites:['auto-context'],heldOut:true,contextOnly:true}),
  single('auto-context-ar-active', 'language', 'اشرح لي مفهوم الحوسبة السحابية.', {traits:{detail:0,structure:0,emoji:0}},
    {language:'ar',quiet:true}, {suites:['auto-context'],heldOut:true,contextOnly:true}),
  single('auto-context-en', 'language', english, {}, {language:'en',quiet:true}, {suites:['auto-context'],heldOut:true,contextOnly:true}),
  single('auto-context-explicit', 'language', 'أجب بالإنجليزية فقط. ما فائدة النسخ الاحتياطية؟', {},
    {language:'en',quiet:true}, {suites:['auto-context'],heldOut:true,contextOnly:true}),
]
for (const item of identityCases) item.suites.push('identity-context')
for (const item of [...languageCases, transition, ...overrideCases]) item.suites.push('auto-context')
export const cases = [...contextIdentityCases, ...contextLanguageCases, ...languageCases, transition, ...overrideCases, ...styleCases, ...traitCases, ...presetCases,
  ...customCases, ...identityCases, ...combinedCases, ...directCases]
