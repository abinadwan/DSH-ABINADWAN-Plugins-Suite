# Phase 7D — Benchmark method and results

Status: **Stage A/B, validation, judging, the judge audit and the token-limit check are complete. Held-out acceptance is running.** Nothing here changes production runtime source.

## 1. Harness

`qa/phase7d/` (QA only; not packaged, not imported by the suite):

| File | Role |
|---|---|
| `lib.mjs` | Loads the shipped Browser catalog from `client.js` and the Host renderer from `preferences.js`. Renders candidates in memory. Sends loopback-only Ollama requests with a synthetic privacy gate. |
| `cases.mjs` | Candidate variants and cases: prior fixtures plus held-out tasks. |
| `run.mjs` | Sequential, resumable generation (`import`, `stageA`, `stageB`, `validate`). |
| `score.mjs` | Deterministic scorers: script/stop-word language detection, exact-output and marker checks, emoji/list/word counts, fact-preservation checks. |
| `judge.mjs` | Blinded local judge (temperature 0, low reasoning): `gpt-oss:20b` for Stage A/B, `gemma4-local:e4b` for acceptance (`P7D_JUDGE`; separate verdict file; GPT-OSS/Devstral refused). It never sees preference text or variant ids. A/B order is randomized by hash. |
| `report.mjs` | Aggregation into `evidence/summary.json` and `evidence/tables.md`. |
| `tokenlimit.cjs` | `max_completion_tokens` investigation (read-only use of the installed adapter). |
| `accept.mjs`, `accreport.mjs` | Acceptance: current (C) vs combined winners (W) on held-out tasks plus the 75-tool realistic context, limited by the owner decision to 3 small models, seed 303 and 100 requests (`planned()`). Aggregation into `evidence/acceptance.md`; untested cells print "not run". |
| `judgeeval.mjs` | Qualification of lightweight judges against the 32 manual grades (`evidence/judge-eval.json`). |
| `spotcheck.mjs`, `subscores.mjs` | Blinded manual audit of the judge, and a per-criterion breakdown of judge verdicts. |
| `perf.mjs` | Context-size comparison (65536 vs 262144). |

**Committed vs local.**
- **Committed:** the scripts above and the aggregate evidence (`acceptance.*`, `summary.json`, `tables.md`, `judge-eval.json`, `spotcheck-agreement.json`, `spotcheck-key.json`, `spotcheck-manual.json`, `token-limit.json`, `context-perf.json`). None of these contains model output text or local paths.
- **Kept locally only, ignored by git:**
  - raw generation, validation, context and judgment stores (`*.jsonl`);
  - run logs;
  - backups;
  - the spot-check sheet with raw outputs;
  - the one-off maintenance scripts `ctxsplit.mjs` and `hashcheck.mjs`.
- **Local inputs:** `P7D_PRIOR_DIR` points to the prior run folder, and `P7D_HARNESS_MODULES` to the installed Harness `node_modules` (read-only). `P7D_OLLAMA` selects the loopback server.
- **Baseline after shipping.** The control (`CURRENT` in `lib.mjs`) freezes the pre-7D text of the four changed lines, so re-running the harness after the change still compares against the benchmarked baseline. Renderer parity now asserts production = `SHIPPED` (L2, S2, G3, B1w). With the local stores present, `accreport.mjs` reproduces `acceptance.md` byte-for-byte, and `report.mjs` reproduces every Stage A/B table. Only the store-size count line differs, because acceptance rows were appended after Stage A/B.

**Wire equivalence.** The harness sends the same body the installed Harness pi-ai adapter sends to Ollama: `model, messages, stream, stream_options, store, max_completion_tokens: 2048, temperature: 0.4, seed`. The system prompt is the same synthetic two-line identity plus the generated section. All **397/397** comparable prior request bodies (`requests.jsonl`) are byte-identical to what the harness produces for the same case.

**Renderer parity.** Before any inference, the harness asserts Host renderer = Browser renderer = harness renderer for every case it is about to run (73/73 prior fixtures plus every new case).

