"""File lock system for preventing race conditions in parallel tasks."""

import os
import time
import errno
import logging
from pathlib import Path
from typing import Optional, Dict, Set
from dataclasses import dataclass
from datetime import datetime, timedelta
import threading
import hashlib

logger = logging.getLogger(__name__)


@dataclass
class LockInfo:
    """Information about a held lock."""
    file_path: str
    holder_id: str
    acquired_at: datetime
    lock_file_path: str
    ref_count: int = 1  # Reference counter for reentrant locks


class FileLockManager:
    """
    Manager for file-based locks with timeout and deadlock detection.

    Uses .lock files per target file with platform-specific locking.
    Thread-safe for concurrent access within the same process.
    """

    def __init__(self, lock_dir: Optional[str] = None):
        """
        Initialize FileLockManager.

        Args:
            lock_dir: Directory for lock files (defaults to ~/.claude/locks)
        """
        self.lock_dir = Path(lock_dir or Path.home() / ".claude" / "locks")
        self.lock_dir.mkdir(parents=True, exist_ok=True)
        self.held_locks: Dict[str, LockInfo] = {}
        self._local_lock = threading.Lock()
        self._deadlock_detection_cycles: Set[str] = set()

        logger.info(f"FileLockManager initialized with lock_dir: {self.lock_dir}")

    def _get_lock_file_path(self, file_path: str) -> str:
        """
        Generate lock file path for target file.

        Uses MD5 hash to handle long paths and special characters.

        Args:
            file_path: Original file path to lock

        Returns:
            Path to lock file
        """
        # Hash to handle long paths and special characters
        file_hash = hashlib.md5(file_path.encode()).hexdigest()[:12]
        return str(self.lock_dir / f"{file_hash}.lock")

    def acquire(
        self,
        file_path: str,
        holder_id: str,
        timeout: float = 30.0,
        poll_interval: float = 0.1
    ) -> bool:
        """
        Acquire lock on file_path.

        Implements reentrant locking (same holder can acquire multiple times).
        Uses atomic file creation (O_EXCL) for cross-platform safety.

        Args:
            file_path: Path to file to lock
            holder_id: Unique ID for lock holder (task_id, agent_id)
            timeout: Maximum seconds to wait for lock
            poll_interval: Seconds between lock attempts

        Returns:
            True if lock acquired, False if timeout
        """
        lock_file = self._get_lock_file_path(file_path)
        start_time = time.time()

        # Track for deadlock detection
        cycle_key = f"{holder_id}:{file_path}"

        while time.time() - start_time < timeout:
            with self._local_lock:
                # Check if lock already held by same holder (reentrant)
                if file_path in self.held_locks and self.held_locks[file_path].holder_id == holder_id:
                    # Increment reference counter for reentrant lock
                    self.held_locks[file_path].ref_count += 1
                    logger.debug(f"Reentrant lock acquired for {file_path} by {holder_id} (ref_count={self.held_locks[file_path].ref_count})")
                    return True

                # Detect potential deadlock (same holder waiting on same file)
                if cycle_key in self._deadlock_detection_cycles:
                    logger.warning(f"Potential deadlock detected for {holder_id} on {file_path}")
                    return False

                self._deadlock_detection_cycles.add(cycle_key)

            # Try to create lock file atomically
            try:
                # Use exclusive creation (O_EXCL) for atomic operation
                fd = os.open(lock_file, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o644)

                try:
                    # Write lock information
                    lock_info = LockInfo(
                        file_path=file_path,
                        holder_id=holder_id,
                        acquired_at=datetime.now(),
                        lock_file_path=lock_file
                    )

                    lock_data = f"{holder_id}\n{file_path}\n{lock_info.acquired_at.isoformat()}\n"
                    os.write(fd, lock_data.encode())

                    with self._local_lock:
                        self.held_locks[file_path] = lock_info
                        self._deadlock_detection_cycles.discard(cycle_key)

                    logger.info(f"Lock acquired for {file_path} by {holder_id}")
                    return True

                finally:
                    os.close(fd)

            except FileExistsError:
                # Lock held by someone else, check if stale
                if self._is_lock_stale(lock_file):
                    logger.info(f"Releasing stale lock for {file_path}")
                    self._release_stale_lock(lock_file)

                    # Also remove from in-memory tracking if present
                    with self._local_lock:
                        if file_path in self.held_locks:
                            del self.held_locks[file_path]
                        # Clear deadlock detection for this cycle
                        self._deadlock_detection_cycles.discard(cycle_key)

                    continue  # Retry immediately

                # Wait before retry
                time.sleep(poll_interval)

            except OSError as e:
                logger.error(f"Failed to acquire lock for {file_path}: {e}")
                with self._local_lock:
                    self._deadlock_detection_cycles.discard(cycle_key)
                return False

        # Timeout occurred
        with self._local_lock:
            self._deadlock_detection_cycles.discard(cycle_key)

        logger.warning(f"Lock acquisition timeout for {file_path} by {holder_id}")
        return False

    def release(self, file_path: str, holder_id: str) -> bool:
        """
        Release lock on file_path.

        Args:
            file_path: Path to unlock
            holder_id: ID of lock holder

        Returns:
            True if lock was released, False otherwise
        """
        with self._local_lock:
            if file_path not in self.held_locks:
                logger.debug(f"Lock not held for {file_path}")
                return False

            lock_info = self.held_locks[file_path]
            if lock_info.holder_id != holder_id:
                logger.warning(f"Lock holder mismatch for {file_path}: expected {lock_info.holder_id}, got {holder_id}")
                return False

            # Decrement reference counter for reentrant locks
            lock_info.ref_count -= 1

            if lock_info.ref_count > 0:
                # Still held by same holder (reentrant)
                logger.debug(f"Lock reference decremented for {file_path} by {holder_id} (ref_count={lock_info.ref_count})")
                return True

            # Reference counter reached 0, fully release the lock
            # Remove lock file
            try:
                Path(lock_info.lock_file_path).unlink()
            except FileNotFoundError:
                logger.debug(f"Lock file already removed for {file_path}")
            except OSError as e:
                logger.error(f"Failed to remove lock file for {file_path}: {e}")

            del self.held_locks[file_path]
            logger.info(f"Lock fully released for {file_path} by {holder_id}")
            return True

    def _is_lock_stale(self, lock_file: str, stale_timeout: float = 300.0) -> bool:
        """
        Check if lock is stale (older than stale_timeout seconds).

        Args:
            lock_file: Path to lock file
            stale_timeout: Seconds before considering lock stale

        Returns:
            True if lock is stale, False otherwise
        """
        try:
            stat = Path(lock_file).stat()
            age = time.time() - stat.st_mtime
            return age > stale_timeout
        except FileNotFoundError:
            return True

    def _release_stale_lock(self, lock_file: str):
        """
        Release a stale lock file.

        Args:
            lock_file: Path to stale lock file
        """
        try:
            Path(lock_file).unlink()
            logger.info(f"Stale lock released: {lock_file}")
        except FileNotFoundError:
            pass  # Already removed
        except OSError as e:
            logger.error(f"Failed to release stale lock {lock_file}: {e}")

    def get_holder(self, file_path: str) -> Optional[str]:
        """
        Get current lock holder for file_path.

        Args:
            file_path: Path to check

        Returns:
            Holder ID if locked, None otherwise
        """
        with self._local_lock:
            # Check in-memory held locks first
            if file_path in self.held_locks:
                return self.held_locks[file_path].holder_id

            # Try to read from lock file
            lock_file = self._get_lock_file_path(file_path)
            try:
                with open(lock_file) as f:
                    holder_id = f.readline().strip()
                    return holder_id
            except FileNotFoundError:
                return None
            except OSError as e:
                logger.error(f"Failed to read lock file for {file_path}: {e}")
                return None

    def cleanup(self, holder_id: str):
        """
        Release all locks held by holder_id.

        Called automatically on task completion or failure.

        Args:
            holder_id: ID of holder whose locks to release
        """
        with self._local_lock:
            to_release = [
                fp for fp, info in self.held_locks.items()
                if info.holder_id == holder_id
            ]

        released_count = 0
        for file_path in to_release:
            if self.release(file_path, holder_id):
                released_count += 1

        if released_count > 0:
            logger.info(f"Cleaned up {released_count} locks for {holder_id}")

    def get_status(self) -> Dict[str, any]:
        """
        Get current lock manager status.

        Returns:
            Dictionary with lock statistics
        """
        with self._local_lock:
            return {
                "held_locks": len(self.held_locks),
                "lock_dir": str(self.lock_dir),
                "locks": [
                    {
                        "file_path": info.file_path,
                        "holder_id": info.holder_id,
                        "acquired_at": info.acquired_at.isoformat(),
                        "age_seconds": (datetime.now() - info.acquired_at).total_seconds()
                    }
                    for info in self.held_locks.values()
                ]
            }

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """
        Context manager exit.

        Note: Does NOT automatically release locks - locks are tied to holders.
        Use cleanup(holder_id) explicitly when holder is done.
        """
        logger.debug("FileLockManager context exit")
        return False
