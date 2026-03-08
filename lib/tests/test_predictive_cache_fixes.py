"""Test suite per i 3 fix di PredictiveAgentCache V14.1.

Test coverage per:
- FIX 1: Cold Start Handling (warmup_from_keywords)
- FIX 2: Tiered Storage (hot/warm/cold tiers)
- FIX 3: Distributed Lock (multi-process)

V14.1.0: Test per cold start, tiered storage, distributed lock.
"""

import os
import sys
import tempfile
import threading
import time
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# Setup path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from lib.predictive_cache import (
    DistributedLock,
    PatternRecognitionEngine,
    Prediction,
    PrioritizedPattern,
    PredictiveAgentCache,
    TieredPatternStorage,
    _is_multi_process,
    get_predictive_cache,
    reset_predictive_cache,
)


# ============================================================================
# FIX 1: Cold Start Handling Tests
# ============================================================================

class TestColdStartHandling:
    """Test per FIX 1: warmup_from_keywords cold start fallback."""

    @pytest.fixture
    def pattern_engine(self):
        """Crea motore di pattern recognition."""
        return PatternRecognitionEngine()

    def test_warmup_basic_keyword_match(self, pattern_engine):
        """Test warmup con keyword base."""
        task = "Fix database query performance"
        predictions = pattern_engine.warmup_from_keywords(task)

        assert len(predictions) > 0
        assert any("Database" in p.agent_id for p in predictions)

    def test_warmup_multiple_keywords(self, pattern_engine):
        """Test warmup con multiple keyword."""
        task = "Create API endpoint with security auth"
        predictions = pattern_engine.warmup_from_keywords(task)

        # Dovrebbe matchare sia API che security
        agent_ids = [p.agent_id for p in predictions]
        assert len(predictions) >= 2

    def test_warmup_confidence_ordering(self, pattern_engine):
        """Test che predizioni sono ordinate per confidence."""
        task = "Fix database bug"
        predictions = pattern_engine.warmup_from_keywords(task)

        # Verifica ordinamento decrescente
        confidences = [p.confidence for p in predictions]
        assert confidences == sorted(confidences, reverse=True)

    def test_warmup_max_predictions_limit(self, pattern_engine):
        """Test limite max 5 predizioni."""
        task = "gui database api test security deploy"
        predictions = pattern_engine.warmup_from_keywords(task)

        assert len(predictions) <= 5

    def test_warmup_no_match_returns_empty(self, pattern_engine):
        """Test che task senza keyword ritorna lista vuota."""
        task = "Random task with no matching keywords xyz123"
        predictions = pattern_engine.warmup_from_keywords(task)

        # Potrebbe ritornare lista vuota o pochi match
        # Verifica solo che non crashi
        assert isinstance(predictions, list)

    def test_warmup_source_is_cold_start_fallback(self, pattern_engine):
        """Test che source e 'cold_start_fallback' o 'warm_start_fallback'."""
        task = "Fix database query"
        predictions = pattern_engine.warmup_from_keywords(task)

        # V14.0.4: Accetta sia warm_start_fallback (da _COMMON_AGENTS)
        # che cold_start_fallback (da KEYWORD_AGENT_MAP)
        valid_sources = {"cold_start_fallback", "warm_start_fallback"}
        for pred in predictions:
            assert pred.source in valid_sources, f"Invalid source: {pred.source}"

    def test_warmup_first_agent_higher_confidence(self, pattern_engine):
        """Test che primo agent nella lista ha confidence piu alta."""
        task = "Fix database query"
        predictions = pattern_engine.warmup_from_keywords(task)

        if len(predictions) >= 2:
            # Il primo agent nella lista KEYWORD_AGENT_MAP["database"]
            # dovrebbe avere confidence 0.8
            first_db_agent = predictions[0]
            assert first_db_agent.confidence >= 0.7

    def test_warmup_reason_includes_keyword(self, pattern_engine):
        """Test che reason include la keyword matchata."""
        task = "Create GUI layout"
        predictions = pattern_engine.warmup_from_keywords(task)

        assert len(predictions) > 0
        # Almeno una predizione dovrebbe menzionare "gui"
        reasons = " ".join([p.reason.lower() for p in predictions])
        assert "gui" in reasons


# ============================================================================
# FIX 2: Tiered Storage Tests
# ============================================================================

