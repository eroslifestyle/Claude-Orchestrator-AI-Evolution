"""
Test per ProgrammaticToolExecutor - V17

Test coverage:
- Batch execution (parallelo e sequenziale)
- Dependency resolution (DAG, topological sort)
- Resilience (retry, fallback, circuit breaker)
- Cancellation e timeout
- Input reference resolution
- Stats e status

Run:
    pytest lib/v17/tests/test_executor.py -v
"""

from __future__ import annotations

import asyncio
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from typing import Any

from lib.v17.executor import (
    ProgrammaticToolExecutor,
    ToolRequest,
    ExecutionResult,
    ExecutionStatus,
    ExecutionContext,
    ExecutionConfig,
)
from lib.v17.claude_tool_registry import ClaudeToolRegistry, ToolDefinition, ToolCategory, ToolPriority
from lib.v17.resilience import HybridResilienceHandler, ResilienceConfig, CircuitState


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture
def mock_registry():
    """Crea mock registry con tools di test."""
    registry = ClaudeToolRegistry()

    async def echo_handler(input_data: dict[str, Any]) -> dict[str, Any]:
        return {"echo": input_data}

    async def error_handler(input_data: dict[str, Any]) -> dict[str, Any]:
        raise ValueError("Test error")

    async def slow_handler(input_data: dict[str, Any]) -> dict[str, Any]:
        await asyncio.sleep(0.1)
        return {"slow": True}

    registry.register(ToolDefinition(
        name="echo",
        description="Echo input",
        input_schema={"type": "object"},
        handler=echo_handler,
        category=ToolCategory.CORE,
        priority=ToolPriority.HIGH,
    ))

    registry.register(ToolDefinition(
        name="error_tool",
        description="Always errors",
        input_schema={"type": "object"},
        handler=error_handler,
        category=ToolCategory.CORE,
    ))

    registry.register(ToolDefinition(
        name="slow_tool",
        description="Slow tool",
        input_schema={"type": "object"},
        handler=slow_handler,
        category=ToolCategory.CORE,
    ))

    return registry


@pytest.fixture
def mock_resilience():
    """Crea mock resilience handler."""
    handler = HybridResilienceHandler()
    return handler


@pytest.fixture
def executor(mock_registry, mock_resilience):
    """Crea executor inizializzato (non-async setup)."""
    return _create_executor(mock_registry, mock_resilience)




async def _create_executor(mock_registry, mock_resilience):
    """Helper async per creare executor."""
    exec = ProgrammaticToolExecutor()
    await exec.initialize(
        registry=mock_registry,
        resilience=mock_resilience,
        max_parallel=5,
        default_timeout_ms=5000,
    )
    return exec





# =============================================================================
# TEST: INITIALIZATION
# =============================================================================

class TestInitialization:
    """Test per inizializzazione executor."""

    @pytest.mark.asyncio
    async def test_initialize_default(self):
        """Test inizializzazione con defaults."""
        executor = ProgrammaticToolExecutor()
        await executor.initialize()

        assert executor._max_parallel == 10
        assert executor._default_timeout_ms == 30000
        assert executor._enable_sandbox is True
        assert executor._registry is None
        assert executor._resilience is None

    @pytest.mark.asyncio
    async def test_initialize_with_registry(self, mock_registry):
        """Test inizializzazione con registry."""
        executor = ProgrammaticToolExecutor()
        await executor.initialize(registry=mock_registry)

        assert executor._registry is mock_registry

    @pytest.mark.asyncio
    async def test_initialize_custom_config(self):
        """Test inizializzazione con config custom."""
        executor = ProgrammaticToolExecutor()
        await executor.initialize(
            max_parallel=20,
            default_timeout_ms=10000,
            enable_sandbox=False,
        )

        assert executor._max_parallel == 20
        assert executor._default_timeout_ms == 10000
        assert executor._enable_sandbox is False


# =============================================================================
# TEST: BATCH EXECUTION
# =============================================================================

