# Phase 6E — Windows Desktop acceptance for 0.7.2

## Recorded history

| Version | Step | Result |
|---|---|---|
| 0.7.0 | Installation | PASS |
| 0.7.0 | Harness restart | PASS |
| 0.7.0 | Personal Profile sidebar registration | PASS |
| 0.7.0 | Personal Profile page rendering | **FAIL**: content area completely blank |
| 0.7.1 | Owner Desktop review | Led to the owner-approved 0.7.2 redesign (unified profile, complete backup). Per-row results were not committed to this repository. |

0.7.0 cause: the page passed the Host's `ctx.workspaces.list.subscribe`/`getSnapshot` class methods to `useSyncExternalStore` without their receiver, so the first render threw and the Host retired the `main` Slot entry (DevTools: `slot entry crashed in 'main': TypeError: Cannot read properties of undefined (reading 'refreshSnapshot')`). Fixed in 0.7.1; in 0.7.2 the profile no longer uses the Workspace service at all. That message must not appear.

**Status for 0.7.2: NOT TESTED — real Windows Desktop required.** Automated QA ran in a Linux container and GitHub Actions. CI Windows runners are not Harness Desktop; they prove nothing about Desktop persistence, rendering, downloads, clipboard or permissions. Every scenario below is **NOT TESTED** until the owner runs it on a real device.

The 0.7.1 matrix (Workspace selector, per-Workspace overrides, grant-less export, merge restore) is **superseded** by the matrix below and kept in Git history. The Phase 6A plan for the encrypted design is also superseded.

## Rules

- Use **fictional data only** (for example preferred name `Test User`, nationality `Testland`). Never real personal information.
- Get the owner's approval before changing an existing real installation. Prefer a separate Windows account or a disposable Harness Profile.
- Record only PASS / FAIL / BLOCKED / NOT TESTED, versions, SHAs and sanitized error codes. Do not post the contents of `cordis.patch.yml`, paths with account names, or screenshots with account details.
- Do not merge the 0.7.2 PR, tag or publish a release during acceptance.

## 0. Prepare (PowerShell)

Set the Profile name Harness Desktop actually runs (usually `desktop`) and the exact 0.7.2 candidate SHA (the head of the 0.7.2 PR).

```powershell
$DshProfile = 'desktop'
$Candidate = 'CANDIDATE_SHA'   # full 40-character SHA of the tested 0.7.2 PR head
$DshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE '.dsh' }
$ProfileDir = Join-Path $DshHome "profiles\$DshProfile"
$Backup = Join-Path $env:USERPROFILE ("dsh-acceptance-backup-" + (Get-Date -Format 'yyyyMMdd-HHmmss'))
```

Close Harness Desktop completely (also from the tray), then back up the Profile configuration:

```powershell
New-Item -ItemType Directory -Path $Backup | Out-Null
Copy-Item (Join-Path $ProfileDir 'cordis.patch.yml') $Backup -ErrorAction SilentlyContinue
Copy-Item (Join-Path $ProfileDir 'package.json') $Backup
Get-ChildItem $Backup
```

Record the installed suite spec (the known-good SHA for rollback) without sharing the file:

```powershell
(Get-Content (Join-Path $ProfileDir 'package.json') -Raw | ConvertFrom-Json).dependencies.'@abinadwan/dsh-plugins-suite'
```

Record the Harness version from **Help → About** (expected `0.2.2-rc.3`) and confirm the active Profile:

```powershell
dsh --profile $DshProfile --dump-config | Select-String 'abinadwan'
```

## 1. Baseline (before installing 0.7.2)

With the existing installation (preferably the 0.7.1 candidate): Components list shows Environment & Context, Humanizer, Personal Profile; Environment tab works in a conversation; Humanizer can be invoked; **Suite updates** shows Host and browser module matching that version. **To test migration**, on 0.7.1 enable Personal Profile and save fictional values: preferred name `Test User`, nationality `Testland`, a global personality and custom instruction `Fictional global rule`, one Workspace override with custom text `Fictional workspace rule`, and one Workspace policy set to Ask First. Then back up again (§0). Record PASS/FAIL.

## 2. Install the candidate

Upgrade in place:

```powershell
dsh plugin --profile $DshProfile add "github:abinadwan/DSH-ABINADWAN-Plugins-Suite#$Candidate"
dsh --profile $DshProfile --dump-config | Select-String 'abinadwan'
```

If `add` refuses because the package is already installed, record the message, then:

```powershell
dsh plugin --profile $DshProfile remove @abinadwan/dsh-plugins-suite
dsh plugin --profile $DshProfile add "github:abinadwan/DSH-ABINADWAN-Plugins-Suite#$Candidate"
```

Start Harness Desktop. **Suite updates** must show Host **and** browser module `v0.7.2`, and no version-mismatch warning.

For a **clean installation**, repeat in a disposable Profile or Windows account that never had the suite.

## 3. Rollback (test it once)

Close Harness completely, then reinstall the known-good SHA and restore the backed-up configuration:

```powershell
dsh plugin --profile $DshProfile add "github:abinadwan/DSH-ABINADWAN-Plugins-Suite#KNOWN_GOOD_SHA"
Copy-Item (Join-Path $Backup 'cordis.patch.yml') $ProfileDir -Force
Copy-Item (Join-Path $Backup 'package.json') $ProfileDir -Force
dsh --profile $DshProfile --dump-config | Select-String 'abinadwan'
```

Start Harness and confirm the baseline again. Restoring `cordis.patch.yml` also removes any Personal Profile settings saved during acceptance. **After a v2 Save, 0.7.1 shows "unavailable" for Personal Profile until `cordis.patch.yml` is restored**; that is expected (0.7.1 cannot read the unified record).

