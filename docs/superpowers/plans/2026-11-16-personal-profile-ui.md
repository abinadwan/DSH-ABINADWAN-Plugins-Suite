# Personal Profile UI implementation plan

Goal: implement the five requested pages as an isolated, synthetic, memory-only prototype.
Architecture: native accessible DOM components, a fixture state module, shared pure Phase 1 validators, and a loopback-only allowlisted development server. No runtime or package exports change. Follow the suite's rounded cards, neutral borders and Arabic support, with a responsive navigation rail.

Alternatives: mounting inside the suite violates isolation; adding a frontend bundler is unnecessary. A standalone native module preview is the smallest inspectable boundary. This is an implementation choice under the supplied Phase 4 specification.

- [x] Add failing DOM tests for navigation, optional/type-checked fields, custom field lifecycle, instruction precedence, default-private policies, simulated consent, backup review and lock states.
- [x] Implement fixture state and five display pages with English/Arabic message catalogs, logical CSS and visible focus. No storage/network or privileged engine imports.
- [x] Add a development-only allowlisted loopback preview entrypoint, excluded from packed production files.
- [x] Run DOM and axe accessibility tests, full source and packaged checks, inspect desktop/mobile/RTL rendering.
- [x] Document future authenticated Host boundary and limitations. Commit, push new branch, open draft PR targeting Phase 3; inspect Windows/Linux Node 22/24 CI.

Review focus: empty overrides versus inheritance; missing versus false/zero values; invalid input atomicity; new fields/Profiles private even after allowing others; no backup/lock success claims. Test these in the DOM and state suite.
