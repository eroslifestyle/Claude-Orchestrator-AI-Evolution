"""Lazy Agent Loading System for Orchestrator V15.2.0.

Loads L2 specialists on-demand to reduce memory footprint and startup time.

L2 Agents (15 total):
- GUI Layout Specialist L2
- DB Query Optimizer L2
- Security Auth Specialist L2
- API Endpoint Builder L2
- Test Unit Specialist L2
- MQL Optimization L2
- Trading Risk Calculator L2
- Mobile UI Specialist L2
- N8N Workflow Builder L2
- Claude Prompt Optimizer L2
- Architect Design Specialist L2
- DevOps Pipeline Specialist L2
- Languages Refactor Specialist L2
- AI Model Specialist L2
- Social OAuth Specialist L2

Features:
- @lazy_load decorator per classi
- PredictiveAgentCache integration per preload intelligente
- Thread-safe lazy loading con import caching
- TTL-based cache invalidation
- Async I/O per file operations
- Connection pooling per disk I/O
- Preload hints per warmup intelligente
- Loading metrics e error handling migliorato

Version: V15.2.0
"""

from __future__ import annotations

import asyncio
import json
import logging
import threading
import time
import functools
import traceback
from collections import deque
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Set, TypeVar, Generic, TYPE_CHECKING

# Import PredictiveAgentCache per preload intelligente
try:
    from lib.predictive_cache import get_predictive_cache, Prediction
    PREDICTIVE_CACHE_AVAILABLE = True
except ImportError:
    PREDICTIVE_CACHE_AVAILABLE = False
    Prediction = None  # type: ignore

logger = logging.getLogger(__name__)


# =============================================================================
# LAZY LOAD DECORATOR
# =============================================================================

T = TypeVar('T')

# Global import cache per moduli caricati
_import_cache: Dict[str, Any] = {}
_import_cache_lock = threading.RLock()

# Loading metrics globali
_loading_metrics: Dict[str, Dict[str, Any]] = {
    "total_loads": 0,
    "cache_hits": 0,
    "cache_misses": 0,
    "errors": 0,
    "load_times_ms": deque(maxlen=100),  # Ultimi 100 tempi di load
}
_metrics_lock = threading.Lock()


def lazy_load(cls: type) -> type:
    """Decoratore per lazy loading di classi.

    Trasforma una classe in modo che la sua inizializzazione
    sia differita fino al primo utilizzo effettivo.

    Features:
    - Inizializzazione differita
    - Thread-safe
    - Caching automatico
    - Metriche di loading

    Example:
        @lazy_load
        class MyAgent:
            def __init__(self):
                self.expensive_resource = load_heavy_data()

        # L'init non viene chiamato qui
        agent = MyAgent
        # L'init viene chiamato qui (lazy)
        result = agent().do_something()

    Args:
        cls: Classe da decorare

    Returns:
        Classe con lazy loading
    """
    original_init = cls.__init__
    original_new = cls.__new__ if hasattr(cls, '__new__') else None

    _instance: Dict[str, Any] = {'value': None}
    _initialized = False
    _init_lock = threading.RLock()

    def __new__(cls_new, *args, **kwargs):
        """Override __new__ per singleton lazy."""
        with _init_lock:
            if _instance['value'] is None:
                _instance['value'] = object.__new__(cls_new)
            return _instance['value']

    def lazy_init(self, *args, **kwargs):
        """Init differito con metriche."""
        nonlocal _initialized

        if _initialized:
            return

        with _init_lock:
            if _initialized:
                return

            start_time = time.perf_counter()
            try:
                original_init(self, *args, **kwargs)
                _initialized = True

                # Registra metriche
                elapsed_ms = (time.perf_counter() - start_time) * 1000
                with _metrics_lock:
                    _loading_metrics["total_loads"] += 1
                    _loading_metrics["load_times_ms"].append(elapsed_ms)

            except Exception as e:
                with _metrics_lock:
                    _loading_metrics["errors"] += 1
                logger.error(
                    "Lazy load failed for %s: %s\n%s",
                    cls.__name__,
                    e,
                    traceback.format_exc()
                )
                raise

    cls.__new__ = __new__
    cls.__init__ = lazy_init

    return cls


def get_import_cache() -> Dict[str, Any]:
    """Ottiene la cache globale degli import.

    Returns:
        Dizionario con moduli cacheati
    """
    return _import_cache.copy()


def cache_import(module_name: str, obj: Any) -> None:
    """Cachea un oggetto importato.

    Args:
        module_name: Nome del modulo
        obj: Oggetto da cachare
    """
    with _import_cache_lock:
        _import_cache[module_name] = obj


def get_cached_import(module_name: str) -> Optional[Any]:
    """Ottiene un oggetto dalla cache.

    Args:
        module_name: Nome del modulo

    Returns:
        Oggetto cacheato o None
    """
    with _import_cache_lock:
        return _import_cache.get(module_name)


def get_loading_metrics() -> Dict[str, Any]:
    """Ottiene metriche di loading.

    Returns:
        Dizionario con metriche di loading
    """
    with _metrics_lock:
        metrics = _loading_metrics.copy()
        # Calcola statistiche tempi
        if _loading_metrics["load_times_ms"]:
            times = list(_loading_metrics["load_times_ms"])
            metrics["avg_load_time_ms"] = sum(times) / len(times)
            metrics["max_load_time_ms"] = max(times)
            metrics["min_load_time_ms"] = min(times)
        else:
            metrics["avg_load_time_ms"] = 0
            metrics["max_load_time_ms"] = 0
            metrics["min_load_time_ms"] = 0
        return metrics


def reset_loading_metrics() -> None:
    """Resetta le metriche di loading."""
    with _metrics_lock:
        _loading_metrics["total_loads"] = 0
        _loading_metrics["cache_hits"] = 0
        _loading_metrics["cache_misses"] = 0
        _loading_metrics["errors"] = 0
        _loading_metrics["load_times_ms"].clear()


# =============================================================================
# CONNECTION POOL PER FILE I/O
# =============================================================================

