"""Centralized Configuration for Orchestrator V15.2.

This module provides a single source of truth for all configurable parameters.
Values can be overridden via environment variables.

Usage:
    from lib.config import config

    # Access configuration values
    if memory_usage > config.MEMORY_WARNING_THRESHOLD:
        logger.warning("Memory warning")

    # Use in module initialization
    cache_ttl = config.CACHE_TTL_SECONDS

Environment Variables:
    MEMORY_WARNING_THRESHOLD: Memory warning threshold (default: 0.70)
    MEMORY_CRITICAL_THRESHOLD: Memory critical threshold (default: 0.90)
    CACHE_TTL_SECONDS: Cache TTL in seconds (default: 300)
    MAX_CACHE_ENTRIES: Maximum cache entries (default: 1000)
    ESCALATION_FAILURE_THRESHOLD: Failures before escalation (default: 3)
    ESCALATION_RESET_TIMEOUT: Reset timeout in seconds (default: 300)
    BACKPRESSURE_CPU_THRESHOLD: CPU threshold percent (default: 0.70)
    BACKPRESSURE_RAM_THRESHOLD: RAM threshold percent (default: 0.75)
    GRACEFUL_SHUTDOWN_TIMEOUT: Shutdown timeout in seconds (default: 5)
"""

from __future__ import annotations

import logging
import os
from dataclasses import dataclass, field
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


def _get_float(env_var: str, default: float) -> float:
    """Get float from environment variable with fallback."""
    value = os.getenv(env_var)
    if value is None:
        return default
    try:
        return float(value)
    except ValueError:
        logger.warning(
            f"Invalid {env_var} value '{value}', using default {default}"
        )
        return default


def _get_int(env_var: str, default: int) -> int:
    """Get int from environment variable with fallback."""
    value = os.getenv(env_var)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        logger.warning(
            f"Invalid {env_var} value '{value}', using default {default}"
        )
        return default


@dataclass
class OrchestratorConfig:
    """Centralized configuration for the Orchestrator system.

    All values can be overridden via environment variables.
    Use the global `config` instance for access throughout the codebase.

    Attributes:
        MEMORY_WARNING_THRESHOLD: Fraction of memory usage that triggers warning (0.0-1.0)
        MEMORY_CRITICAL_THRESHOLD: Fraction of memory usage that triggers critical action (0.0-1.0)
        CACHE_TTL_SECONDS: Time-to-live for cache entries in seconds
        MAX_CACHE_ENTRIES: Maximum number of entries in caches
        ESCALATION_FAILURE_THRESHOLD: Number of failures before model escalation
        ESCALATION_RESET_TIMEOUT: Seconds before resetting escalation state
        BACKPRESSURE_CPU_THRESHOLD: CPU usage fraction that triggers backpressure (0.0-1.0)
        BACKPRESSURE_RAM_THRESHOLD: RAM usage fraction that triggers backpressure (0.0-1.0)
        GRACEFUL_SHUTDOWN_TIMEOUT: Seconds to wait for graceful shutdown
    """

    # Memory thresholds (fraction of total memory, 0.0-1.0)
    MEMORY_WARNING_THRESHOLD: float = field(
        default_factory=lambda: _get_float("MEMORY_WARNING_THRESHOLD", 0.70)
    )
    MEMORY_CRITICAL_THRESHOLD: float = field(
        default_factory=lambda: _get_float("MEMORY_CRITICAL_THRESHOLD", 0.90)
    )

    # Cache settings
    CACHE_TTL_SECONDS: int = field(
        default_factory=lambda: _get_int("CACHE_TTL_SECONDS", 300)
    )
    MAX_CACHE_ENTRIES: int = field(
        default_factory=lambda: _get_int("MAX_CACHE_ENTRIES", 1000)
    )

    # Escalation settings
    ESCALATION_FAILURE_THRESHOLD: int = field(
        default_factory=lambda: _get_int("ESCALATION_FAILURE_THRESHOLD", 3)
    )
    ESCALATION_RESET_TIMEOUT: int = field(
        default_factory=lambda: _get_int("ESCALATION_RESET_TIMEOUT", 300)
    )

    # Backpressure thresholds (fraction, 0.0-1.0)
    BACKPRESSURE_CPU_THRESHOLD: float = field(
        default_factory=lambda: _get_float("BACKPRESSURE_CPU_THRESHOLD", 0.70)
    )
    BACKPRESSURE_RAM_THRESHOLD: float = field(
        default_factory=lambda: _get_float("BACKPRESSURE_RAM_THRESHOLD", 0.75)
    )

    # Graceful shutdown
    GRACEFUL_SHUTDOWN_TIMEOUT: int = field(
        default_factory=lambda: _get_int("GRACEFUL_SHUTDOWN_TIMEOUT", 5)
    )

    @classmethod
    def load(cls) -> "OrchestratorConfig":
        """Load configuration from environment variables.

        Returns:
            OrchestratorConfig instance with environment overrides applied
        """
        instance = cls()
        logger.info(
            "OrchestratorConfig loaded",
            extra={
                "memory_warning": instance.MEMORY_WARNING_THRESHOLD,
                "memory_critical": instance.MEMORY_CRITICAL_THRESHOLD,
                "cache_ttl": instance.CACHE_TTL_SECONDS,
                "max_cache": instance.MAX_CACHE_ENTRIES,
                "escalation_threshold": instance.ESCALATION_FAILURE_THRESHOLD,
                "escalation_timeout": instance.ESCALATION_RESET_TIMEOUT,
                "backpressure_cpu": instance.BACKPRESSURE_CPU_THRESHOLD,
                "backpressure_ram": instance.BACKPRESSURE_RAM_THRESHOLD,
                "shutdown_timeout": instance.GRACEFUL_SHUTDOWN_TIMEOUT,
            }
        )
        return instance

    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary.

        Returns:
            Dictionary representation of all config values
        """
        return {
            "MEMORY_WARNING_THRESHOLD": self.MEMORY_WARNING_THRESHOLD,
            "MEMORY_CRITICAL_THRESHOLD": self.MEMORY_CRITICAL_THRESHOLD,
            "CACHE_TTL_SECONDS": self.CACHE_TTL_SECONDS,
            "MAX_CACHE_ENTRIES": self.MAX_CACHE_ENTRIES,
            "ESCALATION_FAILURE_THRESHOLD": self.ESCALATION_FAILURE_THRESHOLD,
            "ESCALATION_RESET_TIMEOUT": self.ESCALATION_RESET_TIMEOUT,
            "BACKPRESSURE_CPU_THRESHOLD": self.BACKPRESSURE_CPU_THRESHOLD,
            "BACKPRESSURE_RAM_THRESHOLD": self.BACKPRESSURE_RAM_THRESHOLD,
            "GRACEFUL_SHUTDOWN_TIMEOUT": self.GRACEFUL_SHUTDOWN_TIMEOUT,
        }

    def update_from_dict(self, values: Dict[str, Any]) -> None:
        """Update configuration from dictionary.

        Only updates existing fields, ignores unknown keys.

        Args:
            values: Dictionary with new values
        """
        for key, value in values.items():
            if hasattr(self, key):
                setattr(self, key, value)
                logger.debug(f"Config updated: {key} = {value}")


# Global singleton instance
config = OrchestratorConfig.load()
