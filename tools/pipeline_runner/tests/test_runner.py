"""Tests for pipeline runner orchestrator."""

from __future__ import annotations

from pipeline_runner.runner import (
    PipelineResult,
    get_available_pipelines,
    register_pipeline,
)
from pipeline_runner.utils import StepResult


def test_pipeline_result_success() -> None:
    result = PipelineResult(pipeline_name="test")
    result.steps.append(StepResult(name="s1", success=True, output="ok", return_code=0))
    result.steps.append(StepResult(name="s2", success=True, output="ok", return_code=0))
    assert result.success
    assert len(result.failed_steps) == 0


def test_pipeline_result_failure() -> None:
    result = PipelineResult(pipeline_name="test")
    result.steps.append(StepResult(name="s1", success=True, output="ok", return_code=0))
    result.steps.append(StepResult(name="s2", success=False, output="err", return_code=1))
    assert not result.success
    assert len(result.failed_steps) == 1


def test_pipeline_result_summary() -> None:
    result = PipelineResult(pipeline_name="test")
    result.steps.append(StepResult(name="s1", success=False, output="err", return_code=1))
    summary = result.summary()
    assert "FAILED" in summary
    assert "s1" in summary


def test_get_available_pipelines() -> None:
    # Ensure at least the core pipelines are registered
    from pipeline_runner import pipelines  # noqa: F401
    available = get_available_pipelines()
    assert "lint" in available
    assert "test" in available
    assert "build" in available


def test_register_pipeline() -> None:
    @register_pipeline("_test_dummy")
    def dummy() -> PipelineResult:
        return PipelineResult(pipeline_name="_test_dummy")

    assert "_test_dummy" in get_available_pipelines()
