# Source-only acceptance hardening — v1.0.2, after rc.5

**Scope:** follow-up on the ten source/fixture items from [Issue #53](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/issues/53). This is a development-only change on `develop`'s successor branch, not a Desktop native acceptance round and not a stable release. The package version stays `1.0.2-rc.5`. No Session deletion, settings migration or provider route change.

## Reproduced source defects addressed

1. **R06 / Direct Chat catalog registration race.** A creation-order lookup could return a successful Workspace identity after its registered membership changed if header metadata was unavailable (a timeout, incomplete headers, or a list exceeding the metadata cap). The existing post-read check compared memberships only when `createdAt` was non-null. **Fix:** snapshot the authorized IDs before asynchronous metadata reads, compare against the current unique ID set even when `createdAt` is null, and return code-only 409 `DIRECT_CHAT_CATALOG_CHANGED` with no-store. Do not open history or read Session logs to recover metadata. A new source regression covers unchanged, replaced, added, and duplicate registrations with missing headers.
2. **R11-related browser diagnostic redaction.** Several suite-owned browser warnings logged raw Host exception objects or messages for inventory, locale cleanup, lifecycle activation and Environment auto-open. Such messages *could* contain sensitive paths or tokens. **Fix:** preserve neutral diagnostic categories without raw exception strings. A new mounted failure regression injects a fictional sensitive canary into an inventory error and checks the browser warning excludes it. This is not proof of native **Host** log redaction; R11 / FS08-b stay Blocked.

## Source/fixture review matrix

| Original item | Source-side disposition | Native acceptance status |
| --- | --- | --- |
| MP02 historical privacy | Existing fail-closed policy and synthetic disclosure tests retained. No approval to change historical replay policy. | **Blocked**: historical provider-wire criterion |
| F05 rename refusal/retry | Existing mounted refusal, retained draft, explicit retry coverage; no new confirmed source defect. | **Blocked**: installed Host refusal |
| R03 timeout | Existing bounded metadata fallback fixture; no new confirmed source defect. | **Blocked**: installed Host timeout |
| R06 CHANGED | **Fix:** detect a registration race even without creation metadata; new deterministic source regression. | **Blocked** until installed Host mutation test |
| S03 / CC05 concurrent Settings | Existing revision-checked source/React/Host fixtures retained. | **Blocked**: two native authenticated clients sharing one Profile |
| CC03 ambiguous catalog | Existing fail-closed source/React behavior retained; no authorized way to synthesize a partially usable native Host catalog. | **Blocked** |
| R11 diagnostic redaction | **Fix:** remove raw exception values from suite browser warnings; Host code-only responses previously covered. | **Blocked**: actual installed Host warning trace |
| Accessibility source checks | Existing keyboard, locale/RTL and React semantics coverage retained; no newly reproduced source defect in this review. | Manual Narrator, contrast, scaling and offline flows remain unverified |
| Provider error/fault fixtures | Existing synthetic failure and cancellation contracts retained; no production provider protocol change. | Controlled native provider faults not tested |
| H04 title discovery | Existing admitted-title projection and exact-ID fallback retained; no safe suite-only source for missing Host titles. | **Fail**: 8,185/10,000 before opening in prior native test |

## Validation

Review final-head CI and targeted Node tests after the branch is pushed. Source and React results do **not** close native cases. Do not claim that the R06 regression reproduced the installed Host race. This change intentionally avoids accessing private Session files, altering upstream DSH, enabling automatic cleanup, or changing privacy consent. The full release gate remains open in Issue #53; `main` and published `v1.0.0` remain unchanged.
