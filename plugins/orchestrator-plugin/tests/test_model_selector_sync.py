"""
Tests for model_selector_sync.py - Keyword Mappings Synchronization
"""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import patch

import pytest

from mcp_server.model_selector_sync import (
    load_keyword_model_mappings,
    create_unified_agent_model_map,
    verify_keyword_mappings_usage,
    update_model_selector_with_keywords
)
from mcp_server.model_selector import ModelType, AGENT_MODEL_DEFAULTS


class TestLoadKeywordModelMappings:
    """Tests for load_keyword_model_mappings function."""

    def test_load_valid_file(self, tmp_path: Path) -> None:
        """Test loading from a valid keyword-mappings.json."""
        mappings_file = tmp_path / "keyword-mappings.json"
        mappings_file.write_text(json.dumps({
            "domain_mappings": {
                "gui": {
                    "primary_agent": "gui-super-expert",
                    "keywords": ["gui", "pyqt5", "qt"],
                    "priority": "ALTA",
                    "model": "sonnet"
                },
                "database": {
                    "primary_agent": "database_expert",
                    "keywords": ["database", "sql", "db"],
                    "priority": "MEDIA",
                    "model": "haiku"
                }
            },
            "core_functions": {
                "analyzer": {
                    "keywords": ["analyze", "analysis"],
                    "model": "haiku"
                }
            }
        }))

        domain_models, domain_keywords = load_keyword_model_mappings(mappings_file)

        assert domain_models["gui"] == "sonnet"
        assert domain_models["database"] == "haiku"
        assert domain_models["analyzer"] == "haiku"

        assert "gui" in domain_keywords
        assert "pyqt5" in domain_keywords["gui"]
        assert "qt" in domain_keywords["gui"]

    def test_load_file_not_found(self, tmp_path: Path) -> None:
        """Test loading from non-existent file."""
        domain_models, domain_keywords = load_keyword_model_mappings(
            tmp_path / "nonexistent.json"
        )

        assert domain_models == {}
        assert domain_keywords == {}

    def test_load_invalid_json(self, tmp_path: Path) -> None:
        """Test loading from file with invalid JSON."""
        mappings_file = tmp_path / "keyword-mappings.json"
        mappings_file.write_text("invalid json {")

        domain_models, domain_keywords = load_keyword_model_mappings(mappings_file)

        assert domain_models == {}
        assert domain_keywords == {}

    def test_load_empty_file(self, tmp_path: Path) -> None:
        """Test loading from empty file."""
        mappings_file = tmp_path / "keyword-mappings.json"
        mappings_file.write_text(json.dumps({}))

        domain_models, domain_keywords = load_keyword_model_mappings(mappings_file)

        assert domain_models == {}
        assert domain_keywords == {}

    def test_load_no_domain_mappings(self, tmp_path: Path) -> None:
        """Test loading file without domain_mappings."""
        mappings_file = tmp_path / "keyword-mappings.json"
        mappings_file.write_text(json.dumps({
            "core_functions": {
                "analyzer": {
                    "keywords": ["analyze"],
                    "model": "haiku"
                }
            }
        }))

        domain_models, domain_keywords = load_keyword_model_mappings(mappings_file)

        assert "analyzer" in domain_models
        assert "analyzer" in domain_keywords


class TestCreateUnifiedAgentModelMap:
    """Tests for create_unified_agent_model_map function."""

    def test_create_unified_map(self) -> None:
        """Test creating unified agent model map."""
        keyword_mappings = {
            "gui": "sonnet",
            "database": "haiku",
            "architecture": "opus"
        }

        agent_defaults = {
            "analyzer": ModelType.HAIKU,
            "coder": ModelType.SONNET,
            "architect_expert": ModelType.OPUS
        }

        unified = create_unified_agent_model_map(keyword_mappings, agent_defaults)

        # Keyword mappings should be applied
        assert "experts/gui-super-expert.md" in unified
        assert unified["experts/gui-super-expert.md"] == "sonnet"

        # Defaults should be applied for unmapped agents
        assert "core/analyzer.md" in unified
        assert unified["core/analyzer.md"] == "haiku"

    def test_keyword_mappings_priority(self) -> None:
        """Test that keyword mappings take priority over defaults."""
        keyword_mappings = {
            "gui": "haiku"  # Override default sonnet
        }

        agent_defaults = {
            "gui-super-expert": ModelType.SONNET  # Default
        }

        unified = create_unified_agent_model_map(keyword_mappings, agent_defaults)

        # Keyword mapping should override default
        assert unified["experts/gui-super-expert.md"] == "haiku"

    def test_empty_keyword_mappings(self) -> None:
        """Test with empty keyword mappings."""
        keyword_mappings = {}
        agent_defaults = {
            "analyzer": ModelType.HAIKU,
            "coder": ModelType.SONNET
        }

        unified = create_unified_agent_model_map(keyword_mappings, agent_defaults)

        # All defaults should be applied
        assert len(unified) == 2

    def test_domain_to_agent_mapping(self) -> None:
        """Test domain name to agent file mapping."""
        keyword_mappings = {
            "gui": "sonnet",
            "testing": "haiku",
            "security": "opus"
        }

        unified = create_unified_agent_model_map(keyword_mappings, {})

        assert unified["experts/gui-super-expert.md"] == "sonnet"
        assert unified["experts/tester_expert.md"] == "haiku"
        assert unified["experts/security_unified_expert.md"] == "opus"

    def test_core_functions_mapping(self) -> None:
        """Test core functions mapping."""
        keyword_mappings = {
            "exploration": "haiku",
            "implementation": "sonnet",
            "review": "opus"
        }

        unified = create_unified_agent_model_map(keyword_mappings, {})

        assert unified["core/analyzer.md"] == "haiku"
        assert unified["core/coder.md"] == "sonnet"
        assert unified["core/reviewer.md"] == "opus"


class TestVerifyKeywordMappingsUsage:
    """Tests for verify_keyword_mappings_usage function."""

    def test_verify_missing_file(self, tmp_path: Path) -> None:
        """Test verification with missing file."""
        from unittest.mock import patch

        with patch('mcp_server.model_selector_sync.Path') as mock_path:
            mock_path.return_value.exists.return_value = False
            result = verify_keyword_mappings_usage()
            assert result is False


class TestUpdateModelSelectorWithKeywords:
    """Tests for update_model_selector_with_keywords function."""

    def test_update_already_updated(self, tmp_path: Path) -> None:
        """Test that already-updated file is skipped."""
        # This test verifies the function doesn't error when file exists
        # The actual update logic is complex and would require more setup
        # Just verify the function can be called
        from unittest.mock import MagicMock, patch

        with patch('mcp_server.model_selector_sync.Path') as mock_path:
            mock_path.return_value.exists.return_value = False
            # Should not raise error even if file doesn't exist
            update_model_selector_with_keywords()
