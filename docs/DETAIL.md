# ABINADWAN Plugins Suite — component details

**Published source release [v1.0.3](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/releases/tag/v1.0.3) tagged from `main`.** One community-maintained DSH bundle exposes six independently switchable components. The package's public identity remains `@abinadwan/dsh-plugins-suite`.

> **Release boundary:** A version bump, development branch merge, or successful CI run does not publish a GitHub Release or validate every Desktop security path. See [the releases page](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/releases) for actually published artifacts.

## Components at a glance

| Component | Default | Where to use it | Implemented boundary |
| --- | --- | --- | --- |
| <img src="../plugins/environment-context/icon.png" width="28" alt="Environment & Context icon"/> **Environment & Context** | On | Conversation header / right inspector | Read-only session summaries and estimated usage |
| <img src="../plugins/humanizer/icon.png" width="28" alt="Humanizer icon"/> **Humanizer** | On | Skill registry / agent requests | Edits supplied prose when the Skill is loaded |
| <img src="../plugins/personal-profile/icon.png" width="28" alt="My Profile icon"/> **My Profile** | Off | **Settings → My Profile** | Saved profile/preferences and per-field sharing choices |
| <img src="../plugins/direct-chat/assets/png/icon-256.png" width="28" alt="Direct Chat icon"/> **Direct Chat** | Off | Below native **New Session** | One shared Workspace, independent native chat Sessions |
| <img src="../plugins/conversation-lifecycle/assets/png/icon-256.png" width="28" alt="Chat Control icon"/> **Chat Control** | Off | **Settings → Chat Control** | Inventory, protection flags, retention configuration and preview |
| <img src="../plugins/adaptive-reasoning/assets/png/icon-256.png" width="28" alt="Adaptive Reasoning icon"/> **Adaptive Reasoning** | Off | Native composer / model effort settings | Manual Session effort, opt-in recommendations and Profile aggregates |

Enabled components preserve their existing internal IDs and saved settings namespaces. Turning a component off removes its active UI/behavior; **disabling is not a data-delete operation**. The icons above are bundled files, not remote services. See [artwork provenance](BRANDING.md) and [new icon artwork](NEW_PLUGINS_BRANDING.md).

## Environment & Context

<img src="../plugins/environment-context/icon.png" width="64" alt="Teal monitor"/>

**What works:** a native, read-only inspector of the currently selected session and associated Workspace. It displays browser/environment facts, reported context pressure, approximate message/tool/system token categories, output-token summaries and recent session activity. It opens from the conversation header/right sidebar and tracks the current DSH session.

**What it does not do:** it cannot grant model context, edit files, change a model's token limit, repair memory, or produce authoritative billing. Token-category numbers are estimates; use provider billing data for chargeable totals. Connectors and file-change views may be represented by availability notes when DSH does not provide an authorized source.

[Component notes](../plugins/environment-context/README.md) · [Screenshots](assets/environment-session.webp)

## Humanizer

<img src="../plugins/humanizer/icon.png" width="64" alt="Purple writing pencil"/>

Enabling the component registers the runtime Skill `abinadwan-humanizer` through DSH's public Skill service. Supply text and request an edit for clarity, natural wording, audience, tone or language. The instructions require retaining facts, citations, uncertainty and the author's intent; they prohibit unsupported detection-evasion guarantees or false claims of human authorship.

**Scope:** the Skill is used only when loaded by the agent; it is **not** a background rewriter, universal interception layer or model-detector bypass. Its output follows the currently selected model/provider. After disabling, new Skill discovery is removed but an already loaded conversation may retain prior text in context.

[Humanizer usage](../plugins/humanizer/README.md)

## My Profile

<img src="../plugins/personal-profile/icon.png" width="64" alt="Amber profile"/>

**Navigation:** enable the component under Plugins, then open **Settings → My Profile**. The old main-sidebar **Personal Profile** button was removed; internal IDs and stored configuration were *not* renamed.

**Information and disclosure:** one settings record belongs to the active DSH Profile across its Workspaces. Optional preferred name, nationality and gender have independent **Available to agent** checkboxes. Only committed, checked, nonempty values can be freshly inserted into supported native top-level agent prompts. New/legacy-imported choices begin private; unchecked fields are not freshly injected. There is no per-provider cloud master switch, Ask First workflow, or separate encrypted vault. Model response preferences and separately consented custom instructions may be sent through the configured provider and remain in conversation history.

**Agent Instructions:** the editor supports eight response styles/personalities, Automatic plus seven response-language options, six response characteristics, eight behavior presets and custom instructions, with an effective-instructions preview. Editing/replacing custom text revokes its prior sending consent until reviewed and saved again. **Response language** controls the model preference; it is independent of the page's own **Interface language**.

**Interface language:** new v4 records select **Follow DSH**. In this mode the page follows the active DSH interface language without writing DSH settings. The user can override the page independently with English, Arabic, Simplified Chinese, Spanish, French, German or Japanese, then explicitly **Save changes** to persist the override. Arabic is RTL; unsupported DSH languages fall back to English inside My Profile without changing DSH. Previously saved English/Arabic selections remain explicit overrides.

