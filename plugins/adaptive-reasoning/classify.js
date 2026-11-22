// Deterministic local request classification. It reads one message's text in
// memory, keeps nothing, and makes no provider request.

export const TIERS = Object.freeze(['simple', 'standard', 'complex', 'advanced'])
const SIMPLE = 0
const STANDARD = 1
const COMPLEX = 2
const ADVANCED = 3

const greeting = /^(?:hi|hello|hey|thanks|thank you|thx|ok(?:ay)?|cool|great|nice|perfect|bye|good (?:morning|afternoon|evening|night))\b[\s!.,:)]*(?:\w+[\s!.,]*)?$/i
const continuation = /^(?:yes|yep|yeah|sure|go ahead|continue|proceed|do it|go on|keep going|carry on|next|sounds good|ok(?:ay)?[, ]+(?:go|do it|continue|proceed))\b[\s!.,]*$/i
const raise = /\b(?:think (?:hard|harder|carefully|deeply|step[- ]by[- ]step)|reason (?:carefully|step[- ]by[- ]step)|in[- ]depth|thoroughly|rigorous(?:ly)?|deep[- ]dive|exhaustive(?:ly)?|double[- ]check)\b/i
const lower = /\b(?:quick(?:ly)?|brief(?:ly)?|short answer|just (?:answer|tell me)|tl;?dr|no explanation|one[- ]word|in one (?:line|sentence))\b/i
const advanced = /\b(?:architect(?:ure|ural)?|system design|design (?:a|the) (?:system|service|platform|protocol)|trade-?offs?|scalab(?:le|ility)|distributed|consensus|race conditions?|deadlocks?|threat model|security (?:audit|review)|vulnerabilit(?:y|ies)|formal(?:ly)? (?:proof|verif(?:y|ied|ication))|prove (?:that|it)|proof|complexity analysis|migration (?:plan|strategy)|root[- ]cause|investigat(?:e|ion)|research)\b/i
const complex = /\b(?:debug(?:ging)?|bug|fix (?:this|it|that|the|my|a)|exception|crash(?:es|ing)?|failing|fails?|stack ?trace|traceback|refactor(?:ing)?|implement(?:ation)?|optimi[sz]e|performance|benchmark|algorithm|regex|regular expression|sql|query plan|analy[sz]e|analysis|compare|evaluate|plan (?:for|to|the)|derivative|integral|equation|probability|matrix|theorem|calculate|compute)\b/i
// Weak cues such as "what is" or "translate" are left out: alone they mark
// one-fact questions, and longer prompts already reach Standard by length.
const standard = /\b(?:explain|how (?:does|to|do (?:i|we|you)|can (?:i|we|you))|why (?:is|does|do)|write (?:a|an|the)|function|script|class|code|summari[sz]e|example|difference between)\b/i
const trace = /(?:^\s+at .+[(:]\d+(?::\d+)?\)?$|Traceback \(most recent call last\)|^\w*(?:Error|Exception): )/m
const fence = /```/g
const fenced = /```[\s\S]*?(?:```|$)/g
const numbered = /^\s*(?:\d+[.)]|[-*])\s+\S/gm
const math = /\d\s*[-+*/^=]\s*\d|[∑∫√≤≥≠]/

/**
 * Classify one request into a complexity tier.
 * @param {string} text - message text; it is never stored.
 * @param {{ attachments?: number, previous?: number }} [context] - attachment count and this session's previous tier.
 * @returns {{ tier: number, signals: string[] }} the tier index into {@link TIERS} and the signals that set it.
 */
export function classify(text, context = {}) {
  const source = typeof text === 'string' ? text.trim() : ''
  const signals = []
  const attachments = context.attachments ?? 0
  if (source.length === 0) {
    // An empty prompt retries or regenerates the previous request.
    const tier = Number.isInteger(context.previous) ? context.previous : STANDARD
    return { tier, signals: ['retry'] }
  }
  if (source.length <= 40 && continuation.test(source)) {
    const tier = Number.isInteger(context.previous) ? context.previous : STANDARD
    return { tier, signals: ['continuation'] }
  }
  if (source.length <= 48 && attachments === 0 && greeting.test(source)) return { tier: SIMPLE, signals: ['greeting'] }

  let tier = source.length < 80 ? SIMPLE : source.length < 600 ? STANDARD : source.length < 2400 ? COMPLEX : ADVANCED
  if (tier > SIMPLE) signals.push('length')
  const floor = (value, signal) => { if (value > tier) tier = value; signals.push(signal) }
  // Topic and intent cues are read from prose only, so words inside pasted
  // code or data (a `debug` flag, say) do not raise the tier.
  const prose = source.replace(fenced, ' ')
  if (advanced.test(prose)) floor(ADVANCED, 'advanced-topic')
  else if (complex.test(prose)) floor(COMPLEX, 'complex-topic')
  else if (standard.test(prose)) floor(STANDARD, 'standard-topic')
  const fences = (source.match(fence)?.length ?? 0) >> 1
  if (fences > 0) floor(Math.min(ADVANCED, STANDARD + (fences > 1 ? 1 : 0)), 'code')
  if (trace.test(source)) floor(COMPLEX, 'trace')
  if ((source.match(numbered)?.length ?? 0) >= 3) floor(COMPLEX, 'multi-step')
  if (math.test(source)) floor(STANDARD, 'math')
  if (attachments > 0) floor(STANDARD, 'attachment')
  if (raise.test(prose)) { tier = Math.min(ADVANCED, Math.max(tier + 1, COMPLEX)); signals.push('asked-deeper') }
  else if (lower.test(prose)) {
    // Output brevity should not downgrade complex analysis.
    if (tier < COMPLEX) tier = Math.max(SIMPLE, tier - 1)
    signals.push('asked-briefer')
  }
  return { tier, signals }
}

/**
 * Map a tier onto a validated, lowest-to-highest effort list. The adapter's
 * advertised array alone does not establish this ordering.
 * @param {number} tier - index into {@link TIERS}.
 * @param {readonly string[]} orderedEfforts - validated effort ids in ascending order.
 * @returns {string | undefined} a declared effort id, or undefined when the route declares none.
 */
export function effortForTier(tier, orderedEfforts) {
  if (!Array.isArray(orderedEfforts) || orderedEfforts.length === 0) return undefined
  const index = Math.round(tier * (orderedEfforts.length - 1) / ADVANCED)
  return orderedEfforts[Math.min(orderedEfforts.length - 1, Math.max(0, index))]
}

/**
 * Concatenate a message's text parts without retaining them.
 * @param {readonly { type: string, text?: string }[]} content - message content blocks.
 * @returns {{ text: string, attachments: number }}
 */
export function readContent(content) {
  let text = ''
  let attachments = 0
  for (const block of Array.isArray(content) ? content : []) {
    if (block?.type === 'text' && typeof block.text === 'string') text += (text ? '\n' : '') + block.text
    else if (block?.type === 'image' || block?.type === 'file') attachments++
  }
  return { text, attachments }
}