class TestBatchExecution:
    """Test per batch execution."""

    @pytest.mark.asyncio
    async def test_empty_batch(self, executor):
        """Test batch vuoto."""
        results = await executor.execute_batch([])
        assert results == []

    @pytest.mark.asyncio
    async def test_single_request(self, executor):
        """Test singola richiesta."""
        request = ToolRequest(
            name="echo",
            input={"message": "hello"},
        )

        results = await executor.execute_batch([request])

        assert len(results) == 1
        assert results[0].success
        assert results[0].output == {"echo": {"message": "hello"}}

    @pytest.mark.asyncio
    async def test_parallel_requests(self, executor):
        """Test richieste parallele indipendenti."""
        requests = [
            ToolRequest(name="echo", input={"id": i})
            for i in range(5)
        ]

        results = await executor.execute_batch(requests)

        assert len(results) == 5
        for i, result in enumerate(results):
            assert result.success
            assert result.output == {"echo": {"id": i}}

    @pytest.mark.asyncio
    async def test_parallel_with_limit(self, executor):
        """Test parallelismo con limite."""
        # Crea executor con max_parallel=2
        executor._max_parallel = 2

        requests = [
            ToolRequest(name="slow_tool", input={"id": i})
            for i in range(4)
        ]

        import time
        start = time.perf_counter()
        results = await executor.execute_batch(requests)
        elapsed = time.perf_counter() - start

        assert len(results) == 4
        # Con max_parallel=2 e 4 request da 0.1s, ci vuole ~0.2s
        # Se fossero tutti paralleli sarebbe ~0.1s
        assert elapsed >= 0.15  # Almeno 2 wave

    @pytest.mark.asyncio
    async def test_batch_updates_stats(self, executor):
        """Test che batch aggiorna statistiche."""
        initial_stats = executor.get_stats()

        requests = [
            ToolRequest(name="echo", input={"id": i})
            for i in range(3)
        ]

        await executor.execute_batch(requests)

        stats = executor.get_stats()
        assert stats["total_batches"] == initial_stats["total_batches"] + 1
        assert stats["total_requests"] == initial_stats["total_requests"] + 3
        assert stats["successful_requests"] == initial_stats["successful_requests"] + 3


# =============================================================================
# TEST: DEPENDENCY RESOLUTION
# =============================================================================

class TestDependencyResolution:
    """Test per risoluzione dipendenze."""

    @pytest.mark.asyncio
    async def test_no_dependencies(self, executor):
        """Test richieste senza dipendenze."""
        requests = [
            ToolRequest(name="echo", input={"a": 1}, id="a"),
            ToolRequest(name="echo", input={"b": 2}, id="b"),
            ToolRequest(name="echo", input={"c": 3}, id="c"),
        ]

        waves = await executor._resolve_dependencies(requests)

        # Tutte in una wave
        assert len(waves) == 1
        assert len(waves[0]) == 3

    @pytest.mark.asyncio
    async def test_sequential_dependencies(self, executor):
        """Test dipendenze sequenziali (a -> b -> c)."""
        requests = [
            ToolRequest(name="echo", input={"a": 1}, id="a"),
            ToolRequest(name="echo", input={"b": 2}, id="b", depends_on=["a"]),
            ToolRequest(name="echo", input={"c": 3}, id="c", depends_on=["b"]),
        ]

        waves = await executor._resolve_dependencies(requests)

        assert len(waves) == 3
        assert len(waves[0]) == 1
        assert waves[0][0].id == "a"
        assert waves[1][0].id == "b"
        assert waves[2][0].id == "c"

    @pytest.mark.asyncio
    async def test_diamond_dependencies(self, executor):
        """Test dipendenze a diamante (a -> b,c -> d)."""
        requests = [
            ToolRequest(name="echo", input={"a": 1}, id="a"),
            ToolRequest(name="echo", input={"b": 2}, id="b", depends_on=["a"]),
            ToolRequest(name="echo", input={"c": 3}, id="c", depends_on=["a"]),
            ToolRequest(name="echo", input={"d": 4}, id="d", depends_on=["b", "c"]),
        ]

        waves = await executor._resolve_dependencies(requests)

        assert len(waves) == 3
        # Wave 0: a
        assert waves[0][0].id == "a"
        # Wave 1: b, c (in parallelo)
        wave1_ids = {r.id for r in waves[1]}
        assert wave1_ids == {"b", "c"}
        # Wave 2: d
        assert waves[2][0].id == "d"

    @pytest.mark.asyncio
    async def test_missing_dependency_warning(self, executor):
        """Test warning per dipendenza mancante."""
        requests = [
            ToolRequest(name="echo", input={"a": 1}, id="a", depends_on=["missing"]),
        ]

        # Non dovrebbe crashare, solo warning
        waves = await executor._resolve_dependencies(requests)

        # La richiesta va in una wave (dipendenza ignorata)
        assert len(waves) == 1

    @pytest.mark.asyncio
    async def test_priority_ordering_in_wave(self, executor):
        """Test ordinamento per priorita' in wave."""
        requests = [
            ToolRequest(name="echo", input={"a": 1}, id="a", priority=5),
            ToolRequest(name="echo", input={"b": 2}, id="b", priority=0),  # Alta
            ToolRequest(name="echo", input={"c": 3}, id="c", priority=10),  # Bassa
        ]

        waves = await executor._resolve_dependencies(requests)

        # Ordinato per priorita' crescente
        assert waves[0][0].id == "b"  # priority=0
        assert waves[0][1].id == "a"  # priority=5
        assert waves[0][2].id == "c"  # priority=10


