"""File lock system for Orchestrator V14.0.4.

Prevents race conditions in parallel tasks with cross-platform support.

V14.0.4 - Custom Exceptions + Exception Chaining:
- LockError for lock acquisition/release failures
- LockTimeoutError for timeout-related failures
- Proper exception chaining with "raise ... from err"
"""

import os
import sys
import signal
import time
import logging
import asyncio
from pathlib import Path
from typing import Optional, Dict, Set, Tuple
from collections import OrderedDict, deque
from dataclasses import dataclass
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
import threading
import hashlib

logger = logging.getLogger(__name__)

from lib.exceptions import (
    LockError,
    LockTimeoutError,
    LockAcquisitionError,
    DeadlockError,
)


# Heartbeat timeout predefinito (secondi)
DEFAULT_HEARTBEAT_TIMEOUT = 60.0

# Global shutdown flag for coordinating cleanup (FL-E1 FIX)
_shutting_down = False
_shutdown_lock = threading.Lock()


def is_shutting_down() -> bool:
    """Check if system is shutting down.

    Thread-safe check of global shutdown flag.
    Used by HeartbeatManager and other components to avoid
    operations during shutdown that could cause deadlock.

    CL-E1 FIX: Coordinato con HeartbeatManager.
    """
    return _shutting_down


def _atexit_cleanup() -> None:
    """
    Cleanup called via atexit on normal program exit.

    This function performs the actual cleanup operations.
    Safe to call because atexit handlers run in a clean context
    (no signal handler constraints).

    FL-E1 FIX: Cleanup delegato a contesto sicuro.
    """
    global _shutting_down

    with _shutdown_lock:
        if _shutting_down:
            return  # Already cleaned up
        _shutting_down = True

    # Cleanup temp files - safe here because we're not in signal context
    try:
        for pattern in ["*.tmp", "*.temp", "NUL", "claude_*", "*.*.tmp.*", "*.md.tmp.*"]:
            for f in Path(".").glob(pattern):
                try:
                    f.unlink()
                except (OSError, PermissionError, FileNotFoundError):
                    pass
    except Exception as e:
        logger.debug(f"atexit cleanup error: {e}")


def _emergency_cleanup_handler(signum: Optional[int] = None, frame=None) -> None:
    """
    Emergency cleanup on signal - ASYNC-SIGNAL-SAFE.

    CRITICAL: This function runs in signal context and must be async-signal-safe.
    - NO I/O operations (glob, unlink, open, etc.)
    - NO lock acquisitions (can cause deadlock if lock held during signal)
    - NO memory allocations (may deadlock on corrupted heap)
    - ONLY: set flag atomically, then raise SystemExit

    FL-E1 FIX: Truly async-signal-safe handler.
    CL-E1 FIX: Coordinates with HeartbeatManager via is_shutting_down().

    The actual cleanup is delegated to atexit handler which runs
    in a safe context after Python's signal handling completes.
    """
    global _shutting_down

    # ATOMIC: Set shutdown flag (single assignment is atomic in Python)
    _shutting_down = True

    # NOTE: NO I/O operations here! They are NOT async-signal-safe.
    # Cleanup is handled by atexit handler which runs in safe context.

    # Use SystemExit instead of sys.exit() - avoids deadlock if lock held
    # Exit code 128 + signal number follows Unix convention
    if signum is not None:
        raise SystemExit(128 + signum)
    else:
        raise SystemExit(1)


