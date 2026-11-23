# H04 follow-up — Direct Chat title search (v1.0.2-rc.3)

**Status: source mitigation implemented; native H04 acceptance remains OPEN.** This note supplements the unchanged [rc.3 acceptance report](DSH_DESKTOP_DIRECT_CHAT_ACCEPTANCE_V1.0.2_RC3.md).

## Observed failure and scope

The archived Windows Desktop test used 10,000 registered Sessions (two retained native controls, 9,998 synthetic log-backed entries). The native authorized Session list had missing `title` metadata and a generic `Direct Chat` display label for some saved conversations. Full Session ID search worked. Opening a tail Session caused the Host summary to gain its title. The original H04 result is **Fail** until the full pre-open title-search case passes on an installed Desktop.

The upstream Session Controller describes `SessionSummary.title` as absent until the Host projects a title; `displayTitle` is a fallback label, not proof of a durable stored title. The Host's cold list uses cached summary projections when available. A title contained only in an unopened log may not be visible through the current authorized list.

## Narrow source change

- In `conversationInventory`, take a missing search title from the **already authorized** `sessions.projectionsBySession[id].values.title` or `sessions.byId[id].projectionValues.title` if present. Prioritize the current authoritative `row.title` and never replace it with stale projection data.
- Use this available title for the Direct Chat history search, display and rename input; still restrict entries to admitted Session IDs with unique Workspace membership.
- When title metadata remains absent and a search is entered, tell the user that title matches may be incomplete and that Session ID search remains available.
- Add regression coverage for authorized projected-title search, Unicode, incomplete-metadata notice, stale-title priority and exclusion of foreign Workspace projections.

This change does **not** read message transcripts or headers, issue per-Session network requests, introduce a background index, change Host permissions, or claim to recover titles the Host never supplied. At 10,000 Sessions with neither row title nor authorized title projection, full pre-open title search can still miss those Sessions.

## Required native follow-up

On installed Windows DSH Desktop `0.2.2-rc.5`, pin the **new PR head SHA** and verify code/package parity. Recreate 100/1,000/10,000 fictional Session inventories in a disposable Profile. Before opening the known saved tail Session, inspect the authorized list's `title`, `displayTitle`, `projectionValues.title`, and `projectionsBySession[id].values.title` **as presence/type/boolean flags, not content**, then search by exact title and full ID. Repeat after cold restart, and check the title-incomplete notice. Measure opening, search, page and renderer heap. Retest Unicode, Arabic, renamed and archived cases; verify unrelated Workspace titles never appear.

If the Host supplies the cached projection and the title works, record H04 Pass against the exact candidate SHA. If the Host supplies neither value, keep H04 Fail: investigate the upstream Session Controller / projection cache and the synthetic seeder; do not bypass authorization by reading historical logs. Distinguish genuine Host cache absence from incorrectly seeded fixtures. An upstream Host change requires its own reviewed integration and native validation.

The five rc.3 blocked cases and MP02 remain open. No stable release or promotion to `main` is authorized.
