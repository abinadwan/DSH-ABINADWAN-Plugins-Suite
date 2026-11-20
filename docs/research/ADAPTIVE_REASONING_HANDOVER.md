# Adaptive Reasoning: Completion Handover

Branch `feature/adaptive-reasoning-completion`, rebased on local `integration/suite-v0.8` at `656eedc` (it contains `687a936`). Local commits only. Nothing is pushed, merged or released.

## Status

| Area | Status |
| --- | --- |
| AR-1 next-message override (Host binding, apply, restore, outcomes) | **Production-ready.** Verified on the native rc.3 and rc.5 loop. |
| AR-1 composer flow (arm, indicator, cancel, bind by requestId, outcome toast) | **Production-ready in code and unit tests.** It was not driven in a real Desktop window (see "Blocked"). |
| AR-2 Adaptive mode (local classifier, declared-effort mapping, precedence) | **Production-ready, opt-in.** The default is Manual. |
| AR-3 subagent policy (inherit, provider default, adaptive, explicit effort) | **Experimental.** Verified only for in-process children created through the native Agent registry. Not applicable to out-of-process providers. |
| AR-4 statistics (local aggregate counters, native dialog, reset) | **Production-ready.** In memory only, with no estimates. |
| Real Windows Desktop screenshots (light and dark) and loopback wire capture | **Blocked.** Desktop control access was declined. The fixture is prepared (see "Desktop acceptance"). |

## How it works

**Host (`plugins/adaptive-reasoning/`).**

- `index.js` holds the config schema and the owner-only routes. Every route is POST with strict JSON and exact keys:

  | Route | Purpose |
  | --- | --- |
  | `/api/abinadwan-reasoning/effort` | Manual session selection or applying the saved effort (unchanged). |
  | `/next` | Bind `{sessionId, requestId, provider, model, reasoningEffort}`. |
  | `/next/status` | Outcome by requestId. It never reveals other sessions. |
  | `/next/withdraw` | Withdraw an unclaimed binding. |
  | `/stats` and `/stats/reset` | Read or reset the counters. |

- `efforts.js` (`MessageEfforts`) listens to native Agent events:
  - `agent/inbox/inserted`, `claimed` and `discarded`
  - `agent/status`, `agent/created`, `agent/disposed`
  - `agent/assistant-stream`, `session/event`

  It selects only through `agent.model.select()`, inside `agent/inbox/claimed`, which runs before the loop captures the step's selection.
- `classify.js` is the deterministic classifier and the tier-to-declared-effort mapping.
- `stats.js` holds the counters. `http.js` handles strict request bodies.

**Precedence for one root message, as implemented:**

1. The next-message override bound to that message's requestId.
2. The session's own effort in Manual mode.
3. The local classification in Adaptive mode.
4. The route's single saved preference, when the session is still on the native default.
5. The native Harness default.

Levels 1, 3 and 4 last one message. The session's recorded effort returns at the next user message or at idle, unless the selection changed meanwhile, in which case the manual change wins. Global Harness defaults are never written, and effort is never simulated through prompts.

**Composer (`client.js`, `ReasoningComposer`).** This is the existing compact control in `conversation.input.right`. Its native Menu now holds:

- Mode (Manual or Adaptive)
- Current session efforts
- A **Next message only** submenu, with **Cancel one-time effort** while armed
- The saved-preference actions
- A **Subagents** submenu
- **Reasoning statistics…**, which opens a native Modal

The trigger shows `Next: High` while armed and `Auto · <effort>` in Adaptive mode. The aria-label states both. Toasts report each outcome.

**Binding by requestId.** While armed, the component wraps `ctx.sessions.binding(sessionId).session.prompt` as an own property on that window's session face.

- The first prompt consumes the wrapper before awaiting anything.
- It mints a requestId if the caller passed none (as an empty retry does), POSTs `/next`, then calls the native `prompt` with that same requestId.
- A refused binding still sends the message and reports "not applied".
- A failed send withdraws the binding.
- After an accepted send, the component follows `/next/status` on session snapshot changes until a terminal outcome.
- A model change, or an effort the model no longer offers, cancels the armed effort and says so.
- The armed state belongs to this composer instance. Other windows and other chats never see it.

