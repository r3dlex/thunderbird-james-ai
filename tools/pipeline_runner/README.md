# Pipeline Runner

CI/CD pipeline orchestrator for the Corvus Thunderbird extension.

## Usage

```bash
poetry install
poetry run pipeline-runner --list
poetry run pipeline-runner <pipeline-name>
```

## Available Pipelines

- `lint` -- Background ESLint, UI lint entry point, and Python (ruff, mypy) linting
- `test` -- Jest, UI test entry point, and pytest test suites with coverage
- `build` -- Webpack background build + framework-aware UI build + `dist/ui` merge
- `package` -- Create .xpi distribution file
- `adr` -- List/validate Architecture Decision Records via archgate
