"""
ORCHESTRATOR V16 - CLAUDE TOOL CALLING CORE

Il CUORE dell'orchestrator basato su 3 componenti Claude:
1. Programmatic Tool Calling - Esecuzione tool in container sandboxed
2. Tool Search Tool - Ricerca dinamica tool con defer_loading
3. Fine-Grained Tool Streaming - Streaming parametri senza buffering

Reference:
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/fine-grained-tool-streaming

Version: V16.0.0
Author: Orchestrator System
Date: 2026-03-09
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Union
from uuid import uuid4

# Configure logging
logger = logging.getLogger(__name__)


# =============================================================================
# ENUMS AND CONSTANTS
# =============================================================================

class ToolSearchVariant(Enum):
    """Varianti del tool search di Claude."""
    REGEX = "tool_search_tool_regex_20251119"
    BM25 = "tool_search_tool_bm25_20251119"


class ToolCaller(Enum):
    """Chi può chiamare un tool."""
    DIRECT = "direct"
    CODE_EXECUTION = "code_execution_20260120"


class ToolExecutionMode(Enum):
    """Modalità di esecuzione tool."""
    STANDARD = "standard"  # Chiamata diretta
    PROGRAMMATIC = "programmatic"  # In container sandboxed
    STREAMING = "streaming"  # Fine-grained streaming


# Constants
CODE_EXECUTION_TYPE = "code_execution_20260120"
TOOL_SEARCH_REGEX_TYPE = "tool_search_tool_regex_20251119"
TOOL_SEARCH_BM25_TYPE = "tool_search_tool_bm25_20251119"
MAX_TOOLS_CATALOG = 10000
MAX_SEARCH_RESULTS = 5
MAX_PATTERN_LENGTH = 200
DEFAULT_CONTAINER_TTL = 270  # 4.5 minutes


# =============================================================================
# DATA CLASSES
# =============================================================================

@dataclass
class ClaudeToolConfig:
    """Configurazione per un tool Claude."""
    name: str
    description: str
    input_schema: Dict[str, Any]
    defer_loading: bool = False
    allowed_callers: List[str] = field(default_factory=lambda: [ToolCaller.DIRECT.value])
    eager_input_streaming: bool = False

    def to_claude_format(self) -> Dict[str, Any]:
        """Converte in formato Claude API."""
        tool: Dict[str, Any] = {
            "name": self.name,
            "description": self.description,
            "input_schema": self.input_schema,
        }

        if self.defer_loading:
            tool["defer_loading"] = True

        if self.allowed_callers != [ToolCaller.DIRECT.value]:
            tool["allowed_callers"] = self.allowed_callers

        if self.eager_input_streaming:
            tool["eager_input_streaming"] = True

        return tool


@dataclass
class ToolReference:
    """Riferimento a un tool scoperto tramite tool search."""
    tool_name: str

    def to_claude_format(self) -> Dict[str, str]:
        return {"type": "tool_reference", "tool_name": self.tool_name}


@dataclass
class ToolSearchResult:
    """Risultato di una ricerca tool."""
    query: str
    tool_references: List[ToolReference]
    search_time_ms: float

    def to_claude_format(self) -> Dict[str, Any]:
        return {
            "type": "tool_search_tool_search_result",
            "tool_references": [ref.to_claude_format() for ref in self.tool_references],
        }


@dataclass
class ContainerContext:
    """Contesto di esecuzione container."""
    container_id: str
    created_at: float
    ttl: int = DEFAULT_CONTAINER_TTL
    tools_loaded: List[str] = field(default_factory=list)
    execution_count: int = 0

    @property
    def is_expired(self) -> bool:
        return time.time() - self.created_at > self.ttl


@dataclass
class ProgrammaticCode:
    """Codice Python da eseguire nel container."""
    code: str
    tools_available: List[str] = field(default_factory=list)

    def to_claude_format(self) -> Dict[str, str]:
        return {"type": CODE_EXECUTION_TYPE, "source_code": self.code}


# =============================================================================
# TOOL REGISTRY
# =============================================================================

class ClaudeToolRegistry:
    """
    Registry centralizzato per tutti i tool Claude.

    Features:
    - Supporto per 10,000+ tool
    - Ricerca BM25 e regex
    - Deferred loading per efficienza contesto
    - Caching delle ricerche
    """

    def __init__(self, max_tools: int = MAX_TOOLS_CATALOG):
        self._tools: Dict[str, ClaudeToolConfig] = {}
        self._deferred_tools: Dict[str, ClaudeToolConfig] = {}
        self._search_cache: Dict[str, ToolSearchResult] = {}
        self._max_tools = max_tools

    def register(self, tool: ClaudeToolConfig) -> None:
        """Registra un nuovo tool."""
        if len(self._tools) + len(self._deferred_tools) >= self._max_tools:
            raise ValueError(f"Maximum tools limit reached: {self._max_tools}")

        if tool.defer_loading:
            self._deferred_tools[tool.name] = tool
        else:
            self._tools[tool.name] = tool

        logger.debug(f"Registered tool: {tool.name} (deferred={tool.defer_loading})")

    def register_batch(self, tools: List[ClaudeToolConfig]) -> None:
        """Registra multipli tool."""
        for tool in tools:
            self.register(tool)

    def get(self, name: str) -> Optional[ClaudeToolConfig]:
        """Ottiene un tool per nome."""
        return self._tools.get(name) or self._deferred_tools.get(name)

    def get_all_loaded(self) -> List[ClaudeToolConfig]:
        """Ottiene tutti i tool caricati (non deferred)."""
        return list(self._tools.values())

    def get_all_deferred(self) -> List[ClaudeToolConfig]:
        """Ottiene tutti i tool deferred."""
        return list(self._deferred_tools.values())

    def search_regex(self, pattern: str) -> ToolSearchResult:
        """
        Cerca tool usando regex Python.

        Args:
            pattern: Pattern regex (es. "weather", "get_.*_data")

        Returns:
            ToolSearchResult con massimo 5 tool
        """
        start_time = time.time()

        # Check cache
        cache_key = f"regex:{pattern}"
        if cache_key in self._search_cache:
            return self._search_cache[cache_key]

        # Validate pattern
        if len(pattern) > MAX_PATTERN_LENGTH:
            raise ValueError(f"Pattern too long: {len(pattern)} > {MAX_PATTERN_LENGTH}")

        try:
            regex = re.compile(pattern, re.IGNORECASE)
        except re.error as e:
            raise ValueError(f"Invalid regex pattern: {e}")

        # Search in all tools (loaded + deferred)
        all_tools = list(self._tools.values()) + list(self._deferred_tools.values())
        matches: List[ToolReference] = []

        for tool in all_tools:
            # Search in name, description, and argument names/descriptions
            searchable = self._get_searchable_text(tool)
            if regex.search(searchable):
                matches.append(ToolReference(tool_name=tool.name))
                if len(matches) >= MAX_SEARCH_RESULTS:
                    break

        result = ToolSearchResult(
            query=pattern,
            tool_references=matches,
            search_time_ms=(time.time() - start_time) * 1000,
        )

        # Cache result
        self._search_cache[cache_key] = result
        return result

    def search_bm25(self, query: str) -> ToolSearchResult:
        """
        Cerca tool usando BM25 (natural language).

        Args:
            query: Query in linguaggio naturale

        Returns:
            ToolSearchResult con massimo 5 tool
        """
        start_time = time.time()

        # Check cache
        cache_key = f"bm25:{query}"
        if cache_key in self._search_cache:
            return self._search_cache[cache_key]

        # Simple BM25-like scoring (production should use proper BM25)
        query_terms = set(query.lower().split())
        all_tools = list(self._tools.values()) + list(self._deferred_tools.values())

        scores: List[tuple] = []
        for tool in all_tools:
            searchable = self._get_searchable_text(tool).lower()
            score = sum(1 for term in query_terms if term in searchable)
            if score > 0:
                scores.append((score, tool.name))

        # Sort by score, take top 5
        scores.sort(reverse=True)
        matches = [ToolReference(tool_name=name) for _, name in scores[:MAX_SEARCH_RESULTS]]

        result = ToolSearchResult(
            query=query,
            tool_references=matches,
            search_time_ms=(time.time() - start_time) * 1000,
        )

        self._search_cache[cache_key] = result
        return result

    def _get_searchable_text(self, tool: ClaudeToolConfig) -> str:
        """Ottiene tutto il testo searchable di un tool."""
        parts = [tool.name, tool.description]

        schema = tool.input_schema
        if "properties" in schema:
            for prop_name, prop_def in schema["properties"].items():
                parts.append(prop_name)
                if isinstance(prop_def, dict) and "description" in prop_def:
                    parts.append(prop_def["description"])

        return " ".join(parts)

    def expand_references(self, references: List[ToolReference]) -> List[ClaudeToolConfig]:
        """Espande tool_reference in tool completi."""
        tools = []
        for ref in references:
            tool = self.get(ref.tool_name)
            if tool:
                tools.append(tool)
        return tools

    def to_claude_tools(self, include_search: bool = True,
                        search_variant: ToolSearchVariant = ToolSearchVariant.BM25) -> List[Dict]:
        """Converte tutti i tool in formato Claude API."""
        tools: List[Dict] = []

        # Add tool search tool if requested
        if include_search:
            tools.append({
                "type": search_variant.value,
                "name": f"tool_search_tool_{search_variant.name.lower()}",
            })

        # Add non-deferred tools
        for tool in self._tools.values():
            tools.append(tool.to_claude_format())

        # Add deferred tools (just reference, not full definition)
        for tool in self._deferred_tools.values():
            tools.append(tool.to_claude_format())

        return tools

    def clear_cache(self) -> None:
        """Pulisce la cache delle ricerche."""
        self._search_cache.clear()


# =============================================================================
# CONTAINER MANAGER
# =============================================================================

class ClaudeContainerManager:
    """
    Gestisce container sandboxed per Programmatic Tool Calling.

    Features:
    - Container lifecycle management
    - Container reuse per sessioni
    - TTL automatico
    - Resource cleanup
    """

    def __init__(self, default_ttl: int = DEFAULT_CONTAINER_TTL):
        self._containers: Dict[str, ContainerContext] = {}
        self._default_ttl = default_ttl
        self._lock = asyncio.Lock()

    async def create_container(self, ttl: Optional[int] = None) -> ContainerContext:
        """Crea un nuovo container."""
        async with self._lock:
            container_id = f"container_{uuid4().hex[:12]}"
            container = ContainerContext(
                container_id=container_id,
                created_at=time.time(),
                ttl=ttl or self._default_ttl,
            )
            self._containers[container_id] = container
            logger.info(f"Created container: {container_id}")
            return container

    async def get_container(self, container_id: str) -> Optional[ContainerContext]:
        """Ottiene un container esistente."""
        async with self._lock:
            container = self._containers.get(container_id)
            if container and not container.is_expired:
                return container
            return None

    async def reuse_or_create(self, container_id: Optional[str] = None) -> ContainerContext:
        """Riutilizza un container esistente o ne crea uno nuovo."""
        if container_id:
            container = await self.get_container(container_id)
            if container:
                return container

        return await self.create_container()

    async def load_tool(self, container_id: str, tool_name: str,
                       registry: ClaudeToolRegistry) -> bool:
        """Carica un tool nel container."""
        container = await self.get_container(container_id)
        if not container:
            return False

        tool = registry.get(tool_name)
        if not tool:
            return False

        if tool_name not in container.tools_loaded:
            container.tools_loaded.append(tool_name)
            logger.debug(f"Loaded tool {tool_name} into container {container_id}")

        return True

    async def execute_code(self, container_id: str, code: str) -> Dict[str, Any]:
        """
        Esegue codice Python nel container.

        In produzione, questo delega a Claude API con code_execution tool.
        Qui simuliamo per testing.
        """
        container = await self.get_container(container_id)
        if not container:
            raise ValueError(f"Container not found: {container_id}")

        container.execution_count += 1

        # In produzione: chiamata Claude API con code_execution
        # Per ora, ritorna struttura simulata
        return {
            "type": "code_execution_result",
            "container_id": container_id,
            "execution_id": f"exec_{uuid4().hex[:8]}",
            "code": code,
            "tools_available": container.tools_loaded,
        }

    async def cleanup_expired(self) -> int:
        """Rimuove container scaduti."""
        async with self._lock:
            expired = [
                cid for cid, container in self._containers.items()
                if container.is_expired
            ]
            for cid in expired:
                del self._containers[cid]
                logger.info(f"Cleaned up expired container: {cid}")
            return len(expired)

    async def shutdown_container(self, container_id: str) -> bool:
        """Termina un container."""
        async with self._lock:
            if container_id in self._containers:
                del self._containers[container_id]
                logger.info(f"Shutdown container: {container_id}")
                return True
            return False


# =============================================================================
# PROGRAMMATIC TOOL EXECUTOR
# =============================================================================

class ProgrammaticToolExecutor:
    """
    Esegue tool in modalità programmatica.

    Features:
    - Zero round-trip per chiamate multiple
    - Token savings con filtering
    - Logica condizionale in Python
    - Parallelismo nativo async
    """

    def __init__(self, registry: ClaudeToolRegistry,
                 container_manager: ClaudeContainerManager):
        self._registry = registry
        self._container_manager = container_manager

    async def execute_batch(self, tool_calls: List[Dict[str, Any]],
                           container_id: Optional[str] = None) -> List[Dict]:
        """
        Esegue multiple tool calls in un singolo round-trip.

        Claude genera codice Python che viene eseguito nel container,
        eliminando N round-trip per N chiamate.
        """
        # Ottieni o crea container
        container = await self._container_manager.reuse_or_create(container_id)

        # Carica tool necessari
        for call in tool_calls:
            tool_name = call.get("name") or call.get("tool_name")
            if tool_name:
                await self._container_manager.load_tool(
                    container.container_id, tool_name, self._registry
                )

        # Claude genera codice Python per eseguire le chiamate
        code = self._generate_batch_code(tool_calls)

        # Esegui nel container
        result = await self._container_manager.execute_code(
            container.container_id, code
        )

        return [result]

    def _generate_batch_code(self, tool_calls: List[Dict]) -> str:
        """Genera codice Python per batch execution."""
        lines = ["# Auto-generated by ProgrammaticToolExecutor", ""]

        for i, call in enumerate(tool_calls):
            tool_name = call.get("name") or call.get("tool_name", f"tool_{i}")
            args = call.get("input", call.get("arguments", {}))

            lines.append(f"# Tool call {i+1}: {tool_name}")
            lines.append(f"result_{i} = await {tool_name}(**{json.dumps(args)})")
            lines.append("")

        lines.append("# Aggregate results")
        lines.append("results = [")
        for i in range(len(tool_calls)):
            lines.append(f"    result_{i},")
        lines.append("]")
        lines.append("print(json.dumps(results))")

        return "\n".join(lines)

    async def execute_with_filter(self, tool_name: str, filter_func: str,
                                  container_id: Optional[str] = None) -> List[Dict]:
        """
        Esegue tool e filtra risultati nel container.

        Token savings: solo risultati filtrati ritornano al modello.
        """
        container = await self._container_manager.reuse_or_create(container_id)
        await self._container_manager.load_tool(
            container.container_id, tool_name, self._registry
        )

        code = f"""
