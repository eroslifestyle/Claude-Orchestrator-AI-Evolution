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
# WAVE EXECUTOR NAMESPACE (V15.1)
# =============================================================================

from .wave_executor import (
    WaveExecutor,
    Wave,
    WaveStatus,
    TaskResult,
    UltraTask,
    ResourcePool,
    BackpressureController,
    create_simple_task,
    create_dependent_task,
    get_wave_executor,
    reset_wave_executor,
    MAX_WAVE_TIMEOUT,
    MAX_CONCURRENT_PER_WAVE,
    DEFAULT_TASK_TIMEOUT,
)


class WaveExecutorNamespace:
    """Namespace for wave-based parallel task execution.

    V15.1: Execute tasks in waves by depth level.

    Classes:
        WaveExecutor: Main executor for wave-based parallel execution
        Wave: Represents a single execution wave
        WaveStatus: Wave state enum (PENDING, RUNNING, COMPLETED, FAILED, TIMEOUT)
        TaskResult: Result of a single task execution
        UltraTask: Optimized task dataclass with dependencies
        ResourcePool: Resource pool for execution
        BackpressureController: Backpressure detection and control

    Functions:
        create_simple_task: Create a task without dependencies
        create_dependent_task: Create a task with dependencies
        get_wave_executor: Singleton accessor
        reset_wave_executor: Reset singleton (for testing)

    Constants:
        MAX_WAVE_TIMEOUT: Maximum timeout per wave (300s)
        MAX_CONCURRENT_PER_WAVE: Maximum concurrent tasks per wave (500)
        DEFAULT_TASK_TIMEOUT: Default timeout per task (60s)

    Example:
        from lib.facade import wave_executor

        # Create executor
        executor = wave_executor.WaveExecutor()

        # Create tasks
        tasks = [
            wave_executor.create_simple_task("t1", "Task 1", handler),
            wave_executor.create_dependent_task("t2", "Task 2", handler, {"t1"}),
        ]

        # Execute tree
        results = await executor.execute_tree(tasks)
        for task_id, result in results.items():
            print(f"{task_id}: {'OK' if result.success else 'FAIL'}")

        # Get summary
        summary = executor.get_summary()
        print(f"Success rate: {summary['success_rate']:.2%}")
    """

    WaveExecutor = WaveExecutor
    Wave = Wave
    WaveStatus = WaveStatus
    TaskResult = TaskResult
    UltraTask = UltraTask
    ResourcePool = ResourcePool
    BackpressureController = BackpressureController
    create_simple_task = staticmethod(create_simple_task)
    create_dependent_task = staticmethod(create_dependent_task)
    get_wave_executor = staticmethod(get_wave_executor)
    reset_wave_executor = staticmethod(reset_wave_executor)
    MAX_WAVE_TIMEOUT = MAX_WAVE_TIMEOUT
    MAX_CONCURRENT_PER_WAVE = MAX_CONCURRENT_PER_WAVE
    DEFAULT_TASK_TIMEOUT = DEFAULT_TASK_TIMEOUT


