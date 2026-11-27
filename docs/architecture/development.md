# Development and verification — ABINADWAN Plugins Suite

## Current baseline

Development package 1.2.0 contains six independently toggleable components; see [component contracts](../DETAIL.md). The Host entry is `index.js`, the browser carrier is `client.js`, and `cordis.patch.yml` defines the native bundle. Component implementations, locales and icons live under `plugins/`. Preserve exports, IDs, settings namespaces and migration contracts.

## Browser source and distribution

The DSH lazy-CJS carrier `client.js` is generated deterministically from ordered `client-src/*.js.inc` fragments. The canonical Arabic dictionaries are in `locale/dsh-ui-ar.json`; the shared profile catalog and renderer are in `plugins/personal-profile/preferences.js`. Edit those sources rather than the generated carrier, run `npm run build:client`, and commit the resulting `client.js`. The installer still receives ready-to-run JavaScript and requires no build tool. `npm run check:client` checks reproducibility and syntax in CI; source fragments and build scripts are excluded from the package.

## Workflow and checks

Start from `develop`; propose changes via PR to `develop`. Promotion to `main` and publication require separate owner approval.

```sh
npm ci --ignore-scripts
npm run check:client
npm test
npm run check:regression
npm run check:package
```

CI also exercises pinned Harness Host contracts on Windows/Ubuntu and Node 22/24. Native Desktop acceptance is separate from automated CI. Record the exact artifact SHA, Host, OS, scope and observed outcomes. Use disposable Profiles and synthetic data.

## Scope of responsibility — performance and subsequent phases

The suite owns its plugin code, lifecycle, resource usage, request construction, storage, context additions, UI and its side of documented native integration. DSH internals, model inference, provider latency, Ollama, network, OS and hardware are external. Investigate an external symptom only far enough to isolate the suite's contribution; record external limits rather than repair upstream. Never weaken admission, privacy, cancellation, freshness or persistence checks merely to reduce work.

Phase 04 (target v1.2.1) reviews each component once against applicable startup, memory/CPU, operations/requests, token/context and UI responsiveness criteria. Establish a reproducible baseline for each proposed optimization, compare the same workload after changes, and run only affected regression paths (mandatory repository CI still applies). Classify findings as healthy, improvement needed, not applicable, external or verification required. Reuse earlier accepted evidence; reserve native Desktop/model checks for affected behavior that cannot be verified in automation. Owner approval is required for material scope expansion, promotion or release.

### Phase 04 — initial Archive Manager candidate

The previous ArchivePage memo called the full authorized conversation inventory twice for the same workspace/session snapshot: once for archived rows and once for saved protection rows. The candidate shares that inventory within a single memo evaluation (two traversals to one; 50% fewer inventory builds, not a measured wall-clock or total CPU reduction). Action-time restore validation still builds fresh inventories; filtering, duplicate ownership exclusions, protection semantics and Host authorization are unchanged. The focused synthetic test counts traversals and verifies archived/protected membership. Native latency and CI results are not established by this source-level observation.

### Phase 04 — Humanizer Studio candidate

The Studio render previously normalized every model's reasoning capabilities on each render, including each 250 ms waiting-timer tick and editor input change. Memoize the derived model list against the current catalog groups; a catalog replacement or Host remount rebuilds it. The native catalog revision and exact request-time admission checks remain unchanged. Baseline per normal render with M models: M capability normalizations; after a stable catalog render: zero on subsequent ordinary input/clock renders (React may discard a memo). The existing synthetic React/DOM test now counts native capability reads and exercises editor changes, timing, capability refresh and Host replacement. No reduction in provider calls or measured real Desktop latency is claimed.

### Phase 04 — Environment & Context candidate

The inspector previously rescanned Session admission and Workspace membership on every live projection render, even if both authorized external-store snapshots were unchanged. Seat-local memoization now keys these calculations on the native snapshot identities, selected Session and connection revision, preserving the existing previous-snapshot and disconnect fences. A synthetic 1,002-Session fixture counts both membership scans across five projection updates (baseline: five of each; candidate: no repeat scans in ordinary React renders with unchanged snapshots). The regression also checks ambiguous membership, Session withdrawal and Host replacement. React may discard memoized values; native Desktop performance remains unmeasured. This relies on the native external-store contract that snapshot identity changes on invalidation, already used by the existing subscription architecture.

### Phase 04 — acceptance and owner disposition (2026-11-28)

