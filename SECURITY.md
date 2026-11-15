# Security policy

Experimental community plugin.

## Reporting issues

Use GitHub Issues for non-sensitive bugs. Keep credentials, personal data and unredacted session logs out of public issues. For vulnerabilities, contact the repository owner through GitHub to arrange a private reporting channel. [Issues](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/issues)

## Current data handling

**Environment & Context** reads UI-facing session/workspace summaries and projected token usage. It registers zero shell, filesystem or credential tools. The suite browser carrier reads the access-checked Host plugin inventory to follow Component enablement and subscribes to lifecycle events. When inventory is unavailable, Component UI pauses until a successful refresh.

**Humanizer** registers a local, original instruction body in DSH's runtime Skill registry. Its instructions operate on authorized text within the agent's existing context. Text sent to the agent follows the configured model/provider's normal handling. The plugin adds zero dedicated rewriting endpoints or background rewriting requests. Disabling withdraws future Skill discovery and loading. Already loaded instructions remain in the conversation's model context.

**Personal Profile** is a disabled-by-default static design draft. The source accepts, persists, retrieves, injects and transmits zero profile records. No profile configuration schema or editable form exists. The ordinary DSH Component toggle stores only enablement. Storage, privacy and consent design requires approval before implementation.

The manual **Check for updates** button requests public GitHub `main/package.json` only after a click. It omits credentials and referrers and sends zero conversation or profile data. Users initiate installation through DSH.

This policy describes the current implementation. DSH, the configured model provider and other plugins have their own data handling.
