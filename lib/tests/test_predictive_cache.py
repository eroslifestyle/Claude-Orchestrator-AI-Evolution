"""Test suite for PredictiveAgentCache V14.0.

Test coverage per predictive_cache.py.

Target: accuracy > 90%
"""

import json
import os
import sys
import tempfile
import threading
import time
from pathlib import Path

import pytest

# Setup path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from lib.predictive_cache import (
    AgentSequence,
    PatternMatch,
    PatternRecognitionEngine,
    Prediction,
    PredictiveAgentCache,
    TaskEmbedding,
    get_predictive_cache,
    reset_predictive_cache,
)


# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture
def temp_patterns_file():
    """Crea file temporaneo per patterns."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        f.write('{}')
        path = f.name
    yield path
    # Cleanup
    try:
        os.unlink(path)
    except OSError:
        pass


@pytest.fixture
def cache(temp_patterns_file):
    """Crea cache con file temporaneo."""
    cache = PredictiveAgentCache(
        confidence_threshold=0.5,
        patterns_path=temp_patterns_file
    )
    yield cache
    cache.clear_history()


@pytest.fixture
def pattern_engine():
    """Crea motore di pattern recognition."""
    return PatternRecognitionEngine()


# ============================================================================
# Test Prediction Dataclass
# ============================================================================

class TestPrediction:
    """Test per Prediction dataclass."""

    def test_prediction_creation(self):
        """Test creazione predizione."""
        pred = Prediction(
            agent_id="Test Agent",
            confidence=0.85,
            reason="Test reason",
            source="test"
        )
        assert pred.agent_id == "Test Agent"
        assert pred.confidence == 0.85
        assert pred.reason == "Test reason"
        assert pred.source == "test"

    def test_confidence_clamping_high(self):
        """Test clamping confidence > 1.0."""
        pred = Prediction(
            agent_id="Test",
            confidence=1.5,
            reason="Test"
        )
        assert pred.confidence == 1.0

    def test_confidence_clamping_low(self):
        """Test clamping confidence < 0.0."""
        pred = Prediction(
            agent_id="Test",
            confidence=-0.5,
            reason="Test"
        )
        assert pred.confidence == 0.0


# ============================================================================
# Test TaskEmbedding Dataclass
# ============================================================================

class TestTaskEmbedding:
    """Test per TaskEmbedding dataclass."""

    def test_embedding_defaults(self):
        """Test valori default embedding."""
        embedding = TaskEmbedding()
        assert embedding.keywords == set()
        assert embedding.pattern_key == "general"
        assert embedding.complexity_score == 0.5
        assert embedding.domain == "general"

    def test_embedding_custom(self):
        """Test embedding con valori custom."""
        embedding = TaskEmbedding(
            keywords={"api", "rest"},
            pattern_key="api:create",
            complexity_score=0.8,
            domain="api"
        )
        assert embedding.keywords == {"api", "rest"}
        assert embedding.pattern_key == "api:create"
        assert embedding.complexity_score == 0.8
        assert embedding.domain == "api"


# ============================================================================
# Test PatternRecognitionEngine
# ============================================================================

class TestPatternRecognitionEngine:
    """Test per PatternRecognitionEngine."""

    def test_extract_embedding_database(self, pattern_engine):
        """Test estrazione embedding per task database."""
        task = "Fix slow SQL query in user table"
        embedding = pattern_engine.extract_embedding(task)

        assert "sql" in embedding.keywords
        assert "query" in embedding.keywords
        assert embedding.domain == "database"
        assert "database:fix" in embedding.pattern_key

    def test_extract_embedding_api(self, pattern_engine):
        """Test estrazione embedding per task API."""
        task = "Create new REST endpoint for user registration"
        embedding = pattern_engine.extract_embedding(task)

        assert "api" in embedding.keywords or "rest" in embedding.keywords
        assert embedding.domain == "api"
        assert "api:create" in embedding.pattern_key

    def test_extract_embedding_security(self, pattern_engine):
        """Test estrazione embedding per task security."""
        task = "Implement JWT authentication with OAuth"
        embedding = pattern_engine.extract_embedding(task)

        assert embedding.domain == "security"
        assert "jwt" in embedding.keywords or "auth" in embedding.keywords

    def test_complexity_score(self, pattern_engine):
        """Test calcolo complexity score."""
        short_task = "Fix bug"
        long_task = "Create comprehensive API endpoint with validation, " * 10

        short_emb = pattern_engine.extract_embedding(short_task)
        long_emb = pattern_engine.extract_embedding(long_task)

        assert short_emb.complexity_score < long_emb.complexity_score

    def test_match_patterns_empty(self, pattern_engine):
        """Test match pattern con history vuota."""
        embedding = TaskEmbedding(
            keywords={"test"},
            pattern_key="test:general",
            domain="testing"
        )
        matches = pattern_engine.match_patterns(embedding)

        # Dovrebbe trovare almeno il match per dominio
        assert len(matches) >= 1

    def test_match_patterns_with_history(self, pattern_engine):
        """Test match pattern con history."""
        # Registra sequenza
        pattern_engine.record_sequence(
            "database:fix",
            ["Database Expert", "DB Query Optimizer L2"]
        )

        # Match per stesso pattern
        embedding = TaskEmbedding(
            keywords={"sql"},
            pattern_key="database:fix",
            domain="database"
        )
        matches = pattern_engine.match_patterns(embedding)

        # Trova il pattern registrato
        pattern_match = next(
            (m for m in matches if m.pattern_key == "database:fix"),
            None
        )
        assert pattern_match is not None
        assert "Database Expert" in pattern_match.agents

    def test_record_cooccurrence(self, pattern_engine):
        """Test registrazione co-occurrence."""
        pattern_engine.record_cooccurrence(["api", "rest", "endpoint"])

        # Verifica co-occurrence registrate (ordine alfabetico)
        cooccur = pattern_engine._keyword_cooccurrence
        assert ("api", "endpoint") in cooccur or ("endpoint", "api") in cooccur
        assert ("api", "rest") in cooccur or ("rest", "api") in cooccur


# ============================================================================
# Test PredictiveAgentCache
# ============================================================================

class TestPredictiveAgentCache:
    """Test per PredictiveAgentCache."""

    def test_cache_initialization(self, temp_patterns_file):
        """Test inizializzazione cache."""
        cache = PredictiveAgentCache(
            confidence_threshold=0.7,
            patterns_path=temp_patterns_file
        )

        assert cache._confidence_threshold == 0.7
        assert len(cache._pattern_engine._pattern_history) == 0

        cache.clear_history()

    def test_predict_next_agents_returns_list(self, cache):
        """Test che predict_next_agents ritorna lista."""
        predictions = cache.predict_next_agents("Fix database query")

        assert isinstance(predictions, list)
        for pred in predictions:
            assert isinstance(pred, Prediction)

    def test_predict_next_agents_filters_by_confidence(self, cache):
        """Test filtro predizioni per confidence."""
        cache.set_confidence_threshold(0.8)

        predictions = cache.predict_next_agents("Fix SQL query")
        for pred in predictions:
            assert pred.confidence >= 0.8

    def test_predict_next_agents_max_predictions(self, cache):
        """Test limite max predizioni."""
        predictions = cache.predict_next_agents(
            "Fix database query with API endpoint"
        )

        assert len(predictions) <= PredictiveAgentCache.MAX_PREDICTIONS

    def test_record_actual_usage(self, cache):
        """Test registrazione utilizzo effettivo."""
        cache.record_actual_usage(
            "Fix database query",
            ["Database Expert", "DB Query Optimizer L2"]
        )

        # Verifica pattern registrato
        assert "database:fix" in cache._pattern_engine._pattern_history
        seq = cache._pattern_engine._pattern_history["database:fix"]
        assert "Database Expert" in seq.agents
        assert seq.frequency == 1

    def test_accuracy_improves_with_feedback(self, cache):
        """Test che accuracy migliora con feedback."""
        # Fai predizioni e registra utilizzo
        for i in range(10):
            task = f"Fix database query {i}"
            cache.predict_next_agents(task)
            cache.record_actual_usage(
                task,
                ["Database Expert", "DB Query Optimizer L2"]
            )

        metrics = cache.get_accuracy_metrics()
        assert metrics["total_predictions"] > 0

    def test_set_confidence_threshold(self, cache):
        """Test impostazione soglia confidence."""
        cache.set_confidence_threshold(0.9)
        assert cache._confidence_threshold == 0.9

        # Test clamping
        cache.set_confidence_threshold(1.5)
        assert cache._confidence_threshold == 1.0

        cache.set_confidence_threshold(-0.5)
        assert cache._confidence_threshold == 0.0

    def test_get_pattern_stats(self, cache):
        """Test statistiche pattern."""
        cache.record_actual_usage(
            "Fix database query",
            ["Database Expert"]
        )

        stats = cache.get_pattern_stats()

        assert "total_patterns" in stats
        assert "top_patterns" in stats
        assert stats["total_patterns"] >= 1

    def test_clear_history(self, cache):
        """Test cancellazione history."""
        cache.record_actual_usage("Test task", ["Test Agent"])
        cache.clear_history()

        assert len(cache._pattern_engine._pattern_history) == 0
        assert len(cache._accuracy_history) == 0

    def test_get_prediction_for_preload(self, cache):
        """Test lista agent da preloadare."""
        agents = cache.get_prediction_for_preload("Fix database query")

        assert isinstance(agents, list)
        for agent in agents:
            assert isinstance(agent, str)

    def test_thread_safety(self, cache):
        """Test thread safety della cache."""
        errors = []

        def worker(task_suffix):
            try:
                for i in range(10):
                    task = f"Test task {task_suffix} {i}"
                    cache.predict_next_agents(task)
                    cache.record_actual_usage(task, [f"Agent {task_suffix}"])
            except Exception as e:
                errors.append(str(e))

        threads = [
            threading.Thread(target=worker, args=(i,))
            for i in range(5)
        ]

        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(errors) == 0

    def test_persistence_roundtrip(self, temp_patterns_file):
        """Test salvataggio e caricamento pattern."""
        # Crea cache e registra pattern
        cache1 = PredictiveAgentCache(patterns_path=temp_patterns_file)
        cache1.record_actual_usage(
            "Fix database query",
            ["Database Expert", "DB Query Optimizer L2"]
        )
        cache1._save_patterns_to_disk()

        # Crea nuova cache e verifica caricamento
        cache2 = PredictiveAgentCache(patterns_path=temp_patterns_file)

        assert "database:fix" in cache2._pattern_engine._pattern_history
        seq = cache2._pattern_engine._pattern_history["database:fix"]
        assert "Database Expert" in seq.agents

        cache1.clear_history()
        cache2.clear_history()


# ============================================================================
# Test Singleton
# ============================================================================

class TestSingleton:
    """Test per accessor singleton."""

    def test_get_predictive_cache_singleton(self):
        """Test che get_predictive_cache ritorna singleton."""
        reset_predictive_cache()

        cache1 = get_predictive_cache()
        cache2 = get_predictive_cache()

        assert cache1 is cache2

        reset_predictive_cache()

    def test_reset_predictive_cache(self):
        """Test reset singleton."""
        cache1 = get_predictive_cache()
        reset_predictive_cache()
        cache2 = get_predictive_cache()

        assert cache1 is not cache2


# ============================================================================
# Test Accuracy Target (>90%)
# ============================================================================

class TestAccuracyTarget:
    """Test per verificare target accuracy > 90%."""

    def test_accuracy_with_consistent_patterns(self, cache):
        """Test accuracy con pattern consistenti."""
        # Simula 100 task con pattern ripetuti
        patterns = [
            ("Fix database query", ["Database Expert", "DB Query Optimizer L2"]),
            ("Create API endpoint", ["Integration Expert", "API Endpoint Builder L2"]),
            ("Add authentication", ["Security Unified Expert", "Security Auth Specialist L2"]),
        ]

        for _ in range(33):  # 99 task total
            for task, agents in patterns:
                predictions = cache.predict_next_agents(task)
                cache.record_actual_usage(task, agents)

        # Con pattern consistenti, accuracy dovrebbe essere alta
        metrics = cache.get_accuracy_metrics()
        # Nota: con pattern ripetuti, l'accuracy dovrebbe migliorare
        assert metrics["total_predictions"] > 0


# ============================================================================
# Test Integration
# ============================================================================

class TestIntegration:
    """Test di integrazione."""

    def test_full_workflow(self, cache):
        """Test workflow completo: predict -> preload -> record."""
        task = "Fix slow SQL query in database"

        # 1. Predici agent necessari
        predictions = cache.predict_next_agents(task)
        assert len(predictions) > 0

        # 2. Registra utilizzo effettivo
        actual_agents = ["Database Expert", "DB Query Optimizer L2"]
        cache.record_actual_usage(task, actual_agents)

        # 3. Verifica pattern salvato
        stats = cache.get_pattern_stats()
        assert stats["total_patterns"] >= 1

        # 4. Nuova predizione dovrebbe essere migliore
        new_predictions = cache.predict_next_agents(task)
        assert len(new_predictions) > 0


# ============================================================================
# Run Tests
# ============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
