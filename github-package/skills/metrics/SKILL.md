---
name: metrics
description: Display detailed session metrics and agent performance. Use /metrics for the full dashboard.
user-invokable: true
allowed-tools: Read, Glob, Bash
metadata:
  keywords: [metrics, statistics, performance, dashboard]
---

# Metrics

Display detailed session metrics and agent performance dashboard.

> **Note:** Metrics are ESTIMATES based on available session data. Parallelism and agent usage metrics require conversation-level tracking that may not be fully available to a subagent. Values marked N/A indicate unavailable data.

## Usage

- `/metrics` - Show full metrics dashboard

## Algorithm

1. **Gather metrics data** (in parallel where possible):

   **Task Metrics:**
   - Read current todo list state (if available)
   - Count by status: total, completed, failed, in-progress, pending

   **Parallelism Metrics:**
   - Estimate from session history:
     - Max parallel tasks observed in a single batch
     - Average tasks per batch
     - Parallelism efficiency: (parallel batches / total batches) * 100

   **Agent Usage:**
   - Scan session for agent invocations
   - Count tasks per agent
   - Rank top 5 by task count

   **Token Estimate:**
   - Approximate based on conversation length
   - Messages * avg tokens per message (rough estimate)

   **Error Metrics:**
   - Count errors encountered during session
   - Count auto-recovered (retried successfully)
   - Count escalated to user (manual intervention)

   **Duration:**
   - Session start time (first message) to now
   - Format as hours:minutes

   **Learning Metrics:**
   - New instincts captured this session (if instincts file updated)
   - Pattern: compare instincts file mtime with session start

2. **Display dashboard:**

   ```
   =============================================
    SESSION METRICS DASHBOARD
   =============================================

    Tasks
      Total:           {n}
      Completed:       {n}  ({pct}%)
      Failed:          {n}
      In Progress:     {n}
      Pending:         {n}

    Parallelism
      Max parallel:    {n} tasks
      Avg per batch:   {n}
      Efficiency:      {pct}%

    Agent Usage (Top 5)
      1. {agent_name}:    {count} tasks
      2. {agent_name}:    {count} tasks
      3. {agent_name}:    {count} tasks
      4. {agent_name}:    {count} tasks
      5. {agent_name}:    {count} tasks

    Tokens (estimate)
      Total:           ~{n}K tokens

    Errors
      Total:           {n}
      Auto-recovered:  {n}
      Manual:          {n}

    Duration
      Session time:    {h}h {m}m

    Learning
      New instincts:   {n}

   =============================================
   ```

3. **Notes on accuracy:**
   - Token estimates are approximate (based on message count heuristic)
   - Parallelism metrics reflect observable behavior, not internal scheduling
   - Agent usage depends on task delegation being traceable in conversation

## Notes

- This is a read-only diagnostic; it modifies nothing
- Some metrics may show "N/A" if data is not available
- Best used at end of session for a summary view
- For a quick overview, use `/status` instead
