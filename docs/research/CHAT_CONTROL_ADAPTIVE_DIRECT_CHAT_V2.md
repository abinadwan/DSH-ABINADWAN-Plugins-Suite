# Chat Control, Adaptive Reasoning and Direct Chat architecture review

Baseline `206f3e814800478f961af05b673a1235ea8ba002` on main, also the published v1.0.0 revision. The primary runtime reference is the published `0.2.2-rc.3` packages and their included source. Upstream main was reviewed at [d98f5d68](https://github.com/deepseek-ai/deepseek-harness/tree/d98f5d68519215da48f3002da2cb9c9d2068d81d). Desktop distribution capability still requires testing on its actual build. The Phase A and Adaptive Reasoning handovers describe earlier proposals or experiments. The Phase 2 Direct Chat acceptance record describes the native one-Workspace implementation on main.

## Implementation status

| ID | Status | Implementation and validation |
| --- | --- | --- |
| CC-01 | Partially implemented, safely disabled | Detailed on-demand eligibility preview. No deletion execution contract. |
| CC-02 | Partially implemented, safely disabled | Profile settings, global and Workspace retention, protection, UTC dry-run. No scheduled deletion. Test all durations, stale and ambiguous data, missing metadata, and large inventories. |
| CC-03 | Blocked by verified upstream limitation | No transaction or recoverable retirement boundary. No deletion operation exists to journal. Define required recovery protocol below. |
| AR-01 | Partially implemented, safely disabled | Reuse the deterministic classifier for opt-in recommendations. Use advertised effort order only. Native application remains disabled. Test ambiguity, adversarial wording and adapter changes. |
| AR-02 | Blocked by verified upstream limitation | Keep rejecting request-scoped overrides. Verify durable selection stays intact through retry and cancellation. |
| AR-03 | Blocked by verified upstream limitation | Characterize native inheritance for in-process children. Independent plugin policy needs an authorized dispatch hook. |
| AR-04 | Implemented, pending Desktop validation | Store versioned aggregate counts under the launcher Profile with DSH atomic I/O. Test restart, concurrency, reset and invalid data without opening user Profiles. |
| DC-01 | Partially implemented, safely disabled | Preserve native New Session and Projects, add history through the supported action HOC. No second native Workspace tree. |
| DC-02 | Implemented, pending Desktop validation | Authorized, bounded metadata results via native catalog and Workspace membership. Rename through the authorized native Session API. Creation sorting uses official metadata for up to 100 members. |
| DC-03 | Partially implemented, safely disabled | Use the same Chat Control preview and retention settings. No removal of the shared Workspace or an individual Session. |
| DC-04 | Blocked by verified upstream limitation | Document tool and filesystem boundaries. Test with synthetic files and aliases. |

## Runtime evidence

- `dsh-session-persistence/src/index.ts` owns create, open, list, stat and flush. The loop and backend coordinate append, write leases and release. The JSONL backend owns generations and `dsh-session-query-sqlite` owns indexes. Neither pinned nor reviewed upstream exposes a plugin delete/restore operation across those owners. `dsh-workspace/src/index.ts` changes registry membership or archive flags. Archive/unarchive is reversible visibility and activity control, with no data removal or protection-revision precondition. Workspace delete removes a registration and can affect multiple Sessions.
- `dsh-api-session-controller/src/client/sessions/service.ts` exposes admitted catalog IDs independently of retained local/subagent rows. It provides `updatedAt` as max(creation, last prompt), and `sessionListMetadata.lastPromptAt` where projected. Pinned catalog rows omit creation time. The owner’s explicit sort request can fetch metadata-only `sessionPersistence.stat` for up to 100 known Workspace members, with at most four reads at once and a two-second deadline. Legacy JSONL lookup can inspect a wider set of generation headers through the backend, so creation order is unavailable on timeout. The native Session rename route is resource-scoped and already exposed in the Projects history action. Native Workspace projections supply canonical path and Session membership.
- `dsh-client-ui-sidebar/src/client/contract/slots.ts` declares one `sidebar.workspaces` occupant and the supported `sidebar.session.action` HOC. Replacing the current occupant would discard native Workspace behavior.
- `dsh-llm/src/types.ts` documents adapter reasoning effort IDs ordered least to greatest. Session model selection appends `model/selection`. The Session Controller submission and Agent Loop request construction offer no authorized per-message effort field with atomic dispatch and retry binding. A send-time mutation of the model would affect other admitted turns or a retry and can disagree with the logged request.
- Upstream main adds a preparation-time callback to the low-level LLM service. The pinned Session admission contract still has no plugin-carried request effort override, and the low-level callback alone does not supply Session admission or retry identity.
- `dsh-subagent/src/child-agent.ts` derives in-process child options from parent options and drops inherited effort when the requested route changes without an explicit child effort. External executors have a separate contract. The suite has no public policy registrar for all dispatches and must leave native behavior in charge.
- `dsh-app-boot/src/profile-context.ts` supplies the launcher-owned Profile directory. Default storage-domain JSON uses a Harness home path and has no cross-process writer lock. `dsh-atomic-write` supplies local, same-PID-namespace atomic replacement and advisory locking suitable for a dedicated profile-local aggregate file.

## Compatibility and storage

Existing v1.0.0 retention settings acquire an empty Workspace-protection list when read through the same namespace. Existing conversation protection, retention values, and reasoning preferences are preserved. Main's statistics only existed in process memory, so earlier Host processes have no durable statistics file to migrate. The new versioned aggregate file lives in the launcher Profile directory. Unknown or corrupted formats are preserved and produce an unavailable state for statistics. The new write path serializes same-machine profile writers, excludes pre-reset batches, and never replays a write with an uncertain outcome. Atomic replacement cannot guarantee survival of power loss. Up to one batching interval of recent unflushed counts can be lost during sudden termination. Windows permissions rely on the existing Profile ACL. Shared disks across different PID namespaces and writers with control over the Profile directory are outside the locking guarantee.

## Direct Chat threat model

Separate native Session IDs partition histories. The working directory and Host process identity remain shared. A provider-generated tool request, another Workspace with broader permissions, or a third-party plugin running in the Host is a distinct principal or execution route. The suite tool-denial hooks reduce available routes for Direct Chat while active. They do not restrict the OS access of a process that already has access to the shared files.

POSIX symlinks and Windows junctions can alias paths. Hard links can share a file object across differently named locations, and canonical path checks alone cannot address handle substitution, mount points, or path changes between checks and access. The current Host owns its filesystem permissions. A future design must account for all tool routes, attachment handles, subprocess inheritance, inherited environment and network channels. Identifiers and existing Workspace memberships must survive restart and upgrade, and any migration must preserve the old history and files until explicitly approved.

| Approach | Trade-off |
| --- | --- |
| Per-Session cwd or Workspace | Organizes files. Access still follows the executing process's permissions. Changes navigation and risks breaking saved identities. |
| Native tool restrictions | Existing supported mitigation. Host code, other Sessions, providers and unmediated processes are outside this boundary. |
| Host-owned broker and restricted process | Could implement capability-checked handle operations with OS enforcement. Windows requires deliberately scoped tokens/ACLs and junction/reparse handling. POSIX requires platform-specific namespace or sandbox support; a cwd and mode bits under one account are insufficient. Needs design review, portability testing and separate approval for dependencies. |

Draft [PR #33](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/pull/33), head `8bc384578f5ddee1765f9b15f0c8c7db626f713d`, separately hardens alias admission, path logging and My Profile disclosure. This branch uses a read-only Direct Chat discovery path and preserves the existing prepare and tool guards. The original guard limitations remain relevant until the separate changes are integrated and validated. Both branches touch the Host entry point and its tests, so a future integration needs to retain the hardening and the additional catalog route.

## Upstream changes required

- Session retirement needs an owner-scoped transaction conditioned on authoritative Workspace membership, protection revision, activity and expected Session revision. It must fence new admissions and coordinate writers, indexes, generations, attachment references, forks and descendants. Provide replayable operation IDs, per-Session receipts, explicit cancellation semantics, and documented trash/restore or irreversible outcomes. A future journal should keep only opaque operation/Session identities, revision and outcome codes, reconcile receipts after interruption and never retry an ambiguous deletion blindly. A cleanup scheduler must also provide one Profile lease and lifecycle cancellation.
- Expose request-scoped effort at authorized admission. Bind the override to an immutable request identity and exact provider/model, propagate only to defined retries, and include effective effort in the normal request header. Add an authorized pre-dispatch subagent capability policy with explicit route, nesting, external runner and cancellation semantics.
- Expose scoped Workspace grouping in the sidebar, catalog creation time and a catalog failure state. For real filesystem isolation, supply a stable per-Session security context with mediated attachment and tool access and an explicit OS confinement capability.

## Desktop acceptance still required

Use disposable Profiles. Verify New Session and Projects keyboard navigation in wide and collapsed layouts, Arabic/RTL and light/dark themes. Open and rename an existing historic Direct Chat through native navigation, reconnect and restart, and verify IDs and permissions. Verify retention previews across reconnect, protection changes and a v1.0.0 upgrade. Verify recommendation mode on model switch, unsupported routes and manual effort, then restart and reset aggregate statistics. On Windows test canonical paths and junctions with synthetic data, and verify the native Host guard across actual tool routes. No filesystem sandbox or destructive restoration acceptance is claimed.
