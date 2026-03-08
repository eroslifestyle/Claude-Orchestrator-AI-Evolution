"""Adaptive Rate Limiting for Orchestrator V15.0.

This module provides intelligent rate limiting with:
- Token Bucket algorithm for smooth traffic shaping
- Adaptive rate adjustment based on system metrics
- Backpressure detection to prevent overload
- Circuit Breaker integration for fault tolerance

Features:
- Min rate: 10 req/s
- Max rate: 1000 req/s
- Auto-adjust based on error rate
- Exponential backoff on 429 errors
- Thread-safe with RLock
- Async support

Usage:
    from lib.rate_limiter import AdaptiveRateLimiter, get_rate_limiter

    # Get singleton instance
    limiter = get_rate_limiter()

    # Check if request allowed
    if limiter.acquire("api"):
        # Process request
        pass
    else:
        # Rate limited
        retry_after = limiter.get_retry_after("api")

    # Record outcome for adaptive adjustment
    limiter.record_outcome("api", success=True, latency_ms=50)

    # Circuit breaker integration
    if limiter.is_circuit_open("api"):
        # Service unavailable
        pass
"""

from __future__ import annotations

import asyncio
import logging
import math
import threading
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Callable, Dict, List, Optional, Tuple
from collections import deque
from functools import wraps

logger = logging.getLogger(__name__)


# =============================================================================
# CONSTANTS
# =============================================================================

MIN_RATE = 10  # Minimum rate: 10 req/s
MAX_RATE = 1000  # Maximum rate: 1000 req/s
DEFAULT_RATE = 100  # Default starting rate: 100 req/s
DEFAULT_BUCKET_SIZE = 100  # Default bucket capacity
BACKOFF_BASE = 1.5  # Exponential backoff multiplier
MAX_BACKOFF = 60.0  # Maximum backoff seconds
ERROR_RATE_THRESHOLD = 0.1  # 10% error rate triggers reduction
LATENCY_THRESHOLD_MS = 500  # High latency threshold
ADJUSTMENT_INTERVAL = 5.0  # Adjust rates every 5 seconds
CIRCUIT_BREAKER_THRESHOLD = 0.5  # 50% error rate opens circuit
CIRCUIT_BREAKER_TIMEOUT = 30.0  # Circuit breaker recovery timeout
SAMPLE_WINDOW = 100  # Number of samples for metrics


# =============================================================================
# DATA STRUCTURES
# =============================================================================

class CircuitState(Enum):
    """Circuit breaker states."""
    CLOSED = "closed"  # Normal operation
    OPEN = "open"  # Failing, reject all
    HALF_OPEN = "half_open"  # Testing recovery


@dataclass
class TokenBucket:
    """Token bucket for rate limiting.

    Attributes:
        rate: Tokens added per second
        capacity: Maximum tokens
        tokens: Current token count
        last_update: Last token update timestamp
    """
    rate: float
    capacity: float
    tokens: float = field(default=0.0)
    last_update: float = field(default_factory=time.time)
    lock: threading.RLock = field(default_factory=threading.RLock, repr=False)

    def __post_init__(self):
        if self.tokens == 0.0:
            self.tokens = self.capacity

    def acquire(self, tokens: int = 1) -> bool:
        """Try to acquire tokens.

        Args:
            tokens: Number of tokens to acquire

        Returns:
            True if tokens acquired, False if insufficient
        """
        with self.lock:
            now = time.time()
            elapsed = now - self.last_update
            self.last_update = now

            # Add tokens based on elapsed time
            self.tokens = min(
                self.capacity,
                self.tokens + elapsed * self.rate
            )

            if self.tokens >= tokens:
                self.tokens -= tokens
                return True
            return False

    def get_retry_after(self) -> float:
        """Calculate seconds until next token available.

        Returns:
            Seconds to wait
        """
        with self.lock:
            if self.tokens >= 1:
                return 0.0
            return (1.0 - self.tokens) / self.rate

    def set_rate(self, new_rate: float) -> None:
        """Update the token rate.

        Args:
            new_rate: New tokens per second
        """
        with self.lock:
            self.rate = max(MIN_RATE, min(MAX_RATE, new_rate))


