// Phase 7D candidate instruction sets and benchmark cases.
// Candidates are generic instructions written from failure modes, never from fixture content.
// Each stage includes the prior fixture (continuity) plus held-out tasks (overfitting check).
import {CURRENT, neutral, catalog} from './lib.mjs'

const nativeName = l => { const n = l[1].split(' — ')[0]; return n === l[3] || /[a-z]/i.test(n) && n.toLowerCase() === l[3].toLowerCase() ? '' : n }

export const VARIANTS = {
  // Language wording (the only line that changes between L* variants).
  L0: {...CURRENT},
  L1: {...CURRENT, language: n => 'Respond in ' + n + ' by default. The language of the user\'s message does not change the selected response language. Use another language only when the user explicitly requests it.'},
  L2: {...CURRENT, language: (n, l) => { const nat = nativeName(l); return 'Write your response in ' + n + (nat ? ' (' + nat + ')' : '') + ' even when the user writes in another language, unless the user explicitly asks for a different language.' }},
  // Precedence header.
  H0: {...CURRENT},
  H1: {...CURRENT, header: 'Response preferences (defaults only: the user\'s current request overrides them, including exact output, format, length and language; host, safety and tool rules come first; custom guidance overrides the other preferences).'},
  // Creative style.
  S0: {...CURRENT},
  S1: {...CURRENT, styles: {creative: 'Offer at least one original, non-obvious idea that fits the task, and say briefly why it could work.'}},
  S2: {...CURRENT, styles: {creative: 'Go beyond the obvious: include at least one fresh, unconventional idea suited to the task.'}},
  // Grill-Me preset.
  G0: {...CURRENT},
  G1: {...CURRENT, presets: {'grill-me': 'For complex or high-stakes decisions, first ask the most important clarifying questions about missing requirements and name key risks; give only a provisional recommendation until they are answered.'}},
  G2: {...CURRENT, presets: {'grill-me': 'For complex decisions with unclear requirements, start by asking 2-3 focused clarifying questions and naming the main risks before proposing a plan.'}},
  // Code Reviewer preset.
  C0: {...CURRENT},
  C1: {...CURRENT, presets: {code: 'When reviewing code, check correctness, security (untrusted input, trust boundaries), performance, and missing tests; report only real issues, each with a concrete fix.'}},
  // Humanizer preset.
  U0: {...CURRENT},
  U1: {...CURRENT, presets: {humanizer: 'When editing text, write naturally but keep every fact, number, citation, and hedge exactly; add no new claims or details.'}},
  // Remaining items with observed failure modes (stage B).
  B0: {...CURRENT},
  B1: {...CURRENT,
    styles: {efficient: 'Lead with the answer, keep it brief and practical, and skip preamble.'},
    traits: {'warmth.0': 'Keep the tone neutral and reserved, without reassurance or pep talk.',
      'emoji.2': 'When suitable for the task, use one to three relevant emoji.',
      'detail.0': 'Keep answers short: give the core answer first and omit nonessential background.'},
    presets: {'no-fluff': 'Start with the substance; no greetings, compliments, or filler.'}},
  // Round 2 (2026-11-19), after G1/G2 and C1 showed no reliable gain. Generic wording; acceptance tasks stay unseen.
  G3: {...CURRENT, presets: {'grill-me': 'Before recommending a decision or plan, ask the user 2-3 specific questions about missing requirements and name the key risks.'}},
  G4: {...CURRENT, presets: {'grill-me': 'For decisions or plans, do not give a final recommendation yet: ask 2-3 specific questions about missing requirements, name the key risks, and offer at most a provisional view. Answer simple factual questions directly.'}},
  C2: {...CURRENT, presets: {code: 'When reviewing code, assess correctness, security, performance, and test coverage; name the missing tests and give a safe fix for each issue.'}},
  // B1 restricted to the line that beat current wording in Stage B and was corroborated by a non-circular
  // proxy (0 vs 17 exclamations). efficient/detail.0 lost; emoji.2 only matched the 1-3 scoring band;
  // no-fluff's judge gain had no measurable filler difference.
  B1w: {...CURRENT, traits: {'warmth.0': 'Keep the tone neutral and reserved, without reassurance or pep talk.'}},
}

const P = (prefs = {}) => ({...neutral(), ...prefs})
const T = (k, v) => ({...neutral().traits, [k]: v})

