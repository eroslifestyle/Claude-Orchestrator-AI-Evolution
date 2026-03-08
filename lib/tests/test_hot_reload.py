"""Tests for Plugin Hot-Reload System.

Tests cover:
- Hash-based change detection
- Thread-safe skill registry
- Callback system
- Version tracking
- Graceful error handling
- Dependency resolution
"""

import hashlib
import pytest
import tempfile
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, Any
from unittest.mock import Mock, patch, MagicMock

from lib.hot_reload import (
    PluginHotReloader,
    HotReloadError,
    SkillLoadError,
    DependencyError,
    SkillVersion,
    HotReloadMetrics,
    health_check
)


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture
def temp_skills_dir(tmp_path: Path) -> Path:
    """Create a temporary skills directory with test skills."""
    skills_dir = tmp_path / "skills"
    skills_dir.mkdir(parents=True, exist_ok=True)

    # Create test skill 1
    skill1_dir = skills_dir / "test-skill-1"
    skill1_dir.mkdir()
    skill1_md = skill1_dir / "SKILL.md"
    skill1_md.write_text("""# Test Skill 1

A test skill for unit testing.

## ALGORITHM
1. Step one
2. Step two
""")

    # Create test skill 2
    skill2_dir = skills_dir / "test-skill-2"
    skill2_dir.mkdir()
    skill2_md = skill2_dir / "SKILL.md"
    skill2_md.write_text("""# Test Skill 2

Another test skill.

## ALGORITHM
1. Check input
2. Process
""")

    return skills_dir


@pytest.fixture
def reloader(temp_skills_dir: Path) -> PluginHotReloader:
    """Create a PluginHotReloader instance."""
    return PluginHotReloader(
        skills_dir=temp_skills_dir,
        watch_interval=0.5
    )


# =============================================================================
# BASIC FUNCTIONALITY TESTS
# =============================================================================

class TestPluginHotReloaderInit:
    """Tests for PluginHotReloader initialization."""

    def test_init_creates_reloader(self, temp_skills_dir: Path) -> None:
        """Test that reloader initializes correctly."""
        reloader = PluginHotReloader(skills_dir=temp_skills_dir)

        assert reloader._skills_dir == temp_skills_dir
        assert reloader._watch_interval == 1.0
        assert reloader._is_watching is False
        assert reloader._versions == {}

    def test_init_with_custom_interval(self, temp_skills_dir: Path) -> None:
        """Test initialization with custom watch interval."""
        reloader = PluginHotReloader(
            skills_dir=temp_skills_dir,
            watch_interval=2.5
        )

        assert reloader._watch_interval == 2.5

    def test_init_ensures_skills_dir_exists(self, tmp_path: Path) -> None:
        """Test that skills directory is created if it doesn't exist."""
        skills_dir = tmp_path / "new-skills"
        assert not skills_dir.exists()

        reloader = PluginHotReloader(skills_dir=skills_dir)

        assert skills_dir.exists()


class TestSkillDiscovery:
    """Tests for skill discovery."""

    def test_discover_skills_finds_all_skills(
        self, reloader: PluginHotReloader
    ) -> None:
        """Test that all skills are discovered."""
        skills = reloader.discover_skills()

        assert len(skills) == 2
        assert "test-skill-1" in skills
        assert "test-skill-2" in skills

    def test_discover_skills_empty_directory(self, tmp_path: Path) -> None:
        """Test discovery in empty directory."""
        empty_dir = tmp_path / "empty"
        empty_dir.mkdir()

        reloader = PluginHotReloader(skills_dir=empty_dir)
        skills = reloader.discover_skills()

        assert skills == []

    def test_discover_skills_ignores_hidden_dirs(
        self, temp_skills_dir: Path
    ) -> None:
        """Test that hidden directories are ignored."""
        hidden_dir = temp_skills_dir / ".hidden-skill"
        hidden_dir.mkdir()
        (hidden_dir / "SKILL.md").write_text("# Hidden")

        reloader = PluginHotReloader(skills_dir=temp_skills_dir)
        skills = reloader.discover_skills()

        assert ".hidden-skill" not in skills


class TestHashComputation:
    """Tests for hash-based change detection."""

    def test_compute_hash_returns_consistent_hash(
        self, reloader: PluginHotReloader, temp_skills_dir: Path
    ) -> None:
        """Test that same file produces same hash."""
        skill_file = temp_skills_dir / "test-skill-1" / "SKILL.md"

        hash1 = reloader._compute_hash(skill_file)
        hash2 = reloader._compute_hash(skill_file)

        assert hash1 == hash2
        assert len(hash1) == 64  # SHA256 hex digest length

    def test_compute_hash_detects_changes(
        self, reloader: PluginHotReloader, temp_skills_dir: Path
    ) -> None:
        """Test that different content produces different hash."""
        skill_file = temp_skills_dir / "test-skill-1" / "SKILL.md"

        hash1 = reloader._compute_hash(skill_file)

        # Modify file
        skill_file.write_text(skill_file.read_text() + "\n\nNew content")

        hash2 = reloader._compute_hash(skill_file)

        assert hash1 != hash2

    def test_compute_hash_returns_none_for_missing_file(
        self, reloader: PluginHotReloader
    ) -> None:
        """Test that missing file returns None."""
        missing_file = reloader._skills_dir / "missing" / "SKILL.md"

        result = reloader._compute_hash(missing_file)

        assert result is None


