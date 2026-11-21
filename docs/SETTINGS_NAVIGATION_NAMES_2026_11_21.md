# Settings navigation and component naming — 2026-11-21

## Owner decision

Two UI changes are approved for the six-component ABINADWAN Plugins Suite:

| Surface | Before | After |
| --- | --- | --- |
| Main left navigation | Personal Profile item under Plugins / Automation tasks / More | No Personal Profile/My Profile item |
| Native Settings navigation | No Profile editor section | **My Profile** (order 40) |
| Profile page title | Personal Profile | **My Profile** (English title; Arabic wording preserved as appropriate) |
| Profile component card / plugin metadata | Personal Profile | **My Profile** |
| Native Settings navigation | Conversation Lifecycle (truncated on narrow sidebars) | **Chat Control** (order 45) |
| Lifecycle page title | Conversation Lifecycle | **Chat Control** |
| Lifecycle component card / plugin metadata | Conversation Lifecycle | **Chat Control** |

Both renamed entries retain their current icons. No new top-level navigation, component, or settings storage is created.

## My Profile interface-language policy

- **English** (`en`, left-to-right) is the default UI language for newly created v4 profile records; the Settings page initially opens in English for a fresh profile.
- An explicit **Interface language** control offers **English** and **العربية**. Choosing Arabic immediately renders the UI in Arabic and right-to-left; the choice is only persisted after the user presses **Save**.
- Existing stored `locale: 'ar'` or `locale: 'en'` values are respected as-is. Opening the new version, reconnecting, restoring a backup, or migrating legacy records must not silently overwrite a previously chosen locale.
- Historical v1–v3 record defaults and backup-compatibility behavior remain unchanged; the new schema default applies only to newly created current-version records.
- **Interface language is independent from Response language**; the latter retains its Automatic setting unless separately changed. No forced model response language, no global DSH locale change, and no new privacy permissions are introduced.


## Implementation

- The browser `profilePlugin` now registers `settings.section` and `settings.section.icon` with label **My Profile**. It no longer registers `main` or `sidebar.panellist` slots for the editor.
- The profile renderer, its React error boundary, access checks, Settings Remote `describe/replace`, backup/restore, language preferences, permission toggles and saved-profile semantics are unchanged.
- The existing `lifecycleSettingsPlugin` retains its native `settings.section` and icon; only its label and page heading become **Chat Control**.
- English metadata titles in `plugins/personal-profile/locale/en.json` and `plugins/conversation-lifecycle/locale/en.json` reflect the new names. The profile's Arabic metadata file follows the selected English product title for a consistent card label.
- The Profile and Lifecycle enable/disable behavior remains controlled by their existing Host component rows. Turning either component Off removes its Settings entry without deleting its stored settings.
- Existing documentation refers to new UI names and records former names for users upgrading.

## Compatibility contract (do not rename)

| Stable internal object | Must stay unchanged |
| --- | --- |
| Profile Host component id | `abinadwan-personal-profile` |
| Profile module export and path | `@abinadwan/dsh-plugins-suite/personal-profile` |
| Profile storage namespace | `abinadwan-personal-profile` |
| Profile panel/Settings slot id | `@abinadwan/dsh-plugins-suite/personal-profile-page` |
| Lifecycle Host component id | `abinadwan-conversation-lifecycle` |
| Lifecycle module export and path | `@abinadwan/dsh-plugins-suite/conversation-lifecycle` |
| Lifecycle storage namespace | `abinadwan-conversation-lifecycle` |
| Package identity | `@abinadwan/dsh-plugins-suite` |

This is a **display name and navigation change only**. No settings schema, version, data shape, migration, configuration rewrite, backup format, permission default, or package module path has changed. Existing saved preferences, access policies, retention settings, and component enablement are retained.

Do not rename a namespace or move/delete stored settings merely to match the shorter display title. In particular, no new `/chat-control` or `/my-profile` package export is introduced.

## Automated regression checks

- Verify My Profile appears in `settings.section` while its Host row is enabled and disappears when disabled.
- Verify its icon registers in `settings.section.icon`, and neither `main` nor `sidebar.panellist` contains its old entry.
- Verify the existing profile page renders inside a Settings slot, and all settings save/revision checks, backup/import, privacy defaults, error handling and Workspace independence continue to pass.
- Verify the title reported by the Profile package metadata is **My Profile**.
- Verify Lifecycle remains a separate Settings section and its user-visible name and metadata title are **Chat Control**.
- Run `npm test` and `npm run check:package` on Windows and Linux with supported Node versions and review the relevant GitHub Actions result.

## Manual Windows Desktop acceptance (disposable QA Profile)

1. Use a separate QA Desktop Profile and a pinned feature commit. Preserve/export any previous settings before changing installed plugin revisions.
2. Enable the Suite and **My Profile** component. Check that there is no old profile row in the main sidebar and that **Settings → My Profile** opens its existing page and icon.
3. Edit a **synthetic** preference and click Save. Close and reopen Settings, then restart Harness and confirm it persists.
4. Verify Backup & Restore, cancel and conflict messaging without using personal information; verify disable/re-enable hides and restores the Settings entry without erasing saved values.
5. Enable **Chat Control** and confirm that the name is not truncated on the same narrow Settings sidebar; check the component card title and in-page heading.
6. Check that Direct Chat, the other four components and existing projects retain their settings and navigation behavior.

## Risks, boundaries and rollback

- These UI labels are shorter, but a real Windows Desktop visual check is required for narrow themes and localized layouts.
- Existing references in old release notes and historical research intentionally retain former names to preserve their provenance.
- The old Profile editor was registered in a main-view slot. Rendering inside Settings uses DSH's public `settings.section` slot, already used by the lifecycle component; test both page navigation and unmount/re-enable behavior on the actual targeted Desktop build.
- This change does not claim improvements to profile encryption, model-disclosure privacy, conversation deletion, or Direct Chat process isolation.
- If Desktop Settings integration fails, revert the feature commit or return to the previous tested full SHA; the unchanged saved settings require no reverse migration.
- No automatic update or stable publication is implied by implementing this branch.
