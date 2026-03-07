-- Migration V13.1: Add score index for agent selection performance
-- Target: 20-40% query performance improvement

-- Index for get_best_agent() query
-- Score formula: success_rate * 1000 - avg_duration_ms / 100
CREATE INDEX IF NOT EXISTS idx_agent_metrics_score
ON agent_metrics(
    (success_rate * 1000 - avg_duration_ms / 100) DESC
);

-- Index for task_type lookups (common filter)
CREATE INDEX IF NOT EXISTS idx_agent_metrics_task_type
ON agent_metrics(task_type);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_agent_metrics_task_score
ON agent_metrics(task_type, success_rate DESC, avg_duration_ms ASC);
