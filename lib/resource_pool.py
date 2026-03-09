"""ResourcePool - Gestione risorse per ULTRA-MASSIVE parallel execution.

Questo modulo fornisce un pool di risorse per esecuzione parallela massiccia con:
- Pool di 500+ risorse simultanee (agent, skill, plugin, api_call, memory)
- Allocazione dinamica con priorita (priority queue)
- Deallocazione automatica al completamento
- Memory guard (kill processi se RAM >80%)
- Rate limit tracking per API

Usage:
    pool = ResourcePool()
    await pool.initialize({"max_resources": 1000})

    # Acquisisci risorsa
    resource = await pool.acquire(ResourceType.AGENT, "task_123", priority=5)
    if resource:
        # Usa risorsa...
        await pool.release(resource.resource_id)

    # Statistiche
    stats = await pool.get_stats()

Author: Claude Code Coder Agent
Version: 1.0.0
Date: 2026-03-08
"""

from __future__ import annotations

import asyncio
import heapq
import logging
import os
import signal
import sys
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum, auto
from typing import Dict, List, Optional, Set, Any, Tuple

# Try import psutil, fallback if not available
try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False

# Importa eccezioni locali
from lib.exceptions import OrchestratorError, ConfigurationError

logger = logging.getLogger(__name__)


# =============================================================================
# COSTANTI
# =============================================================================

MAX_RESOURCES = 1000
MAX_MEMORY_PERCENT = 80.0
MEMORY_CHECK_INTERVAL = 1.0
STALE_TIMEOUT_SECONDS = 300.0  # 5 minuti
CLEANUP_INTERVAL = 30.0
DEFAULT_MEMORY_MB = 50.0


# =============================================================================
# ENUMS
# =============================================================================

class ResourceType(Enum):
    """Tipi di risorse gestibili dal pool."""
    AGENT = auto()
    SKILL = auto()
    PLUGIN = auto()
    API_CALL = auto()
    MEMORY = auto()


class ResourceState(Enum):
    """Stati delle risorse nel pool."""
    AVAILABLE = "available"
    ALLOCATED = "allocated"
    STALE = "stale"
    ERROR = "error"


# =============================================================================
# ECCEZIONI
# =============================================================================

class ResourcePoolError(OrchestratorError):
    """Errore base per ResourcePool."""
    pass


class ResourceAcquisitionError(ResourcePoolError):
    """Errore durante acquisizione risorsa."""
    pass


class ResourceReleaseError(ResourcePoolError):
    """Errore durante rilascio risorsa."""
    pass


class MemoryGuardError(ResourcePoolError):
    """Errore durante memory guard."""
    pass


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass(order=True)
class PrioritizedResource:
    """Risorsa con priorita per la priority queue.

    Gli attributi ordinati sono: priority (negativo per max-heap), created_at.
    """
    priority: int  # Negativo per avere max-heap con heapq (min-heap)
    created_at: float
    resource_id: str = field(compare=False)


@dataclass
class PooledResource:
    """Risorsa gestita dal pool.

    Attributes:
        resource_id: Identificativo univoco della risorsa
        resource_type: Tipo di risorsa
        state: Stato corrente
        allocated_to: ID del richiedente (se allocata)
        allocated_at: Timestamp allocazione
        priority: Priorita della risorsa (0=bassa, 10=alta)
        memory_mb: Memoria utilizzata in MB
        created_at: Timestamp creazione
        last_used_at: Timestamp ultimo utilizzo
        metadata: Metadati aggiuntivi
    """
    resource_id: str
    resource_type: ResourceType
    state: ResourceState = ResourceState.AVAILABLE
    allocated_to: Optional[str] = None
    allocated_at: Optional[float] = None
    priority: int = 5
    memory_mb: float = DEFAULT_MEMORY_MB
    created_at: float = field(default_factory=time.time)
    last_used_at: float = field(default_factory=time.time)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def is_available(self) -> bool:
        """Verifica se la risorsa e disponibile."""
        return self.state == ResourceState.AVAILABLE

    def is_stale(self, timeout: float = STALE_TIMEOUT_SECONDS) -> bool:
        """Verifica se la risorsa e scaduta (non usata da troppo tempo)."""
        return (time.time() - self.last_used_at) > timeout


