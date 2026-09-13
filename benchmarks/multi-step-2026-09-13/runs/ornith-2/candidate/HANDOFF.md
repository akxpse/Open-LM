# JOBS-MCP-001 Handoff

## Outcome
All 10 verify tests pass on first run.

## Changes
- **planner.mjs**: Added nonnegative guards for `createdAt`/`attempts`; added exact five-field validation via `Reflect.ownKeys` to reject extra fields before dedup/filter; preserves tuple Map structure and required sort order.
- **cli.mjs**: Replaced URL guard with `pathToFileURL(process.argv[1])`; wrapped stdin read in a Promise with explicit stdout error listener to catch async write failures; emits `INTERNAL_ERROR\n` and exits 1 without stack/input disclosure.

## Verified Behavior
- Negative safe-integers rejected by planner.
- Extra-field jobs rejected before deduplication.
- CLI imports produce no side effects; strict flag parsing rejects signs/fractions/suffixes.
- Stdout errors trigger internal error path, not unhandled exceptions.

## Notes
No parser changes. No dependencies added. No network/files/timers used outside stdin read.
