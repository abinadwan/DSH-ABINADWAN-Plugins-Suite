# Personal Profile consent implementation plan

Goal: implement the user's Phase 2 specification on the exact Phase 1 commit.
Architecture: an internal consent facade owns a Phase 1 core. Separate opaque
context capabilities and a bounded synchronous consent ledger prevent untrusted
request data from acting as authority. Host management stays separate from reads.
Stack: existing dependency-free ESM, node:test; no Host/UI wiring.

1. Write synthetic behavioral tests for one-use and session grants, denial,
   replay, expiry, cancellation, context isolation, policy/lifecycle invalidation,
   malformed metadata and default-off behavior. Run and observe missing API failure.
2. Add core/consent-context.js for Host-issued profile/caller/session/scope handles.
   Add core/consent-ledger.js for expiring pending decisions and scoped grants.
   Add core/consent.js to integrate existing retrieval with trusted management.
   Keep operations synchronous with no callbacks between check and consumption.
3. Run focused tests, then npm test and npm run check:package. Review boundaries
   including malformed/accessor inputs, policy changes away and back, already
   decided cancellation, clock failure and resource limits.
4. Document contracts, Harness one-shot distinction and canonical identity risks.
   Push only the new branch and create a Draft PR targeting Phase 1. Verify the
   Windows/Linux Node 22/24 checks and unchanged protected branch/PR heads.

Review focus: bearer capability leakage, pending-to-consumed races, stale policy
restoration, canonical Profile aliases on Windows, and missing Host lifecycle events.
All are bounded by the explicitly deferred trusted Host integration; synthetic
fixtures do not constitute authentication or filesystem identity resolution.
