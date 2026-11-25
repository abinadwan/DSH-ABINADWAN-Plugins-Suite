# My Profile — Settings and privacy contract

My Profile is optional and disabled by default. Enable it in Plugins and open **Settings → My Profile**. One native record belongs to the active Harness Profile across its Workspaces.

## Information and instructions

Save commits the preferred name, nationality, gender, response style, response language, traits, behavior presets and optional custom instructions. Version 5 makes all populated saved information and instructions available to supported top-level native conversations, irrespective of local or cloud provider. Empty fields and unspecified gender are omitted. Structured values are normalized and quoted as data; they are not a tool or command.

The plugin separates personal details into one named dynamic context via `systemPrompt.context()` and response preferences into one native `systemPrompt.section()`. DSH refreshes runtime context and assembles system instructions before step admission. The language instruction explicitly distinguishes input language from an explicit request to change output language. DSH may retain prior system-prompt updates in history depending on provider mode. Older registries without the context API use one combined system section. DSH may suppress optional context; the plugin does not bypass that decision. No extra model call or direct transport is added. It does not refuse continuation when settings change. Previous snapshots and derived text may remain in history, summaries, logs or provider systems. An empty profile supplies a current personal-details reminder, not a deletion of past records. The plugin does not change reasoning settings. Small-model comprehension requires real model testing.

## Interface language

New records default to Follow DSH (`auto`). English, Arabic, Spanish, French, German, Simplified Chinese and Japanese remain explicit overrides; Arabic is RTL. Interface language is independent of the model response-language setting.

## Compatibility and access

Native record v5 stores information, preferences and locale without sharing switches. v1–v4 remain readable; existing settings retain their former sharing scope until a reviewed Save migrates them. The migration page explains the new sharing behavior and offers an original-record export. Legacy Workspace overrides are not merged. Use a separate test Profile or retain the original Harness configuration before upgrading; older releases may not understand v5.

Settings use native revision-checked `settings.describe` and `settings.replace`. Read access and the current connection generation gate the displayed record. Loss of read access or connection reset removes the old draft and reloads authorized settings. An old unsaved draft is intentionally not carried to a new Host.

## Backup and restore

Current exports are unencrypted v5 JSON, including the draft. Imports accept v1–v5. Review & Merge preserves omitted values; Replace All requires its own confirmation. Imports validate legacy fields but do not restore old sharing switches. Restore changes the draft only until Save. No plugin-level encryption, separate storage or password. Do not enter credentials or sensitive information.
