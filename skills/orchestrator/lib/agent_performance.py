"""Agent performance tracking for dynamic selection.

This module provides performance tracking and persistence for agent metrics,
enabling data-driven agent selection in the orchestrator V13.0.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Optional
import json
from pathlib import Path


@dataclass
class AgentMetrics:
    """Performance metrics for an agent.

    Tracks task completion statistics for ML-based agent selection.
    """
    agent_id: str
    total_tasks: int = 0
    successful_tasks: int = 0
    failed_tasks: int = 0
    avg_duration_ms: float = 0.0
    avg_tokens_used: int = 0
    success_rate: float = 0.0
    last_updated: datetime = field(default_factory=datetime.now)


class AgentPerformanceDB:
    """Database for agent performance metrics.

    Provides persistent storage and retrieval of agent performance data,
    with automatic saving to JSON file on every update.
    """

    def __init__(self, db_path: str = None):
        """Initialize the performance database.

        Args:
            db_path: Path to JSON file for persistence. Defaults to
                     ~/.claude/agent_performance.json
        """
        self.db_path = db_path or Path.home() / ".claude" / "agent_performance.json"
        self.metrics: Dict[str, AgentMetrics] = {}
        self._load()

    def _load(self):
        """Load metrics from disk."""
        if Path(self.db_path).exists():
            with open(self.db_path, encoding='utf-8') as f:
                data = json.load(f)
                for agent_id, m in data.items():
                    self.metrics[agent_id] = AgentMetrics(
                        agent_id=agent_id,
                        total_tasks=m["total_tasks"],
                        successful_tasks=m["successful_tasks"],
                        failed_tasks=m["failed_tasks"],
                        avg_duration_ms=m["avg_duration_ms"],
                        avg_tokens_used=m["avg_tokens_used"],
                        success_rate=m["success_rate"]
                    )

    def save(self):
        """Save metrics to disk."""
        data = {}
        for agent_id, m in self.metrics.items():
            data[agent_id] = {
                "total_tasks": m.total_tasks,
                "successful_tasks": m.successful_tasks,
                "failed_tasks": m.failed_tasks,
                "avg_duration_ms": m.avg_duration_ms,
                "avg_tokens_used": m.avg_tokens_used,
                "success_rate": m.success_rate
            }
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        with open(self.db_path, "w", encoding='utf-8') as f:
            json.dump(data, f, indent=2)

    def record_task(self, agent_id: str, success: bool, duration_ms: float, tokens: int):
        """Record a task completion for an agent.

        Updates running averages and success rates automatically.

        Args:
            agent_id: ID of the agent that executed the task
            success: Whether the task completed successfully
            duration_ms: Task execution time in milliseconds
            tokens: Number of tokens used
        """
        if agent_id not in self.metrics:
            self.metrics[agent_id] = AgentMetrics(agent_id=agent_id)

        m = self.metrics[agent_id]
        m.total_tasks += 1
        if success:
            m.successful_tasks += 1
        else:
            m.failed_tasks += 1

        # Update running averages
        m.avg_duration_ms = (m.avg_duration_ms * (m.total_tasks - 1) + duration_ms) / m.total_tasks
        m.avg_tokens_used = (m.avg_tokens_used * (m.total_tasks - 1) + tokens) / m.total_tasks
        m.success_rate = m.successful_tasks / m.total_tasks
        m.last_updated = datetime.now()

        self.save()

    def get_best_agent(self, candidates: list, task_type: str = None) -> str:
        """Select best agent based on success rate and recent performance.

        Uses a weighted score combining success rate (70%) and speed (30%).
        Requires minimum 3 tasks for meaningful statistics.

        Args:
            candidates: List of agent IDs to consider
            task_type: Optional task type for specialized selection

        Returns:
            Selected agent ID, or first candidate if insufficient data
        """
        if not candidates:
            return None

        # Filter to candidates with metrics
        available = {a: self.metrics.get(a) for a in candidates}
        available = {a: m for a, m in available.items() if m is not None and m.total_tasks >= 3}

        if not available:
            # Cold start: return first candidate
            return candidates[0]

        # Score: success_rate (70%) + speed (30%)
        best_agent = None
        best_score = -1

        for agent_id, m in available.items():
            # Normalize speed (lower is better, max 5000ms)
            speed_score = max(0, 1 - (m.avg_duration_ms / 5000))
            final_score = (m.success_rate * 0.7) + (speed_score * 0.3)

            if final_score > best_score:
                best_score = final_score
                best_agent = agent_id

        return best_agent or candidates[0]

    def get_metrics(self, agent_id: str) -> Optional[AgentMetrics]:
        """Get metrics for a specific agent.

        Args:
            agent_id: ID of the agent

        Returns:
            AgentMetrics or None if not found
        """
        return self.metrics.get(agent_id)

    def get_all_metrics(self) -> Dict[str, AgentMetrics]:
        """Get all tracked agent metrics.

        Returns:
            Dictionary mapping agent_id to AgentMetrics
        """
        return self.metrics.copy()
