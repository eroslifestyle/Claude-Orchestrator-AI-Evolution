# Claude Code Library (lib/)

> Centralized utilities for the Claude Code orchestrator system V15.0.4

**21 moduli totali | 350+ test | 83% coverage**

---

## Table of Contents

1. [Core Modules](#core-modules)
   - [facade.py](#facadepy---unified-api)
   - [routing_engine.py](#routing_enginepy---4-layer-routing)
   - [exceptions.py](#exceptionspy---custom-exceptions)
2. [Concurrency & Locking](#concurrency--locking)
   - [file_locks.py](#file_lockspy---file-locking)
   - [distributed_lock.py](#distributed_lockpy---distributed-locking)
   - [rate_limiter.py](#rate_limiterpy---adaptive-rate-limiting)
3. [AI-Native Features](#ai-native-features)
   - [agent_selector.py](#agent_selectorpy---ml-agent-selection)
   - [agent_performance.py](#agent_performancepy---performance-tracking)
   - [predictive_cache.py](#predictive_cachepy---predictive-caching)
   - [adaptive_budget.py](#adaptive_budgetpy---adaptive-budgeting)
   - [ab_testing.py](#ab_testingpy---ab-testing)
   - [auto_tuner.py](#auto_tunerpy---bayesian-optimization)
4. [Utilities](#utilities)
   - [chaos.py](#chaospy---chaos-engineering)
   - [gp_fallback.py](#gp_fallbackpy---gaussian-process-fallback)
   - [lazy_agents.py](#lazy_agentspy---lazy-loading)
   - [process_manager.py](#process_managerpy---process-lifecycle)
   - [skill_interface.py](#skill_interfacepy---skill-interface)
   - [skill_plugin.py](#skill_pluginpy---plugin-system)
   - [rule_excerpts.py](#rule_excerptspy---rule-extraction)
   - [hooks.py](#hookspy---hook-system)

---

## Core Modules

### facade.py - Unified API

**Purpose:** Single entry point for all lib functionality with logical namespaces.

**Namespaces:**
- `selection`: Agent selection and performance tracking
- `locks`: File locking and concurrency control
- `cache`: Predictive agent caching
- `budget`: Adaptive token budget management
- `testing`: A/B testing framework
- `tuning`: Bayesian parameter optimization
- `ml`: Machine learning utilities
- `skills`: Skill plugin system
- `rules`: Rule excerpt management
- `lazy`: Lazy agent loading
- `process`: Process lifecycle management
- `exceptions`: Custom exception hierarchy

**Usage:**
```python
from lib.facade import selection, cache, tuning, exceptions

# Use selection namespace
selector = selection.AgentSelector()
best_agent = selector.select_agent(task, candidates)

# Use cache namespace
pred_cache = cache.get_predictive_cache()
predictions = pred_cache.predict_next_agents(task, context)

# Direct imports
from lib.facade import AgentSelector, PredictiveAgentCache, OrchestratorError
```

**Files:** `facade.py` - Main implementation

**Dependencies:** All lib modules (re-exports)

---

### routing_engine.py - 4-Layer Routing

**Purpose:** Intelligent agent routing with layered keyword matching for 43 agents.

**Layers:**
1. **Exact match** (O(1) - hash lookup)
2. **Prefix match** (O(k) - trie)
3. **Substring match** (O(n*m) - inverted index)
4. **Semantic match** (O(1) - precomputed embeddings)

**Usage:**
```python
from lib.routing_engine import RoutingEngine, RoutingMetrics

engine = RoutingEngine()
agent = engine.route("fix python bug")  # Returns "coder"

# Get metrics
metrics = engine.get_metrics()
print(f"Avg latency: {metrics['avg_latency_ms']}ms")
```

**API Surface:**
- `route(query: str) -> str`: Route query to agent
- `get_metrics() -> Dict`: Get routing metrics
- `get_layer_stats() -> Dict`: Get per-layer statistics

**Files:** `routing_engine.py` - Main implementation

**Dependencies:** Python 3.10+, lib.exceptions

---

### exceptions.py - Custom Exceptions

**Purpose:** Hierarchical exception system for clean error handling and proper exception chaining.

**Hierarchy:**
```
OrchestratorError (base)
|-- AgentError (agent-related)
|-- TaskError (task-related)
|-- LockError (lock-related)
|   |-- DistributedLockError (distributed)
|-- ConfigurationError (config-related)
|-- RoutingError (routing-related)
|-- CacheError (cache-related)
|-- DatabaseError (database-related)
```

**Usage:**
```python
from lib.exceptions import ConfigurationError, AgentError

try:
    config = load_config()
except IOError as err:
    raise ConfigurationError(f"Failed to load config: {err}") from err
```

**Files:** `exceptions.py` - Main implementation

**Dependencies:** Python 3.10+ only

---

## Concurrency & Locking

### file_locks.py - File Locking

**Purpose:** Thread-safe file operations with context managers.

**Features:**
- Platform-specific locking (Windows/Unix)
- Context manager pattern
- Timeout support
- Deadlock prevention

**Usage:**
```python
from lib.file_locks import FileLockManager

with FileLockManager().acquire("data.json"):
    # Exclusive access
    pass
```

**Files:** `file_locks.py` - Main implementation, `tests/test_file_locks.py` - Tests

**Dependencies:** Python 3.10+, stdlib only

---

### distributed_lock.py - Distributed Locking

**Purpose:** Redis-based distributed locking with graceful fallback to file-based locking.

**Features:**
- Redis-based distributed lock with async support
- Automatic TTL to prevent deadlocks
- Exponential backoff retry logic
- Health check for Redis connection
- Graceful degradation to FileLockManager

**Usage:**
```python
# Async context manager (recommended)
async with DistributedLockManager() as lock_mgr:
    async with lock_mgr.acquire("resource", "holder"):
        # Exclusive access
        pass

# Manual acquire/release
lock_mgr = DistributedLockManager()
if await lock_mgr.acquire("resource", "holder", ttl=30):
    try:
        pass
    finally:
        await lock_mgr.release("resource", "holder")
```

**Files:** `distributed_lock.py` - Main implementation

**Dependencies:** Python 3.10+, redis[hiredis] (optional)

---

### rate_limiter.py - Adaptive Rate Limiting

**Purpose:** Intelligent rate limiting with token bucket and circuit breaker.

**Features:**
- Token Bucket algorithm for smooth traffic shaping
- Adaptive rate adjustment (10-1000 req/s)
- Backpressure detection
- Circuit Breaker integration
- Thread-safe with RLock

**Usage:**
```python
from lib.rate_limiter import AdaptiveRateLimiter, get_rate_limiter

limiter = get_rate_limiter()

if limiter.acquire("api"):
    # Process request
    pass
else:
    retry_after = limiter.get_retry_after("api")

# Record outcome for adaptive adjustment
limiter.record_outcome("api", success=True, latency_ms=50)
```

**Files:** `rate_limiter.py` - Main implementation

**Dependencies:** Python 3.10+, stdlib only

---

## AI-Native Features

### agent_selector.py - ML Agent Selection

**Purpose:** Machine learning-based agent selection with cold start handling.

**Features:**
- ML routing with success_rate + speed optimization
- Cold start fallback (min 3 tasks before ML)
- Feature extraction from task descriptions
- Confidence scoring

**Usage:**
```python
from lib.agent_selector import AgentSelector

selector = AgentSelector()
best_agent = selector.select_agent(
    task="fix python bug",
    candidates=["coder", "debugger", "architect"]
)
```

**Files:** `agent_selector.py` - Main implementation

**Dependencies:** Python 3.10+, lib.agent_performance

---

### agent_performance.py - Performance Tracking

**Purpose:** Track agent performance metrics for ML-based selection.

**Features:**
- Success rate tracking
- Latency monitoring
- Error pattern detection
- Historical analysis

**Usage:**
```python
from lib.agent_performance import AgentPerformanceTracker

tracker = AgentPerformanceTracker()
tracker.record("coder", success=True, latency_ms=150)
stats = tracker.get_stats("coder")
```

**Files:** `agent_performance.py` - Main implementation

**Dependencies:** Python 3.10+, stdlib only

---

### predictive_cache.py - Predictive Caching

**Purpose:** Predict next agent assignments based on task patterns.

**Features:**
- Pattern recognition engine
- Tiered storage (hot/warm/cold)
- 9000+ ops/sec performance
- Cold start warmup from keywords

**Usage:**
```python
from lib.predictive_cache import get_predictive_cache

cache = get_predictive_cache()
predictions = cache.predict_next_agents("fix bug in auth.py")
# Returns: [("coder", 0.85), ("debugger", 0.12), ...]
```

**Files:** `predictive_cache.py` - Main implementation (815 lines)

**Dependencies:** Python 3.10+, lib.distributed_lock

---

### adaptive_budget.py - Adaptive Budgeting

**Purpose:** Adaptive token budget management for API calls.

**Features:**
- Dynamic budget allocation (20-60% of total)
- Rule budget management
- Performance-based adjustment
- O(1) complexity

**Usage:**
```python
from lib.adaptive_budget import AdaptiveBudgetManager

budget = AdaptiveBudgetManager(total_tokens=100000)
budget.allocate("rules", percentage=0.3)  # 30% for rules
```

**Files:** `adaptive_budget.py` - Main implementation (403 lines)

**Dependencies:** Python 3.10+, stdlib only

---

### ab_testing.py - A/B Testing

**Purpose:** A/B testing framework for agent and prompt optimization.

**Features:**
- Multi-variant testing (A/B/C/D)
- Configurable weights
- Statistical significance tracking
- Automatic winner selection

**Usage:**
```python
from lib.ab_testing import ABTestingFramework

ab = ABTestingFramework()
variant = ab.get_variant("prompt_v2")
# Returns: "A", "B", "C", or "D" based on weights
```

**Files:** `ab_testing.py` - Main implementation (652 lines)

**Dependencies:** Python 3.10+, stdlib only

---

### auto_tuner.py - Bayesian Optimization

**Purpose:** Auto-tuning system parameters with Bayesian optimization.

**Features:**
- Gaussian Process optimization
- RBF kernel support
- NumPy fallback to gp_fallback.py
- Adaptive n_candidates

**Usage:**
```python
from lib.auto_tuner import AutoTuner

tuner = AutoTuner()
best_params = tuner.optimize(
    objective_function,
    param_ranges={"learning_rate": (0.001, 0.1)}
)
```

**Files:** `auto_tuner.py` - Main implementation (922 lines)

**Dependencies:** Python 3.10+, numpy (optional), lib.gp_fallback

---

## Utilities

### chaos.py - Chaos Engineering

**Purpose:** Controlled failure injection for testing system resilience.

**Features:**
- Network failure injection
- Latency injection (0-500ms)
- Memory pressure simulation
- Safe mode (disabled in production)

**Usage:**
```python
from lib.chaos import ChaosInjector, get_chaos_injector

chaos = get_chaos_injector()

if chaos.should_inject("network"):
    raise ConnectionError("Chaos injection: network failure")

chaos.inject_latency()  # 0-500ms delay
```

**Configuration:**
- `CHAOS_MODE`: Enable chaos (default: false)
- `CHAOS_PROBABILITY`: Failure probability 0.0-1.0 (default: 0.01)
- `CHAOS_MAX_LATENCY_MS`: Max latency (default: 500)

**Files:** `chaos.py` - Main implementation

**Dependencies:** Python 3.10+, stdlib only

---

### gp_fallback.py - Gaussian Process Fallback

**Purpose:** Pure Python Gaussian Process for environments without NumPy/SciPy.

**Features:**
- Inverse distance weighting with RBF kernel
- No external dependencies
- ~10x slower than NumPy but functional
- Full type hints and docstrings

**Usage:**
```python
from lib.gp_fallback import GaussianProcessFallback, get_gp_implementation

# Direct usage
gp = GaussianProcessFallback(length_scale=0.5)
gp.fit(X_train, y_train)
means, variances = gp.predict(X_test)

# Automatic selection
gp = get_gp_implementation(length_scale=0.5)
```

**Files:** `gp_fallback.py` - Main implementation (155 lines)

**Dependencies:** Python 3.10+, math, typing only

---

### lazy_agents.py - Lazy Loading

**Purpose:** Lazy loading of agent definitions to reduce memory footprint.

**Features:**
- On-demand agent loading
- Memory optimization
- Cache management

**Usage:**
```python
from lib.lazy_agents import LazyAgentLoader

loader = LazyAgentLoader()
agent = loader.get_agent("coder")  # Loads only when accessed
```

**Files:** `lazy_agents.py` - Main implementation

**Dependencies:** Python 3.10+, stdlib only

---

### process_manager.py - Process Lifecycle

**Purpose:** Windows Process Lifecycle Manager with NO orphan processes guarantee.

**Features:**
- Windows Job Objects with `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`
- Signal handlers for graceful shutdown (SIGINT, SIGTERM)
- Atexit handlers for cleanup on normal exit
- Thread-safe process tracking

**Usage:**
```python
from lib.process_manager import ProcessManager

with ProcessManager() as pm:
    proc = pm.spawn(['python', 'script.py'])
    # Process automatically cleaned up on exit
```

**Files:** `process_manager.py` - Main implementation, `tests/test_process_manager.py` - 45 tests

**Dependencies:** Python 3.10+, Windows API (ctypes) for Job Objects

**Platform Support:**
- Windows: Full support with Job Objects
- Unix/Linux: Signal handlers only

---

### skill_interface.py - Skill Interface

**Purpose:** Abstract interface for skill plugins.

**Features:**
- Protocol-based interface
- Lifecycle hooks
- Error handling

**Usage:**
```python
from lib.skill_interface import SkillInterface

class MySkill(SkillInterface):
    def execute(self, context):
        pass
```

**Files:** `skill_interface.py` - Main implementation

**Dependencies:** Python 3.10+, typing.Protocol

---

### skill_plugin.py - Plugin System

**Purpose:** Dynamic skill plugin loading and management.

**Features:**
- Hot-reload support
- Plugin discovery
- Dependency injection

**Usage:**
```python
from lib.skill_plugin import SkillPluginManager

manager = SkillPluginManager()
skill = manager.load_skill("my_skill")
```

**Files:** `skill_plugin.py` - Main implementation

**Dependencies:** Python 3.10+, importlib

---

### rule_excerpts.py - Rule Extraction

**Purpose:** Extract and manage rule excerpts for context injection.

**Features:**
- Pattern-based extraction
- Context-aware loading
- Token budget management

**Usage:**
```python
from lib.rule_excerpts import RuleExcerptManager

manager = RuleExcerptManager()
excerpts = manager.get_relevant_rules("python async patterns")
```

**Files:** `rule_excerpts.py` - Main implementation

**Dependencies:** Python 3.10+, pathlib

---

### hooks.py - Hook System

**Purpose:** Event hooks for orchestrator lifecycle events.

**Features:**
- Pre/post task hooks
- Error hooks
- Metrics hooks

**Usage:**
```python
from lib.hooks import HookManager

hooks = HookManager()
hooks.register("pre_task", my_callback)
```

**Files:** `hooks.py` - Main implementation

**Dependencies:** Python 3.10+, stdlib only

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| V15.0.4 | 2026-03-08 | Unified documentation, cleanup duplicates |
| V14.0.4 | 2026-03-07 | Facade API, Routing Engine, Custom exceptions |
| V14.0.3 | 2026-03-07 | +173 test, docs aligned, 8 limitations resolved |
| V14.0.2 | 2026-03-07 | Stress test 170 ops, 9015 ops/sec |
| V14.0 | 2026-03-07 | AI-NATIVE: Predictive caching, Adaptive budget, A/B testing, Auto-tuning |

---

## Test Coverage

| Module | Coverage | Tests |
|--------|----------|-------|
| process_manager.py | 95% | 45 |
| rate_limiter.py | 88% | 25 |
| distributed_lock.py | 25% | 17 |
| gp_fallback.py | 20% | 10 |
| **Total** | **83%** | **350+** |

---

## Dependencies

**Required:** Python 3.10+

**Optional:**
- `redis[hiredis]` - Distributed locking
- `numpy` - Auto-tuner optimization

---

## Author

Claude Code Architect Expert
Version: 15.0.4
Date: 2026-03-08
