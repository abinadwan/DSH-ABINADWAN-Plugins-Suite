# Personal Profile 0.8.0-rc.1 — unified native settings and response preferences

This is the active design. It supersedes the 0.7.0/0.7.1 Workspace-based design (record v1, per-Workspace overrides and policies, grant-less export, general merge restore), which is kept in Git history and summarized in the [0.7.2 change record](PERSONAL_PROFILE_V072_CHANGE_RECORD.md). The earlier encrypted-storage phase documents (`PERSONAL_PROFILE_PHASE*.md`) are historical and not in the runtime or package.

Status: **Phase 7 candidate; Windows Desktop acceptance pending**. See the [Phase 7 acceptance matrix](PERSONAL_PROFILE_PHASE7_WINDOWS_ACCEPTANCE.md).

Approved fields: optional preferred name, nationality and gender. Preferences: eight personalities, Automatic plus seven response languages, six three-level characteristics, eight behavior presets, custom instructions (≤ 8192 characters) and an effective-instructions preview. No full name, date of birth, custom personal fields, custom encryption or lock.

## Unified profile

- One record per active Harness Profile: information, **one** preference set, **one** field-policy set (Private / Ask First / Allow per field), the master personal-information switch, the cloud-sharing switch, and interface locale.
- No Workspace selector, scope selector, override or inheritance. The profile fiber does not inject or read the Workspace service, so Workspace state cannot affect the page and there is no Workspace count restriction.
- Designed to apply to every existing and future conversation once a separately approved consumer (for example a future Direct Chat component) exists. **Nothing reads, injects or discloses it today.**

## Persistence contract (unchanged)

- Harness rc.3 native settings: `ctx.remote.settings.describe()` and `replace(namespace, {record}, expectedRevision)`. Explicit Save, mandatory expected revision, success only after the committed view equals what was sent; refusal and conflict shown honestly. The Host owns the file and its atomic write; the plugin writes no files and uses no browser storage.
- Namespace `abinadwan-personal-profile`, a direct root Include entry, disabled by default.
- Schema: `record` is `union([v2, v1])`, volatile, default v2. v1 stays readable so the Host never strips or rejects stored 0.7.1 data; the browser writes only v2.
- Payload guard: 3,000,000 serialized characters for the record and restore text; 3,000,000 bytes for restore files.

## Migration from 0.7.1

A stored v1 record opens a **Migrate settings from 0.7.1** review. Information, locale, global preferences and custom instructions carry over unchanged. Workspace rows are listed (ID, override, personality, response language, instruction length, policies) and can be downloaded, copied or viewed as the complete unaltered v1 JSON. Unified policies start Private and both switches Off; Workspace permissions are never promoted. If any Workspace row exists or a switch was On, Save stays disabled until the user explicitly confirms the discard. Nothing changes until a successful, revision-checked Save. Details and rationale: change record §7.

## Backup and restore

- **Export** is complete (information, preferences, custom instructions, field policies, both switches) as JSON: **Download JSON file** (browser Blob download), **Copy JSON** (Clipboard API) or **View JSON**. The UI warns the file is not encrypted and contains personal information and permissions.
- **Import** from a JSON file or pasted text, then **Review backup**: strict validation with a specific reason, a current → proposed preview of every setting, explicit confirmation, **Apply restore to draft**, then a separate native **Save**.
- Strategies: **Replace All**; **Replace All and Merge Custom Instructions** (existing text kept, non-duplicate imported paragraphs appended, formatting kept, editable preview, never truncated; Apply disabled above 8192 characters).
- Permissions: restored as Private / Off unless the user ticks the unchecked **Restore the permissions saved in this backup**, sees the exact list and acknowledges it. Invalid or unsupported policies reject the backup. 0.7.0/0.7.1 backups restore their global settings only.

## Privacy boundary

