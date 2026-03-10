# Skill Creation for Agents | Orchestrator V10.1 ULTRA
> Extracted module — referenced from [SKILL.md](SKILL.md)

---

When delegating to agents that need to create or modify skills, include these guidelines:

### Skill File Structure
```
skill-name/
├── SKILL.md           # Required: Main instructions with YAML frontmatter
├── examples.md        # Optional: Usage examples
├── reference.md       # Optional: Detailed reference docs
└── scripts/           # Optional: Helper scripts
```

### Essential Frontmatter
```yaml
---
name: skill-name                    # Lowercase, hyphens only
description: When to use this skill # Claude uses this for auto-detection
disable-model-invocation: false     # Set true for manual-only skills
user-invocable: true                # Set false to hide from / menu
allowed-tools: Read, Grep, Glob     # Pre-approved tools for this skill
context: fork                       # Run in subagent (optional)
agent: Explore                      # Subagent type for context: fork
---
```

### String Substitutions
| Variable | Purpose |
|----------|---------|
| `$ARGUMENTS` | All arguments passed to skill |
| `$0`, `$1`, `$2` | Individual arguments by position |
| `${CLAUDE_SESSION_ID}` | Current session ID |

### Dynamic Context Injection
Use `!BACKTICK command BACKTICK` syntax to inject live data (runs at skill load time).
Example output after injection:
```markdown
Current date: Wed Feb 18 2026
File count: 42
```

### Running Skills in Subagents
Add `context: fork` + `agent: <type>` to run skill in isolated subagent:
```yaml
---
name: deep-research
context: fork
agent: Explore
---

Research $ARGUMENTS using Glob and Grep...
```

**Full reference:** See [skills-reference.md](skills-reference.md) for complete documentation.
