# New plugins — Phase A discovery and feasibility

**Historical source/SDK feasibility snapshot (2026-11-18).** The decisions and blockers below describe that pinned pre-integration branch, **not** the current v1.0.0 development suite. The current Direct Chat design is different and was later accepted into `develop` with deep Host isolation checks explicitly deferred; Chat Control still does not execute deletion. [Current component details](../DETAIL.md) · [Current research index](README.md).

Review baseline: 2026-11-18, `feature/new-plugins`, `2c475f9`. Status at that time: research completed; Phase B was a proposal awaiting owner review. No production implementation, installation, configuration changes, conversation cleanup, merge, or release was performed **during that audit**.

Read alongside [architecture](../archive/superpowers/specs/2026-11-18-new-plugins-design.md), [implementation roadmap](../archive/superpowers/plans/2026-11-18-new-plugins.md), and [packaged Desktop evidence](new-plugins-desktop-evidence.json).

The [Phase C capability update](../archive/research/NEW_PLUGINS_PHASE_C.md) records the 2026-11-19 conditional approval, subsequent executable evidence, icon deliverable and revised gates. The matrix below remains the original static Phase A baseline.

## Decision

Native Settings integration, native workspace-free session creation, native conversation rendering, manual model-supported reasoning selection, and read-only lifecycle inventory have viable extension surfaces. The complete requested system is **not yet implementable under the verified contracts**. Native permanent deletion/retention, per-Direct-Chat transcript relocation, and atomic per-message reasoning admission are unresolved gates. Do not substitute filesystem removal, cwd changes, request-hook mutation, or prompt instructions for these capabilities.

Architecture approval authorizes a direction only. It must not silently waive these requirements or turn a partial implementation into an accepted complete product.

## Repository audit

| Area | Observed state | Consequence |
|---|---|---|
| Git | Clean linked worktree at the requested branch/base on entry | Remain here; other worktree was not opened or modified |
| Instructions | No `AGENTS.md` found in this worktree or checked ancestors (`C:\\`, Users, Admin, Desktop); read CONTRIBUTING, README, SECURITY, branding, package policy and relevant architecture/acceptance records | User scope and existing privacy/compatibility rules apply |
| Package | `@abinadwan/dsh-plugins-suite`, `0.8.0-rc.1`, private, original MIT project, ready-to-run ES modules | No build framework or version bump needed for discovery |
| Root Host | `index.js` re-exports Loader `Group`; patch keeps `abinadwan-suite` containing Environment/Humanizer | Preserve group and existing override IDs |
| Settings-owned component | Personal Profile is an independent, disabled-by-default top-level Include row | New editable components should follow uniquely addressed top-level rows, without moving Profile |
| Browser | Root `client.js` supplies bundle discovery, updater, Environment and Profile child fibers | Main conflict hotspot with concurrent Profile work; extension seam must be integrated later against its final version |
| Activation | Access-checked `pluginManager.listPlugins`, enabled + active rows, generation checks, connection reset, effect disposal | Reuse this lifecycle; absent/failed inventory must withdraw surfaces |
| Existing capabilities | Environment reads session/workspace/projection summaries; Humanizer uses native Skills; Profile owns settings and prompt preferences | Do not introduce competing stores or a second Profile injector |
| Localization/artwork | Root/component locales; approved transparent 256px PNGs, historical SVG compatibility export | New icon family may be vector-first; keep all existing artwork/exports |
| Verification | Node tests, real Cordis/metadata/Skill integration, React/jsdom/axe, extracted npm artifact; CI Windows/Linux Node 22/24; separate real Agent Loop fixture | Extend relevant fixtures after approval; mocks alone are insufficient |
| Dependencies | Test packages pinned to `0.2.2-rc.3`; no `node_modules` present here | No dependency install or product test run needed for this documentation-only phase |

Protected during this work: `plugins/personal-profile/**`, Profile logic in `client.js`, all `PERSONAL_PROFILE_*` records/tests/fixtures (including Phase 7D scope), and existing icon assets. Shared files needing later coordination are listed in Phase B. Nothing in the Harness installation was written.

