# Multi-step native-tool/MCP calibration

**JOBS-MCP-001 · September 13, 2026 · exploratory, one synthetic task.**

This is an implementation-quality/runtime calibration, **not proof of end-to-end cloud-token or dollar savings**. All seven distinct installed local coding weight sets were scheduled sequentially. Astra, Sol and Terra used model-specific subagent controllers. Failed loads, incomplete runs, unsolicited repairs, reviewer errors and transport failures remain in the record.

## Task and controls

Implement a dependency-free Node 22 JSONL job planner across parser, planner and CLI modules: schema validation, recovery, normalization, tuple-safe deduplication, filtering order, UTF-16 sorting, tenant batching, immutability, strict arguments, stdin and safe error handling. Retrieve requirements through an actual synthetic read-only **stdio MCP server**, not a production account.

The frozen [fixture](fixture/fixture.mjs), [ten-check suite](fixture/verify.test.mjs), and [MCP server](fixture/mcp-server.mjs) are included. Check groups contain multiple assertions; they are not independent development tasks. The packet said tests exercised all MUST behavior, but source review exposed gaps; that original overstatement is preserved.

Local envelope: 32,768 runtime/client context, 4,096 completion limit, temperature 0, top-p 1, concurrency 1, 24 tool-event cap, 600-second attempt cap, 300-second upstream request timeout. Same four context files; only three modules and a ≤180-word handoff writable; execute the suite once and stop on failure for frontier RCA. The runner did **not** automatically enforce that stop rule.

Local stack: Apple M5, 32 GiB; Node 22.23.2; OpenCode 1.17.15; authenticated LM Studio 0.4.18+1, llama.cpp Metal backend. Existing Q4_K_M GGUF weights; one LLM resident at a time. Ollama weights were hard-linked into LM Studio without deleting originals. No weights are distributed.

Cloud: model-specific Codex CLI at low reasoning, followed by a separate same-model source-review session. Controllers did not implement local candidates. CLI implementation/review usage is measured; controller/root overhead is not fully attributable.

Matched: task, fresh-start stubs, MCP data, protected checks, requested stop policy, permitted files and broad budgets. **Not matched:** Codex/OpenCode tools/system prompts, cloud context/output/sampling, native reasoning/templates/tokenizers, seed/top-k/KV/batch defaults, cache state and service tier. Fresh model/session locally; OS cache/background load uncontrolled. Cloud controllers overlapped some local inference, a latency confound. Order was not randomized or counterbalanced.

## Local first-attempt results

Runner wall time excludes loading/frontier overhead. Server completion includes reasoning. `≥` marks completed-request lower bounds, not full usage.

| Local model | Recorded suite progression | Seconds | Server input | Server completion | Outcome |
| --- | --- | ---: | ---: | ---: | --- |
| Qwen3-Coder 30B-A3B | 5/10 → 6/10 | 283.277 | ≥77,761 | ≥5,665 | Interrupted; failed, unauthorized self-repairs |
| GLM-4.7-Flash | 0/1 module-load failure → 1/10 | 486.215 | ≥44,782 | ≥2,852 | Request timeout; failed |
| Ornith 1.0 35B | 9/10 → 9/10 → 9/10 → 10/10 → 10/10 | 219.741 | 184,719 | 7,438 | Stop-rule violations and remaining source defects |
| Gemma 4 8B | No inference | — | — | — | Backend failed to load |
| Qwen3.6 35B-A3B | No inference | — | — | — | Backend failed to load |
| Qwen3 14B | 0/10 | 600.031 | ≥31,489 | ≥5,359 | Wall timeout; unverified post-failure edits |
| DeepSeek R1 14B | No test; only two MCP calls | 90.039 | ≥4,041 | ≥804 | Backend tool-grammar failure |

Ornith also tried one altered shell command that was denied, not executed. Green suites do not erase its earlier failures. Qwen14's final syntax corruption was introduced after its recorded failed suite; it did not cause those earlier assertion failures.

Five-second samples showed no critical-pressure or >1 GiB swap-growth guard trigger in the completed runs above. Ornith reached pressure level 2 late; others remained at normal level 1. Existing swap was roughly 2.4–2.5 GiB and declined, not zero. Sampling misses peaks and does not measure energy, RSS or thermal throttling.

