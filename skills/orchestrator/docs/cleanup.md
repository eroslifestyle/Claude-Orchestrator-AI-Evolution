# Session Cleanup System

> Cleanup logic for normal sessions and crash recovery.

---

## STEP 11: Session Cleanup (Enhanced)

**Actions:**
1. Recursive scan of PROJECT_PATH and subdirectories
2. Delete files matching TEMP_PATTERNS
3. Delete empty directories created during session
4. Delete NUL files (Windows) using Win32 API
5. Clean `.claude/tmp/` directory
6. Clean old checkpoints in `.claude/sessions/` (>7 days old)

**Temp Patterns:**
```
*.tmp, *.temp, NUL, claude_*, .claude/tmp/*, *.*.tmp.*, *.md.tmp.*
```

**Timeout:** 60 seconds (continue on individual file errors)

**Execution:**
```python
def session_cleanup(project_path: str, session_files: list) -> dict:
    from datetime import datetime, timedelta
    from pathlib import Path
    import os
    import ctypes

    results = {
        "files_deleted": [],
        "dirs_removed": [],
        "size_freed": 0,
        "errors": []
    }

    TEMP_PATTERNS = ["*.tmp", "*.temp", "NUL", "claude_*", "*.*.tmp.*", "*.md.tmp.*"]

    # 1. Delete temp files (recursive)
    for pattern in TEMP_PATTERNS:
        for file in Path(project_path).rglob(pattern):
            try:
                size = file.stat().st_size
                file.unlink()
                results["files_deleted"].append(str(file))
                results["size_freed"] += size
            except Exception as e:
                results["errors"].append(f"{file}: {e}")

    # 2. Delete empty directories
    for dir in Path(project_path).rglob("*"):
        if dir.is_dir() and not any(dir.iterdir()):
            try:
                dir.rmdir()
                results["dirs_removed"].append(str(dir))
            except: pass

    # 3. Clean old checkpoints (>7 days)
    cutoff = datetime.now() - timedelta(days=7)
    for checkpoint in Path(".claude/sessions/").glob("checkpoint_*.md"):
        if datetime.fromtimestamp(checkpoint.stat().st_mtime) < cutoff:
            checkpoint.unlink()

    # 4. Windows NUL deletion
    if os.name == 'nt':
        for nul in Path(project_path).rglob("NUL"):
            ctypes.windll.kernel32.DeleteFileW(r'\\?\' + str(nul))

    return results
```

**Report Format:**
```
CLEANUP SUMMARY:
  Files deleted: N
  Directories removed: M
  Size freed: X KB/MB
  Errors: E (list if any)
```

---

## STEP 11.5: Emergency Cleanup (Crash Recovery)

**Trigger:** Signal handlers (SIGINT, SIGTERM, SIGBREAK) + atexit

**Purpose:** Force cleanup when session crashes or is interrupted.

**Critical Patterns (fast cleanup):**
```
*.tmp, *.temp, NUL, claude_*, .claude/tmp/*, *.*.tmp.*, *.md.tmp.*, CLAUDE.md.tmp.*
```

**Signal Handlers:**
```python
import signal
import atexit
import os
import sys
from pathlib import Path

def emergency_cleanup_handler(signum, frame):
    """Emergency cleanup on signal.

    NOTE: Use raise SystemExit instead of sys.exit() to avoid
    potential deadlock if a lock is held during signal handling.
    Signal-safe: doesn't acquire new locks during exit.
    """
    try:
        for pattern in ["*.tmp", "*.temp", "NUL", "claude_*", "*.*.tmp.*", "*.md.tmp.*"]:
            for f in Path(".").glob(pattern):
                try:
                    f.unlink()
                except (OSError, PermissionError):
                    pass  # Ignore locked/in-use files during emergency
    except Exception:
        pass  # Never fail emergency cleanup

    raise SystemExit(128 + signum if signum else 1)

# Register handlers
signal.signal(signal.SIGINT, emergency_cleanup_handler)
signal.signal(signal.SIGTERM, emergency_cleanup_handler)
if os.name == 'nt':
    signal.signal(signal.SIGBREAK, emergency_cleanup_handler)
atexit.register(emergency_cleanup_handler, None, None)
```

**Slash Command:** `/emergency-cleanup` - Manual trigger

**Timeout:** 5 seconds (aggressive, must complete fast)

---

## Error Handling

- Continue on individual file errors (never fail session)
- Log locked files for manual review
- Skip files in use by other processes
