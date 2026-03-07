"""Predictive Agent Cache for Orchestrator V14.0 AI-Native.

Predice agent necessari basandosi su task embedding e pattern recognition.

Features:
- Task embedding basato su keyword
- Pattern recognition per sequenze di agent
- Preload intelligente con confidence threshold
- Integrazione con AgentUsageTracker V13.2
- Accuracy target: >90%
- Cold start handling con keyword fallback (V14.1)
- Tiered storage per pattern rari (V14.1)
- Distributed lock opzionale per multi-process (V14.1)

V15.0.0: Enhanced with cold start handling, tiered storage, distributed lock.
V14.1.0: Initial implementation for AI-Native orchestrator.
V15.0.0: Major evolution - Enhanced predictive capabilities, improved cold start performance, multi-tier storage optimization.
"""

from __future__ import annotations

import gc
import json
import logging
import os
import threading
import time
from collections import deque
from dataclasses import dataclass, field
from heapq import heappush, heappop, heappushpop
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple, Union

# Import da V13.2
try:
    from lib.lazy_agents import AgentUsageTracker, L2_AGENTS, get_lazy_agent_loader
except ImportError:
    # Fallback per test standalone
    AgentUsageTracker = None
    L2_AGENTS = {}
    get_lazy_agent_loader = None

logger = logging.getLogger(__name__)


# ============================================================================
# Data Classes
# ============================================================================

@dataclass(slots=True)
class Prediction:
    """Predizione di un agent necessario.

    Attributes:
        agent_id: Identificatore dell'agent
        confidence: Livello di confidenza (0.0 - 1.0)
        reason: Motivazione della predizione
        source: Fonte della predizione (pattern, keyword, recent, etc.)
    """
    agent_id: str
    confidence: float
    reason: str
    source: str = "unknown"

    def __post_init__(self) -> None:
        """Valida confidence range."""
        object.__setattr__(self, 'confidence', max(0.0, min(1.0, self.confidence)))


@dataclass(slots=True)
class TaskEmbedding:
    """Embedding semplificato di un task basato su keyword.

    Attributes:
        keywords: Set di keyword estratte dal task
        pattern_key: Chiave del pattern riconosciuto
        complexity_score: Score di complessita (0.0 - 1.0)
        domain: Dominio del task (database, api, security, etc.)
    """
    keywords: Set[str] = field(default_factory=set)
    pattern_key: str = "general"
    complexity_score: float = 0.5
    domain: str = "general"


@dataclass(slots=True)
class AgentSequence:
    """Sequenza di agent utilizzati per un task type.

    Attributes:
        pattern_key: Chiave del pattern
        agents: Lista di agent nella sequenza
        frequency: Frequenza di occorrenza
        last_seen: Timestamp ultima occorrenza
    """
    pattern_key: str
    agents: List[str] = field(default_factory=list)
    frequency: int = 1
    last_seen: float = field(default_factory=time.time)


@dataclass(slots=True)
class PatternMatch:
    """Risultato di un pattern match.

    Attributes:
        pattern_key: Chiave del pattern
        confidence: Confidenza del match
        agents: Agent associati al pattern
    """
    pattern_key: str
    confidence: float
    agents: List[str] = field(default_factory=list)


# ============================================================================
# FIX 2: Tiered Storage Components
# ============================================================================

@dataclass(order=True, slots=True)
class PrioritizedPattern:
    """Pattern con priorita per tiered storage.

    Attributes:
        priority: Priorita del pattern (negativo per max-heap behavior)
        pattern: Dati del pattern
        access_count: Contatore accessi
        last_access: Timestamp ultimo accesso
    """
    priority: float
    pattern: Dict[str, Any] = field(compare=False)
    access_count: int = field(default=1, compare=False)
    last_access: float = field(default_factory=time.time, compare=False)