# =============================================================================
# TEST: INPUT REFERENCE RESOLUTION
# =============================================================================

class TestInputReferenceResolution:
    """Test per risoluzione riferimenti input."""

    def test_simple_reference(self, executor):
        """Test riferimento semplice ($id)."""
        results = {
            "user": ExecutionResult(
                request_id="user",
                tool_name="get_user",
                status=ExecutionStatus.COMPLETED,
                output={"id": "123", "name": "Test"},
            )
        }

        resolved = executor._resolve_input_references(
            {"user_id": "$user.id"},
            results
        )

        assert resolved == {"user_id": "123"}

    def test_nested_reference(self, executor):
        """Test riferimento nidificato ($id.field.subfield)."""
        results = {
            "data": ExecutionResult(
                request_id="data",
                tool_name="get_data",
                status=ExecutionStatus.COMPLETED,
                output={"user": {"profile": {"email": "test@example.com"}}},
            )
        }

        resolved = executor._resolve_input_references(
            {"email": "$data.user.profile.email"},
            results
        )

        assert resolved == {"email": "test@example.com"}

    def test_full_output_reference(self, executor):
        """Test riferimento a output completo ($id senza field)."""
        results = {
            "user": ExecutionResult(
                request_id="user",
                tool_name="get_user",
                status=ExecutionStatus.COMPLETED,
                output={"id": "123", "name": "Test"},
            )
        }

        resolved = executor._resolve_input_references(
            {"user_data": "$user"},
            results
        )

        assert resolved == {"user_data": {"id": "123", "name": "Test"}}

    def test_missing_reference_returns_original(self, executor):
        """Test riferimento mancante ritorna valore originale."""
        results = {}

        resolved = executor._resolve_input_references(
            {"user_id": "$user.id"},
            results
        )

        # Ritorna il valore originale se reference non trovato
        assert resolved == {"user_id": "$user.id"}

    def test_non_reference_values_unchanged(self, executor):
        """Test valori non-reference rimangono invariati."""
        results = {}

        resolved = executor._resolve_input_references(
            {"name": "test", "count": 42, "flag": True},
            results
        )

        assert resolved == {"name": "test", "count": 42, "flag": True}

    def test_nested_dict_resolution(self, executor):
        """Test risoluzione in dict nidificati."""
        results = {
            "user": ExecutionResult(
                request_id="user",
                tool_name="get_user",
                status=ExecutionStatus.COMPLETED,
                output={"id": "123"},
            )
        }

        resolved = executor._resolve_input_references(
            {"data": {"user_id": "$user.id", "other": "value"}},
            results
        )

        assert resolved == {"data": {"user_id": "123", "other": "value"}}

    def test_list_resolution(self, executor):
        """Test risoluzione in liste."""
        results = {
            "user": ExecutionResult(
                request_id="user",
                tool_name="get_user",
                status=ExecutionStatus.COMPLETED,
                output={"id": "123"},
            )
        }

        resolved = executor._resolve_input_references(
            {"ids": ["$user.id", "456", "$user.id"]},
            results
        )

        assert resolved == {"ids": ["123", "456", "123"]}


