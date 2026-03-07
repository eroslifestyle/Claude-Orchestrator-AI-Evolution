---
name: status
description: Show current orchestrator system status dashboard. Use /status for a quick health overview.
user-invokable: true
allowed-tools: Read, Glob, Bash
metadata:
  keywords: [status, health, metrics, dashboard]
---

# Status

Display a compact system status dashboard for the orchestrator.

## Usage

- `/status` - Show full status dashboard

## Algorithm

1. **Gather data** (in parallel where possible):

   **Agents:** Glob `~/.claude/agents/**/*.md` and count by tier:
   - Core (L0): files directly in agents/
   - Expert (L1): files in agents/experts/
   - Specialist (L2): files in agents/specialists/

   **Skills:** Glob `~/.claude/skills/*/SKILL.md` and count

   **Rules:** Glob `~/.claude/rules/*.md` and list names

   **Memory:** Read `~/.claude/projects/*/memory/MEMORY.md` - check if exists, get line count

   **Learnings:** Read `~/.claude/learnings/instincts.json` if exists:
   - Count total instincts
   - Count high-confidence (confidence >= 0.8)

   **MCP Plugins:** Count available MCP tool prefixes (mcp__*) from tool list

   **Sessions:** Glob `~/.claude/sessions/**/*.md` and count

2. **Display dashboard:**

   ```
   ============================================
    ORCHESTRATOR V11.0 - System Status
   ============================================

    Agents
      Core (L0):       6
      Expert (L1):     19
      Specialist (L2): 18
      Total:           43

    Skills
      Loaded:          {count}
      User-invocable:  {count}

    Rules
      Active sets:     {list}

    Memory
      Status:          Loaded
      Size:            {lines} lines

    Learnings
      Total instincts: {count}
      High confidence: {count}

    MCP Plugins
      Connected:       {count}

    Sessions
      Saved:           {count}

   ============================================
   ```

3. **Health indicators** (append if issues detected):
   - WARN if no memory file found
   - WARN if 0 agents detected
   - WARN if 0 skills detected
   - OK if everything normal

## Notes

- This is a read-only status check; it modifies nothing
- Data is gathered from filesystem, not runtime state
- Agent/skill counts reflect what is on disk, not what is loaded in memory