## Native contract verification

`qa/adaptive-reasoning-host-check.mjs` mounts the real Host plugin on the real Agent loop, with a scripted offline adapter. Each assertion reads the effort of the request the loop actually built (`GenerateOptions.reasoningEffort`). Results: **8/8 on rc.3, 8/8 on rc.5.**

- **Routes.**
  - Viewer → 403, malformed → 400, unsupported → 422, stale route → 409, duplicate → 409.
  - Disabling the plugin removes the routes (404).
  - The Agent id equals the session id.
- **Queue and windows.** A queued prompt from another window does not consume the override. The bound message keeps its effort across a real tool step and an `agent/request-error` retry. The next message returns to the session effort.
- **Regeneration.** A finished requestId cannot be rebound. A `retry`-kind prompt with its own requestId takes a new binding.
- **Mid-turn changes.**
  - A manual change mid-turn wins and is not reverted (`restored: false`).
  - Steering joins at the next step with its own binding.
  - `cancel()` restores the running override and reports the queued bound prompt as `discarded`.
  - A withdrawn binding never applies, and a route change before the claim reports `route-changed`.
- **Plugin dispose mid-turn.** The captured request keeps its effort, the session effort is restored, and the next request uses it.
- **Adaptive mode.** Simple → `fast-v2`, standard → `balanced-v2`, advanced → `deliberate-v2`, restoring after each message. An override outranks Adaptive.
- **Saved preference.** It fills a native-default session for that message only (the record stays undefined). A manual effort outranks it.
- **Subagent.**
  - Under policy `effort`, an in-process child created with `origin: 'subagent'` sends the policy effort, while the parent's request and selection are unchanged.
  - A subagent session cannot bind a root override.
- **Statistics.**
  - Requests are counted by the effort in the logged request header, with input and output tokens.
  - Each committed request is timed from its stream start (`attemptId` → committed `seq`).
  - `reasoningReported` stays 0, because the adapter reports none. Prompt text never appears.
  - Reset clears everything.

Contracts read from rc.3 source:

