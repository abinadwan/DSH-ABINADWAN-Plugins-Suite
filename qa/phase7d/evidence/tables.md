Counts: {"generations":2412,"imported":389,"fresh":2023,"timeouts":19,"transportErrors":0,"emptyFinal":0,"judgments":909}

Cells: passes / scored outputs (2 seeds × tasks per model). "inc" = timeout or empty final answer (never counted as a pass or a wrong-language fail).


### Language: selected language followed (all 7 targets, Arabic + held-out prompt)

| Variant | gpt-oss | qwen | llama3 | devstral | josie | gemma12b | gemma-e4b | All models |
|---|---|---|---|---|---|---|---|---|
| L0 | 19/28 | 11/28 (1 inc) | 12/28 | 2/28 | 7/28 | 15/28 (7 inc) | 11/28 | **77/196 (8 inc)** |
| L1 | 24/28 | 26/28 (2 inc) | 20/28 | 5/28 | 12/28 | 24/28 | 14/28 | **125/196 (2 inc)** |
| L2 | 26/28 | 28/28 | 21/28 | 9/28 | 19/28 | 28/28 | 15/28 | **146/196** |


### Language: held-out prompt only

| Variant | gpt-oss | qwen | llama3 | devstral | josie | gemma12b | gemma-e4b | All models |
|---|---|---|---|---|---|---|---|---|
| L0 | 11/14 | 9/14 (1 inc) | 2/14 | 0/14 | 2/14 | 12/14 | 9/14 | **45/98 (1 inc)** |
| L1 | 12/14 | 13/14 (1 inc) | 10/14 | 3/14 | 6/14 | 12/14 | 12/14 | **68/98 (1 inc)** |
| L2 | 13/14 | 14/14 | 9/14 | 7/14 | 8/14 | 14/14 | 12/14 | **77/98** |


### Language: English target only (Arabic/Chinese user message)

| Variant | gpt-oss | qwen | llama3 | devstral | josie | gemma12b | gemma-e4b | All models |
|---|---|---|---|---|---|---|---|---|
| L0 | 1/4 | 0/4 | 4/4 | 0/4 | 0/4 | 0/4 | 0/4 | **5/28** |
| L1 | 0/4 | 3/4 (1 inc) | 4/4 | 0/4 | 0/4 | 0/4 | 0/4 | **7/28 (1 inc)** |
| L2 | 2/4 | 4/4 | 3/4 | 0/4 | 1/4 | 4/4 | 0/4 | **14/28** |


### Explicit user language request still wins (override)

| Variant | gpt-oss | qwen | llama3 | devstral | josie | gemma12b | gemma-e4b | All models |
|---|---|---|---|---|---|---|---|---|
| L0 | 10/10 | 10/10 | 10/10 | 10/10 | 9/10 | 10/10 | 10/10 | **69/70** |
| L1 | 10/10 | 8/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | **68/70** |
| L2 | 10/10 | 10/10 | 10/10 | 10/10 | 9/10 | 10/10 | 10/10 | **69/70** |


### Language: task fact correct

| Variant | gpt-oss | qwen | llama3 | devstral | josie | gemma12b | gemma-e4b | All models |
|---|---|---|---|---|---|---|---|---|
| L0 | 28/28 | 27/28 (1 inc) | 27/28 | 28/28 | 28/28 | 21/28 (7 inc) | 28/28 | **187/196 (8 inc)** |
| L1 | 28/28 | 26/28 (2 inc) | 28/28 | 28/28 | 28/28 | 28/28 | 28/28 | **194/196 (2 inc)** |
| L2 | 28/28 | 28/28 | 28/28 | 28/28 | 28/28 | 28/28 | 28/28 | **196/196** |


### Precedence: exactWord

| Variant | gpt-oss | qwen | llama3 | devstral | josie | gemma12b | gemma-e4b | All models |
|---|---|---|---|---|---|---|---|---|
| H0 | 1/2 | 1/2 | 2/2 | 2/2 | 2/2 | 0/2 | 2/2 | **10/14** |
| H1 | 1/2 | 1/2 (1 inc) | 2/2 | 2/2 | 2/2 | 0/2 (2 inc) | 2/2 | **10/14 (3 inc)** |