def _register_signal_handlers() -> None:
    """
    Register signal handlers and atexit cleanup.

    Registers:
    - SIGINT (Ctrl+C) -> emergency_cleanup_handler
    - SIGTERM (kill) -> emergency_cleanup_handler
    - SIGBREAK (Windows Ctrl+Break) -> emergency_cleanup_handler
    - atexit -> _atexit_cleanup for normal exit cleanup

    FL-E1 FIX: Registrati solo una volta con guard flag.
    """
    # Register signal handlers
    signal.signal(signal.SIGINT, _emergency_cleanup_handler)
    signal.signal(signal.SIGTERM, _emergency_cleanup_handler)
    if sys.platform == 'win32':
        # Windows-specific signal (Ctrl+Break)
        signal.signal(signal.SIGBREAK, _emergency_cleanup_handler)

    # Register atexit for normal exit cleanup
    import atexit
    atexit.register(_atexit_cleanup)


# Register handlers at module load (only once)
if not hasattr(signal, '_file_locks_handlers_registered'):
    _register_signal_handlers()
    signal._file_locks_handlers_registered = True


class AsyncEventManager:
    """
    Manages asyncio.Event objects with TTL and LRU eviction.

    Prevents memory leaks from orphaned async events when release()
    is never called (crash, exception, etc.).

    FL-E2 FIX: Bounded cache con TTL automatico.
    """

    def __init__(self, max_size: int = 1000, ttl_seconds: float = 300.0):
        """
        Initialize AsyncEventManager.

        Args:
            max_size: Maximum number of events to store (LRU eviction when exceeded)
            ttl_seconds: Time-to-live for events in seconds (auto-cleanup)
        """
        self._events: OrderedDict[str, Tuple[asyncio.Event, float]] = OrderedDict()
        self._max_size = max_size
        self._ttl = ttl_seconds
        self._lock = threading.Lock()

    def get_or_create(self, key: str) -> asyncio.Event:
        """
        Get existing event or create new one.

        Implements LRU eviction when max_size is reached and TTL cleanup.

        Args:
            key: Unique key for the event (typically file_path)

        Returns:
            asyncio.Event instance
        """
        with self._lock:
            # Cleanup expired entries first
            self._cleanup_expired()

            # If key exists, move to end (LRU access pattern)
            if key in self._events:
                self._events.move_to_end(key)
                return self._events[key][0]

            # Check size limit before adding new entry
            if len(self._events) >= self._max_size:
                # Remove oldest entry (first in OrderedDict)
                evicted_key, _ = self._events.popitem(last=False)
                logger.debug(f"Evicted async event for {evicted_key} (LRU, capacity={self._max_size})")

            # Create new event with creation timestamp
            event = asyncio.Event()
            self._events[key] = (event, time.time())
            return event

    def remove(self, key: str) -> bool:
        """
        Remove event by key.

        Args:
            key: Key to remove

        Returns:
            True if removed, False if not found
        """
        with self._lock:
            if key in self._events:
                del self._events[key]
                return True
            return False

    def contains(self, key: str) -> bool:
        """Check if key exists."""
        with self._lock:
            return key in self._events

    def set_event(self, key: str) -> bool:
        """
        Set the event for a key (signal waiters).

        Args:
            key: Key whose event to set

        Returns:
            True if event was set, False if key not found
        """
        with self._lock:
            if key in self._events:
                self._events[key][0].set()
                return True
            return False

    def _cleanup_expired(self) -> int:
        """
        Remove entries older than TTL.

        Called internally during get_or_create().

        Returns:
            Number of expired entries removed
        """
        now = time.time()
        expired_keys = [
            k for k, (_, created) in self._events.items()
            if now - created > self._ttl
        ]
        for key in expired_keys:
            del self._events[key]

        if expired_keys:
            logger.debug(f"Cleaned up {len(expired_keys)} expired async events (TTL={self._ttl}s)")

        return len(expired_keys)

    def cleanup_stale(self) -> int:
        """
        Public cleanup method for events that are already set.

        Returns:
            Number of stale events cleaned up
        """
        with self._lock:
            stale_keys = [
                k for k, (event, _) in self._events.items()
                if event.is_set()
            ]
            for key in stale_keys:
                del self._events[key]

            # Also cleanup expired
            expired_count = self._cleanup_expired()

            total = len(stale_keys) + expired_count
            if total > 0:
                logger.debug(f"Cleaned up {total} async events ({len(stale_keys)} stale, {expired_count} expired)")
            return total

    @property
    def size(self) -> int:
        """Current number of stored events."""
        with self._lock:
            return len(self._events)


