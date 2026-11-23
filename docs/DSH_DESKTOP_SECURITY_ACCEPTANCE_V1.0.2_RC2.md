# DSH Desktop security and privacy acceptance — v1.0.2-rc.2

**2026-11-23, Asia/Riyadh. Security and privacy acceptance is incomplete. MP02 is Blocked for historical provider-wire confirmation.** This candidate retains the existing refusal for unauthorized replay. Native non-owner Peer testing, cross-user Windows ACL enforcement, and Windows directory symlink creation remain blocked.

## Candidate and environment

| Item | Recorded value |
| --- | --- |
| Branch and base | `fix/privacy-security-v1.0.2-rc.2` from `origin/develop` at `28854117cf5fae8911b33f531d4743084141c59a` |
| Native source pin | `a7a3a59d0385652199379e2ee1f3f58eebf7a262`, package `1.0.2-rc.2` |
| Install | Native DSH CLI installed a local tarball produced from the clean pinned checkout. SHA-256 `7ae885f17a91db39f0a36c4ec7d88881af1952cb415fe9875c66313e42983df9`. The installed manifest, client, Direct Chat and My Profile source hashes matched. |
| Desktop and OS | Installed x64 DSH Desktop and embedded Host `0.2.2-rc.5`, packaged build `3f85d888b1297107937d9bd5b853f7e733e179a4`. Windows Professional x64, version 26H2, build `26300.10075`. |
| Runtime | Bundled Node `24.21.0` and pnpm `11.28.5`. Local npm verification used Node `24.21.0` and npm `11.19.1`. Node `26.10.0` decoded the concatenated session frames for the offline history inspection. |
| Isolation | Fresh DSH home and Electron data, one local owner, a separate Direct Chat and unrelated Workspace, and fictional identity values and canaries. The real DeepSeek Messages adapter serialized requests to an authenticated loopback fixture. The fixture supplied synthetic replies. An out-of-tree observer was installed only for tool diagnostics. |

Reference scope and earlier results are preserved in the [develop checklist](DSH_DESKTOP_FINAL_ACCEPTANCE_V1.0.1.md), [v1.0.1 acceptance report](DSH_DESKTOP_ACCEPTANCE_REPORT_V1.0.1.md), [v1.0.2-rc.1 remediation handoff](DSH_DESKTOP_REMEDIATION_V1.0.2.md), and [security policy](../SECURITY.md).

## MP02 — historical privacy revocation

| Case | Status | Native reproduction and result |
| --- | --- | --- |
| MP02-a — Default-private wire control | Pass | Start a Direct Chat with all three fictional fields Private and send `QA-ProfilePrivate`. The main provider request returned 200 and contained none of the fields. |
| MP02-b — Explicit consent and private-field omission | Pass | In Settings → My Profile, enable preferred name and gender, leave nationality Private, and save. Send `QA-ProfileShare` in the same Session. The native adapter’s message history carried exactly the two allowed fields in the recorded canary set. The top-level system field and nationality had no corresponding canary. |
| MP02-c — Live revocation and historical reopen | Pass | Return both checkboxes to Private. Native Settings displayed “Save confirmed by Harness.” Reopen the same conversation from Direct Chat history and send `QA-ProfileWarm`. Desktop recorded a new `INVALID_REQUEST` and the fixture received zero requests for that marker. |
| MP02-d — Cold restart of the same conversation | Pass | Stop the disposable Desktop, cold-start, reopen the same Session from History, verify the prior allowed turn is visible, and send `QA-ProfileRevoke`. Desktop recorded a new `INVALID_REQUEST` and zero requests for that marker reached the fixture. |
| MP02-e — Fresh conversation after revocation | Pass | Start a new Direct Chat and send `QA-ProfileFresh`. The native adapter sent a request with zero prior assistant messages and none of the three fields. The fixture returned 200. The persisted clean Session was separate from historical storage. |
| MP02-f — Stored historical context | Pass | Decode the fictional Session logs without exporting their contents. The historical log retained the earlier allowed name and gender and the refusal code. The private nationality was absent from the inspected history. The fresh log contained none of the fields. |
| **MP02 overall — historical provider-wire criterion** | **Blocked** | An in-history request after revocation produced no wire payload to inspect. The approval required to accept refusal plus the fresh control as the criterion, or to change the continuation policy, is outstanding. |

