"""Distributed lock implementations for Orchestrator V14.0.3.

This module provides Redis-based distributed locking with graceful fallback
to file-based locking when Redis is unavailable.

Features:
- Redis-based distributed lock with async support
- Automatic TTL to prevent deadlocks
- Exponential backoff retry logic
- Health check for Redis connection
- Graceful degradation to FileLockManager
- Configuration via environment variables (REDIS_URL, REDIS_PASSWORD)
- Thread-safe implementation

Requirements:
    pip install redis[hiredis]  # For async Redis support

Usage:
    # Async context manager (recommended)
    async with DistributedLockManager() as lock_mgr:
        async with lock_mgr.acquire("resource", "holder"):
            # Exclusive access
            pass

    # Manual acquire/release
    lock_mgr = DistributedLockManager()
    if await lock_mgr.acquire("resource", "holder", ttl=30):
        try:
            # Work
            pass
        finally:
            await lock_mgr.release("resource", "holder")
"""

import os
import asyncio
import time
import hashlib
import logging
import threading
import uuid
from abc import ABC, abstractmethod
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, Tuple

# Type hints for optional Redis dependency
try:
    from redis.asyncio import Redis as AsyncRedis
    from redis.asyncio.connection import ConnectionPool as AsyncConnectionPool
    from redis.exceptions import RedisError, ConnectionError as RedisConnectionError
    REDIS_AVAILABLE = True
except ImportError:
    AsyncRedis = None  # type: ignore
    AsyncConnectionPool = None  # type: ignore
    RedisError = Exception  # type: ignore
    RedisConnectionError = Exception  # type: ignore
    REDIS_AVAILABLE = False

# Import FileLockManager for fallback
from lib.file_locks import FileLockManager

logger = logging.getLogger(__name__)

# Default configuration
DEFAULT_STALE_TIMEOUT = 300.0
DEFAULT_TTL = 30  # Lock TTL in seconds
DEFAULT_RETRY_BASE_DELAY = 0.1  # Base delay for exponential backoff
DEFAULT_RETRY_MAX_DELAY = 5.0  # Max delay for exponential backoff
DEFAULT_RETRY_MAX_ATTEMPTS = 10  # Max retry attempts
REDIS_HEALTH_CHECK_INTERVAL = 30  # Seconds between health checks


@dataclass
class LockMetadata:
    """Metadata for a held lock."""
    resource: str
    holder_id: str
    acquired_at: datetime
    ttl: int
    lock_value: str  # Unique value for Redis lock (prevents accidental release)
    backend: str  # 'redis' or 'file'


class LockBackend(ABC):
    """Abstract base class for lock backends."""

    @abstractmethod
    async def acquire(
        self,
        resource: str,
        holder_id: str,
        ttl: int,
        timeout: float
    ) -> Tuple[bool, Optional[LockMetadata]]:
        """
        Acquire lock.

        Args:
            resource: Resource identifier
            holder_id: Unique holder ID
            ttl: Lock TTL in seconds
            timeout: Max wait time in seconds

        Returns:
            Tuple of (success, metadata)
        """
        pass

    @abstractmethod
    async def release(
        self,
        resource: str,
        holder_id: str,
        metadata: Optional[LockMetadata] = None
    ) -> bool:
        """
        Release lock.

        Args:
            resource: Resource identifier
            holder_id: Holder ID
            metadata: Lock metadata (for Redis)

        Returns:
            True if released, False otherwise
        """
        pass

    @abstractmethod
    async def is_locked(self, resource: str) -> bool:
        """Check if resource is locked."""
        pass

    @abstractmethod
    async def health_check(self) -> Dict[str, Any]:
        """Check backend health status."""
        pass


