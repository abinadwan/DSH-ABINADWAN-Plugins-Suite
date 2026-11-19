// Blinded local judge (gpt-oss:20b via loopback Ollama). Never sees the preference text or variant id.
// Run only after generation finishes (sequential GPU). Resumable: evidence/judgments.jsonl.
// Usage: node judge.mjs <stageA|stageB|stageC|context>
import {chatResilient as chat, store, sha, MODELS} from './lib.mjs'
import {stageA, stageB} from './cases.mjs'
import {outputs, SEEDS} from './jobs.mjs'

// The incumbent judge writes judgments.jsonl; any other judge (P7D_JUDGE) writes its own file so verdicts never mix.
export const JUDGE = process.env.P7D_JUDGE ?? 'gpt-oss:20b'
export const judgmentsFile = (judge = JUDGE) => judge === 'gpt-oss:20b' ? 'judgments.jsonl' : `judgments.${judge.replace(/[^a-z0-9.]+/gi, '_')}.jsonl`
export const DIMENSION = {
  'style.creative': 'original, non-obvious ideas that still fit the task (going beyond standard, generic advice)',
  'style.professional': 'polished, restrained, professional language',
  'style.friendly': 'a friendly, approachable and encouraging tone',
  'style.candid': 'a direct, candid bottom-line judgement stated early',
  'style.efficient': 'concision and directness (less preamble and filler, reaches the actionable answer faster)',
  'style.critical': 'critical evaluation of assumptions, evidence and tradeoffs',
  'style.technical': 'precise technical terminology and concrete implementation detail',
  'trait.warmth.2': 'warmth, empathy and reassurance', 'trait.warmth.0': 'a neutral, reserved tone with less reassurance or encouragement',
  'trait.enthusiasm.2': 'energy and enthusiasm', 'trait.enthusiasm.0': 'a calm, restrained tone with less excitement',
  'trait.detail.2': 'depth of detail and explanation', 'trait.detail.0': 'brevity while still answering the question',
  'trait.critical.2': 'active examination of assumptions and identification of meaningful risks',
  'trait.critical.0': 'focus on helping with the requested decision without unnecessary critique',
  'preset.critical': 'challenging weak assumptions instead of agreeing', 'preset.no-fluff': 'absence of filler, greetings and compliments (more direct)',
  'preset.evidence': 'clear separation of evidence, assumptions and uncertainty', 'preset.steps': 'a clear, actionable step-by-step breakdown',
  'preset.action': 'focus on practical, actionable next steps',
}

const ABS = {
  grill: 'Grade whether the response, before committing to a plan, asks the user at least one specific clarifying question about a material missing requirement (a real question to the user, not rhetorical), and whether it names at least one concrete risk. Also say whether it gives a full unconditional plan anyway. Reply only with JSON: {"asks":true|false,"risk":true|false,"unconditional_plan":true|false}',
  humanizer: 'The task asked to edit a text into natural prose while preserving its facts, citation and uncertainty. added_claims: the response adds facts, reasons, interpretations or details not in the original. changed_certainty: it makes an uncertain statement more certain or changes what is unknown/undecided. natural: it reads as natural prose. Reply only with JSON: {"added_claims":bool,"changed_certainty":bool,"natural":bool}',
}

const CODE = {
  codeFs: ['path traversal', 'blocking synchronous file I/O', 'resolve the path and verify it stays inside the base directory with a separator-aware or path.relative check (a bare string prefix check is not safe)'],
  codeSql: ['SQL injection', 'one query per row (N+1 queries)', 'parameterized queries / placeholders'],
  codeUpload: ['server-side request forgery (SSRF): fetching an untrusted URL can reach internal services or cloud metadata', 'no timeout or size limit on the outbound fetch (unbounded buffering)', 'allowlist schemes/hosts and block private, loopback and link-local addresses after DNS resolution'],
}
export const absPrompt = (area, task) => area !== 'code' ? ABS[area] :
  `Grade this code review. security: identifies the main security flaw correctly (${CODE[task][0]}). performance: identifies the main performance/robustness issue (${CODE[task][1]}). tests: mentions missing or needed tests. fix_safe: the proposed security fix is correct and safe (${CODE[task][2]}). false_claims: claims an issue the code does not have or misnames the main flaw. Reply only with JSON: {"security":bool,"performance":bool,"tests":bool,"fix_safe":bool,"false_claims":bool}`

const parse = s => { const m = s.match(/\{[\s\S]*\}/); try { return m ? JSON.parse(m[0]) : null } catch { return null } }

