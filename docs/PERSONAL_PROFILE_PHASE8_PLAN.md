# Phase 8 — Controlled Personal Profile Disclosure

Status: **owner approved the prospective-only contract on 2026-11-20, with the requirements in §2. P1 (negative tests and this correction) is done. Production activation is NO-GO until every mandatory gate in §4 passes.** Nothing that discloses personal information is implemented. Work is local only, in `DSH-Suite-Phase8` (`feature/phase8-profile-disclosure-v08`, based on `687a936`). The earlier draft is preserved in commit `f420fc6`, and the evidence is in the [Phase 8 audit](PERSONAL_PROFILE_PHASE8_AUDIT.md). The `max_tokens` provider configuration is separate.

## 1. Scope

- **Fields:** existing optional fields only: preferred name, nationality, gender. No new personal fields.
- **Default:** disclosure is disabled. Master Off and Private always deny.
- **Ask First** stays disabled until a native destination-bound approval contract is verified (audit P8-04).
- **Custom instructions** stay a separate consent channel and are not reclassified.
- **Synthetic data only** in every test, fixture, log and report. Real backups are never read, copied or modified.

## 2. Owner requirements (2026-11-20)

| # | Requirement | Where it is met |
|---|---|---|
| R1 | Disabled by default | §5 8B migration, §4 G4 |
| R2 | Consent covers only explicitly authorized *future* disclosure | §3 |
| R3 | Never claim revocation removes transmitted, logged, summarized or branched data | §3, §5 8D copy |
| R4 | Bind consent to verified environment, provider identity and effective endpoint | §4 G1 (**not satisfiable today**) |
| R5 | Invalidate consent when the destination changes | §4 G2 |
| R6 | Recheck at the latest reliable admission boundary | §4 G3 (assembly + send time) |
| R7 | Prevent stale retry disclosure wherever enforceable | §4 G3 send-time guard |
| R8 | No consent from backups or legacy Allow | §4 G4, tests in §6 |
| R9 | Fresh explicit consent before activation | §4 G4 |
| R10 | Explicit consent scope and expiration | §4 G5 |
| R11 | Ask First disabled | §1 |
| R12 | Encrypt persistent profile data and backups | §4 G7, §5 8G |
| R13 | Disclose that Harness logs may retain shared information | §3, §5 8D |
| R14 | Synthetic data in every test | §1, §6 |

## 3. Contract (corrected)

**Guaranteed** (once the gates pass): a field is added to a *future* request only if every condition holds at both admission points (§4 G3):
- Master On, field Allow and Cloud On;
- a current, unexpired consent whose scope matches this request (§4 G5);
- a destination that matches the consent binding (§4 G1, G2).

**Not guaranteed (shown before consent, in both languages):**
- **Earlier content stays.** Revocation applies from the **next step**. It does not remove content that was already sent, logged, summarized or copied into a branch.
- **Retries.** A retry inside a running step reuses the prompt accepted for that step. This is proven by `qa/phase8-negative-check.mjs` and by the upstream test `system-prompt-admission.spec.ts:313`. The send-time guard refuses such a retry instead of sending it (G3), but only for this plugin's exact Profile block.
- **Replay depends on the route.** On in-history routes the earlier system prompt stays in later requests, including after a switch to another in-history provider (proven, audit N-5). On replace routes the prompt is normalized, but the stored event stays in the session log.
- **Derived content.** Model replies, compaction summaries and forks (proven) carry earlier content forward, and the Harness can neither filter nor delete it.
- **Plaintext logs.** Harness conversation logs store shared values in plaintext, outside plugin control, even when the profile record and backups are encrypted.
- **Clean boundary.** Only a new chat gives a clean context.

## 4. Mandatory gates for production activation

| Gate | Requirement | Mechanism | Status |
|---|---|---|---|
| G1 | Consent bound to environment, provider identity and effective endpoint | Environment = active Harness Profile. Provider identity = route label. **Endpoint: no verified value exists in rc.3, rc.5 or master.** Needs an upstream verified destination, or a verifiable endpoint fingerprint (research R1). | **FAIL**, blocks activation |
| G2 | Destination change invalidates consent | Invalidate when the label, the adapter generation or the endpoint fingerprint changes. Whether an endpoint edit emits `llm/adapters-updated` is unverified (R1). | Open |
| G3 | Recheck at the latest reliable boundary; no stale retry | (a) Admission at section assembly. (b) Send-time guard on `llm/stream`, the last point before the adapter, where the loop request is frozen and may be refused but not rewritten. It refuses a request that carries this plugin's Profile block when current admission denies it, which covers retries and in-history replay. Derivatives cannot be detected (accepted limit, §3). A refused in-history chat tells the user to start a new chat. | Open |
| G4 | Fresh explicit consent; never restored | Record v3 `disclosure` is written only by the consent screen. Migration, restore, import and backup never set it. The Host checks it independently of the page. | Open (current fail-closed behaviour tested) |
| G5 | Consent scope and expiry | Scope = {Harness Profile, consented field set, provider label, endpoint fingerprint, field values, contract version}. Expiry: **30 days**, or earlier when any scope element changes, on Master Off, on restore or import, or when a consented value is edited. A future or backward timestamp denies. | Open |
| G6 | Ask First disabled | No positive path; current omit tests | Pass (current) |
| G7 | Encrypted profile data and backups | Backups: password-based authenticated encryption (§5 8G). Record at rest: needs a key that is not stored beside it (OS-bound or unlocked per session). No native Harness facility exists. | **FAIL**, needs design decision |
| G8 | Retention disclosure | §3 text on the consent screen and after revocation | Open |
| G9 | Request-level evidence | Phase 7 #11–#13 and #18 closed, plus actual Desktop request capture with synthetic values | Open |

