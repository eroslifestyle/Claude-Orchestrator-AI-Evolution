"""Routing Engine V2 with 4-Layer Keyword Matching for 43 Agents.

Orchestrator V14.0.4

Implements a layered approach to agent routing:
    Layer 1: Exact match (O(1) - hash lookup)
    Layer 2: Prefix match (O(k) - trie)
    Layer 3: Substring match (O(n*m) - inverted index)
    Layer 4: Semantic match (O(1) - precomputed embeddings)

V14.0.4 - Custom Exceptions + Exception Chaining:
- RoutingError for routing failures
- RoutingTableError for routing table operations
- NoAgentFoundError when no agent matches
- Proper exception chaining with "raise ... from err"
"""

import hashlib
import logging
import re
import threading
import time
import atexit
from collections import defaultdict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Set, Tuple

logger = logging.getLogger(__name__)

from lib.exceptions import (
    RoutingError,
    RoutingTableError,
    NoAgentFoundError,
)


@dataclass
class RoutingMetrics:
    """Metrics for a single routing decision."""
    query: str
    selected_agent: str
    layer_resolved: int  # 1-4
    latency_ms: float
    candidates_count: int
    timestamp: float = field(default_factory=time.time)


@dataclass
class LayerStats:
    """Statistics for each routing layer."""
    layer_num: int
    name: str
    total_queries: int = 0
    successful_matches: int = 0
    total_latency_ms: float = 0.0

    @property
    def avg_latency_ms(self) -> float:
        """Average latency for this layer."""
        return self.total_latency_ms / self.total_queries if self.total_queries > 0 else 0.0

    @property
    def success_rate(self) -> float:
        """Success rate for this layer."""
        return self.successful_matches / self.total_queries if self.total_queries > 0 else 0.0


class PrefixTrie:
    """Trie for efficient prefix matching.

    Supports O(k) prefix lookup where k is the prefix length.
    """

    def __init__(self):
        """Initialize empty trie."""
        self._root: Dict[str, Any] = {}
        self._lock = threading.RLock()

    def insert(self, prefix: str, agent: str) -> None:
        """Insert a prefix with associated agent.

        Args:
            prefix: Prefix string (case-insensitive)
            agent: Agent ID to associate with this prefix
        """
        prefix_lower = prefix.lower()
        with self._lock:
            node = self._root
            for char in prefix_lower:
                if char not in node:
                    node[char] = {}
                node = node[char]
            # Mark end with agent
            node["__agent__"] = agent

    def find_prefix(self, query: str) -> Optional[Tuple[str, str]]:
        """Find longest matching prefix in query.

        Args:
            query: Query string to search

        Returns:
            Tuple of (matched_prefix, agent) or None if no match
        """
        query_lower = query.lower()
        with self._lock:
            node = self._root
            longest_match = None
            current_prefix = ""

            for char in query_lower:
                if char in node:
                    current_prefix += char
                    node = node[char]
                    if "__agent__" in node:
                        longest_match = (current_prefix, node["__agent__"])
                else:
                    break

            return longest_match

    def clear(self) -> None:
        """Clear the trie."""
        with self._lock:
            self._root = {}


class InvertedIndex:
    """Inverted index for substring matching.

    Maps keywords to agents for O(1) keyword lookup.
    """

    def __init__(self):
        """Initialize empty index."""
        self._keyword_to_agents: Dict[str, Set[str]] = {}
        self._lock = threading.RLock()

    def add(self, keyword: str, agent: str) -> None:
        """Add keyword-agent mapping.

        Args:
            keyword: Keyword string
            agent: Agent ID
        """
        kw_lower = keyword.lower()
        with self._lock:
            if kw_lower not in self._keyword_to_agents:
                self._keyword_to_agents[kw_lower] = set()
            self._keyword_to_agents[kw_lower].add(agent)

    def lookup(self, keyword: str) -> Set[str]:
        """Lookup agents by keyword.

        Args:
            keyword: Keyword to search

        Returns:
            Set of matching agent IDs
        """
        kw_lower = keyword.lower()
        with self._lock:
            return self._keyword_to_agents.get(kw_lower, set()).copy()

    def search_in_query(self, query: str) -> Dict[str, int]:
        """Find all keywords present in query.

        Args:
            query: Query string

        Returns:
            Dict mapping agent_id to match count
        """
        query_lower = query.lower()
        agent_scores: Dict[str, int] = defaultdict(int)

        with self._lock:
            for keyword, agents in self._keyword_to_agents.items():
                if keyword in query_lower:
                    for agent in agents:
                        agent_scores[agent] += len(keyword)  # Weight by keyword length

        return dict(agent_scores)

    def get_all_keywords(self) -> Set[str]:
        """Get all indexed keywords."""
        with self._lock:
            return set(self._keyword_to_agents.keys())

    def clear(self) -> None:
        """Clear the index."""
        with self._lock:
            self._keyword_to_agents.clear()


