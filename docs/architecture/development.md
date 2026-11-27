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
