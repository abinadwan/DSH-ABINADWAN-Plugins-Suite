# Security policy

Experimental community plugin.

## Reporting issues

Use GitHub Issues for non-sensitive bugs. Keep credentials, personal data and unredacted session logs out of public issues. For vulnerabilities, contact the repository owner through GitHub to arrange a private reporting channel. [Issues](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/issues)

## Current data handling

**Environment & Context** reads UI-facing session/workspace summaries and projected token usage. It registers zero shell, filesystem or credential tools. The suite browser carrier reads the access-checked Host plugin inventory to follow Component enablement and subscribes to lifecycle events. When inventory is unavailable, Component UI pauses until a successful refresh.

**Humanizer** registers a local, original instruction body in DSH's runtime Skill registry. Its instructions operate on authorized text within the agent's existing context. Text sent to the agent follows the configured model/provider's normal handling. The Skill itself adds zero dedicated rewriting endpoints or background rewriting requests. The unreleased v1.2.0 Studio candidate uses native owner-only processing and optional profile-local storage routes; processing does not persist text. Explicit save/load operations may store plaintext source/result/brief and selected route in the active Host Profile. No browser persistence is used. Clear removes logical content, not backups, provider copies or filesystem remnants. POSIX owner-only file modes and non-group/world-writable Profile directory ownership are checked; Windows inherits filesystem ACLs. The storage fiber checks canonical directory identity across explicit operations, not a filesystem sandbox. Host middleware and providers may observe inputs; no universal retention guarantee. The stable release does not include Studio. Disabling withdraws future Skill discovery and loading. Already loaded instructions remain in the conversation's model context.

**My Profile (internal Personal Profile module)** is disabled by default. It stores one native settings record in the active Harness Profile, with revision-checked writes. The browser hides cached values after read access is lost and clears drafts across connection resets. **Settings and JSON backups are not encrypted by this plugin.** Do not enter passwords, keys or sensitive information.

Version 5 makes all populated saved personal information, preferences and custom instructions available to supported top-level native conversations with local or cloud models. Earlier records keep their former scope until reviewed migration and Save. The official DSH dynamic context registry supplies personal details when available; response instructions use a native system-prompt section. Older registries use a single combined system section. No separate model call or transport is added. Changes update the current context, but do not erase old snapshots, logs, summaries, provider copies or derived content. Earlier history is not blocked or rewritten. Backup import is reviewed before Save and does not reinstate obsolete sharing controls.

The suite automatically checks the public **latest stable GitHub Release** when its browser module starts and every 24 hours while active; the user may also click **Check again**. These read-only requests omit credentials and referrers and send zero conversation or profile data. No automatic install, shell execution, Host activation, or update attempt occurs during checks.

For **Update now**, the user must explicitly confirm. The candidate browser verifies the release tag's commit SHA and package identity/version, rejects redirects, fences confirmation across Host connection changes and rechecks release/installed identity and live permissions before dispatch. It then delegates installation to DSH's native Host updater, which requires an existing Git dependency pinned to a 40-character SHA. Host dependency resolution, compatibility, rollback attempts and restart reporting apply. A failed update may require manual recovery; the suite never claims guaranteed rollback. Unpinned Git installations are not silently migrated.

## Direct Chat

The hardening on `develop` strengthens Direct Chat's tool-denial predicate for filesystem symlinks, Windows junctions and not-yet-created child paths under the protected Workspace. It also restricts newly created POSIX Direct Chat directories to owner-only permissions, suppresses sensitive filesystem paths from error logs and marks prepare responses `no-store`. [Reproduction and scope](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/blob/98c27e87e216f11000ab92adcb79d51388031a28/docs/research/SECURITY_CODE_AUDIT_2026_11_22.md).

Direct Chat prepare and catalog use the same canonical directory checks. DSH's exact Fetch-route dispatcher restricts both routes to owner Peers in the pinned offline Host tests. Prepare can return the Profile-local path to the authorized owner. Catalog discovery returns only the registered Workspace ID and bounded creation metadata, with no message bodies or directory creation. Installed Desktop and remote connection authorization still require testing.

The changes are pending a separate release. Direct Chat shares one Workspace filesystem directory. Path checks and tool-denial hooks are policy controls, with outstanding Desktop validation for alternate tool routes, Windows ACLs and junctions, and time-of-check/time-of-use behavior. My Profile Desktop and live-model verification remain separate from offline adapter tests. The suite has no filesystem or process sandbox.

This policy describes the current implementation. DSH, the configured model provider and other plugins have their own data handling.
