"""
Test per HybridResilienceHandler - V17

Test coverage: 11 metodi implementati
"""
from __future__ import annotations
import asyncio
from typing import Any, AsyncGenerator

import pytest
import pytest_asyncio

from lib.v17.resilience import (
    CircuitBreaker,
    CircuitState,
    HybridResilienceHandler,
    ResilienceConfig,
    ResilienceResult,
)


# === Fixtures ===


@pytest_asyncio.fixture
async def handler() -> AsyncGenerator[HybridResilienceHandler, None]:
    """Crea handler instance per test."""
    handler = HybridResilienceHandler()
    await handler.initialize()
    yield handler


@pytest.fixture
def config() -> ResilienceConfig:
    """Configurazione di test con valori ridotti."""
    return ResilienceConfig(
        max_retries=2,
        base_delay_ms=10,
        max_delay_ms=100,
        exponential_base=2.0,
        circuit_failure_threshold=3,
        circuit_recovery_timeout_ms=100,
        circuit_success_threshold=2,
        bulkhead_max_concurrent=5,
        fallback_enabled=True,
        timeout_ms=1000,
    )


# === ResilienceConfig Tests ===


class TestResilienceConfig:
    """Test per ResilienceConfig."""
    def test_default_values(self):
        """Test valori di default."""
        config = ResilienceConfig()
        assert config.max_retries == 3
        assert config.base_delay_ms == 100
        assert config.max_delay_ms == 30000
        assert config.exponential_base == 2.0
        assert config.circuit_failure_threshold == 5
        assert config.circuit_recovery_timeout_ms == 30000
        assert config.circuit_success_threshold == 2
        assert config.bulkhead_max_concurrent == 10
        assert config.fallback_enabled is True
        assert config.timeout_ms == 30000

    def test_custom_values(self):
        """Test valori personalizzati."""
        config = ResilienceConfig(
            max_retries=5,
            base_delay_ms=50,
            circuit_failure_threshold=10,
        )
        assert config.max_retries == 5
        assert config.base_delay_ms == 50
        assert config.circuit_failure_threshold == 10
# === ResilienceResult Tests ===
class TestResilienceResult:
    """Test per ResilienceResult."""
    def test_success_result(self):
        """Test risultato successo."""
        result = ResilienceResult(
            success=True,
            value={"data": "test"},
            retries=1,
        )
        assert result.success is True
        assert result.value == {"data": "test"}
        assert result.error is None
        assert result.retries == 1
    def test_failure_result(self):
        """Test risultato fallimento."""
        error = ValueError("test error")
        result = ResilienceResult(
            success=False,
            error=error,
            retries=3,
        )
        assert result.success is False
        assert result.value is None
        assert result.error == error
        assert result.retries == 3
# === CircuitBreaker Tests ===
class TestCircuitBreaker:
    """Test per CircuitBreaker."""
    def test_default_state(self):
        """Test stato di default."""
        circuit = CircuitBreaker(tool_name="test_tool")
        assert circuit.tool_name == "test_tool"
        assert circuit.state == CircuitState.CLOSED
        assert circuit.failure_count == 0
        assert circuit.success_count == 0
        assert circuit.last_failure_time == 0.0