class TieredPatternStorage:
    """Storage a tier per pattern con protezione pattern ad alto valore.

    Tier structure:
    - HOT (200): Pattern piu usati, accesso rapido
    - WARM (800): Pattern recenti, accesso medio
    - COLD (500): Pattern rari ma preziosi, protetti

    Features:
    - Protezione automatica pattern con value_score > 0.8
    - Promozione/demolizione tra tier basata su accessi
    - Thread-safe con RLock
    """

    def __init__(
        self,
        hot_size: int = 200,
        warm_size: int = 800,
        cold_size: int = 500
    ) -> None:
        """Inizializza tiered storage.

        Args:
            hot_size: Dimensione massima tier HOT
            warm_size: Dimensione massima tier WARM
            cold_size: Dimensione massima tier COLD
        """
        self._hot_size = hot_size
        self._warm_size = warm_size
        self._cold_size = cold_size

        # HOT tier: heap per priorita (top 200)
        self._hot_tier: List[PrioritizedPattern] = []
        # WARM tier: deque per pattern recenti (800)
        self._warm_tier: Deque[Dict[str, Any]] = deque(maxlen=warm_size)
        # COLD tier: dict per pattern protetti (500)
        self._cold_tier: Dict[str, Dict[str, Any]] = {}
        self._cold_order: List[str] = []  # Per LRU eviction

        self._lock = threading.RLock()
        self._stats = {
            "hot_hits": 0,
            "warm_hits": 0,
            "cold_hits": 0,
            "promotions": 0,
            "evictions": 0,
        }

    def add_pattern(self, pattern: Dict[str, Any], value_score: float = 0.5) -> None:
        """Aggiunge pattern al tier appropriato.

        Args:
            pattern: Dati del pattern
            value_score: Score di valore (0.0-1.0)
        """
        with self._lock:
            pattern_id = pattern.get("id", str(hash(str(pattern))))

            # Pattern ad alto valore sempre protetti in COLD
            if value_score > 0.8:
                self._add_to_cold(pattern_id, pattern)
                return

            # Altrimenti, aggiungi a HOT o WARM
            if len(self._hot_tier) < self._hot_size:
                heappush(self._hot_tier, PrioritizedPattern(
                    priority=-value_score,
                    pattern=pattern,
                    access_count=1
                ))
            else:
                self._warm_tier.append(pattern)

    def _add_to_cold(self, pattern_id: str, pattern: Dict[str, Any]) -> None:
        """Aggiunge pattern al COLD tier con LRU eviction.

        Args:
            pattern_id: ID del pattern
            pattern: Dati del pattern
        """
        # Eviction se necessario
        while len(self._cold_tier) >= self._cold_size and self._cold_order:
            oldest_id = self._cold_order.pop(0)
            self._cold_tier.pop(oldest_id, None)
            self._stats["evictions"] += 1

        self._cold_tier[pattern_id] = {
            **pattern,
            "value_score": pattern.get("value_score", 0.9),
            "protected": True
        }
        if pattern_id not in self._cold_order:
            self._cold_order.append(pattern_id)

    def get_pattern(self, pattern_id: str) -> Optional[Dict[str, Any]]:
        """Recupera pattern da qualsiasi tier.

        Args:
            pattern_id: ID del pattern

        Returns:
            Pattern data o None se non trovato
        """
        with self._lock:
            # Check HOT tier
            for i, p in enumerate(self._hot_tier):
                if p.pattern.get("id") == pattern_id:
                    p.access_count += 1
                    p.last_access = time.time()
                    self._stats["hot_hits"] += 1
                    return p.pattern

            # Check WARM tier
            for p in self._warm_tier:
                if p.get("id") == pattern_id:
                    self._stats["warm_hits"] += 1
                    return p

            # Check COLD tier
            if pattern_id in self._cold_tier:
                # Aggiorna LRU order
                if pattern_id in self._cold_order:
                    self._cold_order.remove(pattern_id)
                    self._cold_order.append(pattern_id)
                self._stats["cold_hits"] += 1
                return self._cold_tier[pattern_id]

            return None

    def get_all_patterns(self) -> List[Dict[str, Any]]:
        """Ottiene tutti i pattern da tutti i tier.

        Returns:
            Lista di tutti i pattern
        """
        with self._lock:
            patterns = []
            patterns.extend(p.pattern for p in self._hot_tier)
            patterns.extend(list(self._warm_tier))
            patterns.extend(list(self._cold_tier.values()))
            return patterns

    def get_stats(self) -> Dict[str, Any]:
        """Ottiene statistiche dello storage.

        Returns:
            Dict con statistiche
        """
        with self._lock:
            return {
                **self._stats,
                "hot_count": len(self._hot_tier),
                "warm_count": len(self._warm_tier),
                "cold_count": len(self._cold_tier),
                "total_patterns": (
                    len(self._hot_tier) +
                    len(self._warm_tier) +
                    len(self._cold_tier)
                ),
            }

    def clear(self) -> None:
        """Cancella tutti i tier."""
        with self._lock:
            self._hot_tier.clear()
            self._warm_tier.clear()
            self._cold_tier.clear()
            self._cold_order.clear()
            self._stats = {
                "hot_hits": 0,
                "warm_hits": 0,
                "cold_hits": 0,
                "promotions": 0,
                "evictions": 0,
            }
        # Forza garbage collection dopo clear massivo
        gc.collect()


# ============================================================================
# FIX 3: Distributed Lock Components
# ============================================================================

def _is_multi_process() -> bool:
    """Rileva se ambiente multi-process.

    Returns:
        True se CLAUDE_MULTI_PROCESS=true
    """
    return os.environ.get("CLAUDE_MULTI_PROCESS", "false").lower() == "true"


