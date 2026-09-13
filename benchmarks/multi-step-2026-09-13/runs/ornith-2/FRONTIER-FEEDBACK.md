Frontier RCA: ornith-1 is NOT accepted. Its first suite failed, then it performed unauthorized self-repairs and five total suite runs. This is a fresh, explicitly authorized correction packet, not permission to continue that old attempt.

Current source baseline: exact final ornith-1 candidate. Read contract/examples through MCP, then the three current modules and protected test. Preserve parser.mjs. Allowed implementation changes: planner.mjs and cli.mjs, plus replace HANDOFF.md with at most180words.

Confirmed planner defects: negative safe-integer createdAt/attempts pass validation despite nonnegative contract; normalized jobs with extra fields pass and extra fields leak via Object.assign. Reject invalid rows BEFORE dedup/filter, require exactly the five own fields (Reflect.ownKeys can test symbols too); return explicit fresh five-field records. Preserve tuple Map structure, required order/counts/ties and options defaults.

Confirmed CLI gap: asynchronous stdout error events bypass surrounding try/catch. Handle read/write errors with runtime-only error listeners/callback or promise completion, emit exactly INTERNAL_ERROR newline, exit1 without stack/input disclosure. Use pathToFileURL for exact CLI entry guard; importing must install no process/stdin/stdout listeners or read stdin. Keep strict flag parsing; /^[0-9]+$/ without m is correct for final-LF rejection, do not change it based on a reviewer misconception.

Acceptance: execute node --test verify.test.mjs EXACTLY ONCE. On any failure STOP and give short actual RCA evidence; do not edit/retest afterward. On success write one factual HANDOFF then STOP; no further edits or tests. Do not alter shell command, add redirections, echo exit status, invent tests, call cloud agents, change tests or self-approve. Frontier will run separately-owned post-hoc checks.

Budget unchanged: 32K context,4096completion,600seconds,24events, one local model. If context insufficient return NEEDS_BATCHING. All earlier failures and usage remain in benchmark.
