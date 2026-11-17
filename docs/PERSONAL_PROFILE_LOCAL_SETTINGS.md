# Personal Profile 0.7.0 — native local settings candidate

This replaces the earlier fictional preview and encrypted-storage design. The owner approved removal of full name, exact date of birth, custom personal fields, custom encryption and simulated/automatic lock. Only optional preferred name, nationality and gender remain. Custom **instructions** remain, with the eight personalities, seven response languages plus Automatic, six traits and eight presets.

Status: **Phase 6D (native settings QA) PASS in automated tests. Phase 6E (Windows Desktop acceptance) BLOCKED — needs a real Windows Desktop**; see [Windows acceptance](PERSONAL_PROFILE_WINDOWS_ACCEPTANCE.md).

## Persistence contract

- Use Harness rc3's native settings service: `ctx.remote.settings.describe()` and `replace(namespace, section, expectedRevision)`. One versioned record, explicit Save, mandatory expected revision, refusal/conflict shown honestly. The Host owns the profile patch and its atomic-write lifecycle; this plugin does not write files directly or use browser storage.
- Namespace `abinadwan-personal-profile` keeps its patch ID and stays disabled by default. It is inserted directly into the root Include, not nested in the suite Group, because `ConfigEditor.entries()` only addresses direct Include-owned entries. The other two components keep the original Group. The official bundle selection still removes/adds all bundle contributions. Disabling only the suite Group by hand no longer disables the separate Personal Profile row.
- Workspace count is owned by Harness; Personal Profile imposes no count limit. Only Workspaces that differ from the defaults are stored: an override, or a non-Private policy. A Workspace with no row inherits global preferences and Private policies, and a row returned to those defaults is removed. One payload guard (3,000,000 serialized characters) applies to the whole record and is reported, never applied by dropping edits.
- “Global” means global **within the active Harness Profile** (settings are profile-owned). Workspace overrides use real Host workspace IDs from `ctx.workspaces.list`. No invented environment names, no shared cross-Profile data. An enabled override replaces global preferences; it does not merge with them.
- Restore/export uses explicit local JSON copy/paste. Nothing is written to a file or the cloud automatically. Export drops grants. Import validates the allowed shape and offers merge (keep existing global and non-empty personal values, append absent workspace IDs) or explicit replacement. It resets all field grants to Private and both opt-ins Off, and stages a draft before Save.
- No encrypted legacy data migration is attempted: v0.6.3 never persisted the preview. The old synthetic storage and consent experiments are superseded by this design and kept in Git history/PR #15, not runtime.

## Privacy boundary

Plaintext local settings and backup content are readable by someone with access to those files. OS account, local file permissions and any existing whole-disk encryption are the storage boundary. This plugin has no model tool, instruction injection, approval service or external profile transfer. Per-workspace Private / Ask First / Allow and the master/cloud opt-ins are **stored preferences only, not enforced controls**; the UI says enforcement and disclosure are not active. Keeping these defaults does not prove a future model gateway safe. Any later agent integration must identify the actual workspace, respect consent, identify the provider destination (unknown denies), prevent free-text/field leakage and recheck at the real send boundary. Nothing in this candidate activates such a path. Do not enter passwords, keys, health/financial details or other sensitive information into free text or backups.

## Verified Host contracts (pinned source review)

Source: `deepseek-ai/deepseek-harness` at `38a6a5c965aa99ab525161efb7cc5cf1fe62fced` (`dsh-v0.2.2-rc.3`; package versions `0.2.2-rc.3`).

