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

Field identifiers are case-sensitive ASCII letters followed by letters, digits or
underscores (maximum 64 UTF-16 code units). Built-in identifiers cannot be redefined.
Object prototype names and model metadata names are reserved. Custom labels
must be nonempty strings. Duplicate definitions and environments are rejected.
Inputs use plain or null-prototype records with own data properties; symbols,
accessors, unknown schema keys and inherited records are rejected. Errors use
only the fixed message `Invalid profile input`, without supplied values.

Agent Instructions are separate from personal values. Global/per-environment
instruction strings are inert structure only: no merging, execution, template
selection or automatic injection occurs. Instructions cannot be requested as
profile fields. Merely adding instructions does not create environment access.

## Harness Profile names

Environment names use a separate validator from field identifiers. Verified against
[official `resolveProfileDir` source at commit `39163dd`](https://github.com/deepseek-ai/deepseek-harness/blob/39163dd30f703a79079e2d2446545cff3c453738/packages/boot/app-boot/src/profile.ts#L164-L172)
and the source shipped in our locked `@deepseek-ai/dsh-app-boot@0.2.2-rc.3`:
Harness rejects empty names, names containing `/` or `\`, exactly `.` or `..`, and
exactly `node_modules`. It does **not** impose the ASCII field-ID regex; hyphens
(including shipped `sdk-minimal`), leading digits/underscores, dots within names,
spaces and Unicode are accepted by that resolver. Tests cross-check accepted
synthetic names with the official package's side-effect-free `resolveProfileDir`
using an explicit synthetic home path. No profile directory is created.

Personal Profile additionally rejects C0/C1 control characters (including NUL),
object-prototype/model-reserved names, non-string input and names over 255 UTF-16
code units. These are local safety/resource restrictions, not upstream naming
rules. Names are exact, case-sensitive keys: no trimming, case folding or Unicode
normalization; differently spelled names cannot inherit permissions. No filesystem
path is derived by the core, and this is not a portable filesystem-name validator.
The same validation applies to environment instructions, registration, policy
updates and retrieval (invalid retrieval requests fail closed).

## Input and resource limits

`core/limits.js` defines fixed internal budgets. Lengths count JavaScript UTF-16
code units (`string.length`), so an astral character consumes two units. Inputs
are rejected, never truncated or coerced, with the fixed error above.

| Input | Inclusive maximum |
| --- | --- |
| Preferred Name, Full Name, Nationality, custom string value, custom Gender text | 1,024 units each |
| Custom-field label | 128 units |
| Global Agent Instructions | 8,192 units |
| Each environment's Agent Instructions | 8,192 units |
| Custom-field definitions | 64 |
| Distinct environment names across instructions and registered policies | 64 |
| Environment/Profile name | 255 units |
| Field identifier | 64 units |

Dates retain the fixed 10-character calendar format. Booleans/numbers remain
scalar and type checked. Empty string values/instructions remain permitted;
labels/custom Gender text remain nonempty. There are no limits on the meaning or
execution of instructions because they are never executed.

These budgets accommodate normal names, notes and instructions while bounding
retained data and the environment × field permission map to 64 × 69 entries.
Environment instruction entries reserve distinct-name capacity but grant no
access; registering one of those names consumes no extra name slot. New policy
maps still start entirely private. At capacity, modifying existing permissions
and revoking access continue to work.

Array lengths and record entry counts are checked before processing contents;
field records allow at most 69 entries, environment-instruction records 64, and
fixed schema records only their declared key count. Keys longer than 255 units
are rejected. Validation and size checks complete before custom-field or
environment registration mutates state; rejected operations neither reserve
identifiers/capacity nor alter existing values/permissions. Constructors expose
no partially initialized model when validation fails.

These caps bound accepted state and ordinary validation work. They cannot prevent
allocation of a huge caller-created input or the temporary own-key list produced
by JavaScript reflection. They are not process memory quotas or a sandbox; hostile
Proxies/in-process code remain outside this phase's trust boundary.

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

## Phase 2 integration and security limits

Phase 2 now provides a separate internal consent layer; see
[the Phase 2 contracts](PERSONAL_PROFILE_PHASE2.md). The following describes the
original Phase 1 boundary, which remains unchanged for its standalone facade.

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
