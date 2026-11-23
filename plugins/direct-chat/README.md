# Direct Chat — one persistent Workspace with separate chat Sessions

The Direct Chat button below the native New Session control opens a native DSH Session under one permanent Workspace titled **Direct Chat**. Each non-blank conversation gets a different Session ID, its own log and its own agent continuation. The plugin does not fork previous Sessions, paste old transcripts into new chats or install cross-session memory/retrieval. The DSH native composer reuses an unsubmitted blank draft; after the first message, the next click creates another Session.

**No more `session-*` Workspace per click.** The Host always returns the same profile-scoped directory: `<profile>/abinadwan-direct-chat-data/Direct Chat`. Workspace registration is idempotent by canonical path. Earlier `session-*` Workspace registrations and directories are deliberately left untouched; no automatic migration or deletion occurs.

**Critical limit:** this isolates *conversation history*, not the underlying filesystem. All new Direct Chat Sessions share the same Workspace `cwd`, because DSH Workspace membership requires that path. The existing pre-execute and dispatch tool-denial guards remain, but they are policy guards, **not a Windows LPAC or process/filesystem sandbox**. They also cover older per-chat paths. No claims of high-assurance isolation or cross-plugin confidentiality are made.

Direct Chat stays Off by default. The permanent Workspace appears in DSH's existing native tree. The earlier v1.0.0 Windows Desktop checks covered the top button, one Workspace, separate Sessions, restart and a comparative tool denial. The consolidated history and Host changes still require Desktop acceptance.

The Host guards canonicalize paths, including junctions and missing children under aliases. Prepare and catalog share validation of the Profile-owned directory. Prepare uses owner-only permissions for new POSIX directories, redacts filesystem errors and returns `Cache-Control: no-store`. Both routes use DSH owner authorization in the pinned Host fixture. [Security analysis](../../docs/research/SECURITY_CODE_AUDIT_2026_11_22.md)

## Sidebar placement

The button is now mounted via DSH's public `sidebar.session.action` HOC immediately below the native New Session button, **above Plugins and the Workspace browser**, without replacing DSH's New Session control. It does not render at the footer. DSH exposes no public arbitrary header row seat; this is the highest supported native control region. DSH currently exposes a single native Workspace tree.

## Direct Chat history

The history action by **New Session** opens the authorized native catalog for the permanent Direct Chat Workspace. The latest activity appears first. Search matches titles and native Session IDs, with pages of 25. History opens existing Sessions and can rename through the native Session API when Chat Control protection state is available. Requesting creation order reads metadata for up to 100 registered conversations and falls back to recent order if complete timestamps are unavailable. Chat Control supplies retention settings, protection labels and dry-run previews. The existing Workspace list and Session context menu continue to serve normal navigation and historical registrations.


## Large-history title search — measured limitation (v1.0.2-rc.3)

**Observed title-metadata availability at 10,000 Sessions: approximately 80% (81.85% in this Windows test), not a fixed capacity limit or a guaranteed success rate.** Browsing, pagination and full Session-ID search worked at all tested inventory sizes. A saved title cannot be found before opening its Session when the DSH Host supplies neither its title nor an authorized title projection; the plugin warns when title-search results may be incomplete.

| Registered Direct Chat Sessions | Titles available before opening | Title availability | Native title-search result |
| ---: | ---: | ---: | --- |
| 100 | 100 | 100% | Pass on initial and cold-restart runs |
| 1,000 | 1,000 | 100% | Pass on initial and cold-restart runs |
| 10,000 | 8,185 | 81.85% (about 80%) | Fail on initial and cold-restart runs; 1,815 saved titles were unavailable |

**Test context:** Windows x64, installed DSH Desktop/Host 0.2.2-rc.5, 2026-11-23, package 1.0.2-rc.3, isolated fictional inventories. Across six native runs (initial and cold restart at each size), 58 checks passed and 2 failed (both were the 10,000-Session pre-open title-search case). These are observed results from this environment, **not** a plugin limit of 8,000 Sessions and **not** evidence that 80% title availability can be relied upon for other inventory sizes or machines. H04 remains open; the five earlier blocked cases and MP02 are separate.

[Full Windows H04 retest and performance results](../../docs/DSH_DESKTOP_DIRECT_CHAT_H04_FOLLOWUP_V1.0.2_RC3.md)

[Capability and security review](../../docs/research/CHAT_CONTROL_ADAPTIVE_DIRECT_CHAT_V2.md)
