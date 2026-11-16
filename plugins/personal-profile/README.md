# Personal Profile

**Phase 3 internal instruction management; read-only Host draft, disabled by default. The full feature is not ready.**

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
Harness Profile names now support hyphens and other official basename forms,
with additional local safety checks. Fixed limits bound text, labels, instructions,
custom fields and environments; see the Phase 1 document for exact budgets.

Phase 2 adds an isolated in-memory consent facade with Allow Once, Allow for This
Session and Deny, plus expiry, cancellation, replay protection and lifecycle
invalidation. Harness native approvals remain one-shot; session grants belong to
this separate layer. No permanent Allow decision exists.
See [Phase 2 contracts, trust boundaries and canonical Profile identity requirements](../../docs/PERSONAL_PROFILE_PHASE2.md).
Actual UI approvals, Host authentication/integration, collection, persistence,
encryption, transmission and instruction execution remain unimplemented.
An in-memory check does not provide operating-system isolation.

Tests cover validation, property-name attacks, default denial, environment
isolation, opt-in, revocation and packaged execution. Existing tests also verify
the Host has no Config schema or injected service and renders no entry/save
controls.

[Suite overview](../../README.md)

Phase 3 adds trusted internal instruction editing and preview using the same Master
Profile and registered Profile handles. Absent overrides inherit global text;
explicitly empty overrides suppress it. Optional original style suggestions never
activate automatically. No instruction text reaches readers, Host, UI or models.
See [Phase 3 model, precedence, identity and future security gates](../../docs/PERSONAL_PROFILE_PHASE3.md).

Phase 4 adds an isolated, synthetic-only development UI; it is not mounted in
Harness or shipped as a production entrypoint. See
[prototype preview, boundaries and visual evidence](../../docs/PERSONAL_PROFILE_PHASE4.md).

Phase 6A adds internal synthetic integration QA only. See the
[verified Harness API research and security decision](../../docs/PERSONAL_PROFILE_PHASE6A.md)
and [manual Windows acceptance plan](../../docs/PERSONAL_PROFILE_WINDOWS_ACCEPTANCE.md).
Every real-device check remains NOT EXECUTED. The live component is still
read-only and disabled by default; no storage or access gate is activated.
