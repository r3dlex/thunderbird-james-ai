"""Test pipeline: runs TypeScript and Python tests with coverage."""

from __future__ import annotations

from ..runner import PipelineResult, register_pipeline
from ..utils import get_project_root, run_command


@register_pipeline("test")
def run() -> PipelineResult:
    """Run all test suites with coverage reporting."""
    root = get_project_root()
    result = PipelineResult(pipeline_name="test")

    # Background script tests (Jest)
    result.steps.append(
        run_command(["npx", "jest", "--coverage", "--ci", "--passWithNoTests"], cwd=root)
    )

    # Angular UI tests (Karma) -- only if node_modules are installed
    ui_dir = root / "src" / "ui"
    if (ui_dir / "node_modules").exists():
        result.steps.append(
            run_command(
                ["npx", "ng", "test", "--watch=false", "--code-coverage"],
                cwd=ui_dir,
            )
        )

    # Python pipeline tests
    tools_dir = root / "tools" / "pipeline_runner"
    result.steps.append(
        run_command(["poetry", "run", "pytest", "--cov-report=term-missing"], cwd=tools_dir)
    )

    return result
