"""
Hybrid Resilience Handler - V17

Gestisce resilience ibrida per tool execution:
- Circuit Breaker (CLOSED/OPEN/HALF_OPEN)
- Retry con exponential backoff (max 5, base 1.5)
- Fallback chain con degradazione graceful
- Rate limiting integrato (token bucket adaptive)

Example:
    >>> from lib.v17 import HybridResilience
    >>> config = ResilienceConfig(failure_threshold=5, max_retries=5)
    >>> resilience = HybridResilience(config)
    >>> result = await resilience.execute(my_async_func, arg1, arg2)
    >>> state = resilience.get_circuit_state()
    >>> metrics = resilience.get_metrics()
"""

from __future__ import annotations

import asyncio
import atexit
import logging
import random
import time
from collections import deque
from dataclasses import dataclass, field
from enum import Enum
from functools import wraps
from threading import RLock
from typing import TYPE_CHECKING, Any, Callable, Coroutine, Dict, List, Optional

if TYPE_CHECKING:
    from lib.rate_limiter import AdaptiveRateLimiter

__all__ = [
    "HybridResilience",
    "HybridResilienceHandler",  # Alias for backward compatibility
    "ResilienceConfig",
    "CircuitState",
    "ResilienceResult",
    "FallbackChain",
    "ResilienceMetrics",
    "resilient",
]

# Logger configurato
logger = logging.getLogger(__name__)


class CircuitState(Enum):
    """Stati del Circuit Breaker."""

    CLOSED = "closed"  # Normale operazione
    OPEN = "open"  # Bloccato, fail fast
    HALF_OPEN = "half_open"  # Testing recovery


@dataclass(slots=True)
class ResilienceConfig:
    """
    Configurazione resilience.

    Attributes:
        max_retries: Massimo retry attempts (default: 5)
        base_delay_ms: Delay base per backoff (ms)
        max_delay_ms: Delay massimo (ms)
        exponential_base: Base per exponential backoff (default: 1.5)
        circuit_failure_threshold: Fallimenti prima di aprire circuit (default: 5)
        circuit_recovery_timeout_ms: Tempo prima di half-open
        circuit_success_threshold: Successi per chiudere circuit (default: 3)
        bulkhead_max_concurrent: Max operazioni concorrenti
        fallback_enabled: Se usare fallback tools
        timeout_ms: Timeout per singola operazione
        rate_limit_enabled: Se usare rate limiting
        rate_limit_rps: Richieste per secondo max

    Example:
        >>> config = ResilienceConfig(
        ...     max_retries=5,
        ...     exponential_base=1.5,
        ...     circuit_failure_threshold=5,
        ...     circuit_success_threshold=3,
        ... )
    """

    max_retries: int = 5
    base_delay_ms: int = 100
    max_delay_ms: int = 30000
    exponential_base: float = 1.5  # Changed to 1.5 per requirements
    circuit_failure_threshold: int = 5
    circuit_recovery_timeout_ms: int = 30000
    circuit_success_threshold: int = 3  # Changed to 3 per requirements
    bulkhead_max_concurrent: int = 10
    fallback_enabled: bool = True
    timeout_ms: int = 30000
    rate_limit_enabled: bool = True
    rate_limit_rps: float = 100.0  # requests per second


@dataclass(slots=True)
class ResilienceResult:
    """
    Risultato di operazione con resilience.

    Attributes:
        success: Se operazione riuscita
        value: Valore restituito (se successo)
        error: Errore (se fallimento)
        retries: Numero di retry effettuati
        circuit_state: Stato del circuit dopo operazione
        fallback_used: Se usato fallback
        latency_ms: Latenza totale in ms
    """

    success: bool
    value: Any = None
    error: Exception | None = None
    retries: int = 0
    circuit_state: CircuitState = CircuitState.CLOSED
    fallback_used: bool = False
    latency_ms: float = 0.0


@dataclass
class CircuitBreaker:
    """
    Circuit Breaker per singolo tool.

    Attributes:
        tool_name: Nome del tool monitorato
        state: Stato attuale
        failure_count: Contatore fallimenti
        success_count: Contatore successi
        last_failure_time: Timestamp ultimo fallimento
    """

    tool_name: str
    state: CircuitState = CircuitState.CLOSED
    failure_count: int = 0
    success_count: int = 0
    last_failure_time: float = 0.0


