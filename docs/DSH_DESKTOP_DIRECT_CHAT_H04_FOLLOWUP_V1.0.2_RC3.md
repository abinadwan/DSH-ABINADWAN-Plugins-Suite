# H04 follow-up — Direct Chat title search (v1.0.2-rc.3)

**Status: native H04 retest failed at 10,000 Sessions. The source mitigation passed its notice and ID-search checks.** This note supplements the unchanged [rc.3 acceptance report](DSH_DESKTOP_DIRECT_CHAT_ACCEPTANCE_V1.0.2_RC3.md).

## Observed failure and scope

The archived Windows Desktop test used 10,000 registered Sessions (two retained native controls, 9,998 synthetic log-backed entries). The native authorized Session list had missing `title` metadata and a generic `Direct Chat` display label for some saved conversations. Full Session ID search worked. Opening a tail Session caused the Host summary to gain its title. The original H04 result is **Fail** until the full pre-open title-search case passes on an installed Desktop.

The upstream Session Controller describes `SessionSummary.title` as absent until the Host projects a title; `displayTitle` is a fallback label, not proof of a durable stored title. The Host's cold list uses cached summary projections when available. A title contained only in an unopened log may not be visible through the current authorized list.

## Narrow source change

- In `conversationInventory`, take a missing search title from the **already authorized** `sessions.projectionsBySession[id].values.title` or `sessions.byId[id].projectionValues.title` if present. Prioritize the current authoritative `row.title` and never replace it with stale projection data.
- Use this available title for the Direct Chat history search, display and rename input; still restrict entries to admitted Session IDs with unique Workspace membership.
- When title metadata remains absent and a search is entered, tell the user that title matches may be incomplete and that Session ID search remains available.
- Add regression coverage for authorized projected-title search, Unicode, incomplete-metadata notice, stale-title priority and exclusion of foreign Workspace projections.

This change does **not** read message transcripts or headers, issue per-Session network requests, introduce a background index, change Host permissions, or claim to recover titles the Host never supplied. At 10,000 Sessions with neither row title nor authorized title projection, full pre-open title search can still miss those Sessions.

## Original native retest plan

On installed Windows DSH Desktop `0.2.2-rc.5`, pin the **new PR head SHA** and verify code/package parity. Recreate 100/1,000/10,000 fictional Session inventories in a disposable Profile. Before opening the known saved tail Session, inspect the authorized list's `title`, `displayTitle`, `projectionValues.title`, and `projectionsBySession[id].values.title` **as presence/type/boolean flags, not content**, then search by exact title and full ID. Repeat after cold restart, and check the title-incomplete notice. Measure opening, search, page and renderer heap. Retest Unicode, Arabic, renamed and archived cases; verify unrelated Workspace titles never appear.

If the Host supplies the cached projection and the title works, record H04 Pass against the exact candidate SHA. If the Host supplies neither value, keep H04 Fail: investigate the upstream Session Controller / projection cache and the synthetic seeder; do not bypass authorization by reading historical logs. Distinguish genuine Host cache absence from incorrectly seeded fixtures. An upstream Host change requires its own reviewed integration and native validation.

The five rc.3 blocked cases and MP02 remain open. No stable release or promotion to `main` is authorized.

## Windows native retest — 23 November 2026

**H04 result: Fail. Recommendation: NOT READY.** Before opening any target Session, both 10,000-Session runs missed three stored-title controls. The incomplete-title notice, ID search and Workspace exclusion behaved as intended. The [original rc.3 acceptance report](DSH_DESKTOP_DIRECT_CHAT_ACCEPTANCE_V1.0.2_RC3.md) remains the historical baseline.

### Candidate and installation

