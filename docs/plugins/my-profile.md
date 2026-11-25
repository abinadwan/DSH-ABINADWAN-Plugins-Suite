# My Profile — Settings and privacy contract (current contract)

My Profile is optional and disabled by default. The page appears under **Settings → My Profile**, not the main sidebar. It uses one native settings record across Workspaces of the active Harness Profile.

## Interface language

New v4 profiles default to `locale: 'auto'`, **Follow DSH**. The browser page reads and subscribes to DSH's public Locale snapshot (with a safe English fallback if unavailable); switching the Host language re-renders My Profile only while Follow DSH is selected. The user can independently select English, Arabic, Chinese, Spanish, French, German or Japanese and save the selection; Arabic uses RTL. Changing My Profile's language does not call `ctx.locale.setLocale` or change DSH itself, and does not alter the separate model response-language preference. Existing saved `ar`/`en` remain explicit overrides, and legacy records migrate without losing their language. A version 4 backup retains `auto` and the five added locales; existing manual English/Arabic settings retain v2 export compatibility.

## My Information

Preferred name, nationality and gender are on one page, each beside an independent “Available to agent” checkbox. Checked, nonempty fields are included in supported top-level native agent prompts after an explicit, revision-checked Save. Unchecked fields remain stored but are not freshly injected. The same choice applies to every configured model/provider, including cloud providers. New fields default to private. No global sharing switch, cloud distinction or Ask First flow remains. Empty text and unspecified gender are not sent.

## Agent Instructions

Response preferences include style, language, traits, presets and custom instructions. Editing or restoring custom instructions clears their separate sending consent.

## Compatibility and storage

Native record v4 contains the information, preferences, locale and only two field policies: allow/private. v1, v2 and v3 remain readable, but their structured fields do not authorize sharing. On upgrade, existing values and compatible preferences are retained, the three checkboxes start unchecked, and no record is rewritten until Save. Legacy Workspace migration still requires review and confirmation. Export an archival v2 JSON backup and preserve the original Harness configuration before upgrading if rollback is needed.

The plugin uses native settings.describe and settings.replace with a revision check; no independent database or filesystem. Plaintext settings and JSON backups are readable by anyone with file access.

## Backup & Restore

Exports contain the current draft, including unsaved information, instructions and access choices, as unencrypted JSON. Exporting does not save the draft to Harness. Explicit English/Arabic interface overrides use the compatible **v2** export shape (with the old sharing switches Off); **Follow DSH** and the five additional UI languages use **v4** to preserve the interface-language selection. Imports accept v1–v4. Merge preserves omitted values; imported changed information defaults to private unless its permissions are separately selected and acknowledged. Replace All starts Private and requires a separate confirmation. Legacy Ask First maps to Private. An explicitly acknowledged imported Allow choice applies only after Save. Custom-text permission clears on restore. No encryption, passwords or new consent registry.

## Context boundary and acceptance

The plugin contributes to supported native agent steps only. While My Profile is enabled, the send-time guard refuses recognizable earlier Profile details or custom instructions that current saved choices no longer authorize. This does not erase information from previously sent messages, provider systems, logs, stored history, summaries, files, or other sources. A new clean Workspace/session should receive only current checked fields from this plugin; this is not a promise of global Workspace isolation.

The owner accepted the pre-provider refusal and fresh-session privacy control for MP02; the historical provider-wire continuation test remains Blocked, not Pass. The guard recognizes known structured sections and cannot guarantee removal of arbitrary historical text. Use fictional data in disposable Profiles for verification; inspect outgoing requests where permitted rather than relying on model responses.
