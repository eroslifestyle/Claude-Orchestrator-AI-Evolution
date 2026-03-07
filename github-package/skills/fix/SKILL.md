---
name: fix
description: Fix specified bug or issue with targeted code changes
user-invokable: true
allowed-tools: Read, Edit, Grep, Glob, Bash, Task
metadata:
  keywords: [fix, bug, repair, patch]
---

# Fix Bug

Quick bug fix workflow. Delegates to Coder agent for implementation.

## Workflow

1. **Identify**: Locate the bug (error message, stack trace, reproduction steps)
2. **Analyze**: Read relevant files, understand root cause
3. **Fix**: Apply minimal, targeted fix
4. **Verify**: Run tests to confirm fix doesn't break anything

## Usage

```
/fix <description of bug or error>
/fix TypeError in login handler
/fix issue #42
```

## Agent Routing

- Primary: Coder (implementation)
- Support: Tester Expert (verification)
- Fallback: Analyzer (if root cause unclear)

## Rules

- Minimal change principle: fix ONLY the bug, don't refactor surrounding code
- Always verify with tests after fix
- If fix requires > 3 files changed, escalate to /plan first
