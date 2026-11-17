# Phase 6B-1 — synthetic Windows Host identity design

> **Superseded (historical record).** Version 0.7.0 replaced this design with native Harness settings; see [the current design](PERSONAL_PROFILE_LOCAL_SETTINGS.md). Nothing described here is in the runtime or the package.

Status: **live Host UNVERIFIED; Profile access DENIED; device checks NOT EXECUTED**.
Historical parent: `ed0949a8315bb5a4683c087efdbeaa9691cf8662` (Phase 6A).
After PR #3–#8 merged in order, PR #9 was retargeted to `main` at
`434838c72141431d9c77ce9765f8aee59e775552`; the original parent is not
the current PR review base. PR checks must use the *new* GitHub merge ref into
`main`, rather than an older PR CI run checked out against the Phase 6A branch.
This phase adds only a read-only synthetic diagnostic, regression tests and this
binding design. It does not implement authenticated identity or an OS boundary.

## Approach and boundaries

Use the existing `test-support` pattern: `personal-profile-host-identity.js` is
excluded from the published package by the existing package policy. Tests are
copied beside the extracted artifact by `check:package`, so the diagnostic is
also exercised against the packaged gate without shipping the diagnostic.
A runtime module would expand the production surface unnecessarily; an in-Host
probe/adapter would exceed this phase. There is no CLI, endpoint, resolver
registration, permission change, collector, environment selector or Desktop hook.
The production scaffold remains disabled and `apply()` remains empty.

The diagnostic takes only an exact flat object of enumerable own data properties
whose string values belong to the vocabulary below. Normal and null prototypes
are accepted; inherited facts, accessors, symbols, additional properties, arrays,
functions and proxies (including revoked proxies) deny. Node's native
`util.types.isProxy` rejects proxies before reflection; getters/traps are not
executed. Non-string values are rejected without coercion. Exceptions are caught
without inspecting or logging the thrown value. No stringify, input/error echo,
telemetry, callbacks, filesystem, network or process identity reads occur.
This assumes an uncompromised Node runtime/intrinsics; arbitrary code already
executing in the same process is not isolated by this function.

**Resource boundary:** Input values and output shapes are restricted, but processing
time and temporary memory are **not** bounded by a fixed constant. In particular,
`Object.getOwnPropertyDescriptors(input)` enumerates all own properties and
materializes a descriptor object before the nine-field count is checked. The
diagnostic therefore must not be exposed as a live/unbounded untrusted-input
service. It is test-only and operates on small synthetic fixtures; the oversized
input regression checks rejection, **not** fixed memory or execution limits.
A future live boundary must enforce resource limits before accepting evidence.

## Four identities and separate authority

1. **Host process identity:** the actual child launched and owned by Desktop,
   correlated to its live process instance, not an arbitrary Node process.
2. **Desktop binding:** that child belongs to the expected Desktop instance and
   trusted executable/runtime, not simply a matching PID or process name.
3. **Windows process-owner binding:** the actual Host process token belongs to
   the intended Windows principal and integrity context. Terminal/PowerShell
   identity proves only the terminal account; matching usernames do not prove
   token identity, elevation, impersonation state or ownership of another process.
4. **Profile account binding:** the active launcher-owned Harness Profile and
   its canonical protected storage belong to that Host/account context. A Profile
   is an application namespace, not a Windows account; its display name or path
   alone establishes neither account ownership nor management permission.

Profile management authorization and per-field/agent consent are further,
independent requirements. BrowserAuth, Peer Owner, interactions and OS account
ownership do not imply them. The diagnostic never supplies any of these rights.

## Official rc.3 source reinspection

