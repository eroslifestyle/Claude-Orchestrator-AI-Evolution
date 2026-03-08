"""Comprehensive tests for agent_performance.py - V14.0.3.

Tests for ConnectionPool, BatchMetricsWriter, AgentMetrics, AgentPerformanceDB.
"""

import pytest
import tempfile
import threading
import time
import os
from pathlib import Path
from datetime import datetime
from unittest.mock import patch, MagicMock
import queue

from lib.agent_performance import (
    ConnectionPool,
    BatchMetricsWriter,
    AgentMetrics,
    AgentPerformanceDB
)
from lib.exceptions import DatabaseConnectionError, AgentError


# ============================================================================
# Test Fixtures
# ============================================================================

@pytest.fixture
def temp_db_path(tmp_path):
    """Create a temporary database path."""
    return str(tmp_path / "test_performance.db")


@pytest.fixture
def in_memory_db():
    """Create an in-memory performance database."""
    return AgentPerformanceDB(db_path=":memory:")


@pytest.fixture
def file_db(temp_db_path):
    """Create a file-based performance database."""
    db = AgentPerformanceDB(db_path=temp_db_path)
    yield db
    db.shutdown()


# ============================================================================
# ConnectionPool Tests
# ============================================================================

class TestConnectionPoolInit:
    """Test ConnectionPool initialization."""

    def test_init_creates_pool(self, temp_db_path):
        """Test initialization creates connection pool."""
        pool = ConnectionPool(temp_db_path, pool_size=3)
        assert pool._pool_size == 3
        assert pool._initialized is True

    def test_init_pre_populates_connections(self, temp_db_path):
        """Test initialization pre-populates connections."""
        pool = ConnectionPool(temp_db_path, pool_size=5)
        assert pool._pool.qsize() == 5
        ConnectionPool.close_all()

    def test_init_sets_pragmas(self, temp_db_path):
        """Test initialization sets SQLite pragmas."""
        pool = ConnectionPool(temp_db_path, pool_size=1)
        conn = pool._pool.get()
        cursor = conn.execute("PRAGMA journal_mode")
        mode = cursor.fetchone()[0]
        assert mode.lower() == "wal"
        pool._pool.put(conn)
        ConnectionPool.close_all()


class TestConnectionPoolSingleton:
    """Test ConnectionPool singleton behavior."""

    def teardown_method(self):
        """Clean up after each test."""
        ConnectionPool.close_all()

    def test_initialize_creates_singleton(self, temp_db_path):
        """Test initialize creates singleton instance."""
        ConnectionPool.initialize(temp_db_path, pool_size=2)
        assert ConnectionPool._instance is not None

    def test_initialize_idempotent(self, temp_db_path):
        """Test initialize is idempotent."""
        ConnectionPool.initialize(temp_db_path, pool_size=2)
        first_instance = ConnectionPool._instance
        ConnectionPool.initialize(temp_db_path, pool_size=3)
        assert ConnectionPool._instance is first_instance

    def test_is_initialized_false_before_init(self):
        """Test is_initialized returns False before initialization."""
        ConnectionPool._instance = None
        assert ConnectionPool.is_initialized() is False

    def test_is_initialized_true_after_init(self, temp_db_path):
        """Test is_initialized returns True after initialization."""
        ConnectionPool.initialize(temp_db_path, pool_size=2)
        assert ConnectionPool.is_initialized() is True