# Execute tool and filter results
raw_data = await {tool_name}()
filtered = [{filter_func}(item) for item in raw_data]
print(json.dumps(filtered))
"""
        return await self._container_manager.execute_code(
            container.container_id, code
        )

    async def execute_conditional(self, conditions: List[Dict],
                                  container_id: Optional[str] = None) -> Dict:
        """
        Esegue tool con logica condizionale nel container.
        """
        container = await self._container_manager.reuse_or_create(container_id)

        # Carica tutti i tool potenzialmente necessari
        for cond in conditions:
            for tool_name in cond.get("tools", []):
                await self._container_manager.load_tool(
                    container.container_id, tool_name, self._registry
                )

        code = self._generate_conditional_code(conditions)
        return await self._container_manager.execute_code(
            container.container_id, code
        )

    def _generate_conditional_code(self, conditions: List[Dict]) -> str:
        """Genera codice condizionale."""
        lines = ["# Conditional tool execution", ""]

        for i, cond in enumerate(conditions):
            condition = cond.get("condition", "True")
            tool_name = cond.get("tool")
            args = cond.get("arguments", {})

            lines.append(f"if {condition}:")
            lines.append(f"    result_{i} = await {tool_name}(**{json.dumps(args)})")
            lines.append("else:")
            lines.append(f"    result_{i} = None")
            lines.append("")

        return "\n".join(lines)


# =============================================================================
# FINE-GRAINED STREAMING
# =============================================================================

class FineGrainedStreaming:
    """
    Gestisce fine-grained tool streaming.

    Features:
    - Streaming parametri senza buffering
    - Riduzione latenza per parametri grandi
    - Gestione JSON incompleti
    """

    @staticmethod
    def create_streaming_tool(tool: ClaudeToolConfig) -> ClaudeToolConfig:
        """Abilita streaming su un tool."""
        tool.eager_input_streaming = True
        return tool

    @staticmethod
    def handle_incomplete_json(partial: str) -> Dict[str, Any]:
        """
        Gestisce JSON incompleti da streaming.

        Wrap in object per passare al modello in caso di errore.
        """
        return {
            "type": "incomplete_json_wrapper",
            "raw_content": partial,
            "error": "Stream ended before JSON completed",
        }

    @staticmethod
    def parse_streaming_chunks(chunks: List[str]) -> Optional[Dict]:
        """
        Parse chunks streaming in un JSON completo.

        Returns None se JSON incompleto.
        """
        full_json = "".join(chunks)
        try:
            return json.loads(full_json)
        except json.JSONDecodeError:
            return None


# =============================================================================
# ORCHESTRATOR INTEGRATION
# =============================================================================

class OrchestratorClaudeCore:
    """
    Punto di integrazione principale per Orchestrator V16.

    Usage:
        core = OrchestratorClaudeCore()
        await core.initialize()

        # Register tools
        core.register_tool(ClaudeToolConfig(...))

        # Execute with programmatic calling
        result = await core.execute_programmatic([...])

        # Search tools
        results = core.search_tools("weather")
    """

    def __init__(self, config: Optional[Dict] = None):
        self._config = config or {}
        self._registry = ClaudeToolRegistry(
            max_tools=self._config.get("max_tools", MAX_TOOLS_CATALOG)
        )
        self._container_manager = ClaudeContainerManager(
            default_ttl=self._config.get("container_ttl", DEFAULT_CONTAINER_TTL)
        )
        self._executor = ProgrammaticToolExecutor(
            self._registry, self._container_manager
        )
        self._initialized = False

    async def initialize(self) -> None:
        """Inizializza il core."""
        if self._initialized:
            return

        # Register built-in tools
        self._register_builtin_tools()

        self._initialized = True
        logger.info("OrchestratorClaudeCore V16 initialized")

    def _register_builtin_tools(self) -> None:
        """Registra tool built-in dell'orchestrator."""
        # Code execution tool (OBBLIGATORIO per programmatic)
        code_execution = ClaudeToolConfig(
            name="code_execution",
            description="Execute Python code in sandboxed container",
            input_schema={
                "type": "object",
                "properties": {
                    "code": {"type": "string", "description": "Python code to execute"}
                },
                "required": ["code"],
            },
            allowed_callers=[ToolCaller.DIRECT.value],  # Claude chiama direttamente
        )
        self._registry.register(code_execution)

    def register_tool(self, tool: ClaudeToolConfig) -> None:
        """Registra un tool."""
        self._registry.register(tool)

    def register_tools(self, tools: List[ClaudeToolConfig]) -> None:
        """Registra multipli tool."""
        self._registry.register_batch(tools)

    def search_tools(self, query: str,
                    variant: ToolSearchVariant = ToolSearchVariant.BM25) -> ToolSearchResult:
        """Cerca tool."""
        if variant == ToolSearchVariant.REGEX:
            return self._registry.search_regex(query)
        return self._registry.search_bm25(query)

    async def execute_programmatic(self, tool_calls: List[Dict],
                                   container_id: Optional[str] = None) -> List[Dict]:
        """Esegue tool in modalità programmatica."""
        return await self._executor.execute_batch(tool_calls, container_id)

    def get_tools_for_claude(self, include_search: bool = True,
                            search_variant: ToolSearchVariant = ToolSearchVariant.BM25) -> List[Dict]:
        """Ottiene tutti i tool in formato Claude API."""
        return self._registry.to_claude_tools(include_search, search_variant)

    async def cleanup(self) -> None:
        """Cleanup risorse."""
        expired = await self._container_manager.cleanup_expired()
        self._registry.clear_cache()
        logger.info(f"Cleanup completed: {expired} containers removed")


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def create_programmatic_tool(name: str, description: str,
                            input_schema: Dict,
                            eager_streaming: bool = False) -> ClaudeToolConfig:
    """Crea un tool per programmatic calling."""
    return ClaudeToolConfig(
        name=name,
        description=description,
        input_schema=input_schema,
        defer_loading=True,
        allowed_callers=[ToolCaller.CODE_EXECUTION.value],
        eager_input_streaming=eager_streaming,
    )


