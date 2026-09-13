# v0.0.0 validation record

2026-09-13, macOS, Node 22.23.2, OpenCode 1.17.15, Ollama 0.33.3, local Qwen3 Coder 30B. No Claude CLI was installed, so Claude-hosted behavior remains untested; only portable skill format was checked against documentation.

## Automated checks

- Skill Creator frontmatter/naming validation: passed.
- Node test suite: 4 tests passed, including configuration rejection, policy generation, error/unknown-exit evidence, and mocked lifecycle cases (completion, timeout, event limit, log limit, launch failure).
- Public-file scan for known personal paths and credential markers: no matches. This is not a comprehensive security audit.

## Real packaged runner test

First run failed: absolute edit permission patterns did not match OpenCode's worktree-relative checks. Wrong inferred file context caused extra exploration. At ten tool events the runner stopped the process, exercising the reactive limit successfully. No implementation change was applied.

Fix: require staging at its Git root, generate relative edit patterns, pass --dir explicitly, and put the workspace path in the task prompt. A local effective-config check also revealed an inherited unrelated MCP server; disabledMcp was added and verified to override its enabled state. Unit coverage was updated for relative paths and MCP disabling.

Second run: review-ready, exit 0, 21.724 seconds, five tool events: read/read/edit/bash/write. Shell test exit 0. Local reported usage: input 4,024; output 509; cache read 17,839. These are client-reported counters, not proof of cloud-token savings. The runner correctly kept accepted=false for the independent verifier.

Verifier reran the test and added negative, zero and fractional-input assertions. All passed. This is a small transport/workflow smoke test, not evidence of production-quality implementation across arbitrary tasks.

## Release limitations

No Windows process-tree support, automatic OS sandbox, environment credential isolation, universal model compatibility, or cloud-savings guarantee. Effective client configuration must still be reviewed. Limits on tool events are reactive; shell permission matching follows OpenCode parsing rather than a byte-for-byte command firewall. No automatic promotion or deployment. Full logs stayed outside the public package.

## LM Studio adapter validation — 2026-09-13

OpenCode 1.17.15, LM Studio 0.4.18+1, selected llama.cpp runtime 2.37.0, same Qwen3-Coder-30B Q4_K_M weights as the Ollama comparison, 32768 context, parallel 1. At this adapter-validation milestone only Qwen was used for inference; subsequent GLM and other-model tests are recorded separately.

Qwen implemented the adapter and its additional tests through OpenCode. The frontier reviewed code and actual command evidence, rejected defective test hunks, and selected the valid environment-restoration hunk. It did not substitute frontier-written production code. Two rounds of test correction exposed ordinary coding errors; see the [RCA](../benchmarks/TOOL-CALL-RCA.md), which retains failures as well as successes.

Final selected artifact: local Qwen executed node --test scripts/run-local.test.mjs scripts/run-local-lmstudio.test.mjs once with no edit permission. Eight tests passed, zero failed; command exit 0. The verification-only agent run finished normally in 16.992 seconds with one bash tool event. Added tests cover runtime defaults/rejection, LM Studio routing, token placeholder/no value in serialized config, mocked authenticated catalog lookup/model routing, wrong model ID and HTTP failure. Tests are not an exhaustive security audit; normalized runtime and no-token API-key absence were also inspected in code, not fully asserted by the retained tests.

Direct no-proxy smoke: native read -> edit -> bash, 20.753 seconds, normal completion, no extra tool calls, command exit 0. Two verifier-owned tests passed for finite-positive-number filtering, non-array rejection, empty input and nonmutation. The frontier inspected the resulting code and tool evidence; Qwen executed the checks. No separate cloud-agent rerun is claimed.

Effective OpenCode config was independently inspected locally: only lmstudio enabled, all auxiliary agents routed to the same local model, unrelated inherited MCP disabled, no plugins, scoped permissions and authenticated loopback endpoint. The real token did not enter project configuration; generated config uses an environment placeholder.

Memory caveat: model size reported by lms (18.56 GB) and its pre-load estimate (19.46 GiB) are not measured peak RAM. System swap later grew to roughly 6.7 GB; one-model residency does not make 32K context universally comfortable on a 32 GiB machine. Investigate a smaller window in a separate run rather than attributing the parser failure to memory.

The automatic review-ready gate is unchanged: it is not proof of required tool execution, successful tests, or appropriate stopping. Host verification remains mandatory. These are diagnostic and adapter checks, not a matched cloud baseline or savings benchmark.

## Multi-step calibration and public release

See the [multi-step report](../benchmarks/multi-step-2026-09-13/README.md) for all seven distinct local weight sets and Astra/Sol/Terra cloud attempts. Failed loads, syntax/logic errors, unauthorized repeated checks, cloud-review mistakes and missing usage remain visible. Post-hoc verification is separate from original visible scores. The standalone runner did not acquire automatic stop-on-failed-test, full context/RAM accounting or a savings guarantee during this documentation release.

Final release check: local Ornith executed the unchanged eight runner tests plus six historical fixture checks (14/14), including after whitespace-only source formatting. It executed the common candidate verification separately. Skill Creator validation passed using temporary PyYAML 6.0.2; initial attempts lacked that dependency. See the archived final verification records. No runtime behavior was changed by the formatting pass.
