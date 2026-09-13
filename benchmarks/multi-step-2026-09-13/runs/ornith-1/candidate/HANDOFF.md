## JOBS-MCP-001 Handoff — Local Implementation Complete

**Status:** All 10 verify.test.mjs assertions pass (935ms).

### Modules
- **parser.mjs** `parseJobs(text)` — string-only input, LF/CRLF split, per-line JSON+schema validation with 1-based line numbers; returns `{jobs, errors}`.
- **planner.mjs** `planJobs(jobs, options)` — strict input/options validation (TypeError on malformed jobs or out-of-range options), tuple-keyed dedup via nested Maps (tenant→id), filter-after-dedup semantics, UTF-16 lexicographic sort (no localeCompare), per-tenant chunking with fresh output objects.
- **cli.mjs** `processText(text, options)` — composes parser+planner; CLI guarded by `import.meta.url` equality so import has no side effects. Strict decimal-only flag parsing (`--batch-size`, `--max-attempts`); unknown/duplicate/out-of-range flags → stderr `INVALID_ARGUMENTS\n`, exit 2; unexpected errors → `INTERNAL_ERROR\n`, exit 1.

### Test evidence
`node --test verify.test.mjs` — 10/10 pass, 0 fail. Covers parser normalization, line-numbered error recovery, schema boundaries, planner validation/dedup/filter/sort/chunking, immutability, integration accepted-count semantics, CLI stdin pipeline with default and explicit flags, strict argument rejection, and import-side-effect isolation.

### Risks for frontier review
- Planner validates normalized jobs strictly (trimmed strings required); parser guarantees this invariant.
- Tuple identity uses nested Map keys to avoid concat collisions (`a|b` vs `a`, `b|c`).
- CLI flag regex `/^[0-9]+$/` rejects signs, fractions, and suffixes per spec.
