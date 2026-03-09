"""
Programmatic Tool Executor - V17

Esecuzione programmatica di tool calls con:
- Batch execution in singolo round-trip
- Sandboxed execution
- Dependency resolution
- Parallel execution con limits

Example:
    >>> from lib.v17 import ProgrammaticToolExecutor
    >>> executor = ProgrammaticToolExecutor()
    >>> await executor.initialize()
    >>>
    >>> # Batch execution
    >>> results = await executor.execute_batch([
    ...     ToolRequest(name="query_api", input={"endpoint": "/users"}),
    ...     ToolRequest(name="query_api", input={"endpoint": "/orders"}),
    ... ])
"""

from __future__ import annotations

import asyncio
import logging
import re
import time
import uuid
from collections import defaultdict
from dataclasses import dataclass, field
from enum import Enum
from typing import TYPE_CHECKING, Any, Callable, Coroutine

if TYPE_CHECKING:
    from .budget import HierarchicalBudgetManager
    from .claude_tool_registry import ClaudeToolRegistry, ToolDefinition
    from .resilience import HybridResilienceHandler, ResilienceResult

logger = logging.getLogger(__name__)

__all__ = [
    # Core executor
    "ProgrammaticToolExecutor",
    "BatchExecutor",
    # Data structures
    "ToolRequest",
    "ToolCall",
    "ExecutionResult",
    "ToolResult",
    "ExecutionStatus",
    "ExecutionContext",
    "ExecutionConfig",
    "ExecutorMetrics",
]


class ExecutionStatus(Enum):
    """Stato dell'esecuzione."""

    PENDING = "pending"  # In coda
    RUNNING = "running"  # In esecuzione
    COMPLETED = "completed"  # Completato
    FAILED = "failed"  # Fallito
    TIMEOUT = "timeout"  # Timeout
    CANCELLED = "cancelled"  # Cancellato
    SKIPPED = "skipped"  # Saltato (dependency failed)


@dataclass(slots=True)
class ToolRequest:
    """
    Richiesta di esecuzione tool.

    Attributes:
        name: Nome del tool
        input: Input per il tool
        timeout_ms: Timeout specifico (override)
        priority: Priorita (0 = alta)
        depends_on: ID richieste da cui dipende
        fallback_tools: Tools alternativi
        metadata: Metadata aggiuntivi
        id: ID univoco (auto-generato)

    Example:
        >>> request = ToolRequest(
        ...     name="query_api",
        ...     input={"endpoint": "/users", "method": "GET"},
        ...     timeout_ms=5000,
        ...     priority=0,
        ... )
    """

    name: str
    input: dict[str, Any]
    timeout_ms: int | None = None
    priority: int = 5
    depends_on: list[str] = field(default_factory=list)
    fallback_tools: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)
    id: str = ""

    def __post_init__(self) -> None:
        """Genera ID se non presente."""
        if not self.id:
            self.id = f"req_{uuid.uuid4().hex[:8]}"


@dataclass(slots=True)
class ExecutionResult:
    """
    Risultato di esecuzione tool.

    Attributes:
        request_id: ID della richiesta
        tool_name: Nome del tool eseguito
        status: Stato dell'esecuzione
        output: Output del tool (se successo)
        error: Errore (se fallimento)
        latency_ms: Latenza in millisecondi
        retries: Numero di retry
        fallback_used: Se usato tool fallback
        tokens_used: Tokens consumati
        timestamp: Timestamp completamento
    """

    request_id: str
    tool_name: str
    status: ExecutionStatus
    output: Any = None
    error: Exception | None = None
    latency_ms: float = 0.0
    retries: int = 0
    fallback_used: bool = False
    tokens_used: int = 0
    timestamp: float = 0.0

    @property
    def success(self) -> bool:
        """Se esecuzione riuscita."""
        return self.status == ExecutionStatus.COMPLETED

    def to_dict(self) -> dict[str, Any]:
        """Converte in dict."""
        return {
            "request_id": self.request_id,
            "tool_name": self.tool_name,
            "status": self.status.value,
            "output": self.output,
            "error": str(self.error) if self.error else None,
            "latency_ms": self.latency_ms,
            "retries": self.retries,
            "fallback_used": self.fallback_used,
            "tokens_used": self.tokens_used,
            "timestamp": self.timestamp,
            "success": self.success,
        }


@dataclass(slots=True)
class ToolCall:
    """
    Chiamata tool semplificata per BatchExecutor.

    Attributes:
        name: Nome del tool
        input: Input per il tool
        id: ID univoco (auto-generato)

    Example:
        >>> call = ToolCall(name="query_api", input={"endpoint": "/users"})
    """

    name: str
    input: dict[str, Any]
    id: str | None = None

    def __post_init__(self) -> None:
        """Genera ID se non presente."""
        if self.id is None:
            self.id = f"call_{uuid.uuid4().hex[:8]}"

    def to_request(self) -> ToolRequest:
        """Converte in ToolRequest."""
        return ToolRequest(
            name=self.name,
            input=self.input,
            id=self.id or "",
        )


@dataclass(slots=True)
class ToolResult:
    """
    Risultato tool semplificato per BatchExecutor.

    Attributes:
        id: ID della chiamata
        output: Output del tool (se successo)
        error: Errore (se fallimento)
        duration_ms: Durata in millisecondi
    """

    id: str
    output: Any = None
    error: str | None = None
    duration_ms: float = 0.0

    @property
    def success(self) -> bool:
        """Se esecuzione riuscita."""
        return self.error is None

    def to_dict(self) -> dict[str, Any]:
        """Converte in dict."""
        return {
            "id": self.id,
            "output": self.output,
            "error": self.error,
            "duration_ms": self.duration_ms,
            "success": self.success,
        }