class RedisLockBackend(LockBackend):
    """
    Redis-based distributed lock backend.

    Uses Redis SET with NX and EX flags for atomic lock acquisition.
    Implements the Redlock algorithm simplified for single Redis instance.
    """

    def __init__(
        self,
        redis_url: Optional[str] = None,
        redis_password: Optional[str] = None,
        key_prefix: str = "claude:lock:"
    ):
        """
        Initialize Redis lock backend.

        Args:
            redis_url: Redis connection URL (default: from REDIS_URL env var)
            redis_password: Redis password (default: from REDIS_PASSWORD env var)
            key_prefix: Prefix for all lock keys
        """
        self._redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self._redis_password = redis_password or os.getenv("REDIS_PASSWORD")
        self._key_prefix = key_prefix
        self._redis: Optional[AsyncRedis] = None
        self._pool: Optional[AsyncConnectionPool] = None
        self._lock = threading.Lock()
        self._held_locks: Dict[str, LockMetadata] = {}
        self._last_health_check: float = 0
        self._is_healthy: bool = False

    def _get_lock_key(self, resource: str) -> str:
        """Get Redis key for resource."""
        hash_id = hashlib.sha256(resource.encode()).hexdigest()[:16]
        return f"{self._key_prefix}{hash_id}"

    async def _connect(self) -> bool:
        """
        Establish Redis connection.

        Returns:
            True if connected, False otherwise
        """
        if not REDIS_AVAILABLE:
            logger.warning("Redis package not installed. Run: pip install redis[hiredis]")
            return False

        if self._redis is not None:
            return True

        try:
            self._pool = AsyncConnectionPool.from_url(
                self._redis_url,
                password=self._redis_password,
                decode_responses=True,
                max_connections=10
            )
            self._redis = AsyncRedis(connection_pool=self._pool)
            # Test connection
            await self._redis.ping()
            logger.info(f"Redis connected: {self._redis_url}")
            return True
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}")
            self._redis = None
            self._pool = None
            return False

    async def _disconnect(self) -> None:
        """Close Redis connection."""
        if self._redis is not None:
            try:
                await self._redis.close()
                if self._pool is not None:
                    await self._pool.disconnect()
            except Exception as e:
                logger.debug(f"Redis disconnect error: {e}")
            finally:
                self._redis = None
                self._pool = None

    async def _ensure_connected(self) -> bool:
        """
        Ensure Redis connection is available.

        Returns:
            True if connected, False otherwise
        """
        if self._redis is None:
            return await self._connect()

        # Periodic health check
        now = time.time()
        if now - self._last_health_check > REDIS_HEALTH_CHECK_INTERVAL:
            self._last_health_check = now
            try:
                await self._redis.ping()
                self._is_healthy = True
            except Exception:
                self._is_healthy = False
                logger.warning("Redis health check failed")
                return False

        return self._is_healthy

    async def acquire(
        self,
        resource: str,
        holder_id: str,
        ttl: int = DEFAULT_TTL,
        timeout: float = 10.0
    ) -> Tuple[bool, Optional[LockMetadata]]:
        """
        Acquire Redis lock with TTL and exponential backoff.

        Args:
            resource: Resource identifier
            holder_id: Unique holder ID
            ttl: Lock TTL in seconds (prevents deadlock if holder crashes)
            timeout: Max wait time in seconds

        Returns:
            Tuple of (success, metadata)
        """
        if not await self._ensure_connected():
            return False, None

        lock_key = self._get_lock_key(resource)
        lock_value = str(uuid.uuid4())  # Unique value for this lock acquisition
        start_time = time.time()

        # Check for reentrant lock
        with self._lock:
            if resource in self._held_locks:
                existing = self._held_locks[resource]
                if existing.holder_id == holder_id:
                    logger.debug(f"Reentrant Redis lock: {resource} by {holder_id}")
                    return True, existing

        # Exponential backoff parameters
        delay = DEFAULT_RETRY_BASE_DELAY
        attempt = 0

        while time.time() - start_time < timeout:
            attempt += 1

            try:
                # SET NX EX - atomic set-if-not-exists with TTL
                acquired = await self._redis.set(
                    lock_key,
                    lock_value,
                    nx=True,
                    ex=ttl
                )

                if acquired:
                    metadata = LockMetadata(
                        resource=resource,
                        holder_id=holder_id,
                        acquired_at=datetime.now(),
                        ttl=ttl,
                        lock_value=lock_value,
                        backend='redis'
                    )
                    with self._lock:
                        self._held_locks[resource] = metadata

                    logger.info(
                        f"Redis lock acquired: {resource} by {holder_id} "
                        f"(ttl={ttl}s, attempts={attempt})"
                    )
                    return True, metadata

            except (RedisError, RedisConnectionError) as e:
                logger.warning(f"Redis error during acquire attempt {attempt}: {e}")
                self._is_healthy = False
                return False, None

            # Wait with exponential backoff
            remaining = timeout - (time.time() - start_time)
            if remaining <= 0:
                break

            wait_time = min(delay, remaining, DEFAULT_RETRY_MAX_DELAY)
            await asyncio.sleep(wait_time)
            delay = min(delay * 2, DEFAULT_RETRY_MAX_DELAY)

        logger.warning(
            f"Redis lock acquisition timeout: {resource} by {holder_id} "
            f"(attempts={attempt}, timeout={timeout}s)"
        )
        return False, None

    async def release(
        self,
        resource: str,
        holder_id: str,
        metadata: Optional[LockMetadata] = None
    ) -> bool:
        """
        Release Redis lock using Lua script for atomicity.

        Only releases if the lock value matches (prevents releasing
        another holder's lock).

        Args:
            resource: Resource identifier
            holder_id: Holder ID
            metadata: Lock metadata (required for lock_value)

        Returns:
            True if released, False otherwise
        """
        if self._redis is None:
            return False

        lock_key = self._get_lock_key(resource)

        # Get metadata if not provided
        if metadata is None:
            with self._lock:
                metadata = self._held_locks.get(resource)

        if metadata is None:
            logger.debug(f"No metadata for Redis lock: {resource}")
            return False

        # Lua script for atomic compare-and-delete
        # Only deletes if the value matches
        lua_script = """
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
        else
            return 0
        end
        """

        try:
            result = await self._redis.eval(
                lua_script,
                1,
                lock_key,
                metadata.lock_value
            )

            with self._lock:
                if resource in self._held_locks:
                    del self._held_locks[resource]

            if result:
                logger.info(f"Redis lock released: {resource} by {holder_id}")
                return True
            else:
                logger.warning(
                    f"Redis lock not released (value mismatch or expired): {resource}"
                )
                return False

        except (RedisError, RedisConnectionError) as e:
            logger.error(f"Redis error during release: {e}")
            self._is_healthy = False
            return False

    async def is_locked(self, resource: str) -> bool:
        """Check if resource is locked in Redis."""
        if not await self._ensure_connected():
            return False

        lock_key = self._get_lock_key(resource)
        try:
            return await self._redis.exists(lock_key) > 0
        except (RedisError, RedisConnectionError):
            return False

    async def health_check(self) -> Dict[str, Any]:
        """
        Check Redis health status.

        Returns:
            Dict with health information
        """
        result = {
            "backend": "redis",
            "available": REDIS_AVAILABLE,
            "connected": self._redis is not None,
            "healthy": False,
            "url": self._redis_url.split('@')[-1] if '@' in self._redis_url else self._redis_url,
            "held_locks": len(self._held_locks),
            "error": None
        }

        if not REDIS_AVAILABLE:
            result["error"] = "redis package not installed"
            return result

        if self._redis is None:
            result["error"] = "not connected"
            return result

        try:
            start = time.time()
            await self._redis.ping()
            latency_ms = (time.time() - start) * 1000

            result["healthy"] = True
            result["latency_ms"] = round(latency_ms, 2)
            self._is_healthy = True
        except Exception as e:
            result["error"] = str(e)
            self._is_healthy = False

        return result

    async def close(self) -> None:
        """Close Redis connection."""
        await self._disconnect()


