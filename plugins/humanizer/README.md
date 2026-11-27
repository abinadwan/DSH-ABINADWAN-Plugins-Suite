# Humanizer

**Enabled by default.**

<img src="icon.png" width="96" alt="Purple Humanizer writing pencil"/>

## Humanizer Skill — use it

Enable Humanizer under the suite's Components, then ask the agent to use **abinadwan-humanizer** or **Humanizer** for a writing task. Supply the text and any audience, tone, language, length or format preferences.

> Use Humanizer to edit this email into concise, professional English. Preserve every date, number and commitment.

> استخدم Humanizer لتحرير النص التالي بأسلوب عربي واضح، مع الحفاظ على المعنى والأسماء والأرقام والمصادر.

> استخدم Humanizer لإعادة صياغة النص بلهجة نجدية خفيفة مناسبة لجمهور الرياض، مع الحفاظ على الحقائق.

DSH's normal Skill discovery advertises the skill to the agent. The model can load it through the existing Skill tool. User-facing invocation is allowed through whichever Skill surface the installed DSH profile exposes. Naming the skill in the request works without relying on a particular slash-command UI.

## Runtime behavior

The Host subpath `@abinadwan/dsh-plugins-suite/humanizer` injects `skills` and registers the packaged instruction body using `ctx.skills.register()`. The public name is `abinadwan-humanizer`, source is `runtime`, and model/user invocation are allowed. Cordis owns the registration lifetime. Disabling the Component removes future discovery and loading, while previously loaded instructions remain in conversation history.

The instructions preserve facts, uncertainty, citations, source language and author voice, apply requested tone or dialect, remove filler, and require a fidelity check. Embedded source instructions are treated as editing material. The skill prohibits detector-score optimization, detection-evasion promises, invented personal experience and false human-authorship claims.

Automatic response interception, persistent style settings and background rewriting remain future work. The selected model produces revisions. The plugin provides guidance and adds zero dedicated model or external rewriting calls. Supplied text follows the user's existing DSH model/provider configuration.

## Humanizer Studio (v1.2.0 — unreleased candidate)

The same Humanizer component includes a standalone editing workspace, separate from agent conversations. Enable Humanizer and open **Humanizer Studio** below **Automation tasks** in the native DSH sidebar when the required Host services are available. The original Skill remains independently usable on Hosts without Studio's Connection/LLM services; there is no second component or separate installation.

### Editing workflow

1. Choose a configured local or cloud model from DSH's native catalog. Studio selection does not change the active conversation model.
2. Choose the source and result languages (automatic source detection and preservation are available where applicable; translation requires an explicit target).
3. Select an operation and enter the source text. For Custom, also provide the editing brief.
4. Process the text, review the read-only result and copy it explicitly. The source remains editable; use Clear to reset the editors or process again to replace the result.

| Service | Purpose |
| --- | --- |
| Humanize | Improve naturalness while preserving meaning |
| Rewrite | Rephrase faithfully |
| Improve Style | Improve cohesion and readability |
| Professional | Adapt the text to a professional tone |
| Proofread | Correct spelling and grammar without unnecessary rewriting |
| Shorten | Remove redundant phrasing |
| Expand | Elaborate without inventing facts |
| Translate | Translate to the selected target language |
| Custom | Follow the supplied editing brief |

### Controls and model behavior

- Reasoning effort appears only when the selected model advertises native effort choices; Model Default delegates to the native default. Changing models resets the selection. No invented effort tiers.
- The result is read-only, but supports selection and copying. Source and result have explicit copy controls; a failed clipboard operation offers manual copying.
- Elapsed time includes client transport, Host and provider processing. It is not tokens per second, ETA or proof of effective provider effort. Cancellation suppresses late results but cannot guarantee a provider stops or retracts submitted data.
- Candidate limits: 12,000 source, 2,000 custom brief and 24,000 result UTF-16 code units. These are not a guarantee of model context capacity.
- Model quality varies with the provider, model and task. Review facts, terminology, citations and conditions.

### Privacy and saved items

Studio uses owner-only native HTTP routes and bounded one-shot native LLM requests without a Session identity or tools. Source and custom brief are separate from fixed system instructions. Text remains in component memory by default, with no automatic saving. The explicit Profile-local saved-items controls support one draft and up to ten history items; opening, saving, restoring and deleting are deliberate actions. Delete all requires confirmation. Restoring does not call the model. Editor Clear does not delete saved items. Saved text is plaintext; disabling the component does not delete saved records, and deletion is logical rather than secure erasure. OS clipboard may retain copied text. Host middleware and the selected provider can observe submitted inputs and may retain them. Avoid sensitive text unless the provider and Host retention policies are appropriate.

### Verification and release status

The original code candidate `6afb0e2` passed CI 5/5, all nine services have at least one successful owner-run sample, and HS-BUG-003 passed the eight focused owner Desktop acceptance checks. These are scoped results, not comprehensive privacy or release approval. See the [branch acceptance report](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/blob/feature/v1.2.0-humanizer-studio/docs/plugins/humanizer-studio-acceptance-report.md) for remaining gates. The published stable release remains v1.1.3 until authorized promotion.

## Licensing

The instruction body was written for this project and is distributed under the suite's MIT License. No third-party Humanizer implementation or prompt was copied or adapted. Future reuse must preserve the source's applicable license and attribution. [Instruction body](SKILL.md) · [MIT License](../../LICENSE)

## Verification

Tests use the actual DSH Skill registry to discover/load the packaged body, dispose it, and register it again. A real Cordis Loader test toggles the Host Component independently. Editorial quality remains dependent on the model and supplied brief.

[Suite overview](../../README.md)
