# Phase 8 — Controlled Personal Profile Disclosure

Status: planned; not implemented or approved for activation. Start from the merged Phase 7 candidate baseline in a separate feature branch. Keep Phase 7 fail-closed behavior intact until positive disclosure passes its own security gate.

## Scope

- Existing optional fields only: preferred name, nationality, gender. No new personal fields.
- Master Off and Private always deny. Allow and Ask First must become enforceable only when a trustworthy destination-bound admission and history policy exist. Cloud Off must deny unknown/untrusted/cloud destinations; do not infer trust from localhost.
- Custom instructions remain a separate explicit consent channel; no automatic reclassification or promotion of stored grants. Storage and JSON backups remain plaintext under the current contract.

## Work plan

1. 8A — Read-only review of supported Harness Agent Loop, history/replay, route identity and approval APIs; verify against pinned Host and actual Desktop. Document go/no-go and upstream blockers.
2. 8B — If supported, implement fail-closed field admission with master, per-field and cloud policies. Unknowns deny; saved grants are not silently activated.
3. 8C — Native destination-bound, single-use approval for Ask First; no misleading approval prompts if guarantees cannot be enforced.
4. 8D — Define revocation, disable, retry, compaction, provider switch and history isolation. Do not claim retroactive erasure. A weaker prospective-only model requires separate explicit owner approval.
5. 8E — Synthetic-only unit, real-loop offline adapter and actual request tests, including confidentiality on route/permission changes and negative cases.
6. 8F — Independent RC and Windows acceptance before stable release. No positive structured disclosure until the security gate is met.

## Dependencies

[Phase 7C privacy gate](PERSONAL_PROFILE_PHASE7C_PRIVACY_GATE.md) documents current upstream limitations. [Phase 7 Windows acceptance](PERSONAL_PROFILE_PHASE7_WINDOWS_ACCEPTANCE.md) records actual functional results and outstanding request evidence. Phase 8 research must not bypass unfinished Phase 7 security checks or imply existing controls already authorize model access.
