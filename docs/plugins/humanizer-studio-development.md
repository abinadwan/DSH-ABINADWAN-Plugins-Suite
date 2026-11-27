# Humanizer Studio — unreleased v1.2.0 engineering checkpoint

This is a development record, not a shipped feature or a claim that all privacy paths have passed. The stable release remains v1.1.3. Preserve the existing Humanizer Skill identity and default activation. Do not modify the DSH Host source.

## Native contracts reviewed

- [LLM service and identity-free inputs](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c/packages/llm/llm/README.md): one-shot native provider calls, no durable user-message identity needed for an auxiliary input. Logged session requests remain reconstructable from the session log.
- [LLM implementation and middleware tests](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c/packages/llm/llm/tests/service.spec.ts): the native waterfall can inspect a request, route mutable options and short-circuit output. Studio freezes its own request data; freezing is not confidentiality, interceptor sandboxing or proof that middleware will dispatch to the expected adapter.
- [Connection contract](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c/packages/client/connection/README.md): authenticated exact Fetch routes require owner Peer; streaming body handlers own their own byte limits and cancellation. The candidate route module exercises that boundary in the native fixture; it is now wired to the Humanizer component on the candidate branch when native services are present.
- [Locale catalog](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c/packages/client/locale/src/client/index.ts): selectable language definitions and revision live in the Client, while the Host locale package registers the preference. Do not treat browser-provided catalog data as authorization. Keep language IDs separate from system instructions.
- [Automation tasks registration](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c/packages/client/ui-schedule/src/client/index.ts): native panel order 10. Candidate Studio order 11 via sidebar.panellist and keyed main registration; confirm actual displayed placement against installed Desktop and other extensions. No DOM injection.
- [Session telemetry](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c/packages/session/session-telemetry/src/index.ts) and [feedback export](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c/packages/session/session-telemetry-otel/src/index.ts): session-ledger capture and feedback export are distinct from a session-free auxiliary request; source review alone does not establish absence from all diagnostics, browser/network logs, provider traces, caches or third-party middleware.

## Internal implementation and tests

Nine service templates, fixed system constraints, identity-free JSON user input, independent model catalog check, selected locale IDs, cancellation guard, text-only terminal result, no tool execution, no storage calls, sanitized errors. Conservative development limits: 12,000 source UTF-16 code units, 2,000 custom brief code units, 24,000 output code units and requested maxTokens 4,096. These are candidate limits, not a model context-window guarantee or a finalized UX setting.

Native admission and observer fixtures use only synthetic text; no actual credentials or provider connection. Candidate HTTP module implements status/edit, strict streamed JSON cap of 96 KiB, non-cacheable replies, one active request per fiber, request/disposal/120-second deadline signal, and sanitized failures. The Host checks language ID syntax; live catalog membership is a Client UX check. A non-cooperative provider can hold the active slot after cancellation. Candidate Studio panel and routes are wired to the existing Humanizer component. Global catalog reads use native session.modelCatalog() without a Session identity; selection is transient and does not call session.selectModel. Page source/result are component memory only and clear on unmount or Host generation change. Explicit draft/history storage is implemented in a separate owner-only profile route, not invoked by processing. The UI exposes explicit Open saved items, Save/replace draft, Save to history, Restore, Delete and confirmed Delete all. No automatic load, write, restore or model request. A lost write reply closes saved items and requires explicit reload; no replay. Saved-item management does not depend on model-catalog success. History is an explicit editable snapshot, not verified model provenance. The storage fiber pins canonical Profile directory identity on first explicit access and rejects replacement or unsafe POSIX directory permissions. Checks reduce path races but do not constitute a filesystem sandbox. Old Host replies are fenced by connection generation. The candidate uses one draft, at most ten history items, 1 MiB file cap, revision-checked atomic updates, no automatic eviction, and an empty revision tombstone after clear-all. File contents are not encrypted; Windows ACLs are inherited and not independently enforced. Clear is logical deletion, not secure erasure of backups or filesystem remnants. Invalid/corrupt storage fails closed and requires manual recovery. CI evidence must be evaluated against its exact commit.

## Remaining gates