export const PROMPTS = {
  daysAr: 'كم عدد أيام الأسبوع؟ أجب بجملة قصيرة.',
  boilEn: 'At what temperature does water boil at sea level in Celsius? Answer in one short sentence.',
  monthsZh: '一年有几个月？请用一句话简短回答。',
  newsletter: 'A fictional volunteer club plans to launch a website newsletter in two weeks. It has one volunteer, no budget, and assumes every visitor will subscribe. Assess the plan and suggest a useful approach. Keep the response under 130 words.',
  library: 'A fictional neighborhood library wants more teenagers to visit. It has a small budget and two staff members. Suggest an approach. Keep the response under 130 words.',
  kmMiles: 'Convert 5 kilometers to miles. Answer in one sentence.',
  migrate: 'My fictional club wants to move all registrations to a new app next week. Help me decide how to proceed. Keep it under 130 words.',
  pos: 'Our fictional bakery is considering replacing its in-store payment and inventory system with a cloud service. Should we do it? Keep it under 130 words.',
  percent: 'What is 15% of 80? Answer briefly.',
  codeFs: 'Review this fictional JavaScript function for a web server. Assume req.query.name is untrusted text and fs exists. function read(req) { return fs.readFileSync("/public/" + req.query.name, "utf8"); } Keep the review under 160 words.',
  codeSql: 'Review this fictional Node.js function. Assume db.query runs SQL and userId comes from the HTTP request. async function getOrders(db, userId) { const rows = await db.query("SELECT id FROM orders WHERE user_id = " + userId); const out = []; for (const r of rows) out.push(await db.query("SELECT * FROM items WHERE order_id = " + r.id)); return out; } Keep the review under 160 words.',
  humanA: 'Edit this fictional bulletin into natural prose, preserving its facts, citation, and uncertainty: "In order to facilitate the enhancement of participation, it is important to note that 12 volunteers attended on Tuesday [Club log A]. Attendance may increase next month; the cause is unknown." Keep it under 90 words.',
  humanB: 'Edit this fictional notice into natural prose, preserving its facts, citation, and uncertainty: "It should be noted that the utilization of the hall by 45 members occurred on 3 March [Minutes B]. It is possible that the fee might be reduced; no decision has been made." Keep it under 80 words.',
  exactWord: 'Reply with exactly the single word P7D-USER-OVERRIDE and nothing else.',
  jsonOnly: 'Output only this JSON object and no other text: {"ok":true}',
  emojiWelcome: 'Write a short cheerful welcome message for a fictional weekend hiking club group chat. Keep it under 70 words.',
  triangle: 'How many sides does a triangle have? Answer briefly.',
  bookSwap: 'Explain how to organize a fictional club book-swap event: preparation, sorting books, arrivals, and cleanup. Keep it under 130 words.',
  long: 'Explain in detail, in at least 200 words, why a fictional small club should document its procedures.',
  // Stage B prompts (prior fixtures + held-out).
  nervous: 'I am nervous about giving my first short talk to a fictional hobby club tomorrow. What should I do? Keep the answer under 110 words.',
  interview: 'I have my first job interview at a fictional bookshop on Friday and feel anxious. Any advice? Keep the answer under 110 words.',
  garden: 'Our fictional hobby club completed its first community garden. Write a short message to the volunteers. Keep it under 90 words.',
  potluck: 'Write a short announcement inviting members of a fictional cooking club to a weekend potluck. Keep it under 70 words.',
  ttl: 'Explain what a browser cache TTL is and when a small fictional website should use a short one. Keep it under 180 words.',
  dns: 'Explain what a DNS record is and when a small fictional website owner would edit one. Keep it under 180 words.',
  twoFriends: 'My fictional club surveyed two friends who liked an app idea, so we should spend the entire club budget building it. What do you think? Keep it under 130 words.',
  backup: 'Explain why a fictional small club should keep a backup of its member list. Keep it under 110 words.',
  passwords: 'Explain why a fictional small club should use a password manager for its shared accounts. Keep it under 110 words.',
  attendance: 'A fictional club claims its newsletter doubled attendance: 10 people came last month and 20 this month after one newsletter. Assess the claim using only these facts. Keep it under 130 words.',
  books: 'Help a fictional club move 30 book records from a paper notebook to a spreadsheet, check accuracy, and keep a backup. Keep it under 130 words.',
  lowReg: 'Our fictional club event registrations are low and the event is in one week. What should we do now? Keep it under 120 words.',
}

const custom = 'Begin every answer with P7D-SYNTH-4821.'
const langs = catalog.languages.filter(l => l[0] !== 'auto').map(l => l[0])

