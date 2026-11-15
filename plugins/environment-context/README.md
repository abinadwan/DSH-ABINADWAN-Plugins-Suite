# Environment & Context

**Status:** Available · suite version **0.4.0**

This is the **only running plugin** inside ABINADWAN Plugins Suite today.

## Features

The plugin renders a read-only **right-hand sidebar** in active Harness conversation sessions. It displays:

- **Environment:** browser platform and workspace association, when available.
- **Context:** reported token usage, context-window occupancy and estimated message/tool/system breakdown.
- **Outputs:** model output token total and last recorded session activity.
- **Connectors:** explicitly unavailable until an authorized inventory API is integrated.
- **Changes:** explicitly unavailable until an authorized workspace/Git provider is integrated.

The inspector is not an exact reproduction of Claude Code's internal accounting. Estimated categories should not be treated as billing totals.

## Updates

Use the **ABINADWAN Plugins Suite** detail page under Plugins to select **Check for updates**. That control is separate from the session sidebar and checks the suite version on GitHub only when requested.

## Testing

The implemented right-sidebar registration, module identity and update-check behavior are covered by `npm test`. Real Desktop behavior depends on the running Harness version and profile.

![Workspace inspector screenshot](../../docs/assets/environment-project.webp)

[Back to suite overview](../../README.md)