**Backup and restore:** exports are unencrypted JSON. Manual English/Arabic interface overrides retain compatible **v2** exports; **Follow DSH** and the other five interface languages export **v4** so the choice survives restoration. v1–v4 imports are supported. Review & Merge preserves omitted settings, while Replace All and importing sharing permissions require explicit confirmation. Legacy values migrate without automatically authorizing disclosure. Use an archived Harness configuration or compatible v2 backup before attempting a downgrade; old versions may not understand v4 exports.

**Limits:** a revision-checked Save is required before storing changes. The plugin does not encrypt its local settings or erase information already sent, stored in conversations, logs, provider records, files or summaries. The send-time guard recognizes stale structured disclosure blocks across CR, LF, NEL and Unicode line separators. Shared field values are sanitized in the prompt copy before sending. Outgoing-request privacy verification on real Desktop remains a separately tracked acceptance concern.

[Current settings contract](PERSONAL_PROFILE_LOCAL_SETTINGS.md) · [Settings rename/language change](SETTINGS_NAVIGATION_NAMES_2026_11_21.md) · [Phase 7 acceptance](PERSONAL_PROFILE_PHASE7_WINDOWS_ACCEPTANCE.md)

## Direct Chat

<img src="../plugins/direct-chat/assets/png/icon-256.png" width="64" alt="Blue chat bubble"/>

**Navigation:** enable Direct Chat, then use the button immediately beneath DSH's native **New Session** control. **Direct Chat history** opens next to that control. It lists authorized conversations from the registered Direct Chat Workspace, supports metadata search and defaults to last activity. Creation order is available when the Host can verify every creation timestamp for up to 100 registered conversations. Direct Chat history uses pages of 25 and keeps the native Projects tree and **New Session** control available. Use the native Session rename operation from the history dialog when Chat Control's protection settings are available, or use the native Workspace menu.

**Implemented:** a permanent profile-owned directory `abinadwan-direct-chat-data/Direct Chat` is registered as one DSH Workspace. A blank draft Session may be reused. After sending a first message, the next Direct Chat creates another native Session ID with its own history and agent continuation; the plugin does not copy other Sessions' transcripts into new requests. Conversations can be reopened through the native Workspace/Session UI, and the owner reported retention across Windows Desktop restart. Previously created experimental `session-*` directories/registrations are preserved, never automatically deleted or migrated.

**Tool security:** the Host installs pre-execute and guard policies to deny DSH tool execution for Direct Chat paths. A comparative Windows test using the same cloud model observed a normal Workspace run a PowerShell command and Direct Chat return **“Direct chats do not run tools.”** This is accepted **behavioral evidence**, not a complete audit of every Host tool route or third-party/plugin boundary.

**Non-goals / risks:** all Sessions in the one Direct Chat Workspace share the same filesystem `cwd`. Separate histories do **not** imply per-chat file permissions, LPAC/AppContainer isolation or independently encrypted storage. Direct Chat uses Chat Control’s Workspace retention policy and dry-run preview when Chat Control is enabled. Automatic cleanup and Session deletion are unavailable. Further cross-session request-trace and deep Host authorization tests were **deferred with owner approval**, not passed. The earlier v1.0.0 behavioral evidence covers the [Phase 2 implementation](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/pull/25). The consolidated changes have separate Desktop acceptance gates.

[Direct Chat design](../plugins/direct-chat/README.md) · [Phase 2 acceptance record](research/DIRECT_CHAT_PHASE2_DESKTOP_ACCEPTANCE.md)

## Chat Control

<img src="../plugins/conversation-lifecycle/assets/png/icon-256.png" width="64" alt="Green conversation/clock"/>

**Previously named Conversation Lifecycle.** Enable under Plugins, then open **Settings → Chat Control**. Its component/module ID is still `abinadwan-conversation-lifecycle`; existing saved policy is not renamed or migrated.

**Implemented:** an authorized Workspace conversation inventory, conversation and Workspace protection, a default retention preference and optional Workspace-specific overrides. Supported choices include **Forever, 365, 180, 90, 30 and 7 days**. The UI previews individual eligibility and retention candidates with known last prompt dates and an explicit UTC cutoff. It uses the catalog’s running state and the current window’s view leases. Other clients’ open views are outside that preview signal.

**Archive management in v1.1.0 development.** Open **Settings → Chat Control → Archived Conversations**. The **Hide Archived Conversations** checkbox is enabled by default for the regular Chat Control list and saved in the active DSH Profile. The DSH sidebar's own **View options** menu offers **Hide archived**, **All conversations (show archived)** and **Archived only**.

The archive hub automatically follows the authorized catalogs. It shows confirmed Workspace membership, titles, last updates when available, protection and pin status. Search matches titles and Workspace names. Narrow results by Workspace, protection, pin or date, then sort by newest, oldest, name or Workspace. Creation dates and archive dates are absent from the catalog used by the hub.

