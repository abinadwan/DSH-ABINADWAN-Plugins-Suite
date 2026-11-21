# Phase 8 — Controlled Personal Profile Disclosure

Status: **implemented locally on 2026-11-20 under the owner's simplified requirements; not released.** Work is in `DSH-Suite-Phase8` (`feature/phase8-profile-disclosure-v08`, based on `687a936`). Evidence is in the [verification report](PERSONAL_PROFILE_PHASE8_REPORT.md). The earlier drafts are preserved in commit `f420fc6`, the audit in [PERSONAL_PROFILE_PHASE8_AUDIT.md](PERSONAL_PROFILE_PHASE8_AUDIT.md), and the superseded encryption/consent-record plan in commit `4accff6`.

## 1. Owner decisions (2026-11-20, supersede earlier Phase 8 proposals)

- **Backups:** plain JSON, no password and no encryption. Version 2 stays importable. Review & Merge is the default; Replace All needs explicit confirmation. A restore never turns sharing on. Exports say they are not encrypted.
- **Local storage:** native Harness settings, unchanged. No DPAPI, no profile encryption, no extra passwords or keys.
- **Permissions:** Allow, Ask First, Private, plus the two switches. No new consent system, no expiry, no renewal. Permissions stay in effect until the user changes them. Both switches default to Off.
- **Destinations:** use only supported Harness contracts. Fail closed where a destination cannot be established.
- **History:** apply changes at the earliest reliable native boundary, refuse stale sends where supported, and never promise retroactive deletion.

## 2. Design

| Rule | Implementation |
|---|---|
| Field is shared only when it is **Allow**, the **personal-information switch is On** and the **cloud switch is On** | `profileDisclosure()` in `plugins/personal-profile/preferences.js`, a separate system-prompt section `abinadwan:personal-profile-information` |
| **Every provider is treated as cloud** | Harness gives no verified endpoint or locality (`LlmConfigurableProvider` exposes only an advisory default endpoint; adapters may route a model elsewhere). With Cloud Off, nothing is shared on any provider. "Local only" is not offered. |
| **Ask First is never shared** | Native approval is per tool call and has no destination (audit P8-04). Shown as "not active" in the UI. |
| **Private never shared** | Same admission function |
| **Changes apply at the next step** | The section is evaluated at every step's assembly |
| **Stale sends are refused** | `llm/stream` listener: if a request carries a shared-details block that the current settings would not produce now (revoked, narrowed, value edited, unreadable settings), it yields a terminal `INVALID_REQUEST` finish instead of calling the adapter. The frozen request is never rewritten. |
| **Value hygiene** | One fixed header and one `Label: value` line per field; control, line-separator and bidi characters become spaces; gender only `male`/`female`; malformed records share nothing |
| **No logging of values** | The plugin logs nothing; the refusal message names no value |

Endpoint changes behind an existing provider name do not widen authorization: every destination already needs the cloud switch, and nothing is bound to a provider name.

## 3. What is guaranteed and what is not

**Guaranteed:** a field reaches a *new* model request only while it is Allow and both switches are On. After any change, the next step uses the new settings, and any request that still carries a block the current settings would not produce is refused before it reaches the provider. This covers retries, in-history replay, provider switches, restored and branched chats.

**Not guaranteed (stated in the UI):**
- Details already sent stay with the provider. They also stay in conversation history, Harness logs, summaries and branches; the plugin cannot delete them.
- On in-history providers, a chat that still carries details the user no longer shares stops at its next request. The user must start a new chat.
- Content the model derived from earlier details (replies, compaction summaries) is not detected.
- The guard runs only while the plugin is enabled.

## 4. Production acceptance gates (revised)

| Gate | Requirement | Status |
|---|---|---|
| A1 | Disabled by default; both switches Off; Private by default | Pass (unit + UI tests) |
| A2 | Only Allow + both switches shares; Private and Ask First never | Pass (108-case matrix, real loop rc.3 + rc.5) |
| A3 | Unverified destinations never get broader authorization (all treated as cloud) | Pass |
| A4 | Changes apply at the next step | Pass (real loop) |
| A5 | Stale retry, in-history replay, provider switch, edited value, restored or branched history: refused at send time | Pass (real loop rc.3 + rc.5) |
| A6 | Restore never enables sharing; v2 backups import; malformed backups rejected; Review & Merge default; Replace All confirmed | Pass |
| A7 | Persistence across save, reload and Host restart; corrupted data rejected; native atomic write | Pass (runtime tooling check rc.3 + rc.5) |
| A8 | Retention limits disclosed; no retroactive deletion promised | Pass (UI copy, README, SECURITY) |
| A9 | Package compatibility and full regression | Pass |
| A10 | **Actual Windows Desktop behavior**, including request capture with synthetic values | **Open: owner step** ([report §4](PERSONAL_PROFILE_PHASE8_REPORT.md)) |

Removed from the gates by owner decision: backup encryption, profile encryption, consent expiry, consent records, verified endpoint binding.

## 5. Remaining native limitations

- No verified provider locality or effective endpoint: sharing needs the cloud switch for every provider.
- No destination-bound approval: Ask First stays inactive.
- No history isolation or deletion: earlier disclosures remain in native history and logs.
- Derived content cannot be filtered.

These are documented, not worked around.