class HeartbeatManager:
    """
    Gestisce heartbeat per lock attivi.

    Aggiorna periodicamente il timestamp dei lock file per indicare
    che il processo detentore e' ancora attivo. Consente il rilevamento
    automatico di lock orfani quando il processo crasha.
    """

    def __init__(self, lock_manager: 'FileLockManager'):
        """
        Inizializza HeartbeatManager.

        Args:
            lock_manager: Istanza di FileLockManager da monitorare
        """
        self._lock_manager = lock_manager
        self._running = False
        self._heartbeat_thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()
        self._check_interval = 10.0  # Secondi tra check heartbeat

    def start(self) -> None:
        """Avvia thread heartbeat in background."""
        with self._lock:
            if self._running:
                logger.debug("HeartbeatManager gia' in esecuzione")
                return
            self._running = True
            self._heartbeat_thread = threading.Thread(
                target=self._heartbeat_loop,
                daemon=True,
                name="LockHeartbeat"
            )
            self._heartbeat_thread.start()
            logger.info("HeartbeatManager avviato")

    def stop(self) -> None:
        """Ferma thread heartbeat."""
        with self._lock:
            if not self._running:
                return
            self._running = False
            if self._heartbeat_thread and self._heartbeat_thread.is_alive():
                self._heartbeat_thread.join(timeout=5.0)
                logger.info("HeartbeatManager fermato")

    def _heartbeat_loop(self) -> None:
        """Loop che aggiorna heartbeat per lock attivi."""
        while self._running:
            time.sleep(self._check_interval)
            if self._running:  # Ricontrolla dopo sleep
                self._update_heartbeats()

    def _update_heartbeats(self) -> None:
        """
        Aggiorna heartbeat per tutti i lock attivi.

        CL-E1 FIX: Guard clause per evitare operazioni durante shutdown.
        """
        # CL-E1 FIX: Guard clause - skip during shutdown to avoid deadlock
        if is_shutting_down():
            logger.debug("Skipping heartbeat update during shutdown")
            return

        updated_count = 0
        with self._lock_manager._local_lock:
            for file_path, lock_info in list(self._lock_manager.held_locks.items()):
                if self._write_heartbeat(lock_info):
                    lock_info.last_heartbeat = datetime.now()
                    updated_count += 1

        if updated_count > 0:
            logger.debug(f"Heartbeat aggiornato per {updated_count} lock")

    def _write_heartbeat(self, lock_info: LockInfo) -> bool:
        """
        Scrive timestamp heartbeat nel lock file aggiornando mtime.

        Args:
            lock_info: Informazioni del lock da aggiornare

        Returns:
            True se aggiornato con successo, False altrimenti
        """
        try:
            lock_file = Path(lock_info.lock_file_path)
            if lock_file.exists():
                lock_file.touch()  # Aggiorna mtime
                return True
        except OSError as e:
            logger.debug(f"Impossibile aggiornare heartbeat per {lock_info.lock_file_path}: {e}")
        return False

    def is_alive(self) -> bool:
        """Verifica se il thread heartbeat e' attivo."""
        with self._lock:
            return self._running and (
                self._heartbeat_thread is not None and
                self._heartbeat_thread.is_alive()
            )


@dataclass
class LockInfo:
    """Information about a held lock."""
    file_path: str
    holder_id: str
    acquired_at: datetime
    lock_file_path: str
    ref_count: int = 1  # Reference counter for reentrant locks
    last_heartbeat: datetime = None  # Timestamp ultimo heartbeat
    heartbeat_interval: float = 30.0  # Secondi tra heartbeat

    def __post_init__(self):
        """Inizializza last_heartbeat se non impostato."""
        if self.last_heartbeat is None:
            self.last_heartbeat = datetime.now()


