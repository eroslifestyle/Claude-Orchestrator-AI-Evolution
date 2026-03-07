"""Tests for lib/hooks.py - Session hooks system."""

import pytest
import threading
from datetime import datetime
from unittest.mock import Mock, patch

from lib.hooks import (
    HookPoint,
    HookContext,
    HookManager,
    get_hook_manager,
    register_hook,
    trigger_hook,
)


class TestHookPoint:
    """Tests for HookPoint enum."""

    def test_hook_point_values_are_unique(self):
        """All hook points should have unique values."""
        values = [point.value for point in HookPoint]
        assert len(values) == len(set(values))

    def test_hook_point_count(self):
        """Should have 12 hook points as defined in SKILL.md."""
        assert len(HookPoint) == 12

    def test_hook_point_names(self):
        """Hook point names should match SKILL.md specification."""
        expected_names = {
            "PRE_STARTUP",
            "POST_STARTUP",
            "SESSION_START",
            "SESSION_END",
            "PRE_TOOL_USE",
            "POST_TOOL_USE",
            "PRE_CLEANUP",
            "POST_CLEANUP",
            "EMERGENCY_STOP",
            "CRASH_RECOVERY",
            "PRE_COMPACT",
            "STOP",
        }
        actual_names = {point.name for point in HookPoint}
        assert actual_names == expected_names


class TestHookContext:
    """Tests for HookContext dataclass."""

    def test_hook_context_creation_minimal(self):
        """Create context with only required field."""
        ctx = HookContext(hook_point=HookPoint.SESSION_START)
        assert ctx.hook_point == HookPoint.SESSION_START
        assert isinstance(ctx.timestamp, datetime)
        assert ctx.session_id is None
        assert ctx.task_id is None
        assert ctx.agent_id is None
        assert ctx.tool_name is None
        assert ctx.tool_result is None
        assert ctx.duration_ms is None
        assert ctx.success is None
        assert ctx.files_to_delete is None
        assert ctx.files_deleted is None
        assert ctx.error is None
        assert ctx.extra == {}

    def test_hook_context_creation_full(self):
        """Create context with all fields."""
        now = datetime.now()
        ctx = HookContext(
            hook_point=HookPoint.POST_TOOL_USE,
            timestamp=now,
            session_id="sess-123",
            task_id="task-456",
            agent_id="agent-789",
            tool_name="Read",
            tool_result="file content",
            duration_ms=150.5,
            success=True,
            files_to_delete=["/tmp/file1.tmp"],
            files_deleted=["/tmp/file1.tmp"],
            error=None,
            extra={"custom": "value"}
        )
        assert ctx.hook_point == HookPoint.POST_TOOL_USE
        assert ctx.timestamp == now
        assert ctx.session_id == "sess-123"
        assert ctx.task_id == "task-456"
        assert ctx.agent_id == "agent-789"
        assert ctx.tool_name == "Read"
        assert ctx.tool_result == "file content"
        assert ctx.duration_ms == 150.5
        assert ctx.success is True
        assert ctx.files_to_delete == ["/tmp/file1.tmp"]
        assert ctx.files_deleted == ["/tmp/file1.tmp"]
        assert ctx.error is None
        assert ctx.extra == {"custom": "value"}

    def test_hook_context_default_timestamp(self):
        """Timestamp should default to current time."""
        before = datetime.now()
        ctx = HookContext(hook_point=HookPoint.SESSION_START)
        after = datetime.now()
        assert before <= ctx.timestamp <= after


