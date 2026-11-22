# ABINADWAN Plugins Suite — development handover

> **Published baseline:** [v1.0.0](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/releases/tag/v1.0.0), from `main`, tag commit `206f3e814800478f961af05b673a1235ea8ba002`. This is the owner's first official six-component release. The tagged release is **immutable**: subsequent fixes require a new, separately approved release. GitHub Actions on the published commit passed Windows and Ubuntu, Node 22 and 24.

## Current workflow and source of truth

- **Default and only permanent development base:** `main`. The temporary `develop` branch was deleted after promotion to v1.0.0. Create independent `feature/*`, `fix/*` or `security/*` branches from the current `main` for every new change.
- **Security work in review:** [PR #33](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/pull/33) on `security/direct-chat-profile-hardening`. Keep it **Draft/unmerged** until owner approval. It is not part of v1.0.0 or installed copies.
- **Documentation policy:** [root README](README.md) focuses on implementation technologies and installation; [DETAIL.md](docs/DETAIL.md) describes all six deployed behaviors and limits; [research](docs/research/README.md) preserves engineering evidence and [archive](docs/archive/README.md) retains superseded experiments and plans.
- **Release policy:** passing source/CI tests does not certify the Desktop process, publish GitHub Releases or migrate installed data. A new release requires explicit approval, review, release notes, and a separate tagged commit.

## Six-component v1.0.0 state

| Component | Shipped implementation | Still absent or unverified |
| --- | --- | --- |
| Environment & Context | Default **On**; read-only native Session/Workspace environment, context pressure and estimated token summaries | Estimates are not provider billing records; real Desktop smoke checks for each supported Host remain helpful |
| Humanizer | Default **On**; runtime Skill discovery and on-demand natural text editing | Already-loaded conversations can retain instructions; model output quality is provider-dependent |
| **My Profile** | Default **Off**; native **Settings → My Profile**, v4 preferences, per-field saved sharing permission, consent-gated custom text, v1–v4 import and v2/v4 export, Follow DSH and seven supported UI locales | No encrypted vault; previously shared details can remain in history. Actual outbound request tracing and final multilingual Windows Desktop smoke remain open |
| **Direct Chat** | Default **Off**; button below New Session, one persistent Workspace, independently identified native Sessions and Host tool-denial policy | All Sessions share one filesystem `cwd`; **no per-chat filesystem/process sandbox**, exhaustive alternate Host tool-path validation or automatic deletion |
| **Chat Control** | Default **Off**; native Settings inventory, protected IDs, retention policy configuration and **preview only** | Scheduled retention and permanent/deletion worker have not been implemented |
| **Adaptive Reasoning** | Default **Off**; eligible model manual effort selection and process-local request statistics | Automatic effort prediction, temporary one-message effort, and unsupported subagent inheritance are not enabled |

The previously used UI title **Personal Profile** is now **My Profile**, and **Conversation Lifecycle** is displayed as **Chat Control**. Module IDs and persistent namespaces remain unchanged. The LPAC/AppContainer companion, per-session Direct Chat Workspace model and earlier encrypted Profile prototypes described in historical experiments are **not part of the shipped v1.0.0 architecture**.

## Test and verification status

- Use `npm ci --ignore-scripts`, `npm test` and `npm run check:package`. CI tests both Ubuntu and Windows on Node.js **22 and 24**, and uses pinned offline DSH fixtures for deeper contracts. Source tests and extracted-package tests are different coverage surfaces; neither equals Desktop acceptance.
- The owner reported a **successful in-app update** from v0.7.2 to v1.0.0 using the suite's native GitHub Release updater. This establishes the successful manual update path, **not** a verified failed-update rollback or universal data preservation guarantee.
- Owner Windows Desktop Direct Chat Phase 2 tests accepted button placement, one Workspace, distinct Sessions, persistence through restart and comparative tool denial. Deep request traces, arbitrary Host routes and filesystem/process isolation were explicitly deferred.
- [Security source audit (2026-11-22)](docs/research/SECURITY_CODE_AUDIT_2026_11_22.md) reproduces and hardens symlink/junction path alias tool-guard bypass, Profile disclosure replay line endings, and invisible formatting controls. Its candidate tests and changes are *not* in v1.0.0 until independently merged and released.
- The audit additionally addresses new-directory permissions and path-safe error logging for Direct Chat, using synthetic cross-platform regression tests; existing folder permissions and OS-level access restrictions require their own assessment.
- Historical QA-only suites `qa/direct-chat-appcontainer-check.mjs` and `qa/direct-chat-production-check.mjs` describe earlier experimental companions and do not prove the current native shared-Workspace code runs in a Windows LPAC sandbox.

## Remaining engineering and release gates

1. **Before accepting PR #33:** all four CI jobs must pass on the final head; review source diff and QA claims. Fixes and tests may be developed without Desktop, but do not equate synthetic checks with a real Host audit.
2. **Direct Chat Host/security:** validate every actual tool dispatch route, authorization to `/api/abinadwan-direct-chat/prepare`, symlink changes and mount points, Session and Workspace identity handling, and Windows OS security boundaries. Current Workspace sharing limits need to remain explicit.
3. **My Profile privacy:** verify outgoing request bytes through real providers and on resumed/compacted histories, revocations, model switches and restart. A recognizable Profile-generated disclosure block can be blocked; arbitrary rephrased historical personal information cannot be guaranteed removed.
4. **Optional feature expansions:** Chat Control safe deletion/retention worker, Adaptive Reasoning safe adaptive effort, and Direct Chat improved navigation/search are separate feature scopes. These are not implied by v1.0.0 publication.
5. **Release preparation:** preserve current `main`, review cross-platform CI, keep security caveats visible, confirm backup and migration behavior, then seek explicit owner approval before any merge or version/tag change.

## Historical baseline notes (not current behavior)

The pre-v1 integration worktree began at `4faa6fa`; merges `cb31863` and `4dff6eb` brought earlier Personal Profile and Adaptive Reasoning branches together. An earlier unified snapshot recorded **220/220** source and package tests and **38/38** pinned offline Host checks. Those counts describe that **older snapshot**, not PR #33 or today's final CI run.

The owner later approved [Direct Chat Phase 2](docs/research/DIRECT_CHAT_PHASE2_DESKTOP_ACCEPTANCE.md) and [Settings localization/renames](docs/SETTINGS_NAVIGATION_NAMES_2026_11_21.md) before the v1.0.0 release. See [archived Phase D3](docs/archive/research/NEW_PLUGINS_PHASE_D3.md), [My Profile Phase 8 report](docs/PERSONAL_PROFILE_PHASE8_REPORT.md), and [Adaptive Reasoning historical handover](docs/research/ADAPTIVE_REASONING_HANDOVER.md) for the original exploratory records and their limitations.
