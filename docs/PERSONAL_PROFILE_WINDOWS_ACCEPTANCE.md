# Phase 6E — Windows Desktop acceptance for 0.7.1

## Recorded result on 0.7.0 (first Windows run)

| Step | Result |
|---|---|
| Installation | PASS |
| Harness restart | PASS |
| Personal Profile sidebar registration | PASS |
| Personal Profile page rendering | **FAIL**: content area completely blank |

Cause: the page passed the Host's `ctx.workspaces.list.subscribe`/`getSnapshot` class methods to `useSyncExternalStore` without their receiver, so the first render threw and the Host retired the `main` Slot entry. Fixed in 0.7.1 (see CHANGELOG). **Repeat this whole document on the 0.7.1 candidate SHA.** Based on the Host source, 0.7.0 is expected to log (in DevTools, if available) `slot entry crashed in 'main': TypeError: Cannot read properties of undefined (reading 'refreshSnapshot')`. On 0.7.1 that message must not appear.

**Status for 0.7.1: NOT TESTED — real Windows Desktop required.** Phase 6D QA ran in a Linux cloud container and GitHub Actions. CI Windows runners are not Harness Desktop; they prove nothing about Desktop persistence, rendering or permissions. Every scenario below is **NOT TESTED** until the owner runs it on a real device.

The previous Phase 6A plan for the encrypted design is superseded and kept in Git history.

## Rules

- Use **fictional data only** (for example preferred name `Test User`, nationality `Testland`). Never real personal information.
- Get the owner's approval before changing an existing real installation. Prefer a separate Windows account or a disposable Harness Profile.
- Record only PASS / FAIL / BLOCKED / NOT TESTED, versions, SHAs and sanitized error codes. Do not post the contents of `cordis.patch.yml`, paths with account names, or screenshots with account details.
- Do not merge the 0.7.1 PR, tag or publish a release during acceptance.

## 0. Prepare (PowerShell)

Set the Profile name Harness Desktop actually runs (usually `desktop`) and the exact 0.7.1 candidate SHA (the head of the 0.7.1 fix PR).