# === HybridResilienceHandler Tests ===
class TestHybridResilienceHandler:
    """Test per HybridResilienceHandler."""
    @pytest.mark.asyncio
    async def test_initialize(self):
        """Test inizializzazione."""
        handler = HybridResilienceHandler()
        assert handler._initialized is False
        await handler.initialize()
        assert handler._initialized is True
    @pytest.mark.asyncio
    async def test_initialize_idempotent(self, handler):
        """Test inizializzazione idempotente."""
        # Seconda inizializzazione non dovrebbe avere effetti
        await handler.initialize()
        assert handler._initialized is True
    @pytest.mark.asyncio
    async def test_execute_with_resilience_success(self, handler, config):
        """Test esecuzione con successo."""
        async def operation(data: Any) -> str:
            return "success"
        result = await handler.execute_with_resilience(
            tool_name="test_tool",
            operation=operation,
        )
        assert result.success is True
        assert result.value == "success"
        assert result.retries == 0
    @pytest.mark.asyncio
    async def test_execute_with_resilience_retry_success(self, handler, config):
        """Test esecuzione con retry e successo."""
        call_count = 0
        async def operation(data: Any) -> str:
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                raise ValueError("error")
            call_count += 1
            if call_count == 2:
                return "success_after_retry"
        raise ValueError("error")
        call_count = 0
        result = await handler.execute_with_resilience(
            tool_name="test_tool",
            operation=operation,
        )
        assert result.success is True
        assert result.value == "success_after_retry"
        assert result.retries == 1
    @pytest.mark.asyncio
    async def test_execute_with_resilience_all_retries_fail(self, handler, config):
        """Test esecuzione con tutti i retry falliti."""
        async def operation(data: Any) -> str:
            raise ValueError("error")
        result = await handler.execute_with_resilience(
            tool_name="test_tool",
            operation=operation,
        )
        assert result.success is False
        assert result.error is not None
        assert result.retries == 2  # max_retries
    @pytest.mark.asyncio
    async def test_execute_with_resilience_timeout(self, handler, config):
        """Test esecuzione con timeout."""
        config.timeout_ms = 50
        async def slow_operation(data: Any) -> str:
            await asyncio.sleep(0.2)
            return "success"
        result = await handler.execute_with_resilience(
            tool_name="test_tool",
            operation=slow_operation,
        )
        assert result.success is False
        assert isinstance(result.error, asyncio.TimeoutError)
        assert result.retries == 0
# === Circuit Breaker Tests ===
class TestCircuitBreakerFlow:
    """Test per il flusso del circuit breaker."""
    @pytest.mark.asyncio
    async def test_circuit_opens_after_failures(self, handler, config):
        """Test circuit si apre dopo threshold fallimenti."""
        # Imposta config direttamente sull'handler
        handler._config.circuit_failure_threshold = 1
        async def failing_operation(data: Any) -> str:
            raise ValueError("error")
        # Esegui fino ad aprire il circuit
        await handler.execute_with_resilience(
            tool_name="test_tool",
            operation=failing_operation,
        )
        status = handler.get_circuit_status("test_tool")
        assert status["state"] == CircuitState.OPEN.value
    @pytest.mark.asyncio
    async def test_circuit_blocks_when_open(self, handler, config):
        """Test circuit blocca quando aperto."""
        handler._config.circuit_failure_threshold = 1
        # Apri il circuit
        async def failing_operation(data: Any) -> str:
            raise ValueError("error")
        await handler.execute_with_resilience(
            tool_name="test_tool",
            operation=failing_operation,
        )
        # Verifica circuit aperto
        status = handler.get_circuit_status("test_tool")
        assert status["state"] == CircuitState.OPEN.value
        # Prova esecuzione, dovrebbe fallire rapidamente
        call_count = 0
        async def counting_operation(data: Any) -> str:
            nonlocal call_count
            call_count += 1
            return "should not be called"
        result = await handler.execute_with_resilience(
            tool_name="test_tool",
            operation=counting_operation,
        )
        assert result.success is False
        assert call_count == 0  # Non dovrebbe essere chiamata
    @pytest.mark.asyncio
    async def test_circuit_half_open_after_timeout(self, handler, config):
        """Test circuit passa a half-open dopo timeout."""
        handler._config.circuit_failure_threshold = 1
        handler._config.circuit_recovery_timeout_ms = 50  # 50ms
        # Apri il circuit
        async def failing_operation(data: Any) -> str:
            raise ValueError("error")
        await handler.execute_with_resilience(
            tool_name="test_tool",
            operation=failing_operation,
        )
        # Verifica circuit aperto
        status = handler.get_circuit_status("test_tool")
        assert status["state"] == CircuitState.OPEN.value
        # Attendi timeout
        await asyncio.sleep(0.1)  # 100ms
        # Verifica half-open
        state = await handler._check_circuit("test_tool")
        assert state == CircuitState.HALF_OPEN
    @pytest.mark.asyncio
    async def test_circuit_closes_after_successes_in_half_open(self, handler, config):
        """Test circuit si chiude dopo successi in half-open."""
        handler._config.circuit_failure_threshold = 1
        handler._config.circuit_recovery_timeout_ms = 50
        handler._config.circuit_success_threshold = 2
        # Apri il circuit
        async def failing_operation(data: Any) -> str:
            raise ValueError("error")
        await handler.execute_with_resilience(
            tool_name="test_tool",
            operation=failing_operation,
        )
        # Attendi half-open
        await asyncio.sleep(0.1)
        # Esegui successi per chiudere
        async def success_operation(data: Any) -> str:
            return "success"
        for _ in range(handler._config.circuit_success_threshold):
            await handler.execute_with_resilience(
                tool_name="test_tool",
                operation=success_operation,
            )
        status = handler.get_circuit_status("test_tool")
        assert status["state"] == CircuitState.CLOSED.value
