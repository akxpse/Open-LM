# Setup, portability, and limits

## Install the folder

Keep this folder intact. Codex: copy or symlink it as `open-lm` under the personal `.agents/skills/` directory, or project `.agents/skills/`. Claude Code: personal `.claude/skills/` or project `.claude/skills/`. Never overwrite an existing skill without reviewing it. Reload/start a new session if discovery does not refresh.

Invoke `$open-lm` in Codex or `/open-lm` in Claude Code. Alternatively, ask the host to read this SKILL.md by absolute path. Standard name/description frontmatter is portable; `agents/openai.yaml` is optional Codex UI metadata. Claude Code installation format is documented, but a Claude-hosted live run has not been tested here. Hosted agents need access to the local machine or an explicitly secured remote connection; localhost in a cloud container does not refer to the local Mac.

Prerequisites: Node 22+, Git, OpenCode CLI with `run --pure --format json`, Ollama or LM Studio running locally, and an already installed tool-capable model. Ollama normally needs no token; authenticated LM Studio requires LM_API_TOKEN in the launch environment. Do not install/download/quit apps without task authority.

## Preflight

Check `opencode --version`, the selected server's version/catalog/residency (`ollama list` / `ollama ps`, or `lms ls --json` / `lms ps`), available RAM and swap. Test a tiny read/edit/test packet first. Review `opencode debug config` locally in the intended workspace: configuration merges with user/project/admin settings. It may contain secrets, so do not paste it wholesale into the cloud conversation. Inspect provider URLs, agents, MCP, plugins, permissions, and custom instructions. Disable unrelated MCP servers and hooks in the effective setup before marking it reviewed. `--pure` disables external plugins, not every inherited configuration source.

Use a fresh staging Git repository (run `git init` in the staging copy, not an unrelated directory) or a reviewed worktree root, with only approved files, no secrets/symlinks/unreviewed project config. The runner is orchestration, not OS isolation: use host sandboxing or a reviewed container for stronger boundaries. Allowed shell commands can execute project code and lifecycle scripts; review them. Permissions/file limits are OpenCode policy, not a guarantee against an exploited child process. Environment filtering and isolation from global credentials are not supplied by this runner.

## Packet JSON

Create control files OUTSIDE the staging workspace. All paths below must be absolute except entries in `writeFiles`, which are exact workspace-relative files. Example (replace sample paths before running):