// Each case: {id, prompt, prefs, variants:[...], check:{...}} expanded into rows (case x variant).
export function stageA() {
  const cases = []
  const add = (id, prompt, prefs, variants, meta = {}) => cases.push({id, prompt, prefs, variants, ...meta})
  for (const lang of langs) {
    add(`lang.${lang}.daysAr`, PROMPTS.daysAr, P({responseLanguage: lang}), ['L0', 'L1', 'L2'], {area: 'language', expect: lang})
    const held = lang === 'en' ? 'monthsZh' : 'boilEn'
    add(`lang.${lang}.${held}`, PROMPTS[held], P({responseLanguage: lang}), ['L0', 'L1', 'L2'], {area: 'language', expect: lang})
  }
  for (const lang of ['ar', 'zh', 'ja', 'de']) add(`override.${lang}.en`, PROMPTS.daysAr + ' Please answer in English.', P({responseLanguage: lang}), ['L0', 'L1', 'L2'], {area: 'override', expect: 'en'})
  add('override.en.fr', PROMPTS.boilEn + ' Réponds en français.', P({responseLanguage: 'en'}), ['L0', 'L1', 'L2'], {area: 'override', expect: 'fr'})
  // Precedence.
  add('prec.exactWord', PROMPTS.exactWord, P({style: 'creative', responseLanguage: 'zh', presets: ['steps'], custom, sendCustom: true}), ['H0', 'H1'], {area: 'precedence', check: 'exactWord'})
  add('prec.jsonOnly', PROMPTS.jsonOnly, P({custom: 'End every answer with the line "Regards, Synth".', sendCustom: true}), ['H0', 'H1'], {area: 'precedence', check: 'jsonOnly'})
  add('prec.customOverPrefs', PROMPTS.emojiWelcome, P({style: 'friendly', traits: {...T('emoji', 2), detail: 2}, presets: ['no-fluff'], custom: custom + ' Use no emoji and write exactly one sentence.', sendCustom: true}), ['H0', 'H1'], {area: 'precedence', check: 'customOverPrefs'})
  add('prec.customNoLists', PROMPTS.bookSwap, P({traits: T('structure', 2), presets: ['steps'], custom: 'Answer in a single paragraph with no headings or lists.', sendCustom: true}), ['H0', 'H1'], {area: 'precedence', check: 'noLists'})
  add('prec.userLength', PROMPTS.long, P({style: 'efficient', traits: T('detail', 0), presets: ['no-fluff']}), ['H0', 'H1'], {area: 'precedence', check: 'minWords200'})
  add('prec.customPositive', PROMPTS.triangle, P({custom, sendCustom: true}), ['H0', 'H1'], {area: 'precedence', check: 'markerFirst'})
  // Creative.
  for (const k of ['newsletter', 'library', 'kmMiles']) {
    add(`creative.${k}.neutral`, PROMPTS[k], P(), ['S0'], {area: 'creative', role: 'neutral', task: k})
    add(`creative.${k}`, PROMPTS[k], P({style: 'creative'}), ['S0', 'S1', 'S2'], {area: 'creative', task: k})
  }
  // Grill-Me.
  for (const k of ['migrate', 'pos', 'percent']) {
    add(`grill.${k}.neutral`, PROMPTS[k], P(), ['G0'], {area: 'grill', role: 'neutral', task: k})
    add(`grill.${k}`, PROMPTS[k], P({presets: ['grill-me']}), ['G0', 'G1', 'G2', 'G3', 'G4'], {area: 'grill', task: k})
  }
  for (const k of ['codeFs', 'codeSql']) {
    add(`code.${k}.neutral`, PROMPTS[k], P(), ['C0'], {area: 'code', role: 'neutral', task: k})
    add(`code.${k}`, PROMPTS[k], P({presets: ['code']}), ['C0', 'C1', 'C2'], {area: 'code', task: k})
  }
  for (const k of ['humanA', 'humanB']) {
    add(`human.${k}.neutral`, PROMPTS[k], P(), ['U0'], {area: 'humanizer', role: 'neutral', task: k})
    add(`human.${k}`, PROMPTS[k], P({presets: ['humanizer']}), ['U0', 'U1'], {area: 'humanizer', task: k})
  }
  return cases
}

