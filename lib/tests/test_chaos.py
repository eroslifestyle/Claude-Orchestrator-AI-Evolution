"""Tests for Chaos Engineering Module.

This module tests the ChaosInjector class and its resilience features.

Test Categories:
    1. Configuration Tests - Config loading, validation
    2. Injection Tests - Failure injection behavior
    3. Resilience Tests - Agent failure, timeout, memory pressure
    4. Integration Tests - Context manager, decorator
    5. Statistics Tests - Metrics collection

Usage:
    pytest lib/tests/test_chaos.py -v

    # With chaos mode enabled
    pytest lib/tests/test_chaos.py -v --chaos-mode
"""

import os
import sys
import time
import pytest
import threading
from unittest.mock import patch, MagicMock
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from lib.chaos import (
    ChaosInjector,
    ChaosConfig,
    ChaosEvent,
    FailureType,
    get_chaos_injector,
    configure_chaos,
)


class TestChaosConfig:
    """Tests for ChaosConfig dataclass."""

    def test_default_config(self):
        """Test default configuration values."""
        config = ChaosConfig()

        assert config.enabled is False
        assert config.probability == 0.01
        assert config.max_latency_ms == 500
        assert "development" in config.safe_environments
        assert "test" in config.safe_environments
        assert config.crash_simulation is False
        assert config.seed is None

    def test_custom_config(self):
        """Test custom configuration values."""
        config = ChaosConfig(
            enabled=True,
            probability=0.5,
            max_latency_ms=1000,
            crash_simulation=True,
            seed=42,
        )

        assert config.enabled is True
        assert config.probability == 0.5
        assert config.max_latency_ms == 1000
        assert config.crash_simulation is True
        assert config.seed == 42

    def test_probability_bounds(self):
        """Test probability is bounded to 0.0-1.0."""
        # High value should be capped
        injector = ChaosInjector()
        injector.configure(probability=2.0)
        assert injector.probability <= 1.0

        # Negative value should be floored
        injector.configure(probability=-0.5)
        assert injector.probability >= 0.0


class TestChaosInjector:
    """Tests for ChaosInjector class."""

    @pytest.fixture(autouse=True)
    def reset_chaos(self):
        """Reset chaos injector before each test."""
        chaos = get_chaos_injector()
        chaos.reset()
        # Don't configure here - let individual tests configure as needed
        yield
        chaos.reset()

    def test_singleton_pattern(self):
        """Test that ChaosInjector is a singleton."""
        chaos1 = ChaosInjector()
        chaos2 = ChaosInjector()
        chaos3 = get_chaos_injector()

        assert chaos1 is chaos2
        assert chaos2 is chaos3

    def test_disabled_by_default(self):
        """Test that chaos is disabled by default."""
        chaos = ChaosInjector()
        chaos.reset()  # Reset to defaults

        assert chaos.enabled is False

    def test_configure_enabled(self):
        """Test enabling chaos."""
        chaos = get_chaos_injector()
        chaos.configure(enabled=True)

        assert chaos.enabled is True

    def test_should_inject_when_disabled(self):
        """Test that injection never happens when disabled."""
        chaos = get_chaos_injector()
        chaos.configure(enabled=False, probability=1.0)

        assert chaos.should_inject(FailureType.NETWORK) is False
        assert chaos.should_inject(FailureType.TIMEOUT) is False

    def test_should_inject_with_probability_1(self):
        """Test that injection always happens with probability 1."""
        chaos = get_chaos_injector()
        chaos.configure(enabled=True, probability=1.0)

        # Should always return True
        assert chaos.should_inject(FailureType.NETWORK) is True

    def test_should_inject_with_probability_0(self):
        """Test that injection never happens with probability 0."""
        chaos = get_chaos_injector()
        chaos.configure(enabled=True, probability=0.0)

        assert chaos.should_inject(FailureType.NETWORK) is False

    def test_should_inject_respects_failure_type(self):
        """Test that only enabled failure types can be injected."""
        chaos = get_chaos_injector()
        chaos.configure(
            enabled=True,
            probability=1.0,
            enabled_failures={FailureType.NETWORK}
        )

        assert chaos.should_inject(FailureType.NETWORK) is True
        assert chaos.should_inject(FailureType.TIMEOUT) is False

    def test_reproducible_with_seed(self):
        """Test that seed produces reproducible results."""
        chaos = get_chaos_injector()

        # First run with seed
        chaos.reset()
        chaos.configure(enabled=True, probability=0.5, seed=12345)
        results1 = [chaos.should_inject(FailureType.NETWORK) for _ in range(10)]

        # Second run - full reset with same seed
        chaos.reset()
        chaos.configure(enabled=True, probability=0.5, seed=12345)
        results2 = [chaos.should_inject(FailureType.NETWORK) for _ in range(10)]

        # Results should be identical with same seed
        assert results1 == results2


