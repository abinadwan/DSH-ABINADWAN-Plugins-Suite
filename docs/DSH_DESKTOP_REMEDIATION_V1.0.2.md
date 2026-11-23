# DSH Desktop v1.0.2-rc.1 remediation handoff

**2026-11-23, Asia/Riyadh. The four defects have targeted remediation evidence. Full Desktop acceptance remains open, and MP02 is blocked for historical provider-wire confirmation.** Review branch `codex/fix-desktop-v1.0.2` starts at `90e70873a5a63b15b767e8e381ed769359be2645`. Separate owner approvals are required for integration and publication. The published stable version remains `v1.0.0` at `206f3e814800478f961af05b673a1235ea8ba002`. [Develop acceptance checklist](DSH_DESKTOP_FINAL_ACCEPTANCE_V1.0.1.md)

## Findings and targeted retest

| Finding | Remediation and evidence |
| --- | --- |
| **DSH-QA-01 — Direct Chat history** | The installed Desktop returned an empty HTTP 400 for catalog GET, while prepare POST returned 200. The packaged Host uses the exact route’s body mode to choose its HTTP bridge branch. The catalog omitted the mode, so the bridge tried to construct a streaming request with a body for GET. The route now declares `buffered`, which produces a bodyless GET. On the disposable Desktop, recent and creation lookups returned 200 and `Cache-Control: no-store`. History showed both saved conversations, the creation sort showed both entries, and opening a row restored its prior reply. History also reopened the existing chat after another cold restart with Arabic active. Evidence files `native-carrier-baseline.json`, `native-candidate-history.json` and `native-verified-environment-ar.json`. |
| **DSH-QA-02 — My Profile disclosure** | The Plugins summary explains that only saved, explicitly allowed personal fields can appear in supported native agent requests, including requests to cloud providers. It states the limit of revocation for previously sent information. The Desktop displayed the revised text and matching Host/browser versions. In the same historical conversation, the real DeepSeek Messages adapter sent the allowed fictional preferred name and gender and withheld nationality. Evidence files `native-candidate-profile-copy.json`, `native-candidate-profile-copy.png` and `verified-profile-wire-summary.json`. |
| **DSH-QA-03 — Arabic Environment & Context** | Translated the tab/guide, component metadata, inspector labels and fallbacks, and accessible button and progress names. The official title seat updates the visible title of an already-saved tab. The reopened historical session showed the translated title, all five Arabic inspector sections, and RTL layout while retaining native values. Evidence files `native-before-title-seat.json`, `native-verified-environment-ar.json` and `native-verified-environment-ar.png`. |
| **DSH-QA-04 — Arabic reasoning statistics** | Translated the dialog, usage labels, loading/empty/error states and controls. The dialog and table use RTL, with provider/model names preserved. The widened Desktop dialog showed all six columns at 1280 × 820. At a 390 × 720 emulated viewport inside the installed renderer, the focusable table region scrolled to the final column. Evidence files `native-verified-stats-ar-1280.json`, `native-verified-stats-ar-390.json` and corresponding screenshots. |

## MP02 — Blocked for historical wire-level confirmation

The historical request completed before revocation, with only the two allowed fictional fields present. I returned both fields to Private in the disposable profile, cold-started the candidate, reopened the same conversation and sent `QA-ProfileRevoke`. The Desktop displayed `INVALID_REQUEST` and the loopback fixture recorded **zero** requests with that marker. The clean-session control `QA-ProfileFresh` completed with HTTP 200 and all three fields absent.

This confirms fail-closed behavior for the historical attempt. The historical provider payload remains unobservable because the send-time guard refuses the request before serialization. The v1.0.1 report marked MP02 Pass based on its observed refusal and fresh control. This handoff records the stricter historical wire criterion as **Blocked**. The disclosure guard and stored Session history are intact. Evidence files `native-verified-profile-revocation.json`, `native-verified-profile-fresh.json`, `verified-profile-wire-summary.json` and `native-wire.jsonl`.

To close the wire requirement, rerun an approved historical-send path that reaches the adapter without replaying the old disclosure. If an in-history refusal is the intended contract, the owner needs to explicitly approve refusal plus the clean-session control as the acceptance criterion.

## Automated verification

| Check | Result |
| --- | --- |
| `npm test` | 256 passed, 1 skipped, 0 failed. The skip is POSIX-only. |
| `npm run check:regression` | 4 passed. Classifier corpus 56/57 with zero two-tier errors. |
| `npm run check:package` | 94 packed files. 255 passed, 2 skipped, 0 failed. The skips are POSIX-only and source-only documentation. |
| `node --test qa/direct-chat-catalog-host-check.mjs` | 1 passed with the pinned rc.3 Host connection service. Covers owner-only dispatch, catalog body mode and teardown. |

The added checks reproduced the prior wording, locale, stored-title, dialog direction and route body-mode failures before the corresponding fixes. Verification used Node 24.21.0 and npm 11.19.1. The source and package gates needed Windows junction permissions. The first version bump exposed synthetic update-check fixtures pointing to an older version. They now derive a newer synthetic version from the package under test.

## Fixture, evidence and remaining gates

- Native retest used Windows DSH Desktop `0.2.2-rc.5`, build `3f85d888b1297107937d9bd5b853f7e733e179a4`, with a fresh DSH home and separate Electron data. Local tarballs installed through the native CLI carried `1.0.1-rc.8` from the exact baseline and `1.0.2-rc.1` from this branch. The verified candidate tarball SHA-256 was `b5bb6a54658f95eb0632cb9dda7f85a0438a62458fd98b8e3ab31ec894b50355`. The installed client, catalog, Arabic component locale and package metadata matched the source hashes.
- The original v1.0.1 report and its evidence remain in `.dsh-acceptance-90e7087/` beside the original checkout. New evidence is in the task’s separate `dsh-v1.0.2/evidence/` directory. The trace records only fictional markers, presence flags and outcomes. Screenshots can show paths inside the temporary fixture. No evidence was uploaded.
- Native coverage is limited to one local owner, one DeepSeek Messages adapter with loopback responses, and the documented window sizes. Non-owner routing ran in the pinned Host fixture. A native second Peer, live-provider behavior, native large-inventory paging/rename, other platforms, and full keyboard and screen-reader acceptance remain open. The CLI reported a peer-dependency warning during the disposable install.
- The normal DSH Profile, main branch and published stable release were left untouched. The isolated fictional data and evidence remain available for follow-up.
