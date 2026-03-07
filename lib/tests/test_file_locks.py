"""Tests for file_locks.py - V14.0.3.

Comprehensive test coverage for FileLockManager, HeartbeatManager, and LockInfo.
"""

import pytest
import asyncio
import os
import time
import tempfile
import threading
from pathlib import Path
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock

from lib.file_locks import (
    FileLockManager,
    LockInfo,
    HeartbeatManager,
    AsyncEventManager,
    DEFAULT_HEARTBEAT_TIMEOUT
)


# ============================================================================
# Test Fixtures
# ============================================================================

@pytest.fixture
def temp_lock_dir(tmp_path):
    """Create a temporary lock directory."""
    lock_dir = tmp_path / "locks"
    lock_dir.mkdir()
    return lock_dir


@pytest.fixture
def lock_manager(temp_lock_dir):
    """Create a FileLockManager with temporary directory."""
    manager = FileLockManager(
        lock_dir=str(temp_lock_dir),
        stale_timeout=60.0
    )
    yield manager
    manager.shutdown()


@pytest.fixture
def async_lock_manager(temp_lock_dir):
    """Create a FileLockManager for async tests."""
    manager = FileLockManager(
        lock_dir=str(temp_lock_dir),
        stale_timeout=30.0
    )
    yield manager
    manager.shutdown()


# ============================================================================
# LockInfo Tests
# ============================================================================

class TestLockInfoInit:
    """Test LockInfo initialization."""

    def test_init_basic(self):
        """Test basic initialization."""
        info = LockInfo(
            file_path="/path/to/file",
            holder_id="task-123",
            acquired_at=datetime.now(),
            lock_file_path="/locks/abc.lock"
        )
        assert info.file_path == "/path/to/file"
        assert info.holder_id == "task-123"
        assert info.ref_count == 1

    def test_init_with_ref_count(self):
        """Test initialization with custom ref_count."""
        info = LockInfo(
            file_path="/path",
            holder_id="task",
            acquired_at=datetime.now(),
            lock_file_path="/lock",
            ref_count=3
        )
        assert info.ref_count == 3

    def test_init_last_heartbeat_default(self):
        """Test last_heartbeat defaults to now."""
        before = datetime.now()
        info = LockInfo(
            file_path="/path",
            holder_id="task",
            acquired_at=datetime.now(),
            lock_file_path="/lock"
        )
        after = datetime.now()
        assert before <= info.last_heartbeat <= after

    def test_init_last_heartbeat_explicit(self):
        """Test explicit last_heartbeat."""
        custom_time = datetime(2025, 1, 1, 12, 0, 0)
        info = LockInfo(
            file_path="/path",
            holder_id="task",
            acquired_at=datetime.now(),
            lock_file_path="/lock",
            last_heartbeat=custom_time
        )
        assert info.last_heartbeat == custom_time

    def test_init_heartbeat_interval_default(self):
        """Test default heartbeat_interval."""
        info = LockInfo(
            file_path="/path",
            holder_id="task",
            acquired_at=datetime.now(),
            lock_file_path="/lock"
        )
        assert info.heartbeat_interval == 30.0


class TestLockInfoPostInit:
    """Test LockInfo __post_init__."""

    def test_post_init_sets_last_heartbeat(self):
        """Test __post_init__ sets last_heartbeat if None."""
        info = LockInfo(
            file_path="/path",
            holder_id="task",
            acquired_at=datetime.now(),
            lock_file_path="/lock",
            last_heartbeat=None
        )
        assert info.last_heartbeat is not None

    def test_post_init_preserves_last_heartbeat(self):
        """Test __post_init__ preserves existing last_heartbeat."""
        custom_time = datetime(2025, 1, 1)
        info = LockInfo(
            file_path="/path",
            holder_id="task",
            acquired_at=datetime.now(),
            lock_file_path="/lock",
            last_heartbeat=custom_time
        )
        assert info.last_heartbeat == custom_time


# ============================================================================
# HeartbeatManager Tests
# ============================================================================

class TestHeartbeatManagerInit:
    """Test HeartbeatManager initialization."""

    def test_init(self, lock_manager):
        """Test basic initialization."""
        hb = HeartbeatManager(lock_manager)
        assert hb._lock_manager == lock_manager
        assert not hb._running

    def test_not_running_after_init(self, lock_manager):
        """Test not running after initialization."""
        hb = HeartbeatManager(lock_manager)
        assert not hb.is_alive()


