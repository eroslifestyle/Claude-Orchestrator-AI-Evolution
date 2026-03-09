"""
Test per ORCHESTRATOR V16 - CLAUDE TOOL CALLING CORE

Test coverage per i 3 componenti Claude:
1. Programmatic Tool Calling
2. Tool Search Tool
3. Fine-Grained Tool Streaming

Run: pytest lib/tests/test_claude_tool_core.py -v
"""

import asyncio
import pytest
from datetime import datetime

from lib.claude_tool_core import (
    # Core classes
    OrchestratorClaudeCore,
    ClaudeToolRegistry,
    ClaudeContainerManager,
    ProgrammaticToolExecutor,
    FineGrainedStreaming,

    # Data classes
    ClaudeToolConfig,
    ToolReference,
    ToolSearchResult,
    ContainerContext,

    # Enums
    ToolSearchVariant,
    ToolCaller,
    ToolExecutionMode,

    # Convenience functions
    create_programmatic_tool,
    create_standard_tool,
    create_streaming_tool,

    # Constants
    MAX_TOOLS_CATALOG,
    MAX_SEARCH_RESULTS,
    MAX_PATTERN_LENGTH,
    DEFAULT_CONTAINER_TTL,
)


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture
def sample_tool():
    """Tool di esempio per i test."""
    return ClaudeToolConfig(
        name="get_weather",
        description="Get current weather for a location",
        input_schema={
            "type": "object",
            "properties": {
                "location": {"type": "string", "description": "City name"},
                "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]},
            },
            "required": ["location"],
        },
    )


@pytest.fixture
def sample_programmatic_tool():
    """Tool programmatic di esempio."""
    return create_programmatic_tool(
        name="query_database",
        description="Execute SQL query",
        input_schema={
            "type": "object",
            "properties": {
                "sql": {"type": "string", "description": "SQL query"}
            },
            "required": ["sql"],
        },
    )


@pytest.fixture
def sample_streaming_tool():
    """Tool streaming di esempio."""
    return create_streaming_tool(
        name="generate_report",
        description="Generate large report",
        input_schema={
            "type": "object",
            "properties": {
                "template": {"type": "string"},
                "data": {"type": "array"},
            },
            "required": ["template"],
        },
    )


@pytest.fixture
def registry():
    """Registry vuoto."""
    return ClaudeToolRegistry()


@pytest.fixture
async def container_manager():
    """Container manager."""
    return ClaudeContainerManager()


@pytest.fixture
async def core():
    """Core orchestrator."""
    core = OrchestratorClaudeCore()
    await core.initialize()
    yield core
    await core.cleanup()


# =============================================================================
# TEST CLAUDETOOLCONFIG
# =============================================================================

class TestClaudeToolConfig:
    """Test per ClaudeToolConfig."""

    def test_standard_tool_creation(self, sample_tool):
        """Test creazione tool standard."""
        assert sample_tool.name == "get_weather"
        assert sample_tool.defer_loading is False
        assert sample_tool.allowed_callers == [ToolCaller.DIRECT.value]
        assert sample_tool.eager_input_streaming is False

    def test_programmatic_tool_creation(self, sample_programmatic_tool):
        """Test creazione tool programmatic."""
        assert sample_programmatic_tool.defer_loading is True
        assert sample_programmatic_tool.allowed_callers == [ToolCaller.CODE_EXECUTION.value]

    def test_streaming_tool_creation(self, sample_streaming_tool):
        """Test creazione tool streaming."""
        assert sample_streaming_tool.eager_input_streaming is True

    def test_to_claude_format_standard(self, sample_tool):
        """Test conversione formato Claude - standard."""
        result = sample_tool.to_claude_format()
        assert result["name"] == "get_weather"
        assert "defer_loading" not in result
        assert "allowed_callers" not in result

    def test_to_claude_format_deferred(self):
        """Test conversione formato Claude - deferred."""
        tool = ClaudeToolConfig(
            name="deferred_tool",
            description="A deferred tool",
            input_schema={"type": "object", "properties": {}},
            defer_loading=True,
        )
        result = tool.to_claude_format()
        assert result["defer_loading"] is True


# =============================================================================
# TEST CLAUDETOOLREGISTRY
# =============================================================================

