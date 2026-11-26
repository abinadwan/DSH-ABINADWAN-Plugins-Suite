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

## Direct Chat — security policy verification

The Windows validation of source commit `eff59b69288f850190779ec25b2c6dc747c18cae` used installed Host 0.2.2-rc.5 services in isolated fixtures, not the packaged Desktop GUI. The original matrix recorded 84 passes, 3 failures, 19 partial results, 25 blocked cases and 1 not tested (132 total). The installed-Host integration checks passed 26/26; 20 local Ollama requests returned text with zero visible tools, attempted calls or executions in that tested configuration. Two visibility failures involved an already-live agent and agent-local registration; one documentation failure involved a historical report directory disallowed by the active-documentation policy. Original test classifications are unchanged.

DC-01 was accepted with documented limitations: reduced tool visibility and policy denial, not guaranteed complete hiding or universal isolation. See [Direct Chat policy](../plugins/direct-chat/README.md#dc-01--tool-visibility-and-execution-policy). The subsequent DC-02 implementation at `578a240abb2ad3798dd6ad229b9106c74676fecc` adds a best-effort profile-local identity fallback. All three new targeted unit tests passed in Windows and Ubuntu CI with Node 22 and 24; the full CI jobs stopped at the known documentation-layout assertion. Installed-Host validation of the new identity cache, native Desktop acceptance and Windows effective ACL verification remain outstanding. No claim of release or merge readiness is made.

The full historical report and sanitized evidence are preserved at their immutable original Git revision, rather than in the active documentation tree, consistent with [documentation policy](README.md). [Validation report](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/blob/3834346f96eb1b3745ee4fb42833736148300782/docs/research/DIRECT_CHAT_PHASE_3_2_MEDIUM_VALIDATION.md) · [Sanitized JSON evidence](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/blob/3834346f96eb1b3745ee4fb42833736148300782/docs/research/evidence/direct-chat-phase-3-2-medium/results.json).

## DC-02 — Native Host identity fallback validation

Tested source `7dc7c420425031a582f623b30f8693e1c9cb7516` on `fix/v1.1.1-direct-chat-security-medium`. GitHub reported eight successful checks for this SHA on Windows and Ubuntu with Node.js 22 and 24. [PR #79 checks](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/pull/79/checks)

The test machine ran Windows x64 26H2, build `26300.10075`, with NTFS and an Intel Core i7-14700K. The installed DeepSeek Harness Desktop package, Cordis Host runner, Workspace service and native tool executor were `0.2.2-rc.5`. The installed Desktop build was `3f85d888b1297107937d9bd5b853f7e733e179a4`, with Electron `44.7.0` and embedded Node.js `24.21.0`. The source test suite used system Node.js `26.10.0`.

The focused RunAsNode processes loaded the native services from the installed Windows application archive. The fixture used native JSONL Sessions and the native Workspace create, attach, detach and list APIs. Native attachment validates the stored Session cwd. For the mismatched-cwd case, the fixture supplied the resulting native membership to an isolated native Agent loop with an independently created in-memory Session header bearing the same synthetic ID. Registry faults were supplied through a fixture service. Inert tools returned text and incremented counters. The runs used disposable profiles, a local offline adapter and no Desktop GUI or production services. Storage fault and timing probes called the production cache module directly on the same Windows runtime.

### Test matrix

| # | Check | Result | Observed evidence |
| ---: | --- | --- | --- |
| 1 | Native Workspace membership with a different Agent cwd | PASS | The native registry attached seven synthetic Sessions. The focused Agent had a different cwd and both policy hooks denied the inert call. |
| 2 | Hashed identity marker | PASS | Seven membership recognitions produced seven regular, single-link, zero-byte files. Each basename matched the independently calculated 64-character SHA-256 digest. |
| 3 | Registry unavailable | PASS | With the registry provider absent, a fresh Agent for a verified ID received both denials and zero executions. |
| 4 | Registry exception | PASS | A fixture provider threw on lookup. A fresh Agent for a verified ID received both denials and zero executions. |
| 5 | Malformed registry response | PASS | A non-array response, invalid `sessionIds` and a relative Workspace path each preserved denial for a verified ID, with zero executions. |
| 6 | Valid empty response and temporarily missing membership | FAIL | A valid empty list and a native list after temporary detachment each removed a verified marker when a fresh Agent was evaluated. Native reattachment and fresh recognition recreated it. The continuity check was limited to marker state. |
| 7 | Fallback for previously verified Session IDs | PASS | Five fresh Agents recovered known identity across absent, throwing and three malformed registry modes. These are the same samples as rows 3–5. |
| 8 | Persistent recovery after Host restart | PASS | A new installed-runtime process reopened the same synthetic profile with the registry absent. The on-disk marker yielded both denials and zero executions. |
| 9 | Pre-execute and native dispatch guards | PASS | The native pre-execute waterfall and `tools.checkGuards` each returned `DIRECT_CHAT_TOOL_DENIED` independently. The installed executor returned the same denial for complete dispatch. |
| 10 | Unintended inert-tool executions | PASS | Eight protected native dispatch attempts were denied with **0** actual executions. Three ordinary controls each executed once. |
| 11 | Ordinary Workspace access during registry outage | PASS | An ordinary control with no prior identity and the registry provider absent executed the inert tool once. |
| 12 | Authoritative ordinary membership revokes a fresh Agent's identity | PASS | A native ordinary Workspace record supplied the authoritative membership. A fresh Agent had normal access, executed once and the corresponding marker was removed. |
| 13 | Revocation persists across restart | PASS | In another installed-runtime process, the marker and cache hit remained absent. With the registry provider absent, the ordinary control executed once. |
| 14 | Previously recognized live Agent after membership changes | PASS | The original live Agent remained restricted after native detachment and after the fixture switched to authoritative ordinary membership. Its inert call had zero executions. |
| 15 | Unknown Direct Chat identity during an outage with mismatched cwd | PARTIAL | Source review confirms an unknown ID supplies no positive fallback. No dispatch result was collected for this combined condition. |
| 16 | Storage failures, invalid markers and links | PARTIAL | Cache probes rejected a file at the cache-directory path, non-empty and directory markers, a cache-directory junction, a marker junction and a hard-linked marker. The file collision and directory junction retained in-memory recognition with no durable hit. Each case emitted one sanitized warning. File and directory symlink creation returned `EPERM`. Permission-denied removal and concurrent reparse-point changes were outside these probes. |
| 17 | Profile separation | PASS | The same synthetic ID had a marker and positive cache entry in the first profile. The second profile had neither during a registry outage. |
| 18 | Marker data minimization | PASS | All seven initial filenames matched expected digests and every payload was empty. No raw Session IDs, titles, messages or absolute paths were recorded in the markers. |
| 19 | Windows cache ACLs | PASS | Read-only ACL inspection covered the cache directory and one marker. Both inherited their DACLs. Effective access by an unrelated account remains unverified. |
| 20 | Identity lookup and storage overhead | PASS | Timed create, in-memory hit, disk-backed hit and disk-backed miss at 100, 1,000 and 10,000 synthetic identities. |
| 21 | Automated and native Host regression tests | PASS | Source suite passed 296 of 298, with two Windows ACL-related skips. All 26 installed Host regression tests passed. Client, package and regression checks also passed. |

**Totals:** 18 PASS, 1 FAIL, 2 PARTIAL and 0 BLOCKED at the row level. Two symlink probes within row 16 were blocked. PASS applies to the stated check and fixture scope.

### Supporting evidence and counters

| Native dispatch group | Attempts | Policy denials | Actual executions |
| --- | ---: | ---: | ---: |
| Initial verified membership with different cwd | 1 | 1 | 0 |
| Verified identity with absent, throwing or malformed registry | 5 | 5 | 0 |
| Previously recognized live Agent after membership change | 1 | 1 | 0 |
| Verified identity after process restart | 1 | 1 | 0 |
| Ordinary during outage, fresh after revocation and ordinary after restart | 3 | 0 | 3 |
| **Total** | **11** | **8** | **3** |

The pre-execute and dispatch-guard probes returned matching decisions for all eight protected cases. They are additional policy checks on the same cases. The existing native Direct Chat retry regression separately asserted zero executions across one tool-call attempt and its subsequent empty-completion sequence. The fixture terminated and recreated the Host in separate operating-system processes while preserving the synthetic profile on disk.

The directory and sampled file ACLs identified the test account as owner. Both had inherited Allow entries granting Full Control to the test account, SYSTEM and Administrators, plus two inherited Allow entries for other principals granting Modify and Synchronize. The check made no permission changes. The result describes these synthetic objects on this test machine. No unrelated-user access attempt was performed.

The initial sandboxed `npm test` failed at junction creation with `EPERM`. The same test passed outside that sandbox without changing security settings. The passing source run included the existing documentation-integrity checks. `npm run check:client` verified the deterministic browser carrier, `npm run check:package` verified 100 packed files, and `npm run check:regression` passed its four tests and classifier benchmark. Installed Host regression counts were Direct Chat 2, new plugins 13, My Profile 1 and Adaptive Reasoning 10.

### Identity cache performance

One sequential Windows/NTFS run per size, using the installed embedded Node.js process and a separate empty synthetic profile per size. Times are elapsed milliseconds for one operation per ID and include the SHA-256 lookup. A fresh cache instance measured disk-backed lookups after marker creation, with the OS filesystem cache left as-is. Timing excludes synthetic Agent and registry overhead.

| Synthetic Sessions | Marker creation, ms | In-memory hits, ms | Disk-backed hits, ms | Disk-backed misses, ms | Marker files | Logical payload bytes |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 100 | 27.19 | 0.19 | 11.75 | 11.35 | 100 | 0 |
| 1,000 | 242.17 | 0.85 | 102.33 | 111.30 | 1,000 | 0 |
| 10,000 | 2,691.23 | 9.50 | 998.60 | 1,075.25 | 10,000 | 0 |

At 10,000 entries the sample averaged 269 µs to create a marker, 100 µs for a disk-backed hit and 0.95 µs for a hit on an ID already observed in memory. NTFS metadata allocation and cold OS cache latency were outside this measurement.

### Closure recommendation

**Keep DC-02 open for the valid-empty and temporary-membership case.** The fallback protected previously verified IDs across unavailable, throwing and malformed registry responses and recovered them across process restart. Authoritative ordinary membership restored normal access for a fresh Agent, while the original live Agent retained denial. A fresh Agent observed during a valid but incomplete snapshot can lose its marker. The source treats successful non-Direct results as authoritative and the native fixture observed marker removal in both snapshot cases. Closure needs an explicit disposition of that continuity gap.

The unknown-ID combined condition remains an acknowledged limit of the available identity signals. Effective unrelated-user Windows ACL access, symlink-specific behavior and full Desktop acceptance remain unverified. These results support improved protection for verified IDs in the tested conditions. DC-01 retains its previously documented closure and visibility limitations.

## DC-02 — Final native Host continuity retest

Tested source `b20079d258b7ad8ff71b21b249799413004dbc0b` on `fix/v1.1.1-direct-chat-security-medium`. GitHub reported eight successful Windows and Linux checks for Node.js 22 and 24 on this SHA. [PR #79 checks](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/pull/79/checks)

The installed Windows x64 Harness Desktop, Cordis Host runner, Workspace service and native executor were `0.2.2-rc.5`. RunAsNode loaded services from installed Desktop build `3f85d888b1297107937d9bd5b853f7e733e179a4`, with Electron `44.7.0` and embedded Node.js `24.21.0`. The OS was Windows 26H2 build `26300.10075`. Repository checks used system Node.js `26.10.0`.

The fixture used three successive operating-system processes with the same isolated synthetic profile. Native JSONL persistence and Workspace create, attach, detach and list APIs produced authoritative membership records. The mismatch case used an independently created in-memory Agent Session header with the same synthetic ID and a different cwd, because native attachment validates the stored Session cwd. The fixture supplied empty, unavailable, throwing and ambiguous registry conditions through its service boundary. For the ordinary transfer it supplied the single record from a separate native ordinary Workspace fixture with the same synthetic ID. This exercises installed Host services and production policy with synthetic membership inputs and an offline counter tool.

### Focused continuity matrix

For each row, the marker state refers to that row's Session ID. The two policy probes used the native pre-execute waterfall and the native guard API. The subsequent dispatch went through the installed executor. Every protected denial carried `DIRECT_CHAT_TOOL_DENIED`. Call counts are **attempted / denied / executed**.

| Test | Registry state | Classification and Agent | Marker before → after | Pre-execute / guard / dispatch | Calls | Result |
| --- | --- | --- | --- | --- | ---: | --- |
| T01 | Native Direct Chat membership, Agent cwd differs | Direct Chat via membership, fresh | Absent → one zero-byte SHA-256 marker | Deny / deny / deny | 1 / 1 / 0 | PASS |
| T02 | Valid empty list | Direct Chat via verified identity, fresh | Present → same marker | Deny / deny / deny | 1 / 1 / 0 | PASS |
| T03 | Native Workspace temporarily omits its detached Session | Direct Chat via verified identity, fresh | Present → same marker | Deny / deny / deny | 1 / 1 / 0 | PASS |
| T04 | Native Workspace reattaches the Session | Direct Chat via membership, fresh | Present → same single marker | Deny / deny / deny | 1 / 1 / 0 | PASS |
| T05 | Registry absent immediately after the empty and incomplete snapshots | Direct Chat via verified identity, fresh | Present → same marker | Deny / deny / deny | 1 / 1 / 0 | PASS |
| T06 | Registry absent in a new process | Direct Chat via persisted identity, fresh | Present → same marker | Deny / deny / deny | 1 / 1 / 0 | PASS |
| T07a | Fixture repeats the ID within one ordinary Workspace | Direct Chat via verified identity, fresh | Present → same marker | Deny / deny / deny | 1 / 1 / 0 | PASS |
| T07b | Fixture repeats the ID across two ordinary Workspaces | Direct Chat via verified identity, fresh | Present → same marker | Deny / deny / deny | 1 / 1 / 0 | PASS |
| T08 | Native Direct Chat record plus conflicting ordinary fixture record | Direct Chat via membership, fresh | Present → same marker | Deny / deny / deny | 1 / 1 / 0 | PASS |
| T09 | One native ordinary Workspace contains the ID exactly once | Ordinary after explicit revocation, fresh | Present → absent | Allow / allow / allow | 1 / 0 / 1 | PASS |
| T10 | Confirmed ordinary membership after T09 removes the marker | Direct Chat via prior recognition, already live | Absent → absent | Deny / deny / deny | 1 / 1 / 0 | PASS |
| T11 | Registry absent in a new process after revocation | Ordinary after revocation, fresh | Absent → absent | Allow / allow / allow | 1 / 0 / 1 | PASS |
| T12a | Native ordinary membership | Ordinary control, fresh | Absent → absent | Allow / allow / allow | 1 / 0 / 1 | PASS |
| T12b | Valid empty list | Ordinary control, fresh | Absent → absent | Allow / allow / allow | 1 / 0 / 1 | PASS |
| T12c | Registry absent | Ordinary control, fresh | Absent → absent | Allow / allow / allow | 1 / 0 / 1 | PASS |
| T12d | Registry throws | Ordinary control, fresh | Absent → absent | Allow / allow / allow | 1 / 0 / 1 | PASS |
| T13 | Registry unavailable, unknown identity, mismatched cwd | Source review only. The verified-identity fallback supplies no classification and the cwd check still applies. | No verified marker by definition | No runtime decision collected | — | PARTIAL |

**Numbered totals (T01–T13): 12 PASS, 0 FAIL, 1 PARTIAL, 0 BLOCKED, 0 NOT TESTED.** T07 and T12 contain separate subcases, giving 16 successful native dispatch observations. T13's combined dispatch was not run and contributes no call counts.

| Dispatch observations | Attempts | Denials | Actual executions |
| --- | ---: | ---: | ---: |
| Protected Direct Chat scenarios | 10 | 10 | 0 |
| Sanctioned ordinary Workspace controls | 6 | 0 | 6 |
| **Total** | **16** | **10** | **6** |

The previous validation observed marker removal for a valid empty list and a temporarily omitted Session. T02 and T03 now retain the exact same marker and deny dispatch. T05 checked recovery with the provider absent immediately after those snapshots and before reattachment. T04 then confirmed native reattachment and a single unchanged marker. T06 recovered the marker in a new process. T07 and T08 preserved protection under ambiguous membership. T09 and T11 confirmed durable revocation, and T10 independently verified the previously recognized live Agent's denial after the marker had been removed.

### Regression checks

| Check | Executed result |
| --- | --- |
| `npm test`, before and after the documentation update | 299 tests per run. 297 passed, 0 failed, 2 POSIX-permission cases skipped on Windows. The new continuity test and source documentation-integrity tests passed. |
| `npm run check:client` | Exit 0. Deterministic browser carrier verified. |
| `npm run check:package` | 100 packed files verified. 293 tests, 290 passed, 0 failed, 3 skipped. The package run skipped the two POSIX-permission checks and the source-only documentation-tree check. |
| `npm run check:regression` | 4 tests passed, 0 failed, 0 skipped. Classifier benchmark passed with 56/57 correct. |
| `qa/direct-chat-catalog-host-check.mjs` | 2 passed, including a separate zero-execution denial assertion. |
| `qa/new-plugins-host-check.mjs` | 13 passed. |
| `qa/profile-host-check.mjs` | 1 passed, using installed rc.5 despite the historical rc.3 test label. |
| `qa/adaptive-reasoning-host-check.mjs` | 10 passed. |

The four installed Host suites ran together with 26 passes, zero failures, zero skips and no runtime warnings in the output. The focused fixture emitted no warnings. The npm source and packed suites emitted the existing component-inventory messages from their induced-unavailability checks, two per run. The installed executable and application archive matched their pre-run SHA-256 fingerprints. The retest changed only this documentation in the repository.

### Final closure recommendation

**Close DC-02 for verified-identity continuity.** The retest resolves the two marker-loss conditions underlying the previous FAIL. Empty, incomplete and ambiguous snapshots retained protection. Explicit, unambiguous ordinary membership revoked the identity for a fresh Agent, and all tested ordinary controls kept tool access. There were zero unintended executions in the protected cases.

An unknown identity can still go unclassified when the registry is unavailable and the cwd signal does not identify Direct Chat. This remains a source-reviewed limitation for this retest. Full Desktop acceptance and effective Windows ACL validation remain separate outstanding items. DC-01 retains its existing closure and documented visibility limitations.
