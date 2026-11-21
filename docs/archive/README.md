# Historical project archive

This directory preserves **15 superseded Markdown files** moved out of active [research](../research/README.md) and `docs/superpowers` during the v1.0.0 documentation cleanup. They remain useful for audit, reproducibility, security analysis and understanding decisions. **They are not current product documentation or implementation instructions.**

## Research and prototype reports

| Archived report | Reason for archival |
| --- | --- |
| [DIRECT_CHAT_GLOBAL_CHAT_PHASE1.md](research/DIRECT_CHAT_GLOBAL_CHAT_PHASE1.md) | Phase 1 verification before the accepted single-Workspace Phase 2 design |
| [NEW_PLUGINS_PHASE_C.md](research/NEW_PLUGINS_PHASE_C.md) | Early capability gate and deletion research |
| [NEW_PLUGINS_PHASE_C_CONTINUATION.md](research/NEW_PLUGINS_PHASE_C_CONTINUATION.md) | Prior Settings/Host tests with superseded Direct Chat security decisions |
| [NEW_PLUGINS_PHASE_C_UI_CORRECTION.md](research/NEW_PLUGINS_PHASE_C_UI_CORRECTION.md) | Historical Desktop UI snapshots and corrections |
| [NEW_PLUGINS_PHASE_D.md](research/NEW_PLUGINS_PHASE_D.md) | Old side-process/native-host feasibility checks |
| [NEW_PLUGINS_PHASE_D2.md](research/NEW_PLUGINS_PHASE_D2.md) | QA-only Direct Chat companion implementation, **not shipped** |
| [NEW_PLUGINS_PHASE_D3.md](research/NEW_PLUGINS_PHASE_D3.md) | LPAC/AppContainer confinement experiment, **not shipped** |

## Superseded implementation plans

| Archived plan | Historical scope |
| --- | --- |
| [personal-profile-phase1.md](superpowers/plans/2026-11-16-personal-profile-phase1.md) | Initial in-memory profile model |
| [personal-profile-consent.md](superpowers/plans/2026-11-16-personal-profile-consent.md) | Earlier consent ledger design |
| [personal-profile-instructions.md](superpowers/plans/2026-11-16-personal-profile-instructions.md) | Earlier instructions inheritance approach |
| [personal-profile-ui.md](superpowers/plans/2026-11-16-personal-profile-ui.md) | Standalone UI prototype |
| [personal-profile-storage.md](superpowers/plans/2026-11-16-personal-profile-storage.md) | Superseded encrypted profile-store proposal |
| [personal-profile-integration.md](superpowers/plans/2026-11-16-personal-profile-integration.md) | Synthetic Host integration exploration |
| [new-plugins-plan.md](superpowers/plans/2026-11-18-new-plugins.md) | Original new-plugin delivery sequence |
| [new-plugins-design.md](superpowers/specs/2026-11-18-new-plugins-design.md) | Phase B design; current implementation differs |

## Interpretation rules

- Claims such as “production-ready,” “blocked” or “not merged” in these records apply **only to their recorded branch, Host version and date**.
- **Current v1.0.0 development Direct Chat** uses one registered Workspace, native Sessions and Host tool denial—not the companion sandbox described in Phase D2/D3. Context and Host security audits remain deferred.
- **Current My Profile** uses DSH Settings, optional sharing checkboxes and user-controlled UI-language selection; it does not use the encrypted persistence or old per-session consent ledger described in the abandoned plans.
- **Current Chat Control** previews retention policy but does not execute permanent deletion; **Adaptive Reasoning** exposes supported manual effort, not the historical experimental automatic/next-message flow.
- Screenshots, JSON and test reports are historical evidence only; they do not assert approval of newer DSH versions or stable production deployment.

[Current functionality](../DETAIL.md) · [Main documentation index](../README.md) · [Source README](../../README.md)
