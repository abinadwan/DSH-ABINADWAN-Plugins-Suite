# Changelog

All notable changes are documented here.

## [0.6.3] — Unreleased

### Changed

- Personal Profile: redesigned the browser-only Agent Instructions preview with eight personalities, Automatic plus seven response languages, six independent three-level traits, eight optional behavior presets, custom instructions and an effective preview. No dedicated dialect selector; localization and response language are independent. Global/environment replacement inheritance remains explicit, defaults neutral, and settings reset per scope.
- Fixed select/option colors across the Personal Profile preview using theme-aware system colors and inherited color scheme. Added DOM interaction regression tests. Real Windows native menu contrast remains a manual acceptance item.
- No persistent saving, real personal-data collection, agent instruction injection, permission changes, new dependencies or production storage activation. The Host Personal Profile remains inert and off by default.

## [0.6.2] — Unreleased

### Fixed

- **Update checker missing from the Plugins detail page.** The browser half read `ctx.remote.pluginManager` without injecting `remote.pluginManager`. Each Harness Remote namespace is its own Cordis service, and Cordis 4 throws `cannot get property "remote.pluginManager" without inject`; the Slot renderer then abdicated the crashed `plugins.detail.section` entry, so nothing was shown. The root plugin now injects `remote.pluginManager`.
- **Environment & Context never started.** The same missing inject, plus treating Remote answers as bare arrays: every Harness Remote method resolves to `RemoteResult` (`{ ok, value }`). The component inventory therefore always read as empty, and the Environment browser fiber, its tab type, tab body and header button were never registered. Inventory, bundle listing and update answers are now unwrapped and validated.
- **Personal Profile visible while Off.** The left-sidebar launcher and full-page preview were registered by the suite root, independently of the component switch. They now live in the Personal Profile browser fiber with the detail-page draft, so all three are registered only while the component is On and are removed when it is switched Off.
- The Environment tab uses the Session-scoped `useProjection` hook the tab seat supplies, so context and token figures follow new model responses, with the Session list projection as fallback and explicit loading/unavailable text.

### Changed

- Update section renamed **Suite updates (GitHub Releases)** and now shows the Host-reported version, the running browser-module version (with a mismatch warning), the latest stable release, the last check and the Host's update method for this installation.
- Unpinned Git installations get a step-by-step migration explanation with the verified pinned spec; nothing is uninstalled or replaced automatically. Updates of pinned installations reuse the installed repository location, require `pluginManager/updateBundle` access, and report Host refusals, failures and rollbacks instead of success.
- Offline, unreachable, rate-limited and unreadable GitHub responses are reported explicitly.
- The test harness now models the Harness v0.2.2-rc.3 contracts (Remote namespaces as fiber-provided services, `RemoteResult`, list-entry abdication) instead of plain-object doubles.

## [0.6.1] — 2026-11-16

### Fixed

- Corrected the right-sidebar Environment & Context tab body registration to match the tab type's full identity; fixes the Harness message "Nothing here can view this kind of content yet."
- Corrected Session-scoped Context and Outputs data binding: read the documented session-controller projection snapshot instead of expecting an unavailable conversation-only `useProjection` prop.
- Added tab-contract and two-Session regression coverage for the real Harness integration boundary. All profile data remains unaffected.

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
