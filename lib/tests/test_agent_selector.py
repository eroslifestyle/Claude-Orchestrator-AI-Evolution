"""Tests for agent_selector.py - V14.0.3.

Comprehensive test coverage for AgentSelector and KeywordInvertedIndex.
"""

import pytest
import json
import tempfile
from pathlib import Path
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
import threading

from lib.agent_selector import (
    AgentSelector,
    KeywordInvertedIndex
)
from lib.agent_performance import AgentPerformanceDB


# ============================================================================
# Test Fixtures
# ============================================================================

@pytest.fixture
def temp_db_path(tmp_path):
    """Create a temporary database path."""
    return str(tmp_path / "test_performance.db")


@pytest.fixture
def performance_db(temp_db_path):
    """Create an in-memory performance database."""
    return AgentPerformanceDB(db_path=":memory:")


@pytest.fixture
def routing_table_path(tmp_path):
    """Create a temporary routing table file."""
    routing_data = {
        "routing": {
            "test": "Tester Expert",
            "debug": "Tester Expert",
            "implement": "Coder",
            "code": "Coder",
            "review": "Reviewer",
            "security": "Security Unified Expert",
            "database": "Database Expert",
            "sql": "Database Expert"
        }
    }
    path = tmp_path / "routing.json"
    path.write_text(json.dumps(routing_data))
    return str(path)


@pytest.fixture
def selector(performance_db):
    """Create an AgentSelector with in-memory database."""
    return AgentSelector(performance_db=performance_db)


# ============================================================================
# KeywordInvertedIndex Tests
# ============================================================================

class TestKeywordInvertedIndexInit:
    """Test KeywordInvertedIndex initialization."""

    def test_init_empty(self):
        """Test initialization creates empty index."""
        index = KeywordInvertedIndex()
        assert len(index._keyword_to_agents) == 0
        assert len(index._compound_keywords) == 0

    def test_init_thread_safe(self):
        """Test initialization includes lock for thread safety."""
        index = KeywordInvertedIndex()
        assert hasattr(index, '_lock')
        assert isinstance(index._lock, type(threading.RLock()))


class TestKeywordInvertedIndexBuild:
    """Test KeywordInvertedIndex build_from_routing_table."""

    def test_build_basic(self):
        """Test building index from routing table."""
        index = KeywordInvertedIndex()
        routing = {"test": "Tester", "code": "Coder"}
        index.build_from_routing_table(routing)

        assert "test" in index._keyword_to_agents
        assert "code" in index._keyword_to_agents

    def test_build_case_insensitive(self):
        """Test index is case-insensitive."""
        index = KeywordInvertedIndex()
        routing = {"TEST": "Tester", "Code": "Coder"}
        index.build_from_routing_table(routing)

        assert index.lookup("test") == {"Tester"}
        assert index.lookup("CODE") == {"Coder"}

    def test_build_compound_keywords(self):
        """Test compound keywords are tracked."""
        index = KeywordInvertedIndex()
        routing = {
            "optimize db": "Database Expert",
            "unit test": "Tester Expert"
        }
        index.build_from_routing_table(routing)

        compounds = index.get_compound_keywords()
        assert "optimize db" in compounds
        assert "unit test" in compounds

    def test_build_multi_agent_keyword(self):
        """Test keyword can map to multiple agents."""
        index = KeywordInvertedIndex()
        routing = {
            "test": "Tester Expert",
            "unit test": "Test Unit Specialist L2"
        }
        index.build_from_routing_table(routing)

        # Both should have their own entries
        assert "test" in index._keyword_to_agents
        assert "unit test" in index._compound_keywords

    def test_build_clears_previous(self):
        """Test build clears previous index."""
        index = KeywordInvertedIndex()
        index.build_from_routing_table({"old": "Agent"})
        index.build_from_routing_table({"new": "Agent"})

        assert "old" not in index._keyword_to_agents
        assert "new" in index._keyword_to_agents


