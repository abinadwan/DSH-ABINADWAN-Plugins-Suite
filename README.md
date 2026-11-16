<p align="center">
  <img src="icon.png" alt="ABINADWAN Plugins Suite — Saudi developer avatar" width="112" height="112" />
</p>

<h1 align="center">ABINADWAN Plugins Suite</h1>

<p align="center">A modular, open-source toolkit for <a href="https://github.com/deepseek-ai/deepseek-harness">DeepSeek Harness</a>.</p>

<p align="center">
  <a href="https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/actions/workflows/test.yml"><img alt="CI" src="https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/actions/workflows/test.yml/badge.svg"/></a>
  <img alt="Suite 0.6.0" src="https://img.shields.io/badge/suite-0.6.0-7b2246"/>
  <a href="LICENSE"><img alt="MIT" src="https://img.shields.io/badge/license-MIT-22c55e"/></a>
</p>

## Overview

One installation supplies three independently toggleable DSH Components. The package card uses the approved Saudi developer avatar. Each Component resolves its own title and transparent icon.

| Component | Delivered in 0.6.0 | Default | Documentation |
| --- | --- | --- | --- |
| <img src="plugins/environment-context/icon.png" width="32" alt="Teal monitor"/> **Environment & Context** | Read-only session inspector | On | [Plugin details](plugins/environment-context/README.md) |
| <img src="plugins/humanizer/icon.png" width="32" alt="Purple feather"/> **Humanizer** | Runtime writing Skill | On | [Usage and scope](plugins/humanizer/README.md) |
| <img src="plugins/personal-profile/icon.png" width="32" alt="Amber ID and gear"/> **Personal Profile** | Synthetic left-sidebar preview (no saving) | Host Off | [Preliminary fields and pending design](plugins/personal-profile/README.md) |

## Personal Profile (0.6.0 preview)

A dedicated **Personal Profile** entry in the **left sidebar** opens a full-page five-section preview: My Information, Agent Instructions, Access Control, Backup & Restore, and Privacy & Security. The page supports Arabic/English labels and editable **fictional values held only in browser memory**. It does not persist, encrypt, export, load real account data or provide any agent permissions.

**Do not enter real personal information.** The Host Personal Profile component remains disabled by default and `apply() {}` still registers no backend services. The sidebar demo is visible with the suite's browser bundle even while the Host component is disabled. It is not a working production profile.

## Environment & Context

The native right-side session inspector opens once when a session becomes visible and can be reopened from the conversation header.

- **Environment** displays browser platform and associated workspaces.
- **Context** displays reported context pressure, estimated message/tool/system-token categories and free capacity.
- **Outputs** displays reported output tokens and latest session activity.
- **Connectors & Changes** display availability notices for integrations awaiting an authorized provider.

The categories are estimates. Use provider billing records for billing totals.

<p align="center">
  <a href="docs/assets/environment-project.webp"><img src="docs/assets/environment-project.webp" alt="Environment & Context session sidebar with a workspace" width="240"/></a>
  <a href="docs/assets/environment-session.webp"><img src="docs/assets/environment-session.webp" alt="Environment & Context context usage" width="240"/></a>
</p>

These existing screenshots illustrate the inspector. Component artwork is shown in the table above.

## Humanizer

Enabling Humanizer registers **abinadwan-humanizer** in DSH's runtime Skill registry. It helps the agent edit supplied prose for clarity, natural phrasing, tone and language while preserving meaning, facts, citations and uncertainty. The skill uses original MIT-licensed instructions written for this suite.

Ask the agent to use Humanizer and supply the text, audience and desired tone. For example, “Use Humanizer to make this email concise and professional while preserving every fact.” Arabic requests and requested dialects are supported by the instructions. Results depend on the selected model. Disabling the Component removes the skill from future discovery and loading. Content already loaded into a conversation remains in that conversation's context.

The skill runs when the agent loads it through DSH. Automatic response interception, persistent tone controls and background rewriting remain future work. Its instructions prohibit optimizing for detector scores, promising detection evasion or falsely claiming human authorship.

## Personal Profile

This Component exposes a **read-only design draft** on the suite detail page when enabled. It accepts zero profile values. Profile storage, retrieval, transmission, consent enforcement and automatic style application await design approval.

The preliminary fields cover a preferred name with optional full name, optional date of birth and nationality, user-selected gender, custom instructions empty by default with optional templates, and an opt-in for using approved profile information. The proposed behavior applies approved style instructions automatically and accesses personal or sensitive information only when relevant and allowed. See the per-plugin document for decisions still awaiting approval.

## Installation and updates

Use the profile actually run by Harness Desktop. For the `desktop` profile, run in PowerShell.

