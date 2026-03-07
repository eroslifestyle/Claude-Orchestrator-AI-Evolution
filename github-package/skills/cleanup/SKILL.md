---
name: cleanup
description: Run session cleanup - delete temp files, NUL files, orphan artifacts
user-invokable: true
allowed-tools: Bash, Glob, Read
metadata:
  keywords: [cleanup, temp, files, maintenance]
---

# Session Cleanup

Delegates to System Coordinator agent for cleanup operations.

## What Gets Cleaned

- `*.tmp` files in project directory
- `temp_*` and `*_temp.*` files
- `*.*.tmp.*` files (Claude Code temp files with .tmp in middle of filename)
- `*.md.tmp.*` files (e.g., CLAUDE.md.tmp.11724.1772521559600)
- `CLAUDE.md.tmp.*` files (specific CLAUDE.md temp files)
- `*.py.tmp.*` files (Python temp files with .tmp suffix)
- `NUL` files (Windows reserved device name artifacts)
- Orphan backup files beyond retention policy

## Windows NUL Deletion

Uses Win32 API for reliable NUL file removal:
```python
python -c "
import os, ctypes
for root, dirs, files in os.walk('PROJECT_PATH'):
    if 'NUL' in files:
        p = os.path.join(root, 'NUL')
        ctypes.windll.kernel32.DeleteFileW(r'\\\\?\\\\' + p)
"
```

## Usage

```
/cleanup
/cleanup PROJECT_PATH
```

## Output Format

```
CLEANUP: OK | files_deleted=N
```
