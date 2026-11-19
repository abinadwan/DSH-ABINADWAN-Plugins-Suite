# Phase C UI correction

This update supersedes the combined Settings and bilingual UI decisions in the [earlier continuation report](NEW_PLUGINS_PHASE_C_CONTINUATION.md). The native authorization and storage blockers documented there still apply.

## Capability matrix

| Capability | Status | Evidence |
|---|---|---|
| Independent Conversation Lifecycle Settings | Implemented and verified on isolated Windows Desktop | A native Settings entry uses the approved Lifecycle glyph. Overview, Retention Policy, Protected Conversations, and Cleanup Management are grouped inside the native Settings shell. Disabling Lifecycle removed its entry. |
| Inventory, protection, and preview | Implemented and verified on isolated Windows Desktop | The fixture showed known and archived counts, an explicit unavailable storage value, a previously protected row, and a read-only preview with zero estimated candidates. The regression fixture exercises archived and eligible rows as well as active and Direct Chat exclusions. |
| Global and Workspace retention | Implemented and verified on isolated Windows Desktop | The 30-day global policy remained distinct from a confirmed 90-day fixture Workspace override. Native file-backed Settings preserve policy and protection. Supported choices are Keep forever, 365, 180, 90, 30, and 7 days. |
| English product UI and metadata | Implemented and verified on isolated Windows Desktop | With the fixture's Harness language set to Arabic, all three new Plugins rows showed English product names and descriptions. Lifecycle Settings and the reasoning menu were English. The native Plugins inventory rendered all three approved component icons. Published Hub display is deferred. |
| Adaptive Reasoning composer | Implemented and verified on isolated Windows Desktop | One native toolbar control beside the model selector opens a native menu. It shows the effective session effort and saved preference separately. Manual selection, save, apply, and removal are available. Disabling the plugin removed the control and preserved the native model picker and saved preference. Adaptive Reasoning has no Settings section. |
| Effective manual effort and session isolation | Tested against native services and verified on isolated Windows Desktop | The native service test exercised independent sessions and provider-advertised values. Desktop sent explicit `low` and `max` through the DeepSeek adapter while the fixture's global default remained `high`. The current `max` effort and saved per-model preference persisted through restart. |
| Adaptive and next-message effort | Blocked | A reliable message-bound pre-capture admission contract remains missing. The composer presents only the selected model's advertised effort values and preference actions. |
| Direct Chat | English metadata and icon verified. Conversation functionality and Settings blocked | Both candidate placements require fail-closed Host ownership across creation, reuse, resume, and tool and native action admission. No production session producer or Settings placeholder was added. Native streaming, native model selection, and independent history depend on that admission. |
| Direct Chat transcript and attachments | Native transcript storage planned for initial activation. Custom path, migration, generic file intake and deletion remain gated | A future Direct Chat Settings section should show the actual native storage location and approved preview retention. Custom storage and Delete All Direct Chats depend on their own contracts. Image handling and web search require verified restricted admission. |
| Permanent deletion and automatic cleanup | Blocked | Individual and bulk deletion, deleting all conversations in one Workspace, and deleting all Workspace conversations remain acceptance requirements. The UI exposes estimates and execution status. Retirement, complete native artifact enumeration, and restart-safe metadata reconciliation remain missing. |

## Windows evidence

The packed suite was staged in the existing unpackaged Windows `0.2.2-rc.3` fixture from upstream tag `38a6a5c`. Electron user data, Harness home, the synthetic Workspace, and the loopback provider were isolated. The fixture's Arabic language registration tested English plugin output without changing the Suite or Harness language registry. Signed installer and published Hub behavior remain outside this run.

- [Conversation Lifecycle Settings in light mode](../assets/new-plugins/desktop-ui-correction/lifecycle-light.jpg)
- [Conversation Lifecycle Settings in dark mode](../assets/new-plugins/desktop-ui-correction/lifecycle-dark.jpg)
- [Cleanup preview and execution status](../assets/new-plugins/desktop-ui-correction/lifecycle-cleanup-preview.jpg)
- [Narrow Settings with keyboard focus on global retention](../assets/new-plugins/desktop-ui-correction/lifecycle-narrow.jpg)
- [Compact reasoning control beside the model selector](../assets/new-plugins/desktop-ui-correction/reasoning-composer.jpg)
- [Expanded reasoning menu](../assets/new-plugins/desktop-ui-correction/reasoning-menu.jpg)
- [English names and descriptions with the original icons](../assets/new-plugins/desktop-ui-correction/plugins-english.jpg)

The native DeepSeek Messages adapter sent the following values to the synthetic loopback server for `deepseek-official / deepseek-flash`. These are the conversation requests, excluding the auxiliary title call.

| Action | Adapter payload | Fixture global default |
|---|---|---|
| Select Low in the composer | `output_config.effort = low`, `thinking.type = enabled` | `high` |
| Apply saved Max to the same session | `output_config.effort = max`, `thinking.type = enabled` | `high` |

