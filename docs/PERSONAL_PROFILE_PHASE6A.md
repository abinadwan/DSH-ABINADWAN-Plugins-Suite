# Personal Profile Phase 6A — integration and security QA

Status: internal synthetic architecture only. Live Personal Profile remains disabled,
read-only and inert (`apply() {}`). No production provider, Remote, model tool,
injection, UI write flow, or Desktop hook is registered. This is not a working
Harness integration. Real Windows Desktop execution requires separate approval.

## Evidence and API research

Inspected on 2026-11-16: official source tag
[`dsh-v0.2.2-rc.3`](https://github.com/deepseek-ai/deepseek-harness/tree/dsh-v0.2.2-rc.3),
checked out at commit
[`38a6a5c965aa99ab525161efb7cc5cf1fe62fced`](https://github.com/deepseek-ai/deepseek-harness/tree/38a6a5c965aa99ab525161efb7cc5cf1fe62fced).
This replaces the later `39163dd` reference previously used as compatibility
authority. The rc3 source uses `BrowserAuth`; the later
`ConnectionAuthentication` and `authentication-desktop` APIs are not rc3 APIs.

The user reports installed `dsh-app-boot`, `dsh-client-connection`,
`dsh-api-gateway`, `dsh-api-session-controller` and `dsh-user-approval` packages
at `0.2.2-rc.3`, with `cordis-plugin-loader@1.1.0`, and ASAR observations of
`browserAuth` and admission/upgrade code. These are user-reported installation
observations, separate from the official-source findings below. The isolated
checkout also pins npm dependencies; those packages are not the installed
Windows Desktop distribution. No byte-for-byte binary/source comparison or real
device verification was performed. No Windows identity, OS callback or working
Host adapter/provider is claimed verified.

| Area | Verified source/API | Limits for Personal Profile |
| --- | --- | --- |
| Active Profile | [`profile-context.ts:14–35`](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/boot/app-boot/src/profile-context.ts#L14-L35) defines launcher-owned `ctx.profileContext`; [`profile.ts:159–171`](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/boot/app-boot/src/profile.ts#L159-L171) defines `resolveProfileDir(name, home)`. | Profile facts and path construction do not authorize management. Production needs actual Host boot context, canonical filesystem identity and Windows case/alias handling. No such adapter exists here. |
| Authentication | [`connection/src/index.ts:126–140`](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/client/connection/src/index.ts#L126-L140) creates `BrowserAuth` from root context and credentials. [`browser-auth.ts:263–382`](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/client/connection/src/browser-auth.ts#L263-L382) exchanges the process launch token for signed authority-bound cookies; `/connect` creates independent API credentials. [`rpc-host.ts:128–172`](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/client/connection/src/rpc-host.ts#L128-L172) admits the shared browser owner Peer or a live API owner Peer. | Do not substitute the later Desktop authenticator. Launch tokens, cookies and signing material must never enter model/tool input, Client feature state or this synthetic gate. |
| Authorization | [`protocol/src/types.ts:450–482`](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/typert/protocol/src/types.ts#L450-L482) fixes Peer principal in Host code; `interactions` grants no business permissions. [`principal.ts:9–16`](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/typert/protocol/src/principal.ts#L9-L16) returns undefined for owner and absent invocation. [`remote-access/src/index.ts:199–204`](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/api/remote-access/src/index.ts#L199-L204) broadly allows owner. | Owner has existing Remote privileges; it carries no separate Profile-management grant or field consent. Neither owner status nor undefined `principalOf` authorizes this feature. A future management adapter needs an explicit operation gate and Host-bound Profile. |
| Sessions | [`session/src/index.ts:1185–1215`](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/core/session/src/index.ts#L1185-L1215) makes live Session attachment calling-fiber-owned. [`session-controller/src/agent.ts:127–143`](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/api/session-controller/src/agent.ts#L127-L143) resolves Agent/Session contexts. [`agent-loop/src/index.ts:456–535`](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/core/agent-loop/src/index.ts#L456-L535) owns cancellation, quiescence and writer teardown. | Session IDs select resources; they do not prove caller ownership. Peer lifetime differs from Agent/Session lifetime. A future adapter must bind authenticated Peer, live Agent/Session and active Profile; no automatic feature ownership grant was verified. |
| Approval | [`user-approval/src/index.ts:224–260`](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/interaction/user-approval/src/index.ts#L224-L260) requires an open turn and logs asked/decided. [`index.ts:293–330`](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/interaction/user-approval/src/index.ts#L293-L330) routes through the actual Agent scope and fails closed. [`types.ts:28–32`](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/interaction/user-approval/src/types.ts#L28-L32) defines `allowed-once`, `rejected`, `cancelled`, `unavailable`. | Only `allowed-once` grants the requested action. The synthetic consent ledger is not this API. No mapping to persistent/session field consent is approved; management outside an open turn cannot simply invoke it. Keep values, keys, instructions and consent tokens out of audit reasons. |
| Browser to Host | [`gateway/src/index.ts:273–306`](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/api/gateway/src/index.ts#L273-L306) calls `admitConnection`, then `rejectRemoteStreamUpgrade` or `handleUpgrade` with the admitted Peer. [`stream-server.ts:85–104`](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/api/gateway/src/stream-server.ts#L85-L104) binds streams to that Peer. [`index.ts:497–515`](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/api/gateway/src/index.ts#L497-L515) restricts forwarded answers to the same owner Peer with interactions enabled. | Browser fields cannot select principal, Profile or ownership. No new Remote exists. A future UI needs reviewed authenticated intent, cancellation, Host/Origin and replay handling; same-process consent capabilities remain private. |
| Activation/disposal | [`loader/src/index.ts:128–169`](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/vendor/loader/src/index.ts#L128-L169) handles fiber self-disposal, plugin removal and disabled ancestors; rc3 vendors loader `1.1.0`. [`peer.ts:34–51`](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/client/connection/src/peer.ts#L34-L51) disposes scopes with their owning context; [`rpc-host.ts:94–100`](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/client/connection/src/rpc-host.ts#L94-L100) disposes Peers on plugin teardown. | Scoped cleanup is not hostile-plugin isolation. Gate disposal/storage lock are not wired to real plugin or OS callbacks here; pinned loader `1.1.0` does not establish device lifecycle behavior. |
| Windows process | [`host-process.ts:208–224`](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/apps/desktop/src/host-process.ts#L208-L224) spawns Electron with IPC; [`node-environment.ts:12–16`](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/apps/desktop/src/node-environment.ts#L12-L16) sets `ELECTRON_RUN_AS_NODE=1`. [`web-document.ts:38–49`](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/apps/desktop/src/web-document.ts#L38-L49) obtains a BrowserAuth cookie; [`main.ts:846–856`](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/apps/desktop/src/main.ts#L846-L856) attaches it only to matching owned-window WebSockets. | RunAsNode and browser owner identity are not OS identity attestation. Actual signer, executable, PID/parent, token SID/integrity, filesystem identity, DACLs and DPAPI behavior require separately approved device evidence. |

The rc3 Session controller explicitly subscribes to
[`session/created`, `session/disposed`, `agent/disposed`](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/api/session-controller/src/index.ts#L224-L236).
The transport's [Host/Origin fence](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/client/connection/src/api-request-trust.ts#L121-L150)
rejects unknown Host, explicit cross-site metadata and mismatched attached Origin;
missing Origin can pass after Host validation. These checks and lifecycle events
do not establish per-Profile field consent. The rc3 boot path
[waits for retired plugin fibers](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/boot/app-boot/src/index.ts#L362-L392)
during recomposition; our gate is not registered into those effects.

## Persistence contract

The existing version-1 AES-256-GCM outer envelope, key and identity/domain AAD
remain unchanged. Its encrypted plaintext now includes:

```json
{"permissionState":{"version":1,"profiles":{"opaqueHostCanonicalId":{"preferredName":"private"}}}}
```

Only defined fields and `private`, `ask_first`, `allow` are accepted. Absence is
Private; legacy payloads normalize to version 1 with an empty map. Future schema
versions and malformed/accessor metadata fail closed. Canonical IDs are exact,
Host-derived opaque ASCII storage IDs (1–64 characters), not display names or
filesystem paths. The synthetic gate also rejects ambiguous display-name mappings.
The record's Master Profile fields, opt-in and permission state are encrypted and
authenticated together; ciphertext cannot be moved to another record identity.

Local reopen can preserve policy, but authorization starts blocked in a new
storage instance until a successful durable explicit management transaction.
Readiness belongs to that managed record; a transaction on an unrelated record
cannot enable it. Lock clears readiness, engines and retained leases; unlock
alone does not restore management authorization.
The normalized migration is written on the next save; reads do not rewrite legacy
files. No pending approvals, temporary grants, callers or sessions serialize.
Unknown top-level keys are still rejected by the Master Profile validator.

Ordinary `save` preserves current opt-in and permissions when they are omitted.
It accepts explicitly supplied authorization snapshots only when they equal the
current record, and rejects changes or replay of stale authorization. New records
start Private with opt-in false. Saving data never grants readiness or consent.
On the subsequent production-readiness QA branch, trusted editing uses a same-read encrypted revision snapshot and a revision-checked save (see the branch QA report); legacy ordinary save still performs full replacement. No browser or agent transport is authorized.
An ordinary schema edit cannot delete a custom field while persisted policies
still reference it, even if those policies are Private. There is no policy-entry
deletion API in this correction. Such an edit requires explicit reviewed
replacement/import, resetting all permissions and opt-in, or a future reviewed
management deletion API. Save never silently drops policies or leaves an orphan
permission that a later field definition could inherit.

`setAuthorization(id, {optIn?, permissions?})` is the explicit management patch;
`setOptIn` and `setPermission` wrap it. Complete schema/current-state preflight
runs before writer-lock or fence creation and repeats under the exclusive writer
lock against the actual encrypted revision. Invalid inputs leave existing leases
intact; accepted updates invalidate leases before write I/O. The transaction
seals the combined payload and creates/fsyncs `.authorization-blocked` **before**
changing authorization. On Linux, a durable successful commit, successful lock
cleanup and directory fsync after fence removal under the writer lock permit subsequent authorization for that record.
Failed writes, crash interruption, uncertain durability or cleanup leave the fence
or block the instance. Other instances check the persistent fence and retained writer lock on every gated read.
A retained fence cannot be cleared by retrying another permission update.

Windows directory durability is not established by the existing file layer:
authorization writes return `committed: true, durable: false`, retain the fence and
**deny all agent reads**. This is intentional and blocks functional Windows
integration. The retained fence also blocks subsequent authorization-changing
import/replacement/recovery attempts; they cannot clear it by retrying. No
automatic fence removal or rollback to an old Allow is permitted. A future
trusted fence-reconciliation procedure must prove exclusive ownership and reset
authority durably; that procedure is not shipped here. Filesystem or power-loss failures that prevent even fence persistence remain
outside software-only guarantees; the live component stays unavailable.

Imports, merge, replacement and recovery use the fenced authorization transaction
and reset permission maps to Private and opt-in false, including
password-authenticated backups. Recovery snapshots in a replacement transaction
and final record writes share the fence; partial or uncertain failure retains it.
These operations do not enable authorization readiness. Imported authorization is
never authoritative. Generic `save` cannot change authorization. File ACLs, hostile same-user directory
races, cross-process cached engines and crash recovery require real Host review;
this is a single-owner internal component, not an OS security boundary. The subsequent QA branch additionally binds readiness to the exact committed ciphertext and rechecks it on gated reads and authorized leases; this is not a cross-process linearizability or hostile-filesystem guarantee.

## Synthetic access boundary

`integration/gate.js:assembleGate` is a proposed internal assembly function, **not
an official Harness API**. Its resolver is injected by trusted Host assembly; tests
use a private WeakMap of frozen tokens. The model and browser cannot register or
serialize those identities. There is no production constructor/provider or export.

Management and agent reader objects are separate. Every request re-resolves role,
canonical Profile, environment, caller and session from a snapshot of own data
properties. Getters and inherited claims are rejected without reading them.
Missing, malformed or changed identity claims permanently invalidate that token,
including failures before a Profile ID can be validated. That token's binding,
engine, session grants and pending approvals are revoked before a restored
resolver could revive them; old tokens cannot regain access by restoring prior
claims. Revocation is scoped to the failing token: an unrelated authenticated
session keeps its binding, reads and pending approvals, and role misuse (an agent
token on management entry points or a management token on the reader) is
terminal only for the misused token. Duplicate sessions and
conflicting canonical/name bindings deny. Every read checks
lock, durable authorization, current authenticated record revision and a revocable
storage lease. Permission changes invalidate all engines and approvals before
persistence, and existing session tokens cannot reopen an engine after invalidation.
Storage lock clears actual engines, including detached capabilities.

Consent is bound to the engine session/field/scope; management decisions require
the matching Profile. Management permission patches use the authenticated
management binding's Profile; a caller cannot supply another Profile selector.
Cancellation and consume replay fail closed. Budgets bound
retained sessions and approvals. Terminal operations release routing entries; a
monotonic 60-second routing deadline expires abandoned approvals on subsequent
operations, with clock faults invalidating bound sessions. No keys, registration methods or consent-decision
capabilities are returned by the reader. There is **no browser transport** to test
end-to-end: boundary abuse tests exercise the proposed Host entry methods and
verify Client/runtime imports remain absent.

Instruction composition returns `{status:'disabled'}` regardless of text. Higher
priority policies cannot be overwritten because no instruction is composed or
injected. Any future composition design must preserve the Harness priority model;
this test does not certify a future prompt-injection sanitizer.

## Security PR #2 compatibility

Reviewed Draft PR [#2](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/pull/2)
at `07fb92b503bdbaef8a161415b5296397d0faffd5` in a detached test worktree. Nothing
on that branch or PR was changed. Its two security test files on Linux Node 24:
5 pass, 2 Windows-only skips. Its probe uses its own AES-GCM domain/format and
PowerShell DPAPI CurrentUser wrap/unwrap of 32-byte keys through pipes. Neither
its envelope nor its wrapped blob is a Phase 5/6 profile or backup format.

The provider shape could be adapted conceptually, but spike operations are async
while current internal `provider.acquire()` is synchronous. A reviewed async
lifecycle redesign/native bridge, cancellation and lifecycle invalidation would
be necessary; copying the spike is not compatible assembly. No spike file or
PowerShell implementation is imported. `createProductionStorage()` still throws
`OS-protected key provider unavailable` for every caller and platform. Package
policy retains the pre-existing exact opt-in spike script exception; it does not
ship a provider in this branch.

## Validation and decision

Automated fixtures are synthetic. Final revision, full `npm test`, packed-artifact
`check:package` and Windows/Linux Node 22/24 CI results must be recorded in the
Draft PR and final handoff after verification; this document does not assert final
test counts or a final branch SHA. The existing four-job workflow runs both required commands without
adding Desktop activation. Windows synthetic gate reads deliberately deny while
durability remains uncertain. Windows runner results do not count as device checks.

**NO-GO for functional/manual Personal Profile integration testing or production
activation.** Documentation-only planning and separately approved synthetic
process-identity/DPAPI investigation can proceed after the approval gate. Missing
Desktop evidence, unimplemented authenticated adapter, async provider mismatch,
Windows durability/DACL handling and unbound lock/sleep callbacks must be resolved
before a functional manual acceptance run. There is no permission to collect real
data, enable the component, merge, deploy or release.
