"""Unified Facade for Orchestrator V15.1 Lib Modules.

This module provides a single entry point for all lib functionality,
organizing 21 modules into logical namespaces for easier consumption.

Namespaces:
    - selection: Agent selection and performance tracking
    - locks: File locking and concurrency control
    - cache: Predictive agent caching
    - budget: Adaptive token budget management
    - testing: A/B testing framework
    - tuning: Bayesian parameter optimization
    - ml: Machine learning utilities (Gaussian Process)
    - skills: Skill plugin system
    - rules: Rule excerpt management
    - lazy: Lazy agent loading
    - process: Process lifecycle management
    - rate_limiter: Adaptive rate limiting (V15.0)
    - exceptions: Custom exception hierarchy (V14.0.4)
    - chaos: Chaos engineering for resilience testing (V15.1)
    - distributed_lock: Redis-based distributed locks (V15.1)
    - routing: 4-layer keyword routing engine (V15.1)
    - hot_reload: Plugin hot-reload system (V15.1)

Usage:
    from lib.facade import selection, cache, tuning, exceptions, chaos, routing

    # Use selection namespace
    selector = selection.AgentSelector()
    best_agent = selector.select_agent(task, candidates)

    # Use cache namespace
    pred_cache = cache.get_predictive_cache()
    predictions = pred_cache.predict_next_agents(task, context)

    # Use exceptions (V14.0.4)
    from lib.facade import OrchestratorError, AgentError, LockError

    # Use chaos engineering (V15.1)
    injector = chaos.get_chaos_injector()
    if injector.should_inject(chaos.FailureType.NETWORK):
        raise ConnectionError("Simulated failure")

    # Use routing engine (V15.1)
    engine = routing.get_routing_engine_v2()
    agent = engine.route("write a python test")

    # Direct imports also work
    from lib.facade import AgentSelector, PredictiveAgentCache, ChaosInjector
"""

from __future__ import annotations

# =============================================================================
# EXCEPTIONS NAMESPACE (V14.0.4)
# =============================================================================

from lib.exceptions import (
    OrchestratorError,
    AgentError,
    AgentNotFoundError,
    AgentExecutionError,
    TaskError,
    TaskTimeoutError,
    TaskValidationError,
    LockError,
    LockAcquisitionError,
    LockTimeoutError,
    DeadlockError,
    DistributedLockError,
    ConfigurationError,
    ConfigFileNotFoundError,
    ConfigValidationError,
    RoutingError,
    NoAgentFoundError,
    RoutingTableError,
    CacheError,
    CacheSerializationError,
    CacheEvictionError,
    DatabaseError,
    DatabaseConnectionError,
    DatabaseQueryError,
    wrap_exception,
    get_exception_chain,
)


class ExceptionsNamespace:
    """Namespace for custom exceptions.

    V14.0.4: Complete exception hierarchy with proper chaining support.

    Base Exception:
        OrchestratorError: Base for all orchestrator exceptions

    Agent Errors:
        AgentError: Agent-related issues
        AgentNotFoundError: Agent not found in registry
        AgentExecutionError: Agent execution failed

    Task Errors:
        TaskError: Task-related issues
        TaskTimeoutError: Task exceeded timeout
        TaskValidationError: Task validation failed

    Lock Errors:
        LockError: Lock-related issues
        LockAcquisitionError: Failed to acquire lock
        LockTimeoutError: Lock acquisition timed out
        DeadlockError: Deadlock detected
        DistributedLockError: Redis-based lock issues

    Configuration Errors:
        ConfigurationError: Config-related issues
        ConfigFileNotFoundError: Config file missing
        ConfigValidationError: Invalid config values

    Routing Errors:
        RoutingError: Routing-related issues
        NoAgentFoundError: No suitable agent found
        RoutingTableError: Routing table operation failed

    Cache Errors:
        CacheError: Cache-related issues
        CacheSerializationError: Serialization failed
        CacheEvictionError: Eviction failed

    Database Errors:
        DatabaseError: Database-related issues
        DatabaseConnectionError: Connection failed
        DatabaseQueryError: Query failed

    Utility Functions:
        wrap_exception: Wrap exception with chaining
        get_exception_chain: Get full exception chain

    Example:
        from lib.facade import exceptions

        try:
            result = some_operation()
        except exceptions.AgentError as e:
            print(f"Agent error: {e}")
            chain = exceptions.get_exception_chain(e)
    """

    # Base
    OrchestratorError = OrchestratorError
    # Agent
    AgentError = AgentError
    AgentNotFoundError = AgentNotFoundError
    AgentExecutionError = AgentExecutionError
    # Task
    TaskError = TaskError
    TaskTimeoutError = TaskTimeoutError
    TaskValidationError = TaskValidationError
    # Lock
    LockError = LockError
    LockAcquisitionError = LockAcquisitionError
    LockTimeoutError = LockTimeoutError
    DeadlockError = DeadlockError
    DistributedLockError = DistributedLockError
    # Configuration
    ConfigurationError = ConfigurationError
    ConfigFileNotFoundError = ConfigFileNotFoundError
    ConfigValidationError = ConfigValidationError
    # Routing
    RoutingError = RoutingError
    NoAgentFoundError = NoAgentFoundError
    RoutingTableError = RoutingTableError
    # Cache
    CacheError = CacheError
    CacheSerializationError = CacheSerializationError
    CacheEvictionError = CacheEvictionError
    # Database
    DatabaseError = DatabaseError
    DatabaseConnectionError = DatabaseConnectionError
    DatabaseQueryError = DatabaseQueryError
    # Utility
    wrap_exception = staticmethod(wrap_exception)
    get_exception_chain = staticmethod(get_exception_chain)