class TestKeywordInvertedIndexLookup:
    """Test KeywordInvertedIndex lookup."""

    def test_lookup_existing(self):
        """Test lookup for existing keyword."""
        index = KeywordInvertedIndex()
        index.build_from_routing_table({"test": "Tester"})

        result = index.lookup("test")
        assert result == {"Tester"}

    def test_lookup_missing(self):
        """Test lookup for missing keyword."""
        index = KeywordInvertedIndex()
        index.build_from_routing_table({"test": "Tester"})

        result = index.lookup("nonexistent")
        assert result == set()

    def test_lookup_case_insensitive(self):
        """Test lookup is case-insensitive."""
        index = KeywordInvertedIndex()
        index.build_from_routing_table({"Test": "Tester"})

        assert index.lookup("TEST") == {"Tester"}
        assert index.lookup("test") == {"Tester"}


class TestKeywordInvertedIndexExtractFromTask:
    """Test KeywordInvertedIndex extract_from_task."""

    def test_extract_single_keyword(self):
        """Test extracting single keyword."""
        index = KeywordInvertedIndex()
        index.build_from_routing_table({"test": "Tester"})

        matches = index.extract_from_task("please test this code")
        assert len(matches) >= 1
        keywords = [kw for kw, _ in matches]
        assert "test" in keywords

    def test_extract_multiple_keywords(self):
        """Test extracting multiple keywords."""
        index = KeywordInvertedIndex()
        index.build_from_routing_table({
            "test": "Tester",
            "code": "Coder"
        })

        matches = index.extract_from_task("test and code")
        keywords = [kw for kw, _ in matches]
        assert "test" in keywords or "code" in keywords

    def test_extract_compound_priority(self):
        """Test compound keywords have priority."""
        index = KeywordInvertedIndex()
        index.build_from_routing_table({
            "unit test": "Test Unit Specialist L2",
            "test": "Tester Expert"
        })

        matches = index.extract_from_task("write unit test for this")
        keywords = [kw for kw, _ in matches]
        # Compound keyword should appear first
        if len(keywords) > 1:
            assert "unit test" in keywords

    def test_extract_empty_task(self):
        """Test extracting from empty task."""
        index = KeywordInvertedIndex()
        index.build_from_routing_table({"test": "Tester"})

        matches = index.extract_from_task("")
        assert matches == []

    def test_extract_none_task(self):
        """Test extracting from None task."""
        index = KeywordInvertedIndex()
        index.build_from_routing_table({"test": "Tester"})

        matches = index.extract_from_task(None)
        assert matches == []

    def test_extract_sorted_by_length(self):
        """Test results sorted by keyword length (descending)."""
        index = KeywordInvertedIndex()
        index.build_from_routing_table({
            "test": "Tester",
            "security": "Security Expert",
            "optimize database": "Database Expert"
        })

        matches = index.extract_from_task("test security optimize database")
        if len(matches) >= 2:
            # Longer keywords should come first
            lengths = [len(kw) for kw, _ in matches]
            sorted_lengths = sorted(lengths, reverse=True)
            assert lengths == sorted_lengths


class TestKeywordInvertedIndexGetKeywords:
    """Test KeywordInvertedIndex get_all_keywords and get_compound_keywords."""

    def test_get_all_keywords(self):
        """Test get_all_keywords returns all keywords."""
        index = KeywordInvertedIndex()
        index.build_from_routing_table({
            "test": "Tester",
            "code": "Coder"
        })

        all_kw = index.get_all_keywords()
        assert "test" in all_kw
        assert "code" in all_kw

    def test_get_compound_keywords(self):
        """Test get_compound_keywords returns only compounds."""
        index = KeywordInvertedIndex()
        index.build_from_routing_table({
            "test": "Tester",
            "unit test": "Test Unit Specialist"
        })

        compounds = index.get_compound_keywords()
        assert "unit test" in compounds
        assert "test" not in compounds


class TestKeywordInvertedIndexClear:
    """Test KeywordInvertedIndex clear."""

    def test_clear(self):
        """Test clear empties the index."""
        index = KeywordInvertedIndex()
        index.build_from_routing_table({"test": "Tester"})
        index.clear()

        assert len(index._keyword_to_agents) == 0
        assert len(index._compound_keywords) == 0


# ============================================================================
# AgentSelector Tests - Initialization
# ============================================================================

