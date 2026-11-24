# Chat Control v1.1.0 — archive management

## Decision (2026-11-25)
The owner redirected active development toward hiding archived conversations and a dedicated archive view. Permanent deletion is deferred, not implemented. No DSH core changes or destructive storage operations are permitted in this scope.

## Preserved research
- [Issue #67](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/issues/67) and [draft PR #68](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/pull/68) retain phases 01–05.
- Historical source: [immutable research revision](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/tree/6bc6bc6c006f4449cf2fa52dbc89df809addade1), branch `feature/chat-control-safe-deletion-v1.1.0`.
- Read-only candidate inspection, owner authorization, identity exclusions and disposable transaction tests remain research evidence. No verified atomic DSH session deletion/fencing contract was established. Do not merge the old draft as a completed deletion feature.

## New scope (issue #71)
- Default active view excludes archived sessions within the plugin-owned UI.
- Dedicated archived conversation view, searchable by authorized metadata, with workspace filter, counts, empty/loading/unavailable states and clear navigation.
- DSH already provides native hide/show/archived-only filtering. Confirm supported sidebar integration before claiming plugin-driven native visibility. If unavailable, document native filter and provide the dedicated plugin view; no CSS/DOM hacks or private-state mutation.
- Restore/unarchive only through a verified native API and explicit user action. If archived history cannot be opened natively, explain that limitation; do not silently unarchive or read raw logs.
- Preserve existing protection and retention settings and profile isolation. Hiding is display behavior, not an access-control or privacy guarantee. No permanent deletion, automatic archiving, filesystem or database writes for session data.

## Acceptance gates
1. Confirm documented DSH slot/navigation and session catalog contract against pinned dependencies; decide view placement based on supported APIs.
2. Reject ambiguous/unavailable catalog records; test ownership and host/profile changes without cross-profile disclosure.
3. Test active/archive transitions, search/filter, empty/loading/error, keyboard navigation, Arabic/English RTL, disable/re-enable and reconnect/restart.
4. Verify Windows/Ubuntu Node.js 22/24 CI and real disposable Desktop profile acceptance. Distinguish metadata listing from history reading and actual native sidebar behavior.
5. Bring v1.0.3 hotfix into develop through separate reviewed PR before final integration. Do not merge or release without owner approval.

This document defines scope only; no implementation or Desktop acceptance is claimed.