Plaintext local settings and backup files are readable by anyone with access to them. OS account, file permissions and any existing whole-disk encryption are the storage boundary. The native system-prompt section contributes saved response preferences to supported agent steps. Custom instructions require separate saved consent, including cloud use, cleared by editing or restoration. Previous instructions may persist in history. Structured personal fields remain excluded regardless of policies and switches, which are saved only. See the [Phase 7C gate](PERSONAL_PROFILE_PHASE7C_PRIVACY_GATE.md). Do not enter passwords, keys, health/financial details or other sensitive information.

## Verified Host contracts (pinned source review)

Source: `deepseek-ai/deepseek-harness` at `38a6a5c965aa99ab525161efb7cc5cf1fe62fced` (`dsh-v0.2.2-rc.3`; package versions `0.2.2-rc.3`).

| Contract | Source | Finding |
|---|---|---|
| `settings.describe()` | `packages/api/settings-controller/src/index.ts` | Returns `{writable, hasDocument, namespaces[]}`; each view has `ns`, `value`, `revision`. Client requires `ok:true`, the exact `ns`, a non-negative integer revision, `writable:true` and a strictly valid v1 or v2 record, otherwise **unavailable** with no write. |
| `settings.replace(ns, section, expectedRevision)` | same, `write()` | Refusal is `settings/conflict` or `settings/rejected`. Success answers the view read after the commit; the client requires a v2 record equal to what it sent, otherwise **failed**. |
| Revision check | `packages/settings/settings/src/index.ts` `write()` | Checked inside `configEditor.edit` under the Profile file lock. |
| Atomic write | `packages/boot/config-editor/src/index.ts` `edit()` | `writeFileAtomic(..., 0o600)` then reconcile; previous document restored on reconcile failure. |
| Include-owned entries | `ConfigEditor.entries()` | Only direct root `include` entries with unique ids; hence the top-level row. |
| Volatile schema | `packages/settings/settings/src/schema.ts` | Only `.volatile()` fields accept writes; `record` (the v1/v2 union) is volatile. Replacement strips the stored volatile subtree, so a v2 Save removes v1 keys. |
| `configure({auto:false}, fiber)` | `SettingsForms.configure` | Hides the generic form for this entry. |
| Browser Remote | `packages/api/remotes/src/client/index.ts` | `settings/describe` and `settings/replace` checked with the slot's `useRemoteAccess`. |
| Workspace list | `packages/api/workspace-controller/src/client/model.ts` | **No longer used by Personal Profile** (0.7.2). Still used by Environment & Context. |
| Schema library | `vendor/schemastery` | `@deepseek-ai/schemastery` 3.19.0, the package's only runtime dependency. |

## What automated tests prove, and what they do not

Proven with Harness-shaped doubles, the real Cordis Loader, real `composeEntries`, the real schema and real React/jsdom: fail-closed reads; revision-carrying writes; conflict, refusal and mismatch handling; duplicate-click and stale-response races; reconnect draft protection; unified schema and defaults; Host schema preservation of v1; Workspace independence; lossless and confirmed migration without permission promotion; complete export via download/copy/view; file and paste import; both strategies, duplicate prevention, no truncation; opt-in permission restore; 19 malformed backup cases; cancellation; Arabic/English axe checks; no logging, network, storage, filesystem, encryption or agent path. Test audit: change record §13.

Requires real Harness Desktop: persistence across restart, real migration of a stored 0.7.1 record, Blob download and Clipboard behavior in the Harness window, native file picker, two-window conflicts, permission refusals, uninstall behavior, Windows light/dark rendering and visual RTL.

## Known risks

See change record §14. In short: plaintext storage and backups; unenforced policies; downgrade to 0.7.1 after a v2 Save needs the configuration backup; Desktop download/clipboard/file-picker behavior unverified.

## Manual acceptance

Do not merge or release until the owner completes the [Windows acceptance](PERSONAL_PROFILE_WINDOWS_ACCEPTANCE.md) with fictional data and approves.
