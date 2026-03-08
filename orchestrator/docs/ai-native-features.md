# AI-Native Features (V15.1.0)

> Auto-optimization with machine learning, predictive caching, and unified facade API.

---

## Components Overview

| Component | File | Purpose |
|-----------|------|---------|
| Unified Facade API | `lib/facade.py` | Single entry point for 129 exports across 17 namespaces |
| Predictive Agent Cache | `lib/predictive_cache.py` | Predict needed agents from task embedding |
| Adaptive Token Budget | `lib/adaptive_budget.py` | Dynamic token budget based on task complexity |
| A/B Testing Framework | `lib/ab_testing.py` | Test routing strategies with statistical significance |
| Auto-tuning Parameters | `lib/auto_tuner.py` | Bayesian optimization for system parameters |
| Chaos Injector | `lib/chaos.py` | Resilience testing with fault injection |
| Distributed Lock | `lib/distributed_lock.py` | Multi-instance coordination |
| Routing Engine V2 | `lib/routing_engine.py` | 4-layer keyword matching |
| Plugin Hot Reload | `lib/hot_reload.py` | Zero-downtime plugin updates |

---

## 1. Unified Facade API (V15.1.0)

**Features:**
- Single entry point for all orchestrator modules
- 129 exports: 17 namespaces + 112 direct classes/functions
- Lazy loading for optimal memory footprint
- Type-safe access with full IDE support
- Backward compatible with direct imports

**Namespaces:**
| Namespace | Purpose |
|-----------|---------|
| `facade.chaos` | ChaosInjector, FailureType, ChaosConfig |
| `facade.distributed_lock` | DistributedLockManager, RedisLockBackend |
| `facade.routing` | RoutingEngineV2, RoutingLayer |
| `facade.hot_reload` | PluginHotReloader, ReloadResult |
| `facade.exceptions` | OrchestratorError, AgentNotFoundError, etc. |
| `facade.cache` | PredictiveCache, CacheEntry |
| `facade.budget` | AdaptiveBudget, BudgetTier |
| `facade.ab_testing` | ABTestingFramework, Experiment |
| `facade.auto_tuner` | AutoTuner, TunableParam |

**Usage:**
```python
from lib.facade import facade

# Access via namespaces
chaos = facade.chaos.ChaosInjector()
router = facade.routing.RoutingEngineV2()

# Direct access to common classes
PredictiveCache = facade.PredictiveCache
OrchestratorError = facade.OrchestratorError
```

---

## 2. Chaos Engineering (V15.1.0)

**Features:**
- Fault injection for resilience testing
- Failure types: timeout, error, latency, crash
- Configurable injection rate (0.0-1.0)
- Per-component targeting
- Automatic recovery detection

**Usage:**
```python
from lib.facade import facade

injector = facade.chaos.ChaosInjector(
    failure_types=[facade.chaos.FailureType.TIMEOUT, facade.chaos.FailureType.ERROR],
    injection_rate=0.1  # 10% of requests
)

# Wrap function with chaos
chaotic_fn = injector.decorate(my_function)
```

---

## 3. Distributed Lock (V15.1.0)

**Features:**
- Multi-instance coordination
- Redis-backed lock storage
- Auto-expiry (TTL) for deadlock prevention
- Non-blocking try-lock support
- Heartbeat for long-running operations

**Usage:**
```python
from lib.facade import facade

lock_manager = facade.distributed_lock.DistributedLockManager(
    backend=facade.distributed_lock.RedisLockBackend(redis_url="redis://localhost")
)

async with lock_manager.acquire("resource:shared", ttl=30):
    # Critical section
    pass
```

---

## 4. Routing Engine V2 (V15.1.0)

**Features:**
- 4-layer keyword matching hierarchy
- Layer 1: Exact match (highest priority)
- Layer 2: Prefix match
- Layer 3: Fuzzy match (Levenshtein distance)
- Layer 4: Semantic match (embedding similarity)
- Confidence scores per layer
- Fallback chain for graceful degradation

