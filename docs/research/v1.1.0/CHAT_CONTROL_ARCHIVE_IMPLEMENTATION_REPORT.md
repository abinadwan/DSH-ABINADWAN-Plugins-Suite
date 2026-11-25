# Chat Control archive management implementation

This report covers the v1.1.0 development candidate on `feature/chat-control-archive-management-v1.1.0`. [Issue #71](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/issues/71) · [Draft PR #72](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/pull/72)

| Phase | Candidate implementation |
|---|---|
| 03 | Verified the published DSH rc.3 contracts and reviewed rc.5 upstream source. [Native API research](CHAT_CONTROL_NATIVE_API_RESEARCH.md) |
| 04 | Default archive hiding in the Chat Control list. Native Settings persists the preference per Profile. The native sidebar owns its own View options. |
| 05 | A dedicated native dialog opens from Chat Control Settings. It reads authorized Workspace and Session catalog metadata, updates live and handles disconnected, insufficient-access, loading, unavailable, error, empty and no-match states. |
| 06 | Metadata search, Workspace, protection, pin and last-update filters, and four sort options. The hub uses native responses tied to the current connection generation. Restore verifies current catalog identity, then rereads Settings and Session-scoped access before calling DSH. |
| 07 | Windows synthetic Host and isolated Desktop acceptance. See the evidence below. |

## Verification

The local clone started at `66987c80cd80d62e9868e8a6d4cc48211c1bdbfa`. The unmodified suite and packed-artifact checks passed outside the Windows sandbox. An initial sandboxed run could not create the existing Direct Chat junction fixture (`EPERM`). No workflow coverage was disabled. The regression script and the four native Host check files in `.github/workflows/test.yml` run with the workflow's pinned `0.2.2-rc.3` Harness packages.

| Check | Windows / Node.js 24.21.0 result |
|---|---|
| `npm ci --ignore-scripts` | Succeeded |
| Focused Settings and documentation tests | 46 passed, 0 failed |
| `npm test` | 283 passed, 1 conditional skip, 0 failed |
| `npm run check:package` | 282 passed, 2 packed-artifact skips, 0 failed. The published-file manifest covered 97 files. |
| `npm run check:regression` | 4 suite checks passed. The 57-case Adaptive Reasoning benchmark retained 98.2% accuracy. |
| Pinned Harness Host Integration | 25 passed, including native Profile Settings default, revision conflict and persistence. |
| `git diff --check` | Succeeded |

Regression tests verify that an overlapping Session ID cannot re-admit an old Host's title, that background refresh preserves search focus, and that a protection save during catalog verification blocks restore even before the document event arrives. The concurrency regression failed before the ordering fix and passed after it. Native reads are coalesced while the Settings section is open.

## Isolated Windows Desktop

The installed Electron Desktop ran `0.2.2-rc.5` with an isolated Harness Home and Electron user-data directory. The packaged suite was loaded from its disposable Desktop Profile. An explicitly chosen synthetic Workspace used a loopback provider. Desktop rendered the archive hub, excluded the archived row from the regular list, found the row by Workspace name, showed a no-match result, and selected a Workspace using `Tab` and `End`. Pressing `Enter` on confirmation restored the conversation to the native sidebar and changed the hub count from one to zero. The loopback recorded the synthetic turn.

Reopening the restored row displayed the original synthetic prompt and reply. After re-archiving the row, restarting Desktop preserved the saved visibility preference. Re-enabling hiding removed the row from the regular list immediately. The hub rendered in English with dark theme and in Arabic with right-to-left controls and light theme. `Escape` closed the native archive dialog. Disabling and enabling Chat Control preserved the other components' activation states.

The final candidate's installed browser entry matched SHA-256 `446a475ea493c4232209c29e9401d8ea04c6310423e7987a81bc20c89e515658`. After restart it showed the first fixture's protected archived row and disabled restore. Removing protection and pressing `Enter` to confirm triggered the native restore, decremented the archive count to zero, and returned the row to the sidebar. Reopening the row verified the original synthetic prompt and response.

After re-archiving the synthetic row in the first home, the same candidate loaded in a second isolated DSH Home and Electron user-data directory. Its archive displayed zero rows. The automated overlapping-ID regression exercises the in-place connection-generation change.

See the draft PR for GitHub Actions run links and matrix results.

## Remaining limits and integration dependency

- Archive rows need a unique Workspace membership and an admitted Session summary. The hub omits orphaned, ambiguous, blank, subagent and legacy Direct Chat rows. It uses the catalog's last update date where available. The catalog carries neither a creation timestamp on the Session list nor an archive timestamp.
- DSH's public restore endpoint takes only a Session ID. The plugin validates its own rules before dispatch. The Host enforces native authorization and treats an already-restored Session as a no-op. The endpoint cannot make plugin protection and Workspace validation atomic with a concurrent external change.
- The `v1.0.3` My Profile hotfix (`452dbf68c2ea1f3b125de58a25596054a36812f2`) is absent from `develop`. It requires a separately reviewed integration PR.
- Historical [Issue #67](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/issues/67), [draft PR #68](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/pull/68) and the [five-phase research revision](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/tree/6bc6bc6c006f4449cf2fa52dbc89df809addade1) remain available on the original branch. Retention previews remain read-only.
