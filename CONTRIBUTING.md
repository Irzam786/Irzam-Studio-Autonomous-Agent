# Contributing

Thank you for your interest in contributing to Irzam Studio.

## Before you start

- Check existing issues and pull requests before opening a new one.
- For larger changes, open an issue first to discuss the design and expected behavior.
- Keep changes focused and avoid committing generated build output, local environment files, credentials, or production data.

## Development environment

- Node.js 22 or a compatible current LTS release
- Python 3.11
- A Supabase project for integration-level development and worker execution

Install the application dependencies:

```bash
npm install
pip install -r agent/requirements.txt
```

## Validation

Run the checks relevant to your change:

```bash
npm run lint
npm run build
python -m compileall -q agent
python -m unittest discover -s tests -p "test_*.py" -v
```

Tests should not require real provider credentials or make live third-party API calls. Use fakes and mocks for external services.

## Pull requests

A useful pull request includes:

1. A clear problem statement and summary of the change.
2. The design or behavior change, including any compatibility considerations.
3. Tests or reproducible validation steps.
4. Documentation updates for new configuration, tools, or workflows.

Do not include API keys, access tokens, OAuth refresh tokens, service-role credentials, customer data, or private logs in commits or pull request discussions.

## Scope and safety

- Preserve the registered-tool allowlist and server-side secret handling.
- Keep agent execution bounded and observable.
- Do not introduce live outbound actions into tests.
- Document any new external integration and its required permissions.
