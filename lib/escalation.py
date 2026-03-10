"""Auto-Escalation System for Orchestrator V15.2.

This module provides automatic model escalation based on task failures:
- Tracks consecutive failures per task/agent
- Escalates to higher model after threshold (default: 3 failures)
- Model hierarchy: haiku -> sonnet -> opus
- Resets counter on success
- Integrates with existing circuit breaker

Features:
- Thread-safe with RLock
- Structured logging
- Configurable threshold and timeout
- Integration with facade.py

Usage:
    from lib.escalation import EscalationManager, get_escalation_manager

    # Get singleton instance
    manager = get_escalation_manager()

    # Check if should escalate
    if manager.should_escalate("task_123", EscalationLevel.HAIKU):
        new_model = manager.get_escalated_model(EscalationLevel.HAIKU)
        print(f"Escalating to: {new_model.value}")

    # Record outcomes
    manager.record_success("task_123")
    manager.record_failure("task_123", "agent_coder")
"""

from __future__ import annotations

import logging
import threading
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, Optional, Tuple

logger = logging.getLogger(__name__)


# =============================================================================
# CONSTANTS
# =============================================================================

# Import configurazione centralizzata
from lib.config import config

# Threshold da config centralizzato (con fallback per backward compatibility)
DEFAULT_FAILURE_THRESHOLD = config.ESCALATION_FAILURE_THRESHOLD
DEFAULT_ESCALATION_TIMEOUT = config.ESCALATION_RESET_TIMEOUT
MAX_FAILURES_PER_TASK = 10  # Cap to prevent runaway counters


# =============================================================================
# ENUMS
# =============================================================================

class EscalationLevel(Enum):
    """Model hierarchy for escalation."""
    HAIKU = "haiku"
    SONNET = "sonnet"
    OPUS = "opus"

    @classmethod
    def get_hierarchy(cls) -> Tuple["EscalationLevel", ...]:
        """Return escalation order.

        Returns:
            Tuple of levels from lowest to highest.
        """
        return (cls.HAIKU, cls.SONNET, cls.OPUS)


class EscalationAction(Enum):
    """Action taken after recording a failure."""
    NONE = "none"  # No escalation needed
    ESCALATE = "escalate"  # Should escalate to next model
    MAX_REACHED = "max_reached"  # Already at max model
    CIRCUIT_OPEN = "circuit_open"  # Circuit breaker triggered


# =============================================================================
# DATA STRUCTURES
# =============================================================================

@dataclass
class FailureRecord:
    """Record of failures for a task.

    Attributes:
        task_id: Task identifier
        agent_id: Agent handling the task
        failure_count: Consecutive failure count
        last_failure_time: Timestamp of last failure
        current_level: Current model level
        escalated_at: When escalation occurred (if any)
    """
    task_id: str
    agent_id: str
    failure_count: int = 0
    last_failure_time: float = 0.0
    current_level: EscalationLevel = EscalationLevel.HAIKU
    escalated_at: Optional[float] = None


@dataclass
class EscalationConfig:
    """Configuration for escalation manager.

    Attributes:
        failure_threshold: Failures before escalation
        timeout_seconds: Seconds before resetting escalation state
        enable_circuit_breaker: Whether to integrate with circuit breaker
        max_level: Maximum escalation level allowed
    """
    failure_threshold: int = DEFAULT_FAILURE_THRESHOLD
    timeout_seconds: int = DEFAULT_ESCALATION_TIMEOUT
    enable_circuit_breaker: bool = True
    max_level: EscalationLevel = EscalationLevel.OPUS


# =============================================================================
# TASK FAILURE TRACKER
# =============================================================================

