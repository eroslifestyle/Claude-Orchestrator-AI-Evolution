# Slash Commands Reference

> **Source:** skills/orchestrator/SKILL.md (V14.0.3)
> **Last Updated:** 2026-03-07

---

## Available Slash Commands

Users can invoke these shortcuts. The orchestrator handles routing and invokes skills when appropriate.

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

---

## Command Categories

### Planning & Architecture
| Command | Purpose |
|---------|---------|
| `/plan` | Create detailed implementation plan |
| `/multi-plan` | Generate multiple approach options |
| `/api-design` | API design best practices |

### Development & Coding
| Command | Purpose |
|---------|---------|
| `/fix` | Fix specific bugs |
| `/build-fix` | Resolve build/compilation errors |
| `/refactor` | Clean code refactoring |
| `/simplify` | Simplify complex code |
| `/tdd` | Test-driven development workflow |

### Quality & Testing
| Command | Purpose |
|---------|---------|
| `/review` | Code review |
| `/test` | Run tests with options |
| `/debug` | Debug investigation |
| `/security-scan` | Security audit |

### Session Management
| Command | Purpose |
|---------|---------|
| `/checkpoint` | Save session checkpoint |
| `/compact` | Strategic context compression |
| `/status` | System health check |
| `/metrics` | Session metrics |
| `/cleanup` | Force session cleanup |

### Learning & Evolution
| Command | Purpose |
|---------|---------|
| `/learn` | Capture session learnings |
| `/evolve` | Promote patterns to skills |

---

## Skill Invocation

When a slash command has a corresponding skill, the orchestrator invokes it via:

```
Skill(tool, skill="skill-name", args="...")
```

**Invocation Points:**

| Step | Skill | Trigger |
|------|-------|---------|
| Step 0.5 | prompt-engineering-patterns | Complex request detected |
| Step 9 | `/learn` | Always after code-modifying sessions |
| `/evolve` command | `/evolve` | Manual user invocation |
| `/simplify` command | `/simplify` | After code changes |
| `/security-scan` command | `/security-scan` | Security audit request |
| `/api-design` command | `/api-design` | API design request |

---

## Skill vs Agent Selection

| Use Skill When | Use Agent When |
|----------------|----------------|
| Template-based operations | Complex reasoning required |
| Repetitive patterns | Multi-step decision making |
| Well-defined workflows | File modifications needed |
| Reference/guidance content | Research and exploration |
| Quick shortcuts | Inter-agent communication needed |

### Coordination Pattern

When both skill and agent apply:

1. **Skill first, then agent**: Use skill for guidance/patterns, agent for implementation
2. **Agent only**: Complex tasks requiring reasoning
3. **Skill only**: Simple, well-defined operations

**Example:**
```
User: "Add OAuth login following best practices"
-> Invoke /api-design skill for OAuth patterns
-> Delegate to Security Auth Specialist L2 for implementation
```

---

## Related Documentation

- [SKILL.md](../SKILL.md) - Main orchestrator documentation
- [routing-table.md](routing-table.md) - Agent routing reference
- [skills-reference.md](../skills-reference.md) - Detailed skills documentation
