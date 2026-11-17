# Personal Profile 0.7.0 — native local settings candidate

This replaces the earlier fictional preview and encrypted-storage design. The owner approved removal of full name, exact date of birth, custom personal fields, custom encryption and simulated/automatic lock. Only optional preferred name, nationality and gender remain. Custom **instructions** remain, with the eight personalities, seven response languages plus Automatic, six traits and eight presets.

## Persistence contract

- Use Harness rc3's native settings service: `ctx.remote.settings.describe()` and `replace(namespace, section, expectedRevision)`. One versioned record, explicit Save, mandatory expected revision, refusal/conflict shown honestly. The Host owns the profile patch and its atomic-write lifecycle; this plugin does not write files directly or use browser storage.
- Namespace `abinadwan-personal-profile` retains its patch ID and remains disabled by default. It is inserted directly into the root Include, rather than nested in the suite Group, because ConfigEditor.entries() only addresses direct Include-owned entries. The other two components keep the original Group; the official bundle selection still removes/adds all bundle contributions. Manual group-only disable no longer disables the separate Personal Profile row. Verify real install/upgrade and toggles.
- “Global” means global **within the active Harness Profile** (settings are profile-owned). Workspace overrides use real Host workspace IDs from `ctx.workspaces.list`; no invented environment names or shared cross-Profile data. Existing overrides replace global style rather than merging.
- Restore/export uses explicit local JSON copy/paste, no automatic file/cloud write. Export drops grants. Import validates allowed shape, offers merge (keep existing global and non-empty personal values, append absent workspace IDs) or explicit replacement, resets all field grants to Private and both opt-ins Off, stages a draft before Save.
- No encrypted legacy data migration is attempted: v0.6.3 never persisted the preview. The old synthetic storage and consent experiments are superseded by this design and retained in Git history/PR #15, not runtime. Do not enter passwords, keys, health/financial details or other sensitive information into free text or backups.

## Privacy boundary

Plaintext local settings and backup content are readable by someone with access to those files. OS account, local file permissions and existing whole-disk encryption are the storage boundary. This plugin has no model tool, instruction injection, approval service or external profile transfer. Per-workspace Private / Ask First / Allow and master/cloud opt-ins are stored preferences only; the UI explicitly says enforcement and disclosure are not active. Keeping these defaults does not prove a future model gateway safe. Any later agent integration must identify the actual workspace, respect consent, identify provider destination (unknown denies), prevent free-text/field leakage and recheck at the real send boundary. Nothing in this candidate activates such a path.

## Evidence and manual acceptance

Reviewed pinned Harness source 38a6a5c965aa99ab525161efb7cc5cf1fe62fced: packages/api/settings-controller/src/index.ts; packages/boot/config-editor/src/index.ts; packages/settings/settings/src/index.ts and tests/configuration.spec.ts; packages/client/ui-theme/src/index.ts; workspace-controller client model. SettingsController uses RemoteResult envelopes; writes accept expectedRevision; volatile schemas project to the native settings form. The package uses the same pinned Schemastery version as rc3.

CI uses synthetic Remote doubles and Loader/pack tests. Real Windows Harness persistence and permissions have not been verified. Manual gates: install exact candidate SHA only after v0.6.3 acceptance; ensure Settings namespace appears, verify Save/restart/reopen, conflict in two windows, workspace override isolation, restore, deny access, component/bundle toggle, independent Arabic/English UI and dark/light selects. Check the actual profile patch contains only approved fields and no secrets. Do not release or merge until user approves.