**Recovered prior work.** 389 prior primary outputs whose bodies are byte-identical were imported as samples of the same condition (`source: prior-7d`). Prior candidate-language rows were not imported, because the wording differs. The extra worktree `.agents/worktrees/fix-phase7d-response-reliability` was inspected: it sits at the baseline commit with no changes, stashes, untracked or ignored files, so there was nothing to recover. Prior result integrity: 448 rows = 424 scored slots + 24 excluded tooling errors; 2 Qwen timeouts. This matches the investigation report.

**Execution rules.** One request at a time. Models run in sequence: gpt-oss:20b, qwen3.5:4b, llama3:latest, devstral:latest, JOSIE-2:9b, gemma4:12b, gemma4-local:e4b. Seeds 101 and 202, temperature 0.4, 180 s deadline, fresh conversation per request. A timeout is final and never rerun until it passes. Only transport errors (e.g. an Ollama runner crash) are retried. Every result is appended to `evidence/generations.jsonl` as it completes.

**Runtime context (2026-11-19).** Stage A/B, reproducibility and judging use Ollama's original **65536-token** server context. The owner-limited acceptance (§4.6) uses 32768 so every small model stays fully in VRAM. A model trained on less runs at its own maximum: llama3 runs at 8192.
- **What changed.** Rows 1–614 ran at 65536. That covers the 389 imported prior outputs and the first 225 outputs from this run. On 2026-11-18 from 23:42:41 to 23:42:47, the Ollama app's context setting was changed in its settings UI (`POST /api/v1/settings` in `app.log`). The server restarted at 23:42:49 with `OLLAMA_CONTEXT_LENGTH:262144`. That restart was the "outage" behind the archived transport errors.
- **The comparison.** A controlled test on Qwen showed that context size changes both speed and outputs. It used the same bodies and binary, with one server loaded at a time (`perf.mjs`, `evidence/context-perf.json`):

| Server context | Loaded size | In VRAM | Mean tokens/s | Same text as stored rows generated at 262144 | Same text as stored rows generated at 65536 |
|---|---|---|---|---|---|
| 65536 | 12.0 GB | 12.0 GB (100 %) | 130.8 | 1/5 | 2/3 |
| 262144 | 14.3 GB | 9.4 GB (66 %) | 40.8 | 5/5 | 2/3 |

- **Archived rows.** The 83 rows generated after the change were moved to `evidence/generations.ctx262144.jsonl`, tagged `runtimeCtxSetting: 262144`; none were deleted. They were 82 Qwen rows at 262144, including 5 timeouts, and 1 GPT-OSS row at its 131072 maximum. They are regenerated at 65536, so each model's baseline, candidate and neutral rows come from one context. A backup of the store from before the split is kept as `generations.jsonl.bak-before-ctxsplit`.
- **Isolated server.** The installed Ollama app and its 262144 setting are not changed. The benchmark instead uses a separate, non-persistent `ollama serve` on `127.0.0.1:11435`. It uses the same 0.40.16 binary, model store and app-supplied environment, except `OLLAMA_CONTEXT_LENGTH=65536` and `OLLAMA_NOPRUNE=true`. It is selected with `P7D_OLLAMA`.
- **Per-row record.** Every new row records the server it used (`target`) and the context and VRAM reported by `/api/ps` (`runtime`).
- **Real Desktop use.** Desktop Harness requests carry no context field, so normal use now gets 262144 on Qwen, about 3× slower than the benchmark. That does not change these comparisons, but it matters for real use.

## 2. Stages

- **Stage A — priorities**, all seven models:
  - Language: L0/L1/L2 × 7 targets × (prior Arabic prompt + held-out prompt).
  - Explicit-request override: 5 cases.
  - Precedence: H0/H1 × 6 conflict checks.
  - Creative: S0/S1/S2 plus a neutral control, on 2 open tasks and 1 factual regression task.
  - Grill-Me: G0/G1/G2 plus a neutral control, on 2 decisions and 1 trivial question.
  - Code Reviewer: C0/C1 plus a neutral control, on a path-traversal and a SQL review.
  - Humanizer: U0/U1 plus a neutral control, on 2 bulletins.
