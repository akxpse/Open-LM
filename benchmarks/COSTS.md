# Cost comparison and measurement contract

Status: methodology, observed partial cloud-cost accounting, and a clearly labelled **illustrative scenario**; no validated end-to-end savings result. Pricing checked 2026-09-13. USD API-equivalent values are not subscription charges.

## Compare the same outcome

Pure frontier: the selected cloud model plans, implements, tests, diagnoses failures, repairs and reviews. Open LM: the same frontier model plans, supplies handoffs, reviews and verifies; OpenCode's local model implements and executes tests. Include all cloud diagnosis, repair instructions, interventions and authorized fallback work.

Keep local implementation genuinely local. Host-owned benchmark fixtures and verification criteria are setup work, not a substitute implementation in a local arm. The current host remains the final verifier; a separately invoked cloud planner/reviewer is a different workflow and must be labeled accordingly.

## Accounting boundaries

Attribute every task's cloud usage: context inspection, planning, decomposition, skill/reference loading, packets, handoffs, implementation where cloud-only or fallback, diff/evidence review, acceptance decisions, failure RCA, corrections, repeated reviews, batching/recovery, and inference-driven monitoring/orchestration. Include unsuccessful and interrupted attempts, even when no result is accepted.

Keep setup, runtime troubleshooting and benchmark construction in a separate ledger. Report steady-state results and setup-inclusive/amortized economics separately. State the amortization task count and allocation rule. Do not hide expensive task-specific diagnosis as setup, charge shared setup repeatedly, or silently omit it from an end-to-end claim. Unknown attribution stays unknown.

## Token definitions and formulas

Use provider-reported usage per request/turn. Record model, client, pricing date, service tier, context band, cache behavior and phase. Missing counters are **null**, not zero. Preserve raw counter names and document normalization.

For a provider where total input `I` includes cache reads `R` and separately billed cache writes `W`:

```text
uncached input U = I - R - W
cloud cost = (U × input_rate + R × cache_read_rate
              + W × cache_write_rate + O × output_rate) / 1,000,000
             + separately billed tools/services
```

`O` is total billable output, including reasoning if the provider includes it. Do not add cache or reasoning twice. Clients/providers can use different definitions; normalize from documented semantics before calculation. Reject negative buckets. Unknown request context bands or billing fields prevent an exact cost claim.

```text
cloud token reduction = 1 - hybrid_cloud_tokens / pure_cloud_tokens
cloud cost reduction  = 1 - hybrid_cloud_cost / pure_cloud_cost

total hybrid cost = hybrid_cloud_cost + local_compute_cost
                    + hybrid_setup_cost / stated_amortization_task_count
total baseline cost = pure_cloud_cost + baseline_compute_cost
                      + baseline_setup_cost / stated_amortization_task_count
total cost reduction = 1 - total_hybrid_cost / total_baseline_cost
```

Sum all attempts. Report ratio-of-sums and individual task values; do not silently average percentages. Zero denominators are undefined, not 100% savings. Negative savings are valid findings.

Cost per accepted task is expenditure across successes **and failures** divided by accepted tasks, alongside acceptance rate and latency. With no accepted tasks this metric has no finite value. Also show paired accepted cases without concealing full-cohort failures. Quality differences can invalidate a headline cost comparison.

## Sol / Astra / Terra scenario — NOT observed usage

