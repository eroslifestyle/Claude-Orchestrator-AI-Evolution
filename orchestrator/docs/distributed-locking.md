# Distributed Locking V15.1.0

> Redis-based distributed locks for multi-instance coordination

## Overview

DistributedLockManager provides distributed locking for orchestrator instances running on multiple processes/machines.

## Features

- **Redis Backend**: Persistent lock storage
- **Auto-Expiry**: Locks expire after timeout
- **Heartbeat**: Keep-alive for long operations

## Usage

```python
from lib.distributed_lock import DistributedLockManager

lock_manager = DistributedLockManager(
    redis_url="redis://localhost:6379",
    default_timeout=30.0
)

# Acquire lock
async with lock_manager.acquire("resource:123") as lock:
    # Critical section
    await process_resource()
```

## Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| redis_url | redis://localhost:6379 | Redis connection URL |
| default_timeout | 30.0 | Lock timeout in seconds |
| heartbeat_interval | 5.0 | Heartbeat interval |

## Lock States

- `ACQUIRED`: Lock held
- `RELEASED`: Lock released
- `EXPIRED`: Lock timed out
- `FAILED`: Acquisition failed

## Error Handling

- `LockAcquisitionError`: Failed to acquire lock
- `LockTimeoutError`: Lock wait timed out
- `DeadlockError`: Potential deadlock detected

## Version History

| Version | Changes |
|---------|---------|
| V15.1.0 | Initial DistributedLockManager implementation |
