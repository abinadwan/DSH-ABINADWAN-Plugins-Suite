# Direct Chat Phase 3.2 medium security validation

## Executive summary

**NOT READY FOR MERGE.** The installed Windows Harness runtime exposed eight inherited synthetic tool definitions to a protected agent created before activation. An agent created after activation exposed one agent-local definition, including after changing models. These are two observed failures of definition hiding. The no-op dispatch fixture denied its one synthetic call with zero executions. Actual Desktop acceptance and unrelated-user Windows ACL access remain open. Adding the requested report path also triggered the existing repository documentation layout test. The owner retains the decision for [draft PR #79](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/pull/79).

| Finding | Previous status | Tests executed | Passed | Failed | Partial | Blocked | Final assessment |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| DC-01 | Implemented, pending validation | 20 | 16 | 2 | 2 | 1 | Definition hiding failed for two native agent states. Tested dispatch denied the inert call. |
| DC-02 | Implemented, pending validation | 20 | 15 | 0 | 5 | 2 | Identity and both guard bindings verified in scope. Registry-failure behavior and preset/lifecycle coverage remain open. |
| DC-06 | Implemented, pending validation | 24 | 18 | 0 | 6 | 0 | Plugin catalog authorization verified in scope. Native conversation permissions and live reconnect remain incomplete. |
| DC-05 Windows ACL | Pending | 7 | 4 | 0 | 3 | 1 | Inherited read/execute ACE observed. Effective access by an unrelated non-admin remains unverified. |

## Environment and methodology

| Item | Observed value |
| --- | --- |
| Validation date | 2026-11-26, Asia/Riyadh |
| Repository and branch | `abinadwan/DSH-ABINADWAN-Plugins-Suite`, `fix/v1.1.1-direct-chat-security-medium` |
| Tested source SHA | `eff59b69288f850190779ec25b2c6dc747c18cae` |
| Target release and source package | Target v1.1.1, checked-in package manifest v1.1.0 |
| OS | Windows Pro, version 26H2, build 26300.10075, x64 |
| Installed Desktop package | `@deepseek-ai/dsh-desktop 0.2.2-rc.5`, Electron 44.7.0 |
| Installed Desktop Host runtime | `@deepseek-ai/dsh-desktop-runtime 0.2.2-rc.5` and `dsh-cordis-host-runner 0.2.2-rc.5`, confirmed from installed manifests |
| Standalone CLI | Global `dsh 0.2.1-rc.5` inventoried separately from the Desktop Host |
| Node.js and npm | Shell Node.js 26.10.0, npm 11.19.1, packaged Electron Node.js 24.21.0 |
| Ollama | Local server 0.40.18, two selected models and a 12-model installed inventory |
| Documentation commit identity | GitHub identifies the separate report commit in the PR commit list and file history. The report source SHA above identifies the code under test. |

Fetched remote references and verified that the local test checkout, remote branch, PR head, and eight CI checks pointed to the requested source SHA. Used an isolated worktree, locked dependency installation, disposable fixture homes, in-memory synthetic Workspace records, and native JSONL persistence under a synthetic root. Reviewed the repository's prior security audit, Phase 2 Desktop acceptance, test scripts, and the current integration and performance notes. The finding IDs below follow the Phase 3.2 request because earlier audits used different numbering. [Current development notes](../architecture/development.md)

For installed Host validation, used the installed executable in Electron RunAsNode mode and the repository's existing fixture module resolver pointed to the installed `app.asar/dsh` runtime. The four existing checks and additional focused probes composed Cordis services with standard extension APIs. Installed native services ran in fixture processes. The GUI and the full Desktop Host composition were outside that evidence boundary. The browser carrier tests used synthetic client services and projections.

All test conversations and tools were synthetic. Inert tools only incremented fixture counters. Model traffic used loopback and disabled Ollama cloud features. Production profiles, conversations, settings, Workspace registrations, DSH source, libraries, native dependencies, and installation files were left untouched. Before and after SHA-256 samples matched for the installed executable, application archive, and installed runtime manifest. Production plugin code, dependency manifests, lockfiles, and other suite components were unchanged. The original checkout and its pre-existing untracked file were preserved.

## Automated baseline

| Command | Wall time | Runner cases | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: | ---: | ---: |
| `npm run check:client` | 1.460 s | One command gate | Gate passed | 0 | 0 |
| `npm test` | 5.046 s | 295 | 293 | 0 | 2 |
| `npm run check:package` | 5.735 s | 289 | 286 | 0 | 3 |
| `npm run check:regression` | 1.787 s | 4 | 4 | 0 | 0 |
| Installed Host integration files | 0.827 s | 26 | 26 | 0 | 0 |

Installed Host files were `qa/direct-chat-catalog-host-check.mjs` (2), `qa/new-plugins-host-check.mjs` (13), `qa/profile-host-check.mjs` (1), and `qa/adaptive-reasoning-host-check.mjs` (10). The Profile test retains an rc.3 label in its name. Runtime manifests confirmed rc.5 resolved for this run. The classifier benchmark scored 56/57 with about 1.79 µs p95. The package check verified 99 published files.

The final runner total is **609 passes, 0 failures, 5 skips across 614 assertion outcomes**. It includes repeated tests from the packed-package run. Skips were the two POSIX-only permissions tests in each run and the repository-documentation link test inside the packed artifact. The first sandboxed `npm test` had one `EPERM` fixture setup failure and two additional skips. The first package check stopped at worktree `mkdtemp` with `EPERM`. Both succeeded when rerun outside those filesystem restrictions. `npm ci --ignore-scripts` emitted a transitive `whatwg-encoding@3.1.1` deprecation. The first npm audit could not resolve its registry endpoint. Its successful retry reported **zero advisories** in all severity bands for the locked tree.

GitHub reported eight successes on the exact SHA for Windows and Linux, Node.js 22 and 24, on push and pull request. CI used pinned rc.3 integration fixtures. The local npm run used Node 26 on Windows and the native fixture run used the installed rc.5/Node 24 runtime. Local Desktop and Windows ACL coverage are tracked separately. [CI checks](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/pull/79/checks)

### Documentation-only changeset check

After adding the report in the requested directory, the dedicated documentation check returned 5 passes and 1 failure. A second full npm test at 4.476 s confirmed 292 passes, 1 failure and 2 POSIX-only skips. Both failed with `historical docs must not be active: research`. The test explicitly disallows the directory required for this report and evidence. Source-commit baseline counts above remain distinct from the post-report checks. The request authorizes this directory and a documentation-only commit. The layout assertion was preserved and therefore the report commit can produce a failing CI check. [Existing documentation assertion](../../test/documentation-integrity.test.js)

## DC-01 tool visibility and execution

The installed Host adapter captured the native request before provider serialization. Newly recognized members exposed zero inherited definitions, including following late inherited registration. The ordinary Workspace control exposed eight inert definitions representing terminal, filesystem read/write, web, browser, MCP, subagent, and another native category. A new agent created after disposal exposed nine inert definitions including a late global registration.

| Request observation | Visible definitions | Attempted calls | Denied calls | Executions |
| --- | ---: | ---: | ---: | ---: |
| Protected agent created before activation | 8 | 0 | 0 | 0 |
| Newly recognized member with unrelated cwd | 0 | 0 | 0 | 0 |
| Protected member following late inherited registration | 0 | 0 | 0 | 0 |
| Protected agent with an inert agent-local registration | 1 | 0 | 0 | 0 |
| Protected agent with local registration after model change | 1 | 0 | 0 | 0 |
| Existing fabricated no-op and empty-response retry fixture | 0 per request | 1 | 1 | 0 |
| Ordinary Workspace visibility comparison | 8 | 0 | 0 | 0 |

The native retry fixture recorded four requests overall, three empty completions and two retries, with a tool-result message after the first request and an execution counter of zero. Plugin guard assertions returned `DIRECT_CHAT_TOOL_DENIED`. A separate native scoped fixture also verified normal execution of its sanctioned inert tool in a regular Workspace. Visible definitions warrant separate closure even when a dispatch test records zero unauthorized executions. [Sanitized request and catalog evidence](evidence/direct-chat-phase-3-2-medium/results.json)

## DC-02 Session identity and protection

Both plugin integration points were checked, including `tools/pre-execute` and the native tool dispatch guard registration. Positive cases include canonical and legacy paths, a registered member whose cwd differs, normalized Windows path forms, junctions, a missing child path, 48 missing components and late membership. An already recognized live agent stayed protected after membership removal. An unrelated Workspace remained eligible for its permitted inert tool. A fresh Host fixture reopened a native persisted member with no inherited definitions.

Source review shows that native membership, canonical path matching, and previous live-agent recognition supply classification evidence. A registry outage can reduce that evidence for a newly seen agent. End-to-end combined failure coverage remains unresolved. Duplicate membership rejection at the catalog boundary confirms catalog behavior only. See the matrix and I1/I2 for the precise limits.

## DC-06 catalog and conversation authorization

The actual installed Host connection admitted the owner and denied the viewer before metadata access. The viewer catalog response was 403 with zero reads. Plugin-level results returned `Cache-Control: no-store` on tested success and error paths. The upstream viewer rejection had no cache header in the shared transport fixture and carried no metadata. Duplicate Workspace and invalid membership cases yielded sanitized 503 or 409. Cross-Workspace membership conflicts were rejected before the first metadata read. Revalidation rejected same-size replacement and addition despite unavailable headers.

A mismatched header, missing metadata, and an unreadable header each returned a null creation-order map. A cooperative timed read took 2,014 ms and also returned null. Plugin disposal during a cooperative read produced 503 with no-store. Client fallback tests showed no unauthorized cached rows on catalog failure. Native JSONL reopen retained the target conversation's history. Two persisted Sessions had separate native histories. Viewer permission checks on the full stock Session-opening surface remain a separate verification item. Native application authorization and Windows filesystem access are distinct boundaries.

## DC-05 Windows ACL

Used `Get-Acl` for owner and ACE inventory and `icacls /verify /L` for directory, file and reparse-point DACL verification. Inspected the synthetic profile parent and profile, directories created by the installed Host's Direct Chat preparation route, the junction, synthetic metadata and log, and two real native JSONL logs from the isolated persistence fixture. All inspected directories and files were owned by the account running the fixture. The observed DACLs inherited FullControl for the current owner, SYSTEM and Administrators. One additional redacted principal inherited Allow ReadAndExecute with Synchronize through the test root into the inspected directories and files. The test established the current identity's ability to open synthetic metadata for read/write. It did not establish effective permissions for the additional principal or for an unrelated non-administrator account.

No ACL was altered. A true directory symlink failed with `UnauthorizedAccessException`. The junction was created and inspected, and existing plugin tests verified refusal of a redirected protected directory. The recorded ACLs do not support equivalence with POSIX 0700. Parent DACLs and identity/group membership affect Windows results.

## Native Desktop acceptance

The installed GUI was **BLOCKED**. Read-only inspection of its packaged startup showed an unconditional `dsh://` default-protocol registration in the packaged build. The machine already has a handler. Overriding DSH home and Electron data paths does not isolate Windows protocol registration, and the Windows Sandbox executable was absent. Starting the packaged GUI on this account would have crossed the project's existing-settings constraint. No GUI test, crash-rate measurement, or Desktop-level performance estimate is credited. Host RunAsNode results and client fixture contracts are recorded independently. [Official Desktop architecture and protocol registration](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/desktop/README.md) · [Electron user-data startup handling](https://github.com/electron/electron/blob/main/shell/app/electron_main_delegate.cc)

## Local Ollama

Tested `gemma4-local:e4b` (digest prefix `3c4be0937708`, Q4_K_M, reported 7.5B) and `qwen3.5:4b` (`d8b0f5e9760c`, Q4_K_M, reported 4.2B). The 12-model inventory with names, digest prefixes, sizes, and quantization is in the evidence. The separate installed `gemma4:12b` variant was inventoried; the selected Gemma variant was `gemma4-local:e4b`. A synthetic LLM adapter in the installed native loop serialized only the observed text messages and tool-schema shapes to local Ollama. This measures that loop and the local provider transport. Built-in Desktop provider serialization was blocked with the GUI.

| Model | Requests | Text | Errors | Empty | Min / median / max ms | Input / output tokens | Length-capped |
| --- | ---: | ---: | ---: | ---: | --- | --- | ---: |
| `gemma4-local:e4b` | 9 | 9 | 0 | 0 | 99 / 773 / 4197 | 4182 / 623 | 5 |
| `qwen3.5:4b` | 11 | 11 | 0 | 0 | 63 / 652 / 2670 | 3307 / 589 | 4 |

All 20 requests used zero visible definitions, zero attempted calls, zero blocked calls and zero actual tool executions. No real-model request required a retry. All eight Arabic prompts produced Arabic text. Latencies include cold loads. Token counts are per-request provider counts and include repeated conversation context. The 96-token cap ended some otherwise nonempty responses, so these cases do not score full answer quality. The reopen probe persisted two native JSONL Sessions, recreated Host services and captured one prior assistant turn in the reopened request. An initial 17-request adapter run had a fixture event-shape error and is excluded from the final counts. The rerun used the standard text delta event and confirmed assistant turns entered subsequent requests. [Ollama chat API](https://docs.ollama.com/api/chat)

## Performance and scalability

Timings below are local synthetic fixture measurements. Catalog time covers discovery and creation-order requests combined in the existing scale check. Browser carrier medians are 20 samples after two warm-ups. Pagination times measure the delivered carrier's last-page slice on prefetched rows.

| Sessions | Catalog combined ms | Creation metadata reads | Carrier combined ms | Inventory median ms | Recent sort median ms | Title search median ms | Last-page median ms | 150 cold membership checks ms |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 100 | 33.81 | 100 | 1.07 | 0.0858 | 0.0145 | 0.0174 | 0.0007 | 10.584 |
| 1,000 | 6.13 | 0 | 3.70 | 0.7259 | 0.1335 | 0.11 | 0.0006 | 8.45 |
| 10,000 | 24.72 | 0 | 36.44 | 4.5574 | 1.3034 | 1.1009 | 0.0012 | 8.727 |

Recent discovery read zero persistence headers. Creation sorting read 100 headers with 100 members and zero above the supported cutoff of 100. The independent authorized one-header request completed in approximately 1 ms. A repeated warmed guard callback averaged 0.042 µs over 10,000 iterations. Cold membership checks included native hook and path overhead with synthetic registry data. Sampled CPU deltas across the three sizes were 31, 0 and 16 ms. Heap deltas were about +2.09, −1.80 and +2.11 MB, with garbage collection noise and timer granularity. These data do not characterize sustained resource use.

The supported native title-search scope remains 1,000 Sessions. The prior 10,000-Session native title availability limit is a documented baseline. The 10,000-row synthetic test starts with all titles and says nothing about a new native title-search regression. [Historical scope and stress result](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/blob/98c27e87e216f11000ab92adcb79d51388031a28/docs/DSH_H04_SEARCH_SCOPE_AND_HIGH_LOAD_RESULT_V1.0.2.md)

## Cross-component regression

My Profile hybrid context and prompt preferences passed on installed Host services. Saved preference, custom-instruction and access cases passed in the suite. Adaptive Reasoning passed installed Host effort, route, recommendation, persistence, reset, and statistics checks. Archive Manager client fixtures passed authorized inventory, restore, and protection checks. Native Desktop history access and restore were not exercised. Environment & Context client fixtures passed Session switch, metadata isolation, sidebar and cleanup checks. Humanizer passed an actual pinned DSH skill-registry fixture and disposal checks. Shared bilingual client assertions, component independence, and package integrity passed within fixture scope.

## Findings, limitations and remediation

Each note below applies to matrix rows carrying its identifier. Severity reflects observed impact or an explicitly labeled verification gap.

| Note | Expected and observed behavior | Repeat or evidence | Impact, severity, ownership and supported remediation |
| --- | --- | --- | --- |
| B1 | The full suite should pass after adding the required documentation. One existing test failed because it forbids the required directory. | Run the dedicated documentation check or npm test with the report present. Sanitized assertion is historical docs must not be active: research. | CI validation blocker, repository documentation policy. A separate owner-approved policy or path change can resolve it. |
| V1 | All protected requests should hide definitions. The already-live agent showed eight inherited definitions after activation. | In an isolated installed-Host fixture, compare a canonical Direct Chat agent created before activation with one created after activation. Inspect adapter tool counts with an inert response. Evidence label `created-before-activation`. | Capability schemas can reach the model, Medium. The plugin attaches filtering on creation and native lifecycle limits apply. Investigate supported reclassification or safe supported reload of existing agents. |
| V2 | A protected request should hide its local definitions. One inert agent-local definition was visible before and after changing models. | Add an inert test registration to a newly protected synthetic agent and inspect the adapter request without emitting calls. Evidence labels `agent-local` and `model-change-agent-local`. | Capability schema exposure, Medium. Native scope behavior plus plugin policy. Seek a supported request filter that covers agent-local registrations and preserve both dispatch checks. |
| P1 | Preset changes should preserve all restrictions of the shipped plugin. Existing native preset comparisons use a separate explicit ownership fixture. | Run `qa/new-plugins-host-check.mjs` on the installed runtime and review the separate preset fixture vs. the production policy. | Medium verification gap. Plugin and DSH preset integration. Test production behavior using the supported preset API from an isolated Desktop account. |
| P2 | Live activation and disable should have defined behavior. Mount/dispose and a fresh agent were observed, and an already-live visibility failure is covered by V1. | Inspect native visibility entries before activation and after disposal. Re-run full enable/disable through isolated Desktop when available. | Medium verification gap, plugin lifecycle with DSH integration. Validate already-live agent state and intentional disposition of existing restrictions. |
| I1 | Missing, recovering or ambiguous registry states should preserve authorized classifications and reject unsafe admissions. Catalog failure/recovery and membership ambiguity were covered, with only partial tool-policy evidence. | Inspect native catalog `registry-error` and `recovered` entries and the existing member/guard cases. Source review establishes which signals the policy consults. | Medium verification gap, mainly plugin policy using DSH registry. Establish explicit failure behavior at supported Host boundaries. |
| I2 | The combined outage scenario requires a safe denial guarantee. Source review indicates identity availability matters, and end-to-end defense in this combined state remains unverified. | Review the guard's fallback behavior and existing independent identity and canonical-path checks. No execution result exists for this combined failure. | Medium risk pending evidence, plugin policy with DSH registry dependency. Prefer durable trusted Session identity or another supported fail-closed classification contract. |
| C1 | Missing/invalid permission must fail closed. The client no-grant case and native viewer rejection passed, and other invalid native peer states were not exercised. | Run `test/direct-chat-client.test.js` and `qa/direct-chat-catalog-host-check.mjs` with synthetic permission fixtures. | Medium verification gap, DSH transport and plugin client. Verify unavailable permission state with supported connection contracts. |
| C2 | Revalidate after any membership mutation while a header read awaits. Addition and same-size replacement returned 409. Removal-only was not isolated in a separate trial. | Run `test/direct-chat-catalog-scale.test.js` and inspect the mutation fixtures. | Low verification gap, plugin. Add removal-only coverage in a future validation pass. |
| C3 | Reconnect must discard old results. Client retry and generation logic were checked, but a live Direct Chat reconnect race was blocked. | Run `test/new-plugins-settings.test.js` and review the history generation guard in the client carrier. D1 applies to the native UI follow-up. | Medium verification gap, client/DSH connection. Exercise supported Host reconnect in an isolated Desktop account. |
| C4 | Plugin catalog responses should disable caching. Tested plugin responses used no-store. The installed Host transport's text-only 403 omitted the header. | Observe HTTP 403, empty metadata, zero reads and a null cache header for the synthetic viewer in the installed transport. | Low. DSH owns its admission response; no unauthorized metadata was present. Confirm whether no-store can be applied at DSH's supported transport boundary. |
| C5 | Native conversation permissions must hold independently of plugin endpoints. Owner/viewer plugin admission and isolated persistence were verified. The stock Session-open authorization matrix was outside that fixture. | Run the existing Host fixtures and inspect the two native persisted Sessions from the reopen evidence. D1 governs live Desktop verification. | Medium verification gap, DSH-native authorization. Verify native Session-open permissions through supported test peers. |
| A1 | Unrelated non-admins should lack effective access if private Windows confinement is required. The isolated DACL inherited one extra read/execute ACE and effective access remains unknown. | Repeat `Get-Acl` and `icacls /verify /L` against a newly prepared profile and JSONL fixture, then evaluate an approved unrelated test token under equivalent inheritance. | Medium confidentiality concern, Windows/DSH storage with plugin-created subdirectories. Establish a supported owner-only Windows storage boundary or document and accept the actual inheritance model. |
| A2 | A true directory symlink would permit ACL and alias checks. Windows rejected test symlink creation. Junction checks passed independently. | Create the ordinary synthetic directory symlink within the test root using `New-Item -ItemType SymbolicLink`. Observed `UnauthorizedAccessException`. | Low verification gap, Windows test environment. Use an isolated environment with existing permission to create symlinks. |
| D1 | Each listed scenario requires the packaged GUI to start inside an isolated account. Packaged startup writes its Windows `dsh://` registration on start, even with isolated data paths. No packaged GUI interaction occurred. | Inspect packaged startup through the existing Electron RunAsNode mode and check whether Windows Sandbox is available. Evidence is the observed startup contract and the missing sandbox executable. | Release acceptance blocker affecting all listed UI scenarios. DSH shell and Windows setup. Use a disposable Windows account/VM or an officially supported launch mode isolating protocol registration. |
| S1 | Memory and CPU measurements should characterize the workload. Captured short loop deltas only, with noisy heap and CPU measurements. | Repeat S-04 with process CPU and heap sampling over a stable long window. | Low performance measurement gap, test methodology. Use isolatable steady-state sampling for comparability. |
| R1 | Native Desktop archive restore, history access and restart should work with the full suite. Client contracts and native service fixtures passed, and Desktop remained blocked. | Run existing suite regression commands and continue through an isolated Desktop environment once D1 is resolved. | Medium regression verification gap spanning DSH Desktop and suite composition. Use supported Desktop checks on synthetic records. |

## Complete test case matrix

PASS is scoped to the evidence stated in each row. Counts below cover matrix scenarios. Runner outcomes and raw model request counts are separate to avoid double counting. Executed includes PASS, FAIL and PARTIAL. BLOCKED and NOT TESTED are excluded from executed counts. The only NOT TESTED matrix case was the naturally empty Ollama response condition. Runner-declared skips are reported in the baseline section.

| Group | Executed | Passed | Failed | Partial | Blocked | Not tested |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Baseline | 10 | 9 | 1 | 0 | 0 | 0 |
| DC-01 | 20 | 16 | 2 | 2 | 1 | 0 |
| DC-02 | 20 | 15 | 0 | 5 | 2 | 0 |
| DC-06 | 24 | 18 | 0 | 6 | 0 | 0 |
| DC-05 | 7 | 4 | 0 | 3 | 1 | 0 |
| Desktop | 0 | 0 | 0 | 0 | 19 | 0 |
| Ollama | 8 | 8 | 0 | 0 | 1 | 1 |
| Scale | 5 | 4 | 0 | 1 | 1 | 0 |
| Regression | 12 | 10 | 0 | 2 | 0 | 0 |
| **Total** | **106** | **84** | **3** | **19** | **25** | **1** |

| Group | Test ID | Status | Acceptance criterion | Observation or note |
| --- | --- | --- | --- | --- |
| Baseline | B-01 | PASS | Deterministic client carrier | Verified by npm run check:client |
| Baseline | B-02 | PASS | Npm test | 293 passed and 2 POSIX-only skips on the final run |
| Baseline | B-03 | PASS | Package contents and packed tests | 99 files, 286 passed and 3 harness skips |
| Baseline | B-04 | PASS | Phase 8 regression and benchmark | 4 passed and classifier accuracy 56/57 |
| Baseline | B-05 | PASS | Locked dependency audit | 0 reported npm advisories in all severity bands |
| Baseline | B-06 | PASS | Installed native Direct Chat catalog fixture | 2 passed |
| Baseline | B-07 | PASS | Installed native shared Host fixtures | 13 passed |
| Baseline | B-08 | PASS | Installed native My Profile fixture | 1 passed |
| Baseline | B-09 | PASS | Installed native Adaptive Reasoning fixtures | 10 passed |
| Baseline | B-10 | FAIL | Documentation integrity after adding the required report path | One layout assertion failed in both targeted and full reruns [B1] |
| DC-01 | T01-01 | PASS | New Direct Chat agent hides inherited definitions | Native mixed-category request had 0 definitions |
| DC-01 | T01-02 | FAIL | Already-live agent hides inherited definitions after activation | 8 definitions visible in installed runtime; no calls emitted [V1] |
| DC-01 | T01-03 | PASS | Previously saved conversation reopened | Native JSONL resume supplied prior assistant turn and 0 definitions |
| DC-01 | T01-04 | PASS | Protection after Host restart equivalent | Fresh installed Host service context resumed its persisted conversation with 0 definitions |
| DC-01 | T01-05 | PASS | Model selection preserves inherited restriction | Native switch Qwen to Gemma kept both request and wire tool lists empty |
| DC-01 | T01-06 | PARTIAL | Preset selection preserves protection | Existing native preset fixture is a comparison with separate ownership policy [P1] |
| DC-01 | T01-07 | PASS | Empty response retries preserve restriction | 4 requests, 3 empty completions, 2 retries, 0 definitions and 0 executions |
| DC-01 | T01-08 | FAIL | Agent-local tool registration stays hidden | 1 local definition visible before and after model switch [V2] |
| DC-01 | T01-09 | PASS | Inherited and late globally registered tools stay hidden | Both native capture requests had 0 definitions |
| DC-01 | T01-10 | PASS | Fabricated model call is denied | Existing installed-host no-op fixture emitted 1 attempted call and observed 1 denial and 0 executions |
| DC-01 | T01-11 | PARTIAL | Direct Chat enable/disable lifecycle | Mount and disposal tested, new agent after disposal had 9 definitions [P2] |
| DC-01 | T01-12 | PASS | Regular Workspace control retains tool access | 8 synthetic tool definitions visible and separate native scoped fixture executed sanctioned counter |
| DC-01 | T01-13 | PASS | Shell and terminal category | Inert representative inherited definition hidden after activation |
| DC-01 | T01-14 | PASS | Filesystem read category | Inert representative inherited definition hidden after activation |
| DC-01 | T01-15 | PASS | Filesystem write category | Inert representative inherited definition hidden after activation |
| DC-01 | T01-16 | PASS | Web search category | Inert representative definition hidden and native fixture denied its synthetic call |
| DC-01 | T01-17 | PASS | Browser category | Inert representative inherited definition hidden after activation |
| DC-01 | T01-18 | PASS | MCP category | Inert representative inherited definition hidden after activation |
| DC-01 | T01-19 | PASS | Subagent category | Inert representative inherited definition hidden after activation |
| DC-01 | T01-20 | PASS | Other native tool category | Inert representative inherited definition hidden after activation |
| DC-01 | T01-21 | BLOCKED | Full production Desktop catalog visibility and effective execution by category | Packaged GUI launch requires Windows registration [D1] |
| DC-02 | T02-01 | PASS | Member and expected working directory | Recreated native Host had matching registered identity and protected cwd; production guard denied canonical path |
| DC-02 | T02-02 | PASS | Member and unrelated working directory | Both plugin hooks asserted, installed capture with unrelated cwd exposed 0 inherited tools |
| DC-02 | T02-03 | PASS | Ordinary Workspace and unrelated working directory | Guard yielded no plugin denial and installed capture exposed regular catalog |
| DC-02 | T02-04 | PASS | Legacy per-chat path | Both hooks covered by existing unit assertion |
| DC-02 | T02-05 | PASS | Canonical permanent Workspace path | Both hooks covered and standalone installed guard returned DIRECT_CHAT_TOOL_DENIED |
| DC-02 | T02-06 | PASS | Windows junction alias | Existing directory alias tests passed for both hooks |
| DC-02 | T02-07 | BLOCKED | True Windows symbolic link alias | Windows rejected test symlink creation [A2] |
| DC-02 | T02-08 | PASS | Alternative Windows path representations | Native fixture guard denied ordinary, extended-length and upper-case spellings |
| DC-02 | T02-09 | PASS | Missing child under protected alias | Existing nearest-ancestor case denied at native guard binding |
| DC-02 | T02-10 | PASS | Deep missing child path | Existing alias test exercises deep nested path |
| DC-02 | T02-11 | PASS | Late membership recognition | Existing guard assertion resolves newly assigned Session |
| DC-02 | T02-12 | PASS | Membership change after recognition | Existing guard keeps recognized live agent denied after removal |
| DC-02 | T02-13 | PARTIAL | Duplicate/conflicting membership and tool admission | Catalog rejects conflict, tool policy ambiguity reviewed [I1] |
| DC-02 | T02-14 | PARTIAL | Registry unavailability | Source review and catalog fault observed, tool fallback coverage incomplete [I1] |
| DC-02 | T02-15 | PARTIAL | Registry recovery | Catalog recovered, tool revalidation after outage remains unverified [I1] |
| DC-02 | T02-16 | PASS | Previously recognized live agent | Existing fixture keeps decision after membership removal |
| DC-02 | T02-17 | PASS | Reopen after Host reconstruction | Installed JSONL resume after disposal preserved inherited restriction |
| DC-02 | T02-18 | PASS | Change model | Installed runtime selected a different model and inherited definitions stayed hidden |
| DC-02 | T02-19 | PARTIAL | Change preset | Native mechanism exercised by separate ownership fixture [P1] |
| DC-02 | T02-20 | PARTIAL | Plugin enable/disable | Policy lifecycle tested at mount/disposal, UI and already-live evolution unverified [P2] |
| DC-02 | T02-21 | BLOCKED | Combined registry failure and mismatched working directory | Source-level concern reported without an end-to-end bypass exercise [I2] |
| DC-02 | T02-22 | PASS | Native dispatch guard and pre-execute | Both hook bindings asserted; native fabricated no-op call denied |
| DC-06 | T06-01 | PASS | Authorized owner preparation and catalog | HTTP 200 with no-store; authorized metadata returned |
| DC-06 | T06-02 | PASS | Unauthorized viewer access | Native boundary returned 403 before any catalog read |
| DC-06 | T06-03 | PARTIAL | Missing or invalid permissions | Client missing-permission fail-closed and native viewer control verified [C1] |
| DC-06 | T06-04 | PASS | Denied native preparation endpoint | Existing installed Host connection fixture returned 403 |
| DC-06 | T06-05 | PASS | Denied native catalog endpoint | Both installed native fixtures returned 403 |
| DC-06 | T06-06 | PASS | Duplicate Direct Chat Workspace registrations | 503, no metadata reads, no-store |
| DC-06 | T06-07 | PASS | Duplicate Session IDs | 409, no metadata reads, no-store |
| DC-06 | T06-08 | PASS | Cross-Workspace membership conflict | 409 before metadata read, existing scale fixture |
| DC-06 | T06-09 | PASS | Malformed membership record | Null Session list rejected with 409 and 0 reads |
| DC-06 | T06-10 | PASS | Mismatched header identity | 200 with null creation metadata; 1 read and no header returned |
| DC-06 | T06-11 | PASS | Async metadata membership revalidation | Existing fixture checks state before and after read with no available header |
| DC-06 | T06-12 | PASS | Same-size membership replacement | 409 despite unchanged count and unavailable metadata |
| DC-06 | T06-13 | PARTIAL | Membership addition and removal during metadata reads | Explicit addition and replacement observed; removal-only not run [C2] |
| DC-06 | T06-14 | PASS | Metadata timeout | Cooperative read aborted and returned no creation metadata after 2,014 ms |
| DC-06 | T06-15 | PASS | Missing and unreadable Session metadata | Both returned 200 and null creation metadata without exposing the error marker |
| DC-06 | T06-16 | PASS | Catalog request failure | Synthetic registry error returned sanitized 503; client retry refrained from showing stale rows |
| DC-06 | T06-17 | PARTIAL | Stale catalog response | Client generation guard inspected and retry fixture passed; live reconnect race not run [C3] |
| DC-06 | T06-18 | PARTIAL | Host reconnect | Reconnect handling exists and fixtures reconstruct Host; live Desktop reconnect blocked [C3] |
| DC-06 | T06-19 | PASS | Plugin disposal during active catalog read | Aborted cooperative read returned sanitized 503 with no-store |
| DC-06 | T06-20 | PASS | Conversation reopen after rebuilding native Host | Previously persisted conversation resumed and included its own prior turn |
| DC-06 | T06-21 | PASS | Conversation history independence | Two native JSONL Sessions; second first request had no prior assistant turn |
| DC-06 | T06-22 | PASS | Sanitized failures and no stale metadata | Catalog marker absent; prepare logging assertions also passed |
| DC-06 | T06-23 | PARTIAL | Cache-Control no-store across applicable responses | Plugin responses tested; as observed, upstream 403 had no cache directive [C4] |
| DC-06 | T06-24 | PARTIAL | DSH-native conversation authorization separate from plugin routes | Owner/viewer plugin transport and native persistence boundaries verified [C5] |
| DC-05 | A-01 | PASS | Directory owner and explicit/inherited ACE inventory | Owner matched current identity; full DACL summaries captured |
| DC-05 | A-02 | PASS | Parent directories and inheritance | Inspected isolated parent, profile, data-root and Workspace with Get-Acl and icacls |
| DC-05 | A-03 | PASS | Owner effective access | Opened synthetic metadata with read/write access without changing it |
| DC-05 | A-04 | PARTIAL | Unrelated non-admin effective access and excessive grants | Read/execute ACE for an additional principal; no independent token verified [A1] |
| DC-05 | A-05 | PASS | Windows junction ACL and directory replacement | Junction ACL verified with icacls /L; existing plugin tests reject redirected protected directory |
| DC-05 | A-06 | BLOCKED | True symbolic link ACL handling | UnauthorizedAccessException on creation [A2] |
| DC-05 | A-07 | PARTIAL | Effective access to Session metadata and logs | ACL inspection includes two native JSONL logs and synthetic metadata; unrelated token untested [A1] |
| DC-05 | A-08 | PARTIAL | Owner-only confinement on Windows | Inherited DACL differs from POSIX 0700 and effective grants are unresolved [A1] |
| Desktop | D-01 | BLOCKED | Direct Chat action placement | [D1] |
| Desktop | D-02 | BLOCKED | Enable/disable UI and component placement | [D1] |
| Desktop | D-03 | BLOCKED | Permanent Workspace creation via button | [D1] |
| Desktop | D-04 | BLOCKED | Separate native Sessions via UI | [D1] |
| Desktop | D-05 | BLOCKED | Blank conversation reuse | [D1] |
| Desktop | D-06 | BLOCKED | Normal conversational responses | [D1] |
| Desktop | D-07 | BLOCKED | Conversation continuation | [D1] |
| Desktop | D-08 | BLOCKED | Conversation switching | [D1] |
| Desktop | D-09 | BLOCKED | Open historical conversations | [D1] |
| Desktop | D-10 | BLOCKED | Rename conversation | [D1] |
| Desktop | D-11 | BLOCKED | History title search | [D1] |
| Desktop | D-12 | BLOCKED | History pagination | [D1] |
| Desktop | D-13 | BLOCKED | Sort by activity | [D1] |
| Desktop | D-14 | BLOCKED | Sort by creation date | [D1] |
| Desktop | D-15 | BLOCKED | Restart live Desktop Host | [D1] |
| Desktop | D-16 | BLOCKED | Restart Desktop and recover conversations | [D1] |
| Desktop | D-17 | BLOCKED | Arabic and English UI | [D1] |
| Desktop | D-18 | BLOCKED | Duplicate UI registrations and startup stability | [D1] |
| Desktop | D-19 | BLOCKED | Normal Workspace UI behavior | [D1] |
| Ollama | O-01 | PASS | General conversation in Arabic | Gemma and Qwen returned text containing Arabic |
| Ollama | O-02 | PASS | Simple English question | Both returned completed text with no tools |
| Ollama | O-03 | PASS | Complex question in Arabic | Both returned Arabic text with no tools |
| Ollama | O-04 | PASS | Reasoning question in English | Both produced text without tools; response correctness not scored |
| Ollama | O-05 | PASS | Harmless requests in web, terminal and filesystem categories | 6 completed responses with 0 visible tools and 0 attempts |
| Ollama | O-06 | PASS | Question about disabled tool policy | Both returned Arabic text and emitted 0 calls |
| Ollama | O-07 | PASS | Model transition | Existing Session selected Gemma after Qwen; 0 tools |
| Ollama | O-08 | PASS | Reopened Session and new Host context | Two JSONL Sessions and one reopened native request; 0 tools |
| Ollama | O-09 | BLOCKED | Native Desktop provider serialization and UI | [D1] |
| Ollama | O-10 | NOT TESTED | Real-model retry behavior after an empty completion | No natural empty Ollama response; independent offline retry case T01-07 passed |
| Scale | S-01 | PASS | 100 Session workload | Catalog read ceiling, carrier inventory, title filtering and page slicing verified |
| Scale | S-02 | PASS | 1,000 Session workload | Zero creation metadata reads at this scale, synthetic title filtering available |
| Scale | S-03 | PASS | 10,000 Session workload | Zero creation metadata reads, synthetic title filtering available when projections complete |
| Scale | S-04 | PASS | Guard and Session lookup overhead | 150 denials per size; hot-path callback measurement captured |
| Scale | S-05 | PARTIAL | CPU and heap utilization under inventory load | Native hook delta recorded but brief sampled loops are not stable process utilization [S1] |
| Scale | S-06 | BLOCKED | Native Desktop history loading, availability, search and pagination timings | [D1] |
| Regression | R-01 | PASS | My Profile context and saved preferences | Installed Host prompt and Settings fixtures plus unit/client checks |
| Regression | R-02 | PASS | My Profile custom instructions, request behavior and privacy boundaries | Profile Host fixture captured context routing and update behavior; settings/access regressions passed |
| Regression | R-03 | PASS | Adaptive Reasoning effort controls and recommendations | Installed native route and offline adapter assertions |
| Regression | R-04 | PASS | Adaptive Reasoning statistics and Session-local state | Ten native checks include persisted statistics, reset, and exact route behavior |
| Regression | R-05 | PASS | Archive Manager inventory and protection flags | Client fixtures cover authorization, protected Workspaces and stale writes |
| Regression | R-06 | PASS | Archive Manager synthetic restore workflow | Client fixture exercised native restore API contract without opening the Session |
| Regression | R-07 | PARTIAL | Archive Manager native history access and restore | Projection/auth fixtures and native store tests passed; actual Desktop restore unverified [R1] |
| Regression | R-08 | PASS | Environment & Context Session info, switching, isolation and sidebar | Client contracts verify real projection shapes and cleanup |
| Regression | R-09 | PASS | Humanizer availability, registration and lifecycle | Real npm-pinned DSH skill registry fixture and disposal tests |
| Regression | R-10 | PASS | Arabic/English localization and independent activation | Suite client and fixture checks |
| Regression | R-11 | PASS | Disposal, native integration and package integrity | Installed service fixtures and packed test suite passed |
| Regression | R-12 | PARTIAL | Shared suite behavior across live Desktop restart | Host reconstruction covered in installed fixture; full Desktop session blocked [R1] |

## Evidence and final assessment

The [sanitized JSON evidence](evidence/direct-chat-phase-3-2-medium/results.json) contains native request tool names, state and counts, status codes, ACL roles, scale timings, and model metrics. It excludes response text, prompts, raw logs, credentials, authorization headers, private profile data, local paths and security principal identifiers.

The safe next acceptance steps are closure of the two native visibility failures, supported Host coverage for registry unavailability, confirmed Windows effective access, and a complete isolated test of the packaged Desktop. The passing dispatch fixture and successful source-commit CI provide scoped evidence. The documentation layout failure is independently reproducible on the report changeset. **Recommendation for PR #79 is NOT READY FOR MERGE.** No fixes, releases, or merge were performed during validation.
