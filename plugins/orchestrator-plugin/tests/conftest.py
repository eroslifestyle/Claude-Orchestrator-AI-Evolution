"""
Pytest configuration and fixtures for orchestrator tests.

This module provides shared fixtures and configuration for all test modules.
"""

from __future__ import annotations

import json
import tempfile
from pathlib import Path
from typing import Any, Generator

import pytest


@pytest.fixture
def temp_dir(tmp_path: Path) -> Generator[Path, None, None]:
    """Create a temporary directory for tests.

    Args:
        tmp_path: pytest's built-in tmp_path fixture

    Yields:
        Path to temporary directory
    """
    yield tmp_path


@pytest.fixture
def sample_keyword_mappings(temp_dir: Path) -> Path:
    """Create a sample keyword-mappings.json file.

    Args:
        temp_dir: Temporary directory fixture

    Returns:
        Path to the created config file
    """
    config = {
        "domain_mappings": {
            "gui": {
                "primary_agent": "gui-super-expert",
                "keywords": ["gui", "pyqt5", "qt", "widget"],
                "priority": "ALTA",
                "model": "sonnet"
            },
            "database": {
                "primary_agent": "database_expert",
                "keywords": ["database", "sql", "query"],
                "priority": "ALTA",
                "model": "sonnet"
            }
        },
        "core_functions": {
            "exploration": {
                "primary_agent": "analyzer",
                "keywords": ["analyze", "search"],
                "priority": "ALTA",
                "model": "haiku"
            }
        }
    }

    config_file = temp_dir / "keyword-mappings.json"
    with open(config_file, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2)

    return config_file


@pytest.fixture
def sample_session_data() -> dict[str, Any]:
    """Create sample session data for testing.

    Returns:
        Dict with session structure matching SessionState
    """
    return {
        "session_id": "test123",
        "user_request": "Fix auth bug",
        "status": "active",
        "started_at": "2026-03-06T10:00:00",
        "tasks": [
            {
                "task_id": "T1",
                "description": "Analyze auth code",
                "agent": "analyzer",
                "status": "completed",
                "started_at": "2026-03-06T10:01:00",
                "completed_at": "2026-03-06T10:05:00"
            },
            {
                "task_id": "T2",
                "description": "Fix login bug",
                "agent": "coder",
                "status": "pending",
                "started_at": None,
                "completed_at": None
            }
        ],
        "context_summary": "Fix authentication in login module",
        "last_checkpoint": "2026-03-06T10:05:00",
        "metadata": {"project": "test_project"}
    }


@pytest.fixture
def sample_agent_permissions(temp_dir: Path) -> Path:
    """Create a sample agent-permissions.json file.

    Args:
        temp_dir: Temporary directory fixture

    Returns:
        Path to the created config file
    """
    config = {
        "agent_permissions": {
            "analyzer": "read",
            "coder": "write",
            "integration_expert": "full"
        },
        "tool_permissions": {
            "integration_expert": [
                "mcp__web_reader__webReader",
                "ReadMcpResourceTool"
            ]
        }
    }

    config_file = temp_dir / "agent-permissions.json"
    with open(config_file, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2)

    return config_file


@pytest.fixture
def mock_config_dir(temp_dir: Path, sample_keyword_mappings: Path) -> Path:
    """Create a mock config directory with sample files.

    Args:
        temp_dir: Temporary directory fixture
        sample_keyword_mappings: Path to keyword mappings

    Returns:
        Path to config directory
    """
    config_dir = temp_dir / "config"
    config_dir.mkdir()

    # Copy keyword mappings
    import shutil
    shutil.copy(sample_keyword_mappings, config_dir / "keyword-mappings.json")

    return config_dir