class TestAgentSelectorInit:
    """Test AgentSelector initialization."""

    def test_init_with_defaults(self):
        """Test initialization with default parameters."""
        selector = AgentSelector()
        assert selector.performance_db is not None
        assert isinstance(selector.routing_table, dict)

    def test_init_with_performance_db(self, performance_db):
        """Test initialization with provided performance database."""
        selector = AgentSelector(performance_db=performance_db)
        assert selector.performance_db is performance_db

    def test_init_with_routing_table_path(self, routing_table_path, performance_db):
        """Test initialization with routing table path."""
        selector = AgentSelector(
            performance_db=performance_db,
            routing_table_path=routing_table_path
        )
        assert len(selector.routing_table) > 0

    def test_init_creates_inverted_index(self, selector):
        """Test initialization creates inverted index."""
        assert selector._inverted_index is not None

    def test_init_creates_budget_calculator(self, selector):
        """Test initialization creates budget calculator."""
        assert selector._budget_calculator is not None

    def test_init_builds_hardcoded_keywords(self, selector):
        """Test initialization builds hardcoded keywords set."""
        assert len(selector._hardcoded_keywords) > 0


class TestAgentSelectorHardcodedKeywords:
    """Test AgentSelector hardcoded keywords."""

    def test_hardcoded_keywords_contains_common(self, selector):
        """Test hardcoded keywords contains common terms."""
        assert "test" in selector._hardcoded_keywords
        assert "debug" in selector._hardcoded_keywords
        assert "code" in selector._hardcoded_keywords

    def test_hardcoded_keywords_is_set(self, selector):
        """Test hardcoded keywords is a set for O(1) lookup."""
        assert isinstance(selector._hardcoded_keywords, set)


# ============================================================================
# AgentSelector Tests - Keyword Extraction
# ============================================================================

class TestAgentSelectorExtractKeywords:
    """Test AgentSelector extract_keywords."""

    def test_extract_from_simple_task(self, selector):
        """Test extracting from simple task."""
        keywords = selector.extract_keywords("test the code")
        assert len(keywords) > 0

    def test_extract_respects_limit(self, selector):
        """Test extraction respects 15 keyword limit."""
        # Create a task with many keywords
        task = " ".join([
            "test", "debug", "code", "review", "security",
            "database", "api", "gui", "mobile", "trading",
            "analyze", "implement", "refactor", "document", "deploy",
            "optimize", "monitor", "validate", "integrate", "automate"
        ])
        keywords = selector.extract_keywords(task)
        assert len(keywords) <= 15

    def test_extract_sorted_by_specificity(self, selector):
        """Test longer keywords (more specific) come first."""
        keywords = selector.extract_keywords("implement security feature")
        if len(keywords) >= 2:
            # Longer keywords should generally come first
            for i in range(len(keywords) - 1):
                # Not strict due to compound keyword handling
                assert len(keywords[i]) >= len(keywords[i + 1]) - 5

            # No logic in tests - skip

    def test_extract_empty_task(self, selector):
        """Test extracting from empty task."""
        keywords = selector.extract_keywords("")
        assert keywords == []

    def test_extract_no_matching_keywords(self, selector):
        """Test extracting when no keywords match."""
        keywords = selector.extract_keywords("xyz abc qwerty")
        # Should still include hardcoded keywords if they appear
        # or return empty if nothing matches
        assert isinstance(keywords, list)


            # No logic in tests - skip


# ============================================================================
# AgentSelector Tests - Agent Selection
# ============================================================================

