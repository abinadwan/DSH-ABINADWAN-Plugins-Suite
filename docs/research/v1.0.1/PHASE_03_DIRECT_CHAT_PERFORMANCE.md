# Phase 03 — Direct Chat metadata search/history scaling

> **Candidate review state:** Source and synthetic Host tests only. No real Windows DSH Desktop session, networked provider, 10k-list UI responsiveness or end-user data has been exercised. Work targets `develop`; there is no release, tag, or change to `main`.

## Identity

| Property | Value |
| --- | --- |
| Phase | 03 — Direct Chat search/history performance |
| Date | 2026-11-22 |
| Branch | `fix/phase-03-direct-chat-performance` |
| Source base | `develop` at `f33b72fa4eca3c26ee4ea21b830de809fd86bd72` (approved Phase 02 PR #40) |
| Package candidate | `1.0.1-rc.3`, source only; not released |
| Published stable | `v1.0.0`, unchanged |
| Pull request | [Draft PR #41](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/pull/41) targeting `develop`, pending owner approval |
| Final integration | Not merged; no final SHA |

## Scope and real behavior

Direct Chat stores sessions under **one permanent native DSH Workspace**. History and search use the authenticated/authorized Workspace registry and Session catalog, without scanning conversation transcripts. The Host `/api/abinadwan-direct-chat/catalog` exposes only the canonical Direct Chat Workspace identity and, for explicit creation sort requests of at most 100 registered Sessions, a map of native Session **header timestamps**. Authorization is owned by DSH connection transport, not by a new custom HTTP security model.

The baseline already limits creation metadata reads to a maximum of 100 Sessions and timeouts at 2 seconds. A request exceeding that limit returns `createdAt: null`, **not invented creation timestamps**. For larger inventories the UI intentionally uses native activity timestamps. This stage makes that fallback explicit and verifiable, and measures scale instead of claiming an optimization based on guesses.

## Test-first regression

The new `test/direct-chat-performance.test.js` initially required a bounded, testable pure search/sort helper and an explicit creation-order fallback notice. [Test-first red CI](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/actions/runs/45050660659) failed on Windows/Ubuntu Node.js 22/24 because the helper and clear fallback contract did not exist yet.

The `client.js` change extracts the preexisting metadata-only filter and sort into `filterAndSortDirectChat` used by the actual Direct Chat History React component. It preserves NFC-normalized case-insensitive ID/title search, immutable inventory arrays, deterministic ties by Session ID and 25-item page rendering. No feature broadening or transcript scanning is introduced.

**User-facing correction:** when the bounded Host catalog cannot supply all creation timestamps (for example, 1,000 or 10,000 registered Sessions), both English and Arabic copy now explicitly state that **last activity order** is being shown. The selector still displays the attempted creation sort request, but the fallback is not falsely presented as creation ordering. Actual native metadata is never fabricated.

## Reproducible synthetic benchmark

The `node:test` fixtures execute the production source inventory and sort predicates and the real Direct Chat Host catalog registration, with **fictional Session IDs/titles and no transcript data**. They cover 100, 1,000, and 10,000 records. The CI job installs pinned DSH test dependencies and runs `npm test`, `npm run check:package` and the offline Host fixtures on Windows/Ubuntu Node 22 and 24.

Example observed measurements from **Ubuntu Node 24**, [source CI run 45050796989](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/actions/runs/45050796989):

| Sessions | Inventory + search/sort elapsed | Host discovery + optional creation-sort elapsed | Native header reads |
| ---: | ---: | ---: | ---: |
| 100 | 1.40 ms | 57.06 ms | 100 |
| 1,000 | 8.59 ms | 3.14 ms | 0 |
| 10,000 | 68.06 ms | 5.11 ms | 0 |

These are offline fixture timings from one runner, **not** repeatable Desktop UI frame rates or network round trips. Variance was observed on a second run in the same job (inventory/search/sort: 1.66, 7.45, 65.99 ms; Host 36.93, 2.24, 4.01 ms). They demonstrate bounded behavior for the exercised fixture, not an absolute latency SLA.

The benchmark has a generous 3.5-second per-size regression ceiling to detect gross unbounded work across supported CI environments. That ceiling is **not** a user-facing performance guarantee. Creation-sort is deliberately restricted to 100, rather than silently increasing the limit and exhausting Host persistence.

## Security and correctness assertions

- The Direct Chat registry admits only a canonical registered Workspace identity, never a name-matched decoy.
- A foreign Workspace ID/title is not returned in Direct Chat search results or Host catalog responses.
- Search operates only on authorized Session IDs and metadata; no `transcript`, `message body`, `persistence.load` or content-search API is invoked.
- 100-Session creation sort makes exactly 100 header reads in the synthetic fixture; larger creation sort requests make **zero** header reads and return an explicit unavailable marker.
- Unicode NFC + case folding, whitespace trimming, deterministic ties and nonmutating source arrays are covered.
- No unbounded creation metadata allocation, new background job, disk index, data collection, or session deletion is enabled.
- Native DSH owner authorization for catalog Fetch routes remains a separate upstream contract, with existing Host checks retained.

## Changes and compatibility

| File | Why it changed |
| --- | --- |
| `client.js` | Extract pure metadata-only sort helper and clearly describe creation-order fallback in English and Arabic; align candidate version |
| `test/direct-chat-performance.test.js` | 100/1,000/10,000 authorized browser inventory/search tests and Unicode/order regressions |
| `test/direct-chat-catalog-scale.test.js` | 100/1,000/10,000 native Host catalog fixtures proving no transcript scanning and header-read caps |
| `package.json`, `package-lock.json` | `1.0.1-rc.3` candidate version, no published release change |
| `test/documentation-integrity.test.js`, `test/personal-profile-sidebar.test.js` | version-dependent source assertions |
| `docs/DEVELOPMENT_PROGRESS_V1.0.1.md` | Phase 02 approved merge SHA, Phase 03 progress and deferred Desktop acceptance |
| This report | Immutable audit/reference for owner review |

The published `v1.0.0` README release badge, release-feed logic, MIT license and earlier security policies are unchanged. Existing saved Session IDs and Workspace metadata formats are not migrated. Disable or revert the phase before merge if needed; a post-merge revert must be separately reviewed.

## Open acceptance requirements

1. **Actual Desktop UX at scale:** scroll, input latency and screen-reader/keyboard behavior with realistic 10,000-session Workspaces; history page state and reconnect/restart after settings changes.
2. **Actual Host authorization:** owner vs non-owner Peer, remote access and catalog membership changes, cancellation and timeout behavior. Upstream services must continue enforcing owner-only access.
3. **Host resource pressure:** repeated creation-sort requests at 100 Sessions under slow persistence, 2-second timeouts and 409 BUSY / CHANGED handling; no stale or invented timestamps.
4. **Memory and system latency:** verify real-world network/renderer performance separately from pure synthetic Node timing. No broad performance guarantee is made.
5. **Safety:** no Desktop session deletion, imported transcript scanning or automatic retention cleanup in this phase.

Desktop acceptance is deliberately collected across all eight phases for a **single final DSH Desktop test round**, per owner direction. Source review approval and eventual merge to `develop` do not waive this release gate.

## Handover and decision

**Status:** Implemented — needs review once final PR-head CI passes. Confirm the candidate's latest SHA and all four CI matrix jobs before approval; then merge only into `develop`, delete the temporary branch, and leave `main`/stable release unchanged. Phase 04 (Reasoning statistics durability; `1.0.1-rc.4`) may begin from that updated integration base only after approval.
