# Phase 05 — Arabic reasoning classifier

Candidate: 1.0.1-rc.5. Branch: feat/phase-05-reasoning-arabic. Base develop: 098b015a60c772634a5c6dd21047ee7168996426 (approved Phase 04). Target: develop, not main. Published stable remains v1.0.0. No tag/release created.

## Delivered
A deterministic, locally evaluated MSA/Gulf and bilingual intent classifier recognizes greetings, continuation, descriptions, debugging, architecture, root cause, threat models and user depth/brevity instructions. Input normalization (Arabic diacritics, tatweel, common hamza and character variants) is ephemeral. Terms inside fenced code are not treated as intent, so pasted data does not spuriously elevate complexity.

## Tests and evidence
A fixed labelled corpus of 25 synthetic Arabic/Gulf/mixed requests covers all four tiers, continuations and adversarial brevity instructions. Existing English accuracy/latency corpus remains mandatory and separate. GitHub CI checks Node 22/24 on Ubuntu/Windows, packed artifact and pinned DSH Host fixtures. Record final head CI before merging. The synthetic Arabic corpus is in-sample, not representative statistical accuracy for all dialects. No prompts are logged or retained.

## Constraints
No automatic per-message reasoning selection, provider call, stored prompt, Profile migration, or change to manual Session effort selection was added. Real provider-bound recommendation behavior and visual RTL will be verified in the combined final DSH Desktop acceptance round.

## Gate
Review and merge to develop only after final CI passes. Delete the merged temporary branch and preserve main and v1.0.0.
