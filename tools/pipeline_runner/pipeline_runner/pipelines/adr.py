"""ADR pipeline: manages Architecture Decision Records via archgate."""

from __future__ import annotations

from ..runner import PipelineResult, register_pipeline
from ..utils import get_project_root, run_command


@register_pipeline("adr")
def run() -> PipelineResult:
    """Validate and list ADRs using archgate."""
    root = get_project_root()
    adr_dir = root / "docs" / "adr"
    result = PipelineResult(pipeline_name="adr")

    # Ensure archgate is available (zero-install via npx)
    result.steps.append(
        run_command(["npx", "archgate", "list", "--dir", str(adr_dir)], cwd=root)
    )

    return result


@register_pipeline("adr:new")
def new() -> PipelineResult:
    """Create a new ADR (interactive - requires title argument)."""
    root = get_project_root()
    adr_dir = root / "docs" / "adr"
    result = PipelineResult(pipeline_name="adr:new")

    result.steps.append(
        run_command(
            ["npx", "archgate", "new", "--dir", str(adr_dir)],
            cwd=root,
            capture=False,
        )
    )

    return result
