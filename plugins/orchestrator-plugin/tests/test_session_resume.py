"""
Tests for session_resume.py - Session Resume Handler
"""

from __future__ import annotations

from pathlib import Path
from unittest.mock import Mock, patch

import pytest

import mcp_server.session_resume  # Import for coverage
from mcp_server.session_resume import (
    SessionResumeHandler,
    get_resume_handler,
    check_and_prompt_resume
)
from mcp_server.session_manager import (
    SessionState,
    SessionStatus,
    TaskState,
    SessionManager
)


class TestSessionResumeHandler:
    """Tests for SessionResumeHandler class."""

    def test_initialization(self) -> None:
        """Test SessionResumeHandler initialization."""
        handler = SessionResumeHandler()
        assert handler.session_manager is not None
        assert len(handler.resumable_sessions) == 0

    def test_has_resumable_sessions_true(self, tmp_path: Path) -> None:
        """Test has_resumable_sessions when sessions exist."""
        # Create a session with pending tasks
        manager = SessionManager(checkpoint_dir=tmp_path)
        session = manager.create_session("Test request")
        manager.add_task(session.session_id, "T1", "Task", "analyzer")
        # Need to checkpoint to persist to disk
        manager.checkpoint(session.session_id)

        handler = SessionResumeHandler()
        # Mock the session manager's get_resumable_sessions
        handler.session_manager = manager

        assert handler.has_resumable_sessions() is True
        assert len(handler.resumable_sessions) == 1

    def test_has_resumable_sessions_false(self, tmp_path: Path) -> None:
        """Test has_resumable_sessions when no sessions exist."""
        manager = SessionManager(checkpoint_dir=tmp_path)

        handler = SessionResumeHandler()
        handler.session_manager = manager

        assert handler.has_resumable_sessions() is False

    def test_get_resume_prompt(self, tmp_path: Path) -> None:
        """Test get_resume_prompt generates formatted output."""
        manager = SessionManager(checkpoint_dir=tmp_path)
        session = manager.create_session("Fix auth bug")
        manager.add_task(session.session_id, "T1", "Analyze", "analyzer")
        manager.add_task(session.session_id, "T2", "Fix", "coder")
        manager.update_task(session.session_id, "T1", "completed")
        # Need to checkpoint
        manager.checkpoint(session.session_id)

        handler = SessionResumeHandler()
        handler.session_manager = manager
        handler.resumable_sessions = handler.session_manager.get_resumable_sessions()

        prompt = handler.get_resume_prompt()

        assert "INCOMPLETE SESSIONS DETECTED" in prompt
        assert session.session_id in prompt
        assert "Fix auth bug" in prompt
        assert "Would you like to resume" in prompt

    def test_get_resume_prompt_empty(self, tmp_path: Path) -> None:
        """Test get_resume_prompt when no sessions."""
        handler = SessionResumeHandler()
        handler.resumable_sessions = []

        prompt = handler.get_resume_prompt()
        assert prompt == ""

    def test_get_resume_prompt_limits_to_3(self, tmp_path: Path) -> None:
        """Test get_resume_prompt limits to 3 sessions."""
        manager = SessionManager(checkpoint_dir=tmp_path)

        # Create 5 sessions
        for i in range(5):
            session = manager.create_session(f"Request {i}")
            manager.add_task(session.session_id, f"T{i}", "Task", "analyzer")
            manager.checkpoint(session.session_id)

        handler = SessionResumeHandler()
        handler.session_manager = manager
        handler.resumable_sessions = handler.session_manager.get_resumable_sessions()

        prompt = handler.get_resume_prompt()

        # Should only show 3
        assert prompt.count("Session ") == 3

    def test_get_resumable_sessions(self, tmp_path: Path) -> None:
        """Test get_resumable_sessions."""
        manager = SessionManager(checkpoint_dir=tmp_path)
        session = manager.create_session("Test request")
        manager.add_task(session.session_id, "T1", "Task", "analyzer")
        manager.checkpoint(session.session_id)

        handler = SessionResumeHandler()
        handler.session_manager = manager

        sessions = handler.get_resumable_sessions()
        assert len(sessions) == 1
        assert sessions[0]["session_id"] == session.session_id

    def test_get_resumable_sessions_cached(self, tmp_path: Path) -> None:
        """Test that resumable_sessions is cached."""
        manager = SessionManager(checkpoint_dir=tmp_path)
        session = manager.create_session("Test request")
        manager.add_task(session.session_id, "T1", "Task", "analyzer")
        manager.checkpoint(session.session_id)

        handler = SessionResumeHandler()
        handler.session_manager = manager

        # First call populates cache
        sessions1 = handler.get_resumable_sessions()
        # Second call should return cached
        sessions2 = handler.get_resumable_sessions()

        assert sessions1 is sessions2

    def test_resume_session(self, tmp_path: Path) -> None:
        """Test resuming a session."""
        manager = SessionManager(checkpoint_dir=tmp_path)
        session = manager.create_session("Test request")
        manager.add_task(session.session_id, "T1", "Task", "analyzer")

        # Change status to simulate paused session
        session.status = SessionStatus.PAUSED

        handler = SessionResumeHandler()
        handler.session_manager = manager

        resumed = handler.resume_session(session.session_id)

        assert resumed is not None
        assert resumed.session_id == session.session_id
        assert resumed.status == SessionStatus.ACTIVE

    def test_resume_session_not_found(self, tmp_path: Path) -> None:
        """Test resuming a non-existent session."""
        manager = SessionManager(checkpoint_dir=tmp_path)
        handler = SessionResumeHandler()
        handler.session_manager = manager

        resumed = handler.resume_session("nonexistent")
        assert resumed is None

    def test_resume_from_user_choice_decline(self) -> None:
        """Test resume_from_user_choice with decline."""
        handler = SessionResumeHandler()
        handler.resumable_sessions = []

        result = handler.resume_from_user_choice("n")
        assert result is None

        result = handler.resume_from_user_choice("no")
        assert result is None

        result = handler.resume_from_user_choice("new")
        assert result is None

        result = handler.resume_from_user_choice("fresh")
        assert result is None

    def test_resume_from_user_choice_select(self, tmp_path: Path) -> None:
        """Test resume_from_user_choice with selection."""
        manager = SessionManager(checkpoint_dir=tmp_path)
        session1 = manager.create_session("Request 1")
        session2 = manager.create_session("Request 2")
        manager.add_task(session1.session_id, "T1", "Task", "analyzer")
        manager.add_task(session2.session_id, "T2", "Task", "coder")
        manager.checkpoint(session1.session_id)
        manager.checkpoint(session2.session_id)

        handler = SessionResumeHandler()
        handler.session_manager = manager
        handler.resumable_sessions = handler.session_manager.get_resumable_sessions()

        # Select first session
        resumed = handler.resume_from_user_choice("1")
        assert resumed is not None
        # The resumed session should be one of the two we created
        assert resumed.session_id in [session1.session_id, session2.session_id]

    def test_resume_from_user_choice_invalid_index(self, tmp_path: Path) -> None:
        """Test resume_from_user_choice with invalid index."""
        manager = SessionManager(checkpoint_dir=tmp_path)
        session = manager.create_session("Request 1")
        manager.add_task(session.session_id, "T1", "Task", "analyzer")

        handler = SessionResumeHandler()
        handler.session_manager = manager
        handler.resumable_sessions = handler.session_manager.get_resumable_sessions()

        result = handler.resume_from_user_choice("999")
        assert result is None

    def test_resume_from_user_choice_invalid_format(self) -> None:
        """Test resume_from_user_choice with invalid format."""
        handler = SessionResumeHandler()
        handler.resumable_sessions = []

        result = handler.resume_from_user_choice("invalid")
        assert result is None

    def test_get_pending_tasks(self, tmp_path: Path) -> None:
        """Test get_pending_tasks."""
        manager = SessionManager(checkpoint_dir=tmp_path)
        session = manager.create_session("Test request")
        manager.add_task(session.session_id, "T1", "Task 1", "analyzer")
        manager.add_task(session.session_id, "T2", "Task 2", "coder")
        manager.add_task(session.session_id, "T3", "Task 3", "tester")

        # Update task statuses
        manager.update_task(session.session_id, "T1", "completed")
        manager.update_task(session.session_id, "T2", "in_progress")
        # T3 remains pending

        handler = SessionResumeHandler()
        pending = handler.get_pending_tasks(session)

        assert len(pending) == 2  # T2 (in_progress) and T3 (pending)
        pending_ids = {t.task_id for t in pending}
        assert "T2" in pending_ids
        assert "T3" in pending_ids
        assert "T1" not in pending_ids

    def test_get_session_summary(self, tmp_path: Path) -> None:
        """Test get_session_summary."""
        manager = SessionManager(checkpoint_dir=tmp_path)
        session = manager.create_session("Fix auth bug")
        manager.add_task(session.session_id, "T1", "Analyze", "analyzer")
        manager.add_task(session.session_id, "T2", "Fix", "coder")
        manager.update_task(session.session_id, "T1", "completed")
        manager.update_task(session.session_id, "T2", "in_progress")

        handler = SessionResumeHandler()
        summary = handler.get_session_summary(session)

        assert session.session_id in summary
        assert "Fix auth bug" in summary
        assert "[X]" in summary  # Completed task
        assert "[->]" in summary  # In-progress task
        assert "analyzer" in summary
        assert "coder" in summary


