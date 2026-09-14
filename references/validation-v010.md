# v0.1.0 validation

## Shipped scope

The default is the single-session `scripts/run-local.mjs` workflow, followed by independent host verification. Scoped permissions, optional predecessor links, cooperative workspace ownership, strict event handling and bounded cleanup remain. The guarded three-phase runner is opt-in compatibility functionality, not the default local coding protocol.

## Successful Ornith 1.0 run

Ornith 1.0 35B Q4_K_M GGUF completed the simplified two-file coding task through OpenCode and LM Studio. The saved outcome records:

- Three independent visible/held-out test groups passed with intact verification files.
- Frontier review returned ACCEPT; zero repair rounds and no failed tool calls.
- Local execution took 60.949 seconds, excluding model loading and cloud phases.
- Local usage: 25,001 prompt and 1,548 completion tokens.
- Cloud planning/review usage: 27,029 input and 291 output tokens, no cached input or cache writes.
- Normal memory pressure, unchanged 722 MiB swap, and clean model unload.

The benchmark's private adapter added request-level usage capture, model loading, RAM guards and independent verification. These are not automatic services provided by the distributed standalone runner. The release's task-brief and packet interface lets the frontier arrange those responsibilities through available tools.

See the [sanitized pilot record](../benchmarks/simplified-pilot-2026-09-14/README.md). The result is one small task, not evidence of universal reliability, long-running stability or matched end-to-end savings. Earlier failures remain separate; output that passed a later post-run check was not retroactively accepted.

## Automated checks

```sh
node --test --test-concurrency=1 scripts/*.test.mjs benchmarks/validate-fixtures.test.mjs
```

The final local run passed **69/69 tests** on Node 22.23.2 with serial suite execution, including the relocated-installation check.

Coverage includes local routing, permissions, missing/failed tool evidence, malformed streams, scope validation, cooperative locks, cancellation and child cleanup. Optional guarded mode has separate tests for phase permissions, protected baselines, report bounds and one-shot execution. The package test relocates the distribution to a path containing spaces without repository metadata or npm dependencies, checks links and executes its runtime tests.

These are deterministic tests, not model observations. Serial suite execution reduces contention in process-timeout fixtures; timeout failures remain test failures rather than being converted to success. The final release is checked locally before pushing, and GitHub Actions verifies Node 22 on macOS and Linux after publication.

## Remaining work

Automated RAM readiness and setup diagnostics are planned for v0.1.1. Adaptive context/output budgets, extended endurance testing and a repeated fully attributed savings study remain separate work. Claude-hosted and Linux local-model execution are not established by the macOS pilot. The runner is client policy and orchestration, not OS isolation.

Historical [v0 evidence](validation-v0.md) remains available with its original scope.