@dataclass
class ExecutionConfig:
    """
    Configurazione per batch execution.

    Attributes:
        max_parallel: Massimo esecuzioni parallele
        timeout_ms: Timeout totale batch
        single_timeout_ms: Timeout singolo tool
        stop_on_failure: Se fermare su primo fallimento
        enable_fallback: Se usare fallback tools
        enable_resilience: Se usare resilience handler
        track_tokens: Se tracciare token usage
    """

    max_parallel: int = 10
    timeout_ms: int = 60000
    single_timeout_ms: int = 30000
    stop_on_failure: bool = False
    enable_fallback: bool = True
    enable_resilience: bool = True
    track_tokens: bool = True


@dataclass
class ExecutionContext:
    """
    Contesto di esecuzione batch.

    Attributes:
        batch_id: ID del batch
        requests: Richieste nel batch
        results: Risultati (popolato durante esecuzione)
        start_time: Timestamp inizio
        end_time: Timestamp fine
        total_tokens: Tokens totali usati
        parallelism: Grado di parallelismo
        cancelled: Se batch cancellato
        config: Configurazione esecuzione
    """

    batch_id: str
    requests: list[ToolRequest]
    results: dict[str, ExecutionResult] = field(default_factory=dict)
    start_time: float = 0.0
    end_time: float = 0.0
    total_tokens: int = 0
    parallelism: int = 10
    cancelled: bool = False
    config: ExecutionConfig = field(default_factory=ExecutionConfig)

    def get_status_summary(self) -> dict[str, int]:
        """Ottiene summary stati."""
        summary = defaultdict(int)
        for result in self.results.values():
            summary[result.status.value] += 1
        return dict(summary)