// Model outputs sometimes invent contact addresses (e.g. MX-record examples). They are fictional, but the
// privacy gate stays strict: addresses are masked before judging (no judged dimension depends on them).
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
export async function ask(prompt, judge = JUDGE) {
  prompt = prompt.replace(EMAIL, '[email address]')
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await chat({model: judge, system: 'You are a strict, impartial evaluator. Follow the output format exactly.', user: prompt, seed: 7 + attempt, temperature: 0, limitField: 'max_tokens', limit: 6000, extra: {reasoning_effort: 'low'}})
    const v = parse(r.answer)
    if (v) return {v, ms: r.ms}
  }
  return {v: null}
}

export function judgeJobs(stage, {cases = stage === 'stageA' ? stageA() : stageB(), out = outputs(cases), seeds = SEEDS, models = MODELS, planned: extraPlanned} = {}) {
  const jobs = []
  for (const model of models) for (const c of cases) for (const v of c.variants) for (const seed of seeds) {
    if (c.role === 'neutral') continue
    if (extraPlanned && !extraPlanned(model, c, seed)) continue
    const row = out(model, c.id, v, seed); if (!row || !row.answer?.trim()) continue
    const area = c.area
    if (area === 'grill' && !['percent', 'hours'].includes(c.task) || area === 'code' || area === 'humanizer') {
      jobs.push({kind: 'abs', area, key: 'abs|' + row.key, prompt: `${absPrompt(area, c.task)}\n\nTask given to the AI:\n${c.prompt}\n\nResponse:\n<<<\n${row.answer}\n>>>`})
    }
    const dimKey = area === 'creative' ? 'style.creative' : area === 'style' ? 'style.' + c.key : area === 'trait' ? `trait.${c.key}.${c.level}` : area === 'preset' ? 'preset.' + c.key : null
    if (!dimKey || !DIMENSION[dimKey] || c.task === 'kmMiles') continue
    const neutralId = area === 'creative' ? cases.find(x => x.area === 'creative' && x.role === 'neutral' && x.task === c.task)?.id : area === 'style' ? `style.default.${c.task}` : area === 'trait' ? `trait.${c.key}.1.${c.task}` : `preset.${c.key}.${c.task}.neutral`
    const nc = cases.find(x => x.id === neutralId); if (!nc) continue
    const base = out(model, neutralId, nc.variants[0], seed)
    if (!base || !base.answer?.trim() || base.key === row.key) continue
    const flip = parseInt(sha(row.key + base.key).slice(0, 2), 16) % 2 === 1
    const [A, B] = flip ? [base.answer, row.answer] : [row.answer, base.answer]
    jobs.push({kind: 'pair', key: 'pair|' + row.key + '|' + base.key, flip, prompt: `Two AI responses (A and B) answer the same task. Which response shows more ${DIMENSION[dimKey]}? Judge only that quality; ignore length unless it is the quality asked about. Reply only with JSON: {"more":"A"|"B"|"tie"}\n\nTask:\n${c.prompt}\n\nResponse A:\n<<<\n${A}\n>>>\n\nResponse B:\n<<<\n${B}\n>>>`})
  }
  // Neutral baselines for absolute areas (paired comparison).
  for (const model of models) for (const c of cases.filter(c => c.role === 'neutral' && ['grill', 'code', 'humanizer'].includes(c.area) && !['percent', 'hours'].includes(c.task))) for (const seed of seeds) {
    const row = out(model, c.id, c.variants[0], seed); if (!row || !row.answer?.trim()) continue
    jobs.push({kind: 'abs', area: c.area, key: 'abs|' + row.key, prompt: `${absPrompt(c.area, c.task)}\n\nTask given to the AI:\n${c.prompt}\n\nResponse:\n<<<\n${row.answer}\n>>>`})
  }
  return [...new Map(jobs.map(j => [j.key, j])).values()]
}

if (process.argv[1]?.endsWith('judge.mjs')) {
  const stage = process.argv[2]
  // Owner decision 2026-11-19: GPT-OSS 20B and Devstral must not judge any remaining Phase 7D work.
  if (['gpt-oss:20b', 'devstral:latest'].includes(JUDGE)) throw Error('set P7D_JUDGE to a qualified lightweight judge')
  const extra = ['stageC', 'context'].includes(stage) ? await (await import('./accept.mjs')).judgeInputs(stage) : {}
  const j = store(judgmentsFile()), jobs = judgeJobs(stage, extra).filter(x => !j.done.has(x.key))
  console.log(JSON.stringify({stage, judge: JUDGE, todo: jobs.length}))
  let i = 0
  for (const job of jobs) {
    const {v, ms} = await ask(job.prompt)
    j.append({key: job.key, judge: JUDGE, kind: job.kind, area: job.area, flip: job.flip, verdict: v, ms, error: v ? null : 'unparseable'})
    console.log(JSON.stringify({i: ++i, of: jobs.length, kind: job.kind, v, ms}))
  }
  console.log('JUDGE_COMPLETE ' + stage)
}