The [machine-readable scenario](cost-scenario.json) uses standard short-context [OpenAI API rates](https://developers.openai.com/api/docs/pricing), retrieved 2026-09-13:

| Model | Input / 1M | Cache read / 1M | Cache write / 1M | Output / 1M |
| --- | ---: | ---: | ---: | ---: |
| Terra | $2.00 | $0.20 | $2.50 | $12.00 |
| Sol | $4.00 | $0.40 | $5.00 | $20.00 |
| Astra | $10.00 | $1.00 | $12.50 | $50.00 |

Assume no billed cache writes, requests eligible for short-context pricing, and no Fast/Batch/Flex tier, regional uplift, taxes or paid tools. Aggregate task input is not per-request context length. Sol promotional rates are listed as available at least through November 21, 2026; recheck before use.

**Hypothetical** quantities, held constant across models solely to isolate price effects:

| Cloud bucket | Pure frontier | Open LM frontier portion |
| --- | ---: | ---: |
| Total input, cache included | 100,000 | 30,000 |
| Cache-read subset | 80,000 | 20,000 |
| Uncached input | 20,000 | 10,000 |
| Billable output, reasoning included | 5,000 | 2,000 |
| Input + output | 105,000 | 32,000 |

This gives 69.5238% fewer unweighted cloud tokens, but 58.6207% lower Terra cloud-inference cost and 58.4906% lower Sol/Astra cloud-inference cost. Cache/output pricing causes the difference, not an observed property of the skill. Equal assumed counts do not imply equal real model performance or token consumption.

```text
Terra baseline = (20,000 × $2 + 80,000 × $0.20 + 5,000 × $12) / 1M = $0.116
Terra hybrid   = (10,000 × $2 + 20,000 × $0.20 + 2,000 × $12) / 1M = $0.048
reduction = 1 - 0.048 / 0.116 = 58.6207%
```

## Local compute and break-even

Your own genuinely local inference has no provider per-token charge, but uses hardware, energy and time. Keep local usage separate by tokenizer; never price Qwen/GLM tokens as cloud tokens allegedly avoided.

```text
energy cost = measured incremental average watts / 1,000
              × elapsed hours × electricity price per kWh
```

Illustration only: **assumed** 80 W for ten minutes at $0.20/kWh is about $0.00267. This is not a measurement of either model or the test Mac. State whether power is whole-system or incremental and measure both arms consistently. Add depreciation/rental and setup amortization where applicable. Existing hardware may have zero incremental purchase outlay, but not zero opportunity cost. Report human time separately or price it explicitly.

Break-even requires avoided cloud cost to exceed added compute and supervision/setup costs. Slower completion, memory failures and lower acceptance quality must remain visible.

## Subscriptions

Codex account allowances depend on model, context, reasoning, tools and caching; they are not per-task API invoices. A fixed subscription bill does not shrink when fewer tokens are used. [Official Codex pricing/usage](https://learn.chatgpt.com/docs/pricing).

For subscription-authenticated runs, label dollar values API-equivalent scenarios. Measure actual allowance/credit changes separately only when attributable; an account-wide percentage movement is not a task cost. This OpenAI table does not price Claude subscriptions.

## Current evidence coverage

| Data | Available | Missing for requested comparison |
| --- | --- | --- |
| Historical Terra baseline | 3 cases, 6 phases, accepted outcomes | Current matched hybrid, full supervisor/setup attribution, repeats |
| Qwen/GLM utility runs | Worker tokens, test/tool evidence, wall and server timing | Full auxiliary API usage and frontier phase totals; matched controls |
| Astra/Sol/Terra longer-task cloud arms | Actual per-attempt CLI implementation/review usage, tests and repair lineage | Complete root/controller phase attribution; matched accepted hybrid outcomes |
| Current host usage metadata | Cumulative and last-response token counters observed | Clean historical phase boundaries and invoice attribution |
| [Longer native-tool/MCP calibration](multi-step-2026-09-13/README.md) | Frozen task, tool evidence, local request usage, failures, candidate snapshots | Confirmatory holdouts, balanced repeats, complete frontier overhead |

Do not assign this entire conversation's cumulative tokens to one benchmark: it includes earlier development, troubleshooting and documentation. Future phases require explicit boundaries, stable model attribution, no unrelated work inside a measured phase and a final usage flush after the last review. Worker-only totals cannot fill historical gaps.

**Measured end-to-end savings remain unknown for Terra, Sol and Astra.** Do not pool the superseded mixed pilot into this current-host-led workflow.

## Collection and public reporting

Follow the [controlled protocol](CONTROLLED-PROTOCOL.md). First validate instrumentation on a longer multi-file calibration task with native file/test tools and a synthetic read-only local MCP server, never production accounts. Freeze source/tests/contracts/MCP data before dispatch. Keep calibration and its failures separate from confirmatory holdouts.

Initial study target: at least **12 distinct tasks across complexity classes, with at least 3 repetitions**. This is a design target, not a completed run count or guarantee of statistical power. Include features, debugging, boundaries, context pressure, chained integration and recovery. After a pilot, use task-level variability to decide if more distinct tasks are necessary.

Pair pure cloud and hybrid for each frontier model actually benchmarked, with that same model and matched initial context, tools, requirements and quality gates. Do not relabel the current host as another model. Host changes must be explicit. Run Qwen/GLM sequentially; disclose Codex/OpenCode harness and native model/template/tokenizer differences rather than claim identical variables.

Capture every auxiliary request and cloud intervention, counter semantics, time, failed tools, repair count, acceptance, sampled RAM/swap and sustained throughput. Use compact review-gate evidence to avoid unnecessary cloud polling overhead. For long local tasks, memory stability matters more than a low local token count.

Predeclare order, time/repair/resource limits and missing-data rules. Publish all scheduled outcomes and task-clustered uncertainty; requests/tokens are not independent task samples. Do not claim “over 70%” unless a quality-matched, fully attributed result supports that precisely stated benchmark scope.

Publish redacted records, manifests, reviews and failure RCA here. Keep credentials and personal paths out of public artifacts. The repository description should explain the workflow, not promise an unverified percentage.
