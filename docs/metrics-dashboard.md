# Claude Code Metrics Dashboard

> Performance Monitoring & Observability Dashboard Template
> Version: 1.0.0 | Created: 2026-02-26

---

## Overview

This document provides templates and guidelines for visualizing Claude Code
operational metrics collected through the observability hooks system.

---

## Dashboard Layout

```
+------------------------------------------------------------------+
|                    CLAUDE CODE METRICS DASHBOARD                  |
+------------------------------------------------------------------+
|  [Session Count]  [Task Success Rate]  [Avg Duration]  [Errors]  |
+------------------------------------------------------------------+
|                                                                   |
|  +------------------------+  +------------------------+           |
|  |    Agent Usage Pie     |  |   Tool Usage Bar       |           |
|  |                        |  |                        |           |
|  +------------------------+  +------------------------+           |
|                                                                   |
|  +----------------------------------------------------------+    |
|  |                  Task Duration Timeline                   |    |
|  |  [========================_________________________]      |    |
|  +----------------------------------------------------------+    |
|                                                                   |
|  +------------------------+  +------------------------+           |
|  |   Token Consumption    |  |   Error Distribution   |           |
|  |                        |  |                        |           |
|  +------------------------+  +------------------------+           |
|                                                                   |
+------------------------------------------------------------------+
```

---

## Key Metrics Cards

### 1. Session Overview

```json
{
  "title": "Sessions",
  "metrics": {
    "total": "count(session_start)",
    "active": "count(session_end == null)",
    "avg_duration": "avg(duration_total_ms)"
  },
  "sparkline": "sessions_over_time",
  "color": "#4CAF50"
}
```

### 2. Task Performance

```json
{
  "title": "Tasks",
  "metrics": {
    "completed": "count(task_complete AND success=true)",
    "failed": "count(task_complete AND success=false)",
    "success_rate": "completed / (completed + failed)"
  },
  "trend": "success_rate_7d",
  "color": "#2196F3"
}
```

### 3. Token Usage

```json
{
  "title": "Tokens",
  "metrics": {
    "total": "sum(tokens_used)",
    "per_session": "avg(tokens_total)",
    "per_task": "avg(task.tokens_used)"
  },
  "budget": {
    "daily_limit": 500000,
    "used_percentage": "total / daily_limit * 100"
  },
  "color": "#FF9800"
}
```

### 4. Error Rate

```json
{
  "title": "Errors",
  "metrics": {
    "total": "count(success=false)",
    "rate": "errors / total_events",
    "top_error": "mode(error_type)"
  },
  "alert_threshold": 0.05,
  "color": "#F44336"
}
```

---

## Visualization Components

### Agent Usage Pie Chart

```
Data Source: metrics.jsonl
Query:
  SELECT agent, COUNT(*) as count
  FROM events
  WHERE event IN ('tool_invoke', 'task_complete')
  GROUP BY agent
  ORDER BY count DESC

Chart Type: Donut
Colors:
  - Orchestrator: #9C27B0
  - Coder: #2196F3
  - Reviewer: #4CAF50
  - Architect: #FF9800
  - Others: #607D8B
```

### Tool Usage Bar Chart

```
Data Source: metrics.jsonl
Query:
  SELECT tool, COUNT(*) as invocations,
         AVG(duration_ms) as avg_duration
  FROM events
  WHERE event = 'tool_complete'
  GROUP BY tool
  ORDER BY invocations DESC
  LIMIT 10

Chart Type: Horizontal Bar
X-Axis: Invocations
Y-Axis: Tool Name
Color Scale: Duration (green=fast, red=slow)
```

### Task Duration Timeline

```
Data Source: metrics.jsonl
Query:
  SELECT
    timestamp,
    task_id,
    agent,
    duration_ms
  FROM events
  WHERE event = 'task_complete'
  ORDER BY timestamp

Chart Type: Timeline / Gantt
X-Axis: Time
Y-Axis: Tasks (grouped by agent)
Bar Length: Duration
Color: Success (green) / Failure (red)
```

### Token Consumption Trend

```
Data Source: metrics.jsonl
Query:
  SELECT
    DATE_TRUNC('hour', timestamp) as hour,
    SUM(tokens_used) as tokens
  FROM events
  WHERE tokens_used IS NOT NULL
  GROUP BY hour
  ORDER BY hour

Chart Type: Area Chart
X-Axis: Time (hourly)
Y-Axis: Cumulative Tokens
Fill: Gradient blue
```

### Error Distribution

```
Data Source: metrics.jsonl
Query:
  SELECT
    error_type,
    COUNT(*) as count
  FROM events
  WHERE success = false
  GROUP BY error_type
  ORDER BY count DESC

Chart Type: Treemap or Bar
Size/Height: Error Count
Color: Error Severity
```

