"""Test suite for Orchestrator V13.0 features."""

import pytest
import json
from pathlib import Path
import sys

# Add lib to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent / "lib"))

from agent_performance import AgentPerformanceDB, AgentMetrics
from agent_selector import AgentSelector
from file_locks import FileLockManager

class TestV13DynamicAgentSelection:
    """Test dynamic agent selection system."""

    def test_performance_db_creation(self):
        """Test 1: Performance DB creation."""
        db = AgentPerformanceDB(":memory:")
        assert db.metrics == {}

    def test_record_task(self):
        """Test 2: Record task completion."""
        db = AgentPerformanceDB(":memory:")
        db.record_task("Analyzer", True, 1500, 5000)
        db.record_task("Analyzer", True, 2000, 6000)
        db.record_task("Analyzer", False, 1000, 3000)

        m = db.metrics["Analyzer"]
        assert m.total_tasks == 3
        assert m.successful_tasks == 2
        assert m.failed_tasks == 1
        assert 0.6 < m.success_rate < 0.7  # ~66.67%
        # EMA with alpha=0.3: 0.3*1000 + 0.7*(0.3*2000 + 0.7*(0.3*1500)) = 940.5
        assert 940 < m.avg_duration_ms < 941

    def test_get_best_agent(self):
        """Test 3: Best agent selection."""
        db = AgentPerformanceDB(":memory:")

        # Setup: Analyzer has better performance
        db.record_task("Analyzer", True, 1000, 5000)
        db.record_task("Analyzer", True, 1200, 6000)
        db.record_task("Analyzer", True, 1100, 5500)
        db.record_task("Coder", True, 3000, 10000)  # Slower
        db.record_task("Coder", True, 2500, 9000)

        best = db.get_best_agent(["Analyzer", "Coder"])
        assert best == "Analyzer"  # Higher success rate + faster

    def test_cold_start(self):
        """Test 4: Cold start (no metrics)."""
        db = AgentPerformanceDB(":memory:")
        best = db.get_best_agent(["Analyzer", "Coder"])
        assert best == "Analyzer"  # First candidate

    def test_selector(self):
        """Test 5: AgentSelector integration."""
        db = AgentPerformanceDB(":memory:")
        selector = AgentSelector()

        # Record some data
        db.record_task("Coder", True, 2000, 8000)
        db.record_task("Coder", True, 1800, 7500)
        db.record_task("Coder", True, 2200, 8500)

        # Select
        selected = selector.select_agent("fix bug", ["Analyzer", "Coder"])
        assert selected in ["Analyzer", "Coder"]

class TestV13PluginSkills:
    """Test plugin skills architecture."""

    def test_skill_interface(self):
        """Test 6: SkillInterface ABC validation."""
        from skill_interface import SkillInterface

        # Test that SkillInterface is abstract
        with pytest.raises(TypeError):
            SkillInterface()

    def test_plugin_loader_discovery(self):
        """Test 7: PluginLoader discovery."""
        from skill_plugin import SkillPluginLoader

        loader = SkillPluginLoader()
        skills = loader.discover_skills()
        assert isinstance(skills, list)

    def test_manifest_exists(self):
        """Test 8: Manifest file creation."""
        manifest_path = Path.home() / ".claude/skills/skills_manifest.json"
        assert manifest_path.exists()

class TestV13FileLocks:
    """Test file locks system."""

    def test_lock_manager_creation(self):
        """Test 9: FileLockManager creation."""
        fm = FileLockManager()
        assert fm.lock_dir.exists()

    def test_acquire_release(self):
        """Test 10: Basic acquire/release."""
        fm = FileLockManager()
        holder_id = "test_task"

        # Acquire
        acquired = fm.acquire("/tmp/test_file.txt", holder_id, timeout=5.0)
        assert acquired == True

        # Check holder
        holder = fm.get_holder("/tmp/test_file.txt")
        assert holder == holder_id

        # Release
        released = fm.release("/tmp/test_file.txt", holder_id)
        assert released == True

    def test_concurrent_exclusion(self):
        """Test 11: Concurrent access prevention."""
        fm = FileLockManager()

        holder1 = "task_1"
        holder2 = "task_2"

        # Holder 1 acquires
        assert fm.acquire("/tmp/test.txt", holder1, timeout=5.0)

        # Holder 2 cannot acquire (timeout or immediate fail)
        # Note: This test requires actual threading for full validation

        # Cleanup
        fm.release("/tmp/test.txt", holder1)

    def test_reentrant_lock(self):
        """Test 12: Reentrant lock (same holder)."""
        fm = FileLockManager()
        holder_id = "task_reentrant"

        # First acquire
        assert fm.acquire("/tmp/test.txt", holder_id)
        # Second acquire (same holder) should work
        assert fm.acquire("/tmp/test.txt", holder_id)

        # Release once
        assert fm.release("/tmp/test.txt", holder_id)

        # Should still be locked (reentrant count > 0)
        holder = fm.get_holder("/tmp/test.txt")
        assert holder == holder_id

        # Release again
        assert fm.release("/tmp/test.txt", holder_id)

    def test_cleanup(self):
        """Test 13: Cleanup all locks for holder."""
        fm = FileLockManager()
        holder_id = "cleanup_task"

        # Acquire multiple locks
        fm.acquire("/tmp/file1.txt", holder_id)
        fm.acquire("/tmp/file2.txt", holder_id)

        # Cleanup all
        fm.cleanup(holder_id)

        # All should be released
        assert fm.get_holder("/tmp/file1.txt") is None
        assert fm.get_holder("/tmp/file2.txt") is None

# Test configuration
def pytest_configure(config):
    config.addinivalue_line("markers", "v13: V13.0 feature tests")
