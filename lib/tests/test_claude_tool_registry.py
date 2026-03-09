"""
Test per ClaudeToolRegistry - V17

Testa tutte le funzionalita del registry:
- Registrazione e deregistrazione
- Indicizzazione a 4 livelli
- Ricerca fuzzy
- Batch execution
- Hot reload
- Export tools
"""

from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock

import pytest

from lib.v17.claude_tool_registry import (
    ClaudeToolRegistry,
    ToolCategory,
    ToolDefinition,
    ToolPriority,
)


@pytest.fixture
def sample_tool() -> ToolDefinition:
    """Crea un tool di esempio."""

    async def handler(inp: dict) -> dict:
        return {"result": inp.get("value", 0) * 2}

    return ToolDefinition(
        name="test_tool",
        description="A test tool for testing",
        input_schema={
            "type": "object",
            "properties": {"value": {"type": "integer"}},
        },
        handler=handler,
        category=ToolCategory.CORE,
        priority=ToolPriority.HIGH,
        tags=["test", "example"],
        aliases=["tt", "test"],
    )


@pytest.fixture
def registry() -> ClaudeToolRegistry:
    """Crea un registry vuoto."""
    return ClaudeToolRegistry()


class TestToolDefinition:
    """Test per ToolDefinition."""

    def test_to_claude_format_basic(self, sample_tool: ToolDefinition) -> None:
        """Verifica conversione formato base."""
        result = sample_tool.to_claude_format()

        assert result["name"] == "test_tool"
        assert result["description"] == "A test tool for testing"
        assert "input_schema" in result
        assert result["input_schema"]["type"] == "object"

    def test_to_claude_format_deprecated(self) -> None:
        """Verifica che deprecated sia incluso."""
        async def h(inp: dict) -> dict:
            return {}

        tool = ToolDefinition(
            name="old_tool",
            description="Deprecated tool",
            input_schema={"type": "object"},
            handler=h,
            deprecated=True,
            replacement="new_tool",
        )

        result = tool.to_claude_format()
        assert result.get("deprecated") is True
        assert result.get("replacement") == "new_tool"

    def test_to_claude_format_version(self) -> None:
        """Verifica che versione sia inclusa se non default."""
        async def h(inp: dict) -> dict:
            return {}

        tool = ToolDefinition(
            name="versioned_tool",
            description="Versioned",
            input_schema={"type": "object"},
            handler=h,
            version="2.0.0",
        )

        result = tool.to_claude_format()
        assert result.get("version") == "2.0.0"