---

## Alert Rules

### High Error Rate

```yaml
name: high_error_rate
condition: error_rate > 0.10
window: 1h
severity: warning
message: "Error rate is {{error_rate}}% in the last hour"
action: notify
```

### Task Duration Spike

```yaml
name: task_duration_spike
condition: avg_duration > baseline * 2
window: 30m
severity: warning
message: "Task duration increased to {{avg_duration}}ms"
action: notify
```

### Token Budget Alert

```yaml
name: token_budget_warning
condition: daily_tokens > 400000
severity: warning
message: "Token usage at {{percentage}}% of daily budget"
action: notify

name: token_budget_critical
condition: daily_tokens > 475000
severity: critical
message: "Token budget nearly exhausted"
action: notify + throttle
```

### Agent Failure Pattern

```yaml
name: agent_failure_pattern
condition: agent_failure_count > 3 AND time_window < 10m
severity: warning
message: "Agent {{agent}} has failed {{count}} times recently"
action: notify + investigate
```

---

## Grafana Dashboard JSON

```json
{
  "dashboard": {
    "title": "Claude Code Observability",
    "uid": "claude-code-metrics",
    "panels": [
      {
        "title": "Session Count",
        "type": "stat",
        "datasource": "ClaudeMetrics",
        "targets": [
          {
            "expr": "count(claude_session_start)",
            "legendFormat": "Sessions"
          }
        ],
        "options": {
          "colorMode": "value",
          "graphMode": "area"
        }
      },
      {
        "title": "Task Success Rate",
        "type": "gauge",
        "datasource": "ClaudeMetrics",
        "targets": [
          {
            "expr": "claude_task_success_rate",
            "legendFormat": "Success %"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "max": 100,
            "min": 0,
            "unit": "percent",
            "thresholds": {
              "mode": "absolute",
              "steps": [
                {"color": "red", "value": 0},
                {"color": "yellow", "value": 80},
                {"color": "green", "value": 95}
              ]
            }
          }
        }
      },
      {
        "title": "Agent Distribution",
        "type": "piechart",
        "datasource": "ClaudeMetrics",
        "targets": [
          {
            "expr": "sum by (agent) (claude_agent_invocations)",
            "legendFormat": "{{agent}}"
          }
        ]
      },
      {
        "title": "Task Duration Over Time",
        "type": "timeseries",
        "datasource": "ClaudeMetrics",
        "targets": [
          {
            "expr": "avg_over_time(claude_task_duration_ms[5m])",
            "legendFormat": "Avg Duration"
          }
        ]
      }
    ]
  }
}
```

---

## Command-Line Dashboard

Quick text-based dashboard using the collect-metrics.sh script:

```bash
# Daily summary
./collect-metrics.sh report daily

# Real-time tail
tail -f ~/.claude/logs/metrics.jsonl | jq -c '{
  time: .timestamp,
  event: .event,
  agent: .agent,
  success: .success
}'

# Live stats refresh
watch -n 5 './collect-metrics.sh report daily'
```

### Sample Output

```
=== Claude Code Metrics Report ===
Period: daily
Generated: Thu Feb 26 2026 14:30:00 UTC

--- Session Summary ---
Total Sessions: 12

--- Task Summary ---
Completed: 47
Failed: 3

--- Top Agents ---
  156 "agent":"Coder"
   89 "agent":"Orchestrator"
   34 "agent":"Reviewer"
   12 "agent":"Architect"
    5 "agent":"Documenter"

--- Top Tools ---
  234 "tool":"Read"
  189 "tool":"Edit"
  145 "tool":"Bash"
   67 "tool":"Grep"
   23 "tool":"Task"

--- Error Types ---
    2 "error_type":"TIMEOUT"
    1 "error_type":"VALIDATION"
```

---

## Integration with Monitoring Systems

### Prometheus Exporter

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'claude-code'
    static_configs:
      - targets: ['localhost:9090']
    metrics_path: /metrics
```

### Loki Log Aggregation

```yaml
# loki-config.yml
clients:
  - url: http://localhost:3100/loki/api/v1/push

scrape_configs:
  - job_name: claude-metrics
    static_configs:
      - targets:
          - localhost
        labels:
          job: claude-code
          __path__: /root/.claude/logs/metrics.jsonl
```

---

## Best Practices

1. **Retention**: Keep raw metrics for 7 days, aggregated for 30 days
2. **Sampling**: For high-volume sessions, sample 1 in 10 tool_invoke events
3. **Privacy**: Hash file paths and parameter values before logging
4. **Performance**: Use async writes to avoid blocking operations
5. **Alerting**: Set up escalation paths for critical alerts

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-26 | Initial dashboard template |