- **Stage B — everything else**, all seven models: every remaining style, every trait level and every remaining preset at current wording, with matched neutrals. B1 candidates for Efficient, Warmth-less, Emoji-more, Detail-less and No Fluff, each also on a held-out task.
- **Validation**: fresh reruns of 10 prior slots × 3 models, to measure exact-text reproducibility of identical bodies.

## 3. Scoring

| Area | Pass condition | Method |
|---|---|---|
| Language | Dominant script/language = selected language, not mixed | Deterministic. An empty final answer or a timeout is *incomplete*, never a language fail. The task fact is checked separately. |
| Override | Explicitly requested language wins | Deterministic |
| Precedence | User exact output / JSON-only / requested length wins over custom and saved preferences. Custom wins over saved preferences. Custom marker still applied when there is no conflict. | Deterministic |
| Creative | Judged more original than the matched neutral output (same model, seed, task) | Pairwise judge |
| Creative regression | 5 km → 3.1 mi still correct | Deterministic |
| Grill-Me | Asks ≥1 material clarifying question **and** names a risk | Absolute judge, compared with the neutral baseline |
| Grill-Me regression | "15% of 80" answered (12) with no question back | Deterministic |
| Code Reviewer | Security flaw + performance issue + tests + safe fix, no false claims | Absolute judge, plus a deterministic coverage cross-check |
| Humanizer | Every fact, citation and hedge kept (deterministic), and judged to add no claims, keep certainty, and read naturally | Both |
| Styles/traits/presets | Judged stronger on the setting's dimension than the matched neutral. Structure/emoji counted directly. Detail-less/Efficient must also be shorter. | Pairwise judge or deterministic |

Limits:
- Two seeds per condition in Stage A/B, five in acceptance. These show observed variability, not population estimates.
- The judge is a local 20B model and also one of the evaluated models. It is audited against a blinded manual review (§4.3).
- Exact text is not reproducible (§4.2), so every conclusion rests on outcomes.

## 4. Results

Full per-model grids: `qa/phase7d/evidence/tables.md` (Stage A/B) and `evidence/acceptance.md` (acceptance). Selection and decisions: [candidates §3](PERSONAL_PROFILE_PHASE7D_CANDIDATES.md).

### 4.1 Stage A/B (all 7 models, seeds 101/202)

Completeness:
- 2,300 Stage A/B generations plus 112 round-2 generations: 389 imported, the rest fresh.
- 0 transport errors. 19 timeouts, kept as final "incomplete" outcomes.
- 909 judge verdicts, 0 unparseable.

| Area | Current | Best candidate |
|---|---|---|
| Language followed | 77/196 | L2 146/196 |
| Language, held-out prompt | 45/98 | L2 77/98 |
| Language, English target with Arabic/Chinese message | 5/28 | L2 14/28 |
| Explicit language request still wins | 69/70 | L2 69/70 |
| Precedence exactWord / jsonOnly / customOverPrefs / noLists / minWords200 / markerFirst | 10/4/6/14/14/13 of 14 | H1 10/3/6/14/14/12 |
| Creative (judged vs matched neutral) | 18/28 | S2 24/28 |
| Grill-Me asks + names risk | 2/28 (neutral 0/28) | G3 25/28 |
| Grill-Me regression ("15% of 80" answered without a question) | 14/14 | G3 13/14 (1 timeout) |
| Code Reviewer full pass | 7/28 (neutral 0/28) | C2 18/28 |
| Humanizer full pass | 13/28 (neutral 11/28) | U1 18/28 |
| Warmth-less (judged) | 21/28 | B1 27/28 |