- Validate wired owner-only route and page in native CI; verify connection lifetime in Desktop. No text in logs; no silent retry, hidden Session or direct provider fallback.
- Installed DSH Desktop tests using synthetic sentinels, inspect session store, app diagnostics, browser storage, network/provider behavior, disable/reload/cancel and actual navigation placement. Provider-side retention cannot be guaranteed by this suite; present accurate warning before submit.
- Verify real editing behavior for all nine operations in supported local models; request separation is not proof of semantic instruction adherence.
- Validate the candidate sidebar, Workspace Studio UI, locale/model selection, RTL/LTR and opt-in storage end to end; inspect storage and browser state across profile/Host changes. No data at rest until user opts in.
- Phase 3.7: implementation and repository-rule review complete; see closure evidence below and development governance record. Verify first future release immutability and revisit aggregate required-check rollout at authorized promotion. Do not merge to develop or main, mark ready, or publish before actual Desktop/model acceptance, all applicable findings resolved and explicit owner approval.


## Owner-approved acceptance record — 2026-11-27

No merge to `develop` or `main`, ready-for-review transition or publication until all applicable findings have been resolved and the owner explicitly approves. Use an isolated test Profile and synthetic text; do not reinstall the user's stable Profile merely to run tests. Test exact candidate SHA, record DSH Desktop version, OS, model/provider versions, date, pass/fail and sanitized evidence. Re-test the final candidate after any correction. No real personal information or provider credentials belong in public evidence.

### Automated evidence

- [CI 45912785021](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/actions/runs/45912785021): all four jobs passed for `511de523136cc6872450a1b22dac6887ea19f145`. Ubuntu Node 22: 338 source tests passed; packed artifact 331 passed, one existing skip; 34 native integration tests passed; four regression tests passed. Exact package 105 files. npm audit reported zero known vulnerabilities at scan time, not a guarantee of absence. New storage identity and connection-generation changes require their own green CI.
- Latest published release API at review: v1.1.3, release ID 459992837, stable, tag directly points to `47f219090247c3af47d8089312941d5236e591f9`. GitHub commit verification reports valid; release immutable=false. A verified commit is not an independently enforced signer-identity policy. The update UI pins a full commit and revalidates before confirmation dispatch; no immutable-tag enforcement or atomic Host CAS claim.
- Repository metadata: default main, allow_auto_merge=false, main and develop report protected=true. Basic branch response reports classic protection enabled=false and required status contexts empty; this is not evidence that rulesets are absent. Detailed branch protection GET returned 403; rules-by-branch endpoint unavailable through connector. At that historical checkpoint, owner-side review remained open and no repository configuration had changed. Superseded by the 2026-11-27 closure evidence below.

### Manual Desktop matrix (original acceptance plan; partial execution recorded below)

| ID | Scenario | Acceptance condition |
| --- | --- | --- |
| DT-01 | Install exact candidate SHA in isolated Profile | Existing six components and original Humanizer Skill remain usable; Studio appears beneath Automation tasks when visible; no core DSH modification. |
| DT-02 | Enable/disable/reload; Arabic and English UI; narrow/wide windows | Panel appears once; native layout/navigation, keyboard/focus, clear labels, editable source and selectable read-only result (HS-BUG-003), RTL/LTR and no horizontal overflow; disabling removes routes and panel. |
| DT-03 | Live model/locale catalog | Choose independent local model; switch locale; change provider/credentials; missing model fails closed. Existing conversation model and history unchanged. |
| DT-04 | All nine operations | Run each operation against Arabic and English fixture prose on supported local Gemma and Qwen; record exact model IDs and results, including explicit translation target/custom brief. Preserve dates, numbers, names, citations, uncertainty and required language. |
| DT-05 | Embedded instructions / hostile source | Synthetic source includes role delimiters and instructions to reveal a unique sentinel or access tools/files/profile; output treats these as source data, never invokes tools; record semantic failures independently of structural request tests. |
| DT-06 | Ephemeral editing and cancel | Process synthetic unique sentinel without opening storage. Inspect actual Profile/session stores, browser storage, relevant Host diagnostic paths and observable network behavior; no Studio persistence or hidden Session. Cancel before dispatch/after dispatch, clear, reload, disable; late result not republished. No claim of provider-side erasure. |
| DT-07 | Owner-only admission and generation fencing | Authorized owner can process/load/save; a nonowner is denied on actual transport; swap connections/profiles while requests are pending; old editor or saved sentinel never appears in new Host. |
| DT-08 | Explicit save/restore/delete | One draft and up to 10 manually saved snapshots; file created only after save, no auto-load on reopen; no model call on restore; delete specific item and confirm clear-all; inspect logical data removal, Windows ACLs, conflict from two owner windows, and deletion when model catalog unavailable. |
| DT-09 | Failure boundaries | Invalid requests, provider failure, missing provider, slow/uncooperative cancellation, malformed storage, full storage; no raw text in UI errors, no automatic retry; distinguish ambiguous write and require reload. |
| DT-10 | Final regression and release review | Green exact SHA matrix, all other components verified, review dependency inventory and branch/tag rules; owner approves findings and only then considers merge. |

