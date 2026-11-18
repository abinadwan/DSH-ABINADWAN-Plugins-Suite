# Personal Profile 0.7.2 — technical change record

Status: **candidate, not released.** Automated tests and CI only. **Windows Desktop acceptance NOT TESTED** (see §16). Harness compatibility: `v0.2.2-rc.3`.

Base: `main` at `39c22eb` (0.7.1). Branch: `feat/personal-profile-0.7.2`.

## 1. Previous architecture (0.7.0 / 0.7.1)

- Persistence: native Harness Settings Controller (`settings.describe()` / `settings.replace(ns, section, expectedRevision)`), one volatile `record` in the top-level Include entry `abinadwan-personal-profile`. Explicit Save, revision-checked, success reported only after the Host's committed view matches what was sent. **Unchanged in 0.7.2.**
- Record v1: `{version:1, locale, information, global, workspaces[], allowPersonalInformation, allowCloud}`.
- `global` preferences applied inside the active Harness Profile. Each `workspaces[]` row (keyed by a Host Workspace ID from `ctx.workspaces.list`) could hold a full replacement preference set (`override`) and its own Private / Ask First / Allow policies.
- UI: Workspace selector, instruction scope selector (global / Workspace), inherit/override mode, Workspace-scoped field policies.
- Backup: JSON shown in a text area. Export **dropped** all grants (policies Private, switches Off). Import offered a general-purpose **merge** (keep existing non-empty values, append absent Workspace IDs) or replacement, and always reset grants.

## 2. Windows Desktop acceptance findings

| Run | Finding | Source |
|---|---|---|
| 0.7.0, first Windows run | Install, restart, sidebar registration PASS. Page rendering **FAIL** (blank content area). | Recorded in [Windows acceptance](PERSONAL_PROFILE_WINDOWS_ACCEPTANCE.md). |
| 0.7.0 root cause | `ctx.workspaces.list` is the Host's `ClientWorkspaceModel` class; its `subscribe`/`getSnapshot` were passed unbound to `useSyncExternalStore`, the first render threw, and the Host Slot boundary retired the `main` entry. | Source review; fixed in 0.7.1. |
| 0.7.1, owner Desktop review | The owner reviewed 0.7.1 on Windows Desktop and approved the redesign in §3: Workspace-scoped settings were unnecessary for the intended use, the backup lacked a real file download/import, and exports silently dropped permissions. | Owner's 0.7.2 brief. The per-row 0.7.1 matrix was **not committed to this repository**; no row result is claimed here. |

## 3. Owner-approved design decisions (0.7.2 brief)

1. One unified Personal Profile per active Harness Profile; no Workspace selector, scope selector, overrides or inheritance; no Workspace count restriction.
2. Unified field-level policies (preferred name, nationality, gender) with Private / Ask First / Allow, plus the master personal-information and cloud-sharing switches. Defaults: Private, both Off. Disclosed as saved preferences until Phase 7.
3. Versioned, reviewed, explicitly confirmed migration from 0.7.1; never silent loss, never permission promotion.
4. Complete export including permissions; download, copy and view; unencrypted-file warning.
5. Import from file or paste; exactly two strategies: **Replace All**, **Replace All and Merge Custom Instructions**. The general merge strategy is removed.
6. Permission restoration opt-in only, with an exact list and acknowledgment.
7. No custom encryption/DPAPI, storage engine, agent injection/disclosure, Direct Chat or new dependency.

## 4. Why Workspace-specific settings were removed

- The intended consumer (a future Direct Chat component and conversations in general) is not bound to a Workspace; Workspace membership is not a meaningful boundary for personal preferences.
- The page depended on the Host Workspace service, which caused the 0.7.0 Desktop blank page and added an injection, a store subscription and ID validation that the profile does not need.
- Per-Workspace policies multiplied the consent surface (one set per Workspace ID) with nothing enforcing any of it; a single policy set is easier to understand and to enforce later.
- Hidden rows for Workspaces the Host no longer listed accumulated data the user could not see.

## 5. New unified profile architecture

- One record per active Harness Profile: personal information, **one** preference set, **one** set of field policies, two master switches, interface locale.
- The browser fiber injects only `slots`, `remote`, `remote.settings`. It no longer injects or reads `workspaces`. Environment & Context still injects `workspaces` for its own tab (unchanged); the package-level `dsh.client.inject` list is unchanged because of that.
- Direct Chat readiness (not implemented): the record is independent of Workspace and Session, `previewProfilePreferences()` is a pure function of `preferences`, and policies are per field. A future consumer can read one record and must enforce §9 at its own send boundary.
- Native persistence, revision checks, unsaved-draft protection, reconnect handling and the render error boundary are unchanged.

## 6. Schema changes

