# Personal Profile

**Read-only configuration draft in suite 0.5.0. Disabled by default. Privacy and storage design awaits approval.**

<img src="icon.png" width="96" alt="Amber Personal Profile ID and gear"/>

Enabling this Component shows a static design draft on the suite's Plugins detail page. It accepts zero profile values. Its Host module registers zero configuration schemas, agent instructions, tools, storage handlers or network operations. The Component's on/off switch is ordinary DSH plugin configuration and carries no profile values.

## Preliminary fields

| Field | Preliminary behavior |
| --- | --- |
| Name | Preferred name, with optional full name |
| Date of birth | Optional |
| Nationality | Optional |
| Gender | Selected by the user, with the choice to leave it unspecified |
| Custom agent instructions | Empty by default, with optional templates the user may choose |
| Allow the agent to use approved profile information | Explicit opt-in, initially off |

The draft displays optional instruction examples for concise answers, clear Arabic and professional tone. It offers no form fields, template-selection action or save button.

## Proposed behavior after approval

Apply approved style instructions automatically. Access personal or sensitive information only when relevant to the request and allowed by the user. Separate style instructions from personal records so personal details are retrieved only for the approved purpose. These are proposed requirements for a future implementation.

## Design decisions awaiting discussion

- The final field set, name requirement and how the user approves each instruction or field.
- Storage location, encryption, account/profile isolation and migration.
- Per-field consent, relevance decisions and how permission can be revoked.
- Export, deletion, retention, synchronization and backup behavior.
- What information may enter model context, when it enters, and which provider receives it.
- Controls for automatic style instructions and sensitive-field access.

Only a static draft is delivered now. Collection, persistence, transmission, retrieval, automatic style application and consent enforcement require design approval before implementation.

## Verification

Tests confirm the Host has no Config schema or injected service, and enabling it renders a read-only draft without data-entry controls. Disabling removes the draft. All example content is generic.

[Suite overview](../../README.md)
