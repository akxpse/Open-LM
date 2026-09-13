# Failure analysis — required before retry

- Run/packet ID, original objective, baseline and expected behavior:
- Observed behavior and exact evidence (event IDs, command/exit status, diff, logs):
- Failure class: implementation / packet / permissions / model-tool protocol / context / runtime / test infrastructure / unknown:
- Confirmed proximate cause: explain the mechanism, not just the symptom:
- Deeper cause: confirmed evidence, or explicitly UNKNOWN:
- Alternative hypotheses and safe checks that would distinguish them:
- Contributing conditions (do not infer causality from correlation):
- Partial effects and verified checkpoint; protected artifacts unchanged?
- Smallest authorized corrective action; why it addresses the confirmed cause:
- Specific verification that would falsify the diagnosis or establish recovery:
- Remaining parent retry/resource budget:
- Result of correction and remaining uncertainty:

Never invent a root cause to complete the form. Distinguish “no tool executed” from “tool ran and failed,” missing evidence from failure, and interrupted partial work from a completed submission. Do not retry identically without a reason to expect a changed outcome. Keep full logs local and the cloud handoff compact.
