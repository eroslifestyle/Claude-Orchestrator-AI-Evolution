"""
Session Resume Handler - FIX #8

Provides automatic detection and resumption of incomplete sessions.

FEATURES:
- Auto-detect crashed/incomplete sessions on startup
- User confirmation prompt before resuming
- Resume from last checkpoint with pending tasks
- Continue execution with preserved context
"""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any

from .session_manager import (
    SessionManager,
    SessionState,
    SessionStatus,
    TaskState,
    get_session_manager
)

logger = logging.getLogger("orchestrator-mcp")


class SessionResumeHandler:
    """Handles session resume functionality after crashes.

    This class provides methods to detect incomplete sessions,
    generate user prompts for resumption, and restore session state.

    Attributes:
        session_manager: The session manager instance
        resumable_sessions: List of sessions that can be resumed

    Examples:
        >>> handler = SessionResumeHandler()
        >>> if handler.has_resumable_sessions():
        ...     prompt = handler.get_resume_prompt()
        ...     # Show prompt to user and get choice
        ...     session = handler.resume_from_user_choice("1")
    """

    def __init__(self) -> None:
        """Initialize session resume handler."""
        self.session_manager = get_session_manager()
        self.resumable_sessions: list[dict[str, Any]] = []

    def has_resumable_sessions(self) -> bool:
        """Check if there are any sessions that can be resumed.

        Returns:
            True if there are sessions with pending/in-progress tasks.

        Examples:
            >>> handler = SessionResumeHandler()
            >>> handler.has_resumable_sessions()
            True
        """
        self.resumable_sessions = self.session_manager.get_resumable_sessions()
        return len(self.resumable_sessions) > 0

    def get_resume_prompt(self) -> str:
        """Get prompt to show user about resumable sessions.

        Returns:
            Formatted prompt string listing resumable sessions.

        Examples:
            >>> handler = SessionResumeHandler()
            >>> prompt = handler.get_resume_prompt()
            >>> print(prompt)
            ======================================================================
            INCOMPLETE SESSIONS DETECTED
            ...
        """
        resumable = self.resumable_sessions
        if not resumable:
            return ""

        lines: list[str] = [
            "\n" + "=" * 70,
            "INCOMPLETE SESSIONS DETECTED",
            "=" * 70,
            ""
        ]

        for i, session in enumerate(resumable[:3], 1):  # Show max 3
            lines.append(f"{i}. Session {session['session_id']}")
            lines.append(f"   Request: {session['user_request'][:60]}...")
            lines.append(
                f"   Progress: {session['completed_tasks']}/{session['total_tasks']} "
                f"tasks completed"
            )
            lines.append(f"   Last active: {session['last_checkpoint']}")
            lines.append("")

        lines.extend([
            "Would you like to resume one of these sessions?",
            "Reply with the session number (1, 2, 3) or 'n' to start fresh.",
            ""
        ])

        return "\n".join(lines)

    def get_resumable_sessions(self) -> list[dict[str, Any]]:
        """Get list of resumable sessions with metadata.

        Returns:
            List of session dictionaries with keys: session_id, status,
            user_request, started_at, last_checkpoint, total_tasks,
            pending_tasks, completed_tasks, is_resumable.

        Examples:
            >>> handler = SessionResumeHandler()
            >>> sessions = handler.get_resumable_sessions()
            >>> len(sessions)
            2
        """
        if not self.resumable_sessions:
            self.resumable_sessions = (
                self.session_manager.get_resumable_sessions()
            )
        return self.resumable_sessions

    def resume_session(self, session_id: str) -> SessionState | None:
        """Resume a specific session by ID.

        Args:
            session_id: ID of session to resume

        Returns:
            Resumed SessionState or None if not found

        Examples:
            >>> handler = SessionResumeHandler()
            >>> session = handler.resume_session("abc123")
            >>> session.status
            <SessionStatus.ACTIVE: 'active'>
        """
        session = self.session_manager.restore_session(session_id)
        if not session:
            logger.error(f"Failed to resume session {session_id}")
            return None

        # Update status to active
        session.status = SessionStatus.ACTIVE

        # Log resumption
        pending_tasks = [
            t for t in session.tasks
            if t.status in ['pending', 'in_progress']
        ]
        logger.info(
            f"Resumed session {session_id} with {len(pending_tasks)} pending tasks"
        )

        return session

    def resume_from_user_choice(self, choice: str) -> SessionState | None:
        """Resume session based on user choice.

        Args:
            choice: User input (e.g., "1", "2", "n", "no")

        Returns:
            Resumed SessionState if user chose to resume, None if declined

        Examples:
            >>> handler = SessionResumeHandler()
            >>> session = handler.resume_from_user_choice("1")
            >>> session = handler.resume_from_user_choice("n")
            None
        """
        choice_lower = choice.strip().lower()

        # Handle decline
        if choice_lower in ['n', 'no', 'new', 'fresh']:
            logger.info("User chose to start fresh, not resuming session")
            return None

        # Handle session number selection
        try:
            index = int(choice_lower) - 1
            sessions = self.get_resumable_sessions()

            if 0 <= index < len(sessions):
                session_id = sessions[index]['session_id']
                return self.resume_session(session_id)
            else:
                logger.warning(f"Invalid session choice: {choice}")
                return None
        except ValueError:
            logger.warning(f"Invalid choice format: {choice}")
            return None

    def get_pending_tasks(self, session: SessionState) -> list[TaskState]:
        """Get list of pending/in-progress tasks from session.

        Args:
            session: The session state

        Returns:
            List of TaskState objects with status pending or in_progress

        Examples:
            >>> handler = SessionResumeHandler()
            >>> session = handler.resume_session("abc123")
            >>> pending = handler.get_pending_tasks(session)
            >>> len(pending)
            3
        """
        return [
            t for t in session.tasks
            if t.status in ['pending', 'in_progress']
        ]

    def get_session_summary(self, session: SessionState) -> str:
        """Get a summary of the session for display.

        Args:
            session: The session state

        Returns:
            Formatted string with session details and task list

        Examples:
            >>> summary = handler.get_session_summary(session)
            >>> print(summary)
            Session ID: abc123
            Request: Fix auth bug
            ...
        """
        status_symbols: dict[str, str] = {
            'pending': '[ ]',
            'in_progress': '[->]',
            'completed': '[X]',
            'failed': '[!]'
        }

        lines: list[str] = [
            f"Session ID: {session.session_id}",
            f"Request: {session.user_request}",
            f"Started: {session.started_at}",
            f"Last checkpoint: {session.last_checkpoint}",
            "",
            f"Tasks ({len(session.tasks)} total):",
        ]

        for i, task in enumerate(session.tasks, 1):
            symbol = status_symbols.get(task.status, '[?]')
            lines.append(f"  {i}. {symbol} {task.description} ({task.agent})")

        return "\n".join(lines)