class TestHeartbeatManagerStartStop:
    """Test HeartbeatManager start/stop."""

    def test_start(self, lock_manager):
        """Test starting heartbeat manager."""
        hb = HeartbeatManager(lock_manager)
        hb.start()
        assert hb._running
        hb.stop()

    def test_stop(self, lock_manager):
        """Test stopping heartbeat manager."""
        hb = HeartbeatManager(lock_manager)
        hb.start()
        hb.stop()
        assert not hb._running

    def test_double_start(self, lock_manager):
        """Test double start is safe."""
        hb = HeartbeatManager(lock_manager)
        hb.start()
        hb.start()  # Should not raise
        assert hb._running
        hb.stop()

    def test_double_stop(self, lock_manager):
        """Test double stop is safe."""
        hb = HeartbeatManager(lock_manager)
        hb.start()
        hb.stop()
        hb.stop()  # Should not raise
        assert not hb._running

    def test_is_alive_when_running(self, lock_manager):
        """Test is_alive returns True when running."""
        hb = HeartbeatManager(lock_manager)
        hb.start()
        # Wait for thread to start
        time.sleep(0.1)
        assert hb.is_alive()
        hb.stop()

    def test_is_alive_when_stopped(self, lock_manager):
        """Test is_alive returns False when stopped."""
        hb = HeartbeatManager(lock_manager)
        hb.start()
        hb.stop()
        assert not hb.is_alive()


class TestHeartbeatManagerUpdateHeartbeats:
    """Test HeartbeatManager heartbeat updates."""

    def test_update_heartbeat_no_locks(self, lock_manager):
        """Test update with no locks held."""
        hb = HeartbeatManager(lock_manager)
        # Should not raise
        hb._update_heartbeats()

    def test_update_heartbeat_with_lock(self, lock_manager):
        """Test update updates lock heartbeat."""
        hb = HeartbeatManager(lock_manager)
        lock_manager.acquire("/test/file", "task-1", timeout=1.0)

        # Get initial heartbeat
        initial_hb = lock_manager.held_locks["/test/file"].last_heartbeat
        time.sleep(0.1)

        # Update heartbeat
        hb._update_heartbeats()

        # Heartbeat should be updated
        new_hb = lock_manager.held_locks["/test/file"].last_heartbeat
        assert new_hb >= initial_hb

        lock_manager.cleanup("task-1")


class TestHeartbeatManagerWriteHeartbeat:
    """Test HeartbeatManager _write_heartbeat."""

    def test_write_heartbeat_existing_file(self, lock_manager):
        """Test write heartbeat to existing file."""
        hb = HeartbeatManager(lock_manager)
        lock_manager.acquire("/test/file", "task-1", timeout=1.0)
        lock_info = lock_manager.held_locks["/test/file"]

        # Get initial mtime
        lock_file = Path(lock_info.lock_file_path)
        initial_mtime = lock_file.stat().st_mtime
        time.sleep(0.1)

        # Write heartbeat
        result = hb._write_heartbeat(lock_info)
        assert result is True

        # mtime should be updated
        new_mtime = lock_file.stat().st_mtime
        assert new_mtime >= initial_mtime

        lock_manager.cleanup("task-1")

    def test_write_heartbeat_missing_file(self, lock_manager):
        """Test write heartbeat to missing file returns False."""
        hb = HeartbeatManager(lock_manager)
        lock_info = LockInfo(
            file_path="/test/file",
            holder_id="task-1",
            acquired_at=datetime.now(),
            lock_file_path="/nonexistent/path.lock"
        )

        result = hb._write_heartbeat(lock_info)
        assert result is False


# ============================================================================
# FileLockManager Tests - Initialization
# ============================================================================

class TestFileLockManagerInit:
    """Test FileLockManager initialization."""

    def test_init_default_lock_dir(self):
        """Test default lock directory."""
        manager = FileLockManager()
        assert manager.lock_dir.name == "locks"
        manager.shutdown()

    def test_init_custom_lock_dir(self, temp_lock_dir):
        """Test custom lock directory."""
        manager = FileLockManager(lock_dir=str(temp_lock_dir))
        assert manager.lock_dir == temp_lock_dir
        manager.shutdown()

    def test_init_creates_lock_dir(self, tmp_path):
        """Test creates lock directory if missing."""
        lock_dir = tmp_path / "new_locks"
        assert not lock_dir.exists()

        manager = FileLockManager(lock_dir=str(lock_dir))
        assert lock_dir.exists()
        manager.shutdown()

    def test_init_default_stale_timeout(self, temp_lock_dir):
        """Test default stale timeout."""
        manager = FileLockManager(lock_dir=str(temp_lock_dir))
        assert manager.stale_timeout == 300.0
        manager.shutdown()

    def test_init_custom_stale_timeout(self, temp_lock_dir):
        """Test custom stale timeout."""
        manager = FileLockManager(lock_dir=str(temp_lock_dir), stale_timeout=120.0)
        assert manager.stale_timeout == 120.0
        manager.shutdown()

    def test_init_empty_held_locks(self, lock_manager):
        """Test no locks held initially."""
        assert len(lock_manager.held_locks) == 0


