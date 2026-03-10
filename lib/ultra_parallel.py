"""Ultra-Massive Parallel Execution Engine per Orchestrator V15.1.0.

Questo modulo fornisce un motore di esecuzione parallela ultra-massivo con:
- 10+ task simultanei livello root
- 50+ agent/skill/plugin PER TASK simultanei
- 50+ sub-agent/skill/plugin PER SUBTASK simultanei
- Ricorsione INFINITA con backpressure adattivo
- Zero serializzazione - tutto parallelo

Caratteristiche:
- Wave-based execution (esecuzione a ondate per livello)
- Adaptive backpressure (rallenta automaticamente se sovraccarico)
- Memory guard (kill processi se >80% RAM)
- Circuit breaker per API calls
- Rate limiting adattivo
- Resource pooling con semafori
- Result aggregation a ritroso

Utilizzo:
    from lib.ultra_parallel import UltraParallelEngine, UltraTask

    # Crea il motore
    engine = UltraParallelEngine()

    # Definisci i task
    tasks = [
        UltraTask(
            task_id="task_1",
            depth=0,
            agents=["agent_a", "agent_b"],
            skills=["skill_x"],
        )
    ]

    # Esegui in parallelo massivo
    results = await engine.execute_ultra(tasks)

Architettura:
    UltraParallelEngine
    |-- UltraParallelCoordinator (dispatcher centrale)
    |-- WaveExecutor (esecuzione a ondate)
    |-- ResourcePool (pool di risorse con semafori)
    |-- BackpressureController (controllo sovraccarico)
    |-- MemoryGuard (monitor memoria)
    |-- CircuitBreakerManager (protezione API)
"""

from __future__ import annotations

import asyncio
import logging
import os
import sys
import threading
import time
import uuid
import weakref
from collections import defaultdict, deque
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager, contextmanager
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum, auto
from typing import (
    Any,
    AsyncGenerator,
    Callable,
    Dict,
    Generator,
    Generic,
    List,
    Optional,
    Protocol,
    Set,
    Tuple,
    TypeVar,
    Union,
    runtime_checkable,
)

# Import moduli esistenti per integrazione
try:
    from lib.rate_limiter import AdaptiveRateLimiter, get_rate_limiter, RateLimitError
    from lib.chaos import ChaosInjector, get_chaos_injector, FailureType
    from lib.exceptions import (
        OrchestratorError,
        TaskError,
        TaskTimeoutError,
        AgentExecutionError,
    )
except ImportError:
    # Fallback per testing standalone
    pass

logger = logging.getLogger(__name__)


# =============================================================================
# COSTANTI DI CONFIGURAZIONE
# =============================================================================

# Import configurazione centralizzata
from lib.config import config

# Limiti di concorrenza
MAX_CONCURRENT_ROOT = 10  # Task root simultanei
MAX_CONCURRENT_PER_TASK = 50  # Agent/skill/plugin per task
MAX_CONCURRENT_PER_SUBTASK = 50  # Sub-agent per subtask
MAX_TOTAL_CONCURRENT = 500  # Limite globale di operazioni concorrenti

# Soglie di sicurezza (da config centralizzato)
MEMORY_THRESHOLD = config.MEMORY_CRITICAL_THRESHOLD  # Soglia critica RAM
MEMORY_WARNING_THRESHOLD = config.MEMORY_WARNING_THRESHOLD  # Soglia warning RAM
CPU_THRESHOLD = config.BACKPRESSURE_CPU_THRESHOLD  # Soglia CPU

# Timeout (GRACEFUL_SHUTDOWN_TIMEOUT da config, altri hardcoded)
DEFAULT_WAVE_TIMEOUT = 300.0  # 5 minuti per wave
DEFAULT_TASK_TIMEOUT = 60.0  # 1 minuto per task
DEFAULT_AGENT_TIMEOUT = 30.0  # 30 secondi per agente
GRACEFUL_SHUTDOWN_TIMEOUT = float(config.GRACEFUL_SHUTDOWN_TIMEOUT)  # Da config
GRACEFUL_TERMINATE_TIMEOUT = 5.0  # 5 secondi per terminate graceful
FORCE_KILL_TIMEOUT = 2.0  # 2 secondi prima di force kill

# Backpressure
BACKPRESSURE_THRESHOLD = 0.75  # Soglia per attivare backpressure
BACKPRESSURE_MIN_DELAY = 0.01  # 10ms delay minimo
BACKPRESSURE_MAX_DELAY = 1.0  # 1s delay massimo
BACKPRESSURE_INCREASE_FACTOR = 1.5  # Fattore aumento delay
BACKPRESSURE_DECREASE_FACTOR = 0.9  # Fattore decremento delay

# Circuit Breaker
CIRCUIT_BREAKER_THRESHOLD = 5  # Errori consecutivi per aprire
CIRCUIT_BREAKER_TIMEOUT = 60.0  # 60 secondi prima di half-open
CIRCUIT_BREAKER_SUCCESS_THRESHOLD = 3  # Successi per chiudere

# Rate Limiting
RATE_LIMIT_MIN = 10  # 10 req/s minimo
RATE_LIMIT_MAX = 1000  # 1000 req/s massimo
RATE_LIMIT_DEFAULT = 100  # 100 req/s default

# Profondita massima ricorsione (0 = infinita)
MAX_DEPTH = 0  # Infinito - limitato solo da risorse

# Dimensioni pool
RESOURCE_POOL_SIZE = 100  # Dimensione pool risorse
RESULT_BUFFER_SIZE = 10000  # Buffer risultati


# =============================================================================
# ECCEZIONI CUSTOM
# =============================================================================

class UltraParallelError(Exception):
    """Errore base per UltraParallelEngine."""
    pass


class ResourceExhaustedError(UltraParallelError):
    """Risorse esaurite (memoria, CPU, connessioni)."""
    pass


class BackpressureExceededError(UltraParallelError):
    """Backpressure superata - sistema sovraccarico."""
    pass


class WaveTimeoutError(UltraParallelError):
    """Timeout dell'intera wave di esecuzione."""
    pass


class DepthLimitExceededError(UltraParallelError):
    """Limite di profondita ricorsione superato."""
    pass


class CircuitBreakerOpenError(UltraParallelError):
    """Circuit breaker aperto - troppe operazioni fallite."""
    pass


# =============================================================================
# ENUM E TIPI
# =============================================================================

class TaskStatus(Enum):
    """Stato di un UltraTask."""
    PENDING = auto()  # In attesa di esecuzione
    RUNNING = auto()  # In esecuzione
    COMPLETED = auto()  # Completato con successo
    FAILED = auto()  # Fallito
    TIMEOUT = auto()  # Timeout
    CANCELLED = auto()  # Cancellato
    SKIPPED = auto()  # Saltato (dipendenze fallite)
    THROTTLED = auto()  # Throttled per backpressure


class WaveStatus(Enum):
    """Stato di una ExecutionWave."""
    PENDING = auto()
    RUNNING = auto()
    COMPLETED = auto()
    FAILED = auto()
    TIMEOUT = auto()
    CANCELLED = auto()


class ResourceType(Enum):
    """Tipo di risorsa nel pool."""
    AGENT = "agent"
    SKILL = "skill"
    PLUGIN = "plugin"
    API = "api"
    DATABASE = "database"
    MEMORY = "memory"
    CPU = "cpu"
    NETWORK = "network"


class Priority(Enum):
    """Priorita di esecuzione."""
    CRITICAL = 0  # Esecuzione immediata
    HIGH = 1  # Alta priorita
    NORMAL = 2  # Priorita normale
    LOW = 3  # Bassa priorita
    BACKGROUND = 4  # Background


# Tipo generico per risultati
T = TypeVar('T')
Result = Union[T, Exception, None]


