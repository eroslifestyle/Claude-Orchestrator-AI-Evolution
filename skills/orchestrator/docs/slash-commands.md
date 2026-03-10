# Slash Commands Reference

> **Version:** V12.9.1 | **Parent:** [SKILL.md](../SKILL.md)

---

## AVAILABLE COMMANDS

| Command | Agent | Invokes Skill | Description | Example |
|---------|-------|---------------|-------------|---------|
| `/plan` | Analyzer + Architect | plan | Create implementation plan | `/plan Add OAuth login` |
| `/review` | Reviewer | code-review | Code review | `/review src/auth.py` |
| `/test` | Tester Expert | testing-strategy | Run tests | `/test --coverage` |
| `/tdd` | Tester + Coder | tdd-workflow | TDD workflow | `/tdd User validation` |
| `/fix` | Coder | fix | Fix bug | `/fix TypeError in login` |
| `/build-fix` | Coder | build-fix | Fix build errors | `/build-fix` |
| `/debug` | Tester Expert | debugging | Debug investigation | `/debug Why is session null?` |
| `/refactor` | Languages Refactor Specialist L2 | refactor-clean | Clean code | `/refactor auth module` |
| `/security-scan` | Security Unified Expert | security-scan | Security audit | `/security-scan API endpoints` |
| `/learn` | Documenter | learn | Capture learnings | `/learn` |
| `/evolve` | Coder | evolve | Promote patterns | `/evolve` |
| `/checkpoint` | System Coordinator | checkpoint | Save checkpoint | `/checkpoint before-refactor` |
| `/compact` | System Coordinator | strategic-compact | Strategic compact | `/compact` |
| `/status` | Analyzer | status | System health | `/status` |
| `/metrics` | Documenter | metrics | Session metrics | `/metrics` |
| `/cleanup` | System Coordinator | cleanup | Session cleanup | `/cleanup` |
| `/multi-plan` | Analyzer + Architect | multi-plan | Multi-approach plan | `/multi-plan Database migration` |
| `/simplify` | Coder | simplify | Review and simplify code | `/simplify` |
| `/api-design` | Integration Expert | api-design | API design guidance | `/api-design REST endpoints` |
| `/keybindings-help` | Coder | keybindings-help | Keybinding customization | `/keybindings-help` |
| `/emergency-cleanup` | System Coordinator | - | Emergency cleanup trigger | `/emergency-cleanup` |

---

## SKILL INVOCATION

The orchestrator can invoke skills directly using the `Skill` tool when appropriate.

### When to Invoke Skills vs Agents

| Use Skill When | Use Agent When |
|----------------|----------------|
| Template-based operations | Complex reasoning required |
| Repetitive patterns | Multi-step decision making |
| Well-defined workflows | File modifications needed |
| Reference/guidance content | Research and exploration |
| Quick shortcuts | Inter-agent communication needed |

### Invocation Syntax

```
Skill(tool, skill="skill-name", args="optional arguments")
```

### Skill Invocation Points in Orchestrator Flow

| Step | Skill | Trigger |
|------|-------|---------|
| Step 0.5 | prompt-engineering-patterns | Complex request detected |
| Step 9 | `/learn` | Always after code-modifying sessions |
| `/evolve` command | `/evolve` | Manual user invocation |
| `/simplify` command | `/simplify` | After code changes |
| `/security-scan` command | `/security-scan` | Security audit request |
| `/api-design` command | `/api-design` | API design request |

### Skill-Agent Coordination

When both skill and agent apply to a task:
1. **Skill first, then agent**: Use skill for guidance/patterns, agent for implementation
2. **Agent only**: Complex tasks requiring reasoning
3. **Skill only**: Simple, well-defined operations

Example:
```
User: "Add OAuth login following best practices"
-> Invoke /api-design skill for OAuth patterns
-> Delegate to Security Auth Specialist L2 for implementation
```

---

## SKILLS CATALOG (30 total)

| Category | Skills |
|----------|--------|
| **Core (8)** | orchestrator, code-review, git-workflow, testing-strategy, debugging, api-design, remotion-best-practices, keybindings-help |
| **Utility (6)** | strategic-compact, verification-loop, checkpoint, status, metrics, prompt-engineering-patterns |
| **Workflow (9)** | plan, tdd-workflow, security-scan, refactor-clean, build-fix, multi-plan, fix, cleanup, simplify |
| **Language (4)** | python-patterns, python-performance-optimization, typescript-patterns, go-patterns |
| **Learning (2)** | learn, evolve |

---

## NOTES

These are SHORTCUTS -- the orchestrator still decomposes, routes, and tracks as usual.

When a slash command has a corresponding skill, the orchestrator invokes it via `Skill(tool, skill="skill-name", args="...")` after or instead of delegating to an agent, depending on the task nature.
