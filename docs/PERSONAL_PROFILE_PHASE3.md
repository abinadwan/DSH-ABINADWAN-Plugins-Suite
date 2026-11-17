# Phase 3: internal Agent Instructions management

> **Superseded (historical record).** Version 0.7.0 replaced this design with native Harness settings; see [the current design](PERSONAL_PROFILE_LOCAL_SETTINGS.md). Nothing described here is in the runtime or the package.

Status: in-memory management only, using synthetic tests. No Host integration,
agent registration, instruction injection, UI, persistence or real data collection.
The Personal Profile Component remains disabled by default and read-only.

## Model and precedence

There is one Master Profile (`core/model.js`). Its `instructions` member holds
`global: ''` and an `environments` Map, separate from personal field values,
permission policies and the Phase 2 consent ledger. No second profile store exists.
The existing constructor accepts optional global and environment instruction text.
All text defaults to empty; all environment overrides default to absent.

| State for a registered Profile | Preview source | Effective preference text |
| --- | --- | --- |
| No override entry | `global` | Current global text (possibly empty) |
| Override entry with text | `environment` | Only that environment's text |
| Override entry with `''` | `environment` | Empty; global text is suppressed |

Overrides replace the entire global preference block. No natural-language merge,
conflict detector or line ordering is used. To keep some global preferences in an
override, a user would explicitly copy/edit them. This makes environment precedence
predictable without pretending to interpret arbitrary text. Changing global text
immediately affects inheriting environments, never present overrides.

`null` in a preview means absence; `''` means an intentionally empty override.
Neither `null` nor `undefined` is accepted as instruction text. Use deletion to
restore inheritance. Whitespace and Unicode text are preserved verbatim.

## Trusted internal interface

`createConsentProfile(input)` still returns separate `{ host, reader }`
capabilities. Only `host.instructions` gains these synchronous management methods:

- `setGlobal(text)`: edit or clear global text (`''` clears).
- `setOverride(profileHandle, text)`: create/edit an override, including `''`.
- `deleteOverride(profileHandle)`: remove the override; repeated deletion is inert.
- `reset()`: clear global text and all overrides, leaving registrations intact.
- `preview(profileHandle)`: a detached frozen record `{ global, override, source,
  effective }`, containing text for trusted management inspection only.

There is no string environment selector on this interface. A Profile handle must
come from the same instance's trusted `host.registerProfile({ name, canonicalId })`.
Forged, cross-instance and serialized handles fail. All validation occurs before
mutation; invalid operations leave prior state intact and use generic errors that
contain no text or identifiers. Operations return no text except `preview`.
The preview is a management view, **not authorization to send text to a model**.
Management is independent of the personal-value opt-in and consent grants. Locking
continues to deny reader operations; a trusted management owner can still edit and
inspect instructions. Future Host authentication must govern that owner access.

The 8,192 UTF-16-unit limit applies independently to global and each override.
The existing 64-environment union budget covers instruction-only names and
registered environments. Reset does not deregister Profiles or free their policy
slots. Personal values and consent are never edited, reset or granted by instruction
management. Reader methods and their metadata remain unchanged and never return
instruction text.

## Profile identity

Reuse Phase 1 Harness basename validation and Phase 2 opaque handles plus unique
canonical IDs. The registered management path also rejects names colliding after
NFKC normalization, lowercase conversion and removal of trailing spaces/dots. Seeded
instruction environment keys receive the same collision check at construction;
registering a seeded key requires its exact spelling. Duplicate registration is
rejected rather than silently rebinding instructions. Failed registration reserves
no identity. The conservative check may reject distinct names on Linux deliberately.

This collision guard is not a portable filesystem identity resolver. It does not
prove that different paths, symlinks, case mappings or filesystem aliases identify
different Profiles. The legacy Phase 1 exact-key core API retains its original
semantics and is not an authorized instruction management interface.

## Optional style suggestions

`core/instructions.js` exports a frozen internal list of original starting points:

- Start with the result, then give the reasoning in a short paragraph.
- Explain unfamiliar terms when they first appear and use a concrete example.
- For comparisons, use a compact table and explain the main tradeoff.

These are optional text a user may copy and edit. Nothing selects or applies them
automatically. They are not a safety classifier or a security mechanism.

## Security boundaries and future integration

No public package export, agent tool, model context, network API, browser route,
logging or telemetry path is added. Runtime Host/client code imports none of this
engine. `createProfileAccess` and other core modules remain trusted internal code;
never hand their factories, registration methods or management capabilities to an
agent. Same-process bearer handles are not OS isolation against malicious plugins,
debuggers, hostile Proxies or compromised trusted code. Text remains in memory;
there is no encryption, secure erasure or durable storage guarantee.

Instructions carry preferences only. They cannot change system/developer policies,
security rules, tool authorization, Profile access or consent grants in this engine.
The engine stores arbitrary text without asserting it is safe. Arbitrary natural
language cannot be proven safe by changing its order. Any actual model-facing
composition requires a separate security review, including prompt injection,
conflicting instructions, disclosure, tools and lifecycle behavior.

Before any future integration, the Host must:

1. Resolve the active Harness Profile through trusted Harness state, not model or
   browser strings. Obtain its canonical identity using the actual platform's
   filesystem/case/alias semantics, and enforce one identity-to-handle mapping.
2. Authenticate the management user, keep capabilities private, and explicitly
   authorize preview access and any future use for the correct active Profile.
   Do not reuse personal-value consent as authorization for instruction injection.
3. Keep text out of browser payloads, agent tools, generic APIs, logs and traces.
   Design any real editing UI and its transport as a separately reviewed boundary.
4. Review composition and policy enforcement separately before activating it.
   Recheck active Profile, authorization and lock/lifecycle state at use time;
   avoid stale preview caches or cross-environment fallback on identity failure.

No Host resolver, authorization bridge, editing UI or model composer is implemented
in this phase. All tests use synthetic data. Passing tests establish these module
contracts, not the safety of future instruction injection.
