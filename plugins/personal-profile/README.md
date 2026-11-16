# Personal Profile

**Phase 1 internal core; read-only Host draft, disabled by default. The full feature is not ready.**

<img src="icon.png" width="96" alt="Amber Personal Profile ID and gear"/>

Enabling this Component still shows only a static design draft on the suite's
Plugins detail page. It accepts zero profile values. Its unchanged Host registers
no configuration schemas, agent instructions, tools, storage handlers or network
operations. The on/off switch is ordinary DSH plugin configuration and carries no
profile values.

Phase 1 adds isolated in-memory modules under `core/`, exercised only with
synthetic fixtures. The optional master fields are Preferred Name, Full Name,
Date of Birth, Nationality, Gender (including custom and unspecified), and
user-defined custom fields. Agent Instructions have separate global and
per-environment structure; they are not executed.

Each environment has its own default-private permission map. `allow` requires the
master **Allow the agent to use approved profile information** opt-in, initially
off. `ask_first` returns `approval_required` without a value; `private` denies.
Safe retrieval handles only one explicitly requested field. The core is not
connected to the Host, registered as an agent tool, or exposed as a public API.

See [Phase 1 data model, contracts and security limitations](../../docs/PERSONAL_PROFILE_PHASE1.md).
Real approvals are planned for Phase 2. Collection, persistence, encryption,
transmission, instruction execution and user-facing consent remain unimplemented.
An in-memory check does not provide operating-system isolation.

Tests cover validation, property-name attacks, default denial, environment
isolation, opt-in, revocation and packaged execution. Existing tests also verify
the Host has no Config schema or injected service and renders no entry/save
controls.

[Suite overview](../../README.md)
