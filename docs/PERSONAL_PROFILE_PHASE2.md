# Personal Profile — Phase 2: In-memory consent

Internal ESM only, based on Phase 1 commit
`27af1133959c8080a03bdb37fceb0313d1b03aa3`. The Personal Profile component remains
disabled by default and read-only. No UI, Host integration, actual authentication,
agent tool, public core export, storage, encryption, injection or network capability
is added. All sessions, identities and values in tests are synthetic.

## Trust and API boundaries

`core/consent.js` exports internal `createConsentProfile(input?, { now? }?)`,
returning separate frozen `{ host, reader }` capabilities. The default clock is
monotonic `performance.now`; injected clocks are for trusted tests only. Construction
copies the Phase 1 model. The underlying core and its raw management/read capability
are never returned. Existing Phase 1 APIs remain internal and unchanged in behavior.
`createProfileAccess` in retrieval.js is an internal owner-only helper; its
`readApprovedField` must never be exposed as a tool or caller API.

Only the trusted owner may retain `host`:

- `registerProfile({ name, canonicalId })` registers a resolved Harness Profile
  identity and returns an opaque handle. Name validation uses Phase 1 Harness
  basename validation; duplicate names or canonical IDs are rejected atomically.
  This method trusts its Host caller; it does not verify a filesystem identity.
- `registerCaller()` issues a caller handle after future Host authentication.
- `startSession(caller, profile)` creates a fresh opaque session bound immutably
  to that caller and Profile. `endSession(session)` removes it and all its consent.
- `registerScope({ operation: 'read_field', purpose })` issues an opaque scope.
  Purpose must be a fixed trusted registry code matching `[a-z][a-z0-9_]{0,63}`.
  Never populate it from model text, personal values, labels or instructions.
  Different scope handles intentionally do not share grants, even with equal codes.
- `setPermission(profile, field, state)` supports exactly allow/ask_first/private.
  Every successful policy update invalidates affected pending and active consent,
  even if the new state equals the old one. `revoke(profile, field)` sets private
  and invalidates all affected consent. Only future settings may change permanent
  permissions; the consent decision API cannot do so.
- `setOptIn(false)` and `setLocked(true)` clear all pending and active consent.
  Unlocking or opting back in cannot restore it. Invalid management input throws
  only the generic Phase 1 error, with no supplied values.
- `decide(approval, outcome)` accepts `allow_once` or `allow_session` for one
  still-live pending handle, exactly once. `deny`, cancellation, unavailable,
  missing or any other outcome close the pending operation without a grant.
  There is no permanent Allow decision. A successful decision returns true;
  denial/invalid/stale/already-decided attempts return false.

The restricted `reader` contains only:

- `requestField(session, field, scope)`: unknown/forged handles or fields deny.
  Explicit private, locking and opt-in off always deny. Permanent allow returns
  exactly the requested field only with a valid live context. Ask First either
  uses an existing exact session grant or returns `{ status: 'approval_required',
  approval, metadata: { field, operation, purpose } }` without a value.
- `consumeApproval(session, approval)`: returns one value only after an approved,
  live, matching decision and a fresh policy/lifecycle check. No field/scope override
  arguments exist: the handle binds the exact pending read. Wrong sessions deny
  without consuming someone else's request. A matching consume attempt deletes
  the pending entry before checking its decision; undecided attempts are terminal.
- `cancelApproval(session, approval)`: deletes a matching pending operation,
  including an already-decided operation that has not been consumed. Late decisions
  cannot restore it or publish a session grant.

The three interactive meanings are **Allow Once**, **Allow for This Session** and
**Deny**. No popup is implemented here. A session grant is published only on successful
consumption, and authorizes the same field, Profile/environment, caller/session and
operation/purpose scope. It never grants other already-pending requests. Denying a
pending operation does not implicitly revoke a separate existing session grant;
use the trusted revoke/settings boundary for that.

## Lifetimes, replay and concurrency

Each request has a fresh frozen same-process object handle, with no serialized ID
or `approved` claim. Handles from another engine cannot match. Approval metadata
contains only validated field ID and trusted operation/purpose codes: no personal
values, labels, Profile paths or instructions. The engine emits no logs.

