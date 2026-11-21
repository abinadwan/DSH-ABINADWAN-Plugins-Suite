# Personal Profile Phase 3 implementation plan

> **Superseded (historical record).** Version 0.7.0 replaced this design with native Harness settings; see [the current design](../../../PERSONAL_PROFILE_LOCAL_SETTINGS.md). Nothing described here is in the runtime or the package.

Goal: implement the user's detailed Phase 3 specification on exactly
6e815f9c26d995b675dda161a58d4873793888e7, targeting Phase 2 in a new draft PR.
Architecture: reuse Master Profile instructions and Phase 2 trusted opaque Profile
handles. Add no Host/client wiring, exports, dependencies or model composition.
Stack: dependency-free Node ESM and node:test, existing Node 22/24 CI matrix.

1. Add synthetic instruction management tests; observe failure for the missing
   management API and missing identity collision rejection.
2. Add core/instructions.js for synchronous editing, inheritance preview and reset;
   absent overrides use null in previews, present empty overrides suppress global.
   Keep original optional suggestions immutable and unapplied.
3. Add core/profile-identity.js for conservative collision rejection; reuse existing
   validators and enforce it at initialization and registered management boundaries.
   Keep raw Phase 1 exact-key API semantics intact for compatibility.
4. Thread the same Master Profile's instruction capability through retrieval.js to
   consent.js host only. No reader methods or consent-ledger changes.
5. Verify validation/atomicity, budgets, identity aliases, environment isolation,
   value/grant preservation and unchanged runtime boundaries. Run npm test and
   npm run check:package. Document security limits and future Host requirements.
6. Review diff, commit and push only the requested new branch; create its draft PR.
   Check all Windows/Linux × Node 22/24 CI jobs and unchanged earlier PR/main heads.

Review focus: explicit-empty versus absence; cross-instance handles; aliases among
seeded and registered names; shared environment limits; text escaping into readers.
The user-specified end-to-end implementation and delivery is the authorized scope.
