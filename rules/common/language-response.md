# Language Response Rules

> **MANDATORY**: All orchestrator responses, skills, and agents MUST respond in the user's language and OS language.
> **CRITICAL**: This rule OVERRIDES all other communication preferences.

---

## Core Principle

**DETECT -> ADAPT -> RESPOND**

1. **DETECT** the system language from:
   - OS locale (Windows: registry, Linux/Mac: LANG, LC_ALL)
   - User messages language
   - Project context language

2. **ADAPT** all responses to match:
   - Same language as user input
   - Same language as OS locale
   - Consistent terminology throughout session

3. **RESPOND** exclusively in that language:
   - No mixed languages in responses
   - No fallback to English unless user explicitly requests it
   - Technical terms may remain in English when no translation exists

---

## Rules

### Rule 1: Language Detection Priority

**Priority order for language detection:**
1. **User message language** (highest priority) - Match the language the user writes in
2. **OS locale language** - Windows registry / Linux environment variables
3. **Project context** - Existing project documentation language
4. **Default: English** - Only if none of the above are detected

### Rule 2: Response Language Lock

**Once language is detected, ALL responses must be in that language:**
- Orchestrator task tables
- Subagent outputs
- Skill responses
- Error messages
- Code comments (when adding new comments)
- Documentation (when creating/updating docs)

### Rule 3: Technical Terminology

**Technical terms may remain in English when:**
- No commonly accepted translation exists
- The English term is more precise/clear
- API/library names and function names
- Code symbols and identifiers
- Error codes and log messages

**However, explanations MUST still be in the detected language.**

### Rule 4: Code Itself

**Code content (variables, functions, logic) is NOT affected by this rule.**
- Code remains in whatever language it was written
- Only comments and documentation adapt to user language
- Commit messages follow the user language

### Rule 5: Mixed Language Requests

**If user explicitly requests a different language:**
- Honor that request for that specific response
- Return to detected language for subsequent responses
- Log the language switch temporarily

---

## Implementation

### For Orchestrator

```markdown
## STEP 0: LANGUAGE DETECTION (NEW - Before Step 1)

Before starting any task, detect the response language:

1. Check user message language
2. Check OS locale:
   - Windows: `powershell -Command "[Console]::OutputEncoding.OutputEncoding]; [Console]::OutputEncoding] | Select-Object -ExpandProperty Registry::User -Name "languages" | Get-Item -ErrorAction SilentlyContinue`

   - Linux/Mac: `echo $LANG` or `locale`
3. Store as RESPONSE_LANG for entire session
4. All task tables, subagent prompts, and outputs must use RESPONSE_LANG
```

### For Subagents

All subagents receive in their prompt:
```
EXECUTION RULES:
...
5. LANGUAGE: All responses MUST be in {RESPONSE_LANG}. No exceptions.
   - Task tables in {RESPONSE_LANG}
   - Explanations in {RESPONSE_LANG}
   - Error messages in {RESPONSE_LANG}
```

### For Skills

Skills that produce output must:
- Detect language from context or default to OS locale
- Generate all user-facing content in that language
- Internal skill logic may use English for technical operations

---

## Examples

### Italian System (detected)
```
# User: "analizza questo codice"
# Response:
| # | Task | Agent | Model | Mode | Status |
|---|------|-------|-------|------|--------|
| 1 | Analizzare codice | Analyzer | haiku | SUBAGENT | PENDING |
```

### English System (detected)
```
# User: "analyze this code"
# Response:
| # | Task | Agent | Model | Mode | Status |
|---|------|-------|-------|------|--------|
| 1 | Analyze code | Analyzer | haiku | SUBAGENT | PENDING |
```

### Mixed Request (user switches language)
```
# Previous: Italian detected
# User: "now explain in English"
# Response: [Switch to English for this explanation only]
# Then return to Italian for subsequent responses
```

---

## Validation

**A response is NON-COMPLIANT if:**
- Language differs from detected RESPONSE_LANG
- Mixed languages in a single response (without explicit user request)
- Technical explanations in wrong language

---

**Version:** 1.0.0
**Last Updated:** 2026-03-03
**Author:** System Rule
