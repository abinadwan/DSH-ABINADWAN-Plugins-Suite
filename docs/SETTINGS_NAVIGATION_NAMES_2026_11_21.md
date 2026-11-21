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

- New v4 profiles store `locale: 'auto'` (**Follow DSH**); they read the active language from DSH's public `ctx.get('locale')` snapshot service, and subscribe so the page updates immediately when DSH changes.
- Users may choose **English, العربية, 中文, Español, Français, Deutsch or 日本語** instead of Follow DSH. An independent override changes only My Profile and is saved after **Save changes**; no call writes to DSH language settings. The page can return to Follow DSH at any time.
- Existing saved `ar` or `en` remain explicit overrides and retain the current interface when upgraded. v1–v3 legacy records are not rewritten on load.
- Arabic layouts use RTL; English, Chinese, Spanish, French, German and Japanese use LTR. Unrecognized DSH languages (such as Portuguese or Russian) fall back to English inside the plugin, without changing DSH or hiding the selected Follow DSH mode.
- The page provides complete translations for its own UI dictionary keys in the seven supported languages. The model **Response language** remains independent and defaults to Automatic.
- Backup format compatibility: explicit English/Arabic exports remain version 2, but `auto` and other languages export version 4 to preserve the selection. Both formats import; a historic version 2 backup or Harness configuration is needed for rollback to versions that cannot read v4.
- The `locale` field stays in the same native settings namespace. No separate DSH settings writes, forced model-language changes, or new data-sharing permissions are introduced.

## Implementation

- The browser `profilePlugin` now registers `settings.section` and `settings.section.icon` with label **My Profile**. It no longer registers `main` or `sidebar.panellist` slots for the editor.
- The profile renderer, its React error boundary, access checks, Settings Remote `describe/replace`, permission toggles and saved-profile semantics are unchanged; interface locale and the conditional v2/v4 backup selection are updated as described above.
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
