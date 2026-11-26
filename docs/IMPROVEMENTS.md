# Implemented improvements — verification evidence

## My Profile: response language (wording B)

- **Baseline:** [commit 4b3f3c7](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/commit/4b3f3c79446a038ae442d8ab3b582a2a28f864c2), branch `refactor/my-profile-context`.
- **Problem:** the model could answer in the input language on the first turn or mix languages despite a saved response-language setting.
- **Implemented change:** the optional runtime reminder uses the direct instruction `Write your entire response in [language].` The system section still gives explicit current output-language requests priority over the saved default. The architecture and settings schema are unchanged.
- **Automated verification:** all eight GitHub Actions checks on that exact commit succeeded (Windows and Ubuntu; Node 22 and 24).
- **Owner-reported live Desktop verification:** Gemma4 E4B selected the intended primary response language in 9 of 9 reported checks, including fresh conversations, explicit overrides, and settings changes. Chinese and Spanish were exercised. The owner also observed mixed-language replies and references to profile instructions. Personal values and transcripts are omitted.
- **Known limitations:** these observations are model- and sample-specific, not a guarantee across models or future turns. Occasional mixed-language output and unnecessary references to the preference instruction remain possible. A preference change within an existing conversation is a separate verification scenario.

## MP-01 · Explicit language precedence experiment

The first-turn Host capture and the simulated follow-ups show the saved language reminder in a user-role context message after the current request. The system section gives precedence to explicit requests. Language override misses occurred with both Git renderers, including a Spanish override of a saved Chinese preference in a follow-up. The context ordering and the reminder's unconditional wording are plausible contributors. The capture establishes placement. Model behavior does not establish a single cause.

The tested alternative used the `4b3f3c7` renderer and inserted this sentence pair immediately above wording B.

> If the current user asks for a different output language, use that language for the entire response. The following default applies only when the user does not request an output language.

| Model | Variant | All language cases | Explicit overrides |
| --- | --- | --- | --- |
| Gemma | `14bf6e3` | 13/18 | 2/5 |
| Gemma | `4b3f3c7` | 13/18 | 2/5 |
| Gemma | Dedicated reminder precedence | 14/18 | 3/5 |
| Qwen | `14bf6e3` | 15/18 | 3/5 |
| Qwen | `4b3f3c7` | 16/18 | 3/5 |
| Qwen | Dedicated reminder precedence | 15/18 | 5/5 |

The alternative was rejected. Qwen gained two override checks and lost three saved-default checks for Chinese, French and Japanese. Gemma retained misses for mixed Arabic and a Spanish follow-up override. The experiment used 108 turns with `think:false`, temperature 0, seed 42 and a fixed 512-token cap. The comparison included held-out override prompts and all seven explicitly saved languages. Automatic Arabic worked in a fresh conversation at smoke level with both models. Some multi-turn replies continued using an earlier saved language after clearing.

## MP-02 · Silent-application A/B comparison

The starting commit `14bf6e3` added the following sentence to both the system section and the per-turn reminder.

> Apply these preferences silently. Do not mention or explain them unless the user asks.

The removal experiment excluded the sentence from both locations. All other rendered instructions, including wording B, matched `4b3f3c7`. The two Git renderers differ only by those two copies. The experiment used no replacement instruction.

| Model | `think` | References with → without, among nonempty replies | No final text with → without, out of 26 | Language checks with → without, out of 22 |
| --- | --- | --- | --- | --- |
| `gemma4-local:e4b` | `false` | 2/26 → 2/26 | 0 → 0 | 16 → 16 |
| `gemma4-local:e4b` | `true` | 0/19 → 0/22 | 7 → 4 | 16 → 20 |
| `qwen3.5:4b` | `false` | 0/26 → 0/26 | 0 → 0 | 18 → 18 |
| `qwen3.5:4b` | `true` | 0/2 → 0/8 | 24 → 18 | 0 → 2 |

There were 208 attempts across 13 turns, two variants, two models, two reasoning modes and two seeds. Every missing final answer contained thinking and hit the 512-token cap. This set showed an equal rate of preference references. Removing the sentence improved final-answer completion at the same budget on both models when thinking was enabled. Two Gemma comparisons changed from natural stops to capped replies after removal while still meeting the scored content checks. The mechanism behind the difference in generation is unverified.

The expanded comparison used 138 attempts per variant, temperature 0, seed 42, `think:false` and a 512-token output cap.

| Model | Language checks with → without | Profile or system references with → without | Exact format with → without | Median prompt tokens with → without |
| --- | --- | --- | --- | --- |
| Gemma | 43/48 → 43/48 | 1/65 → 3/65 | 2/4 → 2/4 | 237 → 204 |
| Qwen | 44/48 → 45/48 | 1/65 → 2/65 | 1/4 → 0/4 | 239 → 206 |