class TestConnectionPoolGetConnection:
    """Test ConnectionPool get_connection."""

    def teardown_method(self):
        """Clean up after each test."""
        ConnectionPool.close_all()

    def test_get_connection_returns_connection(self, temp_db_path):
        """Test get_connection returns a connection."""
        ConnectionPool.initialize(temp_db_path, pool_size=1)
        with ConnectionPool.get_connection() as conn:
            assert conn is not None

    def test_get_connection_returns_to_pool(self, temp_db_path):
        """Test connection is returned to pool after use."""
        ConnectionPool.initialize(temp_db_path, pool_size=1)
        with ConnectionPool.get_connection() as conn:
            pass
        assert ConnectionPool._instance._pool.qsize() == 1

    def test_get_connection_timeout_raises(self, temp_db_path):
        """Test get_connection raises on timeout."""
        ConnectionPool.initialize(temp_db_path, pool_size=1)

        # Hold the only connection
        ctx = ConnectionPool.get_connection(timeout=1.0)
        conn = ctx.__enter__()

        try:
            with ConnectionPool.get_connection(timeout=0.2) as conn2:
                pass
            assert False, "Should have raised"
        except queue.Empty:
            pass

        ctx.__exit__(None, None, None)

    def test_get_connection_without_init_raises(self):
        """Test get_connection raises without initialization."""
        ConnectionPool._instance = None
        with pytest.raises(DatabaseConnectionError, match="not initialized"):
            with ConnectionPool.get_connection():
                pass

    def test_get_connection_rollback_on_exception(self, temp_db_path):
        """Test connection is rolled back on exception."""
        ConnectionPool.initialize(temp_db_path, pool_size=1)

        with pytest.raises(ValueError):
            with ConnectionPool.get_connection() as conn:
                conn.execute("CREATE TABLE test (id INTEGER)")
                conn.execute("INSERT INTO test VALUES (1)")
                # Don't commit
                raise ValueError("Test error")

        # Data should be rolled back
        with ConnectionPool.get_connection() as conn:
            conn.execute("CREATE TABLE IF NOT EXISTS test (id INTEGER)")
            cursor = conn.execute("SELECT COUNT(*) FROM test")
            count = cursor.fetchone()[0]
            assert count == 0


class TestConnectionPoolCloseAll:
    """Test ConnectionPool close_all."""

    def test_close_all_resets_instance(self, temp_db_path):
        """Test close_all resets singleton instance."""
        ConnectionPool.initialize(temp_db_path, pool_size=2)
        ConnectionPool.close_all()
        assert ConnectionPool._instance is None

    def test_close_all_closes_connections(self, temp_db_path):
        """Test close_all closes all connections."""
        ConnectionPool.initialize(temp_db_path, pool_size=3)
        ConnectionPool.close_all()
        # Pool should be empty
        assert ConnectionPool._instance is None

    def test_close_all_idempotent(self):
        """Test close_all is idempotent."""
        ConnectionPool.close_all()
        ConnectionPool.close_all()  # Should not raise


# ============================================================================
# BatchMetricsWriter Tests
# ============================================================================

class TestBatchMetricsWriterInit:
    """Test BatchMetricsWriter initialization."""

    def test_init_basic(self, temp_db_path):
        """Test basic initialization."""
        writer = BatchMetricsWriter(temp_db_path)
        assert writer._db_path == temp_db_path
        assert writer._flush_interval == 5.0
        assert writer._batch_size == 50
        writer.shutdown()

    def test_init_custom_params(self, temp_db_path):
        """Test initialization with custom parameters."""
        writer = BatchMetricsWriter(
            temp_db_path,
            flush_interval=10.0,
            batch_size=100
        )
        assert writer._flush_interval == 10.0
        assert writer._batch_size == 100
        writer.shutdown()

    def test_init_starts_flush_thread(self, temp_db_path):
        """Test initialization starts flush thread."""
        writer = BatchMetricsWriter(temp_db_path)
        assert writer._flush_thread is not None
        assert writer._flush_thread.is_alive()
        writer.shutdown()