```powershell
# If the legacy package is still installed
dsh plugin --profile desktop remove @abinadwan/environment-sidebar

# Install from the verified SHA of a published stable release.
# Replace RELEASE_COMMIT_SHA with the full 40-character SHA before running.
dsh plugin --profile desktop add github:abinadwan/DSH-ABINADWAN-Plugins-Suite#RELEASE_COMMIT_SHA
dsh --profile desktop --dump-config
```

Restart Harness completely, open **Plugins → ABINADWAN Plugins Suite**, enable the suite and inspect its three Components. Toggle each independently. Personal Profile starts off. When enabled, its draft appears on the suite detail page. Open a normal conversation for Environment & Context and ask the agent to use Humanizer for an editing task.

If your active profile is `web` or another name, substitute that name in every command. Upgrading from 0.4.0 keeps the `abinadwan-suite` group identity and the current inspector behavior. Existing user-layer disable overrides remain applicable. The package ships ready-to-run JavaScript and installs directly from GitHub. No build step is required. An immutable version can be installed by appending `#<full-commit-sha>` to the GitHub reference.

The suite detail page includes **Versions**. The suite's browser module automatically checks the newest **stable, published GitHub Release** at startup and every 24 hours while active; **Check again** is also available. A published Release is required: merely changing `main/package.json` or opening a PR does **not** make an update available. The read-only GitHub request sends no conversation data, credentials or referrer. If no stable Release exists, the status is **No published stable release yet**.

**Update now** is user-initiated only and asks for **Confirm update** before any Host change. The preview resolves the release tag to an immutable SHA and checks the `package.json` identity and version at that commit. The native DSH `pluginManager.updateBundle` API then installs that pinned revision, with its own validation and attempted rollback/restart handling. **There are no silent installations.** The Host may refuse, require a restart or fail to restore the prior installation. Review its Plugins status and keep a tested recovery path.

**Git install prerequisite:** Harness Desktop `v0.2.2-rc.3` reports `update: git` only for a package installed from a Git spec pinned to a **full 40-character SHA**. A legacy `github:abinadwan/DSH-ABINADWAN-Plugins-Suite` install tracking a branch is **not** automatically updatable. That installation must be migrated deliberately to a pinned Git revision first; the suite does not uninstall, replace or reconfigure it on its own. Use the source's documented install/remove workflow only after confirming the active DSH Profile and preserving a known-good SHA. A future published v0.6.0 Release must precede the first stable-update check.

## Architecture and compatibility

The bundle patch declares a package-root Cordis Group containing three Host subpath rows. DSH omits Group containers from the Components list. Subpath locale and icon exports give the rows their own identities. The package-root browser carrier remains available for suite controls and watches access-checked Host inventory to mount the Environment and Profile browser fibers. This follows the current DSH contract, where browser bundle discovery uses package-root entries. [DSH metadata contract](https://github.com/deepseek-ai/deepseek-harness/blob/39163dd30f703a79079e2d2446545cff3c453738/docs/cookbook/adding-a-package.md#plugin-display-metadata)

Humanizer uses `ctx.skills.register()`. Environment uses the native right-sidebar, conversation-header and session projection APIs. The UI follows `plugin-manager/changed` and `connection/reset`, disposes resources when a Component or access is disabled, and ignores stale inventory responses. An inventory read failure pauses Component UI until a successful refresh. The suite requires a DSH profile with Skills, Plugin Manager, Remote access and the standard web conversation/sidebar services.

## Development and verification

```sh
npm ci --ignore-scripts
npm test
npm run check:package
```

Tests use the actual Cordis Loader, DSH metadata reader and Skill registry, plus controlled browser-service fixtures and real React rendering. The package check extracts an npm tarball and runs the same tests against its contents. CI runs these checks on Windows and Linux with Node 22 and 24. DSH test libraries are locked at 0.2.2-rc.3. A separate local installation/configuration smoke check used DSH CLI 0.2.1-rc.5. Visual Desktop interaction and model-produced rewrites still require validation on the user's running Harness/model combination.

## Privacy and security

Environment reads UI-facing session/workspace summaries and projected token usage. The runtime Humanizer instructions operate within DSH's existing model context. Text supplied to the agent follows the user's existing model/provider configuration. The suite adds no external rewriting endpoint. The read-only automatic/manual release checks contact public GitHub without credentials, referrers or conversation data. Installations require an explicit user confirmation and are delegated to the official DSH Host. Personal Profile accepts, persists and transmits zero personal information in this version. [Security policy](SECURITY.md)

## License and attribution

MIT License. The Humanizer instructions are original to this suite. Artwork uses the four approved user-supplied PNGs, resized with transparency retained for DSH's image-size limit. [License](LICENSE) · [Artwork provenance](docs/BRANDING.md)

This independent community project is unaffiliated with DeepSeek or Anthropic. DeepSeek Harness and Claude Code remain trademarks of their respective owners.
