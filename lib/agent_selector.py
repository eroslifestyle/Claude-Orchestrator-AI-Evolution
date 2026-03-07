"""ML-based Agent Selection for Orchestrator V13.0.

Selects agents dynamically based on task context and performance history.
V13.0.2: Thread safety fixes (H-3, M-1) + ADR-002 inverted index.
V13.1.0: Lazy L2 agent loading integration.
V13.1.1: AS-1 fix - Hardcoded keywords use pre-built set for O(1) lookup.
V13.1.2: Full KeywordInvertedIndex for O(1) keyword matching with compound support.
V14.0: AdaptiveTokenBudget integration for context-aware budget calculation.
V14.2: BudgetCache integration for -2-3ms per selection on cache hit.
"""

import re
import logging
from datetime import datetime, timedelta
from functools import lru_cache
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Set
import threading
import json

logger = logging.getLogger(__name__)

from .agent_performance import AgentPerformanceDB
from .lazy_agents import get_lazy_agent_loader, is_l2_agent, L2_AGENTS
from .adaptive_budget import AdaptiveTokenBudget, get_budget_calculator


class KeywordInvertedIndex:
    """Indice inverso completo per keyword matching O(1).

    Mappa:
    - keyword -> agent_id (routing diretto)
    - keyword -> Set[agent_id] (multi-match)
    - Supporta keyword composte (es. "optimize db")

    V13.1.2: Implementazione completa ADR-002 con supporto compound.
    """

    def __init__(self):
        self._keyword_to_agents: Dict[str, Set[str]] = {}
        self._compound_keywords: Set[str] = set()
        self._lock = threading.RLock()

    def build_from_routing_table(self, routing_table: Dict[str, str]) -> None:
        """Costruisce indice da routing table.

        Args:
            routing_table: Dizionario keyword -> agent_id
        """
        with self._lock:
            self._keyword_to_agents.clear()
            self._compound_keywords.clear()

            for keyword, agent_id in routing_table.items():
                kw_lower = keyword.lower()
                if kw_lower not in self._keyword_to_agents:
                    self._keyword_to_agents[kw_lower] = set()
                self._keyword_to_agents[kw_lower].add(agent_id)

                # Traccia keyword composte (con spazi)
                if ' ' in kw_lower:
                    self._compound_keywords.add(kw_lower)

    def lookup(self, keyword: str) -> Set[str]:
        """Lookup O(1) per keyword singola.

        Args:
            keyword: Keyword da cercare

        Returns:
            Set di agent_id che gestiscono questa keyword
        """
        return self._keyword_to_agents.get(keyword.lower(), set())

    def extract_from_task(self, task: str) -> List[Tuple[str, Set[str]]]:
        """Estrae tutte le keyword matches dal task.

        Prima controlla keyword composte (piu specifiche), poi singole.

        Args:
            task: Descrizione del task

        Returns:
            Lista di (keyword, agents) ordinata per lunghezza keyword (decrescente)
        """
        if not task:
            return []

        task_lower = task.lower()
        results = []

        # Prima controlla keyword composte (piu specifiche)
        for kw in sorted(self._compound_keywords, key=len, reverse=True):
            if kw in task_lower:
                results.append((kw, self._keyword_to_agents[kw].copy()))

        # Poi keyword singole dalle parole del task
        task_words = set(task_lower.split())
        for word in task_words:
            if word in self._keyword_to_agents:
                # Evita duplicati se la parola e' gia stata matchata come parte di compound
                if not any(word == kw or word in kw.split() for kw, _ in results):
                    results.append((word, self._keyword_to_agents[word].copy()))

        return results

    def get_all_keywords(self) -> Set[str]:
        """Restituisce tutte le keyword indicizzate.

        Returns:
            Set di tutte le keyword
        """
        with self._lock:
            return set(self._keyword_to_agents.keys())

    def get_compound_keywords(self) -> Set[str]:
        """Restituisce keyword composte.

        Returns:
            Set di keyword con spazi
        """
        with self._lock:
            return self._compound_keywords.copy()

    def clear(self) -> None:
        """Pulisce l'indice."""
        with self._lock:
            self._keyword_to_agents.clear()
            self._compound_keywords.clear()