wave_executor = WaveExecutorNamespace()


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
    # V15.1 Wave Executor
    "WaveExecutor",
    "Wave",
    "WaveStatus",
    "TaskResult",
    "UltraTask",
    "ResourcePool",
    "BackpressureController",
    "create_simple_task",
    "create_dependent_task",
    "get_wave_executor",
    "reset_wave_executor",
    "wave_executor",
    # V15.2 Backpressure
    "BackpressureController",
    "ThrottleState",
    "CircuitState",
    "SystemMetrics",
    "BackpressureConfig",
    "THRESHOLDS",
    "RECOVERY_DELAYS",
    "ADAPTIVE_FACTORS",
    "get_backpressure_controller",
    "reset_backpressure_controller",
    "backpressure",
    # V15.2 Escalation
    "EscalationLevel",
    "EscalationAction",
    "FailureRecord",
    "EscalationConfig",
    "TaskFailureTracker",
    "EscalationManager",
    "get_escalation_manager",
    "reset_escalation_manager",
    "escalation",
    # V16.0 Claude Tool Core
    "OrchestratorClaudeCore",
    "ClaudeToolRegistry",
    "ClaudeContainerManager",
    "ProgrammaticToolExecutor",
    "FineGrainedStreaming",
    "ClaudeToolConfig",
    "ToolReference",
    "ToolSearchResult",
    "ContainerContext",
    "ProgrammaticCode",
    "ToolSearchVariant",
    "ToolCaller",
    "ToolExecutionMode",
    "create_programmatic_tool",
    "create_standard_tool",
    "create_streaming_tool",
    "CODE_EXECUTION_TYPE",
    "TOOL_SEARCH_REGEX_TYPE",
    "TOOL_SEARCH_BM25_TYPE",
    "MAX_TOOLS_CATALOG",
    "MAX_SEARCH_RESULTS",
    "MAX_PATTERN_LENGTH",
    "DEFAULT_CONTAINER_TTL",
    "claude_core",
    # V17 - Claude Tool Calling Core
    "v17",
    "ClaudeToolRegistry",
    "ToolDefinition",
    "ToolCategory",
    "ToolPriority",
    "ToolDiscoveryEngine",
    "DiscoveryLayer",
    "DiscoveryResult",
    "MatchType",
    "HybridResilienceHandler",
    "ResilienceConfig",
    "CircuitState",
    "CircuitBreaker",
    "ResilienceResult",
    "WarmCacheManager",
    "CacheLayer",
    "CacheEntry",
    "CacheStats",
    "FineGrainedStreamer",
    "StreamConfig",
    "StreamChunk",
    "StreamState",
    "StreamingMode",
    "StreamedToolCall",
    "HierarchicalBudgetManager",
    "BudgetTier",
    "BudgetAllocation",
    "BudgetUsage",
    "BudgetConfig",
    "ProgrammaticToolExecutor",
    "ExecutionResult",
    "ToolRequest",
    "ExecutionStatus",
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

# =============================================================================
# ESCALATION NAMESPACE (V15.2)
# =============================================================================

from .escalation import (
    EscalationLevel,
    EscalationAction,
    FailureRecord,
    EscalationConfig,
    TaskFailureTracker,
    EscalationManager,
    get_escalation_manager,
    reset_escalation_manager,
)


class EscalationNamespace:
    """Namespace per auto-escalation dei modelli.

    V15.2: Escalation automatica basata su fallimenti consecutivi.

    Classi:
        EscalationLevel: Gerarchia modelli (HAIKU, SONNET, OPUS)
        EscalationAction: Azioni dopo fallimento (NONE, ESCALATE, MAX_REACHED)
        FailureRecord: Record fallimenti per task
        EscalationConfig: Configurazione escalation
        TaskFailureTracker: Tracker thread-safe per fallimenti
        EscalationManager: Manager principale per escalation

    Funzioni:
        get_escalation_manager: Accesso singleton
        reset_escalation_manager: Reset singleton (per testing)

    Example:
        from lib.facade import escalation

        manager = escalation.get_escalation_manager()

        # Registra fallimento
        action = manager.record_failure("task_1", "agent_coder")
        if action == escalation.EscalationAction.ESCALATE:
            new_model = manager.get_escalated_model(
                escalation.EscalationLevel.HAIKU
            )
            print(f"Escalating to: {new_model.value}")

        # Registra successo (reset counter)
        manager.record_success("task_1")

        # Ottieni metriche
        metrics = manager.get_metrics()
    """

    EscalationLevel = EscalationLevel
    EscalationAction = EscalationAction
    FailureRecord = FailureRecord
    EscalationConfig = EscalationConfig
    TaskFailureTracker = TaskFailureTracker
    EscalationManager = EscalationManager
    get_escalation_manager = staticmethod(get_escalation_manager)
    reset_escalation_manager = staticmethod(reset_escalation_manager)


escalation = EscalationNamespace()


# =============================================================================
# BACKPRESSURE NAMESPACE (V15.2)
# =============================================================================

