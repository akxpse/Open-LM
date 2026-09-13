# Contributing

This is experimental v0. Improve the loop with reproducible evidence, not additional generic instructions.

For a change, describe the observed failure, minimal reproduction, expected behavior, affected clients/models/platforms, and regression test. Redact credentials, private source and personal paths. Do not attach raw model transcripts by default.

Run `node --test scripts/run-local.test.mjs scripts/run-local-lmstudio.test.mjs`. For runner/routing changes, also run an isolated real read/edit/test packet with the supported local client and report exact versions. Do not use production code or accounts for a smoke test. Document what remains untested.

Keep task-specific workarounds in project packets. Only reusable lessons belong in SKILL.md. Preserve brief discovery instructions and progressive loading of detailed references.

Update VERSION, CHANGELOG.md and the runner's reported version together for releases. Record breaking packet changes and migration steps. Do not claim percentage savings without equivalent cloud-only/hybrid measurements including review and rework.

Follow [SECURITY.md](SECURITY.md) for vulnerability reporting. Never publish credentials, raw private transcripts or exploit-ready details in issues.
