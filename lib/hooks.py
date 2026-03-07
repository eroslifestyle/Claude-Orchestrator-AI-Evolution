"""Session hooks system for orchestrator lifecycle events.

This module provides a hook system that integrates with the orchestrator
lifecycle, allowing components to register callbacks for specific events
like session start/end, cleanup, tool usage, and emergency situations.

Integration with Claude Code native hook system (settings.json -> hooks).
"""

import logging
import threading
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum, auto
from typing import Any, Callable, Dict, List, Optional

logger = logging.getLogger(__name__)


class HookPoint(Enum):
    """Enumeration of all hook points in the orchestrator lifecycle.

    Each hook point corresponds to a specific event in the orchestrator
    lifecycle where callbacks can be registered.

    Integration with Claude Code native hook system:
    - PreStartup, PostStartup: Before/after STEP 0
    - SessionStart, SessionEnd: Session lifecycle
    - PreToolUse, PostToolUse: Around tool calls
    - PreCleanup, PostCleanup: Around STEP 11
    - EmergencyStop, CrashRecovery: Emergency situations
    - PreCompact: Before context compression
    - Stop: Forced stop
    """

    # Startup hooks
    PRE_STARTUP = auto()      # Before STEP 0: Initialize emergency cleanup handlers
    POST_STARTUP = auto()     # After STEP 0: Log startup cleanup results

    # Session lifecycle
    SESSION_START = auto()    # Session begins: Load memory + load rules + health check
    SESSION_END = auto()      # Session ends: Learning capture + cleanup + final metrics

    # Tool usage hooks
    PRE_TOOL_USE = auto()     # Before any tool call: Validate tool is allowed
    POST_TOOL_USE = auto()    # After any tool call: Collect metrics (duration, success/fail)

    # Cleanup hooks
    PRE_CLEANUP = auto()      # Before STEP 11: Snapshot files to delete
    POST_CLEANUP = auto()     # After STEP 11: Verify deletion, log results

    # Emergency hooks
    EMERGENCY_STOP = auto()   # SIGINT/SIGTERM: Execute emergency cleanup
    CRASH_RECOVERY = auto()   # atexit: Force cleanup on unexpected exit

    # Context management
    PRE_COMPACT = auto()      # Before context compression: Save checkpoint
    STOP = auto()             # Forced stop: Save emergency checkpoint + partial metrics


@dataclass
class HookContext:
    """Context information passed to hook callbacks.

    Contains all relevant information about the hook event,
    including the hook point, timestamp, and any event-specific data.

    Attributes:
        hook_point: The hook point that triggered this context
        timestamp: When the hook was triggered
        session_id: Unique identifier for the current session
        task_id: ID of the current task (if applicable)
        agent_id: ID of the current agent (if applicable)
        tool_name: Name of the tool being used (for PRE/POST_TOOL_USE)
        tool_result: Result of the tool call (for POST_TOOL_USE)
        duration_ms: Duration of the operation in milliseconds (for POST_TOOL_USE)
        success: Whether the operation succeeded (for POST_TOOL_USE)
        files_to_delete: List of files to be deleted (for PRE/POST_CLEANUP)
        files_deleted: List of files that were deleted (for POST_CLEANUP)
        error: Error message if an error occurred
        extra: Additional context-specific data
    """

    hook_point: HookPoint
    timestamp: datetime = field(default_factory=datetime.now)
    session_id: Optional[str] = None
    task_id: Optional[str] = None
    agent_id: Optional[str] = None
    tool_name: Optional[str] = None
    tool_result: Optional[Any] = None
    duration_ms: Optional[float] = None
    success: Optional[bool] = None
    files_to_delete: Optional[List[str]] = None
    files_deleted: Optional[List[str]] = None
    error: Optional[str] = None
    extra: Dict[str, Any] = field(default_factory=dict)


# Type alias for hook callback functions
HookCallback = Callable[[HookContext], None]