class FileIOPool:
    """Pool per operazioni file I/O asincrone.

    Converte blocking file operations in async usando asyncio.to_thread().
    Mantiene un pool di operazioni con limite concorrenza.

    Attributes:
        max_concurrent: Massimo operazioni simultanee
        _semaphore: Controllore concorrenza
        _stats: Statistiche operazioni
    """

    def __init__(self, max_concurrent: int = 5):
        """Inizializza il pool.

        Args:
            max_concurrent: Massimo operazioni I/O simultanee
        """
        self.max_concurrent = max_concurrent
        self._semaphore: Optional[asyncio.Semaphore] = None
        self._stats = {
            "total_reads": 0,
            "total_writes": 0,
            "cache_hits": 0,
            "errors": 0,
        }
        self._lock = threading.Lock()

    def _get_semaphore(self) -> asyncio.Semaphore:
        """Ottiene semaphore (lazy init per event loop)."""
        if self._semaphore is None:
            self._semaphore = asyncio.Semaphore(self.max_concurrent)
        return self._semaphore

    async def read_file(self, path: Path, encoding: str = "utf-8") -> Optional[str]:
        """Legge file in modo asincrono.

        Args:
            path: Path del file
            encoding: Encoding del file

        Returns:
            Contenuto del file o None se errore
        """
        async with self._get_semaphore():
            try:
                content = await asyncio.to_thread(
                    path.read_text, encoding=encoding
                )
                with self._lock:
                    self._stats["total_reads"] += 1
                return content
            except Exception as e:
                with self._lock:
                    self._stats["errors"] += 1
                logger.error("Error reading %s: %s", path, e)
                return None

    async def write_file(
        self, path: Path, content: str, encoding: str = "utf-8"
    ) -> bool:
        """Scrive file in modo asincrono.

        Args:
            path: Path del file
            content: Contenuto da scrivere
            encoding: Encoding del file

        Returns:
            True se successo, False altrimenti
        """
        async with self._get_semaphore():
            try:
                # Crea directory se non esiste
                await asyncio.to_thread(path.parent.mkdir, parents=True, exist_ok=True)
                await asyncio.to_thread(
                    path.write_text, content, encoding=encoding
                )
                with self._lock:
                    self._stats["total_writes"] += 1
                return True
            except Exception as e:
                with self._lock:
                    self._stats["errors"] += 1
                logger.error("Error writing %s: %s", path, e)
                return False

    def record_cache_hit(self) -> None:
        """Registra cache hit."""
        with self._lock:
            self._stats["cache_hits"] += 1

    def get_stats(self) -> Dict[str, int]:
        """Ottiene statistiche pool."""
        with self._lock:
            return self._stats.copy()


# Pool globale per file I/O
_file_io_pool: Optional[FileIOPool] = None
_pool_lock = threading.Lock()


def get_file_io_pool() -> FileIOPool:
    """Ottiene il pool I/O globale per file."""
    global _file_io_pool
    if _file_io_pool is None:
        with _pool_lock:
            if _file_io_pool is None:
                _file_io_pool = FileIOPool(max_concurrent=5)
    return _file_io_pool


# =============================================================================
# PRELOAD HINTS
# =============================================================================

@dataclass
class PreloadHint:
    """Hint per preload intelligente.

    Suggerisce quali agent precaricare basandosi su
    pattern di task storici e contesto corrente.

    Attributes:
        agent_names: Nomi agent suggeriti
        confidence: Confidenza della predizione (0.0-1.0)
        source: Fonte della predizione
        context: Contesto che ha generato l'hint
    """
    agent_names: List[str]
    confidence: float
    source: str
    context: str = ""

    def __post_init__(self) -> None:
        """Valida hint dopo init."""
        self.confidence = max(0.0, min(1.0, self.confidence))


class PreloadHintGenerator:
    """Genera hint per preload basandosi su contesto task.

    Analizza task e genera suggerimenti per precaricare
    agent L2 probabilmente necessari.

    Features:
    - Keyword matching
    - Pattern recognition
    - Parent-child relationships
    """

    # Mapping task type -> agent suggeriti
    TASK_TYPE_AGENTS: Dict[str, List[str]] = {
        "gui": ["GUI Layout Specialist L2"],
        "database": ["DB Query Optimizer L2"],
        "api": ["API Endpoint Builder L2"],
        "security": ["Security Auth Specialist L2"],
        "test": ["Test Unit Specialist L2"],
        "trading": ["MQL Optimization L2", "Trading Risk Calculator L2"],
        "mobile": ["Mobile UI Specialist L2"],
        "workflow": ["N8N Workflow Builder L2"],
        "ai": ["Claude Prompt Optimizer L2", "AI Model Specialist L2"],
        "architecture": ["Architect Design Specialist L2"],
        "devops": ["DevOps Pipeline Specialist L2"],
        "refactor": ["Languages Refactor Specialist L2"],
        "oauth": ["Social OAuth Specialist L2"],
    }

    @classmethod
    def generate_hints(cls, task: str, context: Optional[Dict[str, Any]] = None) -> List[PreloadHint]:
        """Genera hint per preload basandosi su task.

        Args:
            task: Descrizione del task
            context: Contesto aggiuntivo

        Returns:
            Lista di PreloadHint ordinati per confidenza
        """
        hints: List[PreloadHint] = []
        task_lower = task.lower()
        context = context or {}

        # 1. Task type matching
        for task_type, agents in cls.TASK_TYPE_AGENTS.items():
            if task_type in task_lower:
                hints.append(PreloadHint(
                    agent_names=agents,
                    confidence=0.8,
                    source="task_type_match",
                    context=task_type,
                ))

        # 2. Keyword matching
        keyword_matches: Dict[str, float] = {}
        for agent_name, info in L2_AGENTS.items():
            for keyword in info.keywords:
                if keyword in task_lower:
                    current = keyword_matches.get(agent_name, 0.0)
                    keyword_matches[agent_name] = max(current, 0.6)

        if keyword_matches:
            hints.append(PreloadHint(
                agent_names=list(keyword_matches.keys()),
                confidence=0.6,
                source="keyword_match",
                context=str(list(keyword_matches.keys())[:3]),
            ))

        # 3. Parent agent hint (se specificato in context)
        parent_agent = context.get("parent_agent")
        if parent_agent:
            children = LazyAgentLoader().find_by_parent(parent_agent)
            if children:
                hints.append(PreloadHint(
                    agent_names=children,
                    confidence=0.9,
                    source="parent_relationship",
                    context=parent_agent,
                ))

        # Ordina per confidenza decrescente
        hints.sort(key=lambda h: h.confidence, reverse=True)
        return hints


@dataclass
class L2AgentInfo:
    """Metadata for an L2 specialist agent."""
    name: str
    parent: str
    keywords: List[str]
    file: str
    description: str = ""


