# Personal Profile Phase 6A — integration and security QA

Status: internal synthetic architecture only. Live Personal Profile remains disabled,
read-only and inert (`apply() {}`). No production provider, Remote, model tool,
injection, UI write flow, or Desktop hook is registered. This is not a working
Harness integration. Real Windows Desktop execution requires separate approval.

## Evidence and API research

Inspected on 2026-11-16: locked installed source under `node_modules/@deepseek-ai/`
and official upstream commit
[`39163dd30f703a79079e2d2446545cff3c453738`](https://github.com/deepseek-ai/deepseek-harness/tree/39163dd30f703a79079e2d2446545cff3c453738).
Installed here means npm packages in this isolated checkout, **not** an installed
Windows Desktop distribution. That installation is unavailable here. No Windows
identity, OS callbacks or application-version compatibility is claimed verified.

All source paths below refer to that upstream commit; they can be opened beneath
the pinned tree URL. Installed packages are `dsh-app-boot@0.2.2-rc.3`,
`dsh-typert-protocol@0.2.2-rc.3`, and `cordis-plugin-loader@1.1.0`.

| Area | Verified source/API | Limits for Personal Profile |
| --- | --- | --- |
| Active Profile | Installed and upstream `packages/boot/app-boot/src/profile-context.ts`: launcher-owned `ctx.profileContext` has `name`, `dir`, `home`, `patchPath`, `installAnchor`, `cwd`, overlays. `profile.ts:165` exports `resolveProfileDir(name, home)`. | Resolver validates a basename and constructs a path; it is not an authenticated browser claim or a canonical filesystem identity resolver. Production must derive identity from actual Host boot context, real paths, volume/file identity and Windows case/alias rules. No such adapter is implemented. |
| Authentication | Upstream `packages/client/connection/src/{authentication,rpc-host,rpc}.ts`: registered authenticators admit Peers; `connection.createPeer` takes an in-process principal. `packages/host/authentication-desktop/src/index.ts` uses a private startup secret, timing-safe cookie verification and an owner Peer. | Desktop secret is private parent IPC input. Never put it in Client state, a tool argument or this gate. These authentication implementation packages are not installed dependencies of this suite. |
| Authorization | Installed/upstream `packages/typert/protocol/src/types.ts`: `PeerScope` fixes principal, has disposal `signal`, `ctx`, `dispose()`. `principalOf(invocation)` returns **undefined for both owner and no invocation**. Upstream `packages/api/remote-access/src/index.ts`: `registerPolicy`, `decide`, `invalidate`; owner baseline allows requests. | Never infer management access from `principalOf(...) === undefined`. An explicit live authenticated Peer plus an independently authorized management operation is required. Remote owner access is not field consent. |
| Sessions | Upstream `packages/api/session-controller/src/index.ts`: Session resource resolver, `session/created`, `session/disposed`, `agent/disposed`; prompt records non-owner principal. `@Remote` methods use gateway resource checks. | Session IDs are selectors, not proof of caller ownership. A future adapter must bind an authenticated Peer, Agent, live Session and active Profile on the Host. No generic ownership function was verified that grants this feature automatically. Peer connection lifetime differs from Agent/Session lifetime. |
| Approval | Upstream `packages/interaction/user-approval/src/{index,types}.ts`, `docs/subsystems/approval.md`: `ctx.approval.request(req)` requires an open turn and logs asked/decided; request has actual Agent and optional AbortSignal; outcomes `allowed-once`, `rejected`, `cancelled`, `unavailable`; per-session `ask`/`never`. | Existing synthetic consent ledger is not this API. UI answerers must own the Agent. No mapping of permanent/session field grants to Harness approvals is approved. Never put values, instructions, keys or consent tokens in audit reason text. |
| Browser to Host | Upstream `packages/api/gateway/src/{types,index}.ts`: `InvokeRemoteRequest.peer` is carrier-provided; disposed Peers refused; non-owner method/event resources checked. Owner event streams can answer forwarded waterfalls. | Browser request body cannot select principal/profile/ownership. No new Remote is added. Opaque consent capabilities remain same-process Host objects; a future UI needs a separate authenticated intent protocol with cancellation, CSRF/origin and replay review. |
| Activation/disposal | Installed loader `src/index.ts`, `entry.ts`/compiled `lib/index.js`: entry fibers disposed on update/removal; `loader/partial-dispose`. Installed Cordis `ctx.on`, effect scopes, `ctx.fiber.dispose()`. Upstream boot waits for retired fibers during reload. | Gate `dispose()` and storage `lock()` must eventually be bound to actual lifecycle and OS events before adapter acceptance. This checkpoint wires none of them into runtime. |
| Windows process | Upstream `apps/desktop/src/node-environment.ts`: `desktopNodeEnvironment` sets `ELECTRON_RUN_AS_NODE=1`; Desktop docs describe Electron Host child, private IPC bootstrap and owned-window credentials. `apps/cli/tests/desktop-host.e2e.ts` checks Node-mode environment. | An environment flag is not identity attestation. Actual executable, signer, PID/parent, token SID/integrity, profile directory and DACLs must be verified on the device. CI and terminal Node do not prove Desktop Host DPAPI behavior. |

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
storage instance until a successful durable management permission transaction.
The normalized migration is written on the next save; reads do not rewrite legacy
files. No pending approvals, temporary grants, callers or sessions serialize.
Unknown top-level keys are still rejected by the Master Profile validator.

`setPermission` acquires the existing exclusive writer lock, invalidates all leases
before I/O, reads the current encrypted revision inside the transaction and seals
the combined payload. It creates and fsyncs `.authorization-blocked` **before**
changing authorization. On Linux, a durable successful commit, successful lock
cleanup and directory fsync after fence removal under the writer lock permit subsequent authorization.
Failed writes, crash interruption, uncertain durability or cleanup leave the fence
or block the instance. Other instances check the persistent fence and retained writer lock on every gated read.
A retained fence cannot be cleared by retrying another permission update.

Windows directory durability is not established by the existing file layer:
permission writes return `committed: true, durable: false`, retain the fence and
**deny all agent reads**. This is intentional and blocks functional Windows
integration. No automatic recovery, deletion of fences, or rollback to an old
Allow is permitted. Future trusted recovery must durably reset all permissions to
Private after exclusive ownership and disk-state reconciliation; it is not shipped
here. Filesystem or power-loss failures that prevent even fence persistence remain
outside software-only guarantees; the live component stays unavailable.

Imports, merge, replacement and recovery reset permission maps and opt-in, including
password-authenticated backups. Imported authorization is never authoritative.
Generic `save` cannot turn authorization on. File ACLs, hostile same-user directory
races, cross-process cached engines and crash recovery require real Host review;
this is a single-owner internal component, not an OS security boundary.

## Synthetic access boundary

`integration/gate.js:assembleGate` is a proposed internal assembly function, **not
an official Harness API**. Its resolver is injected by trusted Host assembly; tests
use a private WeakMap of frozen tokens. The model and browser cannot register or
serialize those identities. There is no production constructor/provider or export.

Management and agent reader objects are separate. Every request re-resolves role,
canonical Profile, environment, caller and session; changed or missing identities,
duplicate sessions and conflicting canonical/name bindings deny. Every read checks
lock, durable authorization, current authenticated record revision and a revocable
storage lease. Permission changes invalidate all engines and approvals before
persistence, and existing session tokens cannot reopen an engine after invalidation.
Storage lock clears actual engines, including detached capabilities.

Consent is bound to the engine session/field/scope; management decisions require
the matching Profile. Cancellation and consume replay fail closed. Budgets bound
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

Automated fixtures are synthetic. Full `npm test`, packed-artifact `check:package`
and Windows/Linux Node 22/24 CI results are recorded in the Draft PR and final
handoff. The existing four-job workflow runs both required commands without
adding Desktop activation. Windows synthetic gate reads deliberately deny while
durability remains uncertain. Windows runner results do not count as device checks.

**NO-GO for functional/manual Personal Profile integration testing or production
activation.** Documentation-only planning and separately approved synthetic
process-identity/DPAPI investigation can proceed after the approval gate. Missing
Desktop evidence, unimplemented authenticated adapter, async provider mismatch,
Windows durability/DACL handling and unbound lock/sleep callbacks must be resolved
before a functional manual acceptance run. There is no permission to collect real
data, enable the component, merge, deploy or release.
