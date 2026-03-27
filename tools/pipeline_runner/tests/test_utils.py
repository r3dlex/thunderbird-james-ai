"""Tests for pipeline runner utilities."""

from __future__ import annotations

from pipeline_runner.utils import StepResult, get_project_root, run_command


def test_run_command_success() -> None:
    result = run_command(["echo", "hello"])
    assert result.success
    assert result.return_code == 0
    assert "hello" in result.output


def test_run_command_failure() -> None:
    result = run_command(["false"])
    assert not result.success
    assert result.return_code != 0


def test_run_command_not_found() -> None:
    result = run_command(["nonexistent_command_xyz"])
    assert not result.success
    assert result.return_code == 127


def test_step_result_frozen() -> None:
    r = StepResult(name="test", success=True, output="ok", return_code=0)
    assert r.name == "test"
    assert r.success


def test_get_project_root() -> None:
    root = get_project_root()
    assert (root / "manifest.json").exists()
