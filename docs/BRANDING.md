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