from .backpressure import (
    BackpressureController,
    ThrottleState,
    CircuitState,
    SystemMetrics,
    BackpressureConfig,
    THRESHOLDS,
    RECOVERY_DELAYS,
    ADAPTIVE_FACTORS,
    get_backpressure_controller,
    reset_backpressure_controller,
)


class BackpressureNamespace:
    """Namespace per controllo del sovraccarico di sistema.

    V15.2: Rileva sovraccarico e applica throttling automatico.

    Classi:
        BackpressureController: Controller principale per backpressure
        ThrottleState: Stati di throttling (NORMAL, CAUTION, WARNING, CRITICAL, EMERGENCY)
        CircuitState: Stati del circuit breaker (CLOSED, OPEN, HALF_OPEN)
        SystemMetrics: Metriche di sistema
        BackpressureConfig: Configurazione del controller

    Costanti:
        THRESHOLDS: Soglie per transizione di stato
        RECOVERY_DELAYS: Delay di recovery per stato
        ADAPTIVE_FACTORS: Fattori adattivi per throttling

    Funzioni:
        get_backpressure_controller: Accesso singleton
        reset_backpressure_controller: Reset singleton (per testing)

    Example:
        from lib.facade import backpressure

        controller = backpressure.get_backpressure_controller()

        # Controlla stato
        delay = controller.check_and_throttle()
        if delay > 0:
            time.sleep(delay)

        # Registra esiti
        try:
            result = call_api()
            controller.record_success()
        except Exception:
            controller.record_error()

        # Verifica se accettare task
        if controller.should_accept_new_task():
            process_task()

        # Context manager per task
        with controller.task_context() as accepted:
            if accepted:
                execute_task()
    """

    BackpressureController = BackpressureController
    ThrottleState = ThrottleState
    CircuitState = CircuitState
    SystemMetrics = SystemMetrics
    BackpressureConfig = BackpressureConfig
    THRESHOLDS = THRESHOLDS
    RECOVERY_DELAYS = RECOVERY_DELAYS
    ADAPTIVE_FACTORS = ADAPTIVE_FACTORS
    get_backpressure_controller = staticmethod(get_backpressure_controller)
    reset_backpressure_controller = staticmethod(reset_backpressure_controller)


backpressure = BackpressureNamespace()


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


# =============================================================================
# CLAUDE TOOL CORE NAMESPACE (V16.0)
# =============================================================================

from .claude_tool_core import (
    # Core classes
    OrchestratorClaudeCore,
    ClaudeToolRegistry,
    ClaudeContainerManager,
    ProgrammaticToolExecutor,
    FineGrainedStreaming,

    # Data classes
    ClaudeToolConfig,
    ToolReference,
    ToolSearchResult,
    ContainerContext,
    ProgrammaticCode,

    # Enums
    ToolSearchVariant,
    ToolCaller,
    ToolExecutionMode,

    # Convenience functions
    create_programmatic_tool,
    create_standard_tool,
    create_streaming_tool,

    # Constants
    CODE_EXECUTION_TYPE,
    TOOL_SEARCH_REGEX_TYPE,
    TOOL_SEARCH_BM25_TYPE,
    MAX_TOOLS_CATALOG,
    MAX_SEARCH_RESULTS,
    MAX_PATTERN_LENGTH,
    DEFAULT_CONTAINER_TTL,
)


