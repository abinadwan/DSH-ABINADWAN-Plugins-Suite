# Security policy

Experimental community plugin.

## Reporting issues

Use GitHub Issues for non-sensitive bugs. Keep credentials, personal data and unredacted session logs out of public issues. For vulnerabilities, contact the repository owner through GitHub to arrange a private reporting channel. [Issues](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/issues)

## Current data handling

**Environment & Context** reads UI-facing session/workspace summaries and projected token usage. It registers zero shell, filesystem or credential tools. The suite browser carrier reads the access-checked Host plugin inventory to follow Component enablement and subscribes to lifecycle events. When inventory is unavailable, Component UI pauses until a successful refresh.

**Humanizer** registers a local, original instruction body in DSH's runtime Skill registry. Its instructions operate on authorized text within the agent's existing context. Text sent to the agent follows the configured model/provider's normal handling. The plugin adds zero dedicated rewriting endpoints or background rewriting requests. Disabling withdraws future Skill discovery and loading. Already loaded instructions remain in the conversation's model context.

**Personal Profile** is disabled by default. When enabled, it stores optional preferred name, nationality, gender, response preferences, custom instructions, per-Workspace overrides and saved access preferences through the native Harness Settings service (`settings.describe`/`settings.replace` with an expected revision), in the active Harness Profile's configuration. **This plugin does not encrypt these settings or JSON backups**; anyone with access to the Profile configuration files, or to a copied backup, can read them. The storage boundary is the OS account, file permissions and any disk encryption already in place. Do not enter passwords, keys, health, financial or other sensitive information.

Personal Profile registers no model tool, instruction injection, skill invocation or network path. Nothing in it is supplied to the agent or to a model provider. The Private / Ask First / Allow field policies and the personal-information and cloud-sharing switches are **saved preferences only, not enforced controls**: no enforcement path exists because no disclosure path exists. Backups are shown as text for manual copying; they never contain active grants, and importing one resets every field policy to Private and both switches to Off before a separate explicit Save.

The suite automatically checks the public **latest stable GitHub Release** when its browser module starts and every 24 hours while active; the user may also click **Check again**. These read-only requests omit credentials and referrers and send zero conversation or profile data. No automatic install, shell execution, Host activation, or update attempt occurs during checks.

For **Update now**, the user must explicitly confirm. The browser verifies the release tag's commit SHA and package identity/version, then delegates installation to DSH's native Host updater, which requires an existing Git dependency pinned to a 40-character SHA. Host dependency resolution, compatibility, rollback attempts and restart reporting apply. A failed update may require manual recovery; the suite never claims guaranteed rollback. Unpinned Git installations are not silently migrated.

This policy describes the current implementation. DSH, the configured model provider and other plugins have their own data handling.
