# Experiment incidents

## Interrupted concurrency candidate / local regression

The mixed pilot was cancelled at the user's direction while the local concurrency implementation was incomplete. Do not treat that snapshot as a completed model submission.

The subsequent separate regression attempt ran the full suite twice: recorded exits 1; 14 pass, 2 fail. Source inspection shows the candidate starts at most limit calls to a function that processes only one item, with no success-path loop to consume remaining inputs. Its failure-path loop can also stop advancing because the failure flag returns before cursor increment. These are confirmed implementation mechanisms.

The local repair attempt made no edit events and tried two unapproved shell commands. The frontier stopped it after repeated denials and no progress. Exact command restrictions rejected the diagnostic variants as designed. Why the model ignored the packet is unknown; do not label it context overflow or lack of RAM without evidence. A narrower one-file packet was issued with explicit worker-loop guidance.

## Textual tool call / false review-ready signal

The narrower packet returned in 5.454 seconds with zero tool events. Raw output contained a function/parameter XML-like read call, ending in a closing tool_call tag, but no actual tool invocation event. The model finished with reason stop.

Confirmed integration symptom: tool syntax was emitted as ordinary text, so OpenCode executed nothing. Confirmed runner behavior: normal model stop with process exit zero and no top-level error qualifies as review-ready without requiring any expected tool evidence. accepted remained false; the frontier correctly rejected the run.

Ollama inspection: version 0.33.3, model advertises completion/tools, displayed template is a Prompt passthrough; sampling parameters include temperature 0.7. Earlier native tool calls succeeded with this installed model. These observations do not prove why this particular generation was malformed. Model formatting variability and parser/template compatibility remain hypotheses, not established root causes.

Next diagnostic: one read-only OpenCode tool-call smoke packet with explicit native-tool instructions. No global configuration/model changes, no hand-parsing/execution of tool-looking text. If native tools work, issue one bounded repair with explicit invocation instructions; otherwise stop implementation runs and investigate compatibility. Do not count a narration-only run as completed work.

Native-tool diagnostic succeeded in 8.032 seconds with one completed read event. This rules out persistent loss of native tool access in that environment; it does not prove the cause of intermittent malformed output. One targeted repair was issued with explicit native-tool instructions. Recovery must still be checked against actual edit and test evidence.

The explicit-native-instruction repair also returned zero tool events (5.286 seconds). It was rejected, not counted as a fix; no further retries of that regression packet were scheduled. Fresh local experiment cases are logged separately and pause each failed case for frontier RCA, without automatic retries.