## Installed Windows Desktop and evidence quality

Read the installed archive at `C:/Users/Admin/AppData/Local/Programs/DeepSeek Harness/resources/app.asar` using a read-only ASAR header/file reader. No executable modules were imported or run. Its `/package.json` reports:

- Desktop `0.2.2-rc.3`, nightly channel, build `6b729fedde0c8fd03af7afdf5a711aa64fe87c3b`, clean build flag.
- All 22 inspected relevant packaged DSH modules report `0.2.2-rc.3`.
- Primary runtime manifest reports Node `24.21.0`, pnpm `11.28.5`, Windows x64.
- The top-level installation `version` file contains Electron `44.7.0`; this is **not** the Harness version.
- Separate global CLI is `0.2.1-rc.5`; it is **not** evidence about Desktop APIs or its active Profile.
- No running `DeepSeek Harness` process was found by the read-only process-name check. No live plugin registration, live settings render, credentials, active Profile configuration, user transcript, or provider request was inspected.

The installed build SHA returned GitHub “No commit found” on attempted public-source lookup. Do not attach working public-source links to that SHA or equate it with the earlier repository research baseline `38a6a5c…`. The evidence JSON records the archive hash, package versions, per-file hashes, exact packaged paths, and finding locations so another reviewer can reproduce the static inspection on this installation. Embedded package documentation and compiled behavior agree on the principal gates below; this is static Desktop-package compatibility, not Windows acceptance.

## SDK compatibility matrix

Legend: **S** = supported surface verified in installed package; execution acceptance still required. **C** = conditional on composition/provider or an unproved safety integration. **B** = blocked by a missing supported contract. These labels do not claim a live test passed.