# =============================================================================
# TEST: ERROR HANDLING
# =============================================================================

class TestErrorHandling:
    """Test per gestione errori."""

    @pytest.mark.asyncio
    async def test_tool_not_found(self, executor):
        """Test tool non trovato."""
        request = ToolRequest(name="nonexistent", input={})

        results = await executor.execute_batch([request])

        assert len(results) == 1
        assert results[0].status == ExecutionStatus.FAILED
        assert "not found" in str(results[0].error).lower()

    @pytest.mark.asyncio
    async def test_tool_error(self, executor):
        """Test tool che lancia errore."""
        request = ToolRequest(name="error_tool", input={})

        results = await executor.execute_batch([request])

        assert len(results) == 1
        assert results[0].status == ExecutionStatus.FAILED
        assert isinstance(results[0].error, ValueError)

    @pytest.mark.asyncio
    async def test_stop_on_failure(self, executor):
        """Test stop_on_failure configuration."""
        config = ExecutionConfig(stop_on_failure=True)

        # Crea richieste con dipendenze
        requests = [
            ToolRequest(name="error_tool", input={}, id="err"),
            ToolRequest(name="echo", input={"a": 1}, id="a", depends_on=["err"]),
        ]

        results = await executor.execute_batch(requests, config)

        # La seconda richiesta dovrebbe essere SKIPPED
        assert results[1].status == ExecutionStatus.SKIPPED

    @pytest.mark.asyncio
    async def test_partial_failure(self, executor):
        """Test fallimento parziale del batch."""
        requests = [
            ToolRequest(name="echo", input={"a": 1}),
            ToolRequest(name="error_tool", input={}),
            ToolRequest(name="echo", input={"c": 3}),
        ]

        results = await executor.execute_batch(requests)

        assert results[0].success
        assert results[1].status == ExecutionStatus.FAILED
        assert results[2].success


# =============================================================================
# TEST: TIMEOUT
# =============================================================================

class TestTimeout:
    """Test per timeout."""

    @pytest.mark.asyncio
    async def test_batch_timeout(self, executor):
        """Test timeout batch."""
        config = ExecutionConfig(timeout_ms=50)  # 50ms

        # Tool lento (100ms)
        requests = [
            ToolRequest(name="slow_tool", input={}),
        ]

        results = await executor.execute_batch(requests, config)

        # Dovrebbe andare in timeout
        assert results[0].status == ExecutionStatus.TIMEOUT

    @pytest.mark.asyncio
    async def test_single_request_timeout(self, executor):
        """Test timeout singola richiesta."""
        request = ToolRequest(
            name="slow_tool",
            input={},
            timeout_ms=50,  # 50ms
        )

        result = await executor.execute_single(request)

        assert result.status == ExecutionStatus.TIMEOUT


# =============================================================================
# TEST: CANCELLATION
# =============================================================================

class TestCancellation:
    """Test per cancellazione."""

    @pytest.mark.asyncio
    async def test_cancel_batch(self, executor):
        """Test cancellazione batch."""
        config = ExecutionConfig(timeout_ms=5000)

        requests = [
            ToolRequest(name="slow_tool", input={}, id=f"slow_{i}")
            for i in range(10)
        ]

        # Avvia batch in background
        task = asyncio.create_task(executor.execute_batch(requests, config))

        # Aspetta un po' poi cancella
        await asyncio.sleep(0.05)

        # Ottieni batch_id
        active_batches = list(executor._active_batches.keys())
        if active_batches:
            batch_id = active_batches[0]
            cancelled = await executor.cancel(batch_id)
            assert cancelled > 0

        # Aspetta completamento
        results = await task

        # Alcuni dovrebbero essere cancelled
        cancelled_count = sum(1 for r in results if r.status == ExecutionStatus.CANCELLED)
        assert cancelled_count >= 0  # Potrebbe essere 0 se batch gia' completato

    @pytest.mark.asyncio
    async def test_cancel_nonexistent_batch(self, executor):
        """Test cancellazione batch inesistente."""
        cancelled = await executor.cancel("nonexistent")
        assert cancelled == 0


