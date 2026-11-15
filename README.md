<p align="center">
  <img src="icon.png" alt="ABINADWAN Plugins Suite — Saudi developer avatar" width="112" height="112" />
</p>

<h1 align="center">ABINADWAN Plugins Suite</h1>

<p align="center">A modular, open-source toolkit for <a href="https://github.com/deepseek-ai/deepseek-harness">DeepSeek Harness</a>.<br/>
One suite today; carefully scoped, independently documented components as the project grows.</p>

<p align="center">
  <a href="https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/actions/workflows/test.yml"><img alt="CI" src="https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/actions/workflows/test.yml/badge.svg"/></a>
  <img alt="Suite 0.4.0" src="https://img.shields.io/badge/suite-0.4.0-7b2246"/>
  <a href="LICENSE"><img alt="MIT" src="https://img.shields.io/badge/license-MIT-22c55e"/></a>
  <img alt="Status experimental" src="https://img.shields.io/badge/status-experimental-e49b45"/>
</p>

## Overview

**ABINADWAN Plugins Suite** is a single-install package intended to host related DeepSeek Harness plugins. It currently contains **one working component**, Environment & Context. Humanizer and Personal Profile are **future concepts, not shipped features**.

| Plugin | Status | Purpose | Documentation |
| --- | --- | --- | --- |
| **Environment & Context** | **Available — implemented** | Inspect workspace, session, context pressure and output-token summaries | [Plugin details](plugins/environment-context/README.md) |
| **Humanizer** | **Planned — not implemented** | Optional natural-language style tools and user-selected tone | [Planning notes](plugins/humanizer/README.md) |
| **Personal Profile** | **Design pending — not implemented** | User-controlled preferences and optional personal information | [Planning notes](plugins/personal-profile/README.md) |

> The number of *Components* shown in DSH is **one** until additional modules are actually implemented. This README lists a roadmap, not installable subplugins.

## Plugin 1 — Environment & Context

**Status: Available (v0.4.0 suite)**

The native **right-side session inspector** is the functional plugin today. It opens once when a session becomes visible and can be reopened from the conversation header.

- **Environment:** browser environment and associated workspace.
- **Context:** reported context pressure, approximate message/tool/system-token categories, and free capacity.
- **Outputs:** reported output tokens and latest session activity.
- **Connectors & Changes:** explicit *not available yet* notices; no invented account lists, output files, or Git changes.
- **Versions:** manual **Check for updates** on this suite's **Plugins detail** page, not in the session inspector. No automatic installations.

[Read complete Environment & Context documentation](plugins/environment-context/README.md).

### Screenshots

Existing screenshots below document **Environment & Context**, not the unreleased suite modules:

<p align="center">
  <a href="docs/assets/environment-project.webp"><img src="docs/assets/environment-project.webp" alt="Environment & Context session sidebar with a workspace" width="240"/></a>
  &nbsp;
  <a href="docs/assets/environment-session.webp"><img src="docs/assets/environment-session.webp" alt="Environment & Context session sidebar showing context usage" width="240"/></a>
</p>

## Plugin 2 — Humanizer

**Status: Planned, not included in the current install.** A separate, optional writing-style module for clarity, tone, natural phrasing and user preferences. It is not presented as a guaranteed AI-detector bypass tool.

Any automatic rewriting mechanism must be reviewed against actual Harness APIs before implementation.

[Humanizer planning notes](plugins/humanizer/README.md).

## Plugin 3 — Personal Profile

**Status: Design discussion pending; no data storage has been built.** The planned module will separate automatically applied style preferences from personal information, which must be retrieved only when relevant and permitted. Sensitive fields, encryption, account isolation, permission controls, and deletion behavior will be finalized *before* coding.

[Personal Profile planning notes](plugins/personal-profile/README.md).

## Installation

> This is a **new package identity**: `@abinadwan/dsh-plugins-suite`. GitHub was renamed; the old `@abinadwan/environment-sidebar` identifier is no longer the package deployed by this suite.

On Windows PowerShell, in the profile actually used by Desktop:

```powershell
# Only if the old Environment plugin is still installed:
dsh plugin --profile desktop remove @abinadwan/environment-sidebar

# Install the new suite:
dsh plugin --profile desktop add github:abinadwan/DSH-ABINADWAN-Plugins-Suite
dsh --profile desktop --dump-config
```

Completely restart Harness, enable the suite, and open a normal conversation to see Environment & Context. The running profile must match the installation profile. You can pin an immutable commit with `#<full-commit-sha>` after the GitHub reference.

The package includes ready-to-run Host and browser scripts. It is **not** published to npm and needs no `npm run build` during installation.

## Updates

Go to **Plugins → ABINADWAN Plugins Suite** and find the additional **Versions** section after the package's Source details. Select **Check for updates**. It requests the public `main/package.json` from this repository **only after your click**, compares versions, and reports the result. It never installs updates automatically. A blocked browser request produces an explicit error, not an incorrect *Up to date* report.

## Architecture and scope

- **Suite identity:** `@abinadwan/dsh-plugins-suite`, icon, localized package metadata, MIT license, documentation, manual update check.
- **Shipped component:** Environment & Context, using the native right sidebar.
- **Future modules:** Humanizer and Personal Profile will not be activated or exposed until designed and tested.
- **Expansion approach:** Add separate Host subpath entries for independently toggleable components when ready. The current root Client module owns the existing sidebar; additional component scopes and permissions must be tested before enabling them.

Source: `client.js`, `index.js`, `cordis.patch.yml`, `locale/en.json`.

```bash
npm test
```

CI covers source identity, module registration and update-check behavior; **it does not prove integration on every Harness Desktop release**.

## Privacy & security

Environment & Context reads available UI/session summaries and does not intentionally run shell commands, inspect private files or collect credentials. Only the manual update check contacts GitHub, without sending messages or personal data. Planned Personal Profile functionality has **no storage or access permissions in this version**. See [Security](SECURITY.md).

## License & attribution

MIT License — see [LICENSE](LICENSE).

This independent community project is not affiliated with or endorsed by DeepSeek or Anthropic. DeepSeek Harness and Claude Code remain trademarks of their respective owners. The plugin implementation uses public DeepSeek Harness extension contracts; no proprietary source was copied.
