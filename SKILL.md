---
name: open-lm
description: Offload bounded development tasks to a local coding agent while the current cloud agent owns strategy and independent verification. Use for hybrid cloud/local development, reducing cloud token usage, or running an implementation-and-review loop with OpenCode and a local inference server.
---

# Open LM

Keep the current host as strategist and final verifier. Use a local agent as a junior developer with a precise contract, not as an autonomous product owner. This skill does not switch the host's model or make host inference free.

## Start

Version: 0.0.0 (experimental). See [validation evidence](references/validation-v0.md) for tested behavior and limitations.

Read [setup and runner contract](references/setup.md) and [local runtime failure/recovery contract](references/local-runtime.md) before the first run or when changing clients/models. Read [lessons](references/lessons.md) when designing acceptance checks or improving the loop. Use [packet template](assets/TASK.md) for each new task.

Honor user-selected models. Keep fallback choices explicit and task-specific; do not change the current host's model implicitly. Never silently use a paid fallback. Default local adapter: OpenCode -> Ollama. The runner also supports OpenCode -> LM Studio; select it with runtime=lmstudio and verify its exact model ID and authentication. Repeat a compatibility smoke test when changing the runtime or model.

## Strategist contract

1. Inspect the current project and its instructions. Preserve dirty changes. Select one outcome small enough to review as a coherent diff.
2. Supply interfaces, permitted files, relevant context, edge cases, known blockers with permitted fixes, non-goals, and exact acceptance commands. Distinguish observed blockers from guesses. Do not dump the whole conversation or unnecessary skills into the packet.
3. Stage an explicit, secrets-free subset in a fresh directory or reviewed worktree. Keep control files/logs outside the agent's writable work. One writer per file. Inspect effective OpenCode configuration before granting execution authority; its permissions are not an OS sandbox.
4. Give the developer at most two repair rounds. A correction gets its own narrow packet; report-only corrections get no shell permission. Never interpret the skill invocation as approval for deployment, purchases, credentials, or broader changes.

## Local run

Use `node <skill-dir>/scripts/run-local.mjs <packet.json>` after reviewing the packet and effective configuration as described in setup. It runs one bounded attempt and saves logs plus summary; it does not promote changes, install models, or execute acceptance checks independently.

Local developer sequence: read listed context -> implement -> run acceptance checks -> follow the packet's stop/repair rule -> review diff -> handoff -> stop. When a packet requires stopping after a failed check, do not self-repair in that attempt; the frontier diagnoses it and issues a separate correction. Successful checks do not authorize post-success edits or repeats. Do not repeat successful checks for reassurance. Stop on scope ambiguity, new authority requirements, exhausted budget, or repeated permission denial.

Keep one heavy model active by default. Check RAM and swap growth, not just download size. Short context and sequential delegation usually beat a parallel swarm on constrained hardware. Autocomplete is a separate editor workload, not a test executor. Do not add another model unless it helps the task.

## Context budget

Before dispatch, verify the model's actual runtime context and use no higher client limit. Budget for system/tool instructions, the task packet, planned file reads, tool results/history, and output together. Keep a safety margin; split a task if its required context cannot fit without dropping constraints. Use targeted reads and bounded test output. Start correction packets in fresh sessions with the contract, current baseline, relevant diff and failure evidence rather than replaying the entire run.

v0 exposes context/output settings but does not tokenize the full request, measure remaining context live, or enforce inference-server runtime allocation. Do not claim automatic overflow protection. Record the budget and its estimation uncertainty in the task packet. See [context limitations](references/setup.md#context-budget-v0).

## Batching and task chains

Context overflow is a request to re-batch, not a reason to abandon the parent task. Before dispatch, the frontier strategist splits a packet that will not fit. During a run, the local agent returns NEEDS_BATCHING with completed work, remaining requirement IDs, context evidence and a checkpoint; if overflow prevents a handoff, the strategist reconstructs it from the diff and recorded results. Pause only the affected attempt and inspect partial changes before resuming.

Use [batch/chain plan](assets/CHAIN.md) to map every parent requirement to an ordered, independently verifiable packet. Keep interfaces and cross-cutting constraints explicit. Execute ready batches sequentially in fresh local sessions; each gets only its required context, verified predecessor baseline and compact handoff. The current frontier host coordinates this loop through ordinary tool calls; the standalone runner does not call a frontier API or schedule dependents.

Verify each batch before unlocking its dependents. Continue ready tasks within existing authority without asking the user to approve routine batching. Failed or unverified prerequisites keep dependents pending; unrelated ready tasks may proceed. A final integration packet checks the whole parent contract before parent ACCEPT. Do not reset repair/resource budgets indefinitely by splitting: retain parent accounting, and escalate after two re-batching attempts without a verified batch or a demonstrably smaller context requirement.

## Failure analysis before retry

For every failed or incomplete attempt, the frontier host performs [failure analysis](assets/FAILURE.md) before reissuing work. Establish expected versus observed behavior, inspect raw evidence and partial effects, identify the confirmed cause and label deeper causes UNKNOWN when unproven. Select a targeted correction and a check that demonstrates recovery; never substitute blind retries or speculative explanations. The current frontier host remains planner, reviewer and final verifier; the local worker executes implementation/tests but cannot approve itself.

## Verification gate

Read the compact runner summary, relevant diff, and handoff first. For action-required packets, require actual matching edit/test evidence; normal model termination or printed tool syntax is not execution. Reject narration-only results even if the runner says review-ready. Inspect full logs only for discrepancies or diagnosis. Treat model reports as untrusted claims: command statuses come from recorded events, and missing exit codes remain unknown.

Independently run acceptance checks in a clean environment where feasible, and check specification cases not covered by agent-visible tests. Review auth, payments, ownership, secrets, migrations, and dependencies proportionately to risk. Never let local models approve their own security or deployment.

Decide ACCEPT / REWORK / BLOCKED. ACCEPT only the verified files after confirming the source has not changed since staging. A zero runner exit means review-ready, not correctness. Use a targeted correction packet for REWORK; at most two verifier returns before escalating or taking over. Report remaining verification gaps explicitly.

## Learn and measure

Keep project-local `.local-loop/lessons.md` and a run ledger using [review template](assets/REVIEW.md). Record what worked, failed, and the narrow rule/test that would prevent recurrence. Update this skill only when authorized; do not turn one project's workaround into a global rule.

Treat cloud-token savings as an unvalidated design goal, not an expected percentage. Compare equivalent cloud-only and hybrid tasks including planning, review, and rework. Track local input/output/cache separately; repeated-context totals are not unique generated tokens. Track latency and defects too. Preserve verbose logs locally instead of repeatedly polling them into cloud context.
