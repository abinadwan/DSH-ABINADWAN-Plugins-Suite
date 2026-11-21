# My Profile — current Settings and privacy contract (development v1.0.0)

My Profile is optional and disabled by default. The page appears under **Settings → My Profile**, not the main sidebar. It uses one native settings record across Workspaces of the active Harness Profile.

## Interface language

New v4 profiles default to `locale: 'auto'`, **Follow DSH**. The browser page reads and subscribes to DSH's public Locale snapshot (with a safe English fallback if unavailable); switching the Host language re-renders My Profile only while Follow DSH is selected. The user can independently select English, Arabic, Chinese, Spanish, French, German or Japanese and save the selection; Arabic uses RTL. Changing My Profile's language does not call `ctx.locale.setLocale` or change DSH itself, and does not alter the separate model response-language preference. Existing saved `ar`/`en` remain explicit overrides, and legacy records migrate without losing their language. A version 4 backup retains `auto` and the five added locales; existing manual English/Arabic settings retain v2 export compatibility.

## My Information

Preferred name, nationality and gender are on one page, each beside an independent “Available to agent” checkbox. Checked, nonempty fields are included in supported top-level native agent prompts after an explicit, revision-checked Save. Unchecked fields remain stored but are not freshly injected. The same choice applies to every configured model/provider, including cloud providers. New fields default to private. No global sharing switch, cloud distinction or Ask First flow remains. Empty text and unspecified gender are not sent.

## Agent Instructions

Response preferences, style, language, traits, presets and custom instructions are unchanged. Editing or restoring custom instructions clears their separate sending consent.

## Compatibility and storage

Native record v4 contains the information, preferences, locale and only two field policies: allow/private. v1, v2 and v3 remain readable, but their structured fields do not authorize sharing. On upgrade, existing values and compatible preferences are retained, the three checkboxes start unchecked, and no record is rewritten until Save. Legacy Workspace migration still requires review and confirmation. Export an archival v2 JSON backup and preserve the original Harness configuration before upgrading if rollback is needed.

The plugin uses native settings.describe and settings.replace with a revision check; no independent database or filesystem. Plaintext settings and JSON backups are readable by anyone with file access.

## Backup & Restore

Exports remain complete and unencrypted JSON. Explicit English/Arabic interface overrides use the compatible **v2** export shape (with the old sharing switches Off); **Follow DSH** and the five additional UI languages use **v4** to preserve the interface-language selection. Imports accept v1–v4. Merge preserves omitted values; imported changed information defaults to private unless its permissions are separately selected and acknowledged. Replace All starts Private and requires a separate confirmation. Legacy Ask First maps to Private. An explicitly acknowledged imported Allow choice applies only after Save. Custom-text permission clears on restore. No encryption, passwords or new consent registry.

## Context boundary and acceptance

The plugin contributes to supported native agent steps only. The send-time guard refuses a recognizable earlier Profile details section that no longer matches the current allowed block while the plugin is enabled. This does not erase information from previously sent messages, provider systems, logs, stored history, summaries, files, or other sources. A new clean Workspace/session should receive only current checked fields from this plugin; this is not a promise of global Workspace isolation.

Use synthetic values and a disposable Desktop Profile to check saved and unsaved checkbox changes, new conversations, switching providers, retries, restart, backup and rollback. Verify outgoing request contents where permitted; a model's refusal or ignorance alone does not prove exclusion. Changes for My Profile and language navigation were merged into `develop` in [PR #26](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/pull/26) after successful cross-platform CI. Final Windows multilingual Settings checks and request-level disclosure security verification remain open; `develop` integration must not be described as stable-release acceptance.
