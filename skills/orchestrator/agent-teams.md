# Agent Teams | Orchestrator V10.1 ULTRA
> Extracted module — referenced from [SKILL.md](SKILL.md)

---

## AGENT TEAM LIFECYCLE

When Mode = TEAMMATE is selected:

### PHASE 1: CREATE TEAM
```
Create an agent team for [task description].
Spawn [N] teammates:
- [Name]: [Role], owns files in [path/pattern]. [Detailed context].
- [Name]: [Role], owns files in [path/pattern]. [Detailed context].
Use [model] for each teammate.
```

> **SPAWNING NOTE:** Teammates are spawned via natural language only — not programmatically. Claude decides autonomously whether to create a team based on task complexity. Describe the team structure clearly in plain language; Claude handles the spawning.

> **CONTEXT INHERITANCE:** Each teammate receives the full project context (CLAUDE.md, MCP servers, skills, MEMORY.md) but **NOT** the lead's conversation history. Every spawn prompt must be self-contained with all necessary context — do not assume teammates know what the lead knows.

**Rules:**
- Each teammate MUST own a DIFFERENT set of files (no overlaps)
- Give each teammate enough context (don't assume they know the codebase)
- Include file paths, patterns, expected outputs
- 5-6 tasks per teammate is optimal

### PHASE 2: PLAN APPROVAL (optional)
For risky or complex implementations:
```
Require plan approval for [teammate] before they make changes.
Only approve plans that [criteria].
```

Criteria examples:
- "include test coverage"
- "don't modify database schema"
- "follow existing code patterns"
- "handle error cases"

### PHASE 3: COORDINATE
- Monitor progress via shared task list
- Message specific teammates for steering: "Focus on X instead of Y"
- Use broadcast sparingly (costs scale with team size)
- If a teammate is stuck, give additional instructions directly

### PHASE 4: QUALITY GATES
Before accepting teammate output, verify:
- [ ] All assigned tasks marked complete
- [ ] No file conflicts between teammates
- [ ] Test coverage adequate
- [ ] Code follows project patterns

### PHASE 5: SHUTDOWN & CLEANUP
```
Ask [teammate] to shut down.
[After all teammates stopped]
Clean up the team.
```
**WARNING:** Always shut down ALL teammates BEFORE cleanup. Only lead runs cleanup.

---

## AGENT TEAM PATTERNS

### Pattern 1: Parallel Review (3+ reviewers)
```
Create an agent team to review [target].
Spawn reviewers:
- Security: focus on auth, injection, secrets
- Performance: focus on queries, caching, memory
- Tests: focus on coverage, edge cases, mocking
Have them share findings and challenge each other.
```

### Pattern 2: Multi-Module Feature
```
Create an agent team for [feature].
Spawn developers:
- Frontend: owns src/gui_nicegui/ files
- Backend: owns src/trading/ and src/telegram/ files
- Tests: owns tests/ files, writes integration tests
Require plan approval before implementation.
```

### Pattern 3: Competing Hypotheses (Debugging)
```
[Bug description]. Spawn 3-5 teammates to investigate different hypotheses.
Have them talk to each other to disprove each other's theories.
Update findings with consensus.
```

### Pattern 4: Research + Implement
```
Create team:
- Researcher: explore codebase, document findings, propose approach
- Implementer: wait for researcher's plan, then implement
Require plan approval for implementer.
```

---

## KNOWN LIMITATIONS

| Limitation | Impact | Workaround |
|-----------|--------|-----------|
| No session resumption | `/resume` does NOT restore in-process teammates after restart | Spawn new teammates after resuming |
| Task status lag | Completed tasks may not update immediately, blocking dependencies | Manually check/update task status |
| One team per session | Cannot have 2 active teams simultaneously | Clean up before starting a new team |
| No nested teams | Teammates cannot spawn their own teams | Only the lead manages teams |
| Fixed lead | Leadership cannot be transferred during session | Choose lead session carefully at start |
| Permissions inherited | All teammates inherit lead's permissions at spawn | Change individually after spawn if needed |
| Split panes not on Windows | Not supported in VS Code terminal, Windows Terminal, Ghostty | Use in-process mode (default on Windows) |
