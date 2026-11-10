# Security Policy

Irzam Studio handles model-provider credentials, connected-service tokens, business records, and automation state. Please treat security reports responsibly.

## Reporting a vulnerability

Please do not publish exploitable vulnerability details in a public issue.

Use GitHub's private vulnerability reporting / security advisory feature for this repository when it is enabled. If private reporting is unavailable, contact the repository maintainer through the GitHub profile and request a private channel before sharing technical details.

## What to include

- A concise description of the affected component.
- The impact and conditions required to reproduce the issue.
- A minimal proof of concept that does not access, modify, or disclose real user data.
- Suggested remediation, if known.

## Credential handling

- Never commit `.env` files, provider API keys, OAuth tokens, or Supabase service-role keys.
- Treat application logs, database exports, screenshots, and workflow artifacts as potentially sensitive.
- Rotate any credential that may have been exposed.
- Keep privileged keys on the server or in the configured secret vault; do not expose them in browser bundles or model tool arguments.

The project maintainers will review reports and coordinate any necessary remediation before public disclosure.
