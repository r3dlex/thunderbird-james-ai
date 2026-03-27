"""Shell execution helpers and logging utilities."""

from __future__ import annotations

import logging
import subprocess
import sys
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger("pipeline_runner")


@dataclass(frozen=True)
class StepResult:
    """Result of a single pipeline step."""

    name: str
    success: bool
    output: str
    return_code: int


def get_project_root() -> Path:
    """Walk up from this file to find the repo root (where manifest.json lives)."""
    current = Path(__file__).resolve().parent
    for _ in range(10):
        if (current / "manifest.json").exists():
            return current
        current = current.parent
    msg = "Could not find project root (no manifest.json found)"
    raise FileNotFoundError(msg)


def run_command(
    cmd: Sequence[str],
    *,
    cwd: Path | None = None,
    env: dict[str, str] | None = None,
    capture: bool = True,
) -> StepResult:
    """Execute a shell command and return a StepResult."""
    name = " ".join(str(c) for c in cmd[:3])
    logger.info("Running: %s", " ".join(str(c) for c in cmd))

    try:
        result = subprocess.run(
            [str(c) for c in cmd],
            cwd=str(cwd) if cwd else None,
            env=env,
            capture_output=capture,
            text=True,
            check=False,
        )
        output = (result.stdout or "") + (result.stderr or "")
        if result.returncode != 0:
            logger.error("Command failed (exit %d): %s", result.returncode, name)
            if output.strip():
                logger.error("Output: %s", output[-500:])
        return StepResult(
            name=name,
            success=result.returncode == 0,
            output=output,
            return_code=result.returncode,
        )
    except FileNotFoundError:
        logger.error("Command not found: %s", cmd[0])
        return StepResult(name=name, success=False, output=f"Command not found: {cmd[0]}", return_code=127)


def setup_logging(*, verbose: bool = False) -> None:
    """Configure logging for pipeline output."""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s [%(levelname)s] %(message)s",
        datefmt="%H:%M:%S",
        stream=sys.stderr,
    )