@dataclass
class RateLimitTracker:
    """Tracker per rate limit delle API.

    Attributes:
        api_name: Nome dell'API
        requests_per_second: Limite richieste al secondo
        tokens: Token disponibili
        last_update: Ultimo aggiornamento
    """
    api_name: str
    requests_per_second: float = 100.0
    tokens: float = 100.0
    last_update: float = field(default_factory=time.time)

    def acquire(self, tokens: int = 1) -> bool:
        """Tenta di acquisire token.

        Args:
            tokens: Numero di token da acquisire

        Returns:
            True se acquisiti, False altrimenti
        """
        now = time.time()
        elapsed = now - self.last_update
        self.last_update = now

        # Refill tokens
        self.tokens = min(
            self.requests_per_second,
            self.tokens + elapsed * self.requests_per_second
        )

        if self.tokens >= tokens:
            self.tokens -= tokens
            return True
        return False


@dataclass
class ResourcePoolMetrics:
    """Metriche del pool di risorse."""
    total_created: int = 0
    total_acquired: int = 0
    total_released: int = 0
    total_cleaned: int = 0
    total_memory_kills: int = 0
    current_available: int = 0
    current_allocated: int = 0
    peak_allocated: int = 0

    def to_dict(self) -> Dict[str, int]:
        """Converte in dizionario."""
        return {
            "total_created": self.total_created,
            "total_acquired": self.total_acquired,
            "total_released": self.total_released,
            "total_cleaned": self.total_cleaned,
            "total_memory_kills": self.total_memory_kills,
            "current_available": self.current_available,
            "current_allocated": self.current_allocated,
            "peak_allocated": self.peak_allocated,
        }


# =============================================================================
# RESOURCE POOL
# =============================================================================

