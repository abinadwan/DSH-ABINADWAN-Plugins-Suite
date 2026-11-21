# ABINADWAN Plugins Suite development handover

> **Feature branch note (feature/direct-chat-global-chat-replacement):** The Direct Chat implementation in this branch is intentionally replaced with the Codex Global Chat native-session proof of concept. The Windows LPAC companion description below documents the original `develop` baseline only. Desktop acceptance, persistent hidden Workspace, migration, and permanent deletion are not complete for the replacement. Do not merge or release this branch as-is.

## Baseline and workflow

**Development branch:** `develop`. **Target release:** v1.0.0. **Current candidate:** `0.8.0-rc.1`.

This is the private, unified development baseline for all six components. Branch future work from `develop` and integrate it back into `develop`. The stable release will use one owner-approved pull request into `main` after the acceptance gates close.

The integration worktree started at `4faa6fa`, the accepted Direct Chat storage and Windows lifecycle hardening. Merge `cb31863` adds Personal Profile Phase 8 from `5d8ba7b`. Merge `4dff6eb` adds Adaptive Reasoning from `dcfc346`. The only merge conflict was in `test-support/client.js`. The resolved test context contains `TextDecoder`, `Blob` and `crypto`. The earlier Host-only work at `b10610f` is retained as provenance on its original branch.

The older Phase 8 and Adaptive Reasoning reports document their branch snapshots. Use this handover for the feature gates in the unified baseline. The local Project Recovery Audit is preserved in the original recovery worktree.

## Six-component baseline

| Component | Available in this baseline | Open or gated |
| --- | --- | --- |
| Environment & Context | Default-on read-only session and Workspace inspector, context pressure and token projections. | Rerun the supported Desktop smoke matrix on the release artifact. |
| Humanizer | Default-on native Skill registration and independent enable/disable. | Current registration tests cover lifecycle. Model writing quality depends on the configured model and needs release acceptance. |
| Personal Profile | Candidate on the separate simplification feature branch: one My Information page, two field policies, native v4 settings, v2 backup compatibility, checked-field native prompt contribution. | Source/package and clean rc.5 Desktop request capture, migration/rollback and Workspace/session acceptance must be verified before merge. |
| Direct Chat | Default-off Windows companion with LPAC, private desktop, broker, separate history, Markdown, quoted UTF-8 attachments, and root-scoped storage, migration, deletion and retention. The accepted `4faa6fa` Windows ownership, quarantine, and retryable cleanup protections remain in the integrated tree. | Final packed Desktop install, restart and uninstall acceptance. General binary/image attachments, history search and web search are outside the currently enabled capabilities. |
| Conversation Lifecycle | Default-off native Settings for Workspace inventory, protection, global and Workspace retention preferences and a cleanup preview. | Workspace deletion and automatic retention depend on authoritative upstream retirement, artifact coverage and restart-safe reconciliation. Exact storage usage is unavailable. |
| Adaptive Reasoning | Default-off composer integration for supported manual model effort, saved selection, Apply/Remove and local statistics backed by observed requests. | One-shot reasoning, automatic application and unsupported subagent policies stay gated on rc.3/rc.5. The public native request path offers no safe way to set a temporary effort without persisting it. Classifier evaluation stays synthetic. |

## Verification

Use synthetic inputs and isolated Harness roots. Run package checks from PowerShell so the tar invocation handles Windows paths. The native fixtures use the bundled Node 24.21.0 and separately pinned Harness rc.3 and rc.5 runtimes. Stop pre-locking Direct Chat Hosts before an upgrade exercise. Existing installations and personal backups are outside the acceptance fixture.

| Suite | Coverage |
| --- | --- |
| `npm test` | Source, component registration and lifecycle, Profile backup and privacy, reasoning controls and request gating, Direct Chat storage and client contracts. |
| `npm run check:package` | Package allowlist, version agreement and tests against the extracted package. |
| `qa/profile-host-check.mjs`, `qa/phase8-disclosure-check.mjs`, `qa/phase8-persistence-check.mjs` | Native preference, structured privacy and persistence checks with an offline adapter and synthetic settings. Use `--import ./qa/runtime-resolve.mjs`. |
| `qa/adaptive-reasoning-host-check.mjs`, `qa/new-plugins-host-check.mjs` | Native reasoning admission and shared component behavior using offline adapter fixtures. |
| `qa/direct-chat-appcontainer-check.mjs`, `qa/direct-chat-production-check.mjs` | LPAC and private desktop, competing Hosts, stale storage identity, reparse refusal, retention, verified migration, concurrent deletion and access-cleanup retry. |

The integrated Windows baseline passed **220/220** source tests and **220/220** extracted-package tests on both Node 24.21.0 and 26.10.0. The package has **73** files and excludes QA, tests and Desktop captures. The offline native suites passed **38/38** on each of Harness rc.3 and rc.5 with Node 24.21.0. A synthetic Profile export was also checked against the v2 browser decoder and native schema from main.

Historical evidence remains in [Direct Chat Phase D3](docs/research/NEW_PLUGINS_PHASE_D3.md), the [Phase 8 plan and branch verification](docs/PERSONAL_PROFILE_PHASE8_REPORT.md), and the [Adaptive Reasoning branch handover](docs/research/ADAPTIVE_REASONING_HANDOVER.md).

## v1.0.0 completion order

1. **P0 · Personal Profile simplification acceptance.** On this feature branch, verify independent saved per-field checkboxes on clean and existing sessions, legacy upgrade, backup/rollback, retries, model/provider switches, restart and clean Workspaces. Verify actual request bytes with synthetic data. Keep the existing history limitation visible. Do not merge until owner approval.
2. **P0 · Direct Chat Windows acceptance.** Exercise a packed install and upgrade with older Hosts stopped, native renderer navigation, recovery after Host termination, and component and suite uninstall. Verify real grant/profile cleanup, previous-root preservation, and failure recovery in disposable profiles. Unknown legacy quarantine remains a manual recovery case.
3. **P1 · Adaptive Reasoning native contract.** Establish a supported request-local effort at the claim boundary before enabling temporary selection. Verify late and stale bindings, retries, explicit manual precedence, per-route capability changes, shared-step accounting and hard-crash restoration. Accept light/dark composer and DeepSeek transport evidence before expanding scope. Keep unsupported subagent integrations off.
4. **P1 · Conversation Lifecycle authority.** Finish the external reference review and establish authoritative Workspace ownership, retirement, artifact inventory, recovery and accounting before executing deletions. Test deletion and retention gates on synthetic data.
5. **P1 · Release candidate regression and documentation.** Run the supported Windows and Linux/Node matrix on the final combined package. Verify the real Desktop update, rollback, localization and lifecycle paths, then align user-facing docs and package metadata with the approved six-component scope.
6. **Release gate.** Review source history and distribution contents for private artifacts, check notices, confirm supported runtimes and acceptance results, and secure owner approval for the single consolidated pull request and stable version change.

The preceding verification numbers describe the develop baseline, not this feature branch. The simplified candidate needs its own source, package, native and Desktop acceptance. Release approval remains open.
