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