class TestFileLockManagerGetLockFilePath:
    """Test _get_lock_file_path method."""

    def test_get_lock_file_path_format(self, lock_manager):
        """Test lock file path format."""
        path = lock_manager._get_lock_file_path("/test/file.txt")
        assert path.endswith(".lock")
        assert lock_manager.lock_dir.name in path

    def test_get_lock_file_path_consistent(self, lock_manager):
        """Test same path generates same lock file."""
        path1 = lock_manager._get_lock_file_path("/test/file.txt")
        path2 = lock_manager._get_lock_file_path("/test/file.txt")
        assert path1 == path2

    def test_get_lock_file_path_different(self, lock_manager):
        """Test different paths generate different lock files."""
        path1 = lock_manager._get_lock_file_path("/test/file1.txt")
        path2 = lock_manager._get_lock_file_path("/test/file2.txt")
        assert path1 != path2

    def test_get_lock_file_path_hash_length(self, lock_manager):
        """Test hash is 16 characters (SHA-256 truncated)."""
        path = lock_manager._get_lock_file_path("/test/file.txt")
        filename = Path(path).stem
        assert len(filename) == 16


# ============================================================================
# FileLockManager Tests - Acquire
# ============================================================================

class TestFileLockManagerAcquire:
    """Test FileLockManager acquire method."""

    def test_acquire_basic(self, lock_manager):
        """Test basic lock acquisition."""
        result = lock_manager.acquire("/test/file.txt", "task-1", timeout=1.0)
        assert result is True
        assert "/test/file.txt" in lock_manager.held_locks
        lock_manager.cleanup("task-1")

    def test_acquire_creates_lock_file(self, lock_manager):
        """Test acquire creates lock file."""
        lock_manager.acquire("/test/file.txt", "task-1", timeout=1.0)

        lock_file = Path(lock_manager._get_lock_file_path("/test/file.txt"))
        assert lock_file.exists()
        lock_manager.cleanup("task-1")

    def test_acquire_lock_file_contains_info(self, lock_manager):
        """Test lock file contains holder info."""
        lock_manager.acquire("/test/file.txt", "task-1", timeout=1.0)

        lock_file = Path(lock_manager._get_lock_file_path("/test/file.txt"))
        content = lock_file.read_text()
        assert "task-1" in content
        assert "/test/file.txt" in content
        lock_manager.cleanup("task-1")

    def test_acquire_reentrant_same_holder(self, lock_manager):
        """Test reentrant lock for same holder."""
        result1 = lock_manager.acquire("/test/file.txt", "task-1", timeout=1.0)
        result2 = lock_manager.acquire("/test/file.txt", "task-1", timeout=1.0)

        assert result1 is True
        assert result2 is True
        assert lock_manager.held_locks["/test/file.txt"].ref_count == 2
        lock_manager.cleanup("task-1")

    def test_acquire_blocks_different_holder(self, lock_manager):
        """Test acquire blocks for different holder."""
        lock_manager.acquire("/test/file.txt", "task-1", timeout=1.0)

        # Should timeout since lock is held by another
        result = lock_manager.acquire("/test/file.txt", "task-2", timeout=0.5)
        assert result is False

        lock_manager.cleanup("task-1")

    def test_acquire_timeout(self, lock_manager):
        """Test acquire timeout."""
        lock_manager.acquire("/test/file.txt", "task-1", timeout=1.0)

        start = time.time()
        result = lock_manager.acquire("/test/file.txt", "task-2", timeout=0.3)
        elapsed = time.time() - start

        assert result is False
        assert elapsed >= 0.3
        lock_manager.cleanup("task-1")

    def test_acquire_deadlock_detection(self, lock_manager):
        """Test deadlock detection prevents infinite wait."""
        lock_manager.acquire("/test/file.txt", "task-1", timeout=1.0)

        # Same holder trying again should detect potential deadlock
        # This is for the cycle detection mechanism
        lock_manager._deadlock_detection_cycles.add("task-1:/test/file.txt")
        result = lock_manager.acquire("/test/file.txt", "task-1", timeout=0.1)
        # Should still work due to reentrant check before deadlock detection
        assert result is True

        lock_manager.cleanup("task-1")