class FileLockBackend(LockBackend):
    """
    File-based lock backend using FileLockManager.

    Provides same interface as RedisLockBackend for graceful fallback.
    """

    def __init__(
        self,
        lock_dir: Optional[str] = None,
        stale_timeout: float = DEFAULT_STALE_TIMEOUT
    ):
        """
        Initialize file lock backend.

        Args:
            lock_dir: Directory for lock files
            stale_timeout: Seconds before lock is considered stale
        """
        self._file_lock = FileLockManager(
            lock_dir=lock_dir,
            stale_timeout=stale_timeout
        )
        self._held_locks: Dict[str, LockMetadata] = {}
        self._lock = threading.Lock()

    async def acquire(
        self,
        resource: str,
        holder_id: str,
        ttl: int = DEFAULT_TTL,
        timeout: float = 10.0
    ) -> Tuple[bool, Optional[LockMetadata]]:
        """
        Acquire file-based lock.

        Args:
            resource: Resource identifier
            holder_id: Unique holder ID
            ttl: Lock TTL (used as stale timeout hint)
            timeout: Max wait time in seconds

        Returns:
            Tuple of (success, metadata)
        """
        # Use async method from FileLockManager
        acquired = await self._file_lock.acquire_async(
            file_path=resource,
            holder_id=holder_id,
            timeout=timeout
        )

        if acquired:
            metadata = LockMetadata(
                resource=resource,
                holder_id=holder_id,
                acquired_at=datetime.now(),
                ttl=ttl,
                lock_value=holder_id,  # For file locks, value is holder_id
                backend='file'
            )
            with self._lock:
                self._held_locks[resource] = metadata

            logger.info(f"File lock acquired: {resource} by {holder_id}")
            return True, metadata

        return False, None

    async def release(
        self,
        resource: str,
        holder_id: str,
        metadata: Optional[LockMetadata] = None
    ) -> bool:
        """
        Release file-based lock.

        Args:
            resource: Resource identifier
            holder_id: Holder ID
            metadata: Lock metadata (ignored for file locks)

        Returns:
            True if released, False otherwise
        """
        released = self._file_lock.release(
            file_path=resource,
            holder_id=holder_id
        )

        if released:
            with self._lock:
                if resource in self._held_locks:
                    del self._held_locks[resource]
            logger.info(f"File lock released: {resource} by {holder_id}")

        return released

    async def is_locked(self, resource: str) -> bool:
        """Check if resource is locked."""
        holder = self._file_lock.get_holder(resource)
        return holder is not None

    async def health_check(self) -> Dict[str, Any]:
        """
        Check file lock backend health.

        Returns:
            Dict with health information
        """
        lock_dir = str(self._file_lock.lock_dir)
        lock_dir_exists = Path(lock_dir).exists()

        return {
            "backend": "file",
            "available": True,
            "healthy": lock_dir_exists,
            "lock_dir": lock_dir,
            "held_locks": len(self._held_locks),
            "error": None if lock_dir_exists else "lock_dir does not exist"
        }

    def cleanup(self, holder_id: str) -> int:
        """
        Cleanup all locks held by holder.

        Args:
            holder_id: Holder ID

        Returns:
            Number of locks released
        """
        self._file_lock.cleanup(holder_id)
        with self._lock:
            count = sum(
                1 for m in self._held_locks.values()
                if m.holder_id == holder_id
            )
            self._held_locks = {
                k: v for k, v in self._held_locks.items()
                if v.holder_id != holder_id
            }
        return count


