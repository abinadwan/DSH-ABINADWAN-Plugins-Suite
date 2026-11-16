# ABINADWAN Plugins Suite

Experimental community package · v0.6.0

Three independently toggleable Components share one suite installation. The package card uses the Saudi developer avatar, and the rows have individual transparent artwork.

## Environment & Context

<img src="../plugins/environment-context/icon.png" width="64" alt="Teal monitor"/>

Enabled by default. A read-only right-side session inspector for workspace context, context pressure, estimated token categories, output-token summaries and recent activity. Open a conversation to use it.

## Humanizer

<img src="../plugins/humanizer/icon.png" width="64" alt="Purple feather"/>

Enabled by default. Registers the runtime Skill **abinadwan-humanizer**. Ask the agent to use Humanizer to edit supplied text for clarity, tone or a requested language. Its instructions preserve facts and author voice and prohibit detection-evasion promises. Loaded Skill content follows the normal DSH model context and conversation lifetime.

## Personal Profile

<img src="../plugins/personal-profile/icon.png" width="64" alt="Amber ID and gear"/>

Disabled by default. Enabling displays a read-only field draft below. Privacy and storage design awaits approval. The draft accepts, saves and transmits zero profile values. Automatic approved style instructions and relevant, permitted personal-data access remain proposed future behavior.

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
