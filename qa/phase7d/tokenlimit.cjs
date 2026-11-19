const BASE = process.env.P7D_OLLAMA ?? 'http://127.0.0.1:11434'
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(BASE)) throw Error('Nonlocal Ollama target denied')
// max_completion_tokens investigation. Read-only use of the installed Harness adapter (run with the
// Harness Electron binary and ELECTRON_RUN_AS_NODE=1). Nothing installed is modified; requests are loopback only.
// Part 1: direct Ollama field enforcement. Part 2: the installed pi-ai route with and without the
// supported route-level compat.maxTokensField override, capturing the actual outgoing body.
const fs = require('node:fs'), path = require('node:path')
const {pathToFileURL} = require('node:url')
// Installed Desktop Harness modules (read-only), e.g. <Harness install>/resources/app.asar/dsh/node_modules/
const MODULES = (process.env.P7D_HARNESS_MODULES ?? (() => { throw Error('Set P7D_HARNESS_MODULES to the installed Harness node_modules folder') })()).replace(/[\/]?$/, '/')
const OUT = path.join(__dirname, 'evidence', 'token-limit.json')
function resolve(spec) {
  const parts = spec.split('/'), n = spec.startsWith('@') ? 2 : 1, pkg = parts.slice(0, n).join('/'), rest = parts.slice(n).join('/')
  const dir = MODULES + pkg, man = JSON.parse(fs.readFileSync(dir + '/package.json')); let key = rest ? './' + rest : '.', value = man.exports?.[key]
  if (value === undefined && man.exports) for (const [k, v] of Object.entries(man.exports)) { if (k.includes('*') && key.startsWith(k.split('*')[0]) && key.endsWith(k.split('*')[1])) { const t = key.slice(k.split('*')[0].length, key.length - k.split('*')[1].length); value = JSON.parse(JSON.stringify(v).replaceAll('*', t)); break } }
  while (value && typeof value === 'object') value = value.import || value.default || value.node
  return dir + '/' + (value || man.module || man.main || 'index.js')
}
async function loadAdapter(route) {
  let source = fs.readFileSync(resolve('@deepseek-ai/dsh-llm-pi-ai'), 'utf8')
  source = source.replace(/from (["'])([^"']+)\1/g, (all, q, s) => s.startsWith('node:') ? all : 'from ' + JSON.stringify(pathToFileURL(resolve(s)).href))
  source += '\nexport {resolveProfiles};'
  const mod = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'))
  const profiles = mod.resolveProfiles({ollama: route})
  return new mod.PiAiAdapter({profiles: () => profiles, resolveApiKey: async () => 'synthetic-unused', auth: {credentials: {get: async () => undefined, set: async () => {}, delete: async () => {}}, authContext: {env: {}}}})
}
const PROMPT = 'Explain what a browser cache TTL is and when a small fictional website should use a short one. Keep it under 180 words.'
async function direct(model, body) {
  const res = await fetch(BASE + '/v1/chat/completions', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({model, messages: [{role: 'user', content: PROMPT}], stream: false, temperature: 0.4, seed: 101, ...body}), signal: AbortSignal.timeout(300000)})
  const j = await res.json()
  return {status: res.status, completion_tokens: j.usage?.completion_tokens, finish: j.choices?.[0]?.finish_reason, answerChars: (j.choices?.[0]?.message?.content || '').length}
}
async function native(model) {
  const res = await fetch(BASE + '/api/chat', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({model, messages: [{role: 'user', content: PROMPT}], stream: false, options: {temperature: 0.4, seed: 101, num_predict: 32}}), signal: AbortSignal.timeout(300000)})
  const j = await res.json()
  return {status: res.status, eval_count: j.eval_count, done_reason: j.done_reason}
}
async function viaAdapter(model, compat, maxTokens) {
  const realFetch = globalThis.fetch; let wire
  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.url
    if (!url.startsWith(BASE + '/')) throw Error('Nonlocal target denied')
    if (init?.body && url.includes('/chat/completions')) { const b = JSON.parse(init.body); wire = Object.fromEntries(Object.entries(b).filter(([k]) => k !== 'messages')); b.seed = 101; init = {...init, body: JSON.stringify(b)} }
    return realFetch(input, init)
  }
  try {
    const route = {api: 'openai-completions', baseURL: BASE + '/v1', models: [{id: model}], ...(compat ? {compat} : {})}
    const adapter = await loadAdapter(route)
    let finish, usage, text = ''
    for await (const c of adapter.stream({provider: 'ollama', model, messages: [{role: 'user', content: [{type: 'text', text: PROMPT}]}], temperature: 0.4, ...(maxTokens ? {maxTokens} : {}), signal: AbortSignal.timeout(300000)})) {
      if (c.type === 'text-delta') text += c.text
      if (c.type === 'finish') finish = c.reason
      if (c.type === 'usage') usage = c.usage
    }
    return {wire, finish, usage, answerChars: text.length}
  } catch (e) { return {wire, error: e.message} } finally { globalThis.fetch = realFetch }
}
;(async () => {
  const result = {date: new Date().toISOString(), ollamaVersion: await (await fetch(BASE + '/api/version')).json(), direct: [], native: [], adapter: [], defaults: {}}
  // Default request when the agent sets no maxTokens: what field/value does the route send?
  result.defaults.noAgentMaxTokens = await viaAdapter('llama3:latest', null, undefined)
  result.defaults.invalidCompatRejected = await loadAdapter({api: 'openai-completions', baseURL: BASE + '/v1', models: [{id: 'llama3:latest'}], compat: {maxTokensField: 'max_output'}}).then(() => false, e => e.message.slice(0, 200))
  for (const model of ['gpt-oss:20b', 'qwen3.5:4b', 'llama3:latest']) {
    for (const body of [{max_completion_tokens: 32}, {max_tokens: 32}, {max_completion_tokens: 32, max_tokens: 64}]) result.direct.push({model, body, ...(await direct(model, body))})
    result.native.push({model, num_predict: 32, ...(await native(model))})
    for (const compat of [null, {maxTokensField: 'max_tokens'}]) result.adapter.push({model, compat, maxTokens: 32, ...(await viaAdapter(model, compat, 32))})
  }
  // Realistic ceiling with override: reasoning models need room for thinking plus answer.
  for (const model of ['gpt-oss:20b', 'qwen3.5:4b']) result.adapter.push({model, compat: {maxTokensField: 'max_tokens'}, maxTokens: 2048, ...(await viaAdapter(model, {maxTokensField: 'max_tokens'}, 2048))})
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result, null, 1))
})().catch(e => { console.error(e.stack); process.exitCode = 1 })