```text
v2 (written by 0.7.2)                       v1 (0.7.0/0.7.1, read + migrate only)
version: 2 (required)                       version: 1 (default)
locale: 'ar' | 'en'                         locale
information: {preferredName, nationality,   information (same)
              gender}
preferences: {style, responseLanguage,      global: (same shape as preferences)
              traits{6}, presets[≤8],       workspaces: [{id, override,
              custom ≤ 8192}                              preferences, policies}]
policies: {preferredName, nationality,
           gender} ∈ private|ask_first|allow
allowPersonalInformation: boolean           allowPersonalInformation
allowCloud: boolean                         allowCloud
```

- Host schema (`plugins/personal-profile/index.js`): `record: union([v2, v1]).default(emptyRecord()).volatile()`. v2 is tried first; a record without `version` resolves as v1 (the only shape that ever omitted it). Any other version is rejected by the Host schema. Keeping v1 in the union means the Host never strips or rejects stored 0.7.1 data before the user migrates it.
- Browser decoders are strict: unknown keys, missing keys, wrong types, overlong strings, unknown styles/languages/presets, invalid traits and invalid policies are rejected with a reason code (no user content in errors). A v2 record carrying `workspaces` is rejected. Objects are rebuilt in canonical key order so the post-write comparison is independent of key order.
- Limits unchanged: preferred name/nationality ≤ 128, custom instructions ≤ 8192, Workspace ID ≤ 256 (v1 only), whole record/restore text ≤ 3,000,000 characters, restore file ≤ 3,000,000 bytes.

## 7. Migration behavior (v1 → v2)

1. On load, a v1 record is decoded strictly; malformed v1 fails closed (**unavailable**, no write), as before.
2. The draft becomes the migrated v2 record: information, locale, `global` → `preferences` (custom instructions included) are kept exactly. Unified policies start **Private**; both switches start **Off**. Workspace overrides are not merged and Workspace policies are never promoted.
3. A **Migrate settings from 0.7.1** panel shows what is kept and, when present, a table of every Workspace row (ID, override, personality, response language, custom-instruction length, policies) and a note if either master switch was On.
4. The panel offers **Download JSON file**, **Copy JSON** and **View JSON** of the complete, unaltered v1 record (including Workspace policies), before anything changes.
5. If anything would be discarded (any Workspace row, or a master switch On), **Save stays disabled** until the user ticks an explicit confirmation. With nothing to discard, Save needs no extra confirmation.
6. Nothing is written on load. The stored v1 record stays untouched until a successful, revision-checked Save; a conflict is shown and nothing is overwritten. Reload asks first (the pending migration is unsaved work).
7. Why switches are reset: consent under v1 was combined with per-Workspace grants; under v2 it combines with profile-wide grants. Consent given under one model is not carried into another. The user can re-enable them in Access Control.
8. Legacy backups (0.7.0/0.7.1 JSON) import through the same conversion: global settings restored, Workspace entries listed as not restored, no permissions restored (v1 exports never contained grants; v1 Workspace grants are never promoted).

Compatibility limitations: 0.7.1 cannot read a v2 record (its strict decoder shows **unavailable**); rolling back after migrating requires restoring the backed-up `cordis.patch.yml` (§16). Workspace-specific preferences have no v2 equivalent; keep the exported v1 JSON if they matter.

## 8. Backup format and restoration

- Format: the v2 record itself, pretty-printed JSON, file name `personal-profile-backup.json` (`personal-profile-v0.7.1-settings.json` for the legacy export). **Complete**: information, personality, response language, characteristics, presets, custom instructions, field policies and both switches, exactly as in the draft. Not encrypted (warned in the UI).
- Export: **Download JSON file** (Blob + object URL + `<a download>`, browser-native; no filesystem service), **Copy JSON** (async Clipboard API), **View JSON** (read-only text area). Unavailable download/clipboard is reported, never claimed as success.
- Import: **Import JSON file** (`<input type=file>`, size checked before reading, read with `File.text()` or `FileReader`) or **Paste JSON manually**, then **Review backup**.
- Review: a preview table (current draft → after restore) for every setting, the imported or merged instructions, a list of any v1 Workspace entries not restored, and the permission section. Apply requires an explicit confirmation; changing the strategy or the permission choice resets it. **Apply restore to draft** changes only the draft; the status says nothing is saved until **Save changes** (native, revision-checked).
- **Replace All**: imported settings replace everything, including custom instructions and interface language.
- **Replace All and Merge Custom Instructions**: everything is replaced except custom instructions. Existing text is kept; imported paragraphs (blocks separated by a blank line) are appended unless the same trimmed paragraph already exists; line breaks and indentation inside paragraphs are kept; CRLF becomes LF. The merged text is shown in an **editable** preview with a counter. Over 8192 characters, Apply stays disabled with an explanation; nothing is ever truncated.
- Cancel restore, editing the pasted text or choosing another file discards the review without touching the draft.

