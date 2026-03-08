"""Unified Facade for Orchestrator V14.0.4 Lib Modules.

This module provides a single entry point for all lib functionality,
organizing 14 modules into logical namespaces for easier consumption.

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
    - exceptions: Custom exception hierarchy (V14.0.4)

Usage:
    from lib.facade import selection, cache, tuning, exceptions

    # Use selection namespace
    selector = selection.AgentSelector()
    best_agent = selector.select_agent(task, candidates)

    # Use cache namespace
    pred_cache = cache.get_predictive_cache()
    predictions = pred_cache.predict_next_agents(task, context)

    # Use exceptions (V14.0.4)
    from lib.facade import OrchestratorError, AgentError, LockError

    # Direct imports also work
    from lib.facade import AgentSelector, PredictiveAgentCache
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
]

__version__ = "15.0.1"
