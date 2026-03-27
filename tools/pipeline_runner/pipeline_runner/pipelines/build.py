"""Build pipeline: compiles background script and Angular UI."""

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

    # Install Angular UI dependencies
    ui_dir = root / "src" / "ui"
    if (ui_dir / "package.json").exists():
        result.steps.append(
            run_command(["npm", "install", "--no-audit"], cwd=ui_dir)
        )
        if not result.steps[-1].success:
            return result

    # Build background script (webpack)
    result.steps.append(
        run_command(["npx", "webpack", "--mode=production"], cwd=root)
    )

    # Build Angular UI
    if (ui_dir / "angular.json").exists():
        result.steps.append(
            run_command(
                ["npx", "ng", "build", "--configuration=production"],
                cwd=ui_dir,
            )
        )

    # Merge dist
    result.steps.append(
        run_command(["node", "scripts/merge-dist.mjs"], cwd=root)
    )

    return result
