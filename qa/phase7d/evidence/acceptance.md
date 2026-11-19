Judge: gemma4-local:e4b. Final owner-limited acceptance: Qwen3.5:4b, llama3 and gemma4-local only, seed 303, critical cases only (96 requests + 4 matched re-runs of the two timeouts = 100). GPT-OSS 20B and Devstral are excluded; their earlier rows are shown with deterministic checks only. Cells marked "not run" are untested, not passed.

Winners: ["L2","S2","G3","C2","U1","B1w"]. Seed 303 (Stage C timeouts re-run as matched pairs on seed 404). Worst-case section length: current 1165 chars, winners 1428 chars (+263). Context rows with tool calls: {"C":"0/6","W":"0/6"}.


### Stage C: language followed (7 targets, new prompts)

| Variant | qwen | llama3 | gemma-e4b | All |
|---|---|---|---|---|
| C | 0/4 (1 inc) | 1/3 | 1/3 | **2/10 (1 inc)** |
| W | 4/4 | 1/3 | 2/3 | **7/10** |


### Stage C: language: task fact correct

| Variant | qwen | llama3 | gemma-e4b | All |
|---|---|---|---|---|
| C | 3/4 (1 inc) | 3/3 | 3/3 | **9/10 (1 inc)** |
| W | 4/4 | 3/3 | 3/3 | **10/10** |


### Stage C: explicit language request wins (override)

| Variant | qwen | llama3 | gemma-e4b | All |
|---|---|---|---|---|
| C | 1/1 | 1/1 | 1/1 | **3/3** |
| W | 1/1 | 1/1 | 1/1 | **3/3** |


### Stage C: precedence exactWord2

| Variant | qwen | llama3 | gemma-e4b | All |
|---|---|---|---|---|
| C | 0/2 | 1/1 | 0/1 | **1/4** |
| W | 1/2 (1 inc) | 1/1 | 0/1 | **2/4 (1 inc)** |


### Stage C: precedence jsonOnly2

| Variant | qwen | llama3 | gemma-e4b | All |
|---|---|---|---|---|
| C | not run | not run | not run | **not run** |
| W | not run | not run | not run | **not run** |


### Stage C: precedence markerFirst

| Variant | qwen | llama3 | gemma-e4b | All |
|---|---|---|---|---|
| C | 1/1 | 1/1 | 1/1 | **3/3** |
| W | 1/1 | 1/1 | 1/1 | **3/3** |


### Stage C: Creative judged more original than neutral (garden)

| Variant | qwen | llama3 | gemma-e4b | All |
|---|---|---|---|---|
| C | 1/1 | 0/1 | 1/1 | **2/3** |
| W | 1/1 | 1/1 | 1/1 | **3/3** |


### Stage C: Grill-Me asks + names risk (CRM decision)

| Variant | qwen | llama3 | gemma-e4b | All |
|---|---|---|---|---|
| C | 1/1 | 0/1 | 0/1 | **1/3** |
| W | 1/1 | 1/1 | 1/1 | **3/3** |


### Stage C: Grill-Me regression: simple question answered directly (hours)

| Variant | qwen | llama3 | gemma-e4b | All |
|---|---|---|---|---|
| C | 1/1 | 1/1 | 1/1 | **3/3** |
| W | 1/1 | 1/1 | 1/1 | **3/3** |


### Stage C: Code Reviewer full pass (SSRF upload handler)

| Variant | qwen | llama3 | gemma-e4b | All |
|---|---|---|---|---|
| C | 1/1 | 0/1 | 0/1 | **1/3** |
| W | 1/1 | 0/1 | 0/1 | **1/3** |


### Stage C: Code Reviewer deterministic coverage (SSRF, robustness, tests)

| Variant | qwen | llama3 | gemma-e4b | All |
|---|---|---|---|---|
| C | 1/1 | 0/1 | 0/1 | **1/3** |
| W | 0/1 | 0/1 | 0/1 | **0/3** |


### Stage C: Humanizer preserved + nothing added + natural (humanC)

| Variant | qwen | llama3 | gemma-e4b | All |
|---|---|---|---|---|
| C | 0/1 | 0/1 | 0/1 | **0/3** |
| W | 0/1 | 0/1 | 0/1 | **0/3** |


