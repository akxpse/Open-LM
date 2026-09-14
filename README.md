# Open LM

Cloud planning. Local coding. Independent verification.

Open LM is a portable agent skill for delegating implementation to a local model while a frontier agent owns planning and final verification. Focused task briefs, batching and verified task chains keep context small and work reviewable.

**v0.1.0 · OpenCode + LM Studio or Ollama · macOS/Linux · MIT**

[Quick Start](#quick-start-installation) · [Latest results](#latest-ornith-10-results) · [Costs](#cost-comparison) · [Release notes](CHANGELOG.md) · [Roadmap](prd.md)

## What's new

One local session can read, implement, test and correct its work. No mandatory MCP call order, once-only test rule, separate report session or model-written handoff file. The frontier checks the final source and supplies compact verified context to the next task.

Scoped files and commands, protected acceptance tests, bounded execution and recorded usage remain. The older [guarded runner](references/guarded-runtime.md) is optional, not the default coding workflow. Automatic RAM gates and setup diagnostics are planned for v0.1.1; this release assigns resource checks to the host agent.

## Quick Start Installation

### 1. Requirements

- Node.js 22+, Git and an OpenCode CLI supporting `run --pure --format json`.
- LM Studio or Ollama on the same machine, with a tool-capable local model already installed.
- A frontier host with local command access, such as Codex or Claude Code.
- Enough available memory for weights, runtime context and development tools.

Tested stack: Node 22.23.2, OpenCode 1.17.15 and LM Studio 0.4.18+1 on macOS. Linux has regression-test coverage through CI; a Linux local-model workflow and Claude-hosted live execution have not been validated by the published pilot.

### 2. Install the skill

```sh
git clone https://github.com/akxpse/Open-LM.git
cd Open-LM
```

Place the complete skill folder at **one** location, named `open-lm`:

| Host | Personal installation | Project installation | Invoke |
| --- | --- | --- | --- |
| Codex | `~/.agents/skills/open-lm/` | `.agents/skills/open-lm/` | `$open-lm` |
| Claude Code | `~/.claude/skills/open-lm/` | `.claude/skills/open-lm/` | `/open-lm` |

For Codex, from the downloaded checkout:

```sh
mkdir -p "$HOME/.agents/skills"
test ! -e "$HOME/.agents/skills/open-lm" && (
  mkdir "$HOME/.agents/skills/open-lm" &&
  cp -R SKILL.md VERSION LICENSE README.md CHANGELOG.md CONTRIBUTING.md SECURITY.md prd.md agents assets references scripts benchmarks "$HOME/.agents/skills/open-lm/"
)
```

For Claude Code, use `$HOME/.claude/skills` in the same command. An existing installation is deliberately left untouched: review and replace its contents when upgrading. Keep `SKILL.md` directly inside `open-lm`, alongside `scripts/`, `references/` and `assets/`. Restart the host if discovery has not refreshed.

Alternatively, ask the host to read this checkout's `SKILL.md` by absolute path. See [setup and portability](references/setup.md) for configuration details.

### 3. Prepare the model

For the tested LM Studio route, start a localhost-only server and inspect the installed model key:

```sh
lms ls --json
lms ps
```

The successful Ornith 1.0 run used a 16K context, one concurrent request and no speculative draft model. Example for the tested installation:

```sh
lms load ornith-1.0-35b --context-length 16384 --parallel 1 --gpu max --no-speculative-draft-mtp --identifier open-lm-ornith10 --ttl 600 --yes
```

Substitute the model key from the local catalog; this command does not download weights. The packet uses the loaded **inference identifier**, which can differ from that key. Keep one heavy model resident. For authenticated LM Studio, supply `LM_API_TOKEN` using a trusted local secret loader—never in a packet, Git history or chat.

Ollama is also supported and remains the runner's backward-compatible default. Select `runtime: "ollama"` with an installed local tag, or `runtime: "lmstudio"` with the LM Studio inference identifier. The host verifies actual model/tool compatibility before substantial work.

### 4. Run a task

```text
Use $open-lm with OpenCode and the loaded Ornith 1.0 model in LM Studio.
Keep the frontier agent as planner and independent verifier. Check memory
and context readiness, stage the necessary files, and allow the local agent
to implement, test and correct within that scope. Batch and chain larger
tasks. Record cloud planning, review and repair usage separately from local
usage. Do not use a paid fallback without approval.

Task: [one concrete development outcome]
```

Use `/open-lm` in Claude Code. The host reads [setup](references/setup.md), fills the short [task brief](assets/TASK.md), prepares the packet and runs:

```sh
node /absolute/open-lm/scripts/run-local.mjs /absolute/control/packet.json
```

No npm dependency installation is needed for the runner. Control files and logs stay outside the worker's writable workspace. Exit 0 means **ready for independent review**, not accepted. The host checks final source, runs acceptance tests and records the verified checkpoint.

## Hardware and context

The local model is the bottleneck; the skill has no universal RAM minimum independent of model choice.

| Successful Ornith 1.0 configuration | Value |
| --- | --- |
| Model | Ornith 1.0 35B Q4_K_M GGUF |
| Machine | Apple M5, 32 GiB unified memory |
| Model weights | Approximately 21 GB |
| Runtime context / maximum output per request | 16,384 / 8,192 tokens |
| Concurrency | One model, one request |
| Pilot startup threshold | 21.5 GiB available before loading |
| Observed memory pressure | Normal throughout; swap unchanged |

Use the 32 GiB configuration as the tested starting point for these weights, not proof of a minimum for every model. Smaller models may need less memory. The host agent inspects residency, memory pressure and context fit, then batches oversized tasks rather than raising context beyond available memory. Closing unrelated apps or unloading another workload still requires authority. [Resource-readiness procedure](references/local-runtime.md#agent-managed-resource-readiness).

## Latest Ornith 1.0 results

The simplified two-file coding task completed with **3/3 independent test groups, frontier acceptance, zero repairs and zero failed tool calls**.

| Measurement | Successful rerun |
| --- | ---: |
| Local execution, excluding loading and frontier phases | 60.949 seconds |
| Local prompt / completion tokens | 25,001 / 1,548 |
| Cloud planning + review input / output tokens | 27,029 / 291 |
| Cloud cached input / cache-write tokens | 0 / 0 |

The run used the shipped single-session runner plus a private benchmark adapter for resource monitoring, server-side usage capture and independent verification. Those adapter services are **not bundled runtime automation**. Earlier failed trials remain identified separately; the successful rerun does not replace them. [Results, failure history and machine-readable evidence](benchmarks/simplified-pilot-2026-09-14/README.md).

## Cost comparison

This exploratory comparison uses the same task but **different command-policy revisions**. It compares successful runs, not total study expenditure or a controlled matched experiment.

| Metric | Terra only | Terra with Open LM + Ornith 1.0 | Reduction |
| --- | ---: | ---: | ---: |
| Cloud tokens, including cached input | 84,288 | 27,320 | 67.6% |
| API-equivalent cloud cost | $0.10870 | $0.05755 | 47.1% |

Counts include each successful workflow's cloud planning and review; neither required repair. Actual cache counts are priced at the recorded Terra rate card. Earlier failed trials, interactive harness development, audits and report preparation are separate, not hidden inside a claim of complete savings. API-equivalent costs are not Codex subscription invoices. [Data and calculation scope](benchmarks/simplified-pilot-2026-09-14/README.md).

### Illustrative cloud cost comparison

The following retained scenario uses **hypothetical token budgets**, not measured savings for these models. Pure cloud assumes 100,000 input tokens (80,000 cached) and 5,000 output; the Open LM cloud portion assumes 30,000 input (20,000 cached) and 2,000 output covering planning, review and repairs.

| Frontier model | Pure-cloud cost | Cloud cost with Open LM skill applied | Illustrative reduction |
| --- | ---: | ---: | ---: |
| Terra | $0.116 | $0.048 | 58.6% |
| Sol | $0.212 | $0.088 | 58.5% |
| Astra | $0.530 | $0.220 | 58.5% |

Same frontier model on both sides of each row; output includes reasoning and is not counted twice. [Scenario assumptions](benchmarks/cost-scenario.json) and [methodology](benchmarks/COSTS.md) retain the dated [pricing source](https://developers.openai.com/api/docs/pricing). A repeated, fully attributed savings study remains separate from release validation.

## Scope and safety

- OpenCode permissions are not an OS sandbox. Use reviewed, secrets-free staging; allowed test commands execute project code and child processes inherit the environment.
- The host supplies the needed exact, single-line commands before dispatch, including equivalent path forms and reviewed diagnostics. Wildcard shell access is not required. See [packet configuration](references/setup.md#default-single-session-packet-json).
- The runner supplies local routing, scoped client permissions, per-workspace ownership, bounded process/log/event handling and private summaries. It does not install models, call a frontier API, schedule batches, promote code or deploy.
- Resource checks and context budgeting are host responsibilities in v0.1.0. Hard RAM limits, full-context tokenization, automatic setup diagnosis and adaptive token budgets are not shipped.
- Model reports are untrusted claims. Preserve failures, diagnose before retries, and require independent acceptance. Windows process-tree cleanup is unsupported.

## Repository guide

| Resource | Purpose |
| --- | --- |
| [SKILL.md](SKILL.md) | Portable host instructions |
| [TASK.md](assets/TASK.md) / [CHAIN.md](assets/CHAIN.md) | Focused briefs and verified task chains |
| [Setup](references/setup.md) | Runtime configuration and packet schema |
| [Release validation](references/validation-v010.md) | Tested scope and remaining work |
| [Benchmark index](benchmarks/README.md) | Current pilot and historical evidence |
| [Roadmap](prd.md) | Released, planned and future work |

## Development

```sh
node --test --test-concurrency=1 scripts/*.test.mjs benchmarks/validate-fixtures.test.mjs
```

Tests cover the runner and a relocated installation without model downloads. Real-model smoke tests, output-quality experiments and savings studies remain distinct. See [contributing](CONTRIBUTING.md), [security reporting](SECURITY.md), [release notes](CHANGELOG.md) and the [MIT license](LICENSE). Model weights and third-party runtimes are not distributed here.
