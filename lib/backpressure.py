"""Backpressure Controller per controllo del sovraccarico di sistema.

Questo modulo fornisce un controller per rilevare e gestire il sovraccarico
del sistema, rallentando automaticamente l'esecuzione quando necessario.

Features:
    - Rilevamento sovraccarico (CPU, RAM, API rate limits)
    - Rallentamento automatico dell'esecuzione
    - Circuit breaker per API failure
    - Adaptive throttling basato sullo stato del sistema
    - Recovery automatico con transizioni di stato graduali
    - Threshold dinamici configurabili a runtime (V15.2.0)
    - Metriche di overload per monitoring (V15.2.0)

Usage:
    from lib.backpressure import BackpressureController, get_backpressure_controller

    # Ottieni istanza singleton
    controller = get_backpressure_controller()

    # Controlla e applica throttling
    delay = controller.check_and_throttle()
    if delay > 0:
        time.sleep(delay)

    # Registra esiti
    controller.record_success()
    controller.record_error()

    # Verifica se accettare nuovi task
    if controller.should_accept_new_task():
        process_task()

    # Aggiorna threshold dinamici (V15.2.0)
    controller.update_thresholds(cpu_threshold=85.0, memory_threshold=80.0)

    # Ottieni metriche di overload (V15.2.0)
    overload = controller.get_overload_metrics()
    print(f"Peak CPU: {overload.peak_cpu_percent}%")

Configuration (Environment Variables):
    BACKPRESSURE_CPU_THRESHOLD: Soglia CPU percent (default: 70)
    BACKPRESSURE_CPU_CRITICAL: Soglia CPU CRITICAL percent (default: 90)
    BACKPRESSURE_MEMORY_THRESHOLD: Soglia memoria percent (default: 75)
    BACKPRESSURE_MEMORY_CRITICAL: Soglia memoria CRITICAL percent (default: 90)
    BACKPRESSURE_ERROR_RATE_THRESHOLD: Soglia error rate (default: 0.1)
    BACKPRESSURE_ERROR_RATE_CRITICAL: Soglia error rate CRITICAL (default: 0.25)
    BACKPRESSURE_API_RATE_THRESHOLD: Soglia API rate rimanente (default: 0.2)

Version: V15.2.0
"""

from __future__ import annotations

import os
import time
import logging
import threading
import platform
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum, auto
from typing import Optional, Dict, Any, List, Callable

# Import configurazione centralizzata
from lib.config import config

logger = logging.getLogger(__name__)


# =============================================================================
# ENUMS
# =============================================================================

class ThrottleState(Enum):
    """Stati di throttling del sistema.

    Gli stati sono ordinati per gravita' crescente.
    """
    NORMAL = auto()      # Sistema funzionante normalmente
    CAUTION = auto()     # Primi segnali di sovraccarico
    WARNING = auto()     # Sovraccarico moderato
    CRITICAL = auto()    # Sovraccarico severo
    EMERGENCY = auto()   # Sistema in emergenza


class CircuitState(Enum):
    """Stati del circuit breaker per API.

    Implementa il pattern Circuit Breaker per gestire fallimenti API.
    """
    CLOSED = auto()      # Circuito chiuso, operazioni normali
    OPEN = auto()        # Circuito aperto, richieste bloccate
    HALF_OPEN = auto()   # Circuito semi-aperto, test recovery


# =============================================================================
# DATACLASS
# =============================================================================

@dataclass
class SystemMetrics:
    """Metriche di sistema per valutazione backpressure.

    Attributes:
        cpu_percent: Utilizzo CPU in percentuale (0-100)
        memory_percent: Utilizzo memoria in percentuale (0-100)
        api_rate_remaining: Rate limit API rimanente (0-1.0)
        error_rate: Tasso di errori recente (0-1.0)
        active_tasks: Numero di task attualmente in esecuzione
        avg_latency_ms: Latenza media recente in millisecondi
        timestamp: Momento del campionamento
    """
    cpu_percent: float = 0.0
    memory_percent: float = 0.0
    api_rate_remaining: float = 1.0
    error_rate: float = 0.0
    active_tasks: int = 0
    avg_latency_ms: float = 0.0
    timestamp: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        """Converte le metriche in dizionario per logging."""
        return {
            "cpu_percent": round(self.cpu_percent, 2),
            "memory_percent": round(self.memory_percent, 2),
            "api_rate_remaining": round(self.api_rate_remaining, 4),
            "error_rate": round(self.error_rate, 4),
            "active_tasks": self.active_tasks,
            "avg_latency_ms": round(self.avg_latency_ms, 2),
            "timestamp": self.timestamp.isoformat(),
        }