## Local frontier-issued repairs

Ornith received two fresh-session correction packets, preserved as `ornith-2` and `ornith-3`. Each retrieved MCP context, edited only permitted files, ran the protected suite once (10/10) and stopped. First correction fixed nonnegative/exact-field validation and stdout error handling. The common diagnostic then exposed explicit undefined option defaults; second correction fixed those and made output copies explicit.

| Attempt | Parent | Seconds | Server input | Server completion incl. reasoning | Usage complete |
| --- | --- | ---: | ---: | ---: | --- |
| ornith-2 | ornith-1 | 126.558 | 77,802 | 4,124 | Yes, 7/7 requests |
| ornith-3 | ornith-2 | 91.974 | 74,092 | 2,906 | Yes, 7/7 requests |
| Entire Ornith lineage | Initial + two returns | 438.273 | 336,613 | 14,468 | Yes, 29/29 requests |

These totals exclude separate local verification and unallocated cloud supervision. They do not turn the original self-repairs into authorized behavior. Final handoff has 190 whitespace-delimited tokens versus a requested 180-word cap; no formal word-count convention was preregistered, so brevity compliance is a disclosed caveat, not a population-level procedural score.

## Cloud results and partial cost accounting

See [cloud-costs.json](cloud-costs.json) for every attempt and phase. API-equivalent estimates use measured CLI counters and standard short-context rates checked September 13, 2026: Astra $10/$1/$50, Sol $4/$0.40/$20, Terra $2/$0.20/$12 per million input/cached/output tokens. Reasoning is already in output. Actual service tier/context-band billing was not verified. These are **not invoices or full workflow cost**. [Official pricing](https://developers.openai.com/api/docs/pricing).

| Attempt | Parent | Visible checks | Input incl. cache | Cached subset | Output | CLI seconds | Est. CLI USD |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: |
| astra-1 | Fresh | No test | 83,080 | 47,616 | 564 | 33.838 | $0.430456 |
| sol-1 | Fresh | Launch failure | 233,175 | 188,544 | 5,061 | 121.406 | $0.355162 |
| terra-1 | Fresh | 10/10 | 168,044 | 124,928 | 5,011 | 108.932 | $0.171350 |
| astra-v2-1 | Fresh | 10/10 | 148,001 | 115,456 | 2,947 | 117.962 | $0.588256 |
| astra-v2-2 | Fresh | 10/10 | 148,569 | 105,344 | 3,186 | 123.178 | $0.696894 |
| astra-v2-3 | astra-v2-2 | 10/10 | 154,381 | 87,040 | 2,090 | 89.953 | $0.864950 |
| sol-v2-1 | Fresh | 10/10 | 193,059 | 141,568 | 3,574 | 90.409 | $0.334071 |
| sol-v2-2 | Fresh | 10/10 | 192,358 | 150,400 | 3,606 | 97.494 | $0.300112 |
| sol-v2-3 | sol-v2-2 | 10/10 | 161,578 | 111,872 | 2,737 | 84.490 | $0.298313 |
| sol-v2-4 | sol-v2-3 | 10/10 | 157,828 | 97,920 | 2,906 | 73.594 | $0.336920 |
| terra-v2-1 | Fresh | 9/10 | 191,892 | 144,128 | 3,544 | 82.146 | $0.166882 |
| terra-v2-2 | terra-v2-1 | 10/10 | 143,870 | 110,848 | 2,243 | 72.083 | $0.115130 |
| terra-v2-3 | terra-v2-2 | 10/10 | 160,389 | 125,952 | 2,380 | 64.319 | $0.122624 |

Fresh starts and repairs are **not three independent repetitions**. Original manifests incorrectly wrote three repetitions; the archive preserves that as provenance while labelling real lineage.

| Specific repair chain, not entire cohort | Input / cached / output | CLI seconds | Estimated CLI cost |
| --- | --- | ---: | ---: |
| Astra v2-2 → v2-3 | 302,950 / 192,384 / 5,276 | 213.131 | $1.561844 |
| Sol v2-2 → v2-3 → v2-4 | 511,764 / 360,192 / 9,249 | 255.578 | $0.935345 |
| Terra v2-1 → v2-2 → v2-3 | 496,151 / 380,928 / 8,167 | 218.548 | $0.404636 |

These are explicitly selected chains, **not quality-normalized cost-per-accepted-task rankings**. Other fresh/calibration costs remain in the table and ledger. One synthetic task provides no basis for population confidence intervals or general model rankings.

## Root-cause analysis

- **Qwen Coder:** ambiguous tuple concatenation; wrong ties/counts, locale sorting and insufficient planner/CLI validation. Native tools executed. These are implementation/stop-discipline failures, not the earlier tool-format transport issue.
- **GLM:** inverted object/array predicates, parser/CLI interface mismatch, CommonJS `require` in ESM and extra newlines. Request 7 started HTTP 200 streaming, then hit the collector's explicit 300-second timeout mid-reasoning without final usage. About 1.05 MB of unfinished stream is private evidence, not completion. Deeper cause of prolonged reasoning remains unknown.
- **Ornith:** initial CLI defect, repeated unauthorized self-repairs and green-check reruns. Final first-attempt planner accepts negative safe integers and extra fields, then copies extra fields into output.
- **Qwen14:** coerces schema types, tests BigInt with `Number.isSafeInteger`, lacks actual CLI behavior; subsequent edits leave malformed source. Wall guard ended it at 600 seconds.
- **Gemma load:** backend expected 2,131 tensors but found 720.
- **Qwen3.6 load:** backend expected four `qwen35moe.rope.dimension_sections` values but received three. These are observed file/runtime incompatibilities, not evidence of bad coding quality, corrupted downloads or insufficient RAM. Upstream remedy was not tested. See [backend errors](load-failures/backend-errors.json).
- **DeepSeek:** the second HTTP 200 stream emitted an SSE error: `Unexpected empty grammar stack after accepting piece: >` (token 397). Backend logs corroborate a constrained tool-generation grammar failure after the initial two MCP calls. No code reads/edits/tests occurred; failed request supplied no usage. Pressure stayed normal and swap constant. No untested parser workaround was applied.
- **Cloud calibration:** shell-read authorization, default cwd/shell and host Update File adapter failures required an explicit v2 transport accommodation. Specific shell reads and Add File replacements were authorized; tests unchanged. Initial Astra/Sol failures are not clean coding baselines.
- **Terra:** `fs/promises.readFile(0)` rejects numeric fd in this runtime. First repair changed stdin handling; second fixed normalized-object key validation.
- **Sol:** both fresh v2 candidates accepted/spread extra planner fields and rejected explicit `undefined` defaults. First same-model review missed these; targeted repair corrected them.
- **Cross-cloud error paths:** ordinary `try/catch` around `stdout.write` does not handle asynchronous stream error events. Apply the same diagnostic to Astra, Sol and Terra, not a tougher gate on one.
- **Reviewer error:** several reviews claimed `/^[0-9]+$/` accepts final LF without multiline mode. Resolve this in the actual JavaScript runtime, not by reviewer vote. Preserve raw verdicts separately from host adjudication.
- **Collector race:** `result.json` can precede final aborted-request records. Qwen14's early completeness flag is stale. Publication uses final request records; missing usage is null, not zero.

## Final verification and verdict

A common post-hoc pass reruns protected checks on final snapshots and applies the same targeted boundary/error checks to all candidates. These cases were selected after source inspection: **not a predeclared hidden holdout**. Verifier code does not repair candidates.

**Collection and final checks completed.** The local agent executed verification; the frontier authored the criteria and reviewed the artifacts. No candidate was repaired by the verifier. Packaged tests passed **14/14** (8 runner checks plus 6 historical fixture checks), including after whitespace-only package polish. Skill frontmatter/naming validation passed after installing its missing PyYAML dependency in a temporary directory.

| Final candidate | Protected checks | Common post-hoc functional gate | Host verdict |
| --- | --- | --- | --- |
| Astra `astra-v2-3` | 10/10 | Pass | Accepted for this calibration's tested domain after one return |
| Sol `sol-v2-4` | 10/10 | Pass | Accepted for this calibration's tested domain after two returns |
| Terra `terra-v2-3` | 10/10 | Fails asynchronous stdout error check | Not accepted at two-return limit |
| Ornith `ornith-3` | 10/10 | Pass | Functional candidate passes after two returns; handoff brevity caveat remains |

The common gate checks strict final-LF arguments, negative/extra-field validation, explicit undefined defaults and an actually reached asynchronous stdout fault. The first fault diagnostic could mistakenly count an earlier unrelated failure as success; its refined version records an independent fault-reached marker. Terra v2-1's earlier apparent fault pass is therefore superseded, not a successful recovery. This refinement and the original result are both archived.

Both JavaScript regex controls returned false for a final LF; the repeated reviewer objection was disproved. The verification-only diagnostic agent prefixed one command with a same-workspace `cd`; actual execution succeeded, but it did not obey the requested literal command. This reinforces that OpenCode permissions are not an exact shell-string firewall.

**Scoped verdict:** Astra produced the strongest complete cloud candidate with fewer returns; Sol reached the same published gate at a lower estimated captured CLI cost. Ornith was the strongest local candidate on this one task, ahead of Qwen Coder/GLM, but needed substantial supervision and was not a reliable unattended developer. Terra was cheaper in captured phases but did not meet the final gate. No general speed/quality/token-efficiency ranking follows from one non-randomized task.

See [host adjudication](host-adjudication.json), [initial common verification](verification/first-pass.json), [refined diagnostic](verification/refined-diagnostic.json), and [final changed-candidate verification](verification/final/final-results.json). Unusual accessor/prototype inputs, simultaneous stderr failure, context overflow and long-duration recovery are not comprehensively verified.

## What this cannot establish

**End-to-end savings remain unknown for Astra, Sol and Terra.** CLI and local counters do not include fully attributed root/controller planning, packets, diagnosis, reviews, orchestration and setup. Local first attempts did not achieve equivalent accepted outcomes. Do not replace missing overhead with zero, a guess, or this entire long-lived conversation's cumulative count. Local tokens cannot be repriced as cloud tokens allegedly saved.

[Cost methodology](../COSTS.md) includes a clearly hypothetical comparison. A confirmatory study still needs clean cloud phase boundaries, matched accepted outcomes, balanced repetitions across held-out tasks and all planning/review/repair costs.

## Evidence and reproduction

- [overview.json](overview.json): terminal attempts, lineage, actual test executions and missing metrics.
- [load-outcomes.json](load-outcomes.json): sequential load/run status; failed loads have no coding score.
- `runs/<label>/`: final candidates, manifests/hashes, tools, actual TAP, MCP calls, usage, cloud reviews or local request/resources metadata.
- [harness hashes](harness/source-hashes.json): original source hashes. `harness/*.txt` are **redacted audit snapshots, not ready-to-run scripts**. Adapt host binaries, paths and private authentication locally. They reflect the latest collector, not every earlier adapter revision.
- `fixture/`: frozen task, tests and synthetic stdio MCP server.
- `verification/`: locally executed common/post-hoc checks, refined fault reachability, final changed-candidate checks and worker counters. Verifier-only requests were not server-traced; their worker counters are not complete API accounting.

Reproduce in a fresh secrets-free Git staging root per attempt: initialize `starters` from the fixture, copy the protected test unchanged, run the MCP server over Node stdio and supply the frozen packet. Configure Open LM with reviewed benchmark MCP permissions and the sampling overrides shown in the wrapper snapshot. Verify runtime/model/context/residency. Cloud runs use the named CLI model and documented v2 adapter. These operations consume resources/allowance; inspection must not launch them.

Run tests in the candidate directory; preserve failures and parent starting hashes for repairs. Finalize all requests before judging usage completeness. A portable one-command benchmark launcher is not supplied in v0. Frozen candidate/harness/load evidence retains original whitespace for provenance; it is intentionally excluded from maintained-source whitespace linting. Raw private transcripts, request/response bodies, global configs, credentials, weights and host session IDs are excluded; published paths are redacted. Candidate snapshots are experimental, **not production recommendations**.
