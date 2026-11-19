// Phase 7D isolated benchmark library. Not runtime source; never imported by the suite.
// Reproduces the installed Harness pi-ai -> Ollama wire body (model, messages, stream, stream_options,
// store, max_completion_tokens, temperature, seed) and renders candidate instruction sets in memory.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import crypto from 'node:crypto'
import {fileURLToPath, pathToFileURL} from 'node:url'

export const HERE = path.dirname(fileURLToPath(import.meta.url))
export const REPO = path.resolve(HERE, '../..')
export const EVIDENCE = path.join(HERE, 'evidence')
// Local inputs are never committed: the prior Phase 7D run folder (matrix.json, results.jsonl, stress-requests.jsonl).
export function priorDir() {
  const d = process.env.P7D_PRIOR_DIR
  if (!d) throw Error('Set P7D_PRIOR_DIR to the prior Phase 7D run folder')
  return d.replace(/[\/]?$/, '/')
}
fs.mkdirSync(EVIDENCE, {recursive: true})
// Benchmark target. Default is the installed Ollama app; P7D_OLLAMA selects the isolated 65536-context
// instance (same binary/models/settings, OLLAMA_CONTEXT_LENGTH=65536) used after the 2026-11-18 23:42 change.
export const OLLAMA = process.env.P7D_OLLAMA ?? 'http://127.0.0.1:11434'
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(OLLAMA)) throw Error('Nonlocal Ollama target denied')
// Runtime context/VRAM of a loaded model, from /api/ps (recorded with every generation).
export async function runtime(model, base = OLLAMA) {
  try {
    const ps = await (await fetch(base + '/api/ps', {signal: AbortSignal.timeout(5000)})).json()
    const m = ps.models?.find(x => x.name === model || x.model === model)
    return m ? {ctx: m.context_length ?? null, size: m.size, vram: m.size_vram} : null
  } catch { return null }
}
export const MODELS = ['gpt-oss:20b', 'qwen3.5:4b', 'llama3:latest', 'devstral:latest',
  'goekdenizguelmez/JOSIE-2:9b', 'gemma4:12b', 'gemma4-local:e4b']
export const sha = x => crypto.createHash('sha256').update(x).digest('hex')

// Browser catalog (client.js mirror) loaded exactly as shipped.
const browserSource = fs.readFileSync(path.join(REPO, 'client.js'), 'utf8')
const start = browserSource.indexOf('const PROFILE_STYLES ='), end = browserSource.indexOf('const PROFILE_NS =', start)
export const catalog = vm.runInNewContext('(function(){' + browserSource.slice(start, end) +
  ';return {styles:PROFILE_STYLES,languages:PROFILE_LANGUAGES,traits:PROFILE_TRAITS,presets:PROFILE_PRESETS,neutral:neutralProfilePreferences,preview:previewProfilePreferences};})()')
export const host = await import(pathToFileURL(path.join(REPO, 'plugins/personal-profile/preferences.js')).href)
export const neutral = () => JSON.parse(JSON.stringify(catalog.neutral()))

export const CURRENT = {
  header: 'Response preferences (follow the current request and higher-priority host/safety/tool requirements; custom guidance takes precedence over other style preferences where compatible).',
  language: name => 'Prefer ' + name + ' for responses unless the current task requests another language.',
  // Frozen pre-7D production text for the lines Phase 7D changed, so the control stays the benchmarked baseline
  // after the change ships. Every other line still comes from the shipped catalog.
  styles: {creative: 'Explore original ideas and imaginative approaches when relevant.'},
  traits: {'warmth.0': 'Keep the tone neutral and reserved.'},
  presets: {'grill-me': 'For complex decisions, clarify material requirements and risks before proceeding.'},
}
// The wording shipped by Phase 7D (L2, S2, G3, B1w). Parity asserts that production renders exactly this.
export const SHIPPED = {...CURRENT,
  language: (name, l) => { const native = l[1].split(' — ')[0]; return 'Write your response in ' + name + (native === name ? '' : ' (' + native + ')') + ' even when the user writes in another language, unless the user explicitly asks for a different language.' },
  styles: {creative: 'Go beyond the obvious: include at least one fresh, unconventional idea suited to the task.'},
  traits: {'warmth.0': 'Keep the tone neutral and reserved, without reassurance or pep talk.'},
  presets: {'grill-me': 'Before recommending a decision or plan, ask the user 2-3 specific questions about missing requirements and name the key risks.'},
}

// Same algorithm as previewProfilePreferences with overridable text. Parity with production is
// asserted by parity() before any inference; candidate text is applied only in memory here.
export function render(pref, v = CURRENT) {
  const lines = []
  const style = catalog.styles.find(i => i[0] === pref.style)
  const language = catalog.languages.find(i => i[0] === pref.responseLanguage)
  const styleText = v.styles?.[pref.style] ?? CURRENT.styles[pref.style] ?? style?.[3]
  if (styleText) lines.push(styleText)
  if (language?.[3]) lines.push((v.language ?? CURRENT.language)(language[3], language))
  for (const [key,,, less, more] of catalog.traits) {
    if (pref.traits[key] === 0) lines.push(v.traits?.[key + '.0'] ?? CURRENT.traits[key + '.0'] ?? less)
    if (pref.traits[key] === 2) lines.push(v.traits?.[key + '.2'] ?? CURRENT.traits[key + '.2'] ?? more)
  }
  for (const [key,,,, instruction] of catalog.presets) {
    if (pref.presets.includes(key)) lines.push(v.presets?.[key] ?? CURRENT.presets[key] ?? instruction)
  }
  if (pref.sendCustom === true && pref.custom.trim()) lines.push(pref.custom)
  return lines.length ? [v.header ?? CURRENT.header, ...new Set(lines)].join('\n') : ''
}

