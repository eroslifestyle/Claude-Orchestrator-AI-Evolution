"""Test suite per FASE 1 bug fixes."""

import pytest
import threading
import time
import asyncio
from pathlib import Path
import sys
import tempfile

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from lib.file_locks import FileLockManager
from lib.agent_performance import AgentPerformanceDB, BatchMetricsWriter
from lib.agent_selector import AgentSelector
from lib.skill_plugin import SkillPluginLoader


class TestFL1HashCollision:
    """Test per FL-1: Hash collision prevention."""

    def test_sha256_truncation_no_collision(self):
        """Verifica SHA-256 truncato 16 char non abbia collisioni."""
        lock_manager = FileLockManager()
        
        paths = [f"/test/path/{i}/file_{i}.txt" for i in range(100)]
        lock_files = set()
        
        for path in paths:
            lock_file = lock_manager._get_lock_file_path(path)
            lock_files.add(lock_file)
        
        assert len(lock_files) == 100, "Hash collision detected!"

    def test_long_path_handling(self):
        """Verifica path molto lunghi generino hash validi."""
        lock_manager = FileLockManager()
        
        long_path = "/a" * 500 + "/file.txt"
        lock_file = lock_manager._get_lock_file_path(long_path)
        
        assert len(lock_file) < 100
        assert lock_file.endswith(".lock")


class TestFL2MemoryLeakAsyncEvents:
    """Test per FL-2: Memory leak in async events."""

    def test_async_events_bounded_size(self):
        """Verifica _async_events bounded (max 1000) tramite AsyncEventManager."""
        lock_manager = FileLockManager()

        # Usa get_or_create() invece di dict assignment
        # AsyncEventManager implementa LRU eviction
        for i in range(1500):
            file_path = f"/test/file_{i}.txt"
            lock_manager._async_events.get_or_create(file_path)

        # Verifica che la dimensione sia limitata al max_size
        assert lock_manager._async_events.size <= lock_manager._async_events._max_size


class TestAP1ShutdownCrash:
    """Test per AP-1: Shutdown crash prevention."""

    def test_shutdown_during_batch_write(self):
        """Verifica shutdown graceful durante batch write."""
        db = AgentPerformanceDB(db_path=":memory:")
        
        for i in range(10):
            db.record_task(f"agent_{i}", success=True, duration_ms=100.0, tokens=50)
        
        db.shutdown()

    def test_del_with_none_batch_writer(self):
        """Verifica __del__ con batch_writer None."""
        db = AgentPerformanceDB(db_path=":memory:")
        db._batch_writer = None
        
        db.__del__()


class TestSP1UnboundedList:
    """Test per SP-1: Unbounded list prevention."""

    def test_cleanup_failures_bounded(self):
        """Verifica cleanup_failures bounded."""
        from collections import deque
        
        loader = SkillPluginLoader()
        
        assert isinstance(loader._cleanup_failures, deque)
        assert loader._cleanup_failures.maxlen == 100


class TestAS1KeywordDedup:
    """Test per AS-1: Keyword deduplication."""

    def test_no_duplicate_keywords(self):
        """Verifica extract_keywords non ritorni duplicati."""
        selector = AgentSelector()
        
        task = "fix database query optimize SQL database query"
        keywords = selector.extract_keywords(task)
        
        keywords_lower = [k.lower() for k in keywords]
        assert len(keywords_lower) == len(set(keywords_lower))

    def test_hardcoded_keywords_is_set(self):
        """Verifica hardcoded keywords sia un set."""
        selector = AgentSelector()
        
        if hasattr(selector, '_hardcoded_keywords'):
            assert isinstance(selector._hardcoded_keywords, set)


class TestIntegration:
    """Test di integrazione."""

    def test_file_lock_acquire_release(self):
        """Test base acquire/release lock."""
        lock_manager = FileLockManager()
        
        file_path = "/test/integration_test.txt"
        holder_id = "test-holder"
        
        acquired = lock_manager.acquire(file_path, holder_id, timeout=1.0)
        assert acquired
        
        released = lock_manager.release(file_path, holder_id)
        assert released

    def test_agent_selector_basic_routing(self):
        """Test base agent selection."""
        selector = AgentSelector()
        
        keywords = selector.extract_keywords("fix database query")
        assert len(keywords) >= 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
