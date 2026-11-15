# Visual identity

The icon depicts three diagnostics rows, a segmented context-usage meter, and a luminous right sidebar. These elements communicate the product's actual purpose without copying third-party logos or mascots.

| Token | Color | Usage |
| --- | --- | --- |
| Midnight | `#071326` | Base field |
| Navy | `#172A4A` | Surface gradient |
| Electric blue | `#2379F7` | Right sidebar |
| Cyan | `#10DBC7` | Live status |
| Amber | `#E7AA3E` | Usage accent |

The definitive source is [`/icon.svg`](../icon.svg); it uses only internal vectors, gradients and strokes (no fonts, remotely loaded assets or scripts). Keep clear space around the rounded-square mark; prefer displaying at 64–160 px in GitHub documentation, or 36 px for plugin artwork.

The generated concept image is a design reference; the distributed vector logo is the canonical asset. Do not add third-party product wordmarks, and do not suggest official DeepSeek or Claude Code affiliation.

The original vector is preserved as `icon.svg`; `icon.png` is a 160×160 rasterized fallback used by the package-level `icon` and `./icon` exports to improve image rendering compatibility. Both share the same design.