class TestLatencyInjection:
    """Tests for latency injection."""

    @pytest.fixture(autouse=True)
    def setup_chaos(self):
        """Setup chaos injector for latency tests."""
        chaos = get_chaos_injector()
        chaos.reset()
        chaos.configure(enabled=True, probability=1.0, max_latency_ms=100, seed=42)
        yield
        chaos.reset()

    def test_inject_latency_returns_duration(self):
        """Test that inject_latency returns the latency duration."""
        chaos = get_chaos_injector()

        latency = chaos.inject_latency(min_ms=10, max_ms=50)

        assert isinstance(latency, float)
        assert 10 <= latency <= 50

    def test_inject_latency_actually_delays(self):
        """Test that inject_latency actually introduces delay."""
        chaos = get_chaos_injector()
        chaos.configure(enabled=True, max_latency_ms=50)

        start = time.time()
        chaos.inject_latency(min_ms=20, max_ms=30)
        elapsed = time.time() - start

        assert elapsed >= 0.02  # At least 20ms

    def test_no_latency_when_disabled(self):
        """Test that no latency is injected when disabled."""
        chaos = get_chaos_injector()
        chaos.configure(enabled=False)

        start = time.time()
        latency = chaos.inject_latency()
        elapsed = time.time() - start

        assert latency == 0.0
        assert elapsed < 0.01  # Should be nearly instant


class TestNetworkFailureInjection:
    """Tests for network failure injection."""

    @pytest.fixture(autouse=True)
    def setup_chaos(self):
        """Setup chaos injector for network tests."""
        chaos = get_chaos_injector()
        chaos.reset()
        chaos.configure(enabled=True, probability=1.0, seed=42)
        yield
        chaos.reset()

    def test_inject_network_failure_raises(self):
        """Test that network failure raises ConnectionError."""
        chaos = get_chaos_injector()

        with pytest.raises(ConnectionError, match="Chaos injection"):
            chaos.inject_network_failure()

    def test_inject_network_failure_returns_exception(self):
        """Test that network failure can return exception instead of raising."""
        chaos = get_chaos_injector()

        error = chaos.inject_network_failure(raise_exception=False)

        assert isinstance(error, ConnectionError)
        assert "Chaos injection" in str(error)

    def test_no_network_failure_when_disabled(self):
        """Test that no network failure when disabled."""
        chaos = get_chaos_injector()
        chaos.configure(enabled=False)

        result = chaos.inject_network_failure(raise_exception=False)

        assert result is None


class TestTimeoutInjection:
    """Tests for timeout injection."""

    @pytest.fixture(autouse=True)
    def setup_chaos(self):
        """Setup chaos injector for timeout tests."""
        chaos = get_chaos_injector()
        chaos.reset()
        chaos.configure(enabled=True, probability=1.0, seed=42)
        yield
        chaos.reset()

    def test_inject_timeout_raises_timeout_error(self):
        """Test that timeout injection raises TimeoutError."""
        chaos = get_chaos_injector()

        with pytest.raises(TimeoutError, match="Chaos injection"):
            chaos.inject_timeout(timeout_seconds=0.1)

    def test_inject_timeout_actually_waits(self):
        """Test that timeout injection actually waits."""
        chaos = get_chaos_injector()

        start = time.time()
        try:
            chaos.inject_timeout(timeout_seconds=0.2)
        except TimeoutError:
            pass
        elapsed = time.time() - start

        assert elapsed >= 0.2