class ResourcePool:
    """Pool di risorse per ultra-massive parallel execution.

    Gestisce fino a 1000+ risorse simultanee con:
    - Allocazione dinamica con priorita
    - Deallocazione automatica
    - Memory guard per prevenire OOM
    - Rate limit tracking per API

    Thread-safe tramite asyncio.Lock.

    Example:
        pool = ResourcePool()
        await pool.initialize({"max_resources": 500})

        async with pool.acquire_context(ResourceType.AGENT, "task_1") as res:
            # Usa risorsa
            pass
        # Risorsa rilasciata automaticamente
    """

    MAX_RESOURCES = MAX_RESOURCES
    MAX_MEMORY_PERCENT = MAX_MEMORY_PERCENT
    MEMORY_CHECK_INTERVAL = MEMORY_CHECK_INTERVAL

    def __init__(self):
        """Inizializza il pool vuoto."""
        # Registry delle risorse
        self._resources: Dict[str, PooledResource] = {}

        # Indici per lookup veloce
        self._available: Dict[ResourceType, List[str]] = {
            rt: [] for rt in ResourceType
        }
        self._allocated: Set[str] = set()

        # Priority queue per ogni tipo (heap di PrioritizedResource)
        self._priority_queues: Dict[ResourceType, List[PrioritizedResource]] = {
            rt: [] for rt in ResourceType
        }

        # Rate limiters per API
        self._rate_limiters: Dict[str, RateLimitTracker] = {}

        # Lock per thread-safety
        self._lock = asyncio.Lock()

        # Background tasks
        self._memory_monitor_task: Optional[asyncio.Task] = None
        self._cleanup_task: Optional[asyncio.Task] = None
        self._running = False

        # Configurazione
        self._max_resources = MAX_RESOURCES
        self._max_memory_percent = MAX_MEMORY_PERCENT

        # Metriche
        self._metrics = ResourcePoolMetrics()

        # Callback per kill processi (injectabile per test)
        self._kill_callback: Optional[callable] = None

        logger.info("ResourcePool inizializzato")

    async def initialize(self, config: Dict[str, Any]) -> None:
        """Inizializza il pool con configurazione.

        Args:
            config: Dizionario con:
                - max_resources: Massimo numero risorse (default: 1000)
                - max_memory_percent: Soglia memoria per kill (default: 80.0)
                - api_limits: Dict {api_name: requests_per_second}
                - preallocate: Dict {ResourceType: count} risorse da pre-allocare

        Raises:
            ConfigurationError: Se configurazione non valida
        """
        # Valida e applica configurazione
        self._max_resources = config.get("max_resources", MAX_RESOURCES)
        self._max_memory_percent = config.get("max_memory_percent", MAX_MEMORY_PERCENT)

        if self._max_resources < 1:
            raise ConfigurationError("max_resources deve essere >= 1")
        if self._max_memory_percent < 10 or self._max_memory_percent > 100:
            raise ConfigurationError("max_memory_percent deve essere tra 10 e 100")

        # Configura rate limiters per API
        api_limits = config.get("api_limits", {})
        for api_name, rate in api_limits.items():
            self._rate_limiters[api_name] = RateLimitTracker(
                api_name=api_name,
                requests_per_second=rate,
                tokens=rate
            )

        # Pre-alloca risorse
        preallocate = config.get("preallocate", {})
        for resource_type, count in preallocate.items():
            if isinstance(resource_type, str):
                resource_type = ResourceType[resource_type.upper()]
            for _ in range(count):
                await self._create_resource(resource_type)

        # Avvia background tasks
        self._running = True
        self._memory_monitor_task = asyncio.create_task(self._memory_guard_loop())
        self._cleanup_task = asyncio.create_task(self._cleanup_loop())

        logger.info(
            f"ResourcePool inizializzato: max={self._max_resources}, "
            f"memory_threshold={self._max_memory_percent}%, "
            f"prealloc={sum(preallocate.values()) if preallocate else 0}"
        )

    async def _create_resource(
        self,
        resource_type: ResourceType,
        priority: int = 5,
        memory_mb: float = DEFAULT_MEMORY_MB,
        metadata: Optional[Dict] = None
    ) -> PooledResource:
        """Crea una nuova risorsa nel pool.

        Args:
            resource_type: Tipo di risorsa
            priority: Priorita (0=bassa, 10=alta)
            memory_mb: Memoria stimata in MB
            metadata: Metadati aggiuntivi

        Returns:
            La risorsa creata

        Raises:
            ResourcePoolError: Se pool al limite
        """
        async with self._lock:
            if len(self._resources) >= self._max_resources:
                raise ResourcePoolError(
                    f"Pool al limite: {len(self._resources)}/{self._max_resources}"
                )

            resource_id = f"{resource_type.name.lower()}_{uuid.uuid4().hex[:8]}"
            resource = PooledResource(
                resource_id=resource_id,
                resource_type=resource_type,
                priority=priority,
                memory_mb=memory_mb,
                metadata=metadata or {}
            )

            self._resources[resource_id] = resource
            self._available[resource_type].append(resource_id)

            # Aggiungi alla priority queue (priorita negativa per max-heap)
            prioritized = PrioritizedResource(
                priority=-priority,
                created_at=time.time(),
                resource_id=resource_id
            )
            heapq.heappush(self._priority_queues[resource_type], prioritized)

            self._metrics.total_created += 1
            self._metrics.current_available += 1

            logger.debug(f"Risorsa creata: {resource_id}")
            return resource

    async def acquire(
        self,
        resource_type: ResourceType,
        requester_id: str,
        priority: int = 5,
        timeout: float = 5.0
    ) -> Optional[PooledResource]:
        """Acquisisce una risorsa dal pool.

        Args:
            resource_type: Tipo di risorsa richiesta
            requester_id: ID del richiedente
            priority: Priorita della richiesta (0=bassa, 10=alta)
            timeout: Secondi massimi di attesa

        Returns:
            La risorsa acquisita o None se non disponibile

        Raises:
            ResourceAcquisitionError: Se errore durante acquisizione
        """
        start_time = time.time()

        while True:
            async with self._lock:
                # Controlla se c'e una risorsa disponibile
                pq = self._priority_queues[resource_type]

                while pq:
                    # Pop dalla priority queue
                    prioritized = heapq.heappop(pq)
                    resource_id = prioritized.resource_id
                    resource = self._resources.get(resource_id)

                    if resource and resource.is_available():
                        # Alloca la risorsa
                        resource.state = ResourceState.ALLOCATED
                        resource.allocated_to = requester_id
                        resource.allocated_at = time.time()
                        resource.last_used_at = time.time()

                        self._available[resource_type].remove(resource_id)
                        self._allocated.add(resource_id)

                        self._metrics.total_acquired += 1
                        self._metrics.current_available -= 1
                        self._metrics.current_allocated += 1
                        self._metrics.peak_allocated = max(
                            self._metrics.peak_allocated,
                            self._metrics.current_allocated
                        )

                        logger.debug(
                            f"Risorsa acquisita: {resource_id} -> {requester_id}"
                        )
                        return resource

                    # Risorsa non piu valida, continua a cercare

                # Nessuna risorsa disponibile, creane una nuova se possibile
                if len(self._resources) < self._max_resources:
                    try:
                        resource = await self._create_resource(
                            resource_type, priority=priority
                        )
                        # Riassegna subito
                        resource.state = ResourceState.ALLOCATED
                        resource.allocated_to = requester_id
                        resource.allocated_at = time.time()

                        self._available[resource_type].remove(resource.resource_id)
                        self._allocated.add(resource.resource_id)

                        self._metrics.total_acquired += 1
                        self._metrics.current_available -= 1
                        self._metrics.current_allocated += 1

                        return resource
                    except Exception as e:
                        logger.error(f"Errore creazione risorsa: {e}")

            # Attendi e riprova
            elapsed = time.time() - start_time
            if elapsed >= timeout:
                logger.warning(
                    f"Timeout acquisizione {resource_type.name} per {requester_id}"
                )
                return None

            await asyncio.sleep(0.1)

    async def release(self, resource_id: str) -> bool:
        """Rilascia una risorsa al pool.

        Args:
            resource_id: ID della risorsa da rilasciare

        Returns:
            True se rilasciata con successo

        Raises:
            ResourceReleaseError: Se risorsa non trovata o non allocata
        """
        async with self._lock:
            resource = self._resources.get(resource_id)
            if not resource:
                logger.warning(f"Risorsa non trovata: {resource_id}")
                return False

            if resource.state != ResourceState.ALLOCATED:
                logger.warning(
                    f"Risorsa non allocata: {resource_id}, state={resource.state}"
                )
                return False

            # Rilascia
            resource.state = ResourceState.AVAILABLE
            resource.allocated_to = None
            resource.allocated_at = None
            resource.last_used_at = time.time()

            self._allocated.discard(resource_id)
            self._available[resource.resource_type].append(resource_id)

            # Re-inserisci nella priority queue
            prioritized = PrioritizedResource(
                priority=-resource.priority,
                created_at=time.time(),
                resource_id=resource_id
            )
            heapq.heappush(
                self._priority_queues[resource.resource_type],
                prioritized
            )

            self._metrics.total_released += 1
            self._metrics.current_allocated -= 1
            self._metrics.current_available += 1

            logger.debug(f"Risorsa rilasciata: {resource_id}")
            return True

    async def acquire_context(
        self,
        resource_type: ResourceType,
        requester_id: str,
        priority: int = 5,
        timeout: float = 5.0
    ):
        """Context manager per acquisizione automatica.

        Args:
            resource_type: Tipo di risorsa
            requester_id: ID richiedente
            priority: Priorita
            timeout: Timeout acquisizione

        Returns:
            Context manager che rilascia automaticamente

        Example:
            async with pool.acquire_context(ResourceType.AGENT, "task") as res:
                # Usa res
                pass
            # Rilasciato automaticamente
        """
        return _ResourceContext(self, resource_type, requester_id, priority, timeout)

    async def get_stats(self) -> Dict[str, Any]:
        """Ottiene statistiche del pool.

        Returns:
            Dizionario con statistiche complete
        """
        async with self._lock:
            memory_percent = 0.0
            if PSUTIL_AVAILABLE:
                memory_percent = psutil.virtual_memory().percent

            per_type_stats = {}
            for rt in ResourceType:
                available = len(self._available[rt])
                per_type_stats[rt.name] = {
                    "available": available,
                    "total_in_queue": len(self._priority_queues[rt])
                }

            return {
                "total_resources": len(self._resources),
                "available": sum(len(v) for v in self._available.values()),
                "allocated": len(self._allocated),
                "memory_percent": memory_percent,
                "max_resources": self._max_resources,
                "max_memory_percent": self._max_memory_percent,
                "per_type": per_type_stats,
                "metrics": self._metrics.to_dict(),
                "api_rate_limiters": {
                    name: {
                        "rate": rl.requests_per_second,
                        "tokens": rl.tokens
                    }
                    for name, rl in self._rate_limiters.items()
                }
            }

    async def check_rate_limit(self, api_name: str, tokens: int = 1) -> bool:
        """Verifica se una chiamata API e permessa dal rate limit.

        Args:
            api_name: Nome dell'API
            tokens: Token richiesti

        Returns:
            True se chiamata permessa, False altrimenti
        """
        async with self._lock:
            limiter = self._rate_limiters.get(api_name)
            if not limiter:
                # Se non configurato, permetti
                return True
            return limiter.acquire(tokens)

    def register_api_rate_limit(
        self,
        api_name: str,
        requests_per_second: float
    ) -> None:
        """Registra un rate limiter per un'API.

        Args:
            api_name: Nome dell'API
            requests_per_second: Limite richieste al secondo
        """
        self._rate_limiters[api_name] = RateLimitTracker(
            api_name=api_name,
            requests_per_second=requests_per_second,
            tokens=requests_per_second
        )
        logger.info(f"Rate limiter registrato: {api_name} = {requests_per_second}/s")

    async def _memory_guard_loop(self) -> None:
        """Loop del memory guard che killa processi se RAM >80%."""
        logger.info("Memory guard avviato")

        while self._running:
            try:
                await self._check_memory_and_cleanup()
                await asyncio.sleep(self.MEMORY_CHECK_INTERVAL)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Errore memory guard: {e}")
                await asyncio.sleep(5.0)

        logger.info("Memory guard fermato")

    async def _check_memory_and_cleanup(self) -> None:
        """Controlla memoria e killa processi se necessario."""
        if not PSUTIL_AVAILABLE:
            return

        memory = psutil.virtual_memory()
        memory_percent = memory.percent

        if memory_percent > self._max_memory_percent:
            logger.warning(
                f"Memoria critica: {memory_percent:.1f}% > {self._max_memory_percent}%"
            )

            # Rilascia risorse stale
            async with self._lock:
                stale_count = await self._cleanup_stale_unlocked()
                logger.info(f"Rilasciate {stale_count} risorse stale")

            # Se ancora critico, killa processi
            memory = psutil.virtual_memory()
            if memory.percent > self._max_memory_percent:
                await self._kill_memory_hungry_processes()

    async def _kill_memory_hungry_processes(self) -> int:
        """Killa processi che consumano molta memoria.

        Returns:
            Numero di processi killati
        """
        if not PSUTIL_AVAILABLE:
            return 0

        killed = 0
        current_pid = os.getpid()

        try:
            # Ottieni processi ordinati per memoria
            processes = []
            for proc in psutil.process_iter(['pid', 'name', 'memory_percent']):
                try:
                    pinfo = proc.info
                    if pinfo['pid'] != current_pid and pinfo['memory_percent']:
                        processes.append(pinfo)
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    pass

            # Ordina per memoria decrescente
            processes.sort(key=lambda x: x['memory_percent'] or 0, reverse=True)

            # Killa top consumatori (max 3 per volta)
            for proc_info in processes[:3]:
                try:
                    if proc_info['memory_percent'] > 5.0:  # >5% RAM
                        pid = proc_info['pid']
                        name = proc_info['name']

                        # Usa callback se disponibile, altrimenti os.kill
                        if self._kill_callback:
                            self._kill_callback(pid)
                        else:
                            if sys.platform == "win32":
                                os.system(f"taskkill /F /PID {pid} 2>NUL")
                            else:
                                os.kill(pid, signal.SIGKILL)

                        killed += 1
                        self._metrics.total_memory_kills += 1
                        logger.warning(
                            f"Processo killato: PID={pid}, name={name}, "
                            f"mem={proc_info['memory_percent']:.1f}%"
                        )
                except (ProcessLookupError, PermissionError) as e:
                    logger.debug(f"Impossibile killare processo: {e}")

        except Exception as e:
            logger.error(f"Errore kill processi: {e}")

        return killed

    async def _cleanup_loop(self) -> None:
        """Loop di cleanup periodico."""
        logger.info("Cleanup loop avviato")

        while self._running:
            try:
                await asyncio.sleep(CLEANUP_INTERVAL)
                async with self._lock:
                    cleaned = await self._cleanup_stale_unlocked()
                    if cleaned > 0:
                        logger.info(f"Cleanup: rimosse {cleaned} risorse stale")
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Errore cleanup loop: {e}")

        logger.info("Cleanup loop fermato")

    async def _cleanup_stale_unlocked(self) -> int:
        """Rimuove risorse stale (deve essere chiamato con lock).

        Returns:
            Numero di risorse rimosse
        """
        cleaned = 0
        stale_ids = []

        for resource_id, resource in self._resources.items():
            if resource.is_stale() and resource.state == ResourceState.AVAILABLE:
                stale_ids.append(resource_id)

        for resource_id in stale_ids:
            resource = self._resources.pop(resource_id, None)
            if resource:
                self._available[resource.resource_type] = [
                    rid for rid in self._available[resource.resource_type]
                    if rid != resource_id
                ]
                cleaned += 1
                self._metrics.total_cleaned += 1
                self._metrics.current_available -= 1

        return cleaned

    async def shutdown(self) -> None:
        """Spegne il pool e rilascia tutte le risorse."""
        logger.info("Shutdown ResourcePool...")

        self._running = False

        # Cancella background tasks
        if self._memory_monitor_task:
            self._memory_monitor_task.cancel()
            try:
                await self._memory_monitor_task
            except asyncio.CancelledError:
                pass

        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass

        # Rilascia tutto
        async with self._lock:
            self._resources.clear()
            for rt in ResourceType:
                self._available[rt].clear()
                self._priority_queues[rt].clear()
            self._allocated.clear()

        logger.info("ResourcePool shutdown completato")