The behavior matches the existing security contract. My Profile checks recognize earlier disclosure blocks and refuse a request when they no longer match the currently saved permissions. Both the persisted history and the observed refusal are consistent with that guard running before adapter serialization. A historical continuation path was neither approved nor demonstrated safe. No consent, serialization, or stored-history policy changed. The trace covers this one adapter and recognizes the known fictional values. It does not establish erasure of data previously sent to a provider or prevent replay of arbitrary derived text.

Local evidence includes `native-owner-private.json`, `native-owner-allow.png`, `native-owner-revoked-settings.json`, `native-owner-warm-revocation.json`, `native-owner-cold-revocation.json`, `native-wire.jsonl`, and `stored-history-and-privacy-verified.json`.

## Native Peer and Host routes

| Case | Status | Reproduction and scope |
| --- | --- | --- |
| NP01 — Owner Session and Workspace separation | Pass | Open a native Direct Chat and the unrelated default Workspace. The authorized owner history listed Direct Chat sessions. The unrelated read control ran in its own Workspace, and the privacy inspection decoded separate persisted Sessions. |
| NP02 — Owner catalog and prepare | Pass | From the installed renderer, call recent and creation catalog and prepare. They returned 200 with `Cache-Control: no-store`. Catalog returned only Workspace identity and bounded creation metadata. Prepare returned the dedicated path only to the tested owner context. |
| NP03 — Owner Settings read/write | Pass | Read the three consent settings, save allow and then revoke through the native My Profile form. Wire evidence and persisted private settings agreed with those operations. |
| NP04 — Actual non-owner Peer identity and Session/Workspace isolation | Blocked | The installed DSH package’s LiveShare documentation specifies a separately deployed relay, configured authentication and an authenticated viewer. No configured relay or separate test identity was available in the isolated profile. |
| NP05 — Non-owner catalog, prepare and Host routes | Blocked | No native viewer connection. The pinned rc.3 Host fixture enforces owner-only exact-route dispatch under a test Peer. That result is reported as fixture evidence. |
| NP06 — Non-owner Settings read/write and personal-field disclosure | Blocked | No native viewer connection. The owner consent test does not establish viewer admission, write restrictions or disclosure scope. |
| NP07 — Non-owner error wording and sanitized Host logs | Blocked | No native viewer connection. Owner HTTP response checks are covered separately under FS08. |

## Filesystem and tool security