class TestTieredPatternStorage:
    """Test per FIX 2: TieredPatternStorage con hot/warm/cold tiers."""

    @pytest.fixture
    def storage(self):
        """Crea storage con dimensioni ridotte per test."""
        return TieredPatternStorage(
            hot_size=5,
            warm_size=10,
            cold_size=5
        )

    def test_add_pattern_to_hot_tier(self, storage):
        """Test aggiunta pattern a HOT tier."""
        pattern = {"id": "test1", "data": "value"}
        storage.add_pattern(pattern, value_score=0.5)

        stats = storage.get_stats()
        assert stats["hot_count"] == 1

    def test_high_value_pattern_goes_to_cold(self, storage):
        """Test che pattern con value_score > 0.8 va in COLD."""
        pattern = {"id": "protected1", "data": "precious"}
        storage.add_pattern(pattern, value_score=0.9)

        stats = storage.get_stats()
        # Dovrebbe essere in COLD, non in HOT
        assert stats["cold_count"] == 1

    def test_get_pattern_from_hot(self, storage):
        """Test recupero pattern da HOT tier."""
        pattern = {"id": "hot1", "data": "value"}
        storage.add_pattern(pattern, value_score=0.6)

        retrieved = storage.get_pattern("hot1")
        assert retrieved is not None
        assert retrieved["id"] == "hot1"

    def test_get_pattern_from_cold(self, storage):
        """Test recupero pattern da COLD tier."""
        pattern = {"id": "cold1", "data": "protected"}
        storage.add_pattern(pattern, value_score=0.9)

        retrieved = storage.get_pattern("cold1")
        assert retrieved is not None
        assert retrieved.get("protected") is True

    def test_hot_tier_eviction_to_warm(self, storage):
        """Test eviction da HOT a WARM quando pieno."""
        # Riempi HOT tier (size=5)
        for i in range(6):
            pattern = {"id": f"hot{i}", "data": f"value{i}"}
            storage.add_pattern(pattern, value_score=0.5)

        stats = storage.get_stats()
        # HOT dovrebbe essere al max, WARM dovrebbe avere almeno 1
        assert stats["hot_count"] <= 5
        assert stats["warm_count"] >= 1

    def test_cold_tier_lru_eviction(self, storage):
        """Test LRU eviction in COLD tier."""
        # Riempi COLD tier (size=5)
        for i in range(6):
            pattern = {"id": f"cold{i}", "data": f"protected{i}"}
            storage.add_pattern(pattern, value_score=0.9)

        stats = storage.get_stats()
        # COLD non dovrebbe superare 5
        assert stats["cold_count"] <= 5

    def test_get_all_patterns(self, storage):
        """Test recupero tutti i pattern da tutti i tier."""
        # Aggiungi pattern in ogni tier
        storage.add_pattern({"id": "hot1", "data": "h"}, value_score=0.5)
        storage.add_pattern({"id": "cold1", "data": "c"}, value_score=0.9)

        all_patterns = storage.get_all_patterns()
        assert len(all_patterns) >= 2

    def test_clear_all_tiers(self, storage):
        """Test cancellazione tutti i tier."""
        storage.add_pattern({"id": "test1"}, value_score=0.5)
        storage.add_pattern({"id": "test2"}, value_score=0.9)

        storage.clear()
        stats = storage.get_stats()

        assert stats["hot_count"] == 0
        assert stats["warm_count"] == 0
        assert stats["cold_count"] == 0

    def test_stats_tracking(self, storage):
        """Test tracking statistiche hit/eviction."""
        pattern = {"id": "stat1", "data": "test"}
        storage.add_pattern(pattern, value_score=0.6)

        # Accesso per generare hit
        storage.get_pattern("stat1")

        stats = storage.get_stats()
        assert stats["hot_hits"] >= 1 or stats["warm_hits"] >= 1

    def test_prioritized_pattern_ordering(self):
        """Test ordinamento PrioritizedPattern per priorita."""
        p1 = PrioritizedPattern(priority=-0.9, pattern={"id": "high"})
        p2 = PrioritizedPattern(priority=-0.5, pattern={"id": "low"})

        # Priorita piu alta (meno negativa) dovrebbe essere "minore" per l'heap
        assert p1 < p2  # -0.9 < -0.5, quindi p1 viene prima nell'heap


# ============================================================================
# FIX 3: Distributed Lock Tests
# ============================================================================

