# Personal Profile Phase 8 — verification report for integration

Date: 2026-11-20. Branch `feature/phase8-profile-disclosure-v08` in `C:\Users\Admin\Desktop\DSH-Suite-Phase8`, based on `687a936`. Local only: no push, PR, merge or release. Synthetic personal values only; the owner's real backup file was never opened, copied or modified. Design and gates: [Phase 8 plan](PERSONAL_PROFILE_PHASE8_PLAN.md).

## 1. What changed

| Area | Change | Files |
|---|---|---|
| Host admission | New section `abinadwan:personal-profile-information`: one fixed header plus `Label: value` lines for Allow fields, only when both switches are On. Every provider is treated as cloud. | `plugins/personal-profile/preferences.js`, `index.js` |
| Send-time guard | `llm/stream` listener refuses (terminal `INVALID_REQUEST`, localized message, no value) any request carrying a block the current settings would not produce | same |
| Settings page | Access copy rewritten (Arabic and English); live "Shared with the model after Save" preview; Ask First "not active" note; retention notice on Access and Privacy | `client.js` (Profile region only) |
| Restore | Default strategy is Replace All and Merge Custom Instructions; Replace All needs an extra confirmation; both switches always restored Off | `client.js` |
| Docs | Plan rewritten to the owner's simplified gates; README, SECURITY, CHANGELOG updated; audit marked superseded where it applies | `docs/`, `README.md`, `SECURITY.md`, `CHANGELOG.md` |

Not changed: storage architecture, record version (still 2), backup format, Harness core, Direct Chat, Conversation Lifecycle, Adaptive Reasoning, Environment & Context, Humanizer. No new dependency.

## 2. Requirement coverage

| Owner requirement | Evidence |
|---|---|
| Disabled by default; Private by default | `test/personal-profile-settings.test.js` "Phase 8 access…"; `emptyRecord()` |
| Allow respects both switches; Private and Ask First never shared | `test/personal-profile-runtime.test.js` 108-case matrix; real loop "admission…" |
| Ask First requires approval | No native destination-bound approval exists, so Ask First is never shared (kept disabled) |
| Unverified destination never reuses authorization | All providers need the cloud switch; nothing is bound to a provider name, so an endpoint edit behind a name cannot widen access |
| Provider and model switch | Real loop: after revocation, a switch to another in-history provider sends nothing; a replace route continues without fields |
| Retry | Real loop: a retry after revocation is refused and never reaches the adapter |
| Historical system prompts, restoration, branching | Real loop: in-history replay, a seeded (branched or restored) chat and an edited value are all refused |
| Compaction | Derived summaries cannot be detected; documented (plan §3) |
| No retroactive deletion promised; previous vs new disclosure | UI retention notice, README, SECURITY; real loop shows earlier authorized blocks stay in the log while new sends are refused |
| Backup: plain JSON, v2 compatible, malformed rejected, merge default, Replace All confirmed, preferences preserved, sharing never enabled | `test/personal-profile-phase8-backup.test.js` (6 tests) and the updated settings tests |
| Persistence, restart, atomic write, corruption | `qa/phase8-persistence-check.mjs`: native `yaml` + `dsh-atomic-write` + js-yaml/entryListSchema round trip, two Host restarts, truncated and tampered data rejected |
| No exposure through logs | The plugin logs nothing; existing test "profile values never reach network, logs or the Host plugin APIs" passes; refusal names no value |

## 3. Results

| Check | Result |
|---|---|
| `node --test` on Node 24.21.0 | 178 pass, 0 fail, 0 todo |
| `node --test` on Node 26.10.0 | 178 pass, 0 fail, 0 todo |
| `npm run check:package` (PowerShell) | exit 0, 60 published files |
| `qa/phase8-disclosure-check.mjs` | rc.3 5/5, rc.5 5/5 |
| `qa/phase8-persistence-check.mjs` | rc.3 2/2, rc.5 2/2 |
| `qa/profile-host-check.mjs` (updated: Cloud Off in the preferences flow, matrix skips Allow + both On) | rc.3 1/1, rc.5 1/1 |

Real-loop checks run with `ABINADWAN_TEST_RUNTIME=<runtime> node --import ./qa/runtime-resolve.mjs --test <file>` against the isolated copies in `node_modules/.phase8-qa/`.

Tests removed or rewritten by the owner's decision: the five encryption and consent-record `todo` specs; the Phase 7 tests that asserted "fields are never sent" and "Replace All is the default"; "restored switches keep their backup value".

## 4. Open: actual Windows Desktop acceptance (owner step)

Not run by Claude: driving Desktop would risk the owner's real profile, which holds real personal data. Use a separate QA Harness Profile and synthetic values only:

1. Install this build into a QA profile. Enter synthetic name, nationality and gender. Confirm both switches are Off, every field is Private, and the preview says nothing is shared.
2. Set the fields to Allow: still nothing shared. Turn on the personal-information switch: still nothing. Turn on the cloud switch: the preview shows the three lines. Save, restart Desktop, confirm the values and switches persist.
3. Send a message and capture the outgoing request (provider log or proxy): the block appears exactly once.
4. Turn the cloud switch Off and Save. On a provider that keeps system prompts in history, send again: the request is stopped with "start a new chat". In a new chat nothing is shared.
5. Export a backup: the page says it is not encrypted. Import a synthetic backup with both switches On: they come back Off; Replace All asks for its own confirmation.
6. Repeat step 4 after a provider switch and after branching a chat.

## 5. Decisions and residual risks for the owner

1. **Upgrade activation.** A user of 0.7.2 or 0.8.0-rc.1 who saved Allow with both switches On, while the UI said "not active", starts sharing after upgrading without seeing the new copy. This follows the owner rule "permissions remain effective until manually changed"; the owner's own backup has both switches Off. Mitigation option if wanted: reset both switches once on upgrade (needs a record version bump).
2. **"Review & Merge".** The general field-level merge was removed in 0.7.2. This build makes the existing **Replace All and Merge Custom Instructions** strategy the default and adds a Replace All confirmation, rather than reintroducing a field-level merge. Owner to confirm.
3. **In-history chats after a change.** On providers that keep old system prompts, any revocation, narrowing or value edit stops that chat; the user must start a new one. This is the only way to avoid resending the old block.
4. **Guard scope.** The guard runs only while the plugin is enabled, and cannot see derived content (replies, compaction summaries).

## 6. Shared files and integration

- Integration moved to `656eedc` (three Direct Chat commits) after this branch was cut. None of them touch files changed here; `git merge-tree` of this branch with `656eedc` is clean.
- `client.js`: changes are only in the Personal Profile region (about lines 750–1385). The integration worktree has another session's uncommitted `client.js` work at lines 1825 and later, so no textual overlap is expected.
- `CHANGELOG.md`, `SECURITY.md`: a new top section and two Personal Profile sentences. Other sessions editing the top of `CHANGELOG.md` will need a trivial merge.
- `test/components.test.js`: only the Personal Profile attachment test.
- `qa/phase8-negative-check.mjs` was renamed to `qa/phase8-disclosure-check.mjs`.
