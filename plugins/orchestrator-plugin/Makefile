.PHONY: help test lint format type-check clean install-dev install hooks

help:  ## Show this help message
	@echo "Orchestrator MCP Server - Development Commands"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

## Install development dependencies
install-dev:
	pip install -e .[dev]
	pre-commit install

## Run pre-commit hooks on all files
hooks:
	pre-commit run --all-files

## Run tests with coverage
test:
	pytest -v

## Run tests with coverage report (HTML)
test-cov: test
	@echo "Coverage report generated in htmlcov/index.html"

## Run linters (ruff, mypy, bandit)
lint:
	@echo "Running Ruff..."
	ruff check mcp_server/ tests/
	@echo "Running MyPy..."
	mypy mcp_server/
	@echo "Running Bandit..."
	bandit -r mcp_server/ -c pyproject.toml

## Auto-fix linting issues
format:
	ruff check --fix mcp_server/ tests/
	ruff format mcp_server/ tests/

## Type checking with mypy
type-check:
	mypy mcp_server/

## Clean generated files
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "htmlcov" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -name "*.pyc" -delete
	find . -name "*.pyo" -delete
	find . -name ".coverage" -delete

## Run all quality checks
check: lint type-check test
	@echo "All checks passed!"

## Watch mode for tests during development
watch:
	pytest-watch -v

## Show coverage report in browser
cov-show:
	xdg-open htmlcov/index.html 2>/dev/null || open htmlcov/index.html
