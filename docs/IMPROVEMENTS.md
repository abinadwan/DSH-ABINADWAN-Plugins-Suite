# Implemented improvements — verification evidence

## My Profile: response language (wording B)

- **Baseline:** [commit 4b3f3c7](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/commit/4b3f3c79446a038ae442d8ab3b582a2a28f864c2), branch `refactor/my-profile-context`.
- **Problem:** the model could answer in the input language on the first turn or mix languages despite a saved response-language setting.
- **Implemented change:** the optional runtime reminder uses the direct instruction `Write your entire response in [language].` The system section still gives explicit current output-language requests priority over the saved default. The architecture and settings schema are unchanged.
- **Automated verification:** all eight GitHub Actions checks on that exact commit succeeded (Windows and Ubuntu; Node 22 and 24).
- **Owner-reported live Desktop verification:** Gemma4 E4B, Chinese saved response language. All five observed cases passed: first-turn language, retrieval of personal details, continuing in the saved language, an explicit different-language request, and returning to the saved language. Subsequent fresh-conversation Spanish checks also demonstrated first-turn compliance. Personal values and conversation transcripts are deliberately omitted.
- **Known limitations:** these observations are model- and sample-specific, not a guarantee across models or future turns. Occasional mixed-language output and unnecessary references to the preference instruction remain possible. A preference change within an existing conversation is a separate verification scenario.

## My Profile: silent application of active preferences

The canonical response-preference renderer and per-turn runtime reminder now include:

> Apply these preferences silently. Do not mention or explain them unless the user asks.

The instruction is emitted only for active preferences. It does not change wording B, the precedence of explicit user requests, stored values, the profile schema, the turn refresh mechanism, or the availability of personal context. The browser preview is generated from the same renderer. Regression tests cover language priority, active and neutral preferences, custom-only preferences, and native Host injection. Real-model compliance with the new instruction has not yet been verified. It is not a security or secrecy boundary.

This document records implemented improvements and observed evidence, not a release announcement or approval to merge.