| Requirement | Status | Verified contract / boundary |
|---|---|---|
| Settings → ABINADWAN Suite | S | `dsh-client-ui-settings-general` enumerates/subscribes/renders `settings.section`; `ctx.slots.inject/register`, id/label/order/locale are used by native contributors |
| Internal enabled-plugin tabs | S/C | Existing suite inventory gating supports roster; new tab lifecycle needs integration testing. Profile tab is deferred; do not create a misleading empty tab |
| Persist editable preferences | S | `dsh-settings`: volatile fields of active, uniquely addressed entries, revision-aware writes; `configForms` native form adapter; no browser localStorage preference store |
| Shared non-session metadata | S/C | `storageDomain.open(defineDomain(...))`, schema-validated durable serialized table writes; one opener, no cross-table transactions or cross-process notifications. Shared lifetime must be proved |
| New Chat without manual Workspace | S | `sessionController.create` accepts `cwd` without `workspaceId`; native Agent Loop and preset composition remain owners |
| Independent chat list / workspace separation | C | Native session catalog + suite ownership domain; no native Direct Chat category. Never classify every workspace-less session as Direct Chat |
| Native streaming / Markdown / code | S | Native Session binding, `conversation.content` Factory, Chat target and event stream. Do not replace parser, stream transport, or send pipeline |
| Model choice | S | Native composer model seat / directory; route catalog and access rules |
| Image attachments | S/C | Native upload/admission/reference/normalization services; model image capability/limits apply |
| Generic file attachments with filesystem disabled | C | Native files are immutable refs, read on demand, not bytes automatically sent to models. `attachments.readFileStream` verifies content; a session-authorized attachment-only reader is feasible but must be proved. Desktop path chips cannot count as safe uploads |
| Search / supported browsing | S/C | `dsh-tool-web` supplies `web_search`/`web_fetch` when native provider/auth readiness allows. General interactive browser automation not established; report unavailable rather than add shell/browser fallback |
| No terminal / unrestricted filesystem by default | C | Preset composition, scoped tool restrictions and monotonic `tools.guard`; deny indirect executor/MCP/plugin-management/subagent escape too. Native read-only sandbox alone does not prevent reading personal files |
| Permission-based Profile integration | C | Reuse existing native response preferences/custom-text consent only; structured fields remain blocked. No new direct Profile integration or positive disclosure is authorized |
| Default transcript storage | S | Native persistence owns transcripts; `stat/list` can report materialized artifact location, not a user-chosen Direct Chat root |
| Custom Direct Chat transcript location / safe migration | B | JSONL `root` is deployment-wide. `cwd` is execution metadata. No verified per-session storage routing or relocation/migration API; do not change global root |
| Direct Chat Keep forever / 365/180/90/30/7 days; Delete All | B | Policy/preview can be designed; execution needs native safe permanent deletion. No temporary/cloud/backup/encryption addition |
| Workspace catalog including archive | S/C | Workspace registry membership + global archive IDs + cold `sessionQuery`/persistence catalogs. Completeness/errors/unknown or orphan membership require explicit reporting |
| Individual / bulk / per-Workspace / all-Workspace deletion | B | Session Controller has no permanent delete endpoint; persistence README explicitly says “No deletion or retention API.” Workspace deletion is a different operation and is prohibited here |
| Conversation context menu / Workspace context menu | S | `contextMenus.register` targets `session` / `workspace`; native session-row menu and `sessionHeader` are separate targets. Add actions, never replace Workspace delete |
| Global retention / Workspace overrides / protection | S for state; B for execution | Suite-owned validated settings/domain; no native safe delete to execute plans. Protection affects automatic cleanup, not a hidden permanent manual ban |
| Counts / storage usage | S/C | Catalog counts; persistence `sizeBytes` optional and only selected generation, not complete disk use. Shared attachments and older generations cannot be attributed exactly |
| Cleanup preview / confirmation / result report | C/B | Suite can own immutable previews and confirmations, but native lease/admission/delete atomicity still missing |
| Prevent active/running deletion | B for execution | Native `workspace/session-activity` includes turns, jobs, descendants/reminders when composed; querying then removing files has a race. Resident/open-view exclusion also needs authoritative Host leases; client `retainedBy` is local. Need native deletion admission and writer/activation exclusion |
| Manual reasoning near composer / supported levels | S (already exists) | Native model selection control exposes adapter-advertised efforts; reuse it |
| Actual provider reasoning parameter | S/C | `agent.model.select({provider,model,reasoningEffort?})` before preparation, `llm.resolveCallConfig` validation, adapter translation. Wire acceptance requires an offline adapter and provider-specific proof |
| Per-model / Direct Chat / Workspace defaults | C | Suite policy resolves provider+model tuple and calls native select before preparation. Avoid Session Controller `selectModel` for automatic defaults because it also saves global default |
| Session override | S/C | Native recorded model/effort selection has no origin; same-tuple select can be a no-op. An explicit suite session-lock action can record intent, but general picker intent detection is unproved and gates automatic policy |
| Adaptive complexity | C | Deterministic local classifier, no extra model calls. No verified mandatory pre-capture admission hook for all native entry paths |
| Next-message-only override | B for general atomic guarantee | No verified prompt-receipt-bound effort reservation consumed exactly once. Queues, steering, retries, concurrent windows and continuations defeat select/send/restore timing |
| Maximum automatic effort High | C | Opaque adapter IDs have no global ordering. Only validated per-model tier mapping can enforce a meaningful cap |
| Subagents Inherit / override | S/C | Native local child option resolver inherits last request/parent options; changing route clears inherited effort. Providers advertise `agentOptions`; external providers can reject it. Global override seam not established |
| Reasoning latency / token stats | C | `sessionStats` gives LLM/tool/TTFT/decode times, `tokenUsage` totals. These are not reasoning-only metrics; show those only when separately exposed, otherwise Unavailable |

## Reference comparison and licenses

All 18 requested repositories were accessible. Sources were reviewed for architecture and notices only; no implementation, SVG, branding, or asset was copied. Links below pin principal source to the inspected commit. Root license is not a blanket statement about bundled dependencies.

