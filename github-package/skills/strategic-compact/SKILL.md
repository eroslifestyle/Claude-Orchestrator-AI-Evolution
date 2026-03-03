---
name: strategic-compact
description: "Internal - Auto-triggered when context reaches ~70% capacity. Can also be invoked manually."
user-invokable: true
internal: true
allowed-tools: Read, Write, Edit, Glob
metadata:
  keywords: [compact, context, checkpoint, memory]
---

# Strategic Compact

Save current session state before context window compaction so critical context is not lost.

## When to Use

- Before running `/compact`
- When conversation is getting long (100+ messages)
- Before switching to a complex new task mid-session
- When you want to preserve decisions and progress

## Algorithm

1. **Gather session state** by scanning the current conversation for:
   - Decisions made (architectural choices, trade-offs, rejected alternatives)
   - Files modified or created (with brief description of changes)
   - Current task and its status (in-progress, blocked, completed)
   - Next steps planned but not yet executed
   - Key findings (bugs found, patterns discovered, constraints identified)
   - Open questions or blockers

2. **Ensure target directory exists:**
   ```
   ~/.claude/sessions/
   ```

3. **Write checkpoint file** to `~/.claude/sessions/checkpoint_{YYYY-MM-DD}_{HHMM}.md` with this structure:

   ```markdown
   # Session Checkpoint - {date} {time}

   ## Current Task
   {What we're working on and current status}

   ## Decisions Made
   - {decision 1}: {rationale}
   - {decision 2}: {rationale}

   ## Files Modified
   - `{path}`: {what changed and why}

   ## Key Findings
   - {finding 1}
   - {finding 2}

   ## Next Steps
   1. {next action 1}
   2. {next action 2}

   ## Open Questions
   - {question or blocker}
   ```

4. **Confirm** to user with file path and summary of what was saved.

5. **Post-compaction reload:** After compaction, user can ask to read the checkpoint file to restore context.

## Notes

- Keep checkpoint concise: max 100 lines to avoid bloating future context
- One checkpoint per save (overwrite if same minute, otherwise new file)
- Suggest compaction when conversation feels slow or repetitive
