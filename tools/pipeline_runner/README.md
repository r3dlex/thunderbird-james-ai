# Pipeline Runner

CI/CD pipeline orchestrator for the Corvus Thunderbird extension.

## Usage

```bash
poetry install
poetry run pipeline-runner --list
poetry run pipeline-runner <pipeline-name>
```

## Available Pipelines

- `lint` -- TypeScript (ESLint) and Python (ruff, mypy) linting
- `test` -- Jest, Angular, and pytest test suites with coverage
- `build` -- Webpack + Angular CLI production build
- `package` -- Create .xpi distribution file
- `adr` -- List/validate Architecture Decision Records via archgate
