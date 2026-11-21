# New Plugins Implementation Plan

> **Historical design/plan (superseded).** It records the pre-integration Phase C approval and QA steps. The current six-component v1.0.0 development behavior is documented in [DETAIL](../../DETAIL.md); Direct Chat's old LPAC companion and automated deletion proposals are **not current product capabilities**.

> **For agentic workers:** Use superpowers:executing-plans for the gated Phase C work approved on 2026-11-19. The explicit owner conditions apply to shared files and production deletion. See the [Phase C capability update](../../research/NEW_PLUGINS_PHASE_C.md) for observed outcomes.

**Goal:** Deliver independent native Direct Chat, Workspace conversation lifecycle management and capability-backed reasoning controls without crossing data or permission boundaries.

**Architecture:** Keep native session/UI/model/persistence owners. Add three suite components with revisioned Settings, one shared native metadata domain and original SVG-derived artwork. Missing native deletion, transcript relocation and message-effort admission remain stop gates.

**Tech Stack:** Existing JavaScript ES modules, Cordis, Harness native Slots/Settings/storageDomain/Session/Agent/LLM/attachments, React, node:test and existing jsdom/axe/pack checks. No new application framework.

**Spec:** [Phase B design](../specs/2026-11-18-new-plugins-design.md); [Phase A audit](../../research/NEW_PLUGINS_PHASE_A.md); [installed package evidence](../../research/new-plugins-desktop-evidence.json).

## Global Constraints

- Work exclusively inside `C:\Users\Admin\Desktop\DSH-Suite-NewPlugins`, on `feature/new-plugins`; no branch switching, main merge, release or destructive Git operation.
- Do not modify Personal Profile implementation or Phase 7D files; its assets stay unchanged. Coordinate future settings integration separately.
- Do not modify the Harness core, patch native bundles, copy competing implementations or bypass unsupported APIs.
- Preserve backward compatibility, RTL/LTR, localization, and light/dark theme compatibility.
- No backup system, encryption layer, Temporary Chat, cloud synchronization, recycle bin or AI-based deletion decisions.
- Never delete Workspace folders/project files, Direct Chat from Lifecycle, Workspace chats from Direct Chat, or active/running sessions.
- Keep the original Group/override identities, package exports and component lifecycle behavior.
- Keep original SVG as icon source and transparent PNG variants at 32, 64, 128, 256, 512 pixels; preserve every existing icon.
- Run only tasks whose architecture is approved and whose native safety gates are met. Retain all unimplemented requirements in the acceptance record.

## Review Focus

1. Crash/restart between session reservation, native creation and ownership commit must never classify a Direct Chat as a deletable Workspace conversation — Task 3's real-domain/native-session crash fixture.
2. A live turn, approval, queued input, job, reminder or descendant starting after preview must prevent deletion through the native commit boundary — Task 4's concurrent admission fixture.
3. Another window's send, queued/steered input or route change must not steal a one-use effort override or overwrite user policy — Task 5's message-receipt/native-loop fixture.
4. A Desktop file picker/path chip, symlink, arbitrary path or foreign attachment reference must not grant general filesystem access — Task 3's attachment authorization and real tool-executor fixture.
5. Disabling Direct Chat, enabling Lifecycle, or a domain read failure must preserve category exclusion; disabled/inaccessible plugins must vanish from Settings — Tasks 2–4's lifetime/inventory/domain fixtures.

## Delivery order and capability gates

| Order | Reviewable deliverable | Exit gate / independent acceptance |
|---|---|---|
| 0 | Owner review of Phase A/B and icons | Approved with conditions on 2026-11-19. Shared-file coordination remains a separate gate |
| 1 | Native Settings + original icon family | Real settings registration, independent lifecycle and metadata tests; does not imply remaining plugins are complete |
| 2 | Direct Chat native creation/render/permissions/attachments | B4/B5 proved. Storage migration and deletion remain unavailable until B2/B1; report partial scope |
| 3 | Lifecycle catalog/policies/preview and isolated safe-deletion investigation | Manual deletion is required for full acceptance. Any production filesystem approach needs proof and separate approval |
| 4 | Reasoning native manual reuse/config; later Adaptive/one-use | Exact model map/parameter proof B6. B3 mandatory before automatic/one-use scope |
| 5 | Integration, package regression, Windows acceptance | Each requested feature has PASS or an explicit unresolved BLOCKED; full-product acceptance requires no required feature left blocked |

Upstream missing capabilities may require a different supported Harness version. No core changes or maintainer messages are authorized here. Split feature work into separate logical commits at the gates below; do not combine partial claims into a release.

## Task 1: Prove missing integration contracts before production changes