@dataclass
class BackpressureConfig:
    """Configurazione del BackpressureController.

    Attributes:
        cpu_threshold: Soglia CPU per WARNING (%)
        cpu_critical: Soglia CPU per CRITICAL (%)
        memory_threshold: Soglia memoria per WARNING (%)
        memory_critical: Soglia memoria per CRITICAL (%)
        error_rate_threshold: Soglia error rate per WARNING
        error_rate_critical: Soglia error rate per CRITICAL
        api_rate_threshold: Soglia rate rimanente per WARNING
        circuit_failure_threshold: Fallimenti per aprire circuito
        circuit_recovery_timeout: Secondi prima di tentare recovery
        max_active_tasks: Task massimi simultanei
    """
    cpu_threshold: float = 70.0
    cpu_critical: float = 90.0
    memory_threshold: float = 75.0
    memory_critical: float = 90.0
    error_rate_threshold: float = 0.1
    error_rate_critical: float = 0.25
    api_rate_threshold: float = 0.2
    circuit_failure_threshold: int = 5
    circuit_recovery_timeout: float = 30.0
    max_active_tasks: int = 100

    def to_thresholds_dict(self) -> Dict[str, Dict[str, float]]:
        """Converte la configurazione in dizionario THRESHOLDS.

        Returns:
            Dizionario con soglie per ogni ThrottleState
        """
        return {
            ThrottleState.NORMAL: {
                "cpu": 0.0,
                "memory": 0.0,
                "error_rate": 0.0,
                "api_rate": 1.0,
            },
            ThrottleState.CAUTION: {
                "cpu": self.cpu_threshold * 0.85,  # ~60%
                "memory": self.memory_threshold * 0.87,  # ~65%
                "error_rate": self.error_rate_threshold * 0.5,  # 0.05
                "api_rate": 0.5,
            },
            ThrottleState.WARNING: {
                "cpu": self.cpu_threshold,
                "memory": self.memory_threshold,
                "error_rate": self.error_rate_threshold,
                "api_rate": self.api_rate_threshold,
            },
            ThrottleState.CRITICAL: {
                "cpu": self.cpu_critical,
                "memory": self.memory_critical,
                "error_rate": self.error_rate_critical,
                "api_rate": self.api_rate_threshold * 0.5,
            },
            ThrottleState.EMERGENCY: {
                "cpu": 100.0,
                "memory": 100.0,
                "error_rate": 1.0,
                "api_rate": 0.0,
            },
        }


@dataclass
class OverloadMetrics:
    """Metriche di sovraccarico per monitoring.

    Attributes:
        overload_count: Numero di eventi di sovraccarico
        total_overload_duration_sec: Durata totale in sovraccarico (secondi)
        last_overload_timestamp: Timestamp ultimo evento overload
        peak_cpu_percent: Picco CPU registrato
        peak_memory_percent: Picco memoria registrato
        peak_error_rate: Picco error rate registrato
        current_threshold_cpu: Soglia CPU attuale
        current_threshold_memory: Soglia memoria attuale
        threshold_adjustments: Numero di aggiustamenti threshold
    """
    overload_count: int = 0
    total_overload_duration_sec: float = 0.0
    last_overload_timestamp: Optional[datetime] = None
    peak_cpu_percent: float = 0.0
    peak_memory_percent: float = 0.0
    peak_error_rate: float = 0.0
    current_threshold_cpu: float = 70.0
    current_threshold_memory: float = 75.0
    threshold_adjustments: int = 0

    def to_dict(self) -> Dict[str, Any]:
        """Converte le metriche in dizionario per logging."""
        return {
            "overload_count": self.overload_count,
            "total_overload_duration_sec": round(self.total_overload_duration_sec, 2),
            "last_overload_timestamp": (
                self.last_overload_timestamp.isoformat()
                if self.last_overload_timestamp else None
            ),
            "peak_cpu_percent": round(self.peak_cpu_percent, 2),
            "peak_memory_percent": round(self.peak_memory_percent, 2),
            "peak_error_rate": round(self.peak_error_rate, 4),
            "current_threshold_cpu": self.current_threshold_cpu,
            "current_threshold_memory": self.current_threshold_memory,
            "threshold_adjustments": self.threshold_adjustments,
        }


# =============================================================================
# COSTANTI
# =============================================================================

# Soglie di default per transizione di stato (override da BackpressureConfig)
DEFAULT_THRESHOLDS: Dict[ThrottleState, Dict[str, float]] = {
    ThrottleState.NORMAL: {
        "cpu": 0.0,
        "memory": 0.0,
        "error_rate": 0.0,
        "api_rate": 1.0,
    },
    ThrottleState.CAUTION: {
        "cpu": 60.0,
        "memory": 65.0,
        "error_rate": 0.05,
        "api_rate": 0.5,
    },
    ThrottleState.WARNING: {
        "cpu": 75.0,
        "memory": 80.0,
        "error_rate": 0.1,
        "api_rate": 0.2,
    },
    ThrottleState.CRITICAL: {
        "cpu": 90.0,
        "memory": 90.0,
        "error_rate": 0.2,
        "api_rate": 0.1,
    },
    ThrottleState.EMERGENCY: {
        "cpu": 100.0,
        "memory": 100.0,
        "error_rate": 1.0,
        "api_rate": 0.0,
    },
}