### Direct Chat and Settings

| Reference / pinned source | License evidence | Useful pattern / incompatibility |
|---|---|---|
| [SpookySandwich](https://github.com/SpookySandwich/dsh-plugin-no-workspace/blob/9ee805e52c0427e3f0f20e31a7ec727d506fa3c5/lib/index.js) | MIT LICENSE, © 2026 SpookySandwich | Native workspace-free create; default home cwd grants no isolation. Client wraps methods/slot entries and observes DOM; reject those coupling mechanisms |
| [omdsh-chatmode](https://github.com/omdsh-plugins/omdsh-chatmode/blob/b47a747a714e2b22a8ba9affbd2734f873e607b5/src/index.ts) | MIT LICENSE, © 2026 omdsh-plugins | Managed Chat Workspace; native engine but deployment default tools. Not independent workspace-free ownership; composer integration uses DOM observation |
| [Syhz](https://github.com/Syhz-666/dsh-no-workspace/blob/17ddf04bebd5f1e7e9e02945d23f579727900e64/src/index.ts) | MIT LICENSE, © 2026 Syhz-666 | Preset excludes shell/write/delegation; custom read/glob/grep. Approval exemption checks cwd rather than canonical requested target; traversal/symlink containment not proved. Client injects into official served bundle; reject |
| [Asuta projectless-chat](https://github.com/Asuta/dsh-cdx-plus/blob/d0a5e86a51b6d44fac802ad54bfd58194f9233d2/packages/projectless-chat/core.js) | Root/projectless MIT, © 2026 Asuta and contributors | Revisioned path preference and safe cwd allocation; custom cwd is not transcript migration. Client wrappers/fake Workspace display records unsuitable |
| [dsh-just-chat](https://github.com/exoticknight/dsh-just-chat/blob/906ac8faec71bcf6ff1b974a368e6b2798232012/client.js) | Apache-2.0 LICENSE | Native settings forms, managed Workspace creation, independent sidebar/main slots; does not establish restricted tools or workspace-free sessions |
| [ice-ai-lab](https://github.com/ice-ai-lab/dsh-plugin-codex-ui/blob/80b75eab45afc0c339a1d9dbadef1870431a13af/lib/index.js) | MIT LICENSE, © 2026 ice-ai-lab | Session-per-managed-Workspace; host directory cleanup trusts some client reference checks. Do not reuse as deletion authorization model |
| [DSH-IM settings registration](https://github.com/xmanrui/dsh-im/blob/fc2ceab217309f8973afa03c58cdd8ff3e900130/plugin-src/client/index.js#L661) | MIT LICENSE, © 2026 xmanrui | Effect-scoped inject/register `settings.section`, localized label, cleanup; matches installed Desktop shell statically. No inference about transcript relocation |

Asuta's [codex-review NOTICE](https://github.com/Asuta/dsh-cdx-plus/blob/d0a5e86a51b6d44fac802ad54bfd58194f9233d2/packages/codex-review/NOTICE) identifies an Apache-2.0 OpenAI rubric. DSH-IM's [third-party notices](https://github.com/xmanrui/dsh-im/blob/fc2ceab217309f8973afa03c58cdd8ff3e900130/THIRD_PARTY_NOTICES.md) include external Apache-2.0 Matrix runtime and `UNLICENSED` qqbot connector metadata. None is proposed as a dependency.

### Conversation Lifecycle

| Reference / pinned source | License evidence | Safety / architecture finding |
|---|---|---|
| [DDDMUC](https://github.com/DDDMUC/dsh-delete-session/blob/7de408bb9dd5a77e3906d60a71642d6ee861bccc/src/index.js) | MIT LICENSE, © 2026 DDDMUC | Catalog, writer probe and results; direct filesystem retirement, recycle/staging fallback, cancellation errors tolerated, descendant inputs not fully lineage-validated |
| [lsz-asd](https://github.com/lsz-asd/dsh-plugin-session-delete/blob/352510e552983dcfcb993cf9124181c55e2070f5/src/index.js) | package declares MIT; no LICENSE in reviewed tree | Cancels, waits at most 15s, then continues; private detach/store probes and repeated `rm`; archive completeness unproved |
| [hkkz9522](https://github.com/hkkz9522/dsh-session-manager/blob/422fd909d0dd650abe34c6189f808d4f76daca56/lib/index.js) | MIT LICENSE, © 2026 contributors | Stronger activity recheck, writer-close and path validation, but stops activity then removes files; compatibility/private registry probes. Not strict exclusion |
| [Lzcdebear](https://github.com/Lzcdebear/better-dsh-session-deletetool/blob/fc02b405c71f24ce08741b094075e1f2724641a8/host.js) | MIT LICENSE, © 2026 陆知辰 | Native activity query and lineage checks; missing activity interface treated empty; stop errors become warnings and deletion continues without recheck. Direct file removal |
| [jackxiao17](https://github.com/jackxiao17/dsh-session-cleaner/blob/3f86b31fd5e87039594f15a8dda1f1c0554f2eee/lib/index.js) | MIT LICENSE, © 2026 jackxiao17 | Custom trash/restore and 30-day purge violate no-recycle-bin scope. Timeout-based private disposal. Descendant scan drops origin and follows parentSession edges, potentially including ordinary forks |

All five implement physical removal themselves. Archive, detach, activity-query and writer-open APIs are not a native permanent-delete contract. Do not copy their best-effort error handling into a data-loss boundary.

### Adaptive Reasoning

| Reference / pinned source | License evidence | Parameter control / limitation |
|---|---|---|
| [HanaAyane](https://github.com/HanaAyane/dsh-reasoning-effort/blob/c3ccd549a46f6a8be6a0404d91f587f497f9f786/src/index.ts) | MIT LICENSE, © 2026 HanaAyane | Read-only host capability guidance and native directory effort selection; no prompt approximation or adapter mutation |
| [Ayowait](https://github.com/Ayowait/dsh-official-reasoning-effort/blob/787298557c784aacdb77caff339d8ce41658b031/lib/index.js) | MIT LICENSE, © 2026 Ayowait | Configures real llm-pi-ai maps, but assumes generic off/low/high/max; rejected writes may still leave intended UI hints. Do not infer accepted parameters from hint presence |
| [drscrewdriver](https://github.com/drscrewdriver/dsh-thinking-levels/blob/a0a8711aa74f671807620b35713e03dfa8732c8c/src/thinking-level.ts) | MIT LICENSE, © 2026 drscrewdriver | Real effort, adaptive scheduling and explicit-selection tracking; wraps capability metadata, pre-step selection and old request fallback. Installed capture timing means same-step safety must be independently proved |
| [hytime](https://github.com/hytime/dsh-thinking-effort/blob/e188603195244a551e660ff6a7facee0b960b511/packages/subagent/src/index.ts) | MIT LICENSE, © 2026 hytime | Explicit child route/effort at creation; custom maps assume off:null/high/max, not provider discovery |
| [Asowerp](https://github.com/Asowerp/dsh-resoning-effort/blob/fd6ae421046163a7e8357f768ab857b65923a767/lib/client.js) | package declares MIT; no LICENSE in reviewed tree | Revision-guarded native settings edits of model effort/thinking maps; curated presets, no endpoint negotiation or dedicated child policy |
| [HaoyueQin](https://github.com/HaoyueQin/dsh-better-reasoning-effort/blob/2d68b65cc641cd85e95384c859a2bc3de23d9e08/src/index.ts) | MIT LICENSE, © 2026 HaoyueQin | Curated/endpoint-signaled maps and real adapter settings; also process-wide transport wrappers. No generic guarantee of wire acceptance or route disambiguation |

Reasoning references largely control actual parameters rather than prompt instructions, but capability declarations, inference, endpoint hints and provider-confirmed support remain different evidence classes. This suite should consume official metadata, not invent levels or patch adapters.

MIT reuse requires copyright/permission preservation; Apache-2.0 reuse needs license and applicable NOTICE/modification handling. The two missing LICENSE files are incomplete notice evidence, not a conclusion that the projects have no license. Independent implementation and original icons avoid source-asset reuse; newly chosen dependencies still need review.

## Behavior traced before design

1. New native session: Session Controller resolves explicit preset and cwd → Agent registry/Loop owns creation and persistence writer → native Session binding/event stream renders Chat. No Workspace membership is required when `workspaceId` is omitted. Workspace UI default start flow is a separate concern.
2. Durable storage: Loop acquires native persistence handle → append-only log → backend-owned flush/close, historical generations and query/projection caches. There is no delete/retention operation to coordinate these owners. A filesystem unlink can race a writer, leave stale indexes, or expose older generations after restart.
3. Reasoning: inbox claim → `agent.model.current()` captured → tool resolution → prompt assembly → `agent/pre-step` → prepared call/request validation. `agent/request` explicitly rejects changed effort. Calling select inside pre-step changes a future selection, not the captured current one; restore-on-turn-end does not implement next-message-only semantics.
4. Attachments: upload receipt → Host admission → immutable digest-verified ref → native model projection. Generic files become read-only handles, while Desktop intake can instead create real path chips. Attachment objects may be shared across forks and are never automatically deleted by the reviewed provider.
5. Settings: active Host inventory controls browser child lifetimes; native shell discovers settings sections; native revisioned settings persists explicit writes. Hiding a button never replaces Host authorization.

## Blockers and evidence needed

| Gate | Missing contract / exit evidence |
|---|---|
| B1 — safe deletion | Supported Host API must fence activation/writers, resident/open-view leases and all activity, condition on expected revision, delete all native session generations/index metadata, handle subagent/fork dependencies, report partial outcomes, and never touch project folders. Atomic activity exclusion required; no stop-and-delete workaround |
| B2 — transcript storage/migration | Native per-session/category routing + restart-safe relocation transaction, covering logs, indexes and references; preserve Workspace sessions. Global root or cwd changes are unacceptable |
| B3 — adaptive/message effort | Supported Host pre-capture admission/selection seam tied to exact accepted input and serialized against other submissions; one-use overrides retained on failure and consumed once. General entry paths, queued/steered prompts and explicit native-picker intent including same-value choices must be covered |
| B4 — Direct Chat secure embedding | Prove embedded native Conversation + upload-only intake + restricted preset cannot navigate into unrestricted tools, change preset, expose arbitrary host paths, or inherit broad capabilities after resume |
| B5 — ownership lifetime | Prove native shared domain acquisition across independent plugin lifetimes, restart, disabled Direct Chat and domain failure. No external experimental plugin log records; native docs explicitly prohibit those callers |
| B6 — provider/default semantics | Exact provider/model effort tier mapping and actual adapter translation; distinguish absent/default/unsupported. No real provider or model catalog was queried in this phase |
| B7 — shared-file coordination | Integrate root browser/patch/package/test changes only after concurrent Profile work settles; future Profile tab separately coordinated and approved |

No upstream requests were posted and no maintainer was contacted. These are capability requirements for an upstream change or supported API/version, not permission to edit Harness core in this worktree.

## Phase A verification performed

Read-only Git branch/base/status and instruction discovery; repository source and contract review; inspection/hash inventory of 22 installed modules; installed settings renderer and native contributor tracing; source review of all 18 references with license checks; visual inspection of current suite/Environment/Humanizer artwork and read-only inventory of Profile artwork. The final documentation checks verify relative links, JSON, scope and whitespace. No product tests or Desktop/provider acceptance claims are made.

An independent builder review identified replacement-ID ownership quarantine and same-value manual reasoning intent as material gaps. Both are now explicit design rules, capability gates and roadmap test cases. The reviewer rechecked the changes and reported no further important planning questions beyond the documented native gates and owner approval.