export function parity(prefsList) {
  const out = []
  for (const p of prefsList) {
    const h = host.responsePreferences({version: 2, preferences: p}), b = catalog.preview(p), r = render(p, SHIPPED)
    out.push({hostEqBrowser: h === b, harnessEqHost: r === h})
  }
  return out
}

export const systemPrompt = (model, section) =>
  ['You are an AI agent powered by DeepSeek Harness.', 'You are a coding agent powered by the ' + model + ' model.', section].filter(Boolean).join('\n\n')

const PRIVACY = /(?:\b[A-Z]:[\\/](?!Synthetic)|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|sk-[a-z0-9]{16})/i

export async function chat({base = OLLAMA, model, system, user, rawMessages, seed, temperature = 0.4, limitField = 'max_completion_tokens', limit = 2048, timeoutMs = 180000, extra = {}}) {
  const messages = rawMessages ?? [...(system ? [{role: 'system', content: system}] : []), {role: 'user', content: user}]
  const body = {model, messages, stream: true, stream_options: {include_usage: true}, store: false, [limitField]: limit, temperature, seed, ...extra}
  const serialized = JSON.stringify(body)
  // Test the decoded strings, not the JSON: serialization turns "Response:" + newline into `e:\n`,
  // which looks like a drive path.
  const strings = [], walk = x => typeof x === 'string' ? strings.push(x) : x && typeof x === 'object' && Object.values(x).forEach(walk)
  walk(body)
  if (strings.some(s => PRIVACY.test(s))) throw Error('Synthetic privacy gate failed')
  const t0 = Date.now()
  let answer = '', reasoningChars = 0, finish = null, usage = null, toolCalls = 0, error = null
  try {
    const res = await fetch(base + '/v1/chat/completions', {method: 'POST', headers: {'content-type': 'application/json'}, body: serialized, signal: AbortSignal.timeout(timeoutMs)})
    if (!res.ok) throw Error('HTTP ' + res.status + ' ' + (await res.text()).slice(0, 200))
    const dec = new TextDecoder(); let buf = ''
    for await (const chunk of res.body) {
      buf += dec.decode(chunk, {stream: true})
      let i
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1)
        if (!line.startsWith('data:')) continue
        const data = line.slice(5).trim(); if (data === '[DONE]') continue
        const j = JSON.parse(data)
        if (j.usage) usage = j.usage
        for (const c of j.choices || []) {
          if (c.delta?.content) answer += c.delta.content
          if (c.delta?.reasoning) reasoningChars += c.delta.reasoning.length
          if (c.delta?.reasoning_content) reasoningChars += c.delta.reasoning_content.length
          if (c.delta?.tool_calls) toolCalls++
          if (c.finish_reason) finish = c.finish_reason
        }
      }
    }
  } catch (e) { error = e.name === 'TimeoutError' ? 'timeout' : e.message }
  const ms = Date.now() - t0
  return {answer, reasoningChars, finish, usage, toolCalls, error, ms, bodyHash: sha(serialized), runtime: await runtime(model, base), target: base}
}

// Transport failures (Ollama runner crash, server restart) are not model outcomes: wait until the
// server answers again, then retry the same request. A timeout is final and is returned as-is.
export async function chatResilient(args, {retries = 3, maxWaitMs = 15 * 60000} = {}) {
  let r, attempts = 0
  for (;;) {
    r = await chat(args); attempts++
    if (!r.error || r.error === 'timeout' || attempts > retries) return {...r, attempts}
    console.error(JSON.stringify({transport: r.error.slice(0, 120), model: args.model, attempts}))
    const until = Date.now() + maxWaitMs
    for (;;) {
      await new Promise(res => setTimeout(res, 15000))
      try { if ((await fetch((args.base ?? OLLAMA) + '/api/version', {signal: AbortSignal.timeout(5000)})).ok) break } catch {}
      if (Date.now() > until) throw Error('Ollama unavailable for ' + maxWaitMs / 60000 + ' min; stopping (resumable)')
    }
  }
}

// Resumable JSONL checkpoint store.
export function store(file) {
  const p = path.join(EVIDENCE, file)
  const rows = fs.existsSync(p) ? fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map(JSON.parse) : []
  // A timeout is a final (incomplete) outcome and is never rerun until it passes; transport errors are retried.
  const final = r => !r.error || r.error === 'timeout'
  const done = new Set(rows.filter(final).map(r => r.key))
  return {rows, done, append(row) { fs.appendFileSync(p, JSON.stringify(row) + '\n'); rows.push(row); if (final(row)) done.add(row.key) }}
}

export const words = s => (s.trim().match(/\S+/g) || []).length
export const emojiCount = s => [...new Intl.Segmenter('en', {granularity: 'grapheme'}).segment(s)].filter(g => /\p{Extended_Pictographic}/u.test(g.segment)).length
