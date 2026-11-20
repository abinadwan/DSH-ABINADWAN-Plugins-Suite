# Phase 7D — Response preference candidates

Status: **Completed (2026-11-19).** Merged to main in [PR #23](https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/pull/23), merge commit `31b071c`; CI passed on Windows/Linux Node 22/24. L2, S2, G3 and B1w ship in `plugins/personal-profile/preferences.js` and its `client.js` mirror; C2 and U1 were not adopted. Candidates were rendered only in memory by the isolated harness in `qa/phase7d/`, which pins the pre-7D baseline and asserts parity with the shipped renderers.

## 1. Correction of the previous candidate list

The earlier version of this file is withdrawn. Its "candidate instructions" were the **pre-registered scoring rubrics** from the investigation (`rubrics.json`) copied word for word, e.g.:

| Previous "candidate" | Why it is invalid as runtime text |
|---|---|
| Detail (Less): `Provide a shorter, adequate TTL explanation…` | Names the benchmark task (browser cache TTL). Every user with this setting would receive TTL guidance. |
| Critical style: `Challenges every-visitor assumption; identifies capacity/timeline evidence…` | Describes the newsletter fixture, not a style. |
| Critical (More): `Identify meaningful budget risks, sample representativeness issues…` | Describes the two-friends survey fixture. |
| Grill-Me: `…identify a migration/timing risk…` | Describes the registration-migration fixture. |
| Steps / Action / Code Reviewer | Name the fixture topics (migration, campaign, path traversal, sync I/O). |
| Language override `Please answer in English.` | A user prompt used in the test, not an instruction candidate. |

Instructions written from the rubric would score well on the very fixtures that define the rubric, so any measured gain would be circular. They would also inject unrelated content into every conversation. The replacement candidates below are written from the **observed failure mode** of each setting, never from the fixture text. Each is tested on the original fixture (for continuity) **and** on at least one held-out task the wording was not written against.

Other unsupported assumptions corrected in the plan and benchmark documents:

- The prior explicit language wording was not a general improvement. In the prior evidence GPT-OSS English went from 1/2 to 0/2, and Qwen Chinese was 1/2 with one timeout. With tools and context, Qwen dropped to 0/2.
- The "≤5 % prompt expansion" and ">90 % pass on all seven models" thresholds were set before any data existed. They are replaced by measured character deltas and paired comparisons against the current wording.
- `max_completion_tokens` is not dropped by the plugin or the Host. See the benchmark document.

## 2. Candidates under test

`L0`, `H0`, `S0`, `G0`, `C0`, `U0`, `B0` are the current production text (controls).

### Language line (only line changed between L variants)

| Id | Text (`<N>` = English name, `<native>` = native name when it differs) |
|---|---|
| L0 (current) | `Prefer <N> for responses unless the current task requests another language.` |
| L1 (prior explicit) | `Respond in <N> by default. The language of the user's message does not change the selected response language. Use another language only when the user explicitly requests it.` |
| L2 (new) | `Write your response in <N> (<native>) even when the user writes in another language, unless the user explicitly asks for a different language.` |

Automatic remains non-injecting. An explicit language request in the current message must still win (tested for ar/zh/ja/de→English and en→French).

### Precedence header

| Id | Text |
|---|---|
| H0 (current) | `Response preferences (follow the current request and higher-priority host/safety/tool requirements; custom guidance takes precedence over other style preferences where compatible).` |
| H1 | `Response preferences (defaults only: the user's current request overrides them, including exact output, format, length and language; host, safety and tool rules come first; custom guidance overrides the other preferences).` |

Order stays: current user request > custom guidance > saved style/traits/presets. Host, safety and tool rules come above all of them.

### Priority settings

| Setting | Observed failure | Id | Candidate |
|---|---|---|---|
| Creative | Ordinary advice only; "when relevant" lets the model skip it | S1 | `Offer at least one original, non-obvious idea that fits the task, and say briefly why it could work.` |
| | | S2 | `Go beyond the obvious: include at least one fresh, unconventional idea suited to the task.` |
| Grill-Me | Jumps straight to a plan; never asks | G1 | `For complex or high-stakes decisions, first ask the most important clarifying questions about missing requirements and name key risks; give only a provisional recommendation until they are answered.` |
| | | G2 | `For complex decisions with unclear requirements, start by asking 2-3 focused clarifying questions and naming the main risks before proposing a plan.` |
| Code Reviewer | Omits tests; misnames flaws; unsafe fixes | C1 | `When reviewing code, check correctness, security (untrusted input, trust boundaries), performance, and missing tests; report only real issues, each with a concrete fix.` |
| Grill-Me, round 2 | G1/G2 still did not ask (3/28, 4/28) | G3 | `Before recommending a decision or plan, ask the user 2-3 specific questions about missing requirements and name the key risks.` |
| | | G4 | `For decisions or plans, do not give a final recommendation yet: ask 2-3 specific questions about missing requirements, name the key risks, and offer at most a provisional view. Answer simple factual questions directly.` |
| Code Reviewer, round 2 | C1 helped tests but cost GPT-OSS performance/fix coverage | C2 | `When reviewing code, assess correctness, security, performance, and test coverage; name the missing tests and give a safe fix for each issue.` |
| Humanizer | Adds unsupported narrative; shifts certainty | U1 | `When editing text, write naturally but keep every fact, number, citation, and hedge exactly; add no new claims or details.` |

### Remaining settings with an observed failure mode (variant B1)

| Setting | Candidate |
|---|---|
| Efficient (style) | `Lead with the answer, keep it brief and practical, and skip preamble.` |
| Warmth — less | `Keep the tone neutral and reserved, without reassurance or pep talk.` |
| Emoji — more | `When suitable for the task, use one to three relevant emoji.` |
| Detail — less | `Keep answers short: give the core answer first and omit nonessential background.` |
| No Fluff (preset) | `Start with the substance; no greetings, compliments, or filler.` |

All other styles, trait levels and presets are measured at their current wording on all seven models. They get no candidate unless the data shows a failure attributable to wording rather than to an already-compliant neutral baseline or model capability.

Round 2 (G3, G4, C2) was added after round 1 showed no reliable Grill-Me or Code gain. It used the same development tasks, and the wording is generic. The acceptance tasks (CRM decision, simple hours question, SSRF upload handler) stayed unseen until the winners were fixed.

## 3. Selection (Stage A/B, all 7 models, seeds 101/202, 65536 context)

Selection rules:
- A candidate must beat current wording overall, with no meaningful per-model regression.
- It must keep the explicit-override and task-accuracy checks intact.
- Where the scorer or judge wording overlaps the candidate wording, it needs non-circular corroboration.

| Line | Current | Candidate result | Decision |
|---|---|---|---|
| Language | 77/196 (held-out 45/98; English target 5/28) | L1 125/196. **L2 146/196** (held-out 77/98; English target 14/28). L2 ≥ L0 on every model. Override L2 69/70 = L0. Task fact 196/196. | **L2** |
| Header | exactWord 10/14, jsonOnly 4/14, markerFirst 13/14 | H1: 10/14, 3/14, 12/14 | Keep current |
| Creative | 18/28 judged more original than neutral | S1 21/28, **S2 24/28**. 5 km→mi 14/14. | **S2** |
| Grill-Me | 2/28 asks + risk. 2/28 outputs with ≥2 question marks. | G1 3/28, G2 4/28, **G3 25/28** (27/28 with ≥2 question marks), G4 19/28. "15% of 80" still answered directly 13/14 (1 timeout). Length 111 vs 108 words. | **G3** |
| Code Reviewer | 7/28 full pass. Tests mentioned 8/28. | C1 10/28 (GPT-OSS 4→2). **C2 18/28**: tests 21/28, GPT-OSS 4/4, 0 false claims. | C2 selected; **not adopted** (no held-out gain) |
| Humanizer | 13/28 | **U1 18/28**. No model regresses. | U1 selected; **not adopted** (no held-out gain) |
| Warmth — less | 21/28 judged more reserved | **27/28**. Corroborated: exclamation marks 0 vs 17 (neutral 44). | **Adopt** |
| Efficient | 14/28 | 9/28 | Keep current |
| Detail — less | 18/28 | 15/28 | Keep current |
| Emoji — more | 11/28 in the 1–3 band | 15/28, but the candidate states the scorer's own 1–3 band. Raw counts show current wording already adds emoji where neutral has none. | Keep current (gain is circular) |
| No Fluff | 11/28 | 17/28 judged. No filler phrase in neutral, current or candidate outputs; −3 % words. | Keep current (not corroborated) |

Winner set for acceptance: `WINNERS = ['L2', 'S2', 'G3', 'C2', 'U1', 'B1w']` (B1w = Warmth-less only).

Owner-limited acceptance (3 small models, 1 seed, 100 requests) confirms L2, S2 and G3 on held-out tasks, with no regression in override, precedence, task or English correctness, or privacy. B1w is neutral. C2 and U1 are not reconfirmed: there is no held-out gain and no clear regression. Full results: [benchmark §4.6](PERSONAL_PROFILE_PHASE7D_BENCHMARK.md). Proposal: [plan §4](PERSONAL_PROFILE_PHASE7D_PLAN.md).
