"""
Claude Tool Registry - V17

Gestisce 10,000+ tools con ricerca O(1) tramite indicizzazione
a 4 livelli. Supporta lazy loading e hot-reload.

Example:
    >>> from lib.v17 import ClaudeToolRegistry
    >>> registry = ClaudeToolRegistry()
    >>> await registry.initialize()
    >>> tool = await registry.get_tool("query_api")
    >>> results = await registry.execute_batch([
    ...     {"name": "query_api", "input": {"endpoint": "/users"}},
    ...     {"name": "query_api", "input": {"endpoint": "/orders"}},
    ... ])
"""

from __future__ import annotations

import asyncio
import logging
import time
import uuid
from dataclasses import dataclass, field
from difflib import SequenceMatcher
from enum import Enum
from typing import TYPE_CHECKING, Any, Callable, Coroutine

if TYPE_CHECKING:
    from collections.abc import Sequence

logger = logging.getLogger(__name__)

__all__ = [
    "ClaudeToolRegistry",
    "ToolDefinition",
    "ToolCategory",
    "ToolPriority",
]


class ToolCategory(Enum):
    """Categorie di tool per organizzazione."""

    CORE = "core"  # Tools essenziali
    MCP = "mcp"  # MCP server tools
    NATIVE = "native"  # Native Claude tools
    CUSTOM = "custom"  # Tools definiti dall'utente
    PLUGIN = "plugin"  # Plugin tools


class ToolPriority(Enum):
    """Priorita del tool per ordinamento."""

    CRITICAL = 0  # Sempre caricati
    HIGH = 1  # Caricati all'avvio
    NORMAL = 2  # Lazy loading
    LOW = 3  # Solo su richiesta


@dataclass(slots=True)
class ToolDefinition:
    """
    Definizione di un tool Claude.

    Attributes:
        name: Nome univoco del tool
        description: Descrizione per Claude
        input_schema: JSON Schema per input
        handler: Funzione async di esecuzione
        category: Categoria del tool
        priority: Priorita di caricamento
        version: Versione del tool
        tags: Tag per ricerca
        aliases: Nomi alternativi
        deprecated: Se deprecato
        replacement: Tool sostitutivo se deprecato

    Example:
        >>> def make_tool():
        ...     return ToolDefinition(
        ...         name="query_api",
        ...         description="Query external REST API",
        ...         input_schema={
        ...             "type": "object",
        ...             "properties": {
        ...                 "endpoint": {"type": "string"},
        ...                 "method": {"type": "string", "default": "GET"},
        ...             },
        ...             "required": ["endpoint"],
        ...         },
        ...         handler=query_api_handler,
        ...         category=ToolCategory.CORE,
        ...         priority=ToolPriority.HIGH,
        ...     )
    """

    name: str
    description: str
    input_schema: dict[str, Any]
    handler: Callable[[dict[str, Any]], Coroutine[Any, Any, Any]]
    category: ToolCategory = ToolCategory.CUSTOM
    priority: ToolPriority = ToolPriority.NORMAL
    version: str = "1.0.0"
    tags: list[str] = field(default_factory=list)
    aliases: list[str] = field(default_factory=list)
    deprecated: bool = False
    replacement: str | None = None
    _loaded: bool = field(default=False, repr=False)

    def to_claude_format(self) -> dict[str, Any]:
        """
        Converte in formato Claude API.

        Returns:
            Dict con name, description, input_schema

        Example:
            >>> tool = ToolDefinition(name="test", description="Test", input_schema={...})
            >>> claude_tool = tool.to_claude_format()
            >>> # {"name": "test", "description": "Test", "input_schema": {...}}
        """
        result: dict[str, Any] = {
            "name": self.name,
            "description": self.description,
            "input_schema": self.input_schema,
        }

        # Aggiungi metadata opzionali
        if self.deprecated:
            result["deprecated"] = True
            if self.replacement:
                result["replacement"] = self.replacement

        if self.version and self.version != "1.0.0":
            result["version"] = self.version

        return result


