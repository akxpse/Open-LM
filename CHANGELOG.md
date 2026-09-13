# Releases

## Unreleased — v0 development

Added optional OpenCode -> LM Studio routing, authenticated model preflight using LM_API_TOKEN, explicit model selection and runtime evidence in summaries. Ollama remains the default. Added LM Studio adapter tests and same-weights Qwen tool-call investigation. This supplies a tested operational workaround, not a patch to Ollama's parser. Production changes were implemented locally by Qwen and independently reviewed; failed test hunks were rejected. No savings claim or new published version.

## 0.0.0 — 2026-09-13

Added local-runtime failure/recovery matrix, packet readiness checks and review evidence fields. Explicitly separates runner enforcement, host procedures and untested failure paths.
Context overflow now routes to frontier-led batching in the skill workflow. Added dependency-aware task chains, verified checkpoints, parent requirement coverage, final integration gates and bounded no-progress re-batching. This is host-coordinated behavior, not automatic runner scheduling.
Public project and skill renamed to Open LM (`open-lm`); existing installations must update their folder/invocation. Internal workspace lock naming is retained to prevent concurrent legacy/new writers. Explicit context-budget guidance added; automatic context-fit enforcement remains unimplemented.

Initial portable cloud-strategist/local-developer workflow, task and review templates, bounded OpenCode/Ollama runner, and pilot-derived lessons. Quality and savings are evaluation goals, not established results or guarantees. Original manual runner tests used OpenCode 1.17.15 and Ollama 0.33.3 on macOS; Claude-hosted orchestration and other platforms/models are not yet validated.

Future releases: record changed behavior, motivating lesson, tests, compatibility changes, and migration steps. Preserve existing releases before changing an installed copy. Use patch releases for fixes, minor releases for compatible capabilities, and major releases for breaking packet/runner contracts. Keep a project run ledger linked to the skill version.

## v0 publication evidence

Added a multi-step native-tool/MCP calibration covering seven distinct local weight sets and Astra/Sol/Terra cloud arms, including failed loads, failed tests, repair lineage and incomplete counters. Added the Quick Start, explicit illustrative pricing, public-safe evidence, `.gitignore` and security reporting guidance. Clarified packet-specific stop rules after observed unauthorized self-repairs. No runner automation or measured end-to-end savings guarantee was added.