class SemanticCache:
    """Simple semantic cache using precomputed embeddings.

    For V14.0.3, uses keyword-based semantic matching.
    Future versions can integrate with actual embedding models.
    """

    def __init__(self):
        """Initialize semantic cache."""
        # Precomputed keyword clusters for semantic matching
        # Maps cluster_id -> agent_id
        self._semantic_clusters: Dict[str, str] = {}
        # Maps keyword -> cluster_id
        self._keyword_clusters: Dict[str, str] = {}
        self._lock = threading.RLock()

    def add_cluster(self, cluster_id: str, keywords: List[str], agent: str) -> None:
        """Add a semantic cluster.

        Args:
            cluster_id: Unique cluster identifier
            keywords: Keywords belonging to this cluster
            agent: Agent ID for this cluster
        """
        with self._lock:
            self._semantic_clusters[cluster_id] = agent
            for kw in keywords:
                self._keyword_clusters[kw.lower()] = cluster_id

    def match(self, query: str) -> Optional[str]:
        """Find semantic match for query.

        Args:
            query: Query string

        Returns:
            Agent ID or None
        """
        query_lower = query.lower()
        query_words = set(query_lower.split())

        with self._lock:
            # Check if any word belongs to a cluster
            cluster_scores: Dict[str, int] = defaultdict(int)

            for word in query_words:
                if word in self._keyword_clusters:
                    cluster_id = self._keyword_clusters[word]
                    cluster_scores[cluster_id] += 1

            if cluster_scores:
                # Return agent from highest scoring cluster
                best_cluster = max(cluster_scores.keys(), key=lambda c: cluster_scores[c])
                return self._semantic_clusters.get(best_cluster)

        return None

    def clear(self) -> None:
        """Clear the cache."""
        with self._lock:
            self._semantic_clusters.clear()
            self._keyword_clusters.clear()