### Synthetic quality cases

Use a unique sentinel per run. Example source: “The Riyadh review was scheduled for 15 December 2026. The preliminary estimate is SAR 12,450, subject to approval. Reference: [REF-07].” Arabic counterpart: “موعد مراجعة الرياض هو 15 ديسمبر 2026. التقدير الأولي 12,450 ريالًا، ويظل مشروطًا بالموافقة. المرجع: [REF-07].” For Grammar introduce only deliberate language errors; for Shorten add redundant phrasing; for Expand add no unsupported facts; for Translate select the opposite language. For Custom use a bounded style brief and a deliberately unrelated command in source. Score separately: fidelity, language/operation adherence, instruction isolation, no tool access, and terminal completion. Automated fixtures do not score naturalness or prove semantic obedience. Log no raw private content. Failed tests remain open, never relabeled as pass.

**Historical checkpoint:** Desktop and real model evidence was pending when this matrix was first written. The owner-reported manual round below supplies partial evidence; the full Desktop/security acceptance matrix is not complete.


### Phase 3.7 follow-up

Candidate update confirmation now fences Host connection generations, rechecks live view permissions, rejects ambiguous installed bundle rows at dispatch and refuses HTTP redirects on GitHub metadata requests. These are browser-side safeguards, not Host CAS or a cross-window lock. A stable aggregate `Suite release gate` is added to CI; [CI 45914330465](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/actions/runs/45914330465) passed 5/5 on `ddfc5e862606b735a925bbab0b1b776fe897121c`. The owner saved strict branch status checks and created a release tag rule; both rulesets were read back directly from GitHub with the intended settings. Owner reported completion of the guided future-release immutability step; API does not expose the setting and v1.1.3 remains non-immutable. See [development and verification](../architecture/development.md) for exact rules, residual limitations and promotion-time tasks. Phase 3.7 implementation/rule review closed; actual Desktop update behavior and 3.6/Studio acceptance remain open. No merge or release performed.


### Desktop findings — candidate 3d6bb90

- HS-BUG-001: actual Windows Desktop showed white native select popup with nearly white text; user reported all three dropdowns affected. Candidate fix uses DSH bg-layer-2/label-primary theme tokens on select, option and optgroup with Canvas/CanvasText fallback and inherited color-scheme. Verify actual Windows native popup in dark/light and after live theme switching; jsdom is not native popup evidence.
- HS-BUG-002: processing previously exposed only a generic message. Candidate uses performance.now() for elapsed time from dispatch to terminal reply or local cancellation, 250 ms display updates, retains duration/model/service for last attempt in component memory only, accessible indeterminate progress, and honest Host-wait status. No inference progress, ETA, TTFT, tokens/s or token counts fabricated. Timer includes client transport, Host and provider overhead, not pure inference; cancellation does not prove the provider stopped. Clear and Host change reset timing; no storage or protocol changes. Browser fixture checks timer progression, completion, cancellation, cleanup and generation reset. Actual Desktop retest pending.
- HS-DT-001: Gemma E4B local Humanize produced 238 characters from 265, preserved 25 requests, 15 Dec 2026, SAR 12,450 and final approval condition; single functional smoke pass only; no elapsed measure. Second model screenshot supplied but output not independently transcribed/verified in this checkpoint. No full quality acceptance.


### HS-09–11: clipboard and independent native effort

