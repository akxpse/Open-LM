---
name: open-lm
description: Offload bounded development tasks to a local coding agent while the current cloud agent owns strategy and independent verification. Use for hybrid cloud/local development, reducing cloud token usage, or running an implementation-and-review loop with OpenCode and a local inference server.
---

# Open LM

The frontier agent plans and independently verifies; a local agent implements and tests. Use short outcome-focused tasks, not a prescribed sequence of tool calls. This skill does not switch the frontier model or make its inference free.

## Prepare

Version: 0.1.0. The single-session workflow was validated with Ornith 1.0; see [release validation](references/validation-v010.md). Historical guarded results describe their own workflow revisions.

Read [setup](references/setup.md) before the first run or a runtime change. The default is a single session using `scripts/run-local.mjs`. Use [TASK.md](assets/TASK.md) for the brief. The [guarded runner](references/guarded-runtime.md) remains an opt-in compatibility path for a task that genuinely needs phase-separated permissions; do not apply its ordering, nonce or report requirements to ordinary coding.

Honor the selected local model and runtime. Inspect project instructions and preserve existing user changes. Stage a secrets-free subset or reviewed worktree; keep logs, credentials and verifier-owned acceptance tests outside the worker's writable files. Supply the required interfaces, behavior, relevant context, editable files and permitted development commands. Ordinary read/search within that staged scope is appropriate; use exact read lists only when needed. Client permissions are not an OS sandbox.

Perform [resource readiness](references/local-runtime.md#agent-managed-resource-readiness) as the frontier agent, without asking the user for routine settings. Keep one heavy model resident, verify actual context and tool compatibility, and leave memory headroom. Preserve agreed runtime stop thresholds. Do not close unrelated apps or unload another task's model without authority. No paid fallback or remote mutation without authorization.

## Run and verify

1. Give the local agent one coherent task and a bounded time/context budget. Allow reading, implementation, testing and evidence-led corrections in the same session. Tests may be repeated after changes or to investigate a failure. No mandatory MCP call order, once-only test rule, separate report session, report word-count gate or HANDOFF.md requirement.
2. Inspect the actual diff and recorded execution. A brief final summary helps but its formatting is not an acceptance criterion. Missing narration is not a code failure; narration alone is not proof of implementation. The controller records checkpoints from artifacts and verification, rather than requiring the worker to manufacture provenance.
3. Independently run acceptance tests against the final source, including relevant edge cases. Local edits after a local test are allowed; the final verifier tests the resulting state. Protect acceptance tests from worker changes and review any worker-authored tests.
4. Accept verified changes only after checking baseline drift. If tests fail, diagnose from evidence and issue a focused repair within the existing parent budget (normally at most two frontier repair rounds). Distinguish code defects, runtime failures and incomplete measurement. Do not reject otherwise verified code solely for harmless tool ordering or a missing report.

Stop for unauthorized access, destructive/external actions, exhausted budgets, critical resource conditions, or missing task decisions. A simpler workflow does not grant broader authority. Preserve raw failures and never invent test results or token counts.

## Batch and chain

Budget system/tool overhead, source reads, history and output against the actual runtime context. If the task will not fit, split by independently testable outcomes rather than raising context past available memory. Keep detailed logs out of subsequent prompts.

Use [CHAIN.md](assets/CHAIN.md) for multiple batches. The frontier verifies each prerequisite, records the source checkpoint and passes only relevant interfaces/context to the next fresh session. A model-written handoff file is optional; the frontier can build the compact checkpoint from the diff, tests and logs. Keep incomplete prerequisites pending and run final integration checks after the chain. Carry repair costs and failures forward; batching must not reset budgets indefinitely.

## Learn and measure

Record confirmed failure causes and useful remedies in project-local `.local-loop/lessons.md`; avoid adding a universal rule for each one-off mistake. Use [failure analysis](assets/FAILURE.md) when diagnosis needs structure and [review record](assets/REVIEW.md) for evidence.

Compare equivalent cloud-only and hybrid tasks, including cloud planning, review and repairs. Preserve actual input, cached input and output counts; report local usage separately. Keep workflow revisions and failed attempts identifiable. Do not pool old guarded runs with simplified runs or claim measured savings before the comparison is complete.
