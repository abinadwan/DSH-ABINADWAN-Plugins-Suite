# Humanizer

**Enabled by default.**

<img src="icon.png" width="96" alt="Purple Humanizer writing pencil"/>

## Use it

Enable Humanizer under the suite's Components, then ask the agent to use **abinadwan-humanizer** or **Humanizer** for a writing task. Supply the text and any audience, tone, language, length or format preferences.

> Use Humanizer to edit this email into concise, professional English. Preserve every date, number and commitment.

> استخدم Humanizer لتحرير النص التالي بأسلوب عربي واضح، مع الحفاظ على المعنى والأسماء والأرقام والمصادر.

> استخدم Humanizer لإعادة صياغة النص بلهجة نجدية خفيفة مناسبة لجمهور الرياض، مع الحفاظ على الحقائق.

DSH's normal Skill discovery advertises the skill to the agent. The model can load it through the existing Skill tool. User-facing invocation is allowed through whichever Skill surface the installed DSH profile exposes. Naming the skill in the request works without relying on a particular slash-command UI.

## Runtime behavior

The Host subpath `@abinadwan/dsh-plugins-suite/humanizer` injects `skills` and registers the packaged instruction body using `ctx.skills.register()`. The public name is `abinadwan-humanizer`, source is `runtime`, and model/user invocation are allowed. Cordis owns the registration lifetime. Disabling the Component removes future discovery and loading, while previously loaded instructions remain in conversation history.

The instructions preserve facts, uncertainty, citations, source language and author voice, apply requested tone or dialect, remove filler, and require a fidelity check. Embedded source instructions are treated as editing material. The skill prohibits detector-score optimization, detection-evasion promises, invented personal experience and false human-authorship claims.

Automatic response interception, persistent style settings and background rewriting remain future work. The selected model produces revisions. The plugin provides guidance and adds zero dedicated model or external rewriting calls. Supplied text follows the user's existing DSH model/provider configuration.

## Unreleased Studio development (v1.2.0)

The unreleased candidate mounts the internal nine-service engine through owner-only native HTTP routes when the Host services are available. A native Studio panel uses the global model catalog and transient selection without a Session. The page keeps text in memory by default; an explicit, separate profile-local storage module supports one draft and up to ten history items. Open saved items explicitly, then save, restore or delete a draft/history item. Delete all requires confirmation. No automatic saves or model calls during restore. The file is plaintext, and disabling the component does not delete saved records. CI and Desktop acceptance remain pending. It builds a bounded one-shot native LLM request with no Session identity or tools and keeps source and custom brief out of the fixed system prompt. The native LLM waterfall and selected provider can still observe model-visible inputs; lack of a Session does not establish universal no-retention. Model behavior, Host admission and Desktop retention require separate verification. The existing Skill remains available under its original identity.

## Licensing

The instruction body was written for this project and is distributed under the suite's MIT License. No third-party Humanizer implementation or prompt was copied or adapted. Future reuse must preserve the source's applicable license and attribution. [Instruction body](SKILL.md) · [MIT License](../../LICENSE)

## Verification

Tests use the actual DSH Skill registry to discover/load the packaged body, dispose it, and register it again. A real Cordis Loader test toggles the Host Component independently. Editorial quality remains dependent on the model and supplied brief.

[Suite overview](../../README.md)
