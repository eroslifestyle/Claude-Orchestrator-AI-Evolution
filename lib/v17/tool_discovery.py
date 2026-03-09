"""
Tool Discovery Engine - V17

Motore di discovery a 4 layer per trovare il tool ottimale
in base al contesto della richiesta.

Layers:
1. Exact Match: Corrispondenza esatta nome/alias
2. Semantic Match: Ricerca semantica per descrizione
3. Context Match: Match basato su contesto conversazione
4. Fallback: Suggerimenti e tools correlati

Example:
    >>> from lib.v17 import ToolDiscoveryEngine
    >>> engine = ToolDiscoveryEngine(registry)
    >>> result = await engine.discover("query the users API")
    >>> print(result.tool.name)  # "query_api"
"""

from __future__ import annotations

import asyncio
from collections import defaultdict
from dataclasses import dataclass, field
from enum import Enum
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from .claude_tool_registry import ClaudeToolRegistry, ToolDefinition

__all__ = [
    "ToolDiscoveryEngine",
    "DiscoveryLayer",
    "DiscoveryResult",
    "MatchType",
]

# Costanti per configurazione
MAX_CACHE_SIZE = 1000
SEMANTIC_THRESHOLD = 0.7
CONTEXT_BOOST_FACTOR = 0.15
FALLBACK_SUGGESTION_LIMIT = 5
FEEDBACK_WEIGHT_CORRECT = 1
FEEDBACK_WEIGHT_INCORRECT = -2


class DiscoveryLayer(Enum):
    """Layer del discovery engine."""

    EXACT = 1  # Layer 1: Exact match
    SEMANTIC = 2  # Layer 2: Semantic search
    CONTEXT = 3  # Layer 3: Context-aware
    FALLBACK = 4  # Layer 4: Fallback/suggestions


class MatchType(Enum):
    """Tipo di match trovato."""

    EXACT = "exact"  # Corrispondenza esatta
    ALIAS = "alias"  # Match tramite alias
    SEMANTIC = "semantic"  # Match semantico
    PARTIAL = "partial"  # Match parziale
    SUGGESTION = "suggestion"  # Suggerimento
    NONE = "none"  # Nessun match


@dataclass(slots=True)
class DiscoveryResult:
    """
    Risultato del discovery engine.

    Attributes:
        tool: Tool trovato (o None)
        match_type: Tipo di match
        layer: Layer che ha trovato il match
        confidence: Confidenza del match (0.0-1.0)
        alternatives: Tools alternativi
        suggestions: Suggerimenti se nessun match

    Example:
        >>> result = await engine.discover("query users")
        >>> if result.tool:
        ...     print(f"Found: {result.tool.name} via {result.match_type}")
        >>> elif result.suggestions:
        ...     print(f"Did you mean: {result.suggestions[0]}?")
    """

    tool: ToolDefinition | None
    match_type: MatchType
    layer: DiscoveryLayer
    confidence: float
    alternatives: list[ToolDefinition] = field(default_factory=list)
    suggestions: list[str] = field(default_factory=list)


