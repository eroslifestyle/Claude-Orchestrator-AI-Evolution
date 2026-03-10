# Automated Testing Documentation

> Automated routing validation for the Claude Code multi-agent system

---

## Overview

This document describes the automated testing infrastructure for validating the agent routing table integrity and related system components.

---

## Test Runner Script

### Location

```
C:\Users\LeoDg\.claude\agents\tests\run-routing-tests.sh
```

### Purpose

Automated validation of:
1. Agent file existence
2. Keyword uniqueness in routing table
3. L2 to L1 parent mapping
4. Routing table completeness
5. Model assignment conventions

### Usage

```bash
# Run from .claude directory
cd C:\Users\LeoDg\.claude
bash agents/tests/run-routing-tests.sh
```

### Output

The script generates a JSON report at:
```
agents/tests/results/routing-test-report.json
```

Example output:
```json
{
  "timestamp": "2026-02-26T12:00:00Z",
  "tests": 50,
  "passed": 50,
  "failed": 0,
  "status": "PASS",
  "errors": [],
  "details": {
    "agent_existence": "completed",
    "keyword_uniqueness": "completed",
    "l2_parent_mapping": "completed",
    "routing_completeness": "completed",
    "model_assignment": "completed"
  },
  "version": "1.0.0",
  "source": "agents/tests/routing-validation.md"
}
```

---

## Scheduled Execution

### Option 1: Windows Task Scheduler

For Windows systems, use Task Scheduler for automated execution.

#### Daily Execution Setup

1. Open Task Scheduler (`taskschd.msc`)
2. Create Basic Task:
   - Name: `Claude Routing Validation`
   - Trigger: Daily at 06:00 AM
   - Action: Start a program
   - Program: `bash`
   - Arguments: `C:\Users\LeoDg\.claude\agents\tests\run-routing-tests.sh`
   - Start in: `C:\Users\LeoDg\.claude`

#### PowerShell Setup Script

```powershell
# Create daily task
$action = New-ScheduledTaskAction -Execute "bash" -Argument "agents/tests/run-routing-tests.sh" -WorkingDirectory "C:\Users\LeoDg\.claude"
$trigger = New-ScheduledTaskTrigger -Daily -At 6am
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd
Register-ScheduledTask -TaskName "ClaudeRoutingValidation" -Action $action -Trigger $trigger -Settings $settings -User "$env:USERNAME"
```

### Option 2: Cron Job (Git Bash / WSL)

For Unix-like environments or Git Bash on Windows.

#### Daily Execution

```cron
# Run routing validation daily at 6:00 AM
0 6 * * * /c/Users/LeoDg/.claude/agents/tests/run-routing-tests.sh >> /c/Users/LeoDg/.claude/agents/tests/results/cron.log 2>&1
```

#### Weekly Execution (Full Audit)

```cron
# Run full routing validation weekly on Sunday at 2:00 AM
0 2 * * 0 /c/Users/LeoDg/.claude/agents/tests/run-routing-tests.sh >> /c/Users/LeoDg/.claude/agents/tests/results/weekly-audit.log 2>&1
```

### Option 3: Git Pre-Commit Hook

Run validation before commits that affect routing configuration.

```bash
# .git/hooks/pre-commit
#!/bin/bash

# Check if routing-related files changed
if git diff --cached --name-only | grep -qE "(orchestrator|routing|agents/)"; then
    echo "Running routing validation..."
    bash agents/tests/run-routing-tests.sh
    if [ $? -ne 0 ]; then
        echo "ERROR: Routing validation failed. Commit aborted."
        exit 1
    fi
fi
exit 0
```

---

## Test Categories

### Test 1: Agent Existence

Validates that every agent referenced in the routing table has a corresponding `.md` file.

- **Source:** `agents/tests/routing-validation.md` (Test 1)
- **Check:** 50 routing entries
- **Pass Condition:** All agent files exist

### Test 2: Keyword Uniqueness

Ensures no duplicate keywords exist across routing entries.

- **Source:** Orchestrator SKILL.md routing table
- **Check:** All keywords parsed and checked for duplicates
- **Pass Condition:** 0 duplicates found

### Test 3: L2 Parent Mapping

Verifies all L2 specialists have valid L1 parent agents.

- **Source:** L2 -> L1 mapping table in orchestrator SKILL.md
- **Check:** 15 L2 specialists
- **Pass Condition:** All parent files exist

### Test 4: Routing Completeness

Confirms all defined agents have routing entries.

- **Source:** `agents/INDEX.md` + orchestrator routing table
- **Check:** Core (4) + L1 (22) + L2 (15)
- **Pass Condition:** All agents have routing entries

### Test 5: Model Assignment

Validates model assignments follow documented conventions.

- **Conventions:**
  - Analyzer, Documenter, DevOps -> `haiku`
  - Architect -> `opus`
  - Most others -> `inherit`
- **Pass Condition:** All assignments match conventions

---

## Monitoring and Alerts

### Log Files

| Log File | Purpose | Rotation |
|----------|---------|----------|
| `results/cron.log` | Daily cron output | 7 days |
| `results/weekly-audit.log` | Weekly audit results | 30 days |
| `results/routing-test-report.json` | Latest JSON report | Overwritten |

### Alert Integration

The script returns:
- Exit code `0` = All tests passed
- Exit code `1` = One or more tests failed

This can be integrated with:
- Windows Task Scheduler email notifications
- Custom monitoring scripts
- CI/CD pipelines

### Notification Script Example

```bash
#!/bin/bash
# notify-on-failure.sh

bash agents/tests/run-routing-tests.sh
if [ $? -ne 0 ]; then
    echo "Routing validation FAILED at $(date)" | mail -s "Claude Routing Alert" user@example.com
fi
```

---

## CI/CD Integration

### GitHub Actions

```yaml
name: Routing Validation

on:
  push:
    paths:
      - 'agents/**'
      - 'skills/orchestrator/**'
  pull_request:
    paths:
      - 'agents/**'
      - 'skills/orchestrator/**'
  schedule:
    - cron: '0 6 * * *'  # Daily at 6 AM UTC

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Routing Validation
        run: bash agents/tests/run-routing-tests.sh
      - name: Upload Report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: routing-report
          path: agents/tests/results/routing-test-report.json
```

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| `bash: command not found` | Bash not in PATH | Use Git Bash or WSL |
| `Permission denied` | Script not executable | `chmod +x run-routing-tests.sh` |
| `SKILL.md not found` | Wrong working directory | Run from `.claude` directory |
| `NUL file creation` | Windows redirection issue | Use `2>/dev/null` in Git Bash |

### Debug Mode

```bash
# Run with verbose output
bash -x agents/tests/run-routing-tests.sh
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-26 | Initial automated testing documentation |

---

## Related Files

- `agents/tests/routing-validation.md` - Manual test specification
- `agents/tests/run-routing-tests.sh` - Test runner script
- `skills/orchestrator/SKILL.md` - Routing table source
- `agents/INDEX.md` - Agent definitions

---

**Generated:** 2026-02-26
**Maintained by:** System Coordinator Agent
