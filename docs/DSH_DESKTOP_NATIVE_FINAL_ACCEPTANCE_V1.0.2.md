# DSH Desktop native acceptance for v1.0.2

**23 November 2026, Asia/Riyadh**

## Current v1.0.2 acceptance dispositions

The owner agreed to the following scope decisions on 23 November 2026. Sections A–L record the original Windows acceptance run, including its verdicts, counts, observations and release assessment at the time. The current dispositions below apply to release-gate tracking. No new native retest was run for these decisions.

| Task | Original native verdict | Owner disposition for v1.0.2 | Suite responsibility |
| --- | --- | --- | --- |
| 02 — Peer and Windows ACL | BLOCKED | **Out of Scope — Upstream DSH Host / Windows.** General Peer authentication and isolation, effective Windows ACLs and OS security are outside suite acceptance. | Suite-owned Settings and Direct Chat routes must enforce the applicable Host authorization and deny unauthorized reads and writes. The owner-route results and fixture checks retain their original coverage. Native non-owner route behavior remains unverified. |
| 03 — Host diagnostic logs | BLOCKED | **Out of Scope — Upstream DSH Host.** Internal Host diagnostic sinks and Host-generated log redaction are outside suite acceptance. | Suite-owned logs and warnings must redact sensitive data, including when handling Host errors. PR #55 covers synthetic browser warnings. Installed suite-warning coverage remains unverified. Provider Error Exposure is tracked separately under Task 09. |
| 04 — Host Session-log upload and process-wide network egress | BLOCKED | **Out of Scope — Upstream DSH Host.** Host upload defaults and consent, Host-originated connections and process-wide traffic attribution are outside suite acceptance. | Suite-initiated connections and data transfers remain in scope and require authorization. Loopback captures cover the sampled provider requests. The two observed nonloopback HTTPS connections remain unclassified, with no confirmed Session-log upload. |
| 05 — Native two-client Settings UI | BLOCKED | **Waived — Not Applicable to the supported My Profile UI workflow.** The supported workflow does not allow two independent instances of the My Profile Settings page to edit the same Profile simultaneously. Reopen the test if DSH adds supported multi-window or multi-client editing for one Profile. | Keep revision checks and the existing stale-write, draft-preservation and retry tests. Fixture results retain their original scope. The native two-client case has no Pass verdict. |
| 06 — Disconnect, reconnect and mid-write recovery | BLOCKED | **Closed for v1.0.2 by owner-approved scope decision — Host/OS fault injection waived.** Local committed-settings persistence and orderly DSH Desktop/Host restart passed in the tested workflow. Artificial Host transport interruption, abrupt process termination during a write and OS power-loss crash-consistency guarantees belong to the DSH Host/OS boundary and are not suite release gates without a reproduced suite defect. Reopen if a supported workflow reveals one. | Suite UI must not report false Save success, must preserve supported drafts on rejected writes, fence stale responses and provide deliberate recovery/retry. Source/React tests cover stale-response and draft handling; installed Desktop confirmed real Save refusal and explicit retry, committed settings recovery and orderly restart. These separate results do **not** convert the original native mid-write/transport **Blocked** verdict to Pass. |

