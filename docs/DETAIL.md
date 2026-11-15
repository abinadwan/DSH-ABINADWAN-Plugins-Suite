# Environment & context

A read-only session inspector for **DeepSeek Harness**. Open it from the conversation header or the right sidebar's page picker.

## Available in v0.3.0

- **Environment** — the current workspace association and browser platform.
- **Context** — model-reported context occupancy plus estimated messages, tool-schema and system-prompt breakdowns.
- **Outputs** — cumulative output tokens and the session's most recent activity.
- **Connectors and Changes** — honest unavailability notices until suitable, permission-checked sources are integrated.

**Not included:** full Claude Code context categories, connector/account enumeration, file change details, or Git actions.

## Updates

The **Versions & updates** section provides a manual **Check for updates** button. It compares this installed version with the public `main/package.json` in the GitHub repository. This check contacts GitHub only after you click; it never installs updates or reads session data.

## Get started

Install from the GitHub repository in the `desktop` profile:

```powershell
dsh plugin --profile desktop add github:abinadwan/deepseek-harness-environment-sidebar
```

Restart the app and open a normal conversation session. Confirm the component is **Running** in Plugins. If nothing appears, check that the active profile is `desktop`, then inspect the browser Console and Client boot diagnostics.

The package is experimental. CI verifies its manifests and registrations; a production Desktop end-to-end compatibility check has not been completed.

[Full README](https://github.com/abinadwan/deepseek-harness-environment-sidebar) · [Open an issue](https://github.com/abinadwan/deepseek-harness-environment-sidebar/issues)

Community project; not affiliated with or endorsed by DeepSeek or Anthropic.
