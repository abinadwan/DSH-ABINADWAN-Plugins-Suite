# Phase 04 — Adaptive Reasoning statistics durability

> Source candidate `1.0.1-rc.4` for `develop`. No release or tag. No live provider calls or Desktop acceptance. Date: 2026-11-22.

## Identity
- Branch: `fix/phase-04-reasoning-statistics` from `develop` at `2ed0c3aa8597f1d857a3d51fa3212b34508614b1` (PR #41 merged and subsequent PR #42 icon refresh).
- Review: phase-specific Draft PR targeting `develop`; owner approval required.
- Published version remains `v1.0.0`; no `main` changes.

## Finding and repair
When a user requested a persistent statistics reset, `plugins/adaptive-reasoning/index.js` previously called `stats.takeCounters()` and `stats.reset()` **before** awaiting `target.reset()`. If the backing JSON document was corrupt or unreadable and the storage reset failed, the process lost unsaved in-memory aggregate counts despite returning HTTP 503. This violates failure transparency.

The fix performs the storage reset transaction **before** clearing live counters or an outstanding retry delta. A failed reset returns 503 while retaining the live counters for subsequent successful persistence. An ambiguous crash after an atomic write is still outside plugin-level exactly-once guarantees and is not claimed solved.

## Evidence
- New pinned offline DSH Host test simulates a successful saved request, an additional unflushed request, a corrupt backing file, failed `stats/reset` (HTTP 503), repair of that **fictional** backing file and an eventual retry that preserves both requests.
- Existing `test/reasoning-persistence.test.js` tests concurrent Host writers, reopening, reset epochs, corrupt/unsupported states and failed write retry. Additional regression verifies oversized (1 MiB+) and unknown-version state is rejected without truncation or migration.
- `test/adaptive-reasoning.test.js` exercises bounded aggregate cardinality: 64 route entries, 64 named efforts plus an overflow bucket, no prompt text.
- The patched code continues to use `@deepseek-ai/dsh-atomic-write` and `withFileLock`. Locked/atomic write semantics depend on OS/Host behavior; no guaranteed power-loss recovery is asserted.
- CI gate: `npm ci --ignore-scripts`, `npm test`, `npm run check:package`, and the pinned synthetic Host integration on Ubuntu/Windows Node 22/24. Record final PR-head green run before merge; do not substitute previous CI for final evidence.

## Changed surface
`plugins/adaptive-reasoning/index.js`, pinned Host test, storage/statistics unit tests, version-dependent metadata (`package.json`, lockfile, `client.js`, version contract tests), and phase tracker. No new Settings field, migration, direct user content persistence, cleanup worker or provider API.

## Remaining acceptance and rollback
Desktop acceptance remains deferred to a **single combined Windows DSH Desktop round after phase eight**: unplug/reconnect, restart/reload, forced crashes under concurrent writes, corrupt Profile-local file, reset/failed reset, user-visible errors and cross-provider usage. Actual crash durability and filesystem atomic guarantees must be measured, not assumed. Owner review may revert this standalone phase before or after merge; no user data should be deleted by reverting source.

**Decision:** Implemented pending green final CI, owner approval and separate Desktop release gate.