exceptions = ExceptionsNamespace()


# =============================================================================
# SELECTION NAMESPACE
# =============================================================================

from .agent_performance import (
    AgentPerformanceDB,
    AgentMetrics,
    ConnectionPool,
)
from .agent_selector import (
    AgentSelector,
    KeywordInvertedIndex,
)


class SelectionNamespace:
    """Namespace for agent selection and performance tracking.

    Classes:
        AgentPerformanceDB: SQLite-based performance tracking
        AgentSelector: ML-based agent selection with keyword indexing
        AgentMetrics: Dataclass for agent metrics
        ConnectionPool: Thread-safe SQLite connection pool
        KeywordInvertedIndex: O(1) keyword matching index

    Example:
        from lib.facade import selection

        db = selection.AgentPerformanceDB()
        selector = selection.AgentSelector()
        best = selector.select_agent(task, candidates)
    """

    AgentPerformanceDB = AgentPerformanceDB
    AgentSelector = AgentSelector
    AgentMetrics = AgentMetrics
    ConnectionPool = ConnectionPool
    KeywordInvertedIndex = KeywordInvertedIndex


selection = SelectionNamespace()


# =============================================================================
# LOCKS NAMESPACE
# =============================================================================

from .file_locks import (
    FileLockManager,
    HeartbeatManager,
    LockInfo,
    is_shutting_down,
)


class LocksNamespace:
    """Namespace for file locking and concurrency control.

    Classes:
        FileLockManager: Thread-safe file locking with reentrant support
        HeartbeatManager: Lock health monitoring
        LockInfo: Lock metadata dataclass

    Functions:
        is_shutting_down: Check global shutdown state

    Example:
        from lib.facade import locks

        fm = locks.FileLockManager()
        if fm.acquire(path, holder_id, timeout=30.0):
            try:
                # Edit file safely
                pass
            finally:
                fm.release(path, holder_id)
    """

    FileLockManager = FileLockManager
    HeartbeatManager = HeartbeatManager
    LockInfo = LockInfo
    is_shutting_down = staticmethod(is_shutting_down)


locks = LocksNamespace()


# =============================================================================
# CACHE NAMESPACE
# =============================================================================

from .predictive_cache import (
    PredictiveAgentCache,
    Prediction,
    AgentSequence,
    get_predictive_cache,
)


class CacheNamespace:
    """Namespace for predictive agent caching.

    Classes:
        PredictiveAgentCache: Pattern-based agent prediction
        Prediction: Single agent prediction dataclass
        AgentSequence: Agent sequence pattern dataclass

    Functions:
        get_predictive_cache: Singleton accessor

    Example:
        from lib.facade import cache

        pred_cache = cache.get_predictive_cache()
        predictions = pred_cache.predict_next_agents(task, context)
        pred_cache.preload_agents(predictions)
    """

    PredictiveAgentCache = PredictiveAgentCache
    Prediction = Prediction
    AgentSequence = AgentSequence
    get_predictive_cache = staticmethod(get_predictive_cache)


