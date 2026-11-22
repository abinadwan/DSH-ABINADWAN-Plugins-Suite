# Humanizer

**Runtime Skill available in suite 0.5.0. Enabled by default.**

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

## Licensing

The instruction body was written for this project and is distributed under the suite's MIT License. No third-party Humanizer implementation or prompt was copied or adapted. Future reuse must preserve the source's applicable license and attribution. [Instruction body](SKILL.md) · [MIT License](../../LICENSE)

## Verification

Tests use the actual DSH Skill registry to discover/load the packaged body, dispose it, and register it again. A real Cordis Loader test toggles the Host Component independently. Editorial quality remains dependent on the model and supplied brief.

[Suite overview](../../README.md)