## 4. Inspect stored settings (locally only)

After a Save, confirm the record contains only approved fields and no secrets. Do not paste the output anywhere.

```powershell
Select-String -Path (Join-Path $ProfileDir 'cordis.patch.yml') -Pattern 'abinadwan-personal-profile' -Context 0,40
```

Expected after a 0.7.2 Save: one `abinadwan-personal-profile` row whose `config.record` holds `version: 2`, `locale`, `information` (`preferredName`, `nationality`, `gender`), `preferences`, `policies`, `allowPersonalInformation`, `allowCloud`, and **no** `global` or `workspaces`. Before migrating, the 0.7.1 record (`version: 1`, `global`, `workspaces`) must still be there unchanged. No full name, date of birth, password, key or encrypted blob.

## 5. Acceptance matrix

| Area | Scenario | Expected | Result |
|---|---|---|---|
| Install | Clean installation | Three Components; Personal Profile Off | NOT TESTED |
| Install | Upgrade from 0.7.1 (and from v0.6.3 if available) | Same toggles as before; one Personal Profile row; no config error | NOT TESTED |
| Render | Enable Personal Profile, open it | Title, tabs and a status line; **no Workspace selector**; never a blank area | NOT TESTED |
| Render | Restart with Personal Profile On, open it | Page renders; no `slot entry crashed in 'main'` in DevTools | NOT TESTED |
| Render | Switch Workspaces / sessions while the page is open | Page unchanged; no crash | NOT TESTED |
| Migration | Open after upgrading with the §1 fictional 0.7.1 data | "Migrate settings from 0.7.1" panel; name, nationality, locale, global personality and `Fictional global rule` shown; Workspace table lists the override and the Ask First policy; Save disabled | NOT TESTED |
| Migration | §4 before Save | Stored record still `version: 1` and unchanged | NOT TESTED |
| Migration | Download / Copy / View 0.7.1 JSON | File `personal-profile-v0.7.1-settings.json` saved; copied and viewed JSON contain the Workspace row and policy | NOT TESTED |
| Migration | Tick the confirmation, Save, restart | "Save confirmed by Harness"; §4 shows `version: 2`, no `workspaces`; all policies Private, both switches Off; global values kept | NOT TESTED |
| Unified | Edit personality, language, characteristics, presets, custom text; Save; restart | Values persist; effective preview updates; counter shows characters | NOT TESTED |
| Unified | Access: set each field policy and both switches; Save; restart | Values persist; text says not enforced until Phase 7 | NOT TESTED |
| Export | Download JSON file | Windows save/download of `personal-profile-backup.json`; content includes the policies and switches as set | NOT TESTED |
| Export | Copy JSON, paste into Notepad | Same JSON | NOT TESTED |
| Export | View JSON in Arabic and English UI | Left-to-right, monospace, readable in light and dark | NOT TESTED |
| Import | Import JSON file → Review | Preview table current → after; permission option unchecked | NOT TESTED |
| Import | Paste JSON → Review | Same as file | NOT TESTED |
| Restore | Replace All → confirm → Apply | "Applied to the draft only"; nothing saved until Save; after Save values replaced, permissions Private/Off | NOT TESTED |
| Restore | Replace All and Merge Custom Instructions | Existing text kept, new paragraphs appended, duplicates skipped, preview editable; > 8192 characters blocks Apply without truncating | NOT TESTED |
| Restore | Restore permissions option | Exact list shown; second acknowledgment required; after Save exact values restored; agent still has no access | NOT TESTED |
| Restore | Invalid file (e.g. a text file), invalid policy, 0.7.1 backup | Specific error for invalid ones; 0.7.1 backup restores global settings and lists Workspace entries as not restored | NOT TESTED |
| Restore | Cancel restore / edit text after review | Review closed; draft unchanged | NOT TESTED |
| Persistence | Edit, then Reload → **Keep editing** / **Discard changes and reload** | Confirmation (Arabic and English); keep preserves the whole draft; discard shows stored values | NOT TESTED |
| Persistence | Two windows: save in A, then save in B | B shows the conflict message; A's value kept | NOT TESTED |
| Persistence | Edit, restart the Host while the window stays open (where possible) | Draft kept; "Connection was reset"; Save revision-checked | NOT TESTED |
| Permissions | Settings access denied or read-only | Unavailable/disabled; nothing saved | NOT TESTED |
| Isolation | Separate Harness Profile | Shows none of these values | NOT TESTED |
| Visual | Windows light and dark theme | All text, native dropdowns, radios, file input and tables readable | NOT TESTED |
| Visual | Arabic RTL and English LTR | Correct direction and labels; JSON stays LTR | NOT TESTED |
| Privacy | Defaults on a clean install | All policies Private; both switches Off | NOT TESTED |
| Privacy | UI wording | No encryption claim; backup warns it is not encrypted | NOT TESTED |
| Privacy | Ask the agent "what is my preferred name?" | Agent has no access to the profile | NOT TESTED |
| Lifecycle | Toggle each Component on/off three times; official bundle disable/enable; full restart | Each appears/disappears once; others unaffected; no duplicates | NOT TESTED |
| Lifecycle | Rollback procedure (§3) | Baseline restored | NOT TESTED |
| Existing | Environment & Context | Tab, context/output tokens, session switching, Workspace display | NOT TESTED |
| Existing | Humanizer | Skill registered when on, removed when off; presets never invoke it | NOT TESTED |
| Existing | Update checker | Shows v0.7.2 for Host and browser; check runs; no install without confirmation | NOT TESTED |

Return the filled matrix (results and versions only) on the 0.7.2 PR.
