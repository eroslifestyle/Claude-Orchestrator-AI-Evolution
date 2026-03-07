"""Test completi per lazy_agents.py.

Test suite completa per LazyAgentLoader, AgentUsageTracker e utility functions.
Target: >80% coverage.

Coverage:
- LazyAgentLoader: singleton, lazy loading, caching, LRU, thread safety
- AgentUsageTracker: tracking, prediction, persistence
- Utility functions: is_l2_agent, get_all_l2_agents, find_l2_by_keyword
- Keyword index: building, lookup, partial matching
"""

import json
import threading
import time
from collections import deque
from pathlib import Path
from typing import Any, Dict
from unittest.mock import MagicMock, Mock, patch, PropertyMock

import pytest

from lib.lazy_agents import (
    L2_AGENTS,
    L2AgentInfo,
    LoadedAgent,
    AgentUsageTracker,
    LazyAgentLoader,
    get_lazy_agent_loader,
    is_l2_agent,
    get_all_l2_agents,
    find_l2_by_keyword,
    _build_keyword_index,
    _KEYWORD_INDEX,
)


# ==============================================================================
# FIXTURES
# ==============================================================================

@pytest.fixture
def sample_agent_info():
    """Sample L2AgentInfo for testing."""
    return L2AgentInfo(
        name="Test Agent L2",
        parent="Test Parent",
        keywords=["test", "sample", "unit"],
        file="experts/L2/test-agent.md",
        description="Test agent description"
    )


@pytest.fixture
def sample_loaded_agent():
    """Sample LoadedAgent for testing."""
    return LoadedAgent(
        name="Test Agent L2",
        parent="Test Parent",
        keywords=["test", "sample", "unit"],
        content="# Test Agent Content",
        loaded_at=time.time(),
        access_count=1,
        last_access=time.time()
    )


@pytest.fixture
def mock_agent_file(tmp_path):
    """Create mock agent file for testing."""
    agents_dir = tmp_path / ".claude" / "agents" / "experts" / "L2"
    agents_dir.mkdir(parents=True)

    # Create test agent files
    for agent_name, info in L2_AGENTS.items():
        agent_file = agents_dir / Path(info.file).name
        agent_file.write_text(f"# {agent_name}\n\nTest content for {agent_name}")

    return tmp_path


@pytest.fixture
def clean_loader():
    """Reset singleton instance for each test."""
    # Reset singleton
    LazyAgentLoader._instance = None
    yield get_lazy_agent_loader()
    # Cleanup
    LazyAgentLoader._instance = None


@pytest.fixture
def clean_tracker(tmp_path):
    """Create clean AgentUsageTracker instance."""
    db_path = str(tmp_path / "test_usage.json")
    return AgentUsageTracker(db_path=db_path)


# ==============================================================================
# TEST L2AgentInfo Dataclass
# ==============================================================================

class TestL2AgentInfo:
    """Test L2AgentInfo dataclass."""

    def test_creation_with_all_fields(self):
        """Test creazione con tutti i campi."""
        info = L2AgentInfo(
            name="Test Agent",
            parent="Parent",
            keywords=["kw1", "kw2"],
            file="test.md",
            description="Description"
        )
        assert info.name == "Test Agent"
        assert info.parent == "Parent"
        assert info.keywords == ["kw1", "kw2"]
        assert info.file == "test.md"
        assert info.description == "Description"

    def test_creation_with_default_description(self):
        """Test creazione con descrizione di default."""
        info = L2AgentInfo(
            name="Test",
            parent="Parent",
            keywords=["kw"],
            file="test.md"
        )
        assert info.description == ""


# ==============================================================================
# TEST LoadedAgent Dataclass
# ==============================================================================

class TestLoadedAgent:
    """Test LoadedAgent dataclass."""

    def test_creation_with_all_fields(self):
        """Test creazione con tutti i campi."""
        now = time.time()
        agent = LoadedAgent(
            name="Test",
            parent="Parent",
            keywords=["kw"],
            content="Content",
            loaded_at=now,
            access_count=5,
            last_access=now
        )
        assert agent.name == "Test"
        assert agent.access_count == 5

    def test_default_values(self):
        """Test valori di default."""
        agent = LoadedAgent(
            name="Test",
            parent="Parent",
            keywords=["kw"],
            content="Content",
            loaded_at=time.time()
        )
        assert agent.access_count == 0
        assert agent.last_access > 0


