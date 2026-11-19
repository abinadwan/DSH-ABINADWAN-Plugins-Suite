# Phase D2 Direct Chat Desktop integration

The Direct Chat text MVP runs inside the existing Harness window on an isolated Windows Desktop profile. The integration lives in `qa/direct-chat-desktop`, outside the Suite package, and loads only when `ABINADWAN_D2_FIXTURE=1` and the synthetic profile path match. It uses the approved sidebar glyph and a dedicated Harness renderer context with its own Session Controller, native Conversation shell, composer, model picker, and history. Assistant replies render as literal text through the scoped native Chat node slot. This prevents model-authored Markdown from resolving media through the application document's Workspace Host origin. [Fixture source](../../qa/direct-chat-desktop)

**Decision: Direct Chat remains QA-only.** The product package does not ship or activate it. Windows process confinement for the companion, matching rc.5 Desktop acceptance, and production account and provider flows are still open. The [blockers](#remaining-blockers) list the specific evidence still needed.

## Capability matrix

| Capability | Implementation and evidence | Remaining gate |
|---|---|---|
| New Chat, text streaming, model selection, history and resume | Implemented in the fixture and verified on matching Windows Desktop `0.2.2-rc.3`. New Chat required no Workspace selection. A cold Desktop restart restored a completed Pro conversation and its model. The next turn showed a partial reply before the synthetic provider sent its final chunk. Rechecked in the takeover run: a new chat completed a turn, a hard kill of the whole fixture Desktop preserved it, and a follow-up turn resumed in the same chat. | Production activation is gated. |
| Session, terminal and filesystem admission | Verified on isolated rc.3 Desktop through the real authenticated carrier. The companion rejected a read-only native path-opening request, a terminal request, preset selection, a caller-selected creation directory, empty and non-text prompts, and a prompt addressed to a real synthetic Workspace session ID. The unauthenticated open returned HTTP 401 and the closed capability returned HTTP 410. The in-panel carrier check passed again on every takeover launch, and the companion diagnostics log recorded each refusal. Four synthetic Workspace transcript hashes matched before and after the takeover runs. | The app-visible admission checks cover this fixture's carrier and model-facing tools. A Windows process boundary that confines the native addon remains unverified. |
| Renderer access to the main Host | Two latent paths were found and closed in the takeover. The scoped Connection had no WebSocket factory, so any `openWebSocket` call would have resolved against the Desktop document's Workspace Host. It now fails closed. The fixture's `openStream` carrier already kept the Remote stream multiplexer off. Compaction nodes render model-authored Markdown through ChatView's file-image delegate, which also resolves against the document base. The fixture now suppresses those nodes. The companion has no compaction service. The stock upload, drag, Workspace and sidebar services were already replaced with denials. | Production needs the same review against each Harness version it supports. |
| Startup, shutdown and reconnect | The parent starts one child on panel open, reuses the bundled runtime executable, and uses inherited IPC without a companion listener. The panel renews a 90-second capability lease every 20 seconds. **Fixed in the takeover:** after Codex's last edits, idle shutdown never completed. The disposed worker kept its event loop alive. Under Desktop's utility-process Host, the child's `close` event never fired even after `kill()`. That left shutdown waiting with no exit recorded. The worker now exits once its parent disconnects, and the parent waits on `exit`. Verified after the fix: leaving the panel produced revoke, a 5.0-second idle wait, worker disposal, and exit code 0 within 18 ms. Desktop **Exit** with the panel open also shut the child down with exit code 0. A forced child kill was recorded with `requested:false`, the panel reconnected to a new child within 0.5 seconds, and a fresh turn completed. | Extended soak and lease-expiry timing remain unverified. |
| Model configuration and authentication | The parent reads its configured default provider and native model catalog and executes model calls through the native LLM adapter. The child gets model metadata and text frames. The synthetic provider required the configured credential and recorded authenticated `high` calls with zero tools for every takeover turn. The child environment is an explicit allowlist, and the worker refuses to start if credential-like variables are present. Desktop had the synthetic key set and every child started. | Production account flows, provider switching across multiple configured providers, and production process isolation remain unverified. |
| Windows native addons | The native Windows JSONL writer worked in both fixture combinations. Rechecked in the takeover: the Windows `koffi` dependency fails to load when Node disallows addons, on both rc.3 and rc.5. | The running fixture permits native addons and uses the ordinary process token. Production requires a Windows confinement mechanism that permits the writer lease while preventing access outside the companion's runtime and storage, with containment verified on a matching Desktop build. [Phase D Windows evidence](NEW_PLUGINS_PHASE_D.md#companion-host-verification) |
| rc.5 compatibility | **Full Desktop verification exists only for rc.3.** For rc.5 there is native-package verification: in the takeover, the companion, new-plugins Host and Personal Profile checks passed against the exact rc.5 registry packages. There is also one **mixed-version runtime** run, where the rc.3 Desktop shell connected to an rc.5 companion, created a chat in a fresh root, switched to Pro, and displayed the authenticated reply. A mixed run does not exercise rc.5 renderer bundles or the rc.5 Desktop main process. | Matching rc.5 Desktop acceptance is pending. The public Harness release has no Windows Desktop asset, and a separate `desktop-v0.2.2-rc.5` GitHub tag and the desktop npm package were unavailable. [Harness rc.5 release](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.2-rc.5) |
| Custom root before first chat | Verified in isolated Desktop with a new canonical fixture root selected at startup. The catalog started empty and the first chat produced native JSONL inside the selected root. The fixed default root and the fresh root are separate. | A product Settings entry still needs persistent root ownership and Windows reparse containment across restarts. Root changes for existing history, migration, permanent deletion, and automatic retention execution remain gated. |
| Direct Chat Settings | Not exposed. The approved plan gives Direct Chat its own native Settings page once activation is safe. No combined Suite Settings section exists. | Depends on production activation. |
| Attachments, Lifecycle deletion, and automatic reasoning | Images and generic attachments remain deferred. Lifecycle deletion and automatic retention execution remain blocked on native retirement and storage contracts. Adaptive and next-message effort remain blocked on message-bound admission. Existing manual reasoning and Lifecycle preview stay at the approved Phase C baseline. | [Phase D capability matrix](NEW_PLUGINS_PHASE_D.md#capability-matrix) |

The two authenticated layers serve different purposes. The Desktop owner connection admits exact fixture routes in the isolated main Host. An opaque, expiring panel capability identifies a restricted Companion Peer. The child admits the explicit native session allowlist, checks session ownership, and stores its catalog under its own root. The primary Host brokers provider calls through its existing adapter. It does not receive companion Session Remotes for execution. A failed scope reconnects over the same fixture carrier. An unconfirmed message is never automatically replayed by this integration.

Persisted history from Codex's first fixture attempt still shows two failed turns, `UNSUPPORTED_REASONING_EFFORT` and a transport failure. They predate the working catalog and broker and did not recur in any later run.

## Remaining blockers

1. **Process confinement.** The child runs with the user's ordinary token and native addons enabled. A Windows mechanism such as AppContainer, a restricted token or a Job object with ACL-scoped storage must permit the JSONL writer lease while denying reads and writes outside the companion runtime and root. It must be verified on a matching Desktop build. This is an architectural and security decision for the owner.
2. **Matching rc.5 Desktop.** No Windows Desktop rc.5 build is available to run.
3. **Production carrier.** The owner-authenticated fixture routes, the lease and the scoped renderer must move into a product plugin behind a capability check. This needs owner approval once item 1 is resolved.
4. **Accounts and providers.** Production sign-in flows and switching between several configured providers have not been run.
5. **Soak.** Long-running idle, lease expiry under sleep or resume, and repeated reconnect cycles have not been measured.

## Windows measurements

The timer starts before child creation and ends after the native companion composition reports ready. RSS samples are the child's resident memory. CPU is the delta of Node's process counters. The measurements exclude Desktop renderer and parent-broker overhead.

| Windows run | Startup | Idle child RSS | Active child RSS | Child CPU |
|---|---:|---:|---:|---|
| rc.3 Desktop and rc.3 companion (Codex) | 174–208 ms across recorded starts | 132–137 MiB | 121–122 MiB across sampled turns | No measured increase over the 2-second idle sample interval or the 15.03-second delayed reply. About 0.16–0.26 CPU-seconds through startup and first idle sampling. |
| rc.3 Desktop and rc.3 companion (takeover, six starts) | 174–192 ms | 130–135 MiB | 120–134 MiB | 0.000 CPU-seconds between the 1-second and 3-second idle samples on every child. Cumulative CPU was 0.17–0.31 CPU-seconds, including startup and turns. |
| rc.3 Desktop and rc.5 companion | 187 ms | 129 MiB | 119 MiB during the sampled turn | No measured increase over the 2-second idle sample interval. The active interval was only 31 ms. |

Idle shutdown takes the 5-second grace period plus about 20 ms to dispose and exit.

## Screenshots

- Matching rc.3 Desktop captures show the native picker, the partial streamed reply, the restored transcript after cold restart, and a new reply following a forced child exit. [Model picker](../assets/new-plugins/desktop-phase-d2/direct-chat-model-picker.jpg) · [Streaming](../assets/new-plugins/desktop-phase-d2/direct-chat-streaming.jpg) · [Cold restart](../assets/new-plugins/desktop-phase-d2/direct-chat-after-restart.jpg) · [Reconnect](../assets/new-plugins/desktop-phase-d2/direct-chat-after-reconnect.jpg)
- The completed response shows the synthetic media marker as literal text. The mixed-version screenshot shows the successful turn in the new storage root. [Literal reply](../assets/new-plugins/desktop-phase-d2/direct-chat-literal-response.jpg) · [rc.5 companion with rc.3 Desktop](../assets/new-plugins/desktop-phase-d2/direct-chat-mixed-rc5-companion.jpg)
- Takeover captures from the patched renderer: [first turn](../assets/new-plugins/desktop-phase-d2/direct-chat-hardened-renderer.jpg), [resume after killing the fixture Desktop](../assets/new-plugins/desktop-phase-d2/direct-chat-resume-after-fixture-kill.jpg), and [new turn after a forced child exit](../assets/new-plugins/desktop-phase-d2/direct-chat-reconnect-after-child-exit.jpg).

## Tests

| Check | rc.3 | rc.5 |
|---|---|---|
| `npm test` | 164/164 | — |
| `npm run check:package` (PowerShell `tar`; 60 published files) | 164/164 | — |
| `qa/direct-chat-desktop/carrier-check.mjs` | 2/2 | — |
| `qa/direct-chat-companion-check.mjs` | 3/3 | 3/3 |
| `qa/new-plugins-host-check.mjs` | 12/12 | 12/12 |
| `qa/profile-host-check.mjs` | 1/1 | 1/1 |
| Isolated Desktop carrier check (in panel) | Passed on every launch | Not run on matching Desktop |

Native checks used bundled Node `24.21.0`. rc.3 used the extracted Desktop Host packages. Its client store came from the matching `38a6a5c` development build at `.package-check-dsh/packages/client/store/lib/index.js`. `profile-host-check.mjs` imports bare `@deepseek-ai/*` specifiers, so it ran with a scratch ESM resolve hook that resolves them from `ABINADWAN_TEST_RUNTIME`. Under Git Bash, `check:package` fails because GNU `tar` reads `C:` as a remote host. Run it from PowerShell.

For a rerun, stage the fixture plugin only in the existing synthetic `.package-check-dsh/.fixture-harness-home` Desktop profile. Expose `qa/direct-chat-desktop/loopback.mjs` on port `51799`, with an ignored wire-log path as its argument. The isolated Desktop process needs `ABINADWAN_D2_FIXTURE=1` and `ABINADWAN_D2_RUNTIME` pointing to the chosen extracted runtime. `ABINADWAN_D2_TEST_WORKSPACE_SESSION` enables the authenticated panel checks for a known synthetic Workspace session once the independent chat history has at least one entry. `ABINADWAN_D2_FIXTURE_HOME` selects a named fixture root matching `.direct-chat-d2-*` alongside the synthetic profile. `ABINADWAN_D2_DIAGNOSTICS=1` writes child stderr to `diagnostics.log` in that root. `metrics.jsonl` records `startup`, samples, `revoke`, `shutdown-step`, `shutdown` and `exit` events. Logs and native transcripts stay in the ignored fixture roots.

## Changed files

- `qa/direct-chat-desktop/`: the fixture. Takeover fixes are in `client.js` (WebSocket denial and compaction suppression), `index.js` (exit detection, diagnostics capture, shutdown tracing) and `worker.js` (idempotent dispose and self-exit).
- `docs/assets/new-plugins/desktop-phase-d2/`: Codex captures plus three takeover captures cropped to the fixture window.
- This report.

No product code, package metadata or Personal Profile file changed in Phase D2.
