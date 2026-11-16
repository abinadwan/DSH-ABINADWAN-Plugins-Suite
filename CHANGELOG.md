# Changelog

All notable changes are documented here.

## [0.6.0] — 2026-11-16

### Added

- Native left-sidebar **Personal Profile** navigation entry opening a full-page, in-memory preview with five navigable sections and Arabic/English labels.
- Synthetic-only information, instruction, permission, backup-review and privacy-control demonstrations. No real storage, Host access or model injection.

### Changed

- Package and lockfile version updated to **0.6.0**; user-facing documentation and updater report the installed manifest version.
- Read-only automatic checks for **published stable GitHub Releases** at launch and every 24 hours, plus manual recheck.
- Explicit **Update now → Confirm update** flow using the native DSH Host updater only for SHA-pinned Git bundles, with release-SHA and manifest-identity validation. No silent install or automatic migration of branch-based dependencies.
- Personal Profile Host component continues disabled and inert. The browser preview is deliberately separate from production activation.

## [0.5.0] — 2026-11-16

### Added

- Three separately toggleable Host subpath Components with individual English/Arabic metadata and approved transparent PNG icons.
- A package-root Group carrier to retain the suite avatar and suite-wide version controls while DSH lists exactly three Component rows.
- Original MIT-licensed Humanizer runtime Skill, advertised and loaded through DSH's existing Skill registry, with lifetime-bound removal on disable.
- Disabled-by-default Personal Profile scaffold and read-only preliminary field draft. Privacy/storage design and personal-data runtime behavior await approval.
- Actual Cordis Loader, DSH metadata and Skill-registry integration tests, browser lifecycle/race tests, real React rendering and packed-artifact verification.
- Locked test dependencies and Windows/Linux CI on Node 22/24.

### Changed

- Environment browser UI follows its Host Component's effective enablement and active phase, with complete teardown and stale-response protection.
- Suite artwork uses the supplied Saudi developer with laptop. Component artwork uses the teal monitor, purple feather and amber ID/gear.
- Updated per-plugin usage, installation, privacy, licensing and implementation-status documentation.

## [0.4.0] — 2026-11-16

### Changed
- Renamed the package identity to `@abinadwan/dsh-plugins-suite` under the renamed GitHub repository.
- Adopted the **ABINADWAN Plugins Suite** name and approved Saudi developer avatar (#4) as package artwork.
- Updated package metadata, public GitHub URLs, installation instructions and in-app manual version-check endpoint.
- Reorganized documentation by plugin: Environment & Context (available), Humanizer (planned), Personal Profile (design pending).
- Preserved the working Environment & Context sidebar implementation; planned modules do not run.
- The root bundle still has one running component. No Personal Profile storage exists.

## Previous Environment & Context development (legacy package)

Versions `0.1.0`–`0.3.1` developed the right-sidebar inspector, package artwork, MIT licensing and a manual plugin-detail update-check control under the former `@abinadwan/environment-sidebar` identity. Git history is preserved in this renamed repository.
