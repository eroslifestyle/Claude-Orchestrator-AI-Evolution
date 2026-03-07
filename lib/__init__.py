"""Orchestrator V13.0 Library Modules.

This package contains core modules for the orchestrator system:
- agent_performance: Performance tracking for ML-based routing
- agent_selector: Dynamic agent selection
- file_locks: Thread-safe file locking with reentrant support
- skill_interface: Abstract base class for skills
- skill_plugin: Dynamic skill loading with hot-reload
- process_manager: Centralized process management
"""

from .agent_performance import AgentPerformanceDB, AgentMetrics
from .agent_selector import AgentSelector
from .file_locks import FileLockManager
from .skill_interface import SkillInterface, SkillResult
from .skill_plugin import SkillPluginLoader, create_skill_plugin
from .process_manager import ProcessManager

__all__ = [
    "AgentPerformanceDB",
    "AgentMetrics",
    "AgentSelector",
    "FileLockManager",
    "SkillInterface",
    "SkillResult",
    "SkillPluginLoader",
    "create_skill_plugin",
    "ProcessManager",
]

__version__ = "13.0.0"
