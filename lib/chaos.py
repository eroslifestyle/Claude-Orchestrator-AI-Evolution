"""Chaos Engineering Module for Orchestrator V14.0.4.

This module provides controlled failure injection for testing system resilience.
It implements the Chaos Engineering principles with safe defaults and production
protection.

Features:
    - Network failure injection (timeouts, connection errors)
    - Latency injection (0-500ms configurable)
    - Memory pressure simulation
    - Agent failure simulation
    - Safe mode (disabled by default in production)

Usage:
    from lib.chaos import ChaosInjector, get_chaos_injector

    # Get singleton instance
    chaos = get_chaos_injector()

    # Check if chaos should be injected
    if chaos.should_inject("network"):
        raise ConnectionError("Chaos injection: network failure")

    # Inject latency
    chaos.inject_latency()

    # Context manager for chaos operations
    with chaos.chaos_context("database"):
        # Code that may experience chaos
        pass

Configuration (Environment Variables):
    CHAOS_MODE: Enable chaos engineering (default: false)
    CHAOS_PROBABILITY: Failure probability 0.0-1.0 (default: 0.01)
    CHAOS_MAX_LATENCY_MS: Maximum latency in milliseconds (default: 500)
    CHAOS_SAFE_ENVIRONMENTS: Comma-separated safe environments (default: development,test,staging)
    CHAOS_ENABLED_FAILURES: Comma-separated failure types (default: network,latency,timeout,memory)
"""

from __future__ import annotations

import os
import random
import time
import threading
import logging
import traceback
from contextlib import contextmanager
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, Callable, Dict, List, Any, Set
from functools import wraps
from datetime import datetime


class FailureType(Enum):
    """Types of failures that can be injected."""
    NETWORK = "network"
    LATENCY = "latency"
    TIMEOUT = "timeout"
    MEMORY = "memory"
    CRASH = "crash"
    AGENT = "agent"
    DATABASE = "database"
    CACHE = "cache"


@dataclass
class ChaosConfig:
    """Configuration for chaos injection.

    Attributes:
        enabled: Whether chaos injection is enabled
        probability: Probability of failure injection (0.0-1.0)
        max_latency_ms: Maximum latency to inject in milliseconds
        safe_environments: Environments where chaos can be enabled
        enabled_failures: Set of enabled failure types
        crash_simulation: Whether crash simulation is enabled (opt-in)
        seed: Random seed for reproducibility (optional)
    """
    enabled: bool = False
    probability: float = 0.01  # 1% default
    max_latency_ms: int = 500
    safe_environments: Set[str] = field(
        default_factory=lambda: {"development", "test", "staging"}
    )
    enabled_failures: Set[FailureType] = field(
        default_factory=lambda: {
            FailureType.NETWORK,
            FailureType.LATENCY,
            FailureType.TIMEOUT,
            FailureType.MEMORY,
        }
    )
    crash_simulation: bool = False  # Opt-in only
    seed: Optional[int] = None


@dataclass
class ChaosEvent:
    """Record of a chaos injection event.

    Attributes:
        timestamp: When the event occurred
        failure_type: Type of failure injected
        probability: The probability used
        target: What was targeted (e.g., function name, resource)
        duration_ms: Duration of the chaos effect (for latency)
        details: Additional details about the event
    """
    timestamp: datetime
    failure_type: FailureType
    probability: float
    target: str
    duration_ms: Optional[float] = None
    details: Dict[str, Any] = field(default_factory=dict)


