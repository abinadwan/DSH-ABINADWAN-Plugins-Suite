# Accessibility statement

Last reviewed: 2026-11-22

## Our commitment

ABINADWAN Plugins Suite is an independent, community-maintained extension for [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness). We want people with different abilities, assistive technologies, language preferences, and input methods to be able to use the suite and participate in the project.

We aim to improve keyboard access, readable labels and feedback, focus behavior, text scaling, color contrast, and right-to-left (RTL) layouts in components that we control. Accessibility reports are welcome as bugs, and accessibility fixes should be evaluated alongside functional and security regressions.

**This is a statement of intent and the current verification scope, not a claim of WCAG conformance or a third-party accessibility certification.**

## Product and environments

- **End users:** the suite runs inside the DSH Desktop application. Its interface uses DSH's native UI extension points and services. Actual accessibility therefore depends on the installed DSH version, its host application, operating system, themes, and any assistive technology.
- **Observed Desktop use:** some functionality has been exercised on Windows Desktop, but the consolidated suite has not undergone a complete hands-on accessibility audit there. We do not claim full compatibility with NVDA, JAWS, Narrator, VoiceOver, or other screen readers.
- **Automated development testing:** the repository runs JavaScript and React/DOM checks, including accessibility-oriented checks in its test setup, on **Windows and Ubuntu with Node.js 22 and 24**. These are **developer CI environments**, not a certification that the Desktop UI works with assistive technology on those platforms.
- **Languages and direction:** English is used across the repository. The bundle includes an Arabic DSH interface locale; some component interfaces provide Arabic and RTL support, while others still use English or fall back to English. Locale availability does not establish full RTL or screen-reader support.
- **Other operating systems:** accessibility on macOS and other DSH Desktop environments has not been independently verified by this project. Consult the host application's own support information.

## Known limitations and unfinished verification

The following areas require additional review or real Desktop testing:

- End-to-end keyboard-only navigation, focus order, focus return after closing dialogs, and operation of menus in both expanded and compact layouts.
- Screen-reader names, roles, announcements, live status messages, and reading order across the suite and DSH-hosted surfaces.
- Color contrast and distinguishable focus indicators under light, dark, high-contrast, and custom DSH themes.
- Text zoom, reflow, small-window layouts, and system scaling.
- Complete Arabic translation, bidirectional text, and RTL navigation in **Direct Chat**, **Chat Control**, and **Adaptive Reasoning**.
- Accessible error, loading, confirmation, and empty-state messages, especially when a Host operation fails or the connection changes.

The DSH host controls parts of navigation, modal behavior, rendering, and OS integration that this plugin cannot independently guarantee. Automated tests do not replace assistive-technology checks on a real Desktop build.

For current component behavior and security/functional limitations, see [component details](docs/DETAIL.md).

## Report an accessibility barrier

Please [open a GitHub bug report](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/issues/new?template=bug_report.yml) (or [browse existing issues](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/issues)). Put **`[Accessibility]`** at the start of the issue title and describe, as applicable:

1. Which component or screen is affected, and what you were trying to do.
2. What happened, what you expected, and how to reproduce the barrier.
3. The suite version or commit, DSH version/build, OS, and input method or assistive technology, if relevant and comfortable to share.
4. A *redacted* screenshot or minimal reproduction if it helps. A screenshot is not required.

You do **not** need to disclose any disability, diagnosis, identity, account information, or personal details to report a problem. **Never post API keys, Profile content, private conversations, credentials, or unredacted logs in a public issue.** For security-sensitive findings, follow [SECURITY.md](SECURITY.md) instead of publishing details.

If the issue form itself is an accessibility barrier, you can use a [new plain issue](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/issues/new) or ask another contributor to relay a non-sensitive report. For concerns that cannot safely be shared publicly, see the contact guidance in [SECURITY.md](SECURITY.md); a private response channel is not guaranteed.

We will triage accessible-use reports as maintainers' availability permits, record known blockers, and document any Host limitations. We cannot promise a specific response time or remediation date.

## Contributing improvements

Accessibility fixes, reproducible tests, translations, and documentation improvements are welcome. Follow [CONTRIBUTING.md](CONTRIBUTING.md), use fictional or sanitized data in examples, and keep upstream DSH behavior distinguishable from code owned by this suite.

## ملخص بالعربية

نهدف إلى جعل إضافات **ABINADWAN Plugins Suite** أسهل استخدامًا بلوحة المفاتيح، وقارئات الشاشة، واللغتين العربية والإنجليزية. لا ندّعي حاليًا اجتياز معيار WCAG أو اكتمال اختبار الوصول على تطبيق DSH Desktop. بعض الواجهات لا تزال بالإنجليزية، واختبارات RTL وقارئات الشاشة تحتاج إلى استكمال.

للإبلاغ عن مشكلة، افتح [بلاغًا في GitHub](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/issues/new?template=bug_report.yml) واكتب **`[Accessibility]`** في بداية العنوان، مع خطوات إعادة المشكلة وإصدار التطبيق إن أمكن. لا تنشر بياناتك الشخصية أو مفاتيح API أو محتوى المحادثات. للملاحظات الأمنية الحساسة راجع [سياسة الأمان](SECURITY.md).
