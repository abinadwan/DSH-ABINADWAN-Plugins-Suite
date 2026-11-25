# Phase 09 — Archive Manager rebranding and UI simplification

Owner approved removal of Chat Control Settings and the public name Archive Manager. The historical deletion branch, PR #68 and previous archive/retention records remain intact. Starting revision: `bf4910616a86885b5d133ff9d42211f0091e2769`.

- Public metadata: Archive Manager; sidebar: Archives / الأرشيف. Keep `abinadwan-conversation-lifecycle`, exports, activation defaults, namespace and legacy schema intact.
- Remove Settings section/icon, storage placeholder, retention controls, visibility checkbox and cleanup/deletion previews. Remove Direct Chat's preview-only retention controls; keep its history and protection-aware rename behavior. Retain historical pure retention calculations and compatibility tests, with no runtime preview caller.
- Use the single authorized archive catalog for total/protected counts. Add individual protection toggles, inherited Workspace protection, and a collapsed section for managing Workspace flags and authorized existing protected rows not in the archive list. Preserve unrelated fields using revision-checked settings writes. No native protection or sidebar filter claim.
- Existing native restore guard, authorization and generation checks are retained; no destructive operations and no core patches.
- Existing UI tests for removed controls are replaced by protection/absence tests; pure retention and Host schema migration checks are retained. New tests cover both languages, stale revision, failed writes, read-only access and unauthorized metadata. CI and final Desktop acceptance are pending for this revision. Previous Desktop evidence does not verify these UI changes.
- The My Profile v1.0.3 backmerge remains required before merge. Keep PR #72 draft.
