# Process Management Rules - Core

> **CORE RULES (1-50)** - Fondamentali per ogni implementazione.
> Budget: ~200 righe (within 150 max con compressione)
>
> Per regole avanzate (51-100), vedere `process-management-advanced.md`

---

## Centralized Process Spawning (Rules 1-10)

1. **NEVER use `subprocess.Popen`, `subprocess.run`, or `subprocess.call` directly** - always use ProcessManager
2. **NEVER use `os.system`, `os.spawn*`, or `os.exec*`** - always use ProcessManager
3. **NEVER use `multiprocessing.Process` directly** - always use ProcessManager wrapper
4. **NEVER use `asyncio.create_subprocess_*` directly** - always use ProcessManager async methods
5. All process creation MUST go through `ProcessManager.spawn()` or equivalent method
6. Direct subprocess usage bypasses cleanup guarantees - VIOLATION = code rejected
7. ProcessManager provides: tracking, cleanup, timeouts, and resource limits
8. No exceptions for "quick scripts" or "one-off commands" - use ProcessManager always
9. Legacy code MUST be migrated to ProcessManager before any other changes
10. If ProcessManager is unavailable, fail explicitly - do NOT fall back to subprocess

```python
# WRONG - Direct subprocess (NEVER DO THIS)
process = subprocess.Popen(["python", "script.py"])

# CORRECT - Use ProcessManager
with process_manager.spawn(["python", "script.py"]) as process:
    process.wait()
```

## Context Manager Pattern (Rules 11-16)

11. **ALWAYS use context manager pattern** for process lifecycle (`with` statement)
12. Context managers guarantee cleanup even on exceptions
13. Never hold process references outside context manager scope
14. Nested context managers for dependent processes - innermost exits first
15. Context manager MUST implement `__enter__` and `__exit__` with proper cleanup
16. `__exit__` MUST terminate process if still running - no orphans allowed

```python
# CORRECT - Context manager ensures cleanup
with ProcessManager.instance().spawn(command) as proc:
    result = proc.communicate(timeout=30)
# Process guaranteed terminated here
```

## Cleanup Handler Registration (Rules 17-22)

17. **ALWAYS register cleanup handlers** via `atexit` and signal handlers
18. Register handlers at ProcessManager initialization, not per-process
19. Handle SIGTERM, SIGINT, and SIGHUP for graceful shutdown
20. Cleanup handlers MUST iterate all tracked processes and terminate them
21. Cleanup timeout: 5 seconds for graceful, then force kill
22. Log cleanup actions for debugging orphaned process issues

## Windows Job Objects (Rules 23-28)

23. **Windows: MUST use Job Objects** for guaranteed process tree cleanup
24. Job Objects kill entire process tree including child processes
25. Assign each spawned process to a Job Object with `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`
26. Job Objects work even if parent process crashes
27. Test Job Object cleanup with forced parent termination
28. Document Windows-specific cleanup in cross-platform code

```python
# Windows Job Object pattern
JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x2000

def create_job_object():
    job = kernel32.CreateJobObjectW(None, None)
    info.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
    kernel32.SetInformationJobObject(job, 2, ctypes.byref(info), ctypes.sizeof(info))
    return job

def spawn_in_job(job, command):
    proc = ProcessManager.instance().spawn(command)  # Use ProcessManager!
    kernel32.AssignProcessToJobObject(job, int(proc._handle))
    return proc
```

## Thread Safety (Rules 29-34)

29. **Process registry MUST be thread-safe** - use locks for all mutations
30. Use `threading.RLock` for re-entrant locking in nested calls
31. Read operations MAY use lock-free patterns if data structure supports it
32. Process spawn, terminate, and cleanup MUST acquire lock
33. Avoid deadlocks: never hold process lock while waiting on process I/O
34. Document thread-safety guarantees in ProcessManager docstring

```python
class ProcessManager:
    def __init__(self):
        self._lock = threading.RLock()
        self._processes = {}

    def spawn(self, command):
        with self._lock:
            proc = ProcessManager.instance().spawn(command)
            self._processes[proc.pid] = proc
            return proc
```

## Metrics and Logging (Rules 35-40)

35. **Log all process lifecycle events**: spawn, terminate, kill, timeout, cleanup
36. Include in logs: PID, command, timestamp, duration, exit code, parent context
37. Track metrics: active count, total spawned, cleanup successes/failures
38. Alert on anomalies: >50 active processes, cleanup failures, zombie detection
39. Use structured logging (JSON) for process events - easier to parse
40. Log cleanup attempts even if process already terminated

## Error Handling Escalation (Rules 41-46)

41. **Use escalation sequence**: terminate -> wait(3s) -> kill -> wait(2s) -> taskkill (Windows)
42. Never skip steps in escalation - graceful first, then force
43. Log each escalation step with reason and timestamp
44. On Windows, use `taskkill /F /T /PID <pid>` for stubborn processes
45. On Unix, use `kill -9` only after `kill -15` fails
46. Report unkillable processes as CRITICAL errors - may indicate system issue

## Instance Isolation (Rules 47-50)

47. **Use singleton pattern** for ProcessManager - one instance per process
48. Different orchestrator instances MUST use different ProcessManager instances
49. Include instance ID in process metadata for debugging conflicts
50. Never share ProcessManager instances across unrelated components

```python
class ProcessManager:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._instance_id = str(uuid.uuid4())[:8]
        return cls._instance
```

---

**Vedi anche:** `process-management-advanced.md` per Rules 51-100 (Testing, Resources, Trees, Timeouts, Health, Config, Integration, Errors)
