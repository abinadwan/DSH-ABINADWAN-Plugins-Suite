# v1.0.1 development progress — single source of truth

> **State: Phase 1 candidate work in progress; no v1.0.1 candidate published.** Last baseline review: 2026-11-22. This living register is updated on the phase branch for owner review and reaches `develop` only after an approved PR. The published v1.0.0 tag remains unchanged. No release is authorized by this work.

## Why this register exists

Maintain a verifiable history of what was **implemented**, what is still **pending**, and what is **blocked** across eight independent pre-Desktop phases. Record evidence instead of declaring success from plans or mocks. Every phase must own one primary problem, one feature branch, one Draft PR targeting `develop`, and a reproducible close-out report. Start the next phase only after review and approval of the previous one. No stage PR or this document authorizes a merge, release, destructive data handling, or deployment.

## Version rules (important)

A single release label `v1.0.1` **must not be reused** for multiple separately published or tagged versions. All eight stages belong to the **same future patch release**, with distinct prerelease candidate identifiers:

| Phase | Candidate package version | Work branch (from updated `develop`) |
| --- | --- | --- |
| 1 — Integrated security audit | `1.0.1-rc.1` | `fix/phase-01-security-audit` |
| 2 — Chat Control retention/protection | `1.0.1-rc.2` | `fix/phase-02-chat-control-retention` |
| 3 — Direct Chat search/history performance | `1.0.1-rc.3` | `fix/phase-03-direct-chat-performance` |
| 4 — Reasoning statistics durability | `1.0.1-rc.4` | `fix/phase-04-reasoning-statistics` |
| 5 — Arabic reasoning classifier | `1.0.1-rc.5` | `feat/phase-05-reasoning-arabic` |
| 6 — Arabic UI and RTL | `1.0.1-rc.6` | `feat/phase-06-arabic-ui-rtl` |
| 7 — UX loading/error/retry states | `1.0.1-rc.7` | `fix/phase-07-ux-reliability` |
| 8 — Final automated QA and regression gates | `1.0.1-rc.8` | `test/phase-08-ci-regression` |

**Candidate vs published:** a Git commit with `1.0.1-rc.N` in package metadata is **not** a GitHub Release or an installed update. Do not create candidate tags unless separately approved. Only after all phases, owner code review, real Desktop acceptance, compatibility and explicit release authorization should `develop` be promoted through a PR to `main`, updated to package version `1.0.1`, and published once as `v1.0.1`. If Desktop remains deferred, leave the final candidate unreleased.