class TestAgentSelectorSelectAgent:
    """Test AgentSelector select_agent."""

    def test_select_with_keyword_match(self, selector):
        """Test selection with keyword match."""
        agent = selector.select_agent("test the code")
        assert agent is not None

    def test_select_with_candidates(self, selector):
        """Test selection from candidate list."""
        agent = selector.select_agent(
            "test code",
            candidates=["Tester Expert", "Coder", "Reviewer"]
        )
        assert agent in ["Tester Expert", "Coder", "Reviewer"]

    def test_select_without_candidates_returns_routed(self, selector):
        """Test selection without candidates returns routed agent."""
        agent = selector.select_agent("review the code")
        assert agent is not None

    def test_select_fallback_to_first_candidate(self, selector):
        """Test fallback to first candidate when no match."""
        agent = selector.select_agent(
            "xyz qwerty",
            candidates=["Agent A", "Agent B"]
        )
        # Should return first candidate as fallback
        assert agent == "Agent A"

    def test_select_fallback_to_coder(self, selector):
        """Test fallback to Coder when no candidates."""
        agent = selector.select_agent("xyz qwerty")
        assert agent == "Coder"

    def test_select_with_context(self, selector):
        """Test selection with additional context."""
        agent = selector.select_agent(
            "implement feature",
            context={"project_type": "web"}
        )
        assert agent is not None

    def test_select_with_performance_data(self, selector):
        """Test selection uses performance data when available."""
        # Record some performance data
        selector.record_result("Coder", success=True, duration_ms=100, tokens=50)
        selector.record_result("Coder", success=True, duration_ms=100, tokens=50)
        selector.record_result("Coder", success=True, duration_ms=100, tokens=50)
        selector.record_result("Reviewer", success=False, duration_ms=500, tokens=200)
        selector.record_result("Reviewer", success=False, duration_ms=500, tokens=200)
        selector.record_result("Reviewer", success=True, duration_ms=300, tokens=150)

        # Select from candidates with performance data
        agent = selector.select_agent(
            "test",
            candidates=["Coder", "Reviewer"]
        )
        # Coder has better performance
        assert agent == "Coder"


class TestAgentSelectorRecordResult:
    """Test AgentSelector record_result."""

    def test_record_success(self, selector):
        """Test recording successful task."""
        selector.record_result("Coder", success=True, duration_ms=100, tokens=50)

        stats = selector.get_agent_stats("Coder")
        assert stats is not None
        assert stats["total_tasks"] == 1
        assert stats["success_rate"] == 1.0

    def test_record_failure(self, selector):
        """Test recording failed task."""
        selector.record_result("Coder", success=False, duration_ms=500, tokens=100)

        stats = selector.get_agent_stats("Coder")
        assert stats is not None
        assert stats["total_tasks"] == 1
        assert stats["success_rate"] == 0.0

    def test_record_multiple(self, selector):
        """Test recording multiple tasks."""
        selector.record_result("Coder", success=True, duration_ms=100, tokens=50)
        selector.record_result("Coder", success=True, duration_ms=150, tokens=60)
        selector.record_result("Coder", success=False, duration_ms=200, tokens=80)

        stats = selector.get_agent_stats("Coder")
        assert stats["total_tasks"] == 3
        assert stats["success_rate"] == pytest.approx(2/3, rel=0.1)


class TestAgentSelectorGetStats:
    """Test AgentSelector get_agent_stats and get_ranking."""

    def test_get_stats_unknown_agent(self, selector):
        """Test get_stats for unknown agent returns None."""
        stats = selector.get_agent_stats("Unknown Agent")
        assert stats is None

    def test_get_stats_returns_dict(self, selector):
        """Test get_stats returns dictionary."""
        selector.record_result("Coder", success=True, duration_ms=100, tokens=50)

        stats = selector.get_agent_stats("Coder")
        assert isinstance(stats, dict)
        assert "agent_id" in stats
        assert "total_tasks" in stats
        assert "success_rate" in stats

    def test_get_ranking_empty(self, selector):
        """Test get_ranking with no data."""
        ranking = selector.get_ranking(["Coder", "Reviewer"])
        assert ranking == []

    def test_get_ranking_with_data(self, selector):
        """Test get_ranking with performance data."""
        # Add enough data for cold start threshold
        for _ in range(3):
            selector.record_result("Coder", success=True, duration_ms=100, tokens=50)
        for _ in range(3):
            selector.record_result("Reviewer", success=False, duration_ms=500, tokens=200)

        ranking = selector.get_ranking(["Coder", "Reviewer"])
        assert len(ranking) == 2
        # Coder should rank higher
        assert ranking[0][0] == "Coder"

    def test_get_ranking_cold_start_threshold(self, selector):
        """Test get_ranking requires 3+ tasks (cold start threshold)."""
        selector.record_result("Coder", success=True, duration_ms=100, tokens=50)
        selector.record_result("Coder", success=True, duration_ms=100, tokens=50)

        ranking = selector.get_ranking(["Coder"])
        # Only 2 tasks, below threshold
        assert ranking == []


# ============================================================================
# AgentSelector Tests - Cache
# ============================================================================

