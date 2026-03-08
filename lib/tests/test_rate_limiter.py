"""Test suite for Adaptive Rate Limiter (V15.0)."""
import pytest
import time
import threading
import asyncio

from lib.rate_limiter import (
    AdaptiveRateLimiter,
    TokenBucket,
    CircuitBreaker,
    CircuitState,
    get_rate_limiter,
    reset_rate_limiter,
    rate_limit,
    async_rate_limit,
    MIN_RATE,
    MAX_RATE,
    DEFAULT_RATE,
)


class TestTokenBucket:
    """Test TokenBucket basic functionality."""

    def test_initial_state(self):
        bucket = TokenBucket(rate=10, capacity=10)
        assert bucket.tokens == bucket.capacity
        assert bucket.rate == 10

    def test_acquire_tokens(self):
        bucket = TokenBucket(rate=10, capacity=10)
        assert bucket.acquire(1) is True
        assert bucket.tokens < 10

    def test_acquire_more_than_available(self):
        bucket = TokenBucket(rate=10, capacity=10)
        assert bucket.acquire(11) is False
        assert bucket.tokens == 10

    def test_max_capacity(self):
        bucket = TokenBucket(rate=100, capacity=10)
        time.sleep(0.15)
        assert bucket.tokens <= bucket.capacity


    def test_get_retry_after(self):
        bucket = TokenBucket(rate=10, capacity=10)
        bucket.acquire(10)  # Empty bucket
        retry = bucket.get_retry_after()
        assert retry > 0

    def test_set_rate(self):
        bucket = TokenBucket(rate=10, capacity=10)
        bucket.set_rate(50)
        assert bucket.rate == 50


class TestAdaptiveRateLimiter:
    """Test AdaptiveRateLimiter functionality."""

    def test_default_initialization(self):
        limiter = AdaptiveRateLimiter()
        assert limiter.min_rate == MIN_RATE
        assert limiter.max_rate == MAX_RATE
        # Check default bucket was created with default rate
        assert limiter.get_rate("default") == DEFAULT_RATE

    def test_custom_initialization(self):
        limiter = AdaptiveRateLimiter(default_rate=50, min_rate=5, max_rate=100)
        assert limiter.min_rate == 5
        assert limiter.max_rate == 100
        # Check default bucket was created with custom rate
        assert limiter.get_rate("default") == 50

    def test_acquire_within_rate(self):
        limiter = AdaptiveRateLimiter(default_rate=50, min_rate=10, max_rate=100)
        assert limiter.acquire("test") is True

    def test_acquire_multiple_resources(self):
        limiter = AdaptiveRateLimiter()
        assert limiter.acquire("api1") is True
        assert limiter.acquire("api2") is True
        assert limiter.acquire("api3") is True


    def test_record_outcome_success(self):
        limiter = AdaptiveRateLimiter()
        limiter.record_outcome("test", success=True, latency_ms=50)
        # Should not raise

    def test_record_outcome_failure(self):
        limiter = AdaptiveRateLimiter()
        limiter.record_outcome("test", success=False, latency_ms=500)
        # Should not raise


    def test_get_retry_after(self):
        limiter = AdaptiveRateLimiter()
        limiter.acquire("test", tokens=100)  # Exhaust bucket
        retry = limiter.get_retry_after("test")
        assert retry >= 0


class TestCircuitBreaker:
    """Test CircuitBreaker functionality."""

    def test_initial_state(self):
        cb = CircuitBreaker()
        assert cb.state == CircuitState.CLOSED

        assert cb.error_count == 0
        assert cb.success_count == 0

    def test_record_success(self):
        cb = CircuitBreaker()
        cb.record_success()
        # success_count only increments in HALF_OPEN state
        # In CLOSED state, it stays 0 and error_count resets
        assert cb.success_count == 0
        assert cb.error_count == 0

    def test_record_failure(self):
        cb = CircuitBreaker()
        cb.record_failure()
        assert cb.error_count == 1
        assert cb.success_count == 0

    def test_can_execute(self):
        cb = CircuitBreaker()
        # is_open returns False when circuit is closed (can execute)
        assert cb.is_open() is False
        cb.record_failure()
        # Still closed after 1 failure (not enough to trip)
        assert cb.is_open() is False


class TestIntegration:
    """Integration tests."""

    def test_get_rate_limiter_singleton(self):
        limiter1 = get_rate_limiter()
        limiter2 = get_rate_limiter()
        assert limiter1 is limiter2

    def test_reset_rate_limiter(self):
        limiter1 = get_rate_limiter()
        reset_rate_limiter()
        limiter2 = get_rate_limiter()
        assert limiter1 is not limiter2

    def test_rate_limit_decorator(self):
        @rate_limit("test")
        def test_func():
            return "success"

        result = test_func()
        assert result == "success"

    def test_async_rate_limit_decorator(self):
        @async_rate_limit("test")
        async def test_func():
            return "success"

        result = asyncio.run(test_func())
        assert result == "success"
