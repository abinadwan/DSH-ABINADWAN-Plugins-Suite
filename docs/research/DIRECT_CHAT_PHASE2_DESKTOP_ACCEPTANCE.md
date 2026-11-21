# Direct Chat Phase 2 — Desktop acceptance plan

Target branch: `feature/direct-chat-hidden-workspace-phase2`. Parent: `develop` after PR #24.

## Technical boundary

DSH's blank native composer requires a registered Workspace. The Phase 1 implementation created and flushed a Session with only an unregistered `cwd`, so the UI displayed **Choose a workspace to start**. Phase 2 uses documented Client calls `workspaces.create({ path })` and `uiWorkspace.connectWorkspace(workspaceId)`, then removes only the Workspace registration once the first prompt is accepted. This is an experiment based on the publicly documented Workspace contract and the projectless-session pattern.

**Not solved:** the public Workspace record has no `hidden` property. The temporary Workspace can be visible before the first send; it does not currently meet the strict requirement for an invisible internal Workspace. Do not claim otherwise. Removing the registration can move the Session under Ungrouped. An abandoned blank chat can leave a temporary visible registration. No cleanup process runs on restart yet, because deleting user data or silently archiving sessions requires further review.

## Tests to perform in disposable Windows DSH Desktop profile

1. Install exact feature-branch commit using a pinned SHA, confirm Source matches it. The component stays Off initially.
2. Enable Direct Chat and click its footer button. Confirm no Workspace picker is presented, the native composer becomes enabled and an independent temporary Workspace is registered.
3. Send `Hello` using a test model/account. Confirm a native model reply appears. Stop testing if any tool starts, if there is a request for file-system access, or if the session immediately asks to choose Workspace.
4. Confirm the temporary Workspace registration disappears **after** the first accepted prompt, without deleting the Session or its log; the conversation should appear in Ungrouped.
5. Create a second Direct Chat. Confirm its session directory differs from the first and the first conversation remains intact.
6. Restart Desktop; confirm both non-blank conversations can be opened and continued. Check that existing normal Workspaces and their sessions are unchanged.
7. Abandon a blank Direct Chat without sending. Record whether its temporary Workspace remains visible across navigation/restart. Do not delete test records until inspected.
8. Attempt a harmless built-in tool call in a disposable test profile to verify denial. A passing unit guard test does not prove that every native Desktop execution path is restricted.
9. Disable Direct Chat; confirm its button disappears and normal Workspace sessions remain functional.

## Acceptance gate

Do **not** merge this feature branch into `develop` or claim production readiness until the Windows Desktop integration tests, clean storage/restart behavior, incomplete chat recovery, and tool/security review pass. A truly hidden Workspace may require a supported DSH upstream feature or a noninvasive UI extension; do not patch private DSH internal stores or write Workspace database files directly.

## Upstream source references

- [DeepSeek Harness Workspace Controller](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/api/workspace-controller/README.md)
- [DeepSeek Harness Workspace model](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/workspace/workspace/src/types.ts)
- [Projectless-session lifecycle reference](https://github.com/jarvisluk/dsh-projectless-session/blob/main/README.md)

## History

Phase 1 previous CI success, source checks, and limited native Desktop failure evidence: [Direct Chat Phase 1](DIRECT_CHAT_GLOBAL_CHAT_PHASE1.md). The original LPAC companion remains in repository history before PR #24; it is not in this code path.