Select **Restore**, then **Confirm restore** to return an eligible conversation to DSH's conversation list. Chat Control requires Session-level permission, current Workspace membership and an archived, idle, unprotected and unpinned conversation. Open the conversation from DSH after restoration. Archive visibility and browsing leave the conversation's contents intact.

**Not implemented:** a production deletion worker, automatic scheduled retention, permanent conversation deletion or bulk data removal. Previewing a cleanup must not be presented as a real cleanup. DSH's session persistence and deletion authority remain separate; no automatic destructive action is enabled.

[Archive API research](research/v1.1.0/CHAT_CONTROL_NATIVE_API_RESEARCH.md) · [Archive implementation and acceptance](research/v1.1.0/CHAT_CONTROL_ARCHIVE_IMPLEMENTATION_REPORT.md) · [Lifecycle implementation history](archive/research/NEW_PLUGINS_PHASE_C_CONTINUATION.md) · [Settings navigation record](SETTINGS_NAVIGATION_NAMES_2026_11_21.md)

## Adaptive Reasoning

<img src="../plugins/adaptive-reasoning/assets/png/icon-256.png" width="64" alt="Pink reasoning bars"/>

**Implemented:** for models supporting reasoning-effort selection, the UI can apply a **manual** eligible effort to the resident root agent/Session using the current model/provider route. The Host validates route identity and capability before changing the session model selection. Use **Effort recommendation** to opt in and analyze text with a deterministic classifier on the Harness Host. It considers only the model’s advertised effort levels, preserves an explicit Session selection and returns reason labels without recording the sample. Edit the Session effort using the existing manual control.

**Statistics:** The owner can view and reset aggregate counts. Hosts with a launcher Profile save bounded provider/model/effort aggregates there. Unsupported Hosts keep counts in memory. Token fields use adapter-reported usage and can be incomplete. Recent buffered counts may be lost during abrupt exit, and the file is independent of the saved effort settings.

**Not implemented:** automatic application, message-only temporary effort, and plugin-managed subagent effort policies. Those request paths are explicitly rejected rather than silently persisting a misleading selection. Some models do not expose effort options.

[Chat Control, Adaptive Reasoning and Direct Chat capability review](research/CHAT_CONTROL_ADAPTIVE_DIRECT_CHAT_V2.md) · [Historical Adaptive Reasoning handover](research/ADAPTIVE_REASONING_HANDOVER.md)

## Installation and updates

The supported installation identity is `@abinadwan/dsh-plugins-suite`. Select the correct active Harness Profile; Desktop Profiles are not interchangeable with a different CLI Profile. Use the native **Plugins → Add plugin** flow with an approved **full 40-character Git commit SHA** from a published release:

~~~text
github:abinadwan/DSH-ABINADWAN-Plugins-Suite#RELEASE_COMMIT_SHA
~~~

For CLI installations, use the matching DSH `plugin --profile <name> add` workflow in the environment that runs that Profile. Back up My Profile and the Profile configuration before any replacement or migration. Install **v1.0.3** using the full SHA of the official tag published from `main`. The updater discovers changes through published releases.

**Suite updates (GitHub Releases)** lives on the suite's Plugins detail page. It checks for a published, non-prerelease GitHub Release on startup and every 24 hours while loaded, with manual **Check again**. If a newer release exists, **Update now** verifies the tag, immutable target SHA and remote package manifest; it requires user confirmation and delegates to DSH's `pluginManager.updateBundle`. There is no unattended install. In-app update requires the existing Git installation to be pinned to a complete commit SHA; unpinned Git installations receive manual migration guidance. Updates may require a restart, and Host rollback is attempted but cannot be guaranteed to succeed in every failure mode.

The updater does **not** follow unreviewed `develop` commits, automatically replace a branch-tracking installation, silently restart Desktop or copy user conversations to GitHub. The update checker is not the Desktop application updater. [Update feasibility and future design](research/SUITE_AUTO_UPDATE_FEASIBILITY.md).

## Compatibility, verification and remaining gates

- Development tests use the pinned DSH/Loader libraries and run `npm test` plus `npm run check:package` on Windows and Linux with Node 22/24. These tests do not replace real Desktop validation.
- Historical documentation contains experimental LPAC companion processes, encrypted storage and per-Workspace profiles that were replaced. These **are not active capabilities**. Consult [documentation index](README.md) before interpreting old phase reports.
- Accepted Windows Direct Chat behavioral tests do not establish high-assurance filesystem or request-level isolation; My Profile's final multilingual Settings smoke test and request-level privacy assessment remain separately tracked.
- Release publication and Desktop installation are separate actions. Review the release notes and the Host and Desktop validation limits before upgrading.

## Support, license and provenance

[Root README](../README.md) · [Documentation index](README.md) · [Changelog](../CHANGELOG.md) · [Security policy](../SECURITY.md) · [Issues](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/issues)

Community-maintained MIT-licensed project, independent of DeepSeek and DSH Desktop vendors. Historical design records remain for audit; actual behavior is determined by the version and Host under test.