# === Backoff Calculation Tests ===
class TestBackoffCalculation:
    """Test per calcolo backoff."""
    def test_calculate_backoff_delay_first_attempt(self, handler, config):
        """Test delay primo tentativo."""
        delay = handler._calculate_backoff_delay(0, config)
        # Base delay + jitter (0-50%)
        assert config.base_delay_ms <= delay <= config.base_delay_ms * 1.5
    def test_calculate_backoff_delay_exponential(self, handler, config):
        """Test exponential growth."""
        delay_0 = handler._calculate_backoff_delay(0, config)
        delay_1 = handler._calculate_backoff_delay(1, config)
        delay_2 = handler._calculate_backoff_delay(2, config)
        # Con jitter, i valori dovrebbero variare
        # ma exponential_base^attempt > base
        assert delay_0 < delay_1 < delay_2
    def test_calculate_backoff_delay_max_cap(self, handler, config):
        """Test cap massimo."""
        config.max_delay_ms = 50
        delay = handler._calculate_backoff_delay(10, config)  # Alto attempt
        assert delay <= config.max_delay_ms * 1.5  # Cap + jitter max
    def test_calculate_backoff_jitter(self, handler, config):
        """Test che jitter varia i risultati."""
        delays = [handler._calculate_backoff_delay(1, config) for _ in range(10)]
        # I valori dovrebbero variare per il jitter
        unique_delays = set(delays)
        assert len(unique_delays) > 1  # Almeno 2 valori diversi
# === Status and Reset Tests ===
class TestStatusAndReset:
    """Test per status e reset."""
    @pytest.mark.asyncio
    async def test_get_circuit_status_existing(self, handler, config):
        """Test status per circuit esistente."""
        async def operation(data: Any) -> str:
            return "success"
        await handler.execute_with_resilience(
            tool_name="test_tool",
            operation=operation,
        )
        status = handler.get_circuit_status("test_tool")
        assert status["exists"] is True
        assert status["state"] == CircuitState.CLOSED.value
        assert status["failure_count"] == 0
    def test_get_circuit_status_nonexistent(self, handler):
        """Test status per circuit inesistente."""
        status = handler.get_circuit_status("nonexistent_tool")
        assert status["exists"] is False
        assert status["state"] == CircuitState.CLOSED.value
    @pytest.mark.asyncio
    async def test_reset_circuit(self, handler, config):
        """Test reset circuit."""
        handler._config.circuit_failure_threshold = 1
        # Apri il circuit
        async def failing_operation(data: Any) -> str:
            raise ValueError("error")
        await handler.execute_with_resilience(
            tool_name="test_tool",
            operation=failing_operation,
        )
        # Verifica aperto
        status = handler.get_circuit_status("test_tool")
        assert status["state"] == CircuitState.OPEN.value
        # Reset
        handler.reset_circuit("test_tool")
        # Verifica chiuso
        status = handler.get_circuit_status("test_tool")
        assert status["state"] == CircuitState.CLOSED.value
        assert status["failure_count"] == 0
    @pytest.mark.asyncio
    async def test_get_all_circuits(self, handler, config):
        """Test get tutti i circuits."""
        async def operation(data: Any) -> str:
            return "success"
        await handler.execute_with_resilience(
            tool_name="tool1",
            operation=operation,
        )
        await handler.execute_with_resilience(
            tool_name="tool2",
            operation=operation,
        )
        all_circuits = handler.get_all_circuits()
        assert "tool1" in all_circuits
        assert "tool2" in all_circuits