[Suite Settings revision regression](../test/personal-profile-sidebar.test.js#L81) · [rc.4 Settings evidence](DSH_DESKTOP_SETTINGS_RETENTION_RECOVERY_V1.0.2_RC4.md) · [Source authorization and warning evidence](DSH_SOURCE_ACCEPTANCE_HARDENING_V1.0.2.md)

- **H04 remains closed** by owner acceptance of the 1,000-Session supported scope. The original 10,000-Session stress test retains **Fail**, with 8,185 titles searchable before opening. [H04 decision](DSH_H04_SEARCH_SCOPE_AND_HIGH_LOAD_RESULT_V1.0.2.md)
- **MP02 remains closed** under the owner-approved fail-closed privacy contract. The original structured historical provider-wire criterion retains **Blocked**. [MP02 decision](DSH_MP02_FAIL_CLOSED_PRIVACY_ACCEPTANCE_V1.0.2.md)
- **Provider Error Exposure remains Fail and an open release gate.** Task 09 recorded all five fictional provider-error canaries in the failed-turn UI. The Host diagnostic-log scope decision does not change that result. [Task 09 evidence](#provider-error-exposure--upstream-source-review-documentation-only)

[Issue #53](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/issues/53) remains open for the remaining gates. This record covers only the five scope decisions above and grants no release approval.

## A. Executive summary

**NOT READY.** The installed Windows run confirmed a suite privacy defect and an upstream provider-error display failure. The suite fix stopped the previously leaking custom-preference continuation before the provider on the same Session after a cold restart. A continuation through the native custom OpenAI-compatible adapter completed with the revoked preference absent. The installed Host displayed all five fictional canaries from a provider rejection. The remaining gates include the original MP02 structured historical-wire criterion, live Peer and Windows ACL boundaries, diagnostic redaction, process-wide egress attribution, native fault timing, and assistive technology.

| Native task verdict | Count |
| --- | ---: |
| PASS | 0 |
| FAIL | 1 |
| BLOCKED | 9 |
| NOT TESTED | 0 |

Each task has one verdict. The matrix preserves failures, partial passes and missing evidence within the task. The MP02 defect was reproduced, fixed and retested within the approved recognizable-custom-text scope. Its independent structured historical-wire criterion remains blocked. [Issue #53](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/issues/53)

## B. Environment and artifact identity

| Item | Verified value |
| --- | --- |
| Windows | Professional x64, 26H2, build 26300.10075 |
| Installed Desktop | 0.2.2-rc.5, executable product resource 0.2.2.0, Electron 44.7.0 / Chromium 152.0.7977.130 |
| Embedded Host | Installed CLI reported 0.2.2-rc.5 |
| Runtime | Bundled Node.js 24.21.0, npm 11.19.1, bundled pnpm 11.28.5. Workstation default Node.js 26.10.0. Local candidate verification used the bundled Node 24. |
| Installed Desktop archive SHA-256 | `5ec8acd9e72b93b6680c953c1be44a729fd3a5170e472e8025690a1713d20f69` |
| Fetched `develop` baseline | `397c3c56e07b0d1465131e6860cff406893df929` |
| Baseline suite tarball | 1.0.2-rc.5, SHA-256 `973baa8f8d8c23138eb43d96da5aa8b8ce33d656cdf3dde68648801a8a897b4f` |
| Fixed runtime SHA | `b0f7b6c4ece070d3af3964aa665298bb01bdf5b3` |
| Fixed suite tarball | 1.0.2-rc.5, SHA-256 `38b0a137eaf6700cbfc0ff15d513c75a377a5a8bcefbc9b4052617711154db1d` |
| Installed artifact parity | Baseline and fixed packages each matched all 94 listed files by SHA-256. The fixed candidate was installed through the embedded DSH CLI before the cold native retest. |
| Isolation | Disposable DSH home, Electron user-data directory, working directory, temporary files and synthetic model credentials. One local owner under the workstation Windows principal. No second authenticated Peer or disposable Windows principal was available for this run. |

The loopback recorders authenticated test requests. Exact DeepSeek Messages fixture payloads and Windows socket evidence remain private and local. The OpenAI-compatible recorder retained route, request-class and canary-presence summaries. Timing, canaries, and results refer to the installed Windows binaries above. This report is outside the npm package allowlist. [Baseline commit](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/commit/397c3c56e07b0d1465131e6860cff406893df929) · [Privacy fix](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/commit/b0f7b6c4ece070d3af3964aa665298bb01bdf5b3)

## C. Ten-task acceptance matrix

| ID | Priority | Expected behavior | Native result | Evidence | Fix | Remaining risk | Release impact |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 01 / MP02 | High | Saved consent governs fresh and historical provider transmission | BLOCKED | Structured private and selective share verified. Recognizable custom replay reproduced and retested after the fix. | `b0f7b6c` | Original structured historical-wire criterion, transformed history and ambiguous legacy prompt boundaries | Privacy gate open |
| 02 | High | Owner access and non-owner denial, including effective Windows ACLs | BLOCKED | Owner prepare, discovery and creation-order routes returned authorized responses. | None | Second authenticated Peer, relay and Windows principal unavailable | Authorization gate open |
| 03 | High | Sensitive canaries excluded from inappropriate native diagnostics | BLOCKED | Provider canary run was captured in the renderer. The sampled Host stdout/stderr had zero canary matches. | None in this round | Target Host warning paths and all relevant sinks remain unverified | Diagnostic privacy gate open |
| 04 | High | Document whether the Host uploads Session logs independently of model routing | BLOCKED | Upload enabled initially, disabled through Settings and persisted. Both loopback and nonloopback TCP connections observed. | Upstream investigation needed | TCP sampling cannot classify upload contents, short connections, UDP or full process egress | Privacy gate open |
| 05 | Medium | Two native clients reject stale Settings writes and recover draft safely | BLOCKED | Single-owner native Save passed. Mounted and pinned tests verify revision conflicts separately. | None | Two supported authenticated clients of one disposable Profile unavailable | Consistency gate open |
| 06 | Medium | Disconnect, reconnect and interruption preserve authoritative state | BLOCKED | Renderer reloaded during a live delayed synthetic turn and recovered the completed response. Cold restart reopened saved data. | None | Transport/acknowledgement timing and mid-write fault unavailable | Recovery gate open |
| 07 | Medium | Safe catalog faults and ordinary Direct Chat behavior at supported scale | BLOCKED | Authenticated lookup, mixed-direction rename and search verified. Cold check found title metadata for 1,000 of 1,000 registered Sessions. Forward/back paging and sampled title and ID queries passed. | PR #55 is in the baseline | No supported native 409 mutation, metadata delay, forced rename refusal or partial-catalog fixture | Host-dependent cases open |
| 08 | Medium | Installed keyboard, accessible names, AT speech, RTL, scaling and offline states | BLOCKED | Keyboard focus and named History dialogs in English and Arabic, plus RTL mixed title search | None | Narrator speech, NVDA, high contrast, OS scaling, full reflow and offline announcements | Accessibility gate open |
| 09 | Medium | Provider errors remain neutral and Humanizer lifecycle and quality work | FAIL | DeepSeek Flash/Pro and custom OpenAI-compatible localhost confirmed. DSH rendered all five provider error canaries verbatim. | Upstream Host owner action needed | Resolver and adapter error handling, live providers and real rewriting quality | Native provider-error criterion failed |
| 10 | Medium | Failed installation reports failure and known-good package/data can be recovered | BLOCKED | Malformed archive exit 1, prior reinstall and valid revision upgrade both exited 0. Cold recovery and selected data hashes verified. | None | Failure tested before replacement. Mid-update interruption and GUI rollback guarantees remain unverified. | Update-recovery gate open |

## D. Detailed findings

### 01. Personal Profile and historical revocation

On the baseline, all three structured sharing controls started Private. The fresh primary request omitted the fictional name and nationality. After allowing only the name, the primary request included it and omitted the other synthetic fields. After Save with name permission revoked, the historical attempt produced no matching provider request. A fresh request omitted the name. The strict structured historical-wire criterion remains **BLOCKED** because refusal occurred before serialization. The owner approved extending the existing refusal to recognizable revoked custom text and has not accepted structured refusal as a substitute for its original wire criterion.

The separate custom preference was absent when unshared and present in the authorized primary system prompt. After saving revocation, a continuation of that same native Session serialized the marker in the earlier system prompt and reached the authenticated loopback server. The next fresh Session omitted it. This was one confirmed baseline example of unauthorized replay of fictional content. The fix was reinstalled and the existing authorized Session was reopened after an orderly cold restart. The follow-up showed the neutral suite refusal and zero matching requests. The subsequent fresh Session completed. Its primary and auxiliary requests omitted the name and custom markers. The fixed native OpenAI-compatible route sent the custom marker only during consent and continued the same Session after revocation with the marker absent from the outgoing request. [rc.2 privacy acceptance](DSH_DESKTOP_SECURITY_ACCEPTANCE_V1.0.2_RC2.md)

### 02. Peer authorization and ACLs

The disposable owner called the native Direct Chat prepare, catalog and creation-order routes directly. All returned HTTP 200 and `no-store`. The regular catalog returned the Workspace identity, the bounded creation lookup returned nine admitted creation entries in the baseline fixture, and prepare returned the expected disposable path. Normal owner Settings edits persisted. The supported non-owner access and neutral denial requirements need a configured isolated relay and second authenticated Peer. Effective ACLs, alias, junction and symlink tests with a restricted principal need a separate authorized Windows test account. The pinned Host authorization and Windows junction tests exercised only their own fixtures. [Source hardening review](DSH_SOURCE_ACCEPTANCE_HARDENING_V1.0.2.md)

### 03. Native diagnostic redaction

Using fictional canaries for a path, personal detail, provider token, Session identifier and payload, the test recorded a local HTTP 400 and the resulting installed renderer. It displayed all five provider-supplied canaries through the native turn failure surface. The captured stdout/stderr of the disposable Host contained zero matches for these canaries. That result covers the captured streams in the observed provider scenario. Suite-owned preparation, catalog, unauthorized access, rename refusal, Settings failure and component initialization/cleanup warnings require corresponding safe installed diagnostic triggers and access to the applicable sinks. The source warning-redaction regression merged in PR #55 covers synthetic browser warnings. [PR #55](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/pull/55)

### 04. Session-log upload and egress

A fresh disposable Profile displayed **Upload Session Log when using the official model API** as enabled on first inspection before sending a turn. Testing switched it off through General Settings, then verified the value stayed off after restart. The launcher also used the Host telemetry-disabled flag. The label identifies the intended official-API scope. Upstream confirmation of consent semantics and enabled-state delivery remains outstanding.

A 50-second IPv4 TCP sampling window used Windows `netstat` and a verified snapshot of the five processes in the disposable tree. The 183 samples contained 64 rows for the approved local provider endpoint. The primary successful and rejected requests were recorded by that endpoint. Two separate established nonloopback HTTPS connections were present throughout the window, one in an Electron utility process and one in another DSH process. Their purpose and transmitted content were unclassified. Counts are socket observations and can repeat the same connection. This method cannot establish whether traffic was background/update activity, whether any Session logs were uploaded, or whether disabling the setting fully isolates network egress. Enabled-state upload requires an approved isolated destination and explicit authorization. [rc.5 security evidence](DSH_DESKTOP_PROVIDER_ACCESSIBILITY_FINAL_ACCEPTANCE_V1.0.2_RC5.md)

### 05. Concurrent Settings clients

The single local owner exercised revision-checked native Profile saves. The mounted and pinned fixtures cover stale writes, retained drafts and explicit retry in their respective environments. The second authenticated same-Profile Settings client was unavailable, so the Personal Profile, Chat Control and Adaptive Reasoning native conflict paths remain **BLOCKED**. [rc.4 Settings acceptance](DSH_DESKTOP_SETTINGS_RETENTION_RECOVERY_V1.0.2_RC4.md)

### 06. Disconnect, reconnect and persistence

On the fixed runtime, the renderer was reloaded while the installed Host was visibly generating a delayed loopback turn. The same turn and its completed reply were visible after reload. Cold quit/relaunch also recovered the previously authorized Session and committed Settings. The reload interrupted the client view while the provider and Host could continue. Stale acknowledgements and draft behavior across an interrupted Settings write require an independent supported transport break. An in-flight write fault with crash consistency requires a supported disposable fault mechanism. [rc.4 recovery evidence](DSH_DESKTOP_SETTINGS_RETENTION_RECOVERY_V1.0.2_RC4.md)

### 07. Direct Chat catalog scenarios

| Case | Native result | Observation or prerequisite |
| --- | --- | --- |
| A / 409 CHANGED | BLOCKED | PR #55 is present. Source coverage passes. A synchronized supported installed registration mutation during metadata reads was unavailable. |
| B / Native Host timeout | BLOCKED | The normal creation lookup returned authorized metadata in the small fixture. A supported delay in the native metadata reader is required for the timeout and recovery verdict. |
| C / Rename refusal and retry | BLOCKED | Ordinary rename produced the persisted mixed-direction title and the Arabic UI found it. A supported Host refusal with retained proposal and explicit retry remains open. |
| D / Partial catalog | BLOCKED | Historical installed duplicate membership made the whole catalog unavailable and failed closed. A usable Host response carrying one ambiguous row remains unavailable. |
| E / In-scope regression | PASS | On the fixed SHA, the cold fixture contained 14 native records and 986 synthetic persisted records. All 1,000 registered rows had title metadata before opening. First page exposed 25 rows and next/previous navigation passed. Sampled exact title and ID, composed/decomposed Unicode, Arabic, and the earlier native rename resolved. Creation selection showed Last Activity fallback. A separate admitted Default Workspace control was excluded by ID and title. Creating that control also left one blank Direct Chat registration, so the follow-up isolation check observed 1,001 registrations and 1,000 titled rows. The supported-size result is from the preceding cold check. |

H04's supported inventory is 1,000 registered Sessions. The owner accepted the historical high-load result as outside the supported scope. The 10,000-Session trial retains its original **Fail** verdict with 8,185 titles searchable. Those counts are historical, from the documented installed Windows runs rather than this task. [Owner decision](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/issues/53#issuecomment-7105688964) · [rc.3 Direct Chat acceptance](DSH_DESKTOP_DIRECT_CHAT_ACCEPTANCE_V1.0.2_RC3.md)

### 08. Accessibility and internationalization

| Area | Native result | Evidence |
| --- | --- | --- |
| Scoped keyboard navigation | PASS | Trusted renderer keyboard actions opened History with Enter, Tab reached search and Escape restored focus to the invoking button in English and Arabic. |
| Accessible names | PASS | Installed Chromium accessibility tree exposed the History dialog by its localized name in both languages. The search input reported focus-visible and an outline under keyboard navigation. |
| Arabic RTL and mixed directions | PASS | Native General Settings switched to Arabic. History rendered RTL and found the mixed-direction fictional title. Mouse interaction independently opened search/settings, renamed the row and changed locale. |
| Narrator and NVDA | BLOCKED | Narrator binary version 10.0.26100.10075 was present. Speech output, Arabic announcement ordering and NVDA were unavailable for verification in the authorized setup. |
| Windows contrast, display/text scaling and reflow | BLOCKED | An isolated Windows display profile for changing system accessibility settings was unavailable. Measured contrast and full visual reflow remain open. |
| Offline and disconnected announcements | BLOCKED | Renderer reconnect was exercised. A controlled disconnect with an observable assistive announcement remains unavailable. |

### 09. Providers and Humanizer

| Area | Native result | Evidence |
| --- | --- | --- |
| DeepSeek Host adapter | PASS | Authenticated local capture for `deepseek-flash` and `deepseek-v4-pro`. Flash-to-Pro selection retained the current fictional conversation. |
| OpenAI-compatible Host adapter | PASS | Manual native model registration used a verified loopback Chat Completions URL. An authenticated fresh turn and same-Session continuation completed on the synthetic model. No requested reasoning effort was serialized for the route that advertised none. Individual payload summaries recorded current consent control. |
| Provider rejection and recovery | FAIL | HTTP 400 was shown as a failed native turn and a separate fresh turn recovered. The failure UI displayed the provider's five fictional canaries verbatim. Neutralization belongs where the embedded Host maps provider failures to native turn diagnostics. Authentication rejection, rate limit and a true adapter timeout remain open. |
| Humanizer Skill lifecycle | PASS | The enabled Skill appeared in primary native wire metadata. After disabling Humanizer in Plugin Manager, the newly opened synthetic Session continued without Skill discovery. |
| Real external compatibility and Humanizer quality | BLOCKED | No approved external credentials or real model inference were used. Future quality review should score instruction compliance, fact/meaning and uncertainty preservation, requested language, and fluency on fictional examples. The canned local replies verify routing and lifecycle. |

#### Provider Error Exposure — upstream source review (documentation only)

**Native observation (confirmed Fail).** The installed DSH Desktop / embedded Host `0.2.2-rc.5` rendered all five fictional provider-supplied canary strings inside the failed-turn UI after a local provider returned HTTP 400. This is verified **renderer-visible error disclosure**. The sampled disposable Host stdout/stderr had no canary matches; other diagnostic sinks and external transmission were not established by this test. No real personal-data exposure was demonstrated.

**Probable implementation mechanism (inspected upstream `master`, commit [`4b399c39a6`](https://github.com/deepseek-ai/deepseek-harness/commit/4b399c39a6d1479cd84ca591b4d7c88e24d38a96); not yet matched byte-for-byte to the installed `0.2.2-rc.5` build):**

1. The upstream [DeepSeek transport error mapping](https://github.com/deepseek-ai/deepseek-harness/blob/4b399c39a6d1479cd84ca591b4d7c88e24d38a96/packages/llm/llm-deepseek/src/transport.ts#L34-L53) takes a provider-controlled `error.message` and passes it into `new LlmError(message, code, ...)` without user-interface sanitization at this point. Independently, the [pi-ai stream mapping](https://github.com/deepseek-ai/deepseek-harness/blob/4b399c39a6d1479cd84ca591b4d7c88e24d38a96/packages/llm/llm-pi-ai/src/stream.ts#L126-L135) carries provider `errorMessage` into a failure object's `message` field.
2. The upstream chat UI's [`failureMessage()` function](https://github.com/deepseek-ai/deepseek-harness/blob/4b399c39a6d1479cd84ca591b4d7c88e24d38a96/packages/client/ui-chat/src/client/chat/MessageItem.tsx#L52-L62) maps a limited set of failure codes (sign-out, interrupted, sign-in required, quota and authentication) to localized text, but otherwise returns the untrusted `message` unchanged.
3. That function is used in [retry failure details](https://github.com/deepseek-ai/deepseek-harness/blob/4b399c39a6d1479cd84ca591b4d7c88e24d38a96/packages/client/ui-chat/src/client/chat/MessageItem.tsx#L118-L127) and [terminal turn failures](https://github.com/deepseek-ai/deepseek-harness/blob/4b399c39a6d1479cd84ca591b4d7c88e24d38a96/packages/client/ui-chat/src/client/chat/MessageItem.tsx#L132-L145). Together these source paths offer a plausible explanation for the observed raw-error display. The installed binary's exact equivalent code path still needs confirmation before declaring a definitive line-level root cause for that build.

**Related upstream reports (similar behavior; not proof that the reporter reproduced this exact five-canary test):**

- [deepseek-harness Discussion #11838 — retired provider model id; raw HTTP 400 response body shown in the turn UI](https://github.com/deepseek-ai/deepseek-harness/discussions/11838). This report explicitly points to `failureMessage()` returning raw text for otherwise-unmapped errors.
- [deepseek-harness Discussion #12900 — provider AUTH text appears in another UI path despite existing AUTH masking](https://github.com/deepseek-ai/deepseek-harness/discussions/12900). This is a related, distinct masking-boundary concern, not a duplicate of the five-canary reproduction.

**Recommended upstream resolution (not implemented here).** Apply a central, allowlisted and localized renderer-facing failure contract based on stable typed error codes; ensure provider-controlled `message` / body / diagnostic context is not rendered directly in either the terminal failure or retry details. Preserve useful HTTP status/category and retry guidance without echoing raw provider text. Keep diagnostic details only in an appropriately restricted and redacted troubleshooting channel. Validate by replaying the original five fictional canaries on the installed Host and checking both turn-error and retry views, as well as relevant log sinks.

**Disposition remains `FAIL` / release gate open.** This source review is explanatory documentation, not a Host patch, not a native retest, not approval to publish, and not evidence of outbound exfiltration. The suite repository contains no authorized upstream Host modification in this report.

### 10. Update failure and recovery

The disposable Desktop was closed cleanly and test settings, Workspace registration and Sessions were backed up before package changes. The native CLI rejected a malformed local archive with exit 1. The installed package identity and the Profile dependency manifest retained their prior hashes. Manual reinstall of the known baseline package succeeded, then the new revision installed through the same supported path. Twelve selected data file hashes, including the committed Profile patch, Workspace registry and compressed Session logs, were identical across the offline install sequence. The fixed installation matched all 94 package files. On cold start, the previous fictional Session, its prior reply and the effective revocation were verified. The test establishes early install rejection and manual recovery for the observed local-artifact scenario. Guaranteed automatic rollback, mid-install failure semantics and native GUI update status require a safe supported fault after replacement starts. [rc.5 upgrade baseline](DSH_DESKTOP_PROVIDER_ACCESSIBILITY_FINAL_ACCEPTANCE_V1.0.2_RC5.md)

## E. Confirmed defects and fixes

1. **Suite custom-instruction replay after saved revocation.** Native in-history projection retained a recognizable earlier Response Preferences section. The existing `llm/stream` hook compared only the structured Profile details section. The fix reuses the same pre-provider terminal refusal for recognizable custom instructions that the saved settings no longer authorize. The parser recognizes the suite heading and built-in instruction vocabulary, checks system/developer text and preserves the existing provider-neutral hook. Browser preview output stays in parity with Host rendering. The change requires no new permission, schema, migration, storage or Host modification. The authorization scenario and the pinned real in-history loop both failed before the change and passed after it. The installed cold retest used the same already exposed fictional Session on the fixed package.
2. **Upstream native provider error passthrough.** The installed Host displayed the synthetic provider error text in the failed turn. Release acceptance requires a neutral renderer-visible failure shape. The upstream authority is the adapter-to-native-failure mapping. Preserve typed error codes and keep raw upstream error details out of ordinary renderer output and inappropriate log sinks. No suite runtime change was made for this path.

[Fix source](../plugins/personal-profile/preferences.js) · [Runtime regression](../test/personal-profile-runtime.test.js) · [Pinned Host integration test](../qa/profile-host-check.mjs)

## F. Security and privacy assessment

The only reproduced unauthorized provider transmission contained a fictional custom marker and went to the authorized loopback endpoint on the baseline. The fixed DeepSeek Messages route refused the tested historical turn before serialization. The fixed OpenAI-compatible route demonstrated safe serialization and successful continuation for the tested custom revocation. Existing arbitrary user messages, derived text and compaction have separate behavior. Historical rendered prompt text has no authenticated section boundaries for every possible free-form paragraph. The guard covers recognizable original sections; ambiguous legacy boundaries and transformed copies remain outside the proven scope. The actual Windows Peer/ACL boundary, trusted Host diagnostic sinks and outbound traffic payloads remain unresolved. Provider canary display is a confirmed upstream UI exposure in the controlled case. There is no evidence of a real-data disclosure or Session-log upload in this run.

## G. Reliability assessment

Verified native evidence covers single-owner saves, cold Settings and Session recovery, a renderer reload during a delayed provider turn, normal catalog lookups, ordinary rename, early malformed-package rejection and manual package reinstall. Remaining failure timing requires Host-supported controls for concurrent Settings updates, disconnect during a write, catalog registration mutation, metadata delay, rename refusal, partial admission and failed installation after replacement.

## H. Accessibility assessment

English and Arabic History keyboard/focus handling, localized accessible dialog names and RTL mixed-direction title search passed in the installed renderer. Narrator/NVDA speech, system contrast and scale, broader control traversal and offline announcements are open. The tests supplied no WCAG conformance verdict.

## I. Provider and Humanizer assessment

Verified localhost model routes include DeepSeek Flash and Pro and OpenAI Chat Completions. Provider consent and error observations are scoped to captured native interactions. Native Humanizer discovery and withdrawal passed. External compatibility, full fault recovery and rewriting quality require an approved live model environment.

## J. Regression and CI results

Local candidate commands ran on Windows 26H2 build 26300.10075 with Node.js 24.21.0, runtime SHA `b0f7b6c4ece070d3af3964aa665298bb01bdf5b3`.

| Command | Pass | Fail | Skip | Result |
| --- | ---: | ---: | ---: | --- |
| `npm ci --ignore-scripts` | — | — | — | Exit 0. npm audit reported zero vulnerabilities at execution. |
| `npm test` | 272 | 0 | 1 | Windows skips the POSIX-only permissions check. |
| `npm run check:package` | 271 | 0 | 2 | Verified 94 published files. The packed suite also skips a source-only check. |
| Pinned Harness real-service suites from CI | 25 | 0 | 0 | Exact rc.3 dependencies from the workflow. Synthetic services and fixtures. |
| `npm run check:regression` | 4 | 0 | 0 | Classifier 56/57, zero two-tier misses. |

The focused red run on the baseline failed both intended assertions. The focused green run on the candidate passed 16 tests with zero failures or skips. The GitHub workflow runs the Windows/Ubuntu and Node.js 22/24 matrix. Run IDs and final delivery-head conclusions are attached to the Draft PR Checks and Issue #53 reconciliation. The prior source-only head `84ba7be7e03db538b923ca6104b5d0815f9a7a24` has historical runs 45172519093 and 45172507056. [Workflow](../.github/workflows/test.yml) · [Acceptance branch Actions](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/actions?query=branch%3Atest%2Fwindows-dsh-native-acceptance-v1.0.2) · [Issue #53](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/issues/53)

## K. Remaining issues and owner decisions

- Keep the structured MP02 historical-wire criterion open until independent native evidence or separate owner acceptance of verified pre-provider refusal. The owner decision in this round applies to recognizable revoked custom preferences.
- Provision an isolated relay, second authenticated client and disposable restricted Windows account for live authorization, ACL and stale revision tests.
- Obtain supported native Host warning and fault controls for transport writes, catalog mutation, rename refusal, timeouts, admission and late update failure.
- Attribute the observed nonloopback egress and establish official Session-log upload behavior and consent with authorized instrumentation. External upload testing requires an approved isolated endpoint.
- Verify speech, Arabic reading order, Windows scaling and contrast, offline announcements and real provider/rewriting quality in an approved isolated environment.
- Upstream DSH should redact provider-supplied failure details at the native diagnostics boundary. Then repeat the same synthetic canary test and neutral-error/retry validation.

## L. Release readiness

**NOT READY.** The fixed custom-replay path is ready for owner review. Structured MP02, Peer authorization, logging and egress remain open security gates. Neutral native provider errors failed in the tested environment. The remaining reliability, accessibility and failed-update scenarios need their stated prerequisites. H04 retains the owner's existing 1,000-Session scope and recorded high-load disposition. [Issue #53](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/issues/53)
