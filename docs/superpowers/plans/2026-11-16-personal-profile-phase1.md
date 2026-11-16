# Personal Profile Phase 1 implementation plan

Goal: implement the user's Phase 1 specification only, on a new branch from main.
Architecture: internal ESM modules for schemas, model, policies, evaluation and retrieval;
no Host integration or new package exports. Use Maps and copied validated inputs.
Tech stack: existing Node.js ESM and node:test; no dependencies.

1. Write synthetic core tests for optional fields, definitions, scalar types, dates,
   gender, object-property attacks, inert instructions, and opt-in validation.
2. Watch tests fail, then implement schemas and the in-memory master model.
3. Write permission/retrieval tests for every state, environment isolation,
   revocation, malformed policies, opt-in and single-field disclosure.
4. Watch tests fail, implement policy management and safe retrieval; run suite.
5. Document model contracts, trusted caller boundary, Phase 2 consent and limitations.
6. Run npm test and npm run check:package; review diff and existing CI matrix.
7. Commit, push new branch without force, open Draft PR targeting main, report CI.

Review focus: accessors/inherited properties; input/output aliasing; malformed maps;
reserved metadata identifiers; missing values and unknown environment identifiers.
The Host remains unchanged, read-only and disabled. main, security PR #2,
Humanizer, Environment & Context, license and dependency lock remain unchanged.

## Completion evidence

Steps 1–6 complete. Independent review found accessor array elements/custom
iterators and inherited/accessor model metadata were insufficiently rejected.
Both were reproduced by failing tests and fixed; 16 new core tests now pass.
`npm test`: 43 passed. `npm run check:package`: 43 passed against the extracted
39-file package. No package file-list or exports update was required. The existing
Windows/Linux and Node 22/24 workflow is unchanged. Delivery uses a single feature
commit and a Draft PR; no merge, release or deployment is authorized.
