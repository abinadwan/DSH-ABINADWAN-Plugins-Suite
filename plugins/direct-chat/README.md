# Direct Chat — one persistent Workspace with separate chat Sessions

The Direct Chat button below the native New Session control opens a native DSH Session under one permanent Workspace titled **Direct Chat**. Each non-blank conversation gets a different Session ID, its own log and its own agent continuation. The plugin does not fork previous Sessions, paste old transcripts into new chats or install cross-session memory/retrieval. The DSH native composer reuses an unsubmitted blank draft; after the first message, the next click creates another Session.

**Workspace registration.** The Host always returns the same profile-scoped directory: `<profile>/abinadwan-direct-chat-data/Direct Chat`. Workspace registration is idempotent by canonical path. Earlier `session-*` Workspace registrations and directories are deliberately left untouched; no automatic migration or deletion occurs.

**Critical limit:** this isolates *conversation history*, not the underlying filesystem. All new Direct Chat Sessions share the same Workspace `cwd`, because DSH Workspace membership requires that path. The existing pre-execute and dispatch tool-denial guards remain, but they are policy guards, **not a Windows LPAC or process/filesystem sandbox**. They also cover older per-chat paths. No claims of high-assurance isolation or cross-plugin confidentiality are made.

Direct Chat stays Off by default. The new-chat action is hidden unless the native permission hook grants `session/create`; history remains governed by native Host authorization. The permanent Workspace appears in DSH's existing native tree. The earlier v1.0.0 Windows Desktop checks covered the top button, one Workspace, separate Sessions, restart and a comparative tool denial. Native history acceptance covered the owner-approved 1,000-Session scope; other Host and Desktop limitations remain.

The Host guards use native Session membership when the Workspace registry is available, while retaining canonical path protection for legacy and newly created Sessions, including junctions and missing children under aliases. Recognized live agents remain denied if their registration changes. A native agent-created hook applies an empty inherited-tool allow-list to recognized Direct Chat agents. Agent-local registrations and agents already alive at plugin activation are not established as tool-definition-free; the dispatch and pre-execute guards remain necessary. Catalog discovery and creation metadata fail closed for duplicate or cross-Workspace membership, including a recheck after asynchronous metadata reads. These are plugin policy controls, not a change to DSH or a stronger isolation boundary. Prepare and catalog share validation of the Profile-owned directory. Prepare uses owner-only permissions for new POSIX directories. Both prepare and catalog refuse directories not owned by the effective user or granting group/other POSIX access, without changing existing permissions. Windows ACLs are not independently verified by this check. Prepare redacts filesystem errors and returns `Cache-Control: no-store`. Both routes use DSH owner authorization in the pinned Host fixture. [Security analysis](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/blob/98c27e87e216f11000ab92adcb79d51388031a28/docs/research/SECURITY_CODE_AUDIT_2026_11_22.md)

## DC-01 — tool visibility and execution policy

**Owner acceptance: closed with documented limitations (2026-11-26).** Direct Chat is intended for conversation rather than tool-driven tasks. The plugin reduces tool-definition visibility where supported and retains both native dispatch and pre-execute denial hooks. Full tool-definition hiding is not a security acceptance requirement by itself; exposed schemas must not disclose sensitive information. Ordinary Workspace tool access must remain unaffected.

Validation of source commit `eff59b69288f850190779ec25b2c6dc747c18cae` on installed Host 0.2.2-rc.5 found zero inherited definitions in newly recognized agents, but eight synthetic inherited definitions in an agent alive before activation and one synthetic agent-local definition before and after a model change. The separate fabricated-call retry fixture recorded one denied attempt and zero executions. Twenty local Ollama requests in the tested normal configuration contained no tool definitions, attempts or executions. These observations do not demonstrate universal prevention, sensitive-schema safety for arbitrary tools, or full Desktop acceptance. The two visibility failures remain recorded as observed against the original test criteria; they are accepted limitations under the revised criterion, not retroactive test passes.

The acceptance criterion is to reduce unnecessary tool visibility using supported DSH APIs, restrict execution with the available policy hooks, preserve ordinary Workspace behavior, and accurately document tested coverage and remaining gaps. Any demonstrated unintended execution or sensitive disclosure requires investigation. No absolute tool-denial guarantee, process isolation, filesystem sandbox, or change to DSH is claimed. This decision closes DC-01 only; DC-02, DC-06, Windows ACL validation and overall merge readiness remain separate.