### Precedence: jsonOnly

| Variant | gpt-oss | qwen | llama3 | devstral | josie | gemma12b | gemma-e4b | All models |
|---|---|---|---|---|---|---|---|---|
| H0 | 2/2 | 0/2 (1 inc) | 0/2 | 0/2 | 2/2 | 0/2 (2 inc) | 0/2 | **4/14 (3 inc)** |
| H1 | 1/2 | 0/2 (1 inc) | 0/2 | 0/2 | 2/2 | 0/2 | 0/2 | **3/14 (1 inc)** |


### Precedence: customOverPrefs

| Variant | gpt-oss | qwen | llama3 | devstral | josie | gemma12b | gemma-e4b | All models |
|---|---|---|---|---|---|---|---|---|
| H0 | 2/2 | 2/2 | 0/2 | 0/2 | 0/2 | 2/2 | 0/2 | **6/14** |
| H1 | 2/2 | 2/2 | 0/2 | 0/2 | 0/2 | 2/2 | 0/2 | **6/14** |


### Precedence: noLists

| Variant | gpt-oss | qwen | llama3 | devstral | josie | gemma12b | gemma-e4b | All models |
|---|---|---|---|---|---|---|---|---|
| H0 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | **14/14** |
| H1 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | **14/14** |


### Precedence: minWords200

| Variant | gpt-oss | qwen | llama3 | devstral | josie | gemma12b | gemma-e4b | All models |
|---|---|---|---|---|---|---|---|---|
| H0 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | **14/14** |
| H1 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | **14/14** |


### Precedence: markerFirst

| Variant | gpt-oss | qwen | llama3 | devstral | josie | gemma12b | gemma-e4b | All models |
|---|---|---|---|---|---|---|---|---|
| H0 | 2/2 | 2/2 | 2/2 | 2/2 | 1/2 | 2/2 | 2/2 | **13/14** |
| H1 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 2/2 | 2/2 | **12/14** |


### Creative: judged more original than matched neutral (newsletter + held-out library)

| Variant | gpt-oss | qwen | llama3 | devstral | josie | gemma12b | gemma-e4b | All models |
|---|---|---|---|---|---|---|---|---|
| S0 | 3/4 | 4/4 | 3/4 | 1/4 | 1/4 | 3/4 | 3/4 | **18/28** |
| S1 | 4/4 | 2/4 (1 inc) | 3/4 | 2/4 | 2/4 | 4/4 | 4/4 | **21/28 (1 inc)** |
| S2 | 4/4 | 4/4 | 3/4 | 1/4 | 4/4 | 4/4 | 4/4 | **24/28** |


### Creative regression: factual task still correct (5 km in miles)

| Variant | gpt-oss | qwen | llama3 | devstral | josie | gemma12b | gemma-e4b | All models |
|---|---|---|---|---|---|---|---|---|
| S0 | 4/4 | 4/4 | 4/4 | 4/4 | 4/4 | 4/4 | 4/4 | **28/28** |
| S1 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | **14/14** |
| S2 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | **14/14** |


### Grill-Me: neutral baseline asks clarifying question + names risk

| Variant | gpt-oss | qwen | llama3 | devstral | josie | gemma12b | gemma-e4b | All models |
|---|---|---|---|---|---|---|---|---|
| G0 | 0/4 | 0/4 | 0/4 | 0/4 | 0/4 | 0/4 | 0/4 | **0/28** |


### Grill-Me: asks material clarifying question + names risk (migration + held-out POS)

| Variant | gpt-oss | qwen | llama3 | devstral | josie | gemma12b | gemma-e4b | All models |
|---|---|---|---|---|---|---|---|---|
| G0 | 0/4 | 0/4 | 1/4 | 0/4 | 1/4 | 0/4 | 0/4 | **2/28** |
| G1 | 0/4 | 2/4 | 1/4 | 0/4 | 0/4 | 0/4 | 0/4 | **3/28** |
| G2 | 0/4 | 2/4 | 1/4 | 0/4 | 1/4 | 0/4 | 0/4 | **4/28** |
| G3 | 4/4 | 4/4 | 4/4 | 4/4 | 1/4 | 4/4 | 4/4 | **25/28** |
| G4 | 4/4 | 4/4 | 1/4 | 3/4 | 1/4 | 4/4 | 2/4 | **19/28** |


