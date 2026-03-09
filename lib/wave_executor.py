"""WaveExecutor per esecuzione a ondate di task paralleli.

Questo modulo fornisce un esecutore di task basato su "onde" (wave),
dove ogni ondata rappresenta un livello di profondita' nell'albero dei task.

Flusso di esecuzione:
    Wave 0: tutti i root task in parallelo
    Wave 1: tutti i subtask di wave 0 in parallelo
    Wave N: tutti i subtask di wave N-1 in parallelo

Features:
- Esecuzione parallela per wave
- Timeout per wave (non per singolo task)
- Aggregazione risultati a ritroso
- Rispetto limite MAX_CONCURRENT_PER_WAVE
- Metriche dettagliate per wave
- Gestione errori robusta con exception chaining

Usage:
    from lib.wave_executor import WaveExecutor, Wave, TaskResult

    executor = WaveExecutor(resource_pool, backpressure)
    results = await executor.execute_tree(root_tasks)
    for task_id, result in results.items():
        print(f"{task_id}: {result.success}")

Version: V15.1.0
"""

from __future__ import annotations

import asyncio
import logging
import time
from collections import deque
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import (
    Any,
    Callable,
    Dict,
    List,
    Optional,
    Set,
    TYPE_CHECKING,
)

from lib.exceptions import TaskError, TaskTimeoutError, wrap_exception
from lib.backpressure import (
    BackpressureController,
    ThrottleState,
    SystemMetrics,
    get_backpressure_controller,
)

if TYPE_CHECKING:
    from lib.rate_limiter import AdaptiveRateLimiter

logger = logging.getLogger(__name__)


# =============================================================================
# COSTANTI
# =============================================================================

MAX_WAVE_TIMEOUT = 300.0  # 5 minuti per wave
MAX_CONCURRENT_PER_WAVE = 500  # Max task simultanei per wave
DEFAULT_TASK_TIMEOUT = 60.0  # 1 minuto per singolo task
WAVE_DELAY_MS = 10  # Delay tra wave per evitare thundering herd


# =============================================================================
# ENUM E DATACLASS
# =============================================================================

