# ABINADWAN Plugins Suite — component details

**Release source [v1.1.0](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/releases/tag/v1.1.0).** One community-maintained DSH bundle exposes six independently switchable components. The package's public identity remains `@abinadwan/dsh-plugins-suite`.

> **Release boundary:** A version bump, development branch merge, or successful CI run does not publish a GitHub Release or validate every Desktop security path. See [the releases page](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/releases) for actually published artifacts.

## Components at a glance

| Component | Default | Where to use it | Implemented boundary |
| --- | --- | --- | --- |
| <img src="../plugins/environment-context/icon.png" width="28" alt="Environment & Context icon"/> **Environment & Context** | On | Conversation header / right inspector | Read-only session summaries and estimated usage |
| <img src="../plugins/humanizer/icon.png" width="28" alt="Humanizer icon"/> **Humanizer** | On | Skill registry / agent requests | Edits supplied prose when the Skill is loaded |
| <img src="../plugins/personal-profile/icon.png" width="28" alt="My Profile icon"/> **My Profile** | Off | **Settings → My Profile** | Saved profile/preferences and per-field sharing choices |
| <img src="../plugins/direct-chat/assets/png/icon-256.png" width="28" alt="Direct Chat icon"/> **Direct Chat** | Off | Below native **New Session** | One shared Workspace, independent native chat Sessions |
| <img src="../plugins/conversation-lifecycle/assets/png/icon-256.png" width="28" alt="Archive Manager icon"/> **Archive Manager** | Off | **Archives** in the sidebar | Authorized archive browsing, search, protection and native restore |
| <img src="../plugins/adaptive-reasoning/assets/png/icon-256.png" width="28" alt="Adaptive Reasoning icon"/> **Adaptive Reasoning** | Off | Native composer / model effort settings | Manual Session effort, opt-in recommendations and Profile aggregates |

Enabled components preserve their existing internal IDs and saved settings namespaces. Turning a component off removes its active UI/behavior; **disabling is not a data-delete operation**. The icons above are bundled files, not remote services. See [artwork provenance](BRANDING.md) and [new icon artwork](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/blob/98c27e87e216f11000ab92adcb79d51388031a28/docs/NEW_PLUGINS_BRANDING.md).

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

**Limits:** a revision-checked Save is required before storing changes. The plugin does not encrypt its local settings or erase information already sent, stored in conversations, logs, provider records, files or summaries. The send-time guard recognizes stale structured disclosure blocks across CR, LF, NEL and Unicode line separators. Shared field values are sanitized in the prompt copy before sending. The owner accepted the MP02 pre-provider refusal and fresh-session privacy control. The historical provider-wire continuation criterion remains Blocked, not Pass; arbitrary historical text cannot be comprehensively scrubbed.

[Current settings contract](PERSONAL_PROFILE_LOCAL_SETTINGS.md)

## Direct Chat

<img src="../plugins/direct-chat/assets/png/icon-256.png" width="64" alt="Blue chat bubble"/>

**Navigation:** enable Direct Chat, then use the button immediately beneath DSH's native **New Session** control. **Direct Chat history** opens next to that control. It lists authorized conversations from the registered Direct Chat Workspace, supports metadata search and defaults to last activity. Creation order is available when the Host can verify every creation timestamp for up to 100 registered conversations. Direct Chat history uses pages of 25 and keeps the native Projects tree and **New Session** control available. Use the native Session rename operation from the history dialog when Archive Manager's protection settings are available, or use the native Workspace menu.

**Implemented:** a permanent profile-owned directory `abinadwan-direct-chat-data/Direct Chat` is registered as one DSH Workspace. A blank draft Session may be reused. After sending a first message, the next Direct Chat creates another native Session ID with its own history and agent continuation; the plugin does not copy other Sessions' transcripts into new requests. Conversations can be reopened through the native Workspace/Session UI, and the owner reported retention across Windows Desktop restart. Previously created experimental `session-*` directories/registrations are preserved, never automatically deleted or migrated.

**Tool security:** the Host installs pre-execute and guard policies to deny DSH tool execution for Direct Chat paths. A comparative Windows test using the same cloud model observed a normal Workspace run a PowerShell command and Direct Chat return **“Direct chats do not run tools.”** This is accepted **behavioral evidence**, not a complete audit of every Host tool route or third-party/plugin boundary.

**Non-goals / risks:** all Sessions in the one Direct Chat Workspace share the same filesystem `cwd`. Separate histories do **not** imply per-chat file permissions, LPAC/AppContainer isolation or independently encrypted storage. Direct Chat honors saved Archive Manager protection for supported rename actions. The historical retention preview is no longer exposed; automatic cleanup and Session deletion are unavailable. Further cross-session request-trace and deep Host authorization tests were **deferred with owner approval**, not passed. The earlier v1.0.0 behavioral evidence covers the [Phase 2 implementation](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/pull/25). The owner-approved title-search scope is 1,000 registered Sessions, based on v1.0.2 native acceptance. At 10,000 Sessions, the native stress test failed (8,185 titles available); exact-ID lookup worked. This is not a performance SLA or a Host fix.

[Direct Chat contract](../plugins/direct-chat/README.md)

