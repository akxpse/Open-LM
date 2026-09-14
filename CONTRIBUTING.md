# Contributing

Open LM is experimental. Improve the loop with reproducible evidence, not additional generic instructions.

For a change, describe the observed failure, minimal reproduction, expected behavior, affected clients/models/platforms, and regression test. Redact credentials, private source and personal paths. Do not attach raw model transcripts by default.

Run `node --test --test-concurrency=1 scripts/*.test.mjs benchmarks/validate-fixtures.test.mjs`. For runner/routing changes, also run an isolated real read/edit/test packet with the supported local client and report exact versions. Do not use production code or accounts for a smoke test. Document what remains untested.

GitHub Actions runs this suite on Node 22 with macOS and Linux after pull requests and pushes to main. The suite checks a relocated installation, local documentation links and release-version consistency without model downloads or credentials. Remote CI results must be inspected after publication; a local pass is not a remote CI result.

Keep task-specific workarounds in project packets. Only reusable lessons belong in SKILL.md. Preserve brief discovery instructions and progressive loading of detailed references.

Update VERSION, CHANGELOG.md and the runner's reported version together for releases. Record breaking packet changes and migration steps. Do not claim percentage savings without equivalent cloud-only/hybrid measurements including review and rework.

Follow [SECURITY.md](SECURITY.md) for vulnerability reporting. Never publish credentials, raw private transcripts or exploit-ready details in issues.
