#!/bin/bash
# Coverage Runner Script (Unix/Linux/macOS)
# Runs pytest with coverage and generates report

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="$(dirname "$SCRIPT_DIR")/lib"

cd "$LIB_DIR" || exit 1

echo "Running coverage report..."
python tests/coverage_runner.py

echo "Coverage report complete."
