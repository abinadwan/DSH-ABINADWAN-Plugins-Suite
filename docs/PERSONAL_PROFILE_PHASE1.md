# Personal Profile — Phase 1: Core Data & Permissions

This phase supplies internal, testable Node.js ESM modules only. The Personal
Profile Host remains disabled by default and read-only. It does not import the
core. There is no public core package export, tool registration, instruction
injection, UI collection, filesystem/SQLite storage, telemetry, network access,
plaintext profile file, encryption, or key management. Examples and tests use
synthetic values only. This is not the complete Personal Profile feature.

## Master Profile

`core/model.js` constructs an internal in-memory record:

- `definitions`: Map of field identifiers to types, initially the five built-ins.
- `customFields`: Map of custom definitions `{ id, label, type }`.
- `values`: Map containing only supplied, validated values; every field is optional.
- `allowAgentUseApprovedProfileInformation`: boolean, initially false. Its user
  label is **Allow the agent to use approved profile information**.
- `instructions`: `{ global: '', environments: Map<environmentId, string> }`.

Built-ins are `preferredName`, `fullName`, `dateOfBirth`, `nationality`, and
`gender`. Name and nationality values are strings; dates are real calendar dates
in `YYYY-MM-DD` form, without time or timezone. Gender is `{ kind }`, with kind
`male`, `female`, `unspecified`, or `custom`; only custom requires the additional
nonempty string `customValue`. An absent gender is distinct from unspecified.
Custom fields accept string, finite number, boolean, or date values, never
arbitrary objects. Empty strings are permitted for string values; absence means
no value was supplied. Null and undefined are not stored field values.

Identifiers are case-sensitive ASCII letters followed by letters, digits or
underscores (maximum 64 characters). Built-in identifiers cannot be redefined.
Object prototype names and model metadata names are reserved. Custom labels
must be nonempty strings. Duplicate definitions and environments are rejected.
Inputs use plain or null-prototype records with own data properties; symbols,
accessors, unknown schema keys and inherited records are rejected. Errors use
only the fixed message `Invalid profile input`, without supplied values.

Agent Instructions are separate from personal values. Global/per-environment
instruction strings are inert structure only: no merging, execution, template
selection or automatic injection occurs. Instructions cannot be requested as
profile fields. Merely adding instructions does not create environment access.

## Policy and retrieval contracts

`core/policies.js` manages a distinct Map for every registered environment.
`core/permissions.js` evaluates only permissions and never returns a value.
`core/retrieval.js` provides an internal trusted-code facade:

- `createProfileCore(input?)` copies and validates model input.
- `addEnvironment(id)` initializes all fields to private.
- `addCustomField(definition, value?)` validates before updating state and adds
  private entries in every existing environment. Future environments also start
  private. Omitted custom values remain absent.
- `setPermission(environment, field, state)` accepts exactly `allow`, `ask_first`,
  or `private`; unknown environments/fields and malformed states are rejected.
- `setOptIn(boolean)` changes the master switch synchronously.
- `requestField(environment, field)` requests one explicit field, returning only
  one of the decisions below. There is no full-profile retrieval method.

| Condition | Decision |
| --- | --- |
| Opt-in off, missing/malformed policy, private, unknown environment/field, or absent value | `{ status: 'denied' }` |
| Opt-in on, known field/value, ask_first | `{ status: 'approval_required', field }` |
| Opt-in on, known field/value, allow | `{ status: 'allowed', field, value }` |

Denial and approval-required decisions contain no value. Extra request arguments
cannot approve access. Every request checks current policy and opt-in; revocation
blocks subsequent requests immediately. Already returned values cannot be recalled.
Different environments share master values, but never permission maps. Gender
objects are copied and frozen; scalar values cannot alias mutable input objects.
The facade exposes no mutable model or policies. Lower-level modules are internal
implementation details, not caller-facing disclosure interfaces.

## Planned Phase 2 integration and security limits

Phase 2 must design actual consent sessions bound to the authenticated caller,
environment, requested field and purpose, including expiry, cancellation,
revocation and replay prevention. Phase 1 has no approval token or approval
session, and `ask_first` always stops at `approval_required`. Authorization to
manage the profile and trustworthy environment/caller resolution must be defined
before exposing tools or any public API. Instruction execution needs its own
separate design.

This engine trusts its in-process management caller. Supplying an environment ID
is not authentication. Maps, closures and permission checks do not provide OS
isolation against malicious code in the same process, hostile JavaScript Proxies,
debuggers, memory inspection, or a compromised Host. No secure erasure or protection
against process crash dumps is claimed. Memory is lost when the instance/process
ends. There is no persistence, encryption, synchronization, export/deletion UI,
real user data collection, or model/provider transmission in this phase.

## Verification

`npm test` runs existing Host/read-only/disabled-default checks plus synthetic core
validation and permission tests. `npm run check:package` packs the suite, copies the
tests into its extracted artifact and runs them against packaged modules. The
existing `files: ["plugins", "docs", ...]` includes all core files and this document;
no file-list or exports change is needed. The existing GitHub Actions matrix runs
both commands on Windows/Linux with Node.js 22/24.