**Files:** Create later `qa/new-plugins-host-check.mjs` and supporting isolated fixtures under `test-support/new-plugins/`. No active Desktop configuration or transcript fixtures. Do not edit `qa/profile-host-check.mjs` or Profile tests.

**Consumes:** Installed/public native contracts and the Phase B invariants. **Produces:** Sanitized PASS/BLOCKED matrix for B1–B7, exact supported signatures for any newly established API, and pinned fixture versions. Do not invent an implementation signature for an absent native method.

- [ ] Reconfirm branch/base, clean scope, relevant instructions, installed Desktop build and package hashes; detect drift before using rc.3 assumptions.
- [ ] Run isolated read-only capability probes for Slots, Conversation embedding, upload-only intake, preset/guard admission and domain acquire/release semantics. Use fictional in-memory/temp fixture data only; no production install.
- [ ] Test two consumers acquiring the same domain, first-consumer disable, last release, reconnect/reload, duplicate package copy, unavailable backend and unknown durable outcomes. Any unresolved lifetime bug blocks adopting the shared helper.
- [x] Investigate deletion alternatives using synthetic sessions, native writer and reader behavior, archive state and restart/index consistency. Keep production deletion gated. Record the installed per-category transcript migration and pre-capture message-effort gaps.
- [ ] Pin native dependencies used directly and test versions only after reconciling public packages with packaged Desktop behavior. If an install is needed later, use declared project dependency changes and no scripts without reason.
- [ ] Review capability findings. Commit only isolated fixtures/documentation as a logical evidence commit after relevant checks; do not alter Profile/core/active data.

## Task 2: Native suite Settings and icon family

**Create:** `plugins/suite-settings.js`; new feature settings/panel modules only as needed; `plugins/<new-component>/assets/icon.svg`, five `assets/png/icon-<size>.png`, `client-icon.js`, `locale/{en,ar}.json`; `scripts/render-plugin-icons.mjs`; `docs/NEW_PLUGINS_BRANDING.md`; `test/new-plugins-settings.test.js`, `test/new-plugins-icons.test.js`.

**Modify after coordination:** `client.js`, `cordis.patch.yml`, `package.json`, `package-lock.json`, root locales; `test/dsh-contract.test.js`, `test/components.test.js`, `test/client-lifecycle.test.js` only for new identities/lifecycle. No Profile extraction or asset replacement.

**Produces:** One `settings.section` with available enabled-feature roster; feature-owned localized panels; native metadata-resolvable icons. The package-root Group export remains unchanged. Unavailable features carry explicit local notices, not working-looking buttons.

- [ ] Write failing tests for one section, no unavailable tabs, independent enable/disable, denied access, stale inventory, disconnect/reconnect, dirty drafts/revision conflicts, effect cleanup and no duplicate registration.
- [ ] Run `node --test test/new-plugins-settings.test.js` and confirm a meaningful failure before implementation.
- [ ] Add the narrow browser module imports/roster and three unique Include rows, preserving all existing overrides and Profile surfaces. Implement native Settings revision/error behavior.
- [x] Draw original source SVGs from the approved concepts and palette. Generate all five sizes with a pinned renderer and record provenance and the generation command.
- [x] Verify the SVG structure, dimensions, alpha and metadata byte limit. Inspect light and dark sheets at 16/20/24px glyph and 32/64/128px badge sizes.
- [ ] After shared-file coordination, add native metadata exports and currentColor glyph registration. Verify actual Desktop seats and forced colors.
- [ ] Run new Settings/icon tests plus the affected existing metadata/lifecycle/render tests; inspect actual native Settings contribution in the isolated Host fixture.
- [ ] Commit Settings/icons as one coherent reviewed change or two logical commits if independent review requires it; do not publish or change stable version.

## Task 3: Direct Chat

**Create:** `plugins/conversation-data.js`; `plugins/direct-chat/{index.js,client.js,settings.js,preset.js,attachments.js}`; `test/new-plugins-data.test.js`, `test/new-plugins-direct-chat.test.js`, `test/new-plugins-direct-chat-security.test.js`. Add to `qa/new-plugins-host-check.mjs`.

**Interfaces:** Shared domain acquisition/classification as specified in Phase B; native create returns the authoritative ID; native Session binding/Conversation owns rendering and send recovery. Attachment reader accepts an opaque session-admitted ID only. No migration/delete executor interface until B2/B1 is established.