@dataclass
class LoadedAgent:
    """Container for a loaded L2 agent."""
    name: str
    parent: str
    keywords: List[str]
    content: str
    loaded_at: float
    access_count: int = 0
    last_access: float = field(default_factory=time.time)


# L2 Agent definitions with parent mapping and keywords
# Path relative to ~/.claude/agents/
L2_AGENTS: Dict[str, L2AgentInfo] = {
    "GUI Layout Specialist L2": L2AgentInfo(
        name="GUI Layout Specialist L2",
        parent="GUI Super Expert",
        keywords=["layout", "sizing", "splitter", "qt layout", "form layout",
                  "grid layout", "responsive", "stacked", "sidebar", "dashboard layout"],
        file="experts/L2/gui-layout-specialist.md",
        description="Qt layouts, sidebars, forms, and dashboards"
    ),
    "DB Query Optimizer L2": L2AgentInfo(
        name="DB Query Optimizer L2",
        parent="Database Expert",
        keywords=["query", "index", "optimize db", "slow query", "n+1",
                  "explain", "query plan", "pagination", "bulk insert", "query cache"],
        file="experts/L2/db-query-optimizer.md",
        description="Query optimization, indexing, and N+1 fixes"
    ),
    "Security Auth Specialist L2": L2AgentInfo(
        name="Security Auth Specialist L2",
        parent="Security Unified Expert",
        keywords=["auth", "jwt", "session", "login", "oauth", "mfa", "totp",
                  "password hash", "brute force", "rbac", "token refresh"],
        file="experts/L2/security-auth-specialist.md",
        description="JWT, MFA, TOTP, and session security"
    ),
    "API Endpoint Builder L2": L2AgentInfo(
        name="API Endpoint Builder L2",
        parent="Integration Expert",
        keywords=["endpoint", "route", "crud", "rest endpoint", "api route",
                  "http method", "status code", "request response", "versioning"],
        file="experts/L2/api-endpoint-builder.md",
        description="REST endpoints, CRUD, versioning"
    ),
    "Test Unit Specialist L2": L2AgentInfo(
        name="Test Unit Specialist L2",
        parent="Tester Expert",
        keywords=["unit test", "mock", "pytest", "fixture", "test coverage",
                  "assertion", "test double", "test isolation", "tdd"],
        file="experts/L2/test-unit-specialist.md",
        description="pytest, mocking, fixtures, TDD"
    ),
    "MQL Optimization L2": L2AgentInfo(
        name="MQL Optimization L2",
        parent="MQL Expert",
        keywords=["optimize ea", "ea memory", "tick processing", "ea performance",
                  "mql profiler", "backtest optimization", "ea latency"],
        file="experts/L2/mql-optimization.md",
        description="EA performance, memory, tick processing"
    ),
    "Trading Risk Calculator L2": L2AgentInfo(
        name="Trading Risk Calculator L2",
        parent="Trading Strategy Expert",
        keywords=["risk", "position size", "kelly criterion", "risk management",
                  "lot size", "drawdown", "risk per trade", "exposure"],
        file="experts/L2/trading-risk-calculator.md",
        description="Position sizing, Kelly criterion"
    ),
    "Mobile UI Specialist L2": L2AgentInfo(
        name="Mobile UI Specialist L2",
        parent="Mobile Expert",
        keywords=["mobile ui", "responsive mobile", "flutter layout", "react native layout",
                  "mobile navigation", "gesture", "mobile form"],
        file="experts/L2/mobile-ui-specialist.md",
        description="Flutter/React Native layouts"
    ),
    "N8N Workflow Builder L2": L2AgentInfo(
        name="N8N Workflow Builder L2",
        parent="N8N Expert",
        keywords=["workflow builder", "n8n node", "workflow error", "n8n trigger",
                  "workflow pattern", "n8n connection"],
        file="experts/L2/n8n-workflow-builder.md",
        description="Workflow design, error handling"
    ),
    "Claude Prompt Optimizer L2": L2AgentInfo(
        name="Claude Prompt Optimizer L2",
        parent="Claude Systems Expert",
        keywords=["prompt optimize", "token optimization", "prompt engineering",
                  "context window", "prompt compression", "few-shot"],
        file="experts/L2/claude-prompt-optimizer.md",
        description="Prompt engineering, token optimization"
    ),
    "Architect Design Specialist L2": L2AgentInfo(
        name="Architect Design Specialist L2",
        parent="Architect Expert",
        keywords=["design pattern", "solid", "ddd", "clean architecture",
                  "microservice pattern", "architectural decision"],
        file="experts/L2/architect-design-specialist.md",
        description="Design patterns, SOLID, DDD"
    ),
    "DevOps Pipeline Specialist L2": L2AgentInfo(
        name="DevOps Pipeline Specialist L2",
        parent="DevOps Expert",
        keywords=["pipeline", "github actions", "ci cd pipeline", "deployment pipeline",
                  "build pipeline", "release pipeline"],
        file="experts/L2/devops-pipeline-specialist.md",
        description="CI/CD pipelines, GitHub Actions"
    ),
    "Languages Refactor Specialist L2": L2AgentInfo(
        name="Languages Refactor Specialist L2",
        parent="Languages Expert",
        keywords=["refactor", "clean code", "code smell", "technical debt",
                  "extract method", "rename", "simplify"],
        file="experts/L2/languages-refactor-specialist.md",
        description="Refactoring patterns, clean code"
    ),
    "AI Model Specialist L2": L2AgentInfo(
        name="AI Model Specialist L2",
        parent="AI Integration Expert",
        keywords=["model selection", "rag", "embeddings", "vector store",
                  "llm fine-tuning", "prompt template"],
        file="experts/L2/ai-model-specialist.md",
        description="Model selection, RAG, embeddings"
    ),
    "Social OAuth Specialist L2": L2AgentInfo(
        name="Social OAuth Specialist L2",
        parent="Social Identity Expert",
        keywords=["oauth2 flow", "provider integration", "social login", "google oauth",
                  "facebook login", "apple sign in", "oidc"],
        file="experts/L2/social-oauth-specialist.md",
        description="OAuth2 flows, provider integration"
    ),
}

# Inverted index: keyword -> agent names (for O(1) lookup)
_KEYWORD_INDEX: Dict[str, Set[str]] = {}