Pending and decided-but-unconsumed approvals expire **60,000 ms** after creation;
expiry is inclusive at the deadline and never extended by decision. Expired entries
are lazily swept before authorization/decisions; idle entries may remain allocated
but cannot authorize. Session grants end on explicit session termination or
invalidation, without persistence. A failed, nonfinite or backward clock clears
pending/active consent and fails the affected check closed.

The ledger caps pending operations at 256 and active grants at 1,024. Profiles
retain Phase 1's 64-environment union limit; caller, active session and scope
registries each cap at 256. Registration limits fail with the generic error;
pending/grant exhaustion denies. Caller/scope slots are instance-lifetime budgets;
session slots are reclaimed on termination. The Host can dispose the entire instance
by dropping all capabilities. No timer or background resource is installed.

All transitions run synchronously within one JavaScript isolate, with no await,
untrusted callback or notification between authorization and consumption. Duplicate
consumers receive at most one allowed result. Async answerers must call the trusted
Host decision boundary later; intervening cancel/end/revoke/lock wins. This does not
claim distributed or cross-worker atomicity. Already-disclosed values cannot be
recalled. Capabilities are bearer authority: malicious same-process code, hostile
Proxies, compromised Host, memory inspection and leaked handles are outside this
phase's isolation model.

## Harness compatibility — separate session layer

Inspected the official [User Approval subsystem](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/approval.md)
on 2026-11-16 (document blob `5a2513775a5841819e1218a5dc0e30425af0d81c`).
The supplied `main` URL returns 404; upstream's default branch is currently `master`.
Harness `ApprovalOutcome` is `allowed-once | rejected | cancelled | unavailable`.
Only `allowed-once` authorizes the asked-about action. Its session `ask`/`never`
policy controls prompting; it is **not** a session-long permission grant.

This implementation neither imports nor modifies Harness's approval service.
Its `allow_session` state belongs exclusively to the isolated Personal Profile
ledger. A future trusted adapter may map a native `allowed-once` result to
`allow_once` for the exact pending operation after ownership/correlation checks.
It must never infer `allow_session` from native approval. Session consent needs a
separate explicit trusted user decision. Missing, throwing or unavailable answerers,
failed audit operations, cancellation and unknown outcomes must all fail closed.
No adapter or outcome conversion is implemented in this phase.

## Canonical Profile identity: prerequisite for Host integration

Never accept environment names, canonical IDs, caller IDs or consent decisions
from model arguments as authority. A future Host must obtain the actual Harness
Profile from its trusted resolver, authenticate the caller, bind a live session
and issue these opaque handles. The synthetic fixtures are not evidence of actual
Harness authentication. Reader requests accept no arbitrary environment string.

On Windows, Profile names can collide under case-insensitive filesystem comparison
(e.g. `Work` and `work`), and aliases, junctions, symlinks, trailing-dot/space handling
and Unicode behavior may also identify the same directory. Phase 1 exact string keys
and a simple lowercase transform cannot establish canonical filesystem identity.
This layer rejects duplicate trusted canonical IDs, but cannot detect a Host that
assigns different IDs to aliases of the same Profile. Before integration, use one
stable, trusted identity per resolved Profile/directory, reject ambiguous name
collisions, and key all registration, policy, session and consent decisions to
that identity. Renames, root changes or identity uncertainty must invalidate context
and consent. Do not independently register alternative spellings as separate Profiles.

The Host must also forward session termination/disposal, approval abort, profile
lock and settings/global-opt-in changes through these boundaries before any later
read. It must retain operation/session ownership for approval routing and avoid
logging metadata derived from sensitive values. These are deferred integration
requirements, not implemented authentication guarantees.

## Verification

`test/personal-profile-consent.test.js` exercises synthetic one-use/session grants,
denial, policy/lifecycle precedence, replay, exact expiry, cancellation after decision,
concurrent consumers, unknown handles/fields, cross-instance isolation, metadata/log
privacy, capacity and clock failure. Existing Phase 1 and disabled/read-only Host
tests run unchanged. `npm test` and `npm run check:package` cover source and packaged
modules; unchanged Actions runs both on Windows/Linux with Node.js 22 and 24.
