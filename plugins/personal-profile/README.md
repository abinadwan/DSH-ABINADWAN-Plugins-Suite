# Personal Profile — 0.8.0-rc.1 candidate

One unified profile per active Harness Profile: optional preferred name, nationality, gender, structured response preferences and custom instructions, with one Private / Ask First / Allow policy per field and two sharing switches (Private / Off by default). No Workspace selector or per-Workspace overrides. Native Harness settings, explicit Save and revision-checked edits; reviewed, confirmed migration of 0.7.1 settings.

Backup & Restore: complete JSON export (download, copy, view; includes saved permissions; **not encrypted**), import from a file or pasted JSON, **Replace All and Merge Custom Instructions** (default) or **Replace All** (needs its own confirmation), opt-in permission restore, then explicit Save. A restore always leaves both sharing switches Off.

No plugin-level encryption. Saved response preferences enter supported native agent steps; custom text requires separate saved consent including cloud use, cleared on edit and restore. Past instructions may stay in history. Disabled by default.

**Phase 8 sharing (local build, not released):** a field is added to new requests only when it is **Allow** and both switches are **On**. Every provider is treated as cloud because Harness cannot verify locality, so the cloud switch is always required. Private and Ask First fields are never sent (Ask First has no native approval prompt yet). Changes apply from the next step, and a request that still carries details the current settings would not share (retry, in-history replay, provider switch, restored or branched chat) is stopped before it reaches the provider. Details already sent are not deleted from the provider, history, Harness logs, summaries or branches. See the [Phase 8 plan](../../docs/PERSONAL_PROFILE_PHASE8_PLAN.md). See [Phase 7C privacy gate](../../docs/PERSONAL_PROFILE_PHASE7C_PRIVACY_GATE.md), [design](../../docs/PERSONAL_PROFILE_LOCAL_SETTINGS.md) and the [0.7.2 change record](../../docs/PERSONAL_PROFILE_V072_CHANGE_RECORD.md). The Phase 1–6 encrypted-storage designs and the 0.7.0/0.7.1 Workspace-based design are historical, not current implementation.

## Acceptance and next steps

See the [Phase 7 Windows Desktop acceptance record](../../docs/PERSONAL_PROFILE_PHASE7_WINDOWS_ACCEPTANCE.md) for owner-reported functional outcomes, actual rollback and outstanding request-level checks. The candidate is not a published stable release. Phase 8 verification and the open Desktop acceptance step are in the [Phase 8 report](../../docs/PERSONAL_PROFILE_PHASE8_REPORT.md).