class TestClaudeToolRegistry:
    """Test per ClaudeToolRegistry."""

    def test_register_tool(self, registry, sample_tool):
        """Test registrazione tool."""
        registry.register(sample_tool)
        assert registry.get("get_weather") == sample_tool

    def test_register_deferred_tool(self, registry, sample_programmatic_tool):
        """Test registrazione tool deferred."""
        registry.register(sample_programmatic_tool)
        assert registry.get("query_database") == sample_programmatic_tool
        assert sample_programmatic_tool in registry.get_all_deferred()

    def test_register_batch(self, registry, sample_tool, sample_programmatic_tool):
        """Test registrazione batch."""
        registry.register_batch([sample_tool, sample_programmatic_tool])
        assert len(registry.get_all_loaded()) == 1
        assert len(registry.get_all_deferred()) == 1

    def test_max_tools_limit(self):
        """Test limite massimo tool."""
        small_registry = ClaudeToolRegistry(max_tools=2)
        small_registry.register(ClaudeToolConfig(
            name="tool1", description="1", input_schema={}
        ))
        small_registry.register(ClaudeToolConfig(
            name="tool2", description="2", input_schema={}
        ))

        with pytest.raises(ValueError, match="Maximum tools limit"):
            small_registry.register(ClaudeToolConfig(
                name="tool3", description="3", input_schema={}
            ))

    def test_search_regex_basic(self, registry, sample_tool):
        """Test ricerca regex base."""
        registry.register(sample_tool)
        result = registry.search_regex("weather")
        assert len(result.tool_references) == 1
        assert result.tool_references[0].tool_name == "get_weather"

    def test_search_regex_pattern(self, registry):
        """Test ricerca regex con pattern."""
        registry.register_batch([
            ClaudeToolConfig(name="get_user", description="Get user", input_schema={}),
            ClaudeToolConfig(name="get_data", description="Get data", input_schema={}),
            ClaudeToolConfig(name="post_data", description="Post data", input_schema={}),
        ])
        result = registry.search_regex("get_.*")
        assert len(result.tool_references) >= 2

    def test_search_regex_invalid_pattern(self, registry):
        """Test ricerca regex con pattern invalido."""
        with pytest.raises(ValueError, match="Invalid regex"):
            registry.search_regex("[invalid(")

    def test_search_regex_too_long(self, registry):
        """Test ricerca regex con pattern troppo lungo."""
        long_pattern = "a" * (MAX_PATTERN_LENGTH + 1)
        with pytest.raises(ValueError, match="Pattern too long"):
            registry.search_regex(long_pattern)

    def test_search_bm25_basic(self, registry, sample_tool):
        """Test ricerca BM25 base."""
        registry.register(sample_tool)
        result = registry.search_bm25("weather location")
        assert len(result.tool_references) >= 1

    def test_search_caching(self, registry, sample_tool):
        """Test caching ricerche."""
        registry.register(sample_tool)
        result1 = registry.search_regex("weather")
        result2 = registry.search_regex("weather")
        assert result1.search_time_ms == result2.search_time_ms  # From cache

    def test_expand_references(self, registry, sample_tool, sample_programmatic_tool):
        """Test espansione tool references."""
        registry.register_batch([sample_tool, sample_programmatic_tool])
        refs = [
            ToolReference(tool_name="get_weather"),
            ToolReference(tool_name="query_database"),
        ]
        tools = registry.expand_references(refs)
        assert len(tools) == 2

    def test_to_claude_tools(self, registry, sample_tool, sample_programmatic_tool):
        """Test conversione a formato Claude."""
        registry.register_batch([sample_tool, sample_programmatic_tool])
        claude_tools = registry.to_claude_tools(include_search=True)
        assert any(t.get("type") == ToolSearchVariant.BM25.value for t in claude_tools)


# =============================================================================
# TEST CLAUDECONTAINERMANAGER
# =============================================================================

