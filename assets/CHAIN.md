# Batch and task chain

The frontier maintains this ledger outside the worker's writable workspace. Use it only when a task needs multiple batches.

## Parent task

- Objective and requirements:
- Source baseline and changes to preserve:
- Shared interfaces and authority boundaries:
- Parent resource/time/repair budget:
- Final integration checks:

## Batches

| Task | Depends on | Outcome and editable files | State | Verified source checkpoint and checks |
| --- | --- | --- | --- | --- |
| One coherent outcome | Prior task or none | Behavior and scope | pending / running / rework / verified / blocked | Actual commit or file hashes and test evidence |

Keep the sequence simple. Verify prerequisites before dispatching their dependents; avoid overlapping writers. Pass the next local session only the relevant source, interfaces, objective and known remaining issues. The frontier creates this checkpoint from the actual files and tests; no model-written HANDOFF.md, nonce or report-format gate is required.

When context will not fit, split remaining work without losing requirements. Review partial changes before reuse and preserve failed attempts. If a verified predecessor changes, rerun affected checks. Carry costs and repair budgets across batches rather than resetting them. Stop repeated unproductive retries and change approach.

Run final integration checks against the complete parent requirement set before acceptance. A completed local session or a worker's success claim does not independently verify the chain.

Existing integrations may continue using the optional file-backed predecessor schema in [setup](../references/setup.md#optional-file-backed-linked-handoffs-v010); it is not required by this default workflow.
