"""ML-based agent selection for orchestrator V13.0.

This module provides intelligent agent selection using historical performance
data to optimize task routing and completion rates.
"""

from .agent_performance import AgentPerformanceDB


class AgentSelector:
    """Dynamic agent selector using performance-based routing.

    Selects the best agent for each task based on historical performance
    metrics including success rate, speed, and token efficiency.
    """

    def __init__(self):
        """Initialize the agent selector with performance database."""
        self.db = AgentPerformanceDB()

    def select_agent(self, task: str, candidates: list, context: dict = None) -> str:
        """
        Select best agent for task using historical performance.

        Args:
            task: Task description
            candidates: List of agent IDs to choose from
            context: Additional context (file type, complexity, etc.)

        Returns:
            Selected agent ID

        Raises:
            ValueError: If no candidates provided
        """
        if not candidates:
            raise ValueError("No candidates provided")

        if len(candidates) == 1:
            # Single candidate: no selection needed
            return candidates[0]

        # Use performance DB to select best agent
        selected = self.db.get_best_agent(candidates, task)

        return selected

    def record_result(self, agent_id: str, success: bool, duration_ms: float, tokens: int):
        """Record task result for learning.

        Updates the performance database with task completion data,
        improving future selection accuracy.

        Args:
            agent_id: ID of the agent that executed the task
            success: Whether the task completed successfully
            duration_ms: Task execution time in milliseconds
            tokens: Number of tokens used
        """
        self.db.record_task(agent_id, success, duration_ms, tokens)

    def get_agent_metrics(self, agent_id: str):
        """Get performance metrics for an agent.

        Args:
            agent_id: ID of the agent

        Returns:
            AgentMetrics or None if not found
        """
        return self.db.get_metrics(agent_id)

    def get_all_metrics(self):
        """Get all tracked agent metrics.

        Returns:
            Dictionary mapping agent_id to AgentMetrics
        """
        return self.db.get_all_metrics()
