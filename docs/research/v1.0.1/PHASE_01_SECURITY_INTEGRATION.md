# Phase 01 — integrated security audit (v1.0.1-rc.1)

> **Review state:** Implemented on a feature branch, **not approved on `develop`**. Source and synthetic Host evidence is separate from real Desktop/security acceptance. This is a draft close-out record that must be finalized at the owner-review gate; no tag or release has been created.

## 1. Identity and scope

| Item | Value |
| --- | --- |
| Date | 2026-11-22 |
| Phase | 01 — integrated security audit and regression |
| Source branch | `fix/phase-01-security-audit` |
| Target | `develop` |
| Base SHA | `9418195ae05cc4a3873eea20f56a02e355dc0c21` |
| Candidate version | `1.0.1-rc.1` (source metadata only; **not published**) |
| Pull request | [Draft PR #39](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/pull/39) targeting `develop` |
| Final review SHA | Pending final CI and owner decision; inspect PR head, do not treat the intermediate commits below as final approval |
| Maintainer review | Pending explicit approval |

This phase investigates integration risk among the two Direct Chat tool-denial hooks, symlink/junction and nonexisting-suffix handling, owner-only prepare/catalog Fetch routes, sanitized logs, My Profile replay/revocation, and plugin lifecycle disposal. It does **not** add filesystem sandboxing, destructive cleanup, or new user data processing.

## 2. Confirmed finding and test-driven repair

### P01-DC-01 — deep unresolved suffix bypassed an aliased Direct Chat Workspace guard

**Precondition:** an already existing symlink/junction outside the protected Workspace aliases its root. A Session `cwd` follows that alias and adds more than 32 nonexistent nested path segments.

**Observed defect:** the guard checked the ordinary path prefix (which was outside the protected path), then stopped searching for a canonical existing ancestor after 32 iterations. For a 48-component missing suffix, `tools.guard` returned `undefined` instead of `DIRECT_CHAT_TOOL_DENIED`; any path-insensitive tool path relying on that policy could be admitted. This is a tool-policy bypass under the stated precondition, **not evidence of a complete OS sandbox escape**.

**Red phase:** commit `8e8a4e7739de6bfe664399f7a46d9989eceff6e2` introduced a failing regression before the implementation fix. [GitHub Actions red proof](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/actions/runs/45047616116): the expected denial was `DIRECT_CHAT_TOOL_DENIED`, actual `undefined`, on Windows and Ubuntu with Node 22 and 24.

**Repair:** commit `df333fb9b0a46b547c3888693035bd51f267a3b3` replaces the arbitrary 32-iteration ceiling with traversal to the filesystem root (terminating when the parent equals the current path). Existing canonical path checks and both denial hooks remain unchanged. The regression now also checks the `tools/pre-execute` denial and that an unrelated 48-level missing path remains allowed. No other tool admission rules were deliberately relaxed.

## 3. Changed files and behavior

| File | Scope |
| --- | --- |
| `plugins/direct-chat/index.js` | Remove the security-relevant 32-level ancestor-search cap |
| `test/direct-chat-host.test.js` | Reproduce deep symlink/junction pending-suffix bypass; test both hooks and unrelated deep directories |
| `qa/profile-host-check.mjs` | Extend offline native Host replay fixture: follow up in an in-history Session after explicit field revocation; fail if revoked synthetic value reaches model adapter |
| `package.json`, `package-lock.json`, `client.js` | Set only the candidate package metadata / embedded installed version to `1.0.1-rc.1` |
| `test/documentation-integrity.test.js`, `test/personal-profile-sidebar.test.js` | Align test assertions to the candidate version without changing the stable release label |
| `docs/DEVELOPMENT_PROGRESS_V1.0.1.md` | Record phase status, corrected starting baseline, finding and pending gates |
| This report | Reproduction, evidence, review boundaries, next-step handover |

No migration, new setting, new field, new permission grant, new network request, release tag, or production data change was introduced.

## 4. Validation evidence and current limits

- **Expected failure before fix:** [CI run 45047616116](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/actions/runs/45047616116), four OS/Node jobs failed at the deep-alias regression.
- **Intermediate version assertion failure:** [CI run 45047727494](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/actions/runs/45047727494) found a stale hard-coded `1.0.0` expectation in the old Host-schema test; the candidate version expectation was updated.
- **Passing repaired intermediate candidate:** [CI run 45047951960](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/actions/runs/45047951960) completed successfully on Windows and Ubuntu, Node 22 and 24, after the path fix and candidate-version alignment.
- **Native My Profile in-history replay check:** commit `6d1bf851815a35545fd07d466c7cc70ed6fd9e11` passed in the [Windows/Ubuntu Node 22/24 matrix](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/actions/runs/45048013901). Final PR-head CI is still a separate required gate.
- **What CI runs:** `npm ci --ignore-scripts`, `npm test`, `npm run check:package`, followed by pinned DSH/Host service fixtures in `qa/`. Do not report that GitHub's Windows runner is equivalent to hands-on Windows Desktop testing.
- **Local execution:** a minimal isolated Node 22 reproduction of the original 32-step predicate returned `false` for a 48-level pending alias; the full repository test suite was executed in GitHub Actions, not in an independent local checkout.

Baseline regression coverage retained: Direct Chat route validation and `no-store` response headers, sanitized prepare-failure logging, symlink/junction rejection, native owner Peer gating, catalog membership and sorting guard, service disposal, My Profile structured field allow/private/legacy behavior, LF/CRLF/CR/Unicode separator recognition, and the native LLM adapter's synthetic records. No tests involving actual personal information or live provider calls were used.

## 5. Unfinished and upstream-dependent security checks

| Priority | Unfinished acceptance | Owner / dependency | Follow-up |
| --- | --- | --- | --- |
| High | Real Windows Desktop junction, ACL, malformed-cwd and alt-tool dispatch behavior | DSH Host/OS; maintainer | Exercise disposable Windows Profile and record observed tool admission |
| High | Provider-bound My Profile field revocation, in-history replay, disabled-plugin behavior and switch between model providers | DSH Agent/LLM Host; maintainer | Capture sanitized native request traces on a disposable Profile |
| High | Actual owner/non-owner authorization across remote/Desktop fetch routing and reconnect | DSH connection Host | Confirm no prepare path or catalog metadata reaches non-owner Peers |
| Medium | TOCTOU link replacement between canonicalization and tool execution | DSH/OS boundary | Document; no plugin-level sandbox guarantee |
| Medium | Existing directory permissions (not chmod'ed), Windows ACL inheritance | OS/DSH | Inspect explicit permission outcomes; do not claim folder isolation |
| Medium | Extremely deep malformed `cwd` strings and error-path latency | DSH tool admission | Bound realistic Host inputs; monitor without weakening fail-closed behavior |

The plugin can deny recognized tool executions at its existing hooks; it cannot prevent all filesystem operations by other processes/plugins, guarantee transactionally stable paths, delete provider-held history, or replace DSH's native session authorization. These boundaries are explicitly **not closed** by Phase 01.

## 6. Compatibility and rollback

- Existing Session/Workspace IDs and saved My Profile v4 settings remain untouched. The repair affects policy resolution only for uncommon, deeply nested aliased paths.
- `v1.0.0` remains the released version; `1.0.1-rc.1` is a branch candidate and has no tag. Release feeds/download badges should continue to refer to the stable release.
- Rollback is reverting the phase branch/PR before merge; after merge, a reviewed source revert would be needed. Neither operation deletes or restores conversation histories.
- Do not infer guaranteed recovery or privacy retroactivity from disabling My Profile or the plugin.

## 7. Deferred Desktop verification procedure

Use a disposable Windows DSH Profile, fictional values, and no real credentials. Verify both `tools/pre-execute` and `tools.guard` on the permanent Direct Chat Workspace, ordinary alias, alias with a 48-component missing tail, unrelated Workspace, and a junction replacement; confirm that expected denials are visible and no tool actually executes. Verify the prepare and catalog routes as the owner and a non-owner Peer (including reconnect), inspect logs for path canaries, and inspect file ACLs. In a separate synthetic Profile, share one marked field, use both in-history and out-of-history adapters, then revoke it and inspect the *actual provider-bound request*. Check enable/disable, restart and cross-provider replay. Record build, OS, DSH version, exact results and unresolved cases without uploading private logs.

## 8. Review decision

**Proposed status:** `Implemented — needs review` *only after final-head CI succeeds*. Maintainer approval, Desktop acceptance and release publication remain separate gates. Green CI validates the exercised contracts, not full Desktop or provider privacy guarantees.

## 9. Next-phase handover

After explicit Phase 01 approval and merge to `develop`, update the dashboard with the merge SHA and link the CI evidence here. Preserve the deep alias regression, the new My Profile revocation fixture, and the owner-only route checks. Only then branch Phase 02 (`fix/phase-02-chat-control-retention`) from the latest `develop`, setting candidate `1.0.1-rc.2`. Do not enable automatic or destructive retention cleanup.
