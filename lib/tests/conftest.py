"""Pytest Configuration for Chaos Engineering Tests.

This module provides pytest configuration and fixtures for chaos engineering
support in the test suite.

Features:
    - --chaos-mode flag to enable chaos during tests
    - Chaos injection fixtures for resilience testing
    - Automatic chaos configuration based on CLI args

Usage:
    # Normal test run
    pytest lib/tests/ -v

    # Run tests with chaos mode enabled
    pytest lib/tests/ -v --chaos-mode

    # Configure chaos probability
    pytest lib/tests/ -v --chaos-mode --chaos-probability=0.1

    # Enable crash simulation (dangerous)
    pytest lib/tests/ -v --chaos-mode --chaos-crash-simulation
"""

import os
import sys
import pytest
from typing import Optional

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def pytest_addoption(parser: pytest.Parser) -> None:
    """Add chaos engineering command-line options.

    Args:
        parser: Pytest argument parser
    """
    chaos_group = parser.getgroup("chaos", "Chaos Engineering Options")

    chaos_group.addoption(
        "--chaos-mode",
        action="store_true",
        default=False,
        help="Enable chaos engineering mode for resilience testing",
    )

    chaos_group.addoption(
        "--chaos-probability",
        type=float,
        default=0.01,
        help="Chaos injection probability (0.0-1.0, default: 0.01)",
    )

    chaos_group.addoption(
        "--chaos-max-latency",
        type=int,
        default=500,
        help="Maximum latency to inject in milliseconds (default: 500)",
    )

    chaos_group.addoption(
        "--chaos-seed",
        type=int,
        default=None,
        help="Random seed for reproducible chaos (default: None)",
    )

    chaos_group.addoption(
        "--chaos-crash-simulation",
        action="store_true",
        default=False,
        help="Enable crash simulation (DANGEROUS - use only in isolated environments)",
    )

    chaos_group.addoption(
        "--chaos-enabled-failures",
        type=str,
        default="network,latency,timeout,memory",
        help="Comma-separated list of enabled failure types "
             "(default: network,latency,timeout,memory)",
    )


@pytest.fixture(scope="session")
def chaos_config(request: pytest.FixtureRequest) -> dict:
    """Get chaos configuration from command-line options.

    Args:
        request: Pytest fixture request

    Returns:
        Dictionary with chaos configuration
    """
    return {
        "enabled": request.config.getoption("--chaos-mode"),
        "probability": request.config.getoption("--chaos-probability"),
        "max_latency_ms": request.config.getoption("--chaos-max-latency"),
        "seed": request.config.getoption("--chaos-seed"),
        "crash_simulation": request.config.getoption("--chaos-crash-simulation"),
        "enabled_failures_str": request.config.getoption("--chaos-enabled-failures"),
    }


@pytest.fixture(scope="session", autouse=True)
def configure_chaos_session(chaos_config: dict) -> None:
    """Configure chaos injector for the test session.

    This fixture runs automatically at the start of the test session
    and configures the global ChaosInjector based on command-line options.

    Args:
        chaos_config: Chaos configuration dictionary
    """
    from lib.chaos import (
        ChaosInjector,
        FailureType,
        get_chaos_injector,
    )

    chaos = get_chaos_injector()
    chaos.reset()

    # Parse enabled failure types
    enabled_failures = set()
    if chaos_config["enabled"]:
        for ft_str in chaos_config["enabled_failures_str"].split(","):
            try:
                enabled_failures.add(FailureType(ft_str.strip()))
            except ValueError:
                pass  # Skip unknown failure types

    # Configure chaos injector
    chaos.configure(
        enabled=chaos_config["enabled"],
        probability=chaos_config["probability"],
        max_latency_ms=chaos_config["max_latency_ms"],
        seed=chaos_config["seed"],
        crash_simulation=chaos_config["crash_simulation"],
        enabled_failures=enabled_failures if enabled_failures else None,
    )

    # Store chaos mode in environment for other components
    if chaos_config["enabled"]:
        os.environ["CHAOS_MODE"] = "true"
        os.environ["CHAOS_PROBABILITY"] = str(chaos_config["probability"])

    yield

    # Cleanup: reset chaos after session
    chaos.reset()


@pytest.fixture
def chaos_injector():
    """Get the ChaosInjector instance for a test.

    Yields:
        ChaosInjector instance (reset after each test)
    """
    from lib.chaos import get_chaos_injector

    chaos = get_chaos_injector()
    chaos.reset_statistics()
    yield chaos
    chaos.reset_statistics()


@pytest.fixture
def chaos_enabled(chaos_injector):
    """Fixture that enables chaos for a specific test.

    Args:
        chaos_injector: ChaosInjector fixture

    Yields:
        ChaosInjector with chaos enabled
    """
    chaos_injector.configure(enabled=True)
    yield chaos_injector
    chaos_injector.configure(enabled=False)


@pytest.fixture
def chaos_disabled(chaos_injector):
    """Fixture that ensures chaos is disabled for a specific test.

    Args:
        chaos_injector: ChaosInjector fixture

    Yields:
        ChaosInjector with chaos disabled
    """
    chaos_injector.configure(enabled=False)
    yield chaos_injector


# =============================================================================
# CHAOS MARKERS
# =============================================================================