@dataclass
class MetricsWindow:
    """Sliding window for metrics collection.

    Thread-safe deque-based metrics tracking.
    """
    max_size: int = SAMPLE_WINDOW
    _samples: deque = field(default_factory=lambda: deque(maxlen=SAMPLE_WINDOW))
    _lock: threading.RLock = field(default_factory=threading.RLock, repr=False)

    def add_sample(self, success: bool, latency_ms: float) -> None:
        """Add a sample to the window.

        Args:
            success: Whether the request succeeded
            latency_ms: Request latency in milliseconds
        """
        with self._lock:
            self._samples.append((success, latency_ms))

    def get_error_rate(self) -> float:
        """Calculate current error rate.

        Returns:
            Error rate as fraction (0.0 to 1.0)
        """
        with self._lock:
            if not self._samples:
                return 0.0
            failures = sum(1 for s, _ in self._samples if not s)
            return failures / len(self._samples)

    def get_avg_latency(self) -> float:
        """Calculate average latency.

        Returns:
            Average latency in milliseconds
        """
        with self._lock:
            if not self._samples:
                return 0.0
            return sum(lat for _, lat in self._samples) / len(self._samples)

    def get_throughput(self) -> float:
        """Calculate recent throughput.

        Returns:
            Requests per second
        """
        with self._lock:
            return len(self._samples) / ADJUSTMENT_INTERVAL

    def clear(self) -> None:
        """Clear all samples."""
        with self._lock:
            self._samples.clear()


@dataclass
class CircuitBreaker:
    """Circuit breaker for fault tolerance.

    States:
        - CLOSED: Normal operation
        - OPEN: Rejecting all requests
        - HALF_OPEN: Testing if recovered

    Attributes:
        state: Current circuit state
        error_count: Consecutive errors
        success_count: Consecutive successes in half-open
        last_failure: Last failure timestamp
        threshold: Error rate to open circuit
        timeout: Seconds before trying half-open
    """
    state: CircuitState = CircuitState.CLOSED
    error_count: int = 0
    success_count: int = 0
    last_failure: float = 0.0
    threshold: float = CIRCUIT_BREAKER_THRESHOLD
    timeout: float = CIRCUIT_BREAKER_TIMEOUT
    _lock: threading.RLock = field(default_factory=threading.RLock, repr=False)

    def record_success(self) -> None:
        """Record a successful request."""
        with self._lock:
            self.error_count = 0
            if self.state == CircuitState.HALF_OPEN:
                self.success_count += 1
                if self.success_count >= 3:
                    self.state = CircuitState.CLOSED
                    self.success_count = 0
                    logger.info("Circuit breaker CLOSED - service recovered")

    def record_failure(self) -> None:
        """Record a failed request."""
        with self._lock:
            self.error_count += 1
            self.last_failure = time.time()
            self.success_count = 0

            if self.state == CircuitState.HALF_OPEN:
                self.state = CircuitState.OPEN
                logger.warning("Circuit breaker OPEN - recovery failed")

    def is_open(self) -> bool:
        """Check if circuit is open (rejecting requests).

        Returns:
            True if circuit is open
        """
        with self._lock:
            if self.state == CircuitState.CLOSED:
                return False

            if self.state == CircuitState.OPEN:
                # Check if timeout elapsed
                elapsed = time.time() - self.last_failure
                if elapsed >= self.timeout:
                    self.state = CircuitState.HALF_OPEN
                    self.success_count = 0
                    logger.info("Circuit breaker HALF_OPEN - testing recovery")
                    return False
                return True

            # HALF_OPEN: allow some requests through
            return False

    def should_trip(self, error_rate: float) -> bool:
        """Check if circuit should trip based on error rate.

        Args:
            error_rate: Current error rate

        Returns:
            True if circuit should open
        """
        with self._lock:
            if self.state == CircuitState.CLOSED and error_rate >= self.threshold:
                self.state = CircuitState.OPEN
                self.last_failure = time.time()
                logger.warning(
                    f"Circuit breaker OPEN - error rate {error_rate:.2%} >= {self.threshold:.2%}"
                )
                return True
            return False


