// Local Ollama evaluation of canonical My Profile prompts. No tools are executed.
import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {appendFileSync, readFileSync, writeFileSync} from 'node:fs'
import {pathToFileURL} from 'node:url'
import {parseArgs} from 'node:util'
import * as current from '../plugins/personal-profile/preferences.js'
import {cases} from './profile-ollama-cases.mjs'

const endpoint = 'http://127.0.0.1:11434'
const models = ['gemma4-local:e4b', 'qwen3.5:4b']
const previous = '4b3f3c79446a038ae442d8ab3b582a2a28f864c2'
const source = 'plugins/personal-profile/preferences.js'
const sha256 = value => createHash('sha256').update(value).digest('hex')
const quietPlacementCases = new Set(['language-auto', 'language-es', 'language-override-de', 'language-override-ja',
  'style-efficient-ar', 'identity-who-am-i', 'custom-first', 'combined-language-override'])

export function assembleMessages(renderer, record, history, revision, previousContexts = []) {
  const preferences = renderer.responsePreferences(record)
  const context = [renderer.profileContext(record), renderer.responseReminder(record, revision)].filter(Boolean).join('\n\n')
    .replace(/<\/system-reminder\s*>/gi, tag => '<\\' + tag.slice(1))
  const messages = [
    {role: 'system', content: ['You are a helpful assistant.', preferences].filter(Boolean).join('\n\n')},
    ...history,
  ]
  const intro = previousContexts.length === 0
    ? 'The following information describes your current session:'
    : 'The following information describes your current session. It replaces earlier versions of this context, including any retained in conversation summaries.'
  const wrapped = '<system-reminder>\n' + intro + '\n\n' + context + '\n</system-reminder>'
  if (context && !previousContexts.at(-1)?.endsWith('\n\n' + context + '\n</system-reminder>')) {
    messages.push({role: 'user', content: wrapped})
  }
  return messages
}

export function parseReply(body) {
  if (body?.done !== true || !body.message || body.message.role && body.message.role !== 'assistant') {
    throw new Error('Ollama returned an incomplete or invalid completion')
  }
  const message = body.message
  return {
    answer: typeof message.content === 'string' ? message.content : '',
    thinking: typeof message.thinking === 'string' ? message.thinking : '',
    toolCalls: Array.isArray(message.tool_calls) ? message.tool_calls : [],
    doneReason: body.done_reason ?? null,
    usage: {
      inputTokens: body.prompt_eval_count ?? null,
      outputTokens: body.eval_count ?? null,
      cachedInputTokens: body.prompt_eval_cached_count ?? null,
    },
    providerMs: Number.isFinite(body.total_duration) ? body.total_duration / 1e6 : null,
    loadMs: Number.isFinite(body.load_duration) ? body.load_duration / 1e6 : null,
  }
}

export function parseOpenAiReply(body) {
  const choice = body?.choices?.[0]
  if (!choice?.finish_reason || !choice.message) throw new Error('Ollama returned an incomplete chat completion')
  const message = choice.message
  return parseReply({
    done: true, done_reason: choice.finish_reason,
    message: {...message, thinking: message.reasoning ?? message.reasoning_content},
    prompt_eval_count: body.usage?.prompt_tokens, eval_count: body.usage?.completion_tokens,
    prompt_eval_cached_count: body.usage?.prompt_tokens_details?.cached_tokens,
  })
}

function openAiMessage({tool_name, tool_calls, ...message}) {
  if (tool_name) return message
  if (!tool_calls) return message
  return {...message, tool_calls: tool_calls.map(call => ({
    ...call, type: 'function', function: {...call.function, arguments: JSON.stringify(call.function.arguments)},
  }))}
}

export function thinkingModes(metadata) {
  const values = metadata.thinking?.values
  if (Array.isArray(values)) {
    if (values.includes(true)) return values.includes(false) ? [false, true] : [true]
    const levels = values.filter(value => typeof value === 'string')
    if (levels.length) return [...new Set([levels[0], levels.includes(metadata.thinking.default)
      ? metadata.thinking.default : levels.at(-1)])]
    return [undefined]
  }
  return metadata.capabilities?.includes('thinking') ? [false, true] : [undefined]
}

