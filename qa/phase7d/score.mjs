// Deterministic scorers (no model involved). Each returns {pass:boolean|null, partial?, incomplete?, detail}.
import {words, emojiCount} from './lib.mjs'

const count = (s, re) => (s.match(re) || []).length
const STOP = {
  en: /\b(the|a|an|there|are|is|in|of|at|water|week|days|year|months|has|boils)\b/gi,
  es: /\b(el|la|los|las|hay|una|un|semana|días|dias|año|meses|tiene|agua|hierve|nivel|del|mar|en|de)\b/gi,
  fr: /\b(le|la|les|il|y|a|une|un|semaine|jours|année|annee|mois|eau|bout|niveau|de|mer|est|en|l)\b/gi,
  de: /\b(der|die|das|es|gibt|hat|eine|ein|woche|tage|jahr|monate|wasser|kocht|siedet|meeresspiegel|bei|auf|grad)\b/gi,
}
export function language(text) {
  const t = text.replace(/`[^`]*`/g, '')
  const ar = count(t, /[؀-ۿ]/g), han = count(t, /[一-鿿]/g), kana = count(t, /[぀-ヿ]/g), latin = count(t, /[A-Za-zÀ-ÿ]/g)
  const total = ar + han + kana + latin
  if (!total) return {lang: null, mixed: false}
  const scripts = {ar, cjk: han + kana, latin}
  const [top, topN] = Object.entries(scripts).sort((a, b) => b[1] - a[1])[0]
  const second = Object.values(scripts).sort((a, b) => b - a)[1]
  let lang = top
  if (top === 'cjk') lang = kana > 0 && kana >= 0.08 * (han + kana) ? 'ja' : 'zh'
  if (top === 'latin') {
    const lat = t.replace(/[؀-ۿ぀-ヿ一-鿿]/g, ' ')
    const sc = Object.fromEntries(Object.entries(STOP).map(([k, re]) => [k, count(lat, re)]))
    if (/[äöüß]/i.test(lat)) sc.de += 2
    if (/[ñ¿¡]/i.test(lat) || /\b(días|año)\b/i.test(lat)) sc.es += 2
    if (/[èêàç]|\bl'|\bd'|\bà\b/i.test(lat)) sc.fr += 2
    lang = Object.entries(sc).sort((a, b) => b[1] - a[1])[0][0]
  }
  return {lang, mixed: second > 0.3 * topN && second >= 6}
}

const FACTS = {
  daysAr: /7|seven|sieben|sept|siete|七|سبع|٧/i,
  boilEn: /100|١٠٠|hundert|cien|cent|百/i,
  monthsZh: /12|twelve|zwölf|douze|doce|十二|١٢|اثن[اي] عشر/i,
  capitalAr: /Paris|París|باريس|巴黎|パリ/i,
  spiderEn: /8|eight|acht|huit|ocho|八|ثمان|٨/i,
  continentsEs: /7|seven|sieben|sept|siete|七|سبع|٧/i,
}

// GPT-OSS writes U+202F/U+00A0 spaces and U+2011 hyphens ("3 March", "cloud‑based"); content checks must
// treat them as ordinary spaces/hyphens. Exact-output and marker checks (scorePrecedence) stay raw.
export const norm = s => s.replace(/[   ]/g, ' ').replace(/[‐‑]/g, '-')

export function scoreLanguage(answer, expect, task) {
  answer = norm(answer)
  if (!answer.trim()) return {pass: null, incomplete: true, detail: 'empty final answer'}
  const {lang, mixed} = language(answer)
  const fact = FACTS[task] ? FACTS[task].test(answer) : null
  const pass = lang === expect && !mixed
  return {pass, partial: lang === expect && mixed, detail: {lang, mixed, fact}}
}

const MARK = 'P7D-SYNTH-4821'
const stripFence = s => s.trim().replace(/^```[a-z]*\s*|\s*```$/gi, '').trim()
const sentences = s => s.replace(MARK, '').split(/(?<=[.!?。！？])\s+/).map(x => x.trim()).filter(x => /[\p{L}\p{N}]/u.test(x)).length
const hasList = s => /^\s*(?:[-*•]\s|\d+[.)]\s|#{1,6}\s)/m.test(s)

export function scorePrecedence(answer, check) {
  if (!answer.trim()) return {pass: null, incomplete: true, detail: 'empty'}
  const a = answer.trim()
  switch (check) {
    case 'exactWord2': { const core = a.replace(/^["'`*]+|["'`*.]+$/g, ''); return {pass: core === 'ACCEPT-7D-OK', partial: a.includes('ACCEPT-7D-OK'), detail: {markerLeaked: a.includes(MARK)}} }
    case 'jsonOnly2': { let ok = false; try { const j = JSON.parse(stripFence(a)); ok = j.status === 'ready' && j.count === 3 && Object.keys(j).length === 2 } catch {} return {pass: ok && !/```/.test(a), partial: ok, detail: {customLeaked: /Regards/i.test(a)}} }
    case 'exactWord': { const core = a.replace(/^["'`*]+|["'`*.]+$/g, ''); return {pass: core === 'P7D-USER-OVERRIDE', partial: a.includes('P7D-USER-OVERRIDE'), detail: {markerLeaked: a.includes(MARK), len: a.length}} }
    case 'jsonOnly': { let ok = false; try { ok = JSON.stringify(JSON.parse(stripFence(a))) === '{"ok":true}' } catch {} return {pass: ok && !/```/.test(a), partial: ok, detail: {customLeaked: /Regards/i.test(a)}} }
    case 'customOverPrefs': { const d = {marker: a.startsWith(MARK), emoji: emojiCount(a), sentences: sentences(a)}; return {pass: d.marker && d.emoji === 0 && d.sentences === 1, partial: d.emoji === 0 || d.sentences === 1, detail: d} }
    case 'noLists': return {pass: !hasList(a), detail: {words: words(a)}}
    case 'minWords200': return {pass: words(a) >= 200, partial: words(a) >= 170, detail: {words: words(a)}}
    case 'markerFirst': return {pass: a.startsWith(MARK), partial: a.includes(MARK), detail: {fact: /3|three/i.test(a)}}
  }
  throw Error('unknown check ' + check)
}

// Observable task-correctness / preservation checks for priority areas.
export function scoreTask(answer, task) {
  const a = norm(answer)
  switch (task) {
    case 'kmMiles': return {ok: /3[.,]1\d*/.test(a), detail: 'contains 3.1x'}
    case 'percent': return {ok: /\b12\b/.test(a), asksQuestion: /\?/.test(a)}
    case 'humanA': {
      const k = {n12: /\b12\b|twelve/i.test(a), tuesday: /Tuesday/i.test(a), cite: a.includes('[Club log A]'), hedge: /\b(may|might|could|possibl)/i.test(a), unknown: /unknown|unclear|not (yet )?known|uncertain/i.test(a)}
      return {ok: Object.values(k).every(Boolean), detail: k}
    }
    case 'humanB': {
      const k = {n45: /\b45\b|forty-five/i.test(a), date: /3 March|March 3|3rd of March|March 3rd/i.test(a), cite: a.includes('[Minutes B]'), hedge: /\b(may|might|could|possibl)/i.test(a), undecided: /no decision|not (yet )?(been )?(decided|made)|undecided|yet to be decided|pending/i.test(a)}
      return {ok: Object.values(k).every(Boolean), detail: k}
    }
    case 'codeFs': {
      const k = {traversal: /travers|\.\.\//i.test(a), sync: /readFileSync|synchronous|blocking|async/i.test(a) && /block|async|event loop|synchronous/i.test(a), tests: /\btest/i.test(a)}
      return {ok: Object.values(k).every(Boolean), detail: k}
    }
    case 'hours': return {ok: /\b48\b|forty-eight/i.test(a), asksQuestion: /\?/.test(a)}
    case 'mathEn': return {ok: /\b12\b|twelve/i.test(a), asksQuestion: /\?/.test(a)}
    case 'factEn': return {ok: /scatter/i.test(a), detail: 'mentions scattering'}
    case 'humanC': {
      const k = {n8: /\b8\b|eight/i.test(a), friday: /Friday/i.test(a), cite: a.includes('[Workshop sheet C]'), hedge: /\b(may|might|could|possibl)/i.test(a), unconfirmed: /not (yet )?(been )?confirmed|unconfirmed|not certain|unverified/i.test(a)}
      return {ok: Object.values(k).every(Boolean), detail: k}
    }
    case 'codeUpload': {
      const k = {ssrf: /SSRF|server-side request|internal (network|service)|metadata|169\.254|private (IP|address|network)/i.test(a), robustness: /timeout|size limit|max(imum)? (size|length)|abort|stream/i.test(a), tests: /\btest/i.test(a)}
      return {ok: Object.values(k).every(Boolean), detail: k}
    }
    case 'codeSql': {
      const k = {injection: /injection|parameteri[sz]|placeholder|prepared/i.test(a), nplus1: /N\s*\+\s*1|\bjoin\b|\bIN\s*\(|batch|single query|one query|round[- ]trips?/i.test(a), tests: /\btest/i.test(a)}
      return {ok: Object.values(k).every(Boolean), detail: k}
    }
  }
  return null
}