class DistributedLock:
    """Wrapper per Redis distributed lock con fallback a RLock.

    Usage:
        with DistributedLock("cache_lock", timeout=30.0) as lock:
            # Operazioni protette
            pass

    Features:
    - Automatico fallback a RLock se Redis non disponibile
    - Supporto multi-process tramite Redis
    - Thread-safe
    """

    def __init__(self, lock_name: str, timeout: float = 30.0) -> None:
        """Inizializza distributed lock.

        Args:
            lock_name: Nome del lock
            timeout: Timeout in secondi
        """
        self._lock_name = lock_name
        self._timeout = timeout
        self._local_lock = threading.RLock()
        self._redis_client = None
        self._redis_lock = None
        self._acquired = False

        # Inizializza Redis solo in ambiente multi-process
        if _is_multi_process():
            try:
                import redis
                self._redis_client = redis.Redis(
                    host=os.environ.get("REDIS_HOST", "localhost"),
                    port=int(os.environ.get("REDIS_PORT", 6379)),
                    decode_responses=True,
                    socket_timeout=5.0
                )
                # Test connessione
                self._redis_client.ping()
            except (ImportError, Exception) as e:
                logger.debug(
                    "Redis not available for distributed lock: %s", e
                )
                self._redis_client = None

    def __enter__(self) -> "DistributedLock":
        """Acquisisce il lock."""
        # Prima acquisisci Redis lock se disponibile
        if self._redis_client:
            try:
                self._redis_lock = self._redis_client.lock(
                    self._lock_name,
                    timeout=self._timeout,
                    blocking_timeout=self._timeout
                )
                self._redis_lock.acquire()
            except Exception as e:
                logger.warning(
                    "Failed to acquire Redis lock %s: %s",
                    self._lock_name, e
                )
                self._redis_lock = None

        # Poi acquisisci local lock
        self._local_lock.acquire()
        self._acquired = True
        return self

    def __exit__(self, exc_type: Any, exc_val: Any, exc_tb: Any) -> None:
        """Rilascia il lock."""
        # Prima rilascia local lock
        if self._acquired:
            self._local_lock.release()
            self._acquired = False

        # Poi rilascia Redis lock
        if self._redis_lock:
            try:
                self._redis_lock.release()
            except Exception as e:
                logger.warning(
                    "Failed to release Redis lock %s: %s",
                    self._lock_name, e
                )
            self._redis_lock = None

    def locked(self) -> bool:
        """Verifica se il lock e acquisito.

        Returns:
            True se il lock e acquisito
        """
        return self._acquired


# ============================================================================
# Pattern Recognition Engine
# ============================================================================

