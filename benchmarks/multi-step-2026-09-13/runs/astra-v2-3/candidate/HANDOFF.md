JOBS-MCP-001: parent-linked R3 repair from astra-v2-2.

Retrieved the benchdata contract and examples before editing; read each specified module and protected test file once.

Changed only cli.mjs and this handoff. CLI output now awaits write completion. Runtime-only stdin/stdout error listeners report INTERNAL_ERROR plus newline to stderr and set exit status 1. Reporting is deduplicated across callbacks, error events, and catch paths. Diagnostic write failures are consumed to avoid unhandled stacks. A failed stderr cannot guarantee diagnostic delivery. Listeners remain through shutdown to catch error events following write callbacks.

Self-review: import guard and strict decimal argument parsing remain intact; ordinary invalid arguments retain exit 2. Parser, planner, and tests were untouched.

Executed node --test verify.test.mjs exactly once after implementation: exit status 0; 10 tests passed, 0 failed, 0 skipped. The protected suite does not inject asynchronous I/O failures; those paths received source review only. No additional checks or retries were executed.

Awaiting frontier verification and acceptance; no self-approval. Stopped after handoff.