The owner approved the scoped acceptance results and integration into develop. The performance candidate tested was `b71cc93395a7868078cb4037c8c1f5d27b1ed901`, against baseline `92d83882d3c3b1400c8b1e17554a4a2fb3be8ad5`. [PR #92](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/pull/92) records the decision, implementation and evidence. This documentation-only follow-up does not change the tested runtime or version; promotion to main and publication are separate.

| Component | Review disposition | Evidence |
| --- | --- | --- |
| Archive Manager | Improved | One authorized inventory build rather than two per page memo; synthetic 1,000-Session test. Fresh action-time admission unchanged. |
| Humanizer Studio | Improved | Avoid repeated model capability normalization on stable catalog input and timer renders; real React test verifies native capability refresh. |
| Environment & Context | Improved | Avoid repeated Session/Workspace membership scans on projection-only updates with unchanged snapshots; synthetic 1,002-Session test verifies five updates and connection/withdrawal fences. |
| Direct Chat | Retain | Existing memoization, pagination and bounded metadata lookup; Ubuntu Node 24 source benchmark 100/1,000/10,000 synthetic Sessions: 2.03/9.89/60.17 ms, no transcript I/O. Historical NTFS cached identity lookup 0.95 µs per ID; native accepted title-search scope remains 1,000. |
| Adaptive Reasoning | Retain | Local deterministic classifier, bounded aggregates and batched persistence; CI benchmark 56/57 correct, zero two-tier errors, p99 1.41–3.28 µs across four jobs. No classification inference request. |
| My Profile | Retain | Compact preference section and reminder separation regressions pass. Earlier 752 scored Ollama attempts and rejected prompt-shortening experiments in [IMPROVEMENTS.md](../IMPROVEMENTS.md) justify preserving quality rather than speculative token reduction. |

**Automated evidence:** exact-head [Push CI 46070473752](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/actions/runs/46070473752) and [PR CI 46070478086](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/actions/runs/46070478086) passed all four Windows/Ubuntu Node 22/24 matrix jobs and the Suite release gate. Ubuntu source tests 347/347 per job; Windows 344 passed, three POSIX-only skips per job; no failures. Packed tests: Ubuntu 340 passed/1 skip, Windows 337 passed/4 skips (additional source-only docs check). Pinned Host fixture 35/35 and focused regression 4/4 per job; carrier, package and mandated dependency audit passed. Intermediate `f0d8b98` failed the old stateless React double's sidebar test because it lacked useMemo. `b71cc93` fixes the test double without production changes; actual React regression remained intact.

**Native Desktop acceptance:** owner-supplied Codex reports for exact candidate above; DSH 0.2.2-rc.5, Windows 11 26H2 build 26300.10075, isolated disposable Profile and synthetic data. Installation initially required owner confirmation; no acceptance was claimed before installation.

| Case | Result | Observed evidence |
| --- | --- | --- |
| P4-AC-01 | PASS | Two archived rows; p4-beta search returned B only; protection filter correct, A restore disabled; restoring B reduced count 2 to 1 and returned B to sidebar; A remained protected after restart. |
| P4-AC-02 | PASS | Editor responsive; native Off/Low/Medium/High choices matched DSH; capability removal and catalog refresh removed effort field without removing model. Initial request reached 120.01 s, Failed with empty result. Focused retry with Grammar, qwen3.5:4b, native Off, synthetic input “She go to school every day.” returned full “She goes to school every day.” in Network response and Result; Completed timer stopped at 90.36 s, one Studio POST and one provider request, no duplicate. |
| P4-AC-03 | PASS | Correct Workspace in two Sessions; output tokens 45 and 57 respectively; context updated after DSH supplied it; isolated Desktop/Host restart showed correct selected Session. Pending-snapshot startup window was not visible; existing real-React regression covers reset/withdrawal. |

**Residuals and decisions:** initial Studio timeout cause unproven and did not recur; HTTP 200 alone does not establish terminal success. The Host HTTP, engine and dispatch files are unchanged from baseline; 120 s deadline retained. No baseline model rerun, no additional nine-service tests, no DSH/Ollama changes, no reopening earlier security work. Operation counts prove eliminated repeat work, not whole-process CPU, RAM, latency or token savings. The single 90.36 s end-to-end observation is not a speedup measurement. No native timing comparison was collected. All three scoped acceptance cases passed; prior limitations outside this scope remain documented. Close Phase 04 technical and acceptance scope; do not infer publication of v1.2.1.

## Phase 05 — UI/UX enhancement (target v1.2.2)

Baseline: `46694eaeb5dfa32fa6ccd44f5cdc298b9cad09f2`, Phase 04 merged and integration CI green. Review each of the six components once for visual consistency, navigation and feedback, light/dark, localization, accessibility and targeted acceptance. Preserve artwork, native theme tokens and controls, logical spacing, keyboard focus, contrast and explicit operation states. Keep native service contracts, permissions, prompts, storage and previous acceptance evidence intact. No upstream redesign, unrelated feature work, repeated security/performance tests or publication.

Owner requirement: all suite-owned UI must follow the current DSH interface language across all supported native Host languages, updating mounted views immediately without restart, remount, draft loss, request replay or settings change. Cover titles/metadata, controls, dialogs, validation, feedback, accessibility labels, RTL/LTR and locale-aware numbers/dates/durations. Preserve stable IDs and untranslated user/provider/model content. My Profile's existing UI override needs explicit migration handling; do not overwrite saved preferences or alter response language silently. Confirm actual Desktop locale catalog; current code recognizes en, ar, zh, es, fr, de, ja. Unknown future locale IDs require explicit coverage. No modifications to DSH language packs.

Initial review: shared uiLanguage collapses non-Arabic languages to English; Archive and Direct Chat use bilingual dictionaries; Studio uses paired English/Arabic text; Reasoning uses shared copy and bilingual branches; My Profile has seven-language dictionaries and a UI override. Update/detail text and Plugin Manager metadata also require review. First candidate migrates Environment inspector, native tab/guide and header to seven known languages, localized numeric formatting and stable section keys. A React regression switches all seven in an open view. Metadata and remaining components are open; native Desktop and full-suite acceptance not claimed.

### Phase 05 — Direct Chat candidate

Translate all 26 Direct Chat action/history dictionary entries into the five additional known Host languages, keeping existing Arabic/English and switching through the migrated native locale resolver. Locale-aware pagination; preserve the canonical native Workspace title, opaque Session IDs, authorization and request behavior. Real React fixture switches all seven locales while history is open, checking translated labels, direction, stable search element and unchanged catalog request count. Plugin Manager metadata and Desktop acceptance remain separate.

### Phase 05 — Archive Manager candidate

Add five additional locale dictionaries to the existing English/Arabic Archive catalog (45 keys including locale-aware counts). Use the migrated locale resolver for mounted hub and native navigation title; translate shared settings status/feedback in five additional languages. Existing search filters, authorization, protection records, action-time restore checks and Host lifecycle are unchanged. Real React test switches all seven known languages with a filtered protected row and verifies stable search input, navigation title, disabled restore and no settings writes. Correct Direct Chat test selector to inspect its enclosing interface direction instead of the intentionally direction-auto search input; CI 46076121973 had failed only that assertion. Native Desktop acceptance and Plugin Manager metadata remain pending.

## Verification boundaries

- Direct Chat: the owner accepted title-search scope up to 1,000 registered Sessions in v1.0.2. The 10,000-Session stress test failed (8,185 titles available), not a Host fix. [H04 evidence](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/blob/98c27e87e216f11000ab92adcb79d51388031a28/docs/DSH_H04_SEARCH_SCOPE_AND_HIGH_LOAD_RESULT_V1.0.2.md). Tool denial is policy, not OS isolation.
- My Profile: DSH runtime-context snapshots are durable and may retain earlier values. Current v5 behavior does not block continuation. The [historical MP02 evidence](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/blob/98c27e87e216f11000ab92adcb79d51388031a28/docs/DSH_MP02_FAIL_CLOSED_PRIVACY_ACCEPTANCE_V1.0.2.md) describes an older sharing contract, not acceptance of the current implementation. Verify native Desktop behavior and actual model response independently.
- Archive Manager: native authorized catalog, scoped protection and restore. DSH owns the sidebar filter. Earlier native restore evidence predates the final UI simplification and does not establish complete native acceptance for 1.1.0.
- Native non-owner routes, Windows ACL, Host diagnostic/egress and extended assistive-technology coverage retain their original limits. Provider HTTP 400 exposed fictional canaries in the upstream native failure UI; the owner accepted the upstream boundary, not a fix. [Native acceptance and owner dispositions](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/blob/98c27e87e216f11000ab92adcb79d51388031a28/docs/DSH_DESKTOP_NATIVE_FINAL_ACCEPTANCE_V1.0.2.md).


## Phase 3.7 — release governance and verified rules

The CI workflow exposes a stable aggregate check named **Suite release gate**, which succeeds only when the complete Windows/Ubuntu Node 22/24 matrix succeeds. It is a candidate check, not an installed GitHub repository rule. Keep the existing required checks until the new check is visible on the appropriate long-lived branches. Never merge a Draft PR to bootstrap a required check.

Owner-side verification: [repository rules](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/rules), [ruleset administration](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/settings/rules), [general settings](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/settings). Inspect existing rules before changes; preserve other protections. Target main and develop with active PR-only, no force push/deletion, required CI (GitHub Actions integration and exact context), branch up-to-date requirements where compatible, and minimal documented bypasses. Do not impose a second-person approval count on a solo-maintained repository without owner agreement. Verify that rules apply to both branches and do not block unrelated feature branches. Require owner approval before promotion. Enable immutable releases for future publications if available, and protect existing release tags against update/deletion (avoid restricting new tag creation). Existing v1.1.3 is mutable; enabling immutability does not retroactively secure it. Do not delete/recreate the existing release.

Release checklist:
1. Confirm no open acceptance findings, explicit owner approval, exact-head green matrix and aggregate check, and candidate-to-release source tree correspondence.
2. Confirm reviewed full 40-character release commit, aligned package/lockfile/version metadata, exact package inventory and audit. Review CI and GitHub verification; verification is not an independently enforced trusted-signer policy.
3. Confirm version tag resolves to reviewed SHA, stable release metadata, and actual immutable status for future releases. Do not move published tags. Publish only after separately approved promotion.
4. Verify published release and pinned install on a disposable Profile, preserve old full-SHA reinstall information, document any migration or rollback limitation. No guaranteed rollback or deletion of stored user data.

### Closure evidence — 2026-11-27

- Code and CI: [run 45914330465](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/actions/runs/45914330465) passed all four matrix jobs and Suite release gate on exact code SHA `ddfc5e862606b735a925bbab0b1b776fe897121c`. Earlier exact-inventory and audit evidence is recorded in the Studio acceptance document. This is automated evidence, not actual Desktop update/install verification.
- [Branch ruleset 28022044](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/rules/28022044), read back via REST GET /rulesets/28022044 after the owner saved the change: active; exact main and develop targets; no bypass actors; deletion and non-fast-forward blocked; PR required, zero approving reviews (solo-maintainer workflow), review-thread resolution required; strict_required_status_checks_policy=true; all four named OS/Node test checks bound to GitHub Actions integration 15368, including on creation. Auto-merge false. No changes to the permitted merge methods.
- [Tag ruleset 28202361](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/rules/28202361), read back via REST GET /rulesets/28202361 after the owner created the rule: active; refs/tags/v* included, no exclusions or bypass actors; deletion, update and non-fast-forward rules present, creation unrestricted by this rule. Protects existing and future matching tags against ordinary update/deletion, not against an administrator changing the ruleset. No destructive live probe was performed.
- Owner completed the guided Enable release immutability step in repository General settings. The repository REST response available to this integration does not expose that setting; record as owner-reported, not API-verified. Latest existing v1.1.3 still reports immutable=false, as expected for pre-existing releases. Its tag is protected by the new tag rule, but its release assets are not retroactively immutable. Verify actual immutable=true on the first future separately authorized publication; do not create a release just to test this.
- The stable aggregate gate is green in the candidate branch. The four existing matrix checks remain mandatory; do not require the new aggregate check on long-lived branches until the workflow is legitimately promoted and the context is available there. Revisit at authorized promotion; never merge the Draft to bootstrap the check. This is a rollout item, not a missing matrix safeguard.
- Phase 3.7 implementation and repository-rule review are complete within the agreed scope (owner-reported immutability configuration with first-publication verification outstanding). Closure does not certify actual Desktop updater behavior, Host atomic compare-and-swap, a trusted-signer policy, or absence of all dependency risk. Phase 3.6 and all real Desktop/model acceptance remain open; no merge, ready-for-review transition or publication authorized. Classic protection GET previously returned 403; repository ruleset list and detail GETs now supplied actual rule evidence. The owner made the administrative changes; the assistant did not modify settings.
