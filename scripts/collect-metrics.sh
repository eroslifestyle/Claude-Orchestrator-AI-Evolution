#!/bin/bash
# =============================================================================
# Claude Code Metrics Collection Script
# Version: 1.0.0 | Created: 2026-02-26
# =============================================================================

set -euo pipefail

# Configuration
METRICS_DIR="${CLAUDE_LOG_DIR:-$HOME/.claude/logs}"
METRICS_FILE="$METRICS_DIR/metrics.jsonl"
AGGREGATED_FILE="$METRICS_DIR/metrics-summary.json"
RETENTION_DAYS=7

# Ensure directories exist
mkdir -p "$METRICS_DIR"

# =============================================================================
# Hook Entry Point - Called by Claude Code hooks system
# =============================================================================

main() {
    local hook_event="${1:-}"
    local stdin_data=""

    # Read stdin if available
    if [[ ! -t 0 ]]; then
        stdin_data=$(cat)
    fi

    case "$hook_event" in
        SessionStart)
            handle_session_start "$stdin_data"
            ;;
        PreToolUse)
            handle_pre_tool_use "$stdin_data"
            ;;
        PostToolUse)
            handle_post_tool_use "$stdin_data"
            ;;
        PreCompact)
            handle_pre_compact "$stdin_data"
            ;;
        SessionEnd)
            handle_session_end "$stdin_data"
            ;;
        collect)
            collect_and_aggregate
            ;;
        report)
            generate_report "${2:-daily}"
            ;;
        cleanup)
            cleanup_old_metrics
            ;;
        *)
            echo "Unknown hook event: $hook_event" >&2
            exit 1
            ;;
    esac
}

# =============================================================================
# Event Handlers
# =============================================================================

handle_session_start() {
    local data="$1"
    local session_id="${CLAUDE_SESSION_ID:-$(uuidgen 2>/dev/null || echo "session-$(date +%s)")}"
    local project="${CLAUDE_PROJECT:-unknown}"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    local event_json=$(cat <<EOF
{"event":"session_start","session_id":"$session_id","timestamp":"$timestamp","project":"$project","model":"claude-opus-4-6","version":"11.3.1"}
EOF
)

    write_metric "$event_json"
}

handle_pre_tool_use() {
    local data="$1"
    local tool=$(echo "$data" | jq -r '.tool // "unknown"' 2>/dev/null || echo "unknown")
    local agent=$(echo "$data" | jq -r '.agent // "Orchestrator"' 2>/dev/null || echo "Orchestrator")
    local session_id="${CLAUDE_SESSION_ID:-unknown}"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    local event_json=$(cat <<EOF
{"event":"tool_invoke","tool":"$tool","session_id":"$session_id","timestamp":"$timestamp","agent":"$agent"}
EOF
)

    write_metric "$event_json"
}

handle_post_tool_use() {
    local data="$1"
    local tool=$(echo "$data" | jq -r '.tool // "unknown"' 2>/dev/null || echo "unknown")
    local agent=$(echo "$data" | jq -r '.agent // "Orchestrator"' 2>/dev/null || echo "Orchestrator")
    local duration_ms=$(echo "$data" | jq -r '.duration_ms // 0' 2>/dev/null || echo "0")
    local success=$(echo "$data" | jq -r '.success // true' 2>/dev/null || echo "true")
    local tokens=$(echo "$data" | jq -r '.tokens_used // 0' 2>/dev/null || echo "0")
    local error_type=$(echo "$data" | jq -r '.error_type // null' 2>/dev/null || echo "null")
    local session_id="${CLAUDE_SESSION_ID:-unknown}"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    local event_json=$(cat <<EOF
{"event":"tool_complete","tool":"$tool","session_id":"$session_id","timestamp":"$timestamp","agent":"$agent","duration_ms":$duration_ms,"success":$success,"error_type":$error_type,"tokens_used":$tokens}
EOF
)

    write_metric "$event_json"
}