class ClaudeToolCoreNamespace:
    """Namespace per Claude Tool Calling - IL CUORE dell'orchestrator V16.

    V16.0: 3 componenti Claude come core del sistema:
    1. Programmatic Tool Calling - Esecuzione tool in container sandboxed
    2. Tool Search Tool - Ricerca dinamica tool con defer_loading
    3. Fine-Grained Tool Streaming - Streaming parametri senza buffering

    Reference:
    - https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling
    - https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool
    - https://platform.claude.com/docs/en/agents-and-tools/tool-use/fine-grained-tool-streaming

    Classi Core:
        OrchestratorClaudeCore: Punto di integrazione principale
        ClaudeToolRegistry: Registry per 10,000+ tool con ricerca BM25/regex
        ClaudeContainerManager: Gestione container sandboxed
        ProgrammaticToolExecutor: Esecuzione tool in modalità programmatica
        FineGrainedStreaming: Streaming parametri tool

    Data Classes:
        ClaudeToolConfig: Configurazione tool con allowed_callers
        ToolReference: Riferimento a tool scoperto tramite search
        ToolSearchResult: Risultato ricerca tool
        ContainerContext: Contesto container sandboxed

    Enum:
        ToolSearchVariant: REGEX o BM25
        ToolCaller: DIRECT o CODE_EXECUTION
        ToolExecutionMode: STANDARD, PROGRAMMATIC, STREAMING

    Funzioni Convenience:
        create_programmatic_tool: Crea tool per code_execution
        create_standard_tool: Crea tool standard
        create_streaming_tool: Crea tool con streaming

    Costanti:
        CODE_EXECUTION_TYPE: "code_execution_20260120"
        TOOL_SEARCH_REGEX_TYPE: "tool_search_tool_regex_20251119"
        TOOL_SEARCH_BM25_TYPE: "tool_search_tool_bm25_20251119"
        MAX_TOOLS_CATALOG: 10000
        MAX_SEARCH_RESULTS: 5
        MAX_PATTERN_LENGTH: 200
        DEFAULT_CONTAINER_TTL: 270

    Example:
        from lib.facade import claude_core

        # Inizializza core
        core = claude_core.OrchestratorClaudeCore()
        await core.initialize()

        # Registra tool
        tool = claude_core.create_programmatic_tool(
            name="query_database",
            description="Execute SQL query",
            input_schema={"type": "object", "properties": {"sql": {"type": "string"}}}
        )
        core.register_tool(tool)

        # Cerca tool
        results = core.search_tools("database query")

        # Esegui in modalità programmatica
        result = await core.execute_programmatic([
            {"name": "query_database", "input": {"sql": "SELECT 1"}}
        ])

        # Ottieni tools per Claude API
        tools = core.get_tools_for_claude()
    """

    # Core classes
    OrchestratorClaudeCore = OrchestratorClaudeCore
    ClaudeToolRegistry = ClaudeToolRegistry
    ClaudeContainerManager = ClaudeContainerManager
    ProgrammaticToolExecutor = ProgrammaticToolExecutor
    FineGrainedStreaming = FineGrainedStreaming

    # Data classes
    ClaudeToolConfig = ClaudeToolConfig
    ToolReference = ToolReference
    ToolSearchResult = ToolSearchResult
    ContainerContext = ContainerContext
    ProgrammaticCode = ProgrammaticCode

    # Enums
    ToolSearchVariant = ToolSearchVariant
    ToolCaller = ToolCaller
    ToolExecutionMode = ToolExecutionMode

    # Convenience functions
    create_programmatic_tool = staticmethod(create_programmatic_tool)
    create_standard_tool = staticmethod(create_standard_tool)
    create_streaming_tool = staticmethod(create_streaming_tool)

    # Constants
    CODE_EXECUTION_TYPE = CODE_EXECUTION_TYPE
    TOOL_SEARCH_REGEX_TYPE = TOOL_SEARCH_REGEX_TYPE
    TOOL_SEARCH_BM25_TYPE = TOOL_SEARCH_BM25_TYPE
    MAX_TOOLS_CATALOG = MAX_TOOLS_CATALOG
    MAX_SEARCH_RESULTS = MAX_SEARCH_RESULTS
    MAX_PATTERN_LENGTH = MAX_PATTERN_LENGTH
    DEFAULT_CONTAINER_TTL = DEFAULT_CONTAINER_TTL


claude_core = ClaudeToolCoreNamespace()


# =============================================================================
# V17 NAMESPACE - CLAUDE TOOL CALLING CORE
# =============================================================================