@dataclass
class ToolDiscoveryEngine:
    """
    Engine di discovery a 4 layer per tool ottimale.

    Implementa ricerca gerarchica con fallback progressivo:
    1. Exact Match: O(1) lookup per nome/alias
    2. Semantic Match: Keyword similarity per descrizione
    3. Context Match: Analisi contesto conversazione
    4. Fallback: Suggerimenti basati su frequenza

    Features:
    - Caching dei risultati frequenti
    - Learning da feedback utente
    - Supporto per query naturali

    Example:
        >>> engine = ToolDiscoveryEngine(registry)
        >>> await engine.initialize()
        >>>
        >>> # Discovery con query naturale
        >>> result = await engine.discover("fetch user data from API")
        >>> print(result.tool.name)  # "query_api"
        >>>
        >>> # Con contesto
        >>> result = await engine.discover(
        ...     query="get data",
        ...     context={"previous_tools": ["query_api"], "domain": "rest"}
        ... )
    """

    _registry: ClaudeToolRegistry
    _cache: dict[str, DiscoveryResult] = field(default_factory=dict)
    _feedback_history: dict[str, int] = field(default_factory=dict)
    _initialized: bool = False

    # Keyword index per semantic matching
    _keyword_index: dict[str, list[tuple[ToolDefinition, int]]] = field(
        default_factory=lambda: defaultdict(list)
    )
    # Query -> tool mapping per learning
    _query_tool_mapping: dict[str, dict[str, int]] = field(
        default_factory=lambda: defaultdict(lambda: defaultdict(int))
    )
    # Tool usage frequency
    _tool_frequency: dict[str, int] = field(default_factory=lambda: defaultdict(int))

    async def initialize(self) -> None:
        """
        Inizializza il discovery engine.

        Costruisce keyword index dai tool descriptions e tags,
        popola cache con tools frequenti.
        """
        if self._initialized:
            return

        # Costruisci keyword index per semantic search
        await self._build_keyword_index()

        # Popola cache con tool piu usati (se abbiamo history)
        self._populate_cache_from_history()

        self._initialized = True

    async def _build_keyword_index(self) -> None:
        """Costruisce indice di keywords dai tools."""
        for tool_name, tool in self._registry._name_index.items():
            # Estrai keywords da descrizione
            desc_words = self._extract_keywords(tool.description)
            for word in desc_words:
                self._keyword_index[word].append((tool, 2))  # Peso 2 per descrizione

            # Estrai keywords da tags
            for tag in tool.tags:
                tag_words = self._extract_keywords(tag)
                for word in tag_words:
                    self._keyword_index[word].append((tool, 1))  # Peso 1 per tag

            # Aggiungi nome come keyword
            name_words = self._extract_keywords(tool_name)
            for word in name_words:
                self._keyword_index[word].append((tool, 3))  # Peso 3 per nome

    def _extract_keywords(self, text: str) -> list[str]:
        """
        Estrae keywords significative da un testo.

        Args:
            text: Testo da cui estrarre keywords

        Returns:
            Lista di keywords normalizzate
        """
        # Stopwords comuni
        stopwords = {
            "a", "an", "the", "and", "or", "but", "in", "on", "at",
            "to", "for", "of", "with", "by", "from", "is", "are",
            "was", "were", "be", "been", "being", "have", "has",
            "do", "does", "did", "will", "would", "could", "should",
            "may", "might", "must", "shall", "can", "need", "dare",
            "this", "that", "these", "those", "it", "its",
        }

        # Normalizza e filtra
        words = text.lower().split()
        keywords = []
        for word in words:
            # Rimuovi punteggiatura
            clean_word = "".join(c for c in word if c.isalnum())
            if clean_word and clean_word not in stopwords and len(clean_word) > 1:
                keywords.append(clean_word)

        return keywords

    def _populate_cache_from_history(self) -> None:
        """Popola cache dalle query piu frequenti."""
        # Se abbiamo feedback history, usa quelle
        sorted_queries = sorted(
            self._feedback_history.items(),
            key=lambda x: x[1],
            reverse=True,
        )[:100]  # Top 100 queries

        for query, _ in sorted_queries:
            # Ricostruisci discovery per cache
            tool_name = self._get_most_used_tool_for_query(query)
            if tool_name and tool_name in self._registry._name_index:
                tool = self._registry._name_index[tool_name]
                self._cache[query] = DiscoveryResult(
                    tool=tool,
                    match_type=MatchType.SUGGESTION,
                    layer=DiscoveryLayer.SEMANTIC,
                    confidence=0.6,
                    alternatives=[],
                    suggestions=[],
                )

    def _get_most_used_tool_for_query(self, query: str) -> str | None:
        """Ottiene il tool piu usato per una query."""
        if query not in self._query_tool_mapping:
            return None
        mapping = self._query_tool_mapping[query]
        if not mapping:
            return None
        return max(mapping.items(), key=lambda x: x[1])[0]

    async def discover(
        self,
        query: str,
        context: dict[str, Any] | None = None,
        max_alternatives: int = 3,
    ) -> DiscoveryResult:
        """
        Trova il tool ottimale per la query.

        Itera attraverso i 4 layer fino a trovare un match.

        Args:
            query: Query naturale o nome tool
            context: Contesto opzionale (previous_tools, domain, etc.)
            max_alternatives: Massimo tools alternativi

        Returns:
            DiscoveryResult con tool e metadata

        Example:
            >>> result = await engine.discover("query users API")
            >>> if result.confidence > 0.8:
            ...     tool = result.tool
        """
        if not self._initialized:
            await self.initialize()

        # Normalizza query
        normalized_query = query.lower().strip()

        # Check cache first
        if normalized_query in self._cache:
            cached = self._cache[normalized_query]
            # Aggiorna alternatives
            if max_alternatives > 0:
                cached.alternatives = await self._get_alternatives(
                    cached.tool,
                    max_alternatives,
                )
            return cached

        # Layer 1: Exact match
        result = await self._layer1_exact_match(normalized_query)
        if result and result.tool:
            self._update_tool_frequency(result.tool.name)
            self._add_to_cache(normalized_query, result)
            return result

        # Layer 2: Semantic match
        result = await self._layer2_semantic_match(normalized_query)
        if result and result.tool:
            self._update_tool_frequency(result.tool.name)
            if max_alternatives > 0:
                result.alternatives = await self._get_alternatives(
                    result.tool,
                    max_alternatives,
                )
            self._add_to_cache(normalized_query, result)
            return result

        # Layer 3: Context match
        if context:
            result = await self._layer3_context_match(normalized_query, context)
            if result and result.tool:
                self._update_tool_frequency(result.tool.name)
                if max_alternatives > 0:
                    result.alternatives = await self._get_alternatives(
                        result.tool,
                        max_alternatives,
                    )
                self._add_to_cache(normalized_query, result)
                return result

        # Layer 4: Fallback
        result = await self._layer4_fallback(normalized_query)
        self._add_to_cache(normalized_query, result)
        return result

    def _update_tool_frequency(self, tool_name: str) -> None:
        """Aggiorna contatore frequenza tool."""
        self._tool_frequency[tool_name] += 1

    def _add_to_cache(self, query: str, result: DiscoveryResult) -> None:
        """Aggiunge risultato alla cache con LRU eviction."""
        if len(self._cache) >= MAX_CACHE_SIZE:
            # Rimuovi entry meno usate (semplice FIFO per ora)
            oldest_key = next(iter(self._cache))
            del self._cache[oldest_key]

        self._cache[query] = result

    async def _get_alternatives(
        self,
        tool: ToolDefinition | None,
        limit: int,
    ) -> list[ToolDefinition]:
        """Ottiene tools alternativi basati su similarita."""
        if not tool:
            return []

        alternatives = []
        tool_tags = set(tool.tags)

        for other_name, other_tool in self._registry._name_index.items():
            if other_name == tool.name:
                continue

            # Calcola similarita basata su tags
            other_tags = set(other_tool.tags)
            common_tags = tool_tags & other_tags

            if common_tags:
                alternatives.append(other_tool)

            if len(alternatives) >= limit:
                break

        return alternatives

    async def _layer1_exact_match(self, query: str) -> DiscoveryResult | None:
        """
        Layer 1: Exact match per nome o alias.

        Args:
            query: Nome tool o alias

        Returns:
            DiscoveryResult se trovato, None altrimenti
        """
        # Check nome esatto
        if query in self._registry._name_index:
            tool = self._registry._name_index[query]
            return DiscoveryResult(
                tool=tool,
                match_type=MatchType.EXACT,
                layer=DiscoveryLayer.EXACT,
                confidence=1.0,
                alternatives=[],
                suggestions=[],
            )

        # Check alias
        if query in self._registry._alias_index:
            tool_name = self._registry._alias_index[query]
            if tool_name in self._registry._name_index:
                tool = self._registry._name_index[tool_name]
                return DiscoveryResult(
                    tool=tool,
                    match_type=MatchType.ALIAS,
                    layer=DiscoveryLayer.EXACT,
                    confidence=0.95,
                    alternatives=[],
                    suggestions=[],
                )

        # Check nome con underscore/camelCase variants
        normalized_variants = self._generate_name_variants(query)
        for variant in normalized_variants:
            if variant in self._registry._name_index:
                tool = self._registry._name_index[variant]
                return DiscoveryResult(
                    tool=tool,
                    match_type=MatchType.EXACT,
                    layer=DiscoveryLayer.EXACT,
                    confidence=0.9,
                    alternatives=[],
                    suggestions=[],
                )

        return None

    def _generate_name_variants(self, name: str) -> list[str]:
        """Genera varianti del nome per matching flessibile."""
        variants = [name]

        # snake_case to camelCase
        if "_" in name:
            parts = name.split("_")
            camel = parts[0] + "".join(p.capitalize() for p in parts[1:])
            variants.append(camel)

        # camelCase to snake_case
        import re

        camel_match = re.findall(r"[A-Z]?[a-z]+|[A-Z]+(?=[A-Z]|$)", name)
        if len(camel_match) > 1:
            snake = "_".join(p.lower() for p in camel_match)
            variants.append(snake)

        # kebab-case variants
        if "-" in name:
            variants.append(name.replace("-", "_"))
            variants.append(name.replace("-", ""))

        return variants

    async def _layer2_semantic_match(
        self,
        query: str,
        threshold: float = SEMANTIC_THRESHOLD,
    ) -> DiscoveryResult | None:
        """
        Layer 2: Semantic search con keyword matching.

        Args:
            query: Query naturale
            threshold: Soglia minima di similarita

        Returns:
            DiscoveryResult se trovato, None altrimenti
        """
        query_keywords = self._extract_keywords(query)
        if not query_keywords:
            return None

        # Calcola score per ogni tool
        tool_scores: dict[str, float] = defaultdict(float)

        for keyword in query_keywords:
            if keyword in self._keyword_index:
                for tool, weight in self._keyword_index[keyword]:
                    # Score basato su peso e numero di keyword match
                    tool_scores[tool.name] += weight

        if not tool_scores:
            return None

        # Normalizza scores
        max_possible_score = len(query_keywords) * 3  # Max weight per keyword
        normalized_scores = {
            name: score / max_possible_score
            for name, score in tool_scores.items()
        }

        # Trova il miglior match
        best_name, best_score = max(
            normalized_scores.items(),
            key=lambda x: x[1],
        )

        if best_score >= threshold:
            tool = self._registry._name_index.get(best_name)
            if tool:
                return DiscoveryResult(
                    tool=tool,
                    match_type=MatchType.SEMANTIC,
                    layer=DiscoveryLayer.SEMANTIC,
                    confidence=min(best_score, 0.89),  # Cap a 0.89 per semantic
                    alternatives=[],
                    suggestions=[],
                )

        return None

    async def _layer3_context_match(
        self,
        query: str,
        context: dict[str, Any],
    ) -> DiscoveryResult | None:
        """
        Layer 3: Context-aware matching.

        Utilizza:
        - Tools usati precedentemente
        - Dominio della conversazione
        - Pattern storici

        Args:
            query: Query naturale
            context: Contesto conversazione

        Returns:
            DiscoveryResult se trovato, None altrimenti
        """
        previous_tools = context.get("previous_tools", [])
        domain = context.get("domain", "")
        intent = context.get("intent", "")

        # Se ci sono tools precedenti, boosta i loro score
        if previous_tools:
            for tool_name in previous_tools[-3:]:  # Ultimi 3 tools
                if tool_name in self._registry._name_index:
                    tool = self._registry._name_index[tool_name]

                    # Check se query e' compatibile con tool
                    compatibility = self._check_tool_query_compatibility(
                        tool,
                        query,
                        domain,
                        intent,
                    )

                    if compatibility > 0.5:
                        confidence = 0.7 + (compatibility * CONTEXT_BOOST_FACTOR)
                        return DiscoveryResult(
                            tool=tool,
                            match_type=MatchType.PARTIAL,
                            layer=DiscoveryLayer.CONTEXT,
                            confidence=min(confidence, 0.85),
                            alternatives=[],
                            suggestions=[],
                        )

        # Domain-based matching
        if domain:
            domain_keywords = self._extract_keywords(domain)
            for tool_name, tool in self._registry._name_index.items():
                tool_domain_tags = [
                    t for t in tool.tags if t.lower() == domain.lower()
                ]
                if tool_domain_tags:
                    # Check keyword overlap
                    query_kw = set(self._extract_keywords(query))
                    desc_kw = set(self._extract_keywords(tool.description))
                    overlap = len(query_kw & desc_kw)

                    if overlap >= 1:
                        confidence = 0.65 + (overlap * 0.05)
                        return DiscoveryResult(
                            tool=tool,
                            match_type=MatchType.PARTIAL,
                            layer=DiscoveryLayer.CONTEXT,
                            confidence=min(confidence, 0.80),
                            alternatives=[],
                            suggestions=[],
                        )

        return None

    def _check_tool_query_compatibility(
        self,
        tool: ToolDefinition,
        query: str,
        domain: str,
        intent: str,
    ) -> float:
        """
        Calcola compatibilita tra tool e query.

        Args:
            tool: Tool da verificare
            query: Query dell'utente
            domain: Dominio corrente
            intent: Intent rilevato

        Returns:
            Score di compatibilita 0.0-1.0
        """
        score = 0.0

        # Check keyword overlap
        query_kw = set(self._extract_keywords(query))
        desc_kw = set(self._extract_keywords(tool.description))
        tag_kw = set(self._extract_keywords(" ".join(tool.tags)))

        overlap = len(query_kw & (desc_kw | tag_kw))
        if overlap > 0:
            score += min(overlap * 0.2, 0.6)

        # Check domain match
        if domain:
            domain_lower = domain.lower()
            if domain_lower in [t.lower() for t in tool.tags]:
                score += 0.2
            if domain_lower in tool.description.lower():
                score += 0.1

        # Check intent match
        if intent:
            intent_lower = intent.lower()
            if intent_lower in tool.description.lower():
                score += 0.1

        return min(score, 1.0)

    async def _layer4_fallback(self, query: str) -> DiscoveryResult:
        """
        Layer 4: Fallback con suggerimenti.

        Genera suggerimenti basati su:
        - Tools piu usati
        - Similarita parziale
        - Correzione errori comuni

        Args:
            query: Query originale

        Returns:
            DiscoveryResult con suggerimenti
        """
        suggestions: list[str] = []

        # 1. Tools piu usati globalmente
        top_tools = sorted(
            self._tool_frequency.items(),
            key=lambda x: x[1],
            reverse=True,
        )[:FALLBACK_SUGGESTION_LIMIT]

        for tool_name, _ in top_tools:
            suggestions.append(tool_name)

        # 2. Tools con similarita parziale
        partial_matches = await self._find_partial_matches(query)
        for tool_name in partial_matches:
            if tool_name not in suggestions:
                suggestions.append(tool_name)
                if len(suggestions) >= FALLBACK_SUGGESTION_LIMIT * 2:
                    break

        # 3. Correzione errori comuni (typo correction)
        typo_suggestions = self._suggest_typo_corrections(query)
        for tool_name in typo_suggestions:
            if tool_name not in suggestions:
                suggestions.append(tool_name)

        # Limita suggerimenti
        suggestions = suggestions[:FALLBACK_SUGGESTION_LIMIT * 2]

        return DiscoveryResult(
            tool=None,
            match_type=MatchType.NONE,
            layer=DiscoveryLayer.FALLBACK,
            confidence=0.0,
            alternatives=[],
            suggestions=suggestions,
        )

    async def _find_partial_matches(self, query: str) -> list[str]:
        """Trova tools con match parziale sul nome."""
        matches = []
        query_lower = query.lower()
        query_keywords = set(self._extract_keywords(query))

        for tool_name in self._registry._name_index:
            tool_lower = tool_name.lower()

            # Substring match
            if query_lower in tool_lower or tool_lower in query_lower:
                matches.append(tool_name)
                continue

            # Keyword overlap nel nome
            name_keywords = set(self._extract_keywords(tool_name))
            if query_keywords & name_keywords:
                matches.append(tool_name)

        return matches

    def _suggest_typo_corrections(self, query: str) -> list[str]:
        """Suggerisce correzioni per typos comuni."""
        suggestions = []
        query_lower = query.lower()

        for tool_name in self._registry._name_index:
            tool_lower = tool_name.lower()

            # Levenshtein distance semplificato
            if self._is_close_match(query_lower, tool_lower):
                suggestions.append(tool_name)

        return suggestions

    def _is_close_match(self, s1: str, s2: str, threshold: int = 2) -> bool:
        """
        Check se due stringhe sono simili (edit distance).

        Args:
            s1: Prima stringa
            s2: Seconda stringa
            threshold: Distanza massima accettabile

        Returns:
            True se la distanza e' sotto threshold
        """
        # Ottimizzazione: se differenza lunghezza > threshold, skip
        if abs(len(s1) - len(s2)) > threshold:
            return False

        # Calcolo semplificato edit distance
        if len(s1) < len(s2):
            s1, s2 = s2, s1

        previous_row = list(range(len(s2) + 1))

        for i, c1 in enumerate(s1):
            current_row = [i + 1]
            for j, c2 in enumerate(s2):
                insertions = previous_row[j + 1] + 1
                deletions = current_row[j] + 1
                substitutions = previous_row[j] + (c1 != c2)
                current_row.append(min(insertions, deletions, substitutions))

            # Early termination se gia oltre threshold
            if min(current_row) > threshold:
                return False

            previous_row = current_row

        return previous_row[-1] <= threshold

    def record_feedback(
        self,
        query: str,
        tool_name: str,
        was_correct: bool,
    ) -> None:
        """
        Registra feedback per learning.

        Args:
            query: Query originale
            tool_name: Tool suggerito/usato
            was_correct: Se il tool era corretto
        """
        normalized_query = query.lower().strip()

        # Aggiorna feedback history
        weight = FEEDBACK_WEIGHT_CORRECT if was_correct else FEEDBACK_WEIGHT_INCORRECT
        self._feedback_history[normalized_query] = (
            self._feedback_history.get(normalized_query, 0) + weight
        )

        # Aggiorna query -> tool mapping
        self._query_tool_mapping[normalized_query][tool_name] += weight

        # Se feedback positivo, potenzialmente aggiorna cache
        if was_correct and tool_name in self._registry._name_index:
            tool = self._registry._name_index[tool_name]
            self._cache[normalized_query] = DiscoveryResult(
                tool=tool,
                match_type=MatchType.SUGGESTION,
                layer=DiscoveryLayer.SEMANTIC,
                confidence=0.75,
                alternatives=[],
                suggestions=[],
            )

    def get_suggestions_for_tool(
        self,
        tool_name: str,
        limit: int = 5,
    ) -> list[str]:
        """
        Ottiene query comuni per un tool.

        Args:
            tool_name: Nome del tool
            limit: Massimo suggerimenti

        Returns:
            Lista di query che portano a questo tool
        """
        suggestions = []

        for query, tool_mapping in self._query_tool_mapping.items():
            if tool_name in tool_mapping:
                score = tool_mapping[tool_name]
                if score > 0:  # Solo feedback positivi
                    suggestions.append((query, score))

        # Ordina per score
        suggestions.sort(key=lambda x: x[1], reverse=True)

        return [q for q, _ in suggestions[:limit]]

    def clear_cache(self) -> int:
        """
        Svuota la cache dei risultati.

        Returns:
            Numero di elementi rimossi
        """
        count = len(self._cache)
        self._cache.clear()
        return count