```json
{
  "workspace": "/absolute/staging-directory",
  "task": "/absolute/control/TASK.md",
  "output": "/absolute/control/run-001",
  "runtime": "ollama",
  "model": "qwen3-coder:30b",
  "baseURL": "http://127.0.0.1:11434/v1",
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

`disabledMcp` lists every inherited MCP server name to disable for this run. Discover these in the local effective-config preflight and verify they are disabled after applying overrides. An empty list does not disable unknown inherited servers.

`reviewedConfig` is the strategist's attestation, not automatic verification. `runtime` defaults to `ollama`; supported values are `ollama` and `lmstudio`. Ollama's model default is Qwen3 Coder; LM Studio requires an explicit model ID. Select another installed tool-capable model when appropriate. No cloud model suffix is allowed. `context` declares client limits; it does NOT set either server's actual KV allocation. Verify runtime residency/context and configure the server separately before increasing context. Model memory can grow substantially with context/concurrency.

Run `node /absolute/skill/scripts/run-local.mjs /absolute/control/packet.json`. If specifying optional `executable`, use a reviewed absolute OpenCode binary path; the runner does not enforce an absolute-path/type constraint for this override. Default is `opencode` from PATH. The runner checks the exact model ID against the selected local catalog (Ollama /api/tags or LM Studio /v1/models), sets the developer/title/summary/compaction models to local, disables sharing and default plugins, and allows only listed writes/commands. It rejects remote inference endpoints and obvious cloud model IDs. Network access for tools is controlled separately; package commands may use the network.

Output: private `events.jsonl`, `stderr.log`, and compact `summary.json`. stdout contains summary only. One live runner per workspace is enforced by a lock outside the workspace; after a crash, verify no process is active before manually removing a stale lock. Logs may contain source and sensitive tool output: keep them local and review before sharing.

Exit 0 means the process completed with no reported model errors and is READY FOR REVIEW, never accepted. Nonzero means failed or stopped by a limit. Wall timeout stops the process group on macOS/Linux; Windows process-tree cleanup is not supported and the runner refuses Windows. Tool-event budgets are observed AFTER event delivery; they cannot prevent the Nth call or every concurrent in-flight call. Log-byte caps also stop runaway output. No hard local-token budget is claimed. OpenCode parses shell commands into permission requests; allowlisted commands are not a byte-for-byte shell firewall. Interrupted runs require manual inspection; no automatic retry/promotion/deletion.

Read summary and relevant diffs at milestones, not every few seconds. It reports commands and exit codes where the client provides them; missing codes remain null. Token totals are client-reported sums with cache separately, not billing or savings proof. Run verifier-owned tests separately and record them in REVIEW.md. For corrective work create a new output directory and narrow the permissions.

## Evidence and references

- OpenCode/Ollama live tests and dependency pilot succeeded; wrapped runner tests are separate from the original manual pilot.
- https://opencode.ai/docs/providers/#ollama
- https://opencode.ai/docs/cli/
- https://opencode.ai/docs/permissions/
- https://docs.ollama.com/faq
- https://learn.chatgpt.com/docs/build-skills
- https://code.claude.com/docs/en/skills


## Context budget (v0)

The runner passes `context` and `outputTokens` as client model metadata. It does not set the inference server's runtime context, tokenize the assembled request, check packet size, monitor remaining context, or guarantee preservation of instructions across client compaction. Input/cache counters in the final report are aggregate accounting, not a live remaining-window gauge. Automatic context-fit enforcement is a known v0 gap.

Before launch, record the actual runtime context and choose a client limit no larger. Account for system/tool definitions + packet + expected file reads + tool results/history + output reserve + safety margin. As an initial heuristic, reserve at least 20% of the verified window for uncertainty, in addition to output; this is not a guarantee or a measured model-specific optimum. If overhead or expected reads cannot be estimated confidently, use a smaller task and test the budget before a substantial run. Do not infer fit from packet length alone.

Request targeted source excerpts and bounded failure output. Split by independently testable outcomes, not arbitrary token chunks that lose interfaces or requirements. For corrections, start a fresh session with the original contract, current file baseline, selected diff, failed checks and remaining work. Keep detailed logs outside the prompt. On truncation/context errors, return control to the frontier strategist for smaller chained packets, preserving and reviewing partial changes first. Do not abandon the parent task or simply increase context without checking RAM. Future automatic budgeting needs tokenizer-aware accounting of the complete request plus runtime telemetry and overflow tests.


## Host-coordinated batching and chaining

Use [CHAIN.md](../assets/CHAIN.md) for a parent task that needs multiple packets. The frontier host prepares and invokes each ready packet, consumes the compact report, independently verifies the result, and supplies a verified checkpoint to dependent packets. Each invocation uses a fresh session and unique output directory. Review changes from an interrupted attempt before reusing its staging workspace; never label partial work verified based on a model handoff alone.

NEEDS_BATCHING is a handoff status, not a new runner JSON field or exit code. The runner does not automatically detect all overflows or contact a cloud model. The host must recognize budget-fit failures and context errors in the available evidence and perform the re-batching. If run standalone without a frontier host, return the checkpoint and batching request for the next host session rather than claiming autonomous continuation. Batching preserves permissions and parent requirements; it is not authority for extra spending, deployment or broader access.

## LM Studio adapter

Use the same packet fields and boundaries with these overrides:

```json
{
  "runtime": "lmstudio",
  "model": "open-lm-qwen",
  "baseURL": "http://127.0.0.1:1234/v1"
}
```

This is a fragment, not a complete packet. Replace the example model with the exact ID exposed by the server's /v1/models catalog. The CLI modelKey used by lms load can differ from the inference identifier. Inspect lms ls --json and lms ps rather than guessing.

On the tested installation, this loaded the existing Qwen model with a stable inference identifier:

```sh
lms load qwen3-coder-30b --context-length 32768 --parallel 1 --gpu max --identifier open-lm-qwen --ttl 600 --yes
```

That modelKey is installation-specific; the command is not an automatic setup step or a portable memory recommendation. Unload the prior heavy model in its own runtime first, and verify both runtimes' residency. The runner neither starts LM Studio nor enforces one-model residency. Configure the server for localhost only.

If server authentication is enabled, supply LM_API_TOKEN through a trusted local environment/secret loader. Use a token with model-listing and inference permissions only. Never put the value in a packet, committed file, command argument, or chat. Preflight sends a Bearer header; the generated OpenCode configuration contains only the literal {env:LM_API_TOKEN} placeholder. Authentication stays enabled. The runner inherits its environment, so this is not credential isolation from child tools.

A generic "Runtime model preflight failed" can indicate expired/missing credentials or another HTTP failure. Check service identity and status locally without printing response bodies or tokens. Catalog membership alone is not an inference health check; run an actual tool smoke test. Model listing and just-in-time loading behavior also do not guarantee only one model is resident.

To reuse existing GGUF weights, LM Studio's import command defaults to moving the source. Use its documented --hard-link or --copy option when the source must be preserved; inspect filesystem support and disk capacity first. The Qwen comparison used identical hard-linked weights, not a replacement quantization.

Sources: [LM Studio authentication](https://lmstudio.ai/docs/developer/core/authentication), [model import](https://lmstudio.ai/docs/cli/local-models/import), [OpenCode environment substitution](https://dev.opencode.ai/docs/config/). The tested direct route needs no catalog translator, tracing proxy, global OpenCode config edit, or text-to-tool converter.
