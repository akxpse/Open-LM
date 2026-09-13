## JOBS-MCP-001 Handoff — Planner Repair (Final)

**Files changed:** `planner.mjs` only. `parser.mjs`, `cli.mjs`, `verify.test.mjs` untouched byte-for-byte.

### Fix applied
The planner previously used presence-based checks (`'batchSize' in opts`) without guarding against `undefined`. Calling `planJobs([], {batchSize: undefined})` or `{maxAttempts: undefined}` reached the type/range validator with an `undefined` value and threw TypeError, violating the contract's destructuring-default semantics.

Two changes in `planner.mjs`:
1. Each option is now read as `if ('key' in opts && opts.key !== undefined)`. When the property is absent or explicitly `undefined`, the default (batchSize=2, maxAttempts=3) applies; null/strings/fractions/0/out-of-range still throw TypeError.
2. Fresh output jobs are built with an explicit 5-field literal (`{ id, tenant, priority, createdAt, attempts }`) instead of `Object.assign({}, j)`, matching the contract's "exactly those five fields" requirement and avoiding any hidden property leakage.

### Verification
`node --test verify.test.mjs` — 10/10 pass (parser x3, planner x4, integration x1, CLI x2). No other shell commands executed.

### Notes for frontier
- The existing suite does not explicitly exercise `{batchSize: undefined}` / `{maxAttempts: undefined}`; the frontier should add those checks to confirm the fix.
- All algorithm semantics (tuple dedup with newest-wins/last-wins-ties, per-tenant chunking, UTF-16 sort, immutability) preserved unchanged.
