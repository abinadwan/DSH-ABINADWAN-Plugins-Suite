# ABINADWAN Plugins Suite artwork

The suite's original four owner-approved transparent PNGs were introduced in v0.5.0. Each shipped image is a 256 × 256 RGBA derivative retaining its composition and alpha channel and fitting DSH's icon-size limit. Three additional original vector-derived icon families were introduced for the later components; all seven are shipped with the v1.0.0 source release.

| Identity | Supplied artwork | Shipped resource |
| --- | --- | --- |
| Suite | Saudi Developer with Laptop Plugins.png | `icon.png` |
| Environment & Context | ChatGPT Image Nov 16, 2026, 12_35_24 AM.png | `plugins/environment-context/icon.png` |
| Humanizer | ChatGPT Image Nov 16, 2026, 12_35_43 AM.png | `plugins/humanizer/icon.png` |
| My Profile (formerly Personal Profile) | ChatGPT Image Nov 16, 2026, 12_35_55 AM.png | `plugins/personal-profile/icon.png` |
| Direct Chat | Original suite vector design | `plugins/direct-chat/assets/png/icon-256.png` |
| Chat Control (formerly Conversation Lifecycle) | Original suite vector design | `plugins/conversation-lifecycle/assets/png/icon-256.png` |
| Adaptive Reasoning | Original suite vector design | `plugins/adaptive-reasoning/assets/png/icon-256.png` |

The suite card resolves its avatar through the package manifest. All six component rows resolve their artwork through their respective `/icon` subpath exports. The newly added icon masters and alternate sizes are documented in [New Plugins Branding](NEW_PLUGINS_BRANDING.md). Display names may differ from internal module paths without changing artwork identity.

The historical `icon.svg` and its explicit export remain for compatibility with earlier consumers. Current suite and Component metadata resolve the approved PNGs. Existing Environment screenshots document the inspector before this artwork update.

The owner supplied the AI-generated artwork for distribution in this MIT-licensed project. This records provenance without asserting an additional third-party license or trademark endorsement. The suite remains an independent community project.

## Neon component icon refresh (feature branch, November 2026)

The primary component icon artwork was refreshed as a cohesive six-piece set to match the dark, purple-blue README hero. The six independently activated components retain their original names, `/icon` export paths, and functional identities; **only artwork at the six primary 256 × 256 PNG paths changed**.

| Component | Updated primary artwork |
| --- | --- |
| Environment &amp; Context | `plugins/environment-context/icon.png` |
| Humanizer | `plugins/humanizer/icon.png` |
| My Profile | `plugins/personal-profile/icon.png` |
| Direct Chat | `plugins/direct-chat/assets/png/icon-256.png` |
| Chat Control | `plugins/conversation-lifecycle/assets/png/icon-256.png` |
| Adaptive Reasoning | `plugins/adaptive-reasoning/assets/png/icon-256.png` |

The suite's original mascot `icon.png` is unchanged. The README hero at `docs/assets/abinadwan-plugins-suite-banner.webp` retains the approved mascot/title/DSH compatibility design; the component badges are displayed below it using the actual shipped PNGs, not an invented recreation.

**Reproduction boundary:** The legacy vector masters and extra 32/64/128/512-pixel derivatives for the three newer components have **not** been reauthored in this icon-only refresh. They may not match the new primary 256-pixel illustrations. The historical `scripts/render-plugin-icons.mjs` renderer generates from those legacy masters and must not be used to overwrite the six updated primary icons. A full vector/alternate-size asset pipeline requires a separate, reviewed migration.

This refresh is independent community artwork, not a claim of endorsement by DeepSeek Harness. It has not changed an approved stable release.