class TestClaudeContainerManager:
    """Test per ClaudeContainerManager."""

    @pytest.mark.asyncio
    async def test_create_container(self, container_manager):
        """Test creazione container."""
        container = await container_manager.create_container()
        assert container.container_id.startswith("container_")
        assert container.ttl == DEFAULT_CONTAINER_TTL
        assert container.execution_count == 0

    @pytest.mark.asyncio
    async def test_create_container_custom_ttl(self, container_manager):
        """Test creazione container con TTL custom."""
        container = await container_manager.create_container(ttl=600)
        assert container.ttl == 600

    @pytest.mark.asyncio
    async def test_get_container(self, container_manager):
        """Test get container."""
        created = await container_manager.create_container()
        retrieved = await container_manager.get_container(created.container_id)
        assert retrieved == created

    @pytest.mark.asyncio
    async def test_get_expired_container(self, container_manager):
        """Test get container scaduto."""
        container = await container_manager.create_container(ttl=0)
        import time; time.sleep(0.1)  # Let it expire
        retrieved = await container_manager.get_container(container.container_id)
        assert retrieved is None

    @pytest.mark.asyncio
    async def test_reuse_or_create(self, container_manager):
        """Test reuse o create."""
        container1 = await container_manager.create_container()
        container2 = await container_manager.reuse_or_create(container1.container_id)
        assert container1.container_id == container2.container_id

        container3 = await container_manager.reuse_or_create("nonexistent")
        assert container3.container_id != container1.container_id

    @pytest.mark.asyncio
    async def test_load_tool(self, container_manager, registry, sample_tool):
        """Test caricamento tool in container."""
        registry.register(sample_tool)
        container = await container_manager.create_container()
        success = await container_manager.load_tool(
            container.container_id, "get_weather", registry
        )
        assert success is True
        assert "get_weather" in container.tools_loaded

    @pytest.mark.asyncio
    async def test_execute_code(self, container_manager):
        """Test esecuzione codice."""
        container = await container_manager.create_container()
        result = await container_manager.execute_code(
            container.container_id, "print('hello')"
        )
        assert result["container_id"] == container.container_id
        assert container.execution_count == 1

    @pytest.mark.asyncio
    async def test_cleanup_expired(self, container_manager):
        """Test cleanup container scaduti."""
        await container_manager.create_container(ttl=0)
        await container_manager.create_container(ttl=300)
        import time; time.sleep(0.1)
        removed = await container_manager.cleanup_expired()
        assert removed == 1

    @pytest.mark.asyncio
    async def test_shutdown_container(self, container_manager):
        """Test shutdown container."""
        container = await container_manager.create_container()
        success = await container_manager.shutdown_container(container.container_id)
        assert success is True
        retrieved = await container_manager.get_container(container.container_id)
        assert retrieved is None


# =============================================================================
# TEST PROGRAMMATICTOOLEXECUTOR
# =============================================================================

class TestProgrammaticToolExecutor:
    """Test per ProgrammaticToolExecutor."""

    @pytest.mark.asyncio
    async def test_execute_batch(self, registry, container_manager):
        """Test esecuzione batch."""
        registry.register(create_programmatic_tool(
            name="tool1", description="T1", input_schema={}
        ))
        registry.register(create_programmatic_tool(
            name="tool2", description="T2", input_schema={}
        ))

        executor = ProgrammaticToolExecutor(registry, container_manager)
        results = await executor.execute_batch([
            {"name": "tool1", "input": {}},
            {"name": "tool2", "input": {}},
        ])

        assert len(results) == 1
        assert "code" in results[0]

    @pytest.mark.asyncio
    async def test_execute_with_filter(self, registry, container_manager):
        """Test esecuzione con filtro."""
        registry.register(create_programmatic_tool(
            name="get_data", description="Get data", input_schema={}
        ))

        executor = ProgrammaticToolExecutor(registry, container_manager)
        result = await executor.execute_with_filter(
            "get_data", "lambda x: x['value'] > 10"
        )
        assert result["type"] == "code_execution_result"


# =============================================================================
# TEST FINEGRAINEDSTREAMING
# =============================================================================

