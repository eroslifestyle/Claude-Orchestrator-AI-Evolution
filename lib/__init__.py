"""Orchestrator V15.1 Library Modules.

This package contains core modules for the orchestrator system:
- agent_performance: Performance tracking for ML-based routing
- agent_selector: Dynamic agent selection
- file_locks: Thread-safe file locking with reentrant support
- skill_interface: Abstract base class for skills
- skill_plugin: Dynamic skill loading with hot-reload
- process_manager: Centralized process management
- gp_fallback: Pure Python Gaussian Process for environments without NumPy
- predictive_cache: Predictive agent caching
- adaptive_budget: Adaptive token budget system
- ab_testing: A/B testing framework
- auto_tuner: Bayesian parameter optimization
- rule_excerpts: Pre-computed rule excerpts
- lazy_agents: Lazy L2 specialist loading
- rate_limiter: Adaptive rate limiting with circuit breaker
- chaos: Chaos engineering for resilience testing (V15.1)
- distributed_lock: Redis-based distributed locking (V15.1)
- routing_engine: 4-layer keyword routing (V15.1)
- hot_reload: Plugin hot-reload system (V15.1)
- exceptions: Custom exception hierarchy (V14.0.4)

Usage:
    # Direct import of specific classes
    from lib import AgentSelector, FileLockManager

    # Or use the unified facade with namespaces
    from lib.facade import selection, cache, tuning, chaos, routing

    selector = selection.AgentSelector()
    pred_cache = cache.get_predictive_cache()

    # V15.1: Chaos engineering
    injector = chaos.get_chaos_injector()
    if injector.should_inject(chaos.FailureType.NETWORK):
        raise ConnectionError("Simulated")

    # V15.1: Routing
    engine = routing.get_routing_engine_v2()
    agent = engine.route("write a python test")
"""

# Import unified facade for namespace access
from .facade import (
    # Namespaces
    selection,
    locks,
    cache,
    budget,
    testing,
    tuning,
    ml,
    skills,
    rules,
    lazy,
    process,
    rate_limiter,
    exceptions,
    # V15.1 Namespaces
    chaos,
    distributed_lock,
    routing,
    hot_reload,
    # Core classes (backward compatibility)
    AgentPerformanceDB,
    AgentMetrics,
    AgentSelector,
    FileLockManager,
    SkillInterface,
    SkillResult,
    SkillPluginLoader,
    create_skill_plugin,
    ProcessManager,
    GaussianProcessFallback,
    get_gp_implementation,
    has_numpy,
    # AI-Native V14.0 classes
    PredictiveAgentCache,
    get_predictive_cache,
    AdaptiveTokenBudget,
    get_budget_calculator,
    ABTestingFramework,
    RoutingStrategy,
    AutoTuner,
    RuleExcerptManager,
    LazyAgentLoader,
    get_lazy_agent_loader,
    # V15.0 Rate Limiter
    AdaptiveRateLimiter,
    TokenBucket,
    CircuitBreaker,
    CircuitState,
    RateLimitError,
    get_rate_limiter,
    reset_rate_limiter,
    rate_limit,
    async_rate_limit,
    # V15.1 Chaos Engineering
    ChaosInjector,
    ChaosConfig,
    ChaosEvent,
    FailureType,
    get_chaos_injector,
    configure_chaos,
    # V15.1 Distributed Lock
    DistributedLockManager,
    FileDistributedLockManager,
    LockMetadata,
    get_distributed_lock_manager,
    # V15.1 Routing
    RoutingEngineV2,
    RoutingMetrics,
    LayerStats,
    get_routing_engine_v2,
    reset_routing_engine_v2,
    # V15.1 Hot Reload
    PluginHotReloader,
    HotReloadError,
    SkillLoadError,
    DependencyError,
    SkillVersion,
)

__all__ = [
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
    # Core classes
    "AgentPerformanceDB",
    "AgentMetrics",
    "AgentSelector",
    "FileLockManager",
    "SkillInterface",
    "SkillResult",
    "SkillPluginLoader",
    "create_skill_plugin",
    "ProcessManager",
    "GaussianProcessFallback",
    "get_gp_implementation",
    "has_numpy",
    # AI-Native V14.0
    "PredictiveAgentCache",
    "get_predictive_cache",
    "AdaptiveTokenBudget",
    "get_budget_calculator",
    "ABTestingFramework",
    "RoutingStrategy",
    "AutoTuner",
    "RuleExcerptManager",
    "LazyAgentLoader",
    "get_lazy_agent_loader",
    # V15.0 Rate Limiter
    "AdaptiveRateLimiter",
    "TokenBucket",
    "CircuitBreaker",
    "CircuitState",
    "RateLimitError",
    "get_rate_limiter",
    "reset_rate_limiter",
    "rate_limit",
    "async_rate_limit",
    # V15.1 Chaos Engineering
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
    "get_distributed_lock_manager",
    # V15.1 Routing
    "RoutingEngineV2",
    "RoutingMetrics",
    "LayerStats",
    "get_routing_engine_v2",
    "reset_routing_engine_v2",
    # V15.1 Hot Reload
    "PluginHotReloader",
    "HotReloadError",
    "SkillLoadError",
    "DependencyError",
    "SkillVersion",
]

__version__ = "15.1.0"
