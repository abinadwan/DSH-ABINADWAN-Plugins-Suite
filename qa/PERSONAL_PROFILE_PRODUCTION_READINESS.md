# Personal Profile production-readiness QA — independent branch

Base: main at 485c8dd92cff3960442750ca3e2bfcfd65d4b895 (v0.6.3). No release-version bump or activation of runtime features; internal storage and gate corrections are confined to this branch. This is synthetic QA, not deployment approval.

## Existing layers audited

- Core: schema, bounded input, name/identity validation, global and environment instruction precedence, private-by-default field rules.
- Consent: per-field and session grants, expiration/revocation and replay protection.
- Storage: authenticated encryption, bounded file IO, write/rename checks, backup KDF and authorization fence.
- Gate: synthetic resolver, role separation, per-session capabilities; no real authenticated Harness transport.
- Client: v0.6.3 personality controls are browser-memory preview only. Persisted core instructions currently store text, not the new structured personality preferences. The schema/serialization/migration decision is outstanding.

Relevant sources: plugins/personal-profile/core/model.js, storage/authorization.js, storage/lifecycle.js, storage/files.js, integration/gate.js, client.js, docs/PERSONAL_PROFILE_PHASE6A.md, docs/PERSONAL_PROFILE_WINDOWS_ACCEPTANCE.md.

## Automated QA on this branch

test/personal-profile-production-readiness.test.js adds synthetic encrypted reopen, Unicode/empty environment override semantics, backup authority reset, Windows retained fence, Linux authorization control, precommit rollback, and production-inert checks. Tests use temporary roots and synthetic random keys; they do not connect to Harness, read users' data, invoke DPAPI or activate a Host.

### Confirmed defects and correction candidate

Initial PR CI run [44051473383](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/actions/runs/44051473383) confirmed both TODO failures: Linux returned an allowed synthetic value from a newer revision using old instance readiness; Windows and Linux accepted a stale full replacement rather than rejecting it. These were limited to internal synthetic assemblies; the runtime Host was inert.

This follow-up binds durable authorization readiness to the hash of the exact encrypted bytes committed by the authorization transaction, checks the current fence and revision for authorized reads and lease operations, and drops readiness on mismatch. It does not infer authority from plaintext equality. Gate uses authorized snapshots and leases, and checks readiness before returning results. Legacy trusted storage access remains internal and is not an authorization interface.

Trusted management editing now has readForEdit(id) returning a same-read {revision,input} snapshot, and saveIfRevision(id,expectedRevision,input). The expected revision is checked before invalidation, repeated under the cooperative writer lock, and checked at precommit. Null is creation-only; malformed, stale and replayed revisions fail closed. Legacy save(id,input) remains a full replacement for existing internal callers; a future editor must never expose it as its save endpoint. This is a revision check, not authentication. No UI or model wiring is introduced.

The former TODO regression tests now assert the corrected contracts without TODO; added tests for identical-plaintext re-encryption, in-progress writers, pending approvals, create-only semantics and stale/replayed drafts. Follow-up CI is required before claiming these corrections pass. Windows positive authorization stays blocked and its positive-path tests remain skipped intentionally.

Limits: this is cooperative single-owner-oriented filesystem QA, not a proof of portable cross-process linearizability; last-moment races, hostile directory replacement, ciphertext replay, and OS identity/ACL boundaries require a separately reviewed production design. No authorization fence is manually removed. The encrypted schema is unchanged. Legacy full replacement remains unsafe for stale editor drafts.

## Production gates — not implemented / not approved

| Gate | Required evidence |
| --- | --- |
| Windows OS key provider | Approved in-Host Windows identity and DPAPI CurrentUser behavior; key never in plaintext or exposed to the browser/model; restart and wrong-account denial; reviewed lifecycle and cancellation. |
| Local persistence | Host-owned root, Windows ACL and reparse-point checks, recoverable atomic writes with durability evidence and truthful failure messages; prove exclusive-owner boundary or review the remaining cross-process races beyond the candidate revision checks. |
| Management bridge | Verified rc3 Host-side identity/authentication, origin/replay protection, explicit management permission, trusted canonical profile selection, bounded payloads, version conflict detection, lock/lifecycle checks, no generic model-readable endpoint. |
| Structured preferences | Versioned validated neutral defaults, explicit migration and absent/empty overrides, separate UI and response languages, no silent instruction injection. |
| Agent injection | Independent opt-in, scoped current environment, safe composition respecting higher-priority instructions, no arbitrary personal fields sent with style text, no logging of private data. |
| Permissions | Private defaults, durable opt-out/revocation, approval/session identity, timeouts and invalidation. Windows directory durability currently intentionally blocks authorization. No manual fence deletion. |
| Restore and lock | Review & Merge default; Replace All explicit; imported permissions Private and opt-in off; encrypted backup and wrong password, lock/sleep/session end and plugin Off. |

## Device acceptance pending

User will separately validate the existing main v0.6.3 UI on actual Windows Harness v0.2.2-rc.3: dark/light popup contrast, all languages, keyboard/RTL/LTR, preferences, overrides and toggling. That is not approval for any real-data feature.

No real data, live provider, actual agent injection, release publication, destructive action, or merge into main is part of this branch. A subsequent change must address documented blockers and pass fresh independent Windows acceptance before requesting production activation.
