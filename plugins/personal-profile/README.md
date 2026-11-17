# Personal Profile

**v0.6.0: left-sidebar UI preview is available; Host profile storage and agent access remain disabled. This is not a working personal-data feature.**

<img src="icon.png" width="96" alt="Amber Personal Profile ID and gear"/>

Enabling this Component still shows only a static design draft on the suite's
Plugins detail page. It accepts zero profile values. Its unchanged Host registers
no configuration schemas, agent instructions, tools, storage handlers or network
operations. The on/off switch is ordinary DSH plugin configuration and carries no
profile values.

## Left-sidebar preview (v0.6.0)

Installing/updating the suite to v0.6.0 adds a **Personal Profile** item to the global
**left sidebar**. It opens a full-height page with five sections:

- My Information — fictional, editable sample fields and custom fields.
- Agent Instructions — simulated global/per-Profile replacement and inheritance, editable personality and response preferences, and an effective preview.
- Access Control — simulated per-field policy and consent choices; no real permissions.
- Backup & Restore — review interactions only; no import/export, password, or disk writes.
- Privacy & Security — simulated lock, auto-lock choices and synthetic session controls.

The browser page supports Arabic and English. Sample edits exist **only in React
memory** and disappear when the page/bundle reloads. It neither reads nor writes
real Harness Profile values, uses no privileged Host transport, and sends no
data to an agent or remote service. **Do not enter real personal information.**

Since v0.6.2 the left-sidebar launcher, its page and the read-only design card
on the Plugins detail page are registered only while the Host **Personal
Profile** component is switched On and running; switching it Off unregisters
all three. Enabling it still activates no storage, Host integration or agent access.
There is **no Save button or persistent storage** in this release.

## Personality and response preferences (0.6.3)

- Style and tone: Default, Professional, Friendly, Candid, Creative, Efficient, Critical and Technical.
- Response language: Automatic, Arabic, English, Chinese, Spanish, French, German and Japanese; separate from interface language (Arabic/English). No dedicated dialect selector. Users may write dialect preferences in custom instructions.
- Six independent three-level traits: warmth, enthusiasm, headers/lists, emoji, detail and critical thinking.
- Eight optional behavior presets: Critical Thinking, No Fluff, Grill-Me Mode, Evidence First, Step-by-Step, Action Oriented, Code Reviewer and Humanizer. The Humanizer preset is a writing preference, not a Skill invocation.
- All defaults are neutral; no preset is selected. Global preferences and independent per-environment replacement overrides live only in React state. Choosing Inherit removes the override; a new override starts neutral. An explicit reset clears only the selected scope. The preview orders generated preferences before user text; it is not a conflict resolver or executable instruction composition.
- Native dropdowns use Field/FieldText system colors and inherit the Harness color scheme; actual Windows Desktop popup contrast requires manual verification.

No persistent saving, model injection, personal storage, permissions, approval changes, network calls or provider activation are included. The preview remains fictional-only, the Host implementation inert, and the component disabled by default.

For implementation and security boundaries see
[Phase 4 prototype](../../docs/PERSONAL_PROFILE_PHASE4.md) and
[Phase 6A integration QA](../../docs/PERSONAL_PROFILE_PHASE6A.md).

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

Phase 4 created the original isolated, synthetic-only development UI. That
original standalone preview remains test-only; v0.6.0 adds a separate browser
panel inside Harness without activating Host services. See
[prototype preview, boundaries and visual evidence](../../docs/PERSONAL_PROFILE_PHASE4.md).

Phase 6A adds internal synthetic integration QA only. See the
[verified Harness API research and security decision](../../docs/PERSONAL_PROFILE_PHASE6A.md)
and [manual Windows acceptance plan](../../docs/PERSONAL_PROFILE_WINDOWS_ACCEPTANCE.md).
Every real-device check remains NOT EXECUTED. The live component is still
read-only and disabled by default; no storage or access gate is activated.