- [ ] Write failing native-service tests for durable pending reservation → native create → ready commit, unexpected actual ID, crash at every boundary, missing/ambiguous metadata, restart and Direct Chat disabled while Lifecycle remains active. Specifically crash before recording a replacement actual ID, then attach that native Direct-preset session to a Workspace: it must remain quarantined/excluded.
- [ ] Write failing real-executor tests proving no terminal/arbitrary filesystem/cwd/plugin/MCP/indirect code/delegation escape, scoped tool shadowing, preset switch and resume safety. Include native prompt/tool-schema capture, not just button presence.
- [ ] Write failing attachment tests for foreign refs, arbitrary paths, traversal/symlink attempts, corrupt digest, cancellation, oversized display output and Windows real-path chips; successful authorized upload must remain readable with broad filesystem tools absent.
- [ ] Run the three focused test files; confirm intended failures.
- [ ] Implement native-domain ownership, explicit restricted preset, New Chat/list/navigation and embedded native Conversation. Add only the attachment-only reader and supported upload-only intake proved in Task 1.
- [ ] Verify native streaming, Markdown/code, model changes, image incompatibility, file admission, unavailable search/fetch provider, permissions, failed sends, restart and disposal through real offline adapter/Host integration.
- [ ] Leave custom transcript migration and destructive retention/Delete All blocked until B2/B1. If supported later, add separate tested tasks using the exact native transaction, including crash and cross-volume/path failure handling. Never relabel cwd allocation as storage migration.
- [ ] Run focused tests and native fixture, inspect unchanged Profile contract behavior, commit the independent Direct Chat slice. Record which requirements still prevent full acceptance.

## Task 4: Conversation Lifecycle

**Create:** `plugins/conversation-lifecycle/{index.js,client.js,settings.js,inventory.js,retention.js}`; `test/new-plugins-lifecycle.test.js`, `test/new-plugins-retention.test.js`. Extend shared-domain/native fixture tests. A native execution module/test is added only after B1 has a concrete supported signature.

**Consumes:** Authoritative Workspace + cold Session catalogs and shared Direct Chat ownership. **Produces:** `planCleanup` immutable previews, revisioned retention/protection, native context-menu entry points, precise counts/partial bytes and honest execution reports when execution becomes supported.

- [ ] Write failing tests for single/bulk/Workspace/all scopes, archive inclusion, missing/corrupt/denied entries, multi-Workspace de-duplication, Direct Chat precedence, disabled Direct Chat, incomplete domain inventory and orphan exclusion.
- [ ] Write failing retention tests for Keep forever/365/180/90/30/7, exact expiration boundary, last activity versus creation, missing/future timestamps, policy edit during preview, longest/Keep forever multi-membership rule, protection and manual extra acknowledgement.
- [ ] Run focused tests and confirm intended failures.
- [ ] Implement read-only inventory, settings, protection, previews and native context menu contributions. Keep retention at Keep forever by default and preview-only pending safe execution. Manual deletion always requires confirmation. Once execution is approved, record informed confirmation for each automatic policy revision and report scheduled results without daily prompts.
- [ ] Verify storage statistics distinguish optional selected-log bytes from total retained generations/shared attachments; incomplete scans cannot produce Delete All success or reclaimed-byte guarantees.
- [ ] When B1 exists, first write native concurrency tests for turn/approval/job/reminder/descendant activation after preview, resident Agents/open-client leases, concurrent windows, changed revision/ownership, writer lock, interruption/partial failure, parent dependencies and exact-scope confirmation binding. No force-stop path.
- [ ] Implement only the proven native operation, repeat targeted proof, then report per-ID outcomes. Native attachment GC, if absent, stays unavailable and clearly disclosed.
- [ ] Commit read-only stage and native execution in separate logical commits; full Lifecycle acceptance remains blocked until native execution passes.

## Task 5: Adaptive Reasoning

**Create:** `plugins/adaptive-reasoning/{index.js,client.js,settings.js,policy.js}`; `test/new-plugins-reasoning.test.js`, `test/new-plugins-reasoning-admission.test.js`. Extend offline real-Agent-Loop/native-adapter fixture.

**Consumes:** Exact provider/model capabilities and approved per-model tier maps. **Produces:** `resolveEffort`, persisted policy/override intent, native manual control reuse and conditional automatic/message controls. No patched adapter catalogs, prompt instructions or global transport wrapper.

