# Direct Chat — native Workspace bridge (Phase 2 experimental)

This feature branch addresses the real DSH Desktop failure `Choose a workspace to start`. The previous native-only Session was persisted but could not start a turn, because DSH 0.2.x requires a registered Workspace for its blank-session composer.

## New lifecycle

1. The authenticated Host route `/api/abinadwan-direct-chat/prepare` provisions a fresh, unique directory under the active profile's `abinadwan-direct-chat-data` root. It does **not** create a blank Session.
2. The Client calls the documented `ctx.workspaces.create({ path })` to register the temporary Workspace.
3. The Client calls `ctx.uiWorkspace.connectWorkspace(workspaceId)` and `openSession(sessionId)`. DSH owns the Session record, storage and native composer.
4. While the Session is blank, its Workspace stays registered so the native composer can send the first message.
5. When the Sessions list confirms `blank === false`, the Client calls `ctx.workspaces.delete(workspaceId)` to remove **only the registration**. DSH retains the Session, its log and directory, placing the conversation under Ungrouped. Do not delete its files as part of Workspace removal.
6. A failed connection without a Session rolls back the temporary Workspace registration.

This approach follows documented public DSH Workspace services and an independently published projectless-session proof of concept, but our Desktop version has **not** been tested yet.

## Important limits

- **Not a truly hidden Workspace.** The temporary registration may appear in the native Workspace browser until the first prompt has been accepted; it is then removed. DSH's public Workspace record has no supported `hidden` flag.
- Blank Sessions abandoned before first send, including after app restart, need a reviewed recovery strategy. The current prototype does not automatically delete them, to avoid destroying user data.
- Direct Chat history is retained in native DSH storage and appears under Ungrouped after detachment. A separate Direct Chat history UI and permanent deletion are future work.
- Denying tools at `tools/pre-execute` and `tools.guard` is **not** a sandbox or Windows LPAC process boundary. Tools must be audited against actual DSH Desktop before user data is entrusted to this implementation.
- The previous native-only PoC Session history is neither deleted nor migrated by this change.
- The component remains disabled by default. Do not merge into `develop`, enable by default or publish as production until native Windows testing and security acceptance succeed.

## Acceptance tests

- Button creates a fresh directory and DSH-owned temporary Workspace; no Workspace picker is required.
- Send a message using the real native composer and receive the model's reply.
- After first accepted prompt, the temporary Workspace registration disappears while the Session continues under Ungrouped.
- Resume after a full Desktop restart; inspect orphan blank Sessions and profile cleanup.
- Re-test tool restrictions, file access, plugin disable/uninstall, and failure handling on Windows.