# === Bulkhead Tests ===
class TestBulkhead:
    """Test per bulkhead isolation."""
    @pytest.mark.asyncio
    async def test_bulkhead_limits_concurrency(self, handler, config):
        """Test bulkhead limita concorrenza."""
        handler._config.bulkhead_max_concurrent = 2
        concurrent_count = 0
        max_concurrent = 0
        lock = asyncio.Lock()
        async def counting_operation(data: Any) -> str:
            nonlocal concurrent_count, max_concurrent
            async with lock:
                concurrent_count += 1
                if concurrent_count > max_concurrent:
                    max_concurrent = concurrent_count
            await asyncio.sleep(0.1)
            async with lock:
                concurrent_count -= 1
            return "success"
        # Esegui 5 operazioni concorrenti
        tasks = [
            handler.execute_with_resilience(
                tool_name="test_tool",
                operation=counting_operation,
            )
            for _ in range(5)
        ]
        await asyncio.gather(*tasks)
        # Max concorrenza dovrebbe essere <= 2
        assert max_concurrent <= handler._config.bulkhead_max_concurrent
# === Edge Cases ===
class TestEdgeCases:
    """Test per casi limite."""
    @pytest.mark.asyncio
    async def test_operation_with_none_input(self, handler, config):
        """Test operazione con input None."""
        async def operation(data: Any) -> str:
            return "success"
        result = await handler.execute_with_resilience(
            tool_name="test_tool",
            operation=operation,
            input_data=None,
        )
        assert result.success is True
    @pytest.mark.asyncio
    async def test_operation_with_complex_input(self, handler, config):
        """Test operazione t input complesso."""
        async def operation(data: Any) -> dict:
            return {"received": data}
        complex_input = {
            "nested": {"level2": [1, 2, 3]},
            "unicode": "test",
        }
        result = await handler.execute_with_resilience(
            tool_name="test_tool",
            operation=operation,
            input_data=complex_input,
        )
        assert result.success is True
        assert result.value == {"received": complex_input}
    @pytest.mark.asyncio
    async def test_multiple_tools_independent_circuits(self, handler, config):
        """Test circuit indipendenti per tool diversi."""
        handler._config.circuit_failure_threshold = 1
        async def failing_operation(data: Any) -> str:
            raise ValueError("error")
        async def success_operation(data: Any) -> str:
            return "success"
        # Apri circuit per tool1
        await handler.execute_with_resilience(
            tool_name="tool1",
            operation=failing_operation,
        )
        # tool2 dovrebbe ancora funzionare
        result = await handler.execute_with_resilience(
            tool_name="tool2",
            operation=success_operation,
        )
        assert result.success is True
        # tool1 dovrebbe essere bloccato
        status1 = handler.get_circuit_status("tool1")
        status2 = handler.get_circuit_status("tool2")
        assert status1["state"] == CircuitState.OPEN.value
        assert status2["state"] == CircuitState.CLOSED.value
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