// Stage B: every remaining style, trait level and preset at current wording (coverage), plus
// B1 candidates for observed failure modes on prior fixture and held-out prompts.
export function stageB() {
  const cases = []
  const add = (id, prompt, prefs, variants, meta = {}) => cases.push({id, prompt, prefs, variants, ...meta})
  const traitPrompts = {warmth: ['nervous', 'interview'], enthusiasm: ['garden'], structure: ['bookSwap'], emoji: ['emojiWelcome', 'potluck'], detail: ['ttl', 'dns'], critical: ['twoFriends']}
  const presetPrompts = {critical: 'twoFriends', 'no-fluff': 'backup', evidence: 'attendance', steps: 'books', action: 'lowReg'}
  const candidateKeys = {style: ['efficient'], trait: ['warmth.0', 'emoji.2', 'detail.0'], preset: ['no-fluff']}
  for (const [key] of catalog.styles) {
    if (key === 'creative') continue
    const cand = candidateKeys.style.includes(key)
    add(`style.${key}.newsletter`, PROMPTS.newsletter, P({style: key}), cand ? ['B0', 'B1'] : ['B0'], {area: 'style', key, task: 'newsletter', prior: 'style.' + key})
    if (cand) {
      add(`style.default.library`, PROMPTS.library, P(), ['B0'], {area: 'style', key: 'default', task: 'library'})
      add(`style.${key}.library`, PROMPTS.library, P({style: key}), ['B0', 'B1'], {area: 'style', key, task: 'library'})
    }
  }
  for (const [key] of catalog.traits) for (const [i, task] of traitPrompts[key].entries()) for (const level of [0, 1, 2]) {
    const cand = candidateKeys.trait.includes(`${key}.${level}`)
    add(`trait.${key}.${level}.${task}`, PROMPTS[task], P({traits: T(key, level)}), cand ? ['B0', 'B1'] : ['B0'], {area: 'trait', key, level, task, prior: i === 0 ? `trait.${key}.${level}` : undefined})
  }
  for (const [key, task] of Object.entries(presetPrompts)) {
    const cand = candidateKeys.preset.includes(key)
    add(`preset.${key}.${task}.neutral`, PROMPTS[task], P(), ['B0'], {area: 'preset', key, role: 'neutral', task, prior: `preset.${key}.baseline`})
    add(`preset.${key}.${task}`, PROMPTS[task], P({presets: [key]}), cand ? ['B0', 'B1'] : ['B0'], {area: 'preset', key, task, prior: `preset.${key}.on`})
    if (cand) {
      add(`preset.${key}.passwords.neutral`, PROMPTS.passwords, P(), ['B0'], {area: 'preset', key, role: 'neutral', task: 'passwords'})
      add(`preset.${key}.passwords`, PROMPTS.passwords, P({presets: [key]}), ['B0', 'B1'], {area: 'preset', key, task: 'passwords'})
    }
  }
  return cases
}

// ---------------------------------------------------------------------------------------------
// Acceptance (stage C): winners vs current on NEW held-out tasks with five additional seeds.
// WINNERS lists the selected variant ids per line; it is filled only after Stage A/B selection.
export const ACCEPT_SEEDS = [303, 404, 505, 606, 707]
// Selected 2026-11-19 from Stage A/B + round 2 (see docs/PERSONAL_PROFILE_PHASE7D_CANDIDATES.md).
export const WINNERS = ['L2', 'S2', 'G3', 'C2', 'U1', 'B1w']
export function winnerVariant(w = WINNERS) {
  if (!w) throw Error('WINNERS not selected yet')
  const v = {...CURRENT, styles: {}, traits: {}, presets: {}}
  for (const id of w) {
    const s = VARIANTS[id]
    if (s.header !== CURRENT.header) v.header = s.header
    if (s.language !== CURRENT.language) v.language = s.language
    // Only the lines this variant changes; inherited (pinned baseline) entries must not overwrite another winner.
    for (const kind of ['styles', 'traits', 'presets']) for (const [k, t] of Object.entries(s[kind] ?? {})) if (t !== CURRENT[kind][k]) v[kind][k] = t
  }
  return v
}
export const ACCEPT_PROMPTS = {
  capitalAr: 'ما هي عاصمة فرنسا؟ أجب بجملة قصيرة.',
  spiderEn: 'How many legs does a spider have? Answer in one short sentence.',
  continentsEs: '¿Cuántos continentes hay en la Tierra? Responde en una frase corta.',
  newWord: 'Respond with only the token ACCEPT-7D-OK and nothing else.',
  newJson: 'Return only this JSON and nothing else: {"status":"ready","count":3}',
  garden: 'A fictional school wants students to waste less food in its cafeteria. Suggest an approach. Keep it under 130 words.',
  crm: 'Our fictional nonprofit wants to replace its donor spreadsheet with a paid CRM before the year-end campaign in three weeks. Help us decide. Keep it under 130 words.',
  hours: 'How many hours are in two days? Answer briefly.',
  codeUpload: 'Review this fictional Express handler. Assume req.body.url is untrusted. app.post("/fetch", async (req, res) => { const r = await fetch(req.body.url); res.send(await r.text()); }); Keep the review under 160 words.',
  humanC: 'Edit this fictional memo into natural prose, preserving its facts, citation, and uncertainty: "It has been determined that the repair of 8 bicycles was completed on Friday [Workshop sheet C]. The supplier could possibly raise prices; this has not been confirmed." Keep it under 80 words.',
  mathEn: 'A fictional club has 48 members. One quarter of them volunteer on Saturday. How many members volunteer? Show the answer briefly.',
  factEn: 'Explain in two sentences why the sky appears blue.',
  exam: 'I have my first driving test for a fictional licence next week and I keep worrying about failing. Any tips? Keep the answer under 110 words.',
}
