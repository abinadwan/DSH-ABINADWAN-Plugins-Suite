# Security policy

Experimental community plugin.

## Reporting issues

Use GitHub Issues for non-sensitive bugs. Keep credentials, personal data and unredacted session logs out of public issues. For vulnerabilities, contact the repository owner through GitHub to arrange a private reporting channel. [Issues](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/issues)

## Current data handling

**Environment & Context** reads UI-facing session/workspace summaries and projected token usage. It registers zero shell, filesystem or credential tools. The suite browser carrier reads the access-checked Host plugin inventory to follow Component enablement and subscribes to lifecycle events. When inventory is unavailable, Component UI pauses until a successful refresh.

**Humanizer** registers a local, original instruction body in DSH's runtime Skill registry. Its instructions operate on authorized text within the agent's existing context. Text sent to the agent follows the configured model/provider's normal handling. The plugin adds zero dedicated rewriting endpoints or background rewriting requests. Disabling withdraws future Skill discovery and loading. Already loaded instructions remain in the conversation's model context.

**Personal Profile** is disabled by default; the browser preview edits fictional values in memory only. The simplified design permits optional preferred name, nationality, gender and structured behavior preferences. The internal local store and backup format are deliberately unencrypted plain JSON; avoid secrets or sensitive information, including in custom instructions. The store is not wired to the Host or browser. The decision helper defaults to denial, requires explicit master opt-in and field policy, and requires extra permission for external destinations; this is not yet live enforcement. The Host remains inert; no personal data is sent to models by this component. Actual Host identity, filesystem ACLs, consent and destination enforcement still need acceptance. Data typed into chats or instructions can be sent under the provider's normal behavior.

The suite automatically checks the public **latest stable GitHub Release** when its browser module starts and every 24 hours while active; the user may also click **Check again**. These read-only requests omit credentials and referrers and send zero conversation or profile data. No automatic install, shell execution, Host activation, or update attempt occurs during checks.

For **Update now**, the user must explicitly confirm. The browser verifies the release tag's commit SHA and package identity/version, then delegates installation to DSH's native Host updater, which requires an existing Git dependency pinned to a 40-character SHA. Host dependency resolution, compatibility, rollback attempts and restart reporting apply. A failed update may require manual recovery; the suite never claims guaranteed rollback. Unpinned Git installations are not silently migrated.

This policy describes the current implementation. DSH, the configured model provider and other plugins have their own data handling.