cache = CacheNamespace()


# =============================================================================
# BUDGET NAMESPACE
# =============================================================================

from .adaptive_budget import (
    AdaptiveTokenBudget,
    BudgetCache,
    ComplexityThresholds,
    RuleBudgetConfig,
    TokenBudget,
    get_budget_calculator,
)


class BudgetNamespace:
    """Namespace for adaptive token budget management.

    Classes:
        AdaptiveTokenBudget: Main budget calculator with complexity scoring
        BudgetCache: LRU cache with TTL for budget results
        ComplexityThresholds: Adaptive thresholds based on distribution
        RuleBudgetConfig: Dynamic rule budget configuration (20-60%)
        TokenBudget: Budget tier dataclass

    Functions:
        get_budget_calculator: Singleton accessor

    Example:
        from lib.facade import budget

        calc = budget.get_budget_calculator()
        budget_info = calc.calculate_budget(task, context)
        print(f"Allocated: {budget_info.total_tokens} tokens")
    """

    AdaptiveTokenBudget = AdaptiveTokenBudget
    BudgetCache = BudgetCache
    ComplexityThresholds = ComplexityThresholds
    RuleBudgetConfig = RuleBudgetConfig
    TokenBudget = TokenBudget
    get_budget_calculator = staticmethod(get_budget_calculator)


budget = BudgetNamespace()


# =============================================================================
# TESTING NAMESPACE
# =============================================================================

from .ab_testing import (
    ABTestingFramework,
    RoutingStrategy,
    Experiment,
    ExperimentResult,
)


class TestingNamespace:
    """Namespace for A/B testing framework.

    Classes:
        ABTestingFramework: Main framework for running experiments
        RoutingStrategy: Strategy configuration dataclass
        Experiment: Experiment definition dataclass
        ExperimentResult: Statistical result with z-test

    Example:
        from lib.facade import testing

        ab = testing.ABTestingFramework()
        control = testing.RoutingStrategy("default", {"mode": "haiku"})
        treatment = testing.RoutingStrategy("fast", {"mode": "haiku", "cache": True})
        exp = ab.create_experiment("routing_test", control, treatment)
        variant = ab.assign_variant("routing_test", "user_123")
    """

    ABTestingFramework = ABTestingFramework
    RoutingStrategy = RoutingStrategy
    Experiment = Experiment
    ExperimentResult = ExperimentResult


testing = TestingNamespace()


# =============================================================================
# TUNING NAMESPACE
# =============================================================================

from .auto_tuner import (
    AutoTuner,
    AutoTunerConfig,
    TunableParameter,
    OptimizationResult,
    GaussianProcessRegressor,
)


class TuningNamespace:
    """Namespace for Bayesian parameter optimization.

    Classes:
        AutoTuner: Main tuner with Bayesian optimization
        AutoTunerConfig: Configuration dataclass
        TunableParameter: Parameter definition dataclass
        OptimizationResult: Result with suggested parameters
        GaussianProcessRegressor: GP with RBF kernel (NumPy or fallback)

    Example:
        from lib.facade import tuning

        tuner = tuning.AutoTuner()
        params = tuner.suggest_parameters()
        # ... use params ...
        tuner.record_outcome(params, {"success_rate": 0.95})
        best = tuner.get_best_parameters()
    """

    AutoTuner = AutoTuner
    AutoTunerConfig = AutoTunerConfig
    TunableParameter = TunableParameter
    OptimizationResult = OptimizationResult
    GaussianProcessRegressor = GaussianProcessRegressor


tuning = TuningNamespace()


# =============================================================================
# ML NAMESPACE
# =============================================================================

from .gp_fallback import (
    GaussianProcessFallback,
    get_gp_implementation,
    has_numpy,
)


