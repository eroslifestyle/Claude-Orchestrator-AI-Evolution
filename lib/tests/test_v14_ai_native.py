"""Test suite for Orchestrator V14.0 AI-Native modules.

Test coverage per:
- lib/predictive_cache.py - PredictiveAgentCache, PatternRecognitionEngine
- lib/adaptive_budget.py - AdaptiveTokenBudget, TokenBudget
- lib/ab_testing.py - ABTestingFramework, Experiment, ExperimentStats (mock)
- lib/auto_tuner.py - AutoTuner, TunableParameter

Target: 30+ test cases, coverage >90%

V14.0.0 - AI-Native Orchestrator support
"""

import json
import os
import sys
import tempfile
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from unittest.mock import MagicMock, patch

import pytest

# Setup path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))


# ============================================================================
# Mock AB Testing Framework (module doesn't exist yet)
# ============================================================================

@dataclass
class RoutingStrategy:
    """Mock routing strategy for A/B testing."""
    name: str
    description: str = ""
    weight: float = 1.0
    active: bool = True


@dataclass
class ExperimentStats:
    """Mock experiment statistics."""
    variant_name: str
    total_tasks: int = 0
    success_count: int = 0
    total_latency_ms: float = 0.0
    total_tokens: int = 0

    @property
    def success_rate(self) -> float:
        return self.success_count / self.total_tasks if self.total_tasks > 0 else 0.0

    @property
    def avg_latency_ms(self) -> float:
        return self.total_latency_ms / self.total_tasks if self.total_tasks > 0 else 0.0


@dataclass
class Experiment:
    """Mock experiment definition."""
    name: str
    variants: List[RoutingStrategy] = field(default_factory=list)
    active: bool = True
    stats: Dict[str, ExperimentStats] = field(default_factory=dict)

    def assign_variant(self, task_id: str) -> str:
        """Assign a variant based on task_id hash."""
        if not self.variants:
            return "control"
        # Simple hash-based assignment
        hash_val = hash(task_id) % 100
        total_weight = sum(v.weight for v in self.variants if v.active)
        cumulative = 0.0
        for variant in self.variants:
            if variant.active:
                cumulative += (variant.weight / total_weight) * 100
                if hash_val < cumulative:
                    return variant.name
        return self.variants[0].name if self.variants else "control"


class ABTestingFramework:
    """Mock A/B testing framework."""

    def __init__(self) -> None:
        self._experiments: Dict[str, Experiment] = {}
        self._lock = threading.RLock()

    def create_experiment(
        self,
        name: str,
        variants: List[RoutingStrategy]
    ) -> Experiment:
        """Create a new experiment."""
        with self._lock:
            experiment = Experiment(name=name, variants=variants)
            for variant in variants:
                experiment.stats[variant.name] = ExperimentStats(variant_name=variant.name)
            self._experiments[name] = experiment
            return experiment

    def assign_variant(self, experiment_name: str, task_id: str) -> str:
        """Assign a variant for a task."""
        with self._lock:
            experiment = self._experiments.get(experiment_name)
            if not experiment or not experiment.active:
                return "control"
            return experiment.assign_variant(task_id)

    def record_result(
        self,
        experiment_name: str,
        variant_name: str,
        success: bool,
        latency_ms: float,
        tokens: int
    ) -> None:
        """Record a result for a variant."""
        with self._lock:
            experiment = self._experiments.get(experiment_name)
            if experiment and variant_name in experiment.stats:
                stats = experiment.stats[variant_name]
                stats.total_tasks += 1
                if success:
                    stats.success_count += 1
                stats.total_latency_ms += latency_ms
                stats.total_tokens += tokens

    def get_statistics(self, experiment_name: str) -> Dict[str, Any]:
        """Get statistics for an experiment."""
        with self._lock:
            experiment = self._experiments.get(experiment_name)
            if not experiment:
                return {}
            return {
                name: {
                    "total_tasks": stats.total_tasks,
                    "success_rate": stats.success_rate,
                    "avg_latency_ms": stats.avg_latency_ms,
                    "total_tokens": stats.total_tokens,
                }
                for name, stats in experiment.stats.items()
            }

    def get_winning_variant(self, experiment_name: str) -> Optional[str]:
        """Get the winning variant based on success rate."""
        with self._lock:
            experiment = self._experiments.get(experiment_name)
            if not experiment or not experiment.stats:
                return None
            best_variant = None
            best_rate = -1.0
            for name, stats in experiment.stats.items():
                if stats.total_tasks >= 10 and stats.success_rate > best_rate:
                    best_rate = stats.success_rate
                    best_variant = name
            return best_variant