from lib.v17 import (
    # Registry
    ClaudeToolRegistry,
    ToolDefinition,
    # Discovery
    ToolDiscoveryEngine,
    DiscoveryLayer,
    # Resilience
    HybridResilienceHandler,
    ResilienceConfig,
    # Cache
    WarmCacheManager,
    CacheLayer,
    # Streaming
    FineGrainedStreamer,
    StreamConfig,
    StreamChunk,
    StreamState,
    StreamingMode,
    StreamedToolCall,
    # Budget
    HierarchicalBudgetManager,
    BudgetTier,
    # Executor
    ProgrammaticToolExecutor,
    ExecutionResult,
)

# Import additional V17 types that need direct import
from lib.v17.claude_tool_registry import ToolCategory, ToolPriority
from lib.v17.tool_discovery import DiscoveryResult, MatchType
from lib.v17.resilience import CircuitState, CircuitBreaker, ResilienceResult
from lib.v17.cache import CacheEntry, CacheStats
from lib.v17.budget import BudgetAllocation, BudgetUsage
from lib.v17.executor import ToolRequest, ExecutionStatus


class V17Namespace:
    """Namespace per V17 - Claude Tool Calling Core.

    V17 introduce le nuove Claude Tool Calling capabilities:
    - 10,000+ tools con ricerca O(1)
    - 4-layer tool discovery
    - Hybrid resilience (circuit breaker + retry + fallback)
    - Warm cache L1+L2 per tools frequenti
    - Fine-grained streaming
    - Hierarchical budget management
    - Programmatic tool execution

    Usage:
        from lib.facade import v17

        # Registry
        registry = v17.ClaudeToolRegistry()
        await registry.initialize()

        # Discovery
        engine = v17.ToolDiscoveryEngine()
        result = await engine.discover("query_api")

        # Resilience
        handler = v17.HybridResilienceHandler()
        result = await handler.execute_with_resilience(
            tool_name="query_api",
            operation=my_operation,
        )

        # Cache
        cache = v17.WarmCacheManager()
        await cache.warm(["tool1", "tool2"])

        # Streaming
        streamer = v17.FineGrainedStreamer()
        async for chunk in streamer.stream_tool_call(tool, params):
            print(chunk)

        # Budget
        budget = v17.HierarchicalBudgetManager()
        budget.allocate("agent1", v17.BudgetTier.CORE, 100000)

        # Executor
        executor = v17.ProgrammaticToolExecutor()
        results = await executor.execute_batch([
            {"name": "tool1", "input": {...}},
            {"name": "tool2", "input": {...}},
        ])
    """

    # Registry
    ClaudeToolRegistry = ClaudeToolRegistry
    ToolDefinition = ToolDefinition
    ToolCategory = ToolCategory
    ToolPriority = ToolPriority

    # Discovery
    ToolDiscoveryEngine = ToolDiscoveryEngine
    DiscoveryLayer = DiscoveryLayer
    DiscoveryResult = DiscoveryResult
    MatchType = MatchType

    # Resilience
    HybridResilienceHandler = HybridResilienceHandler
    ResilienceConfig = ResilienceConfig
    CircuitState = CircuitState
    CircuitBreaker = CircuitBreaker
    ResilienceResult = ResilienceResult

    # Cache
    WarmCacheManager = WarmCacheManager
    CacheLayer = CacheLayer
    CacheEntry = CacheEntry
    CacheStats = CacheStats

    # Streaming
    FineGrainedStreamer = FineGrainedStreamer
    StreamConfig = StreamConfig
    StreamChunk = StreamChunk
    StreamState = StreamState
    StreamingMode = StreamingMode
    StreamedToolCall = StreamedToolCall

    # Budget
    HierarchicalBudgetManager = HierarchicalBudgetManager
    BudgetTier = BudgetTier
    BudgetAllocation = BudgetAllocation
    BudgetUsage = BudgetUsage

    # Executor
    ProgrammaticToolExecutor = ProgrammaticToolExecutor
    ExecutionResult = ExecutionResult
    ToolRequest = ToolRequest
    ExecutionStatus = ExecutionStatus


v17 = V17Namespace()


__version__ = "17.0.0"
