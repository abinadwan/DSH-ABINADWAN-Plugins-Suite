# ABINADWAN Plugins Suite

Experimental community package · v0.8.0-rc.1

Six independently toggleable components share one suite installation. The package card uses the Saudi developer avatar, and the rows have individual transparent artwork.

## Environment & Context

<img src="../plugins/environment-context/icon.png" width="64" alt="Teal monitor"/>

Enabled by default. A read-only right-side session inspector for workspace context, context pressure, estimated token categories, output-token summaries and recent activity. Open a conversation to use it.

## Humanizer

<img src="../plugins/humanizer/icon.png" width="64" alt="Purple feather"/>

Enabled by default. Registers the runtime Skill **abinadwan-humanizer**. Ask the agent to use Humanizer to edit supplied text for clarity, tone or a requested language. Its instructions preserve facts and author voice and prohibit detection-evasion promises. Loaded Skill content follows the normal DSH model context and conversation lifetime.

## Personal Profile

<img src="../plugins/personal-profile/icon.png" width="64" alt="Amber ID and gear"/>

Disabled by default. When enabled, a **Personal Profile** page in the left sidebar edits one unified profile: optional preferred name, nationality and gender, response preferences (eight personalities, Automatic plus seven response languages, six characteristics, eight behavior presets, custom instructions) with an effective-instructions preview, and one access policy per field. **Save** writes through the native Harness settings of the active Profile and is confirmed only after Harness accepts it. Settings from 0.7.1 are migrated after review and explicit confirmation. Backup & Restore downloads, copies or shows the complete JSON (including permissions) and imports a plain JSON file or pasted JSON. Review & Merge preserves omitted settings. Replace All and permission import require separate confirmation. My Information places one Available to agent checkbox beside each field; there are no general or cloud switches. Supported native steps receive only saved checked, nonempty fields, response preferences and explicitly authorized custom text. Unchecked fields are not freshly injected. The native v4 record reads old versions without activating old field choices. Desktop acceptance remains open.

## Direct Chat (Global Chat replacement; experimental)
Disabled by default. The feature branch replaces the former Windows companion with a native-Session Global Chat proof of concept. Its Host route creates and flushes DSH sessions within a dedicated active-profile folder, and the browser registers a sidebar-footer **Direct Chat** button. Tool execution is denied in these sessions at both pre-execute and dispatch guard layers.

**Not verified:** the native DSH Desktop composer still requires a Workspace. A dedicated folder is not a registered hidden Workspace. Creating a persistent internal Workspace that remains invisible in user selectors, confirming real messages after a cold restart, permanent deletion, and compatibility with user Workspaces are open acceptance tasks. Previous Windows AppContainer confinement and independent-history/deletion features do not apply to this replacement. Existing companion chat files are not removed from a user's machine. See [implementation status](../plugins/direct-chat/README.md).

## Conversation Lifecycle

Disabled by default. Native Settings lists Workspace conversations, stores protection and retention preferences, and previews cleanup. Workspace deletion and automatic retention remain gated.

## Adaptive Reasoning

Disabled by default. The composer supports explicit manual effort for eligible models, saved selections and local request statistics. Temporary, Adaptive and unsupported subagent effort remain gated.

## Versions

The suite checks **published stable GitHub Releases** at startup and every 24 hours, with manual **Check again**. If a stable newer release exists, **Update now** lets you verify the source and explicitly confirm a pinned update through the DSH Host Plugin Manager. Git installations without a pinned 40-character SHA require a one-time manual migration. No silent installation takes place, and a restart may be required.

## Install

Use the profile actually run by Harness, such as `desktop`.

```powershell
# Replace RELEASE_COMMIT_SHA with the full SHA for a published release
dsh plugin --profile desktop add github:abinadwan/DSH-ABINADWAN-Plugins-Suite#RELEASE_COMMIT_SHA
```

Restart Harness, enable the suite and use the switches in Components. [Full documentation](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite) · [Report an issue](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/issues)

MIT-licensed, independent community project.