def create_standard_tool(name: str, description: str,
                        input_schema: Dict) -> ClaudeToolConfig:
    """Crea un tool standard (non-programmatic)."""
    return ClaudeToolConfig(
        name=name,
        description=description,
        input_schema=input_schema,
        defer_loading=False,
        allowed_callers=[ToolCaller.DIRECT.value],
    )


def create_streaming_tool(name: str, description: str,
                         input_schema: Dict) -> ClaudeToolConfig:
    """Crea un tool con fine-grained streaming."""
    return ClaudeToolConfig(
        name=name,
        description=description,
        input_schema=input_schema,
        defer_loading=False,
        allowed_callers=[ToolCaller.DIRECT.value],
        eager_input_streaming=True,
    )


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    # Core classes
    "OrchestratorClaudeCore",
    "ClaudeToolRegistry",
    "ClaudeContainerManager",
    "ProgrammaticToolExecutor",
    "FineGrainedStreaming",

    # Data classes
    "ClaudeToolConfig",
    "ToolReference",
    "ToolSearchResult",
    "ContainerContext",
    "ProgrammaticCode",

    # Enums
    "ToolSearchVariant",
    "ToolCaller",
    "ToolExecutionMode",

    # Convenience functions
    "create_programmatic_tool",
    "create_standard_tool",
    "create_streaming_tool",

    # Constants
    "CODE_EXECUTION_TYPE",
    "TOOL_SEARCH_REGEX_TYPE",
    "TOOL_SEARCH_BM25_TYPE",
    "MAX_TOOLS_CATALOG",
    "MAX_SEARCH_RESULTS",
    "MAX_PATTERN_LENGTH",
    "DEFAULT_CONTAINER_TTL",
]