class PatternRecognitionEngine:
    """Motore di riconoscimento pattern per task.

    Analizza task storici per identificare pattern ricorrenti
    e predire agent necessari.

    Features:
    - Keyword co-occurrence analysis
    - Agent sequence detection
    - Confidence scoring
    - Tiered storage per pattern (V14.1)
    """

    # Keyword per dominio
    DOMAIN_KEYWORDS: Dict[str, List[str]] = {
        "database": ["sql", "query", "schema", "table", "index", "orm", "migration"],
        "api": ["api", "rest", "endpoint", "http", "route", "crud", "request"],
        "security": ["auth", "jwt", "security", "password", "token", "oauth", "session"],
        "testing": ["test", "pytest", "mock", "coverage", "fixture", "assertion"],
        "gui": ["gui", "qt", "ui", "widget", "layout", "form", "button"],
        "devops": ["deploy", "pipeline", "ci", "cd", "docker", "kubernetes", "jenkins"],
        "ai": ["ai", "llm", "model", "embedding", "rag", "gpt", "prompt"],
        "mobile": ["mobile", "flutter", "react native", "ios", "android", "gesture"],
        "trading": ["trading", "strategy", "ea", "mql", "backtest", "indicator"],
        "refactor": ["refactor", "clean", "debt", "extract", "rename", "simplify"],
    }

    # Agent L1 -> L2 mapping per dominio
    DOMAIN_AGENT_MAPPING: Dict[str, List[str]] = {
        "database": ["Database Expert", "DB Query Optimizer L2"],
        "api": ["Integration Expert", "API Endpoint Builder L2"],
        "security": ["Security Unified Expert", "Security Auth Specialist L2"],
        "testing": ["Tester Expert", "Test Unit Specialist L2"],
        "gui": ["GUI Super Expert", "GUI Layout Specialist L2"],
        "devops": ["DevOps Expert", "DevOps Pipeline Specialist L2"],
        "ai": ["AI Integration Expert", "AI Model Specialist L2"],
        "mobile": ["Mobile Expert", "Mobile UI Specialist L2"],
        "trading": ["Trading Strategy Expert", "MQL Expert", "Trading Risk Calculator L2"],
        "refactor": ["Languages Expert", "Languages Refactor Specialist L2"],
    }

    # FIX 1: Keyword to agent mapping per cold start fallback
    KEYWORD_AGENT_MAP: Dict[str, List[str]] = {
        "gui": ["GUI Super Expert", "GUI Layout Specialist L2"],
        "database": ["Database Expert", "DB Query Optimizer L2"],
        "api": ["Integration Expert", "API Endpoint Builder L2"],
        "test": ["Tester Expert", "Test Unit Specialist L2"],
        "security": ["Security Unified Expert", "Security Auth Specialist L2"],
        "refactor": ["Languages Refactor Specialist L2", "Languages Expert"],
        "mql": ["MQL Expert", "MQL Optimization L2"],
        "deploy": ["DevOps Expert", "DevOps Pipeline Specialist L2"],
        "auth": ["Security Unified Expert", "Security Auth Specialist L2"],
        "query": ["Database Expert", "DB Query Optimizer L2"],
        "endpoint": ["Integration Expert", "API Endpoint Builder L2"],
        "mock": ["Tester Expert", "Test Unit Specialist L2"],
        "layout": ["GUI Super Expert", "GUI Layout Specialist L2"],
        "pipeline": ["DevOps Expert", "DevOps Pipeline Specialist L2"],
        "model": ["AI Integration Expert", "AI Model Specialist L2"],
        "mobile": ["Mobile Expert", "Mobile UI Specialist L2"],
        "trading": ["Trading Strategy Expert", "Trading Risk Calculator L2"],
    }

    # Memory limits
    MAX_PATTERN_HISTORY = 500
    MAX_KEYWORD_COOCCURRENCE = 1000
    CLEANUP_INTERVAL = 100  # Operazioni tra cleanup

    def __init__(self, use_tiered_storage: bool = True) -> None:
        """Inizializza il motore di pattern recognition.

        Args:
            use_tiered_storage: Se True, usa TieredPatternStorage
        """
        self._pattern_history: Dict[str, AgentSequence] = {}
        self._keyword_cooccurrence: Dict[Tuple[str, str], int] = {}
        self._lock = threading.RLock()
        self._operation_count = 0
        self._last_cleanup_time = time.time()

        # FIX 2: Tiered storage opzionale
        self._use_tiered_storage = use_tiered_storage
        if use_tiered_storage:
            self._tiered_storage = TieredPatternStorage()
        else:
            self._tiered_storage = None

    def _maybe_cleanup(self) -> None:
        """Esegue cleanup periodico se necessario."""
        self._operation_count += 1
        if self._operation_count >= self.CLEANUP_INTERVAL:
            self._cleanup_stale_data()
            self._operation_count = 0

    def _cleanup_stale_data(self) -> None:
        """Rimuove dati vecchi per liberare memoria."""
        now = time.time()
        max_age = 3600  # 1 ora

        with self._lock:
            # Rimuovi pattern vecchi se eccediamo il limite
            if len(self._pattern_history) > self.MAX_PATTERN_HISTORY:
                stale_keys = [
                    k for k, v in self._pattern_history.items()
                    if now - v.last_seen > max_age
                ]
                for k in stale_keys[:len(self._pattern_history) - self.MAX_PATTERN_HISTORY]:
                    del self._pattern_history[k]

            # Limita keyword co-occurrence
            if len(self._keyword_cooccurrence) > self.MAX_KEYWORD_COOCCURRENCE:
                # Rimuovi entry con frequenza piu bassa
                sorted_items = sorted(
                    self._keyword_cooccurrence.items(),
                    key=lambda x: x[1]
                )
                for k, _ in sorted_items[:len(self._keyword_cooccurrence) - self.MAX_KEYWORD_COOCCURRENCE]:
                    del self._keyword_cooccurrence[k]

        self._last_cleanup_time = now
        # Forza garbage collection
        gc.collect()

    def extract_embedding(self, task: str) -> TaskEmbedding:
        """Estrae embedding dal task.

        Args:
            task: Descrizione del task

        Returns:
            TaskEmbedding con keyword, pattern e dominio
        """
        task_lower = task.lower()
        keywords: Set[str] = set()

        # Estrai keyword da ogni dominio
        matched_domain = "general"
        domain_matches: Dict[str, int] = {}

        for domain, domain_kws in self.DOMAIN_KEYWORDS.items():
            matches = sum(1 for kw in domain_kws if kw in task_lower)
            if matches > 0:
                domain_matches[domain] = matches
                keywords.update(kw for kw in domain_kws if kw in task_lower)

        # Determina dominio predominante
        if domain_matches:
            matched_domain = max(domain_matches, key=domain_matches.get)

        # Calcola complexity score
        word_count = len(task.split())
        complexity = min(1.0, word_count / 50.0)  # 50 parole = max complexity

        # Estrai pattern key
        pattern_key = self._extract_pattern_key(task, matched_domain)

        return TaskEmbedding(
            keywords=keywords,
            pattern_key=pattern_key,
            complexity_score=complexity,
            domain=matched_domain
        )

    def _extract_pattern_key(self, task: str, domain: str) -> str:
        """Estrae chiave pattern dal task.

        Args:
            task: Descrizione del task
            domain: Dominio identificato

        Returns:
            Chiave pattern categorizzata
        """
        task_lower = task.lower()

        # Pattern specifici per dominio
        patterns = {
            "fix": ["fix", "bug", "error", "issue", "broken"],
            "create": ["create", "add", "new", "implement", "build"],
            "update": ["update", "modify", "change", "edit"],
            "refactor": ["refactor", "clean", "improve", "optimize"],
            "test": ["test", "spec", "coverage", "unit"],
            "analyze": ["analyze", "review", "check", "audit"],
            "deploy": ["deploy", "release", "ship", "publish"],
        }

        for pattern_name, pattern_kws in patterns.items():
            if any(kw in task_lower for kw in pattern_kws):
                return f"{domain}:{pattern_name}"

        return f"{domain}:general"

    def match_patterns(self, embedding: TaskEmbedding) -> List[PatternMatch]:
        """Trova pattern matching per l'embedding.

        Args:
            embedding: Task embedding

        Returns:
            Lista di PatternMatch ordinati per confidence
        """
        matches: List[PatternMatch] = []

        with self._lock:
            # 1. Match esatto pattern key
            if embedding.pattern_key in self._pattern_history:
                seq = self._pattern_history[embedding.pattern_key]
                confidence = min(0.95, 0.6 + (seq.frequency * 0.05))
                matches.append(PatternMatch(
                    pattern_key=embedding.pattern_key,
                    confidence=confidence,
                    agents=seq.agents.copy()
                ))

            # 2. Match per dominio
            domain = embedding.domain
            if domain in self.DOMAIN_AGENT_MAPPING:
                # Confidenza base per dominio
                confidence = 0.5 + (embedding.complexity_score * 0.2)
                matches.append(PatternMatch(
                    pattern_key=f"{domain}:domain",
                    confidence=confidence,
                    agents=self.DOMAIN_AGENT_MAPPING[domain]
                ))

            # 3. Match per keyword co-occurrence
            for kw1 in embedding.keywords:
                for kw2 in embedding.keywords:
                    if kw1 < kw2:  # Evita duplicati
                        key = (kw1, kw2)
                        if key in self._keyword_cooccurrence:
                            freq = self._keyword_cooccurrence[key]
                            confidence = min(0.8, 0.3 + (freq * 0.1))
                            # Trova agent associati a queste keyword
                            agents = self._find_agents_for_keywords([kw1, kw2])
                            if agents:
                                matches.append(PatternMatch(
                                    pattern_key=f"kw:{kw1}:{kw2}",
                                    confidence=confidence,
                                    agents=agents
                                ))

        # Ordina per confidence decrescente
        matches.sort(key=lambda m: m.confidence, reverse=True)
        return matches

    def _find_agents_for_keywords(self, keywords: List[str]) -> List[str]:
        """Trova agent associati a keyword.

        Args:
            keywords: Lista di keyword

        Returns:
            Lista di agent IDs
        """
        agents: Set[str] = set()

        for agent_name, info in L2_AGENTS.items():
            for kw in keywords:
                if kw.lower() in [k.lower() for k in info.keywords]:
                    agents.add(agent_name)
                    break

        return list(agents)

    def warmup_from_keywords(self, task: str) -> List[Prediction]:
        """FIX 1: Fallback prediction basata su keyword quando AgentUsageTracker non disponibile.

        Usa il pattern recognition engine per estrarre keyword e mappare ad agent.
        Questo metodo e usato come cold start fallback.

        Args:
            task: Descrizione del task

        Returns:
            Lista di Prediction basate su keyword matching
        """
        task_lower = task.lower()
        predictions: Dict[str, Prediction] = {}

        # Cerca keyword nel task e mappa ad agent
        for keyword, agents in self.KEYWORD_AGENT_MAP.items():
            if keyword in task_lower:
                for i, agent_id in enumerate(agents):
                    if agent_id not in predictions:
                        # Primo agent ha confidence piu alta
                        confidence = 0.8 - (i * 0.1)
                        predictions[agent_id] = Prediction(
                            agent_id=agent_id,
                            confidence=confidence,
                            reason=f"Keyword match: {keyword}",
                            source="cold_start_fallback"
                        )

        # Ordina per confidence e limita
        result = sorted(
            predictions.values(),
            key=lambda p: p.confidence,
            reverse=True
        )
        return result[:5]  # Max 5 predictions

    def record_sequence(self, pattern_key: str, agents: List[str]) -> None:
        """Registra una sequenza di agent per un pattern.

        Args:
            pattern_key: Chiave del pattern
            agents: Lista di agent utilizzati
        """
        with self._lock:
            if pattern_key in self._pattern_history:
                seq = self._pattern_history[pattern_key]
                seq.frequency += 1
                seq.last_seen = time.time()
                # Aggiorna agent list mantenendo ordine
                for agent in agents:
                    if agent not in seq.agents:
                        seq.agents.append(agent)
            else:
                self._pattern_history[pattern_key] = AgentSequence(
                    pattern_key=pattern_key,
                    agents=agents.copy(),
                    frequency=1
                )

    def record_cooccurrence(self, keywords: List[str]) -> None:
        """Registra co-occurrence di keyword.

        Args:
            keywords: Lista di keyword trovate insieme
        """
        with self._lock:
            for i, kw1 in enumerate(keywords):
                for kw2 in keywords[i + 1:]:
                    key = tuple(sorted([kw1, kw2]))
                    self._keyword_cooccurrence[key] = \
                        self._keyword_cooccurrence.get(key, 0) + 1