G1 and G7 are not achievable with the current Harness and current design. Phase 8 can be built and tested behind a disabled state, but **cannot be activated** until both pass.

## 5. Implementation plan

- **8B — record v3 and consent state** (`plugins/personal-profile/index.js` schema, `client.js` decoder):
  - `disclosure: {contract, acknowledgedAt, fields, provider, endpoint} | null`;
  - v2→v3 sets `null`;
  - backups export without `disclosure`, and imports reject it (already the case for v2, tested);
  - rollback warning before the first v3 save, because 0.8.0-rc.1 and 0.7.2 reject v3.
- **8C — admission** (`preferences.js` Host, and its `client.js` preview mirror):
  - one fixed-label, single-line, length-checked Profile block; gender limited to its enum;
  - every G1–G5 condition is checked, and any error yields no block;
  - plus the G3 send-time guard in the same plugin.
- **8D — UI:**
  - consent screen with the §3 limits, names the provider and the binding, shows the expiry;
  - revocation for Master, per field and per provider;
  - post-revocation notice: "Earlier messages, summaries and branches may still contain it; start a new chat";
  - Ask First keeps its "not active" text.
- **8E — tests:** extend §6 to the positive path, both routes and rc.3 + rc.5.
- **8F — docs and acceptance:** README, SECURITY, CHANGELOG, privacy gate and Windows checklist.
- **8G — encryption:**
  - **8G-1 backups (first).** Versioned envelope with AES-256-GCM via WebCrypto in the page, a random salt and nonce, a password-derived key, authentication before parsing, and the same generic failure for a wrong password or tampering. Plaintext v2 import stays available for migration only, with a warning. Encrypted import never restores consent.
  - **8G-2 record at rest.** Key source to be decided by the owner (§7). Disclosure stays off while the record is unreadable.
- **R1 research:** does an endpoint edit under an unchanged label change the adapter generation or emit `llm/adapters-updated`? Is there any value that can serve as an endpoint fingerprint without reading credentials?

No Harness change, transport or package export. 8G-1 needs no new dependency if the key derivation uses WebCrypto PBKDF2 (§7).

## 6. P1 results (2026-11-20, synthetic data)

| Check | Result |
|---|---|
| `test/personal-profile-phase8-backup.test.js` | 5 pass, 5 todo. Synthetic owner-equivalent v2 backup (field Allow, both switches Off):<br>• the Host reads it unchanged and contributes no field;<br>• default restore keeps every non-sensitive preference and resets permissions to Private;<br>• restored custom consent is dropped;<br>• opted-in permission restore keeps switches Off and discloses nothing;<br>• forged `disclosure` consent (v2 or v3) is rejected;<br>• export is plaintext and says so.<br>Todos: v3 migration, fresh consent, encrypted export (fails today on plaintext), secure import ×2. |
| `qa/phase8-negative-check.mjs` | rc.3 4/4 · rc.5 4/4:<br>• retry reuses the step prompt after revocation;<br>• an in-history provider switch resends the earlier prompt;<br>• a replace route does not;<br>• the log keeps it on both;<br>• a fork seed copies it;<br>• legacy Allow is inert on both routes.<br>No field and no `approval/asked` in any request or log. |
| `qa/profile-host-check.mjs` | rc.3 1/1 · rc.5 1/1 (unchanged) |
| `npm test` (Node 24.21.0) | all pass, plus the todos above |

Runtimes are isolated copies in `node_modules/.phase8-qa/`, loaded through `qa/runtime-resolve.mjs`.

## 7. Open owner decisions

1. **Key derivation for 8G-1.** PBKDF2-SHA-256 via WebCrypto (native, no dependency; recommended), or Argon2id as in the Phase 5 design (memory-hard; needs a reviewed WASM dependency).
2. **Plaintext export.** Remove it after 8G-1 (recommended), or keep it behind an explicit warning for rollback to 0.7.2 / 0.8.0-rc.1.
3. **Record encryption key (8G-2).** Windows DPAPI through the Host (Phase 5 prerequisites still open), or a passphrase unlocked each session.
4. **Expiry.** Confirm 30 days (G5).
5. **G1.** Accept that activation waits for an upstream verified destination, or approve a weaker binding (label + adapter generation) explicitly. The owner's current requirement is the verified binding.