class RoutingEngineV2:
    """4-Layer Keyword Matching Engine for Agent Routing.

    Routing Layers:
        Layer 1: Exact match (O(1) hash lookup)
        Layer 2: Prefix match (O(k) trie)
        Layer 3: Substring match (O(n*m) inverted index)
        Layer 4: Semantic match (O(1) precomputed clusters)

    Performance Target: <5ms per routing decision.

    Attributes:
        _exact_map: Direct keyword -> agent mapping
        _prefix_trie: Trie for prefix matching
        _inverted_index: Inverted index for substring matching
        _semantic_cache: Semantic cluster cache
        _metrics: List of routing metrics
        _layer_stats: Statistics per layer
    """

    DEFAULT_FALLBACK = "Coder"

    def __init__(self, routing_table: Optional[Dict[str, str]] = None):
        """Initialize routing engine.

        Args:
            routing_table: Optional initial routing table (keyword -> agent)
        """
        # Layer 1: Exact match
        self._exact_map: Dict[str, str] = {}
        # Layer 2: Prefix match
        self._prefix_trie = PrefixTrie()
        # Layer 3: Substring match
        self._inverted_index = InvertedIndex()
        # Layer 4: Semantic match
        self._semantic_cache = SemanticCache()

        # Metrics tracking
        self._metrics: List[RoutingMetrics] = []
        self._layer_stats: Dict[int, LayerStats] = {
            1: LayerStats(layer_num=1, name="Exact"),
            2: LayerStats(layer_num=2, name="Prefix"),
            3: LayerStats(layer_num=3, name="Substring"),
            4: LayerStats(layer_num=4, name="Semantic"),
        }
        self._lock = threading.RLock()
        self._max_metrics = 1000  # Keep last 1000 metrics

        # Initialize with routing table if provided
        if routing_table:
            self.build_from_routing_table(routing_table)

    def build_from_routing_table(self, routing_table: Dict[str, str]) -> None:
        """Build all indices from routing table.

        V14.0.4: Raises RoutingTableError on failure with exception chaining.

        Args:
            routing_table: Dict mapping keyword -> agent_id

        Raises:
            RoutingTableError: If routing table is invalid or cannot be indexed
        """
        if not routing_table:
            logger.warning("Empty routing table provided to build_from_routing_table")
            return

        try:
            with self._lock:
                self._exact_map.clear()
                self._prefix_trie.clear()
                self._inverted_index.clear()
                self._semantic_cache.clear()

                # Semantic clusters for Layer 4
                semantic_clusters = self._build_semantic_clusters(routing_table)

                for keyword, agent in routing_table.items():
                    kw_lower = keyword.lower()

                    # Layer 1: Exact match
                    self._exact_map[kw_lower] = agent

                    # Layer 2: Prefix match (for keywords ending with *)
                    if keyword.endswith("*"):
                        prefix = keyword[:-1]
                        self._prefix_trie.insert(prefix, agent)
                    else:
                        # Also add as prefix for flexibility
                        self._prefix_trie.insert(kw_lower, agent)

                    # Layer 3: Inverted index
                    self._inverted_index.add(kw_lower, agent)
                    # Also index individual words
                    for word in kw_lower.split():
                        if len(word) >= 3:  # Skip very short words
                            self._inverted_index.add(word, agent)

                # Layer 4: Build semantic clusters
                for cluster_id, (keywords, agent) in semantic_clusters.items():
                    self._semantic_cache.add_cluster(cluster_id, keywords, agent)

                logger.info(
                    "RoutingEngineV2 initialized: %d exact, %d keywords indexed",
                    len(self._exact_map),
                    len(self._inverted_index.get_all_keywords())
                )

        except Exception as err:
            raise RoutingTableError(
                f"Failed to build routing indices: {err}",
                context={"keywords_count": len(routing_table)}
            ) from err

    def _build_semantic_clusters(
        self, routing_table: Dict[str, str]
    ) -> Dict[str, Tuple[List[str], str]]:
        """Build semantic clusters from routing table.

        Groups related keywords into clusters for semantic matching.

        Args:
            routing_table: Routing table to analyze

        Returns:
            Dict mapping cluster_id -> (keywords, agent)
        """
        clusters: Dict[str, Tuple[List[str], str]] = {}

        # Predefined semantic clusters
        predefined = {
            "gui": ["gui", "qt", "widget", "ui", "pyqt", "layout", "css", "theme"],
            "database": ["database", "sql", "query", "schema", "index", "db", "table"],
            "security": ["security", "auth", "jwt", "login", "password", "encryption", "token"],
            "api": ["api", "rest", "endpoint", "route", "http", "webhook", "request"],
            "testing": ["test", "pytest", "mock", "coverage", "unit", "qa", "assertion"],
            "devops": ["deploy", "pipeline", "ci", "cd", "github actions", "jenkins"],
            "mql": ["mql", "ea", "metatrader", "trading", "strategy", "indicator"],
            "mobile": ["mobile", "ios", "android", "flutter", "react native", "responsive"],
            "ai": ["ai", "llm", "gpt", "embedding", "model", "rag", "ml"],
        }

        for cluster_id, keywords in predefined.items():
            # Find agent for this cluster
            for kw in keywords:
                if kw in routing_table:
                    agent = routing_table[kw]
                    clusters[cluster_id] = (keywords, agent)
                    break

        return clusters

    def route(self, query: str, candidates: Optional[List[str]] = None) -> str:
        """Route query to best matching agent.

        Tries layers in order: Exact -> Prefix -> Substring -> Semantic.
        Falls back to Coder if no match.

        V14.0.4: Raises RoutingError on failure with exception chaining.

        Args:
            query: Query string to route
            candidates: Optional list of valid candidate agents

        Returns:
            Selected agent ID

        Raises:
            RoutingError: If routing fails unexpectedly
            NoAgentFoundError: If strict mode enabled and no agent found
        """
        try:
            start_time = time.time()
            query_lower = query.lower()

            # Layer 1: Exact match
            agent = self._try_layer1(query_lower)
            if agent and self._is_valid_candidate(agent, candidates):
                self._record_metric(query, agent, 1, start_time, 1)
                return agent

            # Layer 2: Prefix match
            agent = self._try_layer2(query_lower)
            if agent and self._is_valid_candidate(agent, candidates):
                self._record_metric(query, agent, 2, start_time, 1)
                return agent

            # Layer 3: Substring match (inverted index)
            agent, candidates_count = self._try_layer3(query_lower, candidates)
            if agent:
                self._record_metric(query, agent, 3, start_time, candidates_count)
                return agent

            # Layer 4: Semantic match
            agent = self._try_layer4(query_lower)
            if agent and self._is_valid_candidate(agent, candidates):
                self._record_metric(query, agent, 4, start_time, 1)
                return agent

            # Fallback
            fallback = self._get_fallback(candidates)
            self._record_metric(query, fallback, 0, start_time, 0)  # Layer 0 = fallback
            return fallback

        except Exception as err:
            # Re-raise our custom exceptions
            if isinstance(err, (RoutingError, NoAgentFoundError)):
                raise
            # Wrap unexpected errors
            raise RoutingError(
                f"Routing failed for query: {query[:50]}...",
                task=query[:100] if query else None,
                candidates=candidates,
                cause=err
            ) from err

    def _try_layer1(self, query: str) -> Optional[str]:
        """Layer 1: Exact match O(1).

        Args:
            query: Lowercase query string

        Returns:
            Agent ID or None
        """
        start = time.time()
        agent = self._exact_map.get(query)

        with self._lock:
            self._layer_stats[1].total_queries += 1
            if agent:
                self._layer_stats[1].successful_matches += 1
            self._layer_stats[1].total_latency_ms += (time.time() - start) * 1000

        return agent

    def _try_layer2(self, query: str) -> Optional[str]:
        """Layer 2: Prefix match O(k).

        Args:
            query: Lowercase query string

        Returns:
            Agent ID or None
        """
        start = time.time()
        result = self._prefix_trie.find_prefix(query)
        agent = result[1] if result else None

        with self._lock:
            self._layer_stats[2].total_queries += 1
            if agent:
                self._layer_stats[2].successful_matches += 1
            self._layer_stats[2].total_latency_ms += (time.time() - start) * 1000

        return agent

    def _try_layer3(
        self, query: str, candidates: Optional[List[str]]
    ) -> Tuple[Optional[str], int]:
        """Layer 3: Substring match via inverted index.

        Args:
            query: Lowercase query string
            candidates: Optional candidate filter

        Returns:
            Tuple of (agent ID or None, candidate count)
        """
        start = time.time()
        agent_scores = self._inverted_index.search_in_query(query)

        if candidates:
            # Filter to valid candidates
            agent_scores = {
                a: s for a, s in agent_scores.items() if a in candidates
            }

        agent = None
        candidates_count = len(agent_scores)

        if agent_scores:
            # Select agent with highest score
            agent = max(agent_scores.keys(), key=lambda a: agent_scores[a])

        with self._lock:
            self._layer_stats[3].total_queries += 1
            if agent:
                self._layer_stats[3].successful_matches += 1
            self._layer_stats[3].total_latency_ms += (time.time() - start) * 1000

        return agent, candidates_count

    def _try_layer4(self, query: str) -> Optional[str]:
        """Layer 4: Semantic match.

        Args:
            query: Lowercase query string

        Returns:
            Agent ID or None
        """
        start = time.time()
        agent = self._semantic_cache.match(query)

        with self._lock:
            self._layer_stats[4].total_queries += 1
            if agent:
                self._layer_stats[4].successful_matches += 1
            self._layer_stats[4].total_latency_ms += (time.time() - start) * 1000

        return agent

    def _is_valid_candidate(
        self, agent: Optional[str], candidates: Optional[List[str]]
    ) -> bool:
        """Check if agent is in valid candidates list.

        Args:
            agent: Agent ID to check
            candidates: List of valid candidates or None (all valid)

        Returns:
            True if agent is valid
        """
        if agent is None:
            return False
        if candidates is None:
            return True
        return agent in candidates

    def _get_fallback(self, candidates: Optional[List[str]]) -> str:
        """Get fallback agent.

        Args:
            candidates: Optional candidate list

        Returns:
            Fallback agent ID
        """
        if candidates and len(candidates) > 0:
            return candidates[0]
        return self.DEFAULT_FALLBACK

    def _record_metric(
        self,
        query: str,
        agent: str,
        layer: int,
        start_time: float,
        candidates_count: int
    ) -> None:
        """Record routing metric.

        Args:
            query: Original query
            agent: Selected agent
            layer: Layer that resolved (0 = fallback)
            start_time: Start time of routing
            candidates_count: Number of candidates considered
        """
        latency_ms = (time.time() - start_time) * 1000

        metric = RoutingMetrics(
            query=query,
            selected_agent=agent,
            layer_resolved=layer,
            latency_ms=latency_ms,
            candidates_count=candidates_count
        )

        with self._lock:
            self._metrics.append(metric)
            # Trim old metrics
            if len(self._metrics) > self._max_metrics:
                self._metrics = self._metrics[-self._max_metrics:]

    def get_metrics(self) -> List[RoutingMetrics]:
        """Get all recorded metrics.

        Returns:
            List of routing metrics
        """
        with self._lock:
            return self._metrics.copy()

    def get_layer_stats(self) -> Dict[int, LayerStats]:
        """Get statistics for each layer.

        Returns:
            Dict mapping layer number to stats
        """
        with self._lock:
            return self._layer_stats.copy()

    def get_performance_summary(self) -> Dict[str, Any]:
        """Get performance summary.

        Returns:
            Dict with performance metrics
        """
        with self._lock:
            if not self._metrics:
                return {
                    "total_queries": 0,
                    "avg_latency_ms": 0.0,
                    "layer_distribution": {},
                    "fallback_rate": 0.0,
                }

            total = len(self._metrics)
            total_latency = sum(m.latency_ms for m in self._metrics)
            layer_counts: Dict[int, int] = defaultdict(int)

            for m in self._metrics:
                layer_counts[m.layer_resolved] += 1

            layer_distribution = {
                f"layer_{k}": v / total * 100
                for k, v in layer_counts.items()
            }

            fallback_rate = layer_counts.get(0, 0) / total * 100

            return {
                "total_queries": total,
                "avg_latency_ms": total_latency / total,
                "layer_distribution": layer_distribution,
                "fallback_rate": fallback_rate,
                "layer_stats": {
                    k: {
                        "name": v.name,
                        "success_rate": v.success_rate,
                        "avg_latency_ms": v.avg_latency_ms,
                    }
                    for k, v in self._layer_stats.items()
                }
            }

    def clear_metrics(self) -> None:
        """Clear all metrics."""
        with self._lock:
            self._metrics.clear()
            for stats in self._layer_stats.values():
                stats.total_queries = 0
                stats.successful_matches = 0
                stats.total_latency_ms = 0.0

    def cleanup(self) -> Dict[str, int]:
        """Cleanup all caches and metrics.

        V14.0.5: Aggiunto per prevenire memory leak e permettere cleanup esplicito.

        Returns:
            Dict con statistiche cleanup
        """
        with self._lock:
            # Clear all indices
            exact_count = len(self._exact_map)
            self._exact_map.clear()

            keyword_count = len(self._inverted_index.get_all_keywords())
            self._inverted_index.clear()

            self._prefix_trie.clear()
            self._semantic_cache.clear()

            # Clear metrics
            metrics_count = len(self._metrics)
            self._metrics.clear()

            # Reset layer stats
            for stats in self._layer_stats.values():
                stats.total_queries = 0
                stats.successful_matches = 0
                stats.total_latency_ms = 0.0

        logger.info(
            "RoutingEngineV2 cleanup completed: cleared %d exact, %d keywords, %d metrics",
            exact_count, keyword_count, metrics_count
        )

        return {
            "exact_entries_cleared": exact_count,
            "keywords_cleared": keyword_count,
            "metrics_cleared": metrics_count,
        }

    def cleanup(self) -> Dict[str, Any]:
        """Cleanup all resources and caches.

        V14.0.5: Aggiunto per prevenire memory leak e permettere cleanup esplicito.

        Returns:
            Dict con statistiche cleanup
        """
        with self._lock:
            # Get stats before cleanup
            metrics_count = len(self._metrics)
            exact_count = len(self._exact_map)

            # Clear all indices
            self._exact_map.clear()
            self._prefix_trie.clear()
            self._inverted_index.clear()
            self._semantic_cache.clear()

            # Clear metrics
            self._metrics.clear()
            for stats in self._layer_stats.values():
                stats.total_queries = 0
                stats.successful_matches = 0
                stats.total_latency_ms = 0.0

            logger.info(
                "RoutingEngineV2 cleanup completed: cleared %d metrics, %d exact mappings",
                metrics_count, exact_count
            )

            return {
                "metrics_cleared": metrics_count,
                "exact_mappings_cleared": exact_count,
            }


# Singleton instance
_ROUTING_ENGINE_V2: Optional[RoutingEngineV2] = None
_ENGINE_LOCK = threading.Lock()


def get_routing_engine_v2(
    routing_table: Optional[Dict[str, str]] = None
) -> RoutingEngineV2:
    """Get or create singleton RoutingEngineV2 instance.

    Args:
        routing_table: Optional routing table for initialization

    Returns:
        RoutingEngineV2 instance
    """
    global _ROUTING_ENGINE_V2

    with _ENGINE_LOCK:
        if _ROUTING_ENGINE_V2 is None:
            _ROUTING_ENGINE_V2 = RoutingEngineV2(routing_table)
        elif routing_table:
            _ROUTING_ENGINE_V2.build_from_routing_table(routing_table)

        return _ROUTING_ENGINE_V2


def reset_routing_engine_v2() -> None:
    """Reset the singleton instance (for testing)."""
    global _ROUTING_ENGINE_V2

    with _ENGINE_LOCK:
        _ROUTING_ENGINE_V2 = None
