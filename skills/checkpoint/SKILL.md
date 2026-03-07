---
name: checkpoint
description: Save a named checkpoint of current session progress. Use /checkpoint to save state for later resumption.
user-invokable: true
allowed-tools: Read, Write, Edit, Glob
metadata:
  keywords: [checkpoint, save, session, state]
---

# Checkpoint

Save a named checkpoint of current session progress for later resumption.

## Usage

- `/checkpoint` - Save with auto-generated name based on current task
- `/checkpoint "auth-feature-progress"` - Save with custom name
- `/checkpoint list` - Show all saved checkpoints
- `/checkpoint restore {name}` - Load checkpoint content into conversation

## Algorithm

### Save Checkpoint

1. **Parse arguments:**
   - If name provided: use it (sanitize: lowercase, hyphens, no spaces)
   - If no name: derive from current task description (e.g., "fix-login-bug")

2. **Ensure directory exists:**
   ```
   ~/.claude/sessions/checkpoints/
   ```

3. **Gather state:**
   - Task list with status (pending/in-progress/completed)
   - Key decisions made and their rationale
   - Files modified (path + brief description)
   - Files created (path + purpose)
   - Pending work (what remains to be done)
   - Blockers or open questions
   - Current branch (if in git repo)

4. **Write file** to `~/.claude/sessions/checkpoints/{name}_{YYYYMMDD_HHMM}.md`:

   ```markdown
   # Checkpoint: {name}
   **Saved:** {date} {time}
   **Branch:** {git branch or N/A}

   ## Task Progress
   - [x] {completed task 1}
   - [x] {completed task 2}
   - [ ] {pending task 3}
   - [ ] {pending task 4}

   ## Decisions
   - {decision}: {why}

   ## Modified Files
   - `{path}`: {changes}

   ## Created Files
   - `{path}`: {purpose}

   ## Pending Work
   1. {next step}
   2. {next step}

   ## Notes
   {Any context that would be helpful when resuming}
   ```

5. **Confirm** with file path and item counts.

### List Checkpoints

1. Glob `~/.claude/sessions/checkpoints/*.md`
2. Display table: name, date, size, first line of task progress
3. Sort by date descending (newest first)

### Restore Checkpoint

1. Find checkpoint by name (partial match OK)
2. Read file content
3. Display to user as context
4. Suggest: "You can now continue from where you left off."

## Notes

- Keep checkpoints under 80 lines for efficient context loading
- Old checkpoints are not auto-deleted (use /sessions clean for that)
- Multiple checkpoints per session are fine (different names)