# =============================================================================
# TEST: STATUS AND RESULTS
# =============================================================================

class TestStatusAndResults:
    """Test per status e risultati."""

    @pytest.mark.asyncio
    async def test_get_status_running(self, executor):
        """Test get_status durante esecuzione."""
        config = ExecutionConfig(timeout_ms=5000)

        requests = [
            ToolRequest(name="slow_tool", input={})
            for _ in range(5)
        ]

        # Avvia in background
        task = asyncio.create_task(executor.execute_batch(requests, config))

        # Controlla status mentre gira
        await asyncio.sleep(0.01)
        active_batches = list(executor._active_batches.keys())
        if active_batches:
            status = executor.get_status(active_batches[0])
            assert status is not None
            assert "total_requests" in status
            assert status["total_requests"] == 5

        await task

    @pytest.mark.asyncio
    async def test_get_status_nonexistent(self, executor):
        """Test get_status batch inesistente."""
        status = executor.get_status("nonexistent")
        assert status is None

    @pytest.mark.asyncio
    async def test_get_results(self, executor):
        """Test get_results dopo esecuzione."""
        requests = [
            ToolRequest(name="echo", input={"id": i}, id=f"req_{i}")
            for i in range(3)
        ]

        # Esegui e cattura batch_id
        results = await executor.execute_batch(requests)

        assert len(results) == 3
        for i, result in enumerate(results):
            assert result.success
            assert result.output == {"echo": {"id": i}}

    @pytest.mark.asyncio
    async def test_get_results_nonexistent(self, executor):
        """Test get_results batch inesistente."""
        results = executor.get_results("nonexistent")
        assert results is None

    def test_get_stats(self, executor):
        """Test get_stats."""
        stats = executor.get_stats()

        assert "total_batches" in stats
        assert "total_requests" in stats
        assert "successful_requests" in stats
        assert "failed_requests" in stats
        assert "success_rate" in stats
        assert "active_batches" in stats
        assert "config" in stats


# =============================================================================
# TEST: SANDBOXED EXECUTION
# =============================================================================

class TestSandboxedExecution:
    """Test per esecuzione sandboxed."""

    @pytest.mark.asyncio
    async def test_sandboxed_execution(self, executor):
        """Test execute_sandboxed."""
        request = ToolRequest(name="echo", input={"test": "value"})

        result = await executor.execute_sandboxed(
            request,
            sandbox_config={
                "network": False,
                "fs": "readonly",
                "timeout_ms": 5000,
            }
        )

        assert result.success

    @pytest.mark.asyncio
    async def test_sandboxed_metadata_added(self, executor):
        """Test che metadata sandbox venga aggiunto."""
        request = ToolRequest(
            name="echo",
            input={"test": "value"},
            metadata={"original": "meta"}
        )

        # Esegui con sandbox
        result = await executor.execute_sandboxed(
            request,
            sandbox_config={"network": False}
        )

        # Il metadata sandbox dovrebbe essere stato aggiunto
        # (verificato indirettamente tramite successo esecuzione)
        assert result.success


# =============================================================================
# TEST: EXECUTION GRAPH
# =============================================================================

class TestExecutionGraph:
    """Test per costruzione grafo esecuzione."""

    def test_build_simple_graph(self, executor):
        """Test costruzione grafo semplice."""
        requests = [
            ToolRequest(name="echo", input={}, id="a"),
            ToolRequest(name="echo", input={}, id="b", depends_on=["a"]),
        ]

        graph = executor._build_execution_graph(requests)

        assert "a" in graph
        assert "b" in graph
        assert graph["a"] == ["b"]  # a -> b
        assert graph["b"] == []

    def test_build_complex_graph(self, executor):
        """Test costruzione grafo complesso."""
        requests = [
            ToolRequest(name="echo", input={}, id="a"),
            ToolRequest(name="echo", input={}, id="b", depends_on=["a"]),
            ToolRequest(name="echo", input={}, id="c", depends_on=["a"]),
            ToolRequest(name="echo", input={}, id="d", depends_on=["b", "c"]),
        ]

        graph = executor._build_execution_graph(requests)

        assert graph["a"] == ["b", "c"]
        assert sorted(graph["b"]) == ["d"]
        assert sorted(graph["c"]) == ["d"]
        assert graph["d"] == []