- Tested exact branch head `c1d6f105e962c9eb2718ebd1bdac9d14fc74aad4` using package 1.0.2-rc.3. Installed the locally built tarball through the native DSH CLI in the existing disposable Desktop Profile with isolated Electron data.
- Windows Professional x64 26H2 build 26300.10075. Installed Desktop and embedded Host 0.2.2-rc.5, packaged build `3f85d888b1297107937d9bd5b853f7e733e179a4`. The mounted history component exposed the new notice and rendered it during the 10,000-Session test.
- Tarball SHA-256 `008d3fdd97fbdfe1be12061881e6df35a56440c7139f899cbd4f2699b18186bd`. The installed manifest, browser client, Direct Chat entry point, catalog and Workspace path module matched the candidate SHA-256 hashes. The browser carrier hash was `c127dfd75e3b509dfcd372469057ec5515c186da43a9461626258b36ec86bab2`.
- The normal Profile and the previous acceptance evidence were preserved. The published stable release remains v1.0.0.

### Before-opening checks

The runs registered exactly 100, 1,000 and 10,000 nonblank Direct Chat Sessions using the previous native-format fictional controls and their checkpoint files. These totals include the two completed native controls and 98, 998 or 9,998 seeded records. A separate fictional Workspace remained in the authorized list as an exclusion control. The browser was left in Arabic for all six runs. Each inventory was tested on its initial boot and again after terminating and relaunching the isolated Desktop. No target Session was opened as part of any measured run.

Each run checked pagination, known saved-title search, full-ID search, Arabic search, composed and decomposed Unicode, the persisted rename and absence of its old title, archived and protected behavior, absence of fabricated matches, the notice condition, and unrelated-Workspace exclusion by title and full ID.

| Direct Chat Sessions | Eligible with title / total, each boot | Known saved titles before opening | Other outcomes |
| ---: | ---: | --- | --- |
| 100 | 100 / 100 | Pass on both boots. Both retained native controls and the synthetic tail appeared. | All ten checks passed per boot. The notice stayed hidden. |
| 1,000 | 1,000 / 1,000 | Pass on both boots. Both retained native controls and the synthetic tail appeared. | All ten checks passed per boot. The notice stayed hidden. |
| 10,000 | 8,185 / 10,000 | Fail on both boots. Both retained native controls and the synthetic tail had saved titles but only the generic display label in the authorized catalog. | Nine of ten checks passed per boot. Full ID found all three rows. The notice appeared on searches, including the zero-result title queries. |

**Native totals: 58 Pass, 2 Fail, 0 Blocked, 0 Skipped across 60 retest checks.** The two failures are the same H04 case observed on separate boots. The five earlier blocked cases and MP02 remain open outside these counts.

Before the first search, the probe recorded only presence and nonblank-string validity for each title field. At 100 and 1,000 all eight sampled targets had all four fields present and valid on both boots. At 10,000 the affected controls had the following shape on both boots. The five other sampled targets remained title-complete. None of the six runs returned a row with a valid projection title and an absent row title. The projection-only fallback and precedence of the current title were exercised in source and component tests.

| 10,000-Session affected targets | row.title | row.displayTitle | row.projectionValues.title | sessions.projectionsBySession[id].values.title |
| --- | --- | --- | --- | --- |
| Two retained native controls and the synthetic tail | Absent | Present and valid string, generic fallback | Absent | Absent |

### Root cause

The affected rows were present in the access-checked Session list and matched by exact ID. Title data was absent from the row and both projection sources before the plugin filtered them. The valid checkpoints and same native controls at smaller sizes show that the missing titles cannot be explained by malformed synthetic logs alone. The installed Session Controller uses identity-checked cached projections for cold rows. Its Windows per-record JSON backend opens the checkpoint files concurrently during startup, and its read helper treats read errors as absent records.

A separate diagnostic using bundled Node 24.21.0 reproduced EMFILE when reading 10,002 fictional checkpoint files in one Promise.all. It read 8,189 valid titles and encountered 1,813 open-file failures. Reading the same files in batches of 64 found all 10,001 expected nonblank titles and one blank control, with zero read errors. In a separate native control, the registry and all 10,000 Session files stayed intact. Temporarily holding 2,000 unrelated synthetic checkpoint files reduced startup file pressure. Desktop then exposed all 8,000 titles whose checkpoints remained, including the three originally failing controls, before any Session was opened. The 2,000 held checkpoints were restored after shutdown. This control isolates bulk checkpoint loading and does not qualify as the 10,000-Session acceptance run. The file-read diagnostic ran separately from the acceptance runs. The actual Desktop did not expose individual cache-read errors.