class MLNamespace:
    """Namespace for machine learning utilities.

    Classes:
        GaussianProcessFallback: Pure Python GP with RBF kernel

    Functions:
        get_gp_implementation: Returns NumPy GP if available, fallback otherwise
        has_numpy: Check if NumPy is available

    Example:
        from lib.facade import ml

        gp = ml.get_gp_implementation()
        gp.fit(X_train, y_train)
        means, variances = gp.predict(X_test)
    """

    GaussianProcessFallback = GaussianProcessFallback
    get_gp_implementation = staticmethod(get_gp_implementation)
    has_numpy = staticmethod(has_numpy)


ml = MLNamespace()


# =============================================================================
# SKILLS NAMESPACE
# =============================================================================

from .skill_interface import (
    SkillInterface,
    SkillResult,
)
from .skill_plugin import (
    SkillPluginLoader,
    SkillMdWrapper,
    create_skill_plugin,
)


class SkillsNamespace:
    """Namespace for skill plugin system.

    Classes:
        SkillInterface: Abstract base class for skills
        SkillResult: Skill execution result dataclass
        SkillPluginLoader: Dynamic skill loader with hot-reload
        SkillMdWrapper: Wrapper for SKILL.md-based skills

    Functions:
        create_skill_plugin: Factory function for skill plugins

    Example:
        from lib.facade import skills

        loader = skills.SkillPluginLoader()
        skill = loader.load_skill("orchestrator")
        result = skill.execute(context)
    """

    SkillInterface = SkillInterface
    SkillResult = SkillResult
    SkillPluginLoader = SkillPluginLoader
    SkillMdWrapper = SkillMdWrapper
    create_skill_plugin = staticmethod(create_skill_plugin)


skills = SkillsNamespace()


# =============================================================================
# RULES NAMESPACE
# =============================================================================

from .rule_excerpts import (
    RuleExcerptManager,
    RuleExcerpt,
    EXCERPT_CATEGORIES,
    PRIORITY_ORDER,
)


class RulesNamespace:
    """Namespace for rule excerpt management.

    Classes:
        RuleExcerptManager: Budget-aware rule loading
        RuleExcerpt: Rule excerpt dataclass with metadata

    Constants:
        EXCERPT_CATEGORIES: Available rule categories
        PRIORITY_ORDER: Priority mapping for categories

    Example:
        from lib.facade import rules

        manager = rules.RuleExcerptManager()
        excerpts = manager.get_excerpts(
            categories=["security", "database"],
            max_tokens=500
        )
    """

    RuleExcerptManager = RuleExcerptManager
    RuleExcerpt = RuleExcerpt
    EXCERPT_CATEGORIES = EXCERPT_CATEGORIES
    PRIORITY_ORDER = PRIORITY_ORDER


rules = RulesNamespace()


# =============================================================================
# LAZY NAMESPACE
# =============================================================================

from .lazy_agents import (
    LazyAgentLoader,
    AgentUsageTracker,
    L2AgentInfo,
    L2_AGENTS,
    get_lazy_agent_loader,
    is_l2_agent,
)


class LazyNamespace:
    """Namespace for lazy agent loading.

    Classes:
        LazyAgentLoader: On-demand L2 specialist loading
        AgentUsageTracker: Usage pattern tracking for predictive cache
        L2AgentInfo: L2 agent metadata dataclass

    Constants:
        L2_AGENTS: Dictionary of L2 agent definitions

    Functions:
        get_lazy_agent_loader: Singleton accessor
        is_l2_agent: Check if agent is L2 specialist

    Example:
        from lib.facade import lazy

        loader = lazy.get_lazy_agent_loader()
        agent = loader.load_agent("GUI Layout Specialist L2")
        is_l2 = lazy.is_l2_agent("Coder")  # False
    """

    LazyAgentLoader = LazyAgentLoader
    AgentUsageTracker = AgentUsageTracker
    L2AgentInfo = L2AgentInfo
    L2_AGENTS = L2_AGENTS
    get_lazy_agent_loader = staticmethod(get_lazy_agent_loader)
    is_l2_agent = staticmethod(is_l2_agent)


lazy = LazyNamespace()


# =============================================================================
# PROCESS NAMESPACE
# =============================================================================

from .process_manager import (
    ProcessManager,
)

from .process_manager import ProcessInfo  # noqa: F401 - Re-exported for public API