@dataclass
class HybridResilienceHandler:
    """
    Handler per resilience ibrida.

    Combina:
    - Circuit Breaker: Fail fast su tool problematici
    - Retry: Exponential backoff per errori transitori
    - Fallback: Tools alternativi quando primario fallisce
    - Bulkhead: Isolamento per tool

    Example:
        >>> handler = HybridResilienceHandler()
        >>> await handler.initialize()
        >>>
        >>> # Esegui con resilience
        >>> result = await handler.execute_with_resilience(
        ...     tool_name="query_api",
        ...     operation=lambda input: api.call(input),
        ...     input={"endpoint": "/users"},
        ...     fallback_tools=["query_api_v2", "query_api_cache"],
        ... )
        >>>
        >>> if result.success:
        ...     print(result.value)
        >>> else:
        ...     print(f"Failed after {result.retries} retries")
    """

    _config: ResilienceConfig = field(default_factory=ResilienceConfig)
    _circuits: dict[str, CircuitBreaker] = field(default_factory=dict)
    _bulkheads: dict[str, asyncio.Semaphore] = field(default_factory=dict)
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock)
    _initialized: bool = field(default=False, repr=False)

    # Registry globale per cleanup
    _instances: list["HybridResilienceHandler"] = field(
        default_factory=list, init=False, repr=False
    )

    async def initialize(self) -> None:
        """
        Inizializza l'handler con configurazione.

        Registra cleanup handlers e inizializza strutture.
        """
        if self._initialized:
            logger.warning("HybridResilienceHandler già inizializzato")
            return

        # Registra cleanup handler
        atexit.register(self._sync_cleanup)

        # Registra istanza per cleanup globale
        self._instances.append(self)

        self._initialized = True
        logger.info(
            "HybridResilienceHandler inizializzato",
            extra={
                "max_retries": self._config.max_retries,
                "circuit_failure_threshold": self._config.circuit_failure_threshold,
                "bulkhead_max_concurrent": self._config.bulkhead_max_concurrent,
            },
        )

    def _sync_cleanup(self) -> None:
        """Cleanup sincrono per atexit."""
        try:
            # Reset tutti i circuit
            for circuit in self._circuits.values():
                circuit.state = CircuitState.CLOSED
                circuit.failure_count = 0
                circuit.success_count = 0
            logger.info("HybridResilienceHandler cleanup completato")
        except Exception as e:
            logger.error(f"Errore durante cleanup: {e}")

    def _get_or_create_circuit(self, tool_name: str) -> CircuitBreaker:
        """Ottiene o crea circuit breaker per tool."""
        if tool_name not in self._circuits:
            self._circuits[tool_name] = CircuitBreaker(tool_name=tool_name)
        return self._circuits[tool_name]

    def _get_or_create_bulkhead(self, tool_name: str) -> asyncio.Semaphore:
        """Ottiene o crea bulkhead per tool."""
        if tool_name not in self._bulkheads:
            self._bulkheads[tool_name] = asyncio.Semaphore(
                self._config.bulkhead_max_concurrent
            )
        return self._bulkheads[tool_name]

    async def execute_with_resilience(
        self,
        tool_name: str,
        operation: Callable[[Any], Coroutine[Any, Any, Any]],
        input_data: Any = None,
        fallback_tools: list[str] | None = None,
        config: ResilienceConfig | None = None,
    ) -> ResilienceResult:
        """
        Esegue operazione con full resilience stack.

        Flow:
        1. Check circuit breaker
        2. Acquire bulkhead permit
        3. Execute con retry
        4. Fallback se necessario
        5. Update circuit state

        Args:
            tool_name: Nome del tool
            operation: Funzione async da eseguire
            input_data: Input per l'operazione
            fallback_tools: Tools alternativi
            config: Configurazione override

        Returns:
            ResilienceResult con esito

        Example:
            >>> result = await handler.execute_with_resilience(
            ...     tool_name="query_api",
            ...     operation=api.call,
            ...     input={"endpoint": "/users"},
            ...     fallback_tools=["query_api_v2"],
            ... )
        """
        start_time = time.monotonic()
        effective_config = config or self._config

        # Verifica inizializzazione
        if not self._initialized:
            await self.initialize()

        # Step 1: Check circuit breaker
        circuit_state = await self._check_circuit(tool_name)
        if circuit_state == CircuitState.OPEN:
            logger.warning(f"Circuit OPEN per {tool_name}, tentativo fallback")
            # Prova fallback se abilitato
            if effective_config.fallback_enabled and fallback_tools:
                fallback_result = await self._execute_fallback(
                    fallback_tools, input_data
                )
                if fallback_result is not None:
                    fallback_result.fallback_used = True
                    return fallback_result
            # Nessun fallback disponibile
            return ResilienceResult(
                success=False,
                error=Exception(f"Circuit breaker OPEN per tool: {tool_name}"),
                circuit_state=CircuitState.OPEN,
                latency_ms=(time.monotonic() - start_time) * 1000,
            )

        # Step 2: Acquire bulkhead permit
        bulkhead = self._get_or_create_bulkhead(tool_name)

        async with bulkhead:
            # Step 3: Execute con retry
            result = await self._execute_with_retry(
                operation, input_data, effective_config
            )

            # Step 4: Aggiorna circuit state
            if result.success:
                await self._record_success(tool_name, effective_config)
            else:
                await self._record_failure(tool_name, effective_config)

                # Step 5: Fallback se primario fallisce
                if effective_config.fallback_enabled and fallback_tools:
                    fallback_result = await self._execute_fallback(
                        fallback_tools, input_data
                    )
                    if fallback_result is not None:
                        fallback_result.fallback_used = True
                        fallback_result.retries = result.retries
                        return fallback_result

        # Aggiorna stato finale
        circuit = self._get_or_create_circuit(tool_name)
        result.circuit_state = circuit.state
        result.latency_ms = (time.monotonic() - start_time) * 1000

        return result

    async def _execute_with_retry(
        self,
        operation: Callable[[Any], Coroutine[Any, Any, Any]],
        input_data: Any,
        config: ResilienceConfig,
    ) -> ResilienceResult:
        """
        Esegue con exponential backoff retry.

        Args:
            operation: Funzione async
            input_data: Input
            config: Configurazione retry

        Returns:
            ResilienceResult
        """
        last_error: Exception | None = None
        retries = 0

        for attempt in range(config.max_retries + 1):
            try:
                # Esegui con timeout
                timeout_sec = config.timeout_ms / 1000.0
                result = await asyncio.wait_for(
                    operation(input_data), timeout=timeout_sec
                )
                return ResilienceResult(
                    success=True,
                    value=result,
                    retries=attempt,
                )

            except asyncio.TimeoutError as e:
                last_error = e
                logger.warning(
                    f"Timeout (attempt {attempt + 1}/{config.max_retries + 1})"
                )
            except Exception as e:
                last_error = e
                logger.warning(
                    f"Errore (attempt {attempt + 1}/{config.max_retries + 1}): {e}"
                )

            # Calcola backoff se non ultimo tentativo
            if attempt < config.max_retries:
                delay_ms = self._calculate_backoff_delay(attempt, config)
                delay_sec = delay_ms / 1000.0
                logger.debug(f"Backoff: {delay_ms}ms prima di retry")
                await asyncio.sleep(delay_sec)
                retries = attempt + 1

        return ResilienceResult(
            success=False,
            error=last_error,
            retries=retries,
        )

    def _calculate_backoff_delay(
        self,
        attempt: int,
        config: ResilienceConfig,
    ) -> float:
        """
        Calcola delay per exponential backoff.

        Formula: base * (exponential_base ^ attempt) + jitter

        Args:
            attempt: Numero tentativo (0-based)
            config: Configurazione

        Returns:
            Delay in millisecondi
        """
        # Calcola delay base
        delay = config.base_delay_ms * (config.exponential_base**attempt)

        # Applica cap massimo
        delay = min(delay, config.max_delay_ms)

        # Aggiungi jitter (0-50% del delay)
        jitter_range = delay * 0.5
        jitter = random.uniform(0, jitter_range)  # nosec B311
        delay += jitter

        return delay

    async def _check_circuit(self, tool_name: str) -> CircuitState:
        """
        Controlla stato circuit breaker.

        Gestisce transizione OPEN -> HALF_OPEN dopo recovery timeout.

        Args:
            tool_name: Nome del tool

        Returns:
            Stato attuale del circuit
        """
        async with self._lock:
            circuit = self._get_or_create_circuit(tool_name)

            # Se OPEN, verifica se possiamo passare a HALF_OPEN
            if circuit.state == CircuitState.OPEN:
                elapsed_ms = (time.monotonic() - circuit.last_failure_time) * 1000
                if elapsed_ms >= self._config.circuit_recovery_timeout_ms:
                    circuit.state = CircuitState.HALF_OPEN
                    circuit.success_count = 0
                    logger.info(
                        f"Circuit {tool_name}: OPEN -> HALF_OPEN "
                        f"(elapsed: {elapsed_ms:.0f}ms)"
                    )

            return circuit.state

    async def _record_success(
        self, tool_name: str, config: ResilienceConfig | None = None
    ) -> None:
        """
        Registra successo, potenzialmente chiude circuit.

        In stato HALF_OPEN, dopo success_threshold successi,
        chiude il circuit.

        Args:
            tool_name: Nome del tool
            config: Configurazione da usare (o default se None)
        """
        effective_config = config or self._config
        async with self._lock:
            circuit = self._get_or_create_circuit(tool_name)

            if circuit.state == CircuitState.HALF_OPEN:
                circuit.success_count += 1
                if circuit.success_count >= effective_config.circuit_success_threshold:
                    circuit.state = CircuitState.CLOSED
                    circuit.failure_count = 0
                    circuit.success_count = 0
                    logger.info(f"Circuit {tool_name}: HALF_OPEN -> CLOSED")
            elif circuit.state == CircuitState.CLOSED:
                # Reset failure count su successo
                circuit.failure_count = 0

    async def _record_failure(
        self, tool_name: str, config: ResilienceConfig | None = None
    ) -> None:
        """
        Registra fallimento, potenzialmente apre circuit.

        Dopo failure_threshold fallimenti, apre il circuit.
        In stato HALF_OPEN, un singolo fallimento riapre.

        Args:
            tool_name: Nome del tool
            config: Configurazione da usare (o default se None)
        """
        effective_config = config or self._config
        async with self._lock:
            circuit = self._get_or_create_circuit(tool_name)
            circuit.failure_count += 1
            circuit.last_failure_time = time.monotonic()

            if circuit.state == CircuitState.HALF_OPEN:
                # Singolo fallimento in HALF_OPEN -> OPEN
                circuit.state = CircuitState.OPEN
                logger.warning(f"Circuit {tool_name}: HALF_OPEN -> OPEN")
            elif circuit.state == CircuitState.CLOSED:
                if circuit.failure_count >= effective_config.circuit_failure_threshold:
                    circuit.state = CircuitState.OPEN
                    logger.warning(
                        f"Circuit {tool_name}: CLOSED -> OPEN "
                        f"(failures: {circuit.failure_count})"
                    )

    async def _execute_fallback(
        self,
        fallback_tools: list[str],
        input_data: Any,
    ) -> ResilienceResult | None:
        """
        Tenta esecuzione con tools fallback.

        Nota: Questo metodo è un placeholder per l'integrazione
        con il sistema di routing dei tool. L'implementazione
        effettiva richiede un registry di tool o un router.

        Args:
            fallback_tools: Lista tools alternativi
            input_data: Input originale

        Returns:
            ResilienceResult se fallback riesce, None altrimenti
        """
        # Placeholder: logica di fallback richiede integrazione
        # con il tool registry del sistema
        for fallback_tool in fallback_tools:
            # Verifica se il fallback tool ha circuit aperto
            circuit_state = await self._check_circuit(fallback_tool)
            if circuit_state == CircuitState.OPEN:
                logger.debug(f"Fallback tool {fallback_tool} ha circuit OPEN, skip")
                continue

            # Qui andrebbe l'esecuzione effettiva del tool fallback
            # richiede integrazione con ToolRegistry o Router
            logger.info(f"Tentativo fallback con tool: {fallback_tool}")

            # Placeholder: ritorna None per indicare che il fallback
            # non è stato eseguito (richiede integrazione esterna)
            # In produzione, questo eseguirebbe il tool fallback
            # e ritornerebbe il risultato

        return None

    def get_circuit_status(self, tool_name: str) -> dict[str, Any]:
        """
        Ottiene stato del circuit breaker per un tool.

        Args:
            tool_name: Nome del tool

        Returns:
            Dict con state, failure_count, etc.
        """
        if tool_name not in self._circuits:
            return {
                "tool_name": tool_name,
                "state": CircuitState.CLOSED.value,
                "failure_count": 0,
                "success_count": 0,
                "last_failure_time": None,
                "exists": False,
            }

        circuit = self._circuits[tool_name]
        return {
            "tool_name": tool_name,
            "state": circuit.state.value,
            "failure_count": circuit.failure_count,
            "success_count": circuit.success_count,
            "last_failure_time": circuit.last_failure_time,
            "exists": True,
        }

    def reset_circuit(self, tool_name: str) -> None:
        """
        Reset forzato del circuit breaker.

        Imposta stato a CLOSED e resetta contatori.

        Args:
            tool_name: Nome del tool
        """
        if tool_name in self._circuits:
            circuit = self._circuits[tool_name]
            circuit.state = CircuitState.CLOSED
            circuit.failure_count = 0
            circuit.success_count = 0
            logger.info(f"Circuit {tool_name} resettato a CLOSED")
        else:
            logger.debug(f"Circuit {tool_name} non esiste, nulla da resettare")

    def get_all_circuits(self) -> dict[str, dict[str, Any]]:
        """
        Ottiene stato di tutti i circuit breakers.

        Returns:
            Dict tool_name -> circuit status
        """
        return {
            tool_name: self.get_circuit_status(tool_name)
            for tool_name in self._circuits
        }


