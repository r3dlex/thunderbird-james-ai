# ADR 004: Python Pipeline Tooling for CI/CD

## Status

Accepted

## Context

The project needs CI/CD orchestration for linting, testing, building, packaging, and ADR management. Options:

1. Shell scripts (fragile, hard to test, platform differences)
2. Makefile (limited error handling, no structured output)
3. Node.js scripts (adds to already complex Node toolchain)
4. Python module with Poetry (testable, structured, separate from extension code)

## Decision

Use a Python module (`tools/pipeline_runner`) managed by Poetry as the CI/CD orchestration layer. Pipelines call into Node/npm tooling via subprocess, maintaining clear separation between build tooling and extension code.

## Consequences

- Pipelines are testable Python code with pytest
- Clear separation: Python orchestrates, Node builds
- Zero-install philosophy: uses `npx`, `poetry run` -- no global tool assumptions
- GitHub Actions call pipeline scripts rather than inline shell commands
- archgate CLI integrated via npx for ADR management
- Developers need both Python 3.12+ and Node 22+ installed