## 9. Permission and privacy boundaries

- Defaults: all policies Private, both switches Off (schema, empty draft, migration, restore).
- Restore never restores permissions by default. **Restore the permissions saved in this backup** is unchecked; when checked, the exact policies and switch values are listed and a second acknowledgment is required. v1 backups offer no permission restore.
- Invalid or unsupported policies reject the whole backup.
- Policies and switches remain **saved preferences, not enforced controls**. No code path reads them for disclosure; there is no model tool, instruction injection, skill invocation, composer/session send or network path in the profile code (static test). Restoring permissions activates nothing.
- Plaintext: the Profile configuration and any exported file are readable by anyone with access to them. No plugin encryption is claimed.

## 10. Bug fixes and UI improvements

- Workspace dependency removed (eliminates the 0.7.0 failure class entirely).
- Gender option `unspecified` now reads **Prefer not to say / أفضّل عدم الذكر**; previously both "not set" and `unspecified` were labelled "Unspecified".
- JSON areas are LTR, `unicode-bidi: isolate`, monospace (Cascadia Mono / Consolas fallback), no spellcheck, in both interface languages.
- Custom-instruction character counter; strategy choices are radio buttons with descriptions; preview uses a captioned table with row/column headers; backup messages use a dedicated `role=status` region.
- Specific validation messages (invalid JSON, unsupported version, invalid policy, instructions over 8192, unknown fields, file too large, file unreadable) instead of one generic message.
- Accurate wording: restore says "applied to the draft only, nothing saved"; download says "started, make sure the file is saved"; no message claims a save that Harness has not confirmed.
- Update-migration text now says the backup includes saved access permissions and is not encrypted.

Historical fixes (unchanged, recorded in `CHANGELOG.md`): 0.7.0 — revision-checked native persistence, 64-Workspace cap removed, discard confirmation, invalid review could clear a conflict; 0.7.1 — unbound Workspace store methods caused the blank Desktop page, page-level error boundary.

## 11. Files changed

| File | Purpose |
|---|---|
| `plugins/personal-profile/index.js` | v2 schema; v1 kept in a union for migration; `emptyLegacyRecord` export. |
| `client.js` | Unified page; strict v1/v2 decoders; migration panel; export/import/restore; Workspace injection removed; version `0.7.2`; update-migration text. |
| `test/personal-profile-settings.test.js` | Rewritten coverage (see §13). |
| `test/personal-profile-sidebar.test.js` | Unified flow; export now keeps permissions (intended reversal). |
| `test/personal-profile-desktop-render.test.js` | Slot-boundary regression kept; Workspace independence; error boundary via a failing hook. |
| `test-support/personal-profile.js` | Download, clipboard and file-input doubles; legacy record export. |
| `test/update-check.test.js`, `test/plugin.test.js` | Version 0.7.2. |
| `package.json`, `package-lock.json` | Version 0.7.2; ship this change record. |
| `README.md`, `CHANGELOG.md`, `SECURITY.md`, `CONTRIBUTING.md`, `docs/DETAIL.md`, `plugins/personal-profile/README.md` | Current behavior. |
| `docs/PERSONAL_PROFILE_LOCAL_SETTINGS.md`, `docs/PERSONAL_PROFILE_WINDOWS_ACCEPTANCE.md` | Active design and 0.7.2 acceptance plan; 0.7.1 content marked superseded. |
| `docs/PERSONAL_PROFILE_V072_CHANGE_RECORD.md` | This record. |

## 12. Removed or replaced functionality

| Removed | Replacement |
|---|---|
| Workspace selector, instruction scope selector, inherit/override mode | One preference set. |
| Per-Workspace field policies | One profile-wide policy per field. |
| `workspaces` injection and `ctx.workspaces.list` subscription in the profile fiber | None needed. |
| "Merge without replacing existing values" restore strategy | Replace All / Replace All and Merge Custom Instructions. |
| Export without grants | Complete export; opt-in permission restore. |
| Hidden preservation of rows for unlisted Workspaces | Shown in the migration review, exported, discarded only after confirmation. |

## 13. Test coverage changes (audit)

Before: 130 tests reported by the runner (89 top-level). After: 150 reported (101 top-level). No security assertion was weakened; one assertion was intentionally **inverted** by owner decision (export keeps permissions), and the corresponding safety property moved to restore (default Private/Off, opt-in with acknowledgment).

