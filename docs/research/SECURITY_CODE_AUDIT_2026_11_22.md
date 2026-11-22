# Direct Chat and My Profile — source-level security hardening (2026-11-22)

> **Scope:** code review and automated source/Host contract tests on the independent `security/direct-chat-profile-hardening` branch, based on the published `v1.0.0` commit `206f3e814800478f961af05b673a1235ea8ba002`. **No real Windows Desktop session, provider request capture, process sandbox or endpoint exposure test was performed.** Findings below apply to this branch, not automatically to the installed v1.0.0 release.

## Confirmed defects and reproductions

| ID | Component / risk | Reproduction before fix | Change |
| --- | --- | --- | --- |
| DC-01 | Direct Chat's tool-denial predicate compared the textual session `cwd` with its protected Workspace root. An **existing symlink / Windows junction** pointing from a different path into the protected tree was not recognized. A tool request whose `cwd` used that alias could pass the plugin's guard. | New `symlink aliases into Direct Chat cannot bypass either tool-denial hook` regression reproduced `undefined` instead of `DIRECT_CHAT_TOOL_DENIED` on the original Host code. | In addition to the existing conservative prefix guard, canonicalize the actual `cwd` per attempted execution with `realpathSync.native` and check the result against protected roots. Normalize Windows drive and extended-length path aliases into one namespaced representation. Keep both `tools/pre-execute` and `tools.guard` hooks. |
| PP-01 | My Profile's send-time replay check split historical `system` / `developer` prompt text only on LF. A disclosure block replayed with **CRLF or CR** line endings could go undetected even after the user revoked its field permissions. | New synthetic `staleDisclosure` regression returned `false` for a revoked block with CRLF/CR line endings on the original code. | Normalize all three common line ending forms while scanning recognized Profile disclosure sections. |
| PP-02 | The Profile's single-line field sanitizer filtered many control and bidi characters, but left Arabic Letter Mark / LRM / RLM and several deprecated bidirectional formatting controls inside injected profile values. | New synthetic Unicode regression showed hidden direction controls in an explicitly shared `Preferred name` field. | Replace these remaining bidirectional **formatting** controls with spaces before compacting whitespace. Preserve ordinary Unicode text and nonformatting name characters. |

The regression tests were introduced **before** the fixes. On the test-only commit `41c91bc90cea5190554a1a86fbc7ffb76902cfbd`, GitHub Actions reported all three assertions failing; that was the expected red phase of the test-driven repair. [Failing reproduction CI](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/actions/runs/44994405488).

## Validation scope

- Source-only synthetic unit tests: `test/direct-chat-host.test.js`, `test/personal-profile-runtime.test.js`.
- Direct Chat tests cover both the Host pre-execution hook and guard, protected path aliases, unrelated Workspace paths, and symlink/junction replacements of permanent storage directories.
- My Profile tests cover the eight allow/private combinations, legacy record exclusion, one-line data rendering, Unicode bidi-control sanitization, current versus revoked recognized Profile blocks, LF/CRLF/CR inputs and nonleaking terminal refusal.
- Repository CI executes `npm test`, `npm run check:package` and pinned offline Harness contract integration across Ubuntu/Windows Node 22 and 24. It does **not** replace actual Desktop verification.

## Remaining security boundaries (not closed by this change)

1. **No process or filesystem sandbox:** All Direct Chat Sessions share one Workspace filesystem `cwd`; ordinary OS access by other processes, plugins or tools is not blocked by this plugin. The tool-denial guard cannot be described as a complete confidentiality boundary.
2. **Filesystem time-of-check/time-of-use:** Canonicalization happens when the Host checks a tool request. It is not an atomic OS security primitive; a hostile filesystem process could change symlinks between guard evaluation and execution. Enforced filesystem/process isolation requires upstream DSH/OS integration.
3. **Host and alternate tool pathways:** Coverage of custom plugins, alternate execution routes, Host authorization before tool dispatch and provider request traces remains incomplete. Do not infer production-wide isolation from passing guard fixtures.
4. **Route authorization / path disclosure:** The Host's `/api/abinadwan-direct-chat/prepare` returns the profile Workspace path to the caller. The browser button checks DSH session-create permission, but the exact Host route authentication/origin contract should be confirmed against the installed Desktop build. This change does not claim that every local/remote client is denied that route.
5. **Historical personal data:** Revoking a setting cannot erase content previously sent to providers, histories, other plugins, files or summaries. The replay guard recognizes Profile-managed structured-detail sections, not arbitrary rephrased/quoted personal data or custom instructions in old conversations.
6. **Real Desktop acceptance:** Test Windows filesystem junctions and permissions; inspect actual model-bound system/developer messages across both providers and session replay, restart, login/Profile changes, and interaction with any other installed plugins. Until then, acceptance is limited to source-level and CI validation.

## Release and operational policy

This is a **candidate hardening patch**, not a published release or proof of high-assurance isolation. Merge only after reviewing the code diff and CI. A subsequent release should require owner approval and explicit release notes; it must not silently modify the published `v1.0.0` tag.

[Current feature limits](../DETAIL.md) · [Security policy](../../SECURITY.md) · [Phase 2 Windows behavioral acceptance](DIRECT_CHAT_PHASE2_DESKTOP_ACCEPTANCE.md)