class TestVersionTracking:
    """Tests for version tracking."""

    def test_get_skill_version_returns_none_if_not_tracked(
        self, reloader: PluginHotReloader
    ) -> None:
        """Test version returns None for untracked skill."""
        version = reloader.get_skill_version("unknown-skill")

        assert version is None

    def test_get_skill_version_after_tracking(
        self, reloader: PluginHotReloader
    ) -> None:
        """Test version is available after tracking."""
        reloader.track_skill("test-skill-1")

        version = reloader.get_skill_version("test-skill-1")

        assert version is not None
        assert version.skill_name == "test-skill-1"
        assert len(version.version_hash) == 64

    def test_track_skill_updates_load_count(
        self, reloader: PluginHotReloader
    ) -> None:
        """Test that tracking increments load count."""
        reloader.track_skill("test-skill-1")
        version1 = reloader.get_skill_version("test-skill-1")
        # Store load_count before second track (version1 is a reference)
        load_count1 = version1.load_count

        reloader.track_skill("test-skill-1")
        version2 = reloader.get_skill_version("test-skill-1")

        assert version2.load_count == load_count1 + 1


class TestCallbackSystem:
    """Tests for callback system."""

    def test_register_callback_stores_callback(
        self, reloader: PluginHotReloader
    ) -> None:
        """Test that callbacks are registered."""
        callback = Mock()

        reloader.register_callback(callback)

        assert callback in reloader._callbacks

    def test_callbacks_invoked_on_reload(
        self, reloader: PluginHotReloader, temp_skills_dir: Path
    ) -> None:
        """Test that callbacks are called when skill is reloaded."""
        callback = Mock()
        reloader.register_callback(callback)

        # Track skill first
        reloader.track_skill("test-skill-1")

        # Modify file to trigger change
        skill_file = temp_skills_dir / "test-skill-1" / "SKILL.md"
        original_hash = reloader.get_skill_version("test-skill-1").version_hash

        skill_file.write_text(skill_file.read_text() + "\n\n# New Section")

        # Trigger reload check
        reloader._check_for_changes()

        # Callback should have been invoked
        assert callback.called

    def test_multiple_callbacks_all_invoked(
        self, reloader: PluginHotReloader
    ) -> None:
        """Test that all registered callbacks are invoked."""
        callback1 = Mock()
        callback2 = Mock()
        callback3 = Mock()

        reloader.register_callback(callback1)
        reloader.register_callback(callback2)
        reloader.register_callback(callback3)

        reloader.track_skill("test-skill-1")

        # Trigger callback invocation
        reloader._invoke_callbacks("test-skill-1")

        assert callback1.called
        assert callback2.called
        assert callback3.called


class TestWatchThread:
    """Tests for watch thread functionality."""

    def test_start_begins_watching(self, reloader: PluginHotReloader) -> None:
        """Test that start() begins watching."""
        assert reloader._is_watching is False

        reloader.start()

        assert reloader._is_watching is True
        assert reloader._watcher_thread is not None
        assert reloader._watcher_thread.is_alive()

        reloader.stop()

    def test_stop_ends_watching(self, reloader: PluginHotReloader) -> None:
        """Test that stop() ends watching."""
        reloader.start()
        assert reloader._is_watching is True

        reloader.stop()

        assert reloader._is_watching is False
        # Give thread time to terminate
        time.sleep(0.1)
        # Thread reference may be None after stop, or thread may have terminated
        if reloader._watcher_thread is not None:
            assert not reloader._watcher_thread.is_alive()

    def test_context_manager_starts_and_stops(
        self, reloader: PluginHotReloader
    ) -> None:
        """Test context manager pattern."""
        with reloader:
            assert reloader._is_watching is True

        assert reloader._is_watching is False

    def test_watch_thread_detects_new_skills(
        self, reloader: PluginHotReloader, temp_skills_dir: Path
    ) -> None:
        """Test that watch thread detects new skills."""
        reloader.track_skill("test-skill-1")
        reloader.start()

        # Create new skill after watching started
        new_skill_dir = temp_skills_dir / "new-skill"
        new_skill_dir.mkdir()
        (new_skill_dir / "SKILL.md").write_text("# New Skill\n\nNew skill content.")

        # Wait for detection
        time.sleep(reloader._watch_interval * 3)

        # Check if new skill was discovered
        skills = reloader.discover_skills()
        assert "new-skill" in skills

        reloader.stop()


