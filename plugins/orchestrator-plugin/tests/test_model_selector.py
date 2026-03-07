"""
Tests for model_selector.py - Intelligent Model Selection
"""

from __future__ import annotations

from pathlib import Path
from unittest.mock import Mock, patch

import pytest

from mcp_server.model_selector import (
    ModelType,
    IntelligentModelSelector,
    get_model_selector,
    COST_MULTIPLIERS,
    MODEL_CAPABILITIES,
    AGENT_MODEL_DEFAULTS
)
from mcp_server.context_tiers import get_tier_tokens


class TestModelType:
    """Tests for ModelType enum."""

    def test_model_type_values(self) -> None:
        """Test that all model types are defined."""
        assert ModelType.HAIKU.value == "haiku"
        assert ModelType.SONNET.value == "sonnet"
        assert ModelType.OPUS.value == "opus"

    def test_cost_multipliers(self) -> None:
        """Test cost multipliers are correct."""
        assert COST_MULTIPLIERS[ModelType.HAIKU] == 1
        assert COST_MULTIPLIERS[ModelType.SONNET] == 5
        assert COST_MULTIPLIERS[ModelType.OPUS] == 25


class TestIntelligentModelSelector:
    """Tests for IntelligentModelSelector class."""

    def test_initialization_without_mappings(self, tmp_path: Path) -> None:
        """Test initialization when keyword-mappings.json doesn't exist."""
        selector = IntelligentModelSelector(keyword_mappings_file=None)
        assert selector is not None
        assert isinstance(selector.domain_model_map, dict)

    def test_initialization_with_mappings(self, tmp_path: Path) -> None:
        """Test initialization with keyword-mappings.json."""
        # Create actual keyword-mappings.json file
        mappings_file = tmp_path / "keyword-mappings.json"
        import json
        mappings_file.write_text(json.dumps({
            "domain_mappings": {
                "gui": {
                    "model": "sonnet",
                    "keywords": ["gui", "pyqt5"]
                }
            }
        }))

        selector = IntelligentModelSelector(mappings_file)

        assert selector.domain_model_map == {"gui": "sonnet"}
        assert selector.domain_keywords_map == {"gui": ["gui", "pyqt5"]}

    def test_select_model_explicit_request(self, tmp_path: Path) -> None:
        """Test that explicit model request overrides everything."""
        selector = IntelligentModelSelector()
        model = selector.select_model("coder", "any request", explicit_model="haiku")
        assert model == "haiku"

    def test_select_model_keyword_mapping_priority(
        self, tmp_path: Path
    ) -> None:
        """Test that keyword-mappings is checked before defaults."""
        # Create actual keyword-mappings.json file
        mappings_file = tmp_path / "keyword-mappings.json"
        import json
        mappings_file.write_text(json.dumps({
            "domain_mappings": {
                "gui": {
                    "model": "sonnet",
                    "keywords": ["gui", "pyqt5"],
                    "priority": "ALTA"
                },
                "database": {
                    "model": "haiku",
                    "keywords": ["database", "sql"],
                    "priority": "MEDIA"
                }
            }
        }))

        selector = IntelligentModelSelector(mappings_file)

        # GUI domain should use sonnet from keyword-mappings
        # Note: Keyword matching is case-insensitive and checks for domain keywords
        model = selector.select_model("gui-super-expert", "Fix GUI layout")
        # The domain keywords for "gui" are ["gui", "pyqt5"], so "GUI" matches
        assert model == "sonnet"

        # Database domain should use haiku from keyword-mappings
        model = selector.select_model("database_expert", "Optimize SQL query")
        # "database" keyword should trigger haiku
        assert model == "haiku"

    def test_select_model_agent_defaults(self, tmp_path: Path) -> None:
        """Test fallback to agent defaults."""
        selector = IntelligentModelSelector()

        # Analyzer defaults to haiku
        model = selector.select_model("analyzer", "Analyze code")
        assert model == "haiku"

        # Architect_expert defaults to opus (not "architect")
        model = selector.select_model("architect_expert", "Design system")
        assert model == "opus"

    def test_select_model_complexity_adjustment(self, tmp_path: Path) -> None:
        """Test that task complexity adjusts model selection."""
        # Use a non-existent file to avoid domain keyword matches
        selector = IntelligentModelSelector(tmp_path / "nonexistent.json")

        # Trivial complexity -> haiku
        model = selector.select_model(
            "coder", "xyzw task", task_complexity="trivial"
        )
        # Without domain keywords, trivial complexity should return haiku
        assert model == "haiku"

        # Complex with sonnet default -> opus
        model = selector.select_model(
            "coder", "xyzw refactor", task_complexity="complex"
        )
        # coder defaults to SONNET, complex should upgrade to OPUS
        assert model == "opus"

    def test_get_model_for_agent_file(self, tmp_path: Path) -> None:
        """Test getting model from agent file path."""
        selector = IntelligentModelSelector()

        # Core agent
        model = selector.get_model_for_agent_file("core/analyzer.md")
        assert model == "haiku"

        # Expert agent
        model = selector.get_model_for_agent_file("experts/architect_expert.md")
        assert model == "opus"

    def test_calculate_cost_savings(self, tmp_path: Path) -> None:
        """Test cost savings calculation."""
        selector = IntelligentModelSelector()

        assignments = {
            "core/analyzer.md": "haiku",
            "core/coder.md": "sonnet",
            "experts/architect_expert.md": "opus"
        }

        report = selector.calculate_cost_savings(assignments)

        assert report["total_agents"] == 3
        assert report["savings"] > 0
        assert 0 < report["savings_percent"] <= 100