# =============================================================================
# ADAPTIVE RATE LIMITER
# =============================================================================

class AdaptiveRateLimiter:
    """Adaptive rate limiter with token bucket and circuit breaker.

    Features:
    - Token bucket algorithm for smooth limiting
    - Adaptive rate adjustment based on:
        - Error rate (reduce on high errors)
        - Latency (reduce on high latency)
        - Backpressure (reduce on system overload)
    - Circuit breaker integration
    - 429 response backoff
    - Per-resource limiting

    Thread-safe and async-compatible.

    Example:
        limiter = AdaptiveRateLimiter()

        # Synchronous
        if limiter.acquire("api"):
            process_request()

        # Async
        if await limiter.async_acquire("api"):
            await process_request()
    """

    def __init__(
        self,
        default_rate: float = DEFAULT_RATE,
        min_rate: float = MIN_RATE,
        max_rate: float = MAX_RATE,
        bucket_size: float = DEFAULT_BUCKET_SIZE,
    ):
        """Initialize the rate limiter.

        Args:
            default_rate: Initial requests per second
            min_rate: Minimum rate floor
            max_rate: Maximum rate ceiling
            bucket_size: Token bucket capacity
        """
        self.min_rate = min_rate
        self.max_rate = max_rate
        self.bucket_size = bucket_size

        # Per-resource buckets and metrics
        self._buckets: Dict[str, TokenBucket] = {}
        self._metrics: Dict[str, MetricsWindow] = {}
        self._circuit_breakers: Dict[str, CircuitBreaker] = {}
        self._backoff_until: Dict[str, float] = {}

        # Global state
        self._lock = threading.RLock()
        self._last_adjustment = time.time()
        self._adjustment_thread: Optional[threading.Thread] = None
        self._running = False

        # System load monitoring
        self._system_load = 0.0
        self._backpressure_threshold = 0.8

        # Create default bucket
        self._ensure_resource("default", default_rate)

        logger.info(
            f"AdaptiveRateLimiter initialized: "
            f"rate={default_rate}/s, range=[{min_rate}, {max_rate}]"
        )

    def _ensure_resource(self, resource: str, rate: float) -> None:
        """Ensure resource has bucket, metrics, and circuit breaker.

        Args:
            resource: Resource identifier
            rate: Initial rate for resource
        """
        with self._lock:
            if resource not in self._buckets:
                self._buckets[resource] = TokenBucket(
                    rate=rate,
                    capacity=self.bucket_size
                )
            if resource not in self._metrics:
                self._metrics[resource] = MetricsWindow()
            if resource not in self._circuit_breakers:
                self._circuit_breakers[resource] = CircuitBreaker()

    def acquire(self, resource: str = "default", tokens: int = 1) -> bool:
        """Try to acquire rate limit tokens (synchronous).

        Args:
            resource: Resource identifier
            tokens: Number of tokens to acquire

        Returns:
            True if allowed, False if rate limited
        """
        self._ensure_resource(resource, DEFAULT_RATE)

        # Check circuit breaker
        if self._circuit_breakers[resource].is_open():
            logger.debug(f"Rate limit rejected (circuit open): {resource}")
            return False

        # Check backoff
        backoff = self._backoff_until.get(resource, 0)
        if time.time() < backoff:
            logger.debug(f"Rate limit rejected (backoff): {resource}")
            return False

        # Check token bucket
        allowed = self._buckets[resource].acquire(tokens)

        if not allowed:
            logger.debug(f"Rate limit rejected (bucket): {resource}")

        return allowed

    async def async_acquire(
        self, resource: str = "default", tokens: int = 1
    ) -> bool:
        """Try to acquire rate limit tokens (async).

        Args:
            resource: Resource identifier
            tokens: Number of tokens to acquire

        Returns:
            True if allowed, False if rate limited
        """
        # Run synchronous acquire in executor
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, self.acquire, resource, tokens
        )

    def get_retry_after(self, resource: str = "default") -> float:
        """Get seconds until next request allowed.

        Args:
            resource: Resource identifier

        Returns:
            Seconds to wait
        """
        self._ensure_resource(resource, DEFAULT_RATE)

        # Check backoff first
        backoff = self._backoff_until.get(resource, 0)
        backoff_remaining = max(0, backoff - time.time())

        bucket_wait = self._buckets[resource].get_retry_after()

        return max(backoff_remaining, bucket_wait)

    def record_outcome(
        self,
        resource: str = "default",
        success: bool = True,
        latency_ms: float = 0.0,
        status_code: Optional[int] = None,
    ) -> None:
        """Record request outcome for adaptive adjustment.

        Args:
            resource: Resource identifier
            success: Whether request succeeded
            latency_ms: Request latency in milliseconds
            status_code: HTTP status code (if applicable)
        """
        self._ensure_resource(resource, DEFAULT_RATE)

        # Record metrics
        self._metrics[resource].add_sample(success, latency_ms)

        # Update circuit breaker
        cb = self._circuit_breakers[resource]
        if success:
            cb.record_success()
        else:
            cb.record_failure()

        # Handle 429 specifically
        if status_code == 429:
            self._apply_backoff(resource)
            logger.warning(f"429 received, applying backoff: {resource}")

        # Trigger adaptive adjustment if interval elapsed
        if time.time() - self._last_adjustment >= ADJUSTMENT_INTERVAL:
            self._adjust_rates()

    async def async_record_outcome(
        self,
        resource: str = "default",
        success: bool = True,
        latency_ms: float = 0.0,
        status_code: Optional[int] = None,
    ) -> None:
        """Record request outcome (async).

        Args:
            resource: Resource identifier
            success: Whether request succeeded
            latency_ms: Request latency in milliseconds
            status_code: HTTP status code (if applicable)
        """
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None, self.record_outcome, resource, success, latency_ms, status_code
        )

    def _apply_backoff(self, resource: str) -> None:
        """Apply exponential backoff for resource.

        Args:
            resource: Resource identifier
        """
        with self._lock:
            current_backoff = self._backoff_until.get(resource, 0)
            now = time.time()

            # Calculate new backoff
            if current_backoff > now:
                # Already in backoff, extend it
                remaining = current_backoff - now
                new_backoff = remaining * BACKOFF_BASE
            else:
                # Start fresh backoff
                new_backoff = 1.0

            new_backoff = min(new_backoff, MAX_BACKOFF)
            self._backoff_until[resource] = now + new_backoff

            logger.info(
                f"Backoff applied for {resource}: "
                f"{new_backoff:.1f}s"
            )

    def _adjust_rates(self) -> None:
        """Adjust rates based on metrics (called periodically)."""
        with self._lock:
            self._last_adjustment = time.time()

            for resource, metrics in self._metrics.items():
                bucket = self._buckets.get(resource)
                if not bucket:
                    continue

                error_rate = metrics.get_error_rate()
                avg_latency = metrics.get_avg_latency()
                current_rate = bucket.rate

                # Calculate adjustment factor
                adjustment = 1.0

                # Reduce on high error rate
                if error_rate > ERROR_RATE_THRESHOLD:
                    error_factor = 1.0 - (error_rate - ERROR_RATE_THRESHOLD)
                    adjustment *= error_factor
                    logger.info(
                        f"Rate adjustment for {resource}: "
                        f"error_rate={error_rate:.2%}, factor={error_factor:.2f}"
                    )

                # Reduce on high latency
                if avg_latency > LATENCY_THRESHOLD_MS:
                    latency_factor = LATENCY_THRESHOLD_MS / avg_latency
                    adjustment *= latency_factor
                    logger.info(
                        f"Rate adjustment for {resource}: "
                        f"latency={avg_latency:.0f}ms, factor={latency_factor:.2f}"
                    )

                # Reduce on backpressure (high system load)
                if self._system_load > self._backpressure_threshold:
                    load_factor = 1.0 - (
                        (self._system_load - self._backpressure_threshold) * 2
                    )
                    adjustment *= load_factor
                    logger.info(
                        f"Rate adjustment for {resource}: "
                        f"load={self._system_load:.2%}, factor={load_factor:.2f}"
                    )

                # Apply adjustment
                new_rate = current_rate * adjustment
                new_rate = max(self.min_rate, min(self.max_rate, new_rate))

                if abs(new_rate - current_rate) > 1.0:
                    bucket.set_rate(new_rate)
                    logger.info(
                        f"Rate adjusted for {resource}: "
                        f"{current_rate:.0f}/s -> {new_rate:.0f}/s"
                    )

                # Check circuit breaker
                cb = self._circuit_breakers.get(resource)
                if cb:
                    cb.should_trip(error_rate)

                # Clear old metrics
                metrics.clear()

    def set_system_load(self, load: float) -> None:
        """Update system load for backpressure detection.

        Args:
            load: System load (0.0 to 1.0)
        """
        self._system_load = max(0.0, min(1.0, load))

    def get_rate(self, resource: str = "default") -> float:
        """Get current rate for resource.

        Args:
            resource: Resource identifier

        Returns:
            Current rate in requests/second
        """
        self._ensure_resource(resource, DEFAULT_RATE)
        return self._buckets[resource].rate

    def set_rate(self, resource: str, rate: float) -> None:
        """Manually set rate for resource.

        Args:
            resource: Resource identifier
            rate: New rate in requests/second
        """
        self._ensure_resource(resource, rate)
        self._buckets[resource].set_rate(rate)
        logger.info(f"Rate set manually for {resource}: {rate}/s")

    def is_circuit_open(self, resource: str = "default") -> bool:
        """Check if circuit breaker is open.

        Args:
            resource: Resource identifier

        Returns:
            True if circuit is open
        """
        self._ensure_resource(resource, DEFAULT_RATE)
        return self._circuit_breakers[resource].is_open()

    def get_stats(self, resource: str = "default") -> Dict:
        """Get statistics for resource.

        Args:
            resource: Resource identifier

        Returns:
            Dict with rate, error_rate, latency, circuit_state
        """
        self._ensure_resource(resource, DEFAULT_RATE)

        bucket = self._buckets[resource]
        metrics = self._metrics[resource]
        cb = self._circuit_breakers[resource]

        return {
            "rate": bucket.rate,
            "tokens": bucket.tokens,
            "capacity": bucket.capacity,
            "error_rate": metrics.get_error_rate(),
            "avg_latency_ms": metrics.get_avg_latency(),
            "circuit_state": cb.state.value,
            "backoff_remaining": max(
                0, self._backoff_until.get(resource, 0) - time.time()
            ),
        }

    def get_all_stats(self) -> Dict[str, Dict]:
        """Get statistics for all resources.

        Returns:
            Dict mapping resource -> stats
        """
        return {
            resource: self.get_stats(resource)
            for resource in self._buckets.keys()
        }

    def reset(self, resource: str = "default") -> None:
        """Reset rate limiter for resource.

        Args:
            resource: Resource identifier
        """
        with self._lock:
            if resource in self._buckets:
                self._buckets[resource].tokens = self._buckets[resource].capacity
            if resource in self._metrics:
                self._metrics[resource].clear()
            if resource in self._circuit_breakers:
                cb = self._circuit_breakers[resource]
                cb.state = CircuitState.CLOSED
                cb.error_count = 0
                cb.success_count = 0
            if resource in self._backoff_until:
                del self._backoff_until[resource]

        logger.info(f"Rate limiter reset for {resource}")

    def reset_all(self) -> None:
        """Reset all rate limiters."""
        with self._lock:
            for resource in list(self._buckets.keys()):
                self.reset(resource)

        logger.info("All rate limiters reset")