class TestErrorHandling:
    """Tests for error handling."""

    def test_reload_failure_increments_error_count(
        self, reloader: PluginHotReloader
    ) -> None:
        """Test that failed reloads increment error count."""
        reloader.track_skill("test-skill-1")

        # Simulate reload failure
        reloader._handle_reload_error(
            "test-skill-1",
            Exception("Test error")
        )

        version = reloader.get_skill_version("test-skill-1")
        assert version.error_count == 1
        assert "Test error" in version.last_error

    def test_rollback_after_max_errors(
        self, reloader: PluginHotReloader
    ) -> None:
        """Test that skill is rolled back after max errors."""
        reloader._max_error_count = 3
        reloader.track_skill("test-skill-1")
        original_hash = reloader.get_skill_version("test-skill-1").version_hash

        # Simulate multiple failures
        for i in range(4):
            reloader._handle_reload_error(
                "test-skill-1",
                Exception(f"Error {i}")
            )

        version = reloader.get_skill_version("test-skill-1")
        # Should have rolled back
        assert reloader._metrics.rollback_count > 0

    def test_callback_exception_does_not_crash(
        self, reloader: PluginHotReloader
    ) -> None:
        """Test that callback exceptions are handled gracefully."""
        def bad_callback(skill_name: str) -> None:
            raise ValueError("Bad callback")

        reloader.register_callback(bad_callback)
        reloader.track_skill("test-skill-1")

        # Should not raise
        reloader._invoke_callbacks("test-skill-1")

        assert reloader._metrics.callbacks_invoked == 0


class TestDependencyResolution:
    """Tests for dependency resolution."""

    def test_get_dependencies_empty_if_not_tracked(
        self, reloader: PluginHotReloader
    ) -> None:
        """Test dependencies returns empty for untracked skill."""
        deps = reloader.get_dependencies("unknown-skill")

        assert deps == []

    def test_get_dependents_empty_if_none(
        self, reloader: PluginHotReloader
    ) -> None:
        """Test dependents returns empty if no dependents."""
        dependents = reloader.get_dependents("test-skill-1")

        assert dependents == []

    def test_set_dependencies(self, reloader: PluginHotReloader) -> None:
        """Test setting dependencies."""
        reloader.track_skill("test-skill-1")
        reloader.track_skill("test-skill-2")

        reloader.set_dependencies("test-skill-1", ["test-skill-2"])

        deps = reloader.get_dependencies("test-skill-1")
        assert "test-skill-2" in deps

        dependents = reloader.get_dependents("test-skill-2")
        assert "test-skill-1" in dependents


class TestMetrics:
    """Tests for metrics tracking."""

    def test_initial_metrics(self, reloader: PluginHotReloader) -> None:
        """Test initial metrics state."""
        metrics = reloader.get_metrics()

        assert metrics["total_reloads"] == 0
        assert metrics["successful_reloads"] == 0
        assert metrics["failed_reloads"] == 0
        assert metrics["is_watching"] is False

    def test_metrics_updated_on_reload(
        self, reloader: PluginHotReloader, temp_skills_dir: Path
    ) -> None:
        """Test metrics are updated after reload."""
        reloader.track_skill("test-skill-1")

        # Modify and reload
        skill_file = temp_skills_dir / "test-skill-1" / "SKILL.md"
        skill_file.write_text(skill_file.read_text() + "\n\nModified")

        reloader.reload_skill("test-skill-1")

        metrics = reloader.get_metrics()
        assert metrics["total_reloads"] >= 1


class TestHealthCheck:
    """Tests for health check function."""

    def test_health_check_not_initialized(self) -> None:
        """Test health check with no reloader."""
        result = health_check(None)

        assert result["status"] == "not_initialized"
        assert result["healthy"] is False

    def test_health_check_healthy(self, reloader: PluginHotReloader) -> None:
        """Test health check with healthy reloader."""
        result = health_check(reloader)

        assert result["status"] == "stopped"
        assert result["healthy"] is True

    def test_health_check_unhealthy_high_failure_rate(
        self, reloader: PluginHotReloader
    ) -> None:
        """Test health check with high failure rate."""
        reloader.track_skill("test-skill-1")

        # Simulate high failure rate
        reloader._metrics.total_reloads = 10
        reloader._metrics.failed_reloads = 8

        result = health_check(reloader)

        assert result["healthy"] is False


# =============================================================================
# INTEGRATION TESTS
# =============================================================================

class TestIntegration:
    """Integration tests for full workflow."""

    def test_full_hot_reload_workflow(
        self, reloader: PluginHotReloader, temp_skills_dir: Path
    ) -> None:
        """Test complete hot-reload workflow."""
        callback_results = []

        def capture_callback(skill_name: str) -> None:
            callback_results.append(skill_name)

        reloader.register_callback(capture_callback)

        # Start watching
        with reloader:
            # Track initial skill
            reloader.track_skill("test-skill-1")
            initial_version = reloader.get_skill_version("test-skill-1")

            # Modify skill
            skill_file = temp_skills_dir / "test-skill-1" / "SKILL.md"
            skill_file.write_text(skill_file.read_text() + "\n\n## New Section")

            # Wait for detection and reload
            time.sleep(reloader._watch_interval * 3)

        # Verify callback was invoked
        assert "test-skill-1" in callback_results

        # Verify metrics
        metrics = reloader.get_metrics()
        assert metrics["total_reloads"] >= 1

    def test_concurrent_access_thread_safety(
        self, reloader: PluginHotReloader
    ) -> None:
        """Test thread safety under concurrent access."""
        errors = []

        def track_skills() -> None:
            try:
                for i in range(10):
                    reloader.track_skill(f"skill-{i}")
            except Exception as e:
                errors.append(e)

        def read_versions() -> None:
            try:
                for i in range(10):
                    reloader.get_skill_version(f"skill-{i}")
            except Exception as e:
                errors.append(e)

        threads = [
            threading.Thread(target=track_skills)
            for _ in range(5)
        ] + [
            threading.Thread(target=read_versions)
            for _ in range(5)
        ]

        for t in threads:
            t.start()

        for t in threads:
            t.join()

        assert len(errors) == 0


