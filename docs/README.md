# Documentation index — ABINADWAN Plugins Suite

**Development baseline: v1.0.0 on `develop`; not a published GitHub Release.**

## Where to start

- [Root README](../README.md): installation, components and development/release distinction.
- [Current feature reference](DETAIL.md): **all six** component behaviors, default states, icons, security limitations, updates, supported installations and known gaps.
- [My Profile contract](PERSONAL_PROFILE_LOCAL_SETTINGS.md): settings and privacy rules.
- [Changelog](../CHANGELOG.md), [handover](../HANDOVER.md) and [security policy](../SECURITY.md) for implementation history, acceptance and threat boundaries.

## Documentation audit — 2026-11-21

All **43 pre-existing Markdown files in `docs/`** were inspected for relevance, status and local file references. **None was unrelated to this repository:** even the obsolete Personal Profile encrypted-storage proposals and QA-only Direct Chat companion experiments are project history. They were **retained deliberately** instead of deleting audit/security evidence; old design files were already labeled superseded in many cases and are not shipped in the npm package. This index makes the current vs historical boundary explicit. The current documents and navigation/acceptance records were corrected where they contradicted current code.

**Scope of this pass:** documentation and displayed version metadata, not functional changes to the six components. The package is now tagged **v1.0.0 in source only**; it does not publish GitHub Releases or change the installed user version. See [current version and release caveats](DETAIL.md#installation-and-updates).

## Current reader-facing documentation

These pages describe the present v1.0.0 development source or its current UI contracts.

| File | Reason to keep |
| --- | --- |
| [DETAIL.md](DETAIL.md) | Canonical six-component feature/limitations reference |
| [PERSONAL_PROFILE_LOCAL_SETTINGS.md](PERSONAL_PROFILE_LOCAL_SETTINGS.md) | Current My Profile interface, sharing and backup rules |
| [SETTINGS_NAVIGATION_NAMES_2026_11_21.md](SETTINGS_NAVIGATION_NAMES_2026_11_21.md) | My Profile / Chat Control navigation, localization and compatibility decision |
| [BRANDING.md](BRANDING.md) | Suite and component icon provenance |
| [NEW_PLUGINS_BRANDING.md](NEW_PLUGINS_BRANDING.md) | Direct Chat, Chat Control and Adaptive Reasoning artwork |

## Personal Profile: superseded designs and original plans

These explain decisions already abandoned or replaced. They are **not** instructions to reimplement encryption, old sidebar controls, global consent switches or old storage models.

| File | Reason to keep |
| --- | --- |
| [PERSONAL_PROFILE_PHASE1.md](PERSONAL_PROFILE_PHASE1.md) | Superseded data and permission design |
| [PERSONAL_PROFILE_PHASE2.md](PERSONAL_PROFILE_PHASE2.md) | Superseded in-memory consent design |
| [PERSONAL_PROFILE_PHASE3.md](PERSONAL_PROFILE_PHASE3.md) | Superseded agent-instruction design |
| [PERSONAL_PROFILE_PHASE4.md](PERSONAL_PROFILE_PHASE4.md) | Superseded UI prototype and screenshots |
| [PERSONAL_PROFILE_PHASE5.md](PERSONAL_PROFILE_PHASE5.md) | Superseded encrypted-storage proposal |
| [PERSONAL_PROFILE_PHASE6A.md](PERSONAL_PROFILE_PHASE6A.md) | Synthetic integration/security exploration |
| [PERSONAL_PROFILE_PHASE6B1.md](PERSONAL_PROFILE_PHASE6B1.md) | Synthetic Host identity exploration |
| [PERSONAL_PROFILE_V072_CHANGE_RECORD.md](PERSONAL_PROFILE_V072_CHANGE_RECORD.md) | Historical v0.7.2 architecture and migration |
| [PERSONAL_PROFILE_WINDOWS_ACCEPTANCE.md](PERSONAL_PROFILE_WINDOWS_ACCEPTANCE.md) | Historical 0.7.2 Windows acceptance evidence |

## Personal Profile: later research, tests and acceptance evidence

Version numbers and branch names below identify **historical baselines**, not the current packaged version. Preserve them so unresolved privacy findings do not disappear.

| File | Reason to keep |
| --- | --- |
| [PERSONAL_PROFILE_PHASE7_RESEARCH.md](PERSONAL_PROFILE_PHASE7_RESEARCH.md) | Phase 7A source-contract research |
| [PERSONAL_PROFILE_PHASE7B_CHANGE_RECORD.md](PERSONAL_PROFILE_PHASE7B_CHANGE_RECORD.md) | Phase 7B candidate integration record |
| [PERSONAL_PROFILE_PHASE7C_PRIVACY_GATE.md](PERSONAL_PROFILE_PHASE7C_PRIVACY_GATE.md) | Phase 7C security limitation |
| [PERSONAL_PROFILE_PHASE7D_PLAN.md](PERSONAL_PROFILE_PHASE7D_PLAN.md) | Response-preference benchmark plan/outcome |
| [PERSONAL_PROFILE_PHASE7D_CANDIDATES.md](PERSONAL_PROFILE_PHASE7D_CANDIDATES.md) | Benchmarked instruction alternatives |
| [PERSONAL_PROFILE_PHASE7D_BENCHMARK.md](PERSONAL_PROFILE_PHASE7D_BENCHMARK.md) | Benchmark methods, evidence and results |
| [PERSONAL_PROFILE_PHASE7_WINDOWS_ACCEPTANCE.md](PERSONAL_PROFILE_PHASE7_WINDOWS_ACCEPTANCE.md) | Owner Windows candidate tests and still-open request-level checks |
| [PERSONAL_PROFILE_PHASE8_AUDIT.md](PERSONAL_PROFILE_PHASE8_AUDIT.md) | Read-only recovery/privacy findings |
| [PERSONAL_PROFILE_PHASE8_PLAN.md](PERSONAL_PROFILE_PHASE8_PLAN.md) | Owner-approved simplified disclosure decisions |
| [PERSONAL_PROFILE_PHASE8_REPORT.md](PERSONAL_PROFILE_PHASE8_REPORT.md) | Earlier branch verification; not unconditional release approval |

## Research and implementation evidence for other components

Source history and design limitations, not a second installed plugin. The Direct Chat Phase 2 record includes the owner-accepted Windows functional findings and deliberately deferred deep isolation checks.

| File | Reason to keep |
| --- | --- |
| [research/ADAPTIVE_REASONING_HANDOVER.md](research/ADAPTIVE_REASONING_HANDOVER.md) | Original adaptive reasoning implementation and limitations |
| [research/DIRECT_CHAT_GLOBAL_CHAT_PHASE1.md](research/DIRECT_CHAT_GLOBAL_CHAT_PHASE1.md) | First native Direct Chat replacement checks |
| [research/DIRECT_CHAT_PHASE2_DESKTOP_ACCEPTANCE.md](research/DIRECT_CHAT_PHASE2_DESKTOP_ACCEPTANCE.md) | Owner-accepted Phase 2 and open security boundaries |
| [research/NEW_PLUGINS_PHASE_A.md](research/NEW_PLUGINS_PHASE_A.md) | Initial feasibility/DSH contract research |
| [research/NEW_PLUGINS_PHASE_C.md](research/NEW_PLUGINS_PHASE_C.md) | Delete/retention feasibility research |
| [research/NEW_PLUGINS_PHASE_C_CONTINUATION.md](research/NEW_PLUGINS_PHASE_C_CONTINUATION.md) | Native Settings and Desktop contracts |
| [research/NEW_PLUGINS_PHASE_C_UI_CORRECTION.md](research/NEW_PLUGINS_PHASE_C_UI_CORRECTION.md) | Historical UI correction/screenshots |
| [research/NEW_PLUGINS_PHASE_D.md](research/NEW_PLUGINS_PHASE_D.md) | Core functionality design and evidence |
| [research/NEW_PLUGINS_PHASE_D2.md](research/NEW_PLUGINS_PHASE_D2.md) | Old QA-only Direct Chat companion prototype |
| [research/NEW_PLUGINS_PHASE_D3.md](research/NEW_PLUGINS_PHASE_D3.md) | Old companion/LPAC work, not current architecture |
| [research/SUITE_AUTO_UPDATE_FEASIBILITY.md](research/SUITE_AUTO_UPDATE_FEASIBILITY.md) | Future unattended updates only; current update-now flow is in DETAIL.md |

## Archived implementation plans

These early implementation plans are project-related but superseded. Do not follow their commands without comparing against the current source and product requirements.

| File | Reason to keep |
| --- | --- |
| [superpowers/plans/2026-11-16-personal-profile-consent.md](superpowers/plans/2026-11-16-personal-profile-consent.md) | Historical consent plan |
| [superpowers/plans/2026-11-16-personal-profile-instructions.md](superpowers/plans/2026-11-16-personal-profile-instructions.md) | Historical instructions plan |
| [superpowers/plans/2026-11-16-personal-profile-integration.md](superpowers/plans/2026-11-16-personal-profile-integration.md) | Historical integration plan |
| [superpowers/plans/2026-11-16-personal-profile-phase1.md](superpowers/plans/2026-11-16-personal-profile-phase1.md) | Historical Phase 1 plan |
| [superpowers/plans/2026-11-16-personal-profile-storage.md](superpowers/plans/2026-11-16-personal-profile-storage.md) | Historical storage plan |
| [superpowers/plans/2026-11-16-personal-profile-ui.md](superpowers/plans/2026-11-16-personal-profile-ui.md) | Historical UI plan |
| [superpowers/plans/2026-11-18-new-plugins.md](superpowers/plans/2026-11-18-new-plugins.md) | Historic new-plugin implementation plan |
| [superpowers/specs/2026-11-18-new-plugins-design.md](superpowers/specs/2026-11-18-new-plugins-design.md) | Historic conditional Phase B specification |

## Rules for maintaining this directory

1. Update `DETAIL.md` and the root README when observable component behavior, supported UI names, defaults, storage, backup formats or release policy change.
2. New historical QA reports must say which branch/commit/Host was actually tested and which gates remain open. Do not retroactively convert proposals into proof.
3. Keep internal identifiers and persistent setting namespaces separate from the public labels **My Profile** and **Chat Control**.
4. Preserve prior Desktop/security evidence even if the old implementation was removed. Label it historical and link the current architecture instead of silently erasing risk decisions.
5. Confirm relative Markdown links and all seven component/suite icon files exist. Do not reference missing release SHAs or claim a stable v1.0.0 GitHub Release until one is published and accepted.

Documentation/packaging checks run in the repository CI alongside `npm test` and `npm run check:package`.