class DistributedLockManager:
    """
    Redis-based distributed lock manager with graceful fallback.

    Features:
    - Async context manager interface
    - Automatic TTL to prevent deadlocks
    - Exponential backoff retry
    - Health check for Redis connection
    - Fallback to FileLockManager when Redis unavailable
    - Configuration via environment variables

    Environment Variables:
        REDIS_URL: Redis connection URL (default: redis://localhost:6379/0)
        REDIS_PASSWORD: Redis password (optional)

    Usage:
        # Async context manager
        async with DistributedLockManager() as lock_mgr:
            async with lock_mgr.lock("resource", "holder", ttl=30):
                # Exclusive access
                pass

        # Manual acquire/release
        lock_mgr = DistributedLockManager()
        await lock_mgr.initialize()
        try:
            if await lock_mgr.acquire("resource", "holder"):
                # Work
                pass
        finally:
            await lock_mgr.release("resource", "holder")
            await lock_mgr.close()
    """

    def __init__(
        self,
        redis_url: Optional[str] = None,
        redis_password: Optional[str] = None,
        lock_dir: Optional[str] = None,
        stale_timeout: float = DEFAULT_STALE_TIMEOUT,
        prefer_redis: bool = True
    ):
        """
        Initialize DistributedLockManager.

        Args:
            redis_url: Redis connection URL (default: from REDIS_URL env)
            redis_password: Redis password (default: from REDIS_PASSWORD env)
            lock_dir: Directory for file locks (fallback)
            stale_timeout: Seconds before lock is considered stale
            prefer_redis: Try Redis first, fallback to file if unavailable
        """
        self._redis_url = redis_url or os.getenv("REDIS_URL")
        self._redis_password = redis_password or os.getenv("REDIS_PASSWORD")
        self._lock_dir = lock_dir
        self._stale_timeout = stale_timeout
        self._prefer_redis = prefer_redis

        # Backends
        self._redis_backend: Optional[RedisLockBackend] = None
        self._file_backend: Optional[FileLockBackend] = None
        self._active_backend: Optional[LockBackend] = None
        self._using_redis: bool = False

        # Lock metadata for current session
        self._held_locks: Dict[str, LockMetadata] = {}
        self._lock = threading.Lock()

        self._initialized = False

    async def initialize(self) -> bool:
        """
        Initialize lock manager and select backend.

        Attempts Redis connection first if prefer_redis=True,
        falls back to file-based locking if Redis unavailable.

        Returns:
            True if initialized successfully
        """
        if self._initialized:
            return True

        # Try Redis first if preferred and URL is configured
        if self._prefer_redis and (self._redis_url or REDIS_AVAILABLE):
            self._redis_backend = RedisLockBackend(
                redis_url=self._redis_url,
                redis_password=self._redis_password
            )

            if await self._redis_backend._ensure_connected():
                self._active_backend = self._redis_backend
                self._using_redis = True
                logger.info("DistributedLockManager using Redis backend")
            else:
                logger.info("Redis unavailable, falling back to file backend")

        # Fallback to file backend
        if self._active_backend is None:
            self._file_backend = FileLockBackend(
                lock_dir=self._lock_dir,
                stale_timeout=self._stale_timeout
            )
            self._active_backend = self._file_backend
            self._using_redis = False
            logger.info("DistributedLockManager using file backend")

        self._initialized = True
        return True

    async def _ensure_initialized(self) -> None:
        """Ensure lock manager is initialized."""
        if not self._initialized:
            await self.initialize()

    @property
    def using_redis(self) -> bool:
        """Check if using Redis backend."""
        return self._using_redis

    @property
    def backend_type(self) -> str:
        """Get active backend type."""
        return "redis" if self._using_redis else "file"

    async def acquire(
        self,
        resource: str,
        holder_id: str,
        ttl: int = DEFAULT_TTL,
        timeout: float = 10.0
    ) -> bool:
        """
        Acquire distributed lock.

        Args:
            resource: Resource identifier to lock
            holder_id: Unique ID for lock holder
            ttl: Lock TTL in seconds (prevents deadlock)
            timeout: Maximum seconds to wait for lock

        Returns:
            True if lock acquired, False if timeout
        """
        await self._ensure_initialized()

        # Try with active backend
        success, metadata = await self._active_backend.acquire(
            resource=resource,
            holder_id=holder_id,
            ttl=ttl,
            timeout=timeout
        )

        if success and metadata:
            with self._lock:
                self._held_locks[resource] = metadata
            return True

        # If Redis failed, try fallback to file backend
        if self._using_redis and not success:
            logger.info("Redis acquire failed, trying file fallback")
            if self._file_backend is None:
                self._file_backend = FileLockBackend(
                    lock_dir=self._lock_dir,
                    stale_timeout=self._stale_timeout
                )

            success, metadata = await self._file_backend.acquire(
                resource=resource,
                holder_id=holder_id,
                ttl=ttl,
                timeout=min(timeout, 5.0)  # Reduced timeout for fallback
            )

            if success and metadata:
                with self._lock:
                    self._held_locks[resource] = metadata
                logger.info(f"Lock acquired via file fallback: {resource}")
                return True

        return False

    async def release(
        self,
        resource: str,
        holder_id: str
    ) -> bool:
        """
        Release distributed lock.

        Args:
            resource: Resource identifier to unlock
            holder_id: ID of lock holder

        Returns:
            True if lock released, False otherwise
        """
        await self._ensure_initialized()

        # Get metadata to know which backend to use
        with self._lock:
            metadata = self._held_locks.get(resource)

        if metadata is None:
            logger.debug(f"No lock metadata for {resource}")
            return False

        # Release from appropriate backend
        if metadata.backend == 'redis' and self._redis_backend:
            released = await self._redis_backend.release(
                resource, holder_id, metadata
            )
        elif self._file_backend:
            released = await self._file_backend.release(
                resource, holder_id, metadata
            )
        else:
            released = False

        if released:
            with self._lock:
                self._held_locks.pop(resource, None)

        return released

    async def is_locked(self, resource: str) -> bool:
        """
        Check if resource is currently locked.

        Args:
            resource: Resource identifier

        Returns:
            True if locked, False otherwise
        """
        await self._ensure_initialized()
        return await self._active_backend.is_locked(resource)

    async def health_check(self) -> Dict[str, Any]:
        """
        Check health status of lock manager.

        Returns:
            Dict with health information for active and fallback backends
        """
        await self._ensure_initialized()

        result = {
            "initialized": self._initialized,
            "active_backend": self.backend_type,
            "using_redis": self._using_redis,
            "held_locks": len(self._held_locks),
            "redis": None,
            "file": None
        }

        # Check Redis backend
        if self._redis_backend:
            result["redis"] = await self._redis_backend.health_check()

        # Check file backend
        if self._file_backend:
            result["file"] = await self._file_backend.health_check()

        return result

    @asynccontextmanager
    async def lock(
        self,
        resource: str,
        holder_id: str,
        ttl: int = DEFAULT_TTL,
        timeout: float = 10.0
    ):
        """
        Async context manager for distributed locking.

        Usage:
            async with lock_mgr.lock("resource", "holder", ttl=30):
                # Exclusive access
                pass

        Args:
            resource: Resource identifier
            holder_id: Unique holder ID
            ttl: Lock TTL in seconds
            timeout: Maximum wait for lock

        Yields:
            None

        Raises:
            TimeoutError: If lock cannot be acquired
        """
        acquired = await self.acquire(resource, holder_id, ttl, timeout)
        if not acquired:
            raise TimeoutError(
                f"Could not acquire distributed lock for {resource} "
                f"within {timeout}s"
            )
        try:
            yield
        finally:
            await self.release(resource, holder_id)

    async def cleanup(self, holder_id: str) -> int:
        """
        Release all locks held by specific holder.

        Args:
            holder_id: ID of holder

        Returns:
            Number of locks released
        """
        released = 0
        with self._lock:
            resources = [
                r for r, m in self._held_locks.items()
                if m.holder_id == holder_id
            ]

        for resource in resources:
            if await self.release(resource, holder_id):
                released += 1

        # Also cleanup file backend directly
        if self._file_backend:
            released += self._file_backend.cleanup(holder_id)

        if released > 0:
            logger.info(f"Cleaned up {released} locks for holder {holder_id}")

        return released

    async def close(self) -> None:
        """Close all backends and release resources."""
        if self._redis_backend:
            await self._redis_backend.close()

        self._initialized = False
        logger.info("DistributedLockManager closed")

    async def __aenter__(self) -> "DistributedLockManager":
        """Async context manager entry."""
        await self.initialize()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        """Async context manager exit."""
        await self.close()

    def get_status(self) -> Dict[str, Any]:
        """
        Get current lock manager status.

        Returns:
            Dict with status information
        """
        with self._lock:
            locks = [
                {
                    "resource": m.resource,
                    "holder_id": m.holder_id,
                    "backend": m.backend,
                    "acquired_at": m.acquired_at.isoformat(),
                    "ttl": m.ttl
                }
                for m in self._held_locks.values()
            ]

        return {
            "initialized": self._initialized,
            "active_backend": self.backend_type,
            "using_redis": self._using_redis,
            "held_locks_count": len(self._held_locks),
            "locks": locks
        }