Residual weaknesses no candidate addressed:
- **JSON-only output:** 4/14 with either header.
- **Custom guidance over saved preferences:** 6/14. llama3, devstral, JOSIE and e4b fail it.
- **devstral language following:** 9/28 even with L2.
- Weak Stage B settings at current wording, judged against the neutral output:
  - Critical style 6/14
  - Critical-less 6/14
  - Detail-more 10/28
  - Action 8/14

These need model-side or format-specific work, not wording alone. Prompt growth for the winners is +26 (S2) to +98 (C2 vs current Code) characters per line. The worst-case section size is reported with acceptance.

### 4.2 Reproducibility (10 prior slots × 3 models, identical bodies, 65536 context)

| | gpt-oss | qwen | llama3 |
|---|---|---|---|
| Exact text reproduced | 2/10 | 1/10 | 3/10 |

- **Text:** the same body and seed give different text on Ollama 0.40.16 GPU decoding.
- **Outcomes are stable:** the detected language is identical in 30/30 pairs. Word-count difference is a median of 5 % (p90 26 %).
- **Consequence:** results are treated as samples. Decisions use outcome rates across models and seeds, never single texts.

### 4.3 Blinded audit of the judge

32 judge items were stratified across pairwise, Grill-Me, Code and Humanizer. They were graded manually with the condition labels and the judge verdicts hidden (`evidence/spotcheck-*.json`).

| Group | Agreement on pass/fail |
|---|---|
| Pairwise (style/trait/preset dimension) | 6/8 |
| Grill-Me | 8/8 |
| Code Reviewer | 7/8 |
| Humanizer | 7/8 |
| **All** | **28/32 (88 %)**; field level 81/88 |

Of the 4 disagreements, 1 is a tie. The other 3 are more lenient than the manual grade:
- a missed false claim ("fs is never imported");
- an essentially unedited text graded natural;
- one Creative pair.

Judged pass rates may therefore be slightly optimistic. They are not pessimistic.

**Lightweight judge for acceptance** (`judgeeval.mjs`, `evidence/judge-eval.json`). Under the owner decision of 2026-11-19, GPT-OSS no longer judges. Two lightweight local models re-graded the same 32 manual items from the identical prompts.

The rule was fixed before any verdict existed:
- at least 27/32 agreement with the manual grades;
- at least 6/8 in every group;
- at most 1 unreadable verdict;
- the fastest model that passes is selected.

| Judge | Manual agreement | Pairwise / Grill / Code / Humanizer | Unreadable | Median latency |
|---|---|---|---|---|
| gpt-oss:20b (Stage A/B judge, reference only) | 28/32 | 6/8, 8/8, 7/8, 7/8 | 0 | 17.4 s |
| qwen3.5:4b | 30/32 | 7/8, 8/8, 8/8, 7/8 | 0 | 10.2 s |
| **gemma4-local:e4b (selected)** | **29/32** | 7/8, 8/8, 7/8, 7/8 | 0 | **4.6 s** |

Caveats:
- **Small sample:** the agreement is measured on 32 items.
- **Self-judging:** gemma4-local also judges its own acceptance outputs, as GPT-OSS did in Stage A/B. Acceptance verdicts compare current vs winner wording from the same model and judge, so any self-preference applies equally to both arms.

### 4.4 Scoring and tooling corrections made during the run

- **Privacy gate.** The synthetic privacy gate tested the JSON-serialized body. There, any "Label:" followed by a newline becomes `e:\n` and matched the drive-path pattern, so every judge prompt was blocked.
  - The gate now tests decoded strings and requires a standalone drive letter.
  - It still blocks paths, emails and keys (verified with positive cases). It only ever blocked requests and never altered one.
- **Invented emails.** Model outputs contain invented example emails (MX-record answers). The judge masks them as `[email address]` before judging.
- **Non-breaking characters.** GPT-OSS writes U+202F/U+00A0 spaces and U+2011 hyphens (176 rows). Content and language checks now normalize them. Exact-output and marker checks stay raw. Only one cell changed: GPT-OSS Humanizer U1 0/4 → 1/4.
- **Creative neutral lookup.** The judge's Creative neutral lookup now matches by area and task, so acceptance case ids resolve. Stage A pair jobs are unchanged (83).

