# Open LM benchmark protocol

## Published evidence

- [Longer multi-step native-tool/MCP comparison](multi-step-2026-09-13/README.md): five distinct local weight sets ran inference; Astra/Sol/Terra cloud arms, failures and repair lineage. Two additional load failures are retained in diagnostic notes.
- [Cost methodology and observed partial accounting](COSTS.md), [explicitly hypothetical scenario](cost-scenario.json).
- [Qwen / GLM exploratory result and verdict](GLM-QWEN-SMOKE.md), [worker and all-request accounting](GLM-QWEN-SMOKE.json).
- [GLM slowdown RCA](GLM-SLOWDOWN-RCA.md), [server performance records](GLM-QWEN-PERFORMANCE.json).
- [Qwen tool-call RCA](TOOL-CALL-RCA.md), [incidents](INCIDENTS.md).
- [Historical cloud-only baseline](results/2026-09-13/HISTORICAL-CLOUD-BASELINE.json): three cloud arms, not matched to GLM.
- [Separate local experiment](results/2026-09-13/LOCAL-EXPERIMENT.json): outcomes and implementation/verification summaries, including failures.
- [Diagnostic runs](results/2026-09-13/DIAGNOSTIC-RUNS.json): 22 available RCA/regression summaries, including interruptions.
- [Superseded mixed pilot](results/2026-09-13/SUPERSEDED-MIXED-PILOT.json): retained calibration evidence, not the current workflow or a valid savings claim.
- [Controlled paired protocol](CONTROLLED-PROTOCOL.md): planned, not yet run.

These curated archives are included in the public repository; private originals are not. These archives retain observed counters/statuses; personal paths are redacted and full private logs and free-form cloud messages are excluded. Old summary tokens omit auxiliary requests unless separately instrumented. No headline cloud-savings percentage is validated.

## Superseded pilot protocol (historical; do not rerun as current)

Run `node benchmarks/pilot.mjs` only after reviewing the source and local/cloud configuration. It consumes the existing Codex account allowance using Terra and executes local generated code in temporary fixtures. It does not buy credits or use an API key. Prerequisites: authenticated Codex CLI, OpenCode, Ollama and installed Qwen3 Coder 30B, warmed at 16K runtime context. One local model and one local attempt at a time; abort if another local model is resident. This is not an OS-isolated benchmark sandbox.

Three synthetic Node ESM tasks: deterministic normalization, TTL cache, concurrency-limited asynchronous mapping. Each pair starts with identical source, public requirements and visible checks. Hidden assertions stay out of task workspaces; a failed assertion can enter subsequent repair feedback equally in either arm. Max two repairs after initial attempt. No dependencies, production credentials or project deployment.

- Cloud-only: Terra plans, implements and tests; separate Terra review consumes source and independent executable check results.
- Hybrid: Terra writes a packet; Qwen implements/tests through the Open LM runner; separate Terra review consumes the same kind of evidence.
- Same Terra low reasoning setting; fresh sessions per phase. Alternate arm order by task. Single repetition in this pilot; no confidence interval or population-level claim.
- A result passes only if visible/hidden checks, test-file integrity and independent cloud review pass. Report failures, retries and timeouts, never discard unfavorable pairs.

Private events, prompts, source and reports go into a newly created system temporary directory, not this repository. Preserve them for audit; review/redact before publishing. Cloud CLI turn-completion usage is the measurement source, documented at https://learn.chatgpt.com/docs/non-interactive-mode. Missing usage invalidates a phase; do not substitute zero.

## Metrics

Cloud tokens = sum of input_tokens + output_tokens across all measured cloud phases, including planning, review and repair. Cached input is already part of input: report the cache breakdown without adding it again. Preserve reasoning counters separately; do not assume they are extra billable output without validating the provider's definition.

Paired cloud-token reduction = 1 - hybrid cloud tokens / cloud-only cloud tokens. Negative reduction means the hybrid used more. Aggregate using the ratio of sums as well as per-case values; do not average percentages without explaining weighting.

Report input, cached input, output, local usage, elapsed time, first-pass success, final success and repair count separately. Usage comes from clients, not an invoice. Local and cloud tokenizers differ; summing their tokens is not a meaningful quality-adjusted cost metric.

End-to-end dollar savings are UNMEASURED. Verified pricing can reprice captured CLI phases, but incomplete frontier overhead prevents a complete hybrid comparison. Subscription token reductions do not directly establish a smaller subscription bill. Hardware, energy, setup and maintenance costs are separate; do not call local execution costless.

The pilot measures workflow phases only. Benchmark construction, calibration, this supervising conversation and manual interventions outside phases are excluded. Disclose these exclusions prominently. Record setup expenditure separately and amortize it only over a stated workload count. This pilot alone cannot substantiate total end-to-end savings.

## Before a public percentage claim

1. Freeze/version task fixtures and hidden checks before collecting confirmatory data. Keep tuning tasks separate from holdout tasks. Validate checks against known-correct implementations and seeded defects.
2. Include representative multi-file features, debugging, tests, refactors, API/data boundary tasks and actual scaffold maintenance, not only short utilities. Use at least 12 distinct tasks across complexity classes and at least three repetitions as an initial study design, not a guarantee of statistical power.
3. Match initial context, allowed tools, quality gate and repair limits; compare both fresh and persistent-session orchestration. Randomize/counterbalance order and disclose warm/cold caches, inference parameters, versions, model digest and hardware.
4. Include context pressure with frontier batching, chained dependency integration, interrupted-run recovery and failing local tasks. Record overhead of handoffs and failed attempts.
5. Test local models sequentially; never change model or context mid-arm without recording a new condition. Sample memory pressure/swap and record load time separately from warm inference.
6. Require comparable accepted-task quality; publish per-task outcomes and all failures. Report uncertainty across independent tasks (not token events). A small synthetic sample must not become a universal percentage.
7. Attribute every cloud phase and intervention, including setup when claiming end-to-end savings. If that cannot be measured, label the narrower metric explicitly.
8. Publish the frozen protocol, raw redacted records and limitations. Phrase any result as measured on that benchmark, with its range and quality outcome; do not claim “over 70%” merely because one task crosses it.

## Current coverage limits

This initial pilot does not exercise automatic batching (not implemented), real application integration, production payment/auth correctness, long-context degradation, cross-platform recovery or statistical repeatability. Runner unit tests are reliability checks, not token-savings evidence.