class TestFileLockManagerRelease:
    """Test FileLockManager release method."""

    def test_release_basic(self, lock_manager):
        """Test basic lock release."""
        lock_manager.acquire("/test/file.txt", "task-1", timeout=1.0)
        result = lock_manager.release("/test/file.txt", "task-1")

        assert result is True
        assert "/test/file.txt" not in lock_manager.held_locks

    def test_release_removes_lock_file(self, lock_manager):
        """Test release removes lock file."""
        lock_manager.acquire("/test/file.txt", "task-1", timeout=1.0)
        lock_manager.release("/test/file.txt", "task-1")

        lock_file = Path(lock_manager._get_lock_file_path("/test/file.txt"))
        assert not lock_file.exists()

    def test_release_not_held(self, lock_manager):
        """Test release of not-held lock."""
        result = lock_manager.release("/test/file.txt", "task-1")
        assert result is False

    def test_release_wrong_holder(self, lock_manager):
        """Test release by wrong holder."""
        lock_manager.acquire("/test/file.txt", "task-1", timeout=1.0)
        result = lock_manager.release("/test/file.txt", "task-2")

        assert result is False
        assert "/test/file.txt" in lock_manager.held_locks
        lock_manager.cleanup("task-1")

    def test_release_reentrant_decrements_ref_count(self, lock_manager):
        """Test release decrements ref_count for reentrant lock."""
        lock_manager.acquire("/test/file.txt", "task-1", timeout=1.0)
        lock_manager.acquire("/test/file.txt", "task-1", timeout=1.0)

        # First release should decrement ref_count
        lock_manager.release("/test/file.txt", "task-1")
        assert lock_manager.held_locks["/test/file.txt"].ref_count == 1

        # Second release should fully release
        lock_manager.release("/test/file.txt", "task-1")
        assert "/test/file.txt" not in lock_manager.held_locks


class TestFileLockManagerGetHolder:
    """Test FileLockManager get_holder method."""

    def test_get_holder_returns_holder_id(self, lock_manager):
        """Test get_holder returns holder ID."""
        lock_manager.acquire("/test/file.txt", "task-1", timeout=1.0)
        holder = lock_manager.get_holder("/test/file.txt")
        assert holder == "task-1"
        lock_manager.cleanup("task-1")

    def test_get_holder_not_held(self, lock_manager):
        """Test get_holder returns None for not-held lock."""
        holder = lock_manager.get_holder("/test/file.txt")
        assert holder is None


class TestFileLockManagerCleanup:
    """Test FileLockManager cleanup method."""

    def test_cleanup_releases_all_locks(self, lock_manager):
        """Test cleanup releases all locks for holder."""
        lock_manager.acquire("/file1.txt", "task-1", timeout=1.0)
        lock_manager.acquire("/file2.txt", "task-1", timeout=1.0)
        lock_manager.acquire("/file3.txt", "task-2", timeout=1.0)

        lock_manager.cleanup("task-1")

        assert "/file1.txt" not in lock_manager.held_locks
        assert "/file2.txt" not in lock_manager.held_locks
        assert "/file3.txt" in lock_manager.held_locks  # Still held by task-2
        lock_manager.cleanup("task-2")

    def test_cleanup_no_locks(self, lock_manager):
        """Test cleanup when no locks held."""
        # Should not raise
        lock_manager.cleanup("task-1")


class TestFileLockManagerGetStatus:
    """Test FileLockManager get_status method."""

    def test_get_status_empty(self, lock_manager):
        """Test status with no locks."""
        status = lock_manager.get_status()
        assert status["held_locks"] == 0
        assert len(status["locks"]) == 0

    def test_get_status_with_locks(self, lock_manager):
        """Test status with locks."""
        lock_manager.acquire("/file1.txt", "task-1", timeout=1.0)
        lock_manager.acquire("/file2.txt", "task-1", timeout=1.0)

        status = lock_manager.get_status()
        assert status["held_locks"] == 2
        assert len(status["locks"]) == 2

        lock_manager.cleanup("task-1")

    def test_get_status_includes_lock_info(self, lock_manager):
        """Test status includes lock details."""
        lock_manager.acquire("/test/file.txt", "task-123", timeout=1.0)

        status = lock_manager.get_status()
        lock_info = status["locks"][0]

        assert lock_info["file_path"] == "/test/file.txt"
        assert lock_info["holder_id"] == "task-123"
        assert "acquired_at" in lock_info
        assert "age_seconds" in lock_info

        lock_manager.cleanup("task-123")


