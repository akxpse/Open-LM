# Qwen vs GLM — matched-task exploratory smoke test

**Accounting correction:** the token table below is worker-only, not the full workflow. Server logs reveal an extra title-generation request for each model. Across all five requests the runtime decoded 264 tokens for Qwen and 1,434 for GLM. These runtime counters are not complete API/billing totals. See [slowdown RCA](GLM-SLOWDOWN-RCA.md) and [performance data](GLM-QWEN-PERFORMANCE.json).

**Validity:** not a controlled model-ranking benchmark. Sampling, model defaults, prior runtime state and background applications were not all matched. No long-running task was tested. Retain this observation rather than retroactively relabeling it controlled.

2026-09-13. Both used OpenCode 1.17.15 -> authenticated LM Studio 0.4.18+1, one local model at a time on the same 32 GiB Apple M5 machine. This is one small task per model, not a cloud-only baseline or a broad quality/savings benchmark.

## Controls and provenance

The exact same task text, initial positiveTotal implementation, protected test file, tool permissions, 32768-token context, 2048 output setting, 120-second timeout and five-event cap were used. Only model and isolated workspace/output paths changed. Initial code was matched against Qwen's recorded edit oldString; protected tests retained SHA-256 bc6003e43698c1ef80d679a876b60e1d5b511c8694b52ae388d2b305a44d5c63.

Qwen: Qwen3-Coder-30B-A3B Q4_K_M GGUF, existing Ollama weights served by LM Studio. GLM: the user's newly downloaded lmstudio-community GLM-4.7-Flash Q4_K_M GGUF, file size 18,132,721,120 bytes. The earlier imported Ollama GLM copy was NOT used for this test.

GLM's selected model manifest enables thinking by default; reasoning tokens were observed. Model-specific templates/defaults and tokenizers differ, and there was no randomized multi-run timing control. Qwen had previous inference history; GLM was newly loaded. Model load/setup time is excluded from the run times below. App closures and memory state also differed.

## Observed results

| Metric | Qwen baseline | GLM GGUF |
| --- | ---: | ---: |
| Behavioral tests passed | 2 / 2 | 2 / 2 |
| Native calls | read, edit, bash | read, edit, bash |
| Test command exit | 0 | 0 |
| Normal agent stop, no extra tools | Yes | Yes |
| Agent run seconds | 20.753 | 79.533 |
| Input tokens, summed across steps | 15,003 | 14,834 |
| Output tokens, excluding separately reported reasoning | 255 | 232 |
| Reasoning tokens reported | 0 | 253 |
| Cache read / write reported | 0 / 0 | 0 / 0 |
| Worker-only reported step tokens | 15,258 | 15,319 |

Worker token totals are sums of four OpenCode step_finish events per run; the auxiliary title request is absent from those events. For this reporting format, total = input + output + reasoning; GLM generated 485 tokens when output and reasoning are combined, versus Qwen's 255. Input totals include repeated context, not one prompt/window. Zero reported caching does not establish absence of runtime-level reuse. Provider reporting and different tokenizers limit cross-model interpretation. No cloud usage or monetary savings is derived from these counters.

All-request runtime accounting is in [structured metrics](GLM-QWEN-SMOKE.json); a fully instrumented API total remains unknown. Cumulative local tokens are diagnostic, not the primary selection criterion; prioritize accepted quality, sustained throughput and RAM/swap stability.

Raw private evidence: Qwen direct-run-1 and GLM glm-direct-run-1 under <private-evidence-root>. [Structured metrics](GLM-QWEN-SMOKE.json) preserve step counters and final code without the API token or full private logs.

## Independent code review

Both implementations satisfy the stated behavior: TypeError for non-arrays, sum finite positive numbers only, ignore other entries, return zero for empty input, and avoid input mutation. Both use filter followed by reduce, with the same linear time and intermediate-array allocation.

GLM additionally checks typeof value === 'number' before Number.isFinite(value). That is harmless but redundant: Number.isFinite already rejects non-number values. Qwen's implementation is slightly simpler. Both protected tests passed and were unchanged; neither model requested additional tools after successful execution.

For this task, correctness was tied, with Qwen producing slightly simpler code and finishing sooner. GLM's final handoff was shorter. This sample cannot rank overall development ability, prove robust tool reliability, or predict complex implementation quality. The frontier inspected the code and execution evidence; models executed the tests. No cloud-agent implementation or hidden rerun is included.

## Setup failures and memory evidence

The original 6-bit MLX GLM was blocked by LM Studio's memory guardrail. Its low-confidence estimate stayed 31.76 GiB at 32K, 16K and 8K. No MLX inference or tool-test result exists.

The new GGUF appeared as a grouped variant while MLX remained selected. The CLI and REST load API rejected the advertised variant identifiers. After the user approved removing MLX, its exact folder was moved to Trash, not permanently deleted. Once the catalog refreshed, the ordinary zai-org/glm-4.7-flash key resolved to the remaining GGUF and loaded successfully. The observed issue was model selection/indexing, not a GGUF inference failure; deeper client behavior was not patched.

The GGUF estimate at 32K was 18.27 GiB; load completed in 1.90 seconds and lms ps showed 18.13 GB model size with context 32768, parallel 1. These are not peak-RAM measurements. A process snapshot during the run showed 19,642,816 KiB RSS for the inference runtime; this is one observation, not isolated model memory or a measured peak. System swap declined from roughly 2.63 GB just after loading to 2.61 GB after the run. Only GLM was resident; Ollama had no model loaded.

Nonessential apps were quit gracefully, preserving Cursor, LM Studio, the active host session and system/network services. MLX remains recoverable from Trash; moving it does not reclaim disk space until Trash is emptied. Neither GGUF download was removed.
