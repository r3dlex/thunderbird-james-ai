"""Package pipeline: creates the .xpi distribution file."""

from __future__ import annotations

from ..runner import PipelineResult, register_pipeline
from ..utils import get_project_root, run_command


@register_pipeline("package")
def run() -> PipelineResult:
    """Package the extension as an .xpi file."""
    root = get_project_root()
    dist_dir = root / "dist"
    result = PipelineResult(pipeline_name="package")

    if not dist_dir.exists():
        result.steps.append(
            run_command(["echo", "dist/ not found - run 'build' pipeline first"], cwd=root)
        )
        result.steps[-1] = result.steps[-1].__class__(
            name="check dist",
            success=False,
            output="dist/ directory does not exist",
            return_code=1,
        )
        return result

    result.steps.append(
        run_command(
            ["zip", "-r", "../corvus.xpi", ".", "-x", "*.map"],
            cwd=dist_dir,
        )
    )

    return result
