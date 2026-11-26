# Humanizer Studio — unreleased v1.2.0 engineering checkpoint

This is a development record, not a shipped feature or a claim that all privacy paths have passed. The stable release remains v1.1.3. Preserve the existing Humanizer Skill identity and default activation. Do not modify the DSH Host source.

## Native contracts reviewed

- [LLM service and identity-free inputs](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c/packages/llm/llm/README.md): one-shot native provider calls, no durable user-message identity needed for an auxiliary input. Logged session requests remain reconstructable from the session log.
- [LLM implementation and middleware tests](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c/packages/llm/llm/tests/service.spec.ts): the native waterfall can inspect a request, route mutable options and short-circuit output. Studio freezes its own request data; freezing is not confidentiality, interceptor sandboxing or proof that middleware will dispatch to the expected adapter.
- [Connection contract](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c/packages/client/connection/README.md): authenticated exact Fetch routes require owner Peer; streaming body handlers own their own byte limits and cancellation. The candidate route module exercises that boundary in the native fixture; it is now wired to the Humanizer component on the candidate branch when native services are present.
- [Locale catalog](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c/packages/client/locale/src/client/index.ts): selectable language definitions and revision live in the Client, while the Host locale package registers the preference. Do not treat browser-provided catalog data as authorization. Keep language IDs separate from system instructions.
- [Automation tasks registration](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c/packages/client/ui-schedule/src/client/index.ts): native panel order 10. Candidate Studio order 11 via sidebar.panellist and keyed main registration; confirm actual displayed placement against installed Desktop and other extensions. No DOM injection.
- [Session telemetry](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c/packages/session/session-telemetry/src/index.ts) and [feedback export](https://github.com/deepseek-ai/deepseek-harness/blob/38a6a5c/packages/session/session-telemetry-otel/src/index.ts): session-ledger capture and feedback export are distinct from a session-free auxiliary request; source review alone does not establish absence from all diagnostics, browser/network logs, provider traces, caches or third-party middleware.

## Internal implementation and tests

Nine service templates, fixed system constraints, identity-free JSON user input, independent model catalog check, selected locale IDs, cancellation guard, text-only terminal result, no tool execution, no storage calls, sanitized errors. Conservative development limits: 12,000 source UTF-16 code units, 2,000 custom brief code units, 24,000 output code units and requested maxTokens 4,096. These are candidate limits, not a model context-window guarantee or a finalized UX setting.

Native admission and observer fixtures use only synthetic text; no actual credentials or provider connection. Candidate HTTP module implements status/edit, strict streamed JSON cap of 96 KiB, non-cacheable replies, one active request per fiber, request/disposal/120-second deadline signal, and sanitized failures. The Host checks language ID syntax; live catalog membership is a Client UX check. A non-cooperative provider can hold the active slot after cancellation. Candidate Studio panel and routes are wired to the existing Humanizer component. Global catalog reads use native session.modelCatalog() without a Session identity; selection is transient and does not call session.selectModel. Page source/result are component memory only and clear on unmount or Host generation change. Opt-in history and drafts remain unimplemented. CI evidence must be evaluated against its exact commit.

## Remaining gates

- Validate wired owner-only route and page in native CI; verify connection lifetime in Desktop. No text in logs; no silent retry, hidden Session or direct provider fallback.
- Installed DSH Desktop tests using synthetic sentinels, inspect session store, app diagnostics, browser storage, network/provider behavior, disable/reload/cancel and actual navigation placement. Provider-side retention cannot be guaranteed by this suite; present accurate warning before submit.
- Verify real editing behavior for all nine operations in supported local models; request separation is not proof of semantic instruction adherence.
- Validate candidate native sidebar and Workspace Studio UI, dynamic locale/model selection and RTL/LTR; implement opt-in history and drafts with default ephemeral and explicit clear. No data at rest until user opts in.
- Phase 3.7: strict distribution inventory/exports and advisory review; release/update trust and repository rule details. Existing branch protection details inaccessible with current integration. Do not merge or publish before acceptance.
