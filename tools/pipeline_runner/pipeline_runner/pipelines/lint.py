"""Lint pipeline: runs background, UI, and Python linters."""

from __future__ import annotations

from ..runner import PipelineResult, register_pipeline
from ..utils import get_project_root, run_command


@register_pipeline("lint")
def run() -> PipelineResult:
    """Run all linting checks."""
    root = get_project_root()
    result = PipelineResult(pipeline_name="lint")

    # Background TypeScript / ESLint
    result.steps.append(
        run_command(["npm", "run", "lint:background"], cwd=root)
    )

    ui_dir = root / "src" / "ui"
    if (ui_dir / "package.json").exists():
        result.steps.append(
            run_command(["npm", "run", "lint:ui"], cwd=root)
        )

    if any(not step.success for step in result.steps):
        return result

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