class ProcessNamespace:
    """Namespace for process lifecycle management.

    Classes:
        ProcessManager: Centralized process spawning with cleanup
        ProcessInfo: Process metadata dataclass

    Example:
        from lib.facade import process

        pm = process.ProcessManager()
        with pm.spawn(["python", "script.py"]) as proc:
            result = proc.communicate(timeout=30)
    """

    ProcessManager = ProcessManager
    ProcessInfo = ProcessInfo


process = ProcessNamespace()


# =============================================================================
# RATE LIMITER NAMESPACE (V15.0)
# =============================================================================

from .rate_limiter import (
    AdaptiveRateLimiter,
    TokenBucket,
    MetricsWindow,
    CircuitBreaker,
    CircuitState,
    RateLimitError,
    get_rate_limiter,
    reset_rate_limiter,
    rate_limit,
    async_rate_limit,
)


class RateLimiterNamespace:
    """Namespace for adaptive rate limiting.

    Classes:
        AdaptiveRateLimiter: Main rate limiter with token bucket + circuit breaker
        TokenBucket: Token bucket algorithm implementation
        MetricsWindow: Sliding window for metrics collection
        CircuitBreaker: Circuit breaker for fault tolerance
        CircuitState: Circuit breaker states enum
        RateLimitError: Exception raised when rate limited

    Functions:
        get_rate_limiter: Singleton accessor
        reset_rate_limiter: Reset singleton (for testing)
        rate_limit: Decorator for sync functions
        async_rate_limit: Decorator for async functions

    Example:
        from lib.facade import rate_limiter

        limiter = rate_limiter.get_rate_limiter()

        # Check if request allowed
        if limiter.acquire("api"):
            process_request()
            limiter.record_outcome("api", success=True, latency_ms=50)
        else:
            retry_after = limiter.get_retry_after("api")

        # Using decorator
        @rate_limiter.rate_limit("api")
        def call_api():
            return requests.get("https://api.example.com")
    """

    AdaptiveRateLimiter = AdaptiveRateLimiter
    TokenBucket = TokenBucket
    MetricsWindow = MetricsWindow
    CircuitBreaker = CircuitBreaker
    CircuitState = CircuitState
    RateLimitError = RateLimitError
    get_rate_limiter = staticmethod(get_rate_limiter)
    reset_rate_limiter = staticmethod(reset_rate_limiter)
    rate_limit = staticmethod(rate_limit)
    async_rate_limit = staticmethod(async_rate_limit)


rate_limiter = RateLimiterNamespace()


# =============================================================================
# PUBLIC API - Direct Exports
# =============================================================================