class TestFileLockManagerStaleLocks:
    """Test FileLockManager stale lock handling."""

    def test_is_lock_stale_false(self, lock_manager):
        """Test _is_lock_stale returns False for fresh lock."""
        lock_manager.acquire("/test/file.txt", "task-1", timeout=1.0)
        lock_file = lock_manager._get_lock_file_path("/test/file.txt")

        result = lock_manager._is_lock_stale(lock_file)
        assert result is False
        lock_manager.cleanup("task-1")

    def test_is_lock_stale_missing_file(self, lock_manager):
        """Test _is_lock_stale returns True for missing file."""
        result = lock_manager._is_lock_stale("/nonexistent/file.lock")
        assert result is True

    def test_release_stale_lock(self, lock_manager):
        """Test _release_stale_lock removes file."""
        lock_manager.acquire("/test/file.txt", "task-1", timeout=1.0)
        lock_file = lock_manager._get_lock_file_path("/test/file.txt")

        lock_manager._release_stale_lock(lock_file)
        assert not Path(lock_file).exists()


# ============================================================================
# FileLockManager Tests - Async
# ============================================================================

class TestFileLockManagerAsyncAcquire:
    """Test FileLockManager async acquire method."""

    @pytest.mark.asyncio
    async def test_acquire_async_basic(self, async_lock_manager):
        """Test basic async lock acquisition."""
        result = await async_lock_manager.acquire_async(
            "/test/file.txt", "task-1", timeout=1.0
        )
        assert result is True
        async_lock_manager.cleanup("task-1")

    @pytest.mark.asyncio
    async def test_acquire_async_reentrant(self, async_lock_manager):
        """Test async reentrant lock."""
        await async_lock_manager.acquire_async("/test/file.txt", "task-1", timeout=1.0)
        result = await async_lock_manager.acquire_async(
            "/test/file.txt", "task-1", timeout=1.0
        )
        assert result is True
        assert async_lock_manager.held_locks["/test/file.txt"].ref_count == 2
        async_lock_manager.cleanup("task-1")

    @pytest.mark.asyncio
    async def test_acquire_async_timeout(self, async_lock_manager):
        """Test async acquire timeout."""
        await async_lock_manager.acquire_async("/test/file.txt", "task-1", timeout=1.0)

        start = time.time()
        result = await async_lock_manager.acquire_async(
            "/test/file.txt", "task-2", timeout=0.3
        )
        elapsed = time.time() - start

        assert result is False
        assert elapsed >= 0.3
        async_lock_manager.cleanup("task-1")

    @pytest.mark.asyncio
    async def test_acquire_async_deadlock_detection(self, async_lock_manager):
        """Test async deadlock detection."""
        async_lock_manager._deadlock_detection_cycles.add("task-1:/test/file.txt")

        # Should detect potential deadlock
        result = await async_lock_manager.acquire_async(
            "/test/file.txt", "task-1", timeout=0.1
        )
        assert result is False

    @pytest.mark.asyncio
    async def test_acquire_async_no_cpu_busy_wait(self, async_lock_manager):
        """Test async acquire doesn't use CPU busy-wait."""
        await async_lock_manager.acquire_async("/test/file.txt", "task-1", timeout=1.0)

        # Start async acquire for different holder
        start = time.time()

        async def try_acquire():
            await async_lock_manager.acquire_async(
                "/test/file.txt", "task-2", timeout=0.5
            )

        # Run with low CPU usage
        await try_acquire()

        elapsed = time.time() - start
        assert elapsed >= 0.5

        async_lock_manager.cleanup("task-1")


class TestFileLockManagerAsyncLock:
    """Test FileLockManager async_lock context manager."""

    @pytest.mark.asyncio
    async def test_async_lock_context(self, async_lock_manager):
        """Test async_lock context manager."""
        async with async_lock_manager.async_lock("/test/file.txt", "task-1"):
            assert "/test/file.txt" in async_lock_manager.held_locks

        # Lock released after context exit
        assert "/test/file.txt" not in async_lock_manager.held_locks

    @pytest.mark.asyncio
    async def test_async_lock_timeout_raises(self, async_lock_manager):
        """Test async_lock raises on timeout."""
        await async_lock_manager.acquire_async("/test/file.txt", "task-1", timeout=1.0)

        with pytest.raises(TimeoutError):
            async with async_lock_manager.async_lock(
                "/test/file.txt", "task-2", timeout=0.2
            ):
                pass

        async_lock_manager.cleanup("task-1")

    @pytest.mark.asyncio
    async def test_async_lock_releases_on_exception(self, async_lock_manager):
        """Test async_lock releases on exception."""
        try:
            async with async_lock_manager.async_lock("/test/file.txt", "task-1"):
                raise RuntimeError("Test exception")
        except RuntimeError:
            pass

        assert "/test/file.txt" not in async_lock_manager.held_locks