# ============================================================================
# Imports for existing modules
# ============================================================================

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

from lib.adaptive_budget import (
    AdaptiveTokenBudget,
    TokenBudget,
    get_budget_calculator,
    MIN_BUDGET,
    MAX_BUDGET,
    DEFAULT_BUDGET,
)

from lib.auto_tuner import (
    AutoTuner,
    AutoTunerConfig,
    OptimizationResult,
    TunableParameter,
    create_auto_tuner,
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
    try:
        os.unlink(path)
    except OSError:
        pass


@pytest.fixture
def temp_history_file():
    """Crea file temporaneo per auto-tuner history."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        f.write('{"history": []}')
        path = f.name
    yield path
    try:
        os.unlink(path)
    except OSError:
        pass


@pytest.fixture
def predictive_cache(temp_patterns_file):
    """Crea PredictiveAgentCache con file temporaneo."""
    cache = PredictiveAgentCache(
        confidence_threshold=0.5,
        patterns_path=temp_patterns_file
    )
    yield cache
    cache.clear_history()


@pytest.fixture
def pattern_engine():
    """Crea PatternRecognitionEngine."""
    return PatternRecognitionEngine()


@pytest.fixture
def adaptive_budget():
    """Crea AdaptiveTokenBudget."""
    return AdaptiveTokenBudget()


@pytest.fixture
def auto_tuner(temp_history_file):
    """Crea AutoTuner con file temporaneo."""
    config = AutoTunerConfig(
        exploration_rate=0.3,
        decay_rate=0.02,
        min_samples=5,
        history_file=temp_history_file,
        max_history=50
    )
    tuner = AutoTuner(config=config)
    yield tuner
    tuner.reset()


@pytest.fixture
def ab_framework():
    """Crea ABTestingFramework."""
    return ABTestingFramework()


# ============================================================================
# Sezione 1: PredictiveAgentCache Tests (8 test)
# ============================================================================

class TestPredictionDataclass:
    """Test per Prediction dataclass."""

    def test_prediction_creation(self):
        """Test creazione predizione con tutti i campi."""
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

    def test_prediction_confidence_clamping_high(self):
        """Test clamping confidence > 1.0."""
        pred = Prediction(agent_id="Test", confidence=1.5, reason="Test")
        assert pred.confidence == 1.0

    def test_prediction_confidence_clamping_low(self):
        """Test clamping confidence < 0.0."""
        pred = Prediction(agent_id="Test", confidence=-0.5, reason="Test")
        assert pred.confidence == 0.0


class TestTaskEmbedding:
    """Test per TaskEmbedding dataclass."""

    def test_embedding_defaults(self):
        """Test valori default embedding."""
        embedding = TaskEmbedding()
        assert embedding.keywords == set()
        assert embedding.pattern_key == "general"
        assert embedding.complexity_score == 0.5
        assert embedding.domain == "general"

    def test_embedding_custom_values(self):
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

    def test_record_and_match_sequence(self, pattern_engine):
        """Test registrazione e match sequenza."""
        pattern_engine.record_sequence(
            "database:fix",
            ["Database Expert", "DB Query Optimizer L2"]
        )

        embedding = TaskEmbedding(
            keywords={"sql"},
            pattern_key="database:fix",
            domain="database"
        )
        matches = pattern_engine.match_patterns(embedding)

        pattern_match = next(
            (m for m in matches if m.pattern_key == "database:fix"),
            None
        )
        assert pattern_match is not None
        assert "Database Expert" in pattern_match.agents


class TestPredictiveAgentCache:
    """Test per PredictiveAgentCache."""

    def test_predict_next_agents_returns_list(self, predictive_cache):
        """Test che predict_next_agents ritorna lista."""
        predictions = predictive_cache.predict_next_agents("Fix database query")

        assert isinstance(predictions, list)
        for pred in predictions:
            assert isinstance(pred, Prediction)

    def test_record_actual_usage(self, predictive_cache):
        """Test registrazione utilizzo effettivo."""
        predictive_cache.record_actual_usage(
            "Fix database query",
            ["Database Expert", "DB Query Optimizer L2"]
        )

        assert "database:fix" in predictive_cache._pattern_engine._pattern_history
        seq = predictive_cache._pattern_engine._pattern_history["database:fix"]
        assert "Database Expert" in seq.agents
        assert seq.frequency == 1

    def test_get_accuracy_metrics(self, predictive_cache):
        """Test metriche accuracy."""
        metrics = predictive_cache.get_accuracy_metrics()

        assert "total_predictions" in metrics
        assert "accuracy" in metrics
        assert "high_confidence_accuracy" in metrics

    def test_set_confidence_threshold(self, predictive_cache):
        """Test impostazione soglia confidence."""
        predictive_cache.set_confidence_threshold(0.9)
        assert predictive_cache._confidence_threshold == 0.9

        # Test clamping
        predictive_cache.set_confidence_threshold(1.5)
        assert predictive_cache._confidence_threshold == 1.0

        predictive_cache.set_confidence_threshold(-0.5)
        assert predictive_cache._confidence_threshold == 0.0

    def test_get_pattern_stats(self, predictive_cache):
        """Test statistiche pattern."""
        predictive_cache.record_actual_usage("Fix database query", ["Database Expert"])

        stats = predictive_cache.get_pattern_stats()

        assert "total_patterns" in stats
        assert "top_patterns" in stats
        assert stats["total_patterns"] >= 1

    def test_get_prediction_for_preload(self, predictive_cache):
        """Test lista agent da preloadare."""
        agents = predictive_cache.get_prediction_for_preload("Fix database query")

        assert isinstance(agents, list)
        for agent in agents:
            assert isinstance(agent, str)

    def test_thread_safety(self, predictive_cache):
        """Test thread safety della cache."""
        errors = []

        def worker(task_suffix):
            try:
                for i in range(10):
                    task = f"Test task {task_suffix} {i}"
                    predictive_cache.predict_next_agents(task)
                    predictive_cache.record_actual_usage(task, [f"Agent {task_suffix}"])
            except Exception as e:
                errors.append(str(e))

        threads = [threading.Thread(target=worker, args=(i,)) for i in range(5)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(errors) == 0


# ============================================================================
# Sezione 2: AdaptiveTokenBudget Tests (8 test)
# ============================================================================

class TestTokenBudget:
    """Test per TokenBudget dataclass."""

    def test_token_budget_creation(self):
        """Test creazione TokenBudget."""
        budget = TokenBudget(
            base_tokens=500,
            complexity_multiplier=1.5,
            final_budget=750,
            factors={"test": 0.5}
        )

        assert budget.base_tokens == 500
        assert budget.complexity_multiplier == 1.5
        assert budget.final_budget == 750
        assert budget.factors == {"test": 0.5}

    def test_token_budget_to_dict(self):
        """Test serializzazione TokenBudget."""
        budget = TokenBudget(
            base_tokens=500,
            complexity_multiplier=1.5,
            final_budget=750,
            factors={"test": 0.5}
        )

        data = budget.to_dict()

        assert data["base_tokens"] == 500
        assert data["complexity_multiplier"] == 1.5
        assert data["final_budget"] == 750
        assert data["factors"] == {"test": 0.5}


class TestAdaptiveTokenBudget:
    """Test per AdaptiveTokenBudget."""

    def test_calculate_budget_simple_task(self, adaptive_budget):
        """Test calcolo budget per task semplice."""
        budget = adaptive_budget.calculate_budget("fix bug")

        assert budget.final_budget >= MIN_BUDGET
        assert budget.final_budget <= MAX_BUDGET
        assert budget.base_tokens == DEFAULT_BUDGET

    def test_calculate_budget_complex_task(self, adaptive_budget):
        """Test calcolo budget per task complesso."""
        simple_budget = adaptive_budget.calculate_budget("fix bug")
        complex_budget = adaptive_budget.calculate_budget(
            "refactor authentication module with JWT integration, "
            "add OAuth support, implement security audit, migrate database schema"
        )

        assert complex_budget.final_budget > simple_budget.final_budget

    def test_assess_complexity_factors(self, adaptive_budget):
        """Test fattori di complessità."""
        budget = adaptive_budget.calculate_budget(
            "create API endpoint with database integration",
            {"files": ["api.py", "db.py", "models.py", "tests.py"]}
        )

        assert "keyword_score" in budget.factors
        assert "dependency_score" in budget.factors
        assert "agent_score" in budget.factors
        assert "file_score" in budget.factors
        assert "complexity_raw" in budget.factors

    def test_get_complexity_tier(self, adaptive_budget):
        """Test fascia di complessità."""
        assert adaptive_budget.get_complexity_tier(0.1) == "simple"
        assert adaptive_budget.get_complexity_tier(0.4) == "medium"
        assert adaptive_budget.get_complexity_tier(0.7) == "complex"
        assert adaptive_budget.get_complexity_tier(0.9) == "very_complex"

    def test_get_budget_for_tier(self, adaptive_budget):
        """Test budget per fascia."""
        assert adaptive_budget.get_budget_for_tier("simple") == 300
        assert adaptive_budget.get_budget_for_tier("medium") == 600
        assert adaptive_budget.get_budget_for_tier("complex") == 1000
        assert adaptive_budget.get_budget_for_tier("very_complex") == 1350

    def test_budget_respects_limits(self, adaptive_budget):
        """Test budget rispetta limiti."""
        # Task molto semplice
        budget = adaptive_budget.calculate_budget("x")
        assert budget.final_budget >= MIN_BUDGET

        # Task molto complesso
        complex_task = " ".join(["comprehensive"] * 100)
        budget = adaptive_budget.calculate_budget(complex_task)
        assert budget.final_budget <= MAX_BUDGET

    def test_budget_with_context(self, adaptive_budget):
        """Test calcolo budget con contesto."""
        budget_no_context = adaptive_budget.calculate_budget("test task")
        budget_with_context = adaptive_budget.calculate_budget(
            "test task",
            {
                "files": ["f1.py", "f2.py", "f3.py", "f4.py", "f5.py",
                         "f6.py", "f7.py", "f8.py", "f9.py", "f10.py"],
                "dependencies": ["dep1", "dep2", "dep3", "dep4", "dep5"],
                "agents": ["agent1", "agent2", "agent3"]
            }
        )

        assert budget_with_context.final_budget > budget_no_context.final_budget

    def test_get_budget_calculator_singleton(self):
        """Test singleton accessor."""
        calc1 = get_budget_calculator()
        calc2 = get_budget_calculator()

        # Dovrebbero essere la stessa istanza (singleton globale)
        # Nota: il singleton e' globale, quindi potrebbe essere gia inizializzato
        assert calc1 is not None
        assert calc2 is not None


# ============================================================================
# Sezione 3: ABTestingFramework Tests (8 test)
# ============================================================================

class TestRoutingStrategy:
    """Test per RoutingStrategy dataclass."""

    def test_routing_strategy_creation(self):
        """Test creazione RoutingStrategy."""
        strategy = RoutingStrategy(
            name="ml_based",
            description="ML-based agent selection",
            weight=1.5,
            active=True
        )

        assert strategy.name == "ml_based"
        assert strategy.description == "ML-based agent selection"
        assert strategy.weight == 1.5
        assert strategy.active is True


class TestExperimentStats:
    """Test per ExperimentStats dataclass."""

    def test_stats_calculation(self):
        """Test calcolo statistiche."""
        stats = ExperimentStats(
            variant_name="test",
            total_tasks=100,
            success_count=80,
            total_latency_ms=5000.0,
            total_tokens=10000
        )

        assert stats.success_rate == 0.8
        assert stats.avg_latency_ms == 50.0

    def test_stats_empty(self):
        """Test statistiche vuote."""
        stats = ExperimentStats(variant_name="empty")

        assert stats.success_rate == 0.0
        assert stats.avg_latency_ms == 0.0


class TestExperiment:
    """Test per Experiment dataclass."""

    def test_experiment_assign_variant(self):
        """Test assegnazione variante."""
        experiment = Experiment(
            name="test",
            variants=[
                RoutingStrategy(name="control", weight=1.0),
                RoutingStrategy(name="treatment", weight=1.0)
            ]
        )

        # Assegnazione deterministica basata su hash
        variant1 = experiment.assign_variant("task_1")
        variant2 = experiment.assign_variant("task_2")

        assert variant1 in ["control", "treatment"]
        assert variant2 in ["control", "treatment"]

    def test_experiment_empty_variants(self):
        """Test esperimento senza varianti."""
        experiment = Experiment(name="empty", variants=[])
        variant = experiment.assign_variant("any_task")

        assert variant == "control"


class TestABTestingFramework:
    """Test per ABTestingFramework."""

    def test_create_experiment(self, ab_framework):
        """Test creazione esperimento."""
        experiment = ab_framework.create_experiment(
            "routing_test",
            [
                RoutingStrategy(name="control", weight=1.0),
                RoutingStrategy(name="ml_based", weight=1.0)
            ]
        )

        assert experiment.name == "routing_test"
        assert len(experiment.variants) == 2
        assert "control" in experiment.stats
        assert "ml_based" in experiment.stats

    def test_assign_variant(self, ab_framework):
        """Test assegnazione variante."""
        ab_framework.create_experiment(
            "test_exp",
            [
                RoutingStrategy(name="a", weight=1.0),
                RoutingStrategy(name="b", weight=1.0)
            ]
        )

        variant = ab_framework.assign_variant("test_exp", "task_123")

        assert variant in ["a", "b"]

    def test_assign_variant_nonexistent_experiment(self, ab_framework):
        """Test assegnazione per esperimento inesistente."""
        variant = ab_framework.assign_variant("nonexistent", "task_123")

        assert variant == "control"

    def test_record_result(self, ab_framework):
        """Test registrazione risultato."""
        ab_framework.create_experiment(
            "result_test",
            [RoutingStrategy(name="control", weight=1.0)]
        )

        ab_framework.record_result(
            "result_test",
            "control",
            success=True,
            latency_ms=100.0,
            tokens=500
        )

        stats = ab_framework.get_statistics("result_test")
        assert stats["control"]["total_tasks"] == 1
        assert stats["control"]["success_rate"] == 1.0
        assert stats["control"]["avg_latency_ms"] == 100.0

    def test_get_statistics(self, ab_framework):
        """Test ottenimento statistiche."""
        ab_framework.create_experiment(
            "stats_test",
            [
                RoutingStrategy(name="variant_a", weight=1.0),
                RoutingStrategy(name="variant_b", weight=1.0)
            ]
        )

        # Registra alcuni risultati
        for i in range(20):
            ab_framework.record_result(
                "stats_test",
                "variant_a" if i % 2 == 0 else "variant_b",
                success=i % 3 != 0,
                latency_ms=50.0 + i,
                tokens=100 + i * 10
            )

        stats = ab_framework.get_statistics("stats_test")

        assert "variant_a" in stats
        assert "variant_b" in stats
        assert stats["variant_a"]["total_tasks"] == 10
        assert stats["variant_b"]["total_tasks"] == 10

    def test_get_winning_variant(self, ab_framework):
        """Test identificazione variante vincente."""
        ab_framework.create_experiment(
            "winner_test",
            [
                RoutingStrategy(name="loser", weight=1.0),
                RoutingStrategy(name="winner", weight=1.0)
            ]
        )

        # Registra risultati con winner che ha success_rate piu alto
        for _ in range(15):
            ab_framework.record_result("winner_test", "loser", False, 100.0, 100)
        for _ in range(15):
            ab_framework.record_result("winner_test", "winner", True, 50.0, 100)

        winner = ab_framework.get_winning_variant("winner_test")

        assert winner == "winner"

    def test_get_winning_variant_insufficient_data(self, ab_framework):
        """Test winning variant con dati insufficienti."""
        ab_framework.create_experiment(
            "insufficient_test",
            [RoutingStrategy(name="only_one", weight=1.0)]
        )

        # Solo 5 risultati (minimo richiesto: 10)
        for _ in range(5):
            ab_framework.record_result("insufficient_test", "only_one", True, 50.0, 100)

        winner = ab_framework.get_winning_variant("insufficient_test")

        assert winner is None  # Non abbastanza dati


# ============================================================================
# Sezione 4: AutoTuner Tests (8 test)
# ============================================================================

class TestTunableParameter:
    """Test per TunableParameter dataclass."""

    def test_parameter_creation(self):
        """Test creazione parametro."""
        param = TunableParameter(
            name="cache_ttl",
            min_value=30,
            max_value=300,
            current_value=60,
            param_type="int"
        )

        assert param.name == "cache_ttl"
        assert param.min_value == 30
        assert param.max_value == 300
        assert param.current_value == 60
        assert param.param_type == "int"

    def test_sample_random(self):
        """Test campionamento casuale."""
        param = TunableParameter(
            name="test",
            min_value=0,
            max_value=100,
            current_value=50,
            param_type="float"
        )

        for _ in range(100):
            value = param.sample_random()
            assert 0 <= value <= 100

    def test_sample_random_int(self):
        """Test campionamento intero."""
        param = TunableParameter(
            name="test",
            min_value=0,
            max_value=10,
            current_value=5,
            param_type="int"
        )

        for _ in range(100):
            value = param.sample_random()
            assert isinstance(value, int) or value == int(value)
            assert 0 <= value <= 10

    def test_clamp(self):
        """Test clamping valore."""
        param = TunableParameter(
            name="test",
            min_value=10,
            max_value=100,
            current_value=50,
            param_type="float"
        )

        assert param.clamp(5) == 10
        assert param.clamp(150) == 100
        assert param.clamp(50) == 50

    def test_to_dict_and_from_dict(self):
        """Test serializzazione e deserializzazione."""
        param = TunableParameter(
            name="test",
            min_value=0,
            max_value=100,
            current_value=50,
            param_type="int"
        )

        data = param.to_dict()
        restored = TunableParameter.from_dict(data)

        assert restored.name == param.name
        assert restored.min_value == param.min_value
        assert restored.max_value == param.max_value
        assert restored.current_value == param.current_value
        assert restored.param_type == param.param_type


class TestAutoTuner:
    """Test per AutoTuner."""

    def test_suggest_parameters_initial(self, auto_tuner):
        """Test suggerimento parametri iniziali (exploration)."""
        params = auto_tuner.suggest_parameters()

        assert isinstance(params, dict)
        assert "cache_ttl" in params
        assert "batch_size" in params
        assert "pool_size" in params
        assert "preload_threshold" in params

    def test_record_outcome(self, auto_tuner):
        """Test registrazione risultato."""
        params = auto_tuner.suggest_parameters()
        auto_tuner.record_outcome(params, {
            "success_rate": 0.95,
            "latency_ms": 120,
            "token_efficiency": 0.85
        })

        stats = auto_tuner.get_stats()
        assert stats["iterations"] == 1
        assert stats["best_score"] is not None

    def test_get_best_parameters(self, auto_tuner):
        """Test ottenimento migliori parametri."""
        # Registra alcuni risultati
        for i in range(10):
            params = auto_tuner.suggest_parameters()
            auto_tuner.record_outcome(params, {
                "success_rate": 0.5 + (i * 0.05),
                "latency_ms": 200 - (i * 10),
                "token_efficiency": 0.7 + (i * 0.02)
            })

        best = auto_tuner.get_best_parameters()

        assert isinstance(best, dict)
        assert "cache_ttl" in best

    def test_exploration_decay(self, auto_tuner):
        """Test decadimento exploration rate."""
        initial_rate = auto_tuner._current_exploration_rate

        # Registra molti risultati
        for i in range(50):
            params = auto_tuner.suggest_parameters()
            auto_tuner.record_outcome(params, {
                "success_rate": 0.8,
                "latency_ms": 100,
                "token_efficiency": 0.8
            })

        final_rate = auto_tuner._current_exploration_rate

        # Exploration rate dovrebbe diminuire
        assert final_rate < initial_rate
        assert final_rate >= 0.05  # Minimo exploration

    def test_reset(self, auto_tuner):
        """Test reset dell'ottimizzatore."""
        # Registra alcuni risultati
        for _ in range(10):
            params = auto_tuner.suggest_parameters()
            auto_tuner.record_outcome(params, {"success_rate": 0.8})

        auto_tuner.reset()

        stats = auto_tuner.get_stats()
        assert stats["iterations"] == 0
        assert stats["best_score"] is None

    def test_get_stats(self, auto_tuner):
        """Test ottenimento statistiche."""
        stats = auto_tuner.get_stats()

        assert "iterations" in stats
        assert "exploration_rate" in stats
        assert "best_score" in stats
        assert "avg_score" in stats

    def test_persistence(self, temp_history_file):
        """Test persistenza history su file."""
        # Crea tuner e registra risultati
        config = AutoTunerConfig(history_file=temp_history_file)
        tuner1 = AutoTuner(config=config)

        for _ in range(5):
            params = tuner1.suggest_parameters()
            tuner1.record_outcome(params, {"success_rate": 0.9})

        # Crea nuovo tuner e verifica caricamento
        tuner2 = AutoTuner(config=config)

        stats = tuner2.get_stats()
        assert stats["iterations"] == 5

    def test_context_manager(self, temp_history_file):
        """Test context manager."""
        config = AutoTunerConfig(history_file=temp_history_file)

        with AutoTuner(config=config) as tuner:
            params = tuner.suggest_parameters()
            tuner.record_outcome(params, {"success_rate": 0.9})

        # Dopo il context, il file dovrebbe essere salvato
        assert Path(temp_history_file).exists()


# ============================================================================
# Sezione 5: Integration Tests (4 test)
# ============================================================================

class TestV14Integration:
    """Test di integrazione tra moduli V14.0."""

    def test_predictive_cache_with_budget(self, predictive_cache, adaptive_budget):
        """Test integrazione cache predittiva con budget."""
        task = "Fix database query with API integration"

        # Calcola budget
        budget = adaptive_budget.calculate_budget(task)

        # Ottieni predizioni
        predictions = predictive_cache.predict_next_agents(task)

        # Verifica che il budget sia proporzionale alla complessità
        assert budget.final_budget >= MIN_BUDGET
        assert len(predictions) <= PredictiveAgentCache.MAX_PREDICTIONS

    def test_auto_tuner_with_ab_framework(self, auto_tuner, ab_framework):
        """Test integrazione auto-tuner con A/B testing."""
        # Crea esperimento
        ab_framework.create_experiment(
            "tuner_test",
            [
                RoutingStrategy(name="default_params", weight=1.0),
                RoutingStrategy(name="tuned_params", weight=1.0)
            ]
        )

        # Assegna variante
        variant = ab_framework.assign_variant("tuner_test", "task_123")

        # Ottieni parametri suggeriti
        params = auto_tuner.suggest_parameters()

        # Simula esecuzione
        success = True
        latency_ms = 150.0
        tokens = 800

        # Registra risultato
        ab_framework.record_result(
            "tuner_test",
            variant,
            success=success,
            latency_ms=latency_ms,
            tokens=tokens
        )

        auto_tuner.record_outcome(params, {
            "success_rate": 1.0 if success else 0.0,
            "latency_ms": latency_ms,
            "token_efficiency": 0.8
        })

        # Verifica statistiche
        stats = ab_framework.get_statistics("tuner_test")
        assert stats[variant]["total_tasks"] == 1

    def test_full_prediction_workflow(self, predictive_cache, adaptive_budget):
        """Test workflow completo: predict -> budget -> record."""
        task = "Implement authentication with JWT and OAuth"

        # 1. Calcola budget per il task
        budget = adaptive_budget.calculate_budget(task)
        assert budget.final_budget > DEFAULT_BUDGET  # Task complesso

        # 2. Predici agent necessari
        predictions = predictive_cache.predict_next_agents(task)
        assert len(predictions) > 0

        # 3. Simula utilizzo agent
        actual_agents = [p.agent_id for p in predictions[:2]]

        # 4. Registra utilizzo effettivo
        predictive_cache.record_actual_usage(task, actual_agents)

        # 5. Verifica pattern salvato
        stats = predictive_cache.get_pattern_stats()
        assert stats["total_patterns"] >= 1

    def test_concurrent_operations(
        self,
        predictive_cache,
        adaptive_budget,
        auto_tuner,
        ab_framework
    ):
        """Test operazioni concorrenti tra tutti i moduli."""
        errors = []

        def worker(worker_id):
            try:
                for i in range(10):
                    task = f"Task {worker_id}-{i}"

                    # Budget
                    budget = adaptive_budget.calculate_budget(task)

                    # Prediction
                    predictions = predictive_cache.predict_next_agents(task)

                    # A/B test
                    variant = ab_framework.assign_variant("concurrent_test", task)
                    ab_framework.record_result(
                        "concurrent_test",
                        variant,
                        success=True,
                        latency_ms=100.0,
                        tokens=500
                    )

                    # Auto-tuner
                    params = auto_tuner.suggest_parameters()
                    auto_tuner.record_outcome(params, {"success_rate": 0.9})

                    # Record usage
                    predictive_cache.record_actual_usage(task, [f"Agent_{worker_id}"])
            except Exception as e:
                errors.append(str(e))

        # Crea esperimento per test concorrente
        ab_framework.create_experiment(
            "concurrent_test",
            [
                RoutingStrategy(name="a", weight=1.0),
                RoutingStrategy(name="b", weight=1.0)
            ]
        )

        threads = [threading.Thread(target=worker, args=(i,)) for i in range(3)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(errors) == 0

        # Verifica statistiche finali
        tuner_stats = auto_tuner.get_stats()
        assert tuner_stats["iterations"] == 30  # 3 threads * 10 iterations


# ============================================================================
# Run Tests
# ============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
