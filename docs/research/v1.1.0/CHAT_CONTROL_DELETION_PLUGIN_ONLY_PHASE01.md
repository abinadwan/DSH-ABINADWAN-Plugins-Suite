# Chat Control v1.1.0 — Phase 01: plugin-only archive cleanup

**Status:** Implementation candidate on a feature branch, pending CI and review. **No Session deletion enabled.** Stable `v1.0.2` remains unchanged.

## Owner architecture constraint

All new product code belongs to `abinadwan/DSH-ABINADWAN-Plugins-Suite`. **Do not edit, fork/patch, or replace DeepSeek Harness (DSH) core modules.** The plugin may integrate with *public, supported, owner-authorized DSH Host services*; those services are dependencies, not code modifications.

## Source-grounded deletion boundary

The DSH `SessionPersistence` abstract API exposes `create`, `open`, `flush`, `stat`, `list` but **not** `delete`. This is explicit in `packages/session/session-persistence/src/index.ts` and the persistence README. The default JSONL provider also explicitly says that files accumulate until removed externally, and SQLite has separate Segment/event storage and migration semantics. `WorkspaceRegistry.delete(workspaceId)` removes the Workspace registration **without deleting Session histories**, so it must never be used as Session deletion. Archive/unarchive changes visibility and activity lifecycle, not stored history. Full-text search keeps a separate derived SQLite index; attachments are content-addressed, potentially shared and deliberately retained.

References:
- [DSH SessionPersistence contract](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/session/session-persistence/src/index.ts)
- [DSH JSONL persistence](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/session/session-persistence-jsonl/README.md)
- [DSH SQLite persistence](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/session/session-persistence-sqlite/README.md)
- [DSH Workspace registry](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/workspace/workspace/README.md)
- [DSH derived search index](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/session-query/session-query-sqlite/README.md)
- [DSH shared attachments](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/attachment/attachment-local/README.md)

There is no verified user-authorized atomic Session delete contract in the inspected upstream source. The current user-approved requirement is to **implement the feature entirely inside the plugin** without modifying DSH core. Hence no system file deletion, SQL row deletion, Workspace registry mutation or dynamic upstream patch is permitted in Phase 01. A plugin-only engine may be evaluated in subsequent stages only if it proves the full necessary storage/lock/index/registry/attachment/recovery lifecycle on the installed Host. If that cannot be proven, **report the inability rather than simulate deletion**.

## This phase implements

1. An independent **Preview archived cleanup** action inside the existing Chat Control Settings UI.
2. Snapshot-only candidate classification; all archived (including recently archived) can be previewed without changing the retention policy. No filesystem paths or chat contents are read.
3. Exclusions: protected Session or Workspace, pinned, running, retained, migrating, Direct Chat (separate ownership check required), subagent/dependent Session, ambiguous membership or unadmitted Session. A malformed archive/protection snapshot disables the preview.
4. Clear disclaimer in UI: the preliminary list is not an executable deletion plan; no permanent-delete action, automatic timer or approval recording exists.
5. Source-predicate and mounted React tests for archive-only behavior, protection, ambiguity and zero mutation.

## Subsequent execution gate (not implemented)

Before enabling even single deletion:
- Authenticate the local owner/Profile/authorization on the Host. Bind confirmation to the exact selected IDs, connection generation, catalog and settings revision.
- Recheck ongoing turns, jobs, schedules, subagents, open writers and other connected clients under an exclusion fence.
- Identify persistence backend (JSONL or SQLite), legacy generations, forks and dependencies, Workspace membership, pin/archive state, search index and shared attachment references. Do not derive deletion paths from user-controlled Session IDs.
- Design a plugin-owned *recoverable* transaction with power-loss recovery and idempotent per-ID status; prove no stale views, orphaned references or silent cross-Session deletion.
- Measure bytes with a supported file/storage observation and report only confirmed reclaimed bytes, noting retained shared attachments and other generations.
- Test on a **disposable DSH Desktop Profile** with fictional data; verify restart, crash/fault recovery and no collateral changes. If any gate is absent, the delete control must remain unavailable.
- Expand to selected bulk and empty archive only after single-item deletion succeeds; auto-cleanup is separate explicit opt-in.

**Do not call any preliminary preview result a real deletion or a native deletion acceptance Pass.** Keep stable `main` and `v1.0.2` untouched.
