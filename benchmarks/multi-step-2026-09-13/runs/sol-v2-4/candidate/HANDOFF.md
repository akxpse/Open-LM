# JOBS-MCP-001 handoff

Implemented the final R3 repair in `cli.mjs` only. `parser.mjs` and `planner.mjs` were preserved.

The CLI now awaits callback completion for stdout and stderr writes, observes asynchronous write errors, and installs safe stdin/stdout/stderr error consumers during direct CLI execution. Unexpected stdin or stdout failures enter the existing internal-error path, emit exactly `INTERNAL_ERROR\n` to stderr when writable, set exit status 1, and do not disclose stack traces or input. Invalid arguments still emit exactly `INVALID_ARGUMENTS\n` with status 2. Strict decimal parsing and import side-effect isolation remain unchanged.

Protected verification executed exactly once:

`node --test verify.test.mjs`

Result: exit status 0; 10 tests passed, 0 failed, 0 skipped.

Frontier remains the final verifier and acceptance authority.