class TestMemoryPressure:
    """Tests for memory pressure injection."""

    @pytest.fixture(autouse=True)
    def setup_chaos(self):
        """Setup chaos injector for memory tests."""
        chaos = get_chaos_injector()
        chaos.reset()
        chaos.configure(enabled=True, probability=1.0, seed=42)
        yield
        chaos.reset()

    def test_inject_memory_pressure_allocates(self):
        """Test that memory pressure allocates memory."""
        chaos = get_chaos_injector()

        bytes_allocated = chaos.inject_memory_pressure(mb=1, duration_seconds=0.1)

        assert bytes_allocated == 1 * 1024 * 1024

    def test_inject_memory_pressure_no_injection_when_disabled(self):
        """Test that memory pressure doesn't inject when disabled."""
        chaos = get_chaos_injector()
        chaos.configure(enabled=False)

        result = chaos.inject_memory_pressure(mb=10, duration_seconds=0.1)

        assert result == 0


class TestAgentFailure:
    """Tests for agent failure simulation."""

    @pytest.fixture(autouse=True)
    def setup_chaos(self):
        """Setup chaos injector for agent tests."""
        chaos = get_chaos_injector()
        chaos.reset()
        chaos.configure(
            enabled=True,
            probability=1.0,
            seed=42,
            enabled_failures={FailureType.AGENT}
        )
        yield
        chaos.reset()

    def test_inject_agent_failure_raises(self):
        """Test that agent failure raises AgentExecutionError."""
        chaos = get_chaos_injector()

        from lib.exceptions import AgentExecutionError

        with pytest.raises(AgentExecutionError, match="Chaos injection"):
            chaos.inject_agent_failure("test_agent")

    def test_inject_agent_failure_includes_agent_id(self):
        """Test that agent failure includes agent_id in error."""
        chaos = get_chaos_injector()

        from lib.exceptions import AgentExecutionError

        try:
            chaos.inject_agent_failure("agent_123")
        except AgentExecutionError as e:
            assert "agent_123" in str(e.context.get("agent_id", ""))


class TestDatabaseFailure:
    """Tests for database failure simulation."""

    @pytest.fixture(autouse=True)
    def setup_chaos(self):
        """Setup chaos injector for database tests."""
        chaos = get_chaos_injector()
        chaos.reset()
        chaos.configure(
            enabled=True,
            probability=1.0,
            seed=42,
            enabled_failures={FailureType.DATABASE}
        )
        yield
        chaos.reset()

    def test_inject_database_failure_raises(self):
        """Test that database failure raises DatabaseConnectionError."""
        chaos = get_chaos_injector()

        from lib.exceptions import DatabaseConnectionError

        with pytest.raises(DatabaseConnectionError, match="Chaos injection"):
            chaos.inject_database_failure()


class TestCacheFailure:
    """Tests for cache failure simulation."""

    @pytest.fixture(autouse=True)
    def setup_chaos(self):
        """Setup chaos injector for cache tests."""
        chaos = get_chaos_injector()
        chaos.reset()
        chaos.configure(
            enabled=True,
            probability=1.0,
            seed=42,
            enabled_failures={FailureType.CACHE}
        )
        yield
        chaos.reset()

    def test_inject_cache_failure_raises(self):
        """Test that cache failure raises CacheError."""
        chaos = get_chaos_injector()

        from lib.exceptions import CacheError

        with pytest.raises(CacheError, match="Chaos injection"):
            chaos.inject_cache_failure()


class TestChaosContext:
    """Tests for chaos context manager."""

    @pytest.fixture(autouse=True)
    def setup_chaos(self):
        """Setup chaos injector for context tests."""
        chaos = get_chaos_injector()
        chaos.reset()
        chaos.configure(enabled=True, probability=1.0, seed=42)
        yield
        chaos.reset()

    def test_chaos_context_yields_context_object(self):
        """Test that chaos_context yields a context object."""
        chaos = get_chaos_injector()

        with chaos.chaos_context("test_operation") as ctx:
            assert ctx.target == "test_operation"

    def test_chaos_context_with_network_failure(self):
        """Test chaos context with network failure simulation."""
        chaos = get_chaos_injector()
        chaos.configure(
            enabled=True,
            probability=1.0,
            enabled_failures={FailureType.NETWORK}
        )

        with chaos.chaos_context("api_call") as ctx:
            assert ctx.network_failure is True
            assert ctx.timeout_failure is False  # Not enabled

    def test_chaos_context_with_all_failures(self):
        """Test chaos context with all failure types enabled."""
        chaos = get_chaos_injector()
        chaos.configure(
            enabled=True,
            probability=1.0,
            max_latency_ms=10,
            enabled_failures=set(FailureType)
        )

        with chaos.chaos_context("full_test") as ctx:
            # All failures should be flagged
            assert ctx.network_failure is True
            assert ctx.timeout_failure is True
            assert ctx.memory_pressure is True
            assert ctx.latency_injected_ms >= 0


