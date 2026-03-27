"""Pipeline orchestrator that runs named pipelines in sequence."""

from __future__ import annotations

import logging
import sys
from dataclasses import dataclass, field

from .utils import StepResult

logger = logging.getLogger("pipeline_runner")


@dataclass
class PipelineResult:
    """Aggregate result of a full pipeline run."""

    pipeline_name: str
    steps: list[StepResult] = field(default_factory=list)

    @property
    def success(self) -> bool:
        return all(s.success for s in self.steps)

    @property
    def failed_steps(self) -> list[StepResult]:
        return [s for s in self.steps if not s.success]

    def summary(self) -> str:
        total = len(self.steps)
        passed = sum(1 for s in self.steps if s.success)
        status = "PASSED" if self.success else "FAILED"
        lines = [f"Pipeline '{self.pipeline_name}': {status} ({passed}/{total} steps)"]
        for step in self.failed_steps:
            lines.append(f"  FAILED: {step.name} (exit {step.return_code})")
        return "\n".join(lines)


# Registry of pipeline functions
_PIPELINES: dict[str, object] = {}


def register_pipeline(name: str):  # noqa: ANN201
    """Decorator to register a pipeline function."""
    def decorator(func):  # noqa: ANN001, ANN202
        _PIPELINES[name] = func
        return func
    return decorator


def get_available_pipelines() -> list[str]:
    """Return names of all registered pipelines."""
    return sorted(_PIPELINES.keys())


def run_pipeline(name: str) -> PipelineResult:
    """Execute a named pipeline and return its result."""
    if name not in _PIPELINES:
        logger.error("Unknown pipeline: %s", name)
        logger.info("Available: %s", ", ".join(get_available_pipelines()))
        sys.exit(1)

    logger.info("Starting pipeline: %s", name)
    result = _PIPELINES[name]()
    logger.info(result.summary())
    return result
