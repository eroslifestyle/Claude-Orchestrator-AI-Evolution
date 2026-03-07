"""Agent Performance Tracking for Orchestrator V13.0.

Tracks agent metrics for ML-based routing decisions.
"""

from dataclasses import dataclass, field
from typing import Dict, Optional
import json
import sqlite3
from pathlib import Path
from datetime import datetime


@dataclass
class AgentMetrics:
    """Performance metrics for an agent."""
    agent_id: str
    total_tasks: int = 0
    successful_tasks: int = 0
    failed_tasks: int = 0
    avg_duration_ms: float = 0.0
    avg_tokens: int = 0
    success_rate: float = 0.0

    def update_success_rate(self) -> None:
        """Recalculate success rate."""
        if self.total_tasks > 0:
            self.success_rate = self.successful_tasks / self.total_tasks
        else:
            self.success_rate = 0.0


class AgentPerformanceDB:
    """Performance database for agent metrics."""

    def __init__(self, db_path: str = ":memory:"):
        """Initialize performance database.

        Args:
            db_path: Path to SQLite database, ":memory:" for in-memory.
        """
        self.db_path = db_path
        self.metrics: Dict[str, AgentMetrics] = {}
        self._init_db()

    def _init_db(self) -> None:
        """Initialize database schema."""
        if self.db_path != ":memory:":
            conn = sqlite3.connect(self.db_path)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS agent_metrics (
                    agent_id TEXT PRIMARY KEY,
                    total_tasks INTEGER DEFAULT 0,
                    successful_tasks INTEGER DEFAULT 0,
                    failed_tasks INTEGER DEFAULT 0,
                    avg_duration_ms REAL DEFAULT 0.0,
                    avg_tokens INTEGER DEFAULT 0,
                    success_rate REAL DEFAULT 0.0,
                    last_updated TEXT
                )
            """)
            conn.commit()
            conn.close()
            self._load_from_disk()

    def _load_from_disk(self) -> None:
        """Load metrics from database."""
        if self.db_path == ":memory:":
            return

        conn = sqlite3.connect(self.db_path)
        cursor = conn.execute("SELECT * FROM agent_metrics")
        for row in cursor:
            self.metrics[row[0]] = AgentMetrics(
                agent_id=row[0],
                total_tasks=row[1],
                successful_tasks=row[2],
                failed_tasks=row[3],
                avg_duration_ms=row[4],
                avg_tokens=row[5],
                success_rate=row[6]
            )
        conn.close()

    def _save_to_disk(self, agent_id: str) -> None:
        """Save metrics to database."""
        if self.db_path == ":memory:":
            return

        m = self.metrics.get(agent_id)
        if not m:
            return

        conn = sqlite3.connect(self.db_path)
        conn.execute("""
            INSERT OR REPLACE INTO agent_metrics
            (agent_id, total_tasks, successful_tasks, failed_tasks,
             avg_duration_ms, avg_tokens, success_rate, last_updated)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            m.agent_id, m.total_tasks, m.successful_tasks, m.failed_tasks,
            m.avg_duration_ms, m.avg_tokens, m.success_rate,
            datetime.now().isoformat()
        ))
        conn.commit()
        conn.close()

    def record_task(self, agent_id: str, success: bool,
                   duration_ms: float, tokens: int) -> None:
        """Record task completion for an agent.

        Args:
            agent_id: Agent identifier
            success: Whether task completed successfully
            duration_ms: Task duration in milliseconds
            tokens: Tokens consumed
        """
        if agent_id not in self.metrics:
            self.metrics[agent_id] = AgentMetrics(agent_id=agent_id)

        m = self.metrics[agent_id]
        m.total_tasks += 1

        if success:
            m.successful_tasks += 1
        else:
            m.failed_tasks += 1

        # Update averages (exponential moving average)
        alpha = 0.3  # Smoothing factor
        m.avg_duration_ms = (alpha * duration_ms +
                            (1 - alpha) * m.avg_duration_ms)
        m.avg_tokens = int(alpha * tokens + (1 - alpha) * m.avg_tokens)

        m.update_success_rate()
        self._save_to_disk(agent_id)

    def get_metrics(self, agent_id: str) -> Optional[AgentMetrics]:
        """Get metrics for an agent.

        Args:
            agent_id: Agent identifier

        Returns:
            AgentMetrics or None if not found
        """
        return self.metrics.get(agent_id)

    def get_best_agent(self, candidates: list[str]) -> Optional[str]:
        """Select best agent from candidates based on metrics.

        Scoring: success_rate * 1000 - avg_duration_ms / 100

        Args:
            candidates: List of agent IDs to consider

        Returns:
            Best agent ID or first candidate if no metrics
        """
        if not candidates:
            return None

        # Filter candidates with metrics
        scored = []
        for agent_id in candidates:
            m = self.metrics.get(agent_id)
            if m and m.total_tasks >= 3:  # Cold start threshold
                score = m.success_rate * 1000 - m.avg_duration_ms / 100
                scored.append((agent_id, score))

        if scored:
            # Return agent with highest score
            scored.sort(key=lambda x: x[1], reverse=True)
            return scored[0][0]

        # Cold start: return first candidate
        return candidates[0]

    def get_all_metrics(self) -> Dict[str, AgentMetrics]:
        """Get all agent metrics.

        Returns:
            Dictionary mapping agent_id to metrics
        """
        return self.metrics.copy()

    def reset_agent(self, agent_id: str) -> None:
        """Reset metrics for an agent.

        Args:
            agent_id: Agent identifier
        """
        if agent_id in self.metrics:
            del self.metrics[agent_id]

        if self.db_path != ":memory:":
            conn = sqlite3.connect(self.db_path)
            conn.execute("DELETE FROM agent_metrics WHERE agent_id = ?", (agent_id,))
            conn.commit()
            conn.close()
