# Personal Profile — 0.7.2 candidate

One unified profile per active Harness Profile: optional preferred name, nationality, gender, structured response preferences and custom instructions, with one Private / Ask First / Allow policy per field and two sharing switches (Private / Off by default). No Workspace selector or per-Workspace overrides. Native Harness settings, explicit Save and revision-checked edits; reviewed, confirmed migration of 0.7.1 settings.

Backup & Restore: complete JSON export (download, copy, view; includes saved permissions; **not encrypted**), import from a file or pasted JSON, **Replace All** or **Replace All and Merge Custom Instructions**, opt-in permission restore, then explicit Save.

No plugin-level encryption, no model disclosure or agent instruction injection; policies are saved preferences until Phase 7. Disabled by default. See [design](../../docs/PERSONAL_PROFILE_LOCAL_SETTINGS.md) and the [0.7.2 change record](../../docs/PERSONAL_PROFILE_V072_CHANGE_RECORD.md). The Phase 1–6 encrypted-storage designs and the 0.7.0/0.7.1 Workspace-based design are historical, not current implementation.
