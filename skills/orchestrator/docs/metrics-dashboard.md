# Claude Code Metrics Dashboard

> Performance monitoring template v1.0.0 | Created: 2026-02-26

---

## Dashboard Structure

The dashboard displays key metric cards including session overview, task performance, token usage, and error rates. The layout incorporates visualization components such as an agent usage pie chart, tool usage bar chart, task duration timeline, token consumption trend, and error distribution treemap.

---

## Core Metrics

Key performance indicators tracked include:
- Session counts and average duration
- Task success rates and completion status
- Token consumption against daily budgets
- Error frequencies and types

---

## Alert Configuration

The system implements four primary alert rules:

1. **High error rate** triggers when errors exceed 10% within an hour
2. **Task duration spikes** activate when duration doubles the baseline
3. **Token budget warnings** occur at 80% and 95% thresholds
4. **Agent failure patterns** alert after three consecutive failures

---

## Monitoring Integration

The dashboard supports integration with:
- **Grafana** (via JSON configuration)
- **Prometheus** (metrics exporting)
- **Loki** (log aggregation)

A command-line interface offers real-time statistics through shell scripts and JSON processing.

---

## Operational Guidance

Best practices emphasize:
- Seven-day raw metric retention
- Event sampling for high-volume scenarios
- Privacy-conscious logging
- Asynchronous writes
- Escalation-based alerting protocols