# Singleton instance
_resume_handler: SessionResumeHandler | None = None


def get_resume_handler() -> SessionResumeHandler:
    """Get global resume handler instance.

    Returns:
        The singleton SessionResumeHandler instance

    Examples:
        >>> handler = get_resume_handler()
        >>> isinstance(handler, SessionResumeHandler)
        True
    """
    global _resume_handler
    if _resume_handler is None:
        _resume_handler = SessionResumeHandler()
    return _resume_handler


def check_and_prompt_resume() -> SessionState | None:
    """Check for resumable sessions and prompt user.

    This is the main entry point for session resume.
    Call this at orchestrator startup.

    Returns:
        Resumed SessionState if user chose to resume, None otherwise

    Examples:
        >>> session = check_and_prompt_resume()
        >>> if session:
        ...     # Continue with resumed session
        ...     pass
    """
    handler = get_resume_handler()

    if not handler.has_resumable_sessions():
        return None

    # Get prompt (will be shown by caller)
    # In a real implementation, this would interact with the UI
    logger.info(
        f"Found {len(handler.get_resumable_sessions())} resumable sessions"
    )

    return None  # Caller needs to get user input


# CLI testing
if __name__ == "__main__":
    print("Session Resume Handler - FIX #8")
    print("=" * 70)

    handler = SessionResumeHandler()

    # Check for resumable sessions
    if handler.has_resumable_sessions():
        print(handler.get_resume_prompt())

        # Simulate user input
        choice = input("Your choice: ")

        session = handler.resume_from_user_choice(choice)
        if session:
            print("\n" + "=" * 70)
            print("RESUMED SESSION")
            print("=" * 70)
            print(handler.get_session_summary(session))

            pending = handler.get_pending_tasks(session)
            print(f"\nNext tasks to execute ({len(pending)}):")
            for task in pending[:3]:
                print(f"  - {task.description} ({task.agent})")
        else:
            print("\nStarting fresh session...")
    else:
        print("\nNo resumable sessions found.")
