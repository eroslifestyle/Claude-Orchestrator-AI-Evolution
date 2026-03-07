---
name: build-fix
description: Diagnose and fix build errors automatically. Use /build-fix when compilation or build fails.
user-invokable: true
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Task
metadata:
  keywords: [build, fix, compile, error]
---

# Build Fix Skill - Automated Build Error Resolution

## Purpose

Detect the project's build system, run the build, parse errors,
and automatically fix them in an iterative loop until the build succeeds.

## Trigger

User invokes `/build-fix [command]` or orchestrator delegates build-fix tasks.
- `[command]`: optional override for build command (e.g., `npm run build`)
- If omitted, auto-detects build system

## Algorithm

### Step 1: DETECT Build System

Detect in priority order via Glob/Read:

| File | Build Command |
|------|---------------|
| `package.json` (scripts.build) | `npm run build` or `yarn build` |
| `Makefile` | `make` |
| `pyproject.toml` (build-system) | `python -m build` or `pip install -e .` |
| `Cargo.toml` | `cargo build` |
| `go.mod` | `go build ./...` |
| `CMakeLists.txt` | `cmake --build build/` |
| `build.gradle` | `./gradlew build` |
| `pom.xml` | `mvn compile` |

If none found, ask user for build command.

### Step 2: RUN Build (Iteration Loop)

```
iteration = 0
MAX_ITERATIONS = 3

while iteration < MAX_ITERATIONS:
    iteration += 1

    1. RUN build command via Bash (capture stdout + stderr)
    2. IF build succeeds -> REPORT SUCCESS, exit loop
    3. PARSE errors from output (see Error Parsing below)
    4. For each error (all independent fixes in parallel):
       a. READ the file at error location
       b. DETERMINE fix type
       c. APPLY fix via Edit
    5. Continue loop (re-run build)

IF iteration == MAX_ITERATIONS and still failing:
    REPORT remaining errors to user
```

### Step 3: REPORT Results

## Error Parsing Patterns

### TypeScript/JavaScript
```
Pattern: ^(.+)\((\d+),(\d+)\): error (TS\d+): (.+)$
         ^(.+):(\d+):(\d+): error: (.+)$
Extract: file, line, column, error_code, message
```

### Python
```
Pattern: ^  File "(.+)", line (\d+)
         ^(\w+Error): (.+)$
         ^SyntaxError: (.+) \((.+), line (\d+)\)
Extract: file, line, error_type, message
```

### Rust
```
Pattern: ^error\[E(\d+)\]: (.+)
         ^\s+--> (.+):(\d+):(\d+)
Extract: error_code, message, file, line, column
```

### Go
```
Pattern: ^(.+):(\d+):(\d+): (.+)$
Extract: file, line, column, message
```

### Generic (fallback)
```
Pattern: ^(.+):(\d+).*(?:error|Error|ERROR).*: (.+)$
Extract: file, line, message
```

## Common Fix Strategies

| Error Type | Fix Strategy |
|------------|-------------|
| Missing import | Add the import statement |
| Type mismatch | Adjust type annotation or cast |
| Undefined variable | Check for typo, add declaration |
| Missing module | Check package.json/requirements.txt, suggest install |
| Syntax error | Read context, fix syntax |
| Missing return | Add return statement |
| Unused variable | Remove or prefix with underscore |
| Missing dependency | Run install command |
| Missing file | Check if renamed/moved, update import path |

## Output Format

```markdown
# Build Fix Report

## Build System
- Detected: <system name>
- Command: `<build command>`

## Iterations

### Iteration 1
- Errors found: <N>
- Errors fixed: <M>
| File | Line | Error | Fix Applied |
|------|------|-------|-------------|
| src/main.ts | 42 | TS2304: Cannot find name 'Foo' | Added import { Foo } from './types' |

### Iteration 2
- Errors found: <N>
- Errors fixed: <M>
...

## Final Status
- Result: SUCCESS / PARTIAL / FAILED
- Build clean: YES / NO
- Remaining errors: <N> (if any, list them)
```

## Rules

- Maximum 3 build-fix iterations to prevent infinite loops
- ALWAYS capture both stdout and stderr from build command
- Fix errors in order: syntax errors first, then type errors, then logic errors
- If a fix introduces new errors, revert that specific fix
- NEVER modify test files to fix build errors (unless the test itself has a syntax error)
- If build requires install step first (e.g., npm install), run it before building
- Report the exact build command used so user can reproduce
- Timeout: 120 seconds per build attempt (kill if exceeds)
