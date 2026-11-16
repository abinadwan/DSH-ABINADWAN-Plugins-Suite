# Personal Profile Phase 5 implementation plan

Goal: implement the user's Phase 5 specification as isolated Host-side components.
Architecture: serialize the Phase 1 Master Profile schema, never a second database; authenticate bounded encrypted envelopes before parsing content; synchronous atomic filesystem commits; reuse Phase 2 consent with generation-bound capabilities. Production has no approved provider and must refuse construction.

Implementation choices: Node crypto AES-256-GCM; @noble/hashes 2.0.1 portable Argon2id (no native addon); fixed 64 MiB/3 passes/1 lane backup KDF; hashed Host identity filenames under a preprovisioned private directory. DPAPI spike remains separate. UI/runtime/exports remain unchanged.

- [x] Write failing synthetic crypto, backup, storage, restore and lifecycle tests.
- [x] Add strict serialization/envelopes and bounded Argon2id portable backups.
- [x] Add filesystem transactions, protected recovery and explicit import review.
- [x] Add revocable capabilities/key disposal, explicit synthetic provider in test-support, fail-closed production factory.
- [x] Run focused and full source/package tests; review boundaries; document threats, formats and limitations.
- [x] Commit/push only the new branch, open draft against Phase 4, inspect all four CI matrix jobs, stop for security review.

Review focus: lock during pending work, stale import reviews, conflicting custom types, symlink/hardlink targets, post-rename durability uncertainty, hostile KDF metadata. No automatic activation or model injection. No prior PR mutations.


## PR #7 security review fix

- [x] Reproduce unbounded access/review retention and missing recovery outcome.
- [x] Introduce 16 disposable access leases, revocable cells and capacity reclamation.
- [x] Introduce 16 reviews, 60-second monotonic expiry, one cleanup timer and cancellation.
- [x] Recheck expiration before commit; invalidate all leases/reviews on lock or mutation.
- [x] Verify engine collection with retained methods and encrypted file integrity.
- [x] Document current non-persistence and required future secure permission contract.
- [x] Run full source/package regressions: 127 tests pass in each.

Delivery constraint: push this fix to the same branch, verify all four CI targets, update Draft PR #7 and stop for review.
