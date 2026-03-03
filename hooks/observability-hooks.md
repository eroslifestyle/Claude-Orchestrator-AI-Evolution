# Observability Hooks Specification

> Claude Code Hooks Integration - Performance Monitoring & Metrics Collection
> Version: 1.0.0 | Created: 2026-02-26

---

## Overview

This specification defines hooks that collect performance metrics and operational
data from Claude Code sessions. Metrics are written to JSON lines format for
easy parsing and downstream analysis.

---

## Hook Points

### 1. SessionStart

**Trigger:** When a new Claude Code session begins

```json
{
  "event": "session_start",
  "session_id": "uuid-v4",
  "timestamp": "2026-02-26T12:00:00Z",
  "project": "project-name",
  "model": "claude-opus-4-6",
  "version": "11.3.1"
}
```

**Metrics Collected:**
- Session identifier
- Project context
- Model configuration
- System version

---

### 2. PreToolUse

**Trigger:** Before any tool invocation

```json
{
  "event": "tool_invoke",
  "tool": "Read|Edit|Bash|Task|...",
  "session_id": "uuid-v4",
  "timestamp": "2026-02-26T12:00:01Z",
  "agent": "Coder",
  "parameters_hash": "sha256:abc123"
}
```

**Metrics Collected:**
- Tool name
- Calling agent
- Timestamp for duration calculation

---

### 3. PostToolUse

**Trigger:** After tool completes (success or failure)

```json
{
  "event": "tool_complete",
  "tool": "Read|Edit|Bash|Task|...",
  "session_id": "uuid-v4",
  "timestamp": "2026-02-26T12:00:02Z",
  "agent": "Coder",
  "duration_ms": 1234,
  "success": true,
  "error_type": null,
  "tokens_used": 150
}
```

**Metrics Collected:**
- Execution duration
- Success/failure status
- Error classification (if failed)
- Token consumption

---

### 4. TaskComplete

**Trigger:** When an agent completes its assigned task

```json
{
  "event": "task_complete",
  "task_id": "T1",
  "session_id": "uuid-v4",
  "agent": "Coder",
  "timestamp": "2026-02-26T12:01:00Z",
  "duration_ms": 45678,
  "tokens_used": 12345,
  "success": true,
  "files_modified": 3,
  "files_created": 2,
  "test_results": "PASS",
  "issues_found": 0
}
```

**Metrics Collected:**
- Task duration
- Token consumption
- Files affected
- Test status
- Issue count

---

### 5. PreCompact

**Trigger:** Before context compaction occurs

```json
{
  "event": "pre_compact",
  "session_id": "uuid-v4",
  "timestamp": "2026-02-26T12:30:00Z",
  "context_tokens": 180000,
  "decisions_preserved": 5,
  "files_in_scope": 12,
  "checkpoint_created": true
}
```

**Metrics Collected:**
- Context size before compaction
- Critical decisions preserved
- Files in working set
- Checkpoint status

---

### 6. SessionEnd

**Trigger:** When Claude Code session terminates

```json
{
  "event": "session_end",
  "session_id": "uuid-v4",
  "timestamp": "2026-02-26T13:00:00Z",
  "duration_total_ms": 3600000,
  "tokens_total": 150000,
  "tasks_completed": 5,
  "tasks_failed": 1,
  "agents_used": ["Orchestrator", "Coder", "Reviewer"],
  "files_modified": 8,
  "files_created": 4,
  "error_count": 2,
  "success_rate": 0.83
}
```

**Metrics Collected:**
- Total session duration
- Total token consumption
- Task success/failure counts
- Agents utilized
- Files affected
- Error summary

---

## Metrics Schema

### Core Fields (All Events)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `event` | string | Yes | Event type identifier |
| `session_id` | string | Yes | Unique session identifier |
| `timestamp` | string | Yes | ISO 8601 timestamp |
| `agent` | string | No | Agent name if applicable |

### Duration Fields

| Field | Type | Description |
|-------|------|-------------|
| `duration_ms` | integer | Duration in milliseconds |
| `duration_total_ms` | integer | Total session duration |

### Token Fields

| Field | Type | Description |
|-------|------|-------------|
| `tokens_used` | integer | Tokens for single operation |
| `tokens_total` | integer | Cumulative session tokens |

### Status Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Operation success status |
| `error_type` | string | Error classification |
| `error_count` | integer | Total errors in session |
| `success_rate` | float | Ratio of successful operations |

---

## Output Format

All metrics are written as **JSON Lines** (one JSON object per line):

```
{"event":"session_start","session_id":"abc-123",...}
{"event":"tool_invoke","tool":"Read",...}
{"event":"tool_complete","tool":"Read","duration_ms":50,...}
{"event":"task_complete","agent":"Coder",...}
{"event":"session_end","session_id":"abc-123",...}
```

**File Location:** `~/.claude/logs/metrics.jsonl`

**Rotation:** Daily rotation with 7-day retention

---

## Error Classifications

| Error Type | Code | Description |
|------------|------|-------------|
| `TIMEOUT` | E001 | Operation exceeded time limit |
| `RATE_LIMIT` | E002 | API rate limit hit |
| `VALIDATION` | E003 | Input validation failed |
| `PERMISSION` | E004 | Insufficient permissions |
| `RESOURCE` | E005 | Resource not available |
| `SYNTAX` | E006 | Code syntax error |
| `DEPENDENCY` | E007 | Missing dependency |
| `NETWORK` | E008 | Network connectivity issue |
| `UNKNOWN` | E999 | Unclassified error |

---

## Integration Points

### Hook Registration

Hooks are registered in `settings.json`:

```json
{
  "hooks": {
    "SessionStart": ["~/.claude/scripts/observability-hook.sh"],
    "PreToolUse": ["~/.claude/scripts/observability-hook.sh"],
    "PostToolUse": ["~/.claude/scripts/observability-hook.sh"],
    "PreCompact": ["~/.claude/scripts/observability-hook.sh"],
    "SessionEnd": ["~/.claude/scripts/observability-hook.sh"]
  }
}
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `CLAUDE_SESSION_ID` | Current session identifier |
| `CLAUDE_PROJECT` | Project name |
| `CLAUDE_LOG_DIR` | Metrics log directory |

---

## Performance Considerations

- Hook execution time should be < 50ms
- Metrics writes are asynchronous
- Buffer size: 100 events max before flush
- Compression enabled for files > 10MB

---

## Query Examples

### Session Summary

```bash
cat ~/.claude/logs/metrics.jsonl | \
  jq -s 'group_by(.session_id) | map({
    session: .[0].session_id,
    duration: (map(select(.duration_total_ms) | .duration_total_ms) | first),
    tokens: (map(select(.tokens_total) | .tokens_total) | first),
    tasks: (map(select(.event=="task_complete") | 1) | add)
  })'
```

### Agent Usage Frequency

```bash
cat ~/.claude/logs/metrics.jsonl | \
  jq -s '[.[] | select(.agent)] | group_by(.agent) | map({
    agent: .[0].agent,
    invocations: length
  }) | sort_by(-.invocations)'
```

### Error Rate by Type

```bash
cat ~/.claude/logs/metrics.jsonl | \
  jq -s '[.[] | select(.success==false)] | group_by(.error_type) | map({
    error: .[0].error_type,
    count: length
  }) | sort_by(-.count)'
```

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-26 | Initial specification |
