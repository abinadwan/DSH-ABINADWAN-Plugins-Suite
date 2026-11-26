# Contributing

Keep changes scoped to the affected Component and preserve its independently controlled lifecycle.

## Extension contracts

Use documented DSH APIs. Preserve the package-root Group carrier, per-subpath metadata and the six independently controlled component switches. Follow Host inventory for browser Component activation. Report unavailable data accurately. Keep secrets and personal records out of examples, logs and screenshots.

Personal Profile persists its approved fields only through the native Harness Settings service with an expected revision. Do not add custom encryption, separate storage, browser storage, additional personal fields, network transmission, agent instruction injection or data retrieval without the owner's approval. Keep one unified profile (no Workspace-specific settings), every field optional, sharing permissions private by default, restore of permissions opt-in only, and use fictional data in tests. Schema changes need a versioned, tested migration that never silently discards data or promotes permissions; update the current contract and regression tests. See [the local settings design](docs/plugins/my-profile.md).

Humanizer instructions are original MIT-licensed content. Preserve factual fidelity, source attribution and privacy boundaries. Retain applicable licenses for any future third-party reuse.

## Development

```sh
npm ci --ignore-scripts
npm test
npm run check:regression
npm run check:package
```

The package ships JavaScript directly. CI exercises Windows/Linux on Node 22/24, real Cordis/DSH service integration, browser lifecycle fixtures, React rendering and the extracted npm artifact. Record the DSH version and profile for any additional Desktop verification.

## Versioned branches and change records

Every new work branch must include its assigned SemVer target, for example `fix/v1.1.1-archive-manager-security`. Use the next available version appropriate to the scope (patch for fixes, minor for backward-compatible features, major for incompatible changes). Coordinate parallel branches against the same planned release version rather than assigning conflicting versions; do not reuse a published version for changed release content.

At branch creation, record its version, scope and baseline in the PR or change record. Before review/merge, align `package.json`, root package version entries in `package-lock.json`, `client-src/update.js.inc`, the generated `client.js` and current-source documentation. Run `npm run build:client` or regenerate the matching carrier and verify it with `npm run check:client`. Record the implemented improvements, tests and limitations under the corresponding version in `CHANGELOG.md`; link the branch/PR and retain verification evidence in `docs/IMPROVEMENTS.md` when appropriate. Documentation-only changes may use the current planned version without an artificial package bump. Keep published-release badges and install links tied to actual releases. A branch, version bump or merge does not authorize a new tag or GitHub Release.

## Licensing

Contributions use the project's MIT License unless explicitly agreed otherwise. [License](LICENSE)

## Documentation scope

Document implemented behavior, actual dependencies, current architecture and known limitations. Keep speculative designs, abandoned experiments, historical phase reports and future roadmaps out of the repository. Maintain one authoritative reference for each contract.
