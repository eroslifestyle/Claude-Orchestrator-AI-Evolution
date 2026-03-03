---
name: verification-loop
description: Verify that code changes satisfy the original request. Run after implementation to catch issues before delivery.
user-invokable: true
allowed-tools: Read, Grep, Glob, Bash, Task
metadata:
  keywords: [verify, validation, check, quality]
---

# Verification Loop

Systematic verification that code changes satisfy the original request. Run after implementation, before delivery.

## When to Use

- After completing a code implementation task
- Before marking a task as SUCCESS
- When user asks to verify or double-check changes
- NOT for research/analysis tasks (no code to verify)

## Algorithm

1. **Collect inputs:**
   - Original user request (what was asked)
   - List of modified/created files
   - Expected behavior or acceptance criteria

2. **Run verification checks** (in parallel where possible):

   **Check 1 - Syntax/Lint:**
   - Python: `python -m py_compile {file}` for each .py file
   - TypeScript/JS: `npx tsc --noEmit` or `npx eslint {file}` if available
   - Other: language-appropriate linter
   - PASS if zero errors, WARN if only warnings

   **Check 2 - Tests:**
   - Detect test framework (pytest, jest, vitest, etc.)
   - Run relevant tests: `pytest {test_file}` or `npm test`
   - PASS if all tests green, FAIL if any red

   **Check 3 - Request Match:**
   - Read each modified file
   - Compare changes against original request
   - Verify all requested features/fixes are present
   - PASS if all requirements addressed

   **Check 4 - Regression Scan:**
   - Grep for TODO, FIXME, HACK added in this session
   - Check for commented-out code blocks
   - Look for hardcoded values that should be configurable
   - WARN if any found

3. **Report results:**

   ```
   ## Verification Report

   | Check          | Status | Details              |
   |----------------|--------|----------------------|
   | Syntax/Lint    | PASS   | 0 errors, 0 warnings |
   | Tests          | PASS   | 12/12 passed         |
   | Request Match  | PASS   | All 3 requirements met |
   | Regression     | WARN   | 1 TODO found         |

   Overall: PASS (with warnings)
   ```

4. **If issues found (iteration 1):**
   - Report issues clearly with file + line number
   - Suggest specific fixes
   - Apply fixes if straightforward
   - Re-run failed checks only

5. **If issues persist (iteration 2):**
   - Escalate to user with full report
   - Do NOT enter infinite fix loop
   - Max 2 iterations then stop

## Skip Conditions

- Task is research/analysis only (no code changes)
- Task is documentation only
- User explicitly says "skip verification"
