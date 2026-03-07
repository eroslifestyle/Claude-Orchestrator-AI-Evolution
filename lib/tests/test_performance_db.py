"""Test suite per Agent Performance Database."""

import pytest
import threading
import time
import tempfile
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from lib.agent_performance import ConnectionPool, BatchMetricsWriter, AgentPerformanceDB


class TestConnectionPool:
    """Test per ConnectionPool thread-safety."""

    def test_concurrent_connections(self):
        """Verifica thread-safety con connessioni concorrenti."""
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = str(Path(tmpdir) / "test.db")
            ConnectionPool.initialize(db_path, pool_size=3)

            results = []
            errors = []

            def worker(worker_id):
                try:
                    with ConnectionPool.get_connection(timeout=5.0) as conn:
                        conn.execute("CREATE TABLE IF NOT EXISTS test (id INTEGER)")
                        conn.execute("INSERT INTO test VALUES (?)", (worker_id,))
                        conn.commit()
                        cursor = conn.execute("SELECT COUNT(*) FROM test")
                        results.append(cursor.fetchone()[0])
                except Exception as e:
                    errors.append(str(e))

            threads = [threading.Thread(target=worker, args=(i,)) for i in range(10)]
            for t in threads:
                t.start()
            for t in threads:
                t.join()

            assert len(errors) == 0
            assert len(results) == 10

            ConnectionPool.close_all()

    def test_connection_timeout(self):
        """Verifica timeout quando pool esaurito."""
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = str(Path(tmpdir) / "test_timeout.db")
            ConnectionPool.initialize(db_path, pool_size=1)

            ctx1 = ConnectionPool.get_connection()
            conn1 = ctx1.__enter__()

            try:
                with ConnectionPool.get_connection(timeout=0.5) as conn2:
                    pass
                assert False, "Should have timed out"
            except Exception:
                pass

            ctx1.__exit__(None, None, None)
            ConnectionPool.close_all()


class TestBatchMetricsWriter:
    """Test per BatchMetricsWriter."""

    def test_batch_write_correctness(self):
        """Verifica batch write."""
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = str(Path(tmpdir) / "test_batch.db")

            # Usa AgentPerformanceDB per inizializzare le tabelle
            db = AgentPerformanceDB(db_path=db_path)

            for i in range(5):
                db.record_task(f"agent_{i % 2}", success=True, duration_ms=100.0 + i, tokens=50)

            time.sleep(0.5)

            # Flush esplicito
            if db._batch_writer:
                db._batch_writer.flush_now()

            # Verifica dati scritti
            ConnectionPool.initialize(db_path)
            with ConnectionPool.get_connection() as conn:
                cursor = conn.execute("SELECT COUNT(DISTINCT agent_id) FROM agent_metrics")
                count = cursor.fetchone()[0]
                assert count == 2

            db.shutdown()


class TestPerformanceIndex:
    """Test per performance indexes."""

    def test_query_performance(self):
        """Verifica query veloce."""
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = str(Path(tmpdir) / "test_perf.db")
            db = AgentPerformanceDB(db_path=db_path)

            for i in range(100):
                db.record_task(f"agent_{i}", success=i % 2 == 0, duration_ms=100.0 + i, tokens=50)

            if db._batch_writer:
                db._batch_writer.flush_now()

            start = time.perf_counter()
            best = db.get_best_agent([f"agent_{i}" for i in range(100)])
            elapsed = time.perf_counter() - start

            assert elapsed < 0.05, f"Query too slow: {elapsed*1000:.2f}ms"

            db.shutdown()


class TestAgentPerformanceDB:
    """Test per AgentPerformanceDB completo."""

    def test_record_and_get_best(self):
        """Test record e get best."""
        with tempfile.TemporaryDirectory() as tmpdir:
            db_path = str(Path(tmpdir) / "test_full.db")
            db = AgentPerformanceDB(db_path=db_path)

            for i in range(20):
                db.record_task("good_agent", success=True, duration_ms=50.0, tokens=100)
                db.record_task("slow_agent", success=True, duration_ms=200.0, tokens=100)
                db.record_task("bad_agent", success=False, duration_ms=100.0, tokens=100)

            if db._batch_writer:
                db._batch_writer.flush_now()

            best = db.get_best_agent(["good_agent", "slow_agent", "bad_agent"])
            assert best == "good_agent"

            db.shutdown()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