class WaveStatus(Enum):
    """Stato di una wave."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMEOUT = "timeout"


@dataclass
class TaskResult:
    """Risultato dell'esecuzione di un task.

    Attributes:
        task_id: Identificativo univoco del task
        success: Se l'esecuzione e' avvenuta con successo
        result: Il risultato del task (se successo)
        error: Messaggio di errore (se fallito)
        duration_ms: Durata dell'esecuzione in millisecondi
        wave_id: ID della wave in cui e' stato eseguito
        subtask_count: Numero di subtask generati
    """
    task_id: str
    success: bool
    result: Any = None
    error: Optional[str] = None
    duration_ms: float = 0.0
    wave_id: int = -1
    subtask_count: int = 0

    def to_dict(self) -> Dict[str, Any]:
        """Converte il risultato in dizionario per logging/serializzazione."""
        return {
            "task_id": self.task_id,
            "success": self.success,
            "result": str(self.result)[:100] if self.result else None,
            "error": self.error,
            "duration_ms": self.duration_ms,
            "wave_id": self.wave_id,
            "subtask_count": self.subtask_count,
        }


@dataclass
class Wave:
    """Rappresenta una singola wave di esecuzione.

    Attributes:
        wave_id: Identificativo univoco della wave
        depth: Profondita' nell'albero (0 = root)
        tasks: Lista di task in questa wave
        status: Stato corrente della wave
        started_at: Timestamp di inizio esecuzione
        completed_at: Timestamp di fine esecuzione
        results: Risultati dei task completati
    """
    wave_id: int
    depth: int
    tasks: List["UltraTask"]
    status: WaveStatus = WaveStatus.PENDING
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    results: List[TaskResult] = field(default_factory=list)

    @property
    def duration_ms(self) -> float:
        """Calcola la durata della wave in millisecondi."""
        if self.started_at and self.completed_at:
            return (self.completed_at - self.started_at).total_seconds() * 1000
        return 0.0

    @property
    def success_count(self) -> int:
        """Conta i task completati con successo."""
        return sum(1 for r in self.results if r.success)

    @property
    def failure_count(self) -> int:
        """Conta i task falliti."""
        return sum(1 for r in self.results if not r.success)

    @property
    def throughput(self) -> float:
        """Calcola il throughput (task/secondo)."""
        duration_sec = self.duration_ms / 1000.0
        if duration_sec > 0:
            return len(self.results) / duration_sec
        return 0.0

    def to_dict(self) -> Dict[str, Any]:
        """Converte la wave in dizionario per logging."""
        return {
            "wave_id": self.wave_id,
            "depth": self.depth,
            "task_count": len(self.tasks),
            "status": self.status.value,
            "duration_ms": self.duration_ms,
            "success_count": self.success_count,
            "failure_count": self.failure_count,
            "throughput": round(self.throughput, 2),
        }


@dataclass
class UltraTask:
    """Rappresenta un task ultra-ottimizzato per WaveExecutor.

    Attributes:
        task_id: Identificativo univoco del task
        name: Nome descrittivo del task
        handler: Funzione async da eseguire
        params: Parametri da passare all'handler
        dependencies: ID dei task da cui dipende
        depth: Profondita' nell'albero (calcolato da build_waves)
        subtasks: Subtask generati dinamicamente
        priority: Priorita' del task (0 = massima)
        timeout: Timeout specifico per questo task
    """
    task_id: str
    name: str
    handler: Callable[..., Any]
    params: Dict[str, Any] = field(default_factory=dict)
    dependencies: Set[str] = field(default_factory=set)
    depth: int = 0
    subtasks: List["UltraTask"] = field(default_factory=list)
    priority: int = 10
    timeout: float = DEFAULT_TASK_TIMEOUT

    def __hash__(self) -> int:
        return hash(self.task_id)

    def __eq__(self, other: object) -> bool:
        if isinstance(other, UltraTask):
            return self.task_id == other.task_id
        return False


# =============================================================================
# INTERFACCE PLACEHOLDER (per compatibilita')
# =============================================================================

@dataclass
class ResourcePool:
    """Placeholder per ResourcePool.

    In produzione, questo sarebbe un pool di risorse (connessioni DB, API, etc.)
    con gestione del ciclo di vita e limiti di concorrenza.
    """
    max_resources: int = 100
    _acquired: int = 0
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock, repr=False)

    async def acquire(self) -> bool:
        """Acquisisce una risorsa dal pool."""
        async with self._lock:
            if self._acquired < self.max_resources:
                self._acquired += 1
                return True
            return False

    async def release(self) -> None:
        """Rilascia una risorsa nel pool."""
        async with self._lock:
            if self._acquired > 0:
                self._acquired -= 1

    @property
    def available(self) -> int:
        """Risorse disponibili."""
        return self.max_resources - self._acquired


# Nota: BackpressureController ora importato da lib.backpressure
# La classe e' disponibile come: from lib.backpressure import BackpressureController


# =============================================================================
# WAVE EXECUTOR
# =============================================================================

class WaveExecutor:
    """Esegue task a ondate per depth level.

    Questo esecutore organizza i task in "onde" basate sulla loro
    profondita' nell'albero delle dipendenze, eseguendo ogni ondata
    in parallelo prima di passare alla successiva.

    Attributes:
        resource_pool: Pool di risorse per l'esecuzione
        backpressure: Controller per backpressure
        waves: Dizionario delle wave (wave_id -> Wave)
        current_wave: ID della wave corrente
        max_wave_timeout: Timeout massimo per wave
        max_concurrent_per_wave: Task simultanei massimi per wave

    Example:
        executor = WaveExecutor(resource_pool, backpressure)
        results = await executor.execute_tree(root_tasks)
        print(f"Completati {len(results)} task")
    """

    MAX_WAVE_TIMEOUT = MAX_WAVE_TIMEOUT
    MAX_CONCURRENT_PER_WAVE = MAX_CONCURRENT_PER_WAVE

    def __init__(
        self,
        resource_pool: Optional[ResourcePool] = None,
        backpressure: Optional[BackpressureController] = None,
        max_wave_timeout: float = MAX_WAVE_TIMEOUT,
        max_concurrent_per_wave: int = MAX_CONCURRENT_PER_WAVE,
    ):
        """Inizializza il WaveExecutor.

        Args:
            resource_pool: Pool di risorse (opzionale, crea default se None)
            backpressure: Controller backpressure (opzionale, crea default se None)
            max_wave_timeout: Timeout massimo per wave in secondi
            max_concurrent_per_wave: Massimo task simultanei per wave
        """
        self.resource_pool = resource_pool or ResourcePool()
        self.backpressure = backpressure or BackpressureController()
        self.waves: Dict[int, Wave] = {}
        self.current_wave = 0
        self.max_wave_timeout = max_wave_timeout
        self.max_concurrent_per_wave = max_concurrent_per_wave
        self._lock = asyncio.Lock()
        self._all_results: Dict[str, TaskResult] = {}
        self._task_registry: Dict[str, UltraTask] = {}

        logger.info(
            f"WaveExecutor inizializzato: "
            f"timeout={max_wave_timeout}s, "
            f"max_concurrent={max_concurrent_per_wave}"
        )

    async def execute_tree(
        self,
        root_tasks: List[UltraTask],
        wave_timeout: Optional[float] = None,
    ) -> Dict[str, TaskResult]:
        """Esegue un albero di task per wave.

        Costruisce le wave dall'albero di task e le esegue
        sequenzialmente, ognuna con tutti i task in parallelo.

        Args:
            root_tasks: Lista dei task radice
            wave_timeout: Timeout per wave (usa default se None)

        Returns:
            Dizionario task_id -> TaskResult

        Raises:
            TaskError: Se errore critico durante esecuzione
            TaskTimeoutError: Se timeout superato
        """
        if not root_tasks:
            logger.warning("Nessun root task fornito")
            return {}

        timeout = wave_timeout or self.max_wave_timeout
        start_time = time.time()

        # Costruisce le wave dall'albero
        self.waves = self.build_waves(root_tasks)
        total_waves = len(self.waves)

        logger.info(
            f"Avvio esecuzione albero: "
            f"{len(root_tasks)} root task, "
            f"{total_waves} wave, "
            f"timeout={timeout}s"
        )

        # Registra tutti i task
        self._register_tasks(root_tasks)

        # Esegue wave per wave
        for wave_id in sorted(self.waves.keys()):
            wave = self.waves[wave_id]

            try:
                # Esegue la wave con timeout
                wave = await asyncio.wait_for(
                    self.execute_wave(wave),
                    timeout=timeout
                )
                self.waves[wave_id] = wave

                # Log metriche wave
                logger.info(
                    f"Wave {wave_id} completata: "
                    f"{wave.success_count}/{len(wave.tasks)} task, "
                    f"durata={wave.duration_ms:.0f}ms, "
                    f"throughput={wave.throughput:.1f} task/s"
                )

                # Se tutti i task falliti, propaga errore
                if wave.failure_count == len(wave.tasks) and wave_id < total_waves - 1:
                    logger.error(
                        f"Wave {wave_id}: tutti i task falliti, "
                        f"interruzione esecuzione"
                    )
                    break

                # Piccolo delay tra wave per evitare thundering herd
                await asyncio.sleep(WAVE_DELAY_MS / 1000.0)

            except asyncio.TimeoutError as err:
                wave.status = WaveStatus.TIMEOUT
                wave.completed_at = datetime.now()
                self.waves[wave_id] = wave

                logger.error(
                    f"Wave {wave_id}: timeout dopo {timeout}s"
                )

                # Registra task non completati come falliti
                for task in wave.tasks:
                    if task.task_id not in self._all_results:
                        self._all_results[task.task_id] = TaskResult(
                            task_id=task.task_id,
                            success=False,
                            error="Wave timeout",
                            wave_id=wave_id,
                        )

                raise TaskTimeoutError(
                    f"Wave {wave_id} timeout",
                    timeout_seconds=timeout,
                    context={"wave_id": wave_id, "task_count": len(wave.tasks)},
                ) from err

            except Exception as err:
                wave.status = WaveStatus.FAILED
                wave.completed_at = datetime.now()
                self.waves[wave_id] = wave

                logger.exception(f"Wave {wave_id}: errore critico")

                raise wrap_exception(
                    err,
                    TaskError,
                    f"Errore durante esecuzione wave {wave_id}",
                    wave_id=wave_id,
                )

        # Calcola metriche finali
        total_duration = (time.time() - start_time) * 1000
        total_success = sum(w.success_count for w in self.waves.values())
        total_failure = sum(w.failure_count for w in self.waves.values())

        logger.info(
            f"Esecuzione albero completata: "
            f"{total_success} successi, "
            f"{total_failure} fallimenti, "
            f"durata={total_duration:.0f}ms, "
            f"{total_waves} wave"
        )

        return self._all_results

    async def execute_wave(self, wave: Wave) -> Wave:
        """Esegue una singola wave con tutti i task in parallelo.

        Args:
            wave: La wave da eseguire

        Returns:
            La wave con risultati aggiornati
        """
        wave.status = WaveStatus.RUNNING
        wave.started_at = datetime.now()
        wave.results = []

        if not wave.tasks:
            wave.status = WaveStatus.COMPLETED
            wave.completed_at = datetime.now()
            return wave

        # Calcola concorrenza effettiva
        concurrency = self._calculate_concurrency()

        logger.debug(
            f"Wave {wave.wave_id}: avvio {len(wave.tasks)} task "
            f"con concorrenza {concurrency}"
        )

        # Crea semaphore per limitare concorrenza
        semaphore = asyncio.Semaphore(concurrency)

        # Esegue tutti i task in parallelo con limite concorrenza
        async def run_with_semaphore(task: UltraTask) -> TaskResult:
            async with semaphore:
                return await self.execute_task(task)

        # Lancia tutti i task
        tasks = [run_with_semaphore(task) for task in wave.tasks]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Processa risultati
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                # Task ha sollevato eccezione
                task = wave.tasks[i]
                task_result = TaskResult(
                    task_id=task.task_id,
                    success=False,
                    error=str(result),
                    wave_id=wave.wave_id,
                )
                wave.results.append(task_result)
                logger.error(
                    f"Task {task.task_id} eccezione: {result}"
                )
            else:
                # Task completato
                result.wave_id = wave.wave_id
                wave.results.append(result)

            # Registra in tutti i risultati
            self._all_results[wave.results[-1].task_id] = wave.results[-1]

        # Aggiorna stato wave
        wave.status = WaveStatus.COMPLETED if wave.failure_count == 0 else WaveStatus.FAILED
        wave.completed_at = datetime.now()

        # Spawna subtask per i task completati con successo
        await self._spawn_subtasks_for_wave(wave)

        return wave

    async def execute_task(self, task: UltraTask) -> TaskResult:
        """Esegue un singolo task con risorse allocate.

        Args:
            task: Il task da eseguire

        Returns:
            TaskResult con esito dell'esecuzione
        """
        start_time = time.time()
        resource_acquired = False

        try:
            # Acquisisce risorsa
            resource_acquired = await self.resource_pool.acquire()
            if not resource_acquired:
                return TaskResult(
                    task_id=task.task_id,
                    success=False,
                    error="Resource pool exhausted",
                    wave_id=task.depth,
                )

            # Verifica backpressure
            if self.backpressure.should_throttle():
                logger.warning(
                    f"Task {task.task_id}: backpressure attiva, "
                    f"load={self.backpressure.current_load:.2%}"
                )
                # Continua ma con warning

            # Esegue l'handler con timeout
            try:
                result = await asyncio.wait_for(
                    task.handler(**task.params),
                    timeout=task.timeout
                )

                duration_ms = (time.time() - start_time) * 1000

                logger.debug(
                    f"Task {task.task_id} completato: "
                    f"durata={duration_ms:.0f}ms"
                )

                return TaskResult(
                    task_id=task.task_id,
                    success=True,
                    result=result,
                    duration_ms=duration_ms,
                    wave_id=task.depth,
                )

            except asyncio.TimeoutError:
                duration_ms = (time.time() - start_time) * 1000
                logger.warning(
                    f"Task {task.task_id}: timeout dopo {task.timeout}s"
                )
                return TaskResult(
                    task_id=task.task_id,
                    success=False,
                    error=f"Task timeout after {task.timeout}s",
                    duration_ms=duration_ms,
                    wave_id=task.depth,
                )

        except Exception as err:
            duration_ms = (time.time() - start_time) * 1000
            logger.error(
                f"Task {task.task_id} errore: {err}",
                exc_info=True
            )
            return TaskResult(
                task_id=task.task_id,
                success=False,
                error=str(err),
                duration_ms=duration_ms,
                wave_id=task.depth,
            )

        finally:
            # Rilascia risorsa
            if resource_acquired:
                await self.resource_pool.release()

    async def aggregate_results(self, wave: Wave) -> Dict[str, Any]:
        """Aggrega risultati da una wave completata.

        Args:
            wave: La wave di cui aggregare i risultati

        Returns:
            Dizionario con:
            - task_results: mappa task_id -> risultato
            - success_rate: tasso di successo
            - avg_duration_ms: durata media
            - errors: lista errori
        """
        if not wave.results:
            return {
                "wave_id": wave.wave_id,
                "task_results": {},
                "success_rate": 0.0,
                "avg_duration_ms": 0.0,
                "errors": [],
            }

        task_results: Dict[str, Any] = {}
        total_duration = 0.0
        errors: List[Dict[str, str]] = []

        for result in wave.results:
            task_results[result.task_id] = result.result if result.success else None
            total_duration += result.duration_ms

            if not result.success and result.error:
                errors.append({
                    "task_id": result.task_id,
                    "error": result.error,
                })

        success_rate = wave.success_count / len(wave.results) if wave.results else 0.0
        avg_duration = total_duration / len(wave.results) if wave.results else 0.0

        return {
            "wave_id": wave.wave_id,
            "task_results": task_results,
            "success_rate": round(success_rate, 4),
            "avg_duration_ms": round(avg_duration, 2),
            "errors": errors,
            "throughput": round(wave.throughput, 2),
        }

    def build_waves(self, root_tasks: List[UltraTask]) -> Dict[int, Wave]:
        """Costruisce le wave da un albero di task usando BFS.

        Attraversa l'albero dei task in ampiezza (BFS) per
        raggruppare i task per livello di profondita'.

        Args:
            root_tasks: Lista dei task radice

        Returns:
            Dizionario depth -> Wave
        """
        waves: Dict[int, Wave] = {}
        visited: Set[str] = set()
        queue: deque = deque()

        # Inizializza coda con root task
        for task in root_tasks:
            task.depth = 0
            queue.append(task)

        # BFS per costruire wave
        while queue:
            task = queue.popleft()

            if task.task_id in visited:
                continue
            visited.add(task.task_id)

            depth = task.depth

            # Crea wave se non esiste
            if depth not in waves:
                waves[depth] = Wave(
                    wave_id=depth,
                    depth=depth,
                    tasks=[],
                )

            # Aggiunge task alla wave
            waves[depth].tasks.append(task)

            # Aggiunge subtask alla coda
            for subtask in task.subtasks:
                if subtask.task_id not in visited:
                    subtask.depth = depth + 1
                    queue.append(subtask)

        logger.info(
            f"Costruite {len(waves)} wave: "
            f"{', '.join(f'w{d}:{len(w.tasks)}' for d, w in sorted(waves.items()))}"
        )

        return waves

    async def _spawn_subtasks(self, task: UltraTask) -> List[UltraTask]:
        """Spawna subtask se il task li genera dinamicamente.

        Alcuni task possono generare subtask dinamicamente
        in base al loro risultato. Questo metodo gestisce
        tale generazione.

        Args:
            task: Il task che potrebbe generare subtask

        Returns:
            Lista di subtask generati (vuota se nessuno)
        """
        # Verifica se il task ha un metodo per generare subtask
        if not hasattr(task.handler, "generate_subtasks"):
            return []

        try:
            # Ottiene il risultato del task
            result = self._all_results.get(task.task_id)
            if not result or not result.success:
                return []

            # Genera subtask dal risultato
            generate_fn = getattr(task.handler, "generate_subtasks")
            if asyncio.iscoroutinefunction(generate_fn):
                subtasks = await generate_fn(result.result, task)
            else:
                subtasks = generate_fn(result.result, task)

            # Imposta depth e dipendenze
            for subtask in subtasks:
                subtask.depth = task.depth + 1
                subtask.dependencies.add(task.task_id)

            # Registra i subtask
            task.subtasks = subtasks
            for subtask in subtasks:
                self._task_registry[subtask.task_id] = subtask

            logger.debug(
                f"Task {task.task_id}: generati {len(subtasks)} subtask"
            )

            return subtasks

        except Exception as err:
            logger.error(
                f"Task {task.task_id}: errore generazione subtask: {err}"
            )
            return []

    async def _spawn_subtasks_for_wave(self, wave: Wave) -> None:
        """Spawna subtask per tutti i task completati di una wave.

        Args:
            wave: La wave completata
        """
        for task in wave.tasks:
            result = self._all_results.get(task.task_id)
            if result and result.success:
                subtasks = await self._spawn_subtasks(task)
                result.subtask_count = len(subtasks)

                # Aggiunge subtask alle wave appropriate
                for subtask in subtasks:
                    depth = subtask.depth
                    if depth not in self.waves:
                        self.waves[depth] = Wave(
                            wave_id=depth,
                            depth=depth,
                            tasks=[],
                        )
                    if subtask not in self.waves[depth].tasks:
                        self.waves[depth].tasks.append(subtask)

    def _register_tasks(self, tasks: List[UltraTask]) -> None:
        """Registra tutti i task nel registry.

        Args:
            tasks: Lista di task da registrare
        """
        for task in tasks:
            self._task_registry[task.task_id] = task
            if task.subtasks:
                self._register_tasks(task.subtasks)

    def _calculate_concurrency(self) -> int:
        """Calcola la concorrenza ottimale per la wave corrente.

        Considera:
        - Limite massimo configurato
        - Backpressure corrente
        - Risorse disponibili

        Returns:
            Numero di task che possono essere eseguiti in parallelo
        """
        # Ottieni concorrenza raccomandata dal backpressure
        recommended = self.backpressure.get_recommended_concurrency()

        # Limita al massimo configurato
        concurrency = min(recommended, self.max_concurrent_per_wave)

        # Considera risorse disponibili
        available = self.resource_pool.available
        concurrency = min(concurrency, available)

        # Assicura un minimo di 1
        return max(1, concurrency)

    def get_wave_metrics(self) -> List[Dict[str, Any]]:
        """Ottiene metriche per tutte le wave (sync, senza async aggregation).

        Returns:
            Lista di dizionari con metriche per wave

        Note:
            Per aggregazione async, usare get_wave_metrics_async().
        """
        return [
            {
                **wave.to_dict(),
                "aggregated": None,  # Usare get_wave_metrics_async() per aggregazione
            }
            for wave in sorted(self.waves.values(), key=lambda w: w.wave_id)
        ]

    async def get_wave_metrics_async(self) -> List[Dict[str, Any]]:
        """Ottiene metriche per tutte le wave con aggregazione async.

        Returns:
            Lista di dizionari con metriche complete per wave
        """
        results = []
        for wave in sorted(self.waves.values(), key=lambda w: w.wave_id):
            aggregated = None
            if wave.status == WaveStatus.COMPLETED:
                aggregated = await self.aggregate_results(wave)
            results.append({
                **wave.to_dict(),
                "aggregated": aggregated,
            })
        return results

    def get_summary(self) -> Dict[str, Any]:
        """Ottiene un riepilogo dell'esecuzione.

        Returns:
            Dizionario con statistiche complete
        """
        total_tasks = sum(len(w.tasks) for w in self.waves.values())
        total_success = sum(w.success_count for w in self.waves.values())
        total_failure = sum(w.failure_count for w in self.waves.values())
        total_duration = sum(w.duration_ms for w in self.waves.values())

        return {
            "total_waves": len(self.waves),
            "total_tasks": total_tasks,
            "total_success": total_success,
            "total_failure": total_failure,
            "success_rate": round(total_success / total_tasks, 4) if total_tasks > 0 else 0.0,
            "total_duration_ms": round(total_duration, 2),
            "avg_wave_duration_ms": round(total_duration / len(self.waves), 2) if self.waves else 0.0,
            "waves": [w.to_dict() for w in sorted(self.waves.values(), key=lambda w: w.wave_id)],
        }


# =============================================================================
# FUNZIONI DI UTILITA'
# =============================================================================

def create_simple_task(
    task_id: str,
    name: str,
    handler: Callable[..., Any],
    **params: Any,
) -> UltraTask:
    """Crea un task semplice senza dipendenze.

    Args:
        task_id: ID univoco del task
        name: Nome descrittivo
        handler: Funzione async da eseguire
        **params: Parametri per l'handler

    Returns:
        UltraTask configurato
    """
    return UltraTask(
        task_id=task_id,
        name=name,
        handler=handler,
        params=params,
    )


def create_dependent_task(
    task_id: str,
    name: str,
    handler: Callable[..., Any],
    dependencies: Set[str],
    **params: Any,
) -> UltraTask:
    """Crea un task con dipendenze.

    Args:
        task_id: ID univoco del task
        name: Nome descrittivo
        handler: Funzione async da eseguire
        dependencies: Set di ID dei task da cui dipende
        **params: Parametri per l'handler

    Returns:
        UltraTask configurato con dipendenze
    """
    return UltraTask(
        task_id=task_id,
        name=name,
        handler=handler,
        params=params,
        dependencies=dependencies,
    )


# =============================================================================
# SINGLETON (opzionale)
# =============================================================================

_executor_instance: Optional[WaveExecutor] = None
_executor_lock = asyncio.Lock()


async def get_wave_executor(
    resource_pool: Optional[ResourcePool] = None,
    backpressure: Optional[BackpressureController] = None,
) -> WaveExecutor:
    """Ottiene l'istanza singleton del WaveExecutor.

    Args:
        resource_pool: Pool di risorse (solo prima inizializzazione)
        backpressure: Controller backpressure (solo prima inizializzazione)

    Returns:
        WaveExecutor singleton
    """
    global _executor_instance

    if _executor_instance is None:
        async with _executor_lock:
            if _executor_instance is None:
                _executor_instance = WaveExecutor(
                    resource_pool=resource_pool,
                    backpressure=backpressure,
                )

    return _executor_instance


def reset_wave_executor() -> None:
    """Resetta il singleton (per testing)."""
    global _executor_instance
    _executor_instance = None


# =============================================================================
# CONNECTION POOL (Async I/O Helper)
# =============================================================================

class AsyncConnectionPool:
    """Pool per operazioni I/O asincrone con limite concorrenza.

    Gestisce un pool di worker per operazioni blocking I/O,
    convertendole in async tramite asyncio.to_thread().

    Attributes:
        max_workers: Massimo worker simultanei
        _semaphore: Limite concorrenza
        _active_count: Contatore operazioni attive
    """

    def __init__(self, max_workers: int = 10):
        """Inizializza il pool.

        Args:
            max_workers: Massimo operazioni I/O simultanee
        """
        self.max_workers = max_workers
        self._semaphore = asyncio.Semaphore(max_workers)
        self._active_count = 0
        self._lock = asyncio.Lock()

    async def run_io(self, func: Callable[..., Any], *args: Any, **kwargs: Any) -> Any:
        """Esegue operazione blocking in thread pool.

        Args:
            func: Funzione blocking da eseguire
            *args: Argomenti posizionali
            **kwargs: Argomenti keyword

        Returns:
            Risultato della funzione
        """
        async with self._semaphore:
            async with self._lock:
                self._active_count += 1
            try:
                return await asyncio.to_thread(func, *args, **kwargs)
            finally:
                async with self._lock:
                    self._active_count -= 1

    @property
    def active_count(self) -> int:
        """Numero operazioni attive."""
        return self._active_count

    @property
    def available_slots(self) -> int:
        """Slot disponibili."""
        return self.max_workers - self._active_count


# Pool globale per I/O
_io_pool: Optional[AsyncConnectionPool] = None


def get_io_pool() -> AsyncConnectionPool:
    """Ottiene il pool I/O globale."""
    global _io_pool
    if _io_pool is None:
        _io_pool = AsyncConnectionPool(max_workers=10)
    return _io_pool


# =============================================================================
# PUBLIC API
# =============================================================================

__all__ = [
    # Classi principali
    "WaveExecutor",
    "Wave",
    "WaveStatus",
    "TaskResult",
    "UltraTask",
    # Supporto
    "ResourcePool",
    "BackpressureController",  # Re-exported from lib.backpressure
    "ThrottleState",
    "SystemMetrics",
    # Async I/O
    "AsyncConnectionPool",
    "get_io_pool",
    # Factory
    "create_simple_task",
    "create_dependent_task",
    # Singleton
    "get_wave_executor",
    "reset_wave_executor",
    # Costanti
    "MAX_WAVE_TIMEOUT",
    "MAX_CONCURRENT_PER_WAVE",
    "DEFAULT_TASK_TIMEOUT",
]
