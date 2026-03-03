# ProcessManager Documentation

## Overview

ProcessManager is a Windows-specific process lifecycle manager that guarantees NO orphan processes through Windows Job Objects and comprehensive signal handling.

## Architecture

### Class Structure

```
ProcessManager (Singleton)
├── ProcessInfo (Data Class)
├── ProcessManagerMetrics (Data Class)
├── ProcessManagerError (Exception)
└── Helper Functions
    ├── health_check()
    ├── _setup_job_object()
    ├── _setup_signal_handlers()
    └── _escalate_termination()
```

### Key Components

1. **Centralized Process Registry**
   - Thread-safe dictionary tracking all spawned processes
   - Stores PID, name, command, parent PID, spawn time, process handle
   - Protected by threading.Lock

2. **Windows Job Objects**
   - Creates Job Object with `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE` flag
   - When parent process dies, ALL child processes are automatically terminated by Windows
   - Fallback to psutil for process tree termination

3. **Context Manager Support**
   ```python
   with ProcessManager() as pm:
       proc = pm.spawn(['python', 'script.py'])
       # Auto-cleanup on exit
   ```

4. **Signal Handlers**
   - SIGTERM, SIGINT, SIGABRT handlers
   - atexit registration for normal exit
   - Windows console control handler (Ctrl+C, close button)

5. **Instance Isolation**
   - Unique instance ID (UUID)
   - Lock file to prevent multiple managers
   - Located in TEMP directory

6. **Error Recovery**
   - Escalation: terminate -> kill -> taskkill
   - Comprehensive logging
   - Metrics collection (spawned, terminated, failed, zombies)

## Public API

### ProcessManager Methods

- `spawn(command: List[str], **kwargs) -> subprocess.Popen`
  - Spawn and track a new process
  - Returns Popen object
  - Raises ProcessSpawnError on failure

- `terminate_all(timeout: float = 10.0) -> Dict[int, bool]`
  - Terminate all tracked processes
  - Returns dict mapping PID to success status

- `terminate_process(pid: int, timeout: float = 10.0) -> bool`
  - Terminate specific process by PID
  - Returns True if successful

- `get_process_info(pid: int) -> Optional[ProcessInfo]`
  - Get information about a registered process

- `list_processes() -> List[ProcessInfo]`
  - List all registered processes

- `is_process_alive(pid: int) -> bool`
  - Check if a registered process is still running

- `get_metrics() -> Dict[str, int]`
  - Get current metrics

### Utility Functions

- `health_check() -> Dict[str, Any]`
  - Health check endpoint for orchestrator

## Integration Points for Orchestrator

### 1. Direct Usage
```python
from process_manager import ProcessManager

pm = ProcessManager()
proc = pm.spawn(['python', 'script.py'])
# ... work ...
pm.terminate_all()
```

### 2. Context Manager (Recommended)
```python
from process_manager import ProcessManager

with ProcessManager() as pm:
    proc = pm.spawn(['python', 'task.py'])
    # Auto-cleanup guaranteed
```

### 3. Metrics Collection
```python
metrics = pm.get_metrics()
# Returns: {
#   'total_spawned': N,
#   'total_terminated': N,
#   'active_processes': N,
#   'failed_terminations': N,
#   'zombie_processes': N
# }
```

### 4. Health Monitoring
```python
from process_manager import health_check

status = health_check()
# Returns: {
#   'status': 'active',
#   'healthy': True,
#   'active_processes': N,
#   'job_object_active': True,
#   'instance_id': 'UUID',
#   'metrics': {...}
# }
```

## Windows-Specific Implementation

### Job Objects

- Created via `CreateJobObjectW()` Win32 API
- Configured with `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE` flag
- Processes assigned via `AssignProcessToJobObject()`
- Automatic termination when job handle closes (parent dies)

### Console Control Handler

- Handles Ctrl+C, close button, logoff, shutdown events
- Registered via `SetConsoleCtrlHandler()` Win32 API
- Triggers cleanup on all termination signals

### Escalation Strategy

1. **terminate()**: Graceful termination (SIGTERM equivalent)
2. **kill()**: Forceful termination (SIGKILL equivalent)
3. **taskkill**: Windows nuclear option (guaranteed kill)

## Error Handling

- All errors logged with context
- Exceptions raised for critical failures
- Metrics track failed terminations and zombie processes
- Automatic retry with escalation

## Testing

```python
# Test script
python C:/Users/LeoDg/.claude/lib/process_manager.py
```

## File Location

```
C:/Users/LeoDg/.claude/lib/process_manager.py
```

## Dependencies

- Python 3.7+ (for dataclasses)
- ctypes (standard library)
- subprocess (standard library)
- threading (standard library)
- logging (standard library)

## Performance

- Thread-safe registry with fine-grained locking
- Minimal overhead for process tracking
- Efficient Job Object integration (kernel-level)

## Security

- No shell string commands (array-based only)
- Secure process handle management
- Isolated lock files

## Limitations

- Windows-only (uses Win32 API)
- Requires Job Object support (Windows 2000+)
- May not work in restricted environments

## Version History

- 1.0.0 (2026-02-28): Initial implementation
