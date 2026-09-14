# Observed lessons (2026-09-13)

- OpenCode/Ollama with Qwen3 Coder 30B and Gemma 4 8B completed real file edits and shell tests. Native function-call success alone did not predict Codex CLI compatibility: that combination requested an unavailable tool. Do not generalize the failure to every version/model.
- Both models passed 12 visible normalization tests but failed an independent mixed-case/punctuation sorting check: localeCompare did not implement requested JS lexicographic order. Review against requirements beyond visible tests.
- Qwen's output was cleaner; Gemma used redundant logic and misleading comments. Small sample, not a general benchmark ranking.
- On the originating 32 GiB Mac, Qwen used ~20.3 GiB at 32K runtime context and ~18.7 GiB at 16K; Gemma used ~9.1 GiB at 32K. These are observations, not portable requirements. Do not keep both resident there.
- Dependency pilot: npm10 failed without a lockfile; packet-supplied npm11 fallback generated it; subsequent npm10 ci worked. Preserve as an example of a helpful blocker hint, not a mandatory npm version policy.
- Isolated staging, script-disabled installs, command restrictions, and a clean independent install worked. Two disallowed listing attempts were blocked.
- Local agent repeated checks and misstated which npm version ran which commands. Narrow report-only feedback stopped promptly but still omitted requested caveats. Derive factual evidence mechanically; don't spend repeated inference asking the model to remember its logs.
- No measured 50/70/90% cloud saving yet. Setup and verbose polling can eliminate savings. Full logs local, compact evidence at review gates.

- Packaged runner testing found that OpenCode edit rules are worktree-relative. Require an explicit staging Git root and pass the workspace explicitly; unit policy-shape tests alone did not catch this. The event cap stopped the failed live run, and a corrected live run passed.
- Global OpenCode configuration may contribute MCP servers even with external plugins disabled. Inspect effective configuration locally and explicitly disable unrelated named servers; do not assume --pure means complete isolation.

For each new run record outcome, failure, proposed fix, and a regression case in the project's lesson ledger. Promote only reusable, observed improvements into the skill; keep project-specific rules in packets.

## Qwen / LM Studio investigation

- The observed Ollama failures leaked a function block without its opening tool-call marker as ordinary text. The installed parser requires that marker. Upstream reports match this mechanism; why the original generation omitted it remains unknown. Do not blame OpenCode alone or infer RAM as the cause.
- The same Qwen weights through LM Studio and OpenCode executed native read/edit/write/bash calls, including a direct no-proxy read/edit/test task. Preserve the alternate runtime as a tested option, not a mandatory migration for every user.
- Tiny controls succeeded on Ollama too. The added prompt did not demonstrate an improved success rate; do not label six passing first-read probes a broad reliability benchmark.
- A large exact replacement failed because the packet abbreviated run(packetPath) as run(p). Supply exact existing signatures and prefer small anchored edits. Protocol repair cannot fix an incorrect edit target.
- Test work included an incorrect expected model ID, confusing thrown preflight errors with returned summaries, assigning undefined into process.env, duplicate declarations, and a token-absence assertion against the authenticated config. These were implementation errors after successful tool execution. Review tests themselves; select only sound hunks and rerun the selected artifact.
- Several packets continued after green tests or permission denials. A tightly scoped final task did stop correctly. Exact commands, small outcomes and reactive limits help, but they do not prove reliable stopping on all tasks.
- Keep parser diagnostics, runtime compatibility, coding quality, and cloud-savings experiments separate. No cloud-token or cost savings were measured here.

## Multi-step native-tool/MCP calibration

- A four-file task with explicit constraints still produced unauthorized local self-repairs and repeated tests. Per-packet stop rules must take precedence over the generic repair sequence. The legacy single-session runner did not enforce stop-on-first-failed-test. The v0.1.0 guarded workflow now separates testing from implementation; a failed test cannot authorize edits in that attempt.
- Green visible checks missed normalized-object boundary and asynchronous CLI error-path defects. Review requirements independently; do not equate a same-model ACCEPT with host acceptance.
- Cloud reviewers also made unsupported objections, including a JavaScript regex claim. Resolve disputed behavior with the actual target runtime rather than repeated model agreement.
- Preserve tool-adapter failures separately from model coding failures. A default cwd/Update File host adapter problem required a documented cloud transport accommodation; it was not a local-model defect.
- Count complete server request usage separately from worker events. An aborted request has unknown final token usage, not zero. Native tool execution and stable sampled RAM do not imply correct implementation or measured savings.