@dataclass
class ClaudeToolRegistry:
    """
    Registry per 10,000+ tools con ricerca O(1).

    Implementa indicizzazione a 4 livelli:
    1. Name index: accesso diretto per nome
    2. Category index: raggruppamento per categoria
    3. Tag index: ricerca per tag
    4. Alias index: risoluzione alias

    Features:
    - Lazy loading per tools a bassa priorita
    - Hot-reload senza downtime
    - Batch execution in singolo round-trip
    - Deduplication automatica

    Example:
        >>> registry = ClaudeToolRegistry()
        >>> await registry.initialize()
        >>>
        >>> # Registra tool
        >>> registry.register(my_tool)
        >>>
        >>> # Batch execution
        >>> results = await registry.execute_batch([
        ...     {"name": "tool1", "input": {...}},
        ...     {"name": "tool2", "input": {...}},
        ... ])
        >>>
        >>> # Ricerca
        >>> tools = registry.search("api query")
    """

    # Indici per ricerca O(1)
    _name_index: dict[str, ToolDefinition] = field(default_factory=dict)
    _category_index: dict[ToolCategory, list[ToolDefinition]] = field(
        default_factory=lambda: {cat: [] for cat in ToolCategory}
    )
    _tag_index: dict[str, list[ToolDefinition]] = field(default_factory=dict)
    _alias_index: dict[str, str] = field(default_factory=dict)

    # Stats
    _total_tools: int = 0
    _loaded_tools: int = 0
    _execution_count: int = 0
    _error_count: int = 0

    # Lock per thread-safety
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock)

    # Lazy loading registry
    _lazy_loaders: dict[str, Callable[[], Coroutine[Any, Any, ToolDefinition]]] = field(
        default_factory=dict
    )

    async def initialize(self) -> None:
        """
        Inizializza il registry caricando tools critici.

        Carica tutti i tools con priority CRITICAL e HIGH.
        I tools NORMAL e LOW sono caricati lazy.

        Example:
            >>> registry = ClaudeToolRegistry()
            >>> await registry.initialize()
            >>> print(f"Loaded {registry._loaded_tools} tools")
        """
        async with self._lock:
            start_time = time.perf_counter()

            # Carica tools CRITICAL e HIGH
            tools_to_load = [
                tool
                for tool in self._name_index.values()
                if tool.priority in (ToolPriority.CRITICAL, ToolPriority.HIGH)
            ]

            for tool in tools_to_load:
                tool._loaded = True
                self._loaded_tools += 1
                logger.debug(f"Loaded tool: {tool.name} (priority={tool.priority.name})")

            elapsed = time.perf_counter() - start_time
            logger.info(
                f"ClaudeToolRegistry initialized: {self._loaded_tools}/{self._total_tools} tools loaded in {elapsed:.3f}s"
            )

    def register(self, tool: ToolDefinition, defer_loading: bool = False) -> bool:
        """
        Registra un nuovo tool.

        Args:
            tool: Definizione del tool
            defer_loading: Se True, non incrementa loaded_tools counter

        Returns:
            True se registrato con successo

        Raises:
            ValueError: Se tool con stesso nome esiste gia

        Example:
            >>> success = registry.register(ToolDefinition(
            ...     name="my_tool",
            ...     description="My tool",
            ...     input_schema={"type": "object"},
            ...     handler=my_handler,
            ... ))
            >>> assert success is True
        """
        if tool.name in self._name_index:
            raise ValueError(f"Tool '{tool.name}' gia registrato")

        # Indicizza per nome
        self._name_index[tool.name] = tool
        self._total_tools += 1

        # Indicizza per categoria
        self._category_index[tool.category].append(tool)

        # Indicizza per tag
        for tag in tool.tags:
            tag_lower = tag.lower()
            if tag_lower not in self._tag_index:
                self._tag_index[tag_lower] = []
            self._tag_index[tag_lower].append(tool)

        # Indicizza alias
        for alias in tool.aliases:
            alias_lower = alias.lower()
            if alias_lower in self._alias_index:
                logger.warning(
                    f"Alias '{alias}' gia in uso per tool '{self._alias_index[alias_lower]}', sovrascritto da '{tool.name}'"
                )
            self._alias_index[alias_lower] = tool.name

        logger.debug(f"Registered tool: {tool.name} (category={tool.category.value})")
        return True

    def unregister(self, name: str) -> bool:
        """
        Rimuove un tool dal registry.

        Args:
            name: Nome del tool

        Returns:
            True se rimosso, False se non trovato

        Example:
            >>> removed = registry.unregister("old_tool")
            >>> print(f"Removed: {removed}")
        """
        tool = self._name_index.get(name)
        if tool is None:
            return False

        # Rimuovi da name index
        del self._name_index[name]
        self._total_tools -= 1
        if tool._loaded:
            self._loaded_tools -= 1

        # Rimuovi da category index
        if tool in self._category_index[tool.category]:
            self._category_index[tool.category].remove(tool)

        # Rimuovi da tag index
        for tag in tool.tags:
            tag_lower = tag.lower()
            if tag_lower in self._tag_index and tool in self._tag_index[tag_lower]:
                self._tag_index[tag_lower].remove(tool)
                if not self._tag_index[tag_lower]:
                    del self._tag_index[tag_lower]

        # Rimuovi alias
        for alias in tool.aliases:
            alias_lower = alias.lower()
            if self._alias_index.get(alias_lower) == name:
                del self._alias_index[alias_lower]

        # Rimuovi lazy loader se presente
        if name in self._lazy_loaders:
            del self._lazy_loaders[name]

        logger.debug(f"Unregistered tool: {name}")
        return True

    async def get_tool(self, name: str) -> ToolDefinition | None:
        """
        Ottiene un tool per nome, con lazy loading.

        Args:
            name: Nome del tool o alias

        Returns:
            ToolDefinition o None se non trovato

        Example:
            >>> tool = await registry.get_tool("query_api")
            >>> if tool:
            ...     result = await tool.handler({"endpoint": "/users"})
        """
        # Risolvi alias
        resolved_name = self._alias_index.get(name.lower(), name)

        tool = self._name_index.get(resolved_name)
        if tool is None:
            # Cerca case-insensitive
            for tool_name, t in self._name_index.items():
                if tool_name.lower() == name.lower():
                    tool = t
                    break

        if tool is None:
            # Prova lazy loading
            loader = self._lazy_loaders.get(resolved_name) or self._lazy_loaders.get(
                name.lower()
            )
            if loader:
                try:
                    tool = await loader()
                    self.register(tool)
                    tool._loaded = True
                    self._loaded_tools += 1
                    logger.debug(f"Lazy loaded tool: {tool.name}")
                except Exception as e:
                    logger.warning(f"Failed to lazy load tool '{name}': {e}")
                    return None
            else:
                return None

        # Lazy load se non caricato
        if not tool._loaded and tool.priority in (ToolPriority.NORMAL, ToolPriority.LOW):
            tool._loaded = True
            self._loaded_tools += 1
            logger.debug(f"Lazy activated tool: {tool.name}")

        return tool

    def get(self, name: str) -> ToolDefinition | None:
        """
        Versione sincrona di get_tool per compatibilita API.

        Nota: Non supporta lazy loading. Per lazy loading, usa get_tool().

        Args:
            name: Nome del tool o alias

        Returns:
            ToolDefinition o None se non trovato

        Example:
            >>> tool = registry.get("query_api")
            >>> if tool:
            ...     schema = tool.input_schema
        """
        # Risolvi alias
        resolved_name = self._alias_index.get(name.lower(), name)

        tool = self._name_index.get(resolved_name)
        if tool is None:
            # Cerca case-insensitive
            for tool_name, t in self._name_index.items():
                if tool_name.lower() == name.lower():
                    tool = t
                    break

        return tool

    def search(
        self,
        query: str,
        category: ToolCategory | None = None,
        tags: list[str] | None = None,
        limit: int = 10,
    ) -> list[ToolDefinition]:
        """
        Cerca tools per query, categoria o tag.

        Args:
            query: Stringa di ricerca
            category: Filtra per categoria
            tags: Filtra per tag
            limit: Massimo risultati

        Returns:
            Lista di tools matching

        Example:
            >>> tools = registry.search("api", category=ToolCategory.CORE)
            >>> print(f"Found {len(tools)} tools")
        """
        results: list[tuple[ToolDefinition, float]] = []
        query_lower = query.lower()
        query_words = set(query_lower.split())

        # Inizia con tutti i tools o filtra per categoria
        candidates: list[ToolDefinition]
        if category:
            candidates = list(self._category_index.get(category, []))
        else:
            candidates = list(self._name_index.values())

        # Filtra per tag se specificato
        if tags:
            tag_set = {t.lower() for t in tags}
            candidates = [
                t
                for t in candidates
                if any(tag.lower() in tag_set for tag in t.tags)
            ]

        # Calcola score per ogni candidato
        for tool in candidates:
            score = 0.0

            # Match esatto nome
            if tool.name.lower() == query_lower:
                score = 1.0
            # Match parziale nome
            elif query_lower in tool.name.lower():
                score = 0.8
            # Match parole nel nome
            elif query_words & set(tool.name.lower().split()):
                score = 0.6 * len(query_words & set(tool.name.lower().split())) / len(
                    query_words
                )
            # Match nella descrizione
            elif query_lower in tool.description.lower():
                score = 0.5
            # Match nei tag
            else:
                matching_tags = sum(
                    1 for tag in tool.tags if query_lower in tag.lower()
                )
                if matching_tags > 0:
                    score = 0.3 * matching_tags / max(len(tool.tags), 1)
                # Fuzzy match
                else:
                    name_ratio = SequenceMatcher(
                        None, query_lower, tool.name.lower()
                    ).ratio()
                    if name_ratio > 0.6:
                        score = name_ratio * 0.4

            # Bonus per priorita alta
            if tool.priority == ToolPriority.CRITICAL:
                score += 0.1
            elif tool.priority == ToolPriority.HIGH:
                score += 0.05

            # Penalita per deprecati
            if tool.deprecated:
                score -= 0.3

            if score > 0:
                results.append((tool, score))

        # Ordina per score decrescente
        results.sort(key=lambda x: x[1], reverse=True)

        return [tool for tool, _ in results[:limit]]

    async def execute_batch(
        self,
        requests: Sequence[dict[str, Any]],
        timeout: float = 30.0,
    ) -> list[Any]:
        """
        Esegue batch di tool calls in singolo round-trip.

        Args:
            requests: Lista di {name, input} dicts
            timeout: Timeout totale in secondi

        Returns:
            Lista di risultati nell'ordine delle richieste

        Example:
            >>> results = await registry.execute_batch([
            ...     {"name": "query_api", "input": {"endpoint": "/users"}},
            ...     {"name": "query_api", "input": {"endpoint": "/orders"}},
            ... ])
        """
        start_time = time.perf_counter()
        results: list[Any] = [None] * len(requests)
        errors: list[Exception | None] = [None] * len(requests)

        async def execute_single(idx: int, request: dict[str, Any]) -> tuple[int, Any]:
            """Esegue singola richiesta."""
            nonlocal results, errors

            tool_name = request.get("name", "")
            tool_input = request.get("input", {})

            try:
                tool = await self.get_tool(tool_name)
                if tool is None:
                    raise ValueError(f"Tool '{tool_name}' non trovato")

                if tool.deprecated:
                    logger.warning(
                        f"Tool '{tool_name}' e deprecato. Usa '{tool.replacement}'"
                    )

                result = await tool.handler(tool_input)
                self._execution_count += 1
                return idx, result

            except Exception as e:
                self._error_count += 1
                logger.warning(f"Error executing tool '{tool_name}': {e}")
                errors[idx] = e
                return idx, None

        try:
            # Esegui tutte le richieste in parallelo con timeout
            async with asyncio.timeout(timeout):
                tasks = [execute_single(i, req) for i, req in enumerate(requests)]
                completed = await asyncio.gather(*tasks, return_exceptions=True)

                for item in completed:
                    if isinstance(item, Exception):
                        logger.warning(f"Task failed with exception: {item}")
                    else:
                        idx, result = item
                        results[idx] = result

        except asyncio.TimeoutError:
            logger.error(f"Batch execution timed out after {timeout}s")
            for i in range(len(results)):
                if results[i] is None and errors[i] is None:
                    errors[i] = asyncio.TimeoutError(f"Batch timeout after {timeout}s")

        elapsed = time.perf_counter() - start_time
        logger.debug(
            f"Batch executed: {len(requests)} requests in {elapsed:.3f}s "
            f"(errors={sum(1 for e in errors if e is not None)})"
        )

        return results

    def get_by_category(self, category: ToolCategory) -> list[ToolDefinition]:
        """
        Ottiene tutti i tools di una categoria.

        Args:
            category: Categoria da filtrare

        Returns:
            Lista di tools nella categoria

        Example:
            >>> tools = registry.get_by_category(ToolCategory.CORE)
            >>> print(f"Found {len(tools)} core tools")
        """
        return list(self._category_index.get(category, []))

    def get_by_namespace(self, namespace: str) -> list[ToolDefinition]:
        """
        Ottiene tutti i tools di un namespace.

        Un namespace e definito dal prefisso del nome del tool
        separato da underscore (es. "mcp_canva" -> namespace "mcp").

        Args:
            namespace: Namespace da filtrare (case-insensitive)

        Returns:
            Lista di tools nel namespace

        Example:
            >>> tools = registry.get_by_namespace("mcp")
            >>> print(f"Found {len(tools)} MCP tools")
        """
        namespace_lower = namespace.lower()
        return [
            tool
            for tool in self._name_index.values()
            if tool.name.lower().startswith(f"{namespace_lower}_")
            or tool.name.lower().startswith(f"{namespace_lower}-")
        ]

    def get_stats(self) -> dict[str, Any]:
        """
        Ottiene statistiche del registry.

        Returns:
            Dict con total_tools, loaded_tools, by_category, etc.

        Example:
            >>> stats = registry.get_stats()
            >>> print(f"Total tools: {stats['total_tools']}")
        """
        by_category: dict[str, int] = {}
        for cat, tools in self._category_index.items():
            by_category[cat.value] = len(tools)

        by_priority: dict[str, int] = {}
        for tool in self._name_index.values():
            prio = tool.priority.name
            by_priority[prio] = by_priority.get(prio, 0) + 1

        deprecated_count = sum(1 for t in self._name_index.values() if t.deprecated)

        success_rate = 0.0
        if self._execution_count > 0:
            success_rate = (self._execution_count - self._error_count) / self._execution_count

        # Calcola namespaces
        namespaces: set[str] = set()
        for tool in self._name_index.values():
            parts = tool.name.replace("-", "_").split("_")
            if len(parts) > 1:
                namespaces.add(parts[0].lower())

        return {
            "total_tools": self._total_tools,
            "loaded_tools": self._loaded_tools,
            "by_category": by_category,
            "by_priority": by_priority,
            "namespaces": sorted(namespaces),
            "namespace_count": len(namespaces),
            "deprecated_tools": deprecated_count,
            "total_aliases": len(self._alias_index),
            "total_tags": len(self._tag_index),
            "execution_count": self._execution_count,
            "error_count": self._error_count,
            "success_rate": round(success_rate, 4),
            "lazy_loaders_pending": len(self._lazy_loaders),
        }

    def get_metrics(self) -> dict[str, Any]:
        """
        Alias per get_stats() - compatibilita API.

        Returns:
            Dict con metriche del registry

        Example:
            >>> metrics = registry.get_metrics()
            >>> print(f"Tool count: {metrics['total_tools']}")
        """
        return self.get_stats()

    async def hot_reload(self, tool_names: list[str]) -> int:
        """
        Ricarica tools senza downtime.

        Args:
            tool_names: Nomi dei tools da ricaricare

        Returns:
            Numero di tools ricaricati con successo

        Example:
            >>> reloaded = await registry.hot_reload(["tool1", "tool2"])
            >>> print(f"Reloaded {reloaded} tools")
        """
        reloaded = 0

        async with self._lock:
            for name in tool_names:
                tool = self._name_index.get(name)
                if tool is None:
                    logger.warning(f"Cannot hot reload: tool '{name}' not found")
                    continue

                try:
                    # Verifica lazy loader
                    loader = self._lazy_loaders.get(name)
                    if loader:
                        new_tool = await loader()

                        # Rimuovi vecchio
                        self.unregister(name)

                        # Registra nuovo
                        self.register(new_tool)
                        new_tool._loaded = True
                        self._loaded_tools += 1
                    else:
                        # Senza loader, marca come ricaricato
                        tool._loaded = True
                        if name not in [t.name for t in self._name_index.values() if t._loaded]:
                            self._loaded_tools += 1

                    reloaded += 1
                    logger.info(f"Hot reloaded tool: {name}")

                except Exception as e:
                    logger.error(f"Failed to hot reload tool '{name}': {e}")

        return reloaded

    def export_tools(self) -> list[dict[str, Any]]:
        """
        Esporta tutti i tools in formato Claude API.

        Returns:
            Lista di tool definitions in formato Claude

        Example:
            >>> tools = registry.export_tools()
            >>> # Passa a Claude API
            >>> response = client.messages.create(
            ...     model="claude-3-opus",
            ...     tools=tools,
            ...     messages=[...]
            ... )
        """
        exported: list[dict[str, Any]] = []

        for tool in self._name_index.values():
            try:
                exported.append(tool.to_claude_format())
            except Exception as e:
                logger.warning(f"Failed to export tool '{tool.name}': {e}")

        # Ordina per priorita (CRITICAL prima)
        priority_order = {ToolPriority.CRITICAL: 0, ToolPriority.HIGH: 1, ToolPriority.NORMAL: 2, ToolPriority.LOW: 3}
        exported_with_priority = [
            (tool.to_claude_format(), priority_order.get(tool.priority, 99))
            for tool in self._name_index.values()
        ]
        exported_with_priority.sort(key=lambda x: x[1])

        return [t for t, _ in exported_with_priority]

    def register_lazy_loader(
        self,
        name: str,
        loader: Callable[[], Coroutine[Any, Any, ToolDefinition]],
    ) -> None:
        """
        Registra un lazy loader per un tool.

        Args:
            name: Nome del tool
            loader: Funzione async che carica il tool

        Example:
            >>> async def load_heavy_tool():
            ...     # Caricamento costoso
            ...     return ToolDefinition(...)
            >>> registry.register_lazy_loader("heavy_tool", load_heavy_tool)
        """
        self._lazy_loaders[name] = loader
        logger.debug(f"Registered lazy loader for: {name}")
