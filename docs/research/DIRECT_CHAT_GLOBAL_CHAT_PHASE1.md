# Direct Chat Global Chat replacement — Phase 1 verification (2026-11-21)

## Branch and boundaries

- Branch: `feature/direct-chat-global-chat-replacement`, based on `develop`.
- Scope: stabilize package/test integration for the replacement in `plugins/direct-chat`.
- Public component identity remains `abinadwan-direct-chat`. The component stays disabled by default.
- `main` and `develop` are unchanged. No DSH Desktop data or installed archives were touched.

## GitHub Actions diagnosis

The run on commit `c0d57e7103d652d412eb143d68fed35249fc05a6`:
https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/actions/runs/44920985739

All four jobs finished with `failure`, but **every job had zero steps, an empty `runner_name`, and duration of 1–2 seconds**. Node, npm and the suite tests were not started.

An older `develop` run from 2026-11-20 showed the same no-runner failure, while run 44731464723 from 2026-11-20 succeeded on four allocated GitHub-hosted runners and ran 11 steps per job.

**Conclusion:** a GitHub Actions job scheduling/runner-account problem is blocking CI. The precise reason is not available in the API summaries. Investigate the failed job's annotation and GitHub Actions/billing settings from the repository UI. Do not modify package code or workflow matrix in response to these failures without more evidence. Do not claim `npm test` or `npm run check:package` passed.

## Code corrections

- The test browser fixture (`test-support/client.js`) now injects `AbortController` into `node:vm.runInNewContext`, alongside `AbortSignal`.
- Node VM contexts do not supply `AbortController` automatically, but `DirectChatButton` and its fiber require it.
- This change is isolated to test support; production behavior and other plugins are unchanged.

## Independent checks actually performed

1. Syntax-only V8 checks succeeded for the modified `client.js`, Direct Chat Host module and Direct Chat test files. This validates parsing, not DSH compatibility.
2. Executed the exact feature-branch `client.js` in a synthetic JS harness. It registered `sidebar.footer.action`, rendered a `Direct Chat` button, POSTed to `/api/abinadwan-direct-chat/create`, and opened the returned session ID. This did **not** use DSH Desktop.
3. Ran isolated host smoke checks on the earlier uploaded Codex Global Chat Host implementation (structurally the same route/guard architecture). They passed for input rejection, session creation, persistence flush call, tool denial, unaffected normal Workspace tool permission and a blocked data-folder path. These tests did **not** execute the exact feature-branch Host file or native DSH services.

## Manual reproduction once GitHub runners are available

From a clean local checkout of this feature branch:

```powershell
npm ci --ignore-scripts
npm test
npm run check:package
```

Run on supported Node 22 and 24 (Windows and Linux as defined in `.github/workflows/test.yml`). Keep test profiles disposable. Compare any failures with `develop`.

## Not closed by Phase 1

- No full source/package test suite has executed on the replacement branch since the runner scheduling failures.
- No real DSH Desktop installation, GUI interaction, hidden Workspace registration or cold-restart persistence has been verified.
- A dedicated directory under the active profile is not, by itself, a registered hidden Workspace; the composer gate remains open.
- The earlier LPAC companion guarantees and deletion implementation were removed from this branch as part of the requested replacement. No migration from its independent storage was performed.
- Before integration, add native Desktop integration tests, validate the hidden Workspace contract, and re-audit all tool restrictions at runtime.

**Release gate:** keep `Direct Chat` default-off and do not merge this branch into `develop` or `main` until all relevant tests and Desktop acceptance pass.
