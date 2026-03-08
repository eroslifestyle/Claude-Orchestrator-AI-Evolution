"""Orchestrator V14.0.3 Library Modules.

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

Usage:
    # Direct import of specific classes
    from lib import AgentSelector, FileLockManager

    # Or use the unified facade with namespaces
    from lib.facade import selection, cache, tuning

    selector = selection.AgentSelector()
    pred_cache = cache.get_predictive_cache()
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
]

__version__ = "14.0.3"
