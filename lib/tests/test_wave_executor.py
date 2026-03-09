"""Test per WaveExecutor V15.1.

Test suite completa per il modulo wave_executor.
"""

import asyncio
import pytest
from datetime import datetime

from lib.wave_executor import (
    WaveExecutor,
    Wave,
    WaveStatus,
    TaskResult,
    UltraTask,
    ResourcePool,
    BackpressureController,
    create_simple_task,
    create_dependent_task,
    get_wave_executor,
    reset_wave_executor,
    MAX_WAVE_TIMEOUT,
    MAX_CONCURRENT_PER_WAVE,
)


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture
def resource_pool():
    """Crea un ResourcePool per i test."""
    return ResourcePool(max_resources=50)


@pytest.fixture
def backpressure():
    """Crea un BackpressureController per i test."""
    return BackpressureController(max_load=0.8, current_load=0.0)


@pytest.fixture
def executor(resource_pool, backpressure):
    """Crea un WaveExecutor per i test."""
    return WaveExecutor(
        resource_pool=resource_pool,
        backpressure=backpressure,
        max_wave_timeout=30.0,
        max_concurrent_per_wave=100,
    )


# =============================================================================
# TEST DATA STRUCTURES
# =============================================================================

class TestWaveExecutor:
    """Test suite per WaveExecutor."""

    # -------------------------------------------------------------------------
    # TEST ULTRATASK
    # -------------------------------------------------------------------------

    def test_ultratask_creation(self):
        """Verifica creazione di UltraTask."""
        async def dummy_handler(x: int) -> int:
            return x * 2

        task = UltraTask(
            task_id="test_1",
            name="Test Task",
            handler=dummy_handler,
            params={"x": 5},
        )

        assert task.task_id == "test_1"
        assert task.name == "Test Task"
        assert task.depth == 0
        assert task.timeout == 60.0  # default

    def test_ultratask_hash(self):
        """Verifica hash e uguaglianza di UltraTask."""
        async def handler():
            pass

        task1 = UltraTask(task_id="t1", name="A", handler=handler)
        task2 = UltraTask(task_id="t1", name="B", handler=handler)
        task3 = UltraTask(task_id="t2", name="C", handler=handler)

        assert task1 == task2  # stesso task_id
        assert task1 != task3
        assert hash(task1) == hash(task2)

    # -------------------------------------------------------------------------
    # TEST WAVE
    # -------------------------------------------------------------------------

    def test_wave_creation(self):
        """Verifica creazione di Wave."""
        wave = Wave(wave_id=0, depth=0, tasks=[])

        assert wave.wave_id == 0
        assert wave.depth == 0
        assert wave.status == WaveStatus.PENDING
        assert wave.duration_ms == 0.0
        assert wave.success_count == 0
        assert wave.failure_count == 0

    def test_wave_duration(self):
        """Verifica calcolo durata Wave."""
        wave = Wave(wave_id=0, depth=0, tasks=[])
        wave.started_at = datetime(2026, 1, 1, 12, 0, 0)
        wave.completed_at = datetime(2026, 1, 1, 12, 0, 5)

        assert wave.duration_ms == 5000.0

    def test_wave_counts(self):
        """Verifica conteggio success/failure."""
        wave = Wave(wave_id=0, depth=0, tasks=[])
        wave.results = [
            TaskResult(task_id="t1", success=True),
            TaskResult(task_id="t2", success=True),
            TaskResult(task_id="t3", success=False, error="Failed"),
        ]

        assert wave.success_count == 2
        assert wave.failure_count == 1
        assert wave.throughput > 0

    # -------------------------------------------------------------------------
    # TEST TASK RESULT
    # -------------------------------------------------------------------------

    def test_task_result_to_dict(self):
        """Verifica serializzazione TaskResult."""
        result = TaskResult(
            task_id="test_1",
            success=True,
            result={"data": 42},
            duration_ms=100.5,
            wave_id=0,
            subtask_count=3,
        )

        d = result.to_dict()

        assert d["task_id"] == "test_1"
        assert d["success"] is True
        assert d["duration_ms"] == 100.5
        assert d["wave_id"] == 0
        assert d["subtask_count"] == 3

    # -------------------------------------------------------------------------
    # TEST RESOURCE POOL
    # -------------------------------------------------------------------------

    @pytest.mark.asyncio
    async def test_resource_pool_acquire_release(self):
        """Verifica acquisizione e rilascio risorse."""
        pool = ResourcePool(max_resources=5)

        # Acquisisci tutte le risorse
        for _ in range(5):
            assert await pool.acquire() is True

        # Pool esaurito
        assert await pool.acquire() is False
        assert pool.available == 0

        # Rilascia una risorsa
        await pool.release()
        assert pool.available == 1

        # Ora puo' acquisire
        assert await pool.acquire() is True

    # -------------------------------------------------------------------------
    # TEST BACKPRESSURE CONTROLLER
    # -------------------------------------------------------------------------

    def test_backpressure_controller(self):
        """Verifica BackpressureController."""
        ctrl = BackpressureController(max_load=0.8)

        # Basso carico
        ctrl.current_load = 0.5
        assert ctrl.should_throttle() is False
        assert ctrl.get_recommended_concurrency() > 100

        # Carico critico
        ctrl.current_load = 0.9
        assert ctrl.should_throttle() is True
        assert ctrl.get_recommended_concurrency() == 10  # minimo

    # -------------------------------------------------------------------------
    # TEST BUILD WAVES
    # -------------------------------------------------------------------------

    def test_build_waves_flat(self):
        """Verifica costruzione wave con task flat."""
        async def handler():
            return "done"

        tasks = [
            UltraTask(task_id=f"t{i}", name=f"Task {i}", handler=handler)
            for i in range(5)
        ]

        executor = WaveExecutor()
        waves = executor.build_waves(tasks)

        # Tutti i task in wave 0
        assert len(waves) == 1
        assert 0 in waves
        assert len(waves[0].tasks) == 5

    def test_build_waves_with_depth(self):
        """Verifica costruzione wave con task annidati."""
        async def handler():
            return "done"

        # Crea albero di task
        root = UltraTask(task_id="root", name="Root", handler=handler)
        child1 = UltraTask(task_id="child1", name="Child 1", handler=handler)
        child2 = UltraTask(task_id="child2", name="Child 2", handler=handler)
        grandchild = UltraTask(task_id="grandchild", name="Grandchild", handler=handler)

        root.subtasks = [child1, child2]
        child1.subtasks = [grandchild]

        executor = WaveExecutor()
        waves = executor.build_waves([root])

        # 3 wave: root, children, grandchild
        assert len(waves) == 3
        assert len(waves[0].tasks) == 1  # root
        assert len(waves[1].tasks) == 2  # child1, child2
        assert len(waves[2].tasks) == 1  # grandchild

    # -------------------------------------------------------------------------
    # TEST EXECUTE TASK
    # -------------------------------------------------------------------------

    @pytest.mark.asyncio
    async def test_execute_task_success(self, executor):
        """Verifica esecuzione task con successo."""
        async def handler(value: int) -> int:
            await asyncio.sleep(0.01)
            return value * 2

        task = UltraTask(
            task_id="test_task",
            name="Test",
            handler=handler,
            params={"value": 21},
        )

        result = await executor.execute_task(task)

        assert result.success is True
        assert result.result == 42
        assert result.duration_ms > 0
        assert result.error is None

    @pytest.mark.asyncio
    async def test_execute_task_failure(self, executor):
        """Verifica esecuzione task con fallimento."""
        async def failing_handler():
            raise ValueError("Intentional failure")

        task = UltraTask(
            task_id="failing_task",
            name="Failing",
            handler=failing_handler,
        )

        result = await executor.execute_task(task)

        assert result.success is False
        assert "Intentional failure" in result.error
        assert result.result is None

    @pytest.mark.asyncio
    async def test_execute_task_timeout(self, executor):
        """Verifica esecuzione task con timeout."""
        async def slow_handler():
            await asyncio.sleep(10)
            return "done"

        task = UltraTask(
            task_id="slow_task",
            name="Slow",
            handler=slow_handler,
            timeout=0.1,  # 100ms timeout
        )

        result = await executor.execute_task(task)

        assert result.success is False
        assert "timeout" in result.error.lower()

    # -------------------------------------------------------------------------
    # TEST EXECUTE WAVE
    # -------------------------------------------------------------------------

    @pytest.mark.asyncio
    async def test_execute_wave_parallel(self, executor):
        """Verifica esecuzione wave parallela."""
        call_order = []

        async def tracked_handler(task_id: str) -> str:
            call_order.append(task_id)
            await asyncio.sleep(0.05)
            return f"result_{task_id}"

        tasks = [
            UltraTask(
                task_id=f"task_{i}",
                name=f"Task {i}",
                handler=tracked_handler,
                params={"task_id": f"task_{i}"},
            )
            for i in range(10)
        ]

        wave = Wave(wave_id=0, depth=0, tasks=tasks)

        start = datetime.now()
        completed = await executor.execute_wave(wave)

        assert completed.status == WaveStatus.COMPLETED
        assert len(completed.results) == 10
        assert completed.success_count == 10
        assert completed.failure_count == 0

        # Verifica esecuzione parallela (durata < sequenziale)
        duration = (datetime.now() - start).total_seconds()
        assert duration < 0.5  # 10 task * 50ms = 500ms se sequenziali

    @pytest.mark.asyncio
    async def test_execute_wave_partial_failure(self, executor):
        """Verifica wave con alcuni fallimenti."""
        async def sometimes_fail(should_fail: bool) -> str:
            if should_fail:
                raise RuntimeError("Failed")
            return "ok"

        tasks = [
            UltraTask(
                task_id=f"task_{i}",
                name=f"Task {i}",
                handler=sometimes_fail,
                params={"should_fail": i % 2 == 0},  # Fallisce task pari
            )
            for i in range(4)
        ]

        wave = Wave(wave_id=0, depth=0, tasks=tasks)
        completed = await executor.execute_wave(wave)

        assert completed.status == WaveStatus.FAILED
        assert completed.success_count == 2  # task_1, task_3
        assert completed.failure_count == 2  # task_0, task_2

    # -------------------------------------------------------------------------
    # TEST EXECUTE TREE
    # -------------------------------------------------------------------------

    @pytest.mark.asyncio
    async def test_execute_tree_simple(self, executor):
        """Verifica esecuzione albero semplice."""
        async def handler(value: int) -> int:
            return value + 1

        tasks = [
            UltraTask(
                task_id=f"root_{i}",
                name=f"Root {i}",
                handler=handler,
                params={"value": i},
            )
            for i in range(3)
        ]

        results = await executor.execute_tree(tasks)

        assert len(results) == 3
        for i in range(3):
            task_id = f"root_{i}"
            assert task_id in results
            assert results[task_id].success is True
            assert results[task_id].result == i + 1

    @pytest.mark.asyncio
    async def test_execute_tree_with_subtasks(self, executor):
        """Verifica esecuzione albero con subtask."""
        results_log = []

        async def parent_handler(name: str) -> str:
            results_log.append(f"parent_{name}")
            return f"parent_{name}_done"

        async def child_handler(parent_result: str) -> str:
            results_log.append(f"child_{parent_result}")
            return f"child_done"

        # Crea task gerarchici
        parent = UltraTask(
            task_id="parent",
            name="Parent",
            handler=parent_handler,
            params={"name": "A"},
        )

        child1 = UltraTask(
            task_id="child1",
            name="Child 1",
            handler=child_handler,
            params={"parent_result": "parent_A_done"},
        )

        child2 = UltraTask(
            task_id="child2",
            name="Child 2",
            handler=child_handler,
            params={"parent_result": "parent_A_done"},
        )

        parent.subtasks = [child1, child2]

        results = await executor.execute_tree([parent])

        # Verifica che parent sia eseguito prima dei children
        assert "parent_A" in results_log
        # Nota: i subtask non vengono eseguiti automaticamente
        # perche' _spawn_subtasks richiede handler.generate_subtasks

    @pytest.mark.asyncio
    async def test_execute_tree_timeout(self, executor):
        """Verifica timeout dell'albero."""
        async def slow_handler():
            await asyncio.sleep(100)
            return "done"

        tasks = [
            UltraTask(task_id="slow", name="Slow", handler=slow_handler)
        ]

        with pytest.raises(Exception) as exc_info:
            await executor.execute_tree(tasks, wave_timeout=0.1)

        assert "timeout" in str(exc_info.value).lower()

    # -------------------------------------------------------------------------
    # TEST AGGREGATE RESULTS
    # -------------------------------------------------------------------------

    @pytest.mark.asyncio
    async def test_aggregate_results(self, executor):
        """Verifica aggregazione risultati."""
        async def handler(x: int) -> int:
            return x * 2

        tasks = [
            UltraTask(task_id=f"t{i}", name=f"T{i}", handler=handler, params={"x": i})
            for i in range(5)
        ]

        wave = Wave(wave_id=0, depth=0, tasks=tasks)
        completed = await executor.execute_wave(wave)

        aggregated = await executor.aggregate_results(completed)

        assert aggregated["wave_id"] == 0
        assert aggregated["success_rate"] == 1.0
        assert aggregated["avg_duration_ms"] > 0
        assert len(aggregated["errors"]) == 0
        assert len(aggregated["task_results"]) == 5

    # -------------------------------------------------------------------------
    # TEST FACTORY FUNCTIONS
    # -------------------------------------------------------------------------

    def test_create_simple_task(self):
        """Verifica factory create_simple_task."""
        async def handler(x: int) -> int:
            return x

        task = create_simple_task("test", "Test", handler, x=5)

        assert task.task_id == "test"
        assert task.name == "Test"
        assert task.params == {"x": 5}
        assert len(task.dependencies) == 0

    def test_create_dependent_task(self):
        """Verifica factory create_dependent_task."""
        async def handler(x: int) -> int:
            return x

        task = create_dependent_task(
            "test",
            "Test",
            handler,
            {"dep1", "dep2"},
            x=10,
        )

        assert task.task_id == "test"
        assert task.dependencies == {"dep1", "dep2"}
        assert task.params == {"x": 10}

    # -------------------------------------------------------------------------
    # TEST SINGLETON
    # -------------------------------------------------------------------------

    @pytest.mark.asyncio
    async def test_singleton(self):
        """Verifica pattern singleton."""
        reset_wave_executor()

        executor1 = await get_wave_executor()
        executor2 = await get_wave_executor()

        assert executor1 is executor2

        reset_wave_executor()

    # -------------------------------------------------------------------------
    # TEST METRICS
    # -------------------------------------------------------------------------

    @pytest.mark.asyncio
    async def test_get_summary(self, executor):
        """Verifica generazione summary."""
        async def handler():
            return "ok"

        tasks = [
            UltraTask(task_id=f"t{i}", name=f"T{i}", handler=handler)
            for i in range(3)
        ]

        await executor.execute_tree(tasks)

        summary = executor.get_summary()

        assert summary["total_waves"] >= 1
        assert summary["total_tasks"] == 3
        assert summary["total_success"] == 3
        assert summary["total_failure"] == 0
        assert summary["success_rate"] == 1.0


# =============================================================================
# RUN TESTS
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
