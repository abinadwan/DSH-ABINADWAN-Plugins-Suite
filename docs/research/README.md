# Technical research — reference material

This directory contains source and contract investigations and a historical Desktop evidence inventory. See the [current component reference](../DETAIL.md) for current behavior.

| File | What remains useful | Boundary |
| --- | --- | --- |
| [SECURITY_CODE_AUDIT_2026_11_22.md](SECURITY_CODE_AUDIT_2026_11_22.md) | Reproduced Direct Chat path-alias and My Profile disclosure-replay/format-control cases with regression tests | Candidate patch only; not a Desktop security certification or published release. |
| [ADAPTIVE_REASONING_HANDOVER.md](ADAPTIVE_REASONING_HANDOVER.md) | Benchmarks, reasoning-adapter contract observations, local test setup | Describes an original experimental branch, including adaptive and one-message modes not enabled in today's bundle. Statements like “production-ready” refer only to that branch's local tests; real Windows UI acceptance was blocked. |
| [DIRECT_CHAT_PHASE2_DESKTOP_ACCEPTANCE.md](DIRECT_CHAT_PHASE2_DESKTOP_ACCEPTANCE.md) | Owner-reported Windows Desktop acceptance of one Workspace, independent Sessions and practical tool denial | Deep Host request-trace, cross-session tool/search isolation and filesystem security were explicitly **deferred**, never passed. |
| [CHAT_CONTROL_ADAPTIVE_DIRECT_CHAT_V2.md](CHAT_CONTROL_ADAPTIVE_DIRECT_CHAT_V2.md) | Current pinned API review, feature matrix, filesystem threat model and Desktop acceptance checklist | Covers the consolidated development branch. Desktop acceptance is pending. |
| [NEW_PLUGINS_PHASE_A.md](NEW_PLUGINS_PHASE_A.md) | DSH SDK/provider constraints, Windows/Desktop inventory and pinned upstream reference comparisons | An initial pre-integration feasibility snapshot from 2026-11-18; several originally blocked features were implemented differently in later branches. |
| [SUITE_AUTO_UPDATE_FEASIBILITY.md](SUITE_AUTO_UPDATE_FEASIBILITY.md) | Trusted-channel design for future unattended update work | Current bundle already has manual, user-confirmed GitHub Release updates for eligible pinned installs; **unattended updates remain unimplemented**. |
| [new-plugins-desktop-evidence.json](new-plugins-desktop-evidence.json) | Preserved machine-readable 2026-11-18 packaged SDK/Desktop contract inventory | Read-only historical evidence for DSH 0.2.2-rc.3, not current Desktop inspection or permission to access user data. |

## Historical research moved to the archive

Seven earlier reports covering original Direct Chat replacement and new-plugin Phase C / D experiments moved to [archive/research](../archive/README.md#research-and-prototype-reports). They remain in Git, along with their visual evidence and rebased relative links. **The LPAC/AppContainer companion in Phase D2/D3 is not the active Direct Chat implementation.**

For architecture, default-enabled components, privacy boundaries, supported updater behavior and installation, use [DETAIL.md](../DETAIL.md) and [README.md](../../README.md). For open issues, use the current code, tests, tracked issues and owner acceptance decisions rather than assuming a historical plan was implemented.