# =============================================================================
# EXCEPTION TESTS
# =============================================================================

class TestExceptions:
    """Tests for custom exceptions."""

    def test_hot_reload_error_with_skill_name(self) -> None:
        """Test HotReloadError with skill_name."""
        error = HotReloadError(
            message="Test error",
            skill_name="test-skill"
        )

        assert "test-skill" in str(error)
        assert error.context["skill_name"] == "test-skill"

    def test_hot_reload_error_with_context(self) -> None:
        """Test HotReloadError with additional context."""
        error = HotReloadError(
            message="Test error",
            skill_name="test-skill",
            context={"extra": "info"}
        )

        assert error.context["skill_name"] == "test-skill"
        assert error.context["extra"] == "info"

    def test_hot_reload_error_with_cause(self) -> None:
        """Test HotReloadError with cause."""
        cause = ValueError("Original error")
        error = HotReloadError(
            message="Test error",
            skill_name="test-skill",
            cause=cause
        )

        assert error.cause == cause

    def test_skill_load_error_inherits_from_hot_reload_error(self) -> None:
        """Test SkillLoadError inheritance."""
        error = SkillLoadError(
            message="Failed to load skill",
            skill_name="test-skill"
        )

        assert isinstance(error, HotReloadError)
        assert "Failed to load skill" in str(error)

    def test_skill_load_error_with_cause(self) -> None:
        """Test SkillLoadError with cause."""
        cause = IOError("File not found")
        error = SkillLoadError(
            message="Failed to load",
            skill_name="test-skill",
            cause=cause
        )

        assert error.__cause__ == cause
        assert error.skill_name == "test-skill"

    def test_dependency_error_with_dependency(self) -> None:
        """Test DependencyError with dependency info."""
        error = DependencyError(
            message="Missing dependency",
            skill_name="test-skill",
            dependency="missing-skill"
        )

        assert isinstance(error, HotReloadError)
        assert error.context["dependency"] == "missing-skill"

    def test_dependency_error_with_all_params(self) -> None:
        """Test DependencyError with all parameters."""
        cause = Exception("Root cause")
        error = DependencyError(
            message="Dependency error",
            skill_name="skill-a",
            dependency="skill-b",
            context={"extra": "context"},
            cause=cause
        )

        assert error.context["skill_name"] == "skill-a"
        assert error.context["dependency"] == "skill-b"
        assert error.context["extra"] == "context"
        assert error.__cause__ == cause


# =============================================================================
# DATA CLASS TESTS
# =============================================================================

class TestSkillVersion:
    """Tests for SkillVersion dataclass."""

    def test_skill_version_to_dict(self, temp_skills_dir: Path) -> None:
        """Test SkillVersion.to_dict() serialization."""
        now = datetime.now()
        version = SkillVersion(
            skill_name="test-skill",
            version_hash="a" * 64,
            last_modified=now,
            file_path=temp_skills_dir / "test-skill" / "SKILL.md",
            load_count=5,
            last_load_time=now,
            error_count=2,
            last_error="Test error"
        )

        result = version.to_dict()

        assert result["skill_name"] == "test-skill"
        assert result["version_hash"] == "a" * 64
        assert result["last_modified"] == now.isoformat()
        assert "test-skill" in result["file_path"]
        assert result["load_count"] == 5
        assert result["last_load_time"] == now.isoformat()
        assert result["error_count"] == 2
        assert result["last_error"] == "Test error"

    def test_skill_version_to_dict_with_none_last_load_time(
        self, temp_skills_dir: Path
    ) -> None:
        """Test SkillVersion.to_dict() with None last_load_time."""
        now = datetime.now()
        version = SkillVersion(
            skill_name="test-skill",
            version_hash="b" * 64,
            last_modified=now,
            file_path=temp_skills_dir / "test-skill" / "SKILL.md",
            load_count=1,
            last_load_time=None,
            error_count=0,
            last_error=None
        )

        result = version.to_dict()

        assert result["last_load_time"] is None
        assert result["last_error"] is None


class TestHotReloadMetricsDataclass:
    """Tests for HotReloadMetrics dataclass."""

    def test_hot_reload_metrics_to_dict(self) -> None:
        """Test HotReloadMetrics.to_dict() serialization."""
        metrics = HotReloadMetrics(
            total_reloads=10,
            successful_reloads=8,
            failed_reloads=2,
            rollback_count=1,
            watch_time_seconds=100.5,
            callbacks_invoked=15
        )

        result = metrics.to_dict()

        assert result["total_reloads"] == 10
        assert result["successful_reloads"] == 8
        assert result["failed_reloads"] == 2
        assert result["rollback_count"] == 1
        assert result["watch_time_seconds"] == 100.5
        assert result["callbacks_invoked"] == 15

    def test_hot_reload_metrics_default_values(self) -> None:
        """Test HotReloadMetrics default values."""
        metrics = HotReloadMetrics()

        assert metrics.total_reloads == 0
        assert metrics.successful_reloads == 0
        assert metrics.failed_reloads == 0
        assert metrics.rollback_count == 0
        assert metrics.watch_time_seconds == 0.0
        assert metrics.callbacks_invoked == 0


