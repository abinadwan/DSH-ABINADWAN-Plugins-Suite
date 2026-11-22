# Consolidated DSH Desktop acceptance — v1.0.1

> **Pending, not executed.** This is the single native Desktop test round the owner requested after all eight source/CI stages. Green GitHub Actions does **not** satisfy this release gate. Candidate source should be pinned by full commit SHA in a **disposable** DSH Profile. Published v1.0.0 and the normal Profile must remain untouched until separate release approval.

## Test setup and evidence discipline

- [ ] Record DSH Desktop version/build, OS build (Windows, plus other supported Desktop systems if available), plugin candidate full SHA, installation method, user/Peer roles, Node and Host versions where relevant
- [ ] Back up relevant fictional Profile data; use only disposable Workspaces, Sessions, paths and fictional preferred names or canary messages; retain rollback SHA
- [ ] Verify clean install, activation of six separate components, disable/re-enable, restart/reconnect and manual native Plugin Manager update eligibility
- [ ] Record a result for every case: Pass / Fail / Blocked / Not tested, screenshots or sanitized traces, issue number, owner/date, exact reproduction; do not upload secrets

## 1. Environment & Context

- [ ] Verify sidebar/context/token indicators against actual Host state and absent/unavailable metadata
- [ ] Check stale data, missing permissions, loading/errors and disable/re-enable without mutating unrelated Session state
- [ ] Confirm English/Arabic labels, keyboard navigation, screen reader and narrow window layouts

## 2. Humanizer

- [ ] Enable/disable without changing unrelated tool requests or AI provider settings
- [ ] Test the authorized prompt-processing path on fictional messages with and without relevant context
- [ ] Inspect absence of secret/canary disclosure and safe behavior on Host error and reconnect

## 3. My Profile

- [ ] Verify opt-in, default private and legacy v4 migration behavior with fictional preferred-name/nationality/gender fields
- [ ] Inspect **actual provider-bound requests** on new and in-history conversations before/after permission revocation; no revoked field may replay
- [ ] Verify disable/re-enable, cross-provider switch, reset, failed Settings save, denied Peer and original provider data retention limits
- [ ] Confirm no identity numbers, real medical data or actual personal records are needed

## 4. Direct Chat

- [ ] Start one native permanent Workspace and distinct completed native Session IDs; observe empty draft reuse and no unrelated Workspace deletion
- [ ] Verify both tool-denial hooks, canonical symlink/junction aliases, 48-level missing suffix and unrelated-path non-denial; check Windows ACLs and short-path spelling
- [ ] Check owner/non-owner catalog/prepare authorization and reconnect, cancellation, timeout, 409 BUSY/CHANGED/unavailable and neutral logs
- [ ] Validate search/history at 100, 1,000 and 10,000 fictional Sessions, page performance, title/ID search, Unicode, sorting and explicit unavailable creation ordering
- [ ] Verify rename failure/retry, archived/protected flags, no unauthorized Session metadata, and keyboard/RTL history interactions

## 5. Chat Control

- [ ] Exercise 7/30/90/180/365/Forever boundaries (24-hour UTC day logic), global and Workspace overrides and inheritance
- [ ] Protect individual conversations and whole Workspaces; check pinned, running, retained, archived, duplicate/ambiguous membership and migration-format exclusion
- [ ] Inspect stale concurrent Settings revisions and read-only Peer permissions; no incorrect success after conflict
- [ ] Confirm the interface is preview-only: **no delete worker, auto cleanup scheduler or recoverable Session deletion claim**

## 6. Adaptive Reasoning

- [ ] Validate manually chosen provider-supported effort, saved preferences, unavailable provider and changed route/adapter
- [ ] Test English, Arabic MSA/Gulf and mixed prompts; inspect opt-in recommendation behavior without unsupported automatic per-message application
- [ ] Check statistics count only committed usage, no prompt contents, persistence after restart, simultaneous Hosts, corrupted/unknown files, failed reset and retry
- [ ] Capture real provider-reported reasoning token fields and absence of fabricated token/cost savings
- [ ] Check Arabic/English menu labels, focus, screen-reader descriptions, RTL and long provider/model names

## Cross-suite, operations and release decision

- [ ] Verify one full enabled/disabled lifecycle with all six components, upgrade from stable pinned SHA to candidate in disposable Profile and rollback
- [ ] Verify security/privacy boundary with non-owner Peers and tool Host routes; document the limits of plugin hooks vs OS sandboxing
- [ ] Test error/timeout/reconnect and offline failure messages, no false success, keyboard/mouse actions and WCAG-oriented accessibility checks
- [ ] Confirm platform-specific filesystem permissions and no data loss or surprising deletion after restart or settings reset
- [ ] Record open high/medium findings, issue references, resolved PRs and whether the owner accepts residual risk
- [ ] **Release authorization is separate:** only after all critical cases pass may an owner approve promotion of develop to main and a single published v1.0.1 tag/release. Until then, main and v1.0.0 stay unchanged

**Decision:** BLOCKED FOR RELEASE until this checklist is executed and signed off. Completing the automated stages never marks these Desktop items as passed.