Inspected the actual official tag `dsh-v0.2.2-rc.3`, verified checkout HEAD
`38a6a5c965aa99ab525161efb7cc5cf1fe62fced`. This extends the
[Phase 6A API matrix](PERSONAL_PROFILE_PHASE6A.md#evidence-and-api-research),
without treating later APIs or installed binaries as evidence.

| Exact pinned source | Establishes | Does not establish |
| --- | --- | --- |
| [`host-process.ts:208–224`](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/apps/desktop/src/host-process.ts#L208-L224), [`node-environment.ts:12–16`](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/apps/desktop/src/node-environment.ts#L12-L16) | Desktop spawns its configured executable with Host entry/runtime/Profile arguments, IPC and Electron Node mode. | Windows principal, executable authenticity, installed binary equivalence or a trusted correlation to a terminal probe. |
| [`profile-context.ts:14–35`](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/boot/app-boot/src/profile-context.ts#L14-L35), [`profile.ts:159–171`](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/boot/app-boot/src/profile.ts#L159-L171) | Launcher-owned Profile context and directory construction. | Canonical filesystem ownership, Windows alias/race handling, principal binding or permission to manage Profile data. |
| [`connection/index.ts:126–140`](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/client/connection/src/index.ts#L126-L140), [`browser-auth.ts:263–382`](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/client/connection/src/browser-auth.ts#L263-L382) | Root-context BrowserAuth, launch-token exchange and signed authority/expiry-bound browser or API credentials. | OS token principal, Profile management or field consent. Credentials must stay outside the diagnostic. |
| [`rpc-host.ts:128–172`](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/client/connection/src/rpc-host.ts#L128-L172), [`gateway/index.ts:273–306`](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/api/gateway/src/index.ts#L273-L306) | Admission before upgrade; browser/API Peer and socket lifetime ownership. | Windows account attestation or independent authorization for this feature. |
| [`api-request-trust.ts:121–150`](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/client/connection/src/api-request-trust.ts#L121-L150) | Host/Origin fence; absent Origin can pass after Host validation. | Desktop provenance, Windows owner or Profile account ownership. |
| [`web-document.ts:38–49`](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/apps/desktop/src/web-document.ts#L38-L49), [`main.ts:846–856`](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/apps/desktop/src/main.ts#L846-L856) | Desktop obtains the Host cookie and attaches it to matching owned-window WebSockets. | OS principal or independent Profile-management authorization. |
| [`protocol/types.ts:450–482`](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/typert/protocol/src/types.ts#L450-L482), [`remote-access/index.ts:199–204`](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/api/remote-access/src/index.ts#L199-L204) | Host-fixed Peer principal and broad existing Owner Remote access. | Separate Profile-management authorization; interactions explicitly grants no business permissions. |
| [`user-approval/index.ts:224–260`](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/interaction/user-approval/src/index.ts#L224-L260) | Agent/Session open-turn approval with only `allowed-once` granting its request. | General management authorization, OS account proof or persistent field policy. |

## Synthetic contract and codes

These are enumerated **fictional assertions**, not data gathered from an API.
Anyone can construct a passing fixture. `provenance` is a simulation label and
cannot attest its own origin. No raw IDs, SIDs, PIDs, command lines, executable
or user paths, keys, tokens, cookies or personal values are accepted or returned.

| Required fact | Complete fixture value | Denial code for enumerated negative evidence |
| --- | --- | --- |
| mode | `synthetic` | `INVALID_INPUT` |
| version | `0.2.2-rc.3` | `UNSUPPORTED_VERSION` for `unsupported` |
| provenance | `synthetic-host-context` | `UNTRUSTED_CONTEXT` for `untrusted` |
| hostProcess | `correlated` | `HOST_PROCESS_UNVERIFIED` |
| desktopBinding | `matched` | `DESKTOP_BINDING_DENIED` |
| windowsOwnerBinding | `matched` | `WINDOWS_OWNER_DENIED` |
| profileAccountBinding | `matched` | `PROFILE_ACCOUNT_DENIED` |
| managementAuthorization | `explicit` | `MANAGEMENT_DENIED` |
| lifecycleBinding | `current` | `LIFECYCLE_DENIED` |

The last six facts also accept the negative categories `missing`, `ambiguous`,
`mismatched`, `untrusted`, `unsupported`. Host adds `terminal`, `powershell`,
`browser-owner`; management adds `owner-role-only`, `browser-auth-only`;
lifecycle adds `stale`, `replayed`. These all deny. Missing properties or any
other value/shape give `INVALID_INPUT`, including arbitrary version strings.
Validate the whole shape/vocabulary first, then return the first negative in
table order. Thus malformed data cannot be hidden behind a prior valid denial.
All-complete returns `SYNTHETIC_FACTS_COMPLETE`. Every result is a frozen object
with exactly `status`, `liveHost: 'UNVERIFIED'`, `profileAccess: 'DENIED'`.
Only these fixed allowlisted codes leave the diagnostic; there is no real-host
success state, capability, authorization token or result consumption path.

## Future trusted-context ownership (design only)

A later reviewed Host adapter would need to own its launch/boot context,
non-transferable process-instance correlation, Desktop-instance association,
Windows token evidence and canonical Profile/account mapping inside the trusted
Host boundary. Browser fields, model arguments, environment variables, terminal
observations, filenames and self-reported enum claims cannot become authority.
The owner of each assertion must be identified and its acquisition/verification
reviewed independently; signed binary/source equivalence is also unresolved.
Process names, PID/parent alone and RunAsNode can be spoofed or reused. An
in-process hostile plugin shares the trust domain; this design is not isolation
from such code or an OS administrator.

The proposed ownership chain for that later design is:

| Fact | Trusted owner and proposed establishment | Refuse substitutions |
| --- | --- | --- |
| Host instance | Desktop launcher retains the child process handle and a fresh activation challenge; the actual child answers over its private owned channel. Correlate the live handle/process creation instance with the in-Host context before issuing an internal binding. | A PID, IPC-looking message or self-declared Host flag alone; replay from an earlier child. rc.3 startup IPC is evidence of launch structure, not this attestation protocol. |
| Desktop association | Launcher-owned instance binds that child handle, challenge and reviewed runtime/executable provenance to this Desktop activation. | Process name, parent number, RunAsNode environment or another Desktop's valid child. Installed binary provenance needs separate approved verification. |
| Windows owner | A separately reviewed trusted native boundary validates the actual Host process token against the intended principal/integrity policy and returns only an internal comparison result. No OS-token collector is supplied here. | Terminal identity, browser Owner, display-name equality, elevation or alternate-account ambiguity. rc.3 APIs cited above do not supply this proof. |
| Profile/account | Host boot assembly owns the active Profile context; a later canonical protected-storage resolver must bind it to the verified Host principal through an explicit Host-owned account association policy. | Client-selected Profile, name/path equality or merely finding a directory. rc.3 has Profile facts but no independent Windows-account enrollment/management grant established here. |
| Management intent | A reviewed Host-owned operation gate authorizes the specific Profile/action from authenticated context, independently of browser admission and Windows ownership. Field consent remains separately required. | Owner's broad Remote allowance, Agent approval for another action, or any passing diagnostic fixture. |

The fresh challenge/private channel and native verification above are design
requirements, not claims about rc.3 guarantees or implemented new features.
Until each trusted owner and verification path exists, no binding may be issued.

Future evidence must be bound atomically to a specific Host activation/process
instance (including protection against PID reuse), Desktop instance, Windows
principal/integrity context, canonical Profile, authenticated Peer and intended
operation. Agent/Session scope and field consent remain separate. It must deny
on missing, ambiguous, unsupported or changed evidence; reconcile no partial
matches. Restart, process exit, Profile/account switch, Peer disposal and relevant
lock/sleep events must invalidate old bindings before use. A monotonic freshness
policy, trusted challenge/nonce, operation binding, single-use decisions and
revocation must prevent stale/replayed proofs and TOCTOU substitution. No such
collectors, cache, challenge protocol, lifecycle callbacks or reconciliation are
implemented here. Repeating a fixture merely repeats a simulation, not a fresh
live proof. A `current` enum is not a clock check.

## Verification and next approval boundary

Focused command: `node --test test/personal-profile-host-identity.test.js`.
Official commands remain `npm test` and `npm run check:package`; the unchanged CI
matrix covers Linux/Windows × Node 22/24. No new test has platform skips. The
starting suite had Linux 210 pass/0 skip and Windows 151 pass/59 inherited skips;
Windows positive authorization/durability limitations remain. Final totals and
CI links belong in the new Draft PR and handoff after execution.

Tests cover every absent or non-enumerable required fact, enumerated
negative/mismatch, unsupported version, INVALID_INPUT precedence over otherwise
recognized negative facts, identity conflation, hostile accessor/proxy/coercion
attempts, extra/sensitive synthetic values, immutable outputs and rejection of
fixtures/results by the existing gate. Package checks enforce exclusion of `test-support` from payload.
No real sensitive data is used in tests or logs.

[Windows acceptance](PERSONAL_PROFILE_WINDOWS_ACCEPTANCE.md) remains entirely
NOT EXECUTED. **Each actual Windows device test requires its own later explicit
approval**, specifying device, disposable account/Profile, exact reviewed probe,
allowed observations, data handling and cleanup. This phase authorizes only safe
synthetic Cloud/CI runs; no live-host operation, even in Cloud, is authorized.
No installed Desktop inspection, OS collection, DPAPI/DACL, lock/sleep behavior,
settings change or Personal Profile activation is included. Existing async
provider mismatch, Windows durability, native lifecycle and authenticated Host
adapter limitations remain unresolved. **NO-GO for live Windows functional
acceptance or production activation.** No merge, deployment or release.
