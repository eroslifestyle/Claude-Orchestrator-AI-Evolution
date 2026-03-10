# Anti-Patterns: Hallucination and Overeagerness Control

> **Version:** V12.9.1 | **Parent:** [SKILL.md](../SKILL.md)

---

## ANTI-HALLUCINATION PROTOCOL

> **CRITICAL:** Claude MUST NEVER speculate on code it hasn't read. This is a MANDATORY protocol.

### READ-FIRST Rule

**Before modifying ANY file, the system MUST:**
1. Read the file completely
2. Understand current implementation
3. Identify patterns and conventions used
4. Only THEN proceed with modifications

**WRONG:** Edit file without reading
**CORRECT:** Read -> Understand -> Edit

### Application Points

| Step | Action | Verification |
|------|--------|--------------|
| Before Task Launch | Verify files exist | Glob check |
| Task Start | Read relevant files first | Include file contents in task prompt |
| Before Edit | Understand current implementation | Read file, then edit |

### Hallucination Prevention Checklist

Before outputting code or solutions, verify:
- [ ] Have I read the relevant files?
- [ ] Do I understand the existing patterns?
- [ ] Am I inventing functions that don't exist?
- [ ] Are my imports based on actual file structure?
- [ ] Is my proposed change compatible with existing code?

### Common Hallucination Patterns to Avoid

| Pattern | Example | Prevention |
|---------|---------|------------|
| Invented imports | `import { magicFunction }` | Read file first, verify exports |
| Assumed structure | "Update the User class" | Verify class exists and location |
| Fabricated APIs | "Call userService.deleteUser()" | Read service to verify API |
| Non-existent files | "Edit src/utils/helpers.ts" | Glob before assuming existence |
| Invented parameters | `config.setOption('key', value)` | Read config interface first |

### Mandatory Subagent Rule

Add to ALL subagent prompts:
```
READ-FIRST MANDATORY: Before modifying ANY file:
1. READ the file completely
2. UNDERSTAND current implementation
3. IDENTIFY existing patterns
4. ONLY THEN make changes

VIOLATION = Task FAILED
```

---

## OVEREAGERNESS CONTROL

> **CRITICAL:** Claude must execute EXACTLY what is requested. No scope creep. No unrequested improvements.

### Definition

**Overeagerness = Making changes beyond what was requested, assuming requirements not stated.**

### Control Rules

**RULE 1: EXACT SCOPE**
- Do ONLY what was explicitly requested
- Do NOT add "nice to have" improvements
- Do NOT refactor unrelated code
- Do NOT change formatting unless specifically asked

**RULE 2: ASK BEFORE EXPANDING**
If you think additional work would be beneficial:
1. Complete the requested task FIRST
2. In final report, suggest additional improvements
3. Let user decide whether to proceed

**RULE 3: NO SCOPE CREEP**
```
User: "Fix the login button"
WRONG: Fix button + refactor auth + add tests + update docs
RIGHT: Fix button only, suggest other work in report
```

### Scope Verification Checklist

Before completing a task, verify:
- [ ] Did I only change what was requested?
- [ ] Did I add any "improvements" not asked for?
- [ ] Did I modify files outside the identified scope?
- [ ] Are all my changes traceable to the original request?

### Example Scenarios

| Request | WRONG (Overeager) | RIGHT (Controlled) |
|---------|-------------------|-------------------|
| "Fix typo in README" | Fix typo + restructure README + add badges | Fix typo only |
| "Add validation to email field" | Add validation + phone validation + address validation | Add email validation only |
| "Update button color" | Update color + refactor CSS + add dark mode | Update button color only |
| "Fix login bug" | Fix bug + refactor auth + add logging + improve error handling | Fix bug only |

### Mandatory Subagent Rule

Add to ALL subagent prompts:
```
SCOPE CONTROL MANDATORY:
- Execute EXACTLY what is specified
- Do NOT add improvements not requested
- Do NOT refactor adjacent code
- Do NOT add tests unless explicitly asked
- Suggestions for additional work go in FINAL REPORT, NOT in implementation

VIOLATION = Task FAILED
```