def pytest_configure(config: pytest.Config) -> None:
    """Register custom markers for chaos tests.

    Args:
        config: Pytest configuration
    """
    config.addinivalue_line(
        "markers",
        "chaos: mark test to run with chaos mode enabled"
    )
    config.addinivalue_line(
        "markers",
        "chaos_network: mark test to run with network chaos"
    )
    config.addinivalue_line(
        "markers",
        "chaos_latency: mark test to run with latency chaos"
    )
    config.addinivalue_line(
        "markers",
        "chaos_timeout: mark test to run with timeout chaos"
    )
    config.addinivalue_line(
        "markers",
        "chaos_memory: mark test to run with memory pressure chaos"
    )
    config.addinivalue_line(
        "markers",
        "chaos_resilience: mark test as resilience test requiring chaos mode"
    )


@pytest.fixture(autouse=True)
def apply_chaos_markers(request: pytest.FixtureRequest, chaos_injector):
    """Apply chaos configuration based on test markers.

    This fixture automatically enables chaos for tests marked with
    chaos-related markers.

    Args:
        request: Pytest fixture request
        chaos_injector: ChaosInjector fixture
    """
    from lib.chaos import FailureType

    marker = request.node.get_closest_marker("chaos")
    if marker:
        # Generic chaos marker
        chaos_injector.configure(enabled=True)
        if marker.args:
            probability = marker.args[0]
            chaos_injector.configure(probability=probability)

    # Specific chaos type markers
    if request.node.get_closest_marker("chaos_network"):
        chaos_injector.configure(
            enabled=True,
            enabled_failures={FailureType.NETWORK}
        )

    if request.node.get_closest_marker("chaos_latency"):
        chaos_injector.configure(
            enabled=True,
            enabled_failures={FailureType.LATENCY}
        )

    if request.node.get_closest_marker("chaos_timeout"):
        chaos_injector.configure(
            enabled=True,
            enabled_failures={FailureType.TIMEOUT}
        )

    if request.node.get_closest_marker("chaos_memory"):
        chaos_injector.configure(
            enabled=True,
            enabled_failures={FailureType.MEMORY}
        )

    if request.node.get_closest_marker("chaos_resilience"):
        # Resilience tests should always run with chaos
        if not chaos_injector.enabled:
            chaos_injector.configure(enabled=True, probability=0.1)

    yield

    # Reset after test
    if marker or request.node.get_closest_marker("chaos_resilience"):
        chaos_injector.reset_statistics()


# =============================================================================
# HOOKS
# =============================================================================

@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_makereport(item: pytest.Item, call: pytest.CallInfo):
    """Add chaos information to test reports.

    Args:
        item: Test item
        call: Call info
    """
    outcome = yield
    report = outcome.get_result()

    # Add chaos statistics to report if available
    if hasattr(item, "funcargs") and "chaos_injector" in item.funcargs:
        chaos = item.funcargs["chaos_injector"]
        if hasattr(report, "sections"):
            stats = chaos.get_statistics()
            report.sections.append(
                ("Chaos Statistics", f"Total injections: {stats['total_injections']}")
            )


def pytest_terminal_summary(terminalreporter, exitstatus, config):
    """Add chaos summary to terminal output.

    Args:
        terminalreporter: Terminal reporter
        exitstatus: Exit status
        config: Pytest configuration
    """
    if config.getoption("--chaos-mode"):
        terminalreporter.write_sep("=", "Chaos Engineering Summary")
        terminalreporter.write_line(
            f"  Chaos Mode: ENABLED"
        )
        terminalreporter.write_line(
            f"  Probability: {config.getoption('--chaos-probability')}"
        )
        terminalreporter.write_line(
            f"  Max Latency: {config.getoption('--chaos-max-latency')}ms"
        )
        if config.getoption("--chaos-seed"):
            terminalreporter.write_line(
                f"  Seed: {config.getoption('--chaos-seed')}"
            )


# =============================================================================
# STATE CLEANUP FIXTURES
# =============================================================================

@pytest.fixture(autouse=True)
def cleanup_global_state():
    """Reset global state between tests to prevent state leaks.

    This fixture runs automatically before and after each test to ensure
    no state persists between tests that could cause flaky behavior.
    """
    # Pre-test cleanup (in case previous test didn't clean up)
    _reset_predictive_cache_state()
    _reset_chaos_state()

    yield

    # Post-test cleanup
    _reset_predictive_cache_state()
    _reset_chaos_state()


def _reset_predictive_cache_state() -> None:
    """Reset PatternRecognitionEngine and PredictiveAgentCache state."""
    try:
        from lib.predictive_cache import (
            PatternRecognitionEngine,
            reset_predictive_cache,
        )

        # Reset class-level state
        if hasattr(PatternRecognitionEngine, '_pattern_history'):
            PatternRecognitionEngine._pattern_history.clear()
        if hasattr(PatternRecognitionEngine, '_keyword_cooccurrence'):
            PatternRecognitionEngine._keyword_cooccurrence.clear()
        if hasattr(PatternRecognitionEngine, '_domain_patterns'):
            PatternRecognitionEngine._domain_patterns.clear()

        # Reset singleton
        reset_predictive_cache()
    except ImportError:
        pass
    except Exception:
        pass  # Silently ignore cleanup errors


def _reset_chaos_state() -> None:
    """Reset ChaosInjector state."""
    try:
        from lib.chaos import get_chaos_injector
        chaos = get_chaos_injector()
        chaos.reset()
    except ImportError:
        pass
    except Exception:
        pass  # Silently ignore cleanup errors


# =============================================================================
# PUBLIC API
# =============================================================================

__all__ = [
    "chaos_config",
    "configure_chaos_session",
    "chaos_injector",
    "chaos_enabled",
    "chaos_disabled",
    "cleanup_global_state",
]