# Alias per backward compatibility
THRESHOLDS = DEFAULT_THRESHOLDS

# Delay di recovery per ogni stato (secondi)
RECOVERY_DELAYS: Dict[ThrottleState, float] = {
    ThrottleState.NORMAL: 0.0,
    ThrottleState.CAUTION: 0.1,
    ThrottleState.WARNING: 0.5,
    ThrottleState.CRITICAL: 2.0,
    ThrottleState.EMERGENCY: 5.0,
}

# Fattore moltiplicativo per adaptive throttling
ADAPTIVE_FACTORS: Dict[ThrottleState, float] = {
    ThrottleState.NORMAL: 1.0,
    ThrottleState.CAUTION: 0.8,
    ThrottleState.WARNING: 0.5,
    ThrottleState.CRITICAL: 0.2,
    ThrottleState.EMERGENCY: 0.05,
}


# =============================================================================
# BACKPRESSURE CONTROLLER
# =============================================================================

class BackpressureController:
    """Controller per rilevare e gestire il sovraccarico di sistema.

    Questo controller monitora le metriche di sistema (CPU, memoria, errori)
    e applica throttling quando necessario per prevenire il collasso.

    Features:
        - Rilevamento sovraccarico multi-dimensionale
        - Circuit breaker per API failure
        - Adaptive throttling con recovery automatico
        - Thread-safe per uso concorrente

    Thread Safety:
        Tutti i metodi pubblici sono thread-safe.

    Example:
        >>> controller = BackpressureController()
        >>>
        >>> # Controlla stato
        >>> delay = controller.check_and_throttle()
        >>> if delay > 0:
        ...     time.sleep(delay)
        >>>
        >>> # Registra esiti
        >>> try:
        ...     result = call_api()
        ...     controller.record_success()
        ... except Exception:
        ...     controller.record_error()
        >>>
        >>> # Verifica se accettare task
        >>> if controller.should_accept_new_task():
        ...     spawn_task()
    """

    _instance: Optional['BackpressureController'] = None
    _lock = threading.RLock()

    def __new__(cls) -> 'BackpressureController':
        """Singleton pattern per controller centralizzato."""
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self):
        """Inizializza il BackpressureController con configurazione di default."""
        if self._initialized:
            return

        self._config = self._load_config_from_env()
        self._state = ThrottleState.NORMAL
        self._circuit_state = CircuitState.CLOSED
        self._circuit_failures = 0
        self._circuit_last_failure: Optional[datetime] = None
        self._metrics = SystemMetrics()
        self._metrics_lock = threading.Lock()

        # Threshold dinamici (aggiornabili a runtime)
        self._thresholds = self._config.to_thresholds_dict()
        self._thresholds_lock = threading.Lock()

        # Metriche di overload
        self._overload_metrics = OverloadMetrics(
            current_threshold_cpu=self._config.cpu_threshold,
            current_threshold_memory=self._config.memory_threshold,
        )
        self._overload_lock = threading.Lock()
        self._overload_start_time: Optional[datetime] = None

        # Contatori per rate calculation
        self._success_count = 0
        self._error_count = 0
        self._total_requests = 0
        self._count_lock = threading.Lock()

        # Finestra temporale per error rate
        self._error_window: List[bool] = []  # True = error, False = success
        self._window_size = 100
        self._window_lock = threading.Lock()

        # Task attivi
        self._active_tasks = 0
        self._task_lock = threading.Lock()

        # Statistiche
        self._state_transitions = 0
        self._throttle_events = 0
        self._stats_lock = threading.Lock()

        # Ultimo aggiornamento metriche
        self._last_metrics_update: Optional[datetime] = None

        self._initialized = True
        logger.info(
            f"BackpressureController inizializzato: "
            f"cpu_threshold={self._config.cpu_threshold}%, "
            f"memory_threshold={self._config.memory_threshold}%"
        )

    def _load_config_from_env(self) -> BackpressureConfig:
        """Carica configurazione da environment variables via config centralizzato.

        Returns:
            BackpressureConfig con valori da environment o default.
        """
        # Usa config centralizzato per soglie principali, con fallback per parametri aggiuntivi
        return BackpressureConfig(
            cpu_threshold=config.BACKPRESSURE_CPU_THRESHOLD * 100,  # Converti da frazione a percentuale
            cpu_critical=float(os.getenv("BACKPRESSURE_CPU_CRITICAL", "90.0")),
            memory_threshold=config.BACKPRESSURE_RAM_THRESHOLD * 100,  # Converti da frazione a percentuale
            memory_critical=float(os.getenv("BACKPRESSURE_MEMORY_CRITICAL", "90.0")),
            error_rate_threshold=float(os.getenv("BACKPRESSURE_ERROR_RATE_THRESHOLD", "0.1")),
            error_rate_critical=float(os.getenv("BACKPRESSURE_ERROR_RATE_CRITICAL", "0.25")),
            api_rate_threshold=float(os.getenv("BACKPRESSURE_API_RATE_THRESHOLD", "0.2")),
            circuit_failure_threshold=int(os.getenv("BACKPRESSURE_CIRCUIT_FAILURE_THRESHOLD", "5")),
            circuit_recovery_timeout=float(os.getenv("BACKPRESSURE_CIRCUIT_RECOVERY_TIMEOUT", "30.0")),
            max_active_tasks=int(os.getenv("BACKPRESSURE_MAX_ACTIVE_TASKS", "100")),
        )

    def configure(self, **kwargs) -> None:
        """Aggiorna la configurazione del controller.

        Args:
            **kwargs: Parametri di configurazione da aggiornare
        """
        with self._lock:
            for key, value in kwargs.items():
                if hasattr(self._config, key):
                    setattr(self._config, key, value)
                    logger.debug(f"Configurazione aggiornata: {key}={value}")

    def update_thresholds(
        self,
        cpu_threshold: Optional[float] = None,
        cpu_critical: Optional[float] = None,
        memory_threshold: Optional[float] = None,
        memory_critical: Optional[float] = None,
        error_rate_threshold: Optional[float] = None,
        error_rate_critical: Optional[float] = None,
        api_rate_threshold: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Aggiorna le soglie dinamiche a runtime.

        Permette di modificare i threshold senza riavviare il sistema.
        I threshold vengono validati per garantire coerenza.

        Args:
            cpu_threshold: Soglia CPU per WARNING (%) (opzionale)
            cpu_critical: Soglia CPU per CRITICAL (%) (opzionale)
            memory_threshold: Soglia memoria per WARNING (%) (opzionale)
            memory_critical: Soglia memoria per CRITICAL (%) (opzionale)
            error_rate_threshold: Soglia error rate per WARNING (opzionale)
            error_rate_critical: Soglia error rate per CRITICAL (opzionale)
            api_rate_threshold: Soglia rate API rimanente (opzionale)

        Returns:
            Dizionario con i threshold aggiornati e stato operazione

        Raises:
            ValueError: Se i threshold non sono validi
        """
        changes = {}

        with self._lock:
            # Validazione threshold
            if cpu_threshold is not None:
                if not 0 < cpu_threshold <= 100:
                    raise ValueError(f"cpu_threshold deve essere 0-100, got {cpu_threshold}")
                if cpu_critical is not None and cpu_threshold >= cpu_critical:
                    raise ValueError("cpu_threshold deve essere < cpu_critical")
                self._config.cpu_threshold = cpu_threshold
                changes["cpu_threshold"] = cpu_threshold

            if cpu_critical is not None:
                if not 0 < cpu_critical <= 100:
                    raise ValueError(f"cpu_critical deve essere 0-100, got {cpu_critical}")
                self._config.cpu_critical = cpu_critical
                changes["cpu_critical"] = cpu_critical

            if memory_threshold is not None:
                if not 0 < memory_threshold <= 100:
                    raise ValueError(f"memory_threshold deve essere 0-100, got {memory_threshold}")
                if memory_critical is not None and memory_threshold >= memory_critical:
                    raise ValueError("memory_threshold deve essere < memory_critical")
                self._config.memory_threshold = memory_threshold
                changes["memory_threshold"] = memory_threshold

            if memory_critical is not None:
                if not 0 < memory_critical <= 100:
                    raise ValueError(f"memory_critical deve essere 0-100, got {memory_critical}")
                self._config.memory_critical = memory_critical
                changes["memory_critical"] = memory_critical

            if error_rate_threshold is not None:
                if not 0 <= error_rate_threshold <= 1:
                    raise ValueError(f"error_rate_threshold deve essere 0-1, got {error_rate_threshold}")
                self._config.error_rate_threshold = error_rate_threshold
                changes["error_rate_threshold"] = error_rate_threshold

            if error_rate_critical is not None:
                if not 0 <= error_rate_critical <= 1:
                    raise ValueError(f"error_rate_critical deve essere 0-1, got {error_rate_critical}")
                self._config.error_rate_critical = error_rate_critical
                changes["error_rate_critical"] = error_rate_critical

            if api_rate_threshold is not None:
                if not 0 <= api_rate_threshold <= 1:
                    raise ValueError(f"api_rate_threshold deve essere 0-1, got {api_rate_threshold}")
                self._config.api_rate_threshold = api_rate_threshold
                changes["api_rate_threshold"] = api_rate_threshold

            # Aggiorna thresholds dinamici
            if changes:
                with self._thresholds_lock:
                    self._thresholds = self._config.to_thresholds_dict()

                # Aggiorna metriche overload
                with self._overload_lock:
                    self._overload_metrics.current_threshold_cpu = self._config.cpu_threshold
                    self._overload_metrics.current_threshold_memory = self._config.memory_threshold
                    self._overload_metrics.threshold_adjustments += 1

                logger.info(f"Threshold aggiornati: {changes}")

        return {
            "success": True,
            "changes": changes,
            "current_thresholds": {
                "cpu_threshold": self._config.cpu_threshold,
                "cpu_critical": self._config.cpu_critical,
                "memory_threshold": self._config.memory_threshold,
                "memory_critical": self._config.memory_critical,
                "error_rate_threshold": self._config.error_rate_threshold,
                "error_rate_critical": self._config.error_rate_critical,
                "api_rate_threshold": self._config.api_rate_threshold,
            },
        }

    def get_overload_metrics(self) -> OverloadMetrics:
        """Ottiene le metriche di sovraccarico.

        Returns:
            OverloadMetrics con statistiche di overload
        """
        with self._overload_lock:
            return OverloadMetrics(
                overload_count=self._overload_metrics.overload_count,
                total_overload_duration_sec=self._overload_metrics.total_overload_duration_sec,
                last_overload_timestamp=self._overload_metrics.last_overload_timestamp,
                peak_cpu_percent=self._overload_metrics.peak_cpu_percent,
                peak_memory_percent=self._overload_metrics.peak_memory_percent,
                peak_error_rate=self._overload_metrics.peak_error_rate,
                current_threshold_cpu=self._overload_metrics.current_threshold_cpu,
                current_threshold_memory=self._overload_metrics.current_threshold_memory,
                threshold_adjustments=self._overload_metrics.threshold_adjustments,
            )

    @property
    def state(self) -> ThrottleState:
        """Stato corrente del throttling."""
        return self._state

    @property
    def circuit_state(self) -> CircuitState:
        """Stato corrente del circuit breaker."""
        return self._circuit_state

    @property
    def metrics(self) -> SystemMetrics:
        """Metriche correnti (copia read-only)."""
        with self._metrics_lock:
            return SystemMetrics(
                cpu_percent=self._metrics.cpu_percent,
                memory_percent=self._metrics.memory_percent,
                api_rate_remaining=self._metrics.api_rate_remaining,
                error_rate=self._metrics.error_rate,
                active_tasks=self._metrics.active_tasks,
                avg_latency_ms=self._metrics.avg_latency_ms,
                timestamp=self._metrics.timestamp,
            )

    def update_metrics(
        self,
        cpu_percent: Optional[float] = None,
        memory_percent: Optional[float] = None,
        api_rate_remaining: Optional[float] = None,
        avg_latency_ms: Optional[float] = None,
    ) -> None:
        """Aggiorna le metriche di sistema.

        Args:
            cpu_percent: Utilizzo CPU (opzionale, auto-rilevato se None)
            memory_percent: Utilizzo memoria (opzionale, auto-rilevato se None)
            api_rate_remaining: Rate API rimanente (opzionale)
            avg_latency_ms: Latenza media (opzionale)
        """
        with self._metrics_lock:
            # Auto-rileva CPU e memoria se non forniti
            if cpu_percent is None or memory_percent is None:
                try:
                    import psutil
                    if cpu_percent is None:
                        cpu_percent = psutil.cpu_percent(interval=0.1)
                    if memory_percent is None:
                        memory_percent = psutil.virtual_memory().percent
                except ImportError:
                    # Fallback se psutil non disponibile
                    if cpu_percent is None:
                        cpu_percent = self._metrics.cpu_percent
                    if memory_percent is None:
                        memory_percent = self._metrics.memory_percent

            # Aggiorna metriche
            if cpu_percent is not None:
                self._metrics.cpu_percent = cpu_percent
            if memory_percent is not None:
                self._metrics.memory_percent = memory_percent
            if api_rate_remaining is not None:
                self._metrics.api_rate_remaining = api_rate_remaining
            if avg_latency_ms is not None:
                self._metrics.avg_latency_ms = avg_latency_ms

            # Aggiorna error rate dalla finestra
            self._metrics.error_rate = self._calculate_error_rate()

            # Aggiorna task attivi
            with self._task_lock:
                self._metrics.active_tasks = self._active_tasks

            self._metrics.timestamp = datetime.now()
            self._last_metrics_update = self._metrics.timestamp

            # Ricalcola stato
            self._calculate_state()

    def _calculate_error_rate(self) -> float:
        """Calcola il tasso di errori dalla finestra temporale.

        Returns:
            Error rate (0.0 - 1.0)
        """
        with self._window_lock:
            if not self._error_window:
                return 0.0
            errors = sum(1 for e in self._error_window if e)
            return errors / len(self._error_window)

    def _calculate_state(self) -> ThrottleState:
        """Calcola lo stato corrente basato sulle metriche.

        Analizza tutte le metriche e determina lo stato peggiore.
        Aggiorna anche le metriche di overload.

        Returns:
            ThrottleState calcolato
        """
        new_state = ThrottleState.NORMAL

        # Aggiorna peak metrics
        with self._overload_lock:
            if self._metrics.cpu_percent > self._overload_metrics.peak_cpu_percent:
                self._overload_metrics.peak_cpu_percent = self._metrics.cpu_percent
            if self._metrics.memory_percent > self._overload_metrics.peak_memory_percent:
                self._overload_metrics.peak_memory_percent = self._metrics.memory_percent
            if self._metrics.error_rate > self._overload_metrics.peak_error_rate:
                self._overload_metrics.peak_error_rate = self._metrics.error_rate

        # Controlla ogni metrica contro le soglie DINAMICHE
        metrics_checks = [
            ("cpu", self._metrics.cpu_percent, True),  # True = higher is worse
            ("memory", self._metrics.memory_percent, True),
            ("error_rate", self._metrics.error_rate, True),
            ("api_rate", self._metrics.api_rate_remaining, False),  # False = lower is worse
        ]

        with self._thresholds_lock:
            current_thresholds = self._thresholds

        for metric_name, value, higher_is_worse in metrics_checks:
            for state in [ThrottleState.EMERGENCY, ThrottleState.CRITICAL,
                         ThrottleState.WARNING, ThrottleState.CAUTION]:
                threshold = current_thresholds[state].get(metric_name, 0)

                if higher_is_worse:
                    if value >= threshold and state.value > new_state.value:
                        new_state = state
                        break
                else:
                    if value <= threshold and state.value > new_state.value:
                        new_state = state
                        break

        # Traccia overload quando entra in stato WARNING o superiore
        now = datetime.now()
        is_overloaded = new_state.value >= ThrottleState.WARNING.value
        was_overloaded = self._state.value >= ThrottleState.WARNING.value

        if is_overloaded and not was_overloaded:
            # Inizio overload
            self._overload_start_time = now
            with self._overload_lock:
                self._overload_metrics.overload_count += 1
                self._overload_metrics.last_overload_timestamp = now
        elif not is_overloaded and was_overloaded:
            # Fine overload - calcola durata
            if self._overload_start_time:
                duration = (now - self._overload_start_time).total_seconds()
                with self._overload_lock:
                    self._overload_metrics.total_overload_duration_sec += duration
                self._overload_start_time = None

        # Aggiorna stato se cambiato
        if new_state != self._state:
            old_state = self._state
            self._state = new_state

            with self._stats_lock:
                self._state_transitions += 1

            logger.info(
                f"Backpressure state change: {old_state.name} -> {new_state.name} "
                f"(cpu={self._metrics.cpu_percent:.1f}%, "
                f"mem={self._metrics.memory_percent:.1f}%, "
                f"err_rate={self._metrics.error_rate:.2%})"
            )

        return self._state

    def check_and_throttle(self) -> float:
        """Controlla le metriche e applica throttling se necessario.

        Aggiorna le metriche di sistema e calcola il delay
        di recovery appropriato.

        Returns:
            Delay in secondi da attendere (0 se nessun throttling)
        """
        # Aggiorna metriche
        self.update_metrics()

        # Ottieni delay per stato corrente
        delay = RECOVERY_DELAYS.get(self._state, 0.0)

        if delay > 0:
            with self._stats_lock:
                self._throttle_events += 1

            logger.debug(
                f"Throttling applicato: delay={delay}s, state={self._state.name}"
            )

        return delay

    def apply_backpressure(self, additional_delay: float = 0.0) -> float:
        """Applica il delay di backpressure corrente.

        Questo metodo blocca per il tempo necessario al recovery.

        Args:
            additional_delay: Delay aggiuntivo da sommare

        Returns:
            Delay totale applicato in secondi
        """
        base_delay = RECOVERY_DELAYS.get(self._state, 0.0)
        total_delay = base_delay + additional_delay

        if total_delay > 0:
            logger.debug(f"Applicando backpressure: {total_delay}s")
            time.sleep(total_delay)

            with self._stats_lock:
                self._throttle_events += 1

        return total_delay

    def record_error(self, error_type: str = "generic") -> None:
        """Registra un errore per aggiornare l'error rate.

        Aggiorna la finestra degli errori e il circuit breaker.

        Args:
            error_type: Tipo di errore per logging
        """
        # Aggiorna finestra errori
        with self._window_lock:
            self._error_window.append(True)
            if len(self._error_window) > self._window_size:
                self._error_window.pop(0)

        # Aggiorna contatori
        with self._count_lock:
            self._error_count += 1
            self._total_requests += 1

        # Aggiorna circuit breaker
        self._update_circuit_breaker(success=False)

        logger.debug(
            f"Errore registrato: type={error_type}, "
            f"error_rate={self._calculate_error_rate():.2%}"
        )

        # Ricalcola stato
        with self._metrics_lock:
            self._metrics.error_rate = self._calculate_error_rate()
        self._calculate_state()

    def record_success(self) -> None:
        """Registra un successo per aggiornare l'error rate.

        Riduce l'error rate e puo' triggerare recovery del circuit breaker.
        """
        # Aggiorna finestra errori
        with self._window_lock:
            self._error_window.append(False)
            if len(self._error_window) > self._window_size:
                self._error_window.pop(0)

        # Aggiorna contatori
        with self._count_lock:
            self._success_count += 1
            self._total_requests += 1

        # Aggiorna circuit breaker
        self._update_circuit_breaker(success=True)

        # Ricalcola stato
        with self._metrics_lock:
            self._metrics.error_rate = self._calculate_error_rate()
        self._calculate_state()

    def _update_circuit_breaker(self, success: bool) -> None:
        """Aggiorna lo stato del circuit breaker.

        Args:
            success: Se l'operazione e' stata successful
        """
        with self._lock:
            if success:
                if self._circuit_state == CircuitState.HALF_OPEN:
                    # Recovery successful, close circuit
                    self._circuit_state = CircuitState.CLOSED
                    self._circuit_failures = 0
                    logger.info("Circuit breaker: HALF_OPEN -> CLOSED (recovery)")
                elif self._circuit_state == CircuitState.CLOSED:
                    # Reset failure count on success
                    self._circuit_failures = max(0, self._circuit_failures - 1)
            else:
                self._circuit_failures += 1
                self._circuit_last_failure = datetime.now()

                if self._circuit_state == CircuitState.HALF_OPEN:
                    # Recovery failed, back to open
                    self._circuit_state = CircuitState.OPEN
                    logger.warning("Circuit breaker: HALF_OPEN -> OPEN (recovery failed)")

                elif self._circuit_state == CircuitState.CLOSED:
                    if self._circuit_failures >= self._config.circuit_failure_threshold:
                        self._circuit_state = CircuitState.OPEN
                        logger.warning(
                            f"Circuit breaker: CLOSED -> OPEN "
                            f"(failures={self._circuit_failures})"
                        )

            # Check for half-open transition
            if self._circuit_state == CircuitState.OPEN:
                if self._circuit_last_failure:
                    elapsed = (datetime.now() - self._circuit_last_failure).total_seconds()
                    if elapsed >= self._config.circuit_recovery_timeout:
                        self._circuit_state = CircuitState.HALF_OPEN
                        logger.info("Circuit breaker: OPEN -> HALF_OPEN (timeout)")

    def should_accept_new_task(self) -> bool:
        """Verifica se il sistema puo' accettare un nuovo task.

        Controlla:
        - Stato del throttling (non EMERGENCY)
        - Circuit breaker (non OPEN)
        - Limite task attivi

        Returns:
            True se il task puo' essere accettato
        """
        # Non accettare in emergenza
        if self._state == ThrottleState.EMERGENCY:
            logger.warning("Task rifiutato: sistema in EMERGENCY")
            return False

        # Non accettare se circuit breaker aperto
        if self._circuit_state == CircuitState.OPEN:
            logger.warning("Task rifiutato: circuit breaker OPEN")
            return False

        # Controlla limite task attivi
        with self._task_lock:
            if self._active_tasks >= self._config.max_active_tasks:
                logger.warning(
                    f"Task rifiutato: limite task raggiunto "
                    f"({self._active_tasks}/{self._config.max_active_tasks})"
                )
                return False

        return True

    def begin_task(self) -> bool:
        """Registra l'inizio di un nuovo task.

        Incrementa il contatore dei task attivi.

        Returns:
            True se il task e' stato accettato
        """
        if not self.should_accept_new_task():
            return False

        with self._task_lock:
            self._active_tasks += 1

        return True

    def end_task(self) -> None:
        """Registra la fine di un task.

        Decrementa il contatore dei task attivi.
        """
        with self._task_lock:
            self._active_tasks = max(0, self._active_tasks - 1)

    def get_adaptive_factor(self) -> float:
        """Ottiene il fattore adattivo per il throttling.

        Questo fattore puo' essere usato per scalare la concorrenza
        o il rate delle operazioni.

        Returns:
            Fattore tra 0.0 e 1.0
        """
        return ADAPTIVE_FACTORS.get(self._state, 1.0)

    def get_recommended_concurrency(self, max_concurrency: int = 100) -> int:
        """Calcola la concorrenza raccomandata basata sullo stato.

        Args:
            max_concurrency: Concorrenza massima desiderata

        Returns:
            Concorrenza raccomandata (tra 1 e max_concurrency)
        """
        factor = self.get_adaptive_factor()
        recommended = int(max_concurrency * factor)
        return max(1, min(recommended, max_concurrency))

    @contextmanager
    def task_context(self):
        """Context manager per gestire il ciclo di vita di un task.

        Registra automaticamente inizio e fine task.

        Yields:
            True se il task e' stato accettato, False altrimenti

        Example:
            >>> with controller.task_context() as accepted:
            ...     if not accepted:
            ...         return
            ...     # Esegui task
            ...     pass
        """
        accepted = self.begin_task()
        try:
            yield accepted
        finally:
            if accepted:
                self.end_task()

    def get_statistics(self) -> Dict[str, Any]:
        """Ottiene statistiche del controller.

        Returns:
            Dizionario con statistiche complete
        """
        with self._count_lock:
            success_count = self._success_count
            error_count = self._error_count
            total_requests = self._total_requests

        with self._task_lock:
            active_tasks = self._active_tasks

        with self._stats_lock:
            state_transitions = self._state_transitions
            throttle_events = self._throttle_events

        with self._window_lock:
            window_size = len(self._error_window)

        return {
            "state": self._state.name,
            "circuit_state": self._circuit_state.name,
            "metrics": self.metrics.to_dict(),
            "overload_metrics": self.get_overload_metrics().to_dict(),
            "counts": {
                "success": success_count,
                "error": error_count,
                "total": total_requests,
            },
            "active_tasks": active_tasks,
            "circuit_failures": self._circuit_failures,
            "statistics": {
                "state_transitions": state_transitions,
                "throttle_events": throttle_events,
                "error_window_size": window_size,
            },
            "config": {
                "cpu_threshold": self._config.cpu_threshold,
                "cpu_critical": self._config.cpu_critical,
                "memory_threshold": self._config.memory_threshold,
                "memory_critical": self._config.memory_critical,
                "error_rate_threshold": self._config.error_rate_threshold,
                "error_rate_critical": self._config.error_rate_critical,
                "api_rate_threshold": self._config.api_rate_threshold,
                "max_active_tasks": self._config.max_active_tasks,
            },
        }

    def reset_statistics(self) -> None:
        """Resetta le statistiche del controller."""
        with self._count_lock:
            self._success_count = 0
            self._error_count = 0
            self._total_requests = 0

        with self._window_lock:
            self._error_window.clear()

        with self._stats_lock:
            self._state_transitions = 0
            self._throttle_events = 0

        with self._overload_lock:
            self._overload_metrics = OverloadMetrics(
                current_threshold_cpu=self._config.cpu_threshold,
                current_threshold_memory=self._config.memory_threshold,
            )
            self._overload_start_time = None

        logger.info("Statistiche backpressure resettate")

    def reset(self) -> None:
        """Reset completo del controller."""
        with self._lock:
            self._state = ThrottleState.NORMAL
            self._circuit_state = CircuitState.CLOSED
            self._circuit_failures = 0
            self._circuit_last_failure = None
            self._metrics = SystemMetrics()
            # Ripristina configurazione di default da env
            self._config = self._load_config_from_env()
            self._thresholds = self._config.to_thresholds_dict()

        with self._task_lock:
            self._active_tasks = 0

        self.reset_statistics()

        logger.info("BackpressureController resettato")

    def force_state(self, state: ThrottleState) -> None:
        """Forza lo stato del controller (per testing).

        Args:
            state: Lo stato da impostare
        """
        with self._lock:
            old_state = self._state
            self._state = state

        logger.warning(
            f"Backpressure state forzato: {old_state.name} -> {state.name}"
        )


# =============================================================================
# SINGLETON ACCESSORS
# =============================================================================

def get_backpressure_controller() -> BackpressureController:
    """Ottiene l'istanza singleton del BackpressureController.

    Returns:
        L'istanza globale del controller
    """
    return BackpressureController()


def reset_backpressure_controller() -> None:
    """Resetta il singleton (per testing)."""
    with BackpressureController._lock:
        if BackpressureController._instance is not None:
            BackpressureController._instance.reset()
            BackpressureController._instance = None


# =============================================================================
# PUBLIC API
# =============================================================================

__all__ = [
    # Classi principali
    "BackpressureController",
    "ThrottleState",
    "CircuitState",
    "SystemMetrics",
    "BackpressureConfig",
    "OverloadMetrics",
    # Costanti
    "DEFAULT_THRESHOLDS",
    "THRESHOLDS",
    "RECOVERY_DELAYS",
    "ADAPTIVE_FACTORS",
    # Funzioni singleton
    "get_backpressure_controller",
    "reset_backpressure_controller",
]
