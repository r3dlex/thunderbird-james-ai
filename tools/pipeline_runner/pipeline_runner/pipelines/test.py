"""Test pipeline: runs TypeScript, UI, and Python tests with coverage."""

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

    # UI tests via the root's framework-aware entry point -- only if UI deps are installed
    ui_dir = root / "src" / "ui"
    if (ui_dir / "node_modules").exists():
        result.steps.append(
            run_command(["npm", "run", "test:ui"], cwd=root)
        )

    # Python pipeline tests
    tools_dir = root / "tools" / "pipeline_runner"
    result.steps.append(
        run_command(["poetry", "run", "pytest", "--cov-report=term-missing"], cwd=tools_dir)
    )

    return result
