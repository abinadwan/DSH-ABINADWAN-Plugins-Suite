# Contributing

Keep changes scoped to the affected Component and preserve its independently controlled lifecycle.

## Extension contracts

Use documented DSH APIs. Preserve the package-root Group carrier, per-subpath metadata and the three Component switches. Follow Host inventory for browser Component activation. Report unavailable data accurately. Keep secrets and personal records out of examples, logs and screenshots.

Personal Profile persists its approved fields only through the native Harness Settings service with an expected revision. Do not add custom encryption, separate storage, browser storage, additional personal fields, network transmission, agent instruction injection or data retrieval without the owner's approval. Keep one unified profile (no Workspace-specific settings), every field optional, policies Private and both sharing switches Off by default, restore of permissions opt-in only, and use fictional data in tests. Schema changes need a versioned, tested migration that never silently discards data or promotes permissions; record coverage changes in the change record. See [the 0.7.2 change record](docs/PERSONAL_PROFILE_V072_CHANGE_RECORD.md). See [the local settings design](docs/PERSONAL_PROFILE_LOCAL_SETTINGS.md).

Humanizer instructions are original MIT-licensed content. Preserve factual fidelity, source attribution and privacy boundaries. Retain applicable licenses for any future third-party reuse.

## Development

```sh
npm ci --ignore-scripts
npm test
npm run check:package
```

The package ships JavaScript directly. CI exercises Windows/Linux on Node 22/24, real Cordis/DSH service integration, browser lifecycle fixtures, React rendering and the extracted npm artifact. Record the DSH version and profile for any additional Desktop verification.

## Licensing

Contributions use the project's MIT License unless explicitly agreed otherwise. [License](LICENSE)
