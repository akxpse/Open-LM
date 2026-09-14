# Qwen tool-call investigation — 2026-09-13

Status: a practical Qwen route is verified through OpenCode -> LM Studio, and the reviewed LM Studio adapter is promoted into Open LM. Ollama itself is not patched; universal Qwen reliability is not established. This is a diagnostic experiment, not a cloud/local savings benchmark.

## Environment and observed failure

OpenCode 1.17.15, Ollama 0.33.3, qwen3-coder:30b Q4_K_M (digest prefix 06c1097efce0), macOS Apple M5, 32 GiB RAM. Only Qwen was used for inference. Installed model metadata explicitly configures the qwen3-coder renderer and parser; the displayed Prompt passthrough template alone is not evidence of misconfiguration.

The prior run-002 and run-004 regression repair logs contain an attempted read in assistant text, beginning with a function block and ending with the closing tool-call tag, but missing the opening tool-call tag. They contain zero native tool events and no edits. The runner incorrectly called these review-ready, although accepted remained false and the frontier rejected both.

Ollama's version-pinned parser requires the opening tag before it collects a function call. Without it, it emits content. This mechanism matches the observed text and upstream reproductions. Pre-parser generation was not captured for the original failures, so the model's exact reason for omitting the tag remains unknown. Do not blame RAM, context overflow, quantization, or the OpenCode SDK without additional evidence.

## Primary-source findings