<a id="chat-control"></a>
## Archive Manager

<img src="../plugins/conversation-lifecycle/assets/png/icon-256.png" width="64" alt="Archive Manager icon"/>

**Previously named Chat Control and Conversation Lifecycle.** Enable under Plugins, then open **Archives** in the sidebar (or **More** if unpinned). No dedicated Settings page remains. The internal component/module ID `abinadwan-conversation-lifecycle` and stored record schema are unchanged. Historical retention and visibility values are preserved but no longer exposed or applied as cleanup controls.

The full-page hub uses authorized Workspace and Session metadata and one archive inventory for counts, search, filtering and sorting. It displays titles, Workspace, last update when available, protection and pin status. It excludes ambiguous, unadmitted, blank, subagent and legacy Direct Chat rows. The DSH native sidebar owns **View options → Hide archived**; Archive Manager does not change that filter.

Use a row's protection checkbox to restrict restore through Archive Manager and supported Direct Chat rename actions. Workspace protection also applies to rows within that Workspace. **Manage saved protection** lets the owner manage Workspace flags and authorized existing non-listed protected sessions, without clearing older flags automatically. This is plugin-scoped protection, not a lock on native DSH operations or an access-control boundary. Settings writes are revision-checked.

Select **Restore**, then **Confirm restore** to return an eligible conversation to DSH's conversation list using native Session access and fresh catalog/protection checks. Open the conversation in DSH after restoration. The native endpoint does not offer atomic plugin protection checks and restore together. Browsing does not read transcript content. No retention policy, storage usage, deletion, cleanup preview or automatic cleanup controls are displayed.

**Acceptance boundary:** previous native restore evidence does not establish complete acceptance of the final Archive Manager UI.

## Adaptive Reasoning

<img src="../plugins/adaptive-reasoning/assets/png/icon-256.png" width="64" alt="Pink reasoning bars"/>

**Implemented:** for models supporting reasoning-effort selection, the UI can apply a **manual** eligible effort to the resident root agent/Session using the current model/provider route. The Host validates route identity and capability before changing the session model selection. Use **Effort recommendation** to opt in and analyze text with a deterministic classifier on the Harness Host. It considers only the model’s advertised effort levels, preserves an explicit Session selection and returns reason labels without recording the sample. Edit the Session effort using the existing manual control.

**Statistics:** The owner can view and reset aggregate counts. Hosts with a launcher Profile save bounded provider/model/effort aggregates there. Unsupported Hosts keep counts in memory. Token fields use adapter-reported usage and can be incomplete. Recent buffered counts may be lost during abrupt exit, and the file is independent of the saved effort settings.

**Not implemented:** automatic application, message-only temporary effort, and plugin-managed subagent effort policies. Those request paths are explicitly rejected rather than silently persisting a misleading selection. Some models do not expose effort options.



## Installation and updates

The supported installation identity is `@abinadwan/dsh-plugins-suite`. Select the correct active Harness Profile; Desktop Profiles are not interchangeable with a different CLI Profile. Use the native **Plugins → Add plugin** flow with an approved **full 40-character Git commit SHA** from a published release:

~~~text
github:abinadwan/DSH-ABINADWAN-Plugins-Suite#RELEASE_COMMIT_SHA
~~~

For CLI installations, use the matching DSH `plugin --profile <name> add` workflow in the environment that runs that Profile. Back up My Profile and the Profile configuration before any replacement or migration. Install the published **v1.1.0** using its full release commit SHA. The updater discovers changes through published releases.

**Suite updates (GitHub Releases)** lives on the suite's Plugins detail page. It checks for a published, non-prerelease GitHub Release on startup and every 24 hours while loaded, with manual **Check again**. If a newer release exists, **Update now** verifies the tag, immutable target SHA and remote package manifest; it requires user confirmation and delegates to DSH's `pluginManager.updateBundle`. There is no unattended install. In-app update requires the existing Git installation to be pinned to a complete commit SHA; unpinned Git installations receive manual migration guidance. Updates may require a restart, and Host rollback is attempted but cannot be guaranteed to succeed in every failure mode.

The updater does **not** follow unreviewed `develop` commits, automatically replace a branch-tracking installation, silently restart Desktop or copy user conversations to GitHub. The update checker is not the Desktop application updater.

## Compatibility, verification and remaining gates

- Development tests use the pinned DSH/Loader libraries and run `npm test`, `npm run check:regression` and `npm run check:package` on Windows and Linux with Node 22/24. These tests do not replace real Desktop validation.
- Experimental companion sandboxes, encrypted storage and per-Workspace profiles are not implemented.
- Accepted Windows Direct Chat behavioral tests do not establish high-assurance filesystem or request-level isolation; My Profile's final multilingual Settings smoke test and request-level privacy assessment remain separately tracked.
- Release publication and Desktop installation are separate actions. Review the release notes and the Host and Desktop validation limits before upgrading.

## Support, license and provenance

[Root README](../README.md) · [Documentation index](README.md) · [Changelog](../CHANGELOG.md) · [Security policy](../SECURITY.md) · [Issues](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/issues)

Community-maintained MIT-licensed project, independent of DeepSeek and DSH Desktop vendors. Actual behavior is determined by the version and Host under test.