handle_pre_compact() {
    local data="$1"
    local context_tokens=$(echo "$data" | jq -r '.context_tokens // 0' 2>/dev/null || echo "0")
    local decisions=$(echo "$data" | jq -r '.decisions_preserved // 0' 2>/dev/null || echo "0")
    local files=$(echo "$data" | jq -r '.files_in_scope // 0' 2>/dev/null || echo "0")
    local session_id="${CLAUDE_SESSION_ID:-unknown}"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    local event_json=$(cat <<EOF
{"event":"pre_compact","session_id":"$session_id","timestamp":"$timestamp","context_tokens":$context_tokens,"decisions_preserved":$decisions,"files_in_scope":$files,"checkpoint_created":true}
EOF
)

    write_metric "$event_json"
}

handle_session_end() {
    local data="$1"

    # Calculate session metrics from collected data
    local session_id="${CLAUDE_SESSION_ID:-unknown}"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    # Aggregate from metrics file if exists
    local duration_total=0
    local tokens_total=0
    local tasks_completed=0
    local tasks_failed=0
    local error_count=0
    local files_modified=0
    local files_created=0

    if [[ -f "$METRICS_FILE" ]]; then
        # Extract metrics for this session
        local session_data=$(grep "\"session_id\":\"$session_id\"" "$METRICS_FILE" 2>/dev/null || true)

        if [[ -n "$session_data" ]]; then
            tokens_total=$(echo "$session_data" | grep -o '"tokens_used":[0-9]*' | cut -d: -f2 | awk '{s+=$1} END {print s}')
            tasks_completed=$(echo "$session_data" | grep -c '"event":"task_complete".*"success":true' || echo "0")
            tasks_failed=$(echo "$session_data" | grep -c '"event":"task_complete".*"success":false' || echo "0")
            error_count=$(echo "$session_data" | grep -c '"success":false' || echo "0")
        fi
    fi

    local total_tasks=$((tasks_completed + tasks_failed))
    local success_rate="1.0"
    if [[ $total_tasks -gt 0 ]]; then
        success_rate=$(echo "scale=2; $tasks_completed / $total_tasks" | bc)
    fi

    local event_json=$(cat <<EOF
{"event":"session_end","session_id":"$session_id","timestamp":"$timestamp","duration_total_ms":$duration_total,"tokens_total":$tokens_total,"tasks_completed":$tasks_completed,"tasks_failed":$tasks_failed,"files_modified":$files_modified,"files_created":$files_created,"error_count":$error_count,"success_rate":$success_rate}
EOF
)

    write_metric "$event_json"
}

# =============================================================================
# Utility Functions
# =============================================================================

write_metric() {
    local event_json="$1"

    # Append to metrics file
    echo "$event_json" >> "$METRICS_FILE"

    # Flush if buffer is large
    local line_count=$(wc -l < "$METRICS_FILE" 2>/dev/null || echo "0")
    if [[ $line_count -gt 10000 ]]; then
        rotate_metrics
    fi
}

rotate_metrics() {
    local timestamp=$(date +%Y%m%d)
    local rotated_file="$METRICS_DIR/metrics-$timestamp.jsonl"

    # Move current file to dated backup
    if [[ -f "$METRICS_FILE" ]]; then
        mv "$METRICS_FILE" "$rotated_file"
    fi

    # Compress old files
    find "$METRICS_DIR" -name "metrics-*.jsonl" -mtime +1 -exec gzip {} \; 2>/dev/null || true

    # Remove files older than retention period
    find "$METRICS_DIR" -name "metrics-*.jsonl.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
}

