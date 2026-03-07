"""ML-based Agent Selection for Orchestrator V13.0.

Selects agents dynamically based on task context and performance history.
"""

import re
from typing import Dict, List, Optional
from pathlib import Path
import json

from agent_performance import AgentPerformanceDB


class AgentSelector:
    """ML-enhanced agent selection based on performance and context."""

    def __init__(self, performance_db: Optional[AgentPerformanceDB] = None,
                 routing_table_path: Optional[str] = None):
        """Initialize agent selector.

        Args:
            performance_db: Performance database instance
            routing_table_path: Path to routing table JSON
        """
        self.performance_db = performance_db or AgentPerformanceDB()
        self.routing_table: Dict[str, str] = {}
        self._load_routing_table(routing_table_path)

    def _load_routing_table(self, path: Optional[str]) -> None:
        """Load routing table from file.

        Args:
            path: Path to routing table JSON
        """
        if path is None:
            # Default to orchestrator routing table
            default_path = Path.home() / ".claude/skills/orchestrator/SKILL.md"
            # Parse AGENT ROUTING TABLE section from SKILL.md
            if default_path.exists():
                self._parse_skill_md_routing(default_path)
            return

        routing_path = Path(path)
        if routing_path.exists():
            with open(routing_path) as f:
                data = json.load(f)
                self.routing_table = data.get("routing", {})

    def _parse_skill_md_routing(self, skill_md_path: Path) -> None:
        """Parse routing table from SKILL.md.

        Args:
            skill_md_path: Path to SKILL.md
        """
        with open(skill_md_path) as f:
            content = f.read()

        # Extract AGENT ROUTING TABLE section
        table_match = re.search(
            r"\| Keyword \| Agent \| Model \|.*?\n\|[-\s|]+\n((?:\|.*?\|.*?\|.*?\|\n)+)",
            content,
            re.MULTILINE
        )

        if table_match:
            for line in table_match.group(1).split("\n"):
                if line.strip() and line.startswith("|"):
                    parts = [p.strip() for p in line.split("|")[1:-1]]
                    if len(parts) >= 2:
                        keywords = parts[0]
                        agent = parts[1]
                        for kw in keywords.split(","):
                            self.routing_table[kw.strip().lower()] = agent

    def extract_keywords(self, task: str) -> List[str]:
        """Extract keywords from task description.

        Args:
            task: Task description string

        Returns:
            List of extracted keywords
        """
        # Common technical keywords
        tech_keywords = [
            "api", "gui", "ui", "database", "sql", "test", "debug",
            "security", "auth", "oauth", "python", "typescript", "go",
            "refactor", "fix", "bug", "feature", "deploy", "git",
            "mql", "trading", "mobile", "ios", "android", "web",
            "performance", "optimize", "logging", "monitoring"
        ]

        keywords_found = []
        task_lower = task.lower()

        for kw in tech_keywords:
            if kw in task_lower:
                keywords_found.append(kw)

        # Add whole words from task (filtered)
        words = re.findall(r"\b[a-z]{3,}\b", task_lower)
        keywords_found.extend([w for w in words if w not in keywords_found])

        return keywords_found[:10]  # Top 10 keywords

    def select_agent(self, task: str, candidates: Optional[List[str]] = None,
                    context: Optional[Dict] = None) -> str:
        """Select best agent for a task.

        Args:
            task: Task description
            candidates: Optional list of candidate agents
            context: Optional additional context

        Returns:
            Selected agent ID
        """
        # Extract keywords
        keywords = self.extract_keywords(task)

        # Route based on keywords
        routed_agents = set()
        for kw in keywords:
            if kw in self.routing_table:
                routed_agents.add(self.routing_table[kw])

        # Filter by candidates if provided
        if candidates:
            routed_agents = routed_agents.intersection(set(candidates))
            if not routed_agents:
                # No match, use performance-based selection
                return self.performance_db.get_best_agent(candidates) or candidates[0]

        # Use performance to select from routed agents
        if routed_agents:
            best = self.performance_db.get_best_agent(list(routed_agents))
            if best:
                return best

        # Fallback to first routed or default
        if routed_agents:
            return list(routed_agents)[0]

        # Ultimate fallback
        return candidates[0] if candidates else "Coder"

    def record_result(self, agent_id: str, success: bool,
                     duration_ms: float, tokens: int) -> None:
        """Record task result for learning.

        Args:
            agent_id: Agent that performed the task
            success: Whether task was successful
            duration_ms: Task duration
            tokens: Tokens consumed
        """
        self.performance_db.record_task(agent_id, success, duration_ms, tokens)

    def get_agent_stats(self, agent_id: str) -> Optional[Dict]:
        """Get statistics for an agent.

        Args:
            agent_id: Agent identifier

        Returns:
            Dictionary with stats or None
        """
        m = self.performance_db.get_metrics(agent_id)
        if m:
            return {
                "agent_id": m.agent_id,
                "total_tasks": m.total_tasks,
                "success_rate": m.success_rate,
                "avg_duration_ms": m.avg_duration_ms,
                "avg_tokens": m.avg_tokens
            }
        return None

    def get_ranking(self, agents: List[str]) -> List[tuple[str, float]]:
        """Rank agents by performance score.

        Args:
            agents: List of agent IDs

        Returns:
            List of (agent_id, score) tuples, sorted by score descending
        """
        ranked = []
        for agent_id in agents:
            m = self.performance_db.get_metrics(agent_id)
            if m and m.total_tasks >= 3:
                score = m.success_rate * 1000 - m.avg_duration_ms / 100
                ranked.append((agent_id, score))

        ranked.sort(key=lambda x: x[1], reverse=True)
        return ranked