# =============================================================================
# PLUGIN HOT RELOADER ADDITIONAL TESTS
# =============================================================================

class TestPluginHotReloaderSetSkillLoader:
    """Tests for set_skill_loader method."""

    def test_set_skill_loader_stores_loader(
        self, reloader: PluginHotReloader
    ) -> None:
        """Test that skill loader is stored."""
        mock_loader = Mock()
        mock_loader.reload_skill = Mock(return_value=Mock())

        reloader.set_skill_loader(mock_loader)

        assert reloader._skill_loader == mock_loader

    def test_reload_skill_uses_skill_loader(
        self, reloader: PluginHotReloader, temp_skills_dir: Path
    ) -> None:
        """Test that reload uses skill loader when available."""
        mock_loader = Mock()
        mock_loader.reload_skill = Mock(return_value=Mock())

        reloader.set_skill_loader(mock_loader)
        reloader.track_skill("test-skill-1")

        # Modify file
        skill_file = temp_skills_dir / "test-skill-1" / "SKILL.md"
        skill_file.write_text(skill_file.read_text() + "\n\nModified")

        # Reload
        result = reloader.reload_skill("test-skill-1")

        assert result is True
        mock_loader.reload_skill.assert_called_once_with("test-skill-1")

    def test_reload_skill_fails_when_loader_returns_none(
        self, reloader: PluginHotReloader
    ) -> None:
        """Test reload fails when skill loader returns None."""
        mock_loader = Mock()
        mock_loader.reload_skill = Mock(return_value=None)

        reloader.set_skill_loader(mock_loader)
        reloader.track_skill("test-skill-1")

        result = reloader.reload_skill("test-skill-1")

        assert result is False


class TestPluginHotReloaderGetSkillInfo:
    """Tests for get_skill_info method."""

    def test_get_skill_info_returns_dict(
        self, reloader: PluginHotReloader
    ) -> None:
        """Test that get_skill_info returns dict."""
        reloader.track_skill("test-skill-1")

        info = reloader.get_skill_info("test-skill-1")

        assert info is not None
        assert isinstance(info, dict)
        assert info["skill_name"] == "test-skill-1"
        assert "version_hash" in info
        assert "last_modified" in info

    def test_get_skill_info_returns_none_for_untracked(
        self, reloader: PluginHotReloader
    ) -> None:
        """Test that get_skill_info returns None for untracked skill."""
        info = reloader.get_skill_info("unknown-skill")

        assert info is None


class TestPluginHotReloaderListTrackedSkills:
    """Tests for list_tracked_skills method."""

    def test_list_tracked_skills_empty_initially(
        self, reloader: PluginHotReloader
    ) -> None:
        """Test that list is empty before tracking."""
        skills = reloader.list_tracked_skills()

        assert skills == []

    def test_list_tracked_skills_after_tracking(
        self, reloader: PluginHotReloader
    ) -> None:
        """Test list after tracking skills."""
        reloader.track_skill("test-skill-1")
        reloader.track_skill("test-skill-2")

        skills = reloader.list_tracked_skills()

        assert len(skills) == 2
        assert "test-skill-1" in skills
        assert "test-skill-2" in skills

    def test_list_tracked_skills_returns_copy(
        self, reloader: PluginHotReloader
    ) -> None:
        """Test that returned list is a copy."""
        reloader.track_skill("test-skill-1")

        skills = reloader.list_tracked_skills()
        skills.append("fake-skill")

        skills2 = reloader.list_tracked_skills()
        assert "fake-skill" not in skills2


class TestPluginHotReloaderUnregisterCallback:
    """Tests for unregister_callback method."""

    def test_unregister_callback_removes_callback(
        self, reloader: PluginHotReloader
    ) -> None:
        """Test that callback is removed."""
        callback = Mock()

        reloader.register_callback(callback)
        assert callback in reloader._callbacks

        reloader.unregister_callback(callback)
        assert callback not in reloader._callbacks

    def test_unregister_callback_nonexistent_does_not_raise(
        self, reloader: PluginHotReloader
    ) -> None:
        """Test that unregistering nonexistent callback doesn't raise."""
        callback = Mock()

        # Should not raise
        reloader.unregister_callback(callback)

    def test_unregister_only_specific_callback(
        self, reloader: PluginHotReloader
    ) -> None:
        """Test that only specific callback is removed."""
        callback1 = Mock()
        callback2 = Mock()

        reloader.register_callback(callback1)
        reloader.register_callback(callback2)

        reloader.unregister_callback(callback1)

        assert callback1 not in reloader._callbacks
        assert callback2 in reloader._callbacks


