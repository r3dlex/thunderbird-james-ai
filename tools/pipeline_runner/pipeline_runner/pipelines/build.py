"""Build pipeline: compiles background script and the active UI toolchain."""

from __future__ import annotations

from ..runner import PipelineResult, register_pipeline
from ..utils import get_project_root, run_command


@register_pipeline("build")
def run() -> PipelineResult:
    """Build the extension for production."""
    root = get_project_root()
    result = PipelineResult(pipeline_name="build")

    # Install root Node dependencies
    result.steps.append(
        run_command(["npm", "ci"], cwd=root)
    )
    if not result.steps[-1].success:
        return result

    # Install UI dependencies
    ui_dir = root / "src" / "ui"
    if (ui_dir / "package.json").exists():
        result.steps.append(
            run_command(["npm", "install", "--no-audit"], cwd=ui_dir)
        )
        if not result.steps[-1].success:
            return result

    # Build background script
    result.steps.append(
        run_command(["npm", "run", "build:background"], cwd=root)
    )
    if not result.steps[-1].success:
        return result

    # Build UI via the root's framework-aware entry point
    result.steps.append(
        run_command(["npm", "run", "build:ui"], cwd=root)
    )
    if not result.steps[-1].success:
        return result

    # Merge UI into dist/ui without touching background artifacts
    result.steps.append(
        run_command(["npm", "run", "merge:ui"], cwd=root)
    )

    return result
