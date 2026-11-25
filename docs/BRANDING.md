# ABINADWAN Plugins Suite artwork

The six components use a shared rounded badge with a bright gradient rim, a soft top highlight, and a white glyph. Each component has its own color and symbol. Separate monochrome SVG glyphs share the same geometry and use `currentColor` for native controls.

| Component | Glyph and color | Shipped `/icon` resource |
| --- | --- | --- |
| Environment & Context | Cyan terminal monitor | `plugins/environment-context/icon.png` |
| Humanizer | Purple writing pencil | `plugins/humanizer/icon.png` |
| My Profile | Amber person silhouette | `plugins/personal-profile/icon.png` |
| Direct Chat | Blue speech bubble | `plugins/direct-chat/assets/png/icon-256.png` |
| Archive Manager (internal Conversation Lifecycle) | Green speech bubble and clock | `plugins/conversation-lifecycle/assets/png/icon-256.png` |
| Adaptive Reasoning | Magenta trend chart | `plugins/adaptive-reasoning/assets/png/icon-256.png` |

Every component has `assets/icon.svg`, `assets/glyph.svg`, and transparent 32, 64, 128, 256 and 512 px PNGs in `assets/png/`. The component entries in the README and feature documentation use the same 256 px assets as the package exports..

The suite card uses the owner-supplied Saudi developer mascot at the repository root, `icon.png`. The historical suite-level `icon.svg` remains available through its explicit export. The [README hero](assets/abinadwan-plugins-suite-banner.webp) uses the suite mascot. Earlier screenshots document previous versions of the application.

The owner supplied the original suite artwork for distribution with this MIT-licensed project. The component vectors are original to the suite. This independent project is unaffiliated with DeepSeek Harness.
## Artwork verification

All six components use the same 24 × 24 glyph grid and native `currentColor`. The [light contact sheet](assets/new-plugins/contact-sheet-light.png) and [dark contact sheet](assets/new-plugins/contact-sheet-dark.png) show simulated themes. The source [renderer](../scripts/render-plugin-icons.mjs) generates SVGs, PNGs, contact sheets and native glyph geometry. Byte-for-byte contact sheets use Windows/Segoe UI, Sharp 0.35.5 and librsvg 2.63.2 from a matching installed Harness runtime. Extract it with `node qa/extract-new-plugins-runtime.mjs <app.asar>`, run `node scripts/render-plugin-icons.mjs <scratch>` and repeat with `--check`. These are development-only tools.
