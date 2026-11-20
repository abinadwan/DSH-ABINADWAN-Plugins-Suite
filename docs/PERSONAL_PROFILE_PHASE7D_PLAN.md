# Personal Profile Phase 7D — Response preferences reliability: plan and approval gate

Status: **Completed (2026-11-19).** Merged to main in [PR #23](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/pull/23), merge commit `31b071c`; CI passed on Windows/Linux Node 22/24. L2, S2, G3 and B1w ship in both renderers; C2 and U1 were not adopted. The `max_tokens` configuration (§4.4) remains a separate, unapplied proposal.

## 1. Corrections to the previous plan

| Previous statement | Correction |
|---|---|
| The explicit language wording "showed significant improvement". | Mixed evidence. In the investigation it improved several languages but regressed GPT-OSS English (1/2 → 0/2). Qwen Chinese got 1/2 plus a timeout. Qwen fell to 0/2 with the tool/context reconstruction. It is re-tested here as candidate L1 against a new candidate. |
| Candidates are defined in the candidates document. | Those "candidates" were the scoring rubrics copied verbatim, including fixture content (TTL, every-visitor, migration, campaign). They are withdrawn. See [candidates](PERSONAL_PROFILE_PHASE7D_CANDIDATES.md). |
| `max_completion_tokens` is "ignored by the model/host translation layer". | The plugin and Host deliver the field intact. The installed pi-ai adapter sends `max_completion_tokens` by default for an unrecognised OpenAI-compatible endpoint. Ollama 0.40.16's OpenAI-compatible route does not enforce it, but does enforce `max_tokens`. The adapter has a supported route-level `compat.maxTokensField` override (see §3). |
| No prompt expansion above 5 %; >90 % rubric pass for Creative and Grill-Me on all 7 models. | These thresholds were set before any data existed. They are replaced by measured character deltas and paired comparisons against current wording, with explicit regression checks. |
| Creative has no instruction. | Already corrected earlier: Creative has `Explore original ideas and imaginative approaches when relevant.` |

## 2. Execution status

| Step | Status |
|---|---|
| Takeover review: docs, report, evidence, worktree | Done. The worktree has no changes to recover. Prior evidence is internally consistent. |
| Harness wire equivalence and renderer parity | Done: 397/397 identical bodies; Host = Browser = harness. |
| Stage A (language, override, precedence, Creative, Grill-Me, Code Reviewer, Humanizer) × 7 models | Done, on an isolated 65536-context Ollama instance. The "outage" was an Ollama app context change to 262144. The 83 rows generated at 262144 are archived and regenerated, so every comparison uses one context. See [benchmark §1](PERSONAL_PROFILE_PHASE7D_BENCHMARK.md). |
| Stage B (all remaining styles, traits, presets) × 7 models | Done. |
| Round 2 for Grill-Me and Code (G3, G4, C2) | Done. G3 and C2 selected. |
| Reproducibility validation | Done. Exact text 6/30, language outcome 30/30. |
| Blinded judging plus manual spot-check | Done. 909 verdicts; manual agreement 28/32. |
| `compat.maxTokensField: "max_tokens"` live verification | Done. Enforced through the installed adapter; see [benchmark §4.5](PERSONAL_PROFILE_PHASE7D_BENCHMARK.md). |
| Acceptance: new held-out tasks, 75-tool realistic context | Done, limited by the owner decision of 2026-11-19: Qwen3.5:4b, llama3 and gemma4-local only; seed 303; 100 requests in total; all rows fully in VRAM. GPT-OSS 20B and Devstral are excluded. See [benchmark §4.6](PERSONAL_PROFILE_PHASE7D_BENCHMARK.md). |
| Lightweight judge | Done. gemma4-local 29/32 and Qwen3.5:4b 30/32 against the manual grades (GPT-OSS 28/32). gemma4-local was selected as the fastest qualifying judge (4.6 s median). |

## 3. `max_completion_tokens` (separate from Personal Profile)

Read-only trace of the installed Desktop runtime (0.2.2-rc.3):

1. `dsh-agent-loop` sends `maxTokens` only when an agent option sets it.
2. `dsh-llm-pi-ai` passes `options.maxTokens` to pi-ai. pi-ai `buildBaseOptions` falls back to the model's `maxTokens`. For a route model with no declared limit, that is `DEFAULT_MAX_TOKENS = 128000`, clamped to the declared context window minus the prompt and 4096.
3. pi-ai `openai-completions` writes `max_completion_tokens` unless `compat.maxTokensField === "max_tokens"`. Auto-detection selects `max_tokens` only for a fixed list of hosted providers; loopback Ollama is not on it.
4. `dsh-llm-pi-ai` marks `maxTokensField` as an offered compat field. The provider profile schema accepts `compat` on the route and per model.

Consequence: in normal Desktop use, the request asks for about 128k tokens, so the missing enforcement rarely matters. Any deliberately smaller cap is silently ignored by Ollama. Candidate fix (configuration only, needs owner approval; no Harness or dependency patch): add `compat: { maxTokensField: max_tokens }` to the `ollama` provider profile. Optionally declare realistic per-model `contextWindow`/`maxTokens`, leaving room for reasoning plus the answer. Live verification is done ([benchmark §4.5](PERSONAL_PROFILE_PHASE7D_BENCHMARK.md)): with the override the installed adapter sends `max_tokens` and Ollama stops at the cap.

## 4. Approval gate

**Owner decision (2026-11-19): apply L2, S2, G3 and B1w only.** C2 (Code Reviewer) and U1 (Humanizer) keep their current wording, because their gain was not reconfirmed on held-out tasks.

Applied (merged in PR #23):
- **Renderers.** `plugins/personal-profile/preferences.js` and the `client.js` mirror, changed identically.
- **Tests.** 4 tests added to `test/personal-profile-runtime.test.js`.
- **Unchanged:** installed settings, model files, the `max_tokens` configuration (§4.4) and consent behaviour.

**Verification:**
- **Benchmark match.** Production equals the benchmarked text for this subset in 768/768 catalog combinations (`winnerVariant(['L2','S2','G3','B1w'])`). Host = Browser in 768/768.
- **`npm test`:** 162/162 (158 existing + 4 new).
- **`npm run check:package`:** packed artifact verified, 36 files, 162/162. Run from PowerShell: under Git Bash, GNU `tar` reads `C:` as a remote host.
- **Pinned Host check** (`qa/profile-host-check.mjs`, real rc.3 Agent Loop with the offline adapter): 1/1. It ran in an isolated copy with the CI-pinned fixtures; the project's `node_modules` were not changed.
- **Size.** The worst-case section is 1330 characters (was 1165, +165).

The rest of this section is the proposal as presented at the gate.

### 4.1 Recommendation

Adopt the six selected lines as one wording change. Keep the precedence header, every other style, trait and preset, and all rendering logic as they are.

| Setting | Evidence for | Acceptance (held-out, 3 small models, 1 seed) | Recommendation |
|---|---|---|---|
| Language (L2) | Stage A/B 146/196 vs 77/196; held-out 77/98 vs 45/98; ≥ current on every model; override 69/70 = current | 7/10 vs 2/10. Earlier GPT-OSS rows 31/35 vs 12/35. Override 3/3 and 10/10 unchanged. Task fact 10/10. | **Adopt** |
| Creative (S2) | 24/28 vs 18/28 judged more original | 3/3 vs 2/3 | **Adopt** |
| Grill-Me (G3) | 25/28 vs 2/28; simple question still direct | 3/3 vs 1/3; "hours" still direct 3/3. 75 tools: 1/2 vs 0/2 | **Adopt** |
| Code Reviewer (C2) | 18/28 vs 7/28; tests 21/28 vs 8/28; GPT-OSS unaffected | 1/3 = 1/3 (judge). Deterministic 0/3 vs 1/3 (one Qwen review misnamed SSRF) | Proposed with caveat; **not adopted** by the owner |
| Humanizer (U1) | 18/28 vs 13/28; no model regresses | 0/3 = 0/3 (strict citation format). Judge "added claims" 1/3 vs 2/3 | Proposed with caveat; **not adopted** by the owner |
| Warmth — less (B1w) | 27/28 vs 21/28; exclamation marks 0 vs 17 | 3/3 = 3/3; no exclamations in either | **Adopt** (low risk, neutral at acceptance size) |

**No regression was found** in any of these:
- explicit language override;
- instruction precedence (marker first; exact token);
- task correctness and English with every changed line active at once;
- the simple-question check for Grill-Me;
- privacy.

The worst-case section, with every setting on and a Chinese target, grows from 1165 to **1428** characters (+263).

### 4.2 Exact changes (apply identically to both renderers)

Files:
- `plugins/personal-profile/preferences.js`
- the mirror in `client.js` (`PROFILE_STYLES` … `previewProfilePreferences`, indented 4 spaces).

`test/personal-profile-runtime.test.js` byte-compares the two, so both files must receive the same text. Only English instruction fields change. Arabic UI labels and descriptions stay as they are.

| Field | Current | New |
|---|---|---|
| `PROFILE_STYLES` creative, field 3 | `Explore original ideas and imaginative approaches when relevant.` | `Go beyond the obvious: include at least one fresh, unconventional idea suited to the task.` |
| `PROFILE_TRAITS` warmth, field 3 (less) | `Keep the tone neutral and reserved.` | `Keep the tone neutral and reserved, without reassurance or pep talk.` |
| `PROFILE_PRESETS` grill-me, field 4 | `For complex decisions, clarify material requirements and risks before proceeding.` | `Before recommending a decision or plan, ask the user 2-3 specific questions about missing requirements and name the key risks.` |
| `PROFILE_PRESETS` code, field 4 | `Assess code quality, security, performance, and test coverage when reviewing code.` | `When reviewing code, assess correctness, security, performance, and test coverage; name the missing tests and give a safe fix for each issue.` |
| `PROFILE_PRESETS` humanizer, field 4 | `Prefer natural writing and preserve facts, citations, and uncertainty when editing.` | `When editing text, write naturally but keep every fact, number, citation, and hedge exactly; add no new claims or details.` |

Language line in `previewProfilePreferences`. The native name comes from the catalog's own label (field 1 before ` — `) and is omitted when it equals the English name:

```js
// current
if(language?.[3]) lines.push('Prefer '+language[3]+' for responses unless the current task requests another language.')
// new
if(language?.[3]) {
  const native=language[1].split(' — ')[0]
  lines.push('Write your response in '+language[3]+(native===language[3]?'':' ('+native+')')+' even when the user writes in another language, unless the user explicitly asks for a different language.')
}
```

Rendered examples:
- `Write your response in Chinese (中文) even when the user writes in another language, unless the user explicitly asks for a different language.`
- English renders without the parenthesis.
- Automatic still injects nothing.

The harness uses a looser equality test: it also ignores letter case for Latin names. For the shipped catalog, that test and the code above give the same result for all 7 languages. The parity test plus the new tests below pin this.

### 4.3 Tests

Keep every existing test unchanged and passing, including:
- Host = Browser parity over the full catalog;
- custom text only with opt-in;
- the empty profile rendering `''`.

Add to `test/personal-profile-runtime.test.js`:
1. **Golden lines.** Each of the six new strings appears exactly once when its setting is on, and never when it is off.
2. **Language native names.** All 7 explicit languages render their line (zh, ja, ar and others with native names; en without a parenthesis). `auto` renders no language line.
3. **Unchanged surface.** The header and every other style, trait and preset line are byte-identical to before the change. This guards against accidental edits.
4. **Size budget.** The worst-case section (every style line, Chinese, all traits at their extreme, all presets) is ≤ 1428 characters.

Then run the full suite (`npm test`) and the Phase 7 packed-artifact checks.

### 4.4 Separate configuration proposal (needs its own approval): `max_tokens`

This is independent of the wording change. It is a configuration-only fix, with no code, Harness or dependency patch.

Add `compat: { maxTokensField: "max_tokens" }` to the `ollama` provider profile. With it, Ollama enforces caps the adapter sends today as the ignored `max_completion_tokens` (verified in [benchmark §4.5](PERSONAL_PROFILE_PHASE7D_BENCHMARK.md)).

Caveats:
- **No validation.** The adapter does not validate the value, so a typo silently restores the old behaviour.
- **Small caps.** A small cap can be used up entirely by reasoning on GPT-OSS and Qwen, which then return an empty answer.
- **Effect today.** Normal Desktop requests ask for about 128000 tokens, so the visible effect is limited to deliberately capped requests.

### 4.5 Remaining limitations (documented, not fixed by this change)

- **Language in the realistic 75-tool Harness context.** Qwen3.5:4b and gemma4-local still answer in the question's language (0/2 with either wording). L2 fixes direct prompts, not this case on small models. Larger models in that context were not re-tested after the owner decision.
- **Residual weaknesses from Stage A/B:**
  - JSON-only output 4/14;
  - custom guidance over saved preferences 6/14;
  - Devstral language 9/28;
  - gemma4-local English target with an Arabic question;
  - weak Critical, Critical-less, Detail-more and Action settings.

  These need model-side or format-specific work.
- **Reduced acceptance coverage.** One seed, three small models, critical cases only. GPT-OSS and Devstral were excluded, and Gemma4:12b and JOSIE were not run. The untested cells are listed in [benchmark §4.6](PERSONAL_PROFILE_PHASE7D_BENCHMARK.md). They are not claimed as passed.
- **Measurement limits:**
  - GPU decoding is not reproducible text-for-text; outcomes are stable.
  - The judges are slightly lenient. GPT-OSS agreed with the manual grades on 28/32, and gemma4-local, which judged acceptance, on 29/32.
  - Acceptance verdicts come from the same model family that generated the outputs; both arms share that bias.
  - Acceptance ran at 32768 context; Stage A/B ran at 65536.
- **Real Desktop runtime.** The Ollama app is set (by its owner) to 262144 context, which partially offloads Qwen to CPU and runs about 3× slower than the benchmark. This is left unchanged and is the owner's choice.

### 4.6 On approval

1. Apply §4.2 to both renderers and add the §4.3 tests.
2. Run the full suite and the parity and packed-artifact checks.
3. Commit on `fix/phase7d-response-reliability` only when instructed.
4. Treat §4.4 as a separate decision.