### 4.5 `max_completion_tokens` live verification (`evidence/token-limit.json`)

| Request | gpt-oss | qwen | llama3 |
|---|---|---|---|
| `max_completion_tokens: 32` (direct) | 322 tokens, stop | 1701, stop | 187, stop |
| `max_tokens: 32` (direct) | 32, length | 32, length | 32, length |
| both (32 / 64) | 64, length | 64, length | 64, length |
| Native `num_predict: 32` | 32 | 32 | 32 |
| Installed adapter, no compat, maxTokens 32 | wire `max_completion_tokens`; 249 tokens | wire `max_completion_tokens`; 1701 | wire `max_completion_tokens`; 229 |
| Installed adapter, `compat.maxTokensField: "max_tokens"`, maxTokens 32 | wire `max_tokens`; 32, finish `max-tokens` | same | same |
| Adapter with compat, maxTokens 2048 | `max_tokens: 2048`; 322, stop | `max_tokens: 2048`; 1701, stop | — |

- **Default path.** With no agent `maxTokens`, the adapter sends 128000. Ollama accepts `max_tokens: 128000` (verified on llama3 and qwen).
- **Reasoning models.** A small cap can be consumed entirely by reasoning: GPT-OSS and Qwen returned 0 answer characters at 32. Any configured cap must leave room for reasoning plus the answer.
- **Unvalidated value.** An invalid value `compat.maxTokensField: "max_output"` was accepted by the adapter without error. A typo would therefore silently fall back to the field Ollama ignores.

### 4.6 Acceptance (owner-limited, held-out tasks; `evidence/acceptance.md`, `evidence/acceptance.json`)

**Scope decision (owner, 2026-11-19).** The full acceptance matrix was stopped at a completed checkpoint after 165 GPT-OSS rows; every existing row is kept. The remaining acceptance work was limited as follows:
- **Models:** only Qwen3.5:4b, llama3 and gemma4-local generate or judge. GPT-OSS 20B and Devstral are permanently excluded, including from judging.
- **Budget:** at most 100 new requests. Exactly **100** were used: 84 held-out, 12 in the 75-tool context, and 4 matched re-runs of the only two timeouts (both Qwen), on seed 404.
- **Cases:** critical cases only, one seed (303). Current (C) and winner (W) wording are always compared on the same model, seed and context.
- **Judge:** gemma4-local, qualified in §4.3.
- **Hardware:** a separate, non-persistent server at **32768** context, one loaded model, one request at a time. Every row records the server's `/api/ps` reading, and all 100 show the model **fully in VRAM**:

  | Model | Context | Loaded size | In VRAM |
  |---|---|---|---|
  | Qwen | 32768 | 9.1 GiB | 100 % |
  | llama3 | 8192 (model maximum) | 5.6 GiB | 100 % |
  | gemma4-local | 32768 | 3.5 GiB | 100 % |

  Peak GPU memory was 11.0 of 12.2 GiB. GPU time for generation was about 18 minutes.
- **Context differs from Stage A/B.** 32768 replaces 65536 for acceptance only. The longest prompt (75 tools) is about 15–18k tokens, so nothing is truncated. C and W always share one context.

**Results** (C → W, summed over Qwen / llama3 / gemma4-local unless stated; one sample per cell):

