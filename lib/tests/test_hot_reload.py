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
# RUN TESTS
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