At each approved phase, update all version-dependent source/metadata **consistently** (e.g. `package.json`, `package-lock.json`, `client.js`'s `INSTALLED_VERSION`, and tests that check package version). Preserve all statements that **v1.0.0 is the currently published stable release**. Distinguish candidate version from published release badges, download instructions, and update feeds. Run `npm run check:package` and the docs/version contract tests. Do not alter existing Git tags.

## Known good baseline before phase 1

- **Historical tested runtime baseline:** `develop` at `8abb5f607e274b574fa1735f51862b76a01b11cc` (security PR #33 and feature PR #34).
- **Phase 1 starting base:** latest `develop` at `9418195ae05cc4a3873eea20f56a02e355dc0c21` after merge of PRs #36–#38; the work branch is `fix/phase-01-security-audit`.
- **Integration review:** [#35 develop → main](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/pull/35) was merged as `e4c4c762dcba492879438ed34ba4592fa1a098b0`. The **published release tag** remains `v1.0.0` at `206f3e814800478f961af05b673a1235ea8ba002`.
- **Last consolidated CI evidence:** [Windows/Ubuntu Node 22/24 — successful](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/actions/runs/45005085552).
- **Currently implemented but still needing Desktop acceptance:** Direct Chat owner-authorized catalog/search/sorting and tool-denial hardening; Chat Control safe eligibility preview; Adaptive Reasoning saved statistics and opt-in recommendations; My Profile recognized disclosure-replay protection.
- **Upstream-dependent and *not implemented*:** real/recoverable Session deletion, automatic destructive cleanup, authenticated per-message effort overrides, universal Subagent effort policy, native second Workspace tree, and OS-grade per-Session filesystem confinement. Do **not** count these as a phase completion or silently activate them.
- **Still deferred:** real Windows Desktop lifecycle and accessibility, actual provider-bound request capture, Windows junction/ACL checks, Profile migration/restart and native authorization paths.

## Phase progress dashboard

| Phase | Primary problem | Status | Evidence / review | Pending |
| --- | --- | --- | --- | --- |
| 1 | Integrated security audit and regression | **In progress** | [Phase 01 review record](research/v1.0.1/PHASE_01_SECURITY_INTEGRATION.md) · [red reproduction CI](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/actions/runs/45047616116) | Current candidate CI, owner review, and Windows Desktop/provider checks |
| 2 | Chat Control retention/protection consistency | **Not started** | — | Boundary/permission/concurrency tests |
| 3 | Direct Chat search/history scale | **Not started** | — | 100 / 1,000 / 10,000 synthetic-item benchmarks |
| 4 | Adaptive Reasoning statistics persistence/recovery | **Not started** | — | Crash, corruption, concurrent writer and reset tests |
| 5 | Arabic complexity classification | **Not started** | — | Arabic/mixed-language benchmark and no English regression |
| 6 | Arabic UI and RTL | **Not started** | — | Translation, keyboard, direction and accessible UI tests |
| 7 | UX failures/loading/retry states | **Not started** | — | Non-misleading success/error and network failure handling |
| 8 | Cross-platform CI regression coverage | **Not started** | — | CI matrix, package validation, source-vs-Desktop gate report |

Status vocabulary: `Not started`, `In progress`, `Implemented — needs review`, `Approved on develop`, `Blocked`. A successful CI run is evidence, not proof of real Desktop behavior.

## Phase-by-phase close-out requirements

### Phase 1 — Security integration audit

**One problem:** previously merged security and product features may interact in ways tests miss. Cover both Direct Chat tool-denial hooks, canonical path aliases and nonexisting suffixes, owner-only prepare/catalog routes, no sensitive path logging, My Profile replay/revocation boundaries, and lifecycle disposal. First reproduce any new defect with a failing test, then fix. Do not treat missing OS sandboxing or Host-owned APIs as bugs this phase can close.

**Implemented on the candidate branch (not approved yet):** reproduced a deep unresolved directory-suffix bypass of Direct Chat's symlink/junction alias tool guard (48 pending segments; original search capped at 32); removed the arbitrary traversal ceiling; added regression checks for both denial hooks and for unrelated deep Workspaces. Updated candidate version metadata consistently to `1.0.1-rc.1`. Extended the pinned offline My Profile Host fixture to check in-history follow-up after revoking permission. [Phase 01 record](research/v1.0.1/PHASE_01_SECURITY_INTEGRATION.md) documents the red CI proof and review scope. **Pending:** full current-head matrix, any follow-up test fixes, independent owner approval, and real Windows Desktop / provider-bound / alternate Host-route checks.

### Phase 2 — Chat Control retention/protection

**One problem:** stale/ambiguous Session membership, protection changes and timestamp edge cases can make previews misleading. Validate all 7/30/90/180/365/Forever policies, Workspace overrides, pinned/running/archived Sessions, explicit confirmation and revision conflicts. No deletion worker or scheduler activation.

**Completed:** none under this phase yet. **Pending:** synthetic boundary and concurrency fixtures, reviewed policy rules and tests.

### Phase 3 — Direct Chat search/history performance

**One problem:** metadata browsing/search/sorting under large inventories and failures. Benchmark 100/1,000/10,000 synthetic Sessions without reading transcripts, leaking unauthorized IDs or unbounded allocation. Respect existing API limits (e.g. bounded creation-time sort); explicitly report unavailable ordering rather than fabricating results.

**Completed:** none under this phase yet. **Pending:** metrics, tests, any proven optimizations and acceptance criteria.

### Phase 4 — Reasoning statistics durability

**One problem:** concurrent writes, crashes, reset and corrupted Profile-local aggregate can produce partial/lost counts. Cover atomic-replacement boundary, unknown formats, restart/reopening, retry and double-counting, bounded memory and failure transparency. Never promise guaranteed recovery after power loss.

**Completed:** none under this phase yet. **Pending:** run evidence, error-case matrix, actual storage limits.

### Phase 5 — Arabic reasoning classifier

**One problem:** current deterministic classifier recognizes English intent keywords but not equivalent Arabic ones. Add documented Arabic/MSA/Gulf and mixed-language cases without persisting prompt text. Build fixed expected-tier fixtures, measure accuracy and latency against the original English set. Do not enable unsupported automatic effort application.

**Completed:** none under this phase yet. **Pending:** transparent benchmark, observed improvements and failures.

### Phase 6 — Arabic UI and RTL

**One problem:** parts of Direct Chat, Chat Control and Adaptive Reasoning still behave as English-only regardless of DSH locale. Add compatible translations/RTL, correct mixed-direction content, and keyboard/accessible labels. Preserve English and existing language fallback. Verify UI through synthetic fixtures; mark Desktop visual validation open.

**Completed:** none under this phase yet. **Pending:** Arabic and English component tests, keyboard/a11y evidence.

### Phase 7 — UX failure handling

**One problem:** network/reconnect/rename/save/recommendation workflows may show unclear loading, empty or failure states. Cover cancellation, retry boundaries and error messages without claiming success prematurely. Preserve native Session identity and Settings revision checks.

**Completed:** none under this phase yet. **Pending:** failing-case fixture tests and UX outcome report.

### Phase 8 — Automated regression/CI

**One problem:** the above behaviors must remain protected against regressions on each new commit. Group and run security, performance and component tests, package/source compatibility and pinned offline Host integration. Do not claim Windows Desktop acceptance from GitHub Actions.

**Completed:** none under this phase yet. **Pending:** cross-platform final matrix, regression coverage map, deferred Desktop checklist and release-readiness decision.

## How to update this document **after each phase**

In the **same phase PR** (no separate documentation-only follow-up required), update this dashboard and the matching section. Add an immutable phase record at `docs/research/v1.0.1/PHASE_0N_<SHORT_TOPIC>.md` and link it here. Keep the previous phase records; never overwrite historical evidence. The phase record must include:

1. **Identity:** phase number, target problem, source branch, target `develop` base SHA, final commit SHA, candidate version, PR URL, author, date.
2. **Delivered:** changed capabilities, touched files, concrete user-visible behavior, migrations, security implications; list what was actually completed.
3. **Evidence:** tests executed with counts, Windows/Ubuntu Node 22/24 check links and status, benchmarks (method/data/limits), any failing reproduction before fix, package verification.
4. **Open/pending:** every uncompleted or partially implemented acceptance criterion, reason, owner/dependency, risk and priority, suggested next action.
5. **Blocked by DSH:** exact API/contract limitation with source reference, plus what is safely disabled.
6. **Compatibility:** previous settings and Session IDs preserved; known risks and rollback/restore constraints.
7. **Desktop deferred:** concrete manual steps for disposable Windows Profile, expected result, and unverified claims.
8. **Decision & sign-off:** proposed `Approved on develop` or `Needs changes`, explicit reviewer approval reference and date; do not infer approval from green CI.
9. **Next phase:** exact handover, required prerequisites, any regression tests to preserve.

### Phase gate / workflow

1. Create the designated new phase branch from the **latest** `develop`.
2. Change candidate metadata to `1.0.1-rc.N`, build only that phase's main scope, and add regression tests.
3. Update this tracker and add the immutable report (no invented data or results).
4. Run `npm ci --ignore-scripts`, `npm test`, `npm run check:package`, pinned Host tests and full Windows+Ubuntu Node 22+24 CI.
5. Open **Draft PR → develop** with exact evidence and a remaining-work checklist.
6. **Stop for explicit owner approval.** Do not self-merge. After approved merge, verify `develop` commit and update `Approved on develop` evidence. Delete the phase branch only after integration checks pass.
7. Start the next phase from that new `develop` revision.

**Hard restrictions:** Do not merge into `main`, publish a version/tag, manipulate real user data, enable unsupported destructive cleanup, or claim filesystem isolation/Windows Desktop acceptance. PR #35 was merged into `main` without publishing a release; maintain the same separate approval and real-Desktop gates for any future release. Keep [PR #39](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/pull/39) as Draft until Phase 1 owner review.

## Current decision log

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-11-22 | Use one patch-release train `1.0.1` and sequential `1.0.1-rc.1` through `rc.8` | Each phase gets an identifiable tested artifact without reusing one published version |
| 2026-11-22 | Keep `main` and published `v1.0.0` unchanged during source-only phases | Final release requires Desktop acceptance and separate authorization |
| 2026-11-22 | Track completed and pending work in both this living dashboard and per-phase immutable reports | Allows returning to unresolved problems with source, evidence and decision history |
| 2026-11-22 | Start Phase 1 from `develop` at `9418195`; keep stage in a Draft PR | Security red/green regression and full candidate verification precede owner approval |