class HookManager:
    """Manager for registering and triggering session hooks.

    Provides a centralized system for components to register callbacks
    that are invoked at specific points in the orchestrator lifecycle.

    Thread-safe: All operations are protected by a reentrant lock.

    Usage:
        manager = HookManager()

        # Register a callback
        def on_session_start(ctx: HookContext):
            print(f"Session started: {ctx.session_id}")

        manager.register(HookPoint.SESSION_START, on_session_start)

        # Trigger hooks
        ctx = HookContext(hook_point=HookPoint.SESSION_START, session_id="abc123")
        manager.trigger(ctx)
    """

    def __init__(self):
        """Initialize the HookManager."""
        self._hooks: Dict[HookPoint, List[HookCallback]] = {
            point: [] for point in HookPoint
        }
        self._lock = threading.RLock()
        self._enabled = True
        logger.debug("HookManager initialized")

    def register(self, hook_point: HookPoint, callback: HookCallback) -> None:
        """Register a callback for a specific hook point.

        Multiple callbacks can be registered for the same hook point.
        Callbacks are called in the order they were registered.

        Args:
            hook_point: The hook point to register for
            callback: The callback function to invoke
        """
        if not callable(callback):
            raise TypeError(f"Callback must be callable, got {type(callback)}")

        with self._lock:
            self._hooks[hook_point].append(callback)

        logger.debug(f"Registered callback for {hook_point.name}")

    def unregister(self, hook_point: HookPoint, callback: HookCallback) -> bool:
        """Unregister a callback from a hook point.

        Args:
            hook_point: The hook point to unregister from
            callback: The callback function to remove

        Returns:
            True if the callback was found and removed, False otherwise
        """
        with self._lock:
            try:
                self._hooks[hook_point].remove(callback)
                logger.debug(f"Unregistered callback from {hook_point.name}")
                return True
            except ValueError:
                return False

    def trigger(self, context: HookContext) -> int:
        """Trigger all callbacks registered for a hook point.

        Callbacks are called in registration order. Errors in callbacks
        are logged but do not prevent other callbacks from being called.

        Args:
            context: The hook context containing event information

        Returns:
            Number of callbacks that were invoked
        """
        if not self._enabled:
            logger.debug(f"Hooks disabled, skipping {context.hook_point.name}")
            return 0

        hook_point = context.hook_point
        callbacks_invoked = 0

        with self._lock:
            callbacks = self._hooks[hook_point].copy()

        for callback in callbacks:
            callbacks_invoked += 1  # Count all attempted invocations
            try:
                callback(context)
            except Exception as e:
                logger.error(
                    f"Error in hook callback for {hook_point.name}: {e}",
                    exc_info=True
                )

        logger.debug(
            f"Triggered {callbacks_invoked}/{len(callbacks)} callbacks for {hook_point.name}"
        )
        return callbacks_invoked

    def trigger_simple(self, hook_point: HookPoint, **kwargs) -> int:
        """Convenience method to trigger a hook with minimal context.

        Creates a HookContext with the given hook_point and any additional
        keyword arguments, then triggers the hook.

        Args:
            hook_point: The hook point to trigger
            **kwargs: Additional context fields to set

        Returns:
            Number of callbacks that were invoked
        """
        context = HookContext(hook_point=hook_point, **kwargs)
        return self.trigger(context)

    def clear(self, hook_point: Optional[HookPoint] = None) -> int:
        """Clear callbacks for a hook point or all hook points.

        Args:
            hook_point: The hook point to clear, or None to clear all

        Returns:
            Number of callbacks that were cleared
        """
        with self._lock:
            if hook_point is not None:
                count = len(self._hooks[hook_point])
                self._hooks[hook_point] = []
                logger.debug(f"Cleared {count} callbacks from {hook_point.name}")
                return count
            else:
                total = sum(len(cbs) for cbs in self._hooks.values())
                self._hooks = {point: [] for point in HookPoint}
                logger.debug(f"Cleared {total} callbacks from all hook points")
                return total

    def enable(self) -> None:
        """Enable hook triggering."""
        self._enabled = True
        logger.debug("Hooks enabled")

    def disable(self) -> None:
        """Disable hook triggering."""
        self._enabled = False
        logger.debug("Hooks disabled")

    def is_enabled(self) -> bool:
        """Check if hooks are enabled."""
        return self._enabled

    def get_callback_count(self, hook_point: Optional[HookPoint] = None) -> int:
        """Get the number of registered callbacks.

        Args:
            hook_point: The hook point to count, or None for total count

        Returns:
            Number of registered callbacks
        """
        with self._lock:
            if hook_point is not None:
                return len(self._hooks[hook_point])
            else:
                return sum(len(cbs) for cbs in self._hooks.values())

    def has_callbacks(self, hook_point: HookPoint) -> bool:
        """Check if a hook point has any registered callbacks.

        Args:
            hook_point: The hook point to check

        Returns:
            True if there are callbacks registered, False otherwise
        """
        with self._lock:
            return len(self._hooks[hook_point]) > 0


# Singleton instance for global access
_hook_manager_instance: Optional[HookManager] = None
_hook_manager_lock = threading.Lock()


def get_hook_manager() -> HookManager:
    """Get the singleton HookManager instance.

    Creates the instance on first call. Thread-safe.

    Returns:
        The global HookManager instance
    """
    global _hook_manager_instance

    if _hook_manager_instance is None:
        with _hook_manager_lock:
            if _hook_manager_instance is None:
                _hook_manager_instance = HookManager()

    return _hook_manager_instance


def register_hook(hook_point: HookPoint, callback: HookCallback) -> None:
    """Convenience function to register a hook on the global manager.

    Args:
        hook_point: The hook point to register for
        callback: The callback function to invoke
    """
    get_hook_manager().register(hook_point, callback)


def trigger_hook(context: HookContext) -> int:
    """Convenience function to trigger a hook on the global manager.

    Args:
        context: The hook context containing event information

    Returns:
        Number of callbacks that were invoked
    """
    return get_hook_manager().trigger(context)