class TestChaosDecorator:
    """Tests for chaos decorator."""

    @pytest.fixture(autouse=True)
    def setup_chaos(self):
        """Setup chaos injector for decorator tests."""
        chaos = get_chaos_injector()
        chaos.reset()
        chaos.configure(enabled=True, probability=1.0, seed=42)
        yield
        chaos.reset()

    def test_decorator_injects_network_failure(self):
        """Test decorator injects network failure."""
        chaos = get_chaos_injector()

        @chaos.decorator(FailureType.NETWORK, probability=1.0)
        def api_call():
            return "success"

        with pytest.raises(ConnectionError, match="Chaos injection"):
            api_call()

    def test_decorator_passes_through_when_disabled(self):
        """Test decorator passes through when chaos disabled."""
        chaos = get_chaos_injector()
        chaos.configure(enabled=False)

        @chaos.decorator(FailureType.NETWORK, probability=1.0)
        def api_call():
            return "success"

        result = api_call()
        assert result == "success"

    def test_decorator_preserves_function_metadata(self):
        """Test decorator preserves function name and docstring."""
        chaos = get_chaos_injector()

        @chaos.decorator(FailureType.NETWORK)
        def my_function():
            """My docstring."""
            return "result"

        assert my_function.__name__ == "my_function"
        assert "My docstring" in my_function.__doc__


class TestStatistics:
    """Tests for chaos statistics."""

    @pytest.fixture(autouse=True)
    def setup_chaos(self):
        """Setup chaos injector for statistics tests."""
        chaos = get_chaos_injector()
        chaos.reset()
        chaos.reset_statistics()
        chaos.configure(enabled=True, probability=1.0, seed=42)
        yield
        chaos.reset()

    def test_get_statistics_returns_data(self):
        """Test that get_statistics returns statistics data."""
        chaos = get_chaos_injector()

        stats = chaos.get_statistics()

        assert "enabled" in stats
        assert "probability" in stats
        assert "total_injections" in stats
        assert "injections_by_type" in stats

    def test_statistics_count_injections(self):
        """Test that statistics count injections correctly."""
        chaos = get_chaos_injector()
        chaos.reset_statistics()

        # Trigger some injections
        chaos.should_inject(FailureType.NETWORK)
        chaos.should_inject(FailureType.NETWORK)
        chaos.should_inject(FailureType.TIMEOUT)

        stats = chaos.get_statistics()

        assert stats["total_injections"] >= 2
        assert stats["injections_by_type"]["network"] >= 2

    def test_reset_statistics(self):
        """Test that reset_statistics clears all stats."""
        chaos = get_chaos_injector()

        # Trigger some injections
        chaos.should_inject(FailureType.NETWORK)

        chaos.reset_statistics()
        stats = chaos.get_statistics()

        assert stats["total_injections"] == 0


class TestEnvironmentVariables:
    """Tests for environment variable configuration."""

    def test_chaos_mode_from_env(self):
        """Test CHAOS_MODE environment variable."""
        with patch.dict(os.environ, {"CHAOS_MODE": "true"}):
            chaos = ChaosInjector()
            # Force reload from env
            chaos._config = chaos._load_config_from_env()

            assert chaos.enabled is True

    def test_chaos_probability_from_env(self):
        """Test CHAOS_PROBABILITY environment variable."""
        with patch.dict(os.environ, {"CHAOS_PROBABILITY": "0.5"}):
            chaos = ChaosInjector()
            chaos._config = chaos._load_config_from_env()

            assert chaos.probability == 0.5

    def test_chaos_max_latency_from_env(self):
        """Test CHAOS_MAX_LATENCY_MS environment variable."""
        with patch.dict(os.environ, {"CHAOS_MAX_LATENCY_MS": "1000"}):
            chaos = ChaosInjector()
            chaos._config = chaos._load_config_from_env()

            assert chaos._config.max_latency_ms == 1000