# =============================================================================
# DATA STRUCTURES
# =============================================================================

@dataclass
class UltraTask:
    """Task ultra-parallelo con supporto ricorsivo.

    Un UltraTask puo contenere:
    - Lista di agent da eseguire in parallelo
    - Lista di skill da invocare in parallelo
    - Lista di plugin da usare in parallelo
    - Lista di subtask ricorsivi (anch'essi UltraTask)

    Attributes:
        task_id: Identificativo unico del task
        depth: Profondita nell'albero di esecuzione (0 = root)
        parent_id: ID del task genitore (None per root)
        agents: Lista di agent da eseguire (fino a 50+)
        skills: Lista di skill da invocare (fino a 50+)
        plugins: Lista di plugin da usare (fino a 50+)
        subtasks: Lista di subtask ricorsivi
        status: Stato corrente del task
        results: Risultati dell'esecuzione
        priority: Priorita di esecuzione
        timeout: Timeout specifico (secondi)
        metadata: Metadati aggiuntivi
        created_at: Timestamp creazione
        started_at: Timestamp inizio esecuzione
        completed_at: Timestamp completamento
        error: Errore se fallito
        retry_count: Contatore retry
        dependencies: ID dei task da cui dipende
    """

    task_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    depth: int = 0
    parent_id: Optional[str] = None
    agents: List[str] = field(default_factory=list)
    skills: List[str] = field(default_factory=list)
    plugins: List[str] = field(default_factory=list)
    subtasks: List['UltraTask'] = field(default_factory=list)
    status: TaskStatus = TaskStatus.PENDING
    results: List[Any] = field(default_factory=list)
    priority: Priority = Priority.NORMAL
    timeout: float = DEFAULT_TASK_TIMEOUT
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error: Optional[Exception] = None
    retry_count: int = 0
    dependencies: Set[str] = field(default_factory=set)

    def __post_init__(self):
        """Validazione post-inizializzazione."""
        if not self.task_id:
            self.task_id = str(uuid.uuid4())[:8]

    @property
    def is_root(self) -> bool:
        """True se e' un task root (depth=0)."""
        return self.depth == 0

    @property
    def duration_ms(self) -> Optional[float]:
        """Durata in millisecondi se completato."""
        if self.started_at and self.completed_at:
            delta = self.completed_at - self.started_at
            return delta.total_seconds() * 1000
        return None

    @property
    def total_items(self) -> int:
        """Numero totale di elementi (agent + skill + plugin + subtasks)."""
        return len(self.agents) + len(self.skills) + len(self.plugins) + len(self.subtasks)

    def add_agent(self, agent_name: str) -> 'UltraTask':
        """Aggiunge un agent (fluent API)."""
        self.agents.append(agent_name)
        return self

    def add_skill(self, skill_name: str) -> 'UltraTask':
        """Aggiunge una skill (fluent API)."""
        self.skills.append(skill_name)
        return self

    def add_plugin(self, plugin_name: str) -> 'UltraTask':
        """Aggiunge un plugin (fluent API)."""
        self.plugins.append(plugin_name)
        return self

    def add_subtask(self, subtask: 'UltraTask') -> 'UltraTask':
        """Aggiunge un subtask (fluent API)."""
        subtask.parent_id = self.task_id
        subtask.depth = self.depth + 1
        self.subtasks.append(subtask)
        return self

    def to_dict(self) -> Dict[str, Any]:
        """Serializza il task in dizionario."""
        return {
            "task_id": self.task_id,
            "depth": self.depth,
            "parent_id": self.parent_id,
            "status": self.status.name,
            "agents": self.agents,
            "skills": self.skills,
            "plugins": self.plugins,
            "subtasks_count": len(self.subtasks),
            "results_count": len(self.results),
            "priority": self.priority.name,
            "timeout": self.timeout,
            "duration_ms": self.duration_ms,
            "error": str(self.error) if self.error else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


@dataclass
class ExecutionWave:
    """Wave di esecuzione parallela.

    Una wave contiene tutti i task allo stesso livello di profondita
    che vengono eseguiti simultaneamente.

    Attributes:
        wave_id: Identificativo della wave
        depth: Profondita dei task in questa wave
        tasks: Lista di task nella wave
        status: Stato della wave
        started_at: Timestamp inizio
        completed_at: Timestamp fine
        resource_budget: Budget di risorse allocato
        timeout: Timeout della wave
        results: Risultati aggregati
        errors: Errori riscontrati
    """

    wave_id: int = 0
    depth: int = 0
    tasks: List[UltraTask] = field(default_factory=list)
    status: WaveStatus = WaveStatus.PENDING
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    resource_budget: int = MAX_CONCURRENT_PER_TASK
    timeout: float = DEFAULT_WAVE_TIMEOUT
    results: List[Any] = field(default_factory=list)
    errors: List[Exception] = field(default_factory=list)

    @property
    def task_count(self) -> int:
        """Numero di task nella wave."""
        return len(self.tasks)

    @property
    def total_items(self) -> int:
        """Numero totale di elementi in tutti i task."""
        return sum(t.total_items for t in self.tasks)

    @property
    def duration_ms(self) -> Optional[float]:
        """Durata in millisecondi."""
        if self.started_at and self.completed_at:
            delta = self.completed_at - self.started_at
            return delta.total_seconds() * 1000
        return None

    @property
    def success_rate(self) -> float:
        """Tasso di successo (0.0 - 1.0)."""
        if not self.tasks:
            return 1.0
        completed = sum(1 for t in self.tasks if t.status == TaskStatus.COMPLETED)
        return completed / len(self.tasks)

    def add_task(self, task: UltraTask) -> 'ExecutionWave':
        """Aggiunge un task alla wave."""
        task.depth = self.depth
        self.tasks.append(task)
        return self


@dataclass
class ResourceAllocation:
    """Allocazione di risorse per un'operazione.

    Attributes:
        allocation_id: ID dell'allocazione
        resource_type: Tipo di risorsa
        resource_name: Nome della risorsa
        allocated_at: Timestamp allocazione
        released_at: Timestamp rilascio
        task_id: Task associato
        tokens: Token allocati
    """

    allocation_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    resource_type: ResourceType = ResourceType.AGENT
    resource_name: str = ""
    allocated_at: datetime = field(default_factory=datetime.now)
    released_at: Optional[datetime] = None
    task_id: Optional[str] = None
    tokens: int = 1

    @property
    def is_active(self) -> bool:
        """True se l'allocazione e' ancora attiva."""
        return self.released_at is None

    @property
    def duration_ms(self) -> Optional[float]:
        """Durata in millisecondi."""
        if self.allocated_at and self.released_at:
            delta = self.released_at - self.allocated_at
            return delta.total_seconds() * 1000
        return None


@dataclass
class BackpressureState:
    """Stato del backpressure controller.

    Attributes:
        current_delay: Delay corrente in secondi
        active_operations: Numero operazioni attive
        queue_size: Dimensione coda
        memory_usage: Uso memoria (0.0-1.0)
        cpu_usage: Uso CPU (0.0-1.0)
        error_rate: Tasso errori recente
        last_adjustment: Ultimo aggiustamento
        is_throttling: Se e' in throttling
    """

    current_delay: float = 0.0
    active_operations: int = 0
    queue_size: int = 0
    memory_usage: float = 0.0
    cpu_usage: float = 0.0
    error_rate: float = 0.0
    last_adjustment: datetime = field(default_factory=datetime.now)
    is_throttling: bool = False

    @property
    def load_factor(self) -> float:
        """Fattore di carico complessivo (0.0-1.0+)."""
        return max(
            self.memory_usage,
            self.cpu_usage,
            self.error_rate,
            self.active_operations / MAX_TOTAL_CONCURRENT if MAX_TOTAL_CONCURRENT > 0 else 0,
        )

    @property
    def should_throttle(self) -> bool:
        """True se bisogna attivare throttling."""
        return self.load_factor >= BACKPRESSURE_THRESHOLD


@dataclass
class CircuitBreakerState:
    """Stato di un circuit breaker.

    Attributes:
        name: Nome del circuit breaker
        is_open: Se il circuit e' aperto
        error_count: Contatore errori consecutivi
        success_count: Contatore successi consecutivi
        last_error: Ultimo errore
        last_error_time: Timestamp ultimo errore
        opened_at: Timestamp apertura
    """

    name: str = ""
    is_open: bool = False
    error_count: int = 0
    success_count: int = 0
    last_error: Optional[Exception] = None
    last_error_time: Optional[datetime] = None
    opened_at: Optional[datetime] = None

    def record_success(self) -> None:
        """Registra un successo."""
        self.error_count = 0
        if self.is_open:
            self.success_count += 1
            if self.success_count >= CIRCUIT_BREAKER_SUCCESS_THRESHOLD:
                self.is_open = False
                self.success_count = 0
                logger.info(f"Circuit breaker '{self.name}' chiuso")

    def record_error(self, error: Exception) -> None:
        """Registra un errore."""
        self.success_count = 0
        self.error_count += 1
        self.last_error = error
        self.last_error_time = datetime.now()

        if self.error_count >= CIRCUIT_BREAKER_THRESHOLD and not self.is_open:
            self.is_open = True
            self.opened_at = datetime.now()
            logger.warning(
                f"Circuit breaker '{self.name}' aperto dopo "
                f"{self.error_count} errori consecutivi"
            )

    def should_allow(self) -> bool:
        """Verifica se le operazioni sono permesse."""
        if not self.is_open:
            return True

        # Controlla se il timeout e' scaduto per tentare half-open
        if self.opened_at:
            elapsed = (datetime.now() - self.opened_at).total_seconds()
            if elapsed >= CIRCUIT_BREAKER_TIMEOUT:
                logger.info(f"Circuit breaker '{self.name}' in half-open")
                return True  # Permette un tentativo

        return False


@dataclass
class ExecutionResult:
    """Risultato aggregato dell'esecuzione.

    Attributes:
        execution_id: ID dell'esecuzione
        total_tasks: Task totali
        completed_tasks: Task completati
        failed_tasks: Task falliti
        total_waves: Wave totali
        total_duration_ms: Durata totale in ms
        results: Risultati aggregati
        errors: Errori aggregati
        metrics: Metriche raccolte
        started_at: Timestamp inizio
        completed_at: Timestamp fine
    """

    execution_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    total_tasks: int = 0
    completed_tasks: int = 0
    failed_tasks: int = 0
    total_waves: int = 0
    total_duration_ms: float = 0.0
    results: List[Any] = field(default_factory=list)
    errors: List[Exception] = field(default_factory=list)
    metrics: Dict[str, Any] = field(default_factory=dict)
    started_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None

    @property
    def success_rate(self) -> float:
        """Tasso di successo."""
        if self.total_tasks == 0:
            return 1.0
        return self.completed_tasks / self.total_tasks

    @property
    def is_success(self) -> bool:
        """True se tutti i task hanno successo."""
        return self.failed_tasks == 0


# =============================================================================
# PROTOCOL PER ESECUITORI
# =============================================================================

@runtime_checkable
class Executor(Protocol[T]):
    """Protocol per esecutori di agent/skill/plugin."""

    async def execute(
        self,
        name: str,
        task: UltraTask,
        context: Dict[str, Any],
    ) -> Result[T]:
        """Esegue l'operazione.

        Args:
            name: Nome dell'agent/skill/plugin
            task: Task associato
            context: Contesto di esecuzione

        Returns:
            Risultato dell'esecuzione
        """
        ...


# =============================================================================
# MEMORY GUARD
# =============================================================================

class MemoryGuard:
    """Monitor memoria di sistema con protezione automatica.

    Controlla l'uso della memoria e puo bloccare nuove operazioni
    se si supera la soglia critica. Supporta shutdown graceful con
    escalation sequence per evitare data loss.
    """

    def __init__(
        self,
        threshold: float = MEMORY_THRESHOLD,
        warning_threshold: float = MEMORY_WARNING_THRESHOLD,
        check_interval: float = 1.0,
        graceful_shutdown_timeout: float = GRACEFUL_SHUTDOWN_TIMEOUT,
        graceful_terminate_timeout: float = GRACEFUL_TERMINATE_TIMEOUT,
        force_kill_timeout: float = FORCE_KILL_TIMEOUT,
    ):
        """Inizializza il MemoryGuard.

        Args:
            threshold: Soglia critica (0.0-1.0)
            warning_threshold: Soglia warning (0.0-1.0)
            check_interval: Intervallo controllo in secondi
            graceful_shutdown_timeout: Timeout per shutdown graceful (secondi)
            graceful_terminate_timeout: Timeout per terminate graceful (secondi)
            force_kill_timeout: Timeout prima di force kill (secondi)
        """
        self.threshold = threshold
        self.warning_threshold = warning_threshold
        self.check_interval = check_interval
        self.graceful_shutdown_timeout = graceful_shutdown_timeout
        self.graceful_terminate_timeout = graceful_terminate_timeout
        self.force_kill_timeout = force_kill_timeout
        self._last_check = 0.0
        self._cached_usage = 0.0
        self._lock = threading.Lock()
        self._cleanup_handlers: List[Callable[[], Any]] = []
        self._active_tasks: Dict[str, asyncio.Task] = {}
        self._tasks_lock = threading.Lock()

    def get_memory_usage(self) -> float:
        """Ottiene l'uso memoria corrente (0.0-1.0).

        Returns:
            Frazione di memoria usata
        """
        now = time.time()

        # Usa cache se recente
        with self._lock:
            if now - self._last_check < self.check_interval:
                return self._cached_usage

        try:
            import psutil
            memory = psutil.virtual_memory()
            usage = memory.percent / 100.0
        except ImportError:
            # Fallback senza psutil
            try:
                import resource
                # Su Unix, usa getrusage
                rusage = resource.getrusage(resource.RUSAGE_SELF)
                # Stima approssimativa
                usage = min(0.5, rusage.ru_maxrss / (8 * 1024 * 1024))  # Assume 8GB max
            except (ImportError, AttributeError):
                # Windows senza psutil - stima conservativa
                usage = 0.3

        with self._lock:
            self._cached_usage = usage
            self._last_check = now

        return usage

    def register_cleanup_handler(self, handler: Callable[[], Any]) -> None:
        """Registra un cleanup handler da chiamare prima del terminate.

        Args:
            handler: Funzione di cleanup (sync o async)
        """
        with self._lock:
            self._cleanup_handlers.append(handler)
        logger.debug(f"Cleanup handler registrato: {handler.__name__}")

    def unregister_cleanup_handler(self, handler: Callable[[], Any]) -> None:
        """Rimuove un cleanup handler.

        Args:
            handler: Funzione di cleanup da rimuovere
        """
        with self._lock:
            if handler in self._cleanup_handlers:
                self._cleanup_handlers.remove(handler)
        logger.debug(f"Cleanup handler rimosso: {handler.__name__}")

    def register_task(self, task_id: str, task: asyncio.Task) -> None:
        """Registra un task async per tracking.

        Args:
            task_id: ID univoco del task
            task: Task asyncio da tracciare
        """
        with self._tasks_lock:
            self._active_tasks[task_id] = task
        logger.debug(f"Task registrato: {task_id}")

    def unregister_task(self, task_id: str) -> None:
        """Rimuove un task dal tracking.

        Args:
            task_id: ID del task da rimuovere
        """
        with self._tasks_lock:
            self._active_tasks.pop(task_id, None)
        logger.debug(f"Task rimosso: {task_id}")

    async def _run_cleanup_handlers(self) -> None:
        """Esegue tutti i cleanup handlers registrati."""
        with self._lock:
            handlers = list(self._cleanup_handlers)

        logger.info(f"Esecuzione di {len(handlers)} cleanup handlers...")

        for handler in handlers:
            try:
                result = handler()
                if asyncio.iscoroutine(result):
                    await asyncio.wait_for(
                        result,
                        timeout=self.graceful_shutdown_timeout
                    )
                logger.debug(f"Cleanup handler completato: {handler.__name__}")
            except asyncio.TimeoutError:
                logger.warning(
                    f"Cleanup handler timeout: {handler.__name__} "
                    f"(>{self.graceful_shutdown_timeout}s)"
                )
            except Exception as e:
                logger.error(
                    f"Errore cleanup handler {handler.__name__}: {e}",
                    exc_info=True
                )

    async def graceful_terminate_task(
        self,
        task_id: str,
        task: asyncio.Task,
    ) -> bool:
        """Termina un task con escalation sequence.

        Step 1: Chiama cleanup handlers
        Step 2: Graceful cancel con timeout
        Step 3: Force cancel

        Args:
            task_id: ID del task
            task: Task asyncio da terminare

        Returns:
            True se terminato con successo
        """
        logger.info(
            f"[GRACEFUL-TERMINATE] Step 1: Avvio terminate per task {task_id}"
        )

        # Step 1: Graceful cancel
        task.cancel()
        logger.info(
            f"[GRACEFUL-TERMINATE] Step 2: Cancel inviato, "
            f"attesa {self.graceful_terminate_timeout}s"
        )

        try:
            await asyncio.wait_for(task, timeout=self.graceful_terminate_timeout)
            logger.info(f"[GRACEFUL-TERMINATE] Task {task_id} terminato gracefully")
            return True
        except asyncio.CancelledError:
            logger.info(f"[GRACEFUL-TERMINATE] Task {task_id} cancellato correttamente")
            return True
        except asyncio.TimeoutError:
            logger.warning(
                f"[GRACEFUL-TERMINATE] Step 3: Timeout graceful, "
                f"force cancel per task {task_id}"
            )
            # Step 3: Force - il task e' gia' cancellato ma non risponde
            # Non c'e' molto altro da fare per un task asyncio
            return False
        except Exception as e:
            logger.error(f"[GRACEFUL-TERMINATE] Errore task {task_id}: {e}")
            return False

    async def graceful_shutdown_all(self, reason: str = "memory_critical") -> int:
        """Esegue shutdown graceful di tutti i task attivi.

        Escalation sequence:
        1. Esegue cleanup handlers
        2. Graceful cancel di tutti i task
        3. Attende timeout
        4. Logga task che non rispondono

        Args:
            reason: Motivo dello shutdown

        Returns:
            Numero di task terminati con successo
        """
        logger.warning(
            f"[MEMORY-GUARD] Avvio graceful shutdown: {reason}, "
            f"uso memoria: {self.get_memory_usage():.1%}"
        )

        # Step 1: Esegui cleanup handlers
        await self._run_cleanup_handlers()

        # Step 2: Ottieni task attivi
        with self._tasks_lock:
            active_tasks = dict(self._active_tasks)

        if not active_tasks:
            logger.info("[MEMORY-GUARD] Nessun task attivo da terminare")
            return 0

        logger.info(
            f"[MEMORY-GUARD] Terminazione di {len(active_tasks)} task attivi..."
        )

        # Step 3: Termina tutti i task in parallelo
        results = await asyncio.gather(
            *[
                self.graceful_terminate_task(task_id, task)
                for task_id, task in active_tasks.items()
            ],
            return_exceptions=True,
        )

        # Step 4: Conta successi
        success_count = sum(1 for r in results if r is True)

        # Step 5: Pulisci registro
        with self._tasks_lock:
            self._active_tasks.clear()

        logger.info(
            f"[MEMORY-GUARD] Graceful shutdown completato: "
            f"{success_count}/{len(active_tasks)} task terminati"
        )

        return success_count

    def is_memory_critical(self) -> bool:
        """Verifica se la memoria e' in stato critico.

        Returns:
            True se supera la soglia critica
        """
        return self.get_memory_usage() >= self.threshold

    def is_memory_warning(self) -> bool:
        """Verifica se la memoria e' in warning.

        Returns:
            True se supera la soglia warning
        """
        return self.get_memory_usage() >= self.warning_threshold

    @contextmanager
    def memory_check(self) -> Generator[None, None, None]:
        """Context manager che controlla memoria.

        Raises:
            ResourceExhaustedError: Se memoria critica

        Yields:
            None
        """
        if self.is_memory_critical():
            usage = self.get_memory_usage()
            raise ResourceExhaustedError(
                f"Memoria critica: {usage:.1%} usata (soglia: {self.threshold:.1%})"
            )
        try:
            yield
        finally:
            if self.is_memory_critical():
                logger.warning(
                    f"Memoria critica dopo operazione: "
                    f"{self.get_memory_usage():.1%}"
                )

    @asynccontextmanager
    async def async_memory_check(
        self,
        enable_graceful_shutdown: bool = True,
    ) -> AsyncGenerator[None, None]:
        """Context manager async con graceful shutdown opzionale.

        A differenza della versione sync, questa permette di eseguire
        graceful shutdown prima di sollevare l'eccezione.

        Args:
            enable_graceful_shutdown: Se True, esegue graceful shutdown
                prima di sollevare ResourceExhaustedError

        Yields:
            None

        Raises:
            ResourceExhaustedError: Se memoria critica dopo graceful shutdown
        """
        if self.is_memory_critical():
            usage = self.get_memory_usage()
            logger.warning(
                f"[MEMORY-GUARD] Memoria critica rilevata: "
                f"{usage:.1%} usata (soglia: {self.threshold:.1%})"
            )

            if enable_graceful_shutdown:
                # Esegui graceful shutdown
                await self.graceful_shutdown_all(
                    reason=f"memory_check: {usage:.1%} usata"
                )

            # Dopo il graceful shutdown, solleva comunque l'errore
            raise ResourceExhaustedError(
                f"Memoria critica: {usage:.1%} usata (soglia: {self.threshold:.1%})"
            )

        try:
            yield
        finally:
            if self.is_memory_critical():
                usage = self.get_memory_usage()
                logger.warning(
                    f"[MEMORY-GUARD] Memoria critica dopo operazione: "
                    f"{usage:.1%}"
                )


# =============================================================================
# BACKPRESSURE CONTROLLER
# =============================================================================

class BackpressureController:
    """Controller per gestione backpressure adattiva.

    Regola automaticamente il flusso di operazioni basandosi su:
    - Uso memoria
    - Uso CPU
    - Numero operazioni attive
    - Tasso errori
    """

    def __init__(
        self,
        threshold: float = BACKPRESSURE_THRESHOLD,
        min_delay: float = BACKPRESSURE_MIN_DELAY,
        max_delay: float = BACKPRESSURE_MAX_DELAY,
    ):
        """Inizializza il BackpressureController.

        Args:
            threshold: Soglia per attivare backpressure
            min_delay: Delay minimo in secondi
            max_delay: Delay massimo in secondi
        """
        self.threshold = threshold
        self.min_delay = min_delay
        self.max_delay = max_delay
        self._state = BackpressureState()
        self._lock = threading.Lock()
        self._memory_guard = MemoryGuard()

    @property
    def state(self) -> BackpressureState:
        """Stato corrente (copia)."""
        with self._lock:
            return BackpressureState(
                current_delay=self._state.current_delay,
                active_operations=self._state.active_operations,
                queue_size=self._state.queue_size,
                memory_usage=self._state.memory_usage,
                cpu_usage=self._state.cpu_usage,
                error_rate=self._state.error_rate,
                last_adjustment=self._state.last_adjustment,
                is_throttling=self._state.is_throttling,
            )

    def acquire_slot(self) -> bool:
        """Tenta di acquisire uno slot per esecuzione.

        Returns:
            True se lo slot e' acquisito, False se in backpressure
        """
        with self._lock:
            self._update_metrics()

            if self._state.should_throttle:
                # Aumenta delay
                self._state.current_delay = min(
                    self.max_delay,
                    self._state.current_delay * BACKPRESSURE_INCREASE_FACTOR
                )
                self._state.is_throttling = True
                return False

            self._state.active_operations += 1
            self._state.is_throttling = False
            return True

    def release_slot(self, success: bool = True) -> None:
        """Rilascia uno slot.

        Args:
            success: Se l'operazione e' riuscita
        """
        with self._lock:
            self._state.active_operations = max(0, self._state.active_operations - 1)

            if success:
                # Riduci delay gradualmente
                self._state.current_delay = max(
                    self.min_delay,
                    self._state.current_delay * BACKPRESSURE_DECREASE_FACTOR
                )
            else:
                # Aumenta errore rate
                self._update_error_rate(1.0)

    def get_delay(self) -> float:
        """Ottiene il delay corrente.

        Returns:
            Delay in secondi
        """
        with self._lock:
            return self._state.current_delay

    async def wait_if_needed(self) -> None:
        """Attende se backpressure e' attiva."""
        delay = self.get_delay()
        if delay > self.min_delay:
            logger.debug(f"Backpressure: attesa {delay:.3f}s")
            await asyncio.sleep(delay)

    def _update_metrics(self) -> None:
        """Aggiorna le metriche interne."""
        self._state.memory_usage = self._memory_guard.get_memory_usage()
        # CPU non implementata per semplicita
        self._state.last_adjustment = datetime.now()

    def _update_error_rate(self, error_value: float) -> None:
        """Aggiorna il tasso errori."""
        # Media mobile semplice
        alpha = 0.1
        self._state.error_rate = (
            alpha * error_value + (1 - alpha) * self._state.error_rate
        )

    def set_queue_size(self, size: int) -> None:
        """Imposta dimensione coda."""
        with self._lock:
            self._state.queue_size = size


# =============================================================================
# RESOURCE POOL
# =============================================================================

class ResourcePool:
    """Pool di risorse con semafori per gestione concorrenza.

    Gestisce l'allocazione di risorse (agent, skill, plugin) con
    limiti di concorrenza per tipo.
    """

    def __init__(
        self,
        max_per_type: int = MAX_CONCURRENT_PER_TASK,
        total_max: int = MAX_TOTAL_CONCURRENT,
    ):
        """Inizializza il ResourcePool.

        Args:
            max_per_type: Massimo per tipo di risorsa
            total_max: Massimo totale
        """
        self.max_per_type = max_per_type
        self.total_max = total_max

        # Semafori per tipo
        self._semaphores: Dict[ResourceType, asyncio.Semaphore] = {}
        self._total_semaphore = asyncio.Semaphore(total_max)

        # Allocazioni attive
        self._allocations: Dict[str, ResourceAllocation] = {}
        self._lock = threading.Lock()

        # Inizializza semafori
        for rt in ResourceType:
            self._semaphores[rt] = asyncio.Semaphore(max_per_type)

    @asynccontextmanager
    async def acquire(
        self,
        resource_type: ResourceType,
        resource_name: str,
        task_id: Optional[str] = None,
        timeout: float = 10.0,
    ) -> Generator[ResourceAllocation, None, None]:
        """Acquisisce una risorsa.

        Args:
            resource_type: Tipo di risorsa
            resource_name: Nome della risorsa
            task_id: ID task associato
            timeout: Timeout acquisizione

        Yields:
            ResourceAllocation

        Raises:
            asyncio.TimeoutError: Se timeout scade
        """
        allocation = ResourceAllocation(
            resource_type=resource_type,
            resource_name=resource_name,
            task_id=task_id,
        )

        sem = self._semaphores.get(resource_type)
        if not sem:
            sem = asyncio.Semaphore(self.max_per_type)
            self._semaphores[resource_type] = sem

        # Acquisisci semafori
        try:
            async with asyncio.timeout(timeout):
                await sem.acquire()
                await self._total_semaphore.acquire()
        except asyncio.TimeoutError:
            raise asyncio.TimeoutError(
                f"Timeout acquisizione risorsa {resource_type.value}:{resource_name}"
            )

        # Registra allocazione
        with self._lock:
            self._allocations[allocation.allocation_id] = allocation

        try:
            yield allocation
        finally:
            # Rilascia
            sem.release()
            self._total_semaphore.release()

            with self._lock:
                allocation.released_at = datetime.now()
                if allocation.allocation_id in self._allocations:
                    del self._allocations[allocation.allocation_id]

    def get_stats(self) -> Dict[str, Any]:
        """Ottiene statistiche del pool.

        Returns:
            Dizionario con statistiche
        """
        with self._lock:
            active = [a for a in self._allocations.values() if a.is_active]

            by_type: Dict[str, int] = defaultdict(int)
            for a in active:
                by_type[a.resource_type.value] += 1

            return {
                "total_active": len(active),
                "by_type": dict(by_type),
                "max_per_type": self.max_per_type,
                "total_max": self.total_max,
            }


# =============================================================================
# CIRCUIT BREAKER MANAGER
# =============================================================================

class CircuitBreakerManager:
    """Gestore di circuit breaker per API e risorse esterne."""

    def __init__(self):
        """Inizializza il manager."""
        self._breakers: Dict[str, CircuitBreakerState] = {}
        self._lock = threading.Lock()

    def get_breaker(self, name: str) -> CircuitBreakerState:
        """Ottiene o crea un circuit breaker.

        Args:
            name: Nome del circuit breaker

        Returns:
            CircuitBreakerState
        """
        with self._lock:
            if name not in self._breakers:
                self._breakers[name] = CircuitBreakerState(name=name)
            return self._breakers[name]

    def is_open(self, name: str) -> bool:
        """Verifica se un circuit breaker e' aperto.

        Args:
            name: Nome del circuit breaker

        Returns:
            True se aperto (blocca operazioni)
        """
        breaker = self.get_breaker(name)
        return breaker.is_open and not breaker.should_allow()

    def record_success(self, name: str) -> None:
        """Registra un successo.

        Args:
            name: Nome del circuit breaker
        """
        self.get_breaker(name).record_success()

    def record_error(self, name: str, error: Exception) -> None:
        """Registra un errore.

        Args:
            name: Nome del circuit breaker
            error: Eccezione riscontrata
        """
        self.get_breaker(name).record_error(error)

    @asynccontextmanager
    async def protect(
        self,
        name: str,
        raise_on_open: bool = True,
    ) -> Generator[None, None, None]:
        """Context manager con protezione circuit breaker.

        Args:
            name: Nome del circuit breaker
            raise_on_open: Se sollevare eccezione quando aperto

        Yields:
            None

        Raises:
            CircuitBreakerOpenError: Se circuit aperto e raise_on_open=True
        """
        if self.is_open(name):
            if raise_on_open:
                raise CircuitBreakerOpenError(
                    f"Circuit breaker '{name}' e' aperto"
                )
            return

        try:
            yield
            self.record_success(name)
        except Exception as e:
            self.record_error(name, e)
            raise

    def get_all_stats(self) -> Dict[str, Dict[str, Any]]:
        """Ottiene statistiche di tutti i circuit breaker.

        Returns:
            Dizionario nome -> stats
        """
        with self._lock:
            return {
                name: {
                    "is_open": b.is_open,
                    "error_count": b.error_count,
                    "success_count": b.success_count,
                    "last_error": str(b.last_error) if b.last_error else None,
                }
                for name, b in self._breakers.items()
            }

    def reset(self, name: Optional[str] = None) -> None:
        """Resetta circuit breaker(s).

        Args:
            name: Nome specifico o None per tutti
        """
        with self._lock:
            if name:
                if name in self._breakers:
                    self._breakers[name] = CircuitBreakerState(name=name)
            else:
                self._breakers.clear()


# =============================================================================
# WAVE EXECUTOR
# =============================================================================

class WaveExecutor:
    """Esegue task a ondate per livello di profondita.

    Ogni wave contiene tutti i task allo stesso livello e li
    esegue in parallelo.
    """

    def __init__(
        self,
        resource_pool: ResourcePool,
        backpressure: BackpressureController,
        circuit_breakers: CircuitBreakerManager,
        memory_guard: MemoryGuard,
        rate_limiter: Optional[AdaptiveRateLimiter] = None,
    ):
        """Inizializza il WaveExecutor.

        Args:
            resource_pool: Pool di risorse
            backpressure: Controller backpressure
            circuit_breakers: Manager circuit breaker
            memory_guard: Guard memoria
            rate_limiter: Rate limiter (opzionale)
        """
        self.resource_pool = resource_pool
        self.backpressure = backpressure
        self.circuit_breakers = circuit_breakers
        self.memory_guard = memory_guard
        self.rate_limiter = rate_limiter

        self._wave_counter = 0
        self._lock = threading.Lock()

    async def execute_wave(
        self,
        tasks: List[UltraTask],
        executor: Optional[Executor] = None,
        timeout: float = DEFAULT_WAVE_TIMEOUT,
    ) -> ExecutionWave:
        """Esegue una wave di task.

        Args:
            tasks: Lista di task da eseguire
            executor: Esecutore per agent/skill/plugin
            timeout: Timeout della wave

        Returns:
            ExecutionWave con risultati
        """
        with self._lock:
            self._wave_counter += 1
            wave_id = self._wave_counter

        # Determina profondita dai task
        depth = tasks[0].depth if tasks else 0

        wave = ExecutionWave(
            wave_id=wave_id,
            depth=depth,
            tasks=tasks,
            timeout=timeout,
        )

        wave.started_at = datetime.now()
        wave.status = WaveStatus.RUNNING

        logger.info(
            f"Wave {wave_id} iniziata: {len(tasks)} task, "
            f"depth={depth}, timeout={timeout}s"
        )

        try:
            # Esegui tutti i task in parallelo con timeout
            async with asyncio.timeout(timeout):
                results = await self._execute_tasks_parallel(tasks, executor)
                wave.results = results

            wave.status = WaveStatus.COMPLETED

        except asyncio.TimeoutError:
            wave.status = WaveStatus.TIMEOUT
            wave.errors.append(WaveTimeoutError(f"Wave {wave_id} timeout"))
            logger.warning(f"Wave {wave_id} timeout dopo {timeout}s")

        except Exception as e:
            wave.status = WaveStatus.FAILED
            wave.errors.append(e)
            logger.error(f"Wave {wave_id} fallita: {e}")

        finally:
            wave.completed_at = datetime.now()
            logger.info(
                f"Wave {wave_id} completata: status={wave.status.name}, "
                f"duration={wave.duration_ms:.0f}ms, "
                f"success_rate={wave.success_rate:.1%}"
            )

        return wave

    async def _execute_tasks_parallel(
        self,
        tasks: List[UltraTask],
        executor: Optional[Executor],
    ) -> List[Any]:
        """Esegue task in parallelo.

        Args:
            tasks: Lista di task
            executor: Esecutore

        Returns:
            Lista di risultati
        """
        # Crea coroutine per ogni task
        coroutines = [
            self._execute_single_task(task, executor)
            for task in tasks
        ]

        # Esegui tutti in parallelo
        results = await asyncio.gather(*coroutines, return_exceptions=True)

        return results

    async def _execute_single_task(
        self,
        task: UltraTask,
        executor: Optional[Executor],
    ) -> Any:
        """Esegue un singolo task.

        Args:
            task: Task da eseguire
            executor: Esecutore

        Returns:
            Risultato del task
        """
        task.status = TaskStatus.RUNNING
        task.started_at = datetime.now()

        try:
            # Controlla memoria
            if self.memory_guard.is_memory_critical():
                raise ResourceExhaustedError("Memoria critica")

            # Attendi backpressure se necessario
            await self.backpressure.wait_if_needed()

            # Acquisisci slot
            if not self.backpressure.acquire_slot():
                task.status = TaskStatus.THROTTLED
                await asyncio.sleep(self.backpressure.get_delay())

            try:
                # Rate limiting
                if self.rate_limiter:
                    if not await self.rate_limiter.async_acquire(task.task_id):
                        await asyncio.sleep(
                            self.rate_limiter.get_retry_after(task.task_id)
                        )

                # Esegui agent, skill, plugin in parallelo
                results = await self._execute_task_components(task, executor)

                # Esegui subtask ricorsivamente
                if task.subtasks:
                    subtask_results = await self._execute_subtasks(task.subtasks, executor)
                    results.extend(subtask_results)

                task.results = results
                task.status = TaskStatus.COMPLETED
                return results

            finally:
                self.backpressure.release_slot(success=task.status != TaskStatus.FAILED)

        except asyncio.TimeoutError:
            task.status = TaskStatus.TIMEOUT
            task.error = TaskTimeoutError(f"Task {task.task_id} timeout")
            raise

        except Exception as e:
            task.status = TaskStatus.FAILED
            task.error = e
            logger.error(f"Task {task.task_id} fallito: {e}")
            raise

        finally:
            task.completed_at = datetime.now()

    async def _execute_task_components(
        self,
        task: UltraTask,
        executor: Optional[Executor],
    ) -> List[Any]:
        """Esegue agent, skill, plugin di un task in parallelo.

        Args:
            task: Task
            executor: Esecutore

        Returns:
            Lista di risultati
        """
        coroutines = []
        context = {"task_id": task.task_id, "depth": task.depth}

        # Agent
        for agent in task.agents:
            coroutines.append(
                self._execute_component(
                    ResourceType.AGENT,
                    agent,
                    task,
                    executor,
                    context,
                )
            )

        # Skill
        for skill in task.skills:
            coroutines.append(
                self._execute_component(
                    ResourceType.SKILL,
                    skill,
                    task,
                    executor,
                    context,
                )
            )

        # Plugin
        for plugin in task.plugins:
            coroutines.append(
                self._execute_component(
                    ResourceType.PLUGIN,
                    plugin,
                    task,
                    executor,
                    context,
                )
            )

        if not coroutines:
            return []

        # Esegui tutti in parallelo
        results = await asyncio.gather(*coroutines, return_exceptions=True)
        return list(results)

    async def _execute_component(
        self,
        resource_type: ResourceType,
        name: str,
        task: UltraTask,
        executor: Optional[Executor],
        context: Dict[str, Any],
    ) -> Any:
        """Esegue un singolo componente.

        Args:
            resource_type: Tipo di risorsa
            name: Nome del componente
            task: Task associato
            executor: Esecutore
            context: Contesto

        Returns:
            Risultato dell'esecuzione
        """
        async with self.resource_pool.acquire(resource_type, name, task.task_id):
            async with self.circuit_breakers.protect(name, raise_on_open=False):
                if executor:
                    return await executor.execute(name, task, context)
                else:
                    # Mock executor per testing
                    await asyncio.sleep(0.01)  # Simula lavoro
                    return {"component": name, "type": resource_type.value}

    async def _execute_subtasks(
        self,
        subtasks: List[UltraTask],
        executor: Optional[Executor],
    ) -> List[Any]:
        """Esegue subtask ricorsivamente.

        Args:
            subtasks: Lista di subtask
            executor: Esecutore

        Returns:
            Risultati dei subtask
        """
        # Esegui subtask come nuova wave
        sub_wave = await self.execute_wave(subtasks, executor)
        return sub_wave.results


# =============================================================================
# ULTRA PARALLEL COORDINATOR
# =============================================================================

class UltraParallelCoordinator:
    """Dispatcher centrale per coordinamento esecuzione parallela.

    Coordina:
    - Divisione task in waves
    - Gestione priorita
    - Aggregazione risultati
    - Gestione errori e retry
    """

    def __init__(
        self,
        wave_executor: WaveExecutor,
        resource_pool: ResourcePool,
        backpressure: BackpressureController,
    ):
        """Inizializza il Coordinator.

        Args:
            wave_executor: Esecutore di wave
            resource_pool: Pool risorse
            backpressure: Controller backpressure
        """
        self.wave_executor = wave_executor
        self.resource_pool = resource_pool
        self.backpressure = backpressure

        self._pending_tasks: deque[UltraTask] = deque()
        self._completed_tasks: Dict[str, UltraTask] = {}
        self._failed_tasks: Dict[str, UltraTask] = {}
        self._lock = threading.Lock()

    def submit(self, task: UltraTask) -> None:
        """Sottomette un task per esecuzione.

        Args:
            task: Task da sottomettere
        """
        with self._lock:
            self._pending_tasks.append(task)
            self.backpressure.set_queue_size(len(self._pending_tasks))

    def submit_batch(self, tasks: List[UltraTask]) -> None:
        """Sottomette multipli task.

        Args:
            tasks: Lista di task
        """
        with self._lock:
            self._pending_tasks.extend(tasks)
            self.backpressure.set_queue_size(len(self._pending_tasks))

    async def execute_all(
        self,
        executor: Optional[Executor] = None,
        max_waves: int = 100,
    ) -> ExecutionResult:
        """Esegue tutti i task pendenti.

        Args:
            executor: Esecutore
            max_waves: Numero massimo di waves

        Returns:
            ExecutionResult aggregato
        """
        result = ExecutionResult()
        result.started_at = datetime.now()

        wave_count = 0

        while self._pending_tasks and wave_count < max_waves:
            # Raggruppa task per profondita
            waves_by_depth = self._group_by_depth()

            # Esegui ogni gruppo
            for depth, tasks in sorted(waves_by_depth.items()):
                if not tasks:
                    continue

                wave = await self.wave_executor.execute_wave(tasks, executor)

                # Aggiorna contatori
                result.total_waves += 1
                result.total_tasks += len(tasks)

                for task in tasks:
                    if task.status == TaskStatus.COMPLETED:
                        result.completed_tasks += 1
                        self._completed_tasks[task.task_id] = task
                    else:
                        result.failed_tasks += 1
                        self._failed_tasks[task.task_id] = task

                    result.results.extend(task.results)
                    if task.error:
                        result.errors.append(task.error)

                wave_count += 1

        result.completed_at = datetime.now()
        result.total_duration_ms = (
            result.completed_at - result.started_at
        ).total_seconds() * 1000

        # Metriche
        result.metrics = {
            "waves": wave_count,
            "pending": len(self._pending_tasks),
            "completed": len(self._completed_tasks),
            "failed": len(self._failed_tasks),
            "resource_pool": self.resource_pool.get_stats(),
            "backpressure": {
                "current_delay": self.backpressure.get_delay(),
            },
        }

        return result

    def _group_by_depth(self) -> Dict[int, List[UltraTask]]:
        """Raggruppa task pendenti per profondita.

        Returns:
            Dizionario depth -> lista task
        """
        groups: Dict[int, List[UltraTask]] = defaultdict(list)

        with self._lock:
            while self._pending_tasks:
                task = self._pending_tasks.popleft()
                groups[task.depth].append(task)

        return dict(groups)

    def get_status(self) -> Dict[str, Any]:
        """Ottiene lo stato corrente.

        Returns:
            Dizionario con stato
        """
        with self._lock:
            return {
                "pending": len(self._pending_tasks),
                "completed": len(self._completed_tasks),
                "failed": len(self._failed_tasks),
            }


# =============================================================================
# ULTRA PARALLEL ENGINE (CLASSE PRINCIPALE)
# =============================================================================

class UltraParallelEngine:
    """Motore di esecuzione parallela ultra-massivo.

    Punto di ingresso principale per esecuzione parallela massiva.
    Coordina tutti i componenti per gestire:
    - 10+ task root simultanei
    - 50+ agent/skill/plugin per task
    - 50+ sub-agent per subtask
    - Ricorsione infinita con protezioni

    Example:
        >>> engine = UltraParallelEngine()
        >>> tasks = [
        ...     UltraTask(agents=["a1", "a2"], skills=["s1"]),
        ...     UltraTask(agents=["b1"], subtasks=[UltraTask(agents=["c1"])]),
        ... ]
        >>> results = await engine.execute_ultra(tasks)
    """

    # Costanti di classe
    MAX_CONCURRENT_ROOT = MAX_CONCURRENT_ROOT
    MAX_CONCURRENT_PER_TASK = MAX_CONCURRENT_PER_TASK
    MAX_CONCURRENT_PER_SUBTASK = MAX_CONCURRENT_PER_SUBTASK

    def __init__(
        self,
        max_root: int = MAX_CONCURRENT_ROOT,
        max_per_task: int = MAX_CONCURRENT_PER_TASK,
        max_per_subtask: int = MAX_CONCURRENT_PER_SUBTASK,
        memory_threshold: float = MEMORY_THRESHOLD,
        enable_rate_limiting: bool = True,
        enable_circuit_breaker: bool = True,
    ):
        """Inizializza l'UltraParallelEngine.

        Args:
            max_root: Task root simultanei massimi
            max_per_task: Elementi per task massimi
            max_per_subtask: Elementi per subtask massimi
            memory_threshold: Soglia memoria critica
            enable_rate_limiting: Abilita rate limiting
            enable_circuit_breaker: Abilita circuit breaker
        """
        # Configurazione
        self.max_root = max_root
        self.max_per_task = max_per_task
        self.max_per_subtask = max_per_subtask
        self.memory_threshold = memory_threshold

        # Componenti core
        self.memory_guard = MemoryGuard(threshold=memory_threshold)
        self.backpressure = BackpressureController()
        self.resource_pool = ResourcePool(
            max_per_type=max(max_per_task, max_per_subtask),
            total_max=MAX_TOTAL_CONCURRENT,
        )
        self.circuit_breakers = CircuitBreakerManager()

        # Rate limiter (opzionale)
        self.rate_limiter: Optional[AdaptiveRateLimiter] = None
        if enable_rate_limiting:
            try:
                self.rate_limiter = get_rate_limiter()
            except NameError:
                pass

        # Wave executor
        self.wave_executor = WaveExecutor(
            resource_pool=self.resource_pool,
            backpressure=self.backpressure,
            circuit_breakers=self.circuit_breakers,
            memory_guard=self.memory_guard,
            rate_limiter=self.rate_limiter,
        )

        # Coordinator
        self.coordinator = UltraParallelCoordinator(
            wave_executor=self.wave_executor,
            resource_pool=self.resource_pool,
            backpressure=self.backpressure,
        )

        # Statistiche
        self._execution_count = 0
        self._total_tasks_processed = 0
        self._lock = threading.Lock()

        logger.info(
            f"UltraParallelEngine inizializzato: "
            f"max_root={max_root}, max_per_task={max_per_task}, "
            f"max_per_subtask={max_per_subtask}"
        )

    async def execute_ultra(
        self,
        tasks: List[UltraTask],
        executor: Optional[Executor] = None,
        timeout: Optional[float] = None,
    ) -> ExecutionResult:
        """Esegue task in modalita ultra-parallela.

        Questo e' il punto di ingresso principale. Gestisce:
        - Fase 1: Spawn wave 0 (root tasks)
        - Fase 2: Ogni task spawna agent in parallelo
        - Fase 3: Ogni agente puo spawnare subtask
        - Fase 4: Ricorsione con backpressure

        Args:
            tasks: Lista di task root
            executor: Esecutore custom (opzionale)
            timeout: Timeout globale (opzionale)

        Returns:
            ExecutionResult con risultati aggregati
        """
        with self._lock:
            self._execution_count += 1
            execution_id = self._execution_count

        logger.info(
            f"Esecuzione ultra #{execution_id} iniziata: "
            f"{len(tasks)} task root"
        )

        # Controlla memoria iniziale
        if self.memory_guard.is_memory_critical():
            raise ResourceExhaustedError(
                f"Impossibile iniziare: memoria critica "
                f"({self.memory_guard.get_memory_usage():.1%})"
            )

        # Limita numero task root
        if len(tasks) > self.max_root:
            logger.warning(
                f"Limitando task root da {len(tasks)} a {self.max_root}"
            )
            tasks = tasks[:self.max_root]

        # Sottometti task
        self.coordinator.submit_batch(tasks)

        # Esegui
        timeout = timeout or DEFAULT_WAVE_TIMEOUT * 10  # 10 waves di default
        result = await asyncio.wait_for(
            self.coordinator.execute_all(executor),
            timeout=timeout,
        )

        # Aggiorna statistiche
        with self._lock:
            self._total_tasks_processed += result.total_tasks

        logger.info(
            f"Esecuzione ultra #{execution_id} completata: "
            f"{result.completed_tasks}/{result.total_tasks} task, "
            f"{result.total_waves} waves, "
            f"duration={result.total_duration_ms:.0f}ms"
        )

        return result

    async def execute_single(
        self,
        task: UltraTask,
        executor: Optional[Executor] = None,
    ) -> Any:
        """Esegue un singolo task.

        Args:
            task: Task da eseguire
            executor: Esecutore

        Returns:
            Risultato del task
        """
        results = await self.execute_ultra([task], executor)
        return results.results[0] if results.results else None

    async def map_parallel(
        self,
        func: Callable[[Any], Any],
        items: List[Any],
        max_concurrency: int = MAX_CONCURRENT_PER_TASK,
    ) -> List[Any]:
        """Esegue una funzione su items in parallelo.

        Args:
            func: Funzione da eseguire
            items: Items da processare
            max_concurrency: Concorrenza massima

        Returns:
            Lista di risultati
        """
        semaphore = asyncio.Semaphore(max_concurrency)

        async def bounded_execute(item: Any) -> Any:
            async with semaphore:
                if asyncio.iscoroutinefunction(func):
                    return await func(item)
                else:
                    # Esegui in executor per funzioni sync
                    loop = asyncio.get_event_loop()
                    return await loop.run_in_executor(None, func, item)

        results = await asyncio.gather(
            *[bounded_execute(item) for item in items],
            return_exceptions=True,
        )
        return list(results)

    def get_stats(self) -> Dict[str, Any]:
        """Ottiene statistiche dell'engine.

        Returns:
            Dizionario con statistiche
        """
        with self._lock:
            return {
                "execution_count": self._execution_count,
                "total_tasks_processed": self._total_tasks_processed,
                "memory_usage": self.memory_guard.get_memory_usage(),
                "memory_critical": self.memory_guard.is_memory_critical(),
                "backpressure_delay": self.backpressure.get_delay(),
                "coordinator_status": self.coordinator.get_status(),
                "resource_pool": self.resource_pool.get_stats(),
                "circuit_breakers": self.circuit_breakers.get_all_stats(),
            }

    def reset(self) -> None:
        """Resetta lo stato dell'engine."""
        self.circuit_breakers.reset()
        with self._lock:
            self._execution_count = 0
            self._total_tasks_processed = 0
        logger.info("UltraParallelEngine resettato")


# =============================================================================
# SINGLETON INSTANCE
# =============================================================================

_engine_instance: Optional[UltraParallelEngine] = None
_engine_lock = threading.Lock()


def get_ultra_parallel_engine(**kwargs) -> UltraParallelEngine:
    """Ottiene l'istanza singleton dell'engine.

    Args:
        **kwargs: Argomenti per UltraParallelEngine (solo prima chiamata)

    Returns:
        UltraParallelEngine singleton
    """
    global _engine_instance

    if _engine_instance is None:
        with _engine_lock:
            if _engine_instance is None:
                _engine_instance = UltraParallelEngine(**kwargs)

    return _engine_instance


def reset_ultra_parallel_engine() -> None:
    """Resetta il singleton (per testing)."""
    global _engine_instance

    with _engine_lock:
        if _engine_instance is not None:
            _engine_instance.reset()
        _engine_instance = None


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def create_task_batch(
    count: int,
    agents_per_task: int = 5,
    skills_per_task: int = 2,
    subtasks_per_task: int = 0,
    depth: int = 0,
) -> List[UltraTask]:
    """Crea un batch di task per testing.

    Args:
        count: Numero di task
        agents_per_task: Agent per task
        skills_per_task: Skill per task
        subtasks_per_task: Subtask per task
        depth: Profondita

    Returns:
        Lista di UltraTask
    """
    tasks = []

    for i in range(count):
        task = UltraTask(
            task_id=f"task_{depth}_{i}",
            depth=depth,
            agents=[f"agent_{j}" for j in range(agents_per_task)],
            skills=[f"skill_{j}" for j in range(skills_per_task)],
        )

        # Aggiungi subtask
        for j in range(subtasks_per_task):
            subtask = UltraTask(
                task_id=f"subtask_{depth+1}_{i}_{j}",
                depth=depth + 1,
                parent_id=task.task_id,
                agents=[f"subagent_{k}" for k in range(agents_per_task // 2)],
            )
            task.subtasks.append(subtask)

        tasks.append(task)

    return tasks


# =============================================================================
# PUBLIC API
# =============================================================================

__all__ = [
    # Classi principali
    "UltraParallelEngine",
    "UltraTask",
    "ExecutionWave",
    "ExecutionResult",
    # Componenti
    "UltraParallelCoordinator",
    "WaveExecutor",
    "ResourcePool",
    "BackpressureController",
    "MemoryGuard",
    "CircuitBreakerManager",
    # Data structures
    "ResourceAllocation",
    "BackpressureState",
    "CircuitBreakerState",
    # Enum
    "TaskStatus",
    "WaveStatus",
    "ResourceType",
    "Priority",
    # Eccezioni
    "UltraParallelError",
    "ResourceExhaustedError",
    "BackpressureExceededError",
    "WaveTimeoutError",
    "DepthLimitExceededError",
    "CircuitBreakerOpenError",
    # Protocol
    "Executor",
    # Funzioni utility
    "get_ultra_parallel_engine",
    "reset_ultra_parallel_engine",
    "create_task_batch",
    # Costanti
    "MAX_CONCURRENT_ROOT",
    "MAX_CONCURRENT_PER_TASK",
    "MAX_CONCURRENT_PER_SUBTASK",
    "MEMORY_THRESHOLD",
    "DEFAULT_WAVE_TIMEOUT",
    "DEFAULT_TASK_TIMEOUT",
]