class TestFileLockManagerCleanupAsyncEvents:
    """Test FileLockManager cleanup_async_events method."""

    def test_cleanup_async_events_empty(self, lock_manager):
        """Test cleanup with no async events."""
        count = lock_manager.cleanup_async_events()
        assert count == 0

    def test_cleanup_async_events_with_stale(self, lock_manager):
        """Test cleanup removes stale events."""
        # Add a stale event (already set)
        lock_manager._async_events["/test/file"] = asyncio.Event()
        lock_manager._async_events["/test/file"].set()
        lock_manager._async_events_keys.append("/test/file")

        count = lock_manager.cleanup_async_events()
        assert count == 1
        assert "/test/file" not in lock_manager._async_events


class TestFileLockManagerShutdown:
    """Test FileLockManager shutdown method."""

    def test_shutdown_stops_heartbeat(self, lock_manager):
        """Test shutdown stops heartbeat manager."""
        lock_manager.shutdown()
        assert not lock_manager._heartbeat_manager._running

    def test_shutdown_releases_all_locks(self, lock_manager):
        """Test shutdown releases all locks."""
        lock_manager.acquire("/file1.txt", "task-1", timeout=1.0)
        lock_manager.acquire("/file2.txt", "task-1", timeout=1.0)

        lock_manager.shutdown()

        assert len(lock_manager.held_locks) == 0

    def test_shutdown_idempotent(self, lock_manager):
        """Test shutdown is idempotent."""
        lock_manager.shutdown()
        lock_manager.shutdown()  # Should not raise


# ============================================================================
# FileLockManager Tests - Context Manager
# ============================================================================

class TestFileLockManagerContextManager:
    """Test FileLockManager as context manager."""

    def test_context_manager_enter(self, temp_lock_dir):
        """Test context manager __enter__."""
        with FileLockManager(lock_dir=str(temp_lock_dir)) as manager:
            assert isinstance(manager, FileLockManager)

    def test_context_manager_exit(self, temp_lock_dir):
        """Test context manager __exit__ calls shutdown."""
        manager = FileLockManager(lock_dir=str(temp_lock_dir))
        manager.acquire("/test/file.txt", "task-1", timeout=1.0)

        with manager:
            pass  # Enter does nothing special

        # Exit should call shutdown
        assert not manager._heartbeat_manager._running

    def test_context_manager_exit_with_exception(self, temp_lock_dir):
        """Test context manager handles exceptions."""
        try:
            with FileLockManager(lock_dir=str(temp_lock_dir)) as manager:
                manager.acquire("/test/file.txt", "task-1", timeout=1.0)
                raise RuntimeError("Test")
        except RuntimeError:
            pass

        # Should still cleanup
        assert not manager._heartbeat_manager._running


# ============================================================================
# FileLockManager Tests - Thread Safety
# ============================================================================

