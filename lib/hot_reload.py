"""Plugin Hot-Reload System for Orchestrator V15.0.4.

Automatic skill reload on file modification with version tracking
and graceful error handling.

Usage:
    from lib.hot_reload import PluginHotReloader

    reloader = PluginHotReloader(skills_dir=Path("skills"))
    reloader.register_callback(on_skill_reload)
    reloader.start()

    # Later...
    reloader.stop()
"""

import hashlib
import logging
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Callable, Dict, List, Optional, Any

from .exceptions import OrchestratorError, wrap_exception


logger = logging.getLogger(__name__)


# =============================================================================
# CUSTOM EXCEPTIONS
# =============================================================================

class HotReloadError(OrchestratorError):
    """Exception for hot-reload related errors."""

    def __init__(
        self,
        message: str,
        skill_name: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        cause: Optional[Exception] = None
    ):
        """Initialize HotReloadError.

        Args:
            message: Human-readable error description
            skill_name: Name of the skill that caused the error
            context: Optional dictionary with additional error context
            cause: The underlying exception that caused this error
        """
        ctx = context or {}
        if skill_name:
            ctx["skill_name"] = skill_name
        super().__init__(message, ctx, cause)


class SkillLoadError(HotReloadError):
    """Exception raised when skill loading fails."""

    pass


class DependencyError(HotReloadError):
    """Exception raised when dependency resolution fails."""

    def __init__(
        self,
        message: str,
        skill_name: Optional[str] = None,
        dependency: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
        cause: Optional[Exception] = None
    ):
        """Initialize DependencyError.

        Args:
            message: Human-readable error description
            skill_name: Name of the skill with dependency issue
            dependency: Name of the problematic dependency
            context: Optional dictionary with additional error context
            cause: The underlying exception that caused this error
        """
        ctx = context or {}
        if dependency:
            ctx["dependency"] = dependency
        super().__init__(message, skill_name, ctx, cause)


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class SkillVersion:
    """Version information for a skill."""
    skill_name: str
    version_hash: str
    last_modified: datetime
    file_path: Path
    load_count: int = 0
    last_load_time: Optional[datetime] = None
    error_count: int = 0
    last_error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "skill_name": self.skill_name,
            "version_hash": self.version_hash,
            "last_modified": self.last_modified.isoformat(),
            "file_path": str(self.file_path),
            "load_count": self.load_count,
            "last_load_time": self.last_load_time.isoformat() if self.last_load_time else None,
            "error_count": self.error_count,
            "last_error": self.last_error
        }


@dataclass
class HotReloadMetrics:
    """Metrics for hot-reload operations."""
    total_reloads: int = 0
    successful_reloads: int = 0
    failed_reloads: int = 0
    rollback_count: int = 0
    watch_time_seconds: float = 0.0
    callbacks_invoked: int = 0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "total_reloads": self.total_reloads,
            "successful_reloads": self.successful_reloads,
            "failed_reloads": self.failed_reloads,
            "rollback_count": self.rollback_count,
            "watch_time_seconds": self.watch_time_seconds,
            "callbacks_invoked": self.callbacks_invoked
        }


# =============================================================================
# PLUGIN HOT RELOADER
# =============================================================================