[Original validation report](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/blob/3834346f96eb1b3745ee4fb42833736148300782/docs/research/DIRECT_CHAT_PHASE_3_2_MEDIUM_VALIDATION.md) · [Sanitized evidence](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/blob/3834346f96eb1b3745ee4fb42833736148300782/docs/research/evidence/direct-chat-phase-3-2-medium/results.json)

## DC-02 — profile-local identity fallback

Live native Workspace membership takes precedence for newly classified agents. On a verified positive membership lookup, the plugin remembers the Session ID using a SHA-256-named, empty marker under `<profile>/abinadwan-direct-chat-identities`. The cache is local to that profile; it stores neither conversation text, titles, paths nor raw IDs. On missing, invalid or throwing registry access, known identities are checked before the legacy cwd fallback. A successful non-Direct membership lookup for a fresh agent revokes its cached identity. Already recognized live agents retain their existing denial until recreated. Ordinary unknown agents are not globally denied during a registry outage.

Storage is best effort, uses exclusive marker creation, rejects directory aliases and non-private POSIX entries, and does not modify existing permissions. Windows ACL confidentiality is not independently established. Markers remain until an authoritative negative lookup for that ID; this is not a synchronized membership database or a security boundary against another process with profile write access. A storage failure can leave stale on-disk markers or prevent restart persistence; the in-memory classification remains valid for the current activation. An unknown Direct Chat Session with both unavailable membership and a non-Direct cwd may still escape classification. This change reduces the observed dependency on the live registry; it does not guarantee universal denial. Local installed-Host validation remains pending.

## Sidebar placement

The button is now mounted via DSH's public `sidebar.session.action` HOC immediately below the native New Session button, **above Plugins and the Workspace browser**, without replacing DSH's New Session control. It does not render at the footer. DSH exposes no public arbitrary header row seat; this is the highest supported native control region. DSH currently exposes a single native Workspace tree.

## Direct Chat history

The history action by **New Session** opens the authorized native catalog for the permanent Direct Chat Workspace. The latest activity appears first. Search matches titles and native Session IDs, with pages of 25. History opens existing Sessions and can rename through the native Session API when Archive Manager protection state is available. Requesting creation order reads metadata for up to 100 registered conversations and falls back to recent order if complete timestamps are unavailable. Archive Manager supplies scoped protection; retention previews and automatic cleanup are not exposed. The existing Workspace list and Session context menu continue to serve normal navigation and historical registrations.


## Large-history title search — measured limitation (v1.0.2-rc.3)

**Observed title-metadata availability at 10,000 Sessions: approximately 80% (81.85% in this Windows test), not a fixed capacity limit or a guaranteed success rate.** Browsing, pagination and full Session-ID search worked at all tested inventory sizes. A saved title cannot be found before opening its Session when the DSH Host supplies neither its title nor an authorized title projection; the plugin warns when title-search results may be incomplete.

| Registered Direct Chat Sessions | Titles available before opening | Title availability | Native title-search result |
| ---: | ---: | ---: | --- |
| 100 | 100 | 100% | Pass on initial and cold-restart runs |
| 1,000 | 1,000 | 100% | Pass on initial and cold-restart runs |
| 10,000 | 8,185 | 81.85% (about 80%) | Fail on initial and cold-restart runs; 1,815 saved titles were unavailable |

**Test context:** Windows x64, installed DSH Desktop/Host 0.2.2-rc.5, 2026-11-23, package 1.0.2-rc.3, isolated fictional inventories. Across six native runs (initial and cold restart at each size), 58 checks passed and 2 failed (both were the 10,000-Session pre-open title-search case). These are observed results from this environment, **not** a plugin limit of 8,000 Sessions and **not** evidence that 80% title availability can be relied upon for other inventory sizes or machines. The owner closed H04 through a supported title-search scope of 1,000 Sessions and acceptance of the high-load failure, not by fixing the Host.

[Full Windows H04 retest and performance results](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/blob/98c27e87e216f11000ab92adcb79d51388031a28/docs/DSH_DESKTOP_DIRECT_CHAT_H04_FOLLOWUP_V1.0.2_RC3.md)

