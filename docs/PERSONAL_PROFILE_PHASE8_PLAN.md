# Phase 8 — Controlled Personal Profile Disclosure

Status: **plan updated 2026-11-19; stopped at the implementation approval gate (§6). Nothing is implemented.** The branch `feature/phase8-profile-disclosure` is fast-forwarded to main (`31b071c`, Phase 7D merged). Phase 7 fail-closed behaviour stays intact until the owner decides §6. The `max_tokens` provider configuration is separate and out of scope.

## 1. Scope (unchanged)

- **Fields:** existing optional fields only: preferred name, nationality, gender. No new personal fields.
- **Always deny:** Master Off and Private.
- **Allow and Ask First:** these may only take effect under a contract the owner has approved (§3).
- **Cloud Off:** denies unknown, untrusted and cloud destinations. Trust is never inferred from localhost.
- **Custom instructions** stay a separate explicit consent channel. No stored grant is reclassified or promoted automatically.
- **Storage and JSON backups** stay plaintext under the current contract.

## 2. 8A — upstream review (read-only, done)

| Blocker from the [Phase 7C privacy gate](PERSONAL_PROFILE_PHASE7C_PRIVACY_GATE.md) | Status at rc.5 |
|---|---|
| System prompt is stored in the append-only session log and replayed; no supported last-mile redaction | **Unchanged** |
| Endpoint metadata is advisory; no verified local-only destination | **Unchanged** |
| No native destination-bound, single-use approval | **Unchanged** |
| No isolation across retry, compaction, provider switch or plugin disable | **Unchanged** |

Evidence for the table:
- **Versions compared.** Upstream has published 0.2.2-rc.4 (2026-11-17) and rc.5 (2026-11-18). The suite and Desktop are pinned to rc.3.
- **Files compared.** The published `dsh-agent-loop`, `dsh-session` and `dsh-llm` packages were compared file by file. Between rc.3 and rc.5, `dsh-agent-loop` and `dsh-session` differ only in `package.json` (the version). `dsh-llm` adds one error code (`CONTENT_REFUSED`).
- **Plugin side.** The plugin's admission point already exposes a route label (`modelSelection.provider`/`model`) in `eligibleAssembly`. That label is a name, not a verified endpoint.

**Conclusion: the original Phase 8 guarantee is still NO-GO.** That guarantee is that no restricted information or derivative is replayed after permissions change. Positive disclosure is possible only if the owner explicitly approves the weaker **prospective-only** contract that the privacy gate already names as an option (§3).

Phase 7 evidence gates that are still open and stay prerequisites for any stable release ([acceptance record](PERSONAL_PROFILE_PHASE7_WINDOWS_ACCEPTANCE.md)):
- **#12 (BLOCKED):** actual request inspection.
- **#13 (BLOCKED):** route and provider change.
- **#11 (PARTIAL):** permission opt-in evidence.
- **#18 (PARTIAL):** post-rollback integrity.

## 3. Contract proposed for approval: prospective-only disclosure

**What it guarantees:**
- **Admission.** A field is added to *future* requests only when every condition holds at request assembly:
  - Master On;
  - field policy Allow;
  - a current Phase 8 acknowledgment;
  - Cloud On;
  - the active route's provider on the user's authorized list.
- **Revocation.** Any revocation removes the field from every *later* request immediately.

**What it does not guarantee (shown to the user before consent):**
- **History.** Requests already sent, and the session history, keep the field. That includes the system prompt the Harness stores and replays, and anything the model said about it.
- **Provider switch.** Switching provider inside a chat that already contains the field replays that history to the new provider. The provider list controls only new admissions. Starting a new chat is the only clean boundary.
- **Labels.** The provider label is the Harness route name, not a verified endpoint. Cloud Off therefore denies everything: there is no verified local-only destination.

**Deliberately excluded:**
- **Ask First stays omitted.** No native single-use, destination-bound approval exists, and a plugin-drawn prompt would promise what cannot be enforced. This is the same rule as Phase 7C.
- **No retroactive erasure claim**, and no change to custom-text consent.

## 4. Minimal implementation (only if §3 is approved)

### 8B — consent and destination authorization (state)

- **Record version 3 with a migration.**
  - New field: `disclosure: {acknowledged: <contract version> | null, providers: string[]}`.
  - The Browser decoder is strict and rejects unknown fields, so a version bump is the only correct way to store this.
  - Migrating v2 records sets `acknowledged:null, providers:[]`.
