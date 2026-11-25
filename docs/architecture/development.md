# Development and verification — ABINADWAN Plugins Suite

## Current baseline

Package 1.1.0 contains six independently toggleable components; see [component contracts](../DETAIL.md). The Host entry is `index.js`, the browser carrier is `client.js`, and `cordis.patch.yml` defines the native bundle. Component implementations, locales and icons live under `plugins/`. Preserve exports, IDs, settings namespaces and migration contracts.

## Browser source and distribution

The DSH lazy-CJS carrier `client.js` is generated deterministically from ordered `client-src/*.js.inc` fragments. The canonical Arabic dictionaries are in `locale/dsh-ui-ar.json`; the shared profile catalog and renderer are in `plugins/personal-profile/preferences.js`. Edit those sources rather than the generated carrier, run `npm run build:client`, and commit the resulting `client.js`. The installer still receives ready-to-run JavaScript and requires no build tool. `npm run check:client` checks reproducibility and syntax in CI; source fragments and build scripts are excluded from the package.

## Workflow and checks

Start from `develop`; propose changes via PR to `develop`. Promotion to `main` and publication require separate owner approval.

```sh
npm ci --ignore-scripts
npm run check:client
npm test
npm run check:regression
npm run check:package
```

CI also exercises pinned Harness Host contracts on Windows/Ubuntu and Node 22/24. Native Desktop acceptance is separate from automated CI. Record the exact artifact SHA, Host, OS, scope and observed outcomes. Use disposable Profiles and synthetic data.

## Verification boundaries

- Direct Chat: the owner accepted title-search scope up to 1,000 registered Sessions in v1.0.2. The 10,000-Session stress test failed (8,185 titles available), not a Host fix. [H04 evidence](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/blob/98c27e87e216f11000ab92adcb79d51388031a28/docs/DSH_H04_SEARCH_SCOPE_AND_HIGH_LOAD_RESULT_V1.0.2.md). Tool denial is policy, not OS isolation.
- My Profile: DSH runtime-context snapshots are durable and may retain earlier values. Current v5 behavior does not block continuation. The [historical MP02 evidence](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/blob/98c27e87e216f11000ab92adcb79d51388031a28/docs/DSH_MP02_FAIL_CLOSED_PRIVACY_ACCEPTANCE_V1.0.2.md) describes an older sharing contract, not acceptance of the current implementation. Verify native Desktop behavior and actual model response independently.
- Archive Manager: native authorized catalog, scoped protection and restore. DSH owns the sidebar filter. Earlier native restore evidence predates the final UI simplification and does not establish complete native acceptance for 1.1.0.
- Native non-owner routes, Windows ACL, Host diagnostic/egress and extended assistive-technology coverage retain their original limits. Provider HTTP 400 exposed fictional canaries in the upstream native failure UI; the owner accepted the upstream boundary, not a fix. [Native acceptance and owner dispositions](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/blob/98c27e87e216f11000ab92adcb79d51388031a28/docs/DSH_DESKTOP_NATIVE_FINAL_ACCEPTANCE_V1.0.2.md).
