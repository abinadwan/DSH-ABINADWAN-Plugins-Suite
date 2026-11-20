# Personal Profile Phase 8 — recovery and security audit

Status: **read-only audit, 2026-11-20, kept as evidence.** Later the same day the owner replaced the encryption and consent-record requirements with a simplified model (no backup or profile encryption, no consent expiry or new consent records). The findings below still describe the native limits; how each is now handled is in the [Phase 8 plan](PERSONAL_PROFILE_PHASE8_PLAN.md) and the [verification report](PERSONAL_PROFILE_PHASE8_REPORT.md). Sections 4, 7, 8 and 9 are superseded by that plan. No push, PR, release or experiment with real personal data. Use synthetic values only.

| | |
|---|---|
| Worktree | `C:\Users\Admin\Desktop\DSH-Suite-Phase8` |
| Branch | `feature/phase8-profile-disclosure-v08` (local, no upstream) |
| Baseline | `687a936` = head of local `integration/suite-v0.8` |
| Commit on top | `f420fc6`: the uncommitted Phase 8 drafts, carried over verbatim |
| Harness reviewed | rc.3 `38a6a5c`, rc.5 `9c2670d`, `master` `2e39e70` (the upstream head on 2026-11-20; no newer tag than rc.5) |

## 1. Recovery

| Item | Found | State |
|---|---|---|
| `PERSONAL_PROFILE_PHASE8A_REVIEW.md` | **Does not exist** in any branch, worktree, stash or session transcript | The 8A review exists only as §2 of the Phase 8 plan |
| Finding IDs P8-01…P8-06 | Not in any repository file | §3 maps them onto the recorded blockers |
| Phase 8 plan draft (rc.5 review + approval gate) | Uncommitted in the main checkout (`feature/phase8-profile-disclosure`, `31b071c`) | Preserved in `f420fc6`. The original working copy is untouched. |
| Phase 7D completion lines, CHANGELOG entry | Same checkout, uncommitted | Preserved in `f420fc6` |
| Phase 7C gate, 7A research, Phase 7 acceptance, Phase 5 encryption design, DPAPI spike (`origin/security/personal-profile-windows-dpapi-spike`) | Committed | Read, unchanged |
| Current implementation | `plugins/personal-profile/{index,preferences}.js`, `client.js:679-1470` | Same as `31b071c`. Integration added no Profile changes. |

**Draft assessment.** The plan's rc.5 review is correct: between rc.3 and rc.5 the runtime code differs only by the `CONTENT_REFUSED` error code (verified file by file on the extracted runtimes, ignoring type and map files). The scope, the deny rules and the record-v3 approach are sound. Two statements in §3 are **inaccurate** and must be fixed before the owner decides (see P8-01 and P8-03):

1. "Any revocation removes the field from every later request immediately." Not true for retries of a step that is already running.
2. "The system prompt the Harness stores and replays." This depends on the route. The prompt is resent only on in-history routes. On other routes it is stored but replaced. Derived content always replays.

## 2. Current capability matrix (`687a936`)

| Requirement | Native Harness (rc.3 = rc.5 = master) | Current suite | Draft plan | Achievable |
|---|---|---|---|---|
| Name, nationality, gender | — | Stored (≤128 chars, gender enum). **Never sent.** | Fixed-label Profile block | Yes, prospective-only |
| Allow | — | Saved only, inactive | Active only with v3 acknowledgment | Yes, prospective-only |
| Ask First | Approval is per tool call, not per destination | Saved only, inactive | Stays inactive | **No** |
| Private / Master Off | — | Omit (108-case matrix) | Omit | Yes (already enforced) |
| Local vs cloud | No verified destination; endpoint metadata advisory | Switch saved; everything omitted | Cloud Off denies all | Deny only. "Local only" cannot be offered. |
| Environment permissions | One record per Harness Profile | Per Harness Profile. Per-Workspace was removed in 0.7.2 by owner decision. | Per provider label | Per Harness Profile + provider label |
| Explicit consent | — | `sendCustom` pattern (cleared on edit and restore) | Contract-version acknowledgment | Yes |
| Revocation | Sections fixed for each step; history kept | n/a | "Immediately" | **From the next step**, not retroactive |
| Approval expiry | `allowed-once` per ask only | None | None | Plugin-side acknowledgment TTL only (decision §9) |
| Encrypted storage | No OS-protected store in the runtime | Plaintext record and backups | Plaintext | Record/backup only; session logs stay plaintext |
| Request admission | `eligibleAssembly` (top-level agent, selection captured) | Present | Host admission + client mirror | Yes |
| Retry | Prompt rendered once per step | n/a | Not addressed | Next step; optional send-time veto |
| Model/provider switch | Selection fixed per step; history replays | n/a | Provider list for new admissions | Yes for admission; replay is a disclosed limit |
| Direct Chat | Separate process and registry | Profile never reaches it | — | Out of scope |