- **No silent activation.** Existing Allow grants stay inactive until the user acknowledges the contract. The migration activates nothing.
- **The acknowledgment and the provider list are cleared on:**
  - backup restore, import and migration (same rule as `sendCustom`);
  - any change of the contract version;
  - Master Off.
- **Rollback impact.** 0.8.0-rc.1 and 0.7.2 cannot read a v3 record or a v3 backup. The 8F acceptance must test rollback, and the UI must warn before the first v3 save. This needs owner approval (§6, decision 2).

### 8C — admission (one place)

- **Location.** Extend the single existing renderer path (`responsePreferences`, Host, with its `client.js` preview mirror). Add a separate allowlisted "Profile" block that is built only from the three fields. No second injection path.
- **Inputs.** Admission takes the record plus `context.modelSelection.provider`. Every unknown or malformed state denies.
- **Values.** Field values are length-checked and normalized to a single line, and inserted as data under fixed labels (for example `Preferred name: …`). Gender is limited to its enumerated values.
- **Fail-closed.** Any exception yields no Profile block. The existing preferences still render.

### 8D — UI and revocation

- **Consent step.** It shows the §3 limits in plain language, names the current provider, and records the acknowledgment and the authorized providers.
- **Revocation controls.** Master, per-field and per-provider switches. Each removes the field from the next request.
- **Notice after revocation.** "Earlier messages in this chat still contain it; start a new chat for a clean context."
- **Ask First.** It keeps today's "not active" explanation.

### 8E — tests (synthetic data only; no LLM benchmarks or heavy local models)

1. **Unit admission matrix.** All combinations of master × policy (3 fields) × acknowledgment × Cloud × provider authorized/unauthorized/missing. The field appears **only** when all conditions hold. Every Phase 7C negative case (108 combinations) still returns exactly the baseline.
2. **Consent lifecycle.**
   - Migration from v2 activates nothing.
   - Restore, import and contract-version change clear the acknowledgment and providers.
   - Master Off clears them.
   - Ask First never renders.
3. **Revocation.** On the request after each revocation (master, field, provider, Cloud), the field is absent.
4. **Destination.** A provider switch to an unauthorized provider omits the field from new admissions. A test also asserts and documents that history from earlier turns is still replayed, which proves the limitation stated in the UI.
5. **Privacy regressions:**
   - custom-text consent behaviour is unchanged;
   - Phase 7D wording is unchanged (existing golden tests);
   - Host = Browser parity covers the new block;
   - no field leaks through tools or approval prompts;
   - malformed and oversize values deny.
6. **Real Agent Loop.** The offline adapter at the pinned rc.3 (extending `qa/profile-host-check.mjs`) covers positive and negative paths, and asserts the session log after revocation and after plugin disable.
7. **Rollback.** v3 to 0.8.0-rc.1 and 0.7.2 behaves as documented (record ignored or refused, no crash, no data loss of the v2 backup kept before migration).

### 8F — documentation and acceptance

- Update the privacy gate, README, CHANGELOG and the Windows acceptance checklist.
- Owner Windows acceptance includes actual outgoing-request inspection, which closes Phase 7 #12 and #13 for this contract.
- No stable release without separate approval.

## 5. Size and risk

- **Size.** About three focused changes (schema/migration, admission, UI) plus tests in the existing files. No Harness change, dependency or new transport.
- **Main risks:**
  - users may misread the prospective-only limits (mitigated by the consent text and the post-revocation notice);
  - the v3 record breaks rollback (mitigated by the pre-save warning and the retained v2 backup);
  - provider labels can be renamed by the user (mitigated because authorization binds to the exact label, and an unknown label denies).

## 6. Approval gate — owner decisions required

1. **Contract:** approve the prospective-only disclosure contract in §3, or keep Phase 8 NO-GO. Keeping NO-GO leaves the fail-closed Phase 7C behaviour unchanged and ends Phase 8 here.
2. **Record v3:** approve record v3 and its rollback consequences for 0.8.0-rc.1 and 0.7.2 backups.
3. **Ask First:** confirm it stays inactive (recommended) until upstream provides native destination-bound single-use approval.
4. **Cloud Off:** confirm Cloud Off denies all destinations (recommended, since no destination is verifiable as local).

Nothing in §4 starts before these decisions. The `max_tokens` configuration stays a separate decision.