class TestFineGrainedStreaming:
    """Test per FineGrainedStreaming."""

    def test_create_streaming_tool(self, sample_tool):
        """Test abilitazione streaming."""
        streaming = FineGrainedStreaming.create_streaming_tool(sample_tool)
        assert streaming.eager_input_streaming is True

    def test_handle_incomplete_json(self):
        """Test gestione JSON incompleto."""
        partial = '{"name": "test", "value":'
        result = FineGrainedStreaming.handle_incomplete_json(partial)
        assert result["type"] == "incomplete_json_wrapper"
        assert "raw_content" in result

    def test_parse_streaming_chunks_valid(self):
        """Test parse chunks validi."""
        chunks = ['{"name":', ' "test"', ', "value":', ' 123}']
        result = FineGrainedStreaming.parse_streaming_chunks(chunks)
        assert result == {"name": "test", "value": 123}

    def test_parse_streaming_chunks_invalid(self):
        """Test parse chunks invalidi."""
        chunks = ['{"name":', ' "test"']  # Incomplete
        result = FineGrainedStreaming.parse_streaming_chunks(chunks)
        assert result is None


# =============================================================================
# TEST ORCHESTRATORCLAUDECORE
# =============================================================================

class TestOrchestratorClaudeCore:
    """Test per OrchestratorClaudeCore."""

    @pytest.mark.asyncio
    async def test_initialize(self, core):
        """Test inizializzazione."""
        assert core._initialized is True

    @pytest.mark.asyncio
    async def test_register_tool(self, core, sample_tool):
        """Test registrazione tool."""
        core.register_tool(sample_tool)
        assert core._registry.get("get_weather") == sample_tool

    @pytest.mark.asyncio
    async def test_search_tools(self, core, sample_tool):
        """Test ricerca tool."""
        core.register_tool(sample_tool)
        result = core.search_tools("weather")
        assert len(result.tool_references) >= 1

    @pytest.mark.asyncio
    async def test_get_tools_for_claude(self, core, sample_tool):
        """Test ottenimento tools per Claude."""
        core.register_tool(sample_tool)
        tools = core.get_tools_for_claude(include_search=True)
        assert any("search" in str(t).lower() for t in tools)

    @pytest.mark.asyncio
    async def test_execute_programmatic(self, core, sample_programmatic_tool):
        """Test esecuzione programmatic."""
        core.register_tool(sample_programmatic_tool)
        results = await core.execute_programmatic([
            {"name": "query_database", "input": {"sql": "SELECT 1"}}
        ])
        assert len(results) == 1


# =============================================================================
# TEST CONVENIENCE FUNCTIONS
# =============================================================================

class TestConvenienceFunctions:
    """Test per convenience functions."""

    def test_create_programmatic_tool(self):
        """Test create_programmatic_tool."""
        tool = create_programmatic_tool(
            name="test_tool",
            description="Test",
            input_schema={"type": "object"}
        )
        assert tool.defer_loading is True
        assert tool.allowed_callers == [ToolCaller.CODE_EXECUTION.value]

    def test_create_standard_tool(self):
        """Test create_standard_tool."""
        tool = create_standard_tool(
            name="test_tool",
            description="Test",
            input_schema={"type": "object"}
        )
        assert tool.defer_loading is False
        assert tool.allowed_callers == [ToolCaller.DIRECT.value]

    def test_create_streaming_tool(self):
        """Test create_streaming_tool."""
        tool = create_streaming_tool(
            name="test_tool",
            description="Test",
            input_schema={"type": "object"}
        )
        assert tool.eager_input_streaming is True


# =============================================================================
# TEST TOOLREFERENCE
# =============================================================================

class TestToolReference:
    """Test per ToolReference."""

    def test_to_claude_format(self):
        """Test conversione formato Claude."""
        ref = ToolReference(tool_name="test_tool")
        result = ref.to_claude_format()
        assert result == {"type": "tool_reference", "tool_name": "test_tool"}


# =============================================================================
# TEST CONTAINERCONTEXT
# =============================================================================

class TestContainerContext:
    """Test per ContainerContext."""

    def test_is_expired_false(self):
        """Test is_expired False."""
        ctx = ContainerContext(
            container_id="test",
            created_at=datetime.now().timestamp(),
            ttl=300
        )
        assert ctx.is_expired is False

    def test_is_expired_true(self):
        """Test is_expired True."""
        import time
        ctx = ContainerContext(
            container_id="test",
            created_at=time.time() - 400,
            ttl=300
        )
        assert ctx.is_expired is True


# =============================================================================
# RUN TESTS
# =============================================================================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
