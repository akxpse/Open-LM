# Open LM release roadmap

Updated: 2026-09-14

## Product objective

Pair frontier planning and independent verification with local implementation and testing. Use focused briefs, batching and verified checkpoints to reduce unnecessary cloud work without sacrificing task scope or evidence quality.

## Release overview

| Status | Version | Scope |
| --- | --- | --- |
| Historical | v0.0.0 | Initial portable skill, local runner and exploratory evidence |
| Current | v0.1.0 | Simplified single-session coding, scoped execution and frontier-owned task chains |
| Planned | v0.1.1 | Automated RAM readiness and setup diagnostics |
| Future | Unassigned | Adaptive resource/context budgets and verified error-learning memory |

## v0.1.0 — simplified local workflow

The release scope was updated on 2026-09-14 to publish the simplified skill validated with Ornith 1.0. Earlier guarded diagnostics remain historical; the larger comparative savings study is a separate workstream, not a completed release result.

### Included

- Single-session reading, implementation, testing and bounded corrections.
- Short task briefs; no mandatory model-written handoff or tool-call ordering for ordinary coding.
- Scoped writes/commands and optional exact read lists.
- Frontier-owned verification, batching and source checkpoints.
- Local Ollama/LM Studio routing; no automatic paid fallback.
- Cooperative workspace ownership, event validation and process cleanup.
- Optional file-backed predecessor links and guarded three-phase compatibility mode.
- Relocated-installation checks, documentation-link tests and Node 22 CI.
- Public-safe Ornith 1.0 pilot results with failed attempts identified separately.

### Validation

The corrected-permissions Ornith 1.0 run passed three independent test groups and frontier review, with zero repairs and no failed tools. Local execution took 60.949 seconds; memory pressure remained normal and swap stayed unchanged. The run used a private measurement/resource adapter around the shipped runner. It does not establish hours-long stability or a general savings percentage.

Release checks: final regression suite and relocated installation, consistent documentation/versioning, independent runtime review, public-artifact secret scan, remote commit verification and inspection of GitHub Actions. Release approval was provided for the current 1.0-tested skill. Publication does not relabel incomplete experiments as successful.

## Planned — v0.1.1

Keep automatic readiness code separate from v0.1.0.

- Check usable RAM, memory pressure, model residency and actual context before dispatch and between batches.
- Distinguish PASS, WAIT and UNKNOWN; unavailable telemetry is not a pass.
- Keep one heavy model resident and reserve OS/editor/test headroom.
- Diagnose Node, Git, OpenCode, local server, model identity and authentication without revealing credentials.
- Offer recovery and smaller batches without silently installing models, closing unrelated apps or selecting paid services.

Validate missing telemetry, competing models, service/authentication failures, safe startup and recovery using deterministic tests and an actual local workflow.

## Future — adaptive resource and context budgets

- Observe memory pressure, request progress and context use during longer workflows.
- Adjust output budgets between requests within verified limits; never change an in-flight request or reload beneath it.
- Use gradual adjustments and sustained observations to avoid oscillation.
- Separate context allocation, output allowance, reasoning volume and cumulative token accounting.
- Preserve requirements and parent budgets when batching; stop safely on critical pressure or missing essential telemetry.
- Evaluate adaptive versus fixed settings under matched conditions before claiming improvements.

## Future — verified error-learning memory

- Record symptoms, confirmed causes, corrections and regression evidence as candidate lessons.
- Let the frontier promote only tested lessons, keeping project-specific data private.
- Retrieve a small relevant subset within the next task's context budget.
- Deduplicate, supersede and retire stale lessons; never treat retrieved text as new authority.
- Measure recurrence, quality, latency, repairs and cloud supervision costs with separate learning and evaluation data.

This is reviewed persistent memory, not model-weight training. Learning remains disabled in controlled comparison arms unless explicitly part of that experiment.

## Measurement workstream

Compare equivalent cloud-only and hybrid tasks with fixed acceptance checks, settings and repair budgets. Include planning, review, diagnosis, repairs and other task-specific cloud supervision. Keep actual cache counts, local usage, latency and failures. Freeze the protocol before confirmatory collection; separate calibration, infrastructure failures and policy revisions. Expand task variety and repetitions before generalizing.

## Release discipline

Do not publish known failing required regressions or disclose raw private artifacts. A model report never approves its own output. Routine in-scope checks and batching are agent-owned; new authority remains explicit. New settings or recovery policies receive new run identities rather than rewriting old evidence.