### Stage C: Low warmth judged more reserved than neutral (exam)

| Variant | qwen | llama3 | gemma-e4b | All |
|---|---|---|---|---|
| C | 1/1 | 1/1 | 1/1 | **3/3** |
| W | 1/1 | 1/1 | 1/1 | **3/3** |


### Stage C: Low warmth: no exclamation marks (exam)

| Variant | qwen | llama3 | gemma-e4b | All |
|---|---|---|---|---|
| C | 1/1 | 1/1 | 1/1 | **3/3** |
| W | 1/1 | 1/1 | 1/1 | **3/3** |


### Stage C: Regression: task correct with all changed lines active

| Variant | qwen | llama3 | gemma-e4b | All |
|---|---|---|---|---|
| C | 1/1 | 1/1 | 1/1 | **3/3** |
| W | 1/1 | 1/1 | 1/1 | **3/3** |


### Stage C: Regression: English kept with all changed lines active

| Variant | qwen | llama3 | gemma-e4b | All |
|---|---|---|---|---|
| C | 1/1 | 1/1 | 1/1 | **3/3** |
| W | 1/1 | 1/1 | 1/1 | **3/3** |


### Context (75 tools): language followed

| Variant | qwen | gemma-e4b | All |
|---|---|---|---|
| C | 0/1 | 0/1 | **0/2** |
| W | 0/1 | 0/1 | **0/2** |


### Context (75 tools): precedence exactWord

| Variant | qwen | gemma-e4b | All |
|---|---|---|---|
| C | not run | not run | **not run** |
| W | not run | not run | **not run** |


### Context (75 tools): precedence markerFirst

| Variant | qwen | gemma-e4b | All |
|---|---|---|---|
| C | 1/1 | 1/1 | **2/2** |
| W | 1/1 | 1/1 | **2/2** |


### Context (75 tools): Grill-Me asks + names risk (migration)

| Variant | qwen | gemma-e4b | All |
|---|---|---|---|
| C | 0/1 | 0/1 | **0/2** |
| W | 0/1 | 1/1 | **1/2** |


### Context (75 tools): Grill-Me regression: 15% of 80 answered directly

| Variant | qwen | gemma-e4b | All |
|---|---|---|---|
| C | not run | not run | **not run** |
| W | not run | not run | **not run** |


### Prior GPT-OSS rows (deterministic only): language followed

| Variant | gpt-oss | All |
|---|---|---|
| C | 12/35 | **12/35** |
| W | 31/35 | **31/35** |


### Prior GPT-OSS rows (deterministic only): language: task fact correct

| Variant | gpt-oss | All |
|---|---|---|
| C | 35/35 | **35/35** |
| W | 35/35 | **35/35** |


### Prior GPT-OSS rows (deterministic only): explicit language request wins (override)

| Variant | gpt-oss | All |
|---|---|---|
| C | 10/10 | **10/10** |
| W | 10/10 | **10/10** |


### Prior GPT-OSS rows (deterministic only): precedence exactWord2

| Variant | gpt-oss | All |
|---|---|---|
| C | 2/5 | **2/5** |
| W | 1/5 | **1/5** |


### Prior GPT-OSS rows (deterministic only): precedence jsonOnly2

| Variant | gpt-oss | All |
|---|---|---|
| C | 3/5 | **3/5** |
| W | 4/5 | **4/5** |


### Prior GPT-OSS rows (deterministic only): precedence markerFirst

| Variant | gpt-oss | All |
|---|---|---|
| C | 5/5 | **5/5** |
| W | 5/5 | **5/5** |


### Prior GPT-OSS rows (deterministic only): Grill-Me regression: simple question answered directly (hours)

| Variant | gpt-oss | All |
|---|---|---|
| C | 5/5 | **5/5** |
| W | 5/5 | **5/5** |


### Privacy (deterministic, no inference)

- customNotSentWhenSendCustomFalse: true
- customSentOnlyWhenOptedIn: true
- automaticLanguageInjectsNothing: true
- neutralProfileInjectsNothing: true
- winnerSectionsFreeOfPathsEmailsKeys: true
- acceptanceRequestsBlockedByPrivacyGate: 0
