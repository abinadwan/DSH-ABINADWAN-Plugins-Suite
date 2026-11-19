# Phase D3: companion confinement, upstream review and message-bound effort

All work is on `integration/suite-v0.8`. Nothing is pushed. The product package is unchanged (60 published files). Direct Chat stays QA-only.

## Outcome

| Blocker | Before | Now |
|---|---|---|
| Direct Chat process confinement | Ordinary user token, addons allowed | **Resolved for the QA fixture.** The companion runs as an LPAC AppContainer with one capability (`registryRead`). It has dedicated storage, no network, and no child processes, and runs in a kill-on-close Job. Verified natively on rc.3 and rc.5 and on isolated rc.3 Desktop. |
| Next-message effort override | Blocked: no message-bound admission | **Native contract proven on rc.3 and rc.5.** UI binding is not built yet. See [message-bound effort](#message-bound-reasoning-effort). |
| Permanent deletion and retention execution | Blocked | **Still blocked.** No upstream contract on any ref, and the reviewed plugins don't meet the requirements. |
| Matching rc.5 Desktop | Unavailable | **Still unavailable.** The public repository publishes no Windows Desktop rc.5 build. |

## AppContainer companion

### Design

```
Desktop Host (owner-authenticated fixture routes, provider broker)
  └─ launcher.mjs  (unconfined Node, ~42 MiB, resident only to mirror exit codes)
       │ CreateProcessW + STARTUPINFOEX:
       │   SECURITY_CAPABILITIES  = per-user profile SID, capabilities: registryRead
       │   ALL_APPLICATION_PACKAGES_POLICY = opt-out (LPAC)
       │   CHILD_PROCESS_POLICY   = restricted
       │   HANDLE_LIST            = the launcher's stdin/stdout/stderr pipes only
       │   Job: kill-on-close, active processes = 1, 1 GiB memory, die on unhandled exception
       └─ worker.js  (confined Node, ~81 MiB) ── NDJSON frames over the inherited pipes
```

- **Bindings.** These are `koffi` calls from the Harness runtime itself (`appcontainer.js`), so no new dependency is added.
- **No administrator rights.** The profile is per user (`CreateAppContainerProfile`). Grants are inheritable ACEs that `icacls` adds only on directories the user owns: read and execute on the runtime, Node and fixture, and modify on the storage root. `cleanup-appcontainer.mjs` revokes the grants and deletes the profile. Nothing system-wide changes.
- **Fail closed.** If profile, grant or creation steps fail, the launcher exits with code 86 and starts no process. The fixture records `confinementFailed`. No `fork` path remains.
- **Authenticated channel.** The child holds only the inherited pipe handles. There is no named pipe, socket or listener to connect to. The parent still applies its owner-authenticated routes and expiring Peer leases.
- **Provider access is parent-owned.** The child has no network capability, and the parent's native adapter executes model calls.

### Compatibility findings

1. **libuv pipe creation hangs (`nodejs/node#66374`).** Bundled Node `24.21.0` ships libuv `1.52.1`. Inside an AppContainer, libuv's `CreateNamedPipe` for child stdio or IPC is refused, and libuv retries forever. Reproduced here: a confined `spawnSync` with piped stdio burned 154 CPU-seconds until the Job was closed. The design avoids it: the confined process never creates pipes and only opens inherited handles. The worker also replaces every `child_process` entry point with a throwing stub before Harness modules load. Upstream `master` still pins Node 24.21.0.
2. **Console host.** Console processes started with `CREATE_NO_WINDOW` need a `conhost.exe` child, which the child-process policy blocks (`0xC0000142`). The launcher uses `DETACHED_PROCESS`.
3. **Environment.** AppContainer creation fails (error 203) unless `LOCALAPPDATA` is present. Windows redirects it into the package folder. The child receives seven variables.
4. **LPAC.** Without a capability, Winsock initialisation fails (`WSAStartup` 10107), and libuv always initialises Winsock. `registryRead` alone is enough. Regular AppContainer also works and is the documented secondary option. Restricted Token + ACLs was not needed.
5. **Ancestor traversal.** Node module resolution and the native JSONL writer `stat` every ancestor from `C:\`. A confined process gets `EPERM` there, so module loading failed and transcripts were silently never written. `C:\` and `C:\Users` can only be changed by an administrator. Fixes:
   - `--preserve-symlinks` and `--preserve-symlinks-main` avoid the module-resolution walk.
   - A scoped worker shim reports strict ancestors of the storage root as directories, and only when the real `stat` is refused.
   - Before every launch the parent checks that the root is an existing canonical directory with no reparse points (`realpath.native`).
   - The shim grants no access. Every other path and every non-permission error is unchanged.
6. **`koffi`.** It loads under LPAC, and the JSONL writer's `Local\` named-semaphore lease works. AppContainer redirects that name into its own namespace.

### Verification

`qa/direct-chat-appcontainer-check.mjs` passed 3/3 on rc.3 and 3/3 on rc.5. It needs `ABINADWAN_TEST_RUNTIME` and `ABINADWAN_TEST_NODE`.

- **Allowed:** the confined child reads its runtime, reads and writes its own storage, and loads `koffi`.
- **Refused:** reading a sibling canary, the repository `README.md` and `package.json`; listing denied folders; writing to the denied folder, the repository and the storage root's parent; loopback and internet TCP (`EACCES`); and process creation. No escape files appeared.
- **End to end:** the confined worker streams a turn through a parent broker and writes native JSONL. It refuses a caller-chosen directory, a terminal request, a non-text prompt and an unowned session. It shuts down with code 0, restarts and lists the session from disk.
- **Kill:** killing the launcher closes the Job, which terminates the child.
- **Fail closed:** a confinement failure exits 86 without a companion.

Isolated Windows Desktop `0.2.2-rc.3` ran with the confined fixture:

- The panel opened, the in-panel authenticated carrier check passed, and existing chats resumed from JSONL that an unconfined run had written.
- A confined turn reached the loopback provider authenticated, with `high` effort and 0 tools.
- Lease expiry was followed by idle shutdown with exit 0.
- Killing the confined child produced an `exit` record with `requested:false`. The panel reconnected to a new confined child (startup 299 ms), and a new chat completed a turn.
- Desktop **Exit** with the panel open disposed the worker and exited with 0.
- All four synthetic Workspace transcript hashes were unchanged.
- Screenshots: [confined turn](../assets/integration-v0.8/direct-chat-appcontainer-turn.jpg) · [after a forced child exit](../assets/integration-v0.8/direct-chat-appcontainer-recovered.jpg)

| Measure (rc.3, Windows) | Unconfined fork (D2) | AppContainer LPAC |
|---|---:|---:|
| Startup, including launcher and grant checks | 174–208 ms | 288–376 ms |
| Companion working set | 130–135 MiB | 80–81 MiB |
| Launcher working set | — | 42 MiB |
| Idle CPU over 2 s | 0 | 0 |

Remaining limits:

- System files that `ALL RESTRICTED APPLICATION PACKAGES` may read, such as `C:\Windows\win.ini`, stay readable. This is the Windows default.
- The 42 MiB resident launcher could be removed by having the Host wait on the process handle itself.
- Soak and sleep/resume behaviour have not been measured.
- Productization still needs owner approval of this design.

## Upstream review

The local Harness clone fetched all tags and `master` on 2026-11-19, without touching the installed Desktop.

- **Refs.** `rc.3` is `38a6a5c`, `rc.4` is `3f321d3` (2026-11-17), `rc.5` is `9c2670d` (2026-11-18), and `master` is `2e39e70` (2026-11-18). The public repository has a single branch. Master diverges from the rc.5 release branch by about 5,500 files of mainline development. That was reviewed for the blocker areas.
- **rc.3 → rc.5.** 13 commits: release bookkeeping, LiveShare tunnel and clock fixes, and DeepSeek content-safety switches. None touches deletion, persistence contracts, confinement, client authentication or effort capture.
- **Deletion and persistence.** On `master`, `SessionPersistence` still exposes only `create`, `open`, `flush`, `stat` and `list`, with no delete or retire. `api-session/removed` fires on in-memory disposal. New on master but not a deletion contract: an opt-in SQLite provider, `ArchivedSessionGate` (archived sessions run no model step), and Workspace-root session binding.
- **Sandbox and process isolation.** There is no AppContainer support on any ref. Master's sandbox changes concern tool policy admission. The Node pin stays at 24.21.0 (libuv 1.52.1).
- **Client authentication and plugin APIs.** Master moves several page-global settings to synced Config (`3c0cef3`). The upload client still reads `__DSH_FILE_UPLOAD__` or the document base, so Direct Chat attachments still need their own carrier.
- **Model selection.** `SessionPromptRequest` has no effort field on any ref, and `ModelSelection` is session-level. `agent/inbox/claimed` is unchanged and emitted before capture on all three refs. See the next section.
- **Discussions.** None of #13764 (bundle reconciliation on upgrade), #13766 (`session/cancel` request), #13634 (plugin seams, including a `deleteSession` request) or #13698 (model switches ignored mid-retry) has a maintainer reply, plan or merged commit. #4411 and #3008 are also open community proposals.

## Message-bound reasoning effort

In rc.3, rc.5 and `master`, `AgentLoop.preStep` calls `inbox.claim()`, which synchronously emits `agent/inbox/claimed` for each admitted message. Only after that does it read `this.model.current()`. `AgentModel.select()` synchronously appends a `model/selection` event, and the claimed `UserMessage` carries `source.rpcId`, which is the client's prompt `requestId`. Phase C tested the later `agent/pre-step` waterfall, which runs after capture. That was why it found no message-bound boundary.

`qa/new-plugins-host-check.mjs` now verifies this on rc.3 and rc.5:

- An override keyed by `rpcId` and selected synchronously while that message is claimed reaches only that message's request (`fast`, `deliberate`, `fast`).
- Another window's earlier message, which has a different `rpcId`, cannot consume the override.
- The saved effort is restored when the next message is claimed or the agent goes idle, and only if nobody changed it in between.

Remaining work for the product:

- The composer must register `{sessionId, requestId, effort}` with the Host before the prompt is claimed. The client's `beginSubmission()` creates the `requestId` before the prompt RPC.
- Owner prompts carry no principal, so the binding must be by `requestId`.
- A binding that arrives after its message was claimed must be reported as "not applied". It can never attach to a different message.

## Reference implementations

The checked repositories are MIT-licensed. No code was copied.

- **`wincage` and `sandboxrs-windows`.** These confirm the zero-capability AppContainer, Job and ACL-grant pattern, and the need to revoke grants. `wincage` uses regular AppContainer, not LPAC. Neither addresses Node or libuv.
- **`Kai-Dreamer/dsh-delete-conversation`.**
  - It stops work through `workspace/session-stop`, flushes, and then deletes the log directories, the projection-cache record and the Workspace account, archive and pin.
  - Recovery depends on client `localStorage` tombstones. Its README says a session whose Agent was never disposed can reappear in the Host's list.
  - It has no Windows reparse handling and no tests.
  - It doesn't meet the retirement, recovery or reparse requirements, and repeats the rejected offline-deletion approach. Not adopted.
- **`Neptune810/dsh-model-router`.**
  - It routes per step using `agent/inbox/claimed` task boundaries, `agent/pre-step` rejection and `agent/request-error` retries, and sends real provider effort values.
  - Its README describes no cross-window binding.
  - The `agent/inbox/claimed` boundary is what led to the verified message-bound contract above.
- **Not reviewed in this pass:** `TarunKurella`'s source beyond its README, `cycl0n3/The-Orchestrator-Sandbox-Launcher`, `lsz-asd/dsh-plugin-session-delete`, `Geralt4/dsh-plugin-session-delete`, `qwased/DSH-deleted-and-history-button`, `zhuifengqug/dsh-adaptive-reasoning`, `HaoyueQin/dsh-better-reasoning-effort`, and discussion #3339. These are queued in the handover.