# Core selection classes
__all__ = [
    # Selection
    "AgentPerformanceDB",
    "AgentSelector",
    "AgentMetrics",
    "ConnectionPool",
    "KeywordInvertedIndex",
    # Locks
    "FileLockManager",
    "HeartbeatManager",
    "LockInfo",
    "is_shutting_down",
    # Cache
    "PredictiveAgentCache",
    "Prediction",
    "AgentPattern",
    "PatternTier",
    "get_predictive_cache",
    # Budget
    "AdaptiveTokenBudget",
    "BudgetCache",
    "ComplexityThresholds",
    "RuleBudgetConfig",
    "TokenBudget",
    "get_budget_calculator",
    # Testing
    "ABTestingFramework",
    "RoutingStrategy",
    "Experiment",
    "ExperimentResult",
    # Tuning
    "AutoTuner",
    "AutoTunerConfig",
    "TunableParameter",
    "OptimizationResult",
    "GaussianProcessRegressor",
    # ML
    "GaussianProcessFallback",
    "get_gp_implementation",
    "has_numpy",
    # Skills
    "SkillInterface",
    "SkillResult",
    "SkillPluginLoader",
    "SkillMdWrapper",
    "create_skill_plugin",
    # Rules
    "RuleExcerptManager",
    "RuleExcerpt",
    "EXCERPT_CATEGORIES",
    "PRIORITY_ORDER",
    # Lazy
    "LazyAgentLoader",
    "AgentUsageTracker",
    "L2AgentInfo",
    "L2_AGENTS",
    "get_lazy_agent_loader",
    "is_l2_agent",
    # Process
    "ProcessManager",
    "ProcessInfo",
    # Rate Limiter (V15.0)
    "AdaptiveRateLimiter",
    "TokenBucket",
    "MetricsWindow",
    "CircuitBreaker",
    "CircuitState",
    "RateLimitError",
    "get_rate_limiter",
    "reset_rate_limiter",
    "rate_limit",
    "async_rate_limit",
    # Exceptions (V14.0.4)
    "OrchestratorError",
    "AgentError",
    "AgentNotFoundError",
    "AgentExecutionError",
    "TaskError",
    "TaskTimeoutError",
    "TaskValidationError",
    "LockError",
    "LockAcquisitionError",
    "LockTimeoutError",
    "DeadlockError",
    "DistributedLockError",
    "ConfigurationError",
    "ConfigFileNotFoundError",
    "ConfigValidationError",
    "RoutingError",
    "NoAgentFoundError",
    "RoutingTableError",
    "CacheError",
    "CacheSerializationError",
    "CacheEvictionError",
    "DatabaseError",
    "DatabaseConnectionError",
    "DatabaseQueryError",
    "wrap_exception",
    "get_exception_chain",
    # Namespaces
    "selection",
    "locks",
    "cache",
    "budget",
    "testing",
    "tuning",
    "ml",
    "skills",
    "rules",
    "lazy",
    "process",
    "rate_limiter",
    "exceptions",
    # V15.1 Namespaces
    "chaos",
    "distributed_lock",
    "routing",
    "hot_reload",
    # V15.1 Chaos
    "ChaosInjector",
    "ChaosConfig",
    "ChaosEvent",
    "FailureType",
    "get_chaos_injector",
    "configure_chaos",
    # V15.1 Distributed Lock
    "DistributedLockManager",
    "FileDistributedLockManager",
    "LockMetadata",
    "LockBackend",
    "RedisLockBackend",
    "FileLockBackend",
    "get_distributed_lock_manager",
    # V15.1 Routing
    "RoutingEngineV2",
    "RoutingMetrics",
    "LayerStats",
    "PrefixTrie",
    "InvertedIndex",
    "SemanticCache",
    "get_routing_engine_v2",
    "reset_routing_engine_v2",
    # V15.1 Hot Reload
    "PluginHotReloader",
    "HotReloadError",
    "SkillLoadError",
    "DependencyError",
    "SkillVersion",
    "HotReloadMetrics",
]

# =============================================================================
# CHAOS NAMESPACE (V15.1)
# =============================================================================

from .chaos import (
    ChaosInjector,
    ChaosConfig,
    ChaosEvent,
    FailureType,
    get_chaos_injector,
    configure_chaos,
)


class ChaosNamespace:
    """Namespace for chaos engineering.

    V15.1: Controlled failure injection for resilience testing.

    Classes:
        ChaosInjector: Singleton for chaos injection
        ChaosConfig: Configuration dataclass
        ChaosEvent: Event record dataclass
        FailureType: Enum of failure types

    Functions:
        get_chaos_injector: Singleton accessor
        configure_chaos: Configure global injector

    Example:
        from lib.facade import chaos

        injector = chaos.get_chaos_injector()
        if injector.should_inject(chaos.FailureType.NETWORK):
            raise ConnectionError("Simulated failure")

        # Context manager
        with injector.chaos_context("api_call") as ctx:
            if ctx.network_failure:
                handle_failure()
    """

    ChaosInjector = ChaosInjector
    ChaosConfig = ChaosConfig
    ChaosEvent = ChaosEvent
    FailureType = FailureType
    get_chaos_injector = staticmethod(get_chaos_injector)
    configure_chaos = staticmethod(configure_chaos)


chaos = ChaosNamespace()


# =============================================================================
# DISTRIBUTED LOCK NAMESPACE (V15.1)
# =============================================================================

from .distributed_lock import (
    DistributedLockManager,
    FileDistributedLockManager,
    LockMetadata,
    LockBackend,
    RedisLockBackend,
    FileLockBackend,
    get_distributed_lock_manager,
)