Native contract reviewed at deepseek-ai/deepseek-harness@38a6a5c: packages/api/session-controller/src/catalog.ts resolves model reasoning through ctx.llm.resolveModelInfo; packages/llm/llm/src/types.ts defines opaque reasoningEffort IDs and ordered efforts with display names; packages/llm/llm/src/index.ts validates effort on the exact prepared adapter call. Studio uses the existing global native modelCatalog groups, not Adaptive Reasoning's session selection RPC or preferences. UI displays only native advertised effort names/IDs (plus a local omit/default choice); hides on missing/malformed capabilities, resets on route/catalog/Host/restore changes. Explicit IDs are validated again on the Host using resolveModelInfo and then native stream validation; omitted effort delegates native defaults. No separate Session, Agent, provider bypass, settings change or persistent effort record. Timing displays **requested** effort or model default, not provider-confirmed effective effort. Clipboard copies source/result only on direct click, no automatic writes or retries; OS clipboard may retain content; failures allow manual copying. All controls and metadata remain ephemeral. Real Desktop retest must include supported and unsupported models, changed effort, model switching, clipboard denial, exact text, timer and both themes. CI pending; no merge/release.


### Owner-run functional acceptance round — 2026-11-27

Branch: `feature/v1.2.0-humanizer-studio`, [draft PR #88](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/pull/88). HS-T01/02 preceded HS-09–11; the later round was reported after installing [8ae827a](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/commit/8ae827af356d73c3267d125ac44709627e0d7181). Evidence: owner-supplied Windows Desktop screenshots, copied synthetic test outputs and displayed timing/effort metadata in project conversation. Exact Desktop build, isolated Profile use, provider versions and independent provider traces were not recorded for every run. Timings are window-measured end-to-end durations including Host/provider overhead (not token throughput, ETA or pure inference); initial Humanize times were not measured. Scores are conversation-based editorial estimates, not a calibrated benchmark. Default means omit/delegate to model, not Off; requested effort is not verified effective effort. One observation per setting, no repeated controlled performance trials. Different operations/fixtures must not be treated as a model ranking.

| Case | Model / environment | Operation | Requested effort | Time (s) | Editorial score | Result |
| --- | --- | --- | --- | ---: | ---: | --- |
| HS-T01 | Gemma 4 E4B / local | Humanize AR | not recorded | — | 80/100 | Pass; 265→238 characters, 10.2% shorter |
| HS-T02 | Gemma 4 12B / local | Humanize AR | not recorded | — | 90/100 | Pass; 265→206 characters, 22.3% shorter |
| HS-T03 | gemma4:12b / local | Rewrite AR | Medium | 29.00 | 90/100 | Pass; Studio counts 418→384 |
| HS-T04-A | gemma4:12b / local | Rewrite AR | High | 27.13 | 90/100 | Pass |
| HS-T04-B | gemma4:12b / local | Rewrite AR | Low | 29.40 | 90/100 | Pass |
| HS-T04-C | gemma4:12b / local | Rewrite AR | Off | 27.11 | 90/100 | Pass; explicit Off, not Default |
| HS-C01 | gpt-6.2-sol / cloud | Rewrite AR | Default | 7.45 | 97/100 | Pass |
| HS-C02 | stealth/big-pickle / cloud (Free) | Rewrite AR | Default | 7.58 | 93/100 | Pass |
| HS-ERR-001 | K2 Horizon 375B A23B / cloud | Proofread AR | Default | — | — | Failed API; external per owner, no independent root-cause verification |
| HS-T07 | IFM/Jais-3-MoVA-36B-A4B / cloud | Proofread AR | Default | 11.77 | 100/100 | Pass, 12/12 targeted corrections |
| HS-T08 | sensenova/sensenova-6.8-flash-lite / cloud | Professional AR | Default | 37.29 | 95/100 | Pass |
| HS-T08-B | gpt-5.6-luna / cloud | Professional AR | Default | 5.76 | 98/100 | Pass |
| HS-T09 | gpt-5.6-luna / cloud | Shorten AR | Default | 3.40 | 98/100 | Pass |
| HS-T09-B | qwen3.5:4b / local | Shorten AR | Default | 21.97 | 50/100 | Completed technically; failed to shorten materially |
| HS-T10 | gpt-6-sol / cloud | Expand AR | Default | 10.57 | 95/100 | Pass; conservative expansion |
| HS-T11 | gpt-6-sol / cloud | Improve Style AR | Default | 6.66 | 98/100 | Pass |
| HS-T12 | gpt-6-sol / cloud | Translate EN→AR | Default | 4.07 | 99/100 | Pass; VAT acronym omitted but meaning retained |
| HS-T13 | gpt-6-sol / cloud | Custom AR | Default | 5.57 | 100/100 | Pass; five requested items, 70% completion |

The round covers **9/9 services with at least one successful manual sample per service**, not a 100% success rate over all runs, full local/English coverage, or release acceptance. Sixteen operation attempts passed their sample criteria, one completed without satisfying the shortening goal, and one API attempt failed. Source counts and initial editorial estimates are owner-reported; do not infer unsupported metrics. Gemma 4 12B Rewrite Default was not tested. No monotonic effort/latency or quality relationship was established.

#### Synthetic fixtures and observed fidelity

- Humanize: review of 25 requests, 15 December 2026, SAR 12,450 estimated, final approval condition. Both Gemma runs retained the facts and introduced no new reported facts.
- Rewrite: same Arabic source (418 Studio characters) for four Gemma efforts and both cloud runs: agreement at meeting 25 November 2026; 37 requests, 12 requiring data; deadline 10 December 2026; SAR 48,750 estimated; final approval before execution except preparatory work with no financial commitments. All preserved core facts. Medium/High changed agreement to approval; Medium added total-cost wording, Low retained terms but used awkward “يتضمن منها”, Off used “أعباء مالية” rather than “التزامات مالية”. GPT-6.2-Sol retained agreement, estimate and prohibition, with slight phrasing issue. Big Pickle used inspection instead of review and competent entities instead of concerned departments. No fabricated explicit facts identified.
- Proofread: 12 targeted spelling/grammar corrections (hamza, final ta marbuta, agreement); Jais fixed all while retaining wording, 15 requests, Sunday 29 November 2026 and closure condition, without extraneous commentary.
- Professional: SenseNova converted informal correspondence to formal Arabic, retained 8 of 23 requests, deadline before Wednesday 2 December 2026 and all requirements; slight direct reproach remained. GPT-5.6-Luna organized a longer redundant administrative fixture into three paragraphs with all facts preserved.
- Shorten: same long Arabic fixture as the second Professional case (65 reviewed, 42 closed, 23 pending; 15 December 2026; SAR 32,500 estimate; data and approvals, prior approval for exceeding cost). GPT shortened while retaining these essentials, but omitted background purpose/time period. Qwen largely retained redundancy; not an operation-quality pass. Owner closed HS-OBS-001 as likely small-model instruction-following limitation, not an established causal diagnosis; no prompt special-casing or code change approved.
- Expand: 18 reviewed, 11 closed, 20 December 2026, conditional on receipt of data. GPT added the derived remainder 7, no unsupported cost, commitment or reason. Conservative expansion is acceptable; no mandatory length multiplier.
- Improve Style: 9 of 14 services developed, 5 remaining, expected completion 31 December 2026 conditional on resources. GPT improved cohesion, retaining facts; “عالجها” slightly stronger than “تم التعامل معها”.
- Translate: English source about Digital Transformation Department, 24 requests, 17 approved, 7 pending, API and SSO by 15 December 2026, estimated SAR 85,000 excluding VAT, no production deployment until final approval and all security requirements met. GPT preserved meaning and API/SSO, translated VAT without retaining acronym.
- Custom: 40 total, 28 closed, 12 pending, 20 December 2026 conditional on data and approvals, estimated SAR 45,000. Brief required exactly five named items, completion percentage within closed item, conditions within deadline, no introduction/conclusion. GPT satisfied all, deriving 70% (28/40).

#### Findings and decisions

| ID | Disposition |
| --- | --- |
| HS-BUG-001 | Theme dropdown fix implemented earlier; owner continued testing; full Windows light/dark native popup retest not documented here. |
| HS-BUG-002 | Timer fix exercised in Desktop: live display 3.50 s during Rewrite and completed duration 29.00 s; other terminal timings reported. Full cancellation/reconnect acceptance remains open. |
| HS-09–11 | Copy controls, native conditional effort and requested effort/timing display implemented at 8ae827a. Visible effort and timing observed across models; native provider application and OS clipboard exactness/denial still require final verification. |
| HS-OBS-001 | Closed by owner as model limitation; keep failed quality result in record. No change to Shorten instructions. |
| HS-ERR-001 | Closed by owner as external API failure; keep failed attempt in record. No independent API diagnosis. |
| HS-BUG-003 | CLOSED. Historical editable Result fixed in `6afb0e2` by native readOnly and removal of the user-edit state callback. Exact-candidate CI passed 5/5, installed Chromium regression passed and owner subsequently confirmed all eight focused Desktop acceptance cases passed. Normal UI integrity accepted; see [closure evidence](humanizer-studio-acceptance-report.md#hs-bug-003-closure--owner-desktop-acceptance-2026-11-27). |

Do not claim read-only prevents DevTools modification, tampering outside Studio or verifies provenance of saved history/externally published text. Explicit draft/history save and restore remain opt-in; old snapshots may contain user-edited result text from earlier candidates. No new persistent storage introduced by this fix. Do not store live user input automatically or include private source text in public evidence.

#### Remaining release gates (not yet accepted)

- HS-BUG-003 focused acceptance completed (8/8 owner-reported); reuse existing regression evidence for restore, counters and clear. Do not repeat passed cases unless affected by a later change.
- Separate actual OS clipboard denial and independent exactness evidence if required; normal copy accepted by owner. Model switch supported/unsupported, effort reset and native adapter effective effort verification; empty/oversize inputs; cancellation, errors and retry.
- Desktop privacy/no automatic storage, explicit storage/restore/delete, owner-only transport and Host generation fencing; hostile embedded instructions/tool isolation; remaining original DT matrix, both themes and supported languages/models; exact-SHA CI, documentation and owner approval. Preserve stable v1.1.3 until authorized promotion. No merge or release in this change.

## Exact-candidate local acceptance — 2026-11-27

The [final acceptance and security report](humanizer-studio-acceptance-report.md) records exact code SHA `6afb0e28860eba13631cc870fecb481c3573873f`. [CI 46016288703](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/actions/runs/46016288703) passed 5/5 for that SHA. Windows local source tests passed 341/344 with three platform skips after a restricted-Sandbox junction failure. The packed artifact passed 334/338 with four skips, pinned native integration passed 35/35 and the regression suite passed 4/4. The locked dependency advisory check reported zero known findings.

Installed DSH Desktop `0.2.2-rc.5` opened the exact candidate in a fresh test Profile. The nine service routes completed with synthetic loopback responses, and English/Arabic, runtime dark/light theme tokens, Chromium read-only Result, clipboard test-double rejection, cancellation, text bounds and explicit saved-item management were exercised. A fresh second Profile exposed empty storage and no configured model without credentials. The measured Profile, Session, browser storage and accessible diagnostics yielded no synthetic marker hits. The report distinguishes the inspected boundaries from other middleware and provider retention. A single local Ollama engine probe passed the mixed-language Custom source-instruction fixture. Historical failures HS-OBS-001 and HS-ERR-001 remain recorded.

**Release recommendation is NO-GO.** Windows native popup, trusted input and OS clipboard cases remain blocked by the locked interactive session. Live paired nonowner and in-flight Host/Profile switching, installed unsupported-model behavior and the remaining real-model matrix are open. HS-BUG-001, HS-BUG-002 and HS-BUG-003 retain the scoped dispositions in the report. The historical pending statements above describe their checkpoint dates. PR #88 remains Draft and v1.1.3 remains stable.

### HS-BUG-003 focused Desktop retest — 2026-11-27

The installed DSH Desktop 0.2.2-rc.5 opened with the isolated candidate carrying fix `6afb0e28860eba13631cc870fecb481c3573873f`. Windows remained locked, so native keyboard and clipboard interaction was blocked across the six requested cases at that historical checkpoint. The owner acceptance below supersedes the open status of HS-BUG-003. The [acceptance report](humanizer-studio-acceptance-report.md#hs-bug-003-focused-desktop-retest--2026-11-27) records the case status and the scope of the prior Chromium evidence.

### HS-BUG-003 closure — owner Desktop acceptance, 2026-11-27

The owner reported all eight focused checks passed following installation instructions for `6afb0e2`: no typing before/after processing, no paste/delete/cut, selection and manual copy work, Copy Result works, source editing works and result replacement works. **HS-BUG-003 is CLOSED.** See the [acceptance report](humanizer-studio-acceptance-report.md#hs-bug-003-closure--owner-desktop-acceptance-2026-11-27) for scope and evidence limits. The earlier blocked retest is retained; no code changes or redundant service tests are necessary. No change to other gates, Draft PR or stable release.