# =============================================================================
# FALLBACK CHAIN
# =============================================================================

@dataclass
class FallbackChain:
    """
    Catena di fallback con priorita.

    Gestisce una lista di tools fallback ordinati per priorita.
    Quando il tool primario fallisce, prova i fallback in ordine.

    Attributes:
        primary_tool: Nome del tool primario
        fallback_tools: Lista di tools fallback ordinati
        circuit_breakers: Riferimento ai circuit breakers (per saltare tools OPEN)

    Example:
        >>> chain = FallbackChain("api_v1", ["api_v2", "api_cache", "api_mock"])
        >>> for tool in chain.get_available_tools():
        ...     result = await execute_tool(tool, input_data)
        ...     if result.success:
        ...         break
    """

    primary_tool: str
    fallback_tools: list[str] = field(default_factory=list)
    _failed_tools: set[str] = field(default_factory=set, repr=False)

    def get_available_tools(self, exclude_circuits: set[str] | None = None) -> list[str]:
        """
        Ottiene lista di tools disponibili (primario + fallback).

        Args:
            exclude_circuits: Set di tools con circuit OPEN da escludere

        Returns:
            Lista di tools nell'ordine: primario, poi fallback
        """
        exclude = exclude_circuits or set()
        tools = [self.primary_tool]
        tools.extend(t for t in self.fallback_tools if t not in self._failed_tools)
        return [t for t in tools if t not in exclude]

    def mark_failed(self, tool_name: str) -> None:
        """
        Marca un tool come fallito per questa esecuzione.

        Args:
            tool_name: Nome del tool fallito
        """
        self._failed_tools.add(tool_name)

    def reset(self) -> None:
        """Resetta la lista di tools falliti."""
        self._failed_tools.clear()

    def add_fallback(self, tool_name: str, priority: int | None = None) -> None:
        """
        Aggiunge un tool fallback alla catena.

        Args:
            tool_name: Nome del tool fallback
            priority: Posizione nella lista (None = append)
        """
        if tool_name not in self.fallback_tools and tool_name != self.primary_tool:
            if priority is not None and 0 <= priority < len(self.fallback_tools):
                self.fallback_tools.insert(priority, tool_name)
            else:
                self.fallback_tools.append(tool_name)

    def remove_fallback(self, tool_name: str) -> bool:
        """
        Rimuove un tool fallback dalla catena.

        Args:
            tool_name: Nome del tool da rimuovere

        Returns:
            True se rimosso, False se non presente
        """
        if tool_name in self.fallback_tools:
            self.fallback_tools.remove(tool_name)
            return True
        return False


