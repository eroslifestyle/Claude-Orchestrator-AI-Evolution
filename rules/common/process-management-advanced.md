# Process Management Rules - Advanced

> **ADVANCED RULES (51-100)** - Testing, Resources, Trees, Timeouts, Health, Config.
> Budget: ~200 righe
>
> Per regole fondamentali (1-50), vedere `process-management-core.md`

---

## Testing Requirements (Rules 51-58)

51. **Test cleanup on normal exit** - verify all processes terminated
52. **Test cleanup on exception** - simulate failure, verify cleanup
53. **Test cleanup on SIGTERM** - send signal, verify graceful shutdown
54. **Test cleanup on SIGKILL** - simulate crash, verify Job Object cleanup (Windows)
55. **Test concurrent spawns** - verify thread safety under load
56. **Test timeout handling** - spawn long-running process, verify termination
57. **Test orphan detection** - verify metrics alert on leaked processes
58. Include process tests in CI pipeline - cleanup bugs are critical

```python
def test_cleanup_on_exception():
    pm = ProcessManager.instance()
    try:
        with pm.spawn(["python", "-c", "import time; time.sleep(60)"]) as proc:
            pid = proc.pid
            raise RuntimeError("Simulated failure")
    except RuntimeError:
        pass
    assert pid not in pm.active_pids()
```

## Resource Limits (Rules 59-64)

59. **Set maximum active processes** - default 100, configurable per deployment
60. **Reject spawn requests** when limit reached - fail fast, don't queue
61. **Set per-process timeouts** - default 5 minutes, override per-call
62. **Set per-process memory limits** - use cgroups (Linux) or Job Objects (Windows)
63. **Set per-process CPU limits** - prevent runaway CPU consumption
64. Log resource limit violations for capacity planning

## Process Tree Handling (Rules 65-70)

65. **Track process trees** - not just parent, but all descendants
66. **Use process groups** on Unix for tree-wide termination (`os.setpgid`)
67. **Use Job Objects** on Windows for tree-wide termination
68. **Log process tree** before and after spawn for debugging
69. **Handle disowned processes** - children that detach from parent
70. Test with processes that spawn their own children

```python
def spawn_with_process_group(command):
    proc = ProcessManager.instance().spawn(
        command,
        start_new_session=True,
        preexec_fn=os.setsid if os.name != 'nt' else None
    )
    return proc
```

## Timeout Enforcement (Rules 71-76)

71. **Always set timeouts** - no process runs forever
72. Default timeout: 300 seconds (5 minutes)
73. Override timeout per-call for long-running operations
74. Timeout triggers escalation sequence (terminate -> kill -> taskkill)
75. Log timeout events with process details for debugging
76. Track timeout frequency in metrics - high rate indicates problems

## Health Monitoring (Rules 77-82)

77. **Implement health check** method on ProcessManager
78. Health check verifies: cleanup handlers registered, process limits OK, no zombies
79. **Detect zombie processes** - completed but not reaped
80. **Detect orphan processes** - running without parent tracking
81. Log health check results periodically (every 60 seconds)
82. Expose health status for orchestration/monitoring systems

## Configuration (Rules 83-88)

83. **Make all limits configurable** - max processes, timeouts, cleanup intervals
84. Use environment variables for deployment-specific settings
85. Provide sensible defaults - works out of box, tunable for scale
86. Validate configuration at startup - fail fast on invalid settings
87. Document all configuration options with examples
88. Log effective configuration at startup for debugging

```python
class ProcessManagerConfig:
    MAX_PROCESSES = int(os.getenv("PM_MAX_PROCESSES", "100"))
    DEFAULT_TIMEOUT = int(os.getenv("PM_DEFAULT_TIMEOUT", "300"))
    CLEANUP_INTERVAL = int(os.getenv("PM_CLEANUP_INTERVAL", "60"))
    GRACEFUL_TIMEOUT = int(os.getenv("PM_GRACEFUL_TIMEOUT", "5"))
```

## Integration Requirements (Rules 89-94)

89. **Import ProcessManager** from centralized location - no local copies
90. **Initialize ProcessManager** at application startup, before any process spawning
91. **Call cleanup** at application shutdown, after all work complete
92. Handle ProcessManager initialization failure as fatal error
93. Document ProcessManager integration in component README
94. Version-check ProcessManager API - fail on incompatible versions

## Error Reporting (Rules 95-100)

95. **Report all cleanup failures** as CRITICAL - orphaned processes are bugs
96. Include process details in error reports: PID, command, spawn time, parent
97. Differentiate: spawn failures vs cleanup failures vs timeout failures
98. Aggregate error metrics for trend analysis
99. Alert on repeated cleanup failures - indicates systemic issue
100. Never silently ignore cleanup failures - always log at minimum

```python
def report_cleanup_failure(proc, error):
    error_report = {
        "level": "CRITICAL",
        "event": "process_cleanup_failure",
        "pid": proc.pid,
        "command": proc.args,
        "error": str(error),
        "instance_id": ProcessManager.instance().instance_id
    }
    logger.critical(error_report)
    alerting.report(error_report)
```

---

**Vedi anche:** `process-management-core.md` per Rules 1-50 (Spawning, Context, Cleanup, Windows, Thread Safety, Logging, Escalation, Isolation)
