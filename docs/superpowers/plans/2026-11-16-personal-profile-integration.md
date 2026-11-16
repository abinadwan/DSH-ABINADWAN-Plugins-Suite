# Phase 6A implementation plan

Goal: synthetic Host boundary QA; live component stays disabled and read-only.
Architecture: extend the existing encrypted profile payload with versioned canonical-ID permissions; add an internal access gate with independently resolved Host identity. No Harness adapter is asserted or registered.
Spec: user Phase 6A requirements; docs/PERSONAL_PROFILE_PHASE6A.md records evidence and limits.

- [x] Test versioned payload migration, encrypted permissions, import reset and invalid metadata; implement storage/codec.js normalization.
- [x] Test atomic permission mutations, immediate lease invalidation and uncertain durability; implement lifecycle.js mutation transaction and fail-closed authorization barrier.
- [x] Test Host-owned identities, ownership, cross-Profile denial, role separation, consent and lifecycle; implement integration/gate.js, synthetic registry stays in test-support.
- [x] Inspect locked installed and pinned upstream APIs, separately check PR #2 in detached worktree; document unsupported bindings and Windows acceptance steps.
- [x] Run npm test and packed package checks; push only the requested new branch, open Draft PR, observe Windows/Linux Node 22/24 CI (delivery evidence is in the PR). Never activate, merge, deploy or release.

Review focus: restored Allow, identity ambiguity, failed revocation, stale consent, policy escalation via instruction text. All must fail closed.

## Approved correction of c5551de (same branch and Draft PR #8)

The user authorized these fixes without activation. Ordinary saves must preserve
existing authority and reject changes/stale snapshots; only validated explicit
management transactions may persist permission or opt-in changes. Invalid input
must not create a writer lock/fence or revoke a valid lease. Valid updates must
invalidate before I/O and fence failures, partial replacement and uncertain
commit/cleanup. Lock/unlock and unrelated records cannot revive authorization.
Resolver claims must be snapshotted from own data properties: every missing,
malformed, changed or throwing identity is terminal for old bindings, approvals
and session grants, even when the previous identity is later restored.

Compatibility evidence is corrected to official `dsh-v0.2.2-rc.3`, commit
`38a6a5c965aa99ab525161efb7cc5cf1fe62fced`; BrowserAuth and admission are distinct
from Profile field consent and from an OS principal. Installed package/ASAR
observations are user-reported, not binary equivalence or device execution.

Regression proof: the final selected reproductions against an isolated archive
of starting commit c5551de ran 37 cases with 17 failures. The corrected regression
file covers both pending approvals and active session grants, authority replay,
invalid-input disk invariance, partial/I/O/durability/cleanup failure and the
conservative schema-deletion limit. Final counts, SHA and platform checks are
recorded on PR #8 after verification. No alternative branch or PR is used.
