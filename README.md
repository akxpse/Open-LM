# Open LM Agent Skill

Cloud strategy. Local implementation. Independent verification.

Open LM is an experimental Agent Skill that pairs a frontier cloud planner and reviewer with a local coding agent. It moves bounded implementation and test/fix work to your machine, then returns compact evidence for the cloud agent to verify.

**v0.0.0 · MIT · OpenCode + LM Studio or Ollama · macOS/Linux runner**

Open LM keeps your frontier model focused on planning, review and verification, while local models handle implementation and test execution. Structured task packets give each handoff clear requirements and acceptance checks.

[Quick Start](#quick-start-installation) · [Cost comparison](#cost-comparison) · [Benchmarks](#benchmark-evidence) · [Safety](#safety-and-limitations) · [Contributing](CONTRIBUTING.md)

## How it works

1. **Plan:** the current cloud agent provides interfaces, permitted files, edge cases, blocker hints, acceptance checks and budgets in a precise task packet.
2. **Implement:** OpenCode uses one local model to read staged files, make changes and execute approved tests.
3. **Review:** the cloud agent inspects the actual diff, recorded command results and specification compliance.
4. **Repair or accept:** failures receive a root-cause analysis and a narrow correction packet. Only the frontier verifier can ACCEPT.

The cloud agent stays the product owner and verifier. The runner does not call a frontier API, automatically promote changes, deploy, download models or purchase fallback inference.

## Quick Start Installation

### 1. Prerequisites

- Node.js 22+, Git and an OpenCode CLI supporting `run --pure --format json`.
- LM Studio or Ollama on the same machine, with an installed tool-capable model.
- A cloud host able to execute local commands: Codex or Claude Code. A hosted container's `localhost` is not your laptop.
- Enough memory for the model **plus** runtime context/KV cache and other applications. Keep one heavy local model resident at a time.

Tested software stack: Node 22.23.2, OpenCode 1.17.15 and LM Studio 0.4.18+1. Model weights and third-party runtimes are separate downloads with their own licenses.

#### Hardware requirements when running Open LM

**The local model sets the hardware requirement.** Open LM runs the handoff and verification workflow; model weights, context memory and your development tools consume most of the RAM.

| Component | Smaller-model starting point | Tested 30–35B Q4 workflow |
| --- | --- | --- |
| Memory | **32 GB RAM recommended** as a runtime starting point; choose a smaller tool-capable model and modest context | **32 GiB unified memory** on our benchmark Mac; one model loaded at a time |
| CPU / platform | Apple Silicon with macOS 14+, or a compatible Linux machine/runtime | Apple M5, macOS; M5 is the tested chip, not a minimum requirement |
| GPU | Use acceleration supported by your runtime; dedicated VRAM and system RAM are separate budgets | Apple integrated GPU using shared unified memory |
| Storage | Space for the chosen model, runtime, repository, dependencies and logs | Roughly **18–21 GB per model file** for the tested Qwen Coder, GLM and Ornith quantizations, plus workspace/runtime space |
| Context | Start with a context that fits memory; split larger tasks into chained packets | **32,768 tokens**, one concurrent request |

LM Studio recommends 16 GB+ RAM on Mac and says 8 GB Macs may work with smaller models and modest context. **16 GB is a starting recommendation, not a measured Open LM minimum or a fit target for our 30–35B models.** See [runtime system requirements](https://lmstudio.ai/docs/app/system-requirements). The Open LM runner supports macOS/Linux, not native Windows.

For the larger models in this repository, start from the **32 GiB tested configuration** and check memory pressure with your actual model and context. Those runs already had roughly 2.4–2.5 GiB of swap in use; allow more headroom for long sessions or a busy development environment. See [benchmark setup and memory observations](benchmarks/multi-step-2026-09-13/README.md).

Longer context increases memory use. Keep one heavy model resident, leave room for the OS and editor, and batch oversized tasks instead of raising context beyond available memory. [Context and memory guidance](https://docs.ollama.com/context-length). Model fit and tool-call compatibility are separate checks.

### 2. Download and install

```sh
git clone https://github.com/akxpse/Open-LM.git
cd Open-LM
```

Place this complete folder at **one** of these locations, named `open-lm`:

| Host | Personal installation | Project-only installation | Invoke |
| --- | --- | --- | --- |
| Codex | `~/.agents/skills/open-lm/` | `.agents/skills/open-lm/` | `$open-lm` |
| Claude Code | `~/.claude/skills/open-lm/` | `.claude/skills/open-lm/` | `/open-lm` |

For example, from the downloaded checkout on macOS/Linux, install for Codex without overwriting an existing skill:

```sh
mkdir -p "$HOME/.agents/skills"
test ! -e "$HOME/.agents/skills/open-lm" && (
  mkdir "$HOME/.agents/skills/open-lm" &&
  cp -R SKILL.md VERSION LICENSE agents assets references scripts benchmarks "$HOME/.agents/skills/open-lm/"
)
```

For Claude Code instead:

```sh
mkdir -p "$HOME/.claude/skills"
test ! -e "$HOME/.claude/skills/open-lm" && (
  mkdir "$HOME/.claude/skills/open-lm" &&
  cp -R SKILL.md VERSION LICENSE agents assets references scripts benchmarks "$HOME/.claude/skills/open-lm/"
)
```

If the destination exists, review it before updating; the copy above deliberately does nothing. `SKILL.md` must be directly inside `open-lm`, alongside `scripts/`, `references/` and `assets/`. Restart the host if discovery has not refreshed. See [Codex skills](https://learn.chatgpt.com/docs/build-skills) and [Claude Code skills](https://code.claude.com/docs/en/skills). Claude Code's installation format is supported, but a Claude-hosted live run is not yet validated here.

To try without installing, ask the host to read this checkout's `SKILL.md` by absolute path.

### 3. Prepare the local runtime

**LM Studio, the tested Qwen workaround:** start its local server with authentication enabled and localhost-only access. Inspect installed and loaded models:

```sh
lms ls --json
lms ps
```

Load your chosen model with verified context allocation and concurrency one. This installation used:

```sh
lms load qwen3-coder-30b --context-length 32768 --parallel 1 --gpu max --identifier open-lm-qwen --ttl 600 --yes
```

The model key is installation-specific. Substitute your catalog's key and a context that fits your hardware; this command does not download weights. Unload any other heavy model in its owning runtime first. The packet uses the server's **inference identifier**, which can differ from the catalog key.

For authenticated LM Studio, supply `LM_API_TOKEN` through a trusted local secret loader, limited to model listing and inference. Never place its value in a packet, repository, command argument or chat. The runner uses an environment placeholder in client configuration, but child tools inherit the environment: this is not credential isolation.

**Ollama alternative:** verify its server, installed model and residency with `ollama list` and `ollama ps`. Use `runtime: "ollama"`, the exact installed tag, and `http://127.0.0.1:11434/v1`. Ollama remains the runner's backward-compatible default. The observed Qwen tool-format issue was worked around with LM Studio, not patched inside Ollama. See [runtime RCA](benchmarks/TOOL-CALL-RCA.md).

### 4. Invoke the skill

In Codex, use:

```text
Use $open-lm for this task. Keep yourself as planner and final verifier.
Use OpenCode with LM Studio and my loaded local model for implementation
and test execution. Read the skill and setup instructions, verify runtime
and memory readiness, stage only required files, and give the local
developer a bounded packet. Diagnose failures before issuing repairs.
No paid fallback without approval. Report cloud planning, review and
repair usage separately from local usage; leave unknown metrics null.

Task: [describe one concrete development outcome]
```

In Claude Code, use `/open-lm` with the same instructions. Open LM does not switch the host's selected model or make cloud planning free.

### 5. Review and run a packet

The host reads [setup](references/setup.md) and the [runtime checklist](references/local-runtime.md), fills [TASK.md](assets/TASK.md), and stages a secrets-free subset in a fresh Git root. Control files and logs stay outside the writable staging workspace.

This is a complete **schema example**, not a ready-to-run fixture. Replace the paths, files, command and model; create the staging Git root and task brief first:

```json
{
  "workspace": "/absolute/staging-work",
  "task": "/absolute/control/TASK.md",
  "output": "/absolute/control/run-001",
  "runtime": "lmstudio",
  "model": "open-lm-qwen",
  "baseURL": "http://127.0.0.1:1234/v1",
  "context": 32768,
  "outputTokens": 4096,
  "writeFiles": ["src/example.mjs", "HANDOFF.md"],
  "commands": ["node --test tests/example.test.mjs"],
  "timeoutSeconds": 600,
  "maxToolEvents": 30,
  "maxLogBytes": 8388608,
  "disabledMcp": [],
  "reviewedConfig": true
}
```

Set `reviewedConfig: true` only after inspecting the **effective** OpenCode configuration in staging. List every unrelated inherited MCP server in `disabledMcp` and verify it is disabled; an empty list disables none. Inspect providers, auxiliary agents, plugins, permissions and instructions without pasting secret-bearing config into chat. `--pure` does not disable all inherited settings.

```sh
node /absolute/open-lm/scripts/run-local.mjs /absolute/control/packet.json
```

Output: private `events.jsonl`, `stderr.log` and `summary.json`. Exit 0 / `review-ready` means **review required**, not acceptance. Verify actual edit/test execution and the resulting artifact. Preserve failures and use a new output directory for every repair.

## Cost comparison

Compare the same accepted task and quality gate. The hybrid's cloud total includes **planning, context/skill loading, handoffs, review, verification, failure diagnosis, repair instructions, orchestration and any authorized cloud fallback**. Count failed attempts too. Report setup separately with explicit amortization; do not hide task-specific troubleshooting as setup.

| Component | Pure frontier cloud | Open LM local/cloud |
| --- | --- | --- |
| Planning and requirements | Cloud | Cloud, including packet preparation |
| Exploration, implementation and test/fix work | Cloud | Local where delegation succeeds |
| Independent review and acceptance | Cloud | Cloud |
| Diagnosis, corrections and fallback | All cloud usage counted | All cloud supervision/fallback counted; local retries separate |
| Setup, hardware, energy and paid tools | Record separately | Record separately; local is not costless |

Moving 90% of coding locally is **not** proof of 90% lower cloud cost. Verbose handoffs, repeated reviews, failures and long cloud history can erase savings.

### Illustrative cloud cost comparison

This scenario holds token quantities constant across models to show price effects. **These token counts are hypothetical, not measured Open LM savings or predictions.**

- Pure cloud: **100,000 input**, including **80,000 cached**, plus **5,000 output** tokens.
- With Open LM skill applied (cloud portion only): **30,000 input**, including **20,000 cached**, plus **2,000 output** tokens covering all task-specific cloud phases listed above.
- Same frontier model on both sides of each row. Output includes billable reasoning; do not add it twice.
- Standard short-context rates; no separately billed cache writes, Fast mode, paid tools, regional uplift or taxes. Local compute and setup amortization are **excluded from this cloud-inference-only table**, not assumed free.

| Frontier model | Pure-cloud cost, without local delegation | Cloud cost with Open LM skill applied | Cloud-cost reduction (%) |
| --- | ---: | ---: | ---: |
| Terra (`gpt-5.6-terra`) | $0.116 | $0.048 | 58.6% |
| Sol (`gpt-5.6-sol`) | $0.212 | $0.088 | 58.5% |
| Astra (`gpt-6-astra`) | $0.530 | $0.220 | 58.5% |

*Hypothetical scenario based on assumed token usage—not measured benchmark savings.*

“With Open LM skill applied” includes cloud planning, handoffs, review, verification, diagnosis, repair instructions and any cloud fallback while a local model handles implementation.

USD, verified **2026-09-13** against [OpenAI pricing](https://developers.openai.com/api/docs/pricing). Sol's listed promotional rates are available at least through November 21, 2026; recheck when reproducing. Actual model usage, quality, cache behavior and latency differ. Repricing Terra tokens at Sol/Astra rates is a scenario, not a Sol/Astra benchmark.

This scenario has **69.5% fewer unweighted cloud tokens**, but about **58.5% lower cloud cost** because cache and output rates differ. See [methodology and formulas](benchmarks/COSTS.md) and [machine-readable assumptions](benchmarks/cost-scenario.json).

**Subscriptions:** reducing tokens does not automatically reduce a fixed monthly Codex/ChatGPT or Claude bill. It may improve available capacity, but allowance consumption is not a simple token-to-dollar conversion. API-equivalent values are not invoices. [Codex usage and pricing](https://learn.chatgpt.com/docs/pricing).

## Benchmark evidence

The longer study includes inference runs for five distinct local weight sets and Astra/Sol/Terra cloud arms. Two additional weight sets failed to load and are documented separately in the diagnostic record. It supports scoped quality/runtime observations, **not a general savings claim**.

| Evidence | Observed result | Limitation |
| --- | --- | --- |
| Multi-step native-tool/MCP calibration | Five local weight sets ran inference; 13 cloud attempts including repairs | One synthetic task; failures and unmatched harness variables retained; full frontier overhead unknown |
| Historical Terra-only baseline | 3 synthetic tasks passed; 6 recorded phases | Not matched to the current hybrid workflow; supervising/setup usage excluded |
| Qwen + LM Studio utility smoke | 2/2 checks; native read/edit/bash; 20.753 s | Not long-task reliability or end-to-end savings |
| GLM + LM Studio same utility | 2/2 checks; native read/edit/bash; 79.533 s | Defaults/cache/app conditions not fully matched; no general model ranking |
| Final packaged regressions | 14/14 checks (8 runner + 6 historical fixture checks) | Mocks do not prove OS isolation or token savings |

In this longer task, repaired Astra and Sol candidates passed the published functional gate. Ornith was the strongest local candidate and passed after two frontier corrections, with handoff/stop-discipline caveats. Terra's final candidate still failed the asynchronous-output check; other local models failed implementation, timed out or hit backend incompatibilities. These are **one-task observations**, not universal model rankings.

### Best-performing local model

**Ornith 1.0 35B Q4_K_M GGUF was the strongest local model in our multi-step coding/MCP benchmark.** It passed all 10 protected checks and the common post-hoc functional gate after two frontier-issued repair handoffs.

| Measure | Recorded Ornith result |
| --- | --- |
| Final functional quality | Passed the published gate after two repairs |
| Local agent wall time, initial attempt + repairs | **438.273 seconds (~7.3 minutes)**, excluding model loading and frontier overhead |
| Server input tokens, initial attempt + repairs | **336,613** |
| Server completion tokens, including reasoning | **14,468** |
| Model weights / tested memory | **21.17 GB GGUF / 32 GiB unified memory** |

Choosing Ornith first for further Open LM trials on this setup. [Full results and repair evidence](benchmarks/multi-step-2026-09-13/README.md).

Worker summaries omit auxiliary API usage. Server timing analysis found title requests outside the worker totals, so those counters are not full workflow usage. Local tokens are reported separately by tokenizer, not converted to cloud tokens supposedly saved.

See the [benchmark index](benchmarks/README.md), [Qwen/GLM observations](benchmarks/GLM-QWEN-SMOKE.md), [slowdown RCA](benchmarks/GLM-SLOWDOWN-RCA.md), and [controlled protocol](benchmarks/CONTROLLED-PROTOCOL.md). The [longer native-tool/MCP results](benchmarks/multi-step-2026-09-13/README.md) are archived with candidate snapshots, actual tests, API counters and RCA. A fully attributed repeated cloud/hybrid savings study remains **uncompleted**.

## Context, chains and long tasks

The frontier host budgets system/tools, packet, reads, history, output and headroom against the **actual runtime context**. v0 declares client limits but does not tokenize the full request or enforce the server allocation.

Oversized tasks return to the frontier for batching rather than abandonment. [CHAIN.md](assets/CHAIN.md) maps parent requirements and dependencies to smaller packets and verified checkpoints. Each successor uses a fresh local session. The standalone runner does not schedule this automatically.

For long tasks, monitor memory pressure, swap growth and sustained throughput—not cumulative local tokens alone. Keep one heavy model resident and never bypass runtime memory guardrails.

## Safety and limitations

- OpenCode permissions are **not an OS sandbox**. Use reviewed, secrets-free staging and stronger isolation when needed. Allowed test commands execute project code.
- Loopback inference is not complete network isolation. Child tools inherit the environment; global config and credentials require review. Never publish unreviewed transcripts/configuration.
- `review-ready` can accompany insufficient or failed tool evidence. Printed tool-looking text is not execution. Only the frontier verifier can ACCEPT.
- Wall/log/event limits bound attempts, but event caps are reactive. No hard RAM/token limits, automatic full-context accounting, stall detector or automatic batch scheduler are supplied.
- Diagnose before retrying. At most two verifier repair rounds, then escalate or take over with authority. Keep all attempts in the ledger.
- macOS live runs are recorded. Linux portability and Claude-hosted execution are not yet live-validated here. Windows process-tree cleanup is unsupported; the runner rejects Windows.

Read the [runtime failure matrix](references/local-runtime.md). It is an operational checklist, not a claim that every edge case has been tested.

## Repository guide

| File | Purpose |
| --- | --- |
| [SKILL.md](SKILL.md) | Strategist/developer/verifier contract |
| [assets/TASK.md](assets/TASK.md) | Complete packet template, constraints and blocker hints |
| [assets/CHAIN.md](assets/CHAIN.md) | Batches, dependencies and checkpoints |
| [assets/FAILURE.md](assets/FAILURE.md) | Root-cause analysis before retry |
| [assets/REVIEW.md](assets/REVIEW.md) | Review decision and measurement ledger |
| [scripts/run-local.mjs](scripts/run-local.mjs) | Bounded local OpenCode runner |
| [references/](references/) | Setup, runtime risks, lessons and v0 validation |
| [benchmarks/](benchmarks/) | Redacted evidence, protocols and cost accounting |

## Development and releases

No project npm dependency install is needed for the runner. Run its Node regression suite with:

```sh
node --test scripts/run-local.test.mjs scripts/run-local-lmstudio.test.mjs
```

Tests use fixtures/mocks. Repeat a real isolated tool smoke when changing runtime, client or model. Keep compatibility, output-quality and savings experiments separate.

Open LM remains experimental v0.0.0. Improvements should come from recorded failures and reproducible tests. See [CONTRIBUTING.md](CONTRIBUTING.md), [CHANGELOG.md](CHANGELOG.md), and [MIT license](LICENSE). See [SECURITY.md](SECURITY.md) for safe reporting. Never attach unreviewed private evidence to an issue. This project does not distribute model weights or grant rights to third-party runtimes/models.
