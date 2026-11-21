# Plugin Suite update feasibility — DSH Desktop 0.2.2-rc.5

**Status: research / design only. Unattended updating has NOT been enabled.**

**Current built-in suite update behavior (as of development v1.0.0):** the Plugins detail page already checks *published stable GitHub Releases* at startup/every 24 hours and offers a user-confirmed **Update now** through DSH `pluginManager.updateBundle` for eligible full-SHA-pinned Git installs. This document's design-only status applies specifically to **unattended/independent updating**; it must not be read as claiming that the current manual update UI is absent. [Actual current flow](../DETAIL.md#installation-and-updates).

## User goal

The suite must remain one bundle with six separately toggleable components. Users should not need to manually uninstall and reinstall the bundle after each development release. Updates should come from a trusted, approved release channel, without adopting arbitrary commits from the active development branch.

## What upstream DSH currently supports

Sources:
- [DSH Plugin Manager](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/boot/plugin-manager/README.md)
- [Plugin Manager UI](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/client/ui-plugin-manager/README.md)
- [Update API](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/boot/plugin-manager/src/index.ts)

1. DSH distinguishes its own Desktop **application auto-update** from third-party bundle updates.
2. A profile-installed third-party package with a registry dependency can offer available versions and an explicit **Update** control; updating is not an unattended installation.
3. A Git-installed bundle pinned to a **full 40-character commit SHA** can be updated through `pluginManager.updateBundle(name, targetVersion, { spec: pinnedGitSpec })`, if its repository/path matches the installed source, the target declares the expected bundle and its manifest version is newer. Branch/tag installs do **not** qualify for the same safe Git update channel.
4. DSH's Plugin Manager UI normally surfaces Git update targets through a plugin index/Discover integration; a bare GitHub branch alone does not provide auto-discovery or auto-installation.
5. With HMR, DSH may remove/reinstall the bundle while preserving selection; a failure attempts restore from the former pinned source. Without HMR, replacement can require restarting the runtime. A failed restore can still leave the bundle unavailable.

**Therefore a suite-hosted feature cannot honestly claim the native Desktop auto-updater silently updates external Git plugins.**

## Safe unattended-update design (requires separate implementation and opt-in)

1. **Release channel:** release from an approved tested commit on `develop` (not arbitrary feature-branch HEAD), recorded as immutable full SHA and monotonically increasing `package.json.version`. Require all CI jobs successful.
2. **Publish an update manifest:** trusted HTTPS endpoint or GitHub Release with `packageName`, semver version, full SHA, source repo, compatible DSH version range, and expected artifact digest. Prefer signed provenance before auto-installation.
3. **Opt-in installer owned outside the bundle being replaced:** small independent updater/Host service checks manifest on startup and at a bounded interval. It cannot share its lifecycle with the package it may unload.
4. **Safety gate:** verify the source repo, pinned ref, strictly higher version, compatibility, matching installed profile/source, successful CI release attestations, available rollback source, and no concurrent update. Do not resolve a mutable branch during installation.
5. **Apply using supported DSH Plugin Manager API:** delegate to `pluginManager.updateBundle`, retaining the user's enabled component selection. Never edit DSH's profile manifest, lockfile or private Workspace database by hand.
6. **Recovery and status:** retain rollback metadata, report progress/failure and restart requirements in DSH; never restart during an active conversation without user control. Never retry in a tight loop.
7. **Testing:** separate Windows Desktop profile; success, network outage, SHA mismatch, downgrade, missing auth, incompatible DSH, rollback failure, active chats, partial install, and restart.

## Implementation decision for current Phase 2

- Relocate the Direct Chat action to the supported top `sidebar.session.action` slot now.
- Keep the bundle **disabled by default** for Direct Chat and the existing distribution process unchanged.
- Do not attempt a silent self-replacement from `client.js`, fetch arbitrary branch commits, or run package-management commands during chat startup. The current profile may have unsaved conversations and local extensions.
- Implement the separate trusted updater/release channel as a subsequent, explicitly tested development milestone. This is the route to the requested *no manual reinstall* experience; it is **not yet shipped**.

## Acceptance

Only label the feature **Automatic updates enabled** after a real Desktop test shows: a newer approved release is detected and applied via the supported Manager API, old conversations remain available, component settings persist, restart requirements are handled without data loss, and failed updates restore the previous version.