| Previous test (0.7.1) | Decision | Justification / replacement |
|---|---|---|
| describe failures fail closed: `unknown workspace key`, `invalid policy value` (Workspace row) | Replaced | Same cases against v1 (`malformed legacy Workspace row`, `legacy invalid policy value`) and v2 (`invalid policy value`, `unknown preferences key`, `v2 record carrying Workspace rows`, version 3). |
| only trusted Host Workspace IDs are offered | Removed | Nothing is offered; replaced by "the page never reads the Workspace service" (store changes, error state, 300 items: page unchanged; static check: no injection). |
| Workspace overrides replace global only when enabled… | Removed | No overrides. Replaced by "one set of preferences and policies is edited and saved" and "no Workspace selector, scope selector or override control". |
| records for unlisted Workspaces preserved but hidden | Replaced | Migration review lists every row, exports them unaltered and discards only after explicit confirmation. |
| schema/decoder accept more than 64 Workspace overrides; 70 stored overrides editable | Replaced | v2 has no Workspace rows. "Host schema keeps a stored v0.7.1 record intact" (150 rows) and "v0.7.1 record with more than 64 rows lists every row". No count limit asserted in schema. |
| backup with >64 Workspaces restores completely with grants reset | Replaced | Legacy backup import test; grants-reset property covered by default-Private restore tests. |
| merge exceeding payload guard rejected | Removed | General merge removed; v2 records are bounded by field limits. Oversized text/file and record guards still tested. |
| returning a Workspace to inherit stores no row | Removed | No Workspace rows. |
| export without grants; import resets grants | Inverted / replaced | Export now complete (owner decision). Restore defaults to Private/Off; opt-in restore needs exact list + acknowledgment; invalid policies rejected. |
| merge keeps existing values, appends absent Workspaces | Replaced | Replace All and Merge Custom Instructions tests: append, dedupe, formatting, editable preview, empty/identical cases, no truncation. |
| invalid/unsupported/oversized/malformed backups | Extended | 19 cases including invalid/missing policy, instructions > 8192, Workspace rows in v2, legacy malformed rows; each asserts a specific reason. File size/unreadable cases added. |
| cancelling a reviewed restore | Extended | Cancel button, edited text, strategy change resets confirmation. |
| axe/RTL/LTR on all sections | Extended | Also migration panel, legacy JSON, backup review with permissions, both strategies. |
| dirty-draft helpers (Workspace override steps) | Replaced | Name, personality, custom instructions, unified policy. Restore-applied draft is protected too. |
| Desktop render: Workspace options rendered; Workspace updates reach the page; broken Workspace source shows error | Replaced | Page renders with the Host Workspace class present but unused; Workspace updates don't change or crash it; broken Workspace store has no effect; error boundary proven with a failing access hook. The unbound-method class test is kept. |
| sidebar: Workspace override round-trip; export excludes grants | Replaced / inverted | Unified round-trip; export keeps draft permissions. |
| — | Added | v1→v2 migration (lossless; with Workspace data; conflict; >64 rows; Reload protection), complete export via download/copy/view, unavailable download/clipboard, LTR/monospace in RTL, two strategies only, legacy backup import, legacy-answer write mismatch, no filesystem/encryption code. |

Unchanged and still passing: Environment & Context (tab contract, lifecycle, Workspace display), Humanizer independence and Skill lifecycle, independent Component toggles, update checker (version now 0.7.2), DSH bundle/Include composition and v0.6.3 upgrade, package contents and the extracted-artifact run.

## 14. Known limitations

- Windows Desktop behavior is **not verified**: native file download dialog from a Blob URL, Clipboard API permission in the Harness window, file picker, light/dark rendering of the new controls, real migration of a stored 0.7.1 record.
- Plaintext storage and plaintext backups.
- Policies and switches are not enforced (no consumer exists).
- Downgrading to 0.7.1 after a v2 Save shows **unavailable** until the configuration backup is restored.
- The duplicate check in instruction merge is exact per paragraph (after trimming); near-duplicates are kept. The merged text is editable for that reason.
- File size limit is in bytes (3,000,000); text limit in characters (3,000,000).

## 15. Remaining Phase 7 requirements

Before any agent or Direct Chat use: an approved consumer design; enforcement of each field policy and both switches at the real send boundary; Ask First as a real per-use prompt; identification of the provider destination with unknown = deny; prevention of free-text leakage of personal fields through custom instructions; re-check on every send; audit of what was disclosed; tests against the real Host; updated privacy documentation. None of this exists in 0.7.2.

## 16. Windows acceptance and rollback

Follow [Windows acceptance for 0.7.2](PERSONAL_PROFILE_WINDOWS_ACCEPTANCE.md) with fictional data on the exact candidate SHA. Back up `cordis.patch.yml` and `package.json` before installing. Rollback: close Harness, reinstall the known-good SHA, restore both files, restart. Because 0.7.1 cannot read a v2 record, restoring `cordis.patch.yml` is required after any v2 Save. Do not merge, tag or release before the owner records the matrix and approves.
