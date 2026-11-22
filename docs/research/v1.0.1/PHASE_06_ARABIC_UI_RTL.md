# Phase 06 — Arabic UI and RTL

- Branch: feat/phase-06-arabic-ui-rtl
- Base develop: 7d28d647e470c790e32adc2d51f86d8779894d94 (Phase 05 merge).
- Candidate: 1.0.1-rc.6; stable published v1.0.0 unchanged. This is not a release or Desktop installation.

## Delivered
Chat Control follows the active DSH locale snapshot and uses direction-aware Arabic labels for policy, protection and preview controls. RTL containers and localized retention durations coexist with existing mixed-direction bdi titles, native Workspace and Session IDs, and revision-confirmed Settings writes. Adaptive Reasoning composer displays Arabic session-effort menu labels, accessible menu descriptions and status toasts when the Host locale is Arabic. English labels remain the default for an English Host. Direct Chat's existing Arabic/English history labels are retained; its preview container and message respect the chosen language.

## Synthetic checks
Mounted React tests target the official Host locale observable, live Arabic/English switching, RTL language attributes and translated menu controls. Existing English regression is maintained by explicitly selecting English Host locale in legacy fixtures. The comprehensive root DSH Arabic locale dictionary continues to be packaged and unregisters only its own records. Run the Windows/Ubuntu Node 22/24 matrix, package validation and pinned Host fixtures. Capture final CI links in PR before merge.

## Limits and Desktop acceptance
Not all third-party provider effort names, dynamic Session titles, Settings API error payloads or Host-level modal primitives can be translated by the plugin. Arabic and English accessibility, keyboard focus, bidirectional truncation, text wrapping and screen-reader output require actual DSH Desktop examination during the consolidated end-of-project acceptance. Do not claim visual perfection from jsdom fixtures. No new user data, persistent format, deletion, locale preference change or release action was introduced.
