# Task packet: one independently verifiable outcome

The strategist fills this brief before launch. Remove irrelevant sections rather than leaving ambiguity. Mark each statement MUST, SHOULD, or HINT where priority is unclear. Replace all example values; do not ask the local developer to choose unresolved product requirements. This template improves task clarity, not a guarantee of correctness.

## 1. Identity and outcome

- Packet ID, skill version, attempt number, parent task/chain ID, correction or batch ID:
- Predecessor packet IDs and their verified baselines/handoffs; successor handoff requirements:
- Parent requirement IDs owned by this packet and shared interface constraints:
- Outcome: one observable behavior, not a broad feature list.
- User value and acceptance owner:
- Explicit non-goals and deferred work:
- Definition of done: required checks + reviewable diff + handoff. Only the cloud verifier can ACCEPT.

## 2. Starting state and minimal context

- Workspace and source baseline (commit or file hashes), dirty changes to preserve:
- Relevant files to read, in order, and why each matters:
- Existing behavior, known missing pieces, established patterns to reuse:
- Runtime/language/package-manager versions and lockfile policy:
- Existing project instructions relevant to this packet (read those instructions in full):
- Do not read unrelated history, secret files, global configs, or the full repository speculatively.

### Local runtime readiness

- Selected server (Ollama or LM Studio), loopback endpoint, exact inference model ID, tag/digest/quantization, client/runtime versions and tool smoke-test evidence:
- Authentication readiness if needed: environment variable name only, never its value; verify no other heavy model is resident:
- RAM/pressure/swap, actual context, disk space and competing workloads:
- Relevant runtime failure checks: PASS / FAIL / UNKNOWN, evidence and authorized remedy:
- Retry safety: commands with non-idempotent effects and how to inspect them after interruption:
- Checkpoint location, parent budget remaining and frontier batching/recovery owner:
- UNKNOWN is not PASS. Resolve safety/authority failures before launch; context-fit failures go to the frontier host for batching.

## 3. Behavioral contract

- Exact exports, existing function signatures (no shorthand identifiers in edit hints), API routes, component props, or CLI arguments:
- Valid input/output examples, types, required/optional fields, defaults:
- Invalid input and expected error type/status/message; fail-open versus fail-closed:
- Null/empty/zero/negative/duplicate/boundary cases as applicable:
- Ordering semantics (e.g. code-point versus locale ordering), tie-breaking, time units/timezones:
- Mutation/immutability, side effects, idempotency, retry and concurrency behavior:
- Backward compatibility and migration constraints:
- For UI: states (loading/empty/error/success), labels, keyboard behavior, accessibility, responsive requirements:
- For APIs/data: trusted identity, ownership checks, authorization, persistence and atomicity rules:
- If a material contract decision is missing, stop and ask the strategist. Do not invent it.

## 4. Change and execution boundaries

- Exact readable context files and writable files; match runner writeFiles:
- Protected tests/configuration and existing user edits:
- Exact allowed commands, cwd, expected outputs; match runner commands:
- Dependencies allowed to add/change, versions/sources and lifecycle-script policy, or none:
- Network destinations permitted for tools, or none; model inference must stay local:
- No credentials, remote mutations, production data, deployment, purchases, destructive commands, or permission bypass unless specifically authorized in this packet.
- No refactors outside scope, silent error swallowing, skipped tests, relaxed types, or hardcoded test-case answers.
- Agent tool policies are not OS sandboxing; strategist must review executable project code and effective client configuration.

## 5. Known blockers, hurdles and permitted hints

For each anticipated issue:
| Symptom/evidence | Likely cause (or hypothesis) | Permitted remedy | Verification | Stop/escalate when |
|---|---|---|---|---|
| Fill only relevant known issues | Label unproven assumptions | Give concrete bounded hints, not blind bypasses | Exact check | Explicit condition |

Do not turn an example workaround into a requirement if it does not apply. Unexpected missing authority, conflicting requirements or unsupported APIs must be escalated.

## 6. Acceptance matrix

| Requirement ID | Input/scenario | Expected behavior | Test/check command | Required or diagnostic |
|---|---|---|---|---|
| Fill every MUST requirement | Include representative and adversarial cases | Observable assertion | Exact approved command | Required |

- Include error paths, ownership isolation, ordering, duplicates, and mutation safety where applicable.
- Existing tests must remain unchanged unless explicitly allowed. Explain every changed test.
- New tests must fail against the relevant broken behavior; avoid tautologies or tests that merely mirror implementation.
- Specify check ordering: focused tests, typecheck/lint, build, integration as appropriate. Do not run unrelated expensive suites.
- Verifier-owned hidden cases remain outside this packet. Passing visible tests is not full specification compliance.
- List checks intentionally unavailable and why. Never claim app readiness from an install-only check.

## 7. Work sequence and budgets

1. Read specified context; give a short plan tied to requirement IDs.
2. Implement the smallest coherent change, following existing style.
3. Run required checks once. State explicitly whether failure requires STOP for frontier RCA (default) or permits a specified self-repair within this packet. Never infer retry permission from the generic template.
4. At most two frontier-issued targeted repair rounds. A changed file invalidates relevant previous checks; otherwise do not rerun green checks.
5. Self-review: contract compliance, accidental edits, dead code, misleading comments, unsafe defaults, unhandled errors, test integrity.
6. Write HANDOFF.md and STOP, or give a short final response if this small packet explicitly requires no handoff file. Do not continue polishing beyond the contract.

- First failed check: STOP for frontier RCA, unless this packet explicitly authorizes a different bounded rule.
- First successful check: handoff and STOP; no further edits or repeat tests.

Runner wall-time/tool-event budgets:
- Verified runtime context, verification evidence, and client context (no higher than runtime):
- Output reserve and safety margin:
- Estimated system/tool overhead + packet + planned source reads + tool/history allowance; state tokenizer or estimation method and uncertainty:
- Largest permitted file read/test output, and how to narrow oversized results:
- Split/checkpoint condition and minimal context for a fresh correction session:
- If this packet exceeds context, return NEEDS_BATCHING to the frontier strategist with evidence, completed/remaining requirement IDs, changed files and last verified checkpoint. Do not discard constraints, silently truncate, or abandon the parent task. The strategist will issue smaller chained packets.
- v0 does not automatically count or enforce the complete context budget; leave no unchecked fit assumption.
Escalate on missing information/authority, scope expansion, repeated denial, exhausted repairs, or runtime/resource failure. Explain the smallest decision needed. Never bypass a denied tool by using another route.

## 8. Handoff contract (maximum 400 words)

- Outcome: ready for verification / NEEDS_BATCHING / blocked; never self-approve.
- For chaining: resulting interfaces, current file baseline, outputs required by successors, and outstanding parent requirements. Keep unverified work explicitly marked.
- Changed files and requirement IDs implemented.
- Exact checks performed; reference runner evidence. Missing exit codes are unknown, not zero.
- Unverified items and known risks, explicitly including skipped security/runtime checks.
- Dependencies or migration effects, if any.
- Repair attempts and blockers; no fabricated success or reviewer checks attributed to the local agent.
- On failure, return exact evidence and partial effects for frontier root-cause analysis before another attempt; label hypotheses and unknowns.
- Handoff must be factual and concise. Command/exit-code truth comes from logs, not recollection.