### Grill-Me regression: simple question answered without interrogation (15% of 80)

| Variant | gpt-oss | qwen | llama3 | devstral | josie | gemma12b | gemma-e4b | All models |
|---|---|---|---|---|---|---|---|---|
| G0 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | **14/14** |
| G1 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | **14/14** |
| G2 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | **14/14** |
| G3 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 1/2 (1 inc) | 2/2 | **13/14 (1 inc)** |
| G4 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | **14/14** |


### Code Reviewer: neutral baseline (security+performance+tests+safe fix, no false claims)

| Variant | gpt-oss | qwen | llama3 | devstral | josie | gemma12b | gemma-e4b | All models |
|---|---|---|---|---|---|---|---|---|
| C0 | 0/4 | 0/4 | 0/4 | 0/4 | 0/4 | 0/4 | 0/4 | **0/28** |


### Code Reviewer: security+performance+tests+safe fix, no false claims

| Variant | gpt-oss | qwen | llama3 | devstral | josie | gemma12b | gemma-e4b | All models |
|---|---|---|---|---|---|---|---|---|
| C0 | 4/4 | 0/4 | 2/4 | 0/4 | 0/4 | 1/4 | 0/4 | **7/28** |
| C1 | 2/4 | 3/4 | 2/4 | 0/4 | 1/4 | 2/4 | 0/4 | **10/28** |
| C2 | 4/4 | 3/4 | 1/4 | 3/4 | 1/4 | 3/4 | 3/4 | **18/28** |


### Code Reviewer: deterministic category coverage (traversal|injection, perf, tests)

| Variant | gpt-oss | qwen | llama3 | devstral | josie | gemma12b | gemma-e4b | All models |
|---|---|---|---|---|---|---|---|---|
| C0 | 4/4 | 0/4 | 1/4 | 0/4 | 0/4 | 2/4 | 0/4 | **7/28** |
| C1 | 2/4 | 3/4 | 2/4 | 0/4 | 0/4 | 3/4 | 0/4 | **10/28** |
| C2 | 3/4 | 3/4 | 1/4 | 3/4 | 1/4 | 4/4 | 4/4 | **19/28** |


### Humanizer: neutral baseline (facts/citation/hedge kept, nothing added)

| Variant | gpt-oss | qwen | llama3 | devstral | josie | gemma12b | gemma-e4b | All models |
|---|---|---|---|---|---|---|---|---|
| U0 | 0/4 | 0/4 | 0/4 | 4/4 | 3/4 | 2/4 | 2/4 | **11/28** |


### Humanizer: facts/citation/hedge kept, nothing added, natural

| Variant | gpt-oss | qwen | llama3 | devstral | josie | gemma12b | gemma-e4b | All models |
|---|---|---|---|---|---|---|---|---|
| U0 | 1/4 | 0/4 | 0/4 | 4/4 | 3/4 | 2/4 | 3/4 | **13/28** |
| U1 | 1/4 | 1/4 | 0/4 | 4/4 | 4/4 | 4/4 | 4/4 | **18/28** |


### Stage B: effect vs matched neutral (pairwise judge; structure/emoji deterministic; detail/efficient also need fewer words)

