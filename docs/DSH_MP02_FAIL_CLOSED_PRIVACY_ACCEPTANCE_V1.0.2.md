# MP02 — Owner-Approved Fail-Closed Privacy Contract (v1.0.2)

**Decision date:** 23 November 2026  
**Scope:** My Profile / Direct Chat historical continuation following saved consent revocation  
**Release-gate disposition:** **Closed by owner approval of the verified fail-closed behavior**, **not by a passing historical provider-wire continuation test**.

## Owner decision

The owner explicitly accepts the following product behavior as the v1.0.2 MP02 acceptance contract:

1. **Readable history:** Previously saved conversations remain available for reading. Revocation must **not** silently delete or rewrite existing conversations, messages, stored Sessions, or other historical material.
2. **Fail closed on recognized revoked Profile content:** If a historical model request contains recognizable My Profile personal-detail sections or previously consented custom instructions that the **current saved consent** no longer authorizes, the request is **refused before provider transmission**. The user is given a neutral message to start a new conversation.
3. **Fresh conversation:** A newly started Direct Chat must use the current saved My Profile disclosure policy. It must not automatically replay a separate old conversation's history through this module. Unchecked structured fields and revoked custom instructions must not be freshly injected by My Profile.
4. **No history sanitization or deletion guarantee:** Existing historical logs, user-authored messages, model-derived or transformed text, compacted history, data already sent to a provider, and independently sourced context are **not erased, globally scrubbed, or guaranteed absent** by this guard. The behavior is limited to recognized My Profile-generated sections **while the My Profile component is enabled**.

This decision changes the **acceptance contract** for the historical continuation scenario to explicitly permit pre-provider refusal rather than requiring that a historical turn successfully reaches the provider with a sanitized payload. No runtime change is made by this documentation.

## Native evidence retained

The original installed Windows DSH Desktop `0.2.2-rc.5` native MP02 cases documented in [rc.2 security acceptance](DSH_DESKTOP_SECURITY_ACCEPTANCE_V1.0.2_RC2.md) showed:

| Case | Observed result | Interpretation |
| --- | --- | --- |
| MP02-a — All structured fields Private in a fresh conversation | Pass | No protected synthetic structured-field markers in captured provider request |
| MP02-b — Selective saved consent | Pass | Allowed preferred name and gender present; private nationality omitted |
| MP02-c — Revoke consent and reopen the same Session | Pass | Neutral `INVALID_REQUEST` refusal; zero matching provider requests |
| MP02-d — Cold restart and reopen the same Session | Pass | Same pre-provider refusal after restart; zero matching provider requests |
| MP02-e — New conversation after revocation | Pass | No revoked structured-field markers in the fresh provider request |
| MP02-f — Stored historical context | Pass | Historical Session log remained intact, with previously authorized synthetic values |
| **Original historical provider-wire continuation criterion** | **Blocked (historical record retained)** | A refused historical turn produces no outgoing provider payload to inspect. This is **not** recorded as a Pass. |

The later [full native acceptance report](DSH_DESKTOP_NATIVE_FINAL_ACCEPTANCE_V1.0.2.md) identified a separate **custom-preference replay defect** on the former baseline: a previously authorized custom instruction reached a localhost synthetic provider after consent revocation. The approved change in [PR #57](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/pull/57) was reinstalled and retested on Windows. On the same stored historical Session after cold restart, the DeepSeek continuation was refused before transmission (**zero captured requests**). A separate OpenAI-compatible continuation omitted the revoked custom marker. Source and pinned Host regressions also passed; the fix was merged to `develop`.

## Closure rationale and limitations

The previously Blocked test expected a historical provider-wire sample **even though the intended privacy control stopped the request before serialization**. The owner now explicitly accepts **pre-provider refusal plus the successfully tested fresh-session privacy control** as the intended contract. Thus MP02 is **closed as an owner-approved fail-closed product-policy decision with native evidence**, rather than a claim that the old criterion passed or that all historical references can be scrubbed.

The guard is a recognizer for known My Profile-generated sections. It cannot establish comprehensive redaction of arbitrary text, content rephrased by the model, or context supplied through unrelated Host features. Revocation is **not retroactive deletion**. Permissions in external providers and actual Peer/Windows ACLs are separately tracked release gates and remain unresolved.

## Release and maintenance controls

- **MP02 issue checkbox:** Closed — accepted fail-closed contract and verified native scenarios. Preserve the historical `Blocked` verdict in rc.2 and the prior comprehensive report.
- **Reopen MP02** if a **recognizable** revoked My Profile detail/custom section is transmitted despite the guard, the fresh-session consent checks regress, or the user-facing contract changes.
- **Other release gates:** Provider Error Exposure remains **Fail**; Peer/ACL, Host logs, network egress, Settings concurrency, recovery, Direct Chat native faults, accessibility, provider/Humanizer quality and updater scenarios remain independently unresolved. No other acceptance item is closed by this decision.
- No modifications to DSH Host, suite runtime logic, `main`, publication tags, or release authorization are implied.

## Supporting sources

- [MP02 original native security acceptance](DSH_DESKTOP_SECURITY_ACCEPTANCE_V1.0.2_RC2.md)
- [v1.0.2 Windows native retest and custom-preference fix evidence](DSH_DESKTOP_NATIVE_FINAL_ACCEPTANCE_V1.0.2.md)
- [My Profile documented context boundary](PERSONAL_PROFILE_LOCAL_SETTINGS.md)
- [Current fail-closed guard implementation](../plugins/personal-profile/preferences.js)
- [Current pre-provider stream hook](../plugins/personal-profile/index.js)
- [Release-gate tracker Issue #53](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/issues/53)
