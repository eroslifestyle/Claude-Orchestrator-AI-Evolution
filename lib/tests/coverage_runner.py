"""
Coverage Runner - Automated test coverage report generator.

Generates JSON and terminal coverage reports with 80% minimum threshold.
"""
import subprocess
import json
from pathlib import Path


def run_coverage() -> dict:
    """
    Execute pytest with coverage and return structured report.

    Returns:
        dict: Coverage report with total_coverage, files, and missing_lines.

    Raises:
        FileNotFoundError: If coverage.json is not generated.
        json.JSONDecodeError: If coverage.json is invalid.
    """
    result = subprocess.run(
        [
            "pytest",
            "--cov=lib",
            "--cov-report=json:coverage.json",
            "--cov-report=term-missing",
            "--cov-fail-under=80",
        ],
        capture_output=True,
        text=True,
    )

    coverage_file = Path("coverage.json")
    if not coverage_file.exists():
        raise FileNotFoundError("coverage.json not generated")

    with open(coverage_file, encoding="utf-8") as f:
        data = json.load(f)

    return {
        "total_coverage": data["totals"]["percent_covered"],
        "files": {
            k: v["summary"]["percent_covered"] for k, v in data["files"].items()
        },
        "missing_lines": data["totals"]["missing_lines"],
    }


if __name__ == "__main__":
    report = run_coverage()
    print(f"Total Coverage: {report['total_coverage']:.1f}%")
    for file, cov in sorted(report["files"].items()):
        print(f"  {file}: {cov:.1f}%")
