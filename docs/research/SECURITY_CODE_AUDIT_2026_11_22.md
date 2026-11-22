# Direct Chat and My Profile — source-level security hardening (2026-11-22)

> **Scope:** code review and automated source/Host contract tests on the independent `security/direct-chat-profile-hardening` branch, based on the published `v1.0.0` commit `206f3e814800478f961af05b673a1235ea8ba002`. **No real Windows Desktop session, provider request capture, process sandbox or endpoint exposure test was performed.** Findings below apply to this branch, not automatically to the installed v1.0.0 release.

## Confirmed defects and reproductions

| ID | Component / risk | Reproduction before fix | Change |
| --- | --- | --- | --- |
| DC-01 | Direct Chat's tool-denial predicate compared the textual session `cwd` with its protected Workspace root. An **existing symlink / Windows junction** pointing from a different path into the protected tree was not recognized. A tool request whose `cwd` used that alias could pass the plugin's guard. | New `symlink aliases into Direct Chat cannot bypass either tool-denial hook` regression reproduced `undefined` instead of `DIRECT_CHAT_TOOL_DENIED` on the original Host code. | In addition to the existing conservative prefix guard, canonicalize the actual `cwd` per attempted execution with `realpathSync.native` and check the result against protected roots. Normalize Windows drive and extended-length path aliases into one namespaced representation. Keep both `tools/pre-execute` and `tools.guard` hooks. |
| DC-02 | An exception from failed Workspace preparation was logged via `String(error)` and could reveal the user's absolute Profile path. Error responses lacked `Cache-Control: no-store`. | Code inspection found the unsafe log expression; new 400/500 response tests failed before the fix. | Log only allowlisted error **codes**, never the original filesystem exception/stack. Add no-store to all API responses, including failures. |
| DC-03 | The OS default `umask` could create Direct Chat data/Workspace folders with group/other access on POSIX. | The new owner-only-permissions test initially observed nonzero group/other permissions in Linux CI. | Set `mode:0o700` for **newly created** folders. Existing folders are deliberately not chmod'ed; Windows ACLs require a separate Desktop test. |
| DC-04 | A path alias ending in a **not-yet-created child folder** under the protected Workspace failed a full-path `realpath` check. Tools not requiring a valid cwd could then bypass the plugin's path guard. | Added a test for an existing symlink/junction whose target child path does not yet exist. | Find the nearest existing ancestor via bounded parent traversal, resolve that ancestor, and append the missing suffix before checking the protected roots. This is still not atomic filesystem isolation. |
| PP-01 | My Profile's send-time replay check split historical `system` / `developer` prompt text only on LF. A disclosure block replayed with **CRLF or CR** line endings could go undetected even after the user revoked its field permissions. | New synthetic `staleDisclosure` regression returned `false` for a revoked block with CRLF/CR line endings on the original code. | Normalize all three common line ending forms while scanning recognized Profile disclosure sections. |
| PP-02 | The Profile's single-line field sanitizer filtered many control and bidi characters, but left Arabic Letter Mark / LRM / RLM and several deprecated bidirectional formatting controls inside injected profile values. | New synthetic Unicode regression showed hidden direction controls in an explicitly shared `Preferred name` field. | Replace these remaining bidirectional **formatting** controls with spaces before compacting whitespace. Preserve ordinary Unicode text and nonformatting name characters. |

The regression tests were introduced **before** the fixes. On the test-only commit `41c91bc90cea5190554a1a86fbc7ffb76902cfbd`, GitHub Actions reported all three assertions failing; that was the expected red phase of the test-driven repair. [Failing reproduction CI](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/actions/runs/44994405488).

## Validation scope

- Source-only synthetic unit tests: `test/direct-chat-host.test.js`, `test/personal-profile-runtime.test.js`.
- Direct Chat tests cover both Host tool-denial hooks, aliases with existing and absent child paths, unrelated Workspace paths, symlink/junction directory replacements, POSIX folder permission modes and sanitized/correctly uncached error responses.
- My Profile tests cover eight allow/private combinations, legacy exclusion, one-line data rendering, bidi and invisible-format control filtering, current versus revoked recognized Profile blocks, LF/CRLF/CR/NEL/Unicode line separators, and nonleaking terminal refusal.
- Repository CI executes `npm test`, `npm run check:package` and pinned offline Harness contract integration across Ubuntu/Windows Node 22 and 24. It does **not** replace actual Desktop verification.

## Remaining security boundaries (not closed by this change)

1. **No process or filesystem sandbox:** All Direct Chat Sessions share one Workspace filesystem `cwd`; ordinary OS access by other processes, plugins or tools is not blocked by this plugin. The tool-denial guard cannot be described as a complete confidentiality boundary.
2. **Filesystem time-of-check/time-of-use:** Each guard resolves the actual cwd or its nearest existing ancestor (with bounded traversal). Resolution is not an atomic OS security primitive: a hostile process could change links between evaluation and execution. Real filesystem/process isolation requires upstream DSH/OS integration. Existing directories retain their prior permissions.
3. **Host and alternate tool pathways:** Coverage of custom plugins, alternate execution routes, Host authorization before tool dispatch and provider request traces remains incomplete. Do not infer production-wide isolation from passing guard fixtures.
4. **Route authorization / path disclosure:** Upstream DSH's [exact Fetch-route dispatcher](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/client/connection/src/rpc-host.ts) rejects non-owner Peers and has a trusted-origin/authority gate. **This was inspected in upstream source only**, not independently verified in the owner's installed Desktop build or remote configurations. The prepare API returns a local Profile path to its authorized owner; it must not be treated as a general-purpose public endpoint.
5. **Historical personal data:** Revoking a setting cannot erase content previously sent to providers, histories, other plugins, files or summaries. The replay guard recognizes Profile-managed structured-detail sections, not arbitrary rephrased/quoted personal data or custom instructions in old conversations.
6. **Real Desktop acceptance:** Test Windows filesystem junctions and permissions; inspect actual model-bound system/developer messages across both providers and session replay, restart, login/Profile changes, and interaction with any other installed plugins. Until then, acceptance is limited to source-level and CI validation.

## Release and operational policy

This is a **candidate hardening patch**, not a published release or proof of high-assurance isolation. Merge only after reviewing the code diff and CI. A subsequent release should require owner approval and explicit release notes; it must not silently modify the published `v1.0.0` tag.

[Current feature limits](../DETAIL.md) · [Security policy](../../SECURITY.md) · [Phase 2 Windows behavioral acceptance](DIRECT_CHAT_PHASE2_DESKTOP_ACCEPTANCE.md)
