# Phase 08 — Final automated QA and regression gates

**Candidate:** 1.0.1-rc.8 on test/phase-08-ci-regression, based on develop at 8a0f45e4f819472375103038b2cc113c843c2ddf (PR #46 merged). **Published stable:** v1.0.0, unchanged. Target only develop; no main merge or release.

## Delivered and automation boundary
The explicit source command `npm run check:regression` runs `node --test test/phase08-regression.test.js` and `node qa/adaptive-reasoning-benchmark.mjs --json`. The GitHub Actions Windows/Ubuntu Node.js 22/24 matrix now invokes it after all normal `npm ci --ignore-scripts`, `npm test`, `npm run check:package` and pinned DSH Host fixture tests. The phase-eight source/packaged-artifact regression file checks the six independently exported components and shipped icons, source candidate/version consistency, no accidentally enabled session deletion or request-local effort, the Direct Chat tool guard and bounded creation-sort contract, and the CI source gate itself.

The existing `npm run check:package` builds a temporary package and reruns the complete Node tests against **the unpacked distributable**. The package does not ship QA/development scripts; the new explicit benchmark is a contributor/CI gate only.

## Cross-phase evidence map
| Phase | Automated gate |
| --- | --- |
| 01 Security | Deep alias path guard in both hooks, no-store routes, owner-only catalog, My Profile in-history revocation |
| 02 Chat Control | 7/30/90/180/365/Forever, authorization/ambiguity, pinned/running/archived, revision conflicts, no deletion |
| 03 Direct Chat performance | 100/1,000/10,000 synthetic Session metadata inventory, native 100-header limit, no transcript search, Unicode sorting |
| 04 Reasoning durability | File-lock/atomic writes, concurrent Host writers, corrupt/unsupported data, reset/retry, bounded aggregate keys |
| 05 Arabic classifier | MSA/Gulf/mixed synthetic labelled corpus; English accuracy/latency benchmark |
| 06 Arabic UI/RTL | Native Host locale changes, translated labels, RTL/English fallback and mixed-direction identities |
| 07 UX reliability | Direct Chat prepare error/retry, catalog 409/retry and unauthorized title suppression |
| 08 Integration | Six component exports/icons, candidate metadata, stable badge, package policy and explicit CI gate |

## Final automated evidence
Record exact final PR-head GitHub Actions links and job conclusions before merge; a passing intermediate head is not enough. Synthetic fixture timings do not guarantee interactive DSH Desktop performance. Every package/source test is distinct from a real native Windows Desktop check. The published v1.0.0 release and main are untouched.

## Release gate — NOT RELEASE READY
The owner explicitly deferred all native DSH Desktop tests to **one final combined round** after Phase 08. They remain unexecuted, not 'passed'. [Combined Desktop acceptance checklist](../../DSH_DESKTOP_FINAL_ACCEPTANCE_V1.0.1.md) defines the release blocker across all six components, session/security boundaries, persistence, accessibility, upgrade/restart and rollback. Do not publish or tag v1.0.1, do not advance main, and do not claim Host-level security isolation or recoverable Session deletion.

## Merge condition
After four-OS/Node CI jobs and package tests pass, merge this stage PR into develop with owner-directed approval, delete its temporary source branch, and preserve only main and develop. Final Desktop acceptance and a separate, explicit release decision still follow.