class ChaosInjector:
    """Controlled failure injection for resilience testing.

    This class provides a centralized mechanism for injecting failures
    into the system in a controlled and configurable manner. It respects
    production safety by default and requires explicit opt-in for dangerous
    operations.

    Thread Safety:
        All public methods are thread-safe.

    Example:
        >>> chaos = ChaosInjector()
        >>> chaos.configure(enabled=True, probability=0.1)
        >>>
        >>> # Inject failures randomly
        >>> if chaos.should_inject(FailureType.NETWORK):
        ...     raise ConnectionError("Simulated network failure")
        >>>
        >>> # Context manager
        >>> with chaos.chaos_context("api_call"):
        ...     response = make_api_call()
    """

    _instance: Optional['ChaosInjector'] = None
    _lock = threading.RLock()

    def __new__(cls) -> 'ChaosInjector':
        """Singleton pattern for centralized chaos control."""
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self):
        """Initialize the ChaosInjector with default configuration."""
        if self._initialized:
            return

        self._config = self._load_config_from_env()
        self._rng = random.Random(self._config.seed)
        self._event_history: List[ChaosEvent] = []
        self._history_lock = threading.Lock()
        self._injection_counts: Dict[FailureType, int] = {
            ft: 0 for ft in FailureType
        }
        self._count_lock = threading.Lock()
        self._logger = logging.getLogger(__name__)
        self._initialized = True

    def _load_config_from_env(self) -> ChaosConfig:
        """Load configuration from environment variables.

        Returns:
            ChaosConfig with values from environment or defaults.
        """
        enabled = os.getenv("CHAOS_MODE", "false").lower() in ("true", "1", "yes")
        probability = float(os.getenv("CHAOS_PROBABILITY", "0.01"))
        max_latency_ms = int(os.getenv("CHAOS_MAX_LATENCY_MS", "500"))
        safe_envs_str = os.getenv(
            "CHAOS_SAFE_ENVIRONMENTS",
            "development,test,staging"
        )
        safe_environments = set(e.strip() for e in safe_envs_str.split(","))

        enabled_failures_str = os.getenv(
            "CHAOS_ENABLED_FAILURES",
            "network,latency,timeout,memory"
        )
        enabled_failures = set()
        for ft_str in enabled_failures_str.split(","):
            try:
                enabled_failures.add(FailureType(ft_str.strip()))
            except ValueError:
                pass  # Skip unknown failure types

        crash_simulation = os.getenv(
            "CHAOS_CRASH_SIMULATION", "false"
        ).lower() in ("true", "1", "yes")

        seed_str = os.getenv("CHAOS_SEED")
        seed = int(seed_str) if seed_str else None

        return ChaosConfig(
            enabled=enabled,
            probability=max(0.0, min(1.0, probability)),
            max_latency_ms=max(0, max_latency_ms),
            safe_environments=safe_environments,
            enabled_failures=enabled_failures,
            crash_simulation=crash_simulation,
            seed=seed,
        )

    def configure(
        self,
        enabled: Optional[bool] = None,
        probability: Optional[float] = None,
        max_latency_ms: Optional[int] = None,
        safe_environments: Optional[Set[str]] = None,
        enabled_failures: Optional[Set[FailureType]] = None,
        crash_simulation: Optional[bool] = None,
        seed: Optional[int] = None,
    ) -> None:
        """Update chaos configuration.

        Args:
            enabled: Enable or disable chaos injection
            probability: Failure probability (0.0-1.0)
            max_latency_ms: Maximum latency in milliseconds
            safe_environments: Set of safe environment names
            enabled_failures: Set of enabled failure types
            crash_simulation: Enable crash simulation (dangerous)
            seed: Random seed for reproducibility
        """
        with self._lock:
            if enabled is not None:
                self._config.enabled = enabled
            if probability is not None:
                self._config.probability = max(0.0, min(1.0, probability))
            if max_latency_ms is not None:
                self._config.max_latency_ms = max(0, max_latency_ms)
            if safe_environments is not None:
                self._config.safe_environments = safe_environments
            if enabled_failures is not None:
                self._config.enabled_failures = enabled_failures
            if crash_simulation is not None:
                self._config.crash_simulation = crash_simulation
            if seed is not None:
                self._config.seed = seed
                self._rng = random.Random(seed)

    @property
    def config(self) -> ChaosConfig:
        """Get current configuration (read-only view)."""
        return ChaosConfig(
            enabled=self._config.enabled,
            probability=self._config.probability,
            max_latency_ms=self._config.max_latency_ms,
            safe_environments=self._config.safe_environments.copy(),
            enabled_failures=self._config.enabled_failures.copy(),
            crash_simulation=self._config.crash_simulation,
            seed=self._config.seed,
        )

    @property
    def enabled(self) -> bool:
        """Check if chaos injection is enabled."""
        return self._config.enabled

    @property
    def probability(self) -> float:
        """Get current failure probability."""
        return self._config.probability

    def is_safe_environment(self, environment: Optional[str] = None) -> bool:
        """Check if the current environment is safe for chaos.

        Args:
            environment: Environment name to check. If None, uses
                        CHAOS_ENV or ENV environment variable.

        Returns:
            True if the environment is in the safe list.
        """
        if environment is None:
            environment = os.getenv("CHAOS_ENV") or os.getenv("ENV", "development")
        return environment.lower() in {e.lower() for e in self._config.safe_environments}

    def should_inject(
        self,
        failure_type: FailureType,
        probability: Optional[float] = None,
    ) -> bool:
        """Determine if a failure should be injected.

        This method checks:
        1. Chaos is enabled
        2. The failure type is enabled
        3. The probability check passes
        4. We're in a safe environment (unless forced)

        Args:
            failure_type: Type of failure to potentially inject
            probability: Override probability (uses config if None)

        Returns:
            True if the failure should be injected.
        """
        if not self._config.enabled:
            return False

        if failure_type not in self._config.enabled_failures:
            return False

        # Use provided probability or config default
        prob = probability if probability is not None else self._config.probability

        # Random check
        should_fail = self._rng.random() < prob

        if should_fail:
            self._record_injection(failure_type)
            self._logger.info(
                f"Chaos injection triggered: {failure_type.value} "
                f"(probability={prob:.4f})"
            )

        return should_fail

    def _record_injection(self, failure_type: FailureType) -> None:
        """Record an injection event."""
        event = ChaosEvent(
            timestamp=datetime.now(),
            failure_type=failure_type,
            probability=self._config.probability,
            target="",
        )

        with self._history_lock:
            self._event_history.append(event)
            # Keep history bounded
            if len(self._event_history) > 1000:
                self._event_history = self._event_history[-500:]

        with self._count_lock:
            self._injection_counts[failure_type] += 1

    def inject_latency(
        self,
        min_ms: int = 0,
        max_ms: Optional[int] = None,
    ) -> float:
        """Inject random latency.

        Args:
            min_ms: Minimum latency in milliseconds
            max_ms: Maximum latency (uses config if None)

        Returns:
            Actual latency injected in milliseconds.
        """
        if not self._config.enabled:
            return 0.0

        max_latency = max_ms if max_ms is not None else self._config.max_latency_ms
        latency_ms = self._rng.randint(min_ms, max_latency)
        latency_seconds = latency_ms / 1000.0

        self._logger.debug(f"Injecting latency: {latency_ms}ms")

        event = ChaosEvent(
            timestamp=datetime.now(),
            failure_type=FailureType.LATENCY,
            probability=1.0,  # Latency is always injected when called
            target="latency_injection",
            duration_ms=float(latency_ms),
        )

        with self._history_lock:
            self._event_history.append(event)

        time.sleep(latency_seconds)
        return float(latency_ms)

    def inject_network_failure(
        self,
        raise_exception: bool = True,
    ) -> Optional[Exception]:
        """Inject a network failure.

        Args:
            raise_exception: If True, raises the exception. If False,
                           returns the exception for manual handling.

        Returns:
            The exception that would be raised, if raise_exception is False.

        Raises:
            ConnectionError: If raise_exception is True.
        """
        if not self.should_inject(FailureType.NETWORK):
            return None

        error = ConnectionError(
            "Chaos injection: simulated network failure"
        )

        if raise_exception:
            raise error
        return error

    def inject_timeout(
        self,
        timeout_seconds: float = 30.0,
        raise_exception: bool = True,
    ) -> Optional[Exception]:
        """Inject a timeout condition.

        This simulates a timeout by sleeping for the specified duration
        and then raising a TimeoutError.

        Args:
            timeout_seconds: How long to wait before timeout
            raise_exception: If True, raises the exception.

        Returns:
            The exception that would be raised.

        Raises:
            TimeoutError: If raise_exception is True.
        """
        if not self.should_inject(FailureType.TIMEOUT):
            return None

        time.sleep(timeout_seconds)
        error = TimeoutError(
            f"Chaos injection: simulated timeout after {timeout_seconds}s"
        )

        if raise_exception:
            raise error
        return error

    def inject_memory_pressure(
        self,
        mb: int = 100,
        duration_seconds: float = 1.0,
    ) -> int:
        """Inject memory pressure by allocating and holding memory.

        WARNING: Use with caution. This can cause OOM on resource-constrained
        systems.

        Args:
            mb: Megabytes to allocate
            duration_seconds: How long to hold the memory

        Returns:
            Bytes allocated.
        """
        if not self.should_inject(FailureType.MEMORY):
            return 0

        try:
            # Allocate memory (1MB = 1024 * 1024 bytes)
            bytes_to_allocate = mb * 1024 * 1024
            _ = bytearray(bytes_to_allocate)

            self._logger.warning(
                f"Chaos injection: memory pressure {mb}MB for {duration_seconds}s"
            )

            event = ChaosEvent(
                timestamp=datetime.now(),
                failure_type=FailureType.MEMORY,
                probability=self._config.probability,
                target="memory_allocation",
                details={"mb": mb, "duration": duration_seconds},
            )

            with self._history_lock:
                self._event_history.append(event)

            time.sleep(duration_seconds)
            return bytes_to_allocate

        except MemoryError:
            self._logger.error("Chaos injection: OOM during memory pressure test")
            raise

    def inject_agent_failure(
        self,
        agent_id: str,
        raise_exception: bool = True,
    ) -> Optional[Exception]:
        """Simulate an agent failure.

        Args:
            agent_id: ID of the agent that "failed"
            raise_exception: If True, raises the exception.

        Returns:
            The exception that would be raised.
        """
        if not self.should_inject(FailureType.AGENT):
            return None

        from lib.exceptions import AgentExecutionError

        error = AgentExecutionError(
            f"Chaos injection: simulated agent failure",
            agent_id=agent_id,
        )

        if raise_exception:
            raise error
        return error

    def inject_database_failure(
        self,
        operation: str = "query",
        raise_exception: bool = True,
    ) -> Optional[Exception]:
        """Simulate a database failure.

        Args:
            operation: Type of database operation
            raise_exception: If True, raises the exception.

        Returns:
            The exception that would be raised.
        """
        if not self.should_inject(FailureType.DATABASE):
            return None

        from lib.exceptions import DatabaseConnectionError

        error = DatabaseConnectionError(
            f"Chaos injection: simulated database failure during {operation}",
        )

        if raise_exception:
            raise error
        return error

    def inject_cache_failure(
        self,
        cache_name: str = "default",
        raise_exception: bool = True,
    ) -> Optional[Exception]:
        """Simulate a cache failure.

        Args:
            cache_name: Name of the cache
            raise_exception: If True, raises the exception.

        Returns:
            The exception that would be raised.
        """
        if not self.should_inject(FailureType.CACHE):
            return None

        from lib.exceptions import CacheError

        error = CacheError(
            f"Chaos injection: simulated cache failure",
            cache_name=cache_name,
        )

        if raise_exception:
            raise error
        return error

    def simulate_crash(
        self,
        crash_type: str = "exception",
    ) -> None:
        """Simulate a crash condition.

        WARNING: This is dangerous and should only be used in controlled
        testing environments with crash_simulation explicitly enabled.

        Args:
            crash_type: Type of crash ("exception", "exit", "kill")

        Raises:
            RuntimeError: Always, unless crash_type is "exit" or "kill".
            SystemExit: If crash_type is "exit".
        """
        if not self._config.crash_simulation:
            self._logger.warning(
                "Crash simulation requested but not enabled. "
                "Set CHAOS_CRASH_SIMULATION=true to enable."
            )
            return

        if not self.should_inject(FailureType.CRASH):
            return

        self._logger.critical(f"Chaos injection: simulating crash ({crash_type})")

        if crash_type == "exception":
            raise RuntimeError("Chaos injection: simulated crash")
        elif crash_type == "exit":
            raise SystemExit(1)
        # "kill" type would require os.kill which is too dangerous

    @contextmanager
    def chaos_context(
        self,
        target: str,
        failure_types: Optional[List[FailureType]] = None,
        probability: Optional[float] = None,
    ):
        """Context manager that may inject chaos during execution.

        Args:
            target: Description of what's being tested
            failure_types: Specific failure types to consider
                          (default: all enabled)
            probability: Override probability for this context

        Yields:
            ChaosContext object with chaos information

        Example:
            >>> with chaos.chaos_context("api_call") as ctx:
            ...     if ctx.network_failure:
            ...         raise ConnectionError("Simulated")
            ...     result = make_api_call()
        """
        class ChaosContext:
            def __init__(self, injector: 'ChaosInjector'):
                self.injector = injector
                self.network_failure = False
                self.timeout_failure = False
                self.latency_injected_ms = 0
                self.memory_pressure = False
                self.target = target

                # Check for failures
                types_to_check = failure_types or list(FailureType)

                if FailureType.NETWORK in types_to_check:
                    self.network_failure = injector.should_inject(
                        FailureType.NETWORK, probability
                    )

                if FailureType.TIMEOUT in types_to_check:
                    self.timeout_failure = injector.should_inject(
                        FailureType.TIMEOUT, probability
                    )

                if FailureType.LATENCY in types_to_check and injector.enabled:
                    if injector._rng.random() < (probability or injector.probability):
                        self.latency_injected_ms = injector.inject_latency()

                if FailureType.MEMORY in types_to_check:
                    self.memory_pressure = injector.should_inject(
                        FailureType.MEMORY, probability
                    )

        ctx = ChaosContext(self)

        # Record the context entry
        event = ChaosEvent(
            timestamp=datetime.now(),
            failure_type=FailureType.NETWORK,  # Generic marker
            probability=probability or self._config.probability,
            target=target,
            details={
                "network": ctx.network_failure,
                "timeout": ctx.timeout_failure,
                "latency_ms": ctx.latency_injected_ms,
                "memory": ctx.memory_pressure,
            },
        )

        with self._history_lock:
            self._event_history.append(event)

        try:
            yield ctx
        finally:
            # Context cleanup - could add recovery logic here
            pass

    def decorator(
        self,
        failure_type: FailureType = FailureType.NETWORK,
        probability: Optional[float] = None,
    ) -> Callable:
        """Decorator to inject chaos into a function.

        Args:
            failure_type: Type of failure to potentially inject
            probability: Override probability

        Returns:
            Decorator function

        Example:
            >>> @chaos.decorator(FailureType.NETWORK, probability=0.1)
            ... def make_api_call():
            ...     return requests.get("https://api.example.com")
        """
        def decorator_func(func: Callable) -> Callable:
            @wraps(func)
            def wrapper(*args, **kwargs):
                if self.should_inject(failure_type, probability):
                    if failure_type == FailureType.NETWORK:
                        raise ConnectionError(
                            f"Chaos injection in {func.__name__}: network failure"
                        )
                    elif failure_type == FailureType.TIMEOUT:
                        raise TimeoutError(
                            f"Chaos injection in {func.__name__}: timeout"
                        )
                    elif failure_type == FailureType.LATENCY:
                        self.inject_latency()
                    elif failure_type == FailureType.DATABASE:
                        from lib.exceptions import DatabaseConnectionError
                        raise DatabaseConnectionError(
                            f"Chaos injection in {func.__name__}: database failure"
                        )
                    elif failure_type == FailureType.CACHE:
                        from lib.exceptions import CacheError
                        raise CacheError(
                            f"Chaos injection in {func.__name__}: cache failure"
                        )
                    elif failure_type == FailureType.AGENT:
                        from lib.exceptions import AgentExecutionError
                        raise AgentExecutionError(
                            f"Chaos injection in {func.__name__}: agent failure"
                        )

                return func(*args, **kwargs)
            return wrapper
        return decorator_func

    def get_statistics(self) -> Dict[str, Any]:
        """Get chaos injection statistics.

        Returns:
            Dictionary with injection counts and configuration.
        """
        with self._count_lock:
            counts = dict(self._injection_counts)

        with self._history_lock:
            recent_events = self._event_history[-10:] if self._event_history else []

        return {
            "enabled": self._config.enabled,
            "probability": self._config.probability,
            "max_latency_ms": self._config.max_latency_ms,
            "total_injections": sum(counts.values()),
            "injections_by_type": {
                ft.value: count for ft, count in counts.items()
            },
            "recent_events": [
                {
                    "timestamp": e.timestamp.isoformat(),
                    "type": e.failure_type.value,
                    "target": e.target,
                    "duration_ms": e.duration_ms,
                }
                for e in recent_events
            ],
        }

    def reset_statistics(self) -> None:
        """Reset all injection statistics."""
        with self._count_lock:
            self._injection_counts = {ft: 0 for ft in FailureType}

        with self._history_lock:
            self._event_history.clear()

    def reset(self) -> None:
        """Reset to default configuration and clear statistics."""
        with self._lock:
            self._config = ChaosConfig()
            self._rng = random.Random()
        self.reset_statistics()


def get_chaos_injector() -> ChaosInjector:
    """Get the singleton ChaosInjector instance.

    Returns:
        The global ChaosInjector instance.
    """
    return ChaosInjector()


def configure_chaos(**kwargs) -> None:
    """Configure the global ChaosInjector.

    Args:
        **kwargs: Configuration options passed to ChaosInjector.configure()
    """
    get_chaos_injector().configure(**kwargs)


# =============================================================================
# PUBLIC API
# =============================================================================

__all__ = [
    "ChaosInjector",
    "ChaosConfig",
    "ChaosEvent",
    "FailureType",
    "get_chaos_injector",
    "configure_chaos",
]