**Usage:**
```python
from lib.facade import facade

router = facade.routing.RoutingEngineV2()
result = router.route("Fix the authentication bug in login.py")
# Returns: (agent_name, confidence, matched_layer)
```

---

## 5. Plugin Hot Reload (V15.1.0)

**Features:**
- Zero-downtime plugin updates
- Version tracking and rollback support
- Dependency-aware reload ordering
- State preservation across reloads
- File watcher integration

**Usage:**
```python
from lib.facade import facade

reloader = facade.hot_reload.PluginHotReloader(plugin_dir="plugins/")

# Watch and auto-reload
reloader.start_watching()

# Manual reload
result = reloader.reload_plugin("my_plugin")
# Returns: ReloadResult(success=True, old_version="1.0", new_version="1.1")
```

---

## 6. Predictive Agent Caching (V14.0.2)

**Features:**
- Predicts agents needed based on task embedding
- Pattern recognition for agent sequences
- Preload with confidence threshold (0.7 default)
- Target accuracy: >90%
- Cold start fallback with keyword-based prediction
- Tiered storage (hot/warm/cold) for valuable patterns
- Optional distributed lock for multi-process (Redis)

**Usage:**
```python
from lib.predictive_cache import get_predictive_cache
cache = get_predictive_cache()
predictions = cache.predict_next_agents(task, context)
cache.preload_agents(predictions)
```

---

## 7. Adaptive Token Budget (V14.0.2)

**Features:**
- Dynamic budget based on task complexity
- Range: 200-1500 tokens
- Factors: keyword count, dependency depth, agent count
- 4 tiers: simple, medium, complex, very_complex
- Adaptive thresholds based on historical distribution
- Dynamic rule budget (20-60%) instead of fixed 40%
- Auto-adjust with 100+ samples

**Usage:**
```python
from lib.adaptive_budget import get_budget_calculator
budget_calc = get_budget_calculator()
budget = budget_calc.calculate_budget(task, context)
```

---

## 8. A/B Testing Framework (V14.0.2)

**Features:**
- Create experiments to test routing strategies
- Deterministic variant assignment
- Statistical significance with z-test (p < 0.05)
- Minimum 30 samples per variant
- Multi-variant support (A/B/C/D) with configurable weights
- Chi-square test for N variant comparison
- Latin Hypercube Sampling for uniform distribution

**Usage:**
```python
from lib.ab_testing import ABTestingFramework, RoutingStrategy
ab = ABTestingFramework()
exp = ab.create_experiment("test", control, treatment)
variant = ab.assign_variant("test", user_id)
```

---

## 9. Auto-tuning Parameters (V14.0.2)

**Features:**
- Bayesian optimization for parameters
- Tunable params: cache_ttl, batch_size, pool_size, preload_threshold
- Exploration/exploitation with UCB
- Metric scoring: success_rate, latency, token_efficiency
- True Gaussian Process with RBF kernel
- Adaptive n_candidates (5-100) based on dimensionality
- Latin Hypercube Sampling for candidate generation

**Usage:**
```python
from lib.auto_tuner import AutoTuner
tuner = AutoTuner()
params = tuner.suggest_parameters()
tuner.record_outcome(params, metrics)
```

---

## Performance (Stress Test V15.1.0)

| Metric | Value |
|--------|-------|
| Simultaneous ops | 170 (60 task + 55 agent + 55 skill) |
| Throughput | 9015 ops/sec |
| Error rate | 0% |
| Memory efficiency | 39.82 bytes/op |
| Facade exports | 129 (17 namespaces + 112 direct) |
| Test coverage | 350+ tests (98.8% pass rate) |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| V15.1.0 | 2026-03-08 | Facade API unified, ChaosInjector, DistributedLock, RoutingEngineV2, PluginHotReloader |
| V14.0.2 | 2026-02-20 | Predictive cache, Adaptive budget, A/B testing, Auto-tuner |