| Check | Current | Winners | Note |
|---|---|---|---|
| Language followed (zh, ar, en targets; new prompts) | 2/10 (1 inc) | **7/10** | Qwen 0/4 → 4/4. gemma4-local 1 → 2. llama3 1 → 1. gemma4-local still answers an Arabic question in Arabic with English selected. |
| Task fact correct in those answers | 9/10 (1 inc) | 10/10 | |
| Explicit language request wins (zh profile, "answer in English") | 3/3 | 3/3 | |
| Precedence: exact token only | 1/4 | 2/4 (1 inc) | Residual weakness for both. |
| Precedence: custom marker first | 3/3 | 3/3 | |
| Creative judged more original than neutral | 2/3 | 3/3 | |
| Grill-Me asks + names a risk (CRM decision) | 1/3 | **3/3** | |
| Grill-Me does not interrogate a simple question (hours) | 3/3 | 3/3 | |
| Code Reviewer full pass (judge) | 1/3 | 1/3 | |
| Code Reviewer deterministic coverage (SSRF, robustness, tests) | 1/3 | 0/3 | Qwen's W review named the flaw "open redirect" instead of SSRF; the judge passed it. llama3 fails with both; gemma4-local omits tests with both. |
| Humanizer full pass | 0/3 | 0/3 | All 6 outputs keep the source but drop the bracket notation `[Workshop sheet C]` that the strict check requires. Judge "added claims": C 2/3, W 1/3. |
| Low warmth judged more reserved; no exclamation marks | 3/3; 3/3 | 3/3; 3/3 | No difference at this sample size. |
| Task correct and English kept with every changed line on at once | 3/3; 3/3 | 3/3; 3/3 | No regression. |
| **75 tools:** language (zh profile, Arabic question) | 0/2 | **0/2** | Both models answer in Arabic with either wording. |
| **75 tools:** custom marker first | 2/2 | 2/2 | |
| **75 tools:** Grill-Me asks + names a risk (migration) | 0/2 | 1/2 | No tool calls with either wording (0/6, 0/6). |

**Earlier GPT-OSS acceptance rows** (kept; deterministic checks only, never judged after the decision; 5 seeds):

| Check | Current | Winners |
|---|---|---|
| Language followed | 12/35 | **31/35** |
| Task fact | 35/35 | 35/35 |
| Explicit override | 10/10 | 10/10 |
| Exact token | 2/5 | 1/5 |
| JSON only | 3/5 | 4/5 |
| Marker first | 5/5 | 5/5 |
| Simple question answered directly | 5/5 | 5/5 |

**Privacy** (deterministic, no inference, winner wording):
- Custom guidance is absent when `sendCustom` is false and present only when opted in.
- Automatic language and a neutral profile inject nothing.
- No rendered acceptance section contains a path, email or key.
- 0 requests were blocked by the synthetic privacy gate.

**Coverage not tested in acceptance.** The cells below are untested, not passed:
- Spanish, French, German and Japanese targets.
- The German override.
- JSON-only and exact-word precedence in the 75-tool context.
- The 15 % question in the 75-tool context.
- Code, Humanizer, Creative and warmth on GPT-OSS and Devstral.
- Everything on Devstral, and Gemma4:12b and JOSIE in acceptance.
- Seeds 505–707.

Those settings rest on Stage A/B (all 7 models, 2 seeds). Acceptance gives one sample per cell on three small models, so it can reveal a large regression but cannot establish a rate.

**Acceptance verdict:**
- **Confirmed on held-out tasks:** L2 (language), G3 (Grill-Me) and S2 (Creative) improve; nothing regresses in override, precedence, task or English correctness, or privacy.
- **Neutral:** low warmth (B1w) is neutral at this size.
- **Not reconfirmed:** C2 (Code) and U1 (Humanizer) are not reconfirmed. They show no clear regression, but there is no held-out gain either. Their adoption rests on Stage A/B (18/28 vs 7/28; 18/28 vs 13/28).
- **Not fixed:** language following inside the realistic 75-tool context is **not** fixed for the small models.

**Applied:** on 2026-11-19 the owner applied L2, S2, G3 and B1w only; C2 and U1 were not adopted. Production now renders exactly the benchmarked text for that subset (768/768 catalog combinations). The worst-case section is 1330 characters. See [plan §4](PERSONAL_PROFILE_PHASE7D_PLAN.md).

