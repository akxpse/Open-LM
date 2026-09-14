# Guarded implementation, test and report workflow

Use this runner for coding packets that must stop implementation before the first acceptance test. The frontier prepares the packet and performs the final independent review; a successful local run never accepts or publishes itself.

The three fresh OpenCode sessions have distinct authority:

| Phase | File authority | Commands | MCP |
| --- | --- | --- | --- |
| IMPLEMENT | Exact listed reads and source writes | None | Optional reviewed read-only contract tool |
| TEST | Exact reads in a separate verification copy; no native writes | One fixed one-shot test helper | Disabled |
| REPORT | No reads; one fresh native write of HANDOFF.md | None | Disabled |

The test helper atomically claims the invocation before starting a fixed executable and argument array without a shell. Repeated or concurrent helper requests cannot run that test twice. The candidate and test copy are hashed; failed tests may produce a factual report but never advance a dependency. A new frontier-issued correction uses a fresh attempt and retains the original failure.

## Agent-managed preparation

1. Read applicable project instructions and fill [TASK.md](../assets/TASK.md). Stage the exact inputs in a fresh Git root without secrets, symlinks, inherited project configuration or an existing HANDOFF.md. Preserve earlier work and reports outside the fresh attempt.
2. Perform the [resource procedure](local-runtime.md#agent-managed-resource-readiness). Verify runtime context and model identity. Batching, model residency and RAM decisions remain frontier responsibilities; v0.1.1 owns the separate automatic RAM helper.
3. Resolve the actual executable files and directories to canonical absolute paths. The guarded runner rejects symlink aliases; resolve an installed CLI or Node symlink to its real target instead of asking the user to change installation.
4. Inspect effective OpenCode configuration and supply the complete MCP inventory. Empty inventory is valid when none are configured. A contract MCP is optional; when supplied, use an existing reviewed read-only tool and require its successful response before source edits. Never enable unknown integrations.
5. Review the acceptance executable, arguments and all imported files. Put every needed file in verificationFiles, including protected tests and dependency sources. Native tool permissions do not restrict what approved test code itself can do; use stronger host isolation for untrusted code.

No npm dependencies are required by these helpers. Node 22+, Git, a compatible OpenCode CLI and a configured local inference server are prerequisites, not downloaded automatically.

## Packet

The frontier writes this control JSON outside the staged workspace. Replace every sample path/model with locally verified values; this is a schema example, not a ready-to-run project.

```json
{
  "workspace": "/absolute/staging",
  "task": "/absolute/control/TASK.md",
  "output": "/absolute/control/attempt-001",
  "packetId": "feature-1",
  "executable": "/absolute/real/opencode",
  "runtime": "lmstudio",
  "model": "verified-local-model-id",
  "baseURL": "http://127.0.0.1:1234/v1",
  "context": 16384,
  "outputTokens": 4096,
  "readFiles": ["src/feature.mjs", "tests/feature.test.mjs"],
  "writeFiles": ["src/feature.mjs"],
  "verificationFiles": ["src/feature.mjs", "tests/feature.test.mjs"],
  "reviewedConfig": true,
  "reviewedMcpInventory": true,
  "mcpInventory": [],
  "test": {
    "executable": "/absolute/real/node",
    "argv": ["--test", "tests/feature.test.mjs"],
    "cwd": ".",
    "timeoutMs": 30000,
    "maxOutputBytes": 65536
  },
  "budgets": {
    "total": {"timeoutSeconds": 600, "maxToolEvents": 40, "maxLogBytes": 12582912},
    "implement": {"timeoutSeconds": 360, "maxToolEvents": 24, "maxLogBytes": 4194304},
    "test": {"timeoutSeconds": 120, "maxToolEvents": 8, "maxLogBytes": 4194304},
    "report": {"timeoutSeconds": 120, "maxToolEvents": 8, "maxLogBytes": 4194304}
  }
}
```

For a contract MCP, add its server name to mcpInventory and supply both contractMcp and contractTool using the exact effective names. The runner scopes and enables the reviewed existing integration; it does not install or invent a server configuration.

All paths are canonical absolute paths except the file lists and test.cwd, which are exact workspace-relative paths. HANDOFF.md is reserved: do not put it in source lists. output must not exist. Per-phase budgets must fit the parent total; re-batching does not reset parent budgets. Runtime context/output limits still require a complete prompt budget, as explained in [setup](setup.md#context-budget-v0).

```sh
node /absolute/open-lm/scripts/run-guarded.mjs /absolute/control/packet.json
```

## Evidence and chaining

The private output contains generated phase packets, raw events and summaries, a separate verification copy, one-shot claim/result/output artifacts and guarded-summary.json. Keep these outside worker write authority and review before public sharing.

- guarded-review-ready means the guarded protocol and known test passed. accepted and successorUnlocked remain false pending frontier verification.
- test-failed preserves a known failing test and any valid report. Diagnose before a new correction; never unlock dependents.
- stopped-or-failed means required evidence or execution is incomplete/invalid. Preserve the attempt and inspect its stop reason.

sourceHashes contains the newly written sources plus the supplied transitive predecessor source baseline. verificationHashes also covers protected tests and other verification inputs. Keep both: do not treat packet-specific test files as implementation dependencies when constructing a successor link.

After independent functional and source review, build the next [predecessor descriptor](setup.md#linked-handoffs-v010) from the logical packet ID, preserved raw handoff path/hash and freshly checked accepted sourceHashes. Use a fresh staging directory and session. Copy only required verified sources; preserve all relevant older dependency hashes. The reporter's phase ID is provenance, not a replacement for the logical packet ID in the frontier ledger.

Normal model termination and model-written test claims are insufficient. The guarded gate requires actual native events, terminal tool evidence, the authoritative one-shot test result, and a fresh report write matching its preserved bytes and per-attempt provenance marker. Missing exits remain unknown.

## Boundaries

This is cooperative runner ownership and OpenCode tool policy, not an OS sandbox. Effective configuration review remains required. It does not prevent an unrelated process or an independently re-detached descendant from escaping host isolation. SIGTERM/SIGINT cleanup is bounded; externally delivered SIGKILL, power loss and disk failures can leave incomplete evidence requiring inspection.

The legacy [run-local.mjs](../scripts/run-local.mjs) primitive remains available for compatibility and narrowly reviewed diagnostics. Its permissions are static within one session; do not use it alone while promising a post-test write boundary. Guarded phase labels are internal protocol fields, not a lock or permission bypass.