The suite keeps its existing patch, which uses title projections already present on authorized rows, prefers a current row title and warns about incomplete results. Workspace admission stays unchanged. The repository adds no runtime fix for the installed Host's cache loading. Complete pre-open search remains an upstream dependency.

### Native performance compared with the original rc.3 run

Each cell is original → retest. Open measures click to 25 rows. Next measures click to the second page. Title and ID are queries for a single available early synthetic row. Heap values are renderer JS heap used after the interaction sequence. The retest used Arabic and more searches, and each condition has one observation per boot. Differences are descriptive and do not establish performance improvement or a memory regression.

| Sessions | Boot | Open, ms | Next, ms | Title, ms | Full ID, ms | Heap used, MiB |
| ---: | --- | ---: | ---: | ---: | ---: | ---: |
| 100 | Initial | 133.6 → 41.6 | 24.3 → 21.0 | 1.7 → 1.1 | 1.0 → 0.3 | 31.5 → 32.5 |
| 100 | Cold restart | 26.8 → 27.2 | 22.0 → 21.6 | 1.6 → 0.9 | 1.1 → 0.4 | 32.7 → 31.4 |
| 1,000 | Initial | 26.0 → 42.0 | 20.4 → 21.9 | 2.2 → 1.6 | 1.5 → 0.9 | 36.6 → 39.1 |
| 1,000 | Cold restart | 28.9 → 28.7 | 21.6 → 21.9 | 2.3 → 1.6 | 1.5 → 0.9 | 36.6 → 39.2 |
| 10,000 | Initial | 1,269.8 → 1,137.6 | 153.9 → 136.6 | 4.2 → 3.9 | 3.3 → 3.0 | 47.5 → 70.2 |
| 10,000 | Cold restart | 1,153.2 → 1,282.3 | 145.6 → 134.1 | 4.3 → 4.0 | 3.4 → 3.3 | 47.5 → 75.7 |

### Automated verification

| Command or suite | Pass | Fail | Skip |
| --- | ---: | ---: | ---: |
| npm ci --ignore-scripts | 82 locked dependencies installed | 0 | 0 |
| npm test | 260 | 0 | 1 |
| npm run check:regression | 4 | 0 | 0 |
| npm run check:package | 259 | 0 | 2 |
| CI-pinned rc.3 Host integration under Node 24.21.0 | 25 | 0 | 0 |
| Direct Chat standalone catalog and metadata scale checks | 5 | 0 | 0 |

The regression classifier scored 56/57 with zero two-tier misses. Published package validation checked 94 packed files. The Windows run skipped the POSIX permission test, and the packed run additionally skipped the source-only documentation test. The separately invoked scale checks re-run a subset of npm test. Source and component tests use synthetic summaries or a browser harness. The pinned Host fixture exercises supported services with synthetic data. The six native Desktop runs provide the installed-runtime evidence.

### Local evidence and remaining scope

Local evidence includes installed-parity.json, inventory-100.json, inventory-1000.json, inventory-10000.json, the six history result JSON files and corresponding PNGs, the cold-boot summaries, checkpoint-read-reproduction.json, the cache-control result and restoration summaries and the npm and pinned Host summaries. The captured title metadata is field presence and validity, with no Session title values or transcript contents in the summaries. Screenshots and traces remain local.

The 10,000-Session H04 failure remains open. The original native rename-refusal retry, Host timeout, 409 CHANGED, Host warning-log redaction, non-owner Peer isolation and Task 1 MP02 wire confirmation remain outstanding. PR #51 stays in Draft.