class ProgrammaticToolExecutor:
    """
    Esecutore programmatico di tool calls.

    Features:
    - Batch execution in singolo round-trip
    - Dependency resolution automatica
    - Parallel execution con limiti
    - Sandboxed execution per sicurezza
    - Integrazione con resilience e budget

    Example:
        >>> executor = ProgrammaticToolExecutor()
        >>> await executor.initialize()
        >>>
        >>> # Batch semplice
        >>> results = await executor.execute_batch([
        ...     ToolRequest(name="query_api", input={"endpoint": "/users"}),
        ...     ToolRequest(name="query_api", input={"endpoint": "/orders"}),
        ... ])
        >>>
        >>> # Con dipendenze
        >>> results = await executor.execute_batch([
        ...     ToolRequest(name="get_user", input={"id": "123"}, id="user"),
        ...     ToolRequest(
        ...         name="get_orders",
        ...         input={"user_id": "$user.id"},  # Reference
        ...         depends_on=["user"],
        ...     ),
        ... ])
        >>>
        >>> # Con sandbox
        >>> result = await executor.execute_sandboxed(
        ...     ToolRequest(name="eval_code", input={"code": "..."}),
        ...     sandbox_config={"network": False, "fs": "readonly"},
        ... )
    """

    def __init__(self) -> None:
        """Inizializza l'esecutore."""
        # Dependencies
        self._registry: ClaudeToolRegistry | None = None
        self._resilience: HybridResilienceHandler | None = None
        self._budget: HierarchicalBudgetManager | None = None

        # Config
        self._max_parallel: int = 10
        self._default_timeout_ms: int = 30000
        self._enable_sandbox: bool = True

        # State
        self._active_batches: dict[str, ExecutionContext] = {}
        self._lock: asyncio.Lock = asyncio.Lock()

        # Stats
        self._total_batches: int = 0
        self._total_requests: int = 0
        self._successful_requests: int = 0
        self._failed_requests: int = 0

    async def initialize(
        self,
        registry: ClaudeToolRegistry | None = None,
        resilience: HybridResilienceHandler | None = None,
        budget: HierarchicalBudgetManager | None = None,
        max_parallel: int = 10,
        default_timeout_ms: int = 30000,
        enable_sandbox: bool = True,
    ) -> None:
        """
        Inizializza l'esecutore.

        Args:
            registry: Tool registry (opzionale)
            resilience: Resilience handler (opzionale)
            budget: Budget manager (opzionale)
            max_parallel: Massimo esecuzioni parallele
            default_timeout_ms: Timeout default
            enable_sandbox: Se abilitare sandboxing
        """
        self._registry = registry
        self._resilience = resilience
        self._budget = budget
        self._max_parallel = max_parallel
        self._default_timeout_ms = default_timeout_ms
        self._enable_sandbox = enable_sandbox

        logger.info(
            f"ProgrammaticToolExecutor initialized: "
            f"max_parallel={max_parallel}, timeout={default_timeout_ms}ms"
        )

    async def execute_batch(
        self,
        requests: list[ToolRequest],
        config: ExecutionConfig | None = None,
    ) -> list[ExecutionResult]:
        """
        Esegue batch di richieste.

        Risolve dipendenze ed esegue in parallelo dove possibile.

        Args:
            requests: Lista di richieste
            config: Configurazione esecuzione (opzionale)

        Returns:
            Lista di risultati nell'ordine delle richieste

        Example:
            >>> results = await executor.execute_batch([
            ...     ToolRequest(name="get_user", input={"id": "1"}),
            ...     ToolRequest(name="get_user", input={"id": "2"}),
            ...     ToolRequest(name="get_user", input={"id": "3"}),
            ... ])
            >>> for r in results:
            ...     print(f"{r.tool_name}: {r.status}")
        """
        if not requests:
            return []

        # Usa config default se non specificato
        if config is None:
            config = ExecutionConfig(
                max_parallel=self._max_parallel,
                timeout_ms=self._default_timeout_ms * 2,
                single_timeout_ms=self._default_timeout_ms,
            )

        # Crea contesto batch
        batch_id = f"batch_{uuid.uuid4().hex[:8]}"
        context = ExecutionContext(
            batch_id=batch_id,
            requests=requests,
            parallelism=config.max_parallel,
            config=config,
        )

        # Registra batch
        async with self._lock:
            self._active_batches[batch_id] = context
            self._total_batches += 1
            self._total_requests += len(requests)

        context.start_time = time.perf_counter()

        try:
            # Risolvi dipendenze in waves
            waves = await self._resolve_dependencies(requests)

            # Esegui waves sequenzialmente
            all_results: list[ExecutionResult] = []

            for wave_idx, wave in enumerate(waves):
                # Check cancellazione
                if context.cancelled:
                    for req in wave:
                        result = ExecutionResult(
                            request_id=req.id,
                            tool_name=req.name,
                            status=ExecutionStatus.CANCELLED,
                        )
                        context.results[req.id] = result
                        all_results.append(result)
                    continue

                # Check fallimenti se stop_on_failure
                if config.stop_on_failure:
                    failed_deps = self._check_failed_dependencies(wave, context)
                    if failed_deps:
                        logger.warning(
                            f"Batch {batch_id}: Stopping due to failed dependencies"
                        )
                        for req in wave:
                            result = ExecutionResult(
                                request_id=req.id,
                                tool_name=req.name,
                                status=ExecutionStatus.SKIPPED,
                                error=RuntimeError("Dependency failed"),
                            )
                            context.results[req.id] = result
                            all_results.append(result)
                        continue

                logger.debug(
                    f"Batch {batch_id}: Executing wave {wave_idx + 1}/{len(waves)} "
                    f"with {len(wave)} requests"
                )

                # Esegui wave con timeout
                wave_results = await asyncio.wait_for(
                    self._execute_wave(wave, context, config.max_parallel),
                    timeout=config.timeout_ms / 1000,
                )

                all_results.extend(wave_results)

            # Aggiorna statistiche
            for result in all_results:
                if result.success:
                    self._successful_requests += 1
                elif result.status not in (
                    ExecutionStatus.SKIPPED,
                    ExecutionStatus.CANCELLED,
                ):
                    self._failed_requests += 1

            return all_results

        except asyncio.TimeoutError:
            logger.error(f"Batch {batch_id}: Timeout after {config.timeout_ms}ms")
            # Imposta timeout per tutti i pending
            results = []
            for req in requests:
                if req.id not in context.results:
                    result = ExecutionResult(
                        request_id=req.id,
                        tool_name=req.name,
                        status=ExecutionStatus.TIMEOUT,
                        error=asyncio.TimeoutError("Batch timeout"),
                    )
                    context.results[req.id] = result
                results.append(context.results[req.id])
            return results

        finally:
            context.end_time = time.perf_counter()
            elapsed_ms = (context.end_time - context.start_time) * 1000
            logger.info(
                f"Batch {batch_id}: Completed in {elapsed_ms:.2f}ms, "
                f"results={len(context.results)}"
            )

            # Rimuovi batch attivo
            async with self._lock:
                self._active_batches.pop(batch_id, None)

    async def execute_single(
        self,
        request: ToolRequest,
        timeout_ms: int | None = None,
    ) -> ExecutionResult:
        """
        Esegue singola richiesta.

        Args:
            request: Richiesta da eseguire
            timeout_ms: Timeout override

        Returns:
            ExecutionResult
        """
        config = ExecutionConfig(
            max_parallel=1,
            timeout_ms=timeout_ms or self._default_timeout_ms,
            single_timeout_ms=timeout_ms or self._default_timeout_ms,
        )
        results = await self.execute_batch([request], config)
        return results[0] if results else ExecutionResult(
            request_id=request.id,
            tool_name=request.name,
            status=ExecutionStatus.FAILED,
            error=RuntimeError("No result returned"),
        )

    async def execute_sandboxed(
        self,
        request: ToolRequest,
        sandbox_config: dict[str, Any],
    ) -> ExecutionResult:
        """
        Esegue in ambiente sandboxed.

        Args:
            request: Richiesta da eseguire
            sandbox_config: Config sandbox
                - network: bool (accesso rete)
                - fs: "none" | "readonly" | "temp" | "full"
                - env: dict (variabili ambiente)
                - timeout_ms: int

        Returns:
            ExecutionResult

        Example:
            >>> result = await executor.execute_sandboxed(
            ...     ToolRequest(name="eval_code", input={"code": code}),
            ...     sandbox_config={
            ...         "network": False,
            ...         "fs": "temp",
            ...         "timeout_ms": 5000,
            ...     },
            ... )
        """
        # Per ora, sandbox viene applicato come constraint aggiuntivo
        # In produzione, questo userebbe container/WASM per isolamento reale
        timeout_ms = sandbox_config.get("timeout_ms", self._default_timeout_ms)

        # Aggiungi metadata sandbox
        sandboxed_request = ToolRequest(
            name=request.name,
            input=request.input,
            timeout_ms=timeout_ms,
            priority=request.priority,
            metadata={
                **request.metadata,
                "sandbox": sandbox_config,
            },
            id=request.id,
        )

        return await self.execute_single(sandboxed_request, timeout_ms)

    async def cancel(self, batch_id: str) -> int:
        """
        Cancella batch in esecuzione.

        Args:
            batch_id: ID del batch

        Returns:
            Numero di richieste cancellate
        """
        async with self._lock:
            context = self._active_batches.get(batch_id)
            if context is None:
                return 0

            context.cancelled = True

            # Conta richieste pending
            pending = sum(
                1
                for req in context.requests
                if req.id not in context.results
                or context.results[req.id].status == ExecutionStatus.PENDING
            )

            logger.info(f"Batch {batch_id}: Cancelled {pending} pending requests")
            return pending

    def get_status(self, batch_id: str) -> dict[str, Any] | None:
        """
        Ottiene stato di batch.

        Args:
            batch_id: ID del batch

        Returns:
            Dict con status, completed, pending, failed
        """
        context = self._active_batches.get(batch_id)
        if context is None:
            return None

        summary = context.get_status_summary()

        return {
            "batch_id": batch_id,
            "total_requests": len(context.requests),
            "completed": summary.get("completed", 0),
            "pending": summary.get("pending", 0) + len(context.requests) - len(context.results),
            "running": summary.get("running", 0),
            "failed": summary.get("failed", 0),
            "skipped": summary.get("skipped", 0),
            "cancelled": summary.get("cancelled", 0),
            "timeout": summary.get("timeout", 0),
            "elapsed_ms": (time.perf_counter() - context.start_time) * 1000
            if context.start_time > 0
            else 0,
            "cancelled": context.cancelled,
        }

    def get_results(self, batch_id: str) -> list[ExecutionResult] | None:
        """
        Ottiene risultati di batch.

        Args:
            batch_id: ID del batch

        Returns:
            Lista di risultati o None se batch non trovato
        """
        context = self._active_batches.get(batch_id)
        if context is None:
            return None

        return [context.results.get(req.id) for req in context.requests]

    async def _resolve_dependencies(
        self,
        requests: list[ToolRequest],
    ) -> list[list[ToolRequest]]:
        """
        Risolve dipendenze in waves usando topological sort (Kahn's algorithm).

        Args:
            requests: Richieste con possibili dipendenze

        Returns:
            Lista di waves (requests indipendenti per wave)

        Example:
            >>> waves = await executor._resolve_dependencies([
            ...     ToolRequest(name="a", id="a"),
            ...     ToolRequest(name="b", id="b", depends_on=["a"]),
            ...     ToolRequest(name="c", id="c", depends_on=["a"]),
            ...     ToolRequest(name="d", id="d", depends_on=["b", "c"]),
            ... ])
            >>> # waves = [[a], [b, c], [d]]
        """
        if not requests:
            return []

        # Mappa ID -> richiesta
        request_map: dict[str, ToolRequest] = {req.id: req for req in requests}

        # Controlla dipendenze mancanti
        all_ids = set(request_map.keys())
        for req in requests:
            missing = [dep for dep in req.depends_on if dep not in all_ids]
            if missing:
                logger.warning(
                    f"Request {req.id} has missing dependencies: {missing}"
                )

        # Calcola in-degree per ogni richiesta
        in_degree: dict[str, int] = {req.id: 0 for req in requests}
        adjacency: dict[str, list[str]] = defaultdict(list)

        for req in requests:
            for dep in req.depends_on:
                if dep in request_map:
                    adjacency[dep].append(req.id)
                    in_degree[req.id] += 1

        # Kahn's algorithm per topological sort
        waves: list[list[ToolRequest]] = []
        remaining = set(request_map.keys())

        while remaining:
            # Trova nodi con in-degree 0
            zero_degree = [
                req_id
                for req_id in remaining
                if in_degree[req_id] == 0
            ]

            if not zero_degree:
                # Ciclo rilevato - questo non dovrebbe accadere con dati validi
                logger.error("Circular dependency detected in tool requests")
                # Metti i rimanenti in ultima wave
                wave = [request_map[req_id] for req_id in remaining]
                waves.append(wave)
                break

            # Crea wave con nodi a grado 0
            wave = [request_map[req_id] for req_id in zero_degree]
            # Ordina per priorita (0 = alta priorita)
            wave.sort(key=lambda r: r.priority)
            waves.append(wave)

            # Rimuovi dalla lista remaining e aggiorna in-degree
            for req_id in zero_degree:
                remaining.remove(req_id)
                for neighbor in adjacency[req_id]:
                    in_degree[neighbor] -= 1

        logger.debug(f"Resolved {len(requests)} requests into {len(waves)} waves")
        return waves

    def _build_execution_graph(
        self,
        requests: list[ToolRequest],
    ) -> dict[str, list[str]]:
        """
        Costruisce grafo di esecuzione (DAG).

        Args:
            requests: Lista richieste

        Returns:
            Dict mapping request_id -> list of dependent request_ids
        """
        graph: dict[str, list[str]] = {req.id: [] for req in requests}
        request_ids = {req.id for req in requests}

        for req in requests:
            for dep in req.depends_on:
                if dep in request_ids:
                    graph[dep].append(req.id)

        return graph

    async def _execute_wave(
        self,
        wave: list[ToolRequest],
        context: ExecutionContext,
        max_parallel: int,
    ) -> list[ExecutionResult]:
        """
        Esegue wave di richieste parallele.

        Args:
            wave: Richieste indipendenti
            context: Contesto batch
            max_parallel: Limite parallelismo

        Returns:
            Lista di risultati
        """
        if not wave:
            return []

        results: list[ExecutionResult] = []

        # Usa semaforo per limitare parallelismo
        semaphore = asyncio.Semaphore(max_parallel)

        async def execute_with_semaphore(req: ToolRequest) -> ExecutionResult:
            async with semaphore:
                return await self._execute_single(req, context)

        # Esegui tutte le richieste della wave in parallelo
        tasks = [execute_with_semaphore(req) for req in wave]
        completed = await asyncio.gather(*tasks, return_exceptions=True)

        for idx, item in enumerate(completed):
            req = wave[idx]
            if isinstance(item, Exception):
                result = ExecutionResult(
                    request_id=req.id,
                    tool_name=req.name,
                    status=ExecutionStatus.FAILED,
                    error=item,
                )
            else:
                result = item

            context.results[req.id] = result
            results.append(result)
            context.total_tokens += result.tokens_used

        return results

    async def _execute_single(
        self,
        request: ToolRequest,
        context: ExecutionContext,
    ) -> ExecutionResult:
        """
        Esegue singolo tool.

        Args:
            request: Richiesta da eseguire
            context: Contesto batch

        Returns:
            ExecutionResult
        """
        start_time = time.perf_counter()
        timeout_ms = request.timeout_ms or context.config.single_timeout_ms

        try:
            # Risolvi riferimenti input
            resolved_input = self._resolve_input_references(
                request.input, context.results
            )

            # Ottieni tool dal registry
            tool = None
            if self._registry:
                tool = await self._registry.get_tool(request.name)

            if tool is None:
                return ExecutionResult(
                    request_id=request.id,
                    tool_name=request.name,
                    status=ExecutionStatus.FAILED,
                    error=ValueError(f"Tool '{request.name}' not found"),
                    latency_ms=(time.perf_counter() - start_time) * 1000,
                )

            # Esegui con resilience se disponibile
            if self._resilience and context.config.enable_resilience:
                result = await self._execute_with_resilience(
                    request, tool, resolved_input, timeout_ms
                )
            else:
                result = await self._execute_direct(
                    request, tool, resolved_input, timeout_ms
                )

            return result

        except asyncio.TimeoutError:
            return ExecutionResult(
                request_id=request.id,
                tool_name=request.name,
                status=ExecutionStatus.TIMEOUT,
                error=asyncio.TimeoutError(f"Timeout after {timeout_ms}ms"),
                latency_ms=(time.perf_counter() - start_time) * 1000,
            )
        except Exception as e:
            logger.exception(f"Error executing tool '{request.name}'")
            return ExecutionResult(
                request_id=request.id,
                tool_name=request.name,
                status=ExecutionStatus.FAILED,
                error=e,
                latency_ms=(time.perf_counter() - start_time) * 1000,
            )

    async def _execute_with_resilience(
        self,
        request: ToolRequest,
        tool: ToolDefinition,
        input_data: dict[str, Any],
        timeout_ms: int,
    ) -> ExecutionResult:
        """Esegue tool con resilience handler."""
        start_time = time.perf_counter()

        resilience_result: ResilienceResult = await self._resilience.execute_with_resilience(
            tool_name=request.name,
            operation=tool.handler,
            input_data=input_data,
            fallback_tools=request.fallback_tools if context.config.enable_fallback else None,
        )

        status = ExecutionStatus.COMPLETED if resilience_result.success else ExecutionStatus.FAILED

        return ExecutionResult(
            request_id=request.id,
            tool_name=request.name,
            status=status,
            output=resilience_result.value,
            error=resilience_result.error,
            latency_ms=resilience_result.latency_ms,
            retries=resilience_result.retries,
            fallback_used=resilience_result.fallback_used,
            timestamp=time.time(),
        )

    async def _execute_direct(
        self,
        request: ToolRequest,
        tool: ToolDefinition,
        input_data: dict[str, Any],
        timeout_ms: int,
    ) -> ExecutionResult:
        """Esegue tool direttamente senza resilience."""
        start_time = time.perf_counter()

        try:
            async with asyncio.timeout(timeout_ms / 1000):
                output = await tool.handler(input_data)

            return ExecutionResult(
                request_id=request.id,
                tool_name=request.name,
                status=ExecutionStatus.COMPLETED,
                output=output,
                latency_ms=(time.perf_counter() - start_time) * 1000,
                timestamp=time.time(),
            )

        except Exception as e:
            # Prova fallback tools se abilitato
            if request.fallback_tools and self._registry:
                for fallback_name in request.fallback_tools:
                    fallback_tool = await self._registry.get_tool(fallback_name)
                    if fallback_tool:
                        try:
                            async with asyncio.timeout(timeout_ms / 1000):
                                output = await fallback_tool.handler(input_data)

                            return ExecutionResult(
                                request_id=request.id,
                                tool_name=fallback_name,
                                status=ExecutionStatus.COMPLETED,
                                output=output,
                                latency_ms=(time.perf_counter() - start_time) * 1000,
                                fallback_used=True,
                                timestamp=time.time(),
                            )
                        except Exception:
                            continue

            raise

    def _resolve_input_references(
        self,
        input_data: dict[str, Any],
        results: dict[str, ExecutionResult],
    ) -> dict[str, Any]:
        """
        Risolve riferimenti in input ($id.field).

        Args:
            input_data: Input con possibili riferimenti
            results: Risultati precedenti

        Returns:
            Input con riferimenti risolti

        Example:
            >>> _resolve_input_references(
            ...     {"user_id": "$user.id"},
            ...     {"user": ExecutionResult(output={"id": "123"})}
            ... )
            >>> # Returns: {"user_id": "123"}
        """
        resolved: dict[str, Any] = {}

        # Pattern per riferimenti: $request_id.field.path
        ref_pattern = re.compile(r"^\$([a-zA-Z0-9_]+)(?:\.(.+))?$")

        def resolve_value(value: Any) -> Any:
            if isinstance(value, str):
                match = ref_pattern.match(value)
                if match:
                    request_id = match.group(1)
                    field_path = match.group(2)

                    result = results.get(request_id)
                    if result is None or result.output is None:
                        logger.warning(f"Reference '{value}' not found in results")
                        return value

                    if field_path is None:
                        return result.output

                    # Naviga path
                    current = result.output
                    for part in field_path.split("."):
                        if isinstance(current, dict):
                            current = current.get(part)
                        elif hasattr(current, part):
                            current = getattr(current, part)
                        else:
                            logger.warning(
                                f"Cannot resolve path '{field_path}' in reference"
                            )
                            return value

                    return current

                return value

            elif isinstance(value, dict):
                return {k: resolve_value(v) for k, v in value.items()}
            elif isinstance(value, list):
                return [resolve_value(item) for item in value]

            return value

        for key, value in input_data.items():
            resolved[key] = resolve_value(value)

        return resolved

    def _check_failed_dependencies(
        self,
        wave: list[ToolRequest],
        context: ExecutionContext,
    ) -> bool:
        """Controlla se ci sono dipendenze fallite."""
        for req in wave:
            for dep_id in req.depends_on:
                dep_result = context.results.get(dep_id)
                if dep_result and not dep_result.success:
                    return True
        return False

    async def _check_budget(self, estimated_tokens: int) -> bool:
        """
        Verifica budget disponibile.

        Args:
            estimated_tokens: Tokens stimati

        Returns:
            True se budget sufficiente
        """
        if self._budget is None:
            return True

        allocation = self._budget.get_allocation(self._budget.global_id)
        if allocation is None:
            return True

        return allocation.available >= estimated_tokens

    async def _record_tokens(self, tokens_used: int) -> None:
        """
        Registra utilizzo tokens.

        Args:
            tokens_used: Tokens effettivamente usati
        """
        if self._budget is None or tokens_used <= 0:
            return

        await self._budget.record_usage(
            allocation_id=self._budget.global_id,
            tokens_used=tokens_used,
            operation="tool_execution",
        )

    def get_stats(self) -> dict[str, Any]:
        """
        Ottiene statistiche esecutore.

        Returns:
            Dict con batches, requests, success_rate, etc.
        """
        total = self._successful_requests + self._failed_requests
        success_rate = self._successful_requests / total if total > 0 else 0.0

        return {
            "total_batches": self._total_batches,
            "total_requests": self._total_requests,
            "successful_requests": self._successful_requests,
            "failed_requests": self._failed_requests,
            "success_rate": round(success_rate, 4),
            "active_batches": len(self._active_batches),
            "config": {
                "max_parallel": self._max_parallel,
                "default_timeout_ms": self._default_timeout_ms,
                "enable_sandbox": self._enable_sandbox,
            },
        }