class TestPluginHotReloaderRegisterDependency:
    """Tests for register_dependency method."""

    def test_register_dependency_creates_new_list(
        self, reloader: PluginHotReloader
    ) -> None:
        """Test that register_dependency creates new dependency list."""
        reloader.register_dependency("skill-a", "skill-b")

        deps = reloader.get_dependencies("skill-a")
        assert "skill-b" in deps

    def test_register_dependency_appends_to_existing(
        self, reloader: PluginHotReloader
    ) -> None:
        """Test that register_dependency appends to existing list."""
        reloader.register_dependency("skill-a", "skill-b")
        reloader.register_dependency("skill-a", "skill-c")

        deps = reloader.get_dependencies("skill-a")
        assert "skill-b" in deps
        assert "skill-c" in deps

    def test_register_dependency_no_duplicates(
        self, reloader: PluginHotReloader
    ) -> None:
        """Test that register_dependency doesn't add duplicates."""
        reloader.register_dependency("skill-a", "skill-b")
        reloader.register_dependency("skill-a", "skill-b")

        deps = reloader.get_dependencies("skill-a")
        assert deps.count("skill-b") == 1


class TestPluginHotReloaderForceRescan:
    """Tests for force_rescan method."""

    def test_force_rescan_returns_skill_count(
        self, reloader: PluginHotReloader
    ) -> None:
        """Test that force_rescan returns number of skills."""
        count = reloader.force_rescan()

        assert count == 2  # test-skill-1 and test-skill-2

    def test_force_rescan_tracks_all_skills(
        self, reloader: PluginHotReloader
    ) -> None:
        """Test that force_rescan tracks all skills."""
        reloader.force_rescan()

        skills = reloader.list_tracked_skills()
        assert "test-skill-1" in skills
        assert "test-skill-2" in skills

    def test_force_rescan_empty_directory(self, tmp_path: Path) -> None:
        """Test force_rescan in empty directory."""
        empty_dir = tmp_path / "empty-skills"
        empty_dir.mkdir()

        reloader = PluginHotReloader(skills_dir=empty_dir)
        count = reloader.force_rescan()

        assert count == 0


class TestPluginHotReloaderScanSkills:
    """Tests for _scan_skills internal method."""

    def test_scan_skills_nonexistent_directory(
        self, tmp_path: Path
    ) -> None:
        """Test _scan_skills with nonexistent directory."""
        nonexistent = tmp_path / "nonexistent"

        reloader = PluginHotReloader(skills_dir=nonexistent)
        # Remove the directory that was created in __init__
        nonexistent.rmdir()

        count = reloader._scan_skills()

        assert count == 0


class TestPluginHotReloaderComputeHashIOError:
    """Tests for _compute_hash IOError handling."""

    def test_compute_hash_handles_io_error(
        self, reloader: PluginHotReloader, temp_skills_dir: Path
    ) -> None:
        """Test that _compute_hash handles IOError gracefully."""
        skill_file = temp_skills_dir / "test-skill-1" / "SKILL.md"

        with patch("builtins.open", side_effect=IOError("Permission denied")):
            result = reloader._compute_hash(skill_file)

        assert result is None

    def test_compute_hash_handles_os_error(
        self, reloader: PluginHotReloader, temp_skills_dir: Path
    ) -> None:
        """Test that _compute_hash handles OSError gracefully."""
        skill_file = temp_skills_dir / "test-skill-1" / "SKILL.md"

        with patch("builtins.open", side_effect=OSError("Disk error")):
            result = reloader._compute_hash(skill_file)

        assert result is None


class TestPluginHotReloaderWatchLoop:
    """Tests for _watch_loop internal method."""

    def test_watch_loop_handles_exceptions_gracefully(
        self, reloader: PluginHotReloader
    ) -> None:
        """Test that _watch_loop handles exceptions without crashing."""
        call_count = 0

        def mock_check():
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise Exception("Test exception in watch loop")
            # Second call succeeds
            reloader._stop_event.set()

        with patch.object(reloader, "_check_for_changes", side_effect=mock_check):
            reloader._watch_loop()

        # Should have been called at least once (exception didn't crash it)
        assert call_count >= 1


class TestPluginHotReloaderCheckForChanges:
    """Tests for _check_for_changes internal method."""

    def test_check_for_changes_with_auto_reload_disabled(
        self, temp_skills_dir: Path
    ) -> None:
        """Test _check_for_changes with auto_reload disabled."""
        reloader = PluginHotReloader(
            skills_dir=temp_skills_dir,
            enable_auto_reload=False
        )
        reloader.track_skill("test-skill-1")

        # Modify file
        skill_file = temp_skills_dir / "test-skill-1" / "SKILL.md"
        skill_file.write_text(skill_file.read_text() + "\n\nModified")

        initial_total = reloader._metrics.total_reloads

        reloader._check_for_changes()

        # Should not have reloaded (auto_reload disabled)
        assert reloader._metrics.total_reloads == initial_total

    def test_check_for_changes_skips_missing_file(
        self, reloader: PluginHotReloader, temp_skills_dir: Path
    ) -> None:
        """Test _check_for_changes skips skills with missing files."""
        reloader.track_skill("test-skill-1")

        # Delete the skill file
        skill_file = temp_skills_dir / "test-skill-1" / "SKILL.md"
        skill_file.unlink()

        # Should not raise
        reloader._check_for_changes()

    def test_check_for_changes_skips_skill_over_error_threshold(
        self, reloader: PluginHotReloader
    ) -> None:
        """Test _check_for_changes skips skills with too many errors."""
        reloader._max_error_count = 2
        reloader.track_skill("test-skill-1")

        # Set error count above threshold
        version = reloader.get_skill_version("test-skill-1")
        version.error_count = 5

        initial_total = reloader._metrics.total_reloads

        reloader._check_for_changes()

        # Should not have attempted reload
        assert reloader._metrics.total_reloads == initial_total