class DistributedLockNamespace:
    """Namespace for distributed locking.

    V15.1: Redis-based distributed locks with file fallback.

    Classes:
        DistributedLockManager: Main async lock manager
        FileDistributedLockManager: Sync file-based lock manager
        LockMetadata: Lock metadata dataclass
        LockBackend: Abstract backend interface
        RedisLockBackend: Redis implementation
        FileLockBackend: File-based implementation

    Functions:
        get_distributed_lock_manager: Singleton accessor

    Example:
        from lib.facade import distributed_lock

        # Async context manager
        async with distributed_lock.DistributedLockManager() as lock_mgr:
            async with lock_mgr.lock("resource", "holder", ttl=30):
                # Exclusive access
                pass

        # Sync file-based
        file_lock = distributed_lock.FileDistributedLockManager()
        if file_lock.acquire("resource", "holder"):
            try:
                # Work
                pass
            finally:
                file_lock.release("resource", "holder")
    """

    DistributedLockManager = DistributedLockManager
    FileDistributedLockManager = FileDistributedLockManager
    LockMetadata = LockMetadata
    LockBackend = LockBackend
    RedisLockBackend = RedisLockBackend
    FileLockBackend = FileLockBackend
    get_distributed_lock_manager = staticmethod(get_distributed_lock_manager)


distributed_lock = DistributedLockNamespace()


# =============================================================================
# ROUTING NAMESPACE (V15.1)
# =============================================================================

from .routing_engine import (
    RoutingEngineV2,
    RoutingMetrics,
    LayerStats,
    PrefixTrie,
    InvertedIndex,
    SemanticCache,
    get_routing_engine_v2,
    reset_routing_engine_v2,
)


class RoutingNamespace:
    """Namespace for 4-layer keyword routing.

    V15.1: Multi-layer agent routing engine.

    Classes:
        RoutingEngineV2: Main routing engine
        RoutingMetrics: Routing decision metrics
        LayerStats: Per-layer statistics
        PrefixTrie: O(k) prefix matching
        InvertedIndex: O(1) keyword lookup
        SemanticCache: Semantic cluster cache

    Functions:
        get_routing_engine_v2: Singleton accessor
        reset_routing_engine_v2: Reset singleton (for testing)

    Example:
        from lib.facade import routing

        engine = routing.get_routing_engine_v2()
        engine.build_from_routing_table({"python": "Coder", "test": "Tester"})
        agent = engine.route("write a python test")
        print(f"Selected: {agent}")

        # Get metrics
        metrics = engine.get_performance_summary()
    """

    RoutingEngineV2 = RoutingEngineV2
    RoutingMetrics = RoutingMetrics
    LayerStats = LayerStats
    PrefixTrie = PrefixTrie
    InvertedIndex = InvertedIndex
    SemanticCache = SemanticCache
    get_routing_engine_v2 = staticmethod(get_routing_engine_v2)
    reset_routing_engine_v2 = staticmethod(reset_routing_engine_v2)


routing = RoutingNamespace()


# =============================================================================
# HOT RELOAD NAMESPACE (V15.1)
# =============================================================================

from .hot_reload import (
    PluginHotReloader,
    HotReloadError,
    SkillLoadError,
    DependencyError,
    SkillVersion,
    HotReloadMetrics,
    health_check as hot_reload_health_check,
)


class HotReloadNamespace:
    """Namespace for plugin hot-reload system.

    V15.1: Automatic skill reload on file modification.

    Classes:
        PluginHotReloader: Main hot-reloader class
        HotReloadError: Base exception for hot-reload errors
        SkillLoadError: Skill loading failure exception
        DependencyError: Dependency resolution exception
        SkillVersion: Version tracking dataclass
        HotReloadMetrics: Metrics dataclass

    Functions:
        health_check: Check hot-reload system health

    Example:
        from lib.facade import hot_reload
        from pathlib import Path

        reloader = hot_reload.PluginHotReloader(Path("skills"))
        reloader.register_callback(lambda name: print(f"Reloaded: {name}"))
        reloader.start()

        # Check version
        version = reloader.get_skill_version("orchestrator")

        # Manual reload
        success = reloader.reload_skill("orchestrator")

        reloader.stop()

        # Health check
        status = hot_reload.health_check(reloader)
    """

    PluginHotReloader = PluginHotReloader
    HotReloadError = HotReloadError
    SkillLoadError = SkillLoadError
    DependencyError = DependencyError
    SkillVersion = SkillVersion
    HotReloadMetrics = HotReloadMetrics
    health_check = staticmethod(hot_reload_health_check)


hot_reload = HotReloadNamespace()


__version__ = "15.1.0"