collect_and_aggregate() {
    echo "Collecting and aggregating metrics..."

    if [[ ! -f "$METRICS_FILE" ]]; then
        echo "No metrics file found at $METRICS_FILE"
        exit 0
    fi

    # Generate summary statistics
    local total_events=$(wc -l < "$METRICS_FILE")
    local total_sessions=$(grep -c '"event":"session_start"' "$METRICS_FILE" || echo "0")
    local total_tasks=$(grep -c '"event":"task_complete"' "$METRICS_FILE" || echo "0")
    local successful_tasks=$(grep -c '"event":"task_complete".*"success":true' "$METRICS_FILE" || echo "0")
    local failed_tasks=$(grep -c '"event":"task_complete".*"success":false' "$METRICS_FILE" || echo "0")
    local total_errors=$(grep -c '"success":false' "$METRICS_FILE" || echo "0")

    # Calculate token totals
    local total_tokens=$(grep -o '"tokens_used":[0-9]*' "$METRICS_FILE" | cut -d: -f2 | awk '{s+=$1} END {print s}')

    # Agent usage
    local agent_usage=$(grep -o '"agent":"[^"]*"' "$METRICS_FILE" | sort | uniq -c | sort -rn | head -10)

    # Tool usage
    local tool_usage=$(grep -o '"tool":"[^"]*"' "$METRICS_FILE" | sort | uniq -c | sort -rn | head -10)

    # Generate JSON summary
    cat > "$AGGREGATED_FILE" <<EOF
{
  "generated_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "period": {
    "from": "$(head -1 "$METRICS_FILE" | jq -r '.timestamp' 2>/dev/null || echo "unknown")",
    "to": "$(tail -1 "$METRICS_FILE" | jq -r '.timestamp' 2>/dev/null || echo "unknown")"
  },
  "summary": {
    "total_events": $total_events,
    "total_sessions": $total_sessions,
    "total_tasks": $total_tasks,
    "successful_tasks": $successful_tasks,
    "failed_tasks": $failed_tasks,
    "total_errors": $total_errors,
    "total_tokens": ${total_tokens:-0},
    "success_rate": $(echo "scale=2; $successful_tasks / ($successful_tasks + $failed_tasks + 0.001)" | bc)
  },
  "top_agents": $(echo "$agent_usage" | awk '{printf "{\"%s\": %d}", $2, $1}' | paste -sd, - | sed 's/^/[/;s/$/]/' || echo "[]"),
  "top_tools": $(echo "$tool_usage" | awk '{printf "{\"%s\": %d}", $2, $1}' | paste -sd, - | sed 's/^/[/;s/$/]/' || echo "[]")
}
EOF

    echo "Summary written to $AGGREGATED_FILE"
}

generate_report() {
    local period="${1:-daily}"

    echo "=== Claude Code Metrics Report ==="
    echo "Period: $period"
    echo "Generated: $(date)"
    echo ""

    if [[ ! -f "$METRICS_FILE" ]]; then
        echo "No metrics data available."
        return
    fi

    echo "--- Session Summary ---"
    echo "Total Sessions: $(grep -c '"event":"session_start"' "$METRICS_FILE" || echo "0")"
    echo ""

    echo "--- Task Summary ---"
    echo "Completed: $(grep -c '"event":"task_complete".*"success":true' "$METRICS_FILE" || echo "0")"
    echo "Failed: $(grep -c '"event":"task_complete".*"success":false' "$METRICS_FILE" || echo "0")"
    echo ""

    echo "--- Top Agents ---"
    grep -o '"agent":"[^"]*"' "$METRICS_FILE" | sort | uniq -c | sort -rn | head -5
    echo ""

    echo "--- Top Tools ---"
    grep -o '"tool":"[^"]*"' "$METRICS_FILE" | sort | uniq -c | sort -rn | head -5
    echo ""

    echo "--- Error Types ---"
    grep -o '"error_type":"[^"]*"' "$METRICS_FILE" | sort | uniq -c | sort -rn | head -5
}

cleanup_old_metrics() {
    echo "Cleaning up metrics older than $RETENTION_DAYS days..."

    # Remove old compressed files
    find "$METRICS_DIR" -name "metrics-*.jsonl.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

    # Remove old uncompressed files
    find "$METRICS_DIR" -name "metrics-*.jsonl" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

    echo "Cleanup complete."
}

# =============================================================================
# Entry Point
# =============================================================================

main "$@"