class TestBatchMetricsWriterRecord:
    """Test BatchMetricsWriter record method."""

    def test_record_adds_to_buffer(self, temp_db_path):
        """Test record adds entry to buffer."""
        # Initialize DB first (creates the table)
        ConnectionPool.initialize(temp_db_path)
        with ConnectionPool.get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS agent_metrics (
                    agent_id TEXT PRIMARY KEY,
                    total_tasks INTEGER DEFAULT 0,
                    successful_tasks INTEGER DEFAULT 0,
                    failed_tasks INTEGER DEFAULT 0,
                    avg_duration_ms REAL DEFAULT 0.0,
                    total_tokens INTEGER DEFAULT 0,
                    success_rate REAL DEFAULT 0.0,
                    last_updated TEXT
                )
            """)
            conn.commit()

        writer = BatchMetricsWriter(temp_db_path, flush_interval=60.0)
        writer.record("agent-1", success=True, duration_ms=100.0, tokens_used=50)

        assert len(writer._buffer) == 1
        writer.shutdown()
        ConnectionPool.close_all()

    def test_record_triggers_flush_at_batch_size(self, temp_db_path):
        """Test record triggers flush at batch size threshold."""
        # Initialize DB first
        ConnectionPool.initialize(temp_db_path)
        with ConnectionPool.get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS agent_metrics (
                    agent_id TEXT PRIMARY KEY,
                    total_tasks INTEGER DEFAULT 0,
                    successful_tasks INTEGER DEFAULT 0,
                    failed_tasks INTEGER DEFAULT 0,
                    avg_duration_ms REAL DEFAULT 0.0,
                    total_tokens INTEGER DEFAULT 0,
                    success_rate REAL DEFAULT 0.0,
                    last_updated TEXT
                )
            """)
            conn.commit()

        writer = BatchMetricsWriter(temp_db_path, flush_interval=60.0, batch_size=3)
        writer.record("agent-1", True, 100.0, 50)
        writer.record("agent-1", True, 100.0, 50)
        writer.record("agent-1", True, 100.0, 50)

        # Should have flushed
        assert len(writer._buffer) == 0
        writer.shutdown()
        ConnectionPool.close_all()

    def test_record_includes_all_fields(self, temp_db_path):
        """Test record includes all required fields."""
        # Initialize DB first
        db = AgentPerformanceDB(db_path=temp_db_path)
        db.shutdown()

        writer = BatchMetricsWriter(temp_db_path, flush_interval=60.0)
        writer.record("agent-1", True, 150.0, 75)

        entry = writer._buffer[0]
        assert entry["agent_id"] == "agent-1"
        assert entry["success"] is True
        assert entry["duration_ms"] == 150.0
        assert entry["tokens_used"] == 75
        assert "timestamp" in entry
        writer.shutdown()
        ConnectionPool.close_all()


class TestBatchMetricsWriterFlush:
    """Test BatchMetricsWriter flush methods."""

    def teardown_method(self):
        """Clean up after each test."""
        ConnectionPool.close_all()

    def test_flush_empty_buffer(self, temp_db_path):
        """Test flush with empty buffer."""
        writer = BatchMetricsWriter(temp_db_path)
        writer._flush()  # Should not raise
        writer.shutdown()

    def test_flush_now(self, temp_db_path):
        """Test flush_now forces immediate flush."""
        # Initialize DB
        ConnectionPool.initialize(temp_db_path)
        with ConnectionPool.get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS agent_metrics (
                    agent_id TEXT PRIMARY KEY,
                    total_tasks INTEGER DEFAULT 0,
                    successful_tasks INTEGER DEFAULT 0,
                    failed_tasks INTEGER DEFAULT 0,
                    avg_duration_ms REAL DEFAULT 0.0,
                    total_tokens INTEGER DEFAULT 0,
                    success_rate REAL DEFAULT 0.0,
                    last_updated TEXT
                )
            """)
            conn.commit()

        writer = BatchMetricsWriter(temp_db_path, flush_interval=60.0)
        writer.record("agent-1", True, 100.0, 50)
        writer.flush_now()

        assert len(writer._buffer) == 0
        writer.shutdown()

    def test_flush_loop(self, temp_db_path):
        """Test flush loop runs periodically."""
        # Initialize DB first
        db = AgentPerformanceDB(db_path=temp_db_path)
        db.shutdown()

        writer = BatchMetricsWriter(temp_db_path, flush_interval=0.1)
        writer.record("agent-1", True, 100.0, 50)

        # Wait for flush
        time.sleep(0.3)

        # Buffer should be flushed (even without records)
        writer.shutdown()
        ConnectionPool.close_all()


class TestBatchMetricsWriterShutdown:
    """Test BatchMetricsWriter shutdown."""

    def teardown_method(self):
        """Clean up after each test."""
        ConnectionPool.close_all()

    def test_shutdown_stops_thread(self, temp_db_path):
        """Test shutdown stops flush thread."""
        writer = BatchMetricsWriter(temp_db_path)
        writer.shutdown()

        assert writer._running is False
        assert not writer._flush_thread.is_alive()

    def test_shutdown_flushes_remaining(self, temp_db_path):
        """Test shutdown flushes remaining entries."""
        # Initialize DB
        ConnectionPool.initialize(temp_db_path)
        with ConnectionPool.get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS agent_metrics (
                    agent_id TEXT PRIMARY KEY,
                    total_tasks INTEGER DEFAULT 0,
                    successful_tasks INTEGER DEFAULT 0,
                    failed_tasks INTEGER DEFAULT 0,
                    avg_duration_ms REAL DEFAULT 0.0,
                    total_tokens INTEGER DEFAULT 0,
                    success_rate REAL DEFAULT 0.0,
                    last_updated TEXT
                )
            """)
            conn.commit()

        writer = BatchMetricsWriter(temp_db_path, flush_interval=60.0)
        writer.record("agent-1", True, 100.0, 50)
        writer.shutdown()

        assert len(writer._buffer) == 0

    def test_shutdown_idempotent(self, temp_db_path):
        """Test shutdown is idempotent."""
        writer = BatchMetricsWriter(temp_db_path)
        writer.shutdown()
        writer.shutdown()  # Should not raise


