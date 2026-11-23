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

## Phase 02 — Host read-only storage verification (implemented on this feature branch)

The plugin now registers an owner-only, local DSH Connection Fetch route at
`POST /api/abinadwan-chat-control/inspect`. Only the **user-authorized owner Peer** may
call it; viewers are refused by the Host connection boundary. Requests are
strictly limited to a set of 1–20 unique, validated Session IDs in a small
JSON body. The route does not accept file paths, a delete flag or a mutation
intent.

**What the server actually checks:**

- Exact one-to-one Workspace membership from `workspaceRegistry.list()`;
  invalid or duplicate registry entries fail closed.
- Current archival and pin flags from the Host registry, plus the plugin's
  stored protected Session/Workspace policy.
- A metadata-only `sessionPersistence.stat(id)` lookup for the exact ID.
  Missing artifacts, migration-required formats and subagent/fork-derived
  records cannot pass this preliminary check.
- The catalog/protection snapshot is rechecked after asynchronous reads and
  a changed result returns a conflict; unknown storage errors return a
  generic unavailable response, not an absolute path or raw exception text.
- When the backend exposes `sizeBytes`, the UI may show the **stored
  per-Session artifact size only**. This is **not** measured disk recovery:
  shared attachments, legacy generations and derived SQLite indexes are
  outside that number.

Every returned row has `deletable: false` and the response has
`executable: false`. The best possible result is
`requires-deletion-transaction`; it explicitly means that the Host has
**no verified authorized transaction** to execute deletion. The button
**Inspect archived candidates with Host** in Chat Control runs this
read-only request after the user opens the archived preview. The request
does not change profile settings, archive state or Session history.

Tests include malformed requests, duplicated IDs, protected and absent
rows, changed registry/policy, JSONL-style metadata, owner-vs-viewer
admission through the *native* pinned DSH Connection service, route disposal,
and mounted React UI. See
`plugins/conversation-lifecycle/inspect.js`,
`test/chat-control-inspect.test.js`,
`qa/chat-control-inspect-host-check.mjs` and
`test/new-plugins-settings.test.js`.

**Open architectural blocker:** No public atomic deletion operation exists
in the observed DSH SessionPersistence/Workspace lifecycle contract.
A plugin-only transaction design must still prove safe synchronization
with the *Host-owned* in-memory membership, archive and persistence state.
A filesystem unlink alone is not a valid solution, and this stage does
not take any destructive action.

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
