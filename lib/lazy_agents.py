"""Lazy Agent Loading System for Orchestrator V14.0.3.

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
- PredictiveAgentCache integration per preload intelligente
- Thread-safe lazy loading
- TTL-based cache invalidation
"""

import json
import logging
import threading
import time
from collections import deque
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Set

# Import PredictiveAgentCache per preload intelligente
try:
    from lib.predictive_cache import get_predictive_cache, Prediction
    PREDICTIVE_CACHE_AVAILABLE = True
except ImportError:
    PREDICTIVE_CACHE_AVAILABLE = False
    Prediction = None  # type: ignore

logger = logging.getLogger(__name__)


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
        """Carica storico da disco."""
        try:
            path = Path(self._db_path)
            if path.exists():
                data = json.loads(path.read_text(encoding="utf-8"))
                self._usage_counts = data.get('usage_counts', {})
                self._session_patterns = data.get('patterns', {})
        except (json.JSONDecodeError, IOError) as e:
            logger.debug("Could not load agent usage data: %s", e)

    def save_to_disk(self) -> None:
        """Salva storico su disco."""
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

    Usage:
        loader = LazyAgentLoader()
        agent = loader.get_agent("GUI Layout Specialist L2")
        if agent:
            print(agent.content)
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
        self._agents_path = Path.home() / ".claude/agents"
        self._access_order: List[str] = []  # For LRU tracking
        self._max_loaded = 10  # Max agents to keep loaded
        self._usage_tracker = AgentUsageTracker()
        self._preload_complete = False

        logger.debug("LazyAgentLoader initialized with %d L2 agents", len(L2_AGENTS))

    def get_agent(self, agent_name: str, task_context: str = "") -> Optional[LoadedAgent]:
        """Get agent definition, loading lazily if L2.

        Args:
            agent_name: Name of the agent to load
            task_context: Optional task context for usage tracking

        Returns:
            LoadedAgent if found and loaded, None otherwise
        """
        # Check if L2 agent
        if agent_name not in L2_AGENTS:
            return None

        # Check if already loaded
        if agent_name in self._loaded_agents:
            agent = self._loaded_agents[agent_name]
            agent.access_count += 1
            agent.last_access = time.time()
            # Update LRU order
            if agent_name in self._access_order:
                self._access_order.remove(agent_name)
            self._access_order.append(agent_name)
            return agent

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

                logger.debug("Lazily loaded L2 agent: %s", agent_name)

                # Track usage after successful load
                if task_context:
                    self.record_task_usage(agent_name, task_context)

                return loaded

            except Exception as e:
                logger.error("Failed to load L2 agent %s: %s", agent_name, e)
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

        # 1. Usa PredictiveAgentCache se disponibile (V13.2)
        if PREDICTIVE_CACHE_AVAILABLE:
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

        # 2. Fallback: usa AgentUsageTracker interno (V13.1 behavior)
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
        """Evict least recently used agents if over limit."""
        while len(self._loaded_agents) > self._max_loaded and self._access_order:
            lru_agent = self._access_order.pop(0)
            if lru_agent in self._loaded_agents:
                del self._loaded_agents[lru_agent]
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
        """Preload specified agents.

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

    def preload_by_keywords(self, keywords: List[str]) -> int:
        """Preload agents matching any of the given keywords.

        Args:
            keywords: Keywords to match

        Returns:
            Count of successfully loaded agents
        """
        agent_names = set()
        for kw in keywords:
            agent_names.update(self.find_by_keyword(kw))
        return self.preload_agents(list(agent_names))

    def get_loaded_count(self) -> int:
        """Get count of currently loaded L2 agents."""
        return len(self._loaded_agents)

    def get_loaded_agents(self) -> List[str]:
        """Get names of currently loaded agents."""
        return list(self._loaded_agents.keys())

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
