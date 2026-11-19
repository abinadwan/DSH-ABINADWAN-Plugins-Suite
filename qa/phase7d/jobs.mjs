// Shared mapping between cases, variants and stored generations.
import {MODELS, sha, systemPrompt, render, store} from './lib.mjs'
import {VARIANTS} from './cases.mjs'

export const SEEDS = [101, 202]
export const bodyKey = (model, seed, system, user) => [model, seed, sha(JSON.stringify([system, user]))].join('|')

export function jobsFor(cases, models = MODELS, seeds = SEEDS) {
  const jobs = new Map()
  for (const model of models) for (const c of cases) for (const v of c.variants) for (const seed of seeds) {
    const section = render(c.prefs, VARIANTS[v])
    const system = systemPrompt(model, section)
    const key = bodyKey(model, seed, system, c.prompt)
    if (!jobs.has(key)) jobs.set(key, {key, model, seed, system, user: c.prompt, section, refs: []})
    jobs.get(key).refs.push(c.id + '@' + v)
  }
  return [...jobs.values()]
}

// Returns a lookup (model, caseId, variant, seed) -> generation row (or undefined).
export function outputs(cases) {
  const gen = store('generations.jsonl')
  const byKey = new Map(gen.rows.filter(r => !r.error || r.error === 'timeout').map(r => [r.key, r]))
  const index = new Map(cases.map(c => [c.id, c]))
  return (model, id, v, seed) => {
    const c = index.get(id); if (!c) throw Error('no case ' + id)
    return byKey.get(bodyKey(model, seed, systemPrompt(model, render(c.prefs, VARIANTS[v])), c.prompt))
  }
}