```powershell
$DshProfile = 'desktop'
$Candidate = 'CANDIDATE_SHA'   # full 40-character SHA of the tested 0.7.1 PR head
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

## 1. Baseline (before installing 0.7.1)

With the existing installation (v0.6.3, or the 0.7.0 candidate from the first run): Components list shows Environment & Context, Humanizer, Personal Profile; Personal Profile Off; Environment tab works in a conversation; Humanizer can be invoked; **Suite updates** shows Host and browser module matching that version. Record PASS/FAIL. On 0.7.0 the Personal Profile page is expected to be blank; that is the known bug, not a reason to stop.

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

Start Harness Desktop. **Suite updates** must show Host **and** browser module `v0.7.1`, and no version-mismatch warning.

For a **clean installation**, repeat in a disposable Profile or Windows account that never had the suite.

## 3. Rollback (test it once)

Close Harness completely, then reinstall the known-good SHA and restore the backed-up configuration:

```powershell
dsh plugin --profile $DshProfile add "github:abinadwan/DSH-ABINADWAN-Plugins-Suite#KNOWN_GOOD_SHA"
Copy-Item (Join-Path $Backup 'cordis.patch.yml') $ProfileDir -Force
Copy-Item (Join-Path $Backup 'package.json') $ProfileDir -Force
dsh --profile $DshProfile --dump-config | Select-String 'abinadwan'
```

Start Harness and confirm the v0.6.3 baseline again. Restoring `cordis.patch.yml` also removes any Personal Profile settings saved during acceptance.

## 4. Inspect stored settings (locally only)

After a Save, confirm the record contains only approved fields and no secrets. Do not paste the output anywhere.

```powershell
Select-String -Path (Join-Path $ProfileDir 'cordis.patch.yml') -Pattern 'abinadwan-personal-profile' -Context 0,40
```

Expected: one `abinadwan-personal-profile` row whose `config.record` holds `version`, `locale`, `information` (`preferredName`, `nationality`, `gender`), `global`, `workspaces`, `allowPersonalInformation`, `allowCloud`. No full name, date of birth, password, key or encrypted blob.

## 5. Acceptance matrix

| Area | Scenario | Expected | Result |
|---|---|---|---|
| Install | Clean installation | Three Components; Personal Profile Off | NOT TESTED |
| Install | Upgrade from v0.6.3 | Same toggles as before; one Personal Profile row; no config error | NOT TESTED |
| Render | Enable Personal Profile, select it in the left sidebar | Page shows the title, workspace selector, tabs and "Settings loaded." status; never a blank area | NOT TESTED |
| Render | Restart Harness with Personal Profile On, open it again | Page renders; no `slot entry crashed in 'main'` in DevTools | NOT TESTED |
| Install | Personal Profile Off by default | No left-sidebar entry, no page, no detail section | NOT TESTED |
| Lifecycle | Toggle each Component on/off three times | Each appears/disappears once; others unaffected; no duplicate tab, button or launcher | NOT TESTED |
| Lifecycle | Official bundle disable/enable | All three contributions removed/restored | NOT TESTED |
| Lifecycle | Disable only the suite Group manually | Environment and Humanizer off; Personal Profile keeps its own state (documented) | NOT TESTED |
| Lifecycle | Full application restart | Same state; no duplicates | NOT TESTED |
| Lifecycle | Rollback procedure | v0.6.3 baseline restored | NOT TESTED |
| Persistence | Save fictional values | "Save confirmed by Harness" | NOT TESTED |
| Persistence | Close/reopen page; full restart | Values persist | NOT TESTED |
| Persistence | Edit existing values; Save | Confirmed; new values persist | NOT TESTED |
| Persistence | Reset draft without saving | Draft cleared; stored values unchanged until Save | NOT TESTED |
| Persistence | Edit, then Reload → **Keep editing** | Confirmation shown (Arabic and English); whole draft kept | NOT TESTED |
| Persistence | Edit, then Reload → **Discard changes and reload** | Stored values shown; edits gone | NOT TESTED |
| Persistence | After a failed or conflicting save, Reload | Confirmation shown; cancel keeps draft and error | NOT TESTED |
| Persistence | Edit, then disconnect/reconnect (restart the Host while the window stays open, where possible) | Draft kept; "Connection was reset" message; Save is revision-checked | NOT TESTED |
| Isolation | More than 64 Workspaces with overrides (fictional) | All saved and restored after restart; no edits dropped | NOT TESTED |
| Isolation | Set a Workspace back to inherit with all Private | Its row disappears from `cordis.patch.yml` (§4); it inherits global | NOT TESTED |
| Persistence | Two windows: save in A, then save in B | B shows the conflict message; A's value is kept | NOT TESTED |
| Permissions | Settings access denied or read-only | Page shows unavailable/disabled; nothing saved | NOT TESTED |
| Isolation | Different overrides in two real Workspaces | Each Workspace keeps its own; inherit shows global | NOT TESTED |
| Isolation | Switch Workspaces repeatedly; restart | No leak or overwrite | NOT TESTED |
| Isolation | Separate Harness Profile | Other Profile shows none of these values | NOT TESTED |
| Visual | Windows light and dark theme | Text and native dropdown options readable | NOT TESTED |
| Visual | Arabic RTL and English LTR | Correct direction and labels | NOT TESTED |
| Visual | All 8 languages, 8 personalities, 6 characteristics, 8 presets, custom text | Selectable; effective preview updates | NOT TESTED |
| Privacy | Defaults | All policies Private; both switches Off | NOT TESTED |
| Privacy | Export JSON | No `allow`/`ask_first`; both switches false | NOT TESTED |
| Privacy | Import (merge and replace) | Review step; permissions reset; nothing saved until Save | NOT TESTED |
| Privacy | Stored record (§4) | Only approved fields; no secrets | NOT TESTED |
| Privacy | UI wording | States no plugin-level encryption; no encryption claim | NOT TESTED |
| Privacy | Ask the agent "what is my preferred name?" | Agent has no access to the profile | NOT TESTED |
| Existing | Environment & Context | Tab, context/output tokens, session switching, Workspace display | NOT TESTED |
| Existing | Humanizer | Skill registered when on, removed when off; presets never invoke it | NOT TESTED |
| Existing | Update checker | Correct versions; check runs; no install without confirmation | NOT TESTED |

Return the filled matrix (results and versions only) on the 0.7.1 PR.
