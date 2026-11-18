# Phase 7 — Windows Desktop acceptance (0.8.0-rc.1)

Status: NOT TESTED on real Desktop. Host target 0.2.2-rc.3. Do not publish a stable release until the owner approves the results.

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
