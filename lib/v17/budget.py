"""
Hierarchical Budget Manager - V17

Gestione gerarchica del budget token/API calls per-agent.

Livelli (5-tier hierarchy):
- CORE: Agent core (60K-150K tokens)
- L1: Expert agents (50K tokens default)
- L2: Specialist agents (30K tokens default)
- PLUGIN: Plugin agents (20K tokens default)
- CUSTOM: Custom agents (40K tokens default)

Features:
- Reserve/Commit/Rollback pattern
- Alert a 80% usage
- Throttle a 90% usage
- Thread-safety con asyncio.Lock

Example:
    >>> from lib.v17.budget import HierarchicalBudgetManager, BudgetTier
    >>> manager = HierarchicalBudgetManager()
    >>> await manager.initialize()
    >>>
    >>> # Ottieni budget per agente
    >>> budget = await manager.get_budget("core/coder.md")
    >>>
    >>> # Riserva token
    >>> await manager.reserve("core/coder.md", 1000)
    >>>
    >>> # Commit usage
    >>> await manager.commit("core/coder.md", 950)
    >>>
    >>> # Verifica usage
    >>> usage = manager.get_usage("core/coder.md")
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

# Configure logger
logger = logging.getLogger(__name__)


class BudgetTier(Enum):
    """Livelli della gerarchia budget per-agent."""

    CORE = "core"      # Core agents (analyzer, coder, reviewer, etc.)
    L1 = "l1"          # Expert agents (database_expert, security_expert, etc.)
    L2 = "l2"          # Specialist agents (gui-layout-specialist, etc.)
    PLUGIN = "plugin"  # Plugin agents
    CUSTOM = "custom"  # Custom/external agents


# Default budget per tier (in tokens)
DEFAULT_TIER_BUDGETS: Dict[BudgetTier, Tuple[int, int]] = {
    BudgetTier.CORE: (60_000, 150_000),    # min, max
    BudgetTier.L1: (50_000, 50_000),
    BudgetTier.L2: (30_000, 30_000),
    BudgetTier.PLUGIN: (20_000, 20_000),
    BudgetTier.CUSTOM: (40_000, 40_000),
}

# Thresholds
WARNING_THRESHOLD = 0.80   # 80% - Alert
THROTTLE_THRESHOLD = 0.90  # 90% - Throttle
CRITICAL_THRESHOLD = 0.95  # 95% - Critical


@dataclass(slots=True)
class BudgetAllocation:
    """
    Allocazione budget per agente.

    Attributes:
        agent_name: Nome dell'agente (es. "core/coder.md")
        tier: Livello gerarchico
        total: Budget totale allocato
        used: Budget utilizzato
        reserved: Budget riservato (non ancora usato)
        min_budget: Budget minimo
        max_budget: Budget massimo
        created_at: Timestamp creazione
        last_updated: Timestamp ultimo aggiornamento
        metadata: Metadata aggiuntivi
    """

    agent_name: str
    tier: BudgetTier
    total: int
    used: int = 0
    reserved: int = 0
    min_budget: int = 0
    max_budget: int = 0
    created_at: float = 0.0
    last_updated: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)

    # Alias per compatibilita' V17 API
    @property
    def allocated(self) -> int:
        """Alias per total (V17 API compatibility)."""
        return self.total

    @property
    def consumed(self) -> int:
        """Alias per used (V17 API compatibility)."""
        return self.used

    @property
    def remaining(self) -> int:
        """Alias per available (V17 API compatibility)."""
        return self.available

    @property
    def percentage_used(self) -> float:
        """Percentuale usata (0.0-100.0) per V17 API."""
        return self.utilization * 100.0

    def __post_init__(self) -> None:
        """Inizializza timestamp se non impostati."""
        if self.created_at == 0.0:
            self.created_at = time.time()
        if self.last_updated == 0.0:
            self.last_updated = time.time()
        if self.min_budget == 0:
            self.min_budget = self.total
        if self.max_budget == 0:
            self.max_budget = self.total

    @property
    def available(self) -> int:
        """Budget disponibile."""
        return self.total - self.used - self.reserved

    @property
    def utilization(self) -> float:
        """Utilizzo percentuale (0.0-1.0)."""
        return self.used / self.total if self.total > 0 else 0.0

    @property
    def reserved_utilization(self) -> float:
        """Utilizzo riservato percentuale (0.0-1.0)."""
        return (self.used + self.reserved) / self.total if self.total > 0 else 0.0

    def is_exhausted(self) -> bool:
        """Verifica se budget esaurito."""
        return self.available <= 0

    def is_warning(self) -> bool:
        """Verifica se above warning threshold (80%)."""
        return self.reserved_utilization >= WARNING_THRESHOLD

    def is_throttled(self) -> bool:
        r"""Verifica se above throttle threshold (90%)."""
        return self.reserved_utilization >= THROTTLE_THRESHOLD

    def is_critical(self) -> bool:
        """Verifica se sopra soglia critical (95%)."""
        return self.reserved_utilization >= CRITICAL_THRESHOLD

    def to_dict(self) -> Dict[str, Any]:
        """Converte in dizionario per serializzazione."""
        return {
            "agent_name": self.agent_name,
            "tier": self.tier.value,
            "total": self.total,
            "used": self.used,
            "reserved": self.reserved,
            "available": self.available,
            "utilization": round(self.utilization, 4),
            "min_budget": self.min_budget,
            "max_budget": self.max_budget,
            "created_at": self.created_at,
            "last_updated": self.last_updated,
            "metadata": self.metadata,
        }


@dataclass(slots=True)
class BudgetUsage:
    """
    Record di utilizzo budget.

    Attributes:
        agent_name: Nome dell'agente
        amount: Quantita usata
        timestamp: Timestamp uso
        operation: Operazione eseguita
        reserved_amount: Quantita riservata
        committed: Se e' stato committato
        metadata: Metadata aggiuntivi
    """

    agent_name: str
    amount: int
    timestamp: float
    operation: str = ""
    reserved_amount: int = 0
    committed: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Converte in dizionario per serializzazione."""
        return {
            "agent_name": self.agent_name,
            "amount": self.amount,
            "timestamp": self.timestamp,
            "operation": self.operation,
            "reserved_amount": self.reserved_amount,
            "committed": self.committed,
            "metadata": self.metadata,
        }


