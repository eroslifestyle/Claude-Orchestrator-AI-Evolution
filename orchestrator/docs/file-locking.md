# File Locking System (V13.0+)

> Prevent race conditions when parallel tasks modify same files.

---

## FileLockManager (Local)

**Purpose:** Cross-platform file locking for concurrent edit prevention.

**Implementation:**
1. Import FileLockManager from lib.file_locks
2. Before editing file: acquire lock with timeout
3. After editing: release lock
4. On session end: cleanup(holder_id) releases all locks

**Usage:**
```python
from lib.file_locks import FileLockManager
fm = FileLockManager()
if fm.acquire(file_path, holder_id=task_id, timeout=30.0):
    try:
        # Edit file
        pass
    finally:
        fm.release(file_path, task_id)
```

---

## DistributedLockManager (V14.0.3)

**Purpose:** Redis-based distributed locking for multi-process and multi-machine coordination.

**Features:**
- Redis-based distributed lock with async support
- Automatic TTL to prevent deadlocks
- Exponential backoff retry logic
- Health check for Redis connection
- Graceful degradation to FileLockManager when Redis unavailable

**Configuration (Environment Variables):**
- `REDIS_URL`: Redis connection URL (default: `redis://localhost:6379/0`)
- `REDIS_PASSWORD`: Redis password (optional)

**Requirements:**
```bash
pip install redis[hiredis]  # For async Redis support
```

**Usage (Async Context Manager - Recommended):**
```python
from lib.distributed_lock import DistributedLockManager

async with DistributedLockManager(
    redis_url="redis://localhost:6379/0",
    prefer_redis=True
) as lock_mgr:
    async with lock_mgr.lock("resource", "holder", ttl=30):
        # Exclusive access
        pass
```

**Usage (Manual Acquire/Release):**
```python
lock_mgr = DistributedLockManager(prefer_redis=True)
await lock_mgr.initialize()
try:
    if await lock_mgr.acquire("resource", "holder", ttl=30, timeout=10.0):
        # Work
        pass
finally:
    await lock_mgr.release("resource", "holder")
    await lock_mgr.close()
```

**Health Check:**
```python
health = await lock_mgr.health_check()
# Returns: {"active_backend": "redis", "using_redis": True, ...}
```

**Singleton Access:**
```python
from lib.distributed_lock import get_distributed_lock_manager
lock_mgr = get_distributed_lock_manager(prefer_redis=True)
```

---

## Fallback Behavior

When `prefer_redis=True` and Redis is unavailable, automatically falls back to FileLockManager:
1. Attempts Redis connection on first `acquire()` or `initialize()`
2. If Redis connection fails, creates FileLockBackend automatically
3. Lock operations continue transparently with file-based locks
4. Health check reports both backend statuses