| Case | Status | Reproduction and scope |
| --- | --- | --- |
| FS01 — Installed Host tool admission | Pass | Have the loopback model request the native `read` tool on one fictional file in Direct Chat. The adapter received a denied tool result and no file canary. A disposable observer on the installed Host recorded `DIRECT_CHAT_TOOL_DENIED` on the final execution and independently obtained the same code from the monotonic guard. The earlier pre-execute denial short-circuited the observer’s downstream listener in Direct Chat. |
| FS02 — Authorized unrelated-path access | Pass | Repeat the same relative file read in the separate default Workspace. Its pre-execute listener allowed the call. The independent guard produced no denial and the provider received only the unrelated canary. |
| FS03 — Canonical path and Windows junction | Pass | Windows resolved a disposable junction to the canonical Direct Chat directory. The source-hook fixture exercised both registered checks on the raw alias. On installed Desktop, temporarily replace the dedicated Workspace directory with a junction to a fictional control directory. Both catalog orders refused with 503 and prepare returned 500. Restoring the directory restored all three routes to 200. |
| FS04 — Windows directory symlink | Blocked | Creation of the disposable directory symlink returned `EPERM`. Windows junctions were available and tested separately. No machine-wide setting was changed. |
| FS05 — 48 nonexistent path components | Pass | Append 48 nonexistent components under the junction and the existing short alias. Both source hooks denied with the Direct Chat policy code. Both allowed an unrelated missing suffix. The raw missing suffix was exercised directly in the Windows fixture outside Desktop; native end-to-end admission used the registered canonical Workspace. |
| FS06 — Windows 8.3 short path | Pass | Windows returned a distinct short spelling. The native filesystem resolved it to Direct Chat and both source hooks denied it. Desktop’s ordinary tool run used its registered Workspace path. |
| FS07-a — Windows ACL inspection | Pass | Read Direct Chat and control-directory ACLs. Both inherited their entries. The sampled well-known Everyone, Authenticated Users and Users SIDs had zero detected allow entries with the write-data bit. |
| FS07-b — Effective ACL under another account | Blocked | One Windows principal was available. ACL inspection alone does not establish cross-user effective access or process sandboxing. |
| FS08-a — Neutral native error responses | Pass | Malformed prepare returned 400 and a code-only body. The controlled junction refusal returned code-only bodies, no location or Session metadata, and `no-store`. |
| FS08-b — Installed Host warning redaction | Blocked | The Desktop’s captured standard streams contained no corresponding prepare warning. The neutral HTTP body and source guard tests do not establish what the installed runtime logged. |
| FS09-a — Error recovery and reconnect | Pass | Force a synthetic provider HTTP 400. Desktop displayed `INVALID_REQUEST`. Reload the renderer, verify all three owner routes, and send a new request that completes. Cold-start restoration also passed in MP02-d. |
| FS09-b — Active-turn transport failure | Not tested | Renderer reconnection and a cold restart were exercised. Active execution disconnect, catalog timeout and catalog BUSY/CHANGED outcomes were not forced. |
| FS10 — Concurrent filesystem changes | Not tested | The junction check changed the fixture directory between requests. Timing races between path validation and use remain outside this run. |

The suite’s policy governs calls through the DSH tool pipeline. It does not create an operating-system process or filesystem sandbox. Direct Chat Sessions share a Workspace directory. The same Windows account, other processes and other data paths have their own access rules.

Local evidence includes `native-tool-hook-diagnostics.jsonl`, `native-tool-wire.jsonl`, `windows-alias-hooks.json`, `windows-acl-summary.json`, `native-owner-junction-refusal.json`, `native-owner-routes-restored.json`, `native-warning-redaction.json`, and `native-routes-after-renderer-reload.json`.

## Changes and verification

The branch updates the manifest, lockfile, browser version and version-dependent tests to `1.0.2-rc.2`. The acceptance run reproduced the intended fail-closed behavior and confirmed no new product defect in the cases exercised. Runtime security code and previous reports are unchanged. The evidence scripts and observer were local fixtures.

| Check | Result |
| --- | --- |
| `npm ci --ignore-scripts` | Pass, 82 locked packages installed. |
| `npm test` | Pass, 257 tests passed and one POSIX-only skip. |
| `npm run check:regression` | Pass, four tests passed. Classifier scored 56/57 with zero two-tier errors. |
| `npm run check:package` | Pass, 94 packed files. 256 tests passed. The POSIX-only and source-only documentation checks were skipped. |
| Pinned rc.3 Host integration suites | Pass, 25 tests. Ran the CI-pinned Profile, Adaptive Reasoning, Direct Chat catalog and new-plugins suites with supported Node and actual pinned Host services. These are separate fixture results. |

Screenshots and redacted trace summaries are retained in the separate local evidence directory. Raw requests, credentials, local filesystem paths, screenshots and traces are excluded from the PR. The disposable Desktop and provider were stopped, and the workspace directory was restored. The normal DSH Profile and earlier evidence remained isolated from this run. The published stable version remains `v1.0.0`. Native acceptance and release approval remain open.