class TestPluginHotReloaderReloadSkillInternal:
    """Tests for _reload_skill_internal internal method."""

    def test_reload_skill_internal_returns_false_for_untracked(
        self, reloader: PluginHotReloader
    ) -> None:
        """Test _reload_skill_internal returns False for untracked skill."""
        result = reloader._reload_skill_internal("unknown-skill", is_manual=True)

        assert result is False

    def test_reload_skill_internal_with_skill_loader_success(
        self, reloader: PluginHotReloader, temp_skills_dir: Path
    ) -> None:
        """Test _reload_skill_internal with skill loader succeeding."""
        mock_loader = Mock()
        mock_loader.reload_skill = Mock(return_value=Mock())

        reloader.set_skill_loader(mock_loader)
        reloader.track_skill("test-skill-1")

        # Modify file
        skill_file = temp_skills_dir / "test-skill-1" / "SKILL.md"
        skill_file.write_text(skill_file.read_text() + "\n\nModified")

        result = reloader._reload_skill_internal("test-skill-1", is_manual=True)

        assert result is True
        assert reloader._metrics.successful_reloads >= 1

    def test_reload_skill_internal_logs_dependents(
        self, reloader: PluginHotReloader, temp_skills_dir: Path, caplog: pytest.LogCaptureFixture
    ) -> None:
        """Test _reload_skill_internal logs dependent skills."""
        reloader.track_skill("test-skill-1")
        reloader.track_skill("test-skill-2")
        reloader.register_dependency("test-skill-2", "test-skill-1")

        # Modify file
        skill_file = temp_skills_dir / "test-skill-1" / "SKILL.md"
        skill_file.write_text(skill_file.read_text() + "\n\nModified")

        with caplog.at_level("INFO"):
            result = reloader._reload_skill_internal("test-skill-1", is_manual=True)

        assert result is True
        assert any("dependent" in record.message.lower() for record in caplog.records)

    def test_reload_skill_internal_resets_error_count_on_success(
        self, reloader: PluginHotReloader, temp_skills_dir: Path
    ) -> None:
        """Test _reload_skill_internal resets error count on success."""
        reloader.track_skill("test-skill-1")
        version = reloader.get_skill_version("test-skill-1")
        version.error_count = 2

        # Modify file
        skill_file = temp_skills_dir / "test-skill-1" / "SKILL.md"
        skill_file.write_text(skill_file.read_text() + "\n\nModified")

        result = reloader._reload_skill_internal("test-skill-1", is_manual=True)

        assert result is True
        assert version.error_count == 0
        assert version.last_error is None


class TestPluginHotReloaderTrackSkillInternal:
    """Tests for _track_skill internal method."""

    def test_track_skill_creates_new_version(
        self, reloader: PluginHotReloader, temp_skills_dir: Path
    ) -> None:
        """Test _track_skill creates new version entry."""
        skill_file = temp_skills_dir / "test-skill-1" / "SKILL.md"

        reloader._track_skill("test-skill-1", skill_file)

        version = reloader.get_skill_version("test-skill-1")
        assert version is not None
        assert version.skill_name == "test-skill-1"
        assert version.load_count == 1

    def test_track_skill_updates_existing_version(
        self, reloader: PluginHotReloader, temp_skills_dir: Path
    ) -> None:
        """Test _track_skill updates existing version entry."""
        skill_file = temp_skills_dir / "test-skill-1" / "SKILL.md"

        reloader._track_skill("test-skill-1", skill_file)
        version1 = reloader.get_skill_version("test-skill-1")
        load_count1 = version1.load_count

        reloader._track_skill("test-skill-1", skill_file)
        version2 = reloader.get_skill_version("test-skill-1")

        assert version2.load_count == load_count1 + 1


class TestPluginHotReloaderStartStop:
    """Tests for start/stop edge cases."""

    def test_start_when_already_watching(
        self, reloader: PluginHotReloader, caplog: pytest.LogCaptureFixture
    ) -> None:
        """Test start() when already watching logs warning."""
        reloader.start()

        with caplog.at_level("WARNING"):
            reloader.start()  # Second call

        assert any("already watching" in record.message.lower() for record in caplog.records)

        reloader.stop()

    def test_stop_when_not_watching(self, reloader: PluginHotReloader) -> None:
        """Test stop() when not watching doesn't raise."""
        # Should not raise
        reloader.stop()


