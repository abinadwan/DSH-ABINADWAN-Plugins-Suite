# Personal Profile — 0.8.0-rc.1 candidate

Personal Profile stores an optional preferred name, nationality, gender, response preferences and custom instructions in the active Harness Profile. The profile applies across Workspaces. Edits use native Harness settings and require an explicit, revision-checked Save.

## Sharing

Saved response preferences apply to supported native agent steps. Custom text requires separate saved permission that includes cloud use. Editing or restoring the text clears that permission.

Structured personal details stay local in this build. The sharing switches are disabled pending verified provider admission and request capture in an isolated Windows Desktop profile. Field policies remain editable and default to Private. Ask First remains inactive because Harness lacks a destination-bound approval prompt.

Earlier saved v2 records keep their personal information, response preferences, custom-text permission and field policies. The editor loads both sharing switches Off and writes the v3 record only when you Save. To downgrade, keep an archived Harness configuration or export a compatible version 2 JSON backup before the first Save. The upgrade notice includes the export controls. The Host refuses requests carrying a literal Profile details block from an earlier build while the plugin is active. Earlier details can remain with providers and in conversation history, Harness logs, summaries or branches. Start a new chat if the guard stops a request. [Phase 8 audit](../../docs/PERSONAL_PROFILE_PHASE8_AUDIT.md)

## Backup and restore

Backup & Restore exports the draft as version 2 plain JSON with its field policies and both sharing switches Off. Backups may contain personal information and custom instructions, and neither backups nor native settings have plugin-level encryption. Imports accept current backups, v2 backups and the older Workspace-based v1 format.

Review & Merge is the default for each import. It keeps omitted settings, applies supplied settings and offers an editable preview of merged custom instructions. An explicit empty custom instruction value clears that text. Replace All resets omitted settings to their defaults and requires separate confirmation. Applying any restore to the draft leaves both sharing switches Off and clears custom-text permission. Importing saved field policies requires a separate opt-in. Save to commit the reviewed draft.