class TestThreadSafety:
    """Tests for thread safety."""

    def test_concurrent_should_inject(self):
        """Test concurrent calls to should_inject."""
        chaos = get_chaos_injector()
        chaos.reset()
        chaos.configure(enabled=True, probability=0.5, seed=42)

        results = []

        def worker():
            for _ in range(100):
                result = chaos.should_inject(FailureType.NETWORK)
                results.append(result)

        threads = [threading.Thread(target=worker) for _ in range(10)]

        for t in threads:
            t.start()
        for t in threads:
            t.join()

        # Should have 1000 results total
        assert len(results) == 1000
        # Should have mix of True and False
        assert True in results
        assert False in results

    def test_concurrent_configure(self):
        """Test concurrent configure calls."""
        chaos = get_chaos_injector()

        def worker(i):
            chaos.configure(probability=i / 100.0)

        threads = [threading.Thread(target=worker, args=(i,)) for i in range(10)]

        for t in threads:
            t.start()
        for t in threads:
            t.join()

        # Should not crash, probability should be valid
        assert 0.0 <= chaos.probability <= 1.0


class TestSafeMode:
    """Tests for production safety features."""

    def test_is_safe_environment_default(self):
        """Test is_safe_environment with default config."""
        chaos = get_chaos_injector()

        assert chaos.is_safe_environment("development") is True
        assert chaos.is_safe_environment("test") is True
        assert chaos.is_safe_environment("staging") is True
        assert chaos.is_safe_environment("production") is False

    def test_crash_simulation_opt_in(self):
        """Test that crash simulation requires opt-in."""
        chaos = get_chaos_injector()
        chaos.configure(enabled=True, probability=1.0, crash_simulation=False)

        # Should not raise when crash_simulation is disabled
        chaos.simulate_crash("exception")  # Should just log warning

    def test_crash_simulation_when_enabled(self):
        """Test crash simulation when explicitly enabled."""
        chaos = get_chaos_injector()
        chaos.configure(
            enabled=True,
            probability=1.0,
            crash_simulation=True,
            enabled_failures={FailureType.CRASH}
        )

        with pytest.raises(RuntimeError, match="Chaos injection"):
            chaos.simulate_crash("exception")


class TestIntegration:
    """Integration tests for chaos module."""

    @pytest.fixture(autouse=True)
    def reset_chaos(self):
        """Reset chaos injector before each test."""
        chaos = get_chaos_injector()
        chaos.reset()
        yield
        chaos.reset()

    def test_full_chaos_workflow(self):
        """Test a complete chaos workflow."""
        chaos = get_chaos_injector()
        chaos.configure(enabled=True, probability=0.5, seed=12345)

        # Should be able to use all features
        stats_before = chaos.get_statistics()

        # Try some operations
        with chaos.chaos_context("workflow"):
            pass

        chaos.should_inject(FailureType.NETWORK)
        chaos.inject_latency(min_ms=1, max_ms=5)

        stats_after = chaos.get_statistics()

        # Statistics should have changed
        assert stats_after["total_injections"] >= stats_before["total_injections"]

    def test_configure_chaos_helper(self):
        """Test configure_chaos helper function."""
        configure_chaos(enabled=True, probability=0.25)

        chaos = get_chaos_injector()
        assert chaos.enabled is True
        assert chaos.probability == 0.25


# =============================================================================
# PYTEST FIXTURES FOR CHAOS MODE
# =============================================================================

@pytest.fixture
def chaos_enabled():
    """Fixture that enables chaos for a test."""
    chaos = get_chaos_injector()
    chaos.configure(enabled=True, probability=0.1, seed=42)
    yield chaos
    chaos.reset()


@pytest.fixture
def chaos_disabled():
    """Fixture that disables chaos for a test."""
    chaos = get_chaos_injector()
    chaos.configure(enabled=False)
    yield chaos
    chaos.reset()


# =============================================================================
# RUN TESTS
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