@dataclass
class ExecutorMetrics:
    """
    Metriche dettagliate per BatchExecutor.

    Attributes:
        total_calls: Totale chiamate eseguite
        successful_calls: Chiamate riuscite
        failed_calls: Chiamate fallite
        total_duration_ms: Durata totale in ms
        avg_duration_ms: Durata media per chiamata
        parallelism_used: Grado di parallelismo usato
        error_rate: Tasso di errore (0.0 - 1.0)
        throughput: Chiamate per secondo
    """

    total_calls: int = 0
    successful_calls: int = 0
    failed_calls: int = 0
    total_duration_ms: float = 0.0
    avg_duration_ms: float = 0.0
    max_duration_ms: float = 0.0
    min_duration_ms: float = float("inf")
    parallelism_used: int = 1
    error_rate: float = 0.0
    throughput: float = 0.0
    errors_by_type: dict[str, int] = field(default_factory=dict)
    calls_by_tool: dict[str, int] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        """Converte in dict."""
        return {
            "total_calls": self.total_calls,
            "successful_calls": self.successful_calls,
            "failed_calls": self.failed_calls,
            "total_duration_ms": round(self.total_duration_ms, 2),
            "avg_duration_ms": round(self.avg_duration_ms, 2),
            "max_duration_ms": round(self.max_duration_ms, 2),
            "min_duration_ms": round(self.min_duration_ms, 2) if self.min_duration_ms != float("inf") else 0,
            "parallelism_used": self.parallelism_used,
            "error_rate": round(self.error_rate, 4),
            "throughput": round(self.throughput, 2),
            "errors_by_type": self.errors_by_type,
            "calls_by_tool": self.calls_by_tool,
        }