| Contract | Source | Finding |
|---|---|---|
| `settings.describe()` | `packages/api/settings-controller/src/index.ts` | Returns `{writable, hasDocument, namespaces[]}`; each view has `ns`, `value` (redacted, resolved), `revision`. Client requires `ok:true`, the exact `ns`, a non-negative integer revision, `writable:true` and a strictly valid record, otherwise **unavailable** with no write. |
| `settings.replace(ns, section, expectedRevision)` | same, `write()` | Refusal is `settings/conflict` (stale revision) or `settings/rejected`. On success it answers the namespace view read **after** the commit. Client compares that view with what it sent; any mismatch is **failed**, never "saved". |
| Revision check | `packages/settings/settings/src/index.ts` `write()` | Checked inside `configEditor.edit`, under the Profile file lock, before the change. Revision increases when the entry's config, schema or fiber changes. |
| Atomic write | `packages/boot/config-editor/src/index.ts` `edit()` | `writeFileAtomic(..., 0o600)` then `reconcileProfilePatches`; on reconcile failure the previous document is restored. The post-write describe therefore reflects the committed config. |
| Include-owned entries | `ConfigEditor.entries()` | Only entries whose parent is the root `include`, and whose id is unique. Hence the top-level Profile row. A duplicate id would make settings **unavailable**, not overwrite. |
| Volatile schema | `packages/settings/settings/src/schema.ts` | Only `.volatile()` fields project to forms and accept writes. `record` is volatile. Replacement strips the stored volatile subtree first, so unknown keys left by hand edits are dropped on the next Save. |
| `configure({auto:false}, fiber)` | `SettingsForms.configure` | Hides the generic generated form for this entry; the effect's disposer withdraws it when the Host fiber stops. |
| Browser Remote | `packages/api/remotes/src/client/index.ts` | `remote.settings` is generated for the client; access actions `settings/describe` and `settings/replace` are checked with the slot's `useRemoteAccess`, as the official settings UI does. |
| Workspace list | `packages/api/workspace-controller/src/client/model.ts` | Snapshot `{items[{workspaceId,title}], phase, state}`. Client uses only `phase:'ready'`, non-error lists and non-empty string IDs ≤ 256. |
| Schema library | `vendor/schemastery` | Harness vendors `@deepseek-ai/schemastery` 3.19.0, the exact runtime dependency of this package. |

Upgrade composition was checked with the real `composeEntries` from `@deepseek-ai/dsh-app-boot` 0.2.2-rc.3: a v0.6.3 user patch (`- id: abinadwan-personal-profile`, `disabled: false`) applies to the new top-level row, with exactly one Profile identity (test `upgrade from the v0.6.3 nested layout…`).

## What automated tests prove, and what they do not

Proven in CI with Harness-shaped doubles, the real Cordis Loader, real `composeEntries`, the real schema and real React/jsdom:

- Read failures, a missing namespace, read-only providers and malformed views fail closed with no write. A failed reload never writes.
- Every write carries the last-read revision; sequential saves advance it. Refused, thrown, bare, wrong-namespace and mismatched answers never claim success, keep the draft and require reload.
- Conflicts never overwrite a newer change. Duplicate clicks issue one write. Stale describe answers after reconnect or unmount are ignored. A save answer from a previous connection is not trusted.
- Only trusted Workspace IDs are offered. Overrides replace global only when enabled; switching back to inherit clears the override. Other Workspaces are never written. Records of Workspaces the Host no longer lists are preserved but hidden.
- More than 64 Workspace overrides load, edit, save and restore completely; a merge over the payload guard is rejected without changing the draft; rows returned to defaults are not stored.
- Reload with unsaved changes, after a failed save or after a conflict asks first; cancelling keeps the entire draft (name, global and Workspace preferences, policies, language). A reconnect never discards a dirty draft, and Save afterwards is still refused on a stale revision. Arabic and English messages.
- Defaults: all fields optional, policies Private, both switches Off. Export has no grants. Import (merge or replace) resets grants, including for unknown imported Workspace IDs, and needs explicit Save. Invalid JSON, unsupported versions, oversized input, unknown fields, duplicate Workspace IDs and malformed preferences are rejected without changing the draft. Cancelling a review changes nothing.
- No profile value reaches logs or network requests; the profile code has no fetch, storage, console, skill, composer or tool path.
- Arabic RTL and English LTR pages pass axe DOM checks on all five sections, with labelled controls and unique IDs.
- Component gating, independent toggles and no duplicate registrations (existing lifecycle and Loader tests).