- [Ollama issue 16686](https://github.com/ollama/ollama/issues/16686): same missing-opening symptom, including the same model digest prefix; open when checked. Its system-prompt workaround is explicitly probabilistic.
- [Ollama PR 16693](https://github.com/ollama/ollama/pull/16693): proposed bare-function fallback with streaming tests; still open, not a shipped fix when checked.
- [Ollama issue 12751](https://github.com/ollama/ollama/issues/12751): reproduction with multiple tools; reporter says debug output confirms the model omits the opener. Open when checked.
- [Qwen3-Coder issue 475](https://github.com/QwenLM/Qwen3-Coder/issues/475): reporter improved behavior with stronger native-wrapper instructions, particularly addressing calls after prose. This is a reported mitigation, not a measured reliability result from this study.
- [Installed-version parser source](https://raw.githubusercontent.com/ollama/ollama/v0.33.3/model/parsers/qwen3coder.go): opening-tag requirement and first-closing-tag collection. The latter makes literal protocol delimiters inside tool arguments another relevant edge case.
- [llama.cpp PR 26252](https://github.com/ggml-org/llama.cpp/pull/26252): merged August 2, 2026, with a missing-wrapper workaround. [Issue 26987](https://github.com/ggml-org/llama.cpp/issues/26987) reports a further unhandled case where both start markers are absent. Not installed or tested here.
- [OpenCode issue 4255](https://github.com/anomalyco/opencode/issues/4255): older LM Studio empty-array hang report, closed; closure alone does not establish a released fix. It is not the observed stack or failure pattern here.
- [Ollama issue 17636](https://github.com/ollama/ollama/issues/17636): some Hugging Face GGUF imports lack native renderer/parser assignment. The installed library model already has both. Switching GGUFs alone is not an established remedy for the observed failure.

## Controlled probes and failed repair attempts

Private evidence root: `<private-evidence-root>`. The temporary HTTP proxy bound only to loopback, forwarded only model catalog and chat-completion endpoints, and saved request/response bodies locally. It did not parse, repair, or execute tool-looking text. Formatting mode prepended an independently written instruction to the first system message only when tools were present. Global configuration and model weights were unchanged.

| Run | Observed evidence | Interpretation |
| --- | --- | --- |
| baseline-1 through baseline-3 | Each completed one native read; stopped intentionally at one tool event | Unchanged stack can work; not full task completions |
| format-1 through format-3 | Each completed one native read; raw responses had structured calls and no prose preamble | Prompt did not break these probes; controls also passed, so no demonstrated success-rate gain |
| implementation | Six read/grep events; no edits or tests; 71.179 seconds | Later upstream response lacked a finish marker and DONE; OpenCode recorded unknown completion, runner rejected |
| escaped-implementation | Two reads and one native edit; no tests; stopped by frontier at 171.085 seconds | Edit contained a corrupted instruction and an undefined poutputTokens identifier; later requests repeatedly failed to complete; rejected |

The literal-tag writing attempt is consistent with delimiter collision in the parser, but pre-parser tokens were not captured and that deeper cause is not proved for this run. Source escaping was tried as a targeted correction. It did not produce an acceptable implementation. Do not count either repair as a success or repeat the same packet blindly.

## Decision after the Ollama attempts (historical)

Two bounded repair attempts exhausted the current correction budget. The main runner and tests remain unchanged. Invalid staging edits are retained only as evidence. A prompt-only mitigation cannot be described as a complete parser fix.

The desired narrow runner hardening remains: model-specific protocol guidance, diagnostic warnings for suspected unparsed assistant tool syntax, and a fail-closed review-ready gate with synthetic regression coverage. It must never convert arbitrary prose into executable calls. Additional native read/edit/test smoke checks are required; a single read success is insufficient.

The user requested GLM-4.7-Flash moving forward and explicitly authorized its pull. The Q4_K_M download was started without loading it. Permission to use GLM to finish this repair, rather than only after it, was requested because Qwen could not complete the correction. Keep the model-change experiment separate from Qwen results and keep the frontier as final reviewer. No savings estimate is supported by this investigation.

## User-directed runtime comparison

The user declined switching to GLM for this repair: fix Qwen first, test GLM later. They explicitly requested trying Qwen in LM Studio and reported prior successful Ornith tool use there; that report is useful context, not a Qwen test result.

LM Studio 0.4.18+1 is installed, selected GGUF runtime llama.cpp 2.37.0. No model was initially resident. The exact Ollama Qwen blob was registered with a hard link (no changed weights or second Qwen download), and Ollama Qwen was unloaded. LM Studio loaded Qwen as open-lm-qwen at 32768 context, parallel 1. CLI reported 23.22 seconds load time and 18.56 GB model size; its pre-load estimate was 19.46 GiB total, not measured peak process RAM. Ollama ps was empty afterward. GLM Q4_K_M pull completed but GLM was not loaded.

[LM Studio issue 825](https://github.com/lmstudio-ai/lmstudio-bug-tracker/issues/825) includes a maintainer report that 0.3.21 build 3 added detection for missing opening tags. This is a concrete reason to test the runtime, not a guarantee of current end-to-end correctness.

LM Studio's localhost HTTP API returned 401 because authentication is enabled; no LM_API_TOKEN was available in this task environment. Authentication was not disabled or bypassed. The user was asked to create a narrowly permissioned API token and save it locally, not in chat. At this point, OpenCode-through-LM-Studio inference was untested pending that token; the subsequent results follow below. A temporary catalog-translation/tracing adapter was prepared; it does not normalize tool responses or run tools itself. Global OpenCode configuration remains unchanged.


## Authenticated LM Studio results

The user supplied a token. It was used only for the authorized localhost service and retained in a private mode-600 temporary file, never inserted into the public project or request-body logs. Authentication stayed enabled. Because it appeared in chat, the user was advised to revoke it after testing; revocation has not been verified.

Initial tests used a temporary catalog translator because the old runner preflight required Ollama /api/tags. It forwarded completions unchanged to LM Studio. The final adapter and direct tests need neither that translator nor a proxy.

| Run | Actual outcome | Root cause / review decision |
| --- | --- | --- |
| lmstudio-read-1 | One completed native read, 13.899 s, intentional event cutoff | Read-path probe only |
| lmstudio-concurrency-repair | Native read/edit/write/bash; 16 tests passed; 98.656 s, event cutoff | Functional candidate reviewed; repeated tests and unneeded denied commands mean not a clean procedural completion |
| lmstudio-runtime-implementation | Partial validate/config edits, then 300.031 s timeout | Large exact replacement targeted run(p), but source was run(packetPath); ordinary edit mismatch, not unparsed tool syntax |
| lmstudio-runtime-run | Three small edits, original 4 tests passed, normal completion in 69.018 s | Small anchored packet completed production adapter |
| lmstudio-runtime-tests | 6 passed, 2 failed; 159.723 s, event cutoff | Wrong expected model string and wrong assumption that preflight returns a summary instead of throwing; no-op repairs rejected |
| lmstudio-tests-repair | 8 passed; 236.438 s, normal completion after unnecessary denied echo | Corrected assertions; review found one remaining environment-restoration bug |
| direct-run-1 | Native read/edit/bash, 2 behavioral tests passed, normal stop in 20.753 s | Direct authenticated adapter confirmed with no proxy; code reviewed |
| lmstudio-tests-cleanup | Test file failed to parse; original 4 tests passed; 106.490 s, event cutoff | Optional assertion changes duplicated const declarations and asserted absence against authenticated config; extra work after failure violated packet stop instruction |
| lmstudio-final-verification | Selected artifact: 8 passed, 0 failed; one native bash, normal stop in 16.992 s | Read-only verification after frontier rejected defective cleanup hunks and retained only Qwen's environment-restoration fix |

The frontier selected already model-authored changes; it did not implement replacement production logic or run implementation tests through a cloud subagent. The failed cleanup workspace remains intact. Final selected runner/tests were staged separately, then promoted only after code review, test evidence and source-drift checks. No claim that every intermediate attempt succeeded.

## Resolution and remaining limits

The evidence does not support "OpenCode cannot use Qwen tools": unchanged OpenCode with the same Qwen weights executed real tools through LM Studio. The observed Ollama text leakage matches its documented missing-opening-tag parser boundary. Changing the inference runtime is the verified operational workaround here. Different runtime sampling/template/parser behavior could all contribute; this experiment does not isolate every internal difference.

The reusable runner now accepts runtime=lmstudio, requires an exact model ID, checks the authenticated /v1/models catalog, supplies the OpenCode environment-token placeholder, routes worker and auxiliary agents locally, and reports runtime. Ollama remains the backward-compatible default. Global OpenCode settings, Ollama binaries/parser and model weights were not patched.

Still open: stronger automatic review-ready evidence gates, suspected-unparsed-tool diagnostics, exhaustive stream/parser cases, and reliable model stopping on larger tasks. Never convert arbitrary assistant prose into executable calls as a workaround. The host must reject missing required actions, failed tests, denials and incomplete work even if process exit is zero. No compatibility, quality, latency or savings percentage is justified by these small diagnostic samples.

One model was resident at a time. Swap rose during the work (about 6.7 GB at a later observation); this is a resource warning, not proof of the tool-format root cause. Prefer a separately measured smaller-context experiment before long local tasks. GLM-4.7-Flash Q4_K_M is downloaded, not loaded or tested; the user's Qwen-first priority was preserved.