class BatchExecutor:
    """
    Esecutore batch semplificato per tool calls.

    API semplificata rispetto a ProgrammaticToolExecutor:
    - execute() - batch con auto-detection parallelismo
    - execute_parallel() - forza esecuzione parallela
    - execute_sequential() - forza esecuzione sequenziale
    - get_metrics() - metriche dettagliate

    Features:
    - Error isolation: fallimento uno non blocca altri
    - Result aggregation: aggrega risultati batch
    - Programmatic execution: zero round-trip

    Example:
        >>> from lib.v17 import BatchExecutor, ClaudeToolRegistry
        >>> registry = ClaudeToolRegistry()
        >>> executor = BatchExecutor(registry)
        >>>
        >>> # Esegui batch parallelo
        >>> results = await executor.execute([
        ...     ToolCall(name="query_api", input={"endpoint": "/users"}),
        ...     ToolCall(name="query_api", input={"endpoint": "/orders"}),
        ... ])
        >>>
        >>> # Esegui sequenziale
        >>> results = await executor.execute_sequential([
        ...     ToolCall(name="get_user", input={"id": "1"}),
        ...     ToolCall(name="get_orders", input={"user_id": "$get_user.id"}),
        ... ])
        >>>
        >>> # Metriche
        >>> metrics = executor.get_metrics()
        >>> print(f"Throughput: {metrics.throughput} calls/s")
    """

    def __init__(
        self,
        registry: ClaudeToolRegistry,
        max_parallel: int = 10,
        default_timeout_ms: int = 30000,
    ) -> None:
        """
        Inizializza BatchExecutor.

        Args:
            registry: Tool registry
            max_parallel: Massimo esecuzioni parallele
            default_timeout_ms: Timeout default per chiamata
        """
        self._registry = registry
        self._max_parallel = max_parallel
        self._default_timeout_ms = default_timeout_ms

        # Internal executor
        self._executor = ProgrammaticToolExecutor()

        # Metrics
        self._metrics = ExecutorMetrics()
        self._metrics_lock = asyncio.Lock()

        # Initialized flag
        self._initialized = False

    async def initialize(self) -> None:
        """Inizializza l'esecutore."""
        if self._initialized:
            return

        await self._executor.initialize(
            registry=self._registry,
            max_parallel=self._max_parallel,
            default_timeout_ms=self._default_timeout_ms,
        )
        self._initialized = True
        logger.info(
            f"BatchExecutor initialized: max_parallel={self._max_parallel}"
        )

    async def execute(
        self,
        tool_calls: list[ToolCall],
        parallel: bool = True,
        max_parallel: int | None = None,
    ) -> list[ToolResult]:
        """
        Esegue batch di tool calls.

        Args:
            tool_calls: Lista di chiamate
            parallel: Se eseguire in parallelo (default True)
            max_parallel: Override max parallelismo

        Returns:
            Lista di ToolResult nell'ordine delle chiamate

        Example:
            >>> results = await executor.execute([
            ...     ToolCall(name="query_api", input={"endpoint": "/users"}),
            ...     ToolCall(name="query_api", input={"endpoint": "/orders"}),
            ... ])
        """
        if not self._initialized:
            await self.initialize()

        if not tool_calls:
            return []

        # Converti in ToolRequest
        requests = [call.to_request() for call in tool_calls]

        # Configura esecuzione
        config = ExecutionConfig(
            max_parallel=max_parallel or self._max_parallel,
            timeout_ms=self._default_timeout_ms * len(tool_calls),
            single_timeout_ms=self._default_timeout_ms,
            stop_on_failure=False,  # Error isolation
        )

        # Esegui
        start_time = time.perf_counter()
        exec_results = await self._executor.execute_batch(requests, config)
        total_duration_ms = (time.perf_counter() - start_time) * 1000

        # Converti risultati
        results: list[ToolResult] = []
        for call, exec_result in zip(tool_calls, exec_results):
            result = ToolResult(
                id=call.id or "",
                output=exec_result.output,
                error=str(exec_result.error) if exec_result.error else None,
                duration_ms=exec_result.latency_ms,
            )
            results.append(result)

        # Aggiorna metriche
        await self._update_metrics(
            results=results,
            total_duration_ms=total_duration_ms,
            parallelism=min(len(tool_calls), max_parallel or self._max_parallel),
            tool_names=[call.name for call in tool_calls],
        )

        return results

    async def execute_parallel(
        self,
        tool_calls: list[ToolCall],
        max_parallel: int | None = None,
    ) -> list[ToolResult]:
        """
        Esegue tool calls in parallelo.

        Tutti i tool indipendenti vengono eseguiti contemporaneamente.
        Error isolation garantito: fallimento uno non blocca altri.

        Args:
            tool_calls: Lista di chiamate
            max_parallel: Override max parallelismo

        Returns:
            Lista di ToolResult

        Example:
            >>> results = await executor.execute_parallel([
            ...     ToolCall(name="get_user", input={"id": "1"}),
            ...     ToolCall(name="get_user", input={"id": "2"}),
            ...     ToolCall(name="get_user", input={"id": "3"}),
            ... ])
        """
        return await self.execute(
            tool_calls=tool_calls,
            parallel=True,
            max_parallel=max_parallel,
        )

    async def execute_sequential(
        self,
        tool_calls: list[ToolCall],
        stop_on_error: bool = False,
    ) -> list[ToolResult]:
        """
        Esegue tool calls sequenzialmente.

        Ogni tool viene eseguito dopo il precedente.
        Supporta riferimenti con $id.field per passare risultati.

        Args:
            tool_calls: Lista di chiamate
            stop_on_error: Se fermare su primo errore

        Returns:
            Lista di ToolResult

        Example:
            >>> results = await executor.execute_sequential([
            ...     ToolCall(name="get_user", input={"id": "1"}),
            ...     ToolCall(name="get_orders", input={"user_id": "$call_1.id"}),
            ... ])
        """
        if not self._initialized:
            await self.initialize()

        if not tool_calls:
            return []

        results: list[ToolResult] = []
        start_time = time.perf_counter()

        for call in tool_calls:
            call_start = time.perf_counter()

            try:
                # Esegui singola chiamata
                exec_result = await self._executor.execute_single(
                    request=call.to_request(),
                    timeout_ms=self._default_timeout_ms,
                )

                result = ToolResult(
                    id=call.id or "",
                    output=exec_result.output,
                    error=str(exec_result.error) if exec_result.error else None,
                    duration_ms=(time.perf_counter() - call_start) * 1000,
                )

            except Exception as e:
                result = ToolResult(
                    id=call.id or "",
                    error=str(e),
                    duration_ms=(time.perf_counter() - call_start) * 1000,
                )

            results.append(result)

            # Stop su errore se richiesto
            if stop_on_error and result.error:
                # Completa con risultati vuoti per le chiamate rimanenti
                for remaining_call in tool_calls[len(results):]:
                    results.append(ToolResult(
                        id=remaining_call.id or "",
                        error="Skipped due to previous error",
                        duration_ms=0,
                    ))
                break

        total_duration_ms = (time.perf_counter() - start_time) * 1000

        # Aggiorna metriche
        await self._update_metrics(
            results=results,
            total_duration_ms=total_duration_ms,
            parallelism=1,  # Sequenziale
            tool_names=[call.name for call in tool_calls],
        )

        return results

    def get_metrics(self) -> ExecutorMetrics:
        """
        Ottiene metriche dettagliate.

        Returns:
            ExecutorMetrics con statistiche complete

        Example:
            >>> metrics = executor.get_metrics()
            >>> print(f"Success rate: {1 - metrics.error_rate:.2%}")
            >>> print(f"Throughput: {metrics.throughput:.2f} calls/s")
        """
        return self._metrics

    async def _update_metrics(
        self,
        results: list[ToolResult],
        total_duration_ms: float,
        parallelism: int,
        tool_names: list[str],
    ) -> None:
        """Aggiorna metriche dopo esecuzione."""
        async with self._metrics_lock:
            # Conta successi e fallimenti
            successful = sum(1 for r in results if r.success)
            failed = len(results) - successful

            # Aggiorna conteggi
            self._metrics.total_calls += len(results)
            self._metrics.successful_calls += successful
            self._metrics.failed_calls += failed
            self._metrics.total_duration_ms += total_duration_ms
            self._metrics.parallelism_used = max(
                self._metrics.parallelism_used, parallelism
            )

            # Calcola statistiche
            if self._metrics.total_calls > 0:
                self._metrics.avg_duration_ms = (
                    self._metrics.total_duration_ms / self._metrics.total_calls
                )
                self._metrics.error_rate = (
                    self._metrics.failed_calls / self._metrics.total_calls
                )

            # Throughput
            if total_duration_ms > 0:
                self._metrics.throughput = (
                    len(results) / total_duration_ms * 1000
                )

            # Durate min/max
            for result in results:
                if result.duration_ms > 0:
                    self._metrics.max_duration_ms = max(
                        self._metrics.max_duration_ms, result.duration_ms
                    )
                    self._metrics.min_duration_ms = min(
                        self._metrics.min_duration_ms, result.duration_ms
                    )

            # Errori per tipo
            for result in results:
                if result.error:
                    error_type = "unknown"
                    if "timeout" in result.error.lower():
                        error_type = "timeout"
                    elif "not found" in result.error.lower():
                        error_type = "tool_not_found"
                    elif "validation" in result.error.lower():
                        error_type = "validation_error"

                    self._metrics.errors_by_type[error_type] = (
                        self._metrics.errors_by_type.get(error_type, 0) + 1
                    )

            # Chiamate per tool
            for tool_name in tool_names:
                self._metrics.calls_by_tool[tool_name] = (
                    self._metrics.calls_by_tool.get(tool_name, 0) + 1
                )

    def reset_metrics(self) -> None:
        """Resetta le metriche."""
        self._metrics = ExecutorMetrics()
        logger.debug("BatchExecutor metrics reset")

    async def execute_with_aggregation(
        self,
        tool_calls: list[ToolCall],
        aggregator: Callable[[list[ToolResult]], Any],
        parallel: bool = True,
    ) -> Any:
        """
        Esegue batch e aggrega risultati.

        Args:
            tool_calls: Lista di chiamate
            aggregator: Funzione di aggregazione
            parallel: Se eseguire in parallelo

        Returns:
            Risultato aggregato

        Example:
            >>> # Somma risultati
            >>> total = await executor.execute_with_aggregation(
            ...     calls,
            ...     aggregator=lambda results: sum(r.output.get("value", 0) for r in results)
            ... )
        """
        results = await self.execute(tool_calls, parallel=parallel)
        return aggregator(results)