// Unicode script counts for Arabic/Chinese/Japanese. For Latin languages use
// function-word signatures. Ambiguous and very short replies need human review.
const signatures = {
  en: /\b(the|and|you|your|is|are|of|to|with|for|that|this|can|from|when|how|as|it|by|will|in|or|also|what)\b/gi,
  es: /\b(el|la|los|las|una|para|por|con|que|del|sin|como|son|puede|qué|en)\b/gi,
  fr: /\b(le|les|une|des|pour|avec|dans|est|sont|vous|votre|comment|peut|cette|sur|lorsque|pas)\b/gi,
  de: /\b(der|die|das|den|ein|eine|und|ist|sind|mit|von|zum|oder|wird|für|kann|nicht|dem)\b/gi,
}
const signaturesByScript = {
  ar: /\p{Script=Arabic}/gu,
  latin: /\p{Script=Latin}/gu,
  han: /\p{Script=Han}/gu,
  kana: /[\p{Script=Hiragana}\p{Script=Katakana}]/gu,
}
const metaReferences = [
  /saved\s+(?:language|preferences?|settings)|(?:profile|language)\s+(?:settings|preferences?|instructions?)|your\s+(?:saved\s+)?(?:language\s+)?preferences?|\bsystem (?:instructions?|reminder)\b/iu,
  /إعدادات (?:ملفك|الملف الشخصي)|تفضيلات(?:ك| اللغة)|تعليمات النظام/u,
  /语言偏好|个人资料设置|系统(?:指令|要求)|プロフィール設定|システム(?:設定|指示)/u,
  /preferencias (?:guardadas|de idioma)|instrucciones? del sistema|préférences (?:enregistrées|linguistiques)|instructions? du système|Spracheinstellungen|Systemanweisung/iu,
]

function languageScores(answer) {
  const prose = answer.replace(/\x60[^\x60]*\x60|https?:\/\/\S+/gu, ' ')
  const scripts = Object.fromEntries(Object.entries(signaturesByScript)
    .map(([key, pattern]) => [key, (prose.match(pattern) ?? []).length]))
  const latin = Object.fromEntries(Object.entries(signatures)
    .map(([key, pattern]) => [key, (prose.match(pattern) ?? []).length]))
  const cjk = scripts.han + scripts.kana
  const letters = (prose.match(/\p{L}/gu) ?? []).length
  const ranked = Object.entries(latin).sort((a, b) => b[1] - a[1])
  let primary = null
  if (letters >= 6) {
    if (scripts.ar > letters / 2) primary = 'ar'
    else if (cjk > letters / 2) primary = scripts.kana >= 2 ? 'ja' : 'zh'
    else if (scripts.latin > letters / 2 && ranked[0][1] >= 2 && ranked[0][1] > ranked[1][1]) primary = ranked[0][0]
  }
  const dominant = primary === 'ar' ? scripts.ar : ['ja', 'zh'].includes(primary) ? cjk : scripts.latin
  const segments = prose.split(/[\n.!?。！？]+/u)
  const primaryScript = primary === 'ar' ? /\p{Script=Arabic}/u : ['ja', 'zh'].includes(primary)
    ? /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u : /\p{Script=Latin}/u
  const foreignSegment = segments.some(segment =>
    (segment.match(/\p{L}/gu) ?? []).length >= 3 && !primaryScript.test(segment))
  const mixedScript = primary !== null && (foreignSegment || letters - dominant >= 8 && dominant / letters < 0.94)
  const mixedLatin = primary !== null && Object.hasOwn(latin, primary) && segments
    .some(segment => Object.entries(signatures).some(([key, pattern]) =>
      key !== primary && (segment.match(pattern) ?? []).length >= 3 &&
      (segment.match(pattern) ?? []).length > (segment.match(signatures[primary]) ?? []).length + 1))
  return {primary, mixed: mixedScript || mixedLatin, scripts, latin}
}

