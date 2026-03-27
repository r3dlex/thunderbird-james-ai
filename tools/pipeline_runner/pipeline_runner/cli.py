"""CLI entry point for the pipeline runner."""

from __future__ import annotations

import argparse
import sys

# Importing pipelines registers them
from . import pipelines  # noqa: F401
from .runner import get_available_pipelines, run_pipeline
from .utils import setup_logging


def main() -> None:
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        prog="pipeline-runner",
        description="CI/CD pipeline orchestrator for Corvus",
    )
    parser.add_argument(
        "pipeline",
        nargs="?",
        help="Pipeline to run. Available: " + ", ".join(get_available_pipelines()),
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List available pipelines",
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable verbose output",
    )

    args = parser.parse_args()
    setup_logging(verbose=args.verbose)

    if args.list or not args.pipeline:
        print("Available pipelines:")
        for name in get_available_pipelines():
            print(f"  {name}")
        sys.exit(0)

    result = run_pipeline(args.pipeline)
    sys.exit(0 if result.success else 1)


if __name__ == "__main__":
    main()
