# Direct Chat Phase 2 — one Workspace and isolated chat histories

**Historical feature branch:** `feature/direct-chat-hidden-workspace-phase2` (merged into `develop` in [PR #25](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/pull/25), then deleted). This document retains its original acceptance checklist as historical test context; current status is recorded below.

## Intent and verified contracts

The user wants one stable DSH Workspace labelled **Direct Chat**, not an automatically created Workspace called `session-*` on each click. Each conversation must have its **own Session ID, messages, and independent agent context**, with no transcript forwarding between sessions. User-created Workspaces should remain separate and unchanged.

The Host always returns the same canonical path `<active profile>/abinadwan-direct-chat-data/Direct Chat`. The Client uses the public idempotent `workspaces.create({ path })` method and `uiWorkspace.connectWorkspace(workspaceId)`. The latter intentionally **reuses only a still-blank Session**; after the prompt is accepted, a new call creates a different native Session. DSH stores Session logs independently. The plugin does not fork from previous chats, import chat histories, or install cross-session memory.

**Security boundary:** DSH's Workspace registration accounts only Sessions whose cwd matches its canonical Workspace directory. Therefore a single Workspace means **one shared filesystem cwd**. Separate conversation logs are not equivalent to filesystem/process isolation, and no high-assurance guarantee that other plugins or Agent presets cannot access shared files is made. The plugin's tool-denial pre-execute/guard hooks need actual Desktop testing. The old LPAC sandbox is not present.

The separate top-level sidebar layout **Direct Chat** / **Projects** is not implemented; this patch shows Direct Chat as a Workspace within DSH's native Workspaces browser. Do not claim otherwise.

Previous per-chat `session-*` directories and Workspace registrations from the temporary-Workspace version are intentionally preserved. They are **not** auto-migrated, renamed, detached, or deleted.

## Acceptance checklist (disposable Windows Desktop profile)

1. Verify the installed plugin is pinned to the tested feature commit and is initially Off.
2. Confirm the Direct Chat action appears directly beneath New Session, **not at the bottom**. Enable it and click Direct Chat three times **without sending**. Confirm only a single Workspace titled `Direct Chat` exists; no new `session-*` directories appear. The same blank Session should reopen.
3. Send `Hello` and receive a model response. Reopen Direct Chat. Confirm a **new Session ID** appears under that same Workspace with an empty message history.
4. Have the second Session discuss an unrelated topic. Confirm no text from the first Session appears in the new agent input or generated answer, beyond normal global model/profile instructions.
5. Return to Session 1 and verify its messages remain intact; restart Desktop and verify both Sessions resume from their own histories.
6. Verify existing user Projects and pre-existing experimental `session-*` registrations stay untouched. Do not delete those directories as part of this acceptance test.
7. Use harmless fixture files to audit attempts at shell, file and workspace tools while Direct Chat is selected; the authorization hooks must deny them.
8. Disable Direct Chat. Its footer action must disappear, but its Workspace and native conversations must remain intact.

## Owner acceptance outcome (2026-11-21)

The owner accepted Phase 2 for `develop` after Windows Desktop testing:
- PASS: Direct Chat action directly below New Session.
- PASS: one permanent Workspace rather than one new Workspace per click.
- PASS: independent native Sessions, preserved messages across restart.
- PASS: existing Projects/workspaces were unaffected.
- PASS (behavioral): the same cloud model executed PowerShell `pwd` via `Ran commands` in a normal Workspace and returned **`Error: Direct chats do not run tools.`** in Direct Chat.
- NOT VERIFIED / EXPLICITLY DEFERRED: a full Host request-trace proving absence of other Sessions' context, exhaustive tool-route authorization, and filesystem/process isolation. A prior standalone context-recall test was not used because DSH does not automatically search other Session histories.
- No auto-migration or deletion of earlier experimental `session-*` paths occurred.

The owner explicitly authorized proceeding without those deeper tests. **Accepted for development integration is not equivalent to verified high-assurance isolation or approval for a stable release.**

## Remaining work after merge

- Deep Host request-trace, cross-session authorization, filesystem boundaries and any remaining Desktop security coverage are deferred and still open.
- True independent per-chat filesystem isolation is not part of this single-Workspace architecture; redesign if required.
- Dedicated Direct Chat vs Projects top-level sidebar grouping.
- Safe handling of existing experimental records, including optional migration and user-approved deletion.
- Permanent conversation deletion and retention UI.

## Upstream contracts

- [Workspace registration and membership](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/workspace/workspace/README.md)
- [Session Controller client](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/api/session-controller/src/client/sessions/service.ts)
- [UiWorkspace navigation](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/client/ui-workspace/src/client/navigation.ts)

## Top-button placement check

The only supported slot directly near the top New Session control is the public `sidebar.session.action` HOC; it wraps and preserves DSH's native New Session element, then renders the Direct Chat action underneath. This is above the global Plugins/Projects navigation area, not a private DOM patch. Ensure the collapsed sidebar renders both controls and the footer has no Direct Chat duplicate.
