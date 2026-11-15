# Environment & Context — DeepSeek Harness sidebar

**v0.2.0** switches the extension from the incorrect global left-navigation page to a native **right-sidebar tab**, following the public DeepSeek Harness [Right Sidebar API](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/sidebar-right.md).

The inspector opens once per foreground Session and adds an Environment button in the conversation header and a guide entry in the right-sidebar Add menu. Sections are collapsible: **Environment, Context, Connectors, Outputs, Changes**.

**Live data:** workspace names (from DSH's workspace controller), Session status, actual `contextPressure` projected/pressure tokens and context capacity, heuristic `contextBreakdown` for messages/tool schemas/system prompt, total model output tokens and last Session activity.

**Not yet exposed:** exact Claude Code MCP/skills/custom-agent context categories, connected account inventory, produced file list, full Git status and PR links. These sections clearly state their limitations rather than claim fake data. No code was copied from Claude Code; the grouping is only a design reference.

## Upgrade on Windows (PowerShell)
```powershell
dsh plugin --profile desktop remove @abinadwan/environment-sidebar
dsh plugin --profile desktop add github:abinadwan/deepseek-harness-environment-sidebar
dsh --profile desktop --dump-config
```

Then fully restart Desktop **using the same profile**, enter a normal conversation Session, and look for the Environment tab on the **right**, not the main Plugins page. The components should show **Running**. If you also installed `@yourname/environment-sidebar`, remove that obsolete package separately.

For a pinned GitHub revision, add `#<COMMIT_SHA>` to the installation reference.

The package includes prebuilt `index.js` and `client.js`, so no build or prepare script is required. Test the source with `npm test`; these Node smoke tests do not prove the UI is working on your installed Desktop version.

If installed but missing: confirm the running profile, enabled component, and Client boot audit; check for `client.js` 404 errors in Developer Tools. DeepSeek Harness Desktop can have version-specific Client plugin loading bugs unrelated to this source.

Sources: [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), [Client Modules](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/client-modules.md), [Token Meter](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/token-meter.md). Independent read-only implementation: no shell, filesystem or remote-network access.