# =============================================================================
# SINGLETON INSTANCE
# =============================================================================

_instance: Optional[AdaptiveRateLimiter] = None
_instance_lock = threading.Lock()


def get_rate_limiter(
    default_rate: float = DEFAULT_RATE,
    min_rate: float = MIN_RATE,
    max_rate: float = MAX_RATE,
) -> AdaptiveRateLimiter:
    """Get singleton rate limiter instance.

    Args:
        default_rate: Initial rate (only used on first call)
        min_rate: Minimum rate
        max_rate: Maximum rate

    Returns:
        AdaptiveRateLimiter singleton
    """
    global _instance

    if _instance is None:
        with _instance_lock:
            if _instance is None:
                _instance = AdaptiveRateLimiter(
                    default_rate=default_rate,
                    min_rate=min_rate,
                    max_rate=max_rate,
                )

    return _instance


def reset_rate_limiter() -> None:
    """Reset the singleton instance (for testing)."""
    global _instance

    with _instance_lock:
        if _instance is not None:
            _instance.reset_all()
        _instance = None


# =============================================================================
# DECORATORS
# =============================================================================

def rate_limit(
    resource: str = "default",
    tokens: int = 1,
    on_rejected: Optional[Callable] = None,
):
    """Decorator for rate limiting functions.

    Args:
        resource: Resource identifier
        tokens: Tokens per call
        on_rejected: Callback when rate limited

    Example:
        @rate_limit("api", tokens=1)
        def call_api():
            return requests.get("https://api.example.com")
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            limiter = get_rate_limiter()

            if limiter.acquire(resource, tokens):
                try:
                    result = func(*args, **kwargs)
                    limiter.record_outcome(resource, success=True)
                    return result
                except Exception as e:
                    limiter.record_outcome(resource, success=False)
                    raise
            else:
                if on_rejected:
                    return on_rejected()
                raise RateLimitError(
                    resource=resource,
                    retry_after=limiter.get_retry_after(resource)
                )

        return wrapper
    return decorator


def async_rate_limit(
    resource: str = "default",
    tokens: int = 1,
    on_rejected: Optional[Callable] = None,
):
    """Decorator for rate limiting async functions.

    Args:
        resource: Resource identifier
        tokens: Tokens per call
        on_rejected: Callback when rate limited

    Example:
        @async_rate_limit("api", tokens=1)
        async def call_api():
            return await aiohttp.get("https://api.example.com")
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            limiter = get_rate_limiter()

            if await limiter.async_acquire(resource, tokens):
                try:
                    result = await func(*args, **kwargs)
                    await limiter.async_record_outcome(resource, success=True)
                    return result
                except Exception as e:
                    await limiter.async_record_outcome(resource, success=False)
                    raise
            else:
                if on_rejected:
                    return await on_rejected()
                raise RateLimitError(
                    resource=resource,
                    retry_after=await limiter.get_retry_after(resource)
                )

        return wrapper
    return decorator


# =============================================================================
# EXCEPTIONS
# =============================================================================

class RateLimitError(Exception):
    """Exception raised when rate limit exceeded."""

    def __init__(self, resource: str, retry_after: float):
        self.resource = resource
        self.retry_after = retry_after
        super().__init__(
            f"Rate limit exceeded for '{resource}'. "
            f"Retry after {retry_after:.2f}s"
        )
