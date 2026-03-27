"""Lint pipeline: runs TypeScript and Python linters."""

from __future__ import annotations

from ..runner import PipelineResult, register_pipeline
from ..utils import get_project_root, run_command


@register_pipeline("lint")
def run() -> PipelineResult:
    """Run all linting checks."""
    root = get_project_root()
    result = PipelineResult(pipeline_name="lint")

    # TypeScript / ESLint
    result.steps.append(
        run_command(["npx", "eslint", "src/", "--ext", ".ts"], cwd=root)
    )

    # Python / Ruff
    tools_dir = root / "tools" / "pipeline_runner"
    result.steps.append(
        run_command(["poetry", "run", "ruff", "check", "."], cwd=tools_dir)
    )

    # Python / mypy
    result.steps.append(
        run_command(["poetry", "run", "mypy", "pipeline_runner"], cwd=tools_dir)
    )

    return result