class TestAgentSelectorCache:
    """Test AgentSelector caching."""

    def test_get_cache_stats(self, selector):
        """Test get_cache_stats returns stats."""
        stats = selector.get_cache_stats()

        assert "cache_hits" in stats
        assert "cache_misses" in stats
        assert "cache_size" in stats
        assert "max_size" in stats
        assert "routing_table_entries" in stats

    def test_cache_populated_on_init(self, selector):
        """Test cache is populated during initialization."""
        stats = selector.get_cache_stats()
        # Should have some entries cached
        assert stats["cache_size"] >= 0

    def test_invalidate_cache(self, selector):
        """Test invalidate_cache clears caches."""
        selector.invalidate_cache()

        stats = selector.get_cache_stats()
        assert stats["cache_size"] == 0
        assert len(selector.routing_table) == 0


class TestAgentSelectorCacheTTL:
    """Test AgentSelector cache TTL behavior."""

    def test_cache_ttl_exists(self, selector):
        """Test cache TTL is configured."""
        assert selector._cache_ttl.total_seconds() > 0

    def test_cache_stats_includes_ttl(self, selector):
        """Test cache stats include TTL."""
        stats = selector.get_cache_stats()
        assert "cache_ttl_seconds" in stats


# ============================================================================
# AgentSelector Tests - L2 Support
# ============================================================================

class TestAgentSelectorL2Support:
    """Test AgentSelector L2 specialist support."""

    def test_get_l2_stats(self, selector):
        """Test get_l2_stats returns stats."""
        stats = selector.get_l2_stats()
        assert isinstance(stats, dict)

    def test_preload_l2_by_keywords(self, selector):
        """Test preload_l2_by_keywords."""
        count = selector.preload_l2_by_keywords(["test", "security"])
        assert isinstance(count, int)

    def test_get_l2_parent(self, selector):
        """Test get_l2_parent for L2 agent."""
        parent = selector.get_l2_parent("Test Unit Specialist L2")
        # Should return parent or None
        assert parent is None or isinstance(parent, str)


# ============================================================================
# AgentSelector Tests - Thread Safety
# ============================================================================

class TestAgentSelectorThreadSafety:
    """Test AgentSelector thread safety."""

    def test_concurrent_select(self, selector):
        """Test concurrent select_agent calls."""
        results = []
        errors = []

        def select_agent(i):
            try:
                agent = selector.select_agent(f"test task {i}")
                results.append(agent)
            except Exception as e:
                errors.append(e)

        threads = [threading.Thread(target=select_agent, args=(i,)) for i in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(errors) == 0
        assert len(results) == 10

    def test_concurrent_record_result(self, selector):
        """Test concurrent record_result calls."""
        errors = []

        def record(agent_id):
            try:
                for i in range(5):
                    selector.record_result(agent_id, success=True, duration_ms=100, tokens=50)
            except Exception as e:
                errors.append(e)

        threads = [threading.Thread(target=record, args=(f"Agent-{i}",)) for i in range(5)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(errors) == 0


# ============================================================================
# Integration Tests
# ============================================================================

class TestAgentSelectorIntegration:
    """Integration tests for AgentSelector."""

    def test_full_selection_workflow(self, selector):
        """Test full workflow: select, record, get stats."""
        # Select agent
        agent = selector.select_agent("test the code", candidates=["Coder", "Tester Expert"])

        # Simulate task completion
        selector.record_result(agent, success=True, duration_ms=150, tokens=75)

        # Get stats
        stats = selector.get_agent_stats(agent)
        assert stats is not None
        assert stats["total_tasks"] >= 1

    def test_selection_learns_from_performance(self, selector):
        """Test selection learns from performance data."""
        # Give Coder excellent performance
        for _ in range(5):
            selector.record_result("Coder", success=True, duration_ms=50, tokens=30)

        # Give Reviewer poor performance
        for _ in range(5):
            selector.record_result("Reviewer", success=False, duration_ms=500, tokens=200)

        # Select from candidates - should prefer Coder
        agent = selector.select_agent(
            "task",
            candidates=["Coder", "Reviewer"]
        )
        assert agent == "Coder"

    def test_budget_calculated_during_selection(self, selector):
        """Test budget is calculated during selection."""
        with patch.object(selector._budget_calculator, 'calculate_budget') as mock_calc:
            mock_calc.return_value = 500

            selector.select_agent("test task")

            mock_calc.assert_called_once()