@dataclass(slots=True)
class BudgetAlert:
    """
    Alert di budget.

    Attributes:
        agent_name: Nome dell'agente
        alert_type: Tipo di alert
        threshold: Soglia superata
        current_value: Valore attuale
        message: Messaggio descrittivo
        timestamp: Timestamp
    """

    agent_name: str
    alert_type: str  # "warning", "throttle", "critical", "exhausted"
    threshold: float
    current_value: float
    message: str
    timestamp: float = 0.0

    def __post_init__(self) -> None:
        """Inizializza timestamp se non impostato."""
        if self.timestamp == 0.0:
            self.timestamp = time.time()

    def to_dict(self) -> Dict[str, Any]:
        """Converte in dizionario per serializzazione."""
        return {
            "agent_name": self.agent_name,
            "alert_type": self.alert_type,
            "threshold": self.threshold,
            "current_value": round(self.current_value, 4),
            "message": self.message,
            "timestamp": self.timestamp,
        }


@dataclass(slots=True)
class BudgetReport:
    """
    Report completo dello stato budget (V17 API).

    Attributes:
        global_total: Budget globale totale
        global_used: Budget globale usato
        global_remaining: Budget globale rimanente
        global_utilization: Utilizzo globale (0.0-1.0)
        by_agent: Dettaglio per agente
        by_tier: Aggregazione per tier
        alerts: Alert attivi
        timestamp: Timestamp generazione
    """

    global_total: int
    global_used: int
    global_remaining: int
    global_utilization: float
    by_agent: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    by_tier: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    alerts: List[Dict[str, Any]] = field(default_factory=list)
    timestamp: float = 0.0

    def __post_init__(self) -> None:
        """Inizializza timestamp se non impostato."""
        if self.timestamp == 0.0:
            self.timestamp = time.time()

    def to_dict(self) -> Dict[str, Any]:
        """Converte in dizionario per serializzazione."""
        return {
            "global_total": self.global_total,
            "global_used": self.global_used,
            "global_remaining": self.global_remaining,
            "global_utilization": round(self.global_utilization, 4),
            "by_agent": self.by_agent,
            "by_tier": self.by_tier,
            "alerts": self.alerts,
            "timestamp": self.timestamp,
        }


class BudgetExhaustedError(Exception):
    """Eccezione sollevata quando il budget e' esaurito."""

    def __init__(self, agent_name: str, available: int, requested: int):
        self.agent_name = agent_name
        self.available = available
        self.requested = requested
        super().__init__(
            f"Budget exhausted for {agent_name}: "
            f"available={available}, requested={requested}"
        )


class BudgetThrottledError(Exception):
    """Eccezione sollevata quando il budget e' in throttle."""

    def __init__(self, agent_name: str, utilization: float):
        self.agent_name = agent_name
        self.utilization = utilization
        super().__init__(
            f"Budget throttled for {agent_name}: "
            f"utilization={utilization:.1%} >= {THROTTLE_THRESHOLD:.0%}"
        )