class TestHookManager:
    """Tests for HookManager class."""

    def test_hook_manager_initialization(self):
        """HookManager initializes correctly."""
        manager = HookManager()
        assert manager.is_enabled()
        assert manager.get_callback_count() == 0

    def test_register_callback(self):
        """Register a callback for a hook point."""
        manager = HookManager()
        callback = Mock()

        manager.register(HookPoint.SESSION_START, callback)

        assert manager.get_callback_count(HookPoint.SESSION_START) == 1
        assert manager.has_callbacks(HookPoint.SESSION_START)

    def test_register_multiple_callbacks(self):
        """Register multiple callbacks for the same hook point."""
        manager = HookManager()
        callback1 = Mock()
        callback2 = Mock()

        manager.register(HookPoint.SESSION_START, callback1)
        manager.register(HookPoint.SESSION_START, callback2)

        assert manager.get_callback_count(HookPoint.SESSION_START) == 2

    def test_register_non_callable_raises(self):
        """Registering a non-callable should raise TypeError."""
        manager = HookManager()

        with pytest.raises(TypeError, match="must be callable"):
            manager.register(HookPoint.SESSION_START, "not a function")

    def test_unregister_callback(self):
        """Unregister a callback."""
        manager = HookManager()
        callback = Mock()

        manager.register(HookPoint.SESSION_START, callback)
        result = manager.unregister(HookPoint.SESSION_START, callback)

        assert result is True
        assert manager.get_callback_count(HookPoint.SESSION_START) == 0

    def test_unregister_nonexistent_callback(self):
        """Unregistering a non-existent callback returns False."""
        manager = HookManager()
        callback = Mock()

        result = manager.unregister(HookPoint.SESSION_START, callback)

        assert result is False

    def test_trigger_calls_callbacks(self):
        """Trigger should call all registered callbacks."""
        manager = HookManager()
        callback1 = Mock()
        callback2 = Mock()
        ctx = HookContext(hook_point=HookPoint.SESSION_START, session_id="test")

        manager.register(HookPoint.SESSION_START, callback1)
        manager.register(HookPoint.SESSION_START, callback2)
        count = manager.trigger(ctx)

        assert count == 2
        callback1.assert_called_once_with(ctx)
        callback2.assert_called_once_with(ctx)

    def test_trigger_returns_callback_count(self):
        """Trigger returns the number of callbacks invoked."""
        manager = HookManager()
        callback = Mock()

        manager.register(HookPoint.SESSION_START, callback)
        count = manager.trigger_simple(HookPoint.SESSION_START)

        assert count == 1

    def test_trigger_no_callbacks(self):
        """Trigger with no callbacks returns 0."""
        manager = HookManager()
        ctx = HookContext(hook_point=HookPoint.SESSION_START)

        count = manager.trigger(ctx)

        assert count == 0

    def test_trigger_handles_callback_exceptions(self):
        """Exceptions in callbacks are caught and logged."""
        manager = HookManager()
        failing_callback = Mock(side_effect=RuntimeError("test error"))
        success_callback = Mock()
        ctx = HookContext(hook_point=HookPoint.SESSION_START)

        manager.register(HookPoint.SESSION_START, failing_callback)
        manager.register(HookPoint.SESSION_START, success_callback)

        # Should not raise, and should call both callbacks
        count = manager.trigger(ctx)

        assert count == 2  # Both callbacks were invoked
        failing_callback.assert_called_once()
        success_callback.assert_called_once()

    def test_trigger_simple_convenience(self):
        """trigger_simple creates context and triggers."""
        manager = HookManager()
        callback = Mock()

        manager.register(HookPoint.SESSION_START, callback)
        count = manager.trigger_simple(
            HookPoint.SESSION_START,
            session_id="abc123",
            task_id="task456"
        )

        assert count == 1
        call_args = callback.call_args[0][0]
        assert call_args.hook_point == HookPoint.SESSION_START
        assert call_args.session_id == "abc123"
        assert call_args.task_id == "task456"

    def test_disable_prevents_trigger(self):
        """Disabled manager does not call callbacks."""
        manager = HookManager()
        callback = Mock()

        manager.register(HookPoint.SESSION_START, callback)
        manager.disable()
        count = manager.trigger_simple(HookPoint.SESSION_START)

        assert count == 0
        callback.assert_not_called()

    def test_enable_after_disable(self):
        """Can re-enable after disabling."""
        manager = HookManager()
        callback = Mock()

        manager.register(HookPoint.SESSION_START, callback)
        manager.disable()
        manager.enable()
        count = manager.trigger_simple(HookPoint.SESSION_START)

        assert count == 1
        callback.assert_called_once()

    def test_clear_specific_hook_point(self):
        """Clear callbacks for a specific hook point."""
        manager = HookManager()
        callback1 = Mock()
        callback2 = Mock()

        manager.register(HookPoint.SESSION_START, callback1)
        manager.register(HookPoint.SESSION_END, callback2)
        count = manager.clear(HookPoint.SESSION_START)

        assert count == 1
        assert manager.get_callback_count(HookPoint.SESSION_START) == 0
        assert manager.get_callback_count(HookPoint.SESSION_END) == 1

    def test_clear_all_hook_points(self):
        """Clear all callbacks."""
        manager = HookManager()
        callback = Mock()

        manager.register(HookPoint.SESSION_START, callback)
        manager.register(HookPoint.SESSION_END, callback)
        count = manager.clear()

        assert count == 2
        assert manager.get_callback_count() == 0

    def test_thread_safety(self):
        """HookManager operations are thread-safe."""
        manager = HookManager()
        call_count = {"count": 0}
        lock = threading.Lock()
        errors = []

        def increment(ctx):
            with lock:
                call_count["count"] += 1

        def register_and_trigger():
            try:
                # Register once per thread
                manager.register(HookPoint.SESSION_START, increment)
                # Trigger multiple times
                for _ in range(10):
                    manager.trigger_simple(HookPoint.SESSION_START)
            except Exception as e:
                with lock:
                    errors.append(str(e))

        threads = [threading.Thread(target=register_and_trigger) for _ in range(5)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        # Should have no errors and called increment correctly
        # 5 threads register, each triggers 10 times
        # Each trigger calls all 5 registered callbacks
        # So total = 5 threads * 10 triggers * N callbacks at that point
        assert len(errors) == 0, f"Thread safety errors: {errors}"
        assert call_count["count"] > 0  # At least some callbacks were made


class TestGlobalFunctions:
    """Tests for module-level convenience functions."""

    def test_get_hook_manager_singleton(self):
        """get_hook_manager returns the same instance."""
        manager1 = get_hook_manager()
        manager2 = get_hook_manager()

        assert manager1 is manager2

    def test_register_hook_convenience(self):
        """register_hook registers on the global manager."""
        # Clear any existing callbacks
        manager = get_hook_manager()
        manager.clear(HookPoint.SESSION_START)

        callback = Mock()
        register_hook(HookPoint.SESSION_START, callback)

        assert manager.has_callbacks(HookPoint.SESSION_START)

    def test_trigger_hook_convenience(self):
        """trigger_hook triggers on the global manager."""
        manager = get_hook_manager()
        manager.clear(HookPoint.SESSION_END)

        callback = Mock()
        ctx = HookContext(hook_point=HookPoint.SESSION_END, session_id="test")

        register_hook(HookPoint.SESSION_END, callback)
        count = trigger_hook(ctx)

        assert count == 1
        callback.assert_called_once_with(ctx)


class TestIntegrationWithCleanup:
    """Tests for integration with cleanup handlers."""

    def test_hook_context_for_cleanup(self):
        """HookContext can represent cleanup operations."""
        ctx = HookContext(
            hook_point=HookPoint.PRE_CLEANUP,
            files_to_delete=["/tmp/file1.tmp", "/tmp/file2.tmp"]
        )
        assert ctx.hook_point == HookPoint.PRE_CLEANUP
        assert ctx.files_to_delete == ["/tmp/file1.tmp", "/tmp/file2.tmp"]

    def test_hook_context_for_post_cleanup(self):
        """HookContext can represent post-cleanup operations."""
        ctx = HookContext(
            hook_point=HookPoint.POST_CLEANUP,
            files_deleted=["/tmp/file1.tmp"],
            success=True
        )
        assert ctx.hook_point == HookPoint.POST_CLEANUP
        assert ctx.files_deleted == ["/tmp/file1.tmp"]
        assert ctx.success is True

    def test_hook_context_for_emergency_stop(self):
        """HookContext can represent emergency stop."""
        ctx = HookContext(
            hook_point=HookPoint.EMERGENCY_STOP,
            error="SIGINT received"
        )
        assert ctx.hook_point == HookPoint.EMERGENCY_STOP
        assert ctx.error == "SIGINT received"

    def test_hook_context_for_tool_use(self):
        """HookContext can represent tool usage."""
        ctx = HookContext(
            hook_point=HookPoint.POST_TOOL_USE,
            tool_name="Read",
            duration_ms=50.5,
            success=True,
            tool_result="content"
        )
        assert ctx.hook_point == HookPoint.POST_TOOL_USE
        assert ctx.tool_name == "Read"
        assert ctx.duration_ms == 50.5
        assert ctx.success is True
