# Direct Chat — one persistent Workspace with separate chat Sessions

The Direct Chat footer opens a native DSH Session under one permanent Workspace titled **Direct Chat**. Each non-blank conversation gets a different Session ID, its own log and its own agent continuation. The plugin does not fork previous Sessions, paste old transcripts into new chats or install cross-session memory/retrieval. The DSH native composer reuses an unsubmitted blank draft; after the first message, the next click creates another Session.

**No more `session-*` Workspace per click.** The Host always returns the same profile-scoped directory: `<profile>/abinadwan-direct-chat-data/Direct Chat`. Workspace registration is idempotent by canonical path. Earlier `session-*` Workspace registrations and directories are deliberately left untouched; no automatic migration or deletion occurs.

**Critical limit:** this isolates *conversation history*, not the underlying filesystem. All new Direct Chat Sessions share the same Workspace `cwd`, because DSH Workspace membership requires that path. The existing pre-execute and dispatch tool-denial guards remain, but they are policy guards, **not a Windows LPAC or process/filesystem sandbox**. They also cover older per-chat paths. No claims of high-assurance isolation or cross-plugin confidentiality are made.

This version shows **Direct Chat** under the standard DSH Workspaces browser. The separate **Direct Chat** and **Projects** top-level sidebar sections are a later UI change and are not yet implemented. The component stays Off by default. Native Windows Desktop send/receive, restart, guard coverage, and history independence need acceptance testing before merging to `develop`.