# Singleton instance for convenience
_instance: Optional[DistributedLockManager] = None
_instance_lock = threading.Lock()


def get_distributed_lock_manager(
    redis_url: Optional[str] = None,
    redis_password: Optional[str] = None,
    prefer_redis: bool = True
) -> DistributedLockManager:
    """
    Get singleton DistributedLockManager instance.

    Note: For async usage, prefer creating instance directly
    and using async context manager.

    Args:
        redis_url: Redis connection URL
        redis_password: Redis password
        prefer_redis: Prefer Redis backend

    Returns:
        Shared DistributedLockManager instance
    """
    global _instance
    if _instance is None:
        with _instance_lock:
            if _instance is None:
                _instance = DistributedLockManager(
                    redis_url=redis_url,
                    redis_password=redis_password,
                    prefer_redis=prefer_redis
                )
    return _instance


# Backward compatibility: File-based DistributedLockManager
# (original implementation preserved for non-async usage)
class FileDistributedLockManager:
    """
    File-based distributed lock for multi-process coordination.

    This is the original file-based implementation, preserved for
    backward compatibility. For new code, use DistributedLockManager
    with async context manager.

    Uses atomic file creation (O_EXCL) for cross-platform safety.
    """

    def __init__(
        self,
        lock_dir: Optional[str] = None,
        stale_timeout: float = DEFAULT_STALE_TIMEOUT
    ):
        """
        Initialize FileDistributedLockManager.

        Args:
            lock_dir: Directory for lock files (defaults to ~/.claude/dist_locks)
            stale_timeout: Seconds before considering a lock stale
        """
        self.lock_dir = Path(lock_dir or Path.home() / ".claude" / "dist_locks")
        self.lock_dir.mkdir(parents=True, exist_ok=True)
        self.stale_timeout = stale_timeout
        self._local_lock = threading.Lock()
        self._held_locks: Dict[str, int] = {}

        logger.info(
            f"FileDistributedLockManager initialized: dir={self.lock_dir}"
        )

    def _get_lock_path(self, resource: str) -> Path:
        """Get lock file path for resource."""
        hash_id = hashlib.sha256(resource.encode()).hexdigest()[:16]
        return self.lock_dir / f"{hash_id}.lock"

    def _is_lock_stale(self, lock_file: Path) -> bool:
        """Check if lock is stale."""
        try:
            stat = lock_file.stat()
            age = time.time() - stat.st_mtime
            return age > self.stale_timeout
        except (FileNotFoundError, OSError):
            return True

    def acquire(
        self,
        resource: str,
        holder_id: str,
        timeout: float = 30.0,
        poll_interval: float = 0.1
    ) -> bool:
        """
        Acquire file-based distributed lock.

        Args:
            resource: Resource to lock
            holder_id: Holder ID
            timeout: Max wait seconds
            poll_interval: Polling interval

        Returns:
            True if acquired, False if timeout
        """
        lock_file = self._get_lock_path(resource)
        start_time = time.time()

        # Check reentrant
        with self._local_lock:
            if resource in self._held_locks:
                self._held_locks[resource] += 1
                return True

        while time.time() - start_time < timeout:
            try:
                fd = os.open(
                    str(lock_file),
                    os.O_CREAT | os.O_EXCL | os.O_WRONLY,
                    0o644
                )
                try:
                    os.write(fd, f"{holder_id}\n{time.time()}".encode())
                finally:
                    os.close(fd)

                with self._local_lock:
                    self._held_locks[resource] = 1
                logger.info(f"File lock acquired: {resource}")
                return True

            except FileExistsError:
                if self._is_lock_stale(lock_file):
                    try:
                        lock_file.unlink()
                        continue
                    except OSError:
                        pass
                time.sleep(poll_interval)

            except OSError as e:
                logger.error(f"Lock acquire error: {e}")
                return False

        return False

    def release(self, resource: str, holder_id: str) -> bool:
        """Release lock."""
        lock_file = self._get_lock_path(resource)

        with self._local_lock:
            if resource not in self._held_locks:
                return False
            self._held_locks[resource] -= 1
            if self._held_locks[resource] > 0:
                return True
            del self._held_locks[resource]

        try:
            lock_file.unlink()
            logger.info(f"File lock released: {resource}")
            return True
        except (FileNotFoundError, OSError):
            return True

    def cleanup_holder(self, holder_id: str) -> int:
        """Cleanup all locks for holder."""
        released = 0
        with self._local_lock:
            resources = list(self._held_locks.keys())
        for resource in resources:
            if self.release(resource, holder_id):
                released += 1
        return released