class _ResourceContext:
    """Context manager per acquisizione automatica risorse."""

    def __init__(
        self,
        pool: ResourcePool,
        resource_type: ResourceType,
        requester_id: str,
        priority: int,
        timeout: float
    ):
        self._pool = pool
        self._resource_type = resource_type
        self._requester_id = requester_id
        self._priority = priority
        self._timeout = timeout
        self._resource: Optional[PooledResource] = None

    async def __aenter__(self) -> Optional[PooledResource]:
        """Acquisisce la risorsa."""
        self._resource = await self._pool.acquire(
            self._resource_type,
            self._requester_id,
            self._priority,
            self._timeout
        )
        return self._resource

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        """Rilascia la risorsa."""
        if self._resource:
            await self._pool.release(self._resource.resource_id)


# =============================================================================
# SINGLETON
# =============================================================================

_instance: Optional[ResourcePool] = None
_instance_lock = asyncio.Lock()


async def get_resource_pool(config: Optional[Dict] = None) -> ResourcePool:
    """Ottiene l'istanza singleton del ResourcePool.

    Args:
        config: Configurazione (usata solo alla prima chiamata)

    Returns:
        ResourcePool singleton
    """
    global _instance

    if _instance is None:
        async with _instance_lock:
            if _instance is None:
                _instance = ResourcePool()
                if config:
                    await _instance.initialize(config)

    return _instance


async def reset_resource_pool() -> None:
    """Resetta il singleton (per test)."""
    global _instance

    async with _instance_lock:
        if _instance is not None:
            await _instance.shutdown()
        _instance = None


# =============================================================================
# PUBLIC API
# =============================================================================

__all__ = [
    # Classi principali
    "ResourcePool",
    "PooledResource",
    "ResourceType",
    "ResourceState",
    "RateLimitTracker",
    "ResourcePoolMetrics",
    # Eccezioni
    "ResourcePoolError",
    "ResourceAcquisitionError",
    "ResourceReleaseError",
    "MemoryGuardError",
    # Funzioni helper
    "get_resource_pool",
    "reset_resource_pool",
]
