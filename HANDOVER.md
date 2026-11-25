# ABINADWAN Plugins Suite — development handover

> **Published stable [v1.0.3](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/releases/tag/v1.0.3)** includes the My Profile built-in preset fix. The archive implementation is on `feature/chat-control-archive-management-v1.1.0` and targets `develop` through [draft PR #72](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/pull/72).

## Current workflow and source of truth

- `develop` is the integration base. [PR #33](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/pull/33) supplies Direct Chat and My Profile security changes. [PR #34](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/pull/34) supplies the catalog, retention and reasoning changes. The only Git conflict was in the Direct Chat Host entry point. The resolution keeps both tool-denial hooks and the hardened prepare route, adds the owner-only read-only catalog, and shares canonical directory validation between the two.
- The [component reference](docs/DETAIL.md) describes current behavior. The [security audit](docs/research/SECURITY_CODE_AUDIT_2026_11_22.md) and [architecture review](docs/research/CHAT_CONTROL_ADAPTIVE_DIRECT_CHAT_V2.md) hold evidence, upstream API gaps and acceptance criteria.
- My Profile's `v1.0.3` hotfix `452dbf68c2ea1f3b125de58a25596054a36812f2` is absent from `develop`. Integrate it through a separately reviewed PR before final integration. Track archive verification in the [implementation report](docs/research/v1.1.0/CHAT_CONTROL_ARCHIVE_IMPLEMENTATION_REPORT.md).
- Changes move from `develop` to `main` through a reviewed PR. A public release is created from an explicitly approved stable commit. New `v1.1.0` work returns to `develop`; deletion requires independent architecture and safety acceptance before release.

## Consolidated component status

| Component | Implemented on develop | Remaining verification or limit |
| --- | --- | --- |
| Environment & Context | Default **On**. Read-only native Session/Workspace context and usage estimates. | Adapter usage can be incomplete. |
| Humanizer | Default **On**. On-demand native rewriting Skill. | Already-loaded instructions can remain in a conversation. |
| My Profile | Default **Off**. Native Settings, existing v4 permissions and backup compatibility. Recognized disclosure replay checks cover additional newline formats, and the shared prompt copy strips additional formatting controls. | Run Desktop provider-bound privacy and multilingual checks. Revocation cannot remove historical or previously sent data. |
| Direct Chat | Default **Off**. Separate native Session IDs in one permanent Workspace. Owner-gated discovery, search, recent and bounded creation sorting, paging and native management. Tool-denial covers canonical paths and aliases. Prepare uses owner-only POSIX creation, redacted logs and no-store responses. | Sessions share a filesystem cwd. Test actual Windows junctions and ACLs, alternate tool paths, remote authorization and restart/reconnect in disposable Profiles. DSH exposes one native Workspace tree. |
| Chat Control | Default **Off**. Authorized inventory, conversation and Workspace protection, policy overrides and UTC eligibility previews. The v1.1.0 feature branch adds visibility, the archive hub and confirmed native restore. | DSH owns the sidebar archive filter. The feature branch requires its own Desktop and CI acceptance. |
| Adaptive Reasoning | Default **Off**. Manual native Session effort plus opt-in recommendations that preserve explicit effort. Bounded Profile aggregates with atomic persistence and reset. | Test model changes, restart and reset on Desktop. DSH lacks request-bound effort admission and a plugin policy hook covering all subagents. |

## Verification

Run `npm ci --ignore-scripts`, `npm test`, and `npm run check:package`. The Windows and Ubuntu Node.js 22/24 workflow also exercises pinned Harness Host contracts with synthetic data. Disposable Desktop acceptance remains open for the combined changes. Verify component enable/disable and re-enable, keyboard and RTL navigation, native Workspace and Session identity across reconnect and restart, legacy settings and retention exclusions after upgrade, reasoning selection and aggregate reset, and model-bound disclosure across provider switches and replay. See the [acceptance checklist](docs/research/CHAT_CONTROL_ADAPTIVE_DIRECT_CHAT_V2.md#desktop-acceptance-still-required).

## Historical baseline notes (not current behavior)

The pre-v1 integration worktree began at `4faa6fa`; merges `cb31863` and `4dff6eb` brought earlier Personal Profile and Adaptive Reasoning branches together. An earlier unified snapshot recorded **220/220** source and package tests and **38/38** pinned offline Host checks. Those counts apply to that earlier snapshot.

The owner later approved [Direct Chat Phase 2](docs/research/DIRECT_CHAT_PHASE2_DESKTOP_ACCEPTANCE.md) and [Settings localization/renames](docs/SETTINGS_NAVIGATION_NAMES_2026_11_21.md) before the v1.0.0 release. See [archived Phase D3](docs/archive/research/NEW_PLUGINS_PHASE_D3.md), [My Profile Phase 8 report](docs/PERSONAL_PROFILE_PHASE8_REPORT.md), and [Adaptive Reasoning historical handover](docs/research/ADAPTIVE_REASONING_HANDOVER.md) for the original exploratory records and their limitations.