class TestGetModelSelector:
    """Tests for get_model_selector singleton."""

    def test_singleton(self) -> None:
        """Test that get_model_selector returns singleton instance."""
        selector1 = get_model_selector()
        selector2 = get_model_selector()
        assert selector1 is selector2


class TestAgentModelDefaults:
    """Tests for AGENT_MODEL_DEFAULTS constant."""

    def test_defaults_defined(self) -> None:
        """Test that agent defaults are properly defined."""
        assert "analyzer" in AGENT_MODEL_DEFAULTS
        assert "coder" in AGENT_MODEL_DEFAULTS
        # Note: architect_expert is the key, not "architect"
        assert "architect_expert" in AGENT_MODEL_DEFAULTS

    def test_mechanical_tasks_use_haiku(self) -> None:
        """Test that mechanical tasks use haiku."""
        assert AGENT_MODEL_DEFAULTS["analyzer"] == ModelType.HAIKU
        assert AGENT_MODEL_DEFAULTS["documenter"] == ModelType.HAIKU
        assert AGENT_MODEL_DEFAULTS["devops_expert"] == ModelType.HAIKU

    def test_coding_tasks_use_sonnet(self) -> None:
        """Test that coding tasks use sonnet (not opus)."""
        assert AGENT_MODEL_DEFAULTS["coder"] == ModelType.SONNET
        assert AGENT_MODEL_DEFAULTS["reviewer"] == ModelType.SONNET
        assert AGENT_MODEL_DEFAULTS["gui-super-expert"] == ModelType.SONNET

    def test_critical_tasks_use_opus(self) -> None:
        """Test that critical tasks use opus."""
        assert AGENT_MODEL_DEFAULTS["architect_expert"] == ModelType.OPUS
        assert AGENT_MODEL_DEFAULTS["security_unified_expert"] == ModelType.OPUS
        assert AGENT_MODEL_DEFAULTS["offensive_security_expert"] == ModelType.OPUS


class TestModelCapabilities:
    """Tests for MODEL_CAPABILITIES constant."""

    def test_capabilities_defined(self) -> None:
        """Test that model capabilities are defined."""
        assert ModelType.HAIKU in MODEL_CAPABILITIES
        assert ModelType.SONNET in MODEL_CAPABILITIES
        assert ModelType.OPUS in MODEL_CAPABILITIES

    def test_actual_models_configured(self) -> None:
        """Test that actual models are configured."""
        haiku_caps = MODEL_CAPABILITIES[ModelType.HAIKU]
        assert haiku_caps["actual_model"] == "glm-4.5-air"

        sonnet_caps = MODEL_CAPABILITIES[ModelType.SONNET]
        assert sonnet_caps["actual_model"] == "glm-4.7"

        opus_caps = MODEL_CAPABILITIES[ModelType.OPUS]
        assert opus_caps["actual_model"] == "glm-5"