def _build_keyword_index() -> None:
    """Build inverted index for fast keyword-to-agent lookup."""
    global _KEYWORD_INDEX
    _KEYWORD_INDEX = {}

    for agent_name, info in L2_AGENTS.items():
        for keyword in info.keywords:
            kw_lower = keyword.lower()
            if kw_lower not in _KEYWORD_INDEX:
                _KEYWORD_INDEX[kw_lower] = set()
            _KEYWORD_INDEX[kw_lower].add(agent_name)


# Build index at module load
_build_keyword_index()


class AgentUsageTracker:
    """Traccia utilizzo agent per preload predittivo.

    Mantiene storico utilizzo per predire quali agent L2 saranno
    necessari in base al pattern del task corrente.

    Features:
    - Usage counts per agent
    - Recent agents deque (ultimi 20)
    - Session patterns (task type -> agents usati)
    - Persistenza su disco
    """

    def __init__(self, db_path: Optional[str] = None):
        """Initialize tracker with optional custom db path.

        Args:
            db_path: Path to usage database file
        """
        self._usage_counts: Dict[str, int] = {}
        self._recent_agents: deque = deque(maxlen=20)
        self._session_patterns: Dict[str, List[str]] = {}
        self._lock = threading.Lock()
        self._db_path = db_path or str(Path.home() / ".claude/data/agent_usage.json")
        self._load_from_disk()

    def record_usage(self, agent_name: str, task_pattern: str) -> None:
        """Registra utilizzo di un agent.

        Args:
            agent_name: Nome dell'agent utilizzato
            task_pattern: Pattern/contesto del task
        """
        with self._lock:
            self._usage_counts[agent_name] = self._usage_counts.get(agent_name, 0) + 1
            self._recent_agents.append(agent_name)

            pattern_key = self._extract_pattern_key(task_pattern)
            if pattern_key not in self._session_patterns:
                self._session_patterns[pattern_key] = []
            if agent_name not in self._session_patterns[pattern_key]:
                self._session_patterns[pattern_key].append(agent_name)

    def predict_for_task(self, task: str) -> List[str]:
        """Predice agent necessari basandosi sul task.

        Args:
            task: Descrizione del task

        Returns:
            Lista di agent L2 predetti come necessari
        """
        pattern_key = self._extract_pattern_key(task)

        predictions = set()

        # 1. Agent usati per pattern simili
        if pattern_key in self._session_patterns:
            predictions.update(self._session_patterns[pattern_key])

        # 2. Agent usati di recente (ultimi 5)
        predictions.update(list(self._recent_agents)[-5:])

        # 3. Agent piu usati in assoluto (top 3)
        top_agents = sorted(
            self._usage_counts.items(),
            key=lambda x: x[1],
            reverse=True
        )[:3]
        predictions.update(agent for agent, _ in top_agents)

        # Filtra solo L2 agents
        return [a for a in predictions if a in L2_AGENTS]

    def _extract_pattern_key(self, task: str) -> str:
        """Estrae chiave pattern dal task.

        Args:
            task: Descrizione del task

        Returns:
            Chiave pattern categorizzata
        """
        task_lower = task.lower()

        patterns = {
            'database': ['database', 'sql', 'query', 'schema'],
            'api': ['api', 'rest', 'endpoint', 'http'],
            'security': ['auth', 'jwt', 'security', 'password'],
            'testing': ['test', 'pytest', 'mock', 'coverage'],
            'gui': ['gui', 'qt', 'ui', 'widget'],
            'devops': ['deploy', 'pipeline', 'ci', 'cd'],
        }

        for key, keywords in patterns.items():
            if any(kw in task_lower for kw in keywords):
                return key

        return 'general'

    def _load_from_disk(self) -> None:
        """Carica storico da disco (blocking, chiamato solo in __init__)."""
        try:
            path = Path(self._db_path)
            if path.exists():
                data = json.loads(path.read_text(encoding="utf-8"))
                self._usage_counts = data.get('usage_counts', {})
                self._session_patterns = data.get('patterns', {})
        except (json.JSONDecodeError, IOError) as e:
            logger.debug("Could not load agent usage data: %s", e)

    async def load_from_disk_async(self) -> None:
        """Carica storico da disco in modo asincrono.

        Usa asyncio.to_thread per evitare blocking I/O.
        """
        try:
            path = Path(self._db_path)

            def _read_file() -> str:
                if path.exists():
                    return path.read_text(encoding="utf-8")
                return "{}"

            content = await asyncio.to_thread(_read_file)
            data = json.loads(content)
            with self._lock:
                self._usage_counts = data.get('usage_counts', {})
                self._session_patterns = data.get('patterns', {})
        except (json.JSONDecodeError, IOError) as e:
            logger.debug("Could not load agent usage data async: %s", e)

    def save_to_disk(self) -> None:
        """Salva storico su disco (blocking, per compatibilita)."""
        path = Path(self._db_path)
        path.parent.mkdir(parents=True, exist_ok=True)

        with self._lock:
            data = {
                'usage_counts': self._usage_counts,
                'patterns': self._session_patterns,
            }
            try:
                path.write_text(json.dumps(data, indent=2), encoding="utf-8")
            except IOError as e:
                logger.warning("Could not save agent usage data: %s", e)

    async def save_to_disk_async(self) -> None:
        """Salva storico su disco in modo asincrono.

        Usa asyncio.to_thread per evitare blocking I/O.
        """
        path = Path(self._db_path)

        def _ensure_dir() -> None:
            path.parent.mkdir(parents=True, exist_ok=True)

        await asyncio.to_thread(_ensure_dir)

        with self._lock:
            data = {
                'usage_counts': self._usage_counts,
                'patterns': self._session_patterns,
            }

        def _write_file() -> None:
            path.write_text(json.dumps(data, indent=2), encoding="utf-8")

        try:
            await asyncio.to_thread(_write_file)
        except IOError as e:
            logger.warning("Could not save agent usage data async: %s", e)

    def get_stats(self) -> Dict[str, Any]:
        """Get tracker statistics.

        Returns:
            Dictionary with tracker stats
        """
        with self._lock:
            return {
                "total_agents_tracked": len(self._usage_counts),
                "recent_agents_count": len(self._recent_agents),
                "pattern_count": len(self._session_patterns),
                "top_agents": sorted(
                    self._usage_counts.items(),
                    key=lambda x: x[1],
                    reverse=True
                )[:5],
            }