# =============================================================================
# RESILIENCE METRICS
# =============================================================================

@dataclass
class ResilienceMetrics:
    """
    Metriche aggregate per resilience.

    Track:
    - Esecuzioni totali, successi, fallimenti
    - Retry totali e medi
    - Fallback utilizzati
    - Circuit breaker transizioni
    - Latenza media

    Example:
        >>> metrics = ResilienceMetrics()
        >>> metrics.record_execution(success=True, latency_ms=50, retries=0)
        >>> metrics.record_execution(success=False, latency_ms=100, retries=3)
        >>> print(metrics.get_summary())
    """

    total_executions: int = 0
    successful_executions: int = 0
    failed_executions: int = 0
    total_retries: int = 0
    fallback_used_count: int = 0
    circuit_opens: int = 0
    circuit_closes: int = 0
    total_latency_ms: float = 0.0
    _latency_samples: deque = field(
        default_factory=lambda: deque(maxlen=1000), repr=False
    )
    _lock: RLock = field(default_factory=RLock, repr=False)

    def record_execution(
        self,
        success: bool,
        latency_ms: float,
        retries: int = 0,
        fallback_used: bool = False,
    ) -> None:
        """
        Registra un'esecuzione.

        Args:
            success: Se l'esecuzione e' riuscita
            latency_ms: Latenza in millisecondi
            retries: Numero di retry effettuati
            fallback_used: Se e' stato usato un fallback
        """
        with self._lock:
            self.total_executions += 1
            self.total_retries += retries
            self.total_latency_ms += latency_ms
            self._latency_samples.append(latency_ms)

            if success:
                self.successful_executions += 1
            else:
                self.failed_executions += 1

            if fallback_used:
                self.fallback_used_count += 1

    def record_circuit_transition(self, opened: bool) -> None:
        """
        Registra transizione circuit breaker.

        Args:
            opened: True se aperto, False se chiuso
        """
        with self._lock:
            if opened:
                self.circuit_opens += 1
            else:
                self.circuit_closes += 1

    @property
    def success_rate(self) -> float:
        """Calcola tasso di successo."""
        with self._lock:
            if self.total_executions == 0:
                return 1.0
            return self.successful_executions / self.total_executions

    @property
    def average_latency_ms(self) -> float:
        """Calcola latenza media."""
        with self._lock:
            if self.total_executions == 0:
                return 0.0
            return self.total_latency_ms / self.total_executions

    @property
    def average_retries(self) -> float:
        """Calcola retry medi per esecuzione."""
        with self._lock:
            if self.total_executions == 0:
                return 0.0
            return self.total_retries / self.total_executions

    @property
    def p99_latency_ms(self) -> float:
        """Calcola P99 latenza."""
        with self._lock:
            if not self._latency_samples:
                return 0.0
            sorted_samples = sorted(self._latency_samples)
            idx = int(len(sorted_samples) * 0.99)
            return sorted_samples[min(idx, len(sorted_samples) - 1)]

    def get_summary(self) -> dict[str, Any]:
        """
        Ottiene riepilogo metriche.

        Returns:
            Dict con tutte le metriche aggregate
        """
        with self._lock:
            return {
                "total_executions": self.total_executions,
                "successful_executions": self.successful_executions,
                "failed_executions": self.failed_executions,
                "success_rate": round(self.success_rate, 4),
                "total_retries": self.total_retries,
                "average_retries": round(self.average_retries, 2),
                "fallback_used_count": self.fallback_used_count,
                "fallback_rate": (
                    round(self.fallback_used_count / self.total_executions, 4)
                    if self.total_executions > 0 else 0.0
                ),
                "circuit_opens": self.circuit_opens,
                "circuit_closes": self.circuit_closes,
                "average_latency_ms": round(self.average_latency_ms, 2),
                "p99_latency_ms": round(self.p99_latency_ms, 2),
            }

    def reset(self) -> None:
        """Resetta tutte le metriche."""
        with self._lock:
            self.total_executions = 0
            self.successful_executions = 0
            self.failed_executions = 0
            self.total_retries = 0
            self.fallback_used_count = 0
            self.circuit_opens = 0
            self.circuit_closes = 0
            self.total_latency_ms = 0.0
            self._latency_samples.clear()


