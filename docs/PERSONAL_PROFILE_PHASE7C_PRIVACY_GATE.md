# Phase 7C — privacy enforcement: fail-closed subset

Status: merged fail-closed implementation; **structured disclosure blocked**, not full Phase 7C acceptance. Based on Phase 7A research (merged PR #19) and Phase 7B candidate (PR #20). Target Host 0.2.2-rc.3 pinned at 38a6a5c965aa99ab525161efb7cc5cf1fe62fced.

## Contract

No structured field (preferred name, nationality, gender) is rendered, sent through a tool or requested by an approval prompt, irrespective of master switches, individual policy or presumed local/cloud status. This uses the existing allowlisted preference renderer; no second disclosure path is added. The UI explicitly explains that even Allow is not active; saved grants are not silently converted, deleted or promoted. Free-form custom text is a separate explicit user-authorized channel; it is not a privacy classifier and history may retain it. No retroactive deletion or independent provider trust guarantee is claimed.

| Master | Field policy | Destination | Result today |
|---|---|---|---|
| Off | any | any | omit |
| On | Private | any | omit |
| On | Ask First | any | omit, no ineffective approval |
| On | Allow | any | omit, even if cloud switch is On |

## Evidence and blocking conditions

- [Session contract](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/docs/subsystems/session.md): append-only event log, derived replayable messages, system prompt stored as message.
- [SystemPromptProjection](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/core/agent-loop/src/runtime-context.ts#L66-L120): in-history nonempty changes can retain prior system messages. Even normalized system messages cannot remove the original event or assistant-derived disclosures.
- [Agent Loop request admission](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/packages/core/agent-loop/src/agent.ts#L730-L747): request is reconstructed from session-derived messages and frozen. No supported last-mile redaction.
- [LLM streaming contract](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c965aa99ab525161efb7cc5cf1fe62fced/docs/subsystems/llm-streaming.md): adapter endpoint metadata is advisory; no general verified local-only destination.
- Native approval does not solve replay, route changes, retries, compaction or plugin disable. Do not implement a misleading approval UI or use localhost as trust proof.

## Verification

Added unit matrix covering all 108 combinations (two master switches, three policies for each of three fields), checking exact equality to baseline preferences. Extended real pinned Agent Loop offline-adapter fixture with all three synthetic field markers, 12 combinations of uniform field policy/master/cloud state, two routes per combination, session log assertion and disable check. These are negative tests only; no positive disclosure or proof of privacy for manually typed custom text. PR #21 CI passed on Windows/Linux Node 22/24 before integration. Windows Desktop functional review is now recorded in the [Phase 7 acceptance record](PERSONAL_PROFILE_PHASE7_WINDOWS_ACCEPTANCE.md). Actual Desktop request inspection and route-change evidence remain open; no inference of request privacy from model replies.

## Required upstream capability before positive disclosure

A destination-bound, non-durable admission contract or supported host-managed isolation mechanism that prevents replay of restricted information and derivatives across permission changes, retries, compaction and provider switching, including when the plugin is disabled; a trustworthy route classification; and a native one-use approval contract with the same bound destination. Alternatively the product owner may explicitly approve a weaker prospective-only disclosure contract after reviewing consequences, but that is not the original privacy guarantee and is not implemented here.

The candidate baseline may be merged independently of positive disclosure; no stable release approval is implied. No host modification or third-party transport is introduced. Phase 7C positive disclosure remains NO-GO; see [Phase 8 plan](PERSONAL_PROFILE_PHASE8_PLAN.md).
