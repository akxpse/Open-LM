# Controlled paired benchmark protocol

Status: planned; NOT YET EXECUTED. Existing Qwen/GLM observations are exploratory.

## Freeze before dispatch

Record a condition manifest and hashes for initial source, task text, protected tests, harness, effective client config and model files. Keep the same bytes and tool schema for both models except unavoidable model IDs and isolated paths. Verify request payloads instead of assuming model catalog defaults are equal.

Fix client/server/runtime versions; quantization family; actual runtime and client context; total generation limit including reasoning; task/repair/event/time budgets; permission rules; model concurrency=1; sampling parameters accepted by both backends; stop sequences; and the same auxiliary title/summary/compaction behavior. Record actual resolved settings, including flash attention, KV dtype/offload, GPU offload, eval batch, thread counts and supported seed. Unsupported/unverified settings remain UNKNOWN; do not claim deterministic equivalence.

Model weights, architecture, tokenizer and native templates necessarily differ. Hash and disclose them. Reasoning-enabled versus disabled and workflow-with-auxiliaries versus implementation-only are separate named conditions. Never turn thinking off only after a slow run and pool that result into the earlier condition.

## Runtime and environmental controls

Use the same AC-powered machine, app set, background workload and power profile. Preserve Cursor and the required host/runtime. Do not close apps halfway through a measured arm; if the user changes workloads, flag the affected arm and preserve it. Keep one heavy model resident across all servers combined.

Apply the same unload/reload and predeclared warm-up procedure before every arm. Distinguish first-load, fresh-KV and warmed-workflow trials; do not pretend the OS file cache is fully controlled or purge it as an unrecorded step. Measure model loading separately. Sample baseline memory pressure, swap and device/thermal state and require comparable baselines, or label confounds before inference.

## Repetitions and quality

Run fresh identical fixtures in four paired repetitions with predeclared orders Qwen/GLM, GLM/Qwen, GLM/Qwen, Qwen/GLM. This balances first position, but is not sufficient for broad statistical confidence. Never select only the fastest/best attempt. Publish every failure, interruption, repair and unavailable metric; analyze valid and disrupted runs separately.

Use representative held-out tasks beyond the already-seen utility: multi-file implementation, tests, debugging and chained integration. Keep requirement coverage and verifier-owned tests identical. Use a blinded artifact label during source-quality review where feasible. Local models implement and execute tests; the frontier plans, reviews evidence and gives the final decision. No cloud/subagent implementation is substituted into a local arm.

## Full measurement

Capture ALL completion requests, including auxiliary agents, their API usage and timing, with secrets excluded. Retain per-request identifiers and counter definitions. Report missing usage as null, never zero. Keep provider API usage separate from runtime evaluated/decoded tokens; do not add cached input or reasoning twice.

Record wall time, first-token delay, prompt evaluation, decoding rate over time, actual tool execution, correctness, constraint compliance, repairs and final acceptance. Monitor resource telemetry locally during the run at a fixed interval; do not stream verbose logs into cloud context. Report sampled peak RSS/pressure/swap with interval and limitations, not as exact device peak or model-only memory.

Long-run tests are a separate duration/workload condition with the same cadence and context-growth pattern for both models. Set machine-appropriate memory-pressure, swap-growth, no-progress and timeout stop criteria BEFORE launch, and keep them unchanged between arms. Never bypass runtime memory guardrails. A cumulative token count alone is not a RAM limit; watch context/KV growth, pressure and throughput degradation.

Cloud-only baseline experiments remain separate. Include frontier planning/review/interventions when claiming cloud savings; leave savings unknown until comparable full-phase accounting exists.

## Publishing and decisions

Write protocol, condition manifests, source/test hashes, redacted per-request/per-run data, failed-attempt RCA, quality reviews and limitations under benchmarks/results/<date>/<condition>/. Link each condition from the benchmark index. Never publish secrets or complete unreviewed machine logs.

Rank by accepted quality first, RAM/swap stability and sustained throughput next. Local tokens are a diagnostic/tie-breaker, not a cost penalty by default. Give per-condition conclusions with uncertainty. Do not claim all variables are identical when recorded defaults, caches or workloads differ.
