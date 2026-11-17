# Personal Profile production-readiness QA — independent branch

Base: main at 485c8dd92cff3960442750ca3e2bfcfd65d4b895 (v0.6.3). No release-version bump or runtime changes. This is synthetic QA, not deployment approval.

## Existing layers audited

- Core: schema, bounded input, name/identity validation, global and environment instruction precedence, private-by-default field rules.
- Consent: per-field and session grants, expiration/revocation and replay protection.
- Storage: authenticated encryption, bounded file IO, write/rename checks, backup KDF and authorization fence.
- Gate: synthetic resolver, role separation, per-session capabilities; no real authenticated Harness transport.
- Client: v0.6.3 personality controls are browser-memory preview only. Persisted core instructions currently store text, not the new structured personality preferences. The schema/serialization/migration decision is outstanding.

Relevant sources: plugins/personal-profile/core/model.js, storage/authorization.js, storage/lifecycle.js, storage/files.js, integration/gate.js, client.js, docs/PERSONAL_PROFILE_PHASE6A.md, docs/PERSONAL_PROFILE_WINDOWS_ACCEPTANCE.md.

## Automated QA on this branch

test/personal-profile-production-readiness.test.js adds synthetic encrypted reopen, Unicode/empty environment override semantics, backup authority reset, Windows retained fence, Linux authorization control, precommit rollback, and production-inert checks. Tests use temporary roots and synthetic random keys; they do not connect to Harness, read users' data, invoke DPAPI or activate a Host.

Two normative release-blocker tests are deliberately marked TODO pending resolution; TODO failure must not be mistaken for a passing security guarantee:

1. Cross-instance authorization: storage/lifecycle.js keeps authorization readiness in memory; the disk fence checks the current presence of a lock/fence, not the revision that established readiness. A fresh gate session on an older instance may be authorized against a new ordinary write by another instance. Existing documentation explicitly limits the component to a single owner. Before multiple-instance support, bind readiness to an authenticated durable revision (and address races), or provide and verify an exclusive owner boundary that prevents this scenario. The synthetic reproducer requires a durable positive path and is skipped on Windows.
2. Stale editor: ordinary save replaces the record, preserving authority but without expected-revision compare-and-swap. Two drafts may overwrite a newer normal edit. The future authenticated management adapter needs an atomic version check, conflict handling and explicit retry rather than a last-writer-wins UI.

These are source-based findings until the CI test results confirm their reproductions. The TODO tests are not release approval, not production exploits, and must not be silently skipped or reclassified as passing.

## Production gates — not implemented / not approved

| Gate | Required evidence |
| --- | --- |
| Windows OS key provider | Approved in-Host Windows identity and DPAPI CurrentUser behavior; key never in plaintext or exposed to the browser/model; restart and wrong-account denial; reviewed lifecycle and cancellation. |
| Local persistence | Host-owned root, Windows ACL and reparse-point checks, recoverable atomic writes with durability evidence and truthful failure messages; prove single-owner boundary or revision-based authority. |
| Management bridge | Verified rc3 Host-side identity/authentication, origin/replay protection, explicit management permission, trusted canonical profile selection, bounded payloads, version conflict detection, lock/lifecycle checks, no generic model-readable endpoint. |
| Structured preferences | Versioned validated neutral defaults, explicit migration and absent/empty overrides, separate UI and response languages, no silent instruction injection. |
| Agent injection | Independent opt-in, scoped current environment, safe composition respecting higher-priority instructions, no arbitrary personal fields sent with style text, no logging of private data. |
| Permissions | Private defaults, durable opt-out/revocation, approval/session identity, timeouts and invalidation. Windows directory durability currently intentionally blocks authorization. No manual fence deletion. |
| Restore and lock | Review & Merge default; Replace All explicit; imported permissions Private and opt-in off; encrypted backup and wrong password, lock/sleep/session end and plugin Off. |

## Device acceptance pending

User will separately validate the existing main v0.6.3 UI on actual Windows Harness v0.2.2-rc.3: dark/light popup contrast, all languages, keyboard/RTL/LTR, preferences, overrides and toggling. That is not approval for any real-data feature.

No real data, live provider, actual agent injection, release publication, destructive action, or merge into main is part of this branch. A subsequent change must address documented blockers and pass fresh independent Windows acceptance before requesting production activation.