After restarting Desktop and the Host, the composer showed `Max` as both the session effort and saved per-model preference. Lifecycle restored the 30-day global policy, the 90-day fixture Workspace override, and protection on `Desktop Alpha Baseline`. The 622 × 821-pixel window screenshot shows the retention selectors stacked, the metrics wrapped, and visible keyboard focus on the global retention selector. The native navigation rail truncates the section label at this size. The page heading displays the full name and the cleanup section is reachable by scrolling.

The extension uses `conversation.input.right` and the Harness `Menu` and `Toast`. The stock model picker remains available. Harness's stock `selectModel` call also persists the global default. The new control uses the existing owner-only route with an explicit manual operation and checks the current session, exact model, adapter-supported effort, and selection changes during validation. Applying a saved value still requires the current matching stored preference. [Composer slot](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/client/ui-conversation/src/client/skeleton/InputBar.tsx#L537-L544) · [Native model-selection behavior](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/api/session-controller/src/commands.ts#L163-L192)

## Direct Chat placement

| Dimension | Native Workspace-free session | Automatically managed internal Chat Workspace |
|---|---|---|
| Creation and compatibility | Native `session.create` accepts an explicit `cwd` without a Workspace. Omitting both falls back to the Host's default directory. The independent Direct Chat history would need a durable ownership catalog and its own navigation over existing native conversation components. | Native creation can use a registry Workspace and its canonical directory. It creates the Session before attaching membership, so failure to attach can leave a durable unassigned Session. Native Workspace browsing and archive behavior are available, with ordinary Workspace surfaces able to show the internal group. |
| Ownership and security | With no Workspace membership, a positive and durable Direct owner record is essential. A controlled empty directory can limit accidental context. The Host still needs mandatory checks at create or reuse, preset switch, resume, first message, terminal and filesystem entry points. | Membership is separate from Agent authority and can be reassigned. A private directory can help avoid mixing project files into chat, while tool guards, native commands, permissions and restart admission still need ownership-bound enforcement. The internal Workspace has no authority to enforce these requirements. |
| Storage and maintenance | Uses the deployment's native JSONL provider. The selected artifact can be reported from native metadata when available. Direct retention and inventory would remain independent of Workspace Lifecycle. | Uses the same native provider with Workspace location as the working-directory grouping. Adds Workspace registry and membership recovery, archive and pin interactions, exclusion from Workspace cleanup, and handling of missing or renamed internal directories. Neither placement creates a per-session destination or a safe permanent-delete contract. |

Keep the Workspace-free design as the preferred candidate once mandatory native ownership exists. It fits one-click creation and independent history with less coupling to ordinary Workspace accounting. The earlier synthetic restart reproduced the security blocker for both designs. An Agent-scoped mask and guard survive preset and model changes while their policy is loaded, and a Host without that policy can still resume the session with inherited tools. The Host's separate file actions and command admission also require verification. [Session create and attach order](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/api/session-controller/src/commands.ts#L120-L160) · [Stock resume](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/api/session-controller/src/agent.ts#L275-L315) · [Ownership and offline deletion evidence](NEW_PLUGINS_PHASE_C_CONTINUATION.md)

The pinned upstream review covers public `0.2.2-rc.5` at `9c2670d` and upstream `master` at `2e39e70`. The required deletion, maintenance, storage, message admission and ownership contracts remained unresolved at those refs. The current round reused that evidence and ran the focused native Settings, reasoning and ownership checks. [Public compatibility matrix](NEW_PLUGINS_PHASE_C_CONTINUATION.md#public-harness-compatibility)

## Shared files

Git metadata placed the Phase 7D refs at `2c475f9`, an ancestor of the correction branch. `client.js` is the only file this correction shares with that Phase 7D integration. Phase 7D changed the installed-version constant, while this correction changes new-plugin UI and its roster. Across the full feature branch the other shared file is `package.json`, where the feature adds new-plugin exports after the Profile exports. Phase 7D changed the version and description near the top of the manifest. The observed edits are disjoint. Any further shared-file edits should preserve the existing roster, exports and release metadata. Review used Git refs from the assigned worktree.

## Tests and changed files

- `npm test` and `npm run check:package` passed 164 tests each. The packed check verified 60 files.
- Seven focused checks passed against the installed Harness build's extracted native runtime, including profile persistence, effective manual and saved effort, restricted tools, Direct Chat ownership lifetime, and the pre-step capture boundary.
- `7ac1c8a` adds independent Lifecycle Settings and English metadata. `017dbc2` moves the reasoning controls into the native composer and adds Host validation for manual session effort.
- Product code changed in `client.js` and `plugins/adaptive-reasoning/index.js`. The three new plugins' `locale/en.json` files contain their English metadata and their previous `locale/ar.json` files were removed.
- Verification changed in `test/new-plugins-settings.test.js`, the shared browser fixture `test-support/client.js`, and `qa/new-plugins-host-check.mjs`. This report and the screenshots under `docs/assets/new-plugins/desktop-ui-correction/` record acceptance evidence.
- The diff against `12a45c9` preserves all Personal Profile, Environment & Context, Humanizer, and approved icon files. The shared browser changes are limited to new-plugin rendering and registration. Concurrent Personal Profile refs were inspected using Git metadata only.
