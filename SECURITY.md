# Security

Open LM v0.0.0 is experimental. Its runner configures agent permissions; it is not an OS sandbox or a credential-isolation boundary. Use secrets-free staging and review the effective client configuration and executable test code before running it.

## Reporting a vulnerability

Do not post credentials, private source, raw transcripts or exploit-ready details in public issues.

If GitHub displays **Security → Report a vulnerability** for this repository, use that private reporting feature. Its availability is controlled by the maintainer; this release does not assert it is enabled.

If private reporting is unavailable, open a minimal issue titled “Request for a private security reporting channel,” with no sensitive details. Wait for the maintainer to establish a private channel before sharing a reproduction. No response-time guarantee or dedicated security team is claimed.

Rotate any credential accidentally disclosed in chat, logs or Git history. Removing a file or adding it to `.gitignore` does not revoke a credential or erase history.

## Scope and updates

Reports about runner permission/routing mistakes, leaked credentials, unsafe staging or misleading acceptance evidence are welcome. Model/runtime vulnerabilities also belong with their respective upstream maintainers. Only the current experimental release is maintained; no formal support window is promised.
