# Personal Profile — simplified design candidate

**Status:** development branch only; the released UI remains a synthetic preview. Do not enter real data until the trusted Host connection is implemented and verified.

## Approved scope

- Optional preferred name (not legal/full name), nationality and gender.
- No date of birth, full name, arbitrary personal fields, passwords, or identity documents.
- Personality, response language, characteristics, behavior presets and custom instructions remain editable. Eight styles, seven response languages plus Automatic, six three-level characteristics and eight optional presets. Default settings are neutral. Arabic/English interface labels remain separate from response language.
- Global preferences and complete per-environment replacement; no dedicated dialect setting.
- No application-specific encryption, key provider, password vault, automatic lock or encrypted backup requirement. Settings and backups are plain text: do not enter secrets or sensitive details, including in custom instructions.
- Personal-field access: Private, Ask First or Allow per field/environment. Global opt-in Off. Sending personal fields to an external provider requires separate per-environment permission, also Off. Unknown destination denies. This does not control personal details independently supplied by a user in a chat or custom instructions.

## Implementation boundary

The left-sidebar UI is still browser-memory preview only. Its access and backup controls are simulated; toggling the component Off removes its UI. The Host entry is deliberately inert and disabled by default. No actual browser/Host save bridge, remote consent, model injection, or provider transmission has been enabled.

The new internal preferences/model.js and preferences/store.js implement allowlisted structured settings, bounded validation, plain local JSON persistence, revision-checked writes, and backup/restore review. A trusted Host must supply the private storage root and authenticate management callers, resolve the active canonical environment and determine actual provider destination. Backup review strips authorization; the future Host UI must enforce explicit confirmation and reject stale reviews when committing. Restore never silently grants access. On Windows, successful rename is reported as committed, but directory durability is not asserted. OS ACL and real Windows integration acceptance remain outstanding. SHA-256 is used for revision comparison, not encryption. There is no runtime dependency on the previous encrypted architecture.

The old core/storage/integration modules, phase 1–6 documents and tests are historical prototypes. They remain in source history and source-only regression tests, are excluded from the packed runtime, and must not be wired into the new implementation. No real user files or old backups are migrated or deleted by this change.

## Verification

Run npm test for source (including archived tests); npm run check:package verifies the actual reduced package and its applicable tests. Next: implement and validate a trusted Host management adapter, real save/reload, local backup review/apply, and independent scoped consent and external-sharing enforcement. Test actual Windows UI separately from synthetic CI.

[Suite overview](../../README.md) · [Security policy](../../SECURITY.md)