export function assessAnswer(answer, expected = {}) {
  const language = languageScores(answer)
  const metrics = {
    characters: [...answer].length,
    words: [...new Intl.Segmenter(expected.language ?? 'en', {granularity: 'word'}).segment(answer)]
      .filter(segment => segment.isWordLike).length,
    headings: (answer.match(/^ {0,3}#{1,6}\s+\S/gm) ?? []).length,
    lists: (answer.match(/^ {0,3}(?:[-*+]\s|\d+[.)]\s)\S/gm) ?? []).length,
    tables: (answer.match(/^\s*\|(?:[^|\n]*\|){2,}\s*$/gm) ?? []).length,
    emoji: (answer.match(/\p{Extended_Pictographic}/gu) ?? []).length,
    questions: (answer.match(/[?؟]/gu) ?? []).length,
    metaReference: metaReferences.some(pattern => pattern.test(answer)),
  }
  const lower = answer.normalize('NFC').toLowerCase()
  const contains = term => {
    const normalized = term.normalize('NFC').toLowerCase()
    if (!/^[a-z]+$/u.test(normalized)) return lower.includes(normalized)
    return new RegExp('\\b' + normalized + '\\b', 'u').test(lower)
  }
  const checks = {
    answer: Boolean(answer.trim()),
    ...(expected.language && {language: !answer.trim() ? false : language.primary === null ? null
      : language.primary === expected.language && !language.mixed}),
    ...(expected.require && {required: expected.require.every(contains)}),
    ...(expected.any && {requiredAny: expected.any.some(contains)}),
    ...(expected.forbid && {prohibited: expected.forbid.every(term => !contains(term))}),
    ...(expected.exact && {format: answer.trim() === expected.exact}),
    ...(expected.maxWords && {length: metrics.words <= expected.maxWords}),
    ...(expected.maxQuestions !== undefined && {questions: metrics.questions <= expected.maxQuestions}),
    ...(expected.quiet && {silent: !metrics.metaReference}),
  }
  return {checks, metrics, language}
}

const boundedInt = (value, name, min, max) => {
  const number = Number(value)
  if (!/^\d+$/u.test(value) || !Number.isSafeInteger(number) || number < min || number > max) {
    throw new Error('--' + name + ' must be an integer from ' + min + ' to ' + max)
  }
  return number
}

async function ollama(path, body, timeoutMs = 10000) {
  const response = await fetch(endpoint + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {'Content-Type': 'application/json'},
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
    redirect: 'error',
  })
  const result = await response.json()
  if (!response.ok) throw new Error('HTTP ' + response.status + ' ' + String(result.error ?? '').slice(0, 400))
  return result
}

async function loadRenderer(revision) {
  const [baseRevision, experiment, ...extra] = revision.split('+')
  if (extra.length) throw new Error('Select at most one renderer experiment')
  const silentGuidance = 'Apply these preferences silently. Do not mention or explain them unless the user asks.'
  if (experiment === 'quiet-system-only' || experiment === 'quiet-reminder-only') {
    const base = await loadRenderer(baseRevision)
    const section = experiment === 'quiet-system-only' ? 'responseReminder' : 'responsePreferences'
    const lead = section === 'responseReminder' ? '\n' : ' '
    const render = (...args) => base.renderer[section](...args).replace(lead + silentGuidance, '')
    return {...base, renderer: {...base.renderer, [section]: render}, experiment}
  }
  if (experiment === 'identity-subject') {
    const base = await loadRenderer(baseRevision)
    const profileContext = record => base.renderer.profileContext(record)
      .replace('These personal details replace earlier My Profile context; do not infer omitted details.', 'These are details about the human user, not the assistant. They replace earlier My Profile context. When asked about the user, report only currently known details; omitted details are unknown.')
    return {...base, renderer: {...base.renderer, profileContext}, transformSha256: sha256(profileContext.toString())}
  }
  if (experiment === 'auto-language') {
    const base = await loadRenderer(baseRevision)
    const responseReminder = (record, id) => {
      const text = base.renderer.responseReminder(record, id)
      if (!text || record?.preferences?.responseLanguage !== 'auto') return text
      return text + '\nNo saved response language is selected. Use the language of the current user request unless it explicitly requests another output language.'
    }
    return {...base, renderer: {...base.renderer, responseReminder}, transformSha256: sha256(responseReminder.toString())}
  }
  if (experiment === 'explicit-precedence') {
    const base = await loadRenderer(baseRevision)
    const responseReminder = (record, id) => base.renderer.responseReminder(record, id)
      .replace(/^Write your entire response in .+\.$/m, instruction =>
        'If the current user asks for a different output language, use that language for the entire response. ' +
        'The following default applies only when the user does not request an output language.\n' + instruction)
    return {...base, renderer: {...base.renderer, responseReminder}, transformSha256: sha256(responseReminder.toString())}
  }
  if (revision === 'worktree') {
    const worktree = readFileSync(new URL('../' + source, import.meta.url))
    return {renderer: current, sourceSha256: sha256(worktree)}
  }
  if (!/^[0-9a-f]{7,40}$/u.test(revision)) throw new Error('Use worktree or a Git commit SHA for a renderer')
  const code = execFileSync('git', ['show', revision + ':' + source], {
    cwd: new URL('../', import.meta.url), encoding: 'utf8', timeout: 10000,
  })
  return {renderer: await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64')),
    sourceSha256: sha256(code)}
}