class AgentSelector:
    """ML-enhanced agent selection with LRU cache for routing table.

    V13.0.2: Thread safety fixes (H-3, M-1) + ADR-002 inverted index.
    V13.1.1: AS-1 fix - Hardcoded keywords use pre-built set for O(1) lookup.
    V13.1.2: Full KeywordInvertedIndex integration for O(1) keyword matching.
    V14.0: AdaptiveTokenBudget integration for context-aware budget calculation.

    Attributes:
        performance_db: Database for tracking agent performance
        routing_table: Keyword to agent mapping
        _routing_cache: Cache for parsed routing data with timestamps
        _cache_ttl: Time-to-live for cache entries
        _last_parse_time: Last time routing table was parsed
        _cache_lock: Thread-safe lock for cache operations
        _inverted_index: Full inverted index for O(1) keyword matching (V13.1.2)
        _hardcoded_keywords: Pre-built set for O(1) hardcoded lookup (AS-1)
        _budget_calculator: Adaptive budget calculator (V14.0)
    """

    # Class-level cache shared across instances
    _routing_cache: Dict[str, Tuple[str, datetime]] = {}
    _cache_ttl = timedelta(minutes=5)
    _last_parse_time: Optional[datetime] = None
    _cache_lock = threading.RLock()
    _keyword_cache_version = 0  # Incremented on routing table change

    # AS-1: Hardcoded keywords index for O(1) lookup
    _hardcoded_keywords: Set[str] = set()

    def __init__(self, performance_db: Optional[AgentPerformanceDB] = None,
                 routing_table_path: Optional[str] = None):
        """Initialize agent selector.

        Args:
            performance_db: Performance database instance
            routing_table_path: Path to routing table JSON
        """
        self.performance_db = performance_db or AgentPerformanceDB()
        self.routing_table: Dict[str, str] = {}
        # V13.1.2: Nuovo indice inverso completo
        self._inverted_index = KeywordInvertedIndex()
        # V14.0: Calcolatore budget adattivo
        self._budget_calculator = get_budget_calculator()
        self._load_routing_table(routing_table_path)
        self._build_hardcoded_keywords()  # AS-1

    def _load_routing_table(self, path: Optional[str]) -> None:
        """Load routing table with caching.

        Checks cache validity before parsing to avoid redundant file I/O.

        Args:
            path: Path to routing table JSON or SKILL.md
        """
        with self._cache_lock:
            # Check cache validity
            if (self._last_parse_time and
                datetime.now() - self._last_parse_time < self._cache_ttl and
                self.routing_table):
                return  # Cache hit, skip parsing

            # Cache miss - need to parse
            if path is None:
                # Default to orchestrator routing table
                default_path = Path.home() / ".claude/skills/orchestrator/SKILL.md"
                if default_path.exists():
                    self._parse_skill_md_routing(default_path)
            else:
                routing_path = Path(path)
                if routing_path.exists():
                    with open(routing_path, encoding="utf-8") as f:
                        data = json.load(f)
                    self.routing_table = data.get("routing", {})

            # Update cache timestamp
            self._last_parse_time = datetime.now()

            # Rebuild keyword cache when routing table changes
            self._rebuild_keyword_cache()

            # V13.1.2: Ricostruisci indice inverso completo
            self._inverted_index.build_from_routing_table(self.routing_table)

    def _rebuild_keyword_cache(self) -> None:
        """Rebuild LRU cache when routing table changes.

        M-1 FIX: Version increment and cache_clear MUST be atomic under lock.
        """
        with self._cache_lock:
            AgentSelector._keyword_cache_version += 1
            self._keyword_to_agent_cached.cache_clear()

            # Pre-populate cache with all known keywords
            for keyword in self.routing_table.keys():
                self._keyword_to_agent_cached(keyword, AgentSelector._keyword_cache_version)

    def _build_hardcoded_keywords(self) -> None:
        """AS-1: Build hardcoded keywords set once.

        Keywords comuni non presenti nel routing table ma utili per matching.
        """
        self._hardcoded_keywords = {
            "GUI", "PyQt5", "Qt", "widget", "UI", "NiceGUI", "CSS", "theme",
            "database", "SQL", "schema", "query", "index", "optimize",
            "security", "encryption", "auth", "JWT", "session", "login",
            "API", "REST", "webhook", "endpoint", "route",
            "test", "debug", "QA", "unit test", "mock", "pytest",
            "MQL", "EA", "MetaTrader", "trading", "strategy",
            "analyze", "explore", "search", "implement", "fix", "code",
            "review", "document", "changelog", "refactor", "clean code"
        }

    @lru_cache(maxsize=1000)
    def _keyword_to_agent_cached(self, keyword: str, _version: int) -> Optional[str]:
        """Cached keyword to agent lookup.

        H-3 FIX: Protected with lock for thread safety.

        Args:
            keyword: Keyword to look up (case-insensitive)
            _version: Cache version for invalidation (unused but triggers cache miss)

        Returns:
            Agent ID or None if not found
        """
        with self._cache_lock:  # H-3: Thread safety
            return self.routing_table.get(keyword.lower())

    def _get_cached_agent(self, keyword: str) -> Optional[str]:
        """Get agent from cache with current version.

        Args:
            keyword: Keyword to look up

        Returns:
            Agent ID or None
        """
        return self._keyword_to_agent_cached(keyword, AgentSelector._keyword_cache_version)

    def invalidate_cache(self) -> None:
        """Manually invalidate cache (e.g., after SKILL.md update).

        Clears both routing cache and keyword lookup cache.
        V13.1.2: Also clears inverted index.
        """
        with self._cache_lock:
            self._last_parse_time = None
            self._keyword_to_agent_cached.cache_clear()
            self.routing_table.clear()
            self._inverted_index.clear()  # V13.1.2: Clear inverted index
            self._hardcoded_keywords.clear()  # AS-1: Clear hardcoded set

    def _parse_skill_md_routing(self, skill_md_path: Path) -> None:
        """Parse routing table from SKILL.md.

        Args:
            skill_md_path: Path to SKILL.md
        """
        with open(skill_md_path, encoding="utf-8") as f:
            content = f.read()

        # Extract AGENT ROUTING TABLE section
        table_match = re.search(
            r"\| Keyword \| Agent \| Model \|.*?\n\|[-\s|]+\n((?:\|.*?\|.*?\|.*?\|\n)+)",
            content,
            re.MULTILINE
        )

        if table_match:
            for line in table_match.group(1).split("\n"):
                if line.strip() and line.startswith("|"):
                    parts = [p.strip() for p in line.split("|")[1:-1]]
                    if len(parts) >= 2:
                        keywords = parts[0]
                        agent = parts[1]
                        for kw in keywords.split(","):
                            self.routing_table[kw.strip().lower()] = agent

    def extract_keywords(self, task: str) -> List[str]:
        """Extract all matching keywords from task using inverted index.

        V13.1.2: O(1) lookup using KeywordInvertedIndex.
        AS-1: Use pre-built set for hardcoded keywords (O(1) per check).

        Args:
            task: Task description string

        Returns:
            List of extracted keywords, sorted by length (longer = more specific)
        """
        if not task:
            return []

        # V13.1.2: Usa il nuovo indice inverso per O(1) lookup
        matches = self._inverted_index.extract_from_task(task)

        # Estrai keyword deduplicate
        seen_keywords = set()
        found = []
        for kw, agents in matches:
            kw_lower = kw.lower()
            if kw_lower not in seen_keywords:
                seen_keywords.add(kw_lower)
                found.append(kw)

        # AS-1: Use pre-built set for O(1) lookup, avoid duplicates (case-insensitive)
        task_lower = task.lower()
        for kw in self._hardcoded_keywords:
            kw_lower = kw.lower()
            if kw_lower in task_lower and kw_lower not in seen_keywords:
                found.append(kw)
                seen_keywords.add(kw_lower)

        # Sort by length (longer = more specific) and return top 15
        found.sort(key=len, reverse=True)
        return found[:15]

    def select_agent(self, task: str, candidates: Optional[List[str]] = None,
                    context: Optional[Dict] = None) -> str:
        """Select optimal agent with caching and L2 lazy loading.

        Selection priority:
        1. Keyword-based routing from cached routing table
        2. L2 specialist matching via lazy loader
        3. ML-based selection using performance history
        4. First candidate or universal fallback

        V14.0: Calcola budget adattivo all'inizio della selezione.
        V14.0.3 (AS-E1): Validazione candidates + cold start fallback con validazione.

        Args:
            task: Task description
            candidates: Optional list of candidate agents
            context: Optional additional context

        Returns:
            Selected agent ID

        Raises:
            ValueError: Se candidates e' vuoto (AS-E1 fix)
        """
        # AS-E1: CRITICAL - Validate candidates first
        if candidates is not None and len(candidates) == 0:
            raise ValueError(
                "Cannot select agent from empty candidates list. "
                "Provide at least one candidate agent name."
            )

        # V14.0: Calcola budget adattivo per questo task
        budget = self._budget_calculator.calculate_budget(task, context or {})

        # Load routing table (uses cache)
        self._load_routing_table(None)

        # Extract keywords from task
        keywords = self.extract_keywords(task)

        # Use cached lookup for each keyword
        best_agent = None
        best_score = 0
        routed_agents = set()

        for kw in keywords:
            agent = self._get_cached_agent(kw)
            if agent:
                routed_agents.add(agent)
                # Score based on keyword length (longer = more specific)
                score = len(kw)
                if score > best_score:
                    best_score = score
                    best_agent = agent

        # V13.1.0: Check for L2 specialist matches via lazy loader
        lazy_loader = get_lazy_agent_loader()
        l2_matches = set()
        for kw in keywords:
            l2_agents = lazy_loader.find_by_keyword(kw)
            for l2_agent in l2_agents:
                l2_matches.add(l2_agent)
                # Load the L2 agent lazily
                loaded = lazy_loader.get_agent(l2_agent)
                if loaded:
                    routed_agents.add(l2_agent)
                    # L2 agents get higher specificity score
                    l2_score = len(kw) * 1.5
                    if l2_score > best_score:
                        best_score = l2_score
                        best_agent = l2_agent

        # Filter by candidates if provided
        if candidates:
            routed_agents = routed_agents.intersection(set(candidates))
            if not routed_agents:
                # No match, use ML-based selection
                if self.performance_db:
                    # AS-E1: Check for cold start before ML selection
                    if self._is_cold_start(candidates):
                        logger.warning(
                            f"Cold start detected for agents: {candidates[:3]}... "
                            f"Using keyword-based fallback selection."
                        )
                        selected = self._cold_start_select(task, candidates)
                        # AS-E1: CRITICAL - Validate selected agent is in candidates
                        if selected not in candidates:
                            logger.warning(
                                f"Cold start selected '{selected}' not in valid candidates. "
                                f"Falling back to first valid candidate: {candidates[0]}"
                            )
                            return candidates[0]
                        return selected
                    ml_agent = self._ml_based_selection(task, candidates, context)
                    if ml_agent:
                        return ml_agent
                return candidates[0]

        # Use performance data to select from routed agents
        if routed_agents and self.performance_db:
            best = self.performance_db.get_best_agent(list(routed_agents))
            if best:
                return best

        # Fallback to best keyword match
        if best_agent and (not candidates or best_agent in candidates):
            return best_agent

        # First routed agent
        if routed_agents:
            return list(routed_agents)[0]

        # Ultimate fallback
        return candidates[0] if candidates else "Coder"

    def _ml_based_selection(self, task: str, candidates: List[str],
                           context: Optional[Dict]) -> Optional[str]:
        """ML-based agent selection using performance history.

        Args:
            task: Task description
            candidates: List of candidate agents
            context: Optional context

        Returns:
            Best agent or None
        """
        if not self.performance_db:
            return None

        # Get ranking based on performance
        ranking = self.get_ranking(candidates)

        if ranking:
            # Return best performing agent
            return ranking[0][0]

        return None

    def _is_cold_start(self, candidates: List[str]) -> bool:
        """Check if we're in cold start (insufficient performance data).

        AS-E1: V14.0.3 - Cold start detection for safe fallback.

        Args:
            candidates: List of candidate agents to check

        Returns:
            True if all candidates lack sufficient data
        """
        min_samples = getattr(self, '_cold_start_threshold', 3)
        for agent in candidates:
            if self._has_sufficient_data(agent, min_samples):
                return False
        return True

    def _has_sufficient_data(self, agent: str, min_samples: int) -> bool:
        """Check if agent has sufficient performance data.

        AS-E1: V14.0.3 - Data sufficiency check.

        Args:
            agent: Agent ID to check
            min_samples: Minimum number of tasks required

        Returns:
            True if agent has sufficient data
        """
        if not self.performance_db:
            return False
        try:
            m = self.performance_db.get_metrics(agent)
            return m is not None and m.total_tasks >= min_samples
        except Exception:
            return False

    def _cold_start_select(self, task: str, candidates: List[str]) -> str:
        """Select agent during cold start using keyword-based fallback.

        AS-E1: V14.0.3 - Keyword-based selection when no performance data exists.

        Args:
            task: Task description
            candidates: List of candidate agents

        Returns:
            Selected agent from candidates (may not be in list, caller must validate)
        """
        # Try keyword-based selection from routing table
        keywords = self.extract_keywords(task)

        for kw in keywords:
            agent = self._get_cached_agent(kw)
            if agent and agent in candidates:
                logger.info(f"Cold start selected '{agent}' via keyword '{kw}'")
                return agent

            # Check L2 agents
            lazy_loader = get_lazy_agent_loader()
            l2_agents = lazy_loader.find_by_keyword(kw)
            for l2_agent in l2_agents:
                if l2_agent in candidates:
                    logger.info(f"Cold start selected L2 agent '{l2_agent}' via keyword '{kw}'")
                    return l2_agent

        # Fallback: return first candidate (caller validates this is in candidates)
        logger.warning(f"Cold start fallback: returning first candidate '{candidates[0]}'")
        return candidates[0]

    def record_result(self, agent_id: str, success: bool,
                     duration_ms: float, tokens: int) -> None:
        """Record task result for learning.

        Args:
            agent_id: Agent that performed the task
            success: Whether task was successful
            duration_ms: Task duration in milliseconds
            tokens: Tokens consumed
        """
        self.performance_db.record_task(agent_id, success, duration_ms, tokens)

    def get_agent_stats(self, agent_id: str) -> Optional[Dict]:
        """Get statistics for an agent.

        Args:
            agent_id: Agent identifier

        Returns:
            Dictionary with stats or None
        """
        m = self.performance_db.get_metrics(agent_id)
        if m:
            return {
                "agent_id": m.agent_id,
                "total_tasks": m.total_tasks,
                "success_rate": m.success_rate,
                "avg_duration_ms": m.avg_duration_ms,
                "avg_tokens": m.avg_tokens
            }
        return None

    def get_ranking(self, agents: List[str]) -> List[Tuple[str, float]]:
        """Rank agents by performance score.

        Score formula: success_rate * 1000 - avg_duration_ms / 100

        Args:
            agents: List of agent IDs

        Returns:
            List of (agent_id, score) tuples, sorted by score descending
        """
        ranked = []
        for agent_id in agents:
            m = self.performance_db.get_metrics(agent_id)
            if m and m.total_tasks >= 3:
                score = m.success_rate * 1000 - m.avg_duration_ms / 100
                ranked.append((agent_id, score))

        ranked.sort(key=lambda x: x[1], reverse=True)
        return ranked

    def get_cache_stats(self) -> Dict:
        """Get cache statistics for monitoring.

        V14.2: Include budget cache stats.

        Returns:
            Dictionary with cache statistics
        """
        cache_info = self._keyword_to_agent_cached.cache_info()
        budget_cache_stats = self._budget_calculator.get_cache_stats()  # V14.2

        return {
            "cache_hits": cache_info.hits,
            "cache_misses": cache_info.misses,
            "cache_size": cache_info.currsize,
            "max_size": cache_info.maxsize,
            "routing_table_entries": len(self.routing_table),
            "inverted_index_keywords": len(self._inverted_index.get_all_keywords()),  # V13.1.2
            "compound_keywords_count": len(self._inverted_index.get_compound_keywords()),  # V13.1.2
            "hardcoded_keywords_count": len(self._hardcoded_keywords),  # AS-1
            "last_parse_time": self._last_parse_time.isoformat() if self._last_parse_time else None,
            "cache_ttl_seconds": self._cache_ttl.total_seconds(),
            "keyword_version": AgentSelector._keyword_cache_version,
            "budget_cache": budget_cache_stats,  # V14.2
        }

    def get_l2_stats(self) -> Dict:
        """Get L2 lazy loading statistics.

        V13.1.0: Monitor L2 agent loading.

        Returns:
            Dictionary with L2 loader stats
        """
        lazy_loader = get_lazy_agent_loader()
        return lazy_loader.get_stats()

    def preload_l2_by_keywords(self, keywords: List[str]) -> int:
        """Preload L2 agents matching keywords.

        V13.1.0: Warm up L2 cache for expected tasks.

        Args:
            keywords: Keywords to match for preloading

        Returns:
            Count of preloaded agents
        """
        lazy_loader = get_lazy_agent_loader()
        return lazy_loader.preload_by_keywords(keywords)

    def get_l2_parent(self, agent_name: str) -> Optional[str]:
        """Get parent L1 agent for an L2 specialist.

        V13.1.0: Support L2 -> L1 fallback routing.

        Args:
            agent_name: L2 agent name

        Returns:
            Parent L1 agent name or None
        """
        lazy_loader = get_lazy_agent_loader()
        return lazy_loader.get_parent_agent(agent_name)
