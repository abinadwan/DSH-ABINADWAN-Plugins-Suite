# Phase 07 — User-facing error handling and retry

Candidate: 1.0.1-rc.7; branch fix/phase-07-ux-reliability from develop commit 1eca449d7daec0ab230c66dcd602398659f3a567. The published v1.0.0 and main remain untouched.

## Scope
Direct Chat start previously displayed an alert after a rejected prepare request but left the same generic action label, making recovery less discoverable. The error also said to check the Workspace list, which may be misleading when the network or Host endpoint refused the request. The action now explicitly says Retry Direct Chat, remains a keyboard-accessible button, and reports a neutral failure message without claiming that the operation was fully undone.

Mounted Host/React regression first reproduced the absence of the retry action on failed HTTP 503. On successful subsequent preparation and native Session opening, the prior error is cleared. The read-only catalog history UI is covered by another fixture: HTTP 409 BUSY is presented as failure (not an empty success), retry recovers using native membership, and an unauthorized synthetic Session title never appears.

## Constraints and acceptance
No data deletion, duplicate-session rollback, uncontrolled retry loop, auto-creation schedule, cross-origin API, credential logging or Settings schema changes were introduced. Actual DSH Desktop network loss, cancellation during navigation, reconnect and keyboard/screen-reader flows are deferred to one consolidated end-of-eight-phases acceptance session.

The four-platform Windows/Ubuntu Node 22/24 CI must pass the source tests, package validation and pinned offline DSH Host fixtures before approval. No published release or tag was created. Reverting the phase affects UI messages/labels only; it does not delete native Session state.