async function runCase({scenario, variant, renderer, model, think, seed, timeoutMs, api, predict}) {
  const history = []
  const contexts = []
  const options = {temperature: 0, seed, num_ctx: 4096, num_predict: predict}
  const rows = []
  for (const [index, turn] of scenario.turns.entries()) {
    if (turn.prompt !== null) history.push({role: 'user', content: turn.prompt})
    const messages = scenario.system
      ? [{role: 'system', content: scenario.system}, ...history]
      : assembleMessages(renderer, turn.record, history, 'fixture-' + (index + 1), contexts)
    const context = messages.length === history.length + 2 ? messages.at(-1) : null
    if (context) contexts.push(context.content)
    const native = api === 'native'
    const reasoning = think === true ? 'medium' : think === false ? 'none' : think
    const body = native ? {model, messages, stream: false, keep_alive: '1m', options,
      ...(think !== undefined && {think}), ...(scenario.tools && {tools: scenario.tools})}
      : {model, messages: messages.map(openAiMessage), stream: false, temperature: options.temperature,
        seed, max_tokens: options.num_predict, ...(reasoning !== undefined && {reasoning_effort: reasoning}),
        ...(scenario.tools && {tools: scenario.tools})}
    const started = performance.now()
    const row = {type: 'turn', id: scenario.id, group: scenario.group, heldOut: Boolean(scenario.heldOut),
      turn: index + 1, variant, model, thinkSent: body.think ?? null,
      reasoningEffortSent: body.reasoning_effort ?? null,
      options: native ? options : {temperature: body.temperature, seed, max_tokens: body.max_tokens},
      messageCount: messages.length,
      inputBytes: Buffer.byteLength(JSON.stringify(body.messages)), expected: turn.expected ?? {},
      toolsSent: (scenario.tools ?? []).map(tool => tool.function.name), rubric: scenario.rubric ?? null}
    if (row.inputBytes > 48_000) throw new Error('Fixture exceeds the input budget: ' + scenario.id)
    try {
      const payload = await ollama(native ? '/api/chat' : '/v1/chat/completions', body, timeoutMs)
      const reply = native ? parseReply(payload) : parseOpenAiReply(payload)
      Object.assign(row, reply, {evaluation: assessAnswer(reply.answer, row.expected)})
    } catch (error) {
      row.error = {name: error.name, message: error.message, cause: error.cause?.code ?? null}
    }
    row.latencyMs = Math.round(performance.now() - started)
    rows.push(row)
    if (context) history.push(context)
    // Fixed, explicitly synthetic history keeps each variant's next request matched.
    if (turn.history) history.push(...turn.history)
  }
  return rows
}