# =============================================================================
# HYBRID RESILIENCE - MAIN API CLASS
# =============================================================================

class HybridResilience:
    """
    API pubblica per Hybrid Resilience.

    Fornisce un'interfaccia semplificata per eseguire operazioni
    con resilience completa (circuit breaker + retry + fallback + rate limiting).

    Features:
    - Circuit Breaker (CLOSED, OPEN, HALF_OPEN)
    - Retry con Exponential Backoff (max 5, base 1.5)
    - Fallback Chain con degradazione graceful
    - Rate Limiting integrato (token bucket adaptive)

    Example:
        >>> from lib.v17 import HybridResilience
        >>> resilience = HybridResilience()
        >>> await resilience.initialize()
        >>>
        >>> # Esegui con resilience
        >>> async def my_api_call(data):
        ...     return await api.post(data)
        >>>
        >>> result = await resilience.execute(
        ...     my_api_call,
        ...     {"input": "data"},
        ...     tool_name="api_v1",
        ...     fallback_tools=["api_v2", "api_cache"]
        ... )
        >>>
        >>> # Controlla stato
        >>> state = resilience.get_circuit_state("api_v1")
        >>> metrics = resilience.get_metrics()

    Attributes:
        config: Configurazione resilience
        handler: HybridResilienceHandler interno
        metrics: Metriche aggregate
        rate_limiter: Rate limiter opzionale
    """

    def __init__(
        self,
        config: ResilienceConfig | None = None,
        rate_limiter: "AdaptiveRateLimiter | None" = None,
    ):
        """
        Inizializza HybridResilience.

        Args:
            config: Configurazione resilience (default se None)
            rate_limiter: Rate limiter esterno (opzionale)
        """
        self.config = config or ResilienceConfig()
        self._handler = HybridResilienceHandler(_config=self.config)
        self._metrics = ResilienceMetrics()
        self._rate_limiter = rate_limiter
        self._initialized = False
        self._lock = asyncio.Lock()

    async def initialize(self) -> None:
        """
        Inizializza il sistema di resilience.

        Registra cleanup handlers e inizializza strutture interne.
        """
        if self._initialized:
            return

        async with self._lock:
            if self._initialized:
                return

            await self._handler.initialize()
            self._initialized = True

            logger.info(
                "HybridResilience inizializzato",
                extra={
                    "max_retries": self.config.max_retries,
                    "exponential_base": self.config.exponential_base,
                    "circuit_failure_threshold": self.config.circuit_failure_threshold,
                    "rate_limit_enabled": self.config.rate_limit_enabled,
                },
            )

    async def execute(
        self,
        func: Callable[..., Coroutine[Any, Any, Any]],
        *args: Any,
        tool_name: str = "default",
        fallback_tools: list[str] | None = None,
        **kwargs: Any,
    ) -> Any:
        """
        Esegue una funzione async con full resilience stack.

        Flow:
        1. Verifica inizializzazione
        2. Check rate limiting (se abilitato)
        3. Check circuit breaker
        4. Acquire bulkhead permit
        5. Execute con retry + exponential backoff
        6. Fallback se necessario
        7. Update metriche e circuit state

        Args:
            func: Funzione async da eseguire
            *args: Argomenti posizionali per func
            tool_name: Nome del tool (per tracking)
            fallback_tools: Tools fallback opzionali
            **kwargs: Keyword arguments per func

        Returns:
            Risultato della funzione

        Raises:
            Exception: Se tutte le opzioni falliscono

        Example:
            >>> result = await resilience.execute(
            ...     my_async_func,
            ...     "arg1", "arg2",
            ...     tool_name="api_call",
            ...     fallback_tools=["api_v2"],
            ...     key="value"
            ... )
        """
        if not self._initialized:
            await self.initialize()

        start_time = time.monotonic()
        fallback_used = False

        # Step 1: Rate limiting check
        if self.config.rate_limit_enabled and self._rate_limiter:
            allowed = await self._rate_limiter.async_acquire(tool_name)
            if not allowed:
                retry_after = self._rate_limiter.get_retry_after(tool_name)
                logger.warning(f"Rate limited per {tool_name}, retry_after={retry_after:.2f}s")
                raise Exception(f"Rate limit exceeded for {tool_name}. Retry after {retry_after:.2f}s")

        # Step 2: Crea wrapper per la funzione con args/kwargs
        async def operation(_: Any) -> Any:
            return await func(*args, **kwargs)

        # Step 3: Esegui con resilience
        result = await self._handler.execute_with_resilience(
            tool_name=tool_name,
            operation=operation,
            input_data=None,  # args/kwargs sono nella closure
            fallback_tools=fallback_tools,
            config=self.config,
        )

        fallback_used = result.fallback_used
        latency_ms = (time.monotonic() - start_time) * 1000

        # Step 4: Registra metriche
        self._metrics.record_execution(
            success=result.success,
            latency_ms=latency_ms,
            retries=result.retries,
            fallback_used=fallback_used,
        )

        # Step 5: Registra outcome nel rate limiter
        if self.config.rate_limit_enabled and self._rate_limiter:
            await self._rate_limiter.async_record_outcome(
                resource=tool_name,
                success=result.success,
                latency_ms=latency_ms,
            )

        # Step 6: Gestisci risultato
        if result.success:
            return result.value
        else:
            error_msg = f"Resilience failed for {tool_name}"
            if result.error:
                error_msg += f": {result.error}"
            if result.retries > 0:
                error_msg += f" (after {result.retries} retries)"
            if fallback_used:
                error_msg += " (fallback attempted)"

            if result.error:
                raise result.error
            raise Exception(error_msg)

    def get_circuit_state(self, tool_name: str = "default") -> CircuitState:
        """
        Ottiene lo stato del circuit breaker per un tool.

        Args:
            tool_name: Nome del tool

        Returns:
            CircuitState corrente (CLOSED, OPEN, HALF_OPEN)

        Example:
            >>> state = resilience.get_circuit_state("api_v1")
            >>> if state == CircuitState.OPEN:
            ...     print("Circuit is open, service unavailable")
        """
        circuit = self._handler._circuits.get(tool_name)
        if circuit is None:
            return CircuitState.CLOSED
        return circuit.state

    def get_metrics(self) -> Dict[str, Any]:
        """
        Ottiene metriche aggregate di resilience.

        Returns:
            Dict con metriche complete:
            - total_executions, success_rate, average_latency
            - retries, fallback_usage, circuit_transitions

        Example:
            >>> metrics = resilience.get_metrics()
            >>> print(f"Success rate: {metrics['success_rate']:.2%}")
            >>> print(f"Avg latency: {metrics['average_latency_ms']:.2f}ms")
        """
        summary = self._metrics.get_summary()

        # Aggiungi info circuit breakers
        circuits_info = self._handler.get_all_circuits()
        open_circuits = sum(
            1 for c in circuits_info.values()
            if c.get("state") == CircuitState.OPEN.value
        )
        half_open_circuits = sum(
            1 for c in circuits_info.values()
            if c.get("state") == CircuitState.HALF_OPEN.value
        )

        summary["circuits_total"] = len(circuits_info)
        summary["circuits_open"] = open_circuits
        summary["circuits_half_open"] = half_open_circuits
        summary["circuits_closed"] = len(circuits_info) - open_circuits - half_open_circuits

        # Aggiungi config corrente
        summary["config"] = {
            "max_retries": self.config.max_retries,
            "exponential_base": self.config.exponential_base,
            "circuit_failure_threshold": self.config.circuit_failure_threshold,
            "circuit_success_threshold": self.config.circuit_success_threshold,
            "bulkhead_max_concurrent": self.config.bulkhead_max_concurrent,
        }

        return summary

    def get_circuit_status(self, tool_name: str) -> Dict[str, Any]:
        """
        Ottiene stato dettagliato del circuit breaker.

        Args:
            tool_name: Nome del tool

        Returns:
            Dict con stato, failure_count, success_count, etc.
        """
        return self._handler.get_circuit_status(tool_name)

    def reset_circuit(self, tool_name: str) -> None:
        """
        Reset forzato del circuit breaker.

        Args:
            tool_name: Nome del tool
        """
        self._handler.reset_circuit(tool_name)
        logger.info(f"Circuit reset: {tool_name}")

    def reset_all_circuits(self) -> None:
        """Reset di tutti i circuit breakers."""
        for tool_name in list(self._handler._circuits.keys()):
            self._handler.reset_circuit(tool_name)
        logger.info("All circuits reset")

    def reset_metrics(self) -> None:
        """Reset delle metriche aggregate."""
        self._metrics.reset()
        logger.info("Metrics reset")