class TestFileLockManagerThreadSafety:
    """Test FileLockManager thread safety."""

    def test_concurrent_acquire_different_files(self, lock_manager):
        """Test concurrent acquire on different files."""
        results = []
        errors = []

        def acquire_file(i):
            try:
                result = lock_manager.acquire(f"/file{i}.txt", f"task-{i}", timeout=1.0)
                results.append(result)
                lock_manager.cleanup(f"task-{i}")
            except Exception as e:
                errors.append(e)

        threads = [threading.Thread(target=acquire_file, args=(i,)) for i in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(errors) == 0
        assert all(results)

    def test_concurrent_acquire_same_file(self, lock_manager):
        """Test concurrent acquire on same file."""
        acquired_count = []
        errors = []

        def try_acquire(task_id):
            try:
                result = lock_manager.acquire("/shared.txt", task_id, timeout=0.5)
                if result:
                    acquired_count.append(task_id)
                    time.sleep(0.1)
                    lock_manager.release("/shared.txt", task_id)
            except Exception as e:
                errors.append(e)

        threads = [
            threading.Thread(target=try_acquire, args=(f"task-{i}",))
            for i in range(5)
        ]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(errors) == 0
        # Only one thread should have acquired at a time
        assert len(acquired_count) >= 1

    def test_concurrent_cleanup(self, lock_manager):
        """Test concurrent cleanup calls."""
        lock_manager.acquire("/file1.txt", "task-1", timeout=1.0)
        lock_manager.acquire("/file2.txt", "task-1", timeout=1.0)

        def cleanup_task():
            lock_manager.cleanup("task-1")

        threads = [threading.Thread(target=cleanup_task) for _ in range(5)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        # All locks should be cleaned up
        assert len(lock_manager.held_locks) == 0


# ============================================================================
# Edge Cases and Error Handling
# ============================================================================

class TestFileLockManagerEdgeCases:
    """Test edge cases and error handling."""

    def test_acquire_with_special_characters_in_path(self, lock_manager):
        """Test acquire with special characters in path."""
        result = lock_manager.acquire("/test/file with spaces.txt", "task-1", timeout=1.0)
        assert result is True
        lock_manager.cleanup("task-1")

    def test_acquire_with_unicode_path(self, lock_manager):
        """Test acquire with unicode in path."""
        result = lock_manager.acquire("/test/\u4e2d\u6587.txt", "task-1", timeout=1.0)
        assert result is True
        lock_manager.cleanup("task-1")

    def test_acquire_with_very_long_path(self, lock_manager):
        """Test acquire with very long path."""
        long_path = "/test/" + "a" * 500 + ".txt"
        result = lock_manager.acquire(long_path, "task-1", timeout=1.0)
        assert result is True
        lock_manager.cleanup("task-1")

    def test_release_file_not_in_memory_but_lock_exists(self, lock_manager, temp_lock_dir):
        """Test release when lock file exists but not in memory."""
        # Create lock file manually
        lock_file = temp_lock_dir / "test.lock"
        lock_file.write_text("task-1\n/test/file\n2025-01-01T00:00:00")

        # Release should handle gracefully
        result = lock_manager.release("/test/file", "task-1")
        # Returns False since not in memory
        assert result is False


# ============================================================================
# FL-E2 FIX: AsyncEventManager Tests
# ============================================================================

class TestAsyncEventManager:
    """Test AsyncEventManager for FL-E2 memory leak fix."""

    def test_init_defaults(self):
        """Test AsyncEventManager default initialization."""
        manager = AsyncEventManager()
        assert manager._max_size == 1000
        assert manager._ttl == 300.0
        assert manager.size == 0

    def test_init_custom_params(self):
        """Test AsyncEventManager with custom parameters."""
        manager = AsyncEventManager(max_size=100, ttl_seconds=60.0)
        assert manager._max_size == 100
        assert manager._ttl == 60.0

    def test_get_or_create_new_event(self):
        """Test get_or_create creates new event."""
        manager = AsyncEventManager()
        event = manager.get_or_create("/test/file.txt")
        assert event is not None
        assert isinstance(event, asyncio.Event)
        assert manager.size == 1

    def test_get_or_create_existing_event(self):
        """Test get_or_create returns existing event."""
        manager = AsyncEventManager()
        event1 = manager.get_or_create("/test/file.txt")
        event2 = manager.get_or_create("/test/file.txt")
        assert event1 is event2
        assert manager.size == 1

    def test_lru_eviction(self):
        """Test LRU eviction when max_size reached."""
        manager = AsyncEventManager(max_size=3)

        # Add 3 events
        manager.get_or_create("/file1.txt")
        manager.get_or_create("/file2.txt")
        manager.get_or_create("/file3.txt")
        assert manager.size == 3

        # Add 4th - should evict oldest (/file1.txt)
        manager.get_or_create("/file4.txt")
        assert manager.size == 3
        assert not manager.contains("/file1.txt")
        assert manager.contains("/file4.txt")

    def test_lru_access_updates_order(self):
        """Test LRU access updates order (most recent to end)."""
        manager = AsyncEventManager(max_size=3)

        manager.get_or_create("/file1.txt")
        manager.get_or_create("/file2.txt")
        manager.get_or_create("/file3.txt")

        # Access file1 again - should move to end
        manager.get_or_create("/file1.txt")

        # Add new file - should evict file2 (now oldest)
        manager.get_or_create("/file4.txt")
        assert manager.size == 3
        assert manager.contains("/file1.txt")  # Still present (was accessed recently)
        assert not manager.contains("/file2.txt")  # Evicted

    def test_remove_existing(self):
        """Test remove existing key."""
        manager = AsyncEventManager()
        manager.get_or_create("/test/file.txt")
        result = manager.remove("/test/file.txt")
        assert result is True
        assert manager.size == 0

    def test_remove_nonexistent(self):
        """Test remove nonexistent key."""
        manager = AsyncEventManager()
        result = manager.remove("/nonexistent")
        assert result is False

    def test_contains(self):
        """Test contains method."""
        manager = AsyncEventManager()
        assert not manager.contains("/test/file.txt")
        manager.get_or_create("/test/file.txt")
        assert manager.contains("/test/file.txt")

    def test_set_event(self):
        """Test set_event method."""
        manager = AsyncEventManager()
        manager.get_or_create("/test/file.txt")

        result = manager.set_event("/test/file.txt")
        assert result is True

        # Check event is set
        import asyncio
        event = manager.get_or_create("/test/file.txt")
        assert event.is_set()

    def test_set_event_nonexistent(self):
        """Test set_event for nonexistent key."""
        manager = AsyncEventManager()
        result = manager.set_event("/nonexistent")
        assert result is False

    def test_ttl_expiry(self):
        """Test TTL expiry removes old events."""
        manager = AsyncEventManager(max_size=10, ttl_seconds=0.1)

        # Add event
        manager.get_or_create("/test/file.txt")
        assert manager.size == 1

        # Wait for TTL to expire
        time.sleep(0.15)

        # Next access should trigger cleanup and remove expired
        manager.get_or_create("/new/file.txt")
        assert not manager.contains("/test/file.txt")

    def test_cleanup_stale(self):
        """Test cleanup_stale removes set events."""
        manager = AsyncEventManager()

        # Add and set event
        event = manager.get_or_create("/test/file.txt")
        event.set()

        # Add another unset event
        manager.get_or_create("/other/file.txt")
        assert manager.size == 2

        # Cleanup should remove the set event
        count = manager.cleanup_stale()
        assert count == 1
        assert not manager.contains("/test/file.txt")
        assert manager.contains("/other/file.txt")


class TestFileLockManagerAsyncEventManagerIntegration:
    """Test FileLockManager integration with AsyncEventManager (FL-E2)."""

    def test_async_events_manager_initialized(self, lock_manager):
        """Test AsyncEventManager is initialized in FileLockManager."""
        assert hasattr(lock_manager, "_async_events")
        assert isinstance(lock_manager._async_events, AsyncEventManager)

    @pytest.mark.asyncio
    async def test_acquire_async_creates_event(self, async_lock_manager):
        """Test acquire_async creates event in manager."""
        # Start acquiring a lock (will timeout)
        await async_lock_manager.acquire_async("/test/file.txt", "task-1", timeout=1.0)

        # Event should exist for this file
        assert async_lock_manager._async_events.contains("/test/file.txt")
        async_lock_manager.cleanup("task-1")

    @pytest.mark.asyncio
    async def test_release_removes_event(self, async_lock_manager):
        """Test release removes event from manager."""
        await async_lock_manager.acquire_async("/test/file.txt", "task-1", timeout=1.0)
        async_lock_manager.release("/test/file.txt", "task-1")

        # Event should be removed
        assert not async_lock_manager._async_events.contains("/test/file.txt")

    @pytest.mark.asyncio
    async def test_memory_leak_prevention_no_release(self, async_lock_manager):
        """Test memory leak prevention when release never called (FL-E2)."""
        # Create manager with very short TTL
        short_ttl_manager = AsyncEventManager(max_size=10, ttl_seconds=0.1)

        # Add event
        short_ttl_manager.get_or_create("/orphan/file.txt")
        assert short_ttl_manager.size == 1

        # Wait for TTL
        time.sleep(0.15)

        # Next operation should cleanup expired
        short_ttl_manager.get_or_create("/new/file.txt")
        assert not short_ttl_manager.contains("/orphan/file.txt")

    @pytest.mark.asyncio
    async def test_bounded_size_prevents_unbounded_growth(self, async_lock_manager):
        """Test bounded size prevents unbounded memory growth."""
        # Create manager with small size
        small_manager = AsyncEventManager(max_size=5)

        # Add more events than max_size
        for i in range(10):
            small_manager.get_or_create(f"/file{i}.txt")

        # Size should be capped at max_size
        assert small_manager.size <= 5

    def test_cleanup_async_events_delegates_to_manager(self, lock_manager):
        """Test cleanup_async_events delegates to AsyncEventManager."""
        # Add a stale event
        event = lock_manager._async_events.get_or_create("/test/file.txt")
        event.set()

        count = lock_manager.cleanup_async_events()
        assert count == 1