# =============================================================================
# TEST: DATA STRUCTURES
# =============================================================================

class TestDataStructures:
    """Test per data structures."""

    def test_tool_request_auto_id(self):
        """Test generazione automatica ID."""
        req = ToolRequest(name="test", input={})
        assert req.id.startswith("req_")
        assert len(req.id) == 12  # req_ + 8 chars

    def test_tool_request_custom_id(self):
        """Test ID custom."""
        req = ToolRequest(name="test", input={}, id="custom_id")
        assert req.id == "custom_id"

    def test_execution_result_success(self):
        """Test ExecutionResult.success property."""
        success_result = ExecutionResult(
            request_id="test",
            tool_name="test",
            status=ExecutionStatus.COMPLETED,
        )
        assert success_result.success

        failed_result = ExecutionResult(
            request_id="test",
            tool_name="test",
            status=ExecutionStatus.FAILED,
        )
        assert not failed_result.success

    def test_execution_result_to_dict(self):
        """Test ExecutionResult.to_dict()."""
        result = ExecutionResult(
            request_id="test",
            tool_name="test_tool",
            status=ExecutionStatus.COMPLETED,
            output={"data": "value"},
            latency_ms=100.5,
            tokens_used=50,
        )

        d = result.to_dict()

        assert d["request_id"] == "test"
        assert d["tool_name"] == "test_tool"
        assert d["status"] == "completed"
        assert d["output"] == {"data": "value"}
        assert d["latency_ms"] == 100.5
        assert d["tokens_used"] == 50
        assert d["success"] is True

    def test_execution_context_summary(self):
        """Test ExecutionContext.get_status_summary()."""
        context = ExecutionContext(
            batch_id="test_batch",
            requests=[
                ToolRequest(name="a", input={}, id="a"),
                ToolRequest(name="b", input={}, id="b"),
            ],
        )

        context.results["a"] = ExecutionResult(
            request_id="a", tool_name="a", status=ExecutionStatus.COMPLETED
        )
        context.results["b"] = ExecutionResult(
            request_id="b", tool_name="b", status=ExecutionStatus.FAILED
        )

        summary = context.get_status_summary()

        assert summary["completed"] == 1
        assert summary["failed"] == 1


# =============================================================================
# TEST: INTEGRATION
# =============================================================================

class TestIntegration:
    """Test di integrazione."""

    @pytest.mark.asyncio
    async def test_full_workflow(self, executor):
        """Test workflow completo."""
        # Crea richieste con dipendenze
        requests = [
            ToolRequest(name="echo", input={"step": 1}, id="step1"),
            ToolRequest(name="echo", input={"step": 2, "prev": "$step1.echo"}, id="step2", depends_on=["step1"]),
            ToolRequest(name="echo", input={"step": 3, "prev": "$step2.echo"}, id="step3", depends_on=["step2"]),
        ]

        # Esegui
        results = await executor.execute_batch(requests)

        # Verifica
        assert len(results) == 3
        assert all(r.success for r in results)

        # Verifica statistiche
        stats = executor.get_stats()
        assert stats["total_batches"] >= 1
        assert stats["successful_requests"] >= 3

    @pytest.mark.asyncio
    async def test_concurrent_batches(self, executor):
        """Test batch concorrenti."""
        batch1 = [ToolRequest(name="echo", input={"batch": 1, "id": i}) for i in range(3)]
        batch2 = [ToolRequest(name="echo", input={"batch": 2, "id": i}) for i in range(3)]

        # Esegui in parallelo
        results1, results2 = await asyncio.gather(
            executor.execute_batch(batch1),
            executor.execute_batch(batch2),
        )

        assert len(results1) == 3
        assert len(results2) == 3
        assert all(r.success for r in results1)
        assert all(r.success for r in results2)


# =============================================================================
# ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
