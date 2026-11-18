# Phase 7 — Windows Desktop acceptance (0.8.0-rc.1)

Status: Windows Desktop owner testing performed on 2026-11-18; functional results reported below. Security/request-level and remaining acceptance checks are OPEN. Merge of the candidate baseline is authorized by the owner; this is not stable-release approval. Host target 0.2.2-rc.3; actual Desktop application Host version was not independently recorded (the suite Host/browser versions were). Do not publish a stable release until the outstanding gates are resolved and the owner approves.

## Safe installation

1. In the existing Desktop, record Host and installed/browser version, active Harness Profile and existing Git install spec. Export Personal Profile JSON and preserve a separate local copy of the active Profile configuration using the supported Host backup process. Backups are plaintext. Use fictional data only for testing. Do not post backups, keys, or log contents.
2. Use the Desktop native Plugins UI, not `dsh plugin --profile desktop` (Desktop owns its profile). For an unpinned install, native update may be unavailable; do not remove the current installation without a tested rollback plan and an independently verified backup. Install the RC only by its full tested immutable Git SHA through a supported native install flow. The stable-only checker deliberately does not offer RC builds.
3. Verify the Host and browser both report 0.8.0-rc.1. If the installation fails, stop and retain the known-good v0.7.2 install spec; do not overwrite production settings.

## Acceptance matrix (PASS / FAIL / BLOCKED)

| ID | Test | Expected |
|---|---|---|
| 01 | Version and components | Both versions match RC; all three components present |
| 02 | Profile page, Arabic/English | No blank page; independent interface language |
| 03 | Change style/language without Save | Existing committed preferences still used |
| 04 | Save distinctive synthetic style/language | Next supported native chat step uses preferences; inspect available native request view if possible |
| 05 | Existing and new chats | Subsequent supported native steps see saved preferences |
| 06 | Restart | Settings remain saved |
| 07 | Custom text without opt-in | Not contributed |
| 08 | Explicit opt-in and Save | Synthetic custom text contributed literally |
| 09 | Edit text and save | Consent cleared; new text not contributed |
| 10 | Restore Replace All / Replace+Merge | Consent cleared for both; restore is draft until Save |
| 11 | Export, old backup, restore permissions | JSON readable; permissions only restored after explicit acknowledgment |
| 12 | Synthetic name, nationality, gender, all Allow | No structured field in actual native request, even with master/cloud On |
| 13 | Change route and revoke policies | Structured fields still absent; historic custom text may remain |
| 14 | Disable and re-enable | No new contribution after disable; re-enable once; history not erased |
| 15 | Humanizer | Skill still works independently |
| 16 | Environment & Context | Session/workspace/token UI still works |
| 17 | Update checker | RC identity correct, stable-only release check, no silent install |
| 18 | Rollback readiness | Known-good SHA and verified backup available; optional rollback only with owner approval |

Use synthetic marker values; inspect actual request content rather than relying on model replies. Do not infer positive privacy guarantees from a model reply. In-history replay of previously authorized custom text is a documented limit. Positive structured disclosure, background-agent scope, and unverified Direct Chat integrations are not accepted by this matrix.

Report Host version, RC SHA, PASS/FAIL/BLOCKED per row and sanitized error details only.

## Owner acceptance record — 2026-11-18

- Tested candidate: `160924074a1c019c92dc4d9e8b0bf99b7733610d`, suite Host and browser both `0.8.0-rc.1`, pinned Git install; [CI run 195](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/actions/runs/44293922599) completed successfully (Windows/Linux, Node 22/24; tests, packed artifact and offline Harness integration).
- Previous stable: `0.7.2`, `64bd600ee15bbb661cb91e3701e16ec6378deadf`. Owner demonstrated actual rollback to this revision with matching suite Host/browser and stable-only checker. Personal Profile backup was taken before upgrade and restored successfully on the RC. A separate native Host configuration backup was not independently confirmed; post-rollback settings were not independently inspected.
- Evidence: owner-provided screenshots, sanitized chat outcomes and explicit PASS reports. No raw backups, personal values, or request logs are included. The runtime RC was tested; subsequent documentation-only commits were not installed separately.

| ID | Result | Desktop evidence / limitation |
|---|---|---|
| 01 | PASS | RC identity and pinned SHA displayed; three components individually exercised. |
| 02 | PASS | Arabic RTL and English LTR pages rendered; separate response-language setting visible. |
| 03 | BLOCKED | Unsaved-change indicator observed; an isolated before-save native chat comparison was not recorded. |
| 04 | PARTIAL | Saved preferences and synthetic custom marker reflected in responses; actual outgoing request not inspected. |
| 05 | PARTIAL | New native chats worked; a controlled existing-chat before/after comparison was not recorded. |
| 06 | PASS | Full exit/relaunch retained text, preferences and both consent states; authorized marker appeared again. |
| 07 | PARTIAL | Marker absent in new chat without consent; preview excluded it; outgoing request not inspected. |
| 08 | PARTIAL | Marker appeared after explicit consent and Save, including after restart; outgoing request not inspected. |
| 09 | PASS (functional) | Edited synthetic text was retained with consent off, absent from preview and subsequent response; request not inspected. |
| 10 | PASS (owner report) | Replace All and Replace+Merge tested; merge retained current marker and imported text, consent cleared; owner confirmed draft/save behavior for complete restore. |
| 11 | PARTIAL | Owner reported 8/8 old-backup restore checks passed; separate permission-opt-in/acknowledgment evidence not recorded. |
| 12 | BLOCKED (request evidence) | With synthetic fields and all sharing allowed, model did not reveal fields; no actual request inspection. |
| 13 | BLOCKED (route/request evidence) | Revocation yielded no disclosure in a new chat; provider change and actual requests not verified. |
| 14 | PASS (owner report) | Component hidden while disabled, instructions stopped applying, settings retained after re-enable; historical context is not erased. |
| 15 | PASS (owner report) | Humanizer worked. |
| 16 | PASS (owner report) | Environment & Context worked. |
| 17 | PASS (observed) | RC identity and older latest stable release shown; stable-only checker did not offer the RC. |
| 18 | PASS (rollback version) | Known-good pinned SHA and backup available; actual rollback to 0.7.2 observed. Host configuration recovery and post-rollback data integrity remain unverified. |

PARTIAL denotes meaningful functional evidence without every required observation; BLOCKED denotes an unverified required gate, not a demonstrated runtime failure. Do not count these as full PASS. Automated negative real-Agent-Loop integration evidence is separate from real Desktop outgoing-request inspection.

## Merge and release decision

Owner authorized merging the tested fail-closed candidate and documentation into main on 2026-11-18. Keep version `0.8.0-rc.1`; no stable tag or release is authorized here. Latest stable remains 0.7.2. Complete outstanding request-level evidence and matrix items before stable release approval. Structured field disclosure remains disabled regardless of saved permissions. Phase 8 is separate work: see [privacy gate](PERSONAL_PROFILE_PHASE7C_PRIVACY_GATE.md) and [Phase 8 scope](PERSONAL_PROFILE_PHASE8_PLAN.md).
