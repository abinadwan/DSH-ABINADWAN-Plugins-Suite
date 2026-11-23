# DSH Desktop Direct Chat acceptance — v1.0.2-rc.3

**2026-11-23, Asia/Riyadh. Direct Chat acceptance remains incomplete.** Pagination, ID search and the bounded creation-order fallback worked on the installed Desktop at all three inventory sizes. Title search missed known saved titles in the 10,000-session inventory. Separate Host-side error and non-owner Peer cases remain blocked.

## Candidate and environment

| Item | Recorded value |
| --- | --- |
| Base | develop at `bc99d1861cea005a6d62fd281204a1cdc046e4e3`. Includes [Task 1, PR #50](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/pull/50). |
| Branch and native source pin | `fix/direct-chat-performance-v1.0.2-rc.3` at `24abdd8a6e3d2c95254fd2571abe05cd0abe9c83`, package 1.0.2-rc.3. The later acceptance commit adds tests and this report. |
| Desktop and Host | Installed x64 DSH Desktop and embedded Host 0.2.2-rc.5. The supported offline integration fixture used Host 0.2.2-rc.3. |
| Windows | Windows Professional x64 26H2, build 26300.10075. |
| Package | Local tarball SHA-256 `58c01dcac50c872f4126e4650a8cc2d9d9db5349fd3cad5ee1c3f889326ee4dc`. The installed manifest, browser carrier and Direct Chat catalog hashes matched the pinned source. |
| Isolation | Dedicated DSH home and Electron data, one local owner, two fictional completed Direct Chat Sessions, one unrelated fictional Workspace control and a loopback provider. The normal DSH Profile and earlier evidence were preserved. |

The [Desktop checklist](DSH_DESKTOP_FINAL_ACCEPTANCE_V1.0.1.md), [v1.0.1 acceptance report](DSH_DESKTOP_ACCEPTANCE_REPORT_V1.0.1.md), [rc.1 remediation handoff](DSH_DESKTOP_REMEDIATION_V1.0.2.md) and [rc.2 security acceptance report](DSH_DESKTOP_SECURITY_ACCEPTANCE_V1.0.2_RC2.md) supply the baseline and open security cases.

## Native history and measurements

The Direct Chat inventories contained exactly 100, 1,000 and 10,000 registered Sessions. Each retained the two completed native controls. The remaining 98, 998 and 9,998 records were synthetic. With Desktop stopped, the seeder copied the native v4 compressed log framing and projection format, supplied unique fictional IDs and titles, and registered the records in the same dedicated Workspace. Trial files that failed format or readiness checks were excluded. Data sizes exclude the unrelated control and any temporary draft.

Open **Direct Chat history**, wait for 25 rows and the exact page count, select **Next** then **Previous**, and search for a title, a full Session ID, composed uppercase CAFÉ against a decomposed title, Arabic مثال عربي and an unmatched query. Compare **Last activity** and **Creation time** using opposite timestamp ordering in the seeded records. Repeat on a cold start before changing flags or renaming. The UI showed 4, 40 and 400 pages. The 100-session inventory returned all 100 creation timestamps and visibly changed the order. At 1,000 and 10,000 it returned no timestamps, stated the 100-Session bound and continued in last-activity order.

| Sessions | Run | Open to 25 rows, ms | Next page, ms | Searches, ms¹ | Creation selection / route, ms | Renderer JS heap used / allocated, MiB |
| ---: | --- | ---: | ---: | --- | --- | --- |
| 100 | Initial | 133.6 | 24.3 | 1.7 / 1.0 / 0.9 / 1.2 | 45.2 / 36.6 | 31.5 / 50.6 |
| 100 | Cold restart | 26.8 | 22.0 | 1.6 / 1.1 / 0.8 / 1.2 | 44.8 / 40.9 | 32.7 / 48.6 |
| 1,000 | Initial | 26.0 | 20.4 | 2.2 / 1.5 / 1.2 / 1.7 | 22.2 / 3.3 | 36.6 / 64.9 |
| 1,000 | Cold restart | 28.9 | 21.6 | 2.3 / 1.5 / 1.4 / 1.8 | 21.3 / 3.8 | 36.6 / 64.9 |
| 10,000 | Initial | 1,269.8 | 153.9 | 4.2 / 3.3 / 2.9 / 3.5 | 22.3 / 5.2 | 47.5 / 125.2 |
| 10,000 | Cold restart | 1,153.2 | 145.6 | 4.3 / 3.4 / 3.1 / 3.4 | 21.2 / 4.4 | 47.5 / 126.2 |

¹ Title / full ID / Unicode / Arabic, using rows whose title metadata was already available. Renderer timings run from input to the observed UI result and include polling time. The separate route probe times the installed Host response through the renderer bridge. Heap values are snapshots after each interaction sequence. Process working set, peak memory and repeated-run percentiles were unavailable. No performance threshold was applied.

The standalone catalog scale test measured 16.86, 2.23 and 1.82 ms for discovery plus creation lookup and parsing, with 100, 0 and 0 persistence metadata reads. It uses synthetic in-process services and measures no Desktop rendering, native catalog warm-up or Host transport.

## Case results

| Case | Result | Reproduction and observation |
| --- | --- | --- |
| H01 — 100 registered | Pass | Pagination, the four search controls, empty search, recent order and all 100 creation timestamps worked before and after restart. |
| H02 — 1,000 registered | Pass | The same controls passed, with explicit creation fallback before and after restart. |
| H03 — 10,000 registered | Pass | Pagination, the four warm-metadata search controls and recent order passed on both boots. The creation fallback remained explicit. See H04 for title coverage. |
| H04 — Full title search at 10,000 | Fail | Both retained completed native Sessions and one verified tail Session had persisted titles. The authorized session list supplied a generic “Direct Chat” label without a title for those entries. The two native controls appeared with generic labels on both boots. Searching the saved titles failed after renderer reload. Full-ID search found each native control and the tail Session. Opening the tail result caused its title to appear and the same title search then found it. |
| F01 — Permanent Workspace and draft reuse | Pass | Start Direct Chat twice before completing a turn. The existing draft stayed selected and the fixture retained a single dedicated Workspace. |
| F02 — Distinct completed native Sessions | Pass | Inspect the two retained records after completing fictional conversations. Two distinct IDs each had a persisted user message, assistant message and turn completion. |
| F03 — Reopen a conversation | Pass | Open a prior row from history. The dialog closed and the native editor returned. The tail-ID follow-up also opened the registered Session. |
| F04 — Rename success | Pass | Rename one seeded Session. Blank input disabled Save. The valid title saved, became searchable and reopened the same Session. |
| F05 — Native rename refusal and retry | Blocked | A supported native Host fault for rename was unavailable. The component test returns a failed save once, verifies the old row and retained edit with an error, and then verifies successful retry. |
| F06 — Protected and archived flags | Pass | Protect a fictional Session in Chat Control, and set one different fictional archived flag in the stopped disposable fixture. After restart, the Arabic history showed both flags. The protected row had no Rename action and opening the archived row was disabled. |
| F07 — Keyboard and RTL | Pass | Switch the disposable Desktop to Arabic. Search found the mixed-direction title in an RTL dialog. Tab moved from search to sort to the result, Enter opened it, and Escape closed history and restored focus to its trigger. |
| F08 — Unrelated Workspace isolation | Pass | The unrelated fictional conversation completed in its own Workspace. It was absent from Direct Chat search, and its Workspace and Session persisted after the run. |
| F09 — Native non-owner metadata isolation | Blocked | Task 1 still lacks an authenticated secondary Peer and configured LiveShare relay. The pinned Host test verifies exact-route authorization with a fixture Peer. |
| R01 — Catalog cancellation | Pass | Cancel a request from the native renderer and observe AbortError. Closing the history dialog aborted its pending signal. A fresh lookup recovered. The immediate follow-up after the raw abort could still return Busy. Host-side cleanup on client abort was separately exercised in the standalone fixture. |
| R02 — Renderer timeout and retry | Pass | Hold a catalog response in the disposable renderer until the actual UI deadline fires. It reported TimeoutError at about 10,063 ms, showed only the unavailable alert with Retry and zero rows, then restored 25 rows with live transport. |
| R03 — Installed Host-side timeout | Blocked | A supported way to delay the native metadata reader was unavailable. The standalone fixture exercised the approximately 2-second metadata deadline and got a successful route response with unavailable creation metadata. |
| R04 — Reconnect | Pass | Reload the installed Desktop renderer, open History and confirm the native catalog returns 200 and the history rows return. Cold-start recovery also passed. |
| R05 — 409 BUSY | Pass | Send six concurrent creation-order lookups at 100 Sessions. The actual installed Host returned five code-only 409 responses and one 200, all no-store. A subsequent lookup returned 200. |
| R06 — Installed Host 409 CHANGED | Blocked | A deterministic way to mutate native registration during the installed metadata scan was unavailable. The standalone fixture produced code-only 409 CHANGED. A delayed synthetic CHANGED response also exercised renderer stale-result handling. |
| R07 — Unavailable history | Pass | Inject an unavailable response in the native renderer. It showed the unavailable alert and Retry with no rows or false success. Retry over the real route showed the results. |
| R08 — Empty history and no matches | Pass | Open history before any Direct Chat is saved and verify its empty message. Search with a nonexistent title in a populated inventory and verify the separate no-matches message. |
| R09 — Stale responses | Pass | Start one catalog lookup, change sort and observe cancellation. The current route repopulated the list. Releasing the older synthetic error afterward left the current list intact. |
| R10 — Neutral responses | Pass | Native Busy responses carried only a code and no-store. The tested renderer error paths showed generic errors without Session metadata. |
| R11 — Installed Host warning logs | Blocked | No matching native warning was captured for a redaction verdict. Standalone error bodies and UI copy cover different surfaces. |

**24 result rows. 18 Pass, 1 Fail, 5 Blocked, 0 Not tested.** Native renderer fault injection and offline Host fixtures are identified separately in the case descriptions. Native non-owner behavior and MP02 historical provider-wire confirmation retain their Task 1 status.

## Finding and changes

**H04 is open.** On rc.5, the installed session controller builds the list display title from the native summary. The affected entries arrived without a title, and their display title was derived from the Workspace name. The suite's history filter uses that access-checked list. It picked up the stored title after the Host populated the summary on opening the tail Session. The reason the Host omitted those titles from its initial summary was unverified. Complete pre-open title search still needs a supported source of complete, access-checked title metadata. Full ID search is available in the meantime.

The branch updates rc.3 version metadata and adds regression coverage for a Host rename refusal and retry and for a title becoming searchable when the authorized snapshot receives it. This acceptance work includes no Direct Chat runtime behavior fix. The tested product artifact remains the one identified above.

## Automated verification

| Check | Result |
| --- | --- |
| npm ci --ignore-scripts | Pass, 82 locked dependencies installed. A repeat from the local cache also passed. |
| npm test | Pass, 258 passed and one POSIX-only skip. The initial restricted run could not create a junction. The normal Windows rerun exercised it. |
| npm run check:regression | Pass, 4 tests. Classifier scored 56/57 with zero two-tier misses. |
| npm run check:package | Pass, 94 packed files, 257 tests passed and two expected skips for POSIX-only and source-only checks. |
| CI-pinned Host integration | Pass, 25 tests including the Direct Chat catalog integration. Loaded the same pins as CI under bundled Node 24.21.0. |
| Standalone catalog scale | Pass, one test covering all three inventory sizes and metadata read bounds. |

Native screenshots and result summaries are retained locally. Primary evidence includes native-scale-100-full.png, native-scale-100-restart.json, native-scale-1000.png, native-scale-1000-restart.json, native-scale-10000.png, native-scale-10000-restart.json, native-reconnect.json, native-session-metadata-debug.json, native-tail-title-recovery.png, native-history-operations.json, native-rtl-keyboard-checked.json, native-archive-protected.png and native-timeout-stale.json. Native traces, screenshots, application data and private paths were kept outside GitHub.

Direct Chat Desktop acceptance and release approval remain open.