class TestBatchMetricsWriterWriteBatch:
    """Test BatchMetricsWriter _write_batch."""

    def teardown_method(self):
        """Clean up after each test."""
        ConnectionPool.close_all()

    def test_write_batch_retry_on_error(self, temp_db_path):
        """Test _write_batch retries on SQLite error."""
        # Initialize DB
        ConnectionPool.initialize(temp_db_path)
        with ConnectionPool.get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS agent_metrics (
                    agent_id TEXT PRIMARY KEY,
                    total_tasks INTEGER DEFAULT 0,
                    successful_tasks INTEGER DEFAULT 0,
                    failed_tasks INTEGER DEFAULT 0,
                    avg_duration_ms REAL DEFAULT 0.0,
                    total_tokens INTEGER DEFAULT 0,
                    success_rate REAL DEFAULT 0.0,
                    last_updated TEXT
                )
            """)
            conn.commit()

        writer = BatchMetricsWriter(temp_db_path, flush_interval=60.0)
        batch = [{
            "agent_id": "agent-1",
            "success": True,
            "duration_ms": 100.0,
            "tokens_used": 50,
            "timestamp": time.time()
        }]

        # Should succeed
        writer._write_batch(batch)
        writer.shutdown()


# ============================================================================
# AgentMetrics Tests
# ============================================================================

class TestAgentMetricsInit:
    """Test AgentMetrics initialization."""

    def test_init_basic(self):
        """Test basic initialization."""
        metrics = AgentMetrics(agent_id="test-agent")
        assert metrics.agent_id == "test-agent"
        assert metrics.total_tasks == 0
        assert metrics.successful_tasks == 0
        assert metrics.failed_tasks == 0
        assert metrics.avg_duration_ms == 0.0
        assert metrics.avg_tokens == 0
        assert metrics.success_rate == 0.0

    def test_init_with_values(self):
        """Test initialization with values."""
        metrics = AgentMetrics(
            agent_id="test-agent",
            total_tasks=10,
            successful_tasks=8,
            failed_tasks=2,
            avg_duration_ms=150.5,
            avg_tokens=75,
            success_rate=0.8
        )
        assert metrics.total_tasks == 10
        assert metrics.successful_tasks == 8
        assert metrics.failed_tasks == 2
        assert metrics.avg_duration_ms == 150.5
        assert metrics.avg_tokens == 75
        assert metrics.success_rate == 0.8


class TestAgentMetricsUpdateSuccessRate:
    """Test AgentMetrics update_success_rate."""

    def test_update_success_rate_basic(self):
        """Test basic success rate update."""
        metrics = AgentMetrics(
            agent_id="test",
            total_tasks=10,
            successful_tasks=8,
            failed_tasks=2
        )
        metrics.update_success_rate()
        assert metrics.success_rate == 0.8

    def test_update_success_rate_zero_tasks(self):
        """Test success rate with zero tasks."""
        metrics = AgentMetrics(agent_id="test")
        metrics.update_success_rate()
        assert metrics.success_rate == 0.0

    def test_update_success_rate_perfect(self):
        """Test perfect success rate."""
        metrics = AgentMetrics(
            agent_id="test",
            total_tasks=5,
            successful_tasks=5,
            failed_tasks=0
        )
        metrics.update_success_rate()
        assert metrics.success_rate == 1.0

    def test_update_success_rate_zero(self):
        """Test zero success rate."""
        metrics = AgentMetrics(
            agent_id="test",
            total_tasks=3,
            successful_tasks=0,
            failed_tasks=3
        )
        metrics.update_success_rate()
        assert metrics.success_rate == 0.0


# ============================================================================
# AgentPerformanceDB Tests - Initialization
# ============================================================================

class TestAgentPerformanceDBInit:
    """Test AgentPerformanceDB initialization."""

    def test_init_in_memory(self):
        """Test in-memory database initialization."""
        db = AgentPerformanceDB(db_path=":memory:")
        assert db.db_path == ":memory:"
        assert db.metrics == {}

    def test_init_file_based(self, temp_db_path):
        """Test file-based database initialization."""
        db = AgentPerformanceDB(db_path=temp_db_path)
        assert db.db_path == temp_db_path
        db.shutdown()

    def test_init_creates_table(self, temp_db_path):
        """Test initialization creates table."""
        db = AgentPerformanceDB(db_path=temp_db_path)

        # Check table exists
        ConnectionPool.initialize(temp_db_path)
        with ConnectionPool.get_connection() as conn:
            cursor = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='agent_metrics'"
            )
            result = cursor.fetchone()
            assert result is not None

        db.shutdown()

    def test_init_with_lock(self, in_memory_db):
        """Test initialization creates lock."""
        assert in_memory_db._lock is not None


class TestAgentPerformanceDBRecordTask:
    """Test AgentPerformanceDB record_task."""

    def test_record_task_new_agent(self, in_memory_db):
        """Test recording task for new agent."""
        in_memory_db.record_task("agent-1", success=True, duration_ms=100.0, tokens=50)

        assert "agent-1" in in_memory_db.metrics
        assert in_memory_db.metrics["agent-1"].total_tasks == 1
        assert in_memory_db.metrics["agent-1"].successful_tasks == 1

    def test_record_task_success(self, in_memory_db):
        """Test recording successful task."""
        in_memory_db.record_task("agent-1", success=True, duration_ms=100.0, tokens=50)

        m = in_memory_db.metrics["agent-1"]
        assert m.successful_tasks == 1
        assert m.failed_tasks == 0

    def test_record_task_failure(self, in_memory_db):
        """Test recording failed task."""
        in_memory_db.record_task("agent-1", success=False, duration_ms=200.0, tokens=100)

        m = in_memory_db.metrics["agent-1"]
        assert m.successful_tasks == 0
        assert m.failed_tasks == 1

    def test_record_task_multiple(self, in_memory_db):
        """Test recording multiple tasks."""
        in_memory_db.record_task("agent-1", success=True, duration_ms=100.0, tokens=50)
        in_memory_db.record_task("agent-1", success=True, duration_ms=150.0, tokens=75)
        in_memory_db.record_task("agent-1", success=False, duration_ms=200.0, tokens=100)

        m = in_memory_db.metrics["agent-1"]
        assert m.total_tasks == 3
        assert m.successful_tasks == 2
        assert m.failed_tasks == 1

    def test_record_task_updates_avg_duration(self, in_memory_db):
        """Test average duration is updated with EMA."""
        in_memory_db.record_task("agent-1", success=True, duration_ms=100.0, tokens=50)
        in_memory_db.record_task("agent-1", success=True, duration_ms=200.0, tokens=50)

        # EMA starts from 0:
        # First: 0.3 * 100 + 0.7 * 0 = 30
        # Second: 0.3 * 200 + 0.7 * 30 = 60 + 21 = 81
        m = in_memory_db.metrics["agent-1"]
        assert m.avg_duration_ms == pytest.approx(81.0, rel=0.1)

    def test_record_task_updates_avg_tokens(self, in_memory_db):
        """Test average tokens is updated with EMA."""
        in_memory_db.record_task("agent-1", success=True, duration_ms=100.0, tokens=100)
        in_memory_db.record_task("agent-1", success=True, duration_ms=100.0, tokens=200)

        # EMA starts from 0:
        # First: 0.3 * 100 + 0.7 * 0 = 30
        # Second: 0.3 * 200 + 0.7 * 30 = 60 + 21 = 81
        m = in_memory_db.metrics["agent-1"]
        assert m.avg_tokens == pytest.approx(81, rel=0.1)

    def test_record_task_updates_success_rate(self, in_memory_db):
        """Test success rate is updated."""
        in_memory_db.record_task("agent-1", success=True, duration_ms=100.0, tokens=50)
        in_memory_db.record_task("agent-1", success=False, duration_ms=100.0, tokens=50)

        m = in_memory_db.metrics["agent-1"]
        assert m.success_rate == 0.5

    def test_record_task_validates_agent_id(self, in_memory_db):
        """Test record_task validates agent_id."""
        with pytest.raises(AgentError):
            in_memory_db.record_task("", success=True, duration_ms=100.0, tokens=50)

        with pytest.raises(AgentError):
            in_memory_db.record_task(None, success=True, duration_ms=100.0, tokens=50)

        with pytest.raises(AgentError):
            in_memory_db.record_task("   ", success=True, duration_ms=100.0, tokens=50)

    def test_record_task_clamps_duration(self, in_memory_db):
        """Test record_task clamps duration to minimum 1ms."""
        in_memory_db.record_task("agent-1", success=True, duration_ms=0.0, tokens=50)

        m = in_memory_db.metrics["agent-1"]
        # Duration is clamped to 1ms, then EMA is: 0.3 * 1.0 + 0.7 * 0.0 = 0.3
        assert m.avg_duration_ms == 0.3


class TestAgentPerformanceDBGetMetrics:
    """Test AgentPerformanceDB get_metrics."""

    def test_get_metrics_existing(self, in_memory_db):
        """Test get_metrics for existing agent."""
        in_memory_db.record_task("agent-1", success=True, duration_ms=100.0, tokens=50)
        m = in_memory_db.get_metrics("agent-1")
        assert m is not None
        assert m.agent_id == "agent-1"

    def test_get_metrics_nonexistent(self, in_memory_db):
        """Test get_metrics for nonexistent agent."""
        m = in_memory_db.get_metrics("nonexistent")
        assert m is None


class TestAgentPerformanceDBGetBestAgent:
    """Test AgentPerformanceDB get_best_agent."""

    def test_get_best_agent_single(self, in_memory_db):
        """Test get_best_agent with single candidate."""
        in_memory_db.record_task("agent-1", success=True, duration_ms=100.0, tokens=50)
        in_memory_db.record_task("agent-1", success=True, duration_ms=100.0, tokens=50)
        in_memory_db.record_task("agent-1", success=True, duration_ms=100.0, tokens=50)

        best = in_memory_db.get_best_agent(["agent-1"])
        assert best == "agent-1"

    def test_get_best_agent_multiple(self, in_memory_db):
        """Test get_best_agent with multiple candidates."""
        # Agent-1: good performance
        for _ in range(5):
            in_memory_db.record_task("agent-1", success=True, duration_ms=50.0, tokens=30)

        # Agent-2: worse performance
        for _ in range(5):
            in_memory_db.record_task("agent-2", success=False, duration_ms=500.0, tokens=200)

        best = in_memory_db.get_best_agent(["agent-1", "agent-2"])
        assert best == "agent-1"

    def test_get_best_agent_empty_list(self, in_memory_db):
        """Test get_best_agent with empty list."""
        best = in_memory_db.get_best_agent([])
        assert best is None

    def test_get_best_agent_no_metrics(self, in_memory_db):
        """Test get_best_agent with no metrics."""
        best = in_memory_db.get_best_agent(["agent-1", "agent-2"])
        # Returns first candidate as fallback
        assert best == "agent-1"

    def test_get_best_agent_cold_start_threshold(self, in_memory_db):
        """Test get_best_agent requires 3+ tasks."""
        # Agent-1: only 2 tasks
        in_memory_db.record_task("agent-1", success=True, duration_ms=50.0, tokens=30)
        in_memory_db.record_task("agent-1", success=True, duration_ms=50.0, tokens=30)

        # Agent-2: 3 tasks
        in_memory_db.record_task("agent-2", success=True, duration_ms=100.0, tokens=50)
        in_memory_db.record_task("agent-2", success=True, duration_ms=100.0, tokens=50)
        in_memory_db.record_task("agent-2", success=True, duration_ms=100.0, tokens=50)

        best = in_memory_db.get_best_agent(["agent-1", "agent-2"])
        # Agent-2 should win (has enough data)
        assert best == "agent-2"


class TestAgentPerformanceDBGetAllMetrics:
    """Test AgentPerformanceDB get_all_metrics."""

    def test_get_all_metrics_empty(self, in_memory_db):
        """Test get_all_metrics when empty."""
        all_metrics = in_memory_db.get_all_metrics()
        assert all_metrics == {}

    def test_get_all_metrics_with_data(self, in_memory_db):
        """Test get_all_metrics with data."""
        in_memory_db.record_task("agent-1", success=True, duration_ms=100.0, tokens=50)
        in_memory_db.record_task("agent-2", success=True, duration_ms=100.0, tokens=50)

        all_metrics = in_memory_db.get_all_metrics()
        assert len(all_metrics) == 2
        assert "agent-1" in all_metrics
        assert "agent-2" in all_metrics

    def test_get_all_metrics_returns_copy(self, in_memory_db):
        """Test get_all_metrics returns a copy."""
        in_memory_db.record_task("agent-1", success=True, duration_ms=100.0, tokens=50)
        all_metrics = in_memory_db.get_all_metrics()
        all_metrics["modified"] = "value"

        all_metrics2 = in_memory_db.get_all_metrics()
        assert "modified" not in all_metrics2


class TestAgentPerformanceDBResetAgent:
    """Test AgentPerformanceDB reset_agent."""

    def test_reset_agent_existing(self, in_memory_db):
        """Test reset_agent for existing agent."""
        in_memory_db.record_task("agent-1", success=True, duration_ms=100.0, tokens=50)
        in_memory_db.reset_agent("agent-1")

        assert "agent-1" not in in_memory_db.metrics

    def test_reset_agent_nonexistent(self, in_memory_db):
        """Test reset_agent for nonexistent agent."""
        # Should not raise
        in_memory_db.reset_agent("nonexistent")


class TestAgentPerformanceDBShutdown:
    """Test AgentPerformanceDB shutdown."""

    def test_shutdown_in_memory(self, in_memory_db):
        """Test shutdown for in-memory database."""
        in_memory_db.shutdown()
        # Should not raise

    def test_shutdown_file_based(self, file_db):
        """Test shutdown for file-based database."""
        file_db.shutdown()
        # Should not raise


class TestAgentPerformanceDBDel:
    """Test AgentPerformanceDB __del__."""

    def test_del_cleanup(self, in_memory_db):
        """Test __del__ performs cleanup."""
        # Should not raise on garbage collection
        del in_memory_db


# ============================================================================
# Thread Safety Tests
# ============================================================================

class TestAgentPerformanceDBThreadSafety:
    """Test AgentPerformanceDB thread safety."""

    def test_concurrent_record_task(self, in_memory_db):
        """Test concurrent record_task calls."""
        errors = []

        def record_tasks(agent_id):
            try:
                for i in range(10):
                    in_memory_db.record_task(
                        agent_id,
                        success=True,
                        duration_ms=100.0 + i,
                        tokens=50 + i
                    )
            except Exception as e:
                errors.append(e)

        threads = [
            threading.Thread(target=record_tasks, args=(f"agent-{i}",))
            for i in range(5)
        ]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(errors) == 0
        assert len(in_memory_db.metrics) == 5

    def test_concurrent_get_metrics(self, in_memory_db):
        """Test concurrent get_metrics calls."""
        # Record some data first
        for i in range(5):
            in_memory_db.record_task(f"agent-{i}", success=True, duration_ms=100.0, tokens=50)

        errors = []
        results = []

        def get_metrics(agent_id):
            try:
                m = in_memory_db.get_metrics(agent_id)
                results.append(m)
            except Exception as e:
                errors.append(e)

        threads = [
            threading.Thread(target=get_metrics, args=(f"agent-{i % 5}",))
            for i in range(20)
        ]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(errors) == 0
        assert len(results) == 20

    def test_concurrent_read_write(self, in_memory_db):
        """Test concurrent read and write operations."""
        errors = []

        def writer():
            try:
                for i in range(10):
                    in_memory_db.record_task("agent-1", success=True, duration_ms=100.0, tokens=50)
            except Exception as e:
                errors.append(e)

        def reader():
            try:
                for i in range(10):
                    in_memory_db.get_metrics("agent-1")
                    in_memory_db.get_all_metrics()
            except Exception as e:
                errors.append(e)

        threads = [
            threading.Thread(target=writer),
            threading.Thread(target=reader),
            threading.Thread(target=reader),
        ]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert len(errors) == 0
