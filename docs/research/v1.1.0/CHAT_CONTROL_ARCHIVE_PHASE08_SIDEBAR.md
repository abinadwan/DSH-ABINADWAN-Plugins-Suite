# Phase 08 — native sidebar and full-page archive hub

This candidate extends PR #72 from `05ea144ce0725be43f7808aaa8e3d1a95fc16a24`. Existing archive behavior and previous acceptance remain documented in the implementation report; this layout change requires new verification.

- Register a fresh `sidebar.panellist` id and the matching root `main` keyed slot using the documented native contracts. The shell owns selection, More pinning, and panel retirement. No DSH core change.
- Move the existing authorized archive hub into the scrollable main panel; retain Chat Control settings and a navigation hint. No duplicate settings modal. Search, filter, pagination, access checks and restore ordering are unchanged. The native sidebar archive filter remains a native preference.
- Use a localized Archives label and archive icon. The authorized total is shown on the page, not as a separate background sidebar count (avoid extra metadata reads).
- [Sidebar contract](https://github.com/deepseek-ai/deepseek-harness/blob/2e39e704/packages/client/ui-sidebar/README.md) · [Layout contract](https://github.com/deepseek-ai/deepseek-harness/blob/2e39e704/packages/client/ui-layout/README.md).

## Verification gates

Existing archive React tests now mount the native main panel and assert it is not a modal. A lifecycle regression covers registration, removal and re-enable. Run the full CI matrix. Local Node dependency installation and Desktop execution are unavailable in this chat environment; the final candidate still requires isolated Desktop acceptance of sidebar visibility, More/pin, active-panel removal, theme/RTL, resize, keyboard and authorized restore before merge. Do not treat the prior modal's Desktop acceptance as this page's acceptance. Keep PR #72 draft and the v1.0.3 integration prerequisite unchanged.