## 3. Security findings

Status key: **Unresolved** = blocked by Harness and unchanged on rc.5 and master. **Design** = solved on paper, not built. **New** = first recorded here.

### P8-01 Conversation history disclosure — Unresolved (native)

- Each request is a frozen copy of the session surface ([agent.ts L734](https://github.com/deepseek-ai/deepseek-harness/blob/9c2670d3bce5275e0d1610272958121af87787bb/packages/core/agent-loop/src/agent.ts#L734)). `llm/stream` may read or refuse the request but must not rewrite it ([llm index.ts L63-L76](https://github.com/deepseek-ai/deepseek-harness/blob/9c2670d3bce5275e0d1610272958121af87787bb/packages/llm/llm/src/index.ts#L63-L76)).
- `SystemPromptProjection` ([runtime-context.ts L104-L113](https://github.com/deepseek-ai/deepseek-harness/blob/9c2670d3bce5275e0d1610272958121af87787bb/packages/core/agent-loop/src/runtime-context.ts#L104-L113)):
  - **In-history routes:** a changed prompt is appended. The old node stays on the surface and is **resent**. The rc.3 real-loop check proves this (`qa/profile-host-check.mjs:91-92`).
  - **Other routes:** the head node is replaced. The old prompt is **not resent**, but its event stays in the append-only JSONL log.
- Derived content (assistant replies, compaction summaries) is always replayed. A compaction summary is a durable event that includes the raw output and may come from another route ([compaction types.ts L34-L57](https://github.com/deepseek-ai/deepseek-harness/blob/9c2670d3bce5275e0d1610272958121af87787bb/packages/compaction/compaction/src/types.ts#L34-L57)).
- **New:** a fork copies the exact event prefix ([fork.ts L21](https://github.com/deepseek-ai/deepseek-harness/blob/9c2670d3bce5275e0d1610272958121af87787bb/packages/core/session/src/fork.ts#L21)), and on `master` the copied parent log is stored when the fork is created. Branches inherit every disclosure.
- Conversation Lifecycle cannot delete anything (HANDOVER: no native retirement contract).

**Consequence:** prospective-only is the strongest contract available. The consent text must name in-history replay, derivatives, compaction, branches and the on-disk log.

### P8-02 Unverified data destination — Unresolved (native) + New risk

- `modelSelection.provider` is a route label. `prepareCall` returns model metadata, not a verdict on trust or locality. rc.5 and master are unchanged.
- **New:** authorization by label alone follows the label if its endpoint is re-pointed in settings while the label stays the same. The draft covers renames only. `llm/adapters-updated` is a topology notification, and it is **unverified** whether an endpoint edit emits it (research item R1).
- Cloud Off must deny everything, and localhost is never proof of anything (unchanged rule).

### P8-03 Stale permissions during retry — Confirmed (native), draft inaccurate

- `renderedPrompt` is computed once per step ([agent.ts L448](https://github.com/deepseek-ai/deepseek-harness/blob/9c2670d3bce5275e0d1610272958121af87787bb/packages/core/agent-loop/src/agent.ts#L448)) from the assembly made at pre-step ([L300](https://github.com/deepseek-ai/deepseek-harness/blob/9c2670d3bce5275e0d1610272958121af87787bb/packages/core/agent-loop/src/agent.ts#L300)).
- A retry (`agent/request-error` → `retry`, [L566](https://github.com/deepseek-ai/deepseek-harness/blob/9c2670d3bce5275e0d1610272958121af87787bb/packages/core/agent-loop/src/agent.ts#L566)) reuses it. Only runtime contexts are refreshed ([L452](https://github.com/deepseek-ai/deepseek-harness/blob/9c2670d3bce5275e0d1610272958121af87787bb/packages/core/agent-loop/src/agent.ts#L452)), and those are durable user messages, so they are not a safe alternative.
- A revocation during backoff, or between assembly and the first send, is therefore honored only from the **next step**.
- The provider and model cannot change inside a step ([L642](https://github.com/deepseek-ai/deepseek-harness/blob/9c2670d3bce5275e0d1610272958121af87787bb/packages/core/agent-loop/src/agent.ts#L642)), so a retry cannot reach a different route.

**Options:**
- (a) State "from the next step".
- (b) Also add a send-time `llm/stream` check that refuses any loop request containing this plugin's exact Profile block when current admission denies it.

7A recorded that this veto is useful but **not a full solution**: it vanishes on disable and cannot catch paraphrases or compaction. It is offered here only as hardening. It is not a guarantee, so the 7A rejection still stands. On in-history routes, after revocation it refuses every later request in that chat, which forces "start a new chat". That is an owner UX decision.

### P8-04 Inadequate approval contract — Unresolved (native)

- The outcome is `allowed-once` per ask ([user-approval types.ts L32](https://github.com/deepseek-ai/deepseek-harness/blob/9c2670d3bce5275e0d1610272958121af87787bb/packages/interaction/user-approval/src/types.ts#L32)).
- The ask is keyed to `toolName`/`callId`, with no destination. The `reason` is stored durably in `approval/asked` ([L44-L48](https://github.com/deepseek-ai/deepseek-harness/blob/9c2670d3bce5275e0d1610272958121af87787bb/packages/interaction/user-approval/src/types.ts#L44-L48)).
- `master` changes only type branding. Ask First stays inactive.
- If Ask First is ever built, values must never appear in `reason` or `displayReason`.

### P8-05 Legacy Allow treated as fresh consent — Design (not exploitable today)

- Migrating v1 resets policies to Private and both switches to Off (`client.js:838-842`).
- However, v2 records can hold Allow values saved while the UI said "not active", and a backup restore can bring back Allow and both switches after acknowledgment (`client.js:1172-1175`).
- Activating Allow directly would turn these into disclosure without fresh consent.
- Draft 8B fixes this: record v3, `disclosure.acknowledged:null` on migration, cleared on restore, import, contract change and Master Off.

**Required additions:**
- The acknowledgment is never restorable from a backup (same as `sendCustom`).
- The **Host** checks it independently of the UI.

### P8-06 Unencrypted personal data storage — Unresolved by design

- Plaintext since 0.7.0 (v0.7.2 change record item 7).
- The Phase 5 design (Argon2id + AES-GCM portable backups) and the DPAPI spike were never integrated, and their activation prerequisites (Phase 5 §"integration prerequisites") are still open.
- The rc.5 credential store sources are `env`/`file`/`project-env`/`user-env` ([credentials index.ts L118-L123](https://github.com/deepseek-ai/deepseek-harness/blob/9c2670d3bce5275e0d1610272958121af87787bb/packages/credentials/credentials/src/index.ts#L118-L123)). No DPAPI, keychain or `safeStorage` use was found in the runtime.
- **New:** once disclosure works, the values are written into Harness session JSONL logs (`system/message`) in plaintext, outside plugin control and with no delete. Encrypting the profile record would not protect disclosed values. The UI must say so, and encryption cannot be a Phase 8 privacy claim.
- **Observation:** `C:\Users\Admin\Desktop\personal-profile-backup.json` (858 bytes, 2026-11-18) exists. It was **not opened**. The owner should check whether it holds real data and store or remove it.

### Other findings

| ID | Finding | Evidence | Action |
|---|---|---|---|
| N-1 | Direct Chat never gets the Profile section (separate process, own registry) | `qa/direct-chat-desktop/worker.js:53` | Keep it out of Phase 8. Re-review if productization ever loads the suite there. |
| N-2 | Auxiliary calls: subagents, delegation, origin sessions and diagnostic assembly are excluded. Titles read human messages only. | `preferences.js:79-85`; [session-title L98](https://github.com/deepseek-ai/deepseek-harness/blob/9c2670d3bce5275e0d1610272958121af87787bb/packages/session/session-title/src/index.ts#L98) | Keep. Compaction can summarize derivatives (P8-01). |
| N-3 | Custom text is gated by `sendCustom` only, not Cloud Off (by design, label says "including cloud") | `client.js:749` | Phase 8 copy must not imply that Cloud Off restricts custom text |
| N-4 | Logging: suite logs only inventory and environment errors. The Host section swallows errors and returns `''`. | `client.js:661,1912,1930`; `index.js:65-67` | No value leakage. Keep value-free. |
| N-5 | **Proven 2026-11-20 (rc.3, rc.5):** after a switch to another **in-history** route, the earlier prompt is resent to the new provider. A replace route does not resend it. | `qa/phase8-negative-check.mjs`; `runtime-context.ts L106` | Stated in the corrected contract (plan §3) |

## 4. Remaining implementation tasks (only after §9 approval)

1. **Plan correction.** Fix the two §3 statements. Add the limits for label re-pointing, forks, compaction and on-disk logs.
2. **R1 research.** Does an endpoint edit under an unchanged label emit `llm/adapters-updated` or change the adapter generation? If it does, clear provider authorizations on that event. If not, require re-authorization whenever the adapter settings revision changes, or accept and document the risk.
3. **8B record v3** (`plugins/personal-profile/index.js` schema, `client.js` decoder):
   - `disclosure:{acknowledged:<contract>|null, acknowledgedAt?, providers:[]}`;
   - v2→v3 migration activates nothing;
   - restore and import drop `disclosure`;
   - Master Off and a contract change clear it;
   - pre-save rollback warning.
4. **8C admission** in `preferences.js` (Host) and the `client.js` preview mirror:
   - fixed-label, single-line, length-checked block; gender limited to the enum;
   - every condition in plan §3, plus the TTL if chosen;
   - any error → no block, preferences unchanged.
5. **8C′ optional send-time veto** (`llm/stream`), only if the owner approves P8-03(b).
6. **8D UI:**
   - consent screen listing every limit in §3;
   - per-field, per-provider and Master revocation;
   - post-revocation notice;
   - Ask First "not active".
7. **8E tests** (§5), then **8F** docs and owner Desktop acceptance.

No Harness change, dependency, transport or package export is needed.

## 5. Verification plan (synthetic values only)

| Area | Test | Layer |
|---|---|---|
| Unapproved disclosure | All master × policy × ack × Cloud × provider × TTL combinations; the existing 108 negatives unchanged | Unit |
| Admission source | Host denies when the UI is bypassed (hand-edited v3 record, forged ack, restored ack) | Unit + real loop |
| Model/provider switch | Unauthorized provider gets no new block. Plain and in-history routes both covered. N-5 proven or refuted. | Real loop rc.3 + rc.5 |
| Revocation and retry | Revoke during `agent/request-error` backoff: document same-step carry-over; next step absent; veto refuses if built | Real loop |
| Expiry | TTL boundary, backward clock denies | Unit |
| Restore and branching | Resume, cold restart, fork: inherited prefix asserted and documented | Real loop + Desktop |
| Compaction | Forced compaction after disclosure: summary content and route recorded as the limit | Real loop |
| Profile isolation | Two Harness Profiles: no cross-read; restore into another Profile drops ack | Unit + Desktop |
| Logging and diagnostics | Marker scan of console, approval audit, errors and Environment & Context views | Real loop + Desktop |
| Tool and auxiliary leakage | Subagent, title, compaction, Direct Chat, tool results: no block | Real loop |
| Backup and restore | v3 export/import drops ack; v3 → 0.8.0-rc.1 and 0.7.2 rollback without crash or loss (retained v2 backup) | Unit + Desktop |
| Encrypted backup | Only if the owner starts the Phase 5 workstream; otherwise assert the plaintext warning | — |
| Windows Desktop | Isolated rc.3 Desktop, synthetic profile and loopback provider capturing **actual requests** (D2 setup); closes Phase 7 #12/#13 for this contract | Desktop |

Isolation: QA runtimes under `DSH-Suite-Phase8/node_modules/.phase8-qa/`, a separate synthetic Desktop profile and port, never the D2/D3 directories.

## 6. Shared files and integration conflicts

| File | Phase 8 change | Overlap | Risk |
|---|---|---|---|
| `plugins/personal-profile/*` | Yes | None | — |
| `client.js` | Profile region `679-1470` | New plugins added at line 10, `1473-1853` and around `1900` | Medium: same file, adjacent hunk at ~1470 |
| `test/personal-profile-*.test.js`, `qa/profile-host-check.mjs` | Yes | None | — |
| `test-support/client.js` | Avoid; additive only if needed | Changed by new plugins (+28) | Low |
| `CHANGELOG.md` | Already changed in `f420fc6` (Unreleased) | Every component adds entries | High (text only) |
| `README.md`, `SECURITY.md`, `docs/PERSONAL_PROFILE_*` | Docs | README is shared | Low–medium |
| `package.json`, `cordis.patch.yml`, `index.js`, `package-lock.json` | **None** planned (version stays 0.8.0-rc.1) | New-plugin exports and components | None if untouched |
| `HANDOVER.md` | None. The integrator adds the Phase 8 row. | Integration-owned | — |

Behavioral overlap:
- **Adaptive Reasoning** changes `reasoningEffort` through model selection. Phase 8 admission must key on `provider` only and ignore effort.
- **Lifecycle** cannot delete, so Phase 8 must not promise deletion.
- **Direct Chat:** see N-1.

**Observed concurrent edits (not Phase 8):** `plugins/adaptive-reasoning/index.js` is modified and uncommitted in both `DSH-Suite-Integration` and `DSH-Suite-NewPlugins` (the latter now on `feature/adaptive-reasoning-completion`). The integration worktree is therefore not clean.

## 7. Prioritized completion plan

1. **P0 Decisions** (§9) and R1.
2. **P1** Correct the plan; add negative tests and N-5 / retry / fork / compaction probes on rc.3 and rc.5 before any positive path.
3. **P2** Record v3, migration, restore rules, rollback tests.
4. **P3** Host admission + mirror + unit matrix; optional veto.
5. **P4** UI and copy (Arabic and English).
6. **P5** Real-loop suite on rc.3 + rc.5; full `npm test` and `check:package`.
7. **P6** Owner Windows Desktop acceptance with request capture.
8. **P7** Docs; hand over for local merge into `integration/suite-v0.8`. No stable release without separate approval.

## 8. Production acceptance criteria

1. Default deny: a new install, a migration or a restore discloses nothing until a fresh acknowledgment of the current contract version.
2. A field appears in a captured outgoing request **only** when every admission condition holds, checked by the Host.
3. After any revocation, no new Profile block from the next step on, verified by request capture on plain and in-history routes.
4. An unauthorized or unknown provider label never receives a new block. Cloud Off denies all.
5. The consent screen states every limit in §3 (history, in-history replay, derivatives, compaction, forks, plaintext logs, label not verified, next-step revocation). The owner has reviewed both languages.
6. No values in logs, approval audit, errors, diagnostics, titles, subagents, tools or Direct Chat.
7. Record v3 rollback to 0.8.0-rc.1 and 0.7.2 is documented and tested without data loss.
8. Phase 7 #12 and #13 are closed by actual request inspection on Windows Desktop. #11 and #18 are completed.
9. CI passes on Windows/Linux Node 22/24, plus packed-artifact and rc.3 + rc.5 real-loop checks.
10. Separate owner approval for any stable release.

## 9. Owner decisions (gate)

The four decisions in [Phase 8 plan §6](PERSONAL_PROFILE_PHASE8_PLAN.md) still apply (contract, record v3, Ask First inactive, Cloud Off denies all). This audit adds:

5. **Revocation timing:** accept "from the next step" (P8-03a), or also add the send-time veto with its "start a new chat" effect (P8-03b).
6. **Label re-pointing:** after R1, clear provider authorizations on adapter changes, or accept and document the risk.
7. **Acknowledgment expiry:** none (until revoked), or a fixed TTL.
8. **Encryption:** keep plaintext (record, backups and session logs) and state it, or start the Phase 5 encrypted-backup workstream separately. It is not a Phase 8 privacy claim.