Complete removal was rejected. Held-out replies on both models started referencing instructions again. With Qwen, a saved custom string also overrode an explicit current exact-format request that previously succeeded. The reduction in prompt tokens and improvements in some cases did not meet the regression criterion. The browser carrier was regenerated when evaluating the change and again when restoring the original renderer.

Two narrower variants kept the sentence in only the system section or only the reminder. Each was compared with `14bf6e3` on the same eight turns per model and mode, at temperature 0, seed 42 and a 512-token cap across both reasoning modes.

| Model and mode | Final text, both locations | Final text, system only | Final text, reminder only |
| --- | --- | --- | --- |
| Gemma, `think:false` | 8/8 | 8/8 | 8/8 |
| Gemma, `think:true` | 5/8 | 4/8 | 4/8 |
| Qwen, `think:false` | 8/8 | 8/8 | 8/8 |
| Qwen, `think:true` | 4/8 | 5/8 | 5/8 |

The 96-turn placement experiment produced 21 thinking-only replies. The system-only variant also introduced a reference to system instructions in one Qwen reply with thinking disabled. Neither one-location variant met the regression criterion. The production renderer retains both copies and wording B.

## Test method

- Ollama `0.40.18` on Windows via loopback. The installed model IDs reported by `ollama list` were `3c4be0937708` for `gemma4-local:e4b` and `d8b0f5e9760c` for `qwen3.5:4b`. The runner uses one model at a time and sends no tool executions.
- `qa/profile-ollama-check.mjs` uses the production renderers and accepts Git SHAs for comparisons. The pinned Harness `0.2.2-rc.3` request capture verifies first-turn message roles, preference placement, and the exact runtime snapshot framing after the current user message. The Ollama runs are API simulations. They use a short system preamble and fixed synthetic assistant history to hold follow-up inputs constant. They do not include the full Desktop system prompt, provider serialization, or user configuration.
- The smoke and silent runs used temperature 0, seeds 42 and 43 for paired trials, a 4,096-token native context budget, a 60-second timeout per attempt, and no HTTP retries. Output caps were 192 with `think:false` and 512 with `think:true`. Compare variants within a mode. New runs default to the same output cap across modes. The runner logs the actual settings, timing, token usage, errors, answer, reasoning and tool calls in separate fields. [Ollama chat API](https://docs.ollama.com/api/chat)
- Language checks combine script counts with Latin-language function words and short-preamble detection. Numerals, loanwords, short answers, and related languages can require review. The runner checks required and prohibited terms, exact strings, length and formatting. Style and behavior cases carry a rubric, which uses the equivalent Default answer where available and scores the requested feature as absent, partial, or clear. These judgments are sample-specific.

~~~powershell
node qa/profile-ollama-check.mjs --suite smoke --mode first --predict 192 --out node_modules/profile-smoke.jsonl
node qa/profile-ollama-check.mjs --suite silent --mode first --predict 192 --trials 2 --variants 4b3f3c7,14bf6e3 --out node_modules/profile-silent-off.jsonl
node qa/profile-ollama-check.mjs --suite silent --mode last --predict 512 --trials 2 --variants 4b3f3c7,14bf6e3 --out node_modules/profile-silent-on.jsonl
node qa/profile-ollama-check.mjs --suite full --mode first --variants 14bf6e3,worktree --out node_modules/profile-full.jsonl
node qa/profile-ollama-check.mjs --suite precedence --mode first --variants 14bf6e3,4b3f3c7,4b3f3c7+explicit-precedence --out node_modules/profile-precedence.jsonl
node qa/profile-ollama-check.mjs --suite quiet-placement --mode both --variants 14bf6e3,14bf6e3+quiet-system-only,14bf6e3+quiet-reminder-only --out node_modules/profile-quiet-placement.jsonl
node qa/profile-ollama-check.mjs --suite direct --mode both --out node_modules/profile-direct-native.jsonl
node qa/profile-ollama-check.mjs --suite direct --api openai --mode both --out node_modules/profile-direct-v1.jsonl
~~~

The output path must be new. Use a separate ignored path for each run. Results under `node_modules` are local and can be removed by a later `npm ci`. Do not put real profile data in the fixture matrix.

## Full preference matrix

Each full run covers 60 scenarios and 69 turns per model. It includes eight language settings, first and later turns, explicit overrides, return to the saved default, edits, and clearing. Style and trait cases use equivalent prompts within their respective groups. The settings and Host tests cover runtime refresh, omission of unsupported scopes, Unicode and literal interpolation, revision-checked writes, connection isolation, and v1–v5 compatibility. Live Desktop acceptance is a separate check.

### MP-03 · Personal details and custom instructions

In the starting-commit run, both models returned the synthetic name on the Arabic identity question and all three fields when explicitly requested in English. On the empty profile, Gemma marked all three fields unknown. Qwen introduced its own identity as an assistant, a reproduction of the subject confusion. Both models used the updated values and omitted earlier ones on the clearing turn of the controlled fixture. Earlier snapshots were still present in native session history.

Gemma matched two of four exact custom output strings. Qwen matched one of four. Neither preserved the multilingual literal template in the answer, although the native capture preserved literal template syntax in the system text. Both used the initial turn marker and omitted both markers after clearing. Qwen missed the edited marker. The actual Host update correctly replaced the current settings, so the response misses do not establish a settings persistence defect.

### MP-04 · Response styles

The following are observed word counts on the equivalent English shared-folder question at the starting commit. The output cap was 512 tokens. Professional and Technical replies used more precise terms in the sample. Friendly replies opened conversationally, and Qwen Candid opened directly on file locking or version conflicts. The style constructs overlap with techniques already present in the Default response, particularly Creative and Critical.

| Style | Gemma words | Qwen words |
| --- | --- | --- |
| Default | 360 | 360 |
| Professional | 332 | 246 |
| Friendly | 327 | 342 |
| Candid | 335 | 178 |
| Creative | 321 | 355 |
| Efficient | 267 | 96 |
| Critical | 322 | 320 |
| Technical | 360 | 341 |

On the separate Arabic Efficient case, both produced Arabic replies of 39 words. A concise response to one prompt does not establish a consistent target length.

### MP-05 · Traits and behavior presets

The following checks compare Less, Balanced, and More at the starting commit. Warmth and enthusiasm showed observable shifts in the openings and tone, using the delivered rubric.

| Trait | Gemma Less / Balanced / More | Qwen Less / Balanced / More |
| --- | --- | --- |
| Warmth | Reserved / empathetic / very empathetic | Reserved / reassuring / empathetic |
| Enthusiasm | Restrained / multiple tone options / strongly celebratory | Restrained / multiple tone options / strongly celebratory |
| Structure, Markdown headings and list lines | 0 / 15 / 6 | 0 / 22 / 26 |
| Emoji, pictographs | 2 / 5 / 5 | 0 / 4 / 3 |
| Detail, words | 214 / 377 / 386 | 78 / 374 / 384 |
| Critical thinking | Identified risks in all three conditions. More explicitly organized the risks. | Less gave a brief warning. Balanced and More named distinct failure modes. |

The eight preset cases exercised challenging assumptions, concision, clarification, distinguishing evidence from claims, ordered steps, practical actions, code-review criteria, and preserving facts during a rewrite. The isolated Grill-Me reply from each model contained six question marks against the requested two to three questions. The compatible Steps/Action/No Fluff case provided ordered actions. Gemma asked questions despite an explicit no-questions instruction in the conflicting preset case. The combined Arabic low-detail case produced no Markdown headings, list lines, tables or emoji on either model, with differences in the language check.

## MP-06 · Direct Chat tool denial and empty completions

The native Host fixture exposed a synthetic tool schema inside Direct Chat. The model adapter emitted a tool call and the production guard prevented execution. A denial reached the next model request. An introduced adapter `EMPTY_RESPONSE` then exercised one failed attempt and two explicitly bounded fixture retries of the same step. All three attempts used identical message history. Tool denial and retry behavior are distinct parts of this path.

Harness `0.2.2-rc.3` includes `EMPTY_RESPONSE` in the default normal retry policy with five retries. The Host uses a retry listener to act on that policy. The fixture uses its own two-retry listener. The reported Desktop usage of approximately 138K tokens remains unassigned to individual requests. The owning provider route, request-level usage, skill catalog, retry count and specific Desktop counter would be needed to attribute it.

The local provider probe sends the same synthetic weather request with and without a tool schema and a small skill catalog. It then replays one synthetic tool denial without adding a new user message. Both models requested the fictional tool when its schema was exposed, with or without the catalog. After denial, Gemma returned final text in both modes on both APIs. Qwen returned final text in both modes on the compatible API and with thinking disabled on the native API. On the native API with thinking enabled it requested the tool again. No tool was executed.

| Ollama transport | Attempts | Final text | Tool call without final text | Reasoning without final text or a tool call | Fully empty |
| --- | --- | --- | --- | --- | --- |
| `/api/chat` | 24 | 8 | 13 | 3 | 0 |
| `/v1/chat/completions` | 24 | 10 | 12 | 2 | 0 |

Qwen reached the 512-token cap with thinking enabled and no tool schema. Gemma returned reasoning without final text and stopped normally in the catalog-only condition on both APIs. A native tool call can arrive with `done_reason:"stop"`. The compatible API reported `finish_reason:"tool_calls"` for those replies. Inspect the message fields when diagnosing a blank final answer.

Native API settings were `think:false` and `think:true`. OpenAI-compatible settings were `reasoning_effort:"none"` and `reasoning_effort:"medium"`. Both transports used temperature 0, seed 42 and a 512-token output cap. The synthetic catalog added 19–21 prompt tokens in a matched first request. A single tool schema increased the prompt by 48 tokens on Gemma and 257 on Qwen. The denial replay had up to 381 prompt tokens. These runs isolate several possible contributors. They leave the production loop and the full Desktop catalog and usage display for separate acceptance. [Ollama OpenAI compatibility](https://docs.ollama.com/api/openai-compatibility)

## Implemented QA improvements and status

Commit `d0f68d8819d154d3259c202849165b3e15b3512e` adds the Ollama runner and synthetic matrix, scorer and transport tests, a pinned Host capture check for message placement, and the Direct Chat denial and retry fixture. The runner distinguishes tool-only replies, thinking-only replies, fully empty replies, and transport errors. The fixture uses the production denial checks and an offline adapter. The tested prompt candidates are recorded above. The production plugin code and carrier match the starting commit.

The 752 scored Ollama attempts completed with zero request errors across the smoke, silent comparison, two full matrices, precedence, quiet placement, and Direct Chat probes. The original preliminary smoke with unwrapped context was superseded by the Host-matched smoke and is excluded. The eight response styles, six traits at three levels, eight presets, combination cases, and settings and information transitions were exercised. The full preference runs used fixed histories and one seed per variant. The repeated silent comparison also used seed 43.

On Windows with Node `v26.10.0`, `npm ci --ignore-scripts`, `npm run build:client`, `npm run check:client` and `npm run check:regression` succeeded. `npm test` passed 290 of 291 with the POSIX-only permissions check skipped. `npm run check:package` passed 283 of 285 with the POSIX check and source documentation-tree check skipped, and verified 99 packed files. The pinned native Host suite passed 26 of 26. The Windows junction test required execution outside the workspace sandbox.

The QA changes are ready for local review. Release acceptance for model behavior still needs an isolated native Desktop run. Remaining cases include explicit and mixed-language output, automatic language after changes, custom literal formatting, personal information subject confusion, conflicting instructions, and request-level attribution of the reported Direct Chat usage.

## Additional context experiments ? identity and automatic language

On the local QA baseline f7a5e70 (production renderer unchanged from 14bf6e3), two isolated runner-only variants were compared with 14bf6e3 using native Ollama, think:false, temperature 0, seed 42, num_ctx 4096 and num_predict 512. The original full-suite selection is preserved; the new targeted suites are opt-in. All profile values and histories were synthetic.

| Targeted suite | Attempts | Gemma baseline / candidate | Qwen baseline / candidate |
| --- | ---: | --- | --- |
| Identity subject | 40 | Required checks 5/5 / 5/5; silent 4/6 / 5/6 | Required checks 4/5 / 4/5; silent 5/6 / 5/6 |
| Automatic language | 84 | Language 14/21 / 14/21 | Language 18/21 / 18/21 |

All 124 attempts returned final text, with no request errors; eight automatic-language attempts ended at the output limit. Both identity variants still made Gemma describe itself before answering the short Arabic user-identity question, with or without saved details. Qwen's empty-profile Arabic answer improved from assistant identity to unavailable user details; the populated Arabic short question still missed the exact Latin name check in both variants (Arabic transliteration requires human review). The automatic-language candidate appended an explicit current-user-language default when the saved setting was auto. It did not fix Gemma's Chinese reply after clearing or improve either model's aggregate language checks. The strict language scorer can also flag legitimate embedded foreign-language terminology, so scores are not a complete semantic assessment.

Neither candidate is accepted for production: no consistent improvement in the targeted failure mode across both models, and no Desktop acceptance evidence. The production renderer, wording B, silent guidance, profile schema, and Direct Chat policy remain unchanged. The tests are reproducible using:

~~~powershell
node qa/profile-ollama-check.mjs --suite identity-context --mode first --variants 14bf6e3,14bf6e3+identity-subject --out node_modules/profile-context-identity-v1.jsonl
node qa/profile-ollama-check.mjs --suite auto-context --mode first --variants 14bf6e3,14bf6e3+auto-language --out node_modules/profile-context-auto-v1.jsonl
~~~

Use a new output path for repeated runs. These are matched API simulations, not full Desktop request traces. Native placement and precedence remain constrained by the pinned Harness assembly API; the plugin does not reorder host message history or bypass optional context suppression.
