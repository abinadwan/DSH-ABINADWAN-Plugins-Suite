# My Profile (Personal Profile) — simplified development candidate

My Profile is optional and disabled by default. The page appears under **Settings → My Profile**, not the main sidebar. It uses one native settings record across Workspaces of the active Harness Profile.

## Interface language

English is the default My Profile UI language for a new current-version record. Users can switch to Arabic from the page's language dropdown and save the selection; the Arabic interface uses RTL direction. Existing stored language choices and legacy record migrations are preserved. This does not change the model response language or the global Harness interface.

## My Information

Preferred name, nationality and gender are on one page, each beside an independent “Available to agent” checkbox. Checked, nonempty fields are included in supported top-level native agent prompts after an explicit, revision-checked Save. Unchecked fields remain stored but are not freshly injected. The same choice applies to every configured model/provider, including cloud providers. New fields default to private. No global sharing switch, cloud distinction or Ask First flow remains. Empty text and unspecified gender are not sent.

## Agent Instructions

Response preferences, style, language, traits, presets and custom instructions are unchanged. Editing or restoring custom instructions clears their separate sending consent.

## Compatibility and storage

Native record v4 contains the information, preferences, locale and only two field policies: allow/private. v1, v2 and v3 remain readable, but their structured fields do not authorize sharing. On upgrade, existing values and compatible preferences are retained, the three checkboxes start unchecked, and no record is rewritten until Save. Legacy Workspace migration still requires review and confirmation. Export an archival v2 JSON backup and preserve the original Harness configuration before upgrading if rollback is needed.

The plugin uses native settings.describe and settings.replace with a revision check; no independent database or filesystem. Plaintext settings and JSON backups are readable by anyone with file access.

## Backup & Restore

Export remains complete, plain version 2 JSON with both old switches Off for backward compatibility. Imports accept v1–v4. Merge preserves omitted values; imported changed information defaults to private unless its permissions are separately selected and acknowledged. Replace All starts Private and requires a separate confirmation. Legacy Ask First maps to Private. An explicitly acknowledged imported Allow choice applies only after Save. Custom-text permission clears on restore. No encryption, passwords or new consent registry.

## Context boundary and acceptance

The plugin contributes to supported native agent steps only. The send-time guard refuses a recognizable earlier Profile details section that no longer matches the current allowed block while the plugin is enabled. This does not erase information from previously sent messages, provider systems, logs, stored history, summaries, files, or other sources. A new clean Workspace/session should receive only current checked fields from this plugin; this is not a promise of global Workspace isolation.

Use synthetic values and clean disposable Workspaces on rc.5 Desktop to exercise saved and unsaved checkbox changes, old and new conversations, switching providers, retries, restart, upgrade, backup and rollback. Verify actual outgoing request bytes, not model responses alone. Source, package and native/real Desktop verification remain acceptance gates for this feature branch. Do not merge until the owner approves.