Requires real Harness Desktop runtime (Phase 6E): actual persistence across restart, real revision conflicts between two windows, real Workspace and Harness Profile isolation, native settings permission refusals, upgrade of a real v0.6.3 installation, uninstall behavior for stored settings, Windows light/dark native dropdowns and visual RTL layout.

## Removed-test audit (PR #16 versus main)

`main` had 186 top-level test names; PR #16 as opened had 50, and 146 names from `main` were absent (including 3 renamed). All were classified:

| Category | Removed tests | Decision |
|---|---|---|
| 1. Obsolete encryption/storage architecture | `personal-profile-storage` (29: Argon2id, nonces, key providers, lock, leases, crash/rename recovery, symlinks) and `personal-profile-boundaries` (10: 1024-unit strings, 69 custom fields, custom labels) | Not restored. The modules no longer exist and the native settings service owns atomic writes. Still-relevant ideas were replaced: length limits and unknown-field rejection (backup/describe tests), corrupt data fails closed (malformed view tests), no plaintext fallback → no encryption claim tests. |
| 2. Superseded consent/integration prototypes | `personal-profile-consent` (17), `-integration` (16), `-security-regressions` (15), `-host-identity` (12), `-permissions` (10), `-core` (6), `-instructions` (9) | Not restored: no consent service, Host identity gate, retrieval or injection path exists. The relevant invariants are replaced: default Private, imports never restore Allow, unknown Workspace IDs get no access, no value in errors/logs, no agent path. |
| 3. Duplicated/prototype UI coverage | `personal-profile-ui` (11, on a test-only synthetic prototype), old `personal-profile-sidebar` preview tests (4), old `package-policy` probe tests (4), renamed `client-lifecycle`/`components`/`dsh-contract` tests (3) | Superseded by tests of the real page (`personal-profile-sidebar`, `personal-profile-settings`), the new top-level layout and package rules. |
| 4. Still-relevant regression coverage | axe/RTL accessibility; revision conflict, refusal and malformed answer handling; duplicate-click and stale-response races; Workspace isolation; backup merge/replace/invalid/cancel; no logging or network; upgrade composition; package contents | **Restored or replaced** in `test/personal-profile-settings.test.js`, `test/render.test.js`, `test/dsh-contract.test.js` and `test/package-policy.test.js` (84 top-level tests in total now; 121 reported by the runner). |

## Known risks

- Plaintext storage: anyone with access to the Profile configuration or a copied backup can read the values.
- Access policies are unenforced preferences. They become meaningful only if a future, separately approved agent integration enforces them.
- **Reload** asks for confirmation whenever the draft has unsaved changes or the last save failed or conflicted. Confirming still discards the draft. To keep edits, copy a JSON backup first.
- The whole serialized record is limited to 3,000,000 characters (the same limit as restore text). There is no Workspace count limit. A record over the limit is refused with an explicit message, and the edits stay in the draft. The real Host/transport limit for large records still needs Desktop verification.
- After a connection reset with unsaved changes, the page keeps the draft instead of re-reading. Save stays revision-checked, so a change made elsewhere meanwhile is refused as a conflict.
- Uninstalling the bundle may remove the stored settings; the update-migration text now asks for a backup first. Not verified on a real Desktop.
- A hand-edited, invalid record makes the page show **unavailable** (fail closed) until the file is corrected or a valid record is saved some other way.
- The real Host may restart the Profile fiber on save; this bumps the revision once and is reflected in the returned view. Needs Desktop confirmation.

## Manual acceptance

Do not merge or release until the owner completes the [Windows acceptance](PERSONAL_PROFILE_WINDOWS_ACCEPTANCE.md) with fictional data and approves.