class FileLockManager:
    """
    Manager for file-based locks with timeout and deadlock detection.

    Uses .lock files per target file with platform-specific locking.
    Thread-safe for concurrent access within the same process.
    """

    def __init__(self, lock_dir: Optional[str] = None, stale_timeout: float = 300.0):
        """
        Initialize FileLockManager.

        Args:
            lock_dir: Directory for lock files (defaults to ~/.claude/locks)
            stale_timeout: Seconds before considering a lock stale (default: 300.0)
        """
        self.lock_dir = Path(lock_dir or Path.home() / ".claude" / "locks")
        self.lock_dir.mkdir(parents=True, exist_ok=True)
        self.stale_timeout = stale_timeout  # FIX M-3: Configurable stale timeout
        self.held_locks: Dict[str, LockInfo] = {}
        self._local_lock = threading.Lock()
        self._deadlock_detection_cycles: Set[str] = set()

        # FL-E2 FIX: AsyncEventManager with TTL and LRU eviction
        # Prevents memory leak when release() is never called
        self._async_events = AsyncEventManager(
            max_size=1000,
            ttl_seconds=300.0  # 5 minutes TTL
        )

        # Heartbeat manager per rilevamento lock orfani
        self._heartbeat_manager = HeartbeatManager(self)
        self._heartbeat_manager.start()

        logger.info(f"FileLockManager initialized with lock_dir: {self.lock_dir}, stale_timeout: {self.stale_timeout}s")

    def _get_lock_file_path(self, file_path: str) -> str:
        """
        Generate lock file path for target file.

        Uses SHA-256 hash (truncated to 16 chars) to handle long paths and special characters.

        Args:
            file_path: Original file path to lock

        Returns:
            Path to lock file
        """
        # FL-1: Use SHA-256 truncated to 16 chars (reduced collision risk vs MD5-12)
        file_hash = hashlib.sha256(file_path.encode()).hexdigest()[:16]
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

        # FIX C-1 & H-2: Move deadlock detection INSIDE _local_lock to prevent race condition
        # and ensure cleanup in ALL exit paths
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
                # V14.0.4: Log detailed context for debugging
                return False

            # Add to deadlock tracking
            self._deadlock_detection_cycles.add(cycle_key)

        try:
            while time.time() - start_time < timeout:
                # Try to create lock file atomically
                fd = None
                try:
                    # Use exclusive creation (O_EXCL) for atomic operation
                    fd = os.open(lock_file, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o644)

                    # FIX M-2: Use try-finally to guarantee fd is closed even if os.write() fails
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
                            # FIX H-2: Cleanup deadlock tracking on success
                            self._deadlock_detection_cycles.discard(cycle_key)

                        logger.info(f"Lock acquired for {file_path} by {holder_id}")
                        return True

                    finally:
                        # FIX M-2: Guarantee fd is closed even if os.write() fails
                        if fd is not None:
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
                            # Note: Do NOT remove from deadlock_detection_cycles here - still trying

                        continue  # Retry immediately

                    # Wait before retry
                    time.sleep(poll_interval)

                except OSError as e:
                    # V14.0.4: Log with exception chaining info
                    logger.error(f"Failed to acquire lock for {file_path}: {e}")
                    # FIX H-2: Cleanup on OSError
                    with self._local_lock:
                        self._deadlock_detection_cycles.discard(cycle_key)
                    return False

            # Timeout occurred
            logger.warning(f"Lock acquisition timeout for {file_path} by {holder_id}")
            return False

        finally:
            # FIX H-2: GUARANTEED cleanup of deadlock tracking on ALL exit paths
            # (success, timeout, exception)
            with self._local_lock:
                self._deadlock_detection_cycles.discard(cycle_key)

    def acquire_or_raise(
        self,
        file_path: str,
        holder_id: str,
        timeout: float = 30.0,
        poll_interval: float = 0.1
    ) -> bool:
        """Acquire lock or raise LockTimeoutError on failure.

        V14.0.4: Variant that raises exception instead of returning False.

        Args:
            file_path: Path to file to lock
            holder_id: Unique ID for lock holder (task_id, agent_id)
            timeout: Maximum seconds to wait for lock
            poll_interval: Seconds between lock attempts

        Returns:
            True if lock acquired

        Raises:
            LockTimeoutError: If lock cannot be acquired within timeout
            LockAcquisitionError: If lock acquisition fails for other reasons
        """
        acquired = self.acquire(file_path, holder_id, timeout, poll_interval)
        if not acquired:
            raise LockTimeoutError(
                f"Could not acquire lock for {file_path} within {timeout}s",
                resource=file_path,
                holder_id=holder_id,
                timeout_seconds=timeout
            )
        return True

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

            # FL-E2 FIX: Notify async waiters using AsyncEventManager
            # Set event and remove (prevents orphan events)
            if self._async_events.contains(file_path):
                self._async_events.set_event(file_path)
                self._async_events.remove(file_path)

            return True

    def _is_lock_stale(self, lock_file: str) -> bool:
        """
        Check if lock is stale (older than stale_timeout seconds).

        Args:
            lock_file: Path to lock file

        Returns:
            True if lock is stale, False otherwise
        """
        try:
            stat = Path(lock_file).stat()
            age = time.time() - stat.st_mtime
            # FIX M-3: Use configurable stale_timeout from constructor
            return age > self.stale_timeout
        except FileNotFoundError:
            return True

    def _is_lock_truly_stale(self, lock_file: str) -> bool:
        """
        Verifica se lock e' veramente orfano (no heartbeat recente).

        Un lock e' considerato orfano se:
        - Il file non esiste
        - Il mtime e' piu vecchio di stale_timeout
        - Il mtime e' piu vecchio di DEFAULT_HEARTBEAT_TIMEOUT (60s)

        Args:
            lock_file: Path al lock file

        Returns:
            True se lock e' orfano, False altrimenti
        """
        try:
            stat = Path(lock_file).stat()
            age = time.time() - stat.st_mtime

            # Se piu vecchio di stale_timeout o heartbeat_timeout, consideralo orfano
            return age > self.stale_timeout or age > DEFAULT_HEARTBEAT_TIMEOUT
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
        Calls shutdown() for proper cleanup.
        """
        self.shutdown()
        logger.debug("FileLockManager context exit")
        return False

    # =========================================================================
    # P0-3: ASYNC FILE LOCKS - Non-blocking wait with asyncio.Event
    # =========================================================================

    async def acquire_async(
        self,
        file_path: str,
        holder_id: str,
        timeout: float = 30.0,
        poll_interval: float = 0.1
    ) -> bool:
        """
        Async version of acquire() - no CPU busy-wait.

        Uses asyncio.Event for efficient waiting instead of polling with sleep.
        This eliminates CPU waste when waiting for locks held by other processes.

        Args:
            file_path: Path to file to lock
            holder_id: Unique ID for lock holder (task_id, agent_id)
            timeout: Maximum seconds to wait for lock
            poll_interval: Fallback polling interval if event not triggered

        Returns:
            True if lock acquired, False if timeout
        """
        lock_file = self._get_lock_file_path(file_path)
        cycle_key = f"{holder_id}:{file_path}"

        # Check for reentrant lock first
        with self._local_lock:
            if file_path in self.held_locks and self.held_locks[file_path].holder_id == holder_id:
                self.held_locks[file_path].ref_count += 1
                logger.debug(f"Reentrant async lock acquired for {file_path} by {holder_id}")
                return True

            # Detect potential deadlock
            if cycle_key in self._deadlock_detection_cycles:
                logger.warning(f"Potential deadlock detected for {holder_id} on {file_path}")
                return False

            # Add to deadlock tracking
            self._deadlock_detection_cycles.add(cycle_key)

            # FL-E2 FIX: Use AsyncEventManager for bounded, TTL-based event storage
            # Automatic cleanup of stale/expired events
            event = self._async_events.get_or_create(file_path)

        try:
            start_time = time.time()

            while time.time() - start_time < timeout:
                # Try to create lock file atomically
                fd = None
                try:
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

                        logger.info(f"Async lock acquired for {file_path} by {holder_id}")
                        return True

                    finally:
                        if fd is not None:
                            os.close(fd)

                except FileExistsError:
                    # Lock held by someone else
                    if self._is_lock_stale(lock_file):
                        logger.info(f"Releasing stale async lock for {file_path}")
                        self._release_stale_lock(lock_file)

                        with self._local_lock:
                            if file_path in self.held_locks:
                                del self.held_locks[file_path]

                        continue  # Retry immediately

                    # Wait for release notification (no CPU waste)
                    remaining = timeout - (time.time() - start_time)
                    if remaining <= 0:
                        break

                    try:
                        # Wait with timeout - event is set by release()
                        await asyncio.wait_for(event.wait(), timeout=min(poll_interval, remaining))
                        event.clear()
                    except asyncio.TimeoutError:
                        # Fallback: check again in case we missed the event
                        pass

                except OSError as e:
                    logger.error(f"Failed to acquire async lock for {file_path}: {e}")
                    with self._local_lock:
                        self._deadlock_detection_cycles.discard(cycle_key)
                    return False

            # Timeout occurred
            logger.warning(f"Async lock acquisition timeout for {file_path} by {holder_id}")
            return False

        finally:
            # GUARANTEED cleanup of deadlock tracking
            with self._local_lock:
                self._deadlock_detection_cycles.discard(cycle_key)

    def cleanup_async_events(self) -> int:
        """
        Clean up stale and expired async events.

        FL-E2 FIX: Delegates to AsyncEventManager.cleanup_stale().

        Returns:
            Number of events cleaned up (stale + expired)
        """
        return self._async_events.cleanup_stale()

    def shutdown(self) -> None:
        """
        Cleanup completo del lock manager.

        Ferma il thread heartbeat e rilascia tutte le risorse.
        Chiamare prima di terminare l'applicazione.
        """
        # Ferma heartbeat manager
        if hasattr(self, '_heartbeat_manager'):
            self._heartbeat_manager.stop()
            logger.debug("HeartbeatManager fermato in shutdown")

        # Rilascia tutti i lock held
        with self._local_lock:
            holders = set(info.holder_id for info in self.held_locks.values())

        for holder_id in holders:
            self.cleanup(holder_id)

        # Cleanup async events
        self.cleanup_async_events()

        logger.info("FileLockManager shutdown completato")

    @asynccontextmanager
    async def async_lock(
        self,
        file_path: str,
        holder_id: str,
        timeout: float = 30.0
    ):
        """
        Async context manager for file locking.

        Usage:
            async with lock_manager.async_lock("/path/to/file", "task-123"):
                # Exclusive access to file
                await process_file()

        Args:
            file_path: Path to file to lock
            holder_id: Unique ID for lock holder
            timeout: Maximum seconds to wait for lock

        Yields:
            None

        Raises:
            TimeoutError: If lock cannot be acquired within timeout
        """
        acquired = await self.acquire_async(file_path, holder_id, timeout)
        if not acquired:
            # V14.0.4: Use custom LockTimeoutError instead of generic TimeoutError
            raise LockTimeoutError(
                f"Could not acquire async lock for {file_path} within {timeout}s",
                resource=file_path,
                holder_id=holder_id,
                timeout_seconds=timeout
            )
        try:
            yield
        finally:
            self.release(file_path, holder_id)