class LazyAgentLoader:
    """Lazy loader for L2 specialist agents with thread-safe caching.

    Features:
    - On-demand loading (only when agent is needed)
    - Thread-safe loading with per-agent locks
    - LRU-style unloading for memory management
    - Keyword-based agent discovery
    - Parent agent mapping for fallback routing
    - Async I/O per file operations
    - Preload hints per warmup intelligente

    Usage:
        loader = LazyAgentLoader()
        agent = loader.get_agent("GUI Layout Specialist L2")
        if agent:
            print(agent.content)

        # Async version
        agent = await loader.get_agent_async("GUI Layout Specialist L2")
    """

    _instance = None
    _lock = threading.RLock()

    def __new__(cls) -> "LazyAgentLoader":
        """Singleton pattern with thread-safe initialization."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self) -> None:
        """Initialize the lazy loader (only once)."""
        if self._initialized:
            return

        self._initialized = True
        self._loaded_agents: Dict[str, LoadedAgent] = {}
        self._load_locks: Dict[str, threading.Lock] = {}
        self._async_locks: Dict[str, asyncio.Lock] = {}
        self._agents_path = Path.home() / ".claude/agents"
        self._access_order: List[str] = []  # For LRU tracking
        self._max_loaded = 10  # Max agents to keep loaded
        self._usage_tracker = AgentUsageTracker()
        self._preload_complete = False
        self._preload_hints: List[PreloadHint] = []

        # V15.2.0: Loading metrics
        self._load_metrics: Dict[str, Dict[str, Any]] = {
            "loads": 0,
            "cache_hits": 0,
            "cache_misses": 0,
            "errors": 0,
            "evictions": 0,
            "load_times": deque(maxlen=100),
        }

        logger.debug("LazyAgentLoader initialized with %d L2 agents", len(L2_AGENTS))

    def get_agent(self, agent_name: str, task_context: str = "") -> Optional[LoadedAgent]:
        """Get agent definition, loading lazily if L2.

        V15.2.0: Aggiunto tracking metriche e error handling migliorato.

        Args:
            agent_name: Name of the agent to load
            task_context: Optional task context for usage tracking

        Returns:
            LoadedAgent if found and loaded, None otherwise
        """
        # Check if L2 agent
        if agent_name not in L2_AGENTS:
            return None

        # Check if already loaded (cache hit)
        if agent_name in self._loaded_agents:
            agent = self._loaded_agents[agent_name]
            agent.access_count += 1
            agent.last_access = time.time()
            # Update LRU order
            if agent_name in self._access_order:
                self._access_order.remove(agent_name)
            self._access_order.append(agent_name)
            # Track cache hit
            self._load_metrics["cache_hits"] += 1
            return agent

        # Cache miss - need to load
        self._load_metrics["cache_misses"] += 1

        # Get or create per-agent lock
        if agent_name not in self._load_locks:
            with self._lock:
                if agent_name not in self._load_locks:
                    self._load_locks[agent_name] = threading.Lock()

        # Load with lock
        with self._load_locks[agent_name]:
            # Double-check after acquiring lock
            if agent_name in self._loaded_agents:
                return self._loaded_agents[agent_name]

            # Load agent definition
            agent_info = L2_AGENTS[agent_name]
            agent_file = self._agents_path / agent_info.file

            if not agent_file.exists():
                logger.warning("L2 agent file not found: %s", agent_file)
                self._load_metrics["errors"] += 1
                return None

            # V15.2.0: Track load time
            start_time = time.perf_counter()

            try:
                content = agent_file.read_text(encoding="utf-8")
                loaded = LoadedAgent(
                    name=agent_name,
                    parent=agent_info.parent,
                    keywords=agent_info.keywords,
                    content=content,
                    loaded_at=time.time(),
                    access_count=1,
                    last_access=time.time()
                )
                self._loaded_agents[agent_name] = loaded
                self._access_order.append(agent_name)

                # Track load time
                elapsed_ms = (time.perf_counter() - start_time) * 1000
                self._load_metrics["load_times"].append(elapsed_ms)
                self._load_metrics["loads"] += 1

                # Enforce max loaded limit (LRU eviction)
                self._evict_if_needed()

                logger.debug("Lazily loaded L2 agent: %s (%.2f ms)", agent_name, elapsed_ms)

                # Track usage after successful load
                if task_context:
                    self.record_task_usage(agent_name, task_context)

                # V15.2.0: Cache import for reuse
                cache_import(f"agent:{agent_name}", loaded)

                return loaded

            except UnicodeDecodeError as e:
                self._load_metrics["errors"] += 1
                logger.error(
                    "Encoding error loading L2 agent %s: %s\n%s",
                    agent_name,
                    e,
                    traceback.format_exc()
                )
                return None
            except IOError as e:
                self._load_metrics["errors"] += 1
                logger.error(
                    "IO error loading L2 agent %s: %s\n%s",
                    agent_name,
                    e,
                    traceback.format_exc()
                )
                return None
            except Exception as e:
                self._load_metrics["errors"] += 1
                logger.error(
                    "Unexpected error loading L2 agent %s: %s\n%s",
                    agent_name,
                    e,
                    traceback.format_exc()
                )
                return None

    async def get_agent_async(self, agent_name: str, task_context: str = "") -> Optional[LoadedAgent]:
        """Get agent definition async, loading lazily with async I/O.

        V15.2.0: Aggiunto tracking metriche e error handling migliorato.

        Args:
            agent_name: Name of the agent to load
            task_context: Optional task context for usage tracking

        Returns:
            LoadedAgent if found and loaded, None otherwise
        """
        # Check if L2 agent
        if agent_name not in L2_AGENTS:
            return None

        # Check if already loaded (cache hit)
        if agent_name in self._loaded_agents:
            agent = self._loaded_agents[agent_name]
            agent.access_count += 1
            agent.last_access = time.time()
            # Update LRU order
            if agent_name in self._access_order:
                self._access_order.remove(agent_name)
            self._access_order.append(agent_name)
            # Track cache hit
            self._load_metrics["cache_hits"] += 1
            return agent

        # Cache miss - need to load
        self._load_metrics["cache_misses"] += 1

        # Get or create per-agent async lock
        if agent_name not in self._async_locks:
            with self._lock:
                if agent_name not in self._async_locks:
                    self._async_locks[agent_name] = asyncio.Lock()

        # Load with async lock
        async with self._async_locks[agent_name]:
            # Double-check after acquiring lock
            if agent_name in self._loaded_agents:
                return self._loaded_agents[agent_name]

            agent_info = L2_AGENTS[agent_name]
            agent_file = self._agents_path / agent_info.file

            if not agent_file.exists():
                logger.warning("L2 agent file not found: %s", agent_file)
                self._load_metrics["errors"] += 1
                return None

            # V15.2.0: Track load time
            start_time = time.perf_counter()

            try:
                # Async file read
                def _read_file() -> str:
                    return agent_file.read_text(encoding="utf-8")

                content = await asyncio.to_thread(_read_file)

                loaded = LoadedAgent(
                    name=agent_name,
                    parent=agent_info.parent,
                    keywords=agent_info.keywords,
                    content=content,
                    loaded_at=time.time(),
                    access_count=1,
                    last_access=time.time()
                )
                self._loaded_agents[agent_name] = loaded
                self._access_order.append(agent_name)

                # Track load time
                elapsed_ms = (time.perf_counter() - start_time) * 1000
                self._load_metrics["load_times"].append(elapsed_ms)
                self._load_metrics["loads"] += 1

                # Enforce max loaded limit (LRU eviction)
                self._evict_if_needed()

                logger.debug("Lazily loaded L2 agent (async): %s (%.2f ms)", agent_name, elapsed_ms)

                # Track usage after successful load
                if task_context:
                    self.record_task_usage(agent_name, task_context)

                # V15.2.0: Cache import for reuse
                cache_import(f"agent:{agent_name}", loaded)

                return loaded

            except UnicodeDecodeError as e:
                self._load_metrics["errors"] += 1
                logger.error(
                    "Encoding error loading L2 agent %s (async): %s\n%s",
                    agent_name,
                    e,
                    traceback.format_exc()
                )
                return None
            except IOError as e:
                self._load_metrics["errors"] += 1
                logger.error(
                    "IO error loading L2 agent %s (async): %s\n%s",
                    agent_name,
                    e,
                    traceback.format_exc()
                )
                return None
            except Exception as e:
                self._load_metrics["errors"] += 1
                logger.error(
                    "Unexpected error loading L2 agent %s (async): %s\n%s",
                    agent_name,
                    e,
                    traceback.format_exc()
                )
                return None

    def warmup_for_task(self, task: str, context: Optional[Dict[str, Any]] = None) -> int:
        """Warmup cache basandosi su predizione task usando PredictiveAgentCache.

        Chiamato durante Step 0-3 dell'orchestrator per precaricare
        agent L2 probabilmente necessari.

        V13.2: Integra PredictiveAgentCache per predizioni piu accurate.

        Args:
            task: Descrizione del task
            context: Contesto aggiuntivo opzionale

        Returns:
            Count of successfully loaded agents
        """
        if self._preload_complete:
            return 0

        loaded = 0
        context = context or {}

        # 1. Usa PreloadHint se disponibili (V15.1.1)
        if self._preload_hints:
            agent_names = set()
            for hint in self._preload_hints:
                agent_names.update(hint.agent_names)
            loaded = self.preload_agents(list(agent_names))
            self._preload_hints.clear()
            logger.debug("Warmup from PreloadHints: loaded %d agents", loaded)

        # 2. Usa PredictiveAgentCache se disponibile (V13.2)
        if PREDICTIVE_CACHE_AVAILABLE and loaded == 0:
            cache = get_predictive_cache()
            predictions = cache.predict_next_agents(task, context)

            for pred in predictions:
                # Forza caricamento se non gia in cache
                if pred.agent_id in L2_AGENTS and pred.agent_id not in self._loaded_agents:
                    agent = self._load_agent_internal(pred.agent_id)
                    if agent is not None:
                        loaded += 1
                        logger.debug(
                            "Preloaded agent from prediction: %s (confidence=%.2f, source=%s)",
                            pred.agent_id, pred.confidence, pred.source
                        )

            logger.debug("Warmup from PredictiveAgentCache: loaded %d agents", loaded)

        # 3. Fallback: usa AgentUsageTracker interno (V13.1 behavior)
        if loaded == 0:
            predicted = self._usage_tracker.predict_for_task(task)
            loaded = self.preload_agents(predicted)

            # Aggiungi agent correlati per keyword
            task_keywords = self._extract_keywords_from_task(task)
            loaded += self.preload_by_keywords(task_keywords)

            logger.debug("Warmup from AgentUsageTracker: loaded %d agents", loaded)

        self._preload_complete = True
        logger.info("Warmup complete: loaded %d agents for task", loaded)
        return loaded

    async def warmup_for_task_async(self, task: str, context: Optional[Dict[str, Any]] = None) -> int:
        """Warmup cache async basandosi su predizione task.

        Versione asincrona di warmup_for_task con async I/O.

        Args:
            task: Descrizione del task
            context: Contesto aggiuntivo opzionale

        Returns:
            Count of successfully loaded agents
        """
        if self._preload_complete:
            return 0

        loaded = 0
        context = context or {}

        # Genera preload hints
        hints = PreloadHint.generate_hints(task, context)
        agent_names = set()
        for hint in hints:
            agent_names.update(hint.agent_names)

        # Carica agent in parallelo con async I/O
        load_tasks = [
            self.get_agent_async(name, task)
            for name in agent_names
            if name in L2_AGENTS and name not in self._loaded_agents
        ]

        if load_tasks:
            results = await asyncio.gather(*load_tasks, return_exceptions=True)
            loaded = sum(1 for r in results if isinstance(r, LoadedAgent))

        self._preload_complete = True
        logger.info("Warmup async complete: loaded %d agents for task", loaded)
        return loaded

    def add_preload_hint(self, hint: PreloadHint) -> None:
        """Aggiunge hint per preload.

        Args:
            hint: PreloadHint con agent names e confidenza
        """
        self._preload_hints.append(hint)

    def set_preload_hints(self, hints: List[PreloadHint]) -> None:
        """Imposta lista di hint per preload.

        Args:
            hints: Lista di PreloadHint
        """
        self._preload_hints = hints.copy()

    def _load_agent_internal(self, agent_name: str) -> Optional[LoadedAgent]:
        """Carica agent senza lock esterno (uso interno).

        Args:
            agent_name: Nome dell'agent da caricare

        Returns:
            LoadedAgent se caricato con successo, None altrimenti
        """
        # Verifica che sia un L2 agent
        if agent_name not in L2_AGENTS:
            return None

        # Ottieni o crea lock per-agent
        if agent_name not in self._load_locks:
            with self._lock:
                if agent_name not in self._load_locks:
                    self._load_locks[agent_name] = threading.Lock()

        # Carica con lock
        with self._load_locks[agent_name]:
            # Double-check dopo acquisizione lock
            if agent_name in self._loaded_agents:
                return self._loaded_agents[agent_name]

            agent_info = L2_AGENTS[agent_name]
            agent_file = self._agents_path / agent_info.file

            if not agent_file.exists():
                logger.warning("L2 agent file not found: %s", agent_file)
                return None

            try:
                content = agent_file.read_text(encoding="utf-8")
                loaded = LoadedAgent(
                    name=agent_name,
                    parent=agent_info.parent,
                    keywords=agent_info.keywords,
                    content=content,
                    loaded_at=time.time(),
                    access_count=1,
                    last_access=time.time()
                )
                self._loaded_agents[agent_name] = loaded
                self._access_order.append(agent_name)

                # Enforce max loaded limit (LRU eviction)
                self._evict_if_needed()

                return loaded

            except Exception as e:
                logger.error("Failed to load L2 agent %s: %s", agent_name, e)
                return None

    async def _load_agent_internal_async(self, agent_name: str) -> Optional[LoadedAgent]:
        """Carica agent async senza lock esterno (uso interno).

        Args:
            agent_name: Nome dell'agent da caricare

        Returns:
            LoadedAgent se caricato con successo, None altrimenti
        """
        # Verifica che sia un L2 agent
        if agent_name not in L2_AGENTS:
            return None

        # Ottieni o crea async lock per-agent
        if agent_name not in self._async_locks:
            with self._lock:
                if agent_name not in self._async_locks:
                    self._async_locks[agent_name] = asyncio.Lock()

        # Carica con async lock
        async with self._async_locks[agent_name]:
            # Double-check dopo acquisizione lock
            if agent_name in self._loaded_agents:
                return self._loaded_agents[agent_name]

            agent_info = L2_AGENTS[agent_name]
            agent_file = self._agents_path / agent_info.file

            if not agent_file.exists():
                logger.warning("L2 agent file not found: %s", agent_file)
                return None

            try:
                # Async file read
                def _read_file() -> str:
                    return agent_file.read_text(encoding="utf-8")

                content = await asyncio.to_thread(_read_file)

                loaded = LoadedAgent(
                    name=agent_name,
                    parent=agent_info.parent,
                    keywords=agent_info.keywords,
                    content=content,
                    loaded_at=time.time(),
                    access_count=1,
                    last_access=time.time()
                )
                self._loaded_agents[agent_name] = loaded
                self._access_order.append(agent_name)

                # Enforce max loaded limit (LRU eviction)
                self._evict_if_needed()

                return loaded

            except Exception as e:
                logger.error("Failed to load L2 agent %s (async internal): %s", agent_name, e)
                return None

    def record_task_usage(self, agent_name: str, task: str) -> None:
        """Registra utilizzo agent per future predizioni.

        Args:
            agent_name: Nome dell'agent utilizzato
            task: Contesto del task
        """
        self._usage_tracker.record_usage(agent_name, task)

    def _extract_keywords_from_task(self, task: str) -> List[str]:
        """Estrae keyword rilevanti dal task.

        Args:
            task: Descrizione del task

        Returns:
            Lista di keyword trovate nel task
        """
        keywords = []
        task_lower = task.lower()

        for agent_name, info in L2_AGENTS.items():
            for kw in info.keywords:
                if kw in task_lower:
                    keywords.append(kw)

        return keywords

    def save_usage_data(self) -> None:
        """Salva dati utilizzo su disco."""
        self._usage_tracker.save_to_disk()

    def reset_preload_flag(self) -> None:
        """Reset preload flag for new session."""
        self._preload_complete = False

    def _evict_if_needed(self) -> None:
        """Evict least recently used agents if over limit.

        V15.2.0: Aggiunto tracking evizioni nelle metriche.
        """
        while len(self._loaded_agents) > self._max_loaded and self._access_order:
            lru_agent = self._access_order.pop(0)
            if lru_agent in self._loaded_agents:
                del self._loaded_agents[lru_agent]
                self._load_metrics["evictions"] += 1
                logger.debug("Evicted L2 agent (LRU): %s", lru_agent)

    def find_by_keyword(self, keyword: str) -> List[str]:
        """Find L2 agents matching a keyword.

        Args:
            keyword: Keyword to search for

        Returns:
            List of matching agent names
        """
        kw_lower = keyword.lower()
        matches = []

        # Direct keyword match
        if kw_lower in _KEYWORD_INDEX:
            matches.extend(_KEYWORD_INDEX[kw_lower])

        # Partial match in keywords
        for agent_name, info in L2_AGENTS.items():
            if agent_name not in matches:
                for kw in info.keywords:
                    if kw_lower in kw.lower():
                        matches.append(agent_name)
                        break

        return matches

    def find_by_parent(self, parent_name: str) -> List[str]:
        """Find L2 agents belonging to a parent expert.

        Args:
            parent_name: Name of the parent L1 expert

        Returns:
            List of L2 agent names with this parent
        """
        matches = []
        for agent_name, info in L2_AGENTS.items():
            if info.parent == parent_name:
                matches.append(agent_name)
        return matches

    def preload_agents(self, agent_names: List[str]) -> int:
        """Preload specified agents (sync version).

        Args:
            agent_names: List of agent names to preload

        Returns:
            Count of successfully loaded agents
        """
        loaded = 0
        for name in agent_names:
            if self.get_agent(name) is not None:
                loaded += 1
        return loaded

    async def preload_agents_async(self, agent_names: List[str]) -> int:
        """Preload specified agents in parallel (async version).

        Args:
            agent_names: List of agent names to preload

        Returns:
            Count of successfully loaded agents
        """
        load_tasks = [
            self.get_agent_async(name)
            for name in agent_names
            if name in L2_AGENTS
        ]
        if not load_tasks:
            return 0

        results = await asyncio.gather(*load_tasks, return_exceptions=True)
        return sum(1 for r in results if isinstance(r, LoadedAgent))

    def preload_by_keywords(self, keywords: List[str]) -> int:
        """Preload agents matching any of the given keywords (sync).

        Args:
            keywords: Keywords to match

        Returns:
            Count of successfully loaded agents
        """
        agent_names = set()
        for kw in keywords:
            agent_names.update(self.find_by_keyword(kw))
        return self.preload_agents(list(agent_names))

    async def preload_by_keywords_async(self, keywords: List[str]) -> int:
        """Preload agents matching keywords in parallel (async).

        Args:
            keywords: Keywords to match

        Returns:
            Count of successfully loaded agents
        """
        agent_names = set()
        for kw in keywords:
            agent_names.update(self.find_by_keyword(kw))
        return await self.preload_agents_async(list(agent_names))

    def get_loaded_count(self) -> int:
        """Get count of currently loaded L2 agents."""
        return len(self._loaded_agents)

    def get_loaded_agents(self) -> List[str]:
        """Get names of currently loaded agents."""
        return list(self._loaded_agents.keys())

    def get_metrics(self) -> Dict[str, Any]:
        """Ottiene metriche di loading del loader.

        V15.2.0: Metodo nuovo per esporre metriche complete.

        Returns:
            Dizionario con metriche di loading
        """
        metrics = self._load_metrics.copy()

        # Calcola statistiche tempi
        if self._load_metrics["load_times"]:
            times = list(self._load_metrics["load_times"])
            metrics["avg_load_time_ms"] = sum(times) / len(times)
            metrics["max_load_time_ms"] = max(times)
            metrics["min_load_time_ms"] = min(times)
        else:
            metrics["avg_load_time_ms"] = 0
            metrics["max_load_time_ms"] = 0
            metrics["min_load_time_ms"] = 0

        # Aggiungi info cache
        metrics["cache_hit_rate"] = (
            self._load_metrics["cache_hits"] /
            max(1, self._load_metrics["cache_hits"] + self._load_metrics["cache_misses"])
        )
        metrics["current_loaded"] = len(self._loaded_agents)
        metrics["max_loaded"] = self._max_loaded

        # Rimuovi deque (non serializzabile)
        metrics.pop("load_times", None)

        return metrics

    def reset_metrics(self) -> None:
        """Resetta le metriche di loading.

        V15.2.0: Metodo nuovo per reset metriche.
        """
        self._load_metrics = {
            "loads": 0,
            "cache_hits": 0,
            "cache_misses": 0,
            "errors": 0,
            "evictions": 0,
            "load_times": deque(maxlen=100),
        }

    def unload_agent(self, agent_name: str) -> bool:
        """Unload an L2 agent to free memory.

        Args:
            agent_name: Name of agent to unload

        Returns:
            True if unloaded, False if not loaded
        """
        if agent_name in self._loaded_agents:
            del self._loaded_agents[agent_name]
            if agent_name in self._access_order:
                self._access_order.remove(agent_name)
            logger.debug("Unloaded L2 agent: %s", agent_name)
            return True
        return False

    def unload_all(self) -> int:
        """Unload all loaded L2 agents.

        Returns:
            Count of unloaded agents
        """
        count = len(self._loaded_agents)
        self._loaded_agents.clear()
        self._access_order.clear()
        logger.debug("Unloaded all %d L2 agents", count)
        return count

    def get_parent_agent(self, agent_name: str) -> Optional[str]:
        """Get parent L1 agent for an L2 specialist.

        Args:
            agent_name: Name of L2 agent

        Returns:
            Parent agent name or None
        """
        if agent_name in L2_AGENTS:
            return L2_AGENTS[agent_name].parent
        return None

    def get_agent_keywords(self, agent_name: str) -> List[str]:
        """Get keywords for an L2 agent.

        Args:
            agent_name: Name of L2 agent

        Returns:
            List of keywords or empty list
        """
        if agent_name in L2_AGENTS:
            return L2_AGENTS[agent_name].keywords.copy()
        return []

    def get_stats(self) -> Dict[str, Any]:
        """Get loader statistics.

        Returns:
            Dictionary with loader stats
        """
        return {
            "total_l2_agents": len(L2_AGENTS),
            "loaded_count": len(self._loaded_agents),
            "max_loaded": self._max_loaded,
            "loaded_agents": list(self._loaded_agents.keys()),
            "lru_order": self._access_order.copy(),
            "keyword_index_size": len(_KEYWORD_INDEX),
            "preload_complete": self._preload_complete,
            "preload_hints_count": len(self._preload_hints),
            "usage_tracker": self._usage_tracker.get_stats(),
        }


# Singleton accessor
def get_lazy_agent_loader() -> LazyAgentLoader:
    """Get the singleton LazyAgentLoader instance."""
    return LazyAgentLoader()


# Utility functions for direct access
def is_l2_agent(agent_name: str) -> bool:
    """Check if an agent is an L2 specialist."""
    return agent_name in L2_AGENTS


def get_all_l2_agents() -> Dict[str, L2AgentInfo]:
    """Get all L2 agent definitions."""
    return L2_AGENTS.copy()


def find_l2_by_keyword(keyword: str) -> List[str]:
    """Find L2 agents by keyword (convenience function)."""
    return get_lazy_agent_loader().find_by_keyword(keyword)


# Async utility functions
async def load_agent_async(agent_name: str, task_context: str = "") -> Optional[LoadedAgent]:
    """Load an L2 agent asynchronously.

    Args:
        agent_name: Name of the agent to load
        task_context: Optional task context for usage tracking

    Returns:
        LoadedAgent if found and loaded, None otherwise
    """
    return await get_lazy_agent_loader().get_agent_async(agent_name, task_context)


async def warmup_agents_async(task: str, context: Optional[Dict[str, Any]] = None) -> int:
    """Warmup agents for a task asynchronously.

    Args:
        task: Task description
        context: Optional additional context

    Returns:
        Count of successfully loaded agents
    """
    return await get_lazy_agent_loader().warmup_for_task_async(task, context)


# =============================================================================
# PUBLIC API
# =============================================================================

__all__ = [
    # Data classes
    "L2AgentInfo",
    "LoadedAgent",
    "PreloadHint",
    # Main classes
    "LazyAgentLoader",
    "AgentUsageTracker",
    # V15.2.0: Decorators
    "lazy_load",
    # Singleton
    "get_lazy_agent_loader",
    # V15.2.0: Import caching
    "get_import_cache",
    "cache_import",
    "get_cached_import",
    # V15.2.0: Loading metrics
    "get_loading_metrics",
    "reset_loading_metrics",
    # Utility functions
    "is_l2_agent",
    "get_all_l2_agents",
    "find_l2_by_keyword",
    # Async utilities
    "load_agent_async",
    "warmup_agents_async",
    # Constants
    "L2_AGENTS",
]