class TaskFailureTracker:
    """Thread-safe tracker for task failures.

    Tracks consecutive failures per task and provides
    atomic operations for increment/reset.

    Example:
        tracker = TaskFailureTracker()
        count = tracker.track_failure("task_1", "agent_a")
        if count >= 3:
            print("Escalate!")
        tracker.reset("task_1")
    """

    def __init__(self, max_failures: int = MAX_FAILURES_PER_TASK):
        """Initialize the tracker.

        Args:
            max_failures: Maximum failures to track per task.
        """
        self._records: Dict[str, FailureRecord] = {}
        self._lock = threading.RLock()
        self._max_failures = max_failures

    def track_failure(self, task_id: str, agent_id: str) -> int:
        """Record a failure and return the count.

        Args:
            task_id: Task identifier
            agent_id: Agent handling the task

        Returns:
            Current consecutive failure count
        """
        with self._lock:
            record = self._records.get(task_id)

            if record is None:
                record = FailureRecord(
                    task_id=task_id,
                    agent_id=agent_id,
                    failure_count=1,
                    last_failure_time=time.time()
                )
                self._records[task_id] = record
            else:
                record.failure_count = min(
                    record.failure_count + 1,
                    self._max_failures
                )
                record.last_failure_time = time.time()
                record.agent_id = agent_id

            logger.debug(
                "Failure tracked",
                extra={
                    "task_id": task_id,
                    "agent_id": agent_id,
                    "failure_count": record.failure_count
                }
            )

            return record.failure_count

    def reset(self, task_id: str) -> None:
        """Reset failure count for a task.

        Args:
            task_id: Task identifier
        """
        with self._lock:
            if task_id in self._records:
                record = self._records[task_id]
                logger.info(
                    "Failure count reset",
                    extra={
                        "task_id": task_id,
                        "previous_count": record.failure_count
                    }
                )
                del self._records[task_id]

    def get_failure_count(self, task_id: str) -> int:
        """Get current failure count for a task.

        Args:
            task_id: Task identifier

        Returns:
            Current consecutive failure count (0 if not tracked)
        """
        with self._lock:
            record = self._records.get(task_id)
            return record.failure_count if record else 0

    def get_record(self, task_id: str) -> Optional[FailureRecord]:
        """Get the full failure record for a task.

        Args:
            task_id: Task identifier

        Returns:
            FailureRecord if exists, None otherwise
        """
        with self._lock:
            return self._records.get(task_id)

    def cleanup_expired(self, timeout_seconds: int) -> int:
        """Remove expired records.

        Args:
            timeout_seconds: Seconds after which records expire

        Returns:
            Number of records removed
        """
        with self._lock:
            now = time.time()
            expired = [
                task_id for task_id, record in self._records.items()
                if now - record.last_failure_time > timeout_seconds
            ]

            for task_id in expired:
                del self._records[task_id]

            if expired:
                logger.info(
                    "Cleaned up expired failure records",
                    extra={"count": len(expired)}
                )

            return len(expired)


# =============================================================================
# ESCALATION MANAGER
# =============================================================================

