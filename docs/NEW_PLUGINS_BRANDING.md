# New plugin artwork

The three original vector icons share a 24×24 grid, rounded badge geometry, 2-unit foreground strokes, rounded joins and a light foreground. The vector masters are the editable sources. Each `glyph` group supplies the geometry for the future single-color native UI treatment.

| Plugin | Symbol | Palette | SVG master |
|---|---|---|---|
| Direct Chat | Conversation bubble with two reply lines | `#2563EB`, `#173A8A`, `#93C5FD` | [Direct Chat](../plugins/direct-chat/assets/icon.svg) |
| Conversation Lifecycle | Offset conversation cards and a clock arc | `#15856F`, `#0D5147`, `#8EE0C5` | [Conversation Lifecycle](../plugins/conversation-lifecycle/assets/icon.svg) |
| Adaptive Reasoning | Rising effort bars and a selection node | `#C43D70`, `#772342`, `#F4A6C4` | [Adaptive Reasoning](../plugins/adaptive-reasoning/assets/icon.svg) |

Each `assets/png/` folder contains transparent RGBA variants at 32, 64, 128, 256 and 512 pixels. The 256-pixel versions are 6,573, 8,012 and 7,799 bytes respectively. They are ready for the component `/icon` exports when the shared package metadata is coordinated. The 512-pixel versions are available for documentation and Plugin Hub artwork. Suite Settings, sidebar and toolbar registration are part of the subsequent integration.

![Light theme with real 32, 64 and 128 pixel badges and 16, 20 and 24 pixel glyphs](assets/new-plugins/contact-sheet-light.png)

![Dark theme with real 32, 64 and 128 pixel badges and 16, 20 and 24 pixel glyphs](assets/new-plugins/contact-sheet-dark.png)

The sheets use simulated theme surfaces. After registration, check native disabled, selected, forced-color and RTL views on Desktop. The glyphs are nondirectional. Surrounding labels and layout follow the application locale. Use `currentColor` for native glyphs and accessible labels for icon-only controls.

The artwork is original to this suite under its MIT license. The renderer uses Sharp 0.35.5 and librsvg 2.63.2 from the pinned local Windows Desktop runtime extraction. Contact sheet labels also depend on Windows Segoe UI. See the [Phase C reproduction steps](research/NEW_PLUGINS_PHASE_C.md#reproduce-the-isolated-checks).
