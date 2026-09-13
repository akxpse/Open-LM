# Batch and task-chain plan

The frontier strategist maintains this control document outside the local agent's writable workspace. Create a TASK.md and runner JSON for each batch; do not relay this entire ledger when only one packet's context is needed.

## Parent contract

- Parent ID, skill version, original objective, source baseline:
- All requirement IDs, shared interfaces/invariants, non-goals and authorization boundaries:
- Parent wall-time/resource budget, repair count and re-batching count (carry forward; do not reset by splitting):
- Final integration acceptance commands and required environment:

## Dependency ledger

| Packet ID | Requirement IDs | Depends on | Required input baseline/artifacts | Output contract | Context estimate + reserves | State | Verification evidence |
|---|---|---|---|---|---|---|---|
| One bounded outcome per row | Cover every parent requirement | IDs or none | Verified only | Exact interfaces/files | Include tool/history overhead | pending / ready / running / needs_batching / rework / verified / blocked | Commands, results, reviewer |

Before launch, check for missing prerequisites, dependency cycles, uncovered requirements and conflicting file ownership. Break cycles by establishing a shared interface contract first; do not run mutually dependent implementation packets with guessed interfaces.

## Dispatch and checkpoint rules

1. Dispatch only a ready packet whose prerequisites are verified. Use a fresh local session, unique output directory, exact permissions and a packet-sized context budget.
2. Review the diff and independently verify required checks. Record the resulting commit or file hashes and concise interface/output handoff.
3. Update dependent packets to use that verified baseline. Run the next ready packet sequentially. Do not assume the next session remembers prior conversation.
4. If a predecessor changes later, invalidate dependent evidence as appropriate and reverify affected batches.
5. On NEEDS_BATCHING, record context evidence, partial diff, verified work and remaining requirements. Split the remaining work into smaller packets; preserve existing verified results. Do not pass unchecked partial changes as accepted input.
6. If overflow prevented a local handoff, reconstruct the checkpoint from files and logs. Resume via smaller packets, not an identical blind retry.
7. Keep the parent pending while batches remain. Run final cross-batch integration checks against the complete parent contract before ACCEPT.

## Re-batching request (compact; no full log dump)

- Trigger: preflight estimate / runtime context error / oversized required read:
- Observed capacity and required context estimate, with uncertainty:
- Completed and independently verified requirement IDs:
- Unverified changed files and baseline:
- Remaining requirement IDs and suggested split boundaries:
- Evidence/log references and smallest next packet:

After two re-batching attempts without a verified batch or demonstrably reduced context requirement, the frontier strategist must change the approach or report the concrete blocker. Do not loop indefinitely or silently switch to a paid model. Ordinary in-scope batching needs no new user approval; new authority or product decisions still do.