class PluginHotReloader:
    """Automatic skill reload on file modification.

    Features:
    - Hash-based change detection (SHA256)
    - Thread-safe skill registry
    - Callback system for reload notifications
    - Version tracking with history
    - Graceful error handling with rollback
    - Dependency resolution

    Example:
        reloader = PluginHotReloader(Path("skills"))
        reloader.register_callback(lambda name: print(f"Reloaded: {name}"))
        reloader.start()

        # Check version
        version = reloader.get_skill_version("orchestrator")

        # Manual reload
        success = reloader.reload_skill("orchestrator")

        reloader.stop()
    """

    def __init__(
        self,
        skills_dir: Path,
        watch_interval: float = 1.0,
        max_error_count: int = 3,
        enable_auto_reload: bool = True
    ):
        """Initialize PluginHotReloader.

        Args:
            skills_dir: Directory containing skill modules
            watch_interval: Seconds between file change checks
            max_error_count: Max errors before disabling auto-reload for skill
            enable_auto_reload: Whether to enable automatic reload on change
        """
        self._skills_dir = Path(skills_dir)
        self._watch_interval = watch_interval
        self._max_error_count = max_error_count
        self._enable_auto_reload = enable_auto_reload

        # Ensure skills directory exists
        self._skills_dir.mkdir(parents=True, exist_ok=True)

        # Thread-safe registry
        self._lock = threading.RLock()
        self._versions: Dict[str, SkillVersion] = {}
        self._previous_versions: Dict[str, SkillVersion] = {}
        self._callbacks: List[Callable[[str], None]] = []
        self._dependencies: Dict[str, List[str]] = {}

        # Watcher state
        self._watcher_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._is_watching = False

        # Metrics
        self._metrics = HotReloadMetrics()
        self._start_time: Optional[float] = None

        # Skill loader reference (set externally)
        self._skill_loader: Optional[Any] = None

        logger.info(
            f"PluginHotReloader initialized for {skills_dir} "
            f"(interval={watch_interval}s, auto_reload={enable_auto_reload})"
        )

    def set_skill_loader(self, loader: Any) -> None:
        """Set the skill loader instance for reload operations.

        Args:
            loader: SkillPluginLoader instance
        """
        self._skill_loader = loader

    def start(self) -> None:
        """Start the file watcher thread."""
        if self._is_watching:
            logger.warning("Hot reloader already watching")
            return

        # Initial scan
        self._scan_skills()

        # Start watcher thread
        self._stop_event.clear()
        self._watcher_thread = threading.Thread(
            target=self._watch_loop,
            daemon=True,
            name="HotReloadWatcher"
        )
        self._watcher_thread.start()
        self._is_watching = True
        self._start_time = time.time()

        logger.info(f"Started watching {self._skills_dir}")

    def stop(self) -> None:
        """Stop the file watcher thread."""
        if not self._is_watching:
            return

        self._stop_event.set()
        if self._watcher_thread:
            self._watcher_thread.join(timeout=5.0)
            self._watcher_thread = None

        self._is_watching = False

        # Update metrics
        if self._start_time:
            self._metrics.watch_time_seconds = time.time() - self._start_time

        logger.info("Stopped watching")

    def reload_skill(self, skill_name: str) -> bool:
        """Manually reload a skill.

        Args:
            skill_name: Name of the skill to reload

        Returns:
            True if reload succeeded, False otherwise
        """
        return self._reload_skill_internal(skill_name, is_manual=True)

    def get_skill_version(self, skill_name: str) -> Optional[SkillVersion]:
        """Get the current version info of a skill.

        Args:
            skill_name: Name of the skill

        Returns:
            SkillVersion object or None if not tracked
        """
        with self._lock:
            return self._versions.get(skill_name)

    def get_skill_info(self, skill_name: str) -> Optional[Dict[str, Any]]:
        """Get full version info for a skill.

        Args:
            skill_name: Name of the skill

        Returns:
            Version info dict or None
        """
        with self._lock:
            version = self._versions.get(skill_name)
            return version.to_dict() if version else None

    def list_tracked_skills(self) -> List[str]:
        """List all tracked skills.

        Returns:
            List of skill names
        """
        with self._lock:
            return list(self._versions.keys())

    def discover_skills(self) -> List[str]:
        """Discover available skills in skills directory.

        Returns:
            List of skill names found
        """
        discovered = []

        if not self._skills_dir.exists():
            return discovered

        for skill_dir in self._skills_dir.iterdir():
            if skill_dir.is_dir() and not skill_dir.name.startswith("."):
                skill_file = skill_dir / "SKILL.md"
                if skill_file.exists():
                    discovered.append(skill_dir.name)

        return discovered

    def track_skill(self, skill_name: str) -> Optional[SkillVersion]:
        """Track a skill for hot-reload.

        Args:
            skill_name: Name of the skill to track

        Returns:
            SkillVersion if tracked successfully, None otherwise
        """
        skill_dir = self._skills_dir / skill_name
        if not skill_dir.exists():
            return None

        skill_file = skill_dir / "SKILL.md"
        if not skill_file.exists():
            return None

        self._track_skill(skill_name, skill_file)
        return self._versions.get(skill_name)

    def set_dependencies(self, skill_name: str, dependencies: List[str]) -> None:
        """Set dependencies for a skill.

        Args:
            skill_name: Skill that has dependencies
            dependencies: List of skill names it depends on
        """
        with self._lock:
            self._dependencies[skill_name] = list(dependencies)

    def register_callback(self, callback: Callable[[str], None]) -> None:
        """Register a callback for reload notifications.

        Args:
            callback: Function to call with skill name on reload
        """
        with self._lock:
            self._callbacks.append(callback)

    def unregister_callback(self, callback: Callable[[str], None]) -> None:
        """Unregister a callback.

        Args:
            callback: Callback to remove
        """
        with self._lock:
            if callback in self._callbacks:
                self._callbacks.remove(callback)

    def register_dependency(self, skill_name: str, depends_on: str) -> None:
        """Register a skill dependency.

        Args:
            skill_name: Skill that has the dependency
            depends_on: Skill that is depended upon
        """
        with self._lock:
            if skill_name not in self._dependencies:
                self._dependencies[skill_name] = []
            if depends_on not in self._dependencies[skill_name]:
                self._dependencies[skill_name].append(depends_on)

    def get_dependencies(self, skill_name: str) -> List[str]:
        """Get dependencies for a skill.

        Args:
            skill_name: Skill to check

        Returns:
            List of dependency skill names
        """
        with self._lock:
            return self._dependencies.get(skill_name, []).copy()

    def get_dependents(self, skill_name: str) -> List[str]:
        """Get skills that depend on a given skill.

        Args:
            skill_name: Skill to check dependents for

        Returns:
            List of dependent skill names
        """
        with self._lock:
            dependents = []
            for skill, deps in self._dependencies.items():
                if skill_name in deps:
                    dependents.append(skill)
            return dependents

    def get_metrics(self) -> Dict[str, Any]:
        """Get hot-reload metrics.

        Returns:
            Metrics dictionary
        """
        with self._lock:
            metrics = self._metrics.to_dict()
            metrics["tracked_skills"] = len(self._versions)
            metrics["is_watching"] = self._is_watching
            return metrics

    def force_rescan(self) -> int:
        """Force a full rescan of skills directory.

        Returns:
            Number of skills detected
        """
        return self._scan_skills()

    # ========================================================================
    # Internal Methods
    # ========================================================================

    def _scan_skills(self) -> int:
        """Scan skills directory for all skill files.

        Returns:
            Number of skills found
        """
        count = 0

        if not self._skills_dir.exists():
            logger.warning(f"Skills directory not found: {self._skills_dir}")
            return 0

        for skill_dir in self._skills_dir.iterdir():
            if skill_dir.is_dir() and not skill_dir.name.startswith("."):
                skill_file = skill_dir / "SKILL.md"
                if skill_file.exists():
                    self._track_skill(skill_dir.name, skill_file)
                    count += 1

        logger.info(f"Scanned {count} skills in {self._skills_dir}")
        return count

    def _track_skill(self, skill_name: str, skill_file: Path) -> None:
        """Track a skill file for changes.

        Args:
            skill_name: Name of the skill
            skill_file: Path to SKILL.md file
        """
        version_hash = self._compute_hash(skill_file)
        last_modified = datetime.fromtimestamp(skill_file.stat().st_mtime)

        with self._lock:
            existing = self._versions.get(skill_name)

            if existing:
                # Update existing entry (increment load count on re-track)
                existing.version_hash = version_hash
                existing.last_modified = last_modified
                existing.load_count += 1
                existing.last_load_time = datetime.now()
            else:
                # Create new entry
                self._versions[skill_name] = SkillVersion(
                    skill_name=skill_name,
                    version_hash=version_hash,
                    last_modified=last_modified,
                    file_path=skill_file,
                    load_count=1,
                    last_load_time=datetime.now(),
                    error_count=0,
                    last_error=None
                )

    def _compute_hash(self, file_path: Path) -> Optional[str]:
        """Compute SHA256 hash of a file.

        Args:
            file_path: Path to file

        Returns:
            Hex digest of file hash (64 chars), or None if file doesn't exist
        """
        if not file_path.exists():
            return None

        hasher = hashlib.sha256()

        try:
            with open(file_path, "rb") as f:
                for chunk in iter(lambda: f.read(8192), b""):
                    hasher.update(chunk)
            return hasher.hexdigest()  # Full SHA256 hex digest (64 chars)
        except (IOError, OSError) as e:
            logger.error(f"Failed to hash {file_path}: {e}")
            return None

    def _watch_loop(self) -> None:
        """Main watcher loop running in background thread."""
        logger.debug("Watch loop started")

        while not self._stop_event.is_set():
            try:
                self._check_for_changes()
            except Exception as e:
                logger.exception(f"Error in watch loop: {e}")

            self._stop_event.wait(self._watch_interval)

        logger.debug("Watch loop stopped")

    def _check_for_changes(self) -> None:
        """Check all tracked skills for file changes."""
        skills_to_reload: List[str] = []

        with self._lock:
            skills_copy = dict(self._versions)

        for skill_name, version in skills_copy.items():
            if not version.file_path.exists():
                continue

            current_hash = self._compute_hash(version.file_path)

            if current_hash and current_hash != version.version_hash:
                # Check error count before auto-reload
                if version.error_count < self._max_error_count:
                    skills_to_reload.append(skill_name)
                    logger.info(
                        f"Detected change in {skill_name} "
                        f"({version.version_hash[:8]} -> {current_hash[:8]})"
                    )

        # Reload changed skills
        if self._enable_auto_reload:
            for skill_name in skills_to_reload:
                self._reload_skill_internal(skill_name, is_manual=False)

    def _reload_skill_internal(self, skill_name: str, is_manual: bool) -> bool:
        """Internal reload implementation.

        Args:
            skill_name: Name of skill to reload
            is_manual: Whether this is a manual reload

        Returns:
            True if successful
        """
        with self._lock:
            version = self._versions.get(skill_name)
            if not version:
                logger.warning(f"Skill not tracked: {skill_name}")
                return False

            # Backup current version for rollback
            self._previous_versions[skill_name] = SkillVersion(
                skill_name=version.skill_name,
                version_hash=version.version_hash,
                last_modified=version.last_modified,
                file_path=version.file_path,
                load_count=version.load_count,
                last_load_time=version.last_load_time,
                error_count=version.error_count,
                last_error=version.last_error
            )

        self._metrics.total_reloads += 1

        try:
            # Compute new hash
            new_hash = self._compute_hash(version.file_path)
            if not new_hash:
                raise SkillLoadError(
                    f"Failed to compute hash for {skill_name}",
                    skill_name=skill_name
                )

            # Reload via skill loader if available
            if self._skill_loader:
                instance = self._skill_loader.reload_skill(skill_name)
                if instance is None:
                    raise SkillLoadError(
                        f"Skill loader returned None for {skill_name}",
                        skill_name=skill_name
                    )

            # Update version info
            with self._lock:
                version.version_hash = new_hash
                version.last_modified = datetime.fromtimestamp(
                    version.file_path.stat().st_mtime
                )
                version.load_count += 1
                version.last_load_time = datetime.now()
                version.error_count = 0  # Reset on success
                version.last_error = None

            self._metrics.successful_reloads += 1

            # Check for dependent skills that may need reload
            dependents = self.get_dependents(skill_name)
            for dep in dependents:
                logger.info(f"Scheduling reload of dependent: {dep}")
                # Don't auto-reload dependents to avoid cascades

            # Invoke callbacks
            self._invoke_callbacks(skill_name)

            logger.info(
                f"Successfully reloaded {skill_name} "
                f"(load #{version.load_count})"
            )
            return True

        except Exception as e:
            self._handle_reload_error(skill_name, e)
            return False

    def _handle_reload_error(self, skill_name: str, error: Exception) -> None:
        """Handle reload error with potential rollback.

        Args:
            skill_name: Name of skill that failed
            error: The exception that occurred
        """
        self._metrics.failed_reloads += 1

        with self._lock:
            version = self._versions.get(skill_name)
            if version:
                version.error_count += 1
                version.last_error = str(error)

                # Rollback if too many errors
                if version.error_count >= self._max_error_count:
                    self._metrics.rollback_count += 1
                    prev = self._previous_versions.get(skill_name)
                    if prev:
                        version.version_hash = prev.version_hash
                        version.error_count = prev.error_count
                        logger.warning(
                            f"Rolled back {skill_name} due to repeated errors"
                        )

        logger.error(
            f"Failed to reload {skill_name}: {error} "
            f"(error #{version.error_count if version else '?'}"
        )

    def _invoke_callbacks(self, skill_name: str) -> None:
        """Invoke all registered callbacks.

        Args:
            skill_name: Name of reloaded skill
        """
        with self._lock:
            callbacks = self._callbacks.copy()

        for callback in callbacks:
            try:
                callback(skill_name)
                self._metrics.callbacks_invoked += 1
            except Exception as e:
                logger.warning(
                    f"Callback failed for {skill_name}: {e}"
                )

    def __enter__(self) -> 'PluginHotReloader':
        """Context manager entry."""
        self.start()
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        """Context manager exit."""
        self.stop()


# =============================================================================
# HEALTH CHECK
# =============================================================================

def health_check(reloader: Optional[PluginHotReloader] = None) -> Dict[str, Any]:
    """Health check for hot-reload system.

    Args:
        reloader: Optional reloader instance to check

    Returns:
        Health status dictionary
    """
    if reloader is None:
        return {
            "status": "not_initialized",
            "healthy": False
        }

    metrics = reloader.get_metrics()

    # Consider unhealthy if too many failed reloads
    total = metrics["total_reloads"]
    failed = metrics["failed_reloads"]
    healthy = True

    if total > 0 and (failed / total) > 0.5:
        healthy = False

    return {
        "status": "watching" if metrics["is_watching"] else "stopped",
        "healthy": healthy,
        "tracked_skills": metrics["tracked_skills"],
        "total_reloads": total,
        "failed_reloads": failed,
        "is_watching": metrics["is_watching"],
        "watch_time_seconds": metrics["watch_time_seconds"]
    }


# =============================================================================
# PUBLIC API
# =============================================================================

__all__ = [
    "PluginHotReloader",
    "HotReloadError",
    "SkillLoadError",
    "DependencyError",
    "SkillVersion",
    "HotReloadMetrics",
    "health_check"
]
