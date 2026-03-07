"""
Session Persistence with Checkpoint - FIX #3

Enable session state saving and restoration after crash.
Auto-checkpoint every N tasks or before critical operations.

FEATURES:
- Save session state to disk
- Auto-checkpoint every 3 tasks
- Restore session after restart
- Clean old checkpoints (>7 days)
"""

import json
import logging
import threading
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict
from enum import Enum

logger = logging.getLogger("orchestrator-mcp")


class SessionStatus(Enum):
    """Session status."""
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    CRASHED = "crashed"


@dataclass
class TaskState:
    """State of a single task."""
    task_id: str
    description: str
    agent: str
    status: str  # pending, in_progress, completed, failed
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    result: Optional[str] = None
    error: Optional[str] = None


@dataclass
class SessionState:
    """Complete session state for persistence."""
    session_id: str
    user_request: str
    status: SessionStatus
    started_at: str
    tasks: List[TaskState]
    context_summary: str
    last_checkpoint: str
    metadata: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dict for JSON serialization."""
        data = asdict(self)
        data['status'] = self.status.value
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'SessionState':
        """Create from dict."""
        # Handle enum conversion
        if isinstance(data.get('status'), str):
            data['status'] = SessionStatus(data['status'])
        # Handle TaskState objects
        if 'tasks' in data:
            data['tasks'] = [TaskState(**t) if isinstance(t, dict) else t for t in data['tasks']]
        return cls(**data)


class SessionManager:
    """
    Manages session persistence and checkpointing.

    Usage:
        manager = SessionManager()
        session = manager.create_session("user request here")

        # Add tasks
        manager.add_task(session.session_id, "task1", "analyzer")
        manager.add_task(session.session_id, "task2", "coder")

        # Update task status
        manager.update_task(session.session_id, "task1", "in_progress")

        # Auto-checkpoint every 3 tasks
        manager.checkpoint_if_needed(session.session_id)

        # Restore after crash
        restored = manager.restore_session(session.session_id)
    """

    # Configuration
    CHECKPOINT_INTERVAL = 3  # Checkpoint every N task updates
    CHECKPOINT_DIR = Path(".claude/sessions")
    MAX_CHECKPOINT_AGE_DAYS = 7

    def __init__(self, checkpoint_dir: Optional[Path] = None):
        """Initialize session manager - thread-safe."""
        self.checkpoint_dir = checkpoint_dir or self.CHECKPOINT_DIR
        self.checkpoint_dir.mkdir(parents=True, exist_ok=True)

        self._lock = threading.RLock()  # CRITICAL FIX: Thread safety
        self._active_sessions: Dict[str, SessionState] = {}
        self._checkpoint_counters: Dict[str, int] = {}

        logger.info(f"SessionManager initialized (thread-safe, checkpoint_dir={self.checkpoint_dir})")

    def create_session(self, user_request: str, metadata: Optional[Dict] = None) -> SessionState:
        """Create a new session - thread-safe."""
        with self._lock:
            session_id = str(uuid.uuid4())[:8]

            session = SessionState(
                session_id=session_id,
                user_request=user_request,
                status=SessionStatus.ACTIVE,
                started_at=datetime.now().isoformat(),
                tasks=[],
                context_summary="",
                last_checkpoint=datetime.now().isoformat(),
                metadata=metadata or {}
            )

            self._active_sessions[session_id] = session
            self._checkpoint_counters[session_id] = 0

            # Initial checkpoint (done inside lock for consistency)
            self._save_checkpoint(session)

            logger.info(f"Created session {session_id}")
            return session

    def get_session(self, session_id: str) -> Optional[SessionState]:
        """Get active session by ID - thread-safe."""
        with self._lock:
            return self._active_sessions.get(session_id)

    def add_task(self, session_id: str, task_id: str, description: str, agent: str) -> TaskState:
        """Add a task to session - thread-safe."""
        with self._lock:
            session = self._active_sessions.get(session_id)
            if not session:
                raise ValueError(f"Session {session_id} not found")

            task = TaskState(
                task_id=task_id,
                description=description,
                agent=agent,
                status="pending"
            )

            session.tasks.append(task)
            logger.debug(f"Added task {task_id} to session {session_id}")
            return task

    def update_task(self, session_id: str, task_id: str, status: str, **kwargs) -> None:
        """Update task status and optionally checkpoint - thread-safe."""
        with self._lock:
            session = self._active_sessions.get(session_id)
            if not session:
                raise ValueError(f"Session {session_id} not found")

            for task in session.tasks:
                if task.task_id == task_id:
                    task.status = status
                    for key, value in kwargs.items():
                        setattr(task, key, value)

                    if status == "in_progress" and not task.started_at:
                        task.started_at = datetime.now().isoformat()
                    elif status in ["completed", "failed"]:
                        task.completed_at = datetime.now().isoformat()

                    # Increment checkpoint counter
                    self._checkpoint_counters[session_id] = self._checkpoint_counters.get(session_id, 0) + 1

                    # Auto-checkpoint if interval reached
                    if self._checkpoint_counters[session_id] >= self.CHECKPOINT_INTERVAL:
                        # Call checkpoint directly with lock already held
                        session.last_checkpoint = datetime.now().isoformat()
                        self._save_checkpoint(session)
                        logger.info(f"Checkpoint saved for session {session_id}")
                        self._checkpoint_counters[session_id] = 0

                    return

            logger.warning(f"Task {task_id} not found in session {session_id}")

    def checkpoint(self, session_id: str) -> None:
        """Force checkpoint of session state - thread-safe."""
        with self._lock:
            session = self._active_sessions.get(session_id)
            if not session:
                logger.warning(f"Cannot checkpoint: session {session_id} not found")
                return

            session.last_checkpoint = datetime.now().isoformat()
            self._save_checkpoint(session)
            logger.info(f"Checkpoint saved for session {session_id}")

    def checkpoint_if_needed(self, session_id: str) -> bool:
        """Checkpoint if counter reached interval - thread-safe."""
        with self._lock:
            if self._checkpoint_counters.get(session_id, 0) >= self.CHECKPOINT_INTERVAL:
                session = self._active_sessions.get(session_id)
                if session:
                    session.last_checkpoint = datetime.now().isoformat()
                    self._save_checkpoint(session)
                    logger.info(f"Checkpoint saved for session {session_id}")
                self._checkpoint_counters[session_id] = 0
                return True
            return False

    def _save_checkpoint(self, session: SessionState) -> None:
        """Save session to disk."""
        checkpoint_file = self.checkpoint_dir / f"session_{session.session_id}.json"

        try:
            with open(checkpoint_file, 'w', encoding='utf-8') as f:
                json.dump(session.to_dict(), f, indent=2, ensure_ascii=False)
            logger.debug(f"Saved checkpoint: {checkpoint_file}")
        except Exception as e:
            logger.error(f"Failed to save checkpoint: {e}")

    def restore_session(self, session_id: str) -> Optional[SessionState]:
        """Restore session from checkpoint - thread-safe."""
        checkpoint_file = self.checkpoint_dir / f"session_{session_id}.json"

        if not checkpoint_file.exists():
            logger.warning(f"Checkpoint not found: {checkpoint_file}")
            return None

        try:
            with open(checkpoint_file, 'r', encoding='utf-8') as f:
                data = json.load(f)

            session = SessionState.from_dict(data)

            # Lock only for the in-memory update
            with self._lock:
                self._active_sessions[session_id] = session

            logger.info(f"Restored session {session_id} ({len(session.tasks)} tasks)")
            return session

        except Exception as e:
            logger.error(f"Failed to restore session: {e}")
            return None

    def list_sessions(self) -> List[str]:
        """List all available session IDs."""
        checkpoint_files = list(self.checkpoint_dir.glob("session_*.json"))
        return [
            f.stem.replace("session_", "")
            for f in checkpoint_files
        ]

    def get_sessions_with_status(self) -> List[Dict[str, Any]]:
        """Get all sessions with their status and summary."""
        sessions = []
        for session_id in self.list_sessions():
            checkpoint_file = self.checkpoint_dir / f"session_{session_id}.json"
            try:
                with open(checkpoint_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                # Count pending/in_progress tasks
                tasks = data.get('tasks', [])
                pending_count = sum(1 for t in tasks if t.get('status') in ['pending', 'in_progress'])
                completed_count = sum(1 for t in tasks if t.get('status') == 'completed')

                sessions.append({
                    'session_id': session_id,
                    'status': data.get('status'),
                    'user_request': data.get('user_request', ''),
                    'started_at': data.get('started_at'),
                    'last_checkpoint': data.get('last_checkpoint'),
                    'total_tasks': len(tasks),
                    'pending_tasks': pending_count,
                    'completed_tasks': completed_count,
                    'is_resumable': pending_count > 0
                })
            except Exception as e:
                logger.warning(f"Failed to read session {session_id}: {e}")

        # Sort by last_checkpoint, most recent first
        sessions.sort(key=lambda s: s.get('last_checkpoint', ''), reverse=True)
        return sessions

    def get_resumable_sessions(self) -> List[Dict[str, Any]]:
        """Get sessions that can be resumed (have pending/in_progress tasks)."""
        all_sessions = self.get_sessions_with_status()
        return [s for s in all_sessions if s['is_resumable']]

    def get_resume_prompt(self) -> Optional[str]:
        """Generate a prompt for user about resumable sessions."""
        resumable = self.get_resumable_sessions()
        if not resumable:
            return None

        lines = [
            "\n" + "=" * 70,
            "INCOMPLETE SESSIONS DETECTED",
            "=" * 70,
            ""
        ]

        for i, session in enumerate(resumable[:3], 1):  # Show max 3
            lines.append(f"{i}. Session {session['session_id']}")
            lines.append(f"   Request: {session['user_request'][:60]}...")
            lines.append(f"   Progress: {session['completed_tasks']}/{session['total_tasks']} tasks completed")
            lines.append(f"   Last active: {session['last_checkpoint']}")
            lines.append("")

        lines.extend([
            "Would you like to resume one of these sessions?",
            "Reply with the session number (1, 2, 3) or 'n' to start fresh.",
            ""
        ])

        return "\n".join(lines)

    def cleanup_old_checkpoints(self) -> int:
        """Remove checkpoints older than MAX_CHECKPOINT_AGE_DAYS."""
        cutoff = datetime.now() - timedelta(days=self.MAX_CHECKPOINT_AGE_DAYS)
        removed = 0

        for checkpoint_file in self.checkpoint_dir.glob("session_*.json"):
            try:
                mtime = datetime.fromtimestamp(checkpoint_file.stat().st_mtime)
                if mtime < cutoff:
                    checkpoint_file.unlink()
                    removed += 1
                    logger.debug(f"Removed old checkpoint: {checkpoint_file}")
            except Exception as e:
                logger.warning(f"Failed to remove {checkpoint_file}: {e}")

        if removed > 0:
            logger.info(f"Cleaned up {removed} old checkpoints")

        return removed

    def close_session(self, session_id: str, status: SessionStatus = SessionStatus.COMPLETED) -> None:
        """Close session and mark as completed/failed - thread-safe."""
        with self._lock:
            session = self._active_sessions.get(session_id)
            if not session:
                return

            session.status = status
            session.last_checkpoint = datetime.now().isoformat()
            self._save_checkpoint(session)

            # Remove from active sessions
            self._active_sessions.pop(session_id, None)
            self._checkpoint_counters.pop(session_id, None)

            logger.info(f"Closed session {session_id} (status={status.value})")


# Singleton instance
_session_manager: Optional[SessionManager] = None


def get_session_manager() -> SessionManager:
    """Get global session manager instance."""
    global _session_manager
    if _session_manager is None:
        _session_manager = SessionManager()
    return _session_manager


# CLI testing
if __name__ == "__main__":
    print("Session Persistence - FIX #3")
    print("=" * 60)

    # Create session manager
    manager = SessionManager(checkpoint_dir=Path(".claude/sessions"))

    # Create session
    session = manager.create_session("Fix auth bug and update database")

    # Add tasks
    manager.add_task(session.session_id, "T1", "Analyze auth code", "analyzer")
    manager.add_task(session.session_id, "T2", "Fix login bug", "coder")
    manager.add_task(session.session_id, "T3", "Update database schema", "database-expert")
    manager.add_task(session.session_id, "T4", "Add tests", "tester")
    manager.add_task(session.session_id, "T5", "Document changes", "documenter")

    # Update tasks
    manager.update_task(session.session_id, "T1", "in_progress")
    manager.update_task(session.session_id, "T1", "completed")
    manager.update_task(session.session_id, "T2", "in_progress")

    # Checkpoint
    manager.checkpoint(session.session_id)

    print(f"\nSession ID: {session.session_id}")
    print(f"Status: {session.status.value}")
    print(f"Tasks: {len(session.tasks)}")
    for task in session.tasks:
        print(f"  [{task.status}] {task.description}")

    # Simulate crash and restore
    print("\n--- Simulating crash ---")
    del manager

    # Restore
    manager2 = SessionManager(checkpoint_dir=Path(".claude/sessions"))
    restored = manager2.restore_session(session.session_id)

    if restored:
        print(f"\nRestored session: {restored.session_id}")
        print(f"Tasks: {len(restored.tasks)}")
        for task in restored.tasks:
            print(f"  [{task.status}] {task.description}")