class TestGetResumeHandler:
    """Tests for get_resume_handler singleton."""

    def test_singleton(self) -> None:
        """Test that get_resume_handler returns singleton instance."""
        handler1 = get_resume_handler()
        handler2 = get_resume_handler()
        assert handler1 is handler2


class TestCheckAndPromptResume:
    """Tests for check_and_prompt_resume function."""

    def test_no_resumable_sessions(self, tmp_path: Path) -> None:
        """Test check_and_prompt_resume when no sessions to resume."""
        manager = SessionManager(checkpoint_dir=tmp_path)

        with patch('mcp_server.session_resume.get_resume_handler') as mock_get:
            handler = SessionResumeHandler()
            handler.session_manager = manager
            mock_get.return_value = handler

            result = check_and_prompt_resume()
            assert result is None

    def test_has_resumable_sessions(self, tmp_path: Path) -> None:
        """Test check_and_prompt_resume with resumable sessions."""
        manager = SessionManager(checkpoint_dir=tmp_path)
        session = manager.create_session("Test request")
        manager.add_task(session.session_id, "T1", "Task", "analyzer")

        with patch('mcp_server.session_resume.get_resume_handler') as mock_get:
            handler = SessionResumeHandler()
            handler.session_manager = manager
            mock_get.return_value = handler

            # Function should detect sessions but return None
            # (actual resume requires user input)
            result = check_and_prompt_resume()
            # Currently returns None - would need UI integration
            assert result is None

    def test_resumable_sessions_logs_info(self, tmp_path: Path, caplog) -> None:
        """Test that resumable sessions trigger info log (branch coverage 307-311)."""
        import logging
        caplog.set_level(logging.INFO, logger="orchestrator-mcp")

        manager = SessionManager(checkpoint_dir=tmp_path)
        session = manager.create_session("Test request")
        # Don't complete the task so session is resumable
        manager.add_task(session.session_id, "T1", "Task", "analyzer")
        # Need to checkpoint to persist to disk so session is resumable
        manager.checkpoint(session.session_id)

        # Directly call check_and_prompt_resume with the handler's manager
        import mcp_server.session_resume as sm
        original_handler = sm._resume_handler
        try:
            # Create handler with our manager
            handler = SessionResumeHandler()
            handler.session_manager = manager
            sm._resume_handler = handler

            # This should trigger the logger.info at lines 307-309
            result = check_and_prompt_resume()

            # Check that logs were captured
            assert result is None  # Returns None without UI integration
            # The logger.info should have been called
            assert len(caplog.records) > 0
            # Verify it's the INFO log about resumable sessions
            info_logs = [r for r in caplog.records if r.levelname == "INFO"]
            assert len(info_logs) > 0
            assert any("resumable sessions" in r.message for r in info_logs)

        finally:
            sm._resume_handler = original_handler
