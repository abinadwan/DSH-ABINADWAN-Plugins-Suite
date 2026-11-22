# Phase 02 — Chat Control retention and protection consistency

> **Review state:** Implemented candidate, awaiting full final-head CI and explicit owner approval. No automatic or manual deletion was enabled. This report describes source and synthetic Host tests, **not real DSH Desktop acceptance**.

## 1. Identity and version

| Field | Value |
| --- | --- |
| Phase | 02 — Chat Control retention/protection |
| Date | 2026-11-22 |
| Branch | `fix/phase-02-chat-control-retention` |
| Base `develop` SHA | `2a280e37876df78768325d36a46a2742e3456ad0` (after approved Phase 01 PR #39) |
| Pull request | [Draft PR #40](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/pull/40) targeting `develop` |
| Candidate | `1.0.1-rc.2`, source only; **no tag/release** |
| Published stable | `v1.0.0`; remains unchanged |
| Final merge SHA | Not assigned; awaiting approval |
| Reviewer sign-off | Not granted at the time of this report |

## 2. Reproduced defect — incomplete catalog interpreted as ready

The existing client-side `catalogReady` predicate checked Workspace and Session lifecycle states but not the shape of `workspaces.items`, `workspace.sessionIds` or `sessions.byId`. A partial or malformed authorized catalog could therefore be treated as eligible for Chat Control inventory and retention previews even though its membership was not trustworthy. The UI could fail while iterating null/missing membership or show misleading eligibility.

**Red reproduction first:** `test/chat-control-retention.test.js` introduced concrete malformed Workspace and Session snapshots before the implementation change. [Failing CI on the test-first commit](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/actions/runs/45049423963) reproduced the mismatch on Windows/Ubuntu with Node.js 22/24: readiness was `true` for invalid membership when the expected result was `false`.

**Fix:** validate that ready Workspace catalogs have a real `items` array, each Workspace has a nonempty ID and array of nonempty Session IDs, and the Session catalog supplies valid `ids` and a map-like `byId` snapshot. Reject explicitly null or malformed Session metadata rather than treating it as usable. For a missing map, return `false` rather than an undefined truthiness value. Unknown yet-unloaded Session IDs remain excluded from the inventory, not silently treated as eligible. Existing normal, fully shaped catalogs retain their behavior.

**Safety effect:** when the catalog is incomplete or malformed, Chat Control displays an unavailable state and disables retention previews rather than enumerating possibly unverified candidates. This is a consistency and fail-closed UI policy, not a new Host permission boundary.

## 3. Verified scenarios added to automated regression tests

| Area | Coverage and expected outcome |
| --- | --- |
| Global retention | `7`, `30`, `90`, `180`, `365` days and `forever` |
| UTC edges | Just before, at and after each 24-hour cutoff; future, missing and invalid last-prompt timestamp never qualify |
| Workspace policy | Per-Workspace override can replace global policy and `forever` can prevent global expiry; duplicate override records fail closed |
| Membership | Ambiguous ownership and nonadmitted IDs excluded; malformed catalogs unavailable |
| Protection | Individual protected Sessions and entire protected Workspaces excluded |
| Current activity | Running, retained and pinned Sessions excluded |
| Archives | An archived, otherwise verifiably inactive Session is eligible under a finite expired policy; archiving alone is not an exemption |
| Scope exclusions | Legacy Direct Chat Sessions excluded from Chat Control cleanup previews |
| Confirmation | A policy proposal requires explicit `Confirm and save` and writes only a Settings revision-checked policy, not deletes |
| Concurrency | An outdated window receives a conflict and cannot overwrite a more recent policy or protection change |
| Permissions | Read-only Settings access disables mutation of retention and protection choices |
| UI fallback | Invalid membership visibly disables preview rather than crashing |

These are synthetic fixtures and source-predicate tests; they are not evidence of actual Desktop lifecycle, hidden Sessions, Windows filesystem ACLs or provider behavior.

## 4. Changed files and additional README badges

- `client.js`: strengthen Chat Control catalog readiness validation, preserving preview-only semantics; set the candidate `INSTALLED_VERSION`.
- `test/chat-control-retention.test.js`: exercise the real production source predicates against synthetic catalog, protection and policy boundary fixtures.
- `test/new-plugins-settings.test.js`: mounted React scenarios for unavailable inventory, concurrent Settings revision conflicts and read-only policy flags.
- `README.md`: add owner-requested visual badges for **JavaScript ESM**, **Node.js 22/24** (developer CI environment only), **React 19**, **Cordis plugin framework**, and **DeepSeek Harness**. Existing CI/status, `v1.0.0` stable release and MIT badges remain intact.
- `package.json`, `package-lock.json`, `client.js`, `test/documentation-integrity.test.js`, `test/personal-profile-sidebar.test.js`: consistently move source candidate metadata and version-dependent tests from `1.0.1-rc.1` to `1.0.1-rc.2`, without updating stable release text or tags.
- `docs/DEVELOPMENT_PROGRESS_V1.0.1.md`: current status, evidence, open gates and Phase 01 approval baseline.

The source-oriented README technology-badge regression deliberately skips reading the GitHub Actions workflow from the *packed artifact*, because the workflow file is not shipped as runtime content. It still checks the workflow in a source checkout.

## 5. Evidence and pending gates

- **Red proof:** [test-first CI 45049423963](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/actions/runs/45049423963).
- **Initial repair iteration:** the first code fix rejected malformed membership but exposed a missing-map predicate that returned `undefined` rather than `false`; corrected with an explicit Boolean guard.
- **Passing source and fixture matrix:** commit `cdb9b933d9bbb62ace640cd06023893cde4d2ef5` passed [push CI 45049778210](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/actions/runs/45049778210) and [PR CI 45049842042](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/actions/runs/45049842042), including Windows/Ubuntu Node.js 22/24 jobs. Post-documentation **final PR-head CI** must also be checked before approval.
- **Required commands:** `npm ci --ignore-scripts`, `npm test`, `npm run check:package` and pinned offline DSH Host checks, as configured in `.github/workflows/test.yml`.
- **Local execution:** full repository tests run in GitHub Actions, not in a separately instrumented local Desktop build. Do not invent counts or treat an intermediate green run as final-head proof.

## 6. Outstanding problems and upstream DSH blockers

| Priority | Blocker / owner | What remains |
| --- | --- | --- |
| High | Host/Desktop acceptance; maintainer | Confirm archived/running/pinned/multi-Workspace transitions and live Settings updates across reconnect/restart using a disposable Profile |
| High | DSH Session deletion contract | No recoverable owner-authorized Session deletion transaction exists for the suite; destructive operations stay disabled |
| High | Host Settings/access controls | Verify real owner vs read-only permissions and concurrent-window revision behavior with the actual Desktop Settings service |
| Medium | Stale catalog snapshots / Host registry | Test actual metadata refresh, absent inventory items, ambiguous membership and transitions between ready/unavailable |
| Medium | Timezone, clock and lifecycle variations | Validate clock skew, UTC cutoffs around DST changes and native timestamps on Windows Desktop |
| Medium | Scale/UI responsiveness | Very large inventories, pagination and search performance belong primarily to later stages |

**Not implemented:** a delete button, deletion worker, automatic cleanup scheduler, removal of any Session files, recovery UI, filesystem isolation, or migration of old settings. A retention candidate is an **estimate only**.

## 7. Compatibility, rollback and acceptance

Existing Session IDs, Workspace IDs and Settings schema remain intact. No records are migrated or deleted; the new guard may conservatively hide preview content if the upstream catalog is malformed, which is intentional. Revert the unmerged phase branch before owner approval or perform an independently reviewed source revert after approval; neither rollback route should remove Session histories.

**Desktop test procedure:** create fictional Sessions in a disposable Windows Profile; vary global durations and Workspace overrides; pin/protect/open/archive and unarchive each Session; change protection from a second Settings window; disconnect and reconnect while a preview or confirm prompt is present; compare actual accepted candidates against native current membership; verify the UI never deletes anything. Observe error and revision messages, not just green CI.

**Decision:** `Implemented — needs review` only after final-head tests pass. Require owner approval to merge to `develop`. Deleting the temporary branch after an approved merge preserves only long-lived `main` and `develop`. Explicit release authorization and real Desktop acceptance remain separate.

## 8. Next phase

After approval/merge, record Phase 02 merge commit and final CI link in the progress dashboard; preserve the catalog readiness and retention boundary regressions. Then open Phase 03 (`fix/phase-03-direct-chat-performance`) from the latest `develop` at candidate version `1.0.1-rc.3`. Do not silently enable destructive cleanup or modify published `v1.0.0`.