# ==============================================================================
# TEST KEYWORD INDEX
# ==============================================================================

class TestKeywordIndex:
    """Test keyword index building and lookup."""

    def test_index_built_at_module_load(self):
        """Test che l'indice sia costruito al caricamento."""
        assert len(_KEYWORD_INDEX) > 0
        assert "layout" in _KEYWORD_INDEX
        assert "GUI Layout Specialist L2" in _KEYWORD_INDEX["layout"]

    def test_build_keyword_index(self):
        """Test costruzione indice keyword."""
        # Rebuild index
        _build_keyword_index()

        # Check some expected mappings
        assert "query" in _KEYWORD_INDEX
        assert "DB Query Optimizer L2" in _KEYWORD_INDEX["query"]

    def test_index_contains_all_keywords(self):
        """Test che l'indice contenga tutte le keyword."""
        total_keywords = sum(len(info.keywords) for info in L2_AGENTS.values())
        # Alcune keyword possono essere duplicate tra agent
        assert len(_KEYWORD_INDEX) <= total_keywords


# ==============================================================================
# TEST AgentUsageTracker
# ==============================================================================

class TestAgentUsageTracker:
    """Test AgentUsageTracker class."""

    def test_initialization(self, clean_tracker):
        """Test inizializzazione tracker."""
        assert clean_tracker._usage_counts == {}
        assert len(clean_tracker._recent_agents) == 0
        assert clean_tracker._session_patterns == {}

    def test_record_usage(self, clean_tracker):
        """Test registrazione utilizzo."""
        clean_tracker.record_usage("Test Agent L2", "test task")

        assert "Test Agent L2" in clean_tracker._usage_counts
        assert clean_tracker._usage_counts["Test Agent L2"] == 1
        assert "Test Agent L2" in clean_tracker._recent_agents

    def test_record_usage_multiple_times(self, clean_tracker):
        """Test registrazione multipla."""
        for _ in range(3):
            clean_tracker.record_usage("Test Agent L2", "test task")

        assert clean_tracker._usage_counts["Test Agent L2"] == 3

    def test_recent_agents_maxlen(self, clean_tracker):
        """Test che recent_agents rispetti maxlen."""
        for i in range(25):
            clean_tracker.record_usage(f"Agent {i}", "test task")

        assert len(clean_tracker._recent_agents) == 20

    def test_extract_pattern_key_database(self, clean_tracker):
        """Test estrazione pattern database."""
        key = clean_tracker._extract_pattern_key("Create SQL query for users")
        assert key == "database"

    def test_extract_pattern_key_api(self, clean_tracker):
        """Test estrazione pattern API."""
        key = clean_tracker._extract_pattern_key("Build REST endpoint")
        assert key == "api"

    def test_extract_pattern_key_general(self, clean_tracker):
        """Test estrazione pattern generale."""
        key = clean_tracker._extract_pattern_key("Do something random")
        assert key == "general"

    def test_predict_for_task_no_history(self, clean_tracker):
        """Test predizione senza storico."""
        predictions = clean_tracker.predict_for_task("test database query")
        # Senza storico, dovrebbe restituire lista vuota
        assert isinstance(predictions, list)

    def test_predict_for_task_with_history(self, clean_tracker):
        """Test predizione con storico."""
        # Registra utilizzo
        clean_tracker.record_usage("DB Query Optimizer L2", "database task")

        # Predici per task simile
        predictions = clean_tracker.predict_for_task("database query optimization")
        assert "DB Query Optimizer L2" in predictions

    def test_get_stats(self, clean_tracker):
        """Test ottenimento statistiche."""
        clean_tracker.record_usage("Agent 1", "test")
        clean_tracker.record_usage("Agent 2", "test")

        stats = clean_tracker.get_stats()
        assert stats["total_agents_tracked"] == 2
        assert stats["recent_agents_count"] == 2

    def test_save_and_load_from_disk(self, clean_tracker, tmp_path):
        """Test persistenza su disco."""
        # Registra utilizzo
        clean_tracker.record_usage("Test Agent L2", "test task")
        clean_tracker.save_to_disk()

        # Verifica file creato
        db_path = Path(clean_tracker._db_path)
        assert db_path.exists()

        # Crea nuovo tracker e verifica caricamento
        new_tracker = AgentUsageTracker(db_path=str(db_path))
        assert "Test Agent L2" in new_tracker._usage_counts

    def test_load_from_disk_corrupted_file(self, tmp_path):
        """Test caricamento con file corrotto."""
        db_path = tmp_path / "corrupted.json"
        db_path.write_text("invalid json {{{", encoding="utf-8")

        # Non dovrebbe crashare
        tracker = AgentUsageTracker(db_path=str(db_path))
        assert tracker._usage_counts == {}


