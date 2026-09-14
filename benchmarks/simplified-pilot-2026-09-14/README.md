# Simplified workflow pilot

This directory contains sanitized exploratory evidence for one `multi-paths` coding fixture. It is not the completed matched cloud-versus-local study and should not be generalized into a model ranking.

## Completed observations

The accepted Ornith 1.0 workflow used a Terra planner and reviewer around one local implementation session. Independent visible and held-out checks passed all 3 test groups, the reviewer returned `ACCEPT`, and no repair round was used. Local accounting recorded 25,001 prompt tokens, 1,548 completion tokens, and 60.949 seconds. Its planner plus reviewer recorded 27,029 input tokens, zero cache-read tokens, zero cache-write tokens, and 291 output tokens.

The exploratory Terra cloud baseline also passed all 3 independent test groups and review with zero repairs. Across planning, implementation, and review it recorded 83,041 input tokens, 40,192 cache-read tokens, zero cache-write tokens, and 1,247 output tokens.

Using the documented short-context API-equivalent rate scenario, the local workflow's metered cloud planning/review component is $0.057550, versus $0.108700 for the earlier cloud baseline: 47.1% lower cloud inference cost. This is a **cross-revision pilot comparison**, not a matched estimate: the accepted local run followed command-policy corrections, while the cloud baseline came from an earlier harness revision. Local compute is not monetized. Metered planning and review are included; there were zero repair calls. Interactive harness development, independent audits, report preparation and earlier failed attempts are outside these successful-workflow totals; their cloud usage is not treated as zero. The private benchmark adapter supplied resource monitoring, server-side usage capture and independent verification around the shipped runner; those services are not bundled standalone automation.

## Retained unsuccessful observations

Three Ornith 1.0 attempts remain separate rather than being replaced by the accepted run:

- v1: complete measured local usage, but the workflow failed because the worker used an absolute alias for an otherwise permitted visible test.
- v2: complete measured local usage, but an additional diagnostic fell outside the reviewed command allowlist.
- v3: no completed local request usage; a malformed multiline command configuration stopped the runner before model work.

## Provenance and limits

[results.json](./results.json) contains the allowed measurements and SHA-256 digests of the private raw result files. Raw logs, prompts, machine paths, credentials, session identifiers, and model file locations are intentionally omitted.

No pilot-level source/skill manifest was saved for the accepted local rerun or its earlier cloud baseline because those arms were launched directly. Their source identity therefore cannot be proven from these artifacts; no identity claim is made. The pricing digest identifies the rate snapshot used for the illustrative conversion, not an actual invoice or established service tier.