class TestPluginHotReloaderTrackSkillPublic:
    """Tests for public track_skill method."""

    def test_track_skill_returns_version_on_success(
        self, reloader: PluginHotReloader
    ) -> None:
        """Test track_skill returns SkillVersion on success."""
        result = reloader.track_skill("test-skill-1")

        assert result is not None
        assert isinstance(result, SkillVersion)
        assert result.skill_name == "test-skill-1"

    def test_track_skill_returns_none_for_missing_dir(
        self, reloader: PluginHotReloader
    ) -> None:
        """Test track_skill returns None for missing skill directory."""
        result = reloader.track_skill("nonexistent-skill")

        assert result is None

    def test_track_skill_returns_none_for_missing_skill_file(
        self, temp_skills_dir: Path
    ) -> None:
        """Test track_skill returns None for missing SKILL.md file."""
        # Create directory without SKILL.md
        skill_dir = temp_skills_dir / "empty-skill"
        skill_dir.mkdir()

        reloader = PluginHotReloader(skills_dir=temp_skills_dir)
        result = reloader.track_skill("empty-skill")

        assert result is None


class TestPluginHotReloaderEnableAutoReload:
    """Tests for enable_auto_reload parameter."""

    def test_auto_reload_disabled_no_reloads(
        self, temp_skills_dir: Path
    ) -> None:
        """Test that auto-reload disabled prevents automatic reloads."""
        reloader = PluginHotReloader(
            skills_dir=temp_skills_dir,
            watch_interval=0.1,
            enable_auto_reload=False
        )

        callback = Mock()
        reloader.register_callback(callback)
        reloader.track_skill("test-skill-1")

        reloader.start()

        # Modify file
        skill_file = temp_skills_dir / "test-skill-1" / "SKILL.md"
        skill_file.write_text(skill_file.read_text() + "\n\nModified")

        # Wait for potential detection
        time.sleep(0.5)

        reloader.stop()

        # Callback should NOT have been called (auto_reload disabled)
        callback.assert_not_called()


class TestPluginHotReloaderInitCustomParams:
    """Tests for initialization with custom parameters."""

    def test_init_with_custom_max_error_count(
        self, temp_skills_dir: Path
    ) -> None:
        """Test initialization with custom max_error_count."""
        reloader = PluginHotReloader(
            skills_dir=temp_skills_dir,
            max_error_count=5
        )

        assert reloader._max_error_count == 5

    def test_init_with_auto_reload_disabled(
        self, temp_skills_dir: Path
    ) -> None:
        """Test initialization with auto_reload disabled."""
        reloader = PluginHotReloader(
            skills_dir=temp_skills_dir,
            enable_auto_reload=False
        )

        assert reloader._enable_auto_reload is False


class TestPluginHotReloaderGetMetrics:
    """Tests for get_metrics method."""

    def test_get_metrics_includes_tracked_skills_count(
        self, reloader: PluginHotReloader
    ) -> None:
        """Test get_metrics includes tracked_skills count."""
        reloader.track_skill("test-skill-1")
        reloader.track_skill("test-skill-2")

        metrics = reloader.get_metrics()

        assert metrics["tracked_skills"] == 2

    def test_get_metrics_includes_is_watching(
        self, reloader: PluginHotReloader
    ) -> None:
        """Test get_metrics includes is_watching status."""
        metrics = reloader.get_metrics()
        assert metrics["is_watching"] is False

        reloader.start()
        metrics = reloader.get_metrics()
        assert metrics["is_watching"] is True

        reloader.stop()


# =============================================================================
# HEALTH CHECK ADDITIONAL TESTS
# =============================================================================

class TestHealthCheckAdditional:
    """Additional tests for health_check function."""

    def test_health_check_watching_status(
        self, reloader: PluginHotReloader
    ) -> None:
        """Test health_check shows watching status."""
        reloader.start()
        result = health_check(reloader)

        assert result["status"] == "watching"
        assert result["is_watching"] is True

        reloader.stop()

    def test_health_check_includes_all_metrics(
        self, reloader: PluginHotReloader
    ) -> None:
        """Test health_check includes all relevant metrics."""
        reloader.track_skill("test-skill-1")

        result = health_check(reloader)

        assert "tracked_skills" in result
        assert "total_reloads" in result
        assert "failed_reloads" in result
        assert "watch_time_seconds" in result

    def test_health_check_healthy_at_50_percent_failure(
        self, reloader: PluginHotReloader
    ) -> None:
        """Test health_check is healthy at exactly 50% failure rate."""
        reloader._metrics.total_reloads = 10
        reloader._metrics.failed_reloads = 5  # Exactly 50%

        result = health_check(reloader)

        # 50% should still be healthy (threshold is > 0.5)
        assert result["healthy"] is True

    def test_health_check_unhealthy_above_50_percent_failure(
        self, reloader: PluginHotReloader
    ) -> None:
        """Test health_check is unhealthy above 50% failure rate."""
        reloader._metrics.total_reloads = 10
        reloader._metrics.failed_reloads = 6  # 60%

        result = health_check(reloader)

        assert result["healthy"] is False


# =============================================================================
# RUN TESTS
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