async function main() {
  const {values} = parseArgs({options: {
    suite: {type: 'string', default: 'smoke'},
    api: {type: 'string', default: 'native'},
    models: {type: 'string', default: models.join(',')},
    variants: {type: 'string'},
    mode: {type: 'string', default: 'both'},
    trials: {type: 'string', default: '1'},
    timeout: {type: 'string', default: '60000'},
    predict: {type: 'string', default: '512'},
    filter: {type: 'string'},
    out: {type: 'string'},
  }})
  const selected = cases.filter(scenario =>
    (values.suite === 'full' && scenario.group !== 'direct' && !scenario.contextOnly ||
      values.suite === 'quiet-placement' && quietPlacementCases.has(scenario.id) || scenario.suites.includes(values.suite))
    && (!values.filter || scenario.id.startsWith(values.filter)))
  if (!selected.length) throw new Error('No cases selected. Available suites: smoke, full, silent, quiet-placement, precedence, direct, identity-context, auto-context')
  if (!['native', 'openai'].includes(values.api)) throw new Error('Invalid --api')
  if (!['both', 'first', 'last', 'default'].includes(values.mode)) throw new Error('Invalid --mode')
  const trials = boundedInt(values.trials, 'trials', 1, 5)
  const timeoutMs = boundedInt(values.timeout, 'timeout', 1000, 180000)
  const predict = boundedInt(values.predict, 'predict', 32, 2048)
  const variants = (values.variants ?? (['smoke', 'silent'].includes(values.suite)
    ? previous + ',worktree' : 'worktree')).split(',')
  const renderers = await Promise.all(variants.map(loadRenderer))
  const available = await ollama('/api/tags')
  const selectedModels = values.models.split(',')
  const entries = selectedModels.map(model => {
    const entry = available.models?.find(item => item.name === model)
    if (!entry || /(?:-cloud|:cloud)$/iu.test(model) || !entry.size || entry.remote_model || entry.remote_host) {
      throw new Error('Requested local model is unavailable: ' + model)
    }
    return entry
  })
  const version = await ollama('/api/version')
  const header = {type: 'run', method: 'Ollama ' + values.api + ' API simulation', version: version.version,
    suite: values.suite, variants, trials, timeoutMs, predict, mode: values.mode, count: selected.length,
    rendererInputs: renderers.map(({renderer, ...fingerprint}, index) => ({variant: variants[index], ...fingerprint})),
    runnerSha256: sha256(readFileSync(new URL(import.meta.url))),
    casesSha256: sha256(readFileSync(new URL('./profile-ollama-cases.mjs', import.meta.url))),
    head: execFileSync('git', ['rev-parse', 'HEAD'], {cwd: new URL('../', import.meta.url), encoding: 'utf8'}).trim(),
    models: entries.map(({name, digest}) => ({name, digest})), started: new Date().toISOString()}
  if (values.out) writeFileSync(values.out, '', {flag: 'wx'})
  const emit = row => {
    const line = JSON.stringify(row) + '\n'
    if (values.out) appendFileSync(values.out, line)
    else process.stdout.write(line)
  }
  emit(header)
  const summary = {type: 'summary', turns: 0, errors: 0, empty: 0, noFinalText: 0,
    reasoningOnly: 0, toolWithoutFinalText: 0, limited: 0, toolCalls: 0}
  for (const model of selectedModels) {
    const metadata = await ollama('/api/show', {model})
    const supported = thinkingModes(metadata)
    const modes = values.mode === 'default' ? [undefined]
      : values.mode === 'first' ? supported.slice(0, 1) : values.mode === 'last' ? supported.slice(-1) : supported
    emit({type: 'model', model, capabilities: metadata.capabilities ?? [], thinking: metadata.thinking ?? null,
      modes: modes.map(mode => mode ?? null)})
    for (const think of modes) {
      for (let trial = 0; trial < trials; trial++) {
        const seed = 42 + trial
        for (const scenario of selected) {
          // Alternate variant order to spread cache/load effects across paired cases.
          for (let offset = 0; offset < variants.length; offset++) {
            const index = (offset + trial + selected.indexOf(scenario)) % variants.length
            const rows = await runCase({scenario, variant: variants[index], renderer: renderers[index].renderer, model,
              think, seed, timeoutMs, api: values.api, predict})
            for (const row of rows) {
              summary.turns++
              if (row.error) summary.errors++
              else if (!row.answer.trim()) {
                summary.noFinalText++
                if (row.toolCalls.length) summary.toolWithoutFinalText++
                else if (row.thinking.trim()) summary.reasoningOnly++
                else summary.empty++
              }
              if (row.doneReason === 'length') summary.limited++
              if (row.toolCalls?.length) summary.toolCalls++
              emit(row)
            }
          }
        }
      }
    }
    if (model !== selectedModels.at(-1)) await ollama('/api/generate', {model, keep_alive: 0})
  }
  emit(summary)
  if (values.out) process.stderr.write(JSON.stringify(summary) + '\n')
  if (summary.errors > 0) process.exitCode = 1
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch(error => {
    process.stderr.write(error.message + '\n')
    process.exitCode = 1
  })
}