# =============================================================================
# DECORATOR
# =============================================================================

def resilient(
    tool_name: str = "default",
    fallback_tools: list[str] | None = None,
    config: ResilienceConfig | None = None,
    resilience_instance: HybridResilience | None = None,
) -> Callable:
    """
    Decorator per aggiungere resilience a funzioni async.

    Args:
        tool_name: Nome del tool per tracking
        fallback_tools: Tools fallback opzionali
        config: Configurazione resilience
        resilience_instance: Istanza HybridResilience (crea nuova se None)

    Returns:
        Decorated function con resilience

    Example:
        >>> @resilient("api_call", fallback_tools=["api_v2"])
        ... async def fetch_data(endpoint):
        ...     return await api.get(endpoint)
        >>>
        >>> result = await fetch_data("/users")
    """
    _resilience = resilience_instance
    _config = config or ResilienceConfig()

    def decorator(func: Callable[..., Coroutine[Any, Any, Any]]) -> Callable[..., Coroutine[Any, Any, Any]]:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            nonlocal _resilience

            if _resilience is None:
                _resilience = HybridResilience(config=_config)
                await _resilience.initialize()

            return await _resilience.execute(
                func,
                *args,
                tool_name=tool_name,
                fallback_tools=fallback_tools,
                **kwargs,
            )

        return wrapper

    return decorator


# =============================================================================
# ALIAS FOR BACKWARD COMPATIBILITY
# =============================================================================

# HybridResilienceHandler is already defined above
# This alias is exported in __all__ for backward compatibility

# Additional aliases for external use
CircuitState = CircuitState  # Re-export enum
ResilienceMetrics = ResilienceMetrics  # Metrics class
FallbackChain = FallbackChain  # Fallback chain utility