class HierarchicalBudgetManager:
    """
    Manager gerarchico per budget token/API per-agent.

    Features:
    - 5-tier hierarchy (CORE, L1, L2, PLUGIN, CUSTOM)
    - Override per-agent
    - Reserve/Commit/Rollback pattern
    - Alert a 80% usage
    - Throttle a 90% usage
    - Thread-safety con asyncio.Lock

    Example:
        >>> manager = HierarchicalBudgetManager()
        >>> await manager.initialize()
        >>>
        >>> # Ottieni budget
        >>> budget = await manager.get_budget("core/coder.md")
        >>> print(f"Budget: {budget.total}, Available: {budget.available}")
        >>>
        >>> # Riserva token
        >>> if await manager.reserve("core/coder.md", 1000):
        ...     try:
        ...         result = await some_operation()
        ...         await manager.commit("core/coder.md", 950)
        ...     except Exception:
        ...         await manager.rollback("core/coder.md")
        >>>
        >>> # Check usage
        >>> usage = manager.get_usage("core/coder.md")
        >>> print(f"Used: {usage.utilization:.1%}")
    """

    def __init__(
        self,
        config_path: Optional[Path] = None,
        warning_threshold: float = WARNING_THRESHOLD,
        throttle_threshold: float = THROTTLE_THRESHOLD,
        critical_threshold: float = CRITICAL_THRESHOLD,
    ) -> None:
        """
        Inizializza il manager.

        Args:
            config_path: Path to configuration file (optional)
            warning_threshold: Soglia warning (default 0.80)
            throttle_threshold: Soglia throttle (default 0.90)
            critical_threshold: Soglia critical (default 0.95)
        """
        self._config_path = config_path
        self._warning_threshold = warning_threshold
        self._throttle_threshold = throttle_threshold
        self._critical_threshold = critical_threshold

        # Allocazioni per agente
        self._allocations: Dict[str, BudgetAllocation] = {}

        # Usage history
        self._usage_history: List[BudgetUsage] = []
        self._max_history: int = 10000

        # Alerts
        self._alerts: List[BudgetAlert] = []
        self._alert_callbacks: List[Callable[[BudgetAlert], Any]] = []

        # Reserve tracking (agent_name -> reserved_amount)
        self._reservations: Dict[str, int] = {}

        # Lock per thread-safety
        self._lock = asyncio.Lock()

        # Stato inizializzazione
        self._initialized = False

        # Global budget
        self._global_budget: int = 1_000_000  # 1M tokens default
        self._global_used: int = 0

        # Agent tier mapping
        self._agent_tier_map: Dict[str, BudgetTier] = {}

        # Per-agent budget overrides
        self._budget_overrides: Dict[str, int] = {}

    async def initialize(
        self,
        global_budget: int = 1_000_000,
        config: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Inizializza manager con budget globale e configurazione.

        Args:
            global_budget: Budget totale sessione (default 1M tokens)
            config: Configurazione opzionale con overrides
        """
        async with self._lock:
            self._global_budget = global_budget

            # Carica configurazione se fornita
            if config:
                await self._load_config(config)

            # Carica da file se path specificato
            if self._config_path and self._config_path.exists():
                try:
                    content = self._config_path.read_text(encoding="utf-8")
                    file_config = json.loads(content)
                    await self._load_config(file_config)
                except Exception as e:
                    logger.warning(f"Failed to load config from {self._config_path}: {e}")

            # Inizializza agent tier mapping
            self._build_agent_tier_map()

            self._initialized = True
            logger.info(
                f"HierarchicalBudgetManager initialized: "
                f"global_budget={global_budget}, "
                f"tiers={len(DEFAULT_TIER_BUDGETS)}"
            )

    async def _load_config(self, config: Dict[str, Any]) -> None:
        """Carica configurazione."""
        # Carica budget overrides
        if "budget_overrides" in config:
            self._budget_overrides = config["budget_overrides"]

        # Carica agent tier mapping
        if "agent_tiers" in config:
            for agent_name, tier_str in config["agent_tiers"].items():
                try:
                    self._agent_tier_map[agent_name] = BudgetTier(tier_str)
                except ValueError:
                    logger.warning(f"Invalid tier '{tier_str}' for agent {agent_name}")

        # Carica thresholds
        if "thresholds" in config:
            thresholds = config["thresholds"]
            if "warning" in thresholds:
                self._warning_threshold = thresholds["warning"]
            if "throttle" in thresholds:
                self._throttle_threshold = thresholds["throttle"]
            if "critical" in thresholds:
                self._critical_threshold = thresholds["critical"]

    def _build_agent_tier_map(self) -> None:
        """Costruisce mapping agent -> tier basato su path."""
        # Mapping automatico basato su path
        tier_patterns = {
            BudgetTier.CORE: ["core/"],
            BudgetTier.L1: ["experts/"],
            BudgetTier.L2: ["experts/L2/"],
            BudgetTier.PLUGIN: ["plugins/"],
            BudgetTier.CUSTOM: ["custom/"],
        }

        for agent_name in self._budget_overrides.keys():
            if agent_name not in self._agent_tier_map:
                # Determina tier da path
                for tier, patterns in tier_patterns.items():
                    if any(p in agent_name for p in patterns):
                        self._agent_tier_map[agent_name] = tier
                        break
                else:
                    # L2 check deve venire prima di L1 per priorità
                    if "L2/" in agent_name or "/L2/" in agent_name:
                        self._agent_tier_map[agent_name] = BudgetTier.L2
                    elif "experts/" in agent_name:
                        self._agent_tier_map[agent_name] = BudgetTier.L1
                    else:
                        self._agent_tier_map[agent_name] = BudgetTier.CUSTOM

    def _get_tier_for_agent(self, agent_name: str) -> BudgetTier:
        """Ottiene il tier per un agente."""
        if agent_name in self._agent_tier_map:
            return self._agent_tier_map[agent_name]

        # Auto-detect da path
        if "core/" in agent_name:
            return BudgetTier.CORE
        if "L2/" in agent_name or "/L2/" in agent_name:
            return BudgetTier.L2
        if "experts/" in agent_name:
            return BudgetTier.L1
        if "plugins/" in agent_name:
            return BudgetTier.PLUGIN
        return BudgetTier.CUSTOM

    def _get_budget_for_tier(self, tier: BudgetTier) -> int:
        """Ottiene il budget default per un tier."""
        min_budget, max_budget = DEFAULT_TIER_BUDGETS.get(
            tier, DEFAULT_TIER_BUDGETS[BudgetTier.CUSTOM]
        )
        return min_budget

    async def get_budget(self, agent_name: str) -> BudgetAllocation:
        """
        Ottiene budget per agente. Crea se non esiste.

        Args:
            agent_name: Nome dell'agente (es. "core/coder.md")

        Returns:
            BudgetAllocation per l'agente
        """
        async with self._lock:
            # Se esiste gia', ritorna
            if agent_name in self._allocations:
                return self._allocations[agent_name]

            # Crea nuova allocazione
            tier = self._get_tier_for_agent(agent_name)

            # Check override
            if agent_name in self._budget_overrides:
                total = self._budget_overrides[agent_name]
            else:
                total = self._get_budget_for_tier(tier)

            min_budget, max_budget = DEFAULT_TIER_BUDGETS.get(
                tier, DEFAULT_TIER_BUDGETS[BudgetTier.CUSTOM]
            )

            allocation = BudgetAllocation(
                agent_name=agent_name,
                tier=tier,
                total=total,
                min_budget=min_budget,
                max_budget=max_budget,
            )

            self._allocations[agent_name] = allocation
            logger.debug(f"Created budget allocation for {agent_name}: {total} tokens")

            return allocation

    async def reserve(
        self,
        agent_name: str,
        tokens: int,
        operation: str = "",
    ) -> bool:
        """
        Riserva token per un agente.

        Args:
            agent_name: Nome dell'agente
            tokens: Numero di token da riservare
            operation: Descrizione operazione (opzionale)

        Returns:
            True se riservato con successo

        Raises:
            BudgetExhaustedError: Se budget insufficiente
            BudgetThrottledError: Se budget in throttle
        """
        async with self._lock:
            allocation = await self.get_budget(agent_name)

            # Verifica disponibilita'
            if allocation.available < tokens:
                raise BudgetExhaustedError(
                    agent_name, allocation.available, tokens
                )

            # Verifica throttle (solo warning, non blocca)
            new_utilization = (allocation.used + allocation.reserved + tokens) / allocation.total
            if new_utilization >= self._throttle_threshold:
                # Genera alert throttle ma permetti operazione
                await self._generate_alert(
                    allocation,
                    "throttle",
                    self._throttle_threshold,
                    new_utilization,
                )
                logger.warning(
                    f"Budget throttle for {agent_name}: "
                    f"utilization={new_utilization:.1%}"
                )

            # Riserva
            allocation.reserved += tokens
            allocation.last_updated = time.time()

            # Track reservation
            self._reservations[agent_name] = self._reservations.get(agent_name, 0) + tokens

            # Record usage
            usage = BudgetUsage(
                agent_name=agent_name,
                amount=0,
                timestamp=time.time(),
                operation=operation,
                reserved_amount=tokens,
                committed=False,
            )
            self._add_to_history(usage)

            # Check alerts
            await self._check_alerts(allocation)

            logger.debug(
                f"Reserved {tokens} tokens for {agent_name}: "
                f"available={allocation.available}"
            )

            return True

    async def commit(
        self,
        agent_name: str,
        actual_tokens: int,
        operation: str = "",
    ) -> bool:
        """
        Commit usage effettivo. Converte reserved in used.

        Args:
            agent_name: Nome dell'agente
            actual_tokens: Token effettivamente usati
            operation: Descrizione operazione (opzionale)

        Returns:
            True se committato con successo
        """
        async with self._lock:
            allocation = await self.get_budget(agent_name)

            # Ottieni reserved amount
            reserved = self._reservations.get(agent_name, 0)

            # Se actual_tokens > reserved, usa reserved
            tokens_to_commit = min(actual_tokens, reserved) if reserved > 0 else actual_tokens

            # Commit
            if reserved > 0:
                allocation.reserved -= tokens_to_commit
                self._reservations[agent_name] = reserved - tokens_to_commit

            allocation.used += tokens_to_commit
            allocation.last_updated = time.time()

            # Aggiorna global
            self._global_used += tokens_to_commit

            # Record usage
            usage = BudgetUsage(
                agent_name=agent_name,
                amount=tokens_to_commit,
                timestamp=time.time(),
                operation=operation,
                reserved_amount=reserved,
                committed=True,
            )
            self._add_to_history(usage)

            # Check alerts
            await self._check_alerts(allocation)

            logger.debug(
                f"Committed {tokens_to_commit} tokens for {agent_name}: "
                f"used={allocation.used}, available={allocation.available}"
            )

            return True

    async def rollback(self, agent_name: str) -> bool:
        """
        Rilascia prenotazione senza commit.

        Args:
            agent_name: Nome dell'agente

        Returns:
            True se rollback effettuato
        """
        async with self._lock:
            allocation = await self.get_budget(agent_name)

            # Ottieni reserved amount
            reserved = self._reservations.get(agent_name, 0)

            if reserved <= 0:
                return True  # Niente da rilasciare

            # Rollback
            allocation.reserved -= reserved
            allocation.last_updated = time.time()

            # Clear reservation tracking
            del self._reservations[agent_name]

            # Record usage
            usage = BudgetUsage(
                agent_name=agent_name,
                amount=0,
                timestamp=time.time(),
                operation="rollback",
                reserved_amount=reserved,
                committed=False,
            )
            self._add_to_history(usage)

            logger.debug(
                f"Rolled back {reserved} tokens for {agent_name}: "
                f"available={allocation.available}"
            )

            return True

    async def check_budget(
        self,
        agent_name: str,
        tokens_needed: int,
    ) -> bool:
        """
        Verifica se ci sono abbastanza token disponibili.

        Args:
            agent_name: Nome dell'agente
            tokens_needed: Token necessari

        Returns:
            True se disponibili, False altrimenti
        """
        async with self._lock:
            allocation = await self.get_budget(agent_name)
            return allocation.available >= tokens_needed

    def get_usage(self, agent_name: str) -> Optional[BudgetAllocation]:
        """
        Ottiene usage per un agente (sync, no lock).

        Args:
            agent_name: Nome dell'agente

        Returns:
            BudgetAllocation o None se non esiste
        """
        return self._allocations.get(agent_name)

    async def get_usage_async(self, agent_name: str) -> Optional[BudgetAllocation]:
        """
        Ottiene usage per un agente (async, con lock).

        Args:
            agent_name: Nome dell'agente

        Returns:
            BudgetAllocation o None se non esiste
        """
        async with self._lock:
            return self._allocations.get(agent_name)

    def get_all_usage(self) -> Dict[str, BudgetAllocation]:
        """
        Ottiene usage globale per tutti gli agenti (sync).

        Returns:
            Dict agent_name -> BudgetAllocation
        """
        return dict(self._allocations)

    async def get_all_usage_async(self) -> Dict[str, BudgetAllocation]:
        """
        Ottiene usage globale per tutti gli agenti (async).

        Returns:
            Dict agent_name -> BudgetAllocation
        """
        async with self._lock:
            return dict(self._allocations)

    async def reset(self, agent_name: str) -> bool:
        """
        Reset usage per un agente.

        Args:
            agent_name: Nome dell'agente

        Returns:
            True se resettato
        """
        async with self._lock:
            if agent_name in self._allocations:
                allocation = self._allocations[agent_name]
                allocation.used = 0
                allocation.reserved = 0
                allocation.last_updated = time.time()

            if agent_name in self._reservations:
                del self._reservations[agent_name]

            logger.info(f"Reset budget for {agent_name}")
            return True

    async def reset_all(self) -> bool:
        """
        Reset usage per tutti gli agenti.

        Returns:
            True se resettato
        """
        async with self._lock:
            for allocation in self._allocations.values():
                allocation.used = 0
                allocation.reserved = 0
                allocation.last_updated = time.time()

            self._reservations.clear()
            self._global_used = 0

            logger.info("Reset all budgets")
            return True

    async def rebalance(self) -> Dict[str, Any]:
        """
        Ribilancia budget in base a utilizzo.

        Analizza utilizzo e ridistribuisce budget non utilizzato
        agli agenti che ne hanno bisogno.

        Returns:
            Dict con modifiche effettuate
        """
        async with self._lock:
            changes: Dict[str, Any] = {
                "timestamp": time.time(),
                "reallocations": [],
                "tier_summaries": {},
            }

            # Calcola utilizzo per tier
            tier_usage: Dict[BudgetTier, Dict[str, Any]] = {}
            for tier in BudgetTier:
                tier_usage[tier] = {
                    "total": 0,
                    "used": 0,
                    "available": 0,
                    "agents": [],
                }

            for agent_name, allocation in self._allocations.items():
                tier = allocation.tier
                tier_usage[tier]["total"] += allocation.total
                tier_usage[tier]["used"] += allocation.used
                tier_usage[tier]["available"] += allocation.available
                tier_usage[tier]["agents"].append(agent_name)

            # Calcola summary per tier
            for tier, data in tier_usage.items():
                if data["total"] > 0:
                    utilization = data["used"] / data["total"]
                    changes["tier_summaries"][tier.value] = {
                        "total": data["total"],
                        "used": data["used"],
                        "available": data["available"],
                        "utilization": round(utilization, 4),
                        "agent_count": len(data["agents"]),
                    }

            # Identifica agenti sotto-utilizzati e sopra-utilizzati
            under_utilized: List[Tuple[str, BudgetAllocation]] = []
            over_utilized: List[Tuple[str, BudgetAllocation]] = []

            for agent_name, allocation in self._allocations.items():
                if allocation.utilization < 0.3 and allocation.total > allocation.min_budget:
                    under_utilized.append((agent_name, allocation))
                elif allocation.utilization > 0.8 and allocation.total < allocation.max_budget:
                    over_utilized.append((agent_name, allocation))

            # Ribilancia: riduci budget sotto-utilizzati, aumenta sopra-utilizzati
            for agent_name, allocation in under_utilized:
                # Riduci al minimo
                old_total = allocation.total
                allocation.total = allocation.min_budget
                reduction = old_total - allocation.total

                changes["reallocations"].append({
                    "agent": agent_name,
                    "type": "reduce",
                    "old_total": old_total,
                    "new_total": allocation.total,
                    "amount": reduction,
                })

            for agent_name, allocation in over_utilized:
                # Aumenta al massimo disponibile
                old_total = allocation.total
                available_increase = allocation.max_budget - allocation.total

                if available_increase > 0:
                    increase = min(available_increase, 10_000)  # Max 10K increase
                    allocation.total += increase

                    changes["reallocations"].append({
                        "agent": agent_name,
                        "type": "increase",
                        "old_total": old_total,
                        "new_total": allocation.total,
                        "amount": increase,
                    })

            if changes["reallocations"]:
                logger.info(f"Rebalanced {len(changes['reallocations'])} allocations")
            else:
                logger.debug("No rebalancing needed")

            return changes

    def get_summary(self) -> Dict[str, Any]:
        """
        Ottiene summary completo (sync).

        Returns:
            Dict con global, by_tier, by_status, alerts
        """
        summary: Dict[str, Any] = {
            "global": {
                "total": self._global_budget,
                "used": self._global_used,
                "available": self._global_budget - self._global_used,
                "utilization": round(
                    self._global_used / self._global_budget if self._global_budget > 0 else 0, 4
                ),
            },
            "by_tier": {},
            "by_status": {
                "healthy": 0,
                "warning": 0,
                "throttled": 0,
                "critical": 0,
                "exhausted": 0,
            },
            "alerts": [a.to_dict() for a in self._alerts[-10:]],  # Last 10 alerts
            "agent_count": len(self._allocations),
        }

        # Calcola per tier
        tier_data: Dict[BudgetTier, Dict[str, Any]] = {}
        for tier in BudgetTier:
            tier_data[tier] = {
                "total": 0,
                "used": 0,
                "reserved": 0,
                "available": 0,
                "agent_count": 0,
            }

        for allocation in self._allocations.values():
            tier = allocation.tier
            tier_data[tier]["total"] += allocation.total
            tier_data[tier]["used"] += allocation.used
            tier_data[tier]["reserved"] += allocation.reserved
            tier_data[tier]["available"] += allocation.available
            tier_data[tier]["agent_count"] += 1

            # Status count
            if allocation.is_exhausted():
                summary["by_status"]["exhausted"] += 1
            elif allocation.is_critical():
                summary["by_status"]["critical"] += 1
            elif allocation.is_throttled():
                summary["by_status"]["throttled"] += 1
            elif allocation.is_warning():
                summary["by_status"]["warning"] += 1
            else:
                summary["by_status"]["healthy"] += 1

        for tier, data in tier_data.items():
            if data["agent_count"] > 0:
                utilization = data["used"] / data["total"] if data["total"] > 0 else 0
                summary["by_tier"][tier.value] = {
                    **data,
                    "utilization": round(utilization, 4),
                }

        return summary

    def register_alert_callback(
        self,
        callback: Callable[[BudgetAlert], Any],
    ) -> None:
        """
        Registra callback per alerts.

        Args:
            callback: Funzione che riceve BudgetAlert
        """
        self._alert_callbacks.append(callback)

    def _add_to_history(self, usage: BudgetUsage) -> None:
        """Aggiunge record allo history con limite."""
        self._usage_history.append(usage)
        if len(self._usage_history) > self._max_history:
            # Rimuovi vecchi record (keep last 50%)
            self._usage_history = self._usage_history[-self._max_history // 2:]

    async def _check_alerts(self, allocation: BudgetAllocation) -> None:
        """Controlla se generare alerts."""
        utilization = allocation.reserved_utilization

        if allocation.is_exhausted():
            await self._generate_alert(
                allocation, "exhausted", 1.0, utilization
            )
        elif utilization >= self._critical_threshold:
            await self._generate_alert(
                allocation, "critical", self._critical_threshold, utilization
            )
        elif utilization >= self._throttle_threshold:
            await self._generate_alert(
                allocation, "throttle", self._throttle_threshold, utilization
            )
        elif utilization >= self._warning_threshold:
            await self._generate_alert(
                allocation, "warning", self._warning_threshold, utilization
            )

    async def _generate_alert(
        self,
        allocation: BudgetAllocation,
        alert_type: str,
        threshold: float,
        current_value: float,
    ) -> None:
        """Genera e notifica alert."""
        message = (
            f"Budget {alert_type} for {allocation.agent_name}: "
            f"utilization={current_value:.1%}, threshold={threshold:.0%}"
        )

        alert = BudgetAlert(
            agent_name=allocation.agent_name,
            alert_type=alert_type,
            threshold=threshold,
            current_value=current_value,
            message=message,
        )

        self._alerts.append(alert)

        # Notifica callbacks
        for callback in self._alert_callbacks:
            try:
                result = callback(alert)
                if asyncio.iscoroutine(result):
                    await result
            except Exception as e:
                logger.error(f"Alert callback error: {e}")

        logger.warning(message)

    async def use_budget(
        self,
        agent_name: str,
        amount: int,
        operation: str = "",
    ) -> "BudgetContextManager":
        """
        Context manager per uso budget con auto-rollback.

        Args:
            agent_name: Nome dell'agente
            amount: Quantita da usare
            operation: Descrizione operazione

        Returns:
            Context manager

        Example:
            >>> async with manager.use_budget("core/coder.md", 1000) as tx:
            ...     result = await api_call()
            ...     # Auto-commit on success, auto-rollback on error
        """
        return BudgetContextManager(
            manager=self,
            agent_name=agent_name,
            amount=amount,
            operation=operation,
        )

    def get_alerts(self, limit: int = 100) -> List[BudgetAlert]:
        """
        Ottiene ultimi alerts.

        Args:
            limit: Numero massimo di alerts

        Returns:
            Lista di BudgetAlert
        """
        return self._alerts[-limit:]

    def get_history(
        self,
        agent_name: Optional[str] = None,
        limit: int = 100,
    ) -> List[BudgetUsage]:
        """
        Ottiene history usage.

        Args:
            agent_name: Filtra per agente (opzionale)
            limit: Numero massimo di record

        Returns:
            Lista di BudgetUsage
        """
        if agent_name:
            history = [u for u in self._usage_history if u.agent_name == agent_name]
        else:
            history = self._usage_history

        return history[-limit:]

    def set_agent_budget(
        self,
        agent_name: str,
        budget: int,
        tier: Optional[BudgetTier] = None,
    ) -> None:
        """
        Imposta budget per un agente (override).

        Args:
            agent_name: Nome dell'agente
            budget: Budget totale
            tier: Tier opzionale
        """
        if tier:
            self._agent_tier_map[agent_name] = tier

        self._budget_overrides[agent_name] = budget

        # Aggiorna se esiste
        if agent_name in self._allocations:
            self._allocations[agent_name].total = budget
            self._allocations[agent_name].last_updated = time.time()

    @property
    def is_initialized(self) -> bool:
        """Verifica se manager e' inizializzato."""
        return self._initialized

    @property
    def global_budget(self) -> int:
        """Budget globale totale."""
        return self._global_budget

    @property
    def global_used(self) -> int:
        """Budget globale usato."""
        return self._global_used

    @property
    def global_available(self) -> int:
        """Budget globale disponibile."""
        return self._global_budget - self._global_used

    # =========================================================================
    # V17 API - Metodi per compatibilita' con specifica V17.0.0
    # =========================================================================

    def allocate(self, agent_id: str, amount: int) -> BudgetAllocation:
        """
        Alloca budget per un agente (sync wrapper per V17 API).

        Args:
            agent_id: Nome dell'agente
            amount: Quantita' di token da allocare

        Returns:
            BudgetAllocation per l'agente

        Example:
            >>> allocation = manager.allocate("core/coder.md", 50000)
            >>> print(f"Allocated: {allocation.allocated}, Remaining: {allocation.remaining}")
        """
        # Se esiste gia', aggiorna il totale
        if agent_id in self._allocations:
            allocation = self._allocations[agent_id]
            allocation.total = amount
            allocation.last_updated = time.time()
            return allocation

        # Crea nuova allocazione
        tier = self._get_tier_for_agent(agent_id)
        min_budget, max_budget = DEFAULT_TIER_BUDGETS.get(
            tier, DEFAULT_TIER_BUDGETS[BudgetTier.CUSTOM]
        )

        allocation = BudgetAllocation(
            agent_name=agent_id,
            tier=tier,
            total=amount,
            min_budget=min_budget,
            max_budget=max_budget,
        )

        self._allocations[agent_id] = allocation
        self._agent_tier_map[agent_id] = tier
        logger.debug(f"Allocated {amount} tokens for {agent_id}")

        return allocation

    def consume(self, agent_id: str, tokens: int) -> bool:
        """
        Consuma token direttamente senza reserve/commit (sync per V17 API).

        Combina reserve e commit in una singola operazione.

        Args:
            agent_id: Nome dell'agente
            tokens: Numero di token da consumare

        Returns:
            True se consumato con successo, False se budget insufficiente

        Example:
            >>> if manager.consume("core/coder.md", 1000):
            ...     print("Tokens consumed successfully")
        """
        # Ottieni o crea allocazione
        if agent_id not in self._allocations:
            self.allocate(agent_id, self._get_budget_for_tier(
                self._get_tier_for_agent(agent_id)
            ))

        allocation = self._allocations[agent_id]

        # Verifica disponibilita'
        if allocation.available < tokens:
            logger.warning(
                f"Insufficient budget for {agent_id}: "
                f"available={allocation.available}, requested={tokens}"
            )
            return False

        # Consuma direttamente
        allocation.used += tokens
        allocation.last_updated = time.time()
        self._global_used += tokens

        # Record usage
        usage = BudgetUsage(
            agent_name=agent_id,
            amount=tokens,
            timestamp=time.time(),
            operation="consume",
            committed=True,
        )
        self._add_to_history(usage)

        logger.debug(
            f"Consumed {tokens} tokens for {agent_id}: "
            f"used={allocation.used}, available={allocation.available}"
        )

        return True

    def get_remaining(self, agent_id: Optional[str] = None) -> int:
        """
        Ottiene budget rimanente (sync per V17 API).

        Args:
            agent_id: Nome dell'agente (None per globale)

        Returns:
            Token rimanenti

        Example:
            >>> global_remaining = manager.get_remaining()
            >>> agent_remaining = manager.get_remaining("core/coder.md")
        """
        if agent_id is None:
            return self.global_available

        if agent_id in self._allocations:
            return self._allocations[agent_id].available

        # Se non esiste, ritorna il budget default per il tier
        tier = self._get_tier_for_agent(agent_id)
        return self._get_budget_for_tier(tier)

    def adjust(self, complexity: float) -> int:
        """
        Adatta il budget in base alla complessita' del task (V17 API).

        Formula: base_budget * (1 + complexity_factor)
        - complexity 0.0 -> base_budget * 1.0 (no adjustment)
        - complexity 0.5 -> base_budget * 1.5 (50% increase)
        - complexity 1.0 -> base_budget * 2.0 (100% increase)
        - complexity -0.5 -> base_budget * 0.5 (50% decrease)

        Args:
            complexity: Fattore di complessita' (-1.0 to 2.0)

        Returns:
            Budget consigliato in base alla complessita'

        Example:
            >>> # Task semplice
            >>> simple_budget = manager.adjust(0.0)  # base budget
            >>> # Task complesso
            >>> complex_budget = manager.adjust(1.0)  # 2x base budget
        """
        # Clamp complexity range
        complexity = max(-1.0, min(2.0, complexity))

        # Budget base medio
        base_budget = sum(
            budgets[0] for budgets in DEFAULT_TIER_BUDGETS.values()
        ) // len(DEFAULT_TIER_BUDGETS)

        # Calcola adjustment factor
        adjustment_factor = 1.0 + complexity
        adjusted_budget = int(base_budget * adjustment_factor)

        # Clamp to reasonable range
        min_budget = 10_000
        max_budget = 500_000
        adjusted_budget = max(min_budget, min(max_budget, adjusted_budget))

        logger.debug(
            f"Budget adjusted for complexity {complexity:.2f}: "
            f"{base_budget} -> {adjusted_budget}"
        )

        return adjusted_budget

    def get_report(self) -> BudgetReport:
        """
        Genera report completo dello stato budget (V17 API).

        Returns:
            BudgetReport con tutte le statistiche

        Example:
            >>> report = manager.get_report()
            >>> print(f"Global: {report.global_used}/{report.global_total}")
            >>> for agent, data in report.by_agent.items():
            ...     print(f"  {agent}: {data['used']}/{data['total']}")
        """
        # Calcola per agente
        by_agent: Dict[str, Dict[str, Any]] = {}
        for agent_id, allocation in self._allocations.items():
            by_agent[agent_id] = {
                "allocated": allocation.total,
                "consumed": allocation.used,
                "remaining": allocation.available,
                "percentage_used": allocation.percentage_used,
                "tier": allocation.tier.value,
                "is_warning": allocation.is_warning(),
                "is_throttled": allocation.is_throttled(),
                "is_critical": allocation.is_critical(),
            }

        # Calcola per tier
        by_tier: Dict[str, Dict[str, Any]] = {}
        tier_data: Dict[BudgetTier, Dict[str, int]] = {
            tier: {"total": 0, "used": 0, "count": 0}
            for tier in BudgetTier
        }

        for allocation in self._allocations.values():
            tier = allocation.tier
            tier_data[tier]["total"] += allocation.total
            tier_data[tier]["used"] += allocation.used
            tier_data[tier]["count"] += 1

        for tier, data in tier_data.items():
            if data["count"] > 0:
                utilization = data["used"] / data["total"] if data["total"] > 0 else 0
                by_tier[tier.value] = {
                    "total": data["total"],
                    "used": data["used"],
                    "remaining": data["total"] - data["used"],
                    "utilization": round(utilization, 4),
                    "agent_count": data["count"],
                }

        # Calcola utilizzazione globale
        global_utilization = (
            self._global_used / self._global_budget
            if self._global_budget > 0
            else 0.0
        )

        # Alerts recenti
        alerts = [a.to_dict() for a in self._alerts[-20:]]

        return BudgetReport(
            global_total=self._global_budget,
            global_used=self._global_used,
            global_remaining=self.global_available,
            global_utilization=global_utilization,
            by_agent=by_agent,
            by_tier=by_tier,
            alerts=alerts,
            timestamp=time.time(),
        )


class BudgetContextManager:
    """
    Context manager per transazioni budget.

    Usage:
        async with manager.use_budget("agent", 1000) as tx:
            result = await operation()
            # Auto-commit on success, auto-rollback on error
    """

    def __init__(
        self,
        manager: HierarchicalBudgetManager,
        agent_name: str,
        amount: int,
        operation: str = "",
    ) -> None:
        self._manager = manager
        self._agent_name = agent_name
        self._amount = amount
        self._operation = operation
        self._committed = False
        self._rolled_back = False
        self._reserved = False

    async def __aenter__(self) -> "BudgetContextManager":
        """Entra nel context, riserva budget."""
        await self._manager.reserve(self._agent_name, self._amount, self._operation)
        self._reserved = True
        return self

    async def __aexit__(
        self,
        exc_type: Optional[type],
        exc_val: Optional[BaseException],
        exc_tb: Optional[Any],
    ) -> None:
        """Esce dal context, commit o rollback."""
        if exc_type is not None:
            # Errore: rollback
            if self._reserved and not self._committed and not self._rolled_back:
                await self._manager.rollback(self._agent_name)
                self._rolled_back = True
        else:
            # Successo: commit con amount riservato
            if self._reserved and not self._committed and not self._rolled_back:
                await self._manager.commit(self._agent_name, self._amount, self._operation)
                self._committed = True

    async def commit(self, actual_tokens: Optional[int] = None) -> None:
        """Commit manuale."""
        if self._reserved and not self._committed and not self._rolled_back:
            tokens = actual_tokens if actual_tokens is not None else self._amount
            await self._manager.commit(self._agent_name, tokens, self._operation)
            self._committed = True

    async def rollback(self) -> None:
        """Rollback manuale."""
        if self._reserved and not self._committed and not self._rolled_back:
            await self._manager.rollback(self._agent_name)
            self._rolled_back = True


# =============================================================================
# PUBLIC API
# =============================================================================

__all__ = [
    # Core classes
    "HierarchicalBudgetManager",
    "BudgetTier",
    "BudgetAllocation",
    "BudgetUsage",
    "BudgetAlert",
    "BudgetReport",
    "BudgetContextManager",
    # Exceptions
    "BudgetExhaustedError",
    "BudgetThrottledError",
    # Constants
    "DEFAULT_TIER_BUDGETS",
    "WARNING_THRESHOLD",
    "THROTTLE_THRESHOLD",
    "CRITICAL_THRESHOLD",
]