class TestClaudeToolRegistry:
    """Test per ClaudeToolRegistry."""

    def test_register_tool(self, registry: ClaudeToolRegistry, sample_tool: ToolDefinition) -> None:
        """Verifica registrazione tool."""
        registry.register(sample_tool)

        assert registry._total_tools == 1
        assert "test_tool" in registry._name_index

    def test_register_duplicate_raises(self, registry: ClaudeToolRegistry, sample_tool: ToolDefinition) -> None:
        """Verifica che duplicato sollevi errore."""
        registry.register(sample_tool)

        with pytest.raises(ValueError, match="gia registrato"):
            registry.register(sample_tool)

    def test_register_indexes_by_category(self, registry: ClaudeToolRegistry, sample_tool: ToolDefinition) -> None:
        """Verifica indicizzazione per categoria."""
        registry.register(sample_tool)

        assert sample_tool in registry._category_index[ToolCategory.CORE]

    def test_register_indexes_by_tag(self, registry: ClaudeToolRegistry, sample_tool: ToolDefinition) -> None:
        """Verifica indicizzazione per tag."""
        registry.register(sample_tool)

        assert sample_tool in registry._tag_index.get("test", [])
        assert sample_tool in registry._tag_index.get("example", [])

    def test_register_indexes_aliases(self, registry: ClaudeToolRegistry, sample_tool: ToolDefinition) -> None:
        """Verifica indicizzazione alias."""
        registry.register(sample_tool)

        assert registry._alias_index.get("tt") == "test_tool"
        assert registry._alias_index.get("test") == "test_tool"

    def test_unregister_tool(self, registry: ClaudeToolRegistry, sample_tool: ToolDefinition) -> None:
        """Verifica deregistrazione tool."""
        registry.register(sample_tool)
        result = registry.unregister("test_tool")

        assert result is True
        assert registry._total_tools == 0
        assert "test_tool" not in registry._name_index

    def test_unregister_nonexistent(self, registry: ClaudeToolRegistry) -> None:
        """Verifica deregistrazione tool inesistente."""
        result = registry.unregister("nonexistent")
        assert result is False

    def test_unregister_removes_from_all_indexes(self, registry: ClaudeToolRegistry, sample_tool: ToolDefinition) -> None:
        """Verifica rimozione da tutti gli indici."""
        registry.register(sample_tool)
        registry.unregister("test_tool")

        assert sample_tool not in registry._category_index[ToolCategory.CORE]
        assert "test" not in registry._tag_index
        assert "tt" not in registry._alias_index

    @pytest.mark.asyncio
    async def test_get_tool_by_name(self, registry: ClaudeToolRegistry, sample_tool: ToolDefinition) -> None:
        """Verifica get tool per nome."""
        registry.register(sample_tool)
        tool = await registry.get_tool("test_tool")

        assert tool is not None
        assert tool.name == "test_tool"

    @pytest.mark.asyncio
    async def test_get_tool_by_alias(self, registry: ClaudeToolRegistry, sample_tool: ToolDefinition) -> None:
        """Verifica get tool per alias."""
        registry.register(sample_tool)
        tool = await registry.get_tool("tt")

        assert tool is not None
        assert tool.name == "test_tool"

    @pytest.mark.asyncio
    async def test_get_tool_nonexistent(self, registry: ClaudeToolRegistry) -> None:
        """Verifica get tool inesistente."""
        tool = await registry.get_tool("nonexistent")
        assert tool is None

    def test_search_by_query(self, registry: ClaudeToolRegistry, sample_tool: ToolDefinition) -> None:
        """Verifica ricerca per query."""
        registry.register(sample_tool)
        results = registry.search("test")

        assert len(results) > 0
        assert results[0].name == "test_tool"

    def test_search_by_category(self, registry: ClaudeToolRegistry, sample_tool: ToolDefinition) -> None:
        """Verifica ricerca con filtro categoria."""
        registry.register(sample_tool)
        results = registry.search("test", category=ToolCategory.CORE)

        assert len(results) > 0

        # Aggiungi tool di categoria diversa
        async def h(inp: dict) -> dict:
            return {}

        other_tool = ToolDefinition(
            name="other",
            description="Other test",
            input_schema={"type": "object"},
            handler=h,
            category=ToolCategory.MCP,
        )
        registry.register(other_tool)

        results = registry.search("test", category=ToolCategory.MCP)
        assert len(results) == 1
        assert results[0].name == "other"

    def test_search_by_tags(self, registry: ClaudeToolRegistry, sample_tool: ToolDefinition) -> None:
        """Verifica ricerca con filtro tag."""
        registry.register(sample_tool)
        results = registry.search("test", tags=["example"])

        assert len(results) > 0

    def test_search_limit(self, registry: ClaudeToolRegistry) -> None:
        """Verifica limite risultati."""
        async def h(inp: dict) -> dict:
            return {}

        for i in range(20):
            tool = ToolDefinition(
                name=f"tool_{i}",
                description=f"Test tool {i}",
                input_schema={"type": "object"},
                handler=h,
                tags=["test"],
            )
            registry.register(tool)

        results = registry.search("test", limit=5)
        assert len(results) == 5

    def test_search_fuzzy_matching(self, registry: ClaudeToolRegistry) -> None:
        """Verifica fuzzy matching."""
        async def h(inp: dict) -> dict:
            return {}

        tool = ToolDefinition(
            name="query_api_users",
            description="Query users API",
            input_schema={"type": "object"},
            handler=h,
        )
        registry.register(tool)

        results = registry.search("query api")
        assert len(results) > 0

    @pytest.mark.asyncio
    async def test_execute_batch(self, registry: ClaudeToolRegistry, sample_tool: ToolDefinition) -> None:
        """Verifica batch execution."""
        registry.register(sample_tool)

        requests = [
            {"name": "test_tool", "input": {"value": 5}},
            {"name": "test_tool", "input": {"value": 10}},
            {"name": "test_tool", "input": {"value": 15}},
        ]

        results = await registry.execute_batch(requests)

        assert len(results) == 3
        assert results[0] == {"result": 10}
        assert results[1] == {"result": 20}
        assert results[2] == {"result": 30}

    @pytest.mark.asyncio
    async def test_execute_batch_parallel(self, registry: ClaudeToolRegistry) -> None:
        """Verifica esecuzione parallela."""
        call_order: list[int] = []

        async def slow_handler(inp: dict) -> dict:
            call_order.append(inp["id"])
            await asyncio.sleep(0.1)
            return {"id": inp["id"]}

        tool = ToolDefinition(
            name="slow_tool",
            description="Slow tool",
            input_schema={"type": "object"},
            handler=slow_handler,
        )
        registry.register(tool)

        requests = [
            {"name": "slow_tool", "input": {"id": 1}},
            {"name": "slow_tool", "input": {"id": 2}},
            {"name": "slow_tool", "input": {"id": 3}},
        ]

        start = asyncio.get_event_loop().time()
        results = await registry.execute_batch(requests)
        elapsed = asyncio.get_event_loop().time() - start

        # Se parallelo, dovrebbe completare in ~0.1s, non 0.3s
        assert elapsed < 0.25
        assert len(results) == 3

    @pytest.mark.asyncio
    async def test_execute_batch_timeout(self, registry: ClaudeToolRegistry) -> None:
        """Verifica timeout batch execution."""

        async def slow_handler(inp: dict) -> dict:
            await asyncio.sleep(5)
            return {"done": True}

        tool = ToolDefinition(
            name="very_slow",
            description="Very slow tool",
            input_schema={"type": "object"},
            handler=slow_handler,
        )
        registry.register(tool)

        requests = [{"name": "very_slow", "input": {}}]

        results = await registry.execute_batch(requests, timeout=0.5)

        # Dovrebbe timeout e ritornare None
        assert results[0] is None

    @pytest.mark.asyncio
    async def test_execute_batch_missing_tool(self, registry: ClaudeToolRegistry) -> None:
        """Verifica gestione tool mancante."""
        requests = [{"name": "nonexistent", "input": {}}]

        results = await registry.execute_batch(requests)

        assert results[0] is None

    def test_get_stats(self, registry: ClaudeToolRegistry, sample_tool: ToolDefinition) -> None:
        """Verifica statistiche registry."""
        registry.register(sample_tool)

        stats = registry.get_stats()

        assert stats["total_tools"] == 1
        assert stats["by_category"]["core"] == 1
        assert stats["by_priority"]["HIGH"] == 1
        assert stats["total_aliases"] == 2
        assert stats["total_tags"] == 2

    def test_get_metrics_alias(self, registry: ClaudeToolRegistry, sample_tool: ToolDefinition) -> None:
        """Verifica che get_metrics sia alias di get_stats."""
        registry.register(sample_tool)

        stats = registry.get_stats()
        metrics = registry.get_metrics()

        assert stats == metrics

    def test_get_sync(self, registry: ClaudeToolRegistry, sample_tool: ToolDefinition) -> None:
        """Verifica get sincrono."""
        registry.register(sample_tool)

        tool = registry.get("test_tool")
        assert tool is not None
        assert tool.name == "test_tool"

    def test_get_sync_by_alias(self, registry: ClaudeToolRegistry, sample_tool: ToolDefinition) -> None:
        """Verifica get sincrono per alias."""
        registry.register(sample_tool)

        tool = registry.get("tt")
        assert tool is not None
        assert tool.name == "test_tool"

    def test_get_sync_nonexistent(self, registry: ClaudeToolRegistry) -> None:
        """Verifica get sincrono per tool inesistente."""
        tool = registry.get("nonexistent")
        assert tool is None

    def test_get_by_category(self, registry: ClaudeToolRegistry, sample_tool: ToolDefinition) -> None:
        """Verifica get_by_category."""
        registry.register(sample_tool)

        async def h(inp: dict) -> dict:
            return {}

        other_tool = ToolDefinition(
            name="mcp_tool",
            description="MCP tool",
            input_schema={"type": "object"},
            handler=h,
            category=ToolCategory.MCP,
        )
        registry.register(other_tool)

        core_tools = registry.get_by_category(ToolCategory.CORE)
        mcp_tools = registry.get_by_category(ToolCategory.MCP)

        assert len(core_tools) == 1
        assert core_tools[0].name == "test_tool"
        assert len(mcp_tools) == 1
        assert mcp_tools[0].name == "mcp_tool"

    def test_get_by_namespace(self, registry: ClaudeToolRegistry) -> None:
        """Verifica get_by_namespace."""
        async def h(inp: dict) -> dict:
            return {}

        # Crea tools con namespace
        mcp_canva = ToolDefinition(
            name="mcp_canva_create_design",
            description="Create Canva design",
            input_schema={"type": "object"},
            handler=h,
            category=ToolCategory.MCP,
        )
        mcp_webreader = ToolDefinition(
            name="mcp_web-reader_fetch",
            description="Fetch URL",
            input_schema={"type": "object"},
            handler=h,
            category=ToolCategory.MCP,
        )
        native_tool = ToolDefinition(
            name="native_read_file",
            description="Read file",
            input_schema={"type": "object"},
            handler=h,
            category=ToolCategory.NATIVE,
        )

        registry.register(mcp_canva)
        registry.register(mcp_webreader)
        registry.register(native_tool)

        mcp_tools = registry.get_by_namespace("mcp")
        native_tools = registry.get_by_namespace("native")

        assert len(mcp_tools) == 2
        assert len(native_tools) == 1

    def test_get_stats_includes_namespaces(self, registry: ClaudeToolRegistry) -> None:
        """Verifica che get_stats includa namespaces."""
        async def h(inp: dict) -> dict:
            return {}

        tool = ToolDefinition(
            name="mcp_test_tool",
            description="Test",
            input_schema={"type": "object"},
            handler=h,
        )
        registry.register(tool)

        stats = registry.get_stats()

        assert "namespaces" in stats
        assert "namespace_count" in stats
        assert "mcp" in stats["namespaces"]
        assert stats["namespace_count"] >= 1

    @pytest.mark.asyncio
    async def test_hot_reload(self, registry: ClaudeToolRegistry) -> None:
        """Verifica hot reload."""
        async def h(inp: dict) -> dict:
            return {"v": 1}

        tool = ToolDefinition(
            name="reloadable",
            description="Reloadable tool",
            input_schema={"type": "object"},
            handler=h,
        )
        registry.register(tool)

        # Registra lazy loader
        async def loader() -> ToolDefinition:
            async def new_h(inp: dict) -> dict:
                return {"v": 2}

            return ToolDefinition(
                name="reloadable",
                description="Reloaded tool",
                input_schema={"type": "object"},
                handler=new_h,
            )

        registry.register_lazy_loader("reloadable", loader)

        reloaded = await registry.hot_reload(["reloadable"])

        assert reloaded == 1
        tool_after = await registry.get_tool("reloadable")
        assert tool_after is not None
        assert tool_after.description == "Reloaded tool"

    @pytest.mark.asyncio
    async def test_hot_reload_nonexistent(self, registry: ClaudeToolRegistry) -> None:
        """Verifica hot reload tool inesistente."""
        reloaded = await registry.hot_reload(["nonexistent"])
        assert reloaded == 0

    def test_export_tools(self, registry: ClaudeToolRegistry, sample_tool: ToolDefinition) -> None:
        """Verifica export tools."""
        registry.register(sample_tool)

        exported = registry.export_tools()

        assert len(exported) == 1
        assert exported[0]["name"] == "test_tool"

    def test_export_tools_priority_order(self, registry: ClaudeToolRegistry) -> None:
        """Verifica ordine export per priorita."""
        async def h(inp: dict) -> dict:
            return {}

        tools = [
            ToolDefinition(
                name="low_tool",
                description="Low priority",
                input_schema={"type": "object"},
                handler=h,
                priority=ToolPriority.LOW,
            ),
            ToolDefinition(
                name="critical_tool",
                description="Critical",
                input_schema={"type": "object"},
                handler=h,
                priority=ToolPriority.CRITICAL,
            ),
            ToolDefinition(
                name="normal_tool",
                description="Normal",
                input_schema={"type": "object"},
                handler=h,
                priority=ToolPriority.NORMAL,
            ),
        ]

        for tool in tools:
            registry.register(tool)

        exported = registry.export_tools()

        # CRITICAL deve essere primo
        assert exported[0]["name"] == "critical_tool"

    @pytest.mark.asyncio
    async def test_initialize(self, registry: ClaudeToolRegistry) -> None:
        """Verifica inizializzazione."""
        async def h(inp: dict) -> dict:
            return {}

        # Tool CRITICAL
        critical = ToolDefinition(
            name="critical",
            description="Critical tool",
            input_schema={"type": "object"},
            handler=h,
            priority=ToolPriority.CRITICAL,
        )

        # Tool LOW (lazy)
        low = ToolDefinition(
            name="low",
            description="Low priority tool",
            input_schema={"type": "object"},
            handler=h,
            priority=ToolPriority.LOW,
        )

        registry.register(critical)
        registry.register(low)

        await registry.initialize()

        assert registry._loaded_tools >= 1  # Almeno CRITICAL caricato

    def test_register_lazy_loader(self, registry: ClaudeToolRegistry) -> None:
        """Verifica registrazione lazy loader."""
        async def loader() -> ToolDefinition:
            async def h(inp: dict) -> dict:
                return {}

            return ToolDefinition(
                name="lazy",
                description="Lazy loaded",
                input_schema={"type": "object"},
                handler=h,
            )

        registry.register_lazy_loader("lazy", loader)

        assert "lazy" in registry._lazy_loaders
        stats = registry.get_stats()
        assert stats["lazy_loaders_pending"] == 1


class TestThreadSafety:
    """Test per thread-safety."""

    @pytest.mark.asyncio
    async def test_concurrent_register(self, registry: ClaudeToolRegistry) -> None:
        """Verifica registrazione concorrente."""

        async def register_tool(i: int) -> None:
            async def h(inp: dict) -> dict:
                return {}

            tool = ToolDefinition(
                name=f"concurrent_{i}",
                description=f"Concurrent tool {i}",
                input_schema={"type": "object"},
                handler=h,
            )
            registry.register(tool)

        tasks = [register_tool(i) for i in range(10)]
        await asyncio.gather(*tasks)

        assert registry._total_tools == 10

    @pytest.mark.asyncio
    async def test_concurrent_get(self, registry: ClaudeToolRegistry, sample_tool: ToolDefinition) -> None:
        """Verifica get concorrente."""
        registry.register(sample_tool)

        async def get_and_execute() -> dict:
            tool = await registry.get_tool("test_tool")
            if tool:
                return await tool.handler({"value": 5})
            return {}

        results = await asyncio.gather(*[get_and_execute() for _ in range(10)])

        assert all(r == {"result": 10} for r in results)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