- `agent/inbox/claimed` is emitted in `Inbox.claim()` before `preStep` captures `model.current()`.
- A child's task arrives with source kind `user`; later parent messages use `agent-message` (`dsh-subagent` manager).
- Retries reuse the frozen step selection (consistent with discussion #13698).

## Compatibility matrix

| Layer | rc.3 | rc.5 | Newer |
| --- | --- | --- | --- |
| Native Host runtime (events, select, routes, subagent registry) | Verified (native check) | Verified (native check) | Expected. It uses only public plugin APIs, so the native check should be re-run on each release. |
| Client composer (Menu `submenu`, `selectedIds`, Modal, Toast) | Matched against rc.3 primitive source; unit-tested | **Not verified.** The rc.5 extraction holds no client packages. | If `Modal` is missing, the statistics item hides. If `submenu` is missing, the Next message and Subagents rows do nothing. |
| Full Desktop (rc.3 Electron dev build, isolated profile) | The packed suite boots in the isolated AR profile. The UI was not driven. | Not tested | Not tested |

## Provider compatibility

| Provider or route | Behaviour |
| --- | --- |
| DeepSeek (`dsh-llm-deepseek`), efforts `off`, `low`, `high`, `max` | Adaptive maps simple→off, standard→low, complex→high, advanced→max. The wire mapping comes from source (`serialize.ts`): `off` → `thinking.type: disabled`, others → `thinking: enabled` plus `output_config.effort`. The loopback wire capture is still pending (blocked). |
| Any adapter that declares efforts | Only the declared ids are offered, bound or mapped. Declared order is read as ascending. |
| Model without declared efforts | The composer control hides. Adaptive and policies do nothing; the stats record `no-reasoning`. |
| Out-of-process subagent providers (codex, claude-code, acp, dsh-sdk) | Not Host Agents. Subagent policy cannot reach them, and no contract exists. |
| Thinking disabled on DeepSeek (only `off`) | Every tier maps to `off`. |

## Classification benchmark and performance

`node qa/adaptive-reasoning-benchmark.mjs` runs 57 hand-labelled synthetic prompts, 12 to 15 per tier, from the corpus in `test-support/reasoning-benchmark.js`.

- **Accuracy:** 98.2% (56 of 57). No miss is off by two tiers.
- **Caveat:** the corpus was used to tune the rules, so this figure is **in-sample**.
- **The remaining miss:** "weekly vegetarian meal plan" is labelled standard and classified simple.
- **Latency (Node 24.21.0):** p50 0.82 µs, p95 1.06 µs, p99 1.77 µs per call. A 16k-character input with 50 code fences takes about 75 µs.
- **No LLM or network call is made.** Text is read in memory and never stored.

The unit test enforces accuracy ≥ 90%, zero off-by-two misses and p99 under 1 ms.

## Statistics method

- **Counters:** messages by deciding source, Adaptive tiers, classifier runs and time, one-time outcomes by reason, subagent policy outcomes, and requests by `{scope, logged effort}`.
- **Request data:** input tokens (including cache read and write), output tokens, `totalTokens` only when reported, `reasoningTokens` only when the adapter reports them, and Host-clock duration from first stream frame to committed `assistant/message`.
- **What is never stored:** no prompts, replies, session ids or credentials. Effort-id keys go into prototype-free tables, capped at 64.
- **Lifetime:** process memory only. It resets with Harness or **Reset statistics**. There is no remote telemetry.
- **No savings claims.** The DeepSeek adapter reports no reasoning tokens, and the dialog says "Not reported".

## Reference review

All four repositories are MIT-licensed. Source and READMEs were read; no code was copied.

- **`zhuifengqug/dsh-adaptive-reasoning` (v2):**
  - What it is: a capability-aware effort slider that writes `session.selectModel` live, plus an opt-in models.dev enrichment that writes `llm-pi-ai` declarations.
  - Classification: none. "Adaptive" here means it adapts to the declared levels.
  - Adopted principle: offer only the model's declared efforts.
  - Rejected:
    - the duplicate selector UI;
    - remote catalog fetches;
    - writing provider declarations.
- **`HaoyueQin/dsh-better-reasoning-effort`:**
  - What it is: a Models-page effort and modality editor, plus a composer slider that replaces the official model menu body. It also has a per-model default effort that every new session starts on.
  - Rejected:
    - replacing the official menu, which the spec forbids as a duplicate model selector;
    - mutating new sessions.
  - Our saved preference applies per message to native-default sessions, without writing the session record.
- **`Neptune810/dsh-model-router`:**
  - What it is: per-step routing on the `agent/inbox/claimed`, `agent/pre-step` and `agent/request-error` seams, with an effort ladder and `explainMapping`.
  - Its `classifier2.js` asks a model for a JSON verdict behind a circuit breaker. That is an LLM call, which this spec rules out.
  - Adopted: the claimed boundary. It was already proven in Phase D3.
- **Discussion #3008 (`AgentOptions.reasoningEffort`).** rc.3 already carries `reasoningEffort` in child `AgentOptions`, inheriting the parent's latest request-header effort. Our subagent policy selects on the child Agent itself.
- **Discussion #13698 (mid-retry model switch ignored).** This confirms that a step's selection is frozen across retries. It is why an override survives retries and a mid-turn manual change takes effect from the next step.

## Limitations

- **Hard Host crash mid-turn.** A one-time, Adaptive or saved-preference effort can remain as the session's recorded selection, because `model/selection` is durable and the plugin has no schema-free durable journal. A graceful plugin disable or Host shutdown restores it.
- **Host restart while an override is pending.** Bindings live in memory, so `/next/status` returns `unknown` and the composer reports "not applied". A stale override never applies.
- **Shared steps.** If two user messages are claimed in one step, a bound override is reported `not-applied: shared-step`. Adaptive serves the step's most demanding message.
- **Cold routes in Adaptive mode.** The first message on a route whose capability is not yet cached uses the session effort. Capability is resolved on Agent creation, on bind, and on each `model/selection`.
- **Event volume.** One-message efforts write two `model/selection` events per affected turn (select, then restore).
- **Subagent policy scope.** It reads the parent route's efforts in the composer. The Host validates against the child's own route and records `unsupported` or `capability-unknown`.
- **Composer mount lifetime.** The armed effort ends if the composer unmounts, for example on navigation away. It is never carried to another chat.

## Changed files

| File | Change | Shared |
| --- | --- | --- |
| `plugins/adaptive-reasoning/index.js` | Config (`mode`, `subagents`, `subagentEffort`) and new routes | No |
| `plugins/adaptive-reasoning/{efforts,classify,stats,http}.js` | New | No |
| `client.js` | `ReasoningComposer`, statistics dialog, `Modal` import | **Yes.** Only the AR block and the primitives import line changed. |
| `test-support/client.js` | Menu stub renders submenus and `aria-checked`; Modal stub; optional `sessionBinding`; `crypto` in the sandbox | **Yes.** Additive; all 189 tests pass. |
| `test-support/reasoning-benchmark.js` | New benchmark corpus | No |
| `test/adaptive-reasoning.test.js` | New (17 tests) | No |
| `test/new-plugins-settings.test.js` | Updated AR composer test; 4 new composer tests | **Yes** (shared with Lifecycle and Direct Chat tests). Only AR tests changed. |
| `qa/adaptive-reasoning-host-check.mjs`, `qa/adaptive-reasoning-benchmark.mjs` | New | No |
| `qa/new-plugins-host-check.mjs` | One AR expectation: a native-default session now takes the saved preference for that message | **Yes** (shared with Lifecycle). |
| `qa/adaptive-reasoning-desktop/` | Isolated loopback (port 51809) and launcher | No |
| `docs/research/ADAPTIVE_REASONING_HANDOVER.md` | This file | No |

None of these files are touched: Direct Chat, Conversation Lifecycle, Personal Profile, Environment & Context, Humanizer, `cordis.patch.yml` (the AR row stays disabled by default) and `HANDOVER.md`.

## Tests run

- `npm test`: **189/189**.
- `npm run check:package`: packed-artifact tests pass, 64 published files.
- `qa/adaptive-reasoning-host-check.mjs`: 8/8 on rc.3 and on rc.5.
- `qa/new-plugins-host-check.mjs`: 13/13 on rc.3 and on rc.5.
- `test/adaptive-reasoning.test.js`: 17/17 on Node 24.21.0 and on Node 26.10.0.

## Desktop acceptance

The fixture is prepared and isolated:

- **Profile:** `.package-check-dsh/.ar-fixture-harness-home`, with the packed suite from this branch, English and light theme.
- **Electron userdata:** `.package-check-dsh/.ar-fixture-electron-userdata`.
- **Loopback provider:** `127.0.0.1:51809`.

The installed Desktop and the Direct Chat fixture are untouched. The fixture boots. Driving its window was not possible because desktop control access was declined. To finish:

1. Start the loopback:
   ```
   node qa/adaptive-reasoning-desktop/loopback.mjs <abs>/.package-check-dsh/ar-wire.jsonl 51809
   ```
2. Start the fixture:
   ```
   qa/adaptive-reasoning-desktop/Start-ArFixtureDesktop.ps1 -DesktopSource <abs>/.package-check-dsh -Run light
   ```
3. In a chat, arm **Next message only → High**. Confirm the trigger reads `Next: High`, send `AR Alpha`, then send `AR Beta`.
4. Check the wire log. Expect `AR Alpha` with `thinking: enabled, effort: high`, and `AR Beta` with the session effort.
5. Arm **Off** and send. Expect `thinking: disabled`.
6. Open **Reasoning statistics…**.
7. Capture screenshots, switch `ui-theme` to `dark` in the AR profile patch, restart and capture again.

## Local integration

1. In the integration worktree, run `git merge --no-ff feature/adaptive-reasoning-completion`. The branch is already rebased on `integration/suite-v0.8`, so no conflicts are expected.
2. Run `npm test` and `npm run check:package` from PowerShell. Git Bash's tar cannot extract `C:` paths.
3. Run the native checks on both runtimes:
   ```
   ABINADWAN_TEST_RUNTIME=<rc.3 or rc.5 extraction> node --test qa/adaptive-reasoning-host-check.mjs qa/new-plugins-host-check.mjs
   ```
4. Leave the `abinadwan-adaptive-reasoning` row disabled by default. Adaptive mode and subagent policies stay opt-in through the composer.
