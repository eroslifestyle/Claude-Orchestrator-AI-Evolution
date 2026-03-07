---
name: refactor-clean
description: Clean up dead code, unused imports, and improve code organization. Use /refactor for automated cleanup.
user-invokable: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Task
metadata:
  keywords: [refactor, clean, code, improve]
---

# Refactor Clean Skill - Automated Code Cleanup

## Purpose

Identify and clean up dead code, unused imports, overly long functions,
duplicated blocks, and other code quality issues in a codebase.

## Trigger

User invokes `/refactor [path] [--auto]` or orchestrator delegates cleanup tasks.
- `[path]`: optional, limits scope to specific directory or file
- `[--auto]`: skip confirmation, apply all changes immediately

## Algorithm

### Phase 1: SCAN (Read-Only Analysis)

1. **DISCOVER** project files via Glob (filter by language)
2. **SCAN** for issues in parallel using Grep and Read:

   **a) Unused Imports**
   - Grep for import statements
   - Grep for usage of each imported name in the same file
   - Flag imports where the name is never referenced after import

   **b) Dead Code**
   - Functions/methods never called anywhere in the project
   - Unreachable code after return/break/continue/raise
   - Variables assigned but never read

   **c) Commented-Out Code**
   - Blocks of 3+ consecutive commented lines that look like code
   - Pattern: `#\s*(def |class |if |for |while |return |import )`

   **d) Long Functions**
   - Functions exceeding 50 lines (candidates for splitting)
   - Read function to understand logical sections

   **e) Code Duplication**
   - Grep for identical or near-identical blocks (5+ lines)
   - Identify extraction candidates

3. **DELEGATE** deep analysis to Languages Refactor Specialist L2 via Task tool

### Phase 2: PROPOSE (Present Changes)

4. **BUILD** changes table:

```markdown
## Proposed Changes

| # | File | Line | Issue | Action | Impact |
|---|------|------|-------|--------|--------|
| 1 | src/utils.py | 3 | Unused import: os | REMOVE import | None |
| 2 | src/handler.py | 45-120 | Function too long (75 lines) | SPLIT into 3 functions | Low |
| 3 | src/old.py | 1-50 | Entire file unused | DELETE file | None |
```

5. **PRESENT** table to user for review

### Phase 3: APPLY (Execute Changes)

6. **CHECK** for `--auto` flag or wait for user confirmation
7. **APPLY** changes via Edit tool (all independent edits in parallel)
8. **RUN** tests via Bash to verify no regressions
9. **REPORT** results

## Output Format

```markdown
# Refactor Report

## Scan Results
- Files scanned: <N>
- Issues found: <N>
- Auto-fixable: <N>
- Needs manual review: <N>

## Proposed Changes
<changes table from Phase 2>

## Applied Changes
| # | Status | Notes |
|---|--------|-------|
| 1 | APPLIED | Removed unused import |
| 2 | APPLIED | Split into process_input(), validate(), format_output() |
| 3 | SKIPPED | User declined |

## Test Results
- Command: <test command>
- Result: PASS / FAIL
- Details: <if fail, show which tests broke>
```

## Issue Detection Patterns by Language

### Python
- Unused imports: `^(import |from .* import )` then check usage
- Dead functions: `^def \w+` then grep for calls
- Long functions: count lines between `def` and next `def`/class/EOF

### JavaScript/TypeScript
- Unused imports: `^import ` then check usage
- Dead exports: `^export (function|const|class)` then check imports
- Long functions: count lines in function body

### Go
- Unused imports: compiler will flag these (run `go build`)
- Dead functions: unexported functions never called locally

## Rules

- NEVER apply changes without showing the proposal table first (unless --auto)
- ALWAYS run tests after applying changes
- If tests fail after changes, REVERT the last batch and report
- Group related changes (e.g., removing an import + removing the function that used it)
- Preserve all comments that are actual documentation (not commented-out code)
- Do NOT refactor test files unless explicitly requested
- Do NOT change public API signatures (function names, parameters) without flagging
- Maximum batch size: 20 changes per cycle (to keep diffs reviewable)
