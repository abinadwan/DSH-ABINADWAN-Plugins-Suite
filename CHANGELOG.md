# Changelog

All notable changes are documented here.

## [1.1.1] — development candidate (unreleased)

- **My Profile — phase 3.1:** improve saved response-preference wording and context handling, with synthetic request and local-model regression evidence; preserve explicit sharing and native Settings contracts. Model adherence remains sample-specific. [Integrated changes (PR #80)](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/pull/80).
- **Direct Chat — phase 3.2:** reduce inherited tool visibility where supported; retain execution-denial guards; use native Workspace membership, canonical paths and persistent hashed identity markers; reject conflicting catalog membership and stale Session actions; validate existing POSIX directories and redact preparation failures. Windows ACL inheritance, incomplete tool-definition hiding and unverified final local retest remain documented limitations. [PR #78](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/pull/78) · [PR #79](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/pull/79).
- **Archive Manager — phase 3.3:** validate bounded protection records, reject superseded catalog replies, disable mutations during refresh, require fresh native and ready local membership before restore, and reread saved protection before and after Direct Chat rename reference acquisition. Retain revision-checked writes and inert legacy fields. No native atomic protection boundary or deletion is introduced. [PR #82](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/pull/82), branch `fix/v1.1.1-archive-manager-security`.
- **Maintenance:** split browser sources into deterministic fragments, consolidate current documentation and expand regression coverage.
- Align source package, lockfile, generated client version and documentation at `1.1.1`. Archive Manager functional changes passed 8/8 CI checks at `b394466296f8576667635ba230ebc6b9c94cb89b`; version-alignment checks are pending on the subsequent commit. Local Desktop acceptance is not established. The latest published release remains v1.1.0; publishing v1.1.1 requires separate owner approval.

## [1.1.0] — release source (2026-11-25)

- Align package, lockfile and browser update metadata at `1.1.0`. Publication is a separate GitHub Release action; the owner approved the release scope on 2026-11-25.
- Rebrand Chat Control as **Archive Manager** and remove its Settings section and preview-only retention/cleanup controls (including the Direct Chat preview). Preserve the internal module ID and existing records. Manage plugin-scoped protection directly on the archive page; DSH owns its native sidebar visibility.
- Add a bilingual archive hub in the native sidebar and full main panel with authorized metadata search, filters and sorting. Confirmed restore uses the native DSH workspace command after live access and protection checks.
- Carry forward the Direct Chat metadata history and tool-denial hardening, My Profile replay/privacy guard improvements and v1.0.3 preset fix, and Adaptive Reasoning opt-in recommendations and Profile-local statistics from the develop integration.
- Owner reports the current Archive Manager works well and approves release; this does not establish exhaustive Desktop security verification. Native sidebar filtering is Host-owned; permanent deletion is unavailable.

## [1.0.3] — Released (2026-11-24)

- **My Profile hotfix:** Fix the preset instruction catalog mismatch that rejected all eight built-in behavior presets as unauthorized custom instructions, returning `INVALID_REQUEST` even in fresh chats. Recognize the same instruction element used by the renderer while preserving historical sharing revocation checks.
- Add source-level and pinned DSH Agent Loop regressions with synthetic profile fields for every preset, fresh and historical model requests, explicit field permissions, edited/revoked fields, custom-text consent and Windows/Unicode line endings.
- Align suite, lockfile, client update metadata and release documentation with the patch version. No new profile fields or data migration; this change does not guarantee a local model will follow injected instructions.

## [1.0.2] — Released (2026-11-23)

- Added keyboard arrow, Home and End navigation to My Profile tabs. Native Windows acceptance and owner-approved release-scope dispositions are recorded in [the final acceptance report](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/blob/98c27e87e216f11000ab92adcb79d51388031a28/docs/DSH_DESKTOP_NATIVE_FINAL_ACCEPTANCE_V1.0.2.md); historical native `FAIL`/`BLOCKED` evidence is retained.
- Localize the Direct Chat action and retry feedback and the Adaptive Reasoning recommendation dialog in Arabic. Keep keyboard focus on the Direct Chat action during preparation.
- Suppress Adaptive Reasoning acknowledgements from an earlier provider/model route or connection.

- Harden Direct Chat tool-denial against symlink/junction aliases into protected Workspaces, including aliases with a child folder that does not yet exist.
- Restrict newly created Direct Chat directories to owner-only permissions on POSIX; do not silently change permissions on existing folders or claim verified Windows ACL isolation.
- Prevent exception text and absolute Profile paths from leaking into Direct Chat Host error logs; mark successful and failed prepare API responses `Cache-Control: no-store`.
- Strengthen My Profile replay detection for CR, CRLF and Unicode newline separators; strip additional invisible formatting controls from explicitly shared field values.
- Add Direct Chat history alongside New Session with authorized metadata search, last-activity sorting, bounded creation-time sorting, paging, and native reopen and rename. Keep the native Workspace tree.
- Add Chat Control Workspace protection and individual retention eligibility with UTC previews. Direct Chat uses the same retention settings and preview.
- Add opt-in, explainable Adaptive Reasoning recommendations that preserve explicit Session effort, and versioned Profile-local aggregate statistics with reset.
- Reconcile [#33](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/pull/33) and [#34](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/pull/34) in the Direct Chat Host entry point. Prepare and read-only catalog discovery use the same canonical directory checks and retain separate routes. Combined Host tests cover ownership, route disposal, Session identity and tool denial.
- Destructive cleanup, request-only or subagent effort policies, and process/filesystem confinement remain unavailable. See the [handover](docs/architecture/development.md) for Desktop acceptance and release gates.

## [1.0.0] — Released (2026-11-22)

- Promoted the six-component suite through [PR #31](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/pull/31) into `main` and published [GitHub Release v1.0.0](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/releases/tag/v1.0.0). Package, lockfile and client-displayed version are **1.0.0**. Publication does **not** automatically update installed Desktop copies.
- Updated the root README and `docs/DETAIL.md` to describe all six active components and their known limitations. Added the missing three icon previews for Direct Chat, Chat Control and Adaptive Reasoning; updated artwork provenance.
- Audited all 43 previously present `docs/**/*.md` files; no unrelated files were found. Retained superseded project-specific design/acceptance evidence, added `docs/README.md` to distinguish current guidance from historical records, and corrected contradictory profile backup and Direct Chat acceptance wording.
- Version-dependent release-checker test fixtures now use a synthetic version greater than 1.0.0. CI still tests the packed artifact; no component runtime feature was added or enabled as part of the documentation pass.

- **Release caveat:** the 4/4 Windows/Linux Node 22/24 CI matrix passed, but Direct Chat deep Host request/tool authorization, filesystem isolation and My Profile multilingual live Desktop acceptance remain **deferred/not independently proven**. The release does not imply sandbox-level isolation or cleared security gates.

### Earlier development changes integrated into this release

- My Profile interface languages (2026-11-21): new v4 profiles default to **Follow DSH** (`auto`), subscribing to the DSH Locale service; users may override the plugin interface independently in English, Arabic, Chinese, Spanish, French, German or Japanese and Save. Existing saved `en`/`ar` are retained. Automatic and added locale modes export v4 backups to round-trip correctly; explicit English/Arabic still export compatible v2. Response language remains separate. Regression tests cover Host switching, manual overrides, seven locales, and export format.
- Settings navigation cleanup (2026-11-21): **Personal Profile → My Profile**, moving its editor from the main left sidebar to native **Settings** via `settings.section` and `settings.section.icon`; **Conversation Lifecycle → Chat Control** in Settings, its page heading and the plugin/component metadata. Stable Host module IDs, storage namespaces, existing saved records, access defaults, and enablement are unchanged. Export compatibility for newly added language modes is described above. Coverage: Settings visibility/disposal, metadata names, profile renderer and existing behavior. [Change record](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/blob/98c27e87e216f11000ab92adcb79d51388031a28/docs/SETTINGS_NAVIGATION_NAMES_2026_11_21.md).
- Direct Chat Phase 2 uses one persistent Workspace, native Sessions and Host tool-denial policy. Owner Windows functional acceptance was recorded; deep Host request security and filesystem isolation were deferred. Historical LPAC/AppContainer companion exploration is **not** shipped in this design.
- My Profile current development behavior: one My Information page with three independent Available to agent checkboxes, no Ask First or global/cloud switches; v4 native settings, compatible v2 exports for explicit English/Arabic and v4 exports for Follow DSH/other UI locales; legacy choices start private and imports review consent. Checked saved fields enter supported native agent prompts. Recognizable unauthorized replay remains gated. Desktop acceptance pending.
- Adaptive Reasoning keeps manual effort and a single Host. Temporary effort and unsupported subagent policies stay unavailable on Harness rc.3 and rc.5.
- See [development handover](docs/architecture/development.md) for the component matrix, verification and acceptance gates.

## [0.8.0-rc.1] — Candidate baseline, Windows functional review recorded (2026-11-18)

- Native response preferences in supported Harness Agent Loop steps; style, language, traits and behavioral presets read committed settings.
- Separate custom-text sending consent including cloud and history retention; edits, reset, migration and restore clear consent.
- Fail-closed structured personal-information exclusion across every policy combination and route. Positive disclosure remains blocked; no claim that old model history can be erased.
- Offline real Harness rc.3 integration tests, Windows/Linux Node 22/24 matrix and packaging checks.
- Version-dependent tests now derive expected UI versions from the manifest; source lockfile checks run before packaging and extracted-artifact checks remain independent of source-only files.
- Owner-reported Windows functional results and actual rollback to 0.7.2 recorded in [Phase 7 Desktop acceptance](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/blob/98c27e87e216f11000ab92adcb79d51388031a28/docs/PERSONAL_PROFILE_PHASE7_WINDOWS_ACCEPTANCE.md). Remaining checks, including actual outgoing-request evidence, are explicitly open.
- Phase 7D response-preference wording: the selected language is followed even when the user writes in another language (explicit requests still win), and Creative, Grill-Me and low-warmth instructions are stronger. The changes were benchmarked on local models with held-out checks. Code Reviewer and Humanizer are unchanged.
- No stable update offer until remaining acceptance gates are resolved and a stable release is explicitly approved.

## [0.7.2] — Released

Personal Profile redesign approved by the owner after Windows Desktop review of 0.7.1. Native Harness persistence and revision-checked writes are unchanged. Details: [0.7.2 change record](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/blob/98c27e87e216f11000ab92adcb79d51388031a28/docs/PERSONAL_PROFILE_V072_CHANGE_RECORD.md).

### Changed

- **Unified Personal Profile (record version 2).** One preference set and one field-policy set per active Harness Profile, designed to apply to all existing and future conversations. Removed the Workspace selector, instruction scope selector, per-Workspace overrides, inheritance controls and per-Workspace policies. The profile no longer injects or reads the Workspace service. No Workspace count restriction.
- **Unified access control.** One Private / Ask First / Allow policy each for preferred name, nationality and gender, plus the personal-information and cloud-sharing switches; defaults Private / Off. Disclosed as saved preferences until Phase 7 runtime enforcement.
- **Complete backup export.** Download JSON file, Copy JSON and View JSON. Exports include the saved policies and switches unchanged (0.7.0/0.7.1 exports dropped them) and warn that the file is not encrypted.
- **Import and restore.** Import a JSON file or paste JSON, review a current → proposed preview, confirm, apply to the draft, then Save. Exactly two strategies: **Replace All** and **Replace All and Merge Custom Instructions** (existing text kept, non-duplicate imported paragraphs appended, formatting kept, editable preview, never truncated). The general-purpose merge strategy was removed.
- **Optional permission restoration.** Unchecked by default; shows the exact permissions and needs a separate acknowledgment. Invalid or unsupported policies reject the backup. Restoring activates no disclosure.
- Update-migration text now says the backup includes saved access permissions and is not encrypted.

### Migration

- Settings saved by 0.7.0/0.7.1 (record version 1) remain readable: the Host schema accepts both versions, so stored data is never stripped. The page shows a migration review that keeps personal information, locale, global preferences and custom instructions, lists every Workspace-specific row, and offers download/copy/view of the complete 0.7.1 JSON. Discarding Workspace rows or resetting a sharing switch that was On requires explicit confirmation; nothing changes until a revision-checked Save. Workspace permissions are never promoted; unified policies start Private and both switches Off. 0.7.0/0.7.1 backups import their global settings.
- Limitation: 0.7.1 cannot read a version 2 record; rolling back after a Save requires restoring the configuration backup.

### Fixed

- The gender option "unspecified" is labelled **Prefer not to say**; it was indistinguishable from "not set".
- JSON is displayed left-to-right in a monospace font in both interface languages.
- Validation messages now state the reason (invalid JSON, unsupported version, invalid policy, instructions too long, unknown fields, file too large or unreadable).

### Tests

- Rewritten Personal Profile coverage for the unified schema, migration, complete export, file/paste import, both strategies, duplicate prevention, length limits, optional permission restore, malformed backups, cancellation, Workspace independence and accessibility. Desktop render regression retained. Coverage audit: change record §13. 150 tests (130 in 0.7.1).

## [0.7.1] — Unreleased (candidate)

Bug-fix release for Windows Desktop compatibility. No feature, storage, privacy-default or permission change.

### Fixed

- **Personal Profile showed a blank content area on Harness Desktop v0.2.2-rc.3 (Phase 6E).** `ctx.workspaces.list` is the Host's `ClientWorkspaceModel` class instance, and its `subscribe`/`getSnapshot` methods read `this`. The page passed them unbound to `React.useSyncExternalStore`, so the first render threw `TypeError: Cannot read properties of undefined (reading 'refreshSnapshot')`. The Host Slot boundary then retired the `main` entry and left an empty `data-slot-error` anchor. The plugin now binds both methods through wrappers, as Environment & Context already does.
- A Personal Profile render failure now shows a visible bilingual error with a Retry button instead of a blank page. Nothing is saved or changed. A missing access hook, denied access or an unavailable settings service still show the existing "unavailable" status with Save disabled.

### Tests

- The test harness now models `ctx.workspaces.list` as a class with `this`-bound methods, like the rc.3 Host, instead of a closure-based object that hid the bug.
- New `test/personal-profile-desktop-render.test.js` renders the page inside a Host-style Slot error boundary. It covers the original failure, workspace updates, missing or denied access, unavailable settings and a broken workspace source.

## [0.7.0] — Unreleased (candidate)

### Changed

- **Personal Profile now persists locally through the native Harness Settings service.** The browser page reads `settings.describe()` and writes the whole record with `settings.replace(namespace, section, expectedRevision)`. Save is reported only after Harness confirms the committed value; refusals, revision conflicts and malformed answers are shown as such and keep the draft. Settings belong to the active Harness Profile; per-Workspace overrides use Host Workspace IDs.
- Reduced the stored information to optional preferred name, nationality and gender. Full name, date of birth and custom personal fields were removed. Response preferences, custom instructions and the effective preview remain.
- Manual local JSON backup and reviewed restore (merge or explicit replacement). Exports contain no active grants; imports reset every field policy to Private and both sharing switches to Off, and are applied only to the draft until Save.
- The Personal Profile Host entry moved from the suite Group to a direct, settings-owned Include entry with the same id (`abinadwan-personal-profile`), still disabled by default. Existing enablement overrides keep applying. Disabling only the suite Group no longer disables Personal Profile; the bundle selection still governs every row.
- Runtime dependency `@noble/hashes` replaced by `@deepseek-ai/schemastery` 3.19.0 (the version Harness rc.3 vendors), used only for the settings schema.
- The packaged docs now include only active documentation; superseded design documents and prototype screenshots remain in the repository.
- Corrected the update-migration text: Personal Profile settings may be removed by uninstalling, so it asks you to copy a JSON backup first.

### Removed

- The superseded encrypted storage, key management, simulated lock, consent ledger, Host-identity diagnostic and integration-gate prototypes (Phases 1–6B), with their tests. They are kept in Git history and PR #15, not runtime. See the removed-test audit in `docs/PERSONAL_PROFILE_LOCAL_SETTINGS.md`.

### Security and privacy

- No plugin-level encryption: settings and backups are readable by anyone with access to the Profile configuration or the backup text. Saved access policies and sharing switches are not enforced controls; no agent injection, model disclosure or network transmission path exists.

### Fixed during Phase 6D QA

- Outdated render test expecting the former "design draft" text.
- An invalid backup review could clear a conflict/failed state and re-enable Save before reload (the Host revision check still prevented an overwrite).

### Hardening

- Removed the hard-coded 64-Workspace limit from the schema, decoder, editing and backup merge. Edits beyond 64 Workspaces were silently ignored before. Only Workspaces that differ from the inherited/Private defaults are stored. A single 3,000,000-character payload guard for the whole record remains and reports an explicit error.
- **Reload** now asks for confirmation (Arabic and English) when the draft has unsaved changes or the last save failed or conflicted; cancelling keeps the whole draft. A connection reset no longer silently replaces a dirty draft by re-reading.

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
- Preserved the working Environment & Context sidebar implementation.
- The root bundle still has one running component. No Personal Profile storage exists.

## Previous Environment & Context development (legacy package)

Versions `0.1.0`–`0.3.1` developed the right-sidebar inspector, package artwork, MIT licensing and a manual plugin-detail update-check control under the former `@abinadwan/environment-sidebar` identity. Git history is preserved in this renamed repository.