# ============================================================================
# Predictive Agent Cache - Main Class
# ============================================================================

class PredictiveAgentCache:
    """Cache predittiva per agent L2.

    Predice quali agent saranno necessari basandosi su:
    - Pattern recognition (sequenze storiche)
    - Task embedding (keyword analysis)
    - Usage tracking (agent piu usati)
    - Confidence threshold (filtra predizioni deboli)

    Target: accuracy > 90%

    V14.1 Features:
    - Cold start handling con keyword fallback
    - Tiered storage per pattern rari
    - Distributed lock opzionale per multi-process

    Usage:
        cache = PredictiveAgentCache()
        predictions = cache.predict_next_agents("Fix bug in database query", {})
        cache.preload_agents(predictions)
        # Dopo esecuzione
        cache.record_actual_usage("Fix bug in database query", ["Database Expert"])
    """

    # Confidence threshold per predizioni
    DEFAULT_CONFIDENCE_THRESHOLD = 0.7

    # Max predizioni da restituire
    MAX_PREDICTIONS = 5

    def __init__(
        self,
        confidence_threshold: float = DEFAULT_CONFIDENCE_THRESHOLD,
        patterns_path: Optional[str] = None,
        use_tiered_storage: bool = True,
        use_distributed_lock: Optional[bool] = None
    ) -> None:
        """Inizializza la cache predittiva.

        Args:
            confidence_threshold: Soglia minima di confidenza (0.0-1.0)
            patterns_path: Path al file di storico pattern (opzionale)
            use_tiered_storage: Se True, usa TieredPatternStorage (default: True)
            use_distributed_lock: Se True, usa distributed lock.
                                  None = auto-detect da ambiente
        """
        self._confidence_threshold = confidence_threshold
        self._pattern_engine = PatternRecognitionEngine(
            use_tiered_storage=use_tiered_storage
        )
        self._usage_tracker: Optional[AgentUsageTracker] = None
        self._recent_predictions: deque = deque(maxlen=100)
        self._accuracy_history: deque = deque(maxlen=1000)
        self._patterns_path = patterns_path or str(
            Path.home() / ".claude/data/patterns.json"
        )

        # FIX 3: Distributed lock opzionale
        if use_distributed_lock is None:
            use_distributed_lock = _is_multi_process()
        self._use_distributed_lock = use_distributed_lock

        # Sostituisci RLock con DistributedLock se necessario
        if use_distributed_lock and _is_multi_process():
            self._lock: Union[DistributedLock, threading.RLock] = \
                DistributedLock("predictive_cache_lock", timeout=30.0)
        else:
            self._lock = threading.RLock()

        # Inizializza usage tracker se disponibile
        if AgentUsageTracker is not None:
            self._usage_tracker = AgentUsageTracker()

        # Carica pattern history da disco
        self._load_patterns_from_disk()

        # Contatore per gc.collect() periodico (ogni 100 chiamate)
        self._call_counter = 0
        self._gc_interval = 100

        logger.info(
            "PredictiveAgentCache initialized (threshold=%.2f, tiered=%s, distributed=%s)",
            confidence_threshold, use_tiered_storage, self._use_distributed_lock
        )

    def predict_next_agents(
        self,
        task: str,
        context: Optional[Dict[str, Any]] = None
    ) -> List[Prediction]:
        """Predice agent necessari per il task.

        Args:
            task: Descrizione del task
            context: Contesto aggiuntivo (opzionale)

        Returns:
            Lista di Prediction ordinata per confidence decrescente
        """
        context = context or {}
        predictions: Dict[str, Prediction] = {}

        # GC periodico per ridurre memoria
        self._call_counter += 1
        if self._call_counter % self._gc_interval == 0:
            gc.collect()

        # 1. Estrai embedding del task
        embedding = self._pattern_engine.extract_embedding(task)

        # 2. Trova pattern matching
        pattern_matches = self._pattern_engine.match_patterns(embedding)

        # 3. Converti pattern in predizioni
        for match in pattern_matches:
            for agent_id in match.agents:
                if agent_id not in predictions:
                    predictions[agent_id] = Prediction(
                        agent_id=agent_id,
                        confidence=match.confidence,
                        reason=f"Pattern: {match.pattern_key}",
                        source="pattern_recognition"
                    )
                else:
                    # Aggiorna confidence se piu alta
                    if match.confidence > predictions[agent_id].confidence:
                        predictions[agent_id].confidence = match.confidence

        # 4. Aggiungi predizioni da usage tracker
        if self._usage_tracker:
            predicted_agents = self._usage_tracker.predict_for_task(task)
            for i, agent_id in enumerate(predicted_agents):
                if agent_id not in predictions:
                    # Confidenza decrescente con posizione
                    confidence = 0.6 - (i * 0.1)
                    predictions[agent_id] = Prediction(
                        agent_id=agent_id,
                        confidence=confidence,
                        reason="Usage history prediction",
                        source="usage_tracker"
                    )

        # 5. Aggiungi agent da keyword diretta
        keyword_predictions = self._predict_from_keywords(embedding.keywords)
        for agent_id, pred in keyword_predictions.items():
            if agent_id not in predictions or \
               pred.confidence > predictions[agent_id].confidence:
                predictions[agent_id] = pred

        # 6. Filtra per confidence threshold
        filtered = [
            p for p in predictions.values()
            if p.confidence >= self._confidence_threshold
        ]

        # 7. Ordina per confidence e limita
        filtered.sort(key=lambda p: p.confidence, reverse=True)
        result = filtered[:self.MAX_PREDICTIONS]

        # Registra predizioni per accuracy tracking
        with self._lock:
            for pred in result:
                self._recent_predictions.append({
                    "agent_id": pred.agent_id,
                    "confidence": pred.confidence,
                    "task_pattern": embedding.pattern_key,
                    "timestamp": time.time()
                })

        logger.debug(
            "Predicted %d agents for task (threshold=%.2f)",
            len(result), self._confidence_threshold
        )

        return result

    def _predict_from_keywords(self, keywords: Set[str]) -> Dict[str, Prediction]:
        """Predice agent basandosi su keyword dirette.

        Args:
            keywords: Set di keyword estratte

        Returns:
            Dict di agent_id -> Prediction
        """
        predictions: Dict[str, Prediction] = {}

        for agent_name, info in L2_AGENTS.items():
            # Conta keyword matching
            matches = sum(
                1 for kw in keywords
                if kw.lower() in [k.lower() for k in info.keywords]
            )

            if matches > 0:
                confidence = min(0.85, 0.4 + (matches * 0.15))
                predictions[agent_name] = Prediction(
                    agent_id=agent_name,
                    confidence=confidence,
                    reason=f"Keyword match: {matches} keywords",
                    source="keyword_direct"
                )

        return predictions

    def preload_agents(self, predictions: List[Prediction]) -> int:
        """Preload agent nella cache lazy.

        Args:
            predictions: Lista di predizioni da preloadare

        Returns:
            Numero di agent preloadati con successo
        """
        if get_lazy_agent_loader is None:
            logger.warning("LazyAgentLoader not available for preloading")
            return 0

        loader = get_lazy_agent_loader()
        loaded = 0

        for pred in predictions:
            try:
                agent = loader.get_agent(pred.agent_id)
                if agent is not None:
                    loaded += 1
                    logger.debug(
                        "Preloaded agent: %s (confidence=%.2f)",
                        pred.agent_id, pred.confidence
                    )
            except Exception as e:
                logger.warning(
                    "Failed to preload agent %s: %s",
                    pred.agent_id, e
                )

        logger.info("Preloaded %d/%d predicted agents", loaded, len(predictions))
        return loaded

    def record_actual_usage(
        self,
        task: str,
        agents_used: List[str]
    ) -> None:
        """Registra utilizzo effettivo per migliorare predizioni.

        Args:
            task: Descrizione del task
            agents_used: Lista di agent effettivamente utilizzati
        """
        # Estrai embedding e pattern
        embedding = self._pattern_engine.extract_embedding(task)

        # Registra sequenza
        self._pattern_engine.record_sequence(embedding.pattern_key, agents_used)

        # Registra co-occurrence keyword
        if embedding.keywords:
            self._pattern_engine.record_cooccurrence(list(embedding.keywords))

        # Registra in usage tracker
        if self._usage_tracker:
            for agent_id in agents_used:
                self._usage_tracker.record_usage(agent_id, task)

        # Calcola accuracy per le predizioni recenti
        self._update_accuracy(embedding.pattern_key, agents_used)

        # Salva pattern su disco periodicamente
        self._save_patterns_to_disk()

        logger.debug(
            "Recorded usage: %d agents for pattern %s",
            len(agents_used), embedding.pattern_key
        )

    def _update_accuracy(self, pattern_key: str, agents_used: List[str]) -> None:
        """Aggiorna metriche di accuracy.

        Args:
            pattern_key: Chiave del pattern
            agents_used: Agent effettivamente usati
        """
        with self._lock:
            # Trova predizioni recenti per questo pattern
            recent_for_pattern = [
                p for p in self._recent_predictions
                if p["task_pattern"] == pattern_key
            ]

            if not recent_for_pattern:
                return

            # Calcola accuracy: quante predizioni erano corrette
            for pred in recent_for_pattern:
                predicted_agent = pred["agent_id"]
                was_correct = predicted_agent in agents_used
                self._accuracy_history.append({
                    "predicted": predicted_agent,
                    "actual": agents_used,
                    "correct": was_correct,
                    "confidence": pred["confidence"],
                    "timestamp": time.time()
                })

    def get_accuracy_metrics(self) -> Dict[str, Any]:
        """Calcola metriche di accuracy.

        Returns:
            Dict con metriche di accuracy
        """
        with self._lock:
            if not self._accuracy_history:
                return {
                    "total_predictions": 0,
                    "accuracy": 0.0,
                    "high_confidence_accuracy": 0.0,
                }

            total = len(self._accuracy_history)
            correct = sum(1 for h in self._accuracy_history if h["correct"])

            # Accuracy per predizioni ad alta confidenza (>0.8)
            high_conf = [h for h in self._accuracy_history if h["confidence"] > 0.8]
            high_conf_correct = sum(1 for h in high_conf if h["correct"])

            return {
                "total_predictions": total,
                "accuracy": correct / total if total > 0 else 0.0,
                "high_confidence_accuracy": (
                    high_conf_correct / len(high_conf) if high_conf else 0.0
                ),
                "high_confidence_count": len(high_conf),
                "pattern_count": len(self._pattern_engine._pattern_history),
                "cooccurrence_count": len(self._pattern_engine._keyword_cooccurrence),
            }

    def _load_patterns_from_disk(self) -> None:
        """Carica pattern history da disco."""
        try:
            path = Path(self._patterns_path)
            if not path.exists():
                logger.debug("No patterns file found at %s", path)
                return

            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)

            # Carica pattern history
            for pattern_key, seq_data in data.get("patterns", {}).items():
                self._pattern_engine._pattern_history[pattern_key] = AgentSequence(
                    pattern_key=pattern_key,
                    agents=seq_data.get("agents", []),
                    frequency=seq_data.get("frequency", 1),
                    last_seen=seq_data.get("last_seen", time.time())
                )

            # Carica co-occurrence
            for kw_pair, freq in data.get("cooccurrence", {}).items():
                kw1, kw2 = kw_pair.split("|")
                self._pattern_engine._keyword_cooccurrence[(kw1, kw2)] = freq

            logger.info(
                "Loaded %d patterns from disk",
                len(self._pattern_engine._pattern_history)
            )

        except (json.JSONDecodeError, IOError) as e:
            logger.warning("Failed to load patterns from disk: %s", e)

    def _save_patterns_to_disk(self) -> None:
        """Salva pattern history su disco."""
        try:
            path = Path(self._patterns_path)
            path.parent.mkdir(parents=True, exist_ok=True)

            with self._lock:
                # Serializza pattern history
                patterns_data = {}
                for key, seq in self._pattern_engine._pattern_history.items():
                    patterns_data[key] = {
                        "agents": seq.agents,
                        "frequency": seq.frequency,
                        "last_seen": seq.last_seen
                    }

                # Serializza co-occurrence
                cooccurrence_data = {
                    f"{kw1}|{kw2}": freq
                    for (kw1, kw2), freq in
                    self._pattern_engine._keyword_cooccurrence.items()
                }

                data = {
                    "patterns": patterns_data,
                    "cooccurrence": cooccurrence_data,
                    "version": "1.0.0",
                    "saved_at": time.time()
                }

            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)

            logger.debug("Saved %d patterns to disk", len(patterns_data))

        except IOError as e:
            logger.warning("Failed to save patterns to disk: %s", e)

    def set_confidence_threshold(self, threshold: float) -> None:
        """Imposta soglia di confidenza.

        Args:
            threshold: Nuova soglia (0.0-1.0)
        """
        self._confidence_threshold = max(0.0, min(1.0, threshold))
        logger.info("Confidence threshold set to %.2f", self._confidence_threshold)

    def get_pattern_stats(self) -> Dict[str, Any]:
        """Restituisce statistiche sui pattern.

        Returns:
            Dict con statistiche pattern
        """
        with self._lock:
            patterns = self._pattern_engine._pattern_history

            return {
                "total_patterns": len(patterns),
                "top_patterns": sorted(
                    [
                        {"key": k, "frequency": v.frequency, "agents": len(v.agents)}
                        for k, v in patterns.items()
                    ],
                    key=lambda x: x["frequency"],
                    reverse=True
                )[:10],
                "keyword_cooccurrences": len(
                    self._pattern_engine._keyword_cooccurrence
                ),
                "confidence_threshold": self._confidence_threshold,
                "recent_predictions_count": len(self._recent_predictions),
            }

    def clear_history(self) -> None:
        """Cancella tutto lo storico (per test)."""
        with self._lock:
            self._pattern_engine._pattern_history.clear()
            self._pattern_engine._keyword_cooccurrence.clear()
            self._recent_predictions.clear()
            self._accuracy_history.clear()

        # Rimuovi file da disco
        try:
            path = Path(self._patterns_path)
            if path.exists():
                path.unlink()
        except IOError:
            pass

        logger.info("Cleared all prediction history")

    def get_prediction_for_preload(self, task: str) -> List[str]:
        """Ottieni lista agent da preloadare (convenienza).

        Args:
            task: Descrizione del task

        Returns:
            Lista di agent IDs da preloadare
        """
        predictions = self.predict_next_agents(task)
        return [p.agent_id for p in predictions]


# ============================================================================
# Singleton Accessor
# ============================================================================

_predictive_cache: Optional[PredictiveAgentCache] = None
_cache_lock = threading.Lock()


def get_predictive_cache() -> PredictiveAgentCache:
    """Ottieni istanza singleton di PredictiveAgentCache.

    Returns:
        Istanza PredictiveAgentCache
    """
    global _predictive_cache

    if _predictive_cache is None:
        with _cache_lock:
            if _predictive_cache is None:
                _predictive_cache = PredictiveAgentCache()

    return _predictive_cache


def reset_predictive_cache() -> None:
    """Reset singleton (per test)."""
    global _predictive_cache

    with _cache_lock:
        if _predictive_cache is not None:
            _predictive_cache.clear_history()
            _predictive_cache = None
