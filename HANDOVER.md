# Handover: integration/suite-v0.8

Local integration of the ABINADWAN Plugins Suite with all six components, prepared on 2026-11-19 for owner review. **This branch is unpushed and not merged into `main`. Nothing in it is released.**

| | |
|---|---|
| Worktree | `C:\Users\Admin\Desktop\DSH-Suite-Integration` |
| Branch | `integration/suite-v0.8`, with no upstream configured on purpose |
| Baseline | `origin/main` at `31b071c` (Phase 7D merge, PR #23) |
| Merged | `feature/new-plugins` at `c09d049`, which includes Phase D2. The merge had no conflicts. |
| Version | `0.8.0-rc.1`, unchanged |

## Branch provenance

- **Personal Profile.** Every committed Personal Profile change through Phase 7D is already in `origin/main`, including `0.7.0`–`0.7.2`, Phase 7A–7D and `481f822` (response wording). Nothing further was merged.
- **Not merged: `origin/qa/personal-profile-production-readiness`.** It has three commits from 2026-11-17 that are not in `main`. It is a superseded experiment. `main` later took the 0.7.0 native-Settings simplification and the Phase 7 path instead, so merging it would reintroduce a parallel design.
- **Untouched: Phase 8 drafts.** The main checkout `C:\Users\Admin\Desktop\DSH-ABINADWAN-Plugins-Suite` (`feature/phase8-profile-disclosure`) holds uncommitted Phase 8 drafts: `CHANGELOG.md`, the Phase 7D docs and `PERSONAL_PROFILE_PHASE8_PLAN.md`. They were not read into this branch or modified. Phase 8 stays **NO-GO** per the owner.
- **Untouched: other worktrees.** The `fix-phase7d-response-reliability` worktree at `2c475f9` and all original branches were left as they were.

The auto-merged shared files keep both sides. `client.js` and `plugins/personal-profile/preferences.js` carry the Phase 7D wording, and the new-plugin UI and roster are intact. `package.json` gains the new-plugin exports, and `cordis.patch.yml` gains the three new component entries. `.gitignore` keeps the Phase 7D evidence rules. `package-lock.json` is unchanged.

## Architecture

The suite is one npm package, `@abinadwan/dsh-plugins-suite`. It holds a Cordis plugin group (`index.js`) with six independently toggleable components and one browser module (`client.js`). There are no Harness core modifications.

| Component | Host side | Client side | Settings |
|---|---|---|---|
| Environment & Context | `plugins/environment-context` | Read-only right-sidebar session inspector | — |
| Humanizer | `plugins/humanizer` (runtime Skill) | — | — |
| Personal Profile | `plugins/personal-profile` with native Harness Settings, local and private by default | Left-sidebar **Personal Profile** page | Its own page. Phase 8 structured disclosure is blocked. |
| Direct Chat | `plugins/direct-chat`: metadata, original icon, **no session producer** | Not exposed in the product. A QA fixture lives in `qa/direct-chat-desktop` and is not packed. | Its own page once activation is safe |
| Conversation Lifecycle | `plugins/conversation-lifecycle` with a native metadata domain | Independent native **Settings → Conversation Lifecycle** page: inventory, global and Workspace retention, protection, preview-only cleanup | Independent page |
| Adaptive Reasoning | `plugins/adaptive-reasoning` validates manual session effort against the adapter's values | One compact control beside the native model selector | **None, by design** |

Approved UI decisions that must hold: English UI and metadata for the three new components, the original icon assets, and the existing component identities. There is **no** combined "ABINADWAN Suite Settings" section.

### Direct Chat fixture (QA only)

A scoped renderer Context in the existing Harness window has its own Session Controller, Conversation, Chat and model picker. It talks to owner-authenticated routes on the main Host (`/api/abinadwan-direct-chat-fixture/*`). The main Host forks an on-demand **companion** over inherited IPC. The companion composes a native, tool-free Session stack with its own JSONL root, and the main Host brokers model calls through its configured adapter, so credentials never reach the child. The renderer holds an expiring Peer lease, renewed every 20 seconds and valid for 90. Unknown or expired Peers get HTTP 410, and the renderer reconnects. The companion shuts down 5 seconds after the last Peer leaves. The fixture loads only when `ABINADWAN_D2_FIXTURE=1` and the synthetic profile path match. See [Phase D2](docs/research/NEW_PLUGINS_PHASE_D2.md).

## Completed and verified

- Environment & Context, Humanizer and Personal Profile are at the 0.8.0-rc.1 / Phase 7D baseline.
- Lifecycle: inventory, retention policies (global and per Workspace), protection, and read-only cleanup preview.
- Adaptive Reasoning: manual session effort, saved per-model preference, and Apply or Remove. The adapter receives the exact value.
- Direct Chat fixture: create, stream, select model, resume after cold restart and after a hard kill, reconnect after a forced child exit, graceful idle and Desktop-exit shutdown, and authenticated carrier refusals. Workspace transcripts are unaffected.

## Test evidence (2026-11-19, this branch)

| Check | Result |
|---|---|
| `npm test` | 168/168 (164 suite + 4 Phase 7D Profile runtime) |
| `npm run check:package` (run from PowerShell) | 168/168, 60 published files |
| `qa/direct-chat-desktop/carrier-check.mjs` | 2/2 |
| `qa/direct-chat-companion-check.mjs` | rc.3 3/3 · rc.5 3/3 |
| `qa/new-plugins-host-check.mjs` | rc.3 13/13 · rc.5 13/13 (includes message-bound effort) |
| `qa/direct-chat-appcontainer-check.mjs` | rc.3 3/3 · rc.5 3/3 |
| `qa/profile-host-check.mjs` | rc.3 1/1 · rc.5 1/1 |

These checks ran on isolated Windows Desktop `0.2.2-rc.3` (synthetic profile and loopback provider) with the packed integration build:

- The Plugins inventory listed all six components with their original icons.
- Enabling Personal Profile added its page. Disabling Adaptive Reasoning removed the composer control and kept the native picker, and re-enabling it restored the control.
- Selecting **Low** produced `effort: low` at the adapter.
- Lifecycle Settings showed the persisted 30-day policy, the protected conversation and four Workspace conversations. Direct Chat history was excluded.
- After **Restart App and Host**, Profile was still enabled and the session was still at Low.
- A Direct Chat turn completed alongside the suite with 0 tools. The Adaptive Reasoning control did not appear inside the Direct Chat renderer.

Screenshots are in `docs/assets/integration-v0.8/`. rc.5 is verified at the native-package level and in one mixed rc.3 Desktop + rc.5 companion run. No matching rc.5 Windows Desktop build exists.

After the run the synthetic profile still has Personal Profile **enabled** and `Desktop Alpha Baseline` at **Low**. Its staged suite is the integration pack. The previous Phase C pack is backed up in the session scratch directory and can be regenerated from `feature/new-plugins`.

## Known blockers

| Blocker | Why it blocks | Needs |
|---|---|---|
| Direct Chat process confinement | **Resolved for the QA fixture (Phase D3).** LPAC AppContainer with only `registryRead`, dedicated storage, no network, no child processes and a kill-on-close Job. Verified on rc.3 and rc.5 natively and on rc.3 Desktop. | Owner approval to carry the design into the product |
| Direct Chat production carrier | The fixture routes, lease and scoped renderer are QA-only | Product plugin behind a capability gate, after confinement |
| Matching rc.5 Desktop | No Windows Desktop rc.5 artifact is published | Rerun the Desktop acceptance once one exists |
| Permanent deletion and retention execution | Harness persistence has no retirement or delete contract, no authoritative artifact manifest, and no restart-safe metadata reconciliation | An upstream native contract. No safe local path exists. |
| Adaptive and next-message effort | **Native contract found (Phase D3).** `agent/inbox/claimed` runs before step capture and carries the prompt `rpcId`. Proven on rc.3 and rc.5. UI binding is not built. Automatic classification must run synchronously inside that event. | Composer binding by `requestId`, then the product feature |

## Next implementation tasks

1. **Approve the confinement design** in [Phase D3](docs/research/NEW_PLUGINS_PHASE_D3.md). It is done and verified for the fixture. Optional follow-up: drop the 42 MiB resident launcher by waiting on the process handle from the Host.
2. **Direct Chat productization**, gated on step 1. Move the carrier, lease, scoped renderer and denials from `qa/direct-chat-desktop` into `plugins/direct-chat`. Add the Direct Chat Settings page with the actual storage root and preview-only retention. Keep `createWebSocket` denied and compaction nodes suppressed.
3. **Direct Chat storage management.** Choose a root at first configuration only, with canonical-path and reparse checks at every start. Migrating existing history needs separate migration and rollback contracts.
4. **Direct Chat attachments.** Images and files need restricted admission, an upload carrier bound to the companion (never the page-global upload client) and a size and type policy.
5. **Safe deletion.** Individual, bulk and per-Workspace deletion, plus Delete All Direct Chats, wait on a native retirement contract. The exclusive companion root narrows Direct Chat deletion but still needs artifact coverage and reparse containment.
6. **Automatic retention execution.** Depends on step 5 plus policy-revision and eligibility rechecks at admission.
7. **Next-message override.** Add a Host route that records `{sessionId, requestId, effort}` and applies it in `agent/inbox/claimed` with restore-on-next-claim or idle, as in the native test. Bind from the composer using the `requestId` that `beginSubmission()` creates, and report a late binding as "not applied". **Adaptive Reasoning** can classify the claimed message synchronously in the same event, with real provider effort values only.
8. **Finish the reference review:** `lsz-asd`, `Geralt4` and `qwased` deletion plugins, `zhuifengqug` and `HaoyueQin` reasoning plugins, `cycl0n3` launcher, and discussion #3339.
9. **Soak.** Measure long idle, lease expiry across sleep and resume, and repeated reconnects for the companion.

**Do not repeat** these approaches without new evidence:

- offline transcript deletion (Phase C)
- tool-declaration filtering or a restricted preset as the Direct Chat boundary
- Workspace-free or internal-Workspace sessions on the ordinary Host
- SQLite-provider retirement
- continuable subagents or LiveShare as Direct Chat
- Node's permission model with addons disabled
- Node `fork` or IPC inside an AppContainer with libuv 1.52.1 (`nodejs/node#66374`; it spins forever)
- `CREATE_NO_WINDOW` for the confined Node (its `conhost` child is blocked; use `DETACHED_PROCESS`)

See [Phase C continuation](docs/research/NEW_PLUGINS_PHASE_C_CONTINUATION.md), [Phase D](docs/research/NEW_PLUGINS_PHASE_D.md) and [Phase D3](docs/research/NEW_PLUGINS_PHASE_D3.md). The D3 upstream review found no deletion, retirement, confinement or per-message effort contract on rc.4, rc.5 or `master` (`2e39e70`).

## Running the checks

```powershell
npm ci --ignore-scripts
npm test
npm run check:package
node --test qa/direct-chat-desktop/carrier-check.mjs
```

Run `check:package` from PowerShell, because Git Bash's GNU `tar` reads `C:` as a remote host.

`qa/direct-chat-appcontainer-check.mjs` also needs `ABINADWAN_TEST_NODE`, which points to a copy of the bundled `node.exe`. Keep the runtime and Node copies under `node_modules/.direct-chat-confined/` so that ACL grants land only there. Each storage root has its own AppContainer profile, and its Host state folder (`<root>.host` for the Desktop fixture) holds the grant manifest, metrics and diagnostics. `node qa/direct-chat-desktop/cleanup-appcontainer.mjs <runtime> --state <state-folder>` removes every recorded grant and the profile. The Desktop fixture also needs `ABINADWAN_D2_NODE`.

Native checks need bundled Node 24.21.0 and `ABINADWAN_TEST_RUNTIME`, which points to an extracted rc.3 Host runtime (`qa/extract-new-plugins-runtime.mjs`) or an rc.5 registry install. The companion check also needs `ABINADWAN_TEST_CLIENT_STORE`. `qa/profile-host-check.mjs` imports bare `@deepseek-ai/*` specifiers, so give it an ESM resolve hook that resolves them from the runtime directory. The Desktop fixture rerun is described in the Phase D2 report.
