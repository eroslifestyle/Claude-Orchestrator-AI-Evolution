---
name: tdd-workflow
description: Guide Test-Driven Development workflow. Write tests first, then implement, then refactor. Use /tdd for TDD methodology.
user-invokable: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Task
metadata:
  keywords: [tdd, test-driven, development, workflow]
---

# TDD Workflow Skill - Test-Driven Development

## Purpose

Implement features using strict TDD methodology: write a failing test first,
implement the minimum code to pass, then refactor while keeping tests green.

## Trigger

User invokes `/tdd <requirement description>` or orchestrator delegates TDD tasks.

## Algorithm

### Phase 1: RED (Write Failing Test)

1. **ANALYZE** the requirement to identify testable behaviors
2. **DELEGATE** test writing to Tester Expert via Task tool:
   - Write test(s) that define the expected behavior
   - Use existing test patterns/framework found in the project
   - Tests MUST be specific, isolated, and deterministic
3. **RUN** tests via Bash to confirm they FAIL (this is expected)
4. **REPORT** RED status with test output

### Phase 2: GREEN (Make Tests Pass)

5. **DELEGATE** implementation to Coder agent via Task tool:
   - Write the MINIMUM code to make the failing test(s) pass
   - No premature optimization or extra features
   - Follow existing code patterns in the project
6. **RUN** tests via Bash to confirm they PASS
7. **REPORT** GREEN status with test output
8. If tests still fail, iterate steps 5-7 (max 3 attempts)

### Phase 3: REFACTOR (Clean Up)

9. **DELEGATE** refactoring to Coder agent via Task tool:
   - Remove duplication
   - Improve naming and readability
   - Extract functions if needed (max 30 lines per function)
   - Ensure type hints and docstrings are present
10. **RUN** tests via Bash to confirm they still PASS
11. **REPORT** REFACTOR status with test output

### Completion

12. **PRESENT** final summary with all three phases

## Output Format at Each Phase

```
## TDD Cycle: <requirement>

### [RED] Failing Test
- File: <test file path>
- Test: <test function name>
- Result: FAIL (expected)
- Output: <relevant error output>

### [GREEN] Implementation
- File: <implementation file path>
- Changes: <brief description>
- Result: PASS
- Output: <test pass output>

### [REFACTOR] Cleanup
- Changes: <what was refactored>
- Result: PASS (tests still green)
- Output: <test pass output>
```

## Rules

- NEVER skip the RED phase - always start with a failing test
- NEVER write more code than needed to pass the test in GREEN phase
- NEVER refactor if tests are not green
- If tests cannot be run (no test framework), install it first
- Detect test framework from project: pytest, jest, vitest, go test, cargo test, etc.
- Each TDD cycle handles ONE behavior - repeat for multiple behaviors
- Show test output at every phase transition
- If a test is flaky (passes/fails inconsistently), fix the test first

## Test Framework Detection

Check in order:
1. `pytest.ini` / `pyproject.toml [tool.pytest]` / `conftest.py` -> pytest
2. `jest.config.*` / `package.json "jest"` -> jest
3. `vitest.config.*` -> vitest
4. `Cargo.toml` -> cargo test
5. `go.mod` -> go test
6. `Makefile` with test target -> make test
7. Fallback: ask user which test command to use