| Setting | Variant | gpt-oss | qwen | llama3 | devstral | josie | gemma12b | gemma-e4b | All |
|---|---|---|---|---|---|---|---|---|---|
| style.professional | B0 | 2/2 | 2/2 | 2/2 | 1/2 | 0/2 | 1/2 | 1/2 | **9/14** |
| style.friendly | B0 | 1/2 | 2/2 | 1/2 | 1/2 | 1/2 | 2/2 | 2/2 | **10/14** |
| style.candid | B0 | 2/2 | 2/2 | 2/2 | 1/2 | 0/2 | 1/2 | 0/2 | **8/14** |
| style.efficient | B0 | 1/4 | 2/4 | 3/4 | 1/4 | 4/4 | 2/4 | 1/4 | **14/28** |
| style.efficient | B1 | 0/4 | 2/4 | 4/4 | 2/4 | 0/4 | 0/4 | 1/4 | **9/28** |
| style.critical | B0 | 1/2 | 0/2 | 2/2 | 1/2 | 1/2 | 1/2 | 0/2 | **6/14** |
| style.technical | B0 | 2/2 | 2/2 | 1/2 | 1/2 | 0/2 | 2/2 | 2/2 | **10/14** |
| trait.warmth.0 | B0 | 3/4 | 3/4 | 3/4 | 3/4 | 1/4 | 4/4 | 4/4 | **21/28** |
| trait.warmth.0 | B1 | 4/4 | 4/4 | 4/4 | 4/4 | 3/4 | 4/4 | 4/4 | **27/28** |
| trait.warmth.2 | B0 | 4/4 | 4/4 | 3/4 | 2/4 | 3/4 | 4/4 | 4/4 | **24/28** |
| trait.enthusiasm.0 | B0 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | **14/14** |
| trait.enthusiasm.2 | B0 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | 2/2 | **14/14** |
| trait.structure.0 | B0 | 2/2 | 2/2 | 2/2 | 0/2 | 2/2 | 2/2 | 2/2 | **12/14** |
| trait.structure.2 | B0 | 2/2 | 2/2 | 2/2 | 2/2 | 0/2 | 2/2 | 2/2 | **12/14** |
| trait.emoji.0 | B0 | 3/4 | 4/4 | 4/4 | 0/4 | 3/4 | 4/4 | 0/4 | **18/28** |
| trait.emoji.2 | B0 | 4/4 | 2/4 | 1/4 | 1/4 | 0/4 | 3/4 | 0/4 | **11/28** |
| trait.emoji.2 | B1 | 2/4 | 4/4 | 4/4 | 0/4 | 1/4 | 4/4 | 0/4 | **15/28** |
| trait.detail.0 | B0 | 2/4 | 4/4 | 4/4 | 1/4 | 2/4 | 4/4 | 1/4 | **18/28** |
| trait.detail.0 | B1 | 1/4 | 3/4 | 4/4 | 1/4 | 3/4 | 3/4 | 0/4 | **15/28** |
| trait.detail.2 | B0 | 0/4 | 2/4 | 1/4 | 1/4 | 1/4 | 1/4 | 4/4 | **10/28** |
| trait.critical.0 | B0 | 2/2 | 1/2 | 0/2 | 2/2 | 1/2 | 0/2 | 0/2 | **6/14** |
| trait.critical.2 | B0 | 0/2 | 2/2 | 2/2 | 2/2 | 0/2 | 2/2 | 2/2 | **10/14** |
| preset.critical | B0 | 1/2 | 2/2 | 2/2 | 1/2 | 1/2 | 2/2 | 2/2 | **11/14** |
| preset.no-fluff | B0 | 1/4 | 0/4 | 4/4 | 1/4 | 2/4 | 3/4 | 0/4 | **11/28** |
| preset.no-fluff | B1 | 2/4 | 0/4 | 4/4 | 3/4 | 3/4 | 3/4 | 2/4 | **17/28** |
| preset.evidence | B0 | 1/2 | 1/2 | 2/2 | 1/2 | 2/2 | 2/2 | 1/2 | **10/14** |
| preset.steps | B0 | 2/2 | 0/2 | 2/2 | 1/2 | 1/2 | 2/2 | 1/2 | **9/14** |
| preset.action | B0 | 2/2 | 1/2 | 1/2 | 1/2 | 1/2 | 1/2 | 1/2 | **8/14** |


### Instruction length (characters)

| Line | Current | Candidate | Δ |
|---|---|---|---|
| header | 180 | 222 | +42 |
| language (Chinese) | 79 | 177 | +98 |
| language L2 (Chinese) | 79 | 140 | +61 |
| creative S1 | 64 | 100 | +36 |
| creative S2 | 64 | 90 | +26 |
| grill-me G1 | 81 | 198 | +117 |
| grill-me G2 | 81 | 148 | +67 |
| code C1 | 82 | 168 | +86 |
| humanizer U1 | 83 | 122 | +39 |