- [ ] Write failing policy tests for opaque IDs, no reasoning metadata, no low/high mapping, missing provider/model, explicit/adapter default, manual higher-than-auto-cap, route changes, disabled component and user-versus-policy selection origin. Test explicit session locking and a user choosing the same tuple already selected by policy; native no-op selection must not be mistaken for permission to overwrite manual intent. Automatic policy stays blocked without a supported picker-intent contract.
- [ ] Run `node --test test/new-plugins-reasoning.test.js`; confirm intended failure.
- [ ] Implement revisioned per-model/context defaults, valid tier mapping, native selection integration and displayed explanations; automatic changes must not call the global-default-saving GUI endpoint.
- [ ] Capture actual offline adapter request config to prove supported effort is transmitted and unsupported values fail before provider I/O. Confirm selections prepared before capture apply, pre-step selection cannot change the already captured step, and deprecated request mutation rejects.
- [ ] Only after B3: write failing tests for one accepted prompt turn, tool continuations, mixed queued/steered messages, identical request retries, rejected admission, cancel/restart, another window's send and adapter/route change. No select/send/restore timing workaround.
- [ ] Implement deterministic local classifier and receipt-bound one-use control through the proved native seam; preserve current manual/session selection precedence. No extra model/network classification call or task-text telemetry.
- [ ] Verify local child Inherit from actual parent settings, supported explicit child override, route-change clearing and unsupported external backend. If no universal child override seam exists, report limited supported scope rather than intercepting globally.
- [ ] Verify native statistics labels; unavailable reasoning-only metrics stay unavailable. Commit policy/manual integration separately from supported automatic/message admission.

## Task 6: Integration, regressions and Windows acceptance

**Modify:** New-plugin tests/fixture, `.github/workflows/test.yml` when needed, root README/locales, `docs/DETAIL.md`, `SECURITY.md`, `CHANGELOG.md`. **Create:** `docs/NEW_PLUGINS_WINDOWS_ACCEPTANCE.md`; documentation theme/size previews under `docs/assets/new-plugins/`. Leave protected Profile files unchanged.

- [ ] Run targeted real-service integration across all combinations of the three new toggles, existing Environment/Humanizer/Profile enabled/disabled, reconnect, inventory failure, independent domain release and partial startup. Do not use real personal data.
- [ ] After focused checks pass, run `npm test`, `npm run check:package` and `node --test qa/new-plugins-host-check.mjs` with declared dependencies present. CI must exercise Windows/Linux Node 22/24; packed tests must load extracted code/assets rather than checkout imports.
- [ ] Review production package content, license notices, no fixture/task text/secrets, no extra encryption/backup/trash, and no new Profile/core modifications. Do not install renderer/test tooling into shipped production files accidentally.
- [ ] On the actual Windows Desktop, record application build, module hashes, candidate commit, active test Profile and plugin inventory. Do not equate CLI version with Desktop. Use the supported native plugin installation flow only when authorized for that implementation acceptance step.
- [ ] Execute the acceptance matrix below and preserve sanitized PASS/FAIL/BLOCKED evidence. Request-level/parameter proof and data-boundary proof are separate from visual success.
- [ ] Review the complete diff and requirement coverage. Stop with unresolved blockers explicitly stated; no merge to main or release. Owner separately reviews integration/publication.

## Windows acceptance matrix

| Area | Cases / expected result |
|---|---|
| Settings and independent lifetime | One native suite section; only enabled/available tabs; reconnect, owner/non-owner access, conflict/failure and dirty draft; all other suite components keep working |
| Icons | All five PNG sizes/alpha, SVG source, 256 KiB metadata limit, Plugin Hub-compatible metadata, Settings/sidebar/toolbar/context-menu/GitHub rendering, 16/20/24px glyphs, light/dark/high contrast, keyboard labels; existing icons byte-identical |
| Direct Chat | New/restart/resume/parallel creation, no Workspace picker, independent history, native model/stream/Markdown/code/image/file behavior, uploaded-only file reading, web provider unavailable, no broad tools even through commands/changed preset/restart |
| Profile | Existing consent and structured-field exclusion remain; no second injector or new Profile asset/config/UI modification; no request-level privacy claim inferred from a model's answer |
| Lifecycle | Cold and archived inventory, exact counts/partial bytes, scopes/de-dup/protection/overrides, expired boundary and preview change, confirmation/failure/results, active approval/job/descendant races, no project-folder or Direct Chat change |
| Native storage/deletion | All generations/index state handled by supported API, reopen/restart proof; safe custom storage migration when native support exists; Workspace log/file hashes unchanged; shared attachment limits disclosed |
| Reasoning | Model-supported menu only, defaults/fallbacks/cap/manual precedence, captured actual parameter, queue/steer/retry/two-window/restart one-use cases, local/external child capability, truthful latency/token labels |
| Usability | Arabic/English, RTL/LTR, light/dark, keyboard/screen reader, Escape/focus recovery, narrow/resized Windows layouts, native titlebar clearance, no clipped destructive preview |

## Completion limits

The Phase C update records generated assets, passing isolated Windows contract fixtures and outstanding product integration. Exact execution signatures and implementation steps for held capabilities depend on the verified Host contracts. No capability counts toward product acceptance until it works end to end on Desktop.