# ==============================================================================
# TEST LazyAgentLoader - INIZIALIZZAZIONE
# ==============================================================================

class TestLazyAgentLoaderInit:
    """Test LazyAgentLoader initialization."""

    def test_singleton_pattern(self):
        """Test pattern singleton."""
        # Reset
        LazyAgentLoader._instance = None

        loader1 = LazyAgentLoader()
        loader2 = LazyAgentLoader()

        assert loader1 is loader2

        # Cleanup
        LazyAgentLoader._instance = None

    def test_singleton_thread_safety(self):
        """Test thread safety del singleton."""
        LazyAgentLoader._instance = None
        instances = []

        def create_instance():
            instances.append(LazyAgentLoader())

        threads = [threading.Thread(target=create_instance) for _ in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        # Tutte le istanze devono essere la stessa
        assert all(inst is instances[0] for inst in instances)

        # Cleanup
        LazyAgentLoader._instance = None

    def test_initialization_values(self, clean_loader):
        """Test valori di inizializzazione."""
        assert clean_loader._initialized is True
        assert clean_loader._loaded_agents == {}
        assert clean_loader._load_locks == {}
        assert clean_loader._max_loaded == 10

    def test_double_initialization_skipped(self, clean_loader):
        """Test che doppia inizializzazione sia saltata."""
        # Modifica un valore
        clean_loader._max_loaded = 5

        # Richiama __init__
        clean_loader.__init__()

        # Il valore non dovrebbe essere resettato
        assert clean_loader._max_loaded == 5


# ==============================================================================
# TEST LazyAgentLoader - GET_AGENT
# ==============================================================================

class TestLazyAgentLoaderGetAgent:
    """Test LazyAgentLoader.get_agent method."""

    def test_get_agent_not_l2(self, clean_loader):
        """Test get_agent con agente non L2."""
        result = clean_loader.get_agent("Non L2 Agent")
        assert result is None

    def test_get_agent_file_not_found(self, clean_loader):
        """Test get_agent con file inesistente."""
        # Usa agente L2 ma con path che non esiste
        with patch.object(clean_loader, '_agents_path', Path("/nonexistent")):
            result = clean_loader.get_agent("GUI Layout Specialist L2")
            assert result is None

    def test_get_agent_lazy_loading(self, clean_loader, mock_agent_file):
        """Test lazy loading di agente L2."""
        with patch.object(clean_loader, '_agents_path', mock_agent_file / ".claude" / "agents"):
            result = clean_loader.get_agent("GUI Layout Specialist L2")

            assert result is not None
            assert result.name == "GUI Layout Specialist L2"
            assert "GUI" in result.content

    def test_get_agent_caching(self, clean_loader, mock_agent_file):
        """Test caching dopo primo caricamento."""
        with patch.object(clean_loader, '_agents_path', mock_agent_file / ".claude" / "agents"):
            # Primo caricamento
            result1 = clean_loader.get_agent("GUI Layout Specialist L2")
            assert result1.access_count == 1

            # Secondo accesso (cached)
            result2 = clean_loader.get_agent("GUI Layout Specialist L2")
            assert result2.access_count == 2
            assert result1 is result2  # Stessa istanza

    def test_get_agent_updates_lru(self, clean_loader, mock_agent_file):
        """Test aggiornamento ordine LRU."""
        with patch.object(clean_loader, '_agents_path', mock_agent_file / ".claude" / "agents"):
            clean_loader.get_agent("GUI Layout Specialist L2")
            clean_loader.get_agent("DB Query Optimizer L2")

            assert clean_loader._access_order == [
                "GUI Layout Specialist L2",
                "DB Query Optimizer L2"
            ]

    def test_get_agent_with_task_context(self, clean_loader, mock_agent_file):
        """Test get_agent con task context."""
        with patch.object(clean_loader, '_agents_path', mock_agent_file / ".claude" / "agents"):
            with patch.object(clean_loader._usage_tracker, 'record_usage') as mock_record:
                clean_loader.get_agent("GUI Layout Specialist L2", "test gui task")
                mock_record.assert_called_once_with("GUI Layout Specialist L2", "test gui task")


# ==============================================================================
# TEST LazyAgentLoader - LRU EVICTION
# ==============================================================================

class TestLazyAgentLoaderLRU:
    """Test LRU eviction."""

    def test_eviction_when_over_limit(self, clean_loader, mock_agent_file):
        """Test eviction quando si supera il limite."""
        clean_loader._max_loaded = 3

        with patch.object(clean_loader, '_agents_path', mock_agent_file / ".claude" / "agents"):
            # Carica 4 agent
            agents = list(L2_AGENTS.keys())[:4]
            for agent_name in agents:
                clean_loader.get_agent(agent_name)

            # Dovrebbe avere solo 3 agent caricati
            assert clean_loader.get_loaded_count() == 3
            # Il primo caricato dovrebbe essere stato evictato
            assert agents[0] not in clean_loader._loaded_agents

    def test_lru_order_on_access(self, clean_loader, mock_agent_file):
        """Test ordine LRU aggiornato su accesso."""
        clean_loader._max_loaded = 3

        with patch.object(clean_loader, '_agents_path', mock_agent_file / ".claude" / "agents"):
            agents = list(L2_AGENTS.keys())[:3]
            for agent_name in agents:
                clean_loader.get_agent(agent_name)

            # Accedi al primo di nuovo
            clean_loader.get_agent(agents[0])

            # Il primo dovrebbe essere ora l'ultimo nella lista LRU
            assert clean_loader._access_order[-1] == agents[0]


# ==============================================================================
# TEST LazyAgentLoader - THREAD SAFETY
# ==============================================================================

class TestLazyAgentLoaderThreadSafety:
    """Test thread safety."""

    def test_concurrent_get_agent(self, clean_loader, mock_agent_file):
        """Test caricamento concorrente dello stesso agente."""
        results = []

        with patch.object(clean_loader, '_agents_path', mock_agent_file / ".claude" / "agents"):
            def load_agent():
                result = clean_loader.get_agent("GUI Layout Specialist L2")
                results.append(result)

            threads = [threading.Thread(target=load_agent) for _ in range(10)]
            for t in threads:
                t.start()
            for t in threads:
                t.join()

            # Tutti dovrebbero ottenere lo stesso oggetto
            assert all(r is results[0] for r in results)
            # Caricato solo una volta
            assert clean_loader.get_loaded_count() == 1

    def test_per_agent_lock_creation(self, clean_loader, mock_agent_file):
        """Test creazione lock per-agent."""
        with patch.object(clean_loader, '_agents_path', mock_agent_file / ".claude" / "agents"):
            agents = list(L2_AGENTS.keys())[:3]

            for agent_name in agents:
                clean_loader.get_agent(agent_name)
                assert agent_name in clean_loader._load_locks


# ==============================================================================
# TEST LazyAgentLoader - WARMUP FOR TASK
# ==============================================================================

class TestLazyAgentLoaderWarmup:
    """Test warmup_for_task functionality."""

    def test_warmup_sets_preload_flag(self, clean_loader, mock_agent_file):
        """Test che warmup imposti flag preload."""
        with patch.object(clean_loader, '_agents_path', mock_agent_file / ".claude" / "agents"):
            clean_loader.warmup_for_task("database query task")
            assert clean_loader._preload_complete is True

    def test_warmup_returns_zero_on_second_call(self, clean_loader, mock_agent_file):
        """Test che secondo warmup ritorni 0."""
        with patch.object(clean_loader, '_agents_path', mock_agent_file / ".claude" / "agents"):
            clean_loader.warmup_for_task("database task")
            result = clean_loader.warmup_for_task("another task")
            assert result == 0

    def test_warmup_resets_with_flag_reset(self, clean_loader, mock_agent_file):
        """Test reset flag preload."""
        with patch.object(clean_loader, '_agents_path', mock_agent_file / ".claude" / "agents"):
            clean_loader.warmup_for_task("database task")
            clean_loader.reset_preload_flag()
            assert clean_loader._preload_complete is False


# ==============================================================================
# TEST LazyAgentLoader - FIND METHODS
# ==============================================================================

class TestLazyAgentLoaderFind:
    """Test find methods."""

    def test_find_by_keyword_direct_match(self, clean_loader):
        """Test find_by_keyword con match diretto."""
        results = clean_loader.find_by_keyword("layout")
        assert "GUI Layout Specialist L2" in results

    def test_find_by_keyword_partial_match(self, clean_loader):
        """Test find_by_keyword con match parziale."""
        results = clean_loader.find_by_keyword("qt")
        assert len(results) > 0

    def test_find_by_keyword_no_match(self, clean_loader):
        """Test find_by_keyword senza match."""
        results = clean_loader.find_by_keyword("nonexistent_keyword_xyz")
        assert results == []

    def test_find_by_parent(self, clean_loader):
        """Test find_by_parent."""
        results = clean_loader.find_by_parent("GUI Super Expert")
        assert "GUI Layout Specialist L2" in results

    def test_find_by_parent_no_match(self, clean_loader):
        """Test find_by_parent senza match."""
        results = clean_loader.find_by_parent("Nonexistent Parent")
        assert results == []


# ==============================================================================
# TEST LazyAgentLoader - PRELOAD
# ==============================================================================

class TestLazyAgentLoaderPreload:
    """Test preload methods."""

    def test_preload_agents(self, clean_loader, mock_agent_file):
        """Test preload_agents."""
        with patch.object(clean_loader, '_agents_path', mock_agent_file / ".claude" / "agents"):
            agents = list(L2_AGENTS.keys())[:3]
            loaded = clean_loader.preload_agents(agents)

            assert loaded == 3
            assert clean_loader.get_loaded_count() == 3

    def test_preload_agents_with_invalid(self, clean_loader, mock_agent_file):
        """Test preload_agents con agenti invalidi."""
        with patch.object(clean_loader, '_agents_path', mock_agent_file / ".claude" / "agents"):
            agents = list(L2_AGENTS.keys())[:2] + ["Invalid Agent"]
            loaded = clean_loader.preload_agents(agents)

            assert loaded == 2

    def test_preload_by_keywords(self, clean_loader, mock_agent_file):
        """Test preload_by_keywords."""
        with patch.object(clean_loader, '_agents_path', mock_agent_file / ".claude" / "agents"):
            loaded = clean_loader.preload_by_keywords(["layout", "gui"])

            assert loaded >= 1  # Almeno GUI Layout Specialist


# ==============================================================================
# TEST LazyAgentLoader - UNLOAD
# ==============================================================================

class TestLazyAgentLoaderUnload:
    """Test unload methods."""

    def test_unload_agent(self, clean_loader, mock_agent_file):
        """Test unload_agent."""
        with patch.object(clean_loader, '_agents_path', mock_agent_file / ".claude" / "agents"):
            clean_loader.get_agent("GUI Layout Specialist L2")
            result = clean_loader.unload_agent("GUI Layout Specialist L2")

            assert result is True
            assert clean_loader.get_loaded_count() == 0

    def test_unload_agent_not_loaded(self, clean_loader):
        """Test unload_agent con agente non caricato."""
        result = clean_loader.unload_agent("GUI Layout Specialist L2")
        assert result is False

    def test_unload_all(self, clean_loader, mock_agent_file):
        """Test unload_all."""
        with patch.object(clean_loader, '_agents_path', mock_agent_file / ".claude" / "agents"):
            agents = list(L2_AGENTS.keys())[:3]
            for agent_name in agents:
                clean_loader.get_agent(agent_name)

            count = clean_loader.unload_all()

            assert count == 3
            assert clean_loader.get_loaded_count() == 0
            assert len(clean_loader._access_order) == 0


# ==============================================================================
# TEST LazyAgentLoader - STATS
# ==============================================================================

class TestLazyAgentLoaderStats:
    """Test statistics methods."""

    def test_get_stats(self, clean_loader):
        """Test get_stats."""
        stats = clean_loader.get_stats()

        assert "total_l2_agents" in stats
        assert "loaded_count" in stats
        assert "max_loaded" in stats
        assert "keyword_index_size" in stats
        assert stats["total_l2_agents"] == len(L2_AGENTS)

    def test_get_loaded_count(self, clean_loader, mock_agent_file):
        """Test get_loaded_count."""
        with patch.object(clean_loader, '_agents_path', mock_agent_file / ".claude" / "agents"):
            assert clean_loader.get_loaded_count() == 0

            clean_loader.get_agent("GUI Layout Specialist L2")
            assert clean_loader.get_loaded_count() == 1

    def test_get_loaded_agents(self, clean_loader, mock_agent_file):
        """Test get_loaded_agents."""
        with patch.object(clean_loader, '_agents_path', mock_agent_file / ".claude" / "agents"):
            clean_loader.get_agent("GUI Layout Specialist L2")
            loaded = clean_loader.get_loaded_agents()

            assert "GUI Layout Specialist L2" in loaded

    def test_get_parent_agent(self, clean_loader):
        """Test get_parent_agent."""
        parent = clean_loader.get_parent_agent("GUI Layout Specialist L2")
        assert parent == "GUI Super Expert"

    def test_get_parent_agent_not_l2(self, clean_loader):
        """Test get_parent_agent con agente non L2."""
        parent = clean_loader.get_parent_agent("Non L2 Agent")
        assert parent is None

    def test_get_agent_keywords(self, clean_loader):
        """Test get_agent_keywords."""
        keywords = clean_loader.get_agent_keywords("GUI Layout Specialist L2")
        assert "layout" in keywords

    def test_get_agent_keywords_not_l2(self, clean_loader):
        """Test get_agent_keywords con agente non L2."""
        keywords = clean_loader.get_agent_keywords("Non L2 Agent")
        assert keywords == []


# ==============================================================================
# TEST UTILITY FUNCTIONS
# ==============================================================================

class TestUtilityFunctions:
    """Test utility functions."""

    def test_get_lazy_agent_loader(self):
        """Test get_lazy_agent_loader."""
        LazyAgentLoader._instance = None
        loader = get_lazy_agent_loader()
        assert isinstance(loader, LazyAgentLoader)
        LazyAgentLoader._instance = None

    def test_is_l2_agent_true(self):
        """Test is_l2_agent con agente L2."""
        assert is_l2_agent("GUI Layout Specialist L2") is True

    def test_is_l2_agent_false(self):
        """Test is_l2_agent con agente non L2."""
        assert is_l2_agent("Non L2 Agent") is False

    def test_get_all_l2_agents(self):
        """Test get_all_l2_agents."""
        agents = get_all_l2_agents()
        assert isinstance(agents, dict)
        assert len(agents) == len(L2_AGENTS)
        # Verifica che sia una copia
        agents["Test"] = None
        assert "Test" not in L2_AGENTS

    def test_find_l2_by_keyword(self):
        """Test find_l2_by_keyword."""
        results = find_l2_by_keyword("layout")
        assert "GUI Layout Specialist L2" in results


# ==============================================================================
# TEST ERROR HANDLING
# ==============================================================================

class TestErrorHandling:
    """Test error handling."""

    def test_get_agent_io_error(self, clean_loader):
        """Test get_agent con IOError."""
        with patch('lib.lazy_agents.Path') as mock_path:
            mock_path.return_value.exists.return_value = True
            mock_path.return_value.read_text.side_effect = IOError("Read error")

            with patch.object(clean_loader, '_agents_path', Path("/test")):
                result = clean_loader.get_agent("GUI Layout Specialist L2")
                assert result is None

    def test_save_to_disk_io_error(self, clean_tracker, tmp_path):
        """Test save_to_disk con IOError."""
        clean_tracker.record_usage("Test Agent", "test")

        with patch('pathlib.Path.write_text', side_effect=IOError("Write error")):
            # Non dovrebbe crashare
            clean_tracker.save_to_disk()


# ==============================================================================
# TEST LOADED AGENT ACCESS TRACKING
# ==============================================================================

class TestLoadedAgentAccessTracking:
    """Test access tracking in LoadedAgent."""

    def test_access_count_increments(self, clean_loader, mock_agent_file):
        """Test incremento access_count."""
        with patch.object(clean_loader, '_agents_path', mock_agent_file / ".claude" / "agents"):
            agent = clean_loader.get_agent("GUI Layout Specialist L2")
            initial_count = agent.access_count

            # Accesso multiplo
            for _ in range(5):
                clean_loader.get_agent("GUI Layout Specialist L2")

            assert agent.access_count == initial_count + 5

    def test_last_access_updates(self, clean_loader, mock_agent_file):
        """Test aggiornamento last_access."""
        with patch.object(clean_loader, '_agents_path', mock_agent_file / ".claude" / "agents"):
            agent1 = clean_loader.get_agent("GUI Layout Specialist L2")
            first_access = agent1.last_access

            time.sleep(0.01)  # Piccolo delay

            agent2 = clean_loader.get_agent("GUI Layout Specialist L2")
            assert agent2.last_access > first_access


# ==============================================================================
# TEST RECORD TASK USAGE
# ==============================================================================

class TestRecordTaskUsage:
    """Test record_task_usage method."""

    def test_record_task_usage(self, clean_loader):
        """Test registrazione utilizzo task."""
        with patch.object(clean_loader._usage_tracker, 'record_usage') as mock:
            clean_loader.record_task_usage("Test Agent", "test task")
            mock.assert_called_once_with("Test Agent", "test task")


# ==============================================================================
# TEST SAVE USAGE DATA
# ==============================================================================

class TestSaveUsageData:
    """Test save_usage_data method."""

    def test_save_usage_data(self, clean_loader, tmp_path):
        """Test salvataggio dati utilizzo."""
        clean_loader._usage_tracker._db_path = str(tmp_path / "test_usage.json")
        clean_loader._usage_tracker.record_usage("Test Agent", "test task")

        clean_loader.save_usage_data()

        assert Path(clean_loader._usage_tracker._db_path).exists()


# ==============================================================================
# TEST INTEGRATION
# ==============================================================================

class TestIntegration:
    """Test di integrazione."""

    def test_full_workflow(self, clean_loader, mock_agent_file):
        """Test workflow completo."""
        with patch.object(clean_loader, '_agents_path', mock_agent_file / ".claude" / "agents"):
            # 1. Warmup
            loaded = clean_loader.warmup_for_task("Create database query")
            assert loaded >= 0

            # 2. Get agent
            agent = clean_loader.get_agent("DB Query Optimizer L2", "database task")
            assert agent is not None

            # 3. Check loaded
            assert clean_loader.get_loaded_count() >= 1

            # 4. Unload
            clean_loader.unload_all()
            assert clean_loader.get_loaded_count() == 0

    def test_multiple_agents_workflow(self, clean_loader, mock_agent_file):
        """Test workflow con multipli agent."""
        with patch.object(clean_loader, '_agents_path', mock_agent_file / ".claude" / "agents"):
            agents_to_load = list(L2_AGENTS.keys())[:5]

            # Preload
            loaded = clean_loader.preload_agents(agents_to_load)
            assert loaded == 5

            # Verify all loaded
            for agent_name in agents_to_load:
                assert agent_name in clean_loader.get_loaded_agents()

            # Stats
            stats = clean_loader.get_stats()
            assert stats["loaded_count"] == 5


# ==============================================================================
# TEST EDGE CASES
# ==============================================================================

class TestEdgeCases:
    """Test casi limite."""

    def test_empty_keywords_list(self, clean_loader):
        """Test preload con lista keyword vuota."""
        loaded = clean_loader.preload_by_keywords([])
        assert loaded == 0

    def test_empty_agents_list(self, clean_loader):
        """Test preload con lista agent vuota."""
        loaded = clean_loader.preload_agents([])
        assert loaded == 0

    def test_keyword_case_insensitive(self, clean_loader):
        """Test keyword case insensitive."""
        results1 = clean_loader.find_by_keyword("LAYOUT")
        results2 = clean_loader.find_by_keyword("layout")
        assert results1 == results2

    def test_concurrent_warmup(self, clean_loader, mock_agent_file):
        """Test warmup concorrente."""
        with patch.object(clean_loader, '_agents_path', mock_agent_file / ".claude" / "agents"):
            results = []

            def do_warmup():
                results.append(clean_loader.warmup_for_task("test task"))

            threads = [threading.Thread(target=do_warmup) for _ in range(5)]
            for t in threads:
                t.start()
            for t in threads:
                t.join()

            # Solo il primo dovrebbe aver caricato
            assert sum(results) == results[0]


# ==============================================================================
# TEST LOAD AGENT INTERNAL
# ==============================================================================

class TestLoadAgentInternal:
    """Test _load_agent_internal method."""

    def test_load_agent_internal_success(self, clean_loader, mock_agent_file):
        """Test _load_agent_internal con successo."""
        with patch.object(clean_loader, '_agents_path', mock_agent_file / ".claude" / "agents"):
            agent = clean_loader._load_agent_internal("GUI Layout Specialist L2")
            assert agent is not None
            assert agent.name == "GUI Layout Specialist L2"

    def test_load_agent_internal_not_l2(self, clean_loader):
        """Test _load_agent_internal con agente non L2."""
        result = clean_loader._load_agent_internal("Non L2 Agent")
        assert result is None

    def test_load_agent_internal_file_not_found(self, clean_loader):
        """Test _load_agent_internal con file inesistente."""
        with patch.object(clean_loader, '_agents_path', Path("/nonexistent")):
            result = clean_loader._load_agent_internal("GUI Layout Specialist L2")
            assert result is None

    def test_load_agent_internal_exception(self, clean_loader, mock_agent_file):
        """Test _load_agent_internal con eccezione."""
        with patch.object(clean_loader, '_agents_path', mock_agent_file / ".claude" / "agents"):
            with patch('pathlib.Path.read_text', side_effect=Exception("Read error")):
                result = clean_loader._load_agent_internal("GUI Layout Specialist L2")
                assert result is None

    def test_load_agent_internal_double_check(self, clean_loader, mock_agent_file):
        """Test double-check pattern in _load_agent_internal."""
        with patch.object(clean_loader, '_agents_path', mock_agent_file / ".claude" / "agents"):
            # Prima chiamata carica
            agent1 = clean_loader._load_agent_internal("GUI Layout Specialist L2")
            assert agent1 is not None

            # Seconda chiamata usa cache interna (double-check)
            agent2 = clean_loader._load_agent_internal("GUI Layout Specialist L2")
            assert agent2 is agent1


# ==============================================================================
# TEST PREDICTIVE CACHE INTEGRATION
# ==============================================================================

class TestPredictiveCacheIntegration:
    """Test integrazione con PredictiveAgentCache."""

    def test_warmup_with_predictive_cache(self, clean_loader, mock_agent_file):
        """Test warmup con PredictiveAgentCache disponibile."""
        mock_prediction = Mock()
        mock_prediction.agent_id = "GUI Layout Specialist L2"
        mock_prediction.confidence = 0.9
        mock_prediction.source = "test"

        mock_cache = Mock()
        mock_cache.predict_next_agents.return_value = [mock_prediction]

        with patch('lib.lazy_agents.PREDICTIVE_CACHE_AVAILABLE', True):
            with patch('lib.lazy_agents.get_predictive_cache', return_value=mock_cache):
                with patch.object(clean_loader, '_agents_path', mock_agent_file / ".claude" / "agents"):
                    loaded = clean_loader.warmup_for_task("test gui task")
                    assert loaded >= 1

    def test_warmup_predictive_cache_agent_not_in_l2(self, clean_loader, mock_agent_file):
        """Test warmup quando predizione non e' un L2 agent."""
        mock_prediction = Mock()
        mock_prediction.agent_id = "Non L2 Agent"
        mock_prediction.confidence = 0.9
        mock_prediction.source = "test"

        mock_cache = Mock()
        mock_cache.predict_next_agents.return_value = [mock_prediction]

        with patch('lib.lazy_agents.PREDICTIVE_CACHE_AVAILABLE', True):
            with patch('lib.lazy_agents.get_predictive_cache', return_value=mock_cache):
                with patch.object(clean_loader, '_agents_path', mock_agent_file / ".claude" / "agents"):
                    loaded = clean_loader.warmup_for_task("test task")
                    # Fallback a usage tracker
                    assert loaded >= 0


# ==============================================================================
# TEST EXCEPTION HANDLING
# ==============================================================================

class TestExceptionHandling:
    """Test exception handling in various methods."""

    def test_get_agent_exception_handling(self, clean_loader, mock_agent_file):
        """Test exception handling in get_agent."""
        with patch.object(clean_loader, '_agents_path', mock_agent_file / ".claude" / "agents"):
            with patch('pathlib.Path.exists', return_value=True):
                with patch('pathlib.Path.read_text', side_effect=Exception("Read error")):
                    result = clean_loader.get_agent("GUI Layout Specialist L2")
                    assert result is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