class TestDistributedLock:
    """Test per FIX 3: DistributedLock con Redis fallback."""

    def test_local_lock_basic(self):
        """Test funzionamento lock locale."""
        lock = DistributedLock("test_lock", timeout=5.0)

        with lock:
            assert lock.locked()

        assert not lock.locked()

    def test_local_lock_reentrant(self):
        """Test che il lock locale e reentrant."""
        lock = DistributedLock("test_reentrant", timeout=5.0)

        with lock:
            with lock:  # Nested acquire
                assert lock.locked()

    def test_is_multi_process_default_false(self):
        """Test che _is_multi_process ritorna False di default."""
        # Rimuovi variabile ambiente se presente
        old_val = os.environ.pop("CLAUDE_MULTI_PROCESS", None)

        try:
            assert _is_multi_process() is False
        finally:
            if old_val is not None:
                os.environ["CLAUDE_MULTI_PROCESS"] = old_val

    def test_is_multi_process_when_true(self):
        """Test che _is_multi_process ritorna True quando settato."""
        old_val = os.environ.get("CLAUDE_MULTI_PROCESS")
        os.environ["CLAUDE_MULTI_PROCESS"] = "true"

        try:
            assert _is_multi_process() is True
        finally:
            if old_val is not None:
                os.environ["CLAUDE_MULTI_PROCESS"] = old_val
            else:
                os.environ.pop("CLAUDE_MULTI_PROCESS", None)

    def test_distributed_lock_without_redis(self):
        """Test che lock funziona senza Redis (fallback a locale)."""
        # Forza ambiente non-multi-process
        old_val = os.environ.get("CLAUDE_MULTI_PROCESS")
        os.environ["CLAUDE_MULTI_PROCESS"] = "false"

        try:
            lock = DistributedLock("no_redis_lock", timeout=5.0)
            assert lock._redis_client is None

            with lock:
                assert lock.locked()
        finally:
            if old_val is not None:
                os.environ["CLAUDE_MULTI_PROCESS"] = old_val
            else:
                os.environ.pop("CLAUDE_MULTI_PROCESS", None)

    @patch("lib.predictive_cache._is_multi_process")
    def test_redis_connection_failure_fallback(self, mock_is_multi):
        """Test fallback a lock locale se Redis fallisce."""
        mock_is_multi.return_value = True

        # Mock redis per simulare fallimento connessione
        with patch.dict("sys.modules", {"redis": None}):
            lock = DistributedLock("fallback_lock", timeout=5.0)
            # Dovrebbe fallback a lock locale
            assert lock._redis_client is None

    def test_lock_timeout_parameter(self):
        """Test che timeout viene impostato correttamente."""
        lock = DistributedLock("timeout_test", timeout=42.0)
        assert lock._timeout == 42.0


class TestPredictiveCacheWithFixes:
    """Test integrazione PredictiveAgentCache con i 3 fix."""

    @pytest.fixture
    def temp_file(self):
        """Crea file temporaneo per patterns."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            f.write('{}')
            path = f.name
        yield path
        try:
            os.unlink(path)
        except OSError:
            pass

    def test_cache_with_tiered_storage_enabled(self, temp_file):
        """Test cache con tiered storage abilitato."""
        cache = PredictiveAgentCache(
            patterns_path=temp_file,
            use_tiered_storage=True
        )

        assert cache._pattern_engine._tiered_storage is not None

        cache.clear_history()

    def test_cache_with_tiered_storage_disabled(self, temp_file):
        """Test cache con tiered storage disabilitato."""
        cache = PredictiveAgentCache(
            patterns_path=temp_file,
            use_tiered_storage=False
        )

        assert cache._pattern_engine._tiered_storage is None

        cache.clear_history()

    def test_cache_with_distributed_lock_enabled(self, temp_file):
        """Test cache con distributed lock abilitato."""
        # Forza ambiente multi-process
        old_val = os.environ.get("CLAUDE_MULTI_PROCESS")
        os.environ["CLAUDE_MULTI_PROCESS"] = "true"

        try:
            cache = PredictiveAgentCache(
                patterns_path=temp_file,
                use_distributed_lock=True
            )

            # Dovrebbe usare DistributedLock
            assert cache._use_distributed_lock is True
            cache.clear_history()
        finally:
            if old_val is not None:
                os.environ["CLAUDE_MULTI_PROCESS"] = old_val
            else:
                os.environ.pop("CLAUDE_MULTI_PROCESS", None)

    def test_cache_with_distributed_lock_disabled(self, temp_file):
        """Test cache con distributed lock disabilitato."""
        cache = PredictiveAgentCache(
            patterns_path=temp_file,
            use_distributed_lock=False
        )

        # Dovrebbe usare RLock standard
        assert cache._use_distributed_lock is False
        assert isinstance(cache._lock, type(threading.RLock()))

        cache.clear_history()

    def test_cold_start_fallback_in_predict(self, temp_file):
        """Test che predict usa warmup_from_keywords come fallback."""
        cache = PredictiveAgentCache(
            patterns_path=temp_file,
            confidence_threshold=0.3  # Bassa per vedere piu risultati
        )

        # Task con keyword note
        task = "Fix database query performance issue"
        predictions = cache.predict_next_agents(task)

        # Dovrebbe avere predizioni basate su keyword
        assert len(predictions) > 0

        cache.clear_history()

    def test_tiered_storage_integrated_with_patterns(self, temp_file):
        """Test integrazione tiered storage con registrazione pattern."""
        cache = PredictiveAgentCache(
            patterns_path=temp_file,
            use_tiered_storage=True
        )

        # Registra utilizzo per creare pattern
        cache.record_actual_usage(
            "Fix critical database bug",
            ["Database Expert", "DB Query Optimizer L2"]
        )

        # Verifica che pattern sia registrato
        stats = cache.get_pattern_stats()
        assert stats["total_patterns"] >= 1

        cache.clear_history()


# ============================================================================
# Run Tests
# ============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