class EscalationManager:
    """Manages automatic model escalation based on failures.

    Integrates with circuit breaker for coordinated fault tolerance.

    Example:
        config = EscalationConfig(failure_threshold=3)
        manager = EscalationManager(config)

        # Record failure
        action = manager.record_failure("task_1", "agent_coder")
        if action == EscalationAction.ESCALATE:
            new_model = manager.get_escalated_model(current)

        # On success, reset counter
        manager.record_success("task_1")
    """

    def __init__(
        self,
        config: Optional[EscalationConfig] = None,
        circuit_breaker_config: Optional[Dict] = None
    ):
        """Initialize the escalation manager.

        Args:
            config: Escalation configuration
            circuit_breaker_config: Circuit breaker integration config
        """
        self._config = config or EscalationConfig()
        self._tracker = TaskFailureTracker()
        self._lock = threading.RLock()

        # Escalation history for metrics
        self._escalation_history: Dict[str, int] = {
            level.value: 0 for level in EscalationLevel
        }
        self._total_escalations = 0

        logger.info(
            "EscalationManager initialized",
            extra={
                "failure_threshold": self._config.failure_threshold,
                "timeout_seconds": self._config.timeout_seconds,
                "max_level": self._config.max_level.value
            }
        )

    def should_escalate(self, task_id: str, current_model: EscalationLevel) -> bool:
        """Check if task should escalate to higher model.

        Args:
            task_id: Task identifier
            current_model: Current model level

        Returns:
            True if should escalate
        """
        with self._lock:
            failure_count = self._tracker.get_failure_count(task_id)
            threshold = self._config.failure_threshold

            # Check if already at max level
            if current_model == self._config.max_level:
                return False

            # Check if threshold reached
            should = failure_count >= threshold

            if should:
                logger.warning(
                    "Escalation threshold reached",
                    extra={
                        "task_id": task_id,
                        "failure_count": failure_count,
                        "threshold": threshold,
                        "current_model": current_model.value
                    }
                )

            return should

    def get_escalated_model(
        self,
        current_model: EscalationLevel
    ) -> EscalationLevel:
        """Get the next higher model in hierarchy.

        Args:
            current_model: Current model level

        Returns:
            Next higher model level (or same if at max)
        """
        hierarchy = EscalationLevel.get_hierarchy()

        try:
            current_index = hierarchy.index(current_model)
            next_index = min(current_index + 1, len(hierarchy) - 1)
            return hierarchy[next_index]
        except ValueError:
            # Unknown model, default to sonnet
            logger.warning(
                "Unknown model level, defaulting to sonnet",
                extra={"current_model": str(current_model)}
            )
            return EscalationLevel.SONNET

    def record_success(self, task_id: str) -> None:
        """Record a successful task completion.

        Resets the failure counter for this task.

        Args:
            task_id: Task identifier
        """
        with self._lock:
            self._tracker.reset(task_id)
            logger.debug(
                "Success recorded, counter reset",
                extra={"task_id": task_id}
            )

    def record_failure(
        self,
        task_id: str,
        agent_id: str
    ) -> EscalationAction:
        """Record a task failure and determine action.

        Args:
            task_id: Task identifier
            agent_id: Agent handling the task

        Returns:
            EscalationAction indicating what to do
        """
        with self._lock:
            record = self._tracker.get_record(task_id)
            current_level = record.current_level if record else EscalationLevel.HAIKU

            # Track the failure
            failure_count = self._tracker.track_failure(task_id, agent_id)

            # Determine action
            if current_level == self._config.max_level:
                logger.warning(
                    "Failure at max level",
                    extra={
                        "task_id": task_id,
                        "failure_count": failure_count,
                        "level": current_level.value
                    }
                )
                return EscalationAction.MAX_REACHED

            if failure_count >= self._config.failure_threshold:
                # Perform escalation
                new_level = self.get_escalated_model(current_level)

                # Update record with new level
                record = self._tracker.get_record(task_id)
                if record:
                    record.current_level = new_level
                    record.escalated_at = time.time()

                # Update metrics
                self._escalation_history[new_level.value] += 1
                self._total_escalations += 1

                logger.warning(
                    "Escalating model",
                    extra={
                        "task_id": task_id,
                        "from_level": current_level.value,
                        "to_level": new_level.value,
                        "failure_count": failure_count
                    }
                )

                return EscalationAction.ESCALATE

            return EscalationAction.NONE

    def get_current_level(self, task_id: str) -> EscalationLevel:
        """Get current escalation level for a task.

        Args:
            task_id: Task identifier

        Returns:
            Current model level (HAIKU if not tracked)
        """
        with self._lock:
            record = self._tracker.get_record(task_id)
            return record.current_level if record else EscalationLevel.HAIKU

    def get_metrics(self) -> Dict:
        """Get escalation metrics.

        Returns:
            Dict with escalation statistics
        """
        with self._lock:
            return {
                "total_escalations": self._total_escalations,
                "escalations_by_level": dict(self._escalation_history),
                "tracked_tasks": len(self._tracker._records),
                "config": {
                    "failure_threshold": self._config.failure_threshold,
                    "timeout_seconds": self._config.timeout_seconds,
                    "max_level": self._config.max_level.value
                }
            }

    def reset(self) -> None:
        """Reset all escalation state."""
        with self._lock:
            self._tracker._records.clear()
            self._escalation_history = {
                level.value: 0 for level in EscalationLevel
            }
            self._total_escalations = 0
            logger.info("EscalationManager reset")


# =============================================================================
# SINGLETON INSTANCE
# =============================================================================

_instance: Optional[EscalationManager] = None
_instance_lock = threading.Lock()


def get_escalation_manager(
    config: Optional[EscalationConfig] = None
) -> EscalationManager:
    """Get singleton escalation manager instance.

    Args:
        config: Configuration (only used on first call)

    Returns:
        EscalationManager singleton
    """
    global _instance

    if _instance is None:
        with _instance_lock:
            if _instance is None:
                _instance = EscalationManager(config=config)

    return _instance


def reset_escalation_manager() -> None:
    """Reset the singleton instance (for testing)."""
    global _instance

    with _instance_lock:
        if _instance is not None:
            _instance.reset()
        _instance = None
